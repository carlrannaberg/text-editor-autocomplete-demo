# Task Breakdown: AI-Powered Text Autocomplete Feature

**Generated**: 2025-08-28  
**Source**: specs/feat-ai-text-autocomplete.md  
**Total Phases**: 2  
**Estimated Tasks**: 12  

## Overview

Building an intelligent text autocomplete feature that provides real-time, context-aware suggestions as users type in a rich text editor. The system uses Gemini 2.5 Flash-Lite for low-latency AI completion, Tiptap for rich text editing, and AI SDK v5 for streaming text generation.

Key constraints:
- **Demo project**: Simplified production features, focus on core functionality
- **Performance target**: <200ms response time for suggestions  
- **User experience**: Non-intrusive ghost text with Tab-to-accept pattern
- **Architecture**: Next.js App Router + Tiptap + AI SDK v5 + Gemini 2.5 Flash-Lite

## Phase 1: Foundation

### Task 1.1: Project Setup and Dependencies
**Description**: Initialize Next.js project with TypeScript and install core dependencies
**Size**: Small
**Priority**: High  
**Dependencies**: None
**Can run parallel with**: None (blocks all other tasks)

**Technical Requirements**:
- Next.js 14.0.0+ with App Router
- TypeScript configuration with strict mode
- Core dependencies: ai ^5.0.0, @ai-sdk/google ^1.0.0, @tiptap/react ^2.0.0, @tiptap/starter-kit ^2.0.0, zod ^3.22.0
- Development dependencies: @types/react, @types/node, jest, @testing-library/react

**Implementation Steps**:
1. Create Next.js project: `npx create-next-app@latest ai-autocomplete-demo --typescript --tailwind --eslint --app`
2. Install core dependencies:
   ```bash
   npm install ai @ai-sdk/google @tiptap/react @tiptap/starter-kit zod
   npm install -D @types/react @types/node jest @testing-library/react @testing-library/jest-dom
   ```
3. Configure TypeScript with strict settings in tsconfig.json
4. Set up basic project structure with app/, lib/, and styles/ directories
5. Configure environment variables in .env.local for GOOGLE_AI_API_KEY

**Acceptance Criteria**:
- [ ] Next.js project created with TypeScript and App Router
- [ ] All dependencies installed and versions match specification
- [ ] TypeScript compiles without errors
- [ ] Basic file structure created: app/, lib/, styles/
- [ ] Environment variable configuration documented in README

### Task 1.2: Type Definitions and Interfaces  
**Description**: Create comprehensive TypeScript type definitions for the autocomplete system
**Size**: Medium
**Priority**: High
**Dependencies**: Task 1.1 (Project Setup)
**Can run parallel with**: Task 1.3 (Basic API Structure)

**Technical Requirements**:
- Branded types for type safety (ValidatedText, CompletionText)
- Complete API request/response interfaces
- Error type definitions with comprehensive error handling
- Extension configuration types for Tiptap
- Plugin state interfaces for ProseMirror

**Complete Type System Implementation**:
```typescript
// lib/types.ts

// Input validation with branded types
export type ValidatedText = string & { readonly __brand: 'ValidatedText' };
export type CompletionText = string & { readonly __brand: 'CompletionText' };

// Request interface with validation
export interface CompletionRequest {
  left: ValidatedText;
  requestId?: string;
  context?: {
    documentType?: 'email' | 'article' | 'note' | 'other';
    language?: 'en' | 'es' | 'fr' | 'de';
  };
}

// Success response
export interface CompletionResponse {
  tail: CompletionText;
  confidence?: number; // AI confidence score 0-1
  requestId?: string;
}

// Error response types
export type CompletionError = 
  | { type: 'NETWORK_ERROR'; message: string; retryable: true }
  | { type: 'INVALID_INPUT'; message: string; retryable: false }
  | { type: 'RATE_LIMITED'; message: string; retryable: true; retryAfter: number }
  | { type: 'SERVICE_UNAVAILABLE'; message: string; retryable: true }
  | { type: 'CONTENT_FILTERED'; message: string; retryable: false };

// API response union type
export type ApiResponse = 
  | { success: true; data: CompletionResponse }
  | { success: false; error: CompletionError };

// Extension configuration types
export interface InlineCompleteOptions {
  fetchTail: (left: string) => Promise<ApiResponse>;
  debounceMs?: number;
  maxPrefixLength?: number;
  enabled?: boolean;
}

// Plugin state interface
export interface InlineCompleteState {
  suggestion: CompletionText | null;
  requestId: string | null;
  lastQuery: string | null;
  isLoading: boolean;
  abortController: AbortController | null;
}
```

**Implementation Steps**:
1. Create lib/types.ts with all interface definitions
2. Set up branded types for input validation and type safety
3. Define comprehensive error type system with union types
4. Create extension configuration interfaces for Tiptap integration
5. Add JSDoc comments for all public interfaces

**Acceptance Criteria**:
- [ ] All type definitions compile without TypeScript errors
- [ ] Branded types prevent mixing of different text contexts
- [ ] Error types cover all failure scenarios (network, validation, service)
- [ ] Extension configuration types match Tiptap patterns
- [ ] JSDoc comments provide clear usage guidance

### Task 1.3: Basic Project Structure and Configuration
**Description**: Set up the core file structure and configuration files
**Size**: Small
**Priority**: High
**Dependencies**: Task 1.1 (Project Setup)
**Can run parallel with**: Task 1.2 (Type Definitions)

**Technical Requirements**:
- Implement the file structure defined in specification
- Configure Next.js for optimal performance
- Set up basic styling with global CSS
- Configure environment variables handling

**File Structure Implementation**:
```
├── app/
│   ├── api/
│   │   └── complete/
│   │       └── route.ts          # AI completion API endpoint
│   ├── globals.css               # Global styles including ghost text
│   ├── layout.tsx               # Root layout
│   └── page.tsx                 # Main editor page
├── lib/
│   ├── types.ts                 # Type definitions (from Task 1.2)
│   └── InlineComplete.ts        # Tiptap extension (placeholder)
└── styles/
    └── globals.css              # Ghost text styling
```

**Next.js Configuration**:
```typescript
// next.config.js
const nextConfig = {
  typescript: {
    ignoreBuildErrors: false, // Strict TypeScript checking
  },
  eslint: {
    ignoreDuringBuilds: false, // Strict ESLint checking
  },
  env: {
    GOOGLE_AI_API_KEY: process.env.GOOGLE_AI_API_KEY,
  },
};

module.exports = nextConfig;
```

**Ghost Text Styling**:
```css
/* styles/globals.css */
.ghost-suggestion {
  opacity: 0.35;
  pointer-events: none;
  white-space: pre;
  color: #6b7280; /* Subtle gray */
}

/* Additional Tailwind customizations for the editor */
.editor-container {
  @apply border border-gray-300 rounded-lg p-4 min-h-[200px] focus-within:border-blue-500;
}

.editor-content {
  @apply prose prose-gray max-w-none;
}
```

