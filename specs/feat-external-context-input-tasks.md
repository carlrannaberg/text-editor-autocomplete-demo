# Task Breakdown: External Context Input for Autocomplete Enhancement

Generated: 2025-08-29  
Source: specs/feat-external-context-input.md  

## Overview

Build external context input functionality for the autocomplete system, allowing users to provide document context that guides AI completions. Implementation includes a React Context provider, ContextPanel UI component, API enhancements, and intelligent caching strategies.

## Implementation Phases

### Phase 1: Core Context Infrastructure (MVP)
Foundation tasks that establish basic context functionality.

### Phase 2: Enhanced UX and Performance 
Polish tasks that add structured hints, token counting, and optimization.

### Phase 3: Advanced Features (Optional)
Advanced tasks for power users and analytics.

---

## Phase 1: Foundation Tasks

### Task 1.1: Add New Dependencies for Context Feature
**Description**: Install required dependencies for token counting and context hashing
**Size**: Small  
**Priority**: High  
**Dependencies**: None  
**Can run parallel with**: None (blocks other tasks)

**Technical Requirements**:
- Add gpt3-tokenizer for client-side token counting approximation
- Ensure crypto API available for SHA-1 context hashing
- Update package.json with new dependencies

**Implementation Steps**:
1. Add gpt3-tokenizer dependency: `npm install gpt3-tokenizer`
2. Verify Node.js crypto module is available (built-in)
3. Update TypeScript types if needed

**Acceptance Criteria**:
- [ ] gpt3-tokenizer installed and importable
- [ ] Crypto API available for SHA-1 hashing
- [ ] No dependency conflicts with existing packages
- [ ] TypeScript compilation succeeds

---

### Task 1.2: Create CompletionContext Provider Infrastructure
**Description**: Build React Context provider for managing context state across components
**Size**: Medium  
**Priority**: High  
**Dependencies**: Task 1.1  
**Can run parallel with**: Task 1.3

**Technical Requirements**:
Create `lib/context/CompletionContext.tsx` with full state management system.

**Complete Interface Implementation**:
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

interface CompletionContextState {
  contextText: string;
  documentType?: 'email' | 'article' | 'note' | 'other';
  language?: 'en' | 'es' | 'fr' | 'de';
  tone?: 'neutral' | 'formal' | 'casual' | 'persuasive';
  audience?: string;
  keywords?: string[];
}
```

**Core Implementation Functions**:
```typescript
// Context normalization for stable hashing
const normalizeContext = (context: CompletionContextState) => ({
  userContext: context.contextText?.trim() || '',
  documentType: context.documentType || '',
  language: context.language || '',
  tone: context.tone || '',
  audience: context.audience?.trim() || '',
  keywords: context.keywords?.sort().join(',') || ''
});

// SHA-1 hash generation for cache keys
const generateContextHash = async (context: CompletionContextState): Promise<string> => {
  const normalized = normalizeContext(context);
  const contextString = JSON.stringify(normalized);
  
  const encoder = new TextEncoder();
  const data = encoder.encode(contextString);
  const hashBuffer = await crypto.subtle.digest('SHA-1', data);
  
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
};

// Token counting approximation
const estimateTokenCount = (text: string): number => {
  // Basic approximation: ~4 characters per token
  return Math.ceil(text.length / 4);
};
```

**localStorage Integration**:
```typescript
const CONTEXT_STORAGE_KEY = 'autocomplete-context';

// Save to localStorage
const saveToLocalStorage = (context: CompletionContextState) => {
  try {
    localStorage.setItem(CONTEXT_STORAGE_KEY, JSON.stringify(context));
  } catch (error) {
    console.warn('Failed to save context to localStorage:', error);
  }
};

// Load from localStorage
const loadFromLocalStorage = (): CompletionContextState => {
  try {
    const stored = localStorage.getItem(CONTEXT_STORAGE_KEY);
    return stored ? JSON.parse(stored) : getDefaultContext();
  } catch (error) {
    console.warn('Failed to load context from localStorage:', error);
    return getDefaultContext();
  }
};

