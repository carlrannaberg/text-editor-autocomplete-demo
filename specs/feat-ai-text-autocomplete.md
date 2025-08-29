# AI-Powered Text Autocomplete Feature

**Status**: Draft  
**Author**: Claude Code  
**Date**: 2025-08-28  
**Version**: 1.0  

## Overview

An intelligent text autocomplete feature that provides real-time, context-aware suggestions as users type in a rich text editor. The system uses Gemini 2.5 Flash-Lite for low-latency AI completion, Tiptap for rich text editing, and AI SDK v5 for streaming text generation.

## Background/Problem Statement

Modern text editing experiences lack intelligent, context-aware autocompletion that works at the keystroke level. Users often think faster than they can type, and would benefit from AI assistance that can predict and suggest relevant continuations of their text. Existing solutions are either too slow (high latency), too intrusive (modal dialogs), or provide irrelevant suggestions.

The challenge is creating a system that:
- Provides sub-200ms response times
- Offers contextually relevant suggestions
- Integrates seamlessly with natural typing flow
- Maintains non-intrusive UX patterns

## Goals

- ✅ Implement keystroke-level text autocompletion with <200ms latency
- ✅ Provide contextually relevant 1-2 word completions using AI
- ✅ Create intuitive Tab-to-accept interaction pattern
- ✅ Display suggestions as non-intrusive ghost text
- ✅ Support both English and CJK languages with proper boundary detection
- ✅ Prevent API spam through intelligent debouncing and caching
- ✅ Ensure graceful degradation when AI service is unavailable

## Non-Goals

- ❌ Multi-paragraph or long-form text generation
- ❌ Code-specific autocompletion features
- ❌ User authentication or personalization
- ❌ Offline functionality or local model support
- ❌ Right-context/infill completion (Fill-in-the-Middle)
- ❌ Multiple completion candidates or alternative suggestions

## Technical Dependencies

### Core Libraries
- **AI SDK v5** (`ai` ^5.0.0): Stream-based text generation with provider abstraction
- **Google AI Provider** (`@ai-sdk/google` ^1.0.0): Official Google/Gemini integration for AI SDK
- **Tiptap React** (`@tiptap/react` ^2.0.0): React integration for Tiptap rich text editor
- **Tiptap Starter Kit** (`@tiptap/starter-kit` ^2.0.0): Basic editing extensions bundle
- **Next.js** (^14.0.0): React framework with App Router for API routes
- **Zod** (`zod` ^3.22.0): Runtime type validation for API requests

### Model Selection
- **Gemini 2.5 Flash-Lite**: Optimized for ultra-low latency (<200ms)
- **Thinking Budget**: 0 (disabled for minimum latency)
- **Max Output Tokens**: 6 (enforces short completions)

### Environment Requirements
- **GOOGLE_AI_API_KEY**: Required environment variable
- **NODE_ENV**: Production/development configuration
- **API_RATE_LIMIT**: Requests per minute (default: 60)

## Detailed Design

### Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Tiptap Editor │    │   Next.js API   │    │  Gemini 2.5     │
│   + Extension   │◄──►│     Route       │◄──►│  Flash-Lite     │
│                 │    │                 │    │                 │
│ • Ghost text    │    │ • Boundary trim │    │ • 6 tokens max  │
│ • Tab accept    │    │ • Stream parse  │    │ • 0.1 temp      │
│ • Debouncing    │    │ • Error handle  │    │ • No thinking   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### File Structure
```
├── app/
│   ├── api/
│   │   └── complete/
│   │       └── route.ts          # AI completion API endpoint
│   └── page.tsx                  # Main editor page
├── lib/
│   └── InlineComplete.ts         # Tiptap extension
└── styles/
    └── globals.css               # Ghost text styling
```

### 1. Enhanced Server-Side API (`app/api/complete/route.ts`)

**Simplified Demo Implementation:**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { streamText } from 'ai';
import { google } from '@ai-sdk/google';
import { z } from 'zod';

// Basic input validation for demo
const RequestSchema = z.object({
  left: z.string().min(1).max(1000) // Simplified validation
});

// System prompt and boundary detection
const SYSTEM = `You are an inline autocomplete engine.
- Output ONLY the minimal continuation of the user's text.
- No introductions, no sentences, no punctuation unless it is literally the next character.
- Never add quotes/formatting; no trailing whitespace.`;

