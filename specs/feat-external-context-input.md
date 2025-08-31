# External Context Input for Autocomplete Enhancement

**Status**: Draft  
**Authors**: Claude Code  
**Date**: 2025-08-29  

## Overview

Add a user-editable "Document Context" panel that allows users to provide additional context information to guide AI-powered autocomplete suggestions. The context is optional, stored locally only (not persisted on server), and influences suggestions without changing the core editing experience.

## Background/Problem Statement

The current autocomplete system relies solely on the text immediately before the cursor position (left context) to generate completions. While this works well for basic text continuation, it lacks broader document awareness that could significantly improve suggestion quality and relevance.

**Current Limitations:**
- Autocomplete has no awareness of document purpose, tone, or target audience
- No ability to specify domain-specific context or writing style preferences
- Limited language and format guidance for multilingual or specialized content
- Users cannot influence completion behavior beyond what they've already typed

**Business Value:**
- Improved completion relevance and user satisfaction
- Enhanced productivity for specialized writing tasks (emails, articles, technical documentation)
- Better support for multilingual content creation
- Increased user engagement through customizable AI behavior

## Goals

- Add external context input UI that guides autocomplete without disrupting core editing flow
- Implement React Context provider for state management across components
- Extend API to accept optional context alongside text input
- Maintain performance targets (<200ms latency) through intelligent caching strategies
- Preserve existing functionality and backward compatibility
- Ensure accessibility compliance and responsive design

## Non-Goals

- Server-side persistence of user context data
- Real-time collaboration features for shared context
- Complex document analysis or automatic context extraction
- Integration with external document management systems
- Multi-document context sharing or templates
- Advanced AI model switching based on context

## Technical Dependencies

### Required Dependencies (Already Present)
- **React 18+**: Context provider and hooks for state management
- **Next.js 14+**: App Router and API routes for context handling
- **Tailwind CSS 3+**: UI styling and responsive design
- **Zod 3.22+**: Enhanced request validation with context schema
- **AI SDK 5.0+**: Extended prompting with context integration
- **@ai-sdk/google 2.0+**: Gemini model integration with context

### New Dependencies Required
- **crypto-js** or **node:crypto**: Context hashing for cache keys (SHA-1)
- **gpt-tokenizer** (optional): Client-side token counting approximation

### External APIs
- **Google AI (Gemini) API**: Context-aware completion requests
- **Gemini Caching API** (optional): Explicit caching for large contexts

## Detailed Design

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│ Client Architecture                                         │
│                                                             │
│ ┌─────────────────┐    ┌──────────────────────────────────┐ │
│ │ ContextPanel    │    │ AutocompleteEditor               │ │
│ │ - Textarea      │    │ - Tiptap Integration             │ │
│ │ - Token Counter │    │ - InlineComplete Extension       │ │
│ │ - Structured    │    │ - Custom fetchTail Function      │ │
│ │   Hints         │    │                                  │ │
│ └─────────┬───────┘    └──────────────┬───────────────────┘ │
│           │                           │                     │
│           └──────────┬────────────────┘                     │
│                      │                                      │
│           ┌──────────▼─────────────┐                        │
│           │ CompletionContext      │                        │
│           │ - contextText          │                        │
│           │ - documentType         │                        │
│           │ - language             │                        │
│           │ - tone                 │                        │
│           │ - audience             │                        │
│           └────────────────────────┘                        │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ Server Architecture                                         │
│                                                             │
│ ┌─────────────────┐    ┌──────────────────────────────────┐ │
│ │ API Route       │    │ AI Integration                   │ │
│ │ /api/complete   │    │ - Enhanced Prompting             │ │
│ │ - Extended Zod  │    │ - Context-First Ordering         │ │
│ │   Validation    │    │ - Gemini Implicit Caching        │ │
│ │ - Context       │    │ - Optional Explicit Caching      │ │
│ │   Sanitization  │    │                                  │ │
│ └─────────────────┘    └──────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### Component Structure

#### 1. ContextPanel Component (`components/ContextPanel.tsx`)

```typescript
interface ContextPanelProps {
  isCollapsed?: boolean;
  onToggleCollapse?: (collapsed: boolean) => void;
}

interface ContextPanelState {
  contextText: string;
  documentType: DocumentType;
  language: Language;
  tone: Tone;
  audience: string;
  keywords: string[];
  isCollapsed: boolean;
}
```

**Key Features:**
- Multi-line textarea with 3-6 rows, auto-resizing
- Live token counter with 20k token soft cap
- Structured hint selectors (document type, tone, language, audience)
- Keywords input (max 10 keywords, 32 chars each)
- Clear and collapse/expand actions
- localStorage persistence for page refresh retention
- Full accessibility compliance with ARIA labels

#### 2. CompletionContext Provider (`lib/context/CompletionContext.tsx`)