const getDefaultContext = (): CompletionContextState => ({
  contextText: '',
  documentType: undefined,
  language: undefined,
  tone: undefined,
  audience: undefined,
  keywords: []
});
```

**Provider Implementation Pattern**:
```typescript
export const CompletionContextProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [context, setContext] = useState<CompletionContextState>(() => loadFromLocalStorage());
  
  const updateContext = useCallback((updates: Partial<CompletionContextState>) => {
    setContext(prev => {
      const updated = { ...prev, ...updates };
      saveToLocalStorage(updated);
      return updated;
    });
  }, []);

  const clearContext = useCallback(() => {
    const defaultContext = getDefaultContext();
    setContext(defaultContext);
    saveToLocalStorage(defaultContext);
  }, []);

  const getContextHash = useCallback(async () => {
    return await generateContextHash(context);
  }, [context]);

  const getTokenCount = useCallback(() => {
    const fullContext = JSON.stringify(context);
    return estimateTokenCount(fullContext);
  }, [context]);

  const value: CompletionContextValue = {
    ...context,
    updateContext,
    clearContext,
    getContextHash,
    getTokenCount
  };

  return (
    <CompletionContext.Provider value={value}>
      {children}
    </CompletionContext.Provider>
  );
};
```

**Custom Hook**:
```typescript
export const useCompletionContext = (): CompletionContextValue => {
  const context = useContext(CompletionContext);
  if (!context) {
    throw new Error('useCompletionContext must be used within a CompletionContextProvider');
  }
  return context;
};
```

**Acceptance Criteria**:
- [ ] CompletionContext provider manages all context state
- [ ] Context hash generation produces stable SHA-1 hashes
- [ ] Token counting approximation implemented (chars/4)
- [ ] localStorage persistence saves and restores context across sessions
- [ ] updateContext() merges partial updates correctly
- [ ] clearContext() resets to default state
- [ ] useCompletionContext() hook works throughout component tree
- [ ] TypeScript types are complete and accurate

---

### Task 1.3: Create Basic ContextPanel Component
**Description**: Build foundational UI component for context input with textarea and localStorage
**Size**: Medium  
**Priority**: High  
**Dependencies**: Task 1.2  
**Can run parallel with**: Task 1.4

**Technical Requirements**:
Create `components/ContextPanel.tsx` with core UI functionality.

**Component Interface**:
```typescript
interface ContextPanelProps {
  isCollapsed?: boolean;
  onToggleCollapse?: (collapsed: boolean) => void;
}
```

**Core UI Implementation**:
```typescript
import React, { useState, useCallback } from 'react';
import { useCompletionContext } from '@/lib/context/CompletionContext';

export const ContextPanel: React.FC<ContextPanelProps> = ({
  isCollapsed = false,
  onToggleCollapse
}) => {
  const { contextText, updateContext, clearContext, getTokenCount } = useCompletionContext();
  const [localCollapsed, setLocalCollapsed] = useState(isCollapsed);
  
  const handleToggleCollapse = useCallback(() => {
    const newCollapsed = !localCollapsed;
    setLocalCollapsed(newCollapsed);
    onToggleCollapse?.(newCollapsed);
    
    // Persist collapse state
    localStorage.setItem('context-panel-collapsed', JSON.stringify(newCollapsed));
  }, [localCollapsed, onToggleCollapse]);

  const handleTextChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    updateContext({ contextText: newText });
  }, [updateContext]);

  const handleClear = useCallback(() => {
    if (window.confirm('Clear all context data?')) {
      clearContext();
    }
  }, [clearContext]);

  const tokenCount = getTokenCount();

  return (
    <div className="context-panel border rounded-lg mb-4 bg-white shadow-sm">
      <div className="flex items-center justify-between p-3 border-b">
        <h3 className="text-sm font-medium text-gray-700">Document Context</h3>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">
            {tokenCount} tokens
          </span>
          <button
            onClick={handleClear}
            className="text-xs text-gray-500 hover:text-red-600"
            title="Clear context"
          >
            Clear
          </button>
          <button
            onClick={handleToggleCollapse}
            className="text-xs text-gray-500 hover:text-gray-700"
            title={localCollapsed ? 'Expand' : 'Collapse'}
          >
            {localCollapsed ? '↓' : '↑'}
          </button>
        </div>
      </div>
      
      {!localCollapsed && (
        <div className="p-3">
          <textarea
            value={contextText}
            onChange={handleTextChange}
            placeholder="Describe your document context (optional)..."
            className="w-full min-h-[80px] max-h-[200px] p-3 border rounded-md resize-vertical"
            rows={3}
            aria-label="Document context"
            aria-describedby="context-help"
          />
          <div id="context-help" className="text-xs text-gray-500 mt-2">
            Provide additional context to help the AI understand your writing goals.
            This information stays private and is not saved on our servers.
          </div>
        </div>
      )}
    </div>
  );
};
```

**Styling Requirements**:
- Consistent with editor styling using Tailwind CSS
- Clean, minimal design with proper spacing
- Responsive layout that works on all screen sizes
- Proper focus states and hover effects

**Accessibility Features**:
- ARIA labels for textarea and helper text
- Keyboard navigation support
- Screen reader announcements for token count changes
- Proper focus management

**Acceptance Criteria**:
- [ ] ContextPanel renders with textarea and basic controls
- [ ] Context text updates trigger useCompletionContext updates
- [ ] Clear button resets context after confirmation
- [ ] Collapse/expand functionality works with state persistence
- [ ] Token count displays and updates in real-time
- [ ] Textarea auto-resizes within min/max height bounds
- [ ] Proper accessibility attributes (aria-label, aria-describedby)
- [ ] Responsive design works on mobile/tablet/desktop
- [ ] localStorage persistence for collapse state

---

### Task 1.4: Enhance API Route for Context Support
**Description**: Extend /api/complete endpoint to accept and process context data
**Size**: Medium  
**Priority**: High  
**Dependencies**: None  
**Can run parallel with**: Task 1.2, 1.3

**Technical Requirements**:
Modify `app/api/complete/route.ts` to support optional context in requests.

**Enhanced Request Schema**:
```typescript
import { z } from 'zod';

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