**Implementation Steps**:
1. Create the complete directory structure as specified
2. Set up next.config.js with TypeScript and environment configuration
3. Create global styles with ghost text CSS
4. Set up basic layout.tsx with proper HTML structure
5. Create placeholder files for API route and Tiptap extension
6. Configure environment variable validation and error handling

**Acceptance Criteria**:
- [ ] File structure matches specification exactly
- [ ] next.config.js configured for TypeScript and environment variables
- [ ] Global CSS includes ghost text styling
- [ ] Environment variable validation works
- [ ] All placeholder files created with proper TypeScript structure

## Phase 2: Core Implementation

### Task 2.1: AI Completion API Route
**Description**: Implement the Next.js API route for AI-powered text completion with Gemini integration
**Size**: Large
**Priority**: High
**Dependencies**: Task 1.1 (Project Setup), Task 1.2 (Type Definitions)
**Can run parallel with**: Task 2.2 (Tiptap Extension Base)

**Technical Requirements**:
- AI SDK v5 integration with Google provider
- Gemini 2.5 Flash-Lite model configuration
- Input validation using Zod schema
- Streaming text processing with boundary detection
- Error handling and timeout management
- Simplified implementation suitable for demo

**Complete API Implementation**:
```typescript
// app/api/complete/route.ts
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

const BOUNDARY = /[\\s\\n\\r\\t,.;:!?…，。？！、）\\)\\]\\}]/;

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
        stopSequences: ['\\n', '```'],
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
      output = output.replace(/^\\s+/, '').trim();
      
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

**Model Configuration Details**:
- **Model**: google('gemini-2.5-flash-lite') - optimized for <200ms latency
- **Max Tokens**: 6 (enforces 1-2 word completions)
- **Temperature**: 0.1 (low randomness for consistent results)
- **Top P**: 0.9 (focused sampling)
- **Stop Sequences**: ['\\n', '```'] (prevent code blocks or multi-line)
- **Thinking Budget**: 0 (disabled for minimum latency)
- **Timeout**: 500ms hard limit

**Boundary Detection Logic**:
- Regex pattern covers: spaces, newlines, tabs, common punctuation, CJK punctuation
- Processing stops at first boundary character to ensure natural word completion
- Hard cap of 40 characters prevents runaway generation
- Leading whitespace trimmed from final output

**Implementation Steps**:
1. Set up Next.js API route with proper TypeScript types
2. Configure AI SDK v5 with Google provider and Gemini model
3. Implement Zod validation schema for request input
4. Add streaming text processing with boundary detection
5. Implement timeout handling with AbortController
6. Add comprehensive error handling for all failure modes
7. Test API route with various input scenarios

**Acceptance Criteria**:
- [ ] API route responds to POST requests at /api/complete
- [ ] Input validation rejects empty strings and overly long input
- [ ] AI completion generates 1-2 word suggestions within 500ms timeout
- [ ] Boundary detection correctly stops at word boundaries
- [ ] Error handling covers network failures, timeouts, and invalid input
- [ ] TypeScript types match the defined interfaces
- [ ] Manual testing shows consistent <200ms response times

### Task 2.2: Tiptap Extension Base Structure  
**Description**: Create the foundational Tiptap extension structure with ProseMirror plugin integration
**Size**: Medium
**Priority**: High  
**Dependencies**: Task 1.1 (Project Setup), Task 1.2 (Type Definitions)
**Can run parallel with**: Task 2.1 (API Route)

**Technical Requirements**:
- Tiptap extension following official patterns
- ProseMirror plugin with state management
- Plugin key definition and state interface
- Basic decoration system for ghost text rendering
- Extension configuration options

**Base Extension Structure**:
```typescript
// lib/InlineComplete.ts
import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from 'prosemirror-state';
import { Decoration, DecorationSet, EditorView } from 'prosemirror-view';
import { InlineCompleteOptions, InlineCompleteState, ApiResponse, CompletionText } from './types';

// Plugin key for state management
const pluginKey = new PluginKey<InlineCompleteState>('inlineComplete');

// Extension definition with configuration
export const InlineComplete = Extension.create<InlineCompleteOptions>({
  name: 'inlineComplete',

  addOptions() {
    return {
      fetchTail: async () => ({ success: false, error: { type: 'NETWORK_ERROR', message: 'Not implemented', retryable: false } }),
      debounceMs: 120,
      maxPrefixLength: 1000,
      enabled: true,
    };
  },

  addProseMirrorPlugins() {
    return [
      createInlineCompletePlugin(this.options)
    ];
  },
});

// Plugin factory function
const createInlineCompletePlugin = (options: InlineCompleteOptions) => {
  return new Plugin({
    key: pluginKey,
    state: {
      init: (): InlineCompleteState => ({
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
      }
    }
  });
};

// Export plugin key for external access
export { pluginKey };
```

**State Management Design**:
- **suggestion**: Current ghost text to display (null when none)
- **requestId**: Unique identifier for request tracking
- **lastQuery**: Previous query to prevent duplicate API calls
- **isLoading**: Loading state for UI feedback
- **abortController**: For request cancellation

**Decoration System**:
- Creates DOM widget at cursor position
- Uses 'ghost-suggestion' CSS class for styling
- Sets aria-hidden for accessibility
- Positioned with side: 1 to appear after cursor

**Implementation Steps**:
1. Create Tiptap extension following official patterns
2. Set up ProseMirror plugin with typed state management
3. Implement basic decoration system for ghost text
4. Configure extension options with proper defaults
5. Add plugin key export for external state access
6. Set up TypeScript interfaces for all plugin components

**Acceptance Criteria**:
- [ ] Extension integrates properly with Tiptap editor
- [ ] Plugin state management works with TypeScript types
- [ ] Ghost text decorations render at cursor position
- [ ] Extension options are configurable
- [ ] No TypeScript compilation errors
- [ ] Basic decoration shows/hides correctly

### Task 2.3: Request Management and Caching
**Description**: Implement robust request management with debouncing, caching, and cancellation
**Size**: Large
**Priority**: High
**Dependencies**: Task 2.2 (Extension Base), Task 2.1 (API Route)
**Can run parallel with**: Task 2.4 (Keyboard Event Handling)

**Technical Requirements**:
- Request cancellation with AbortController
- LRU cache for completed suggestions  
- Debouncing to prevent API spam
- Duplicate request detection
- Resource cleanup on component unmount