const BOUNDARY = /[\s\n\r\t,.;:!?…，。？！、）\)\]\}]/;

export async function POST(request: NextRequest) {
  try {
    // Basic input validation
    const body = await request.json();
    const validation = RequestSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', type: 'INVALID_INPUT' },
        { status: 400 }
      );
    }

    const { left } = validation.data;

    // AI completion with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 500);

    try {
      const { textStream } = await streamText({
        model: google('gemini-2.5-flash-lite'),
        system: SYSTEM,
        prompt: left,
        maxTokens: 6,
        temperature: 0.1,
        topP: 0.9,
        stopSequences: ['\n', '```'],
        maxRetries: 1,
        abortSignal: controller.signal,
        experimental_providerMetadata: {
          google: { thinkingBudget: 0 }
        }
      });

      // Stream processing with boundary detection
      let output = '';
      for await (const delta of textStream) {
        output += delta;
        const boundaryMatch = output.match(BOUNDARY);
        if (boundaryMatch) {
          output = output.slice(0, boundaryMatch.index!);
          break;
        }
        if (output.length > 40) break; // Hard cap
      }

      // Clean output
      output = output.replace(/^\s+/, '').trim();
      
      clearTimeout(timeoutId);
      
      return NextResponse.json({ 
        tail: output,
        confidence: output.length > 0 ? 0.8 : 0.0
      });
      
    } catch (aiError) {
      clearTimeout(timeoutId);
      
      if (controller.signal.aborted) {
        return NextResponse.json(
          { error: 'Request timeout', type: 'SERVICE_UNAVAILABLE' },
          { status: 408 }
        );
      }
      
      console.error('AI completion failed:', aiError);
      return NextResponse.json(
        { error: 'AI service unavailable', type: 'SERVICE_UNAVAILABLE' },
        { status: 503 }
      );
    }
    
  } catch (error) {
    console.error('API route error:', error);
    return NextResponse.json(
      { error: 'Internal server error', type: 'SERVICE_UNAVAILABLE' },
      { status: 500 }
    );
  }
}
```

**Key Features for Demo:**
- **Input Validation**: Basic Zod schema with length limits
- **Error Boundaries**: Simple error handling with graceful degradation
- **Request Timeout**: 500ms hard timeout for responsiveness
- **Boundary Detection**: Multi-language punctuation support
- **AI Integration**: Gemini 2.5 Flash-Lite with optimized settings

**Complete Type Definitions:**
```typescript
// Input validation with branded types
type ValidatedText = string & { readonly __brand: 'ValidatedText' };
type CompletionText = string & { readonly __brand: 'CompletionText' };

// Request interface with validation
interface CompletionRequest {
  left: ValidatedText;
  requestId?: string;
  context?: {
    documentType?: 'email' | 'article' | 'note' | 'other';
    language?: 'en' | 'es' | 'fr' | 'de';
  };
}

// Success response
interface CompletionResponse {
  tail: CompletionText;
  confidence?: number; // AI confidence score 0-1
  requestId?: string;
}

// Error response types
type CompletionError = 
  | { type: 'NETWORK_ERROR'; message: string; retryable: true }
  | { type: 'INVALID_INPUT'; message: string; retryable: false }
  | { type: 'RATE_LIMITED'; message: string; retryable: true; retryAfter: number }
  | { type: 'SERVICE_UNAVAILABLE'; message: string; retryable: true }
  | { type: 'CONTENT_FILTERED'; message: string; retryable: false };

// API response union type
type ApiResponse = 
  | { success: true; data: CompletionResponse }
  | { success: false; error: CompletionError };

// Extension configuration types
interface InlineCompleteOptions {
  fetchTail: (left: string) => Promise<ApiResponse>;
  debounceMs?: number;
  maxPrefixLength?: number;
  enabled?: boolean;
}

// Plugin state interface
interface InlineCompleteState {
  suggestion: CompletionText | null;
  requestId: string | null;
  lastQuery: string | null;
  isLoading: boolean;
  abortController: AbortController | null;
}
```

**Boundary Regex:**
```typescript
const BOUNDARY = /[\s\n\r\t,.;:!?…，。？！、）\)\]\}]/;
```

**AI Configuration with Error Handling:**
```typescript
const modelConfig = {
  model: google('gemini-2.5-flash-lite'),
  maxTokens: 6,
  temperature: 0.1,
  topP: 0.9,
  stopSequences: ['\n', '```'],
  maxRetries: 1, // Fast fail for autocomplete
  timeout: 500, // Absolute timeout limit
  experimental_providerMetadata: {
    google: { thinkingBudget: 0 }
  }
};

