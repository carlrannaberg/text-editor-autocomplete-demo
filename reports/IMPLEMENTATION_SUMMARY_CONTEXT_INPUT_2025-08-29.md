# Implementation Summary — External Context Input for Autocomplete

## Goal
Add a separate, user-editable “Document Context” textbox (outside the editor) that guides autocomplete. Context is optional, local-only (not persisted on server), and influences suggestions without changing the editing surface.

## UX & UI
- Context panel: A collapsible card above the editor with:
  - `textarea` (multi-line, ~3–6 rows), live token count, 20k-token soft cap.
  - "Clear" and "Collapse" actions, and a short helper text explaining usage.
  - Optional structured hints: document type, tone, audience (selects), language (select).
- Persistence: Save to `localStorage` so page refreshes retain inputs. Add a "Reset to default".
- Accessibility: Label + description via `aria-describedby`, visible token counter, keyboard focus order.

## Data Flow & Architecture
- State source of truth: React Context provider `CompletionContextProvider` manages `contextText`, `documentType`, `language`, etc.
- InlineComplete wiring: Pass a custom `fetchTail` through `InlineComplete.configure({ fetchTail })` so the extension captures the latest context values from React state.
- Request payload: The client includes `context` alongside `left` in `/api/complete`.
- Caching: Extend LRU key to include a stable context hash (e.g., `sha1(contextTextNormalized)`), so completions are contextualized without cache pollution across contexts.

### Component Sketch
- `components/ContextPanel.tsx` — UI + localStorage persistence.
- `lib/context/CompletionContext.tsx` — Provider + hooks for context state.
- `app/page.tsx` wiring — Reads context from provider; passes a `fetchTail` that posts `{ left, context }`.

## API Contract Changes
- Request schema changes (Zod):
  - `left: string().min(1).max(1000)` (unchanged)
  - `context?: {
      userContext?: string, // soft cap 20k tokens (server-enforced)
      documentType?: 'email' | 'article' | 'note' | 'other',
      language?: 'en' | 'es' | 'fr' | 'de',
      tone?: 'neutral' | 'formal' | 'casual' | 'persuasive',
      audience?: string.max(64),
      keywords?: string[].max(10).items(string().min(1).max(32))
    }`
- Sanitization: Trim, collapse whitespace, strip control chars; reject if total serialized context exceeds 20k tokens (server-side token count or approximation).
- Backward compatibility: `context` is optional; existing clients continue to work.

## Prompting Strategy (AI SDK)
- Keep strict system prompt, then place the full context immediately after it to maximize Gemini implicit cache hits. Append the user's left text last.

```
SYSTEM:
You are an inline autocomplete engine.
- Output ONLY the minimal continuation of the user's text.
- No introductions, formatting, or trailing whitespace.
- Obey language and style hints if provided.

[Context — full, cache-friendly]
- Document context (free-form): <CONTEXT_TEXT>
- Document type: <DOCUMENT_TYPE>
- Language: <LANG>
- Tone: <TONE>
- Audience: <AUDIENCE>
- Keywords: <KEYWORDS>

[User Text So Far — small, changing]
<LEFT>
```

- Limits:
  - Include full `CONTEXT_TEXT` up to 20k tokens in every request (no summarization/compression).
  - Include only non-empty fields; omit empty blocks to avoid unnecessary tokens.
  - Preserve existing `stopSequences`, temperature, and caps; raise API timeout to accommodate larger prompts.
  - Keep output short (existing 8-token/32-char caps) so streaming latency remains dominated by TTFT.

## Client Changes (focused)
- `InlineComplete` already supports `fetchTail`; provide a custom implementation in `page.tsx` that posts `{ left, context }`.
- Extend LRU cache key to include `contextHash`: `key = left + "\u241E" + contextHash`.
- Maintain current debouncing and boundary logic; context affects content, not the cadence.

## Server Changes (minimal, safe)
- Zod schema: accept optional `context` as above.
- Prompt assembly: Build a lightweight context section and attach to `system` (preferred) or prepend to `prompt` if needed.
- Privacy: Do not log `context`; redact in errors; keep timeouts and guards.
- Confidence: Optionally boost confidence slightly (+0.05) when context present and tail is short (≤8), reflecting higher specificity.
- Timeout: Increase AI request timeout (e.g., from 500ms → 3000ms) to accommodate larger prompts while preserving cancellations via `AbortController`.