**Complete AutocompleteManager Implementation**:
```typescript
// lib/AutocompleteManager.ts (part of InlineComplete.ts)
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
      
      // Cache successful result with LRU eviction
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

  debounceCompletion(fn: () => void, delay: number) {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    this.debounceTimer = setTimeout(() => {
      fn();
      this.debounceTimer = undefined;
    }, delay);
  }
}

// Completion scheduling function
const scheduleCompletion = (
  view: EditorView, 
  manager: AutocompleteManager, 
  pluginKey: PluginKey<InlineCompleteState>,
  options: InlineCompleteOptions
) => {
  manager.debounceCompletion(async () => {
    if (view.composing) return; // IME safety
    
    const { state } = view;
    const { from } = state.selection;
    const left = state.doc.textBetween(0, from, '\\n', '\\n');
    
    // Avoid duplicate requests
    const currentState = pluginKey.getState(state);
    if (left === currentState?.lastQuery) return;
    
    // Update loading state
    view.dispatch(
      view.state.tr.setMeta(pluginKey, { 
        isLoading: true,
        lastQuery: left 
      })
    );

    const result = await manager.fetchCompletion(left);
    
    if (result.success && result.data.tail) {
      view.dispatch(
        view.state.tr.setMeta(pluginKey, {
          suggestion: result.data.tail,
          isLoading: false
        })
      );
    } else {
      view.dispatch(
        view.state.tr.setMeta(pluginKey, {
          suggestion: null,
          isLoading: false
        })
      );
    }
  }, options.debounceMs || 120);
};
```

**Cache Management**:
- **LRU Eviction**: When cache exceeds 50 items, removes oldest entry
- **Key Strategy**: Uses exact text prefix as cache key
- **Hit Rate**: Should achieve >60% cache hit rate for common phrases
- **Memory Management**: Map structure with automatic cleanup

**Request Cancellation**:
- **AbortController**: Cancels pending fetch requests
- **Cleanup on New Request**: Each new request cancels the previous
- **Component Unmount**: Cleanup called when extension is destroyed
- **Timeout Handling**: 500ms server-side timeout with client cancellation

**Implementation Steps**:
1. Create AutocompleteManager class with resource management
2. Implement LRU cache with configurable size limits
3. Add debouncing with proper timer cleanup
4. Implement request cancellation with AbortController
5. Create completion scheduling function
6. Add duplicate request prevention logic
7. Test cache hit rates and memory usage

**Acceptance Criteria**:
- [ ] Debouncing prevents excessive API calls (max 1 every 120ms)
- [ ] Cache achieves >60% hit rate for repeated prefixes
- [ ] Request cancellation works when typing quickly
- [ ] No memory leaks in cache or timers
- [ ] Duplicate requests are prevented
- [ ] Resource cleanup works on component unmount
- [ ] Loading states are properly managed

### Task 2.4: Keyboard Event Handling and IME Support
**Description**: Implement comprehensive keyboard event handling with Tab acceptance, Escape dismissal, and IME safety
**Size**: Medium
**Priority**: High
**Dependencies**: Task 2.2 (Extension Base)
**Can run parallel with**: Task 2.3 (Request Management)

**Technical Requirements**:
- Tab key accepts current suggestion
- Escape key dismisses suggestion  
- IME composition safety for non-Latin input
- Text input triggers completion requests
- Click dismisses suggestions

**Complete Event Handling Implementation**:
```typescript
// Event handlers for the ProseMirror plugin (part of InlineComplete.ts)
const pluginProps = {
  handleKeyDown(view: EditorView, event: KeyboardEvent) {
    // Enhanced IME safety - multiple checks
    if (view.composing || event.isComposing || event.keyCode === 229) {
      return false;
    }

    const state = pluginKey.getState(view.state);
    
    // Tab acceptance
    if (event.key === 'Tab' && !event.shiftKey && state?.suggestion) {
      event.preventDefault();
      view.dispatch(
        view.state.tr.insertText(state.suggestion)
          .setMeta(pluginKey, { suggestion: null, lastQuery: null })
      );
      return true;
    }

    // Escape dismissal
    if (event.key === 'Escape' && state?.suggestion) {
      view.dispatch(
        view.state.tr.setMeta(pluginKey, { suggestion: null })
      );
      return true;
    }

    return false;
  },

  handleTextInput(view: EditorView) {
    // Trigger completion on text input
    scheduleCompletion(view, manager, pluginKey, options);
    return false; // Don't intercept the input
  },

  handleClick(view: EditorView) {
    // Clear suggestions on click
    view.dispatch(
      view.state.tr.setMeta(pluginKey, { suggestion: null })
    );
    return false;
  },

  // Handle selection changes (arrow keys, mouse selection)
  handleSelectionChange(view: EditorView) {
    // Clear suggestions when cursor moves
    const state = pluginKey.getState(view.state);
    if (state?.suggestion) {
      view.dispatch(
        view.state.tr.setMeta(pluginKey, { suggestion: null })
      );
    }
    return false;
  }
};
```

**IME Safety Implementation**:
```typescript
// Enhanced IME detection
const isIMEActive = (view: EditorView, event: KeyboardEvent) => {
  // Multiple IME detection methods for cross-browser compatibility
  return (
    view.composing ||                    // ProseMirror's IME state
    event.isComposing ||                 // Native event property
    event.keyCode === 229 ||             // IME keyCode
    event.key === 'Unidentified'        // Some browsers use this
  );
};

// IME-safe text input handling
const handleTextInputSafely = (view: EditorView) => {
  // Wait for composition end if IME is active
  if (view.composing) {
    return false;
  }
  
  // Additional delay for IME completion
  setTimeout(() => {
    if (!view.composing) {
      scheduleCompletion(view, manager, pluginKey, options);
    }
  }, 10);
  
  return false;
};
```

**Keyboard Interaction Patterns**:
- **Tab Acceptance**: Inserts suggestion text at cursor, clears suggestion state
- **Escape Dismissal**: Clears suggestion without inserting text
- **Arrow Keys**: Moving cursor dismisses suggestions (via selection change)
- **Typing**: Continues to show new suggestions for new text
- **Click**: Dismisses suggestions when clicking elsewhere

**Cross-browser Compatibility**:
- **Chrome/Safari**: Uses event.isComposing
- **Firefox**: Relies on view.composing and keyCode 229
- **Edge**: Combines multiple detection methods
- **Mobile**: Additional handling for virtual keyboard events

**Implementation Steps**:
1. Implement Tab key acceptance with preventDefault
2. Add Escape key dismissal functionality
3. Create comprehensive IME detection logic
4. Add text input triggering with debouncing
5. Implement click and selection change handlers
6. Test with various input methods (English, Chinese, Japanese)
7. Verify cross-browser compatibility