// Request validation schema
const RequestSchema = z.object({
  left: z.string()
    .min(1, 'Text cannot be empty')
    .max(5000, 'Text too long')
    .refine(text => !text.includes('\0'), 'Invalid characters')
});
```

### 2. Tiptap Extension with Resource Management (`lib/InlineComplete.ts`)

**Enhanced Implementation with Cleanup:**

```typescript
class AutocompleteManager {
  private abortController?: AbortController;
  private debounceTimer?: NodeJS.Timeout;
  private cache = new Map<string, CompletionText>();
  private readonly maxCacheSize = 50;

  cleanup() {
    this.abortController?.abort();
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = undefined;
    }
  }

  async fetchCompletion(text: string): Promise<ApiResponse> {
    this.cleanup(); // Cancel previous requests
    
    // Check cache first
    const cached = this.cache.get(text);
    if (cached) {
      return { success: true, data: { tail: cached } };
    }

    this.abortController = new AbortController();
    
    try {
      const response = await fetch('/api/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ left: text }),
        signal: this.abortController.signal,
      });

      if (!response.ok) {
        return {
          success: false,
          error: {
            type: response.status === 429 ? 'RATE_LIMITED' : 'SERVICE_UNAVAILABLE',
            message: `API error: ${response.status}`,
            retryable: true,
            ...(response.status === 429 && { retryAfter: 5 })
          }
        };
      }

      const result = await response.json();
      
      // Cache successful result
      if (this.cache.size >= this.maxCacheSize) {
        const firstKey = this.cache.keys().next().value;
        this.cache.delete(firstKey);
      }
      this.cache.set(text, result.tail);
      
      return { success: true, data: result };
    } catch (error) {
      if (error.name === 'AbortError') {
        return { success: false, error: { type: 'NETWORK_ERROR', message: 'Request cancelled', retryable: false } };
      }
      return { success: false, error: { type: 'NETWORK_ERROR', message: 'Network failure', retryable: true } };
    }
  }
}

const createInlineCompletePlugin = (options: InlineCompleteOptions) => {
  const manager = new AutocompleteManager();
  const pluginKey = new PluginKey<InlineCompleteState>('inlineComplete');

  return new Plugin({
    key: pluginKey,
    state: {
      init: () => ({
        suggestion: null,
        requestId: null,
        lastQuery: null,
        isLoading: false,
        abortController: null
      }),
      apply(tr, prevState) {
        const meta = tr.getMeta(pluginKey);
        return meta ? { ...prevState, ...meta } : prevState;
      }
    },
    props: {
      decorations(state) {
        const pluginState = pluginKey.getState(state);
        if (!pluginState?.suggestion) return DecorationSet.empty;
        
        const { from } = state.selection;
        const widget = document.createElement('span');
        widget.className = 'ghost-suggestion';
        widget.textContent = pluginState.suggestion;
        widget.setAttribute('aria-hidden', 'true');
        
        const decoration = Decoration.widget(from, widget, { side: 1 });
        return DecorationSet.create(state.doc, [decoration]);
      },
      handleKeyDown(view, event) {
        // Enhanced IME safety
        if (view.composing || event.isComposing || event.keyCode === 229) {
          return false;
        }

        const state = pluginKey.getState(view.state);
        
        if (event.key === 'Tab' && !event.shiftKey && state?.suggestion) {
          event.preventDefault();
          view.dispatch(
            view.state.tr.insertText(state.suggestion)
              .setMeta(pluginKey, { suggestion: null })
          );
          return true;
        }

        if (event.key === 'Escape' && state?.suggestion) {
          view.dispatch(
            view.state.tr.setMeta(pluginKey, { suggestion: null })
          );
          return true;
        }

        return false;
      },
      handleTextInput(view) {
        scheduleCompletion(view, manager, pluginKey, options);
        return false;
      },
      handleClick(view) {
        view.dispatch(
          view.state.tr.setMeta(pluginKey, { suggestion: null })
        );
        return false;
      }
    },
    view() {
      return {
        destroy() {
          manager.cleanup();
        }
      };
    }
  });
};
```

### 3. React Integration with Proper Cleanup (`app/page.tsx`)

**Enhanced React Integration:**
```typescript
import React, { useCallback, useEffect, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { InlineComplete } from '@/lib/InlineComplete';

const AutocompleteEditor: React.FC = () => {
  const abortControllerRef = useRef<AbortController | null>(null);
  
  const fetchTail = useCallback(async (left: string): Promise<ApiResponse> => {
    // Cancel previous request
    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();
    
    try {
      const response = await fetch('/api/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ left }),
        signal: abortControllerRef.current.signal,
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      if (error.name === 'AbortError') {
        return { success: false, error: { type: 'NETWORK_ERROR', message: 'Cancelled', retryable: false } };
      }
      console.error('Autocomplete failed:', error);
      return { success: false, error: { type: 'NETWORK_ERROR', message: 'Network failure', retryable: true } };
    }
  }, []);

  const editor = useEditor({
    extensions: [
      StarterKit,
      InlineComplete.configure({
        fetchTail,
        debounceMs: 120,
        maxPrefixLength: 1000,
        enabled: true,
      }),
    ],
    content: '',
    autofocus: 'end',
  }, [fetchTail]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
      editor?.destroy();
    };
  }, [editor]);

  if (!editor) {
    return <div>Loading editor...</div>;
  }

  return (
    <div className="prose mx-auto max-w-4xl p-6">
      <h1>AI Autocomplete Demo</h1>
      <div className="border border-gray-300 rounded-lg p-4 min-h-[200px]">
        <EditorContent editor={editor} />
      </div>
      <p className="text-sm text-gray-500 mt-2">
        Press <kbd className="px-2 py-1 bg-gray-100 rounded">Tab</kbd> to accept suggestions,{' '}
        <kbd className="px-2 py-1 bg-gray-100 rounded">Esc</kbd> to dismiss.
      </p>
    </div>
  );
};