type ContextData = z.infer<typeof RequestSchema>['context'];
```

**Context Sanitization Functions**:
```typescript
const sanitizeContextText = (text: string): string => {
  return text
    .replace(/[\x00-\x1F\x7F]/g, '') // Remove control characters
    .replace(/<[^>]*>/g, '') // Strip HTML tags
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
};

const sanitizeAllFields = (context: ContextData): ContextData => {
  if (!context) return context;
  
  return {
    userContext: context.userContext ? sanitizeContextText(context.userContext) : undefined,
    documentType: context.documentType,
    language: context.language,
    tone: context.tone,
    audience: context.audience ? sanitizeContextText(context.audience) : undefined,
    keywords: context.keywords?.map(k => sanitizeContextText(k)).filter(Boolean)
  };
};

const validateContext = (context: unknown): ContextData | null => {
  const result = RequestSchema.shape.context.safeParse(context);
  if (!result.success) return null;
  
  const sanitized = sanitizeAllFields(result.data);
  
  // Token count validation (server-side enforcement)
  const tokenCount = estimateTokens(JSON.stringify(sanitized));
  if (tokenCount > 20000) {
    throw new Error('Context exceeds 20k token limit');
  }
  
  return sanitized;
};

// Simple token estimation for server-side validation
const estimateTokens = (text: string): number => {
  return Math.ceil(text.length / 4);
};
```

**Enhanced Prompt Assembly**:
```typescript
const assemblePromptWithContext = (left: string, context?: ContextData): string => {
  if (!context) return left;
  
  let contextSection = '';
  
  if (context.userContext) {
    contextSection += `Document context: ${context.userContext}\n`;
  }
  
  if (context.documentType) {
    contextSection += `Document type: ${context.documentType}\n`;
  }
  
  if (context.language) {
    contextSection += `Language: ${context.language}\n`;
  }
  
  if (context.tone) {
    contextSection += `Tone: ${context.tone}\n`;
  }
  
  if (context.audience) {
    contextSection += `Audience: ${context.audience}\n`;
  }
  
  if (context.keywords && context.keywords.length > 0) {
    contextSection += `Keywords: ${context.keywords.join(', ')}\n`;
  }
  
  return contextSection ? `${contextSection}\n${left}` : left;
};

// Enhanced system prompt for context awareness
const SYSTEM_WITH_CONTEXT = `You are an inline autocomplete engine.
- Output ONLY the minimal continuation of the user's text.
- No introductions, formatting, or trailing whitespace.
- Obey language and style hints if provided.

[Context — Large, Stable Block for Caching]`;