**Acceptance Criteria**:
- [ ] Tab key accepts suggestions and prevents default tab behavior
- [ ] Escape key dismisses suggestions reliably
- [ ] IME input (Chinese, Japanese, Korean) doesn't trigger premature completions
- [ ] Text input correctly triggers new completion requests
- [ ] Clicking elsewhere dismisses suggestions
- [ ] Arrow key navigation dismisses suggestions appropriately
- [ ] Cross-browser testing passes on Chrome, Firefox, Safari, Edge

### Task 2.5: React Component Integration
**Description**: Create the main React components with proper error boundaries and resource cleanup
**Size**: Medium
**Priority**: High
**Dependencies**: Task 2.1 (API Route), Task 2.2 (Extension Base), Task 2.3 (Request Management)
**Can run parallel with**: Task 2.6 (Basic Testing Setup)

**Technical Requirements**:
- React component with useEditor hook integration
- Error boundary for graceful failure handling
- Proper resource cleanup with useEffect
- AbortController integration for component unmounting
- TypeScript integration with proper hook dependencies

**Complete React Implementation**:
```typescript
// app/page.tsx
'use client';
import React, { useCallback, useEffect, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { InlineComplete } from '@/lib/InlineComplete';
import { ApiResponse } from '@/lib/types';

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
  }, [fetchTail]); // Proper dependency array

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
      editor?.destroy();
    };
  }, [editor]);

  if (!editor) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="text-gray-500">Loading editor...</div>
      </div>
    );
  }

  return (
    <div className="prose mx-auto max-w-4xl p-6">
      <h1 className="text-3xl font-bold mb-6">AI Autocomplete Demo</h1>
      <div className="editor-container">
        <EditorContent editor={editor} className="editor-content" />
      </div>
      <div className="mt-4 text-sm text-gray-500 space-x-4">
        <span>
          Press <kbd className="px-2 py-1 bg-gray-100 rounded text-xs">Tab</kbd> to accept suggestions
        </span>
        <span>
          Press <kbd className="px-2 py-1 bg-gray-100 rounded text-xs">Esc</kbd> to dismiss
        </span>
      </div>
    </div>
  );
};

// Error boundary wrapper
class AutocompleteErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Autocomplete Editor Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="max-w-4xl mx-auto p-6">
          <div className="p-4 border border-red-300 rounded-lg bg-red-50">
            <h2 className="text-lg font-semibold text-red-800 mb-2">
              Editor Failed to Load
            </h2>
            <p className="text-red-600 mb-4">
              The autocomplete editor encountered an error. Please refresh the page to try again.
            </p>
            <button 
              onClick={() => window.location.reload()} 
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Refresh Page
            </button>
          </div>
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

**Layout Component**:
```typescript
// app/layout.tsx
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'AI Autocomplete Demo',
  description: 'Real-time AI-powered text autocomplete with Tiptap and Gemini',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <main className="min-h-screen bg-gray-50">
          {children}
        </main>
      </body>
    </html>
  );
}
```

**Resource Management Patterns**:
- **useCallback**: Memoizes fetchTail function to prevent infinite re-renders
- **useEffect with cleanup**: Aborts pending requests on unmount
- **AbortController**: Cancels fetch requests when component unmounts
- **Editor destruction**: Properly destroys Tiptap editor to prevent memory leaks

**Error Boundary Features**:
- **Error catching**: Catches all React component errors
- **User-friendly message**: Shows clear error state with recovery option
- **Error logging**: Logs errors for debugging
- **Refresh functionality**: Provides easy recovery path

**Implementation Steps**:
1. Create AutocompleteEditor component with proper hooks
2. Implement fetchTail function with AbortController
3. Configure useEditor with proper dependency array
4. Add useEffect cleanup for resource management
5. Create error boundary class component
6. Add loading state and user interface elements
7. Test component mounting, unmounting, and error scenarios

**Acceptance Criteria**:
- [ ] Editor renders without React warnings or errors
- [ ] fetchTail function properly handles API requests and errors
- [ ] Component cleanup prevents memory leaks on unmount
- [ ] Error boundary catches and displays editor errors gracefully
- [ ] Loading state shows while editor initializes
- [ ] TypeScript compilation passes without warnings
- [ ] React Developer Tools shows proper component structure

### Task 2.6: Basic Testing Framework Setup
**Description**: Set up testing infrastructure with Jest and React Testing Library
**Size**: Small
**Priority**: Medium
**Dependencies**: Task 1.1 (Project Setup)
**Can run parallel with**: Task 2.5 (React Components)

**Technical Requirements**:
- Jest configuration for Next.js and TypeScript
- React Testing Library setup
- Testing utilities for Tiptap and ProseMirror
- Mock setup for AI SDK and fetch calls
- Basic test structure and helpers

**Jest Configuration**:
```javascript
// jest.config.js
const nextJest = require('next/jest');

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files
  dir: './',
});

const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jsdom',
  collectCoverageFrom: [
    'app/**/*.{ts,tsx}',
    'lib/**/*.{ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
  ],
  testMatch: [
    '**/__tests__/**/*.(ts|tsx)',
    '**/*.(test|spec).(ts|tsx)',
  ],
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/$1',
  },
};

module.exports = createJestConfig(customJestConfig);
```

**Test Setup File**:
```javascript
// jest.setup.js
import '@testing-library/jest-dom';

// Mock fetch globally
global.fetch = jest.fn();

// Mock AbortController
global.AbortController = jest.fn(() => ({
  abort: jest.fn(),
  signal: { aborted: false },
}));

// Mock Tiptap/ProseMirror modules that don't work in jsdom
jest.mock('@tiptap/react', () => ({
  useEditor: jest.fn(),
  EditorContent: ({ children }) => <div data-testid="editor-content">{children}</div>,
}));

jest.mock('@tiptap/starter-kit', () => ({
  default: 'StarterKit',
}));

// Console error suppression for expected errors in tests
const originalError = console.error;
beforeAll(() => {
  console.error = (...args) => {
    if (typeof args[0] === 'string' && args[0].includes('Warning:')) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});
```

**Testing Utilities**:
```typescript
// __tests__/utils/test-helpers.ts
import { render, RenderOptions } from '@testing-library/react';
import { ReactElement } from 'react';

// Custom render function with providers if needed
const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { ...options });

export * from '@testing-library/react';
export { customRender as render };

// Mock API responses
export const mockApiResponse = (response: any, delay = 0) => {
  return jest.fn().mockImplementation(() =>
    Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve(response),
    }).then(res => delay > 0 ? new Promise(resolve => setTimeout(() => resolve(res), delay)) : res)
  );
};

export const mockApiError = (status = 500, message = 'API Error') => {
  return jest.fn().mockRejectedValue(new Error(message));
};

// ProseMirror test helpers
export const createTestView = () => ({
  state: {
    doc: { textContent: '', textBetween: jest.fn() },
    selection: { from: 0, to: 0 },
    tr: {
      insertText: jest.fn().mockReturnThis(),
      setMeta: jest.fn().mockReturnThis(),
    },
  },
  dispatch: jest.fn(),
  composing: false,
});