// Error boundary wrapper
class AutocompleteErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 border border-red-300 rounded-lg">
          <p>Editor failed to load. Please refresh the page.</p>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function Page() {
  return (
    <AutocompleteErrorBoundary>
      <AutocompleteEditor />
    </AutocompleteErrorBoundary>
  );
}
```

### 4. Styling (`styles/globals.css`)

```css
.ghost-suggestion {
  opacity: 0.35;
  pointer-events: none;
  white-space: pre;
  color: #6b7280; /* Subtle gray */
}
```

## User Experience

### Interaction Flow

1. **User Types**: Normal text input in the Tiptap editor
2. **Debounce Wait**: 120ms delay after last keystroke
3. **API Request**: Send text-before-cursor to completion endpoint
4. **Ghost Display**: Show suggestion as translucent text at cursor
5. **User Action**:
   - `Tab`: Accept suggestion, insert text, continue typing
   - `Escape`: Dismiss suggestion
   - Continue typing: Replace suggestion with new one
   - Click elsewhere: Auto-dismiss suggestion

### Visual Design

- **Ghost Text**: 35% opacity, gray color, positioned at cursor
- **Seamless Integration**: No modal dialogs, dropdowns, or popup overlays
- **Keyboard-First**: Primary interaction via Tab (accept) and Escape (dismiss)
- **Non-Blocking**: Users can ignore suggestions and continue typing normally

## Testing Strategy

### Core Testing Strategy

**Server Route Tests** (`__tests__/api/complete.test.ts`):
```typescript
// Purpose: Verify core API functionality
describe('Completion API', () => {
  test('should enforce input validation', async () => {
    const response = await fetch('/api/complete', {
      method: 'POST',
      body: JSON.stringify({ left: '' })
    });
    expect(response.status).toBe(400);
  });
  
  test('should trim at English word boundaries', async () => {
    const mockStream = jest.fn().mockResolvedValue({ textStream: ['hello', ' world', '!'] });
    jest.mocked(streamText).mockResolvedValue(mockStream);
    
    const response = await POST({ json: () => ({ left: 'The quick' }) });
    const result = await response.json();
    
    expect(result.tail).toBe('hello'); // Stops at space
  });
  
  test('should handle timeout gracefully', async () => {
    // Mock slow AI response
    const mockStream = jest.fn().mockImplementation(() => 
      new Promise(resolve => setTimeout(resolve, 1000))
    );
    jest.mocked(streamText).mockResolvedValue(mockStream);
    
    const response = await POST({ json: () => ({ left: 'test' }) });
    expect(response.status).toBe(408); // Timeout
  });
});
```

**Extension Tests** (`__tests__/lib/InlineComplete.test.ts`):
```typescript
// Purpose: Test extension lifecycle and resource cleanup
describe('InlineComplete Extension', () => {
  test('should cleanup resources on destroy', () => {
    const plugin = createInlineCompletePlugin({ fetchTail: jest.fn() });
    const view = createTestView();
    
    const pluginView = plugin.spec.view!(view);
    const cleanupSpy = jest.spyOn(pluginView, 'destroy');
    
    pluginView.destroy!();
    expect(cleanupSpy).toHaveBeenCalled();
  });
  
  test('should cancel pending requests on new input', async () => {
    const abortSpy = jest.fn();
    const mockFetch = jest.fn().mockImplementation(() => 
      new Promise(resolve => setTimeout(resolve, 1000))
    );
    
    global.fetch = mockFetch;
    global.AbortController = jest.fn(() => ({ abort: abortSpy, signal: {} }));
    
    // Type two characters quickly
    await simulateTyping(['h', 'e']);
    
    expect(abortSpy).toHaveBeenCalled();
  });
  
  test('should handle Tab acceptance correctly', () => {
    const view = createTestViewWithSuggestion('world');
    const tabEvent = new KeyboardEvent('keydown', { key: 'Tab' });
    
    const handled = handleKeyDown(view, tabEvent);
    
    expect(handled).toBe(true);
    expect(view.state.doc.textContent).toContain('world');
  });
});
```

### Integration Testing (Focused)

**End-to-End Flow** (`__tests__/integration/autocomplete.test.ts`):
```typescript
// Purpose: Test critical user paths only
describe('Autocomplete Integration', () => {
  test('should complete full typing flow', async () => {
    // Setup: Mount editor with mock API
    const { getByRole } = render(<AutocompleteEditor />);
    const editor = getByRole('textbox');
    
    // Act: Type text and wait for suggestion
    fireEvent.input(editor, { target: { textContent: 'Hello' } });
    await waitFor(() => {
      expect(screen.getByText('world')).toHaveClass('ghost-suggestion');
    });
    
    // Act: Press Tab to accept
    fireEvent.keyDown(editor, { key: 'Tab' });
    
    // Assert: Text inserted
    expect(editor.textContent).toBe('Hello world');
  });
  
  test('should handle network failures silently', async () => {
    // Mock network failure
    global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));
    
    const { getByRole } = render(<AutocompleteEditor />);
    const editor = getByRole('textbox');
    
    // Should not crash when typing
    fireEvent.input(editor, { target: { textContent: 'Hello' } });
    
    // Wait for debounce, verify no ghost text appears
    await new Promise(resolve => setTimeout(resolve, 200));
    expect(screen.queryByText(/world/)).not.toBeInTheDocument();
  });
});
```

**Essential Edge Cases Only:**
```typescript
// __tests__/edge-cases/ime.test.ts - Only if supporting CJK
test('should respect IME composition state', () => {
  const view = createTestView();
  view.composing = true;
  
  const result = handleTextInput(view);
  expect(result).toBe(false); // Should not trigger completion
});