```typescript
interface CompletionContextValue {
  contextText: string;
  documentType?: DocumentType;
  language?: Language;
  tone?: Tone;
  audience?: string;
  keywords?: string[];
  
  updateContext: (updates: Partial<CompletionContextState>) => void;
  clearContext: () => void;
  getContextHash: () => string;
  getTokenCount: () => number;
}
```

**Responsibilities:**
- Central state management for all context values
- Context hash generation for cache keys
- Token counting approximation
- localStorage integration for persistence
- Context validation and sanitization

#### 3. Enhanced InlineComplete Integration

**Custom fetchTail Function:**
```typescript
const fetchTail = async (left: string): Promise<ApiResponse> => {
  const context = useCompletionContext();
  
  return fetch('/api/complete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      left,
      context: context.getSerializedContext()
    })
  }).then(handleResponse);
};
```

**Enhanced Cache Key Generation:**
```typescript
const cacheKey = left + '\u241E' + contextHash;
```

### API Contract Changes

#### Request Schema Enhancement

```typescript
const RequestSchema = z.object({
  left: z.string().min(1).max(1000), // unchanged
  context: z.object({
    userContext: z.string().max(20000).optional(), // 20k token limit
    documentType: z.enum(['email', 'article', 'note', 'other']).optional(),
    language: z.enum(['en', 'es', 'fr', 'de']).optional(),
    tone: z.enum(['neutral', 'formal', 'casual', 'persuasive']).optional(),
    audience: z.string().max(64).optional(),
    keywords: z.array(z.string().min(1).max(32)).max(10).optional()
  }).optional()
});
```

#### Response Schema (Unchanged)
- Maintains backward compatibility
- Optional confidence boost (+0.05) when context present and tail ≤8 tokens

### Prompting Strategy

**Enhanced System Prompt with Context Integration:**

```
SYSTEM:
You are an inline autocomplete engine.
- Output ONLY the minimal continuation of the user's text.
- No introductions, formatting, or trailing whitespace.
- Obey language and style hints if provided.

[Context — Large, Stable Block for Caching]
- Document context: {CONTEXT_TEXT}
- Document type: {DOCUMENT_TYPE}
- Language: {LANGUAGE}
- Tone: {TONE}
- Audience: {AUDIENCE}
- Keywords: {KEYWORDS}

[User Text — Small, Changing Block]
{LEFT}
```

**Context Ordering Rationale:**
- Large, stable context placed immediately after system prompt
- Maximizes Gemini implicit cache hits (2.5 Flash: 1,024+ tokens, 2.5 Pro: 4,096+ tokens)
- Small, changing user text appended last
- Empty context fields omitted to reduce token usage

## User Experience

### Context Panel UI/UX

**Visual Design:**
- Collapsible card positioned above the text editor
- Clean, minimal design consistent with editor styling
- Smooth expand/collapse animations
- Clear visual hierarchy with proper spacing

**Interaction Patterns:**
- Auto-expand on first use, remember collapse state
- Tab order: context textarea → structured hints → clear/collapse actions → editor
- Keyboard shortcuts: Ctrl/Cmd+Shift+C to toggle panel
- Real-time token counting with color-coded warnings (green < 15k, yellow < 18k, red < 20k)

**Responsive Behavior:**
- Mobile: Simplified layout, collapsible by default
- Tablet: Full feature set with adjusted spacing
- Desktop: Optimal layout with all features visible

### Writing Flow Integration

**Seamless Context Updates:**
- Context changes apply immediately to new completions
- Existing suggestions remain until new input triggers fresh requests
- Visual feedback when context influences suggestions (subtle highlight)
- No disruption to typing flow or editor focus

## Testing Strategy

### Unit Tests

**ContextPanel Component Tests:**
```typescript
describe('ContextPanel', () => {
  test('persists context to localStorage on change', () => {
    // Validates localStorage integration
  });
  
  test('shows accurate token count approximation', () => {
    // Validates client-side token counting
  });
  
  test('enforces 20k token soft limit with warnings', () => {
    // Validates user feedback for large contexts
  });
  
  test('sanitizes input and strips control characters', () => {
    // Validates input sanitization
  });
});
```

**CompletionContext Provider Tests:**
```typescript
describe('CompletionContext', () => {
  test('generates stable hash for identical contexts', () => {
    // Validates cache key consistency
  });
  
  test('provides different hashes for different contexts', () => {
    // Validates cache isolation
  });
  
  test('serializes context for API requests correctly', () => {
    // Validates API contract compliance
  });
});
```

**fetchTail Integration Tests:**
```typescript
describe('fetchTail with context', () => {
  test('includes context in API request payload', () => {
    // Validates request structure
  });
  
  test('uses context hash in LRU cache key', () => {
    // Validates cache behavior
  });
  
  test('handles context-aware cache hits and misses', () => {
    // Validates caching isolation
  });
});
```