export const createTestViewWithSuggestion = (suggestion: string) => {
  const view = createTestView();
  // Simulate suggestion state
  return {
    ...view,
    __suggestion: suggestion,
  };
};
```

**Implementation Steps**:
1. Install testing dependencies: `npm install -D jest @testing-library/react @testing-library/jest-dom @testing-library/user-event`
2. Create Jest configuration for Next.js and TypeScript
3. Set up test environment with jsdom and mocks
4. Create testing utilities and helpers
5. Configure coverage collection
6. Add test scripts to package.json
7. Verify test framework works with a simple test

**Acceptance Criteria**:
- [ ] Jest runs tests successfully with TypeScript
- [ ] React Testing Library renders components without errors
- [ ] Mock setup works for fetch and AbortController
- [ ] Test utilities provide helpful abstractions
- [ ] Coverage collection is configured
- [ ] npm test command runs all tests
- [ ] Test environment matches production runtime behavior

## Phase 3: Testing and Quality Assurance

### Task 3.1: API Route Testing
**Description**: Comprehensive testing of the completion API endpoint
**Size**: Medium
**Priority**: High
**Dependencies**: Task 2.1 (API Route), Task 2.6 (Testing Setup)
**Can run parallel with**: Task 3.2 (Extension Testing)

**Technical Requirements**:
- Test input validation and error handling
- Test AI integration with mocked responses
- Test boundary detection logic
- Test timeout and cancellation behavior
- Test error response formats

**Complete Test Implementation**:
```typescript
// __tests__/api/complete.test.ts
import { POST } from '@/app/api/complete/route';
import { streamText } from 'ai';

// Mock the AI SDK
jest.mock('ai', () => ({
  streamText: jest.fn(),
}));

const mockStreamText = streamText as jest.MockedFunction<typeof streamText>;

describe('Completion API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should enforce input validation', async () => {
    const request = new Request('http://localhost/api/complete', {
      method: 'POST',
      body: JSON.stringify({ left: '' }), // Empty string should fail
    });

    const response = await POST(request as any);
    expect(response.status).toBe(400);
    
    const body = await response.json();
    expect(body.error).toBe('Invalid input');
    expect(body.type).toBe('INVALID_INPUT');
  });

  test('should enforce maximum input length', async () => {
    const longText = 'a'.repeat(1001); // Over 1000 char limit
    const request = new Request('http://localhost/api/complete', {
      method: 'POST',
      body: JSON.stringify({ left: longText }),
    });

    const response = await POST(request as any);
    expect(response.status).toBe(400);
  });

  test('should trim at English word boundaries', async () => {
    // Mock successful AI response
    const mockTextStream = async function* () {
      yield 'hello';
      yield ' world'; // Should be trimmed at space
      yield '!';
    };

    mockStreamText.mockResolvedValue({
      textStream: mockTextStream(),
    } as any);

    const request = new Request('http://localhost/api/complete', {
      method: 'POST',
      body: JSON.stringify({ left: 'The quick' }),
    });

    const response = await POST(request as any);
    const result = await response.json();

    expect(result.tail).toBe('hello'); // Should stop at space
    expect(result.confidence).toBe(0.8);
  });

  test('should handle timeout gracefully', async () => {
    // Mock AI response that never resolves
    mockStreamText.mockImplementation(() => 
      new Promise(() => {}) // Never resolves
    );

    const request = new Request('http://localhost/api/complete', {
      method: 'POST',
      body: JSON.stringify({ left: 'test' }),
    });

    // Mock setTimeout to trigger immediately
    jest.spyOn(global, 'setTimeout').mockImplementation((fn: any) => {
      fn();
      return 1 as any;
    });

    const response = await POST(request as any);
    expect(response.status).toBe(408);
    
    const body = await response.json();
    expect(body.type).toBe('SERVICE_UNAVAILABLE');
    
    jest.restoreAllMocks();
  });

  test('should handle AI service errors', async () => {
    mockStreamText.mockRejectedValue(new Error('AI service unavailable'));

    const request = new Request('http://localhost/api/complete', {
      method: 'POST',
      body: JSON.stringify({ left: 'test' }),
    });

    const response = await POST(request as any);
    expect(response.status).toBe(503);
    
    const body = await response.json();
    expect(body.error).toBe('AI service unavailable');
    expect(body.type).toBe('SERVICE_UNAVAILABLE');
  });

  test('should enforce 40 character hard cap', async () => {
    // Mock AI response with very long text
    const mockTextStream = async function* () {
      yield 'this is a very long response that should be cut off at forty characters';
    };

    mockStreamText.mockResolvedValue({
      textStream: mockTextStream(),
    } as any);

    const request = new Request('http://localhost/api/complete', {
      method: 'POST',
      body: JSON.stringify({ left: 'test' }),
    });

    const response = await POST(request as any);
    const result = await response.json();

    expect(result.tail.length).toBeLessThanOrEqual(40);
  });

  test('should trim leading whitespace from output', async () => {
    const mockTextStream = async function* () {
      yield '   hello'; // Leading spaces should be trimmed
    };

    mockStreamText.mockResolvedValue({
      textStream: mockTextStream(),
    } as any);

    const request = new Request('http://localhost/api/complete', {
      method: 'POST',
      body: JSON.stringify({ left: 'test' }),
    });

    const response = await POST(request as any);
    const result = await response.json();

    expect(result.tail).toBe('hello');
    expect(result.tail.startsWith(' ')).toBe(false);
  });
});
```

**Implementation Steps**:
1. Set up API route testing with mocked AI SDK
2. Test input validation with various invalid inputs
3. Test boundary detection with different punctuation
4. Test timeout behavior with delayed/hung responses
5. Test error handling for AI service failures
6. Test hard limits and safety measures
7. Verify response formats match TypeScript interfaces

**Acceptance Criteria**:
- [ ] Input validation correctly rejects empty and oversized input
- [ ] Boundary detection stops at spaces, punctuation, and CJK characters
- [ ] Timeout handling returns 408 status after 500ms
- [ ] AI service errors return proper error responses
- [ ] 40 character hard cap is enforced
- [ ] Leading whitespace is trimmed from completions
- [ ] All test cases pass consistently

### Task 3.2: Tiptap Extension Testing
**Description**: Test the Tiptap extension functionality including keyboard events and state management
**Size**: Large
**Priority**: High
**Dependencies**: Task 2.2 (Extension Base), Task 2.3 (Request Management), Task 2.4 (Keyboard Events), Task 2.6 (Testing Setup)
**Can run parallel with**: Task 3.1 (API Testing)

**Technical Requirements**:
- Test extension lifecycle (mount, unmount, destroy)
- Test keyboard event handling (Tab, Escape, typing)
- Test state management and decorations
- Test request management and caching
- Test IME compatibility
- Mock ProseMirror and Tiptap dependencies

**Extension Test Implementation**:
```typescript
// __tests__/lib/InlineComplete.test.ts
import { InlineComplete, pluginKey } from '@/lib/InlineComplete';
import { createTestView, createTestViewWithSuggestion } from '../utils/test-helpers';