// __tests__/edge-cases/performance.test.ts - Latency validation
test('should meet 200ms latency requirement', async () => {
  const startTime = Date.now();
  
  const result = await fetch('/api/complete', {
    method: 'POST',
    body: JSON.stringify({ left: 'The quick brown' })
  });
  
  const latency = Date.now() - startTime;
  expect(latency).toBeLessThan(200);
  expect(result.ok).toBe(true);
});
```

**Simplified Mocking:**
- Mock AI SDK `streamText` with predictable 1-2 word responses
- Mock `fetch` for error scenarios only
- Use real ProseMirror for integration tests (not mocked)

## Performance Considerations

### Latency Optimization

1. **Model Selection**: Gemini 2.5 Flash-Lite optimized for <200ms response
2. **Thinking Disabled**: `thinkingBudget: 0` eliminates reasoning overhead  
3. **Token Limits**: 6 token maximum prevents long generation delays
4. **Streaming**: Process responses as they arrive, not waiting for completion

### Rate Limiting

1. **Debouncing**: 120ms delay prevents keystroke spam
2. **Query Caching**: Avoid duplicate requests for same prefix
3. **Request Cancellation**: Cancel pending requests when new ones start
4. **Graceful Degradation**: Continue working if API is unavailable

### Client-Side Optimization

1. **Minimal DOM Updates**: Only update decorations when necessary
2. **Event Delegation**: Efficient keyboard event handling
3. **Memory Management**: Clean up timers and pending requests

### Server-Side Optimization

1. **Edge Runtime**: Deploy API route to edge for lower latency
2. **Response Streaming**: Use streaming responses for faster perceived performance
3. **Error Boundaries**: Fast-fail on invalid inputs

## Security Considerations

### Input Validation

- **Content Sanitization**: Validate and sanitize text input to prevent injection
- **Rate Limiting**: Implement per-IP rate limiting on API endpoint
- **Input Size Limits**: Enforce maximum prefix length (e.g., 5000 characters)

### API Security

- **CORS Configuration**: Restrict cross-origin requests appropriately
- **Request Validation**: Validate JSON structure and required fields
- **Error Information**: Avoid leaking sensitive information in error responses

### Content Safety

- **Model Safety**: Gemini models have built-in safety filters
- **Content Filtering**: Consider additional filtering for sensitive content
- **User Control**: Provide easy way to disable feature if needed

## Documentation

### Developer Documentation

1. **API Reference**: Document `/api/complete` endpoint specification
2. **Extension Guide**: How to configure and extend the Tiptap plugin
3. **Deployment Guide**: Environment variables and production setup
4. **Troubleshooting**: Common issues and debugging tips

### User Documentation

1. **Feature Guide**: How to use the autocomplete feature
2. **Keyboard Shortcuts**: Tab to accept, Escape to dismiss
3. **Browser Compatibility**: Supported browsers and known issues

## Implementation Phases

### Phase 1: MVP Core Functionality
- ✅ Basic API route with Gemini integration and input validation
- ✅ Tiptap extension with ghost text display and proper cleanup
- ✅ Tab-to-accept and Escape-to-dismiss interactions
- ✅ Request cancellation and debouncing
- ✅ Basic error handling and graceful degradation
- ✅ React integration with error boundaries

**Success Criteria**: Working autocomplete with <300ms P95 latency, no memory leaks

### Phase 2: Demo Enhancement
- ✅ Comprehensive test suite (unit + integration)
- ✅ Performance optimization (<200ms P50 latency target)
- ✅ Basic input validation
- ✅ Error handling and graceful degradation
- ✅ Code quality and documentation

**Success Criteria**: Demo-ready with comprehensive testing

**Deferred Features** (Not needed for initial release):
- ❌ Advanced configuration options (YAGNI)
- ❌ Analytics and detailed usage metrics
- ❌ Multi-language support beyond English
- ❌ Advanced accessibility features
- ❌ Complex performance monitoring dashboard

## Demo Configuration

### Environment Variables
```bash
# Required for demo
GOOGLE_AI_API_KEY=your_api_key_here