const SYSTEM_NO_CONTEXT = `You are an inline autocomplete engine.
- Output ONLY the minimal continuation of the user's text.
- No introductions, no sentences, no punctuation unless it is literally the next character.
- Never add quotes/formatting; no trailing whitespace.`;
```

**Enhanced Confidence Calculation**:
```typescript
function computeConfidence(
  output: string, 
  flags: { boundaryStop: boolean; truncatedByCharLimit: boolean; truncatedByTokenLimit: boolean },
  hasContext: boolean = false
): number {
  if (!output || output.length === 0) return 0.0;
  
  let conf = 0.5; // base
  const len = output.length;
  
  if (len <= 8) conf += 0.2; // short, crisp completions
  else if (len <= 16) conf += 0.1;
  
  if (flags.boundaryStop) conf += 0.1; // stopped cleanly at boundary
  if (flags.truncatedByCharLimit || flags.truncatedByTokenLimit) conf -= 0.2; // lower confidence when truncated
  
  // Context boost: +0.05 when context present and tail is short (≤8)
  if (hasContext && len <= 8) conf += 0.05;
  
  conf = Math.max(0, Math.min(1, conf));
  return Number(conf.toFixed(2));
}
```

**Updated POST Handler**:
```typescript
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = RequestSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', type: 'INVALID_INPUT' },
        { status: 400 }
      );
    }

    const { left, context } = validation.data;
    
    // Sanitize and validate context if present
    const sanitizedContext = context ? validateContext(context) : null;
    
    // Assemble prompt with context
    const prompt = assemblePromptWithContext(left, sanitizedContext);
    const systemPrompt = sanitizedContext ? SYSTEM_WITH_CONTEXT : SYSTEM_NO_CONTEXT;
    
    // AI completion with extended timeout for context
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000); // Increased from 500ms
    
    try {
      const modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash-lite';
      
      const { textStream } = await streamText({
        model: google(modelName),
        system: systemPrompt,
        prompt: prompt,
        temperature: 0.1,
        topP: 0.9,
        stopSequences: ['\n', ' ', '.', '?', '!'],
        maxRetries: 1,
        abortSignal: controller.signal,
      });

      // ... existing stream processing logic ...
      
      clearTimeout(timeoutId);
      
      return NextResponse.json({ 
        tail: output,
        confidence: computeConfidence(
          output, 
          { boundaryStop, truncatedByCharLimit, truncatedByTokenLimit },
          !!sanitizedContext
        )
      });
      
    } catch (aiError) {
      // ... existing error handling ...
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

**Acceptance Criteria**:
- [ ] API accepts optional context field alongside left text
- [ ] Context validation enforces 20k token limit
- [ ] Context sanitization removes control characters and HTML
- [ ] Prompt assembly includes context in cache-friendly order
- [ ] Confidence boost (+0.05) applied for contextual completions ≤8 tokens
- [ ] Extended timeout (3s) handles larger context prompts
- [ ] Backward compatibility maintained - existing clients work unchanged
- [ ] Error handling covers context validation failures
- [ ] Context content never logged in production

---

### Task 1.5: Integrate Context with InlineComplete Extension
**Description**: Modify InlineComplete extension to use context-aware fetchTail function and enhanced caching
**Size**: Large  
**Priority**: High  
**Dependencies**: Task 1.2, 1.4  
**Can run parallel with**: Task 1.6

**Technical Requirements**:
Enhance the existing InlineComplete extension to support context-aware completions.

**Enhanced Cache Key Generation**:
```typescript
// In lib/InlineComplete.ts - extend the existing caching logic

// Add context-aware cache key generation
const generateCacheKey = async (left: string, contextHash?: string): Promise<string> => {
  if (!contextHash) {
    return left; // Fallback to existing behavior
  }
  
  // Use Unicode separator to prevent collisions
  return `${left}\u241E${contextHash}`;
};

// Update the AutocompleteManager class to handle context
class AutocompleteManager {
  private contextHash: string | null = null;
  
  // ... existing properties ...

  async updateContext(getContextHash: () => Promise<string>) {
    try {
      this.contextHash = await getContextHash();
    } catch (error) {
      console.warn('Failed to generate context hash:', error);
      this.contextHash = null;
    }
  }

  async scheduleCompletion(view: EditorView, pos: number) {
    // ... existing boundary detection logic ...

    const cacheKey = await generateCacheKey(left, this.contextHash);
    
    // Check cache with context-aware key
    const cached = this.cache.get(cacheKey);
    if (cached) {
      this.applySuggestion(view, pos, cached.tail);
      return;
    }

    // Cancel previous request
    if (this.abortController) {
      this.abortController.abort();
    }
    
    this.abortController = new AbortController();
    
    try {
      const response = await this.fetchTail(left);
      
      if (response.success) {
        // Cache with context-aware key
        this.cache.set(cacheKey, {
          tail: response.data.tail,
          confidence: response.data.confidence || 0.5,
          timestamp: Date.now()
        });
        
        this.applySuggestion(view, pos, response.data.tail);
      }
    } catch (error) {
      // ... existing error handling ...
    }
  }
}
```

**Context-Aware fetchTail Implementation**:
```typescript
// Custom fetchTail function that includes context
const createContextAwareFetchTail = (useContext: () => CompletionContextValue) => {
  return async (left: string): Promise<ApiResponse> => {
    const context = useContext();
    
    // Serialize context for API request
    const serializedContext = {
      userContext: context.contextText || undefined,
      documentType: context.documentType || undefined,
      language: context.language || undefined,
      tone: context.tone || undefined,
      audience: context.audience || undefined,
      keywords: context.keywords && context.keywords.length > 0 ? context.keywords : undefined
    };

    // Remove undefined fields
    const cleanContext = Object.fromEntries(
      Object.entries(serializedContext).filter(([_, value]) => value !== undefined)
    );

    const requestBody = {
      left,
      ...(Object.keys(cleanContext).length > 0 ? { context: cleanContext } : {})
    };

    try {
      const response = await fetch('/api/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorData = await response.json();
        return {
          success: false,
          error: {
            type: errorData.type || 'SERVICE_UNAVAILABLE',
            message: errorData.error || 'Request failed',
            retryable: response.status >= 500
          }
        };
      }

      const data = await response.json();
      return {
        success: true,
        data: {
          tail: data.tail,
          confidence: data.confidence
        }
      };
    } catch (error) {
      return {
        success: false,
        error: {
          type: 'NETWORK_ERROR',
          message: error instanceof Error ? error.message : 'Network error',
          retryable: true
        }
      };
    }
  };
};
```

**Integration with Main Page Component**:
```typescript
// In app/page.tsx - integrate context with InlineComplete

import { useCompletionContext } from '@/lib/context/CompletionContext';

const AutocompleteEditor: React.FC = () => {
  const completionContext = useCompletionContext();
  const [editor, setEditor] = useState<Editor | null>(null);

  // Create context-aware fetchTail function
  const fetchTail = useMemo(() => 
    createContextAwareFetchTail(() => completionContext),
    [completionContext]
  );

  // Configure editor with context-aware completion
  useEffect(() => {
    if (!editor) return;

    // Update the InlineComplete extension with new fetchTail
    editor.extensionManager.addExtension(
      InlineComplete.configure({
        fetchTail,
        debounceMs: 0, // Keep existing settings
        maxPrefixLength: 1000,
        enabled: true
      })
    );

    // Update context hash in the autocomplete manager
    const updateContextInManager = async () => {
      const manager = editor.storage.inlineComplete?.manager;
      if (manager && manager.updateContext) {
        await manager.updateContext(completionContext.getContextHash);
      }
    };

    updateContextInManager();
  }, [editor, fetchTail, completionContext]);

  // ... rest of component implementation ...
};
```

**Error Handling for Context Integration**:
```typescript
// Enhanced error handling for context-related failures
const handleContextError = (error: any, fallbackToNoContext = true) => {
  console.warn('Context integration error:', error);
  
  if (fallbackToNoContext) {
    // Fall back to context-less completion
    return createBasicFetchTail();
  }
  
  throw error;
};

// Graceful degradation when context fails
const createResilientFetchTail = (useContext: () => CompletionContextValue) => {
  return async (left: string): Promise<ApiResponse> => {
    try {
      return await createContextAwareFetchTail(useContext)(left);
    } catch (error) {
      // Fall back to basic completion if context fails
      return await createBasicFetchTail()(left);
    }
  };
};
```

**Acceptance Criteria**:
- [ ] InlineComplete extension uses context-aware fetchTail function
- [ ] Cache keys include context hash for proper isolation
- [ ] Context changes trigger cache key regeneration
- [ ] API requests include serialized context data
- [ ] Graceful degradation when context generation fails
- [ ] Existing autocomplete behavior preserved when no context
- [ ] Context updates in real-time without requiring editor restart
- [ ] Performance remains within acceptable bounds (<300ms)
- [ ] Memory usage doesn't increase significantly with context

---

### Task 1.6: Basic Unit Tests for Core Context Functionality
**Description**: Create foundational unit tests for context provider, hashing, and basic UI components
**Size**: Medium  
**Priority**: Medium  
**Dependencies**: Task 1.2, 1.3  
**Can run parallel with**: Task 1.5

**Technical Requirements**:
Create comprehensive unit tests for the core context system components.

**CompletionContext Provider Tests**:
```typescript
// __tests__/context/CompletionContext.test.tsx

import React from 'react';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { 
  CompletionContextProvider, 
  useCompletionContext,
  generateContextHash 
} from '@/lib/context/CompletionContext';

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
};
Object.defineProperty(window, 'localStorage', { value: mockLocalStorage });

// Mock crypto.subtle.digest
Object.defineProperty(global.crypto, 'subtle', {
  value: {
    digest: jest.fn().mockImplementation(() => 
      Promise.resolve(new ArrayBuffer(20)) // Mock SHA-1 result
    )
  }
});

// Test component to access context
const TestComponent = () => {
  const context = useCompletionContext();
  
  return (
    <div>
      <div data-testid="context-text">{context.contextText}</div>
      <div data-testid="token-count">{context.getTokenCount()}</div>
      <button 
        onClick={() => context.updateContext({ contextText: 'updated' })}
        data-testid="update-button"
      >
        Update
      </button>
      <button 
        onClick={context.clearContext}
        data-testid="clear-button"
      >
        Clear
      </button>
    </div>
  );
};

describe('CompletionContext', () => {
  beforeEach(() => {
    mockLocalStorage.getItem.mockClear();
    mockLocalStorage.setItem.mockClear();
    mockLocalStorage.removeItem.mockClear();
  });

  test('provides default context values', () => {
    mockLocalStorage.getItem.mockReturnValue(null);
    
    render(
      <CompletionContextProvider>
        <TestComponent />
      </CompletionContextProvider>
    );

    expect(screen.getByTestId('context-text')).toHaveTextContent('');
    expect(screen.getByTestId('token-count')).toHaveTextContent('1'); // Empty object ~1 token
  });

  test('loads context from localStorage on mount', () => {
    const storedContext = {
      contextText: 'stored text',
      documentType: 'email',
      language: 'en'
    };
    mockLocalStorage.getItem.mockReturnValue(JSON.stringify(storedContext));
    
    render(
      <CompletionContextProvider>
        <TestComponent />
      </CompletionContextProvider>
    );

    expect(screen.getByTestId('context-text')).toHaveTextContent('stored text');
  });

  test('updates context and saves to localStorage', async () => {
    const user = userEvent.setup();
    mockLocalStorage.getItem.mockReturnValue(null);
    
    render(
      <CompletionContextProvider>
        <TestComponent />
      </CompletionContextProvider>
    );

    await user.click(screen.getByTestId('update-button'));

    expect(screen.getByTestId('context-text')).toHaveTextContent('updated');
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
      'autocomplete-context',
      expect.stringContaining('updated')
    );
  });

  test('clears context and resets localStorage', async () => {
    const user = userEvent.setup();
    mockLocalStorage.getItem.mockReturnValue(JSON.stringify({ contextText: 'existing' }));
    
    render(
      <CompletionContextProvider>
        <TestComponent />
      </CompletionContextProvider>
    );

    await user.click(screen.getByTestId('clear-button'));

    expect(screen.getByTestId('context-text')).toHaveTextContent('');
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
      'autocomplete-context',
      expect.stringContaining('""')
    );
  });

  test('generates stable hash for identical contexts', async () => {
    const context1 = { contextText: 'test', documentType: 'email' as const };
    const context2 = { contextText: 'test', documentType: 'email' as const };
    
    const hash1 = await generateContextHash(context1);
    const hash2 = await generateContextHash(context2);
    
    expect(hash1).toBe(hash2);
    expect(hash1).toMatch(/^[a-f0-9]{40}$/); // SHA-1 hex format
  });

  test('provides different hashes for different contexts', async () => {
    const context1 = { contextText: 'test1', documentType: 'email' as const };
    const context2 = { contextText: 'test2', documentType: 'email' as const };
    
    const hash1 = await generateContextHash(context1);
    const hash2 = await generateContextHash(context2);
    
    expect(hash1).not.toBe(hash2);
  });

  test('calculates token count approximation', () => {
    mockLocalStorage.getItem.mockReturnValue(null);
    
    const TestTokenCount = () => {
      const context = useCompletionContext();
      
      React.useEffect(() => {
        context.updateContext({ contextText: 'a'.repeat(40) }); // ~10 tokens
      }, []);
      
      return <div data-testid="token-count">{context.getTokenCount()}</div>;
    };

    render(
      <CompletionContextProvider>
        <TestTokenCount />
      </CompletionContextProvider>
    );

    // Should approximate to ~10 tokens (40 chars / 4)
    expect(screen.getByTestId('token-count')).toHaveTextContent(/1[0-2]/);
  });

  test('handles localStorage errors gracefully', () => {
    mockLocalStorage.getItem.mockImplementation(() => {
      throw new Error('localStorage error');
    });
    
    // Should not crash
    expect(() => {
      render(
        <CompletionContextProvider>
          <TestComponent />
        </CompletionContextProvider>
      );
    }).not.toThrow();

    expect(screen.getByTestId('context-text')).toHaveTextContent('');
  });
});
```

**ContextPanel Component Tests**:
```typescript
// __tests__/components/ContextPanel.test.tsx

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ContextPanel } from '@/components/ContextPanel';
import { CompletionContextProvider } from '@/lib/context/CompletionContext';

// Mock window.confirm
Object.defineProperty(window, 'confirm', {
  value: jest.fn()
});

const renderWithContext = (props = {}) => {
  return render(
    <CompletionContextProvider>
      <ContextPanel {...props} />
    </CompletionContextProvider>
  );
};

describe('ContextPanel', () => {
  beforeEach(() => {
    localStorage.clear();
    (window.confirm as jest.Mock).mockClear();
  });

  test('renders with textarea and controls', () => {
    renderWithContext();

    expect(screen.getByRole('textbox')).toBeInTheDocument();
    expect(screen.getByText('Document Context')).toBeInTheDocument();
    expect(screen.getByText('Clear')).toBeInTheDocument();
    expect(screen.getByTitle(/collapse/i)).toBeInTheDocument();
  });

  test('updates context text on input', async () => {
    const user = userEvent.setup();
    renderWithContext();

    const textarea = screen.getByRole('textbox');
    await user.type(textarea, 'test context');

    expect(textarea).toHaveValue('test context');
  });

  test('displays token count', () => {
    renderWithContext();

    // Should show initial token count
    expect(screen.getByText(/\d+ tokens/)).toBeInTheDocument();
  });

  test('clears context with confirmation', async () => {
    const user = userEvent.setup();
    (window.confirm as jest.Mock).mockReturnValue(true);
    
    renderWithContext();

    const textarea = screen.getByRole('textbox');
    await user.type(textarea, 'test context');
    
    const clearButton = screen.getByText('Clear');
    await user.click(clearButton);

    expect(window.confirm).toHaveBeenCalledWith('Clear all context data?');
    expect(textarea).toHaveValue('');
  });

  test('does not clear context when cancelled', async () => {
    const user = userEvent.setup();
    (window.confirm as jest.Mock).mockReturnValue(false);
    
    renderWithContext();

    const textarea = screen.getByRole('textbox');
    await user.type(textarea, 'test context');
    
    const clearButton = screen.getByText('Clear');
    await user.click(clearButton);

    expect(textarea).toHaveValue('test context');
  });

  test('toggles collapse state', async () => {
    const user = userEvent.setup();
    renderWithContext();

    const textarea = screen.getByRole('textbox');
    expect(textarea).toBeVisible();

    const collapseButton = screen.getByTitle(/collapse/i);
    await user.click(collapseButton);

    expect(textarea).not.toBeVisible();
    expect(screen.getByTitle(/expand/i)).toBeInTheDocument();
  });

  test('persists collapse state to localStorage', async () => {
    const user = userEvent.setup();
    renderWithContext();

    const collapseButton = screen.getByTitle(/collapse/i);
    await user.click(collapseButton);

    expect(localStorage.getItem('context-panel-collapsed')).toBe('true');
  });

  test('provides proper accessibility attributes', () => {
    renderWithContext();

    const textarea = screen.getByRole('textbox');
    expect(textarea).toHaveAttribute('aria-label', 'Document context');
    expect(textarea).toHaveAttribute('aria-describedby', 'context-help');
    
    expect(screen.getByText(/provide additional context/i)).toHaveAttribute('id', 'context-help');
  });

  test('handles onToggleCollapse callback', async () => {
    const onToggleCollapse = jest.fn();
    const user = userEvent.setup();
    
    renderWithContext({ onToggleCollapse });

    const collapseButton = screen.getByTitle(/collapse/i);
    await user.click(collapseButton);

    expect(onToggleCollapse).toHaveBeenCalledWith(true);
  });

  test('starts collapsed when isCollapsed prop is true', () => {
    renderWithContext({ isCollapsed: true });

    expect(screen.queryByRole('textbox')).not.toBeVisible();
    expect(screen.getByTitle(/expand/i)).toBeInTheDocument();
  });
});
```

**Context Hash Generation Tests**:
```typescript
// __tests__/lib/contextHash.test.ts

import { generateContextHash, normalizeContext } from '@/lib/context/CompletionContext';

// Mock crypto.subtle
Object.defineProperty(global.crypto, 'subtle', {
  value: {
    digest: jest.fn()
  }
});

describe('Context Hashing', () => {
  beforeEach(() => {
    (crypto.subtle.digest as jest.Mock).mockClear();
  });

  test('normalizes context for consistent hashing', () => {
    const context = {
      contextText: '  test text  ',
      documentType: 'email' as const,
      language: 'en' as const,
      audience: '  developers  ',
      keywords: ['react', 'api', 'testing']
    };

    const normalized = normalizeContext(context);

    expect(normalized).toEqual({
      userContext: 'test text',
      documentType: 'email',
      language: 'en',
      tone: '',
      audience: 'developers',
      keywords: 'api,react,testing' // Sorted and joined
    });
  });

  test('handles empty and undefined values', () => {
    const context = {
      contextText: '',
      documentType: undefined,
      language: 'en' as const,
      audience: undefined,
      keywords: []
    };

    const normalized = normalizeContext(context);

    expect(normalized).toEqual({
      userContext: '',
      documentType: '',
      language: 'en',
      tone: '',
      audience: '',
      keywords: ''
    });
  });

  test('generates consistent hash for same normalized context', async () => {
    const mockHash = new ArrayBuffer(20);
    new Uint8Array(mockHash).set([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20]);
    
    (crypto.subtle.digest as jest.Mock).mockResolvedValue(mockHash);

    const context1 = { contextText: 'test' };
    const context2 = { contextText: 'test' };

    const hash1 = await generateContextHash(context1);
    const hash2 = await generateContextHash(context2);

    expect(hash1).toBe(hash2);
    expect(hash1).toBe('0102030405060708090a0b0c0d0e0f1011121314');
  });

  test('sorts keywords for consistent hashing', async () => {
    const mockHash = new ArrayBuffer(20);
    (crypto.subtle.digest as jest.Mock).mockResolvedValue(mockHash);

    const context1 = { contextText: 'test', keywords: ['z', 'a', 'm'] };
    const context2 = { contextText: 'test', keywords: ['a', 'm', 'z'] };

    await generateContextHash(context1);
    await generateContextHash(context2);

    // Both calls should use the same normalized context
    const calls = (crypto.subtle.digest as jest.Mock).mock.calls;
    expect(calls).toHaveLength(2);
    
    const data1 = new TextDecoder().decode(calls[0][1]);
    const data2 = new TextDecoder().decode(calls[1][1]);
    
    expect(data1).toBe(data2);
  });
});
```

**Test Purpose Documentation**:
Each test includes clear documentation of what it validates:

```typescript
/**
 * Tests that the context provider correctly manages state and persists to localStorage.
 * 
 * This test validates:
 * - Context state updates propagate to consumers
 * - localStorage persistence works on context changes
 * - State restoration from localStorage on provider mount
 * 
 * Why this test exists: Context persistence is critical for user experience
 * across page refreshes. This test ensures the core state management works.
 * 
 * This test can fail if:
 * - useState updates don't trigger re-renders
 * - localStorage setItem/getItem calls fail
 * - Context provider doesn't wrap children correctly
 */
test('manages context state and localStorage persistence', () => {
  // Test implementation...
});
```

**Acceptance Criteria**:
- [ ] CompletionContext provider tests cover state management, localStorage persistence, hash generation
- [ ] ContextPanel tests cover UI interactions, accessibility, collapse/expand functionality
- [ ] Context hash generation tests verify consistency and normalization
- [ ] All tests include purpose documentation explaining why they exist and what they validate
- [ ] Tests can meaningfully fail to reveal real issues (not just implementation details)
- [ ] Edge cases covered: localStorage errors, crypto API failures, empty contexts
- [ ] Accessibility testing validates ARIA attributes and screen reader support
- [ ] Performance considerations tested (hash generation, token counting)
- [ ] Tests follow project philosophy: "When tests fail, fix the code, not the test"

---

## Phase 1 Summary

**Total Tasks**: 6  
**Estimated Complexity**: 3 Small, 2 Medium, 1 Large  
**Critical Path**: Task 1.1 → 1.2 → 1.5  
**Parallel Opportunities**: Tasks 1.3/1.4/1.6 can run parallel after dependencies met

**Phase 1 Success Criteria**:
- Context panel renders and accepts user input
- Context data persists across page refreshes
- API accepts and processes context in AI prompts
- Cache isolation prevents context mixing
- Basic unit test coverage for core functionality
- Performance targets maintained (<300ms with context)

**Risk Mitigation**:
- Token counting approximation may need server validation
- SHA-1 hashing performance impact on large contexts
- localStorage size limits with extensive context use
- API timeout adjustments for larger prompts may need tuning