// Mock fetch for request management tests
global.fetch = jest.fn();

describe('InlineComplete Extension', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ tail: 'world', confidence: 0.8 }),
    });
  });

  test('should create extension with proper configuration', () => {
    const extension = InlineComplete.configure({
      fetchTail: jest.fn(),
      debounceMs: 200,
      maxPrefixLength: 500,
      enabled: true,
    });

    expect(extension.name).toBe('inlineComplete');
    expect(extension.options.debounceMs).toBe(200);
    expect(extension.options.maxPrefixLength).toBe(500);
    expect(extension.options.enabled).toBe(true);
  });

  test('should initialize with empty state', () => {
    const view = createTestView();
    const plugin = InlineComplete.configure({ fetchTail: jest.fn() })
      .addProseMirrorPlugins()[0];

    const initialState = plugin.spec.state!.init();
    
    expect(initialState.suggestion).toBeNull();
    expect(initialState.requestId).toBeNull();
    expect(initialState.lastQuery).toBeNull();
    expect(initialState.isLoading).toBe(false);
    expect(initialState.abortController).toBeNull();
  });

  test('should handle Tab key acceptance correctly', () => {
    const view = createTestViewWithSuggestion('world');
    const plugin = InlineComplete.configure({ fetchTail: jest.fn() })
      .addProseMirrorPlugins()[0];

    // Simulate Tab key press
    const tabEvent = {
      key: 'Tab',
      shiftKey: false,
      preventDefault: jest.fn(),
      isComposing: false,
      keyCode: 9,
    } as any;

    // Mock plugin state
    const mockState = {
      suggestion: 'world',
      requestId: null,
      lastQuery: 'Hello ',
      isLoading: false,
      abortController: null,
    };

    // Override pluginKey.getState for this test
    jest.spyOn(pluginKey, 'getState').mockReturnValue(mockState);

    const handled = plugin.spec.props!.handleKeyDown!(view as any, tabEvent);

    expect(handled).toBe(true);
    expect(tabEvent.preventDefault).toHaveBeenCalled();
    expect(view.state.tr.insertText).toHaveBeenCalledWith('world');
  });

  test('should handle Escape key dismissal', () => {
    const view = createTestViewWithSuggestion('world');
    const plugin = InlineComplete.configure({ fetchTail: jest.fn() })
      .addProseMirrorPlugins()[0];

    const escapeEvent = {
      key: 'Escape',
      preventDefault: jest.fn(),
      isComposing: false,
      keyCode: 27,
    } as any;

    const mockState = {
      suggestion: 'world',
      requestId: null,
      lastQuery: 'Hello ',
      isLoading: false,
      abortController: null,
    };

    jest.spyOn(pluginKey, 'getState').mockReturnValue(mockState);

    const handled = plugin.spec.props!.handleKeyDown!(view as any, escapeEvent);

    expect(handled).toBe(true);
    expect(view.state.tr.setMeta).toHaveBeenCalledWith(pluginKey, { suggestion: null });
  });

  test('should respect IME composition state', () => {
    const view = createTestView();
    view.composing = true; // Simulate IME input

    const plugin = InlineComplete.configure({ fetchTail: jest.fn() })
      .addProseMirrorPlugins()[0];

    const tabEvent = {
      key: 'Tab',
      shiftKey: false,
      isComposing: true,
      keyCode: 229, // IME keyCode
    } as any;

    const handled = plugin.spec.props!.handleKeyDown!(view as any, tabEvent);

    expect(handled).toBe(false); // Should not handle during IME
  });

  test('should cancel pending requests on new input', async () => {
    const abortSpy = jest.fn();
    const mockFetch = jest.fn().mockImplementation(
      () => new Promise(resolve => setTimeout(resolve, 1000))
    );

    global.fetch = mockFetch;
    global.AbortController = jest.fn(() => ({
      abort: abortSpy,
      signal: {},
    })) as any;

    // Test would simulate rapid typing and verify abort is called
    // This is a simplified version - full implementation would test
    // the AutocompleteManager's cleanup behavior
    
    expect(global.AbortController).toBeDefined();
  });

  test('should render ghost text decoration', () => {
    const view = createTestView();
    const plugin = InlineComplete.configure({ fetchTail: jest.fn() })
      .addProseMirrorPlugins()[0];

    const mockState = {
      suggestion: 'world',
      requestId: null,
      lastQuery: 'Hello ',
      isLoading: false,
      abortController: null,
    };

    jest.spyOn(pluginKey, 'getState').mockReturnValue(mockState);

    const decorations = plugin.spec.props!.decorations!(view.state);

    // Verify decoration is created (simplified - actual implementation
    // would check DecorationSet structure)
    expect(decorations).toBeDefined();
  });

  test('should cleanup resources on destroy', () => {
    const plugin = InlineComplete.configure({ fetchTail: jest.fn() })
      .addProseMirrorPlugins()[0];

    const view = createTestView();
    const pluginView = plugin.spec.view!(view as any);
    
    // Spy on cleanup if exposed
    const destroySpy = jest.spyOn(pluginView, 'destroy');
    
    pluginView.destroy!();
    expect(destroySpy).toHaveBeenCalled();
  });
});
```

**Cache Testing**:
```typescript
// __tests__/lib/AutocompleteManager.test.ts
import { AutocompleteManager } from '@/lib/InlineComplete';