### API Tests

**Context Validation Tests:**
```typescript
describe('/api/complete with context', () => {
  test('accepts valid context with all fields', () => {
    // Validates full context schema
  });
  
  test('accepts partial context with optional fields', () => {
    // Validates backward compatibility
  });
  
  test('rejects context exceeding 20k token limit', () => {
    // Validates server-side token enforcement
  });
  
  test('sanitizes context and strips control characters', () => {
    // Validates server-side sanitization
  });
});
```

**Prompt Assembly Tests:**
```typescript
describe('AI prompt assembly', () => {
  test('includes context in cache-friendly order', () => {
    // Validates prompt structure for caching
  });
  
  test('omits empty context fields', () => {
    // Validates token efficiency
  });
  
  test('boosts confidence for contextual completions', () => {
    // Validates confidence scoring
  });
});
```

### Integration Tests

**End-to-End Context Flow:**
```typescript
describe('Context-aware autocomplete', () => {
  test('provides different suggestions with different contexts', async () => {
    // Validates context influence on AI responses
  });
  
  test('maintains consistent suggestions for identical contexts', async () => {
    // Validates caching behavior
  });
  
  test('measures TTFT improvements with cached contexts', async () => {
    // Validates performance benefits
  });
});
```

### Accessibility Tests

```typescript
describe('ContextPanel accessibility', () => {
  test('provides proper ARIA labels and descriptions', () => {
    // Validates screen reader support
  });
  
  test('maintains logical focus order', () => {
    // Validates keyboard navigation
  });
  
  test('announces token count changes to screen readers', () => {
    // Validates dynamic content accessibility
  });
});
```

## Performance Considerations

### Token Budget Management

**Client-Side Optimization:**
- Live token counting using lightweight approximation (chars/4)
- 20k token soft cap with user warnings at 15k/18k thresholds
- Efficient context serialization avoiding unnecessary fields

**Server-Side Efficiency:**
- Include full context (no summarization) to maximize cache hits
- Server-side token validation and rejection at 20k limit
- Context hash generation for cache key consistency

### Caching Strategy

**Enhanced LRU Cache:**
```typescript
// Cache key format: left + separator + contextHash
const cacheKey = `${left}\u241E${sha1(normalizedContext)}`;

// Context normalization for stable hashing
const normalizeContext = (context) => ({
  userContext: context.userContext?.trim() || '',
  documentType: context.documentType || '',
  language: context.language || '',
  tone: context.tone || '',
  audience: context.audience?.trim() || '',
  keywords: context.keywords?.sort().join(',') || ''
});
```

**Implicit Caching Benefits:**
- Gemini 2.5 models automatically cache stable prefixes
- Context-first prompt ordering maximizes cache hit rates
- Monitor `usage_metadata.cached_input_tokens` for cache effectiveness

**Optional Explicit Caching:**
```typescript
interface ContextCache {
  contextHash: string;
  cacheId: string;
  expiresAt: number;
}

// Server-side cache map
const contextCacheMap = new Map<string, ContextCache>();
```

### Latency Optimization

**Performance Targets:**
- TTFT scales with input size: expect 50-100ms increase for large contexts
- Streaming time remains constant (output capped at 8 tokens/32 chars)
- Overall target: <300ms for context-aware completions vs <200ms baseline

**Network Efficiency:**
- No additional round-trips for context handling
- Payload size increase: ~1-5KB for typical contexts
- Compression benefits for repeated context submissions

## Security Considerations

### Data Privacy

**Client-Side Security:**
- Context data stored only in localStorage (no server persistence)
- Clear context data on explicit user action
- No transmission of context to external services beyond AI API

**Server-Side Security:**
- Never log context content in production
- Redact context from error messages and debug output
- Sanitize context input: strip HTML, control characters, normalize whitespace

### Input Validation

**Client-Side Validation:**
```typescript
const sanitizeContextText = (text: string): string => {
  return text
    .replace(/[\x00-\x1F\x7F]/g, '') // Remove control characters
    .replace(/<[^>]*>/g, '') // Strip HTML tags
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
};
```

**Server-Side Validation:**
```typescript
const validateContext = (context: unknown): ContextData | null => {
  const result = ContextSchema.safeParse(context);
  if (!result.success) return null;
  
  // Additional security checks
  const sanitized = sanitizeAllFields(result.data);
  const tokenCount = estimateTokens(JSON.stringify(sanitized));
  
  if (tokenCount > 20000) {
    throw new Error('Context exceeds token limit');
  }
  
  return sanitized;
};
```

### Rate Limiting

**Enhanced Rate Limiting:**
- Consider context size in rate limiting calculations
- Implement per-IP limits for large context requests
- Monitor for abuse patterns (extremely large contexts, rapid context changes)