# Optional demo settings
DEBOUNCE_MS=120               # Debounce delay
```

### Basic Error Handling
```typescript
// Simple error boundaries for demo
const handleApiError = (error: Error) => {
  console.error('Autocomplete error:', error);
  // Gracefully degrade - no suggestions shown
  return null;
};
```

## References

### Technical Documentation
- [AI SDK v5 Documentation](https://ai-sdk.dev/docs/reference/ai-sdk-core/stream-text)
- [Gemini 2.5 Flash-Lite Docs](https://cloud.google.com/vertex-ai/generative-ai/docs/models/gemini/2-5-flash-lite)
- [Tiptap Extensions API](https://tiptap.dev/docs/editor/extensions/custom-extensions)
- [ProseMirror Plugin Guide](https://prosemirror.net/docs/guide/#state.plugins)

### Design Patterns
- [Ghost Text UX Patterns](https://tiptap.dev/docs/editor/api/utilities/suggestion)
- [Keystroke-level Text Completion](https://microsoft.github.io/language-server-protocol/specifications/lsp/3.17/specification/#textDocument_completion)
- [Debouncing Best Practices](https://web.dev/debounce-throttle/)

### Related Projects
- [GitHub Copilot](https://github.com/features/copilot) - Code completion inspiration
- [Vercel AI SDK Examples](https://vercel.com/blog/ai-sdk-5) - Implementation patterns
- [Tiptap Content AI](https://tiptap.dev/docs/content-ai) - Commercial alternative approach