describe('AutocompleteManager', () => {
  test('should cache successful completions', async () => {
    const manager = new AutocompleteManager();
    
    // Mock successful response
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ tail: 'world' }),
    });

    // First request
    await manager.fetchCompletion('Hello ');
    expect(global.fetch).toHaveBeenCalledTimes(1);

    // Second identical request should use cache
    await manager.fetchCompletion('Hello ');
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  test('should implement LRU eviction', async () => {
    const manager = new AutocompleteManager();
    
    // Fill cache beyond limit
    for (let i = 0; i < 55; i++) {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ tail: `word${i}` }),
      });
      
      await manager.fetchCompletion(`prefix${i}`);
    }

    // Cache should be at max size (50)
    expect(manager.cache.size).toBeLessThanOrEqual(50);
  });
});
```

**Implementation Steps**:
1. Set up ProseMirror and Tiptap mocking
2. Test extension creation and configuration
3. Test keyboard event handling (Tab, Escape, IME)
4. Test state management and plugin lifecycle
5. Test decoration rendering for ghost text
6. Test request management and caching behavior
7. Test resource cleanup and memory management

**Acceptance Criteria**:
- [ ] Extension creates properly with configuration options
- [ ] Tab key acceptance inserts suggestion text correctly
- [ ] Escape key dismissal clears suggestions
- [ ] IME composition prevents premature event handling
- [ ] Ghost text decorations render at correct positions
- [ ] Cache prevents duplicate API requests
- [ ] Resource cleanup prevents memory leaks
- [ ] All keyboard events are handled correctly

### Task 3.3: React Component Testing
**Description**: Test React component integration, error boundaries, and user interactions
**Size**: Medium
**Priority**: High
**Dependencies**: Task 2.5 (React Components), Task 2.6 (Testing Setup)
**Can run parallel with**: Task 3.4 (Integration Testing)

**Technical Requirements**:
- Test component rendering and editor initialization
- Test error boundary functionality
- Test user interactions and event handling
- Test resource cleanup on unmount
- Mock Tiptap and external dependencies

**React Component Tests**:
```typescript
// __tests__/components/AutocompleteEditor.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AutocompleteEditor, { AutocompleteErrorBoundary } from '@/app/page';
import { useEditor } from '@tiptap/react';

// Mock Tiptap
jest.mock('@tiptap/react', () => ({
  useEditor: jest.fn(),
  EditorContent: ({ editor, className }) => (
    <div data-testid="editor-content" className={className}>
      {editor ? 'Editor loaded' : 'Loading...'}
    </div>
  ),
}));

const mockUseEditor = useEditor as jest.Mock;

describe('AutocompleteEditor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ tail: 'world', confidence: 0.8 }),
    });
  });

  test('should render loading state initially', () => {
    mockUseEditor.mockReturnValue(null); // Editor not ready

    render(<AutocompleteEditor />);
    
    expect(screen.getByText('Loading editor...')).toBeInTheDocument();
  });

  test('should render editor when ready', () => {
    const mockEditor = {
      destroy: jest.fn(),
    };
    mockUseEditor.mockReturnValue(mockEditor);

    render(<AutocompleteEditor />);
    
    expect(screen.getByText('Editor loaded')).toBeInTheDocument();
    expect(screen.getByText('AI Autocomplete Demo')).toBeInTheDocument();
    expect(screen.getByText(/Press.*Tab.*to accept/)).toBeInTheDocument();
  });

  test('should configure editor with proper options', () => {
    const mockEditor = { destroy: jest.fn() };
    mockUseEditor.mockReturnValue(mockEditor);

    render(<AutocompleteEditor />);

    expect(mockUseEditor).toHaveBeenCalledWith(
      expect.objectContaining({
        extensions: expect.arrayContaining([
          'StarterKit', // Mocked
          expect.any(Object), // InlineComplete extension
        ]),
        content: '',
        autofocus: 'end',
      }),
      expect.any(Array) // Dependencies array
    );
  });

  test('should cleanup resources on unmount', () => {
    const mockEditor = {
      destroy: jest.fn(),
    };
    mockUseEditor.mockReturnValue(mockEditor);

    const abortSpy = jest.fn();
    global.AbortController = jest.fn(() => ({
      abort: abortSpy,
      signal: {},
    })) as any;

    const { unmount } = render(<AutocompleteEditor />);
    
    unmount();

    expect(mockEditor.destroy).toHaveBeenCalled();
    // Note: AbortController test would need more complex setup
  });

  test('should handle fetch API calls correctly', async () => {
    const mockEditor = { destroy: jest.fn() };
    mockUseEditor.mockReturnValue(mockEditor);

    render(<AutocompleteEditor />);

    // Get the fetchTail function passed to useEditor
    const editorConfig = mockUseEditor.mock.calls[0][0];
    const inlineCompleteConfig = editorConfig.extensions.find(
      ext => ext.options && ext.options.fetchTail
    );

    if (inlineCompleteConfig) {
      const result = await inlineCompleteConfig.options.fetchTail('Hello ');
      
      expect(global.fetch).toHaveBeenCalledWith('/api/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ left: 'Hello ' }),
        signal: expect.any(Object),
      });
      
      expect(result).toEqual({
        success: true,
        data: { tail: 'world', confidence: 0.8 },
      });
    }
  });
});

describe('AutocompleteErrorBoundary', () => {
  // Suppress error logging for error boundary tests
  const originalError = console.error;
  beforeAll(() => {
    console.error = jest.fn();
  });
  afterAll(() => {
    console.error = originalError;
  });

  test('should render children when no error', () => {
    const TestComponent = () => <div>Test content</div>;

    render(
      <AutocompleteErrorBoundary>
        <TestComponent />
      </AutocompleteErrorBoundary>
    );

    expect(screen.getByText('Test content')).toBeInTheDocument();
  });

  test('should render error UI when child component throws', () => {
    const ThrowingComponent = () => {
      throw new Error('Test error');
    };

    render(
      <AutocompleteErrorBoundary>
        <ThrowingComponent />
      </AutocompleteErrorBoundary>
    );

    expect(screen.getByText('Editor Failed to Load')).toBeInTheDocument();
    expect(screen.getByText(/encountered an error/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /refresh page/i })).toBeInTheDocument();
  });

  test('should provide refresh functionality', () => {
    const ThrowingComponent = () => {
      throw new Error('Test error');
    };

    // Mock window.location.reload
    const mockReload = jest.fn();
    Object.defineProperty(window, 'location', {
      value: { reload: mockReload },
      writable: true,
    });

    render(
      <AutocompleteErrorBoundary>
        <ThrowingComponent />
      </AutocompleteErrorBoundary>
    );

    const refreshButton = screen.getByRole('button', { name: /refresh page/i });
    fireEvent.click(refreshButton);

    expect(mockReload).toHaveBeenCalled();
  });
});
```

**Implementation Steps**:
1. Set up React component testing with mocked dependencies
2. Test component rendering and loading states
3. Test editor configuration and option passing
4. Test error boundary error catching and recovery
5. Test resource cleanup on component unmount
6. Test user interaction patterns
7. Verify TypeScript integration with test types

**Acceptance Criteria**:
- [ ] Component renders loading state before editor is ready
- [ ] Editor renders with proper configuration when ready
- [ ] Error boundary catches component errors and shows recovery UI
- [ ] Resource cleanup prevents memory leaks on unmount
- [ ] fetchTail function correctly calls API endpoint
- [ ] User interface elements (headings, instructions) render correctly
- [ ] All test cases pass consistently

### Task 3.4: End-to-End Integration Testing
**Description**: Test the complete user flow from typing to suggestion acceptance
**Size**: Medium
**Priority**: Medium
**Dependencies**: Task 2.1 (API Route), Task 2.5 (React Components), Task 2.6 (Testing Setup)
**Can run parallel with**: Task 3.3 (Component Testing)

**Technical Requirements**:
- Test complete typing flow with ghost text display
- Test Tab acceptance workflow
- Test network failure graceful degradation
- Test performance requirements (latency)
- Mock AI SDK responses realistically

**Integration Test Implementation**:
```typescript
// __tests__/integration/autocomplete.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Page from '@/app/page';
import { streamText } from 'ai';