## Documentation

### User Documentation

**In-App Help Text:**
```
Document Context (Optional)
Provide additional context to help the AI understand your writing goals. 
This information stays private and is not saved on our servers.

Examples:
• "Writing a professional email to investors about Q3 results"
• "Casual blog post about weekend hiking adventures"  
• "Technical documentation for React developers"
```

**Developer Documentation:**
- API endpoint changes and new request/response schemas
- Context provider usage patterns and best practices
- Performance optimization guides for large contexts
- Caching behavior and debugging information

### Code Documentation

**Inline Documentation:**
```typescript
/**
 * Generates a stable hash for context data to use in cache keys.
 * 
 * Context is normalized before hashing to ensure consistent results:
 * - Whitespace trimmed and normalized
 * - Keywords sorted alphabetically  
 * - Empty fields excluded from hash
 * 
 * @param context - The context data to hash
 * @returns SHA-1 hash as hex string
 */
export const generateContextHash = (context: ContextData): string => {
  // Implementation...
};
```

## Implementation Phases

### Phase 1: Core Context Infrastructure (MVP)
**Scope:** Basic context input and API integration
- [ ] Create `ContextPanel` component with textarea and localStorage
- [ ] Implement `CompletionContext` provider and hooks
- [ ] Add context field to API request schema
- [ ] Enhance prompt assembly with context integration
- [ ] Extend LRU cache keys with context hash
- [ ] Basic unit tests for core functionality

**Success Criteria:**
- Context panel renders and persists data locally
- API accepts context and includes it in AI prompts  
- Cache isolation works with different contexts
- Performance remains <300ms for typical contexts

### Phase 2: Enhanced UX and Performance (Polish)
**Scope:** Structured hints, token counting, and caching optimization
- [ ] Add structured hint selectors (document type, tone, language)
- [ ] Implement client-side token counting and warnings
- [ ] Add clear/collapse actions and keyboard shortcuts
- [ ] Implement Gemini implicit caching optimization
- [ ] Add comprehensive accessibility features
- [ ] Enhanced error handling and user feedback

**Success Criteria:**
- Full UI feature set with professional polish
- Token counting accuracy within 10% of server count
- Accessibility compliance (WCAG 2.1 AA)
- TTFT improvements visible with cache hits

### Phase 3: Advanced Features (Optional)
**Scope:** Explicit caching, advanced analytics, power user features
- [ ] Implement explicit Gemini caching with context hash keys
- [ ] Add performance instrumentation and analytics
- [ ] Context templates and quick actions
- [ ] Advanced validation and security hardening
- [ ] Mobile-optimized responsive design

**Success Criteria:**
- Cache hit rates >70% for repeated contexts
- Performance metrics dashboard
- Advanced features adopted by power users

## Open Questions

### Product Questions
1. **Context Templates**: Should we provide predefined context templates for common document types (emails, articles, etc.)?
2. **Context Sharing**: Future consideration for team/workspace shared contexts?
3. **Context History**: Should users be able to access recently used contexts?

### Technical Questions  
1. **Token Counting**: Should we invest in precise client-side tokenization vs. server-side approximation?
2. **Caching Strategy**: Start with implicit caching or implement explicit caching from the beginning?
3. **Context Size**: Should we allow larger contexts (>20k tokens) for power users with performance warnings?

### UX Questions
1. **Default State**: Should context panel be expanded or collapsed by default?
2. **Context Indicators**: How should we visually indicate when context is influencing suggestions?
3. **Mobile Experience**: How much context functionality should be available on mobile devices?

## References

### Related Documents
- [Main Autocomplete Specification](feat-ai-text-autocomplete.md)
- [Task Decomposition](feat-ai-text-autocomplete-tasks.md)
- [Implementation Summary](../reports/IMPLEMENTATION_SUMMARY_CONTEXT_INPUT_2025-08-29.md)

### External Resources
- [AI SDK v5 Documentation](https://sdk.vercel.ai/docs)
- [Google AI Studio - Gemini Models](https://ai.google.dev/models/gemini)
- [Gemini Caching API](https://ai.google.dev/docs/caching)
- [React Context Best Practices](https://react.dev/learn/passing-data-deeply-with-context)
- [WCAG 2.1 Accessibility Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [ProseMirror Plugin Architecture](https://prosemirror.net/docs/guide/#state.plugins)

### Technical Specifications
- [Zod Schema Validation](https://github.com/colinhacks/zod)
- [Tiptap Extension Development](https://tiptap.dev/guide/custom-extensions)
- [Next.js API Routes](https://nextjs.org/docs/api-routes/introduction)
- [localStorage Best Practices](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage)

---

This specification provides a comprehensive foundation for implementing external context input that enhances autocomplete functionality while maintaining performance, security, and usability standards.