### Caching with Gemini
- Implicit caching (default on 2.5 models):
  - Place the large, stable context immediately after the system block so it becomes a shared prefix across requests.
  - Send requests with similar prefixes close together to increase hit rate.
  - Minimum prefix for cache eligibility: ~1,024 tokens (2.5 Flash) and ~4,096 tokens (2.5 Pro).
  - Inspect `usage_metadata.cached_input_tokens` (when available) to confirm hits.
- Explicit caching (optional, guaranteed savings):
  - When context changes, create a cache entry keyed by a server-side `contextHash` and reuse it across requests; set TTL (default 1h).
  - Maintain a small map `{ contextHash -> cacheId, expiresAt }`; refresh on expiration or context change.
  - Use explicit caching APIs if exposed by the SDK; otherwise call Gemini caching endpoints directly.

## Performance & Limits
- Token budget: Include up to 20k tokens per request; TTFT scales with input size, while streaming time scales with output tokens.
- Caching: Context-aware LRU prevents cross-context bleed and avoids extra calls when context unchanged.
- Network: Payload size small; no extra round-trips.

### Token Counting Strategy
- Client live counter: Fast approximation using a lightweight tokenizer (e.g., GPT-style BPE via `gpt-tokenizer`), with fallback to `Math.ceil(chars/4)` if not available.
- Server enforcement: Validate ≤20k tokens; reject with 413 if exceeded; otherwise pass through unchanged.
- Display: Show “Entered tokens” (equals “Included tokens” since we send everything).

### Latency Model & Instrumentation
- TTFT ≈ f(input_tokens). Keep a stable cached prefix to lower TTFT; expect higher TTFT with very large contexts when cold.
- Streaming time ≈ output_tokens / throughput. We already cap output (8 tokens/32 chars).
- Instrumentation: Log `ttft_ms` (time to first chunk), input token count, and any `usage_metadata.cached_input_tokens` for observability.

## Security & Privacy
- No persistence server-side; context is ephemeral per request.
- Sanitize/escape control characters; strip HTML.
- Enforce size limits; rate-limit per IP if needed.
- Never echo secrets in responses or logs.

## Accessibility
- Visible label and helper copy for the context field.
- `aria-describedby` for helper text and token count.
- High-contrast, focus-visible, and keyboard navigable controls.

## Testing Plan
- Unit (client):
  - `ContextPanel` localStorage behavior and token counting (approximation vs. server count).
  - `fetchTail` includes context; cache key varies by `contextHash`.
- Unit (API):
  - Zod validation for `context` fields and limits.
  - Context insertion into prompt; redaction from logs.
  - Optional: explicit caching path creates/uses cache IDs keyed by `contextHash`.
- Integration:
  - With and without context, verify suggestions differ; measure TTFT improvements on repeated requests due to implicit caching.
- Snapshot/UX:
  - Context panel renders, collapses, and restores state.

## Rollout Plan
1. Add UI + provider and wire `fetchTail` (feature-flagged off by default if desired).
2. Add API validation and prompt assembly with context-first ordering (implicit caching friendly).
3. Add cache-key extension and TTFT/usage instrumentation.
4. Optional: implement explicit caching keyed by `contextHash` with TTL map.
5. Ship behind a simple boolean prop or env (`NEXT_PUBLIC_ENABLE_CONTEXT=1`).
6. Monitor TTFT, cache hit rates, and errors; tune timeout and request gating as needed.

## Open Questions / Options
- Should we offer structured context fields only (type/tone/audience) or keep a free-form text box plus optional structured hints? Recommendation: both — free-form drives most gains; structured hints add clarity with minimal complexity.
- How should we handle multilingual hints beyond the current enum? Option: allow BCP-47 tags with validation and map common ones to model hints.
- Do we want per-document context persistence beyond `localStorage`? For this demo, keep it local-only.

## Implementation Checklist
- [ ] `components/ContextPanel.tsx` with localStorage and A11y
- [ ] `lib/context/CompletionContext.tsx` provider
- [ ] `app/page.tsx` wires `InlineComplete.configure({ fetchTail })`
- [ ] Extend client LRU key with `contextHash`
- [ ] API `RequestSchema` accepts `context`; prompt injection
- [ ] Tests for validation, caching, and UI state

---
This plan adds contextual guidance to autocomplete with minimal API and client changes, preserves performance targets, and keeps user data local and safe.