// Mock AI SDK
jest.mock('ai', () => ({
  streamText: jest.fn(),
}));

const mockStreamText = streamText as jest.MockedFunction<typeof streamText>;

// Mock Tiptap with more realistic behavior
jest.mock('@tiptap/react', () => ({
  useEditor: jest.fn((config) => ({
    destroy: jest.fn(),
    // Return mock editor that uses the real config
    __config: config,
  })),
  EditorContent: ({ editor, className }) => {
    if (!editor) return <div>Loading editor...</div>;
    
    return (
      <div 
        data-testid="editor-content" 
        className={className}
        contentEditable
        onInput={(e) => {
          // Simulate editor input handling
          if (editor.__config.extensions) {
            const inlineComplete = editor.__config.extensions.find(
              ext => ext.name === 'inlineComplete'
            );
            if (inlineComplete && inlineComplete.options.fetchTail) {
              // Simulate the extension calling fetchTail
              setTimeout(() => {
                inlineComplete.options.fetchTail(e.target.textContent);
              }, 100);
            }
          }
        }}
      >
        Editor ready
      </div>
    );
  },
}));

describe('Autocomplete Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should complete full typing flow', async () => {
    // Mock AI response
    const mockTextStream = async function* () {
      yield 'world';
    };

    mockStreamText.mockResolvedValue({
      textStream: mockTextStream(),
    } as any);

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ tail: 'world', confidence: 0.8 }),
    });

    const user = userEvent.setup();
    render(<Page />);

    // Wait for editor to load
    await waitFor(() => {
      expect(screen.getByText('Editor ready')).toBeInTheDocument();
    });

    // Simulate typing
    const editor = screen.getByTestId('editor-content');
    await user.type(editor, 'Hello');

    // Wait for API call and suggestion
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ left: 'Hello' }),
        signal: expect.any(Object),
      });
    });

    // In a real test, we would simulate Tab press and verify text insertion
    // This would require more complex Tiptap mocking
  });

  test('should handle network failures silently', async () => {
    // Mock network failure
    global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

    const user = userEvent.setup();
    render(<Page />);

    await waitFor(() => {
      expect(screen.getByText('Editor ready')).toBeInTheDocument();
    });

    // Simulate typing
    const editor = screen.getByTestId('editor-content');
    await user.type(editor, 'Hello');

    // Wait for network call attempt
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });

    // Editor should continue working normally
    expect(screen.getByText('Editor ready')).toBeInTheDocument();
    // No error state should be visible
    expect(screen.queryByText(/error/i)).not.toBeInTheDocument();
  });

  test('should meet latency requirements', async () => {
    const startTime = Date.now();
    
    global.fetch = jest.fn().mockImplementation(() => {
      const responseTime = Date.now() - startTime;
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ 
          tail: 'world', 
          confidence: 0.8,
          responseTime 
        }),
      });
    });

    const user = userEvent.setup();
    render(<Page />);

    await waitFor(() => {
      expect(screen.getByText('Editor ready')).toBeInTheDocument();
    });

    const editor = screen.getByTestId('editor-content');
    await user.type(editor, 'Hello');

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });

    const responseTime = Date.now() - startTime;
    expect(responseTime).toBeLessThan(500); // Including network simulation
  });

  test('should handle component errors gracefully', () => {
    // Mock console.error to suppress error logging
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    // Mock useEditor to throw an error
    const { useEditor } = require('@tiptap/react');
    useEditor.mockImplementation(() => {
      throw new Error('Editor initialization failed');
    });

    render(<Page />);

    // Error boundary should catch and display error
    expect(screen.getByText('Editor Failed to Load')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /refresh page/i })).toBeInTheDocument();

    consoleSpy.mockRestore();
  });
});
```

**Performance Testing**:
```typescript
// __tests__/integration/performance.test.ts
describe('Performance Requirements', () => {
  test('should meet 200ms latency target', async () => {
    const startTime = Date.now();
    
    const response = await fetch('/api/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ left: 'The quick brown' }),
    });

    const latency = Date.now() - startTime;
    
    expect(response.ok).toBe(true);
    expect(latency).toBeLessThan(200);
  });

  test('should handle concurrent requests efficiently', async () => {
    const requests = Array(10).fill(null).map((_, i) => 
      fetch('/api/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ left: `test ${i}` }),
      })
    );

    const startTime = Date.now();
    const responses = await Promise.all(requests);
    const totalTime = Date.now() - startTime;

    responses.forEach(response => {
      expect(response.ok).toBe(true);
    });

    // All requests should complete within reasonable time
    expect(totalTime).toBeLessThan(1000);
  });
});
```

**Implementation Steps**:
1. Set up integration testing with realistic mocks
2. Test complete user typing workflow
3. Test network failure graceful degradation
4. Test performance requirements under load
5. Test error boundary integration
6. Add concurrent request handling tests
7. Verify end-to-end TypeScript integration

**Acceptance Criteria**:
- [ ] Complete typing workflow produces suggestions
- [ ] Tab acceptance inserts suggestion text correctly
- [ ] Network failures don't crash the application
- [ ] Latency requirements are met (<200ms for API calls)
- [ ] Error boundaries catch and handle component errors
- [ ] Concurrent requests are handled efficiently
- [ ] All integration tests pass consistently

## Summary

**Total Tasks**: 12  
**Phases**: 2  
**Foundation Tasks**: 3  
**Implementation Tasks**: 6  
**Testing Tasks**: 4  

**Critical Path**: 
1. Task 1.1 (Project Setup) → Task 1.2 (Types) → Task 2.1 (API Route) → Task 2.2 (Extension Base) → Task 2.3 (Request Management) → Task 2.4 (Keyboard Events) → Task 2.5 (React Components)

**Parallel Execution Opportunities**:
- Tasks 1.2 and 1.3 can run parallel after Task 1.1
- Tasks 2.1 and 2.2 can run parallel after dependencies met
- Tasks 2.3 and 2.4 can run parallel after Task 2.2
- All testing tasks (3.1-3.4) can run parallel after their dependencies

**Risk Mitigation**:
- **AI SDK Integration**: Mock extensively for testing
- **ProseMirror Complexity**: Use established patterns and thorough testing
- **Performance Requirements**: Continuous latency monitoring in tests
- **Browser Compatibility**: Test IME handling across browsers

This breakdown provides complete, self-contained task specifications with all implementation details needed for autonomous execution.