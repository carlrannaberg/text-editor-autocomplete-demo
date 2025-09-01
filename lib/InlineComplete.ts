// lib/InlineComplete.ts
import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from 'prosemirror-state';
import { Decoration, DecorationSet, EditorView } from 'prosemirror-view';
import { InlineCompleteOptions, InlineCompleteState, ApiResponse, CompletionText, CompletionContextState } from './types';
import { hasMeaningfulContext, normalizeContextForAPI, normalizeContextForCache } from './utils/contextUtils';

// Heuristic: when at punctuation boundary with no space, prefix a space
function maybePrefixSpace(left: string, suggestion: string): string {
  if (!suggestion) return suggestion;
  if (!left) return suggestion;

  const last = left[left.length - 1] || '';
  // already spaced
  if (/\s/.test(last)) return suggestion;
  // only for common ASCII sentence/token punctuation
  const punctNeedsSpace = /[\.,!?;:]/;
  if (!punctNeedsSpace.test(last)) return suggestion;
  // do not add if suggestion starts with whitespace or punctuation
  if (/^[\s\.,!?\-;:'"()[\]{}]/.test(suggestion)) return suggestion;
  // avoid space for likely CJK suggestion (no inter-word spaces)
  if (/^[\u4E00-\u9FFF\u3040-\u30FF]/.test(suggestion)) return suggestion;
  return ' ' + suggestion;
}

// Context-aware fetch function type
type ContextAwareFetchTail = (left: string, context?: CompletionContextState) => Promise<ApiResponse>;

// Generate cache key with context hash
const generateCacheKey = async (text: string, context?: CompletionContextState): Promise<string> => {
  if (!context) return text; // No context, use simple text key
  
  const contextStr = JSON.stringify(normalizeContextForCache(context));
  
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(contextStr);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const contextHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 8);
    return `${text}:${contextHash}`;
  } catch (error) {
    console.warn('Failed to generate context hash for cache key:', error);
    // Fallback to simple hash
    let hash = 0;
    for (let i = 0; i < contextStr.length; i++) {
      const char = contextStr.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return `${text}:${Math.abs(hash).toString(16).slice(0, 8)}`;
  }
};


// Create context-aware fetchTail function
export const createContextAwareFetchTail = (getContext?: () => CompletionContextState | null): ContextAwareFetchTail => {
  return async (left: string, explicitContext?: CompletionContextState): Promise<ApiResponse> => {
    // Use explicit context if provided, otherwise get from context provider
    const context = explicitContext || getContext?.() || undefined;
    
    
    try {
      const contextPayload = hasMeaningfulContext(context) && context ? normalizeContextForAPI(context) : undefined;
      
      // Development debug logging
      if (process.env.NODE_ENV === 'development') {
        console.log('🔍 Context transmission debug:', {
          hasContext: !!context,
          hasMeaningfulContext: hasMeaningfulContext(context),
          contextPayload,
          left: left.slice(-50)
        });
      }
      
      const response = await fetch('/api/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          left,
          context: contextPayload
        }),
        signal: new AbortController().signal, // Individual request controllers are managed by AutocompleteManager
      });

      if (!response.ok) {
        if (response.status === 429) {
          return {
            success: false,
            error: {
              type: 'RATE_LIMITED',
              message: `API error: ${response.status}`,
              retryable: true,
              retryAfter: 5
            }
          };
        } else {
          return {
            success: false,
            error: {
              type: 'SERVICE_UNAVAILABLE',
              message: `API error: ${response.status}`,
              retryable: true
            }
          };
        }
      }

      const result = await response.json();
      return { success: true, data: result };
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        return { success: false, error: { type: 'NETWORK_ERROR', message: 'Request cancelled', retryable: true } };
      }
      return { success: false, error: { type: 'NETWORK_ERROR', message: 'Network failure', retryable: true } };
    }
  };
};

// AutocompleteManager class for resource management and caching
class AutocompleteManager {
  private abortController?: AbortController;
  private debounceTimer?: NodeJS.Timeout | undefined;
  private cache = new Map<string, CompletionText>();
  private readonly maxCacheSize = 50;
  private cacheHits = new Map<string, number>();
  private contextAwareFetchTail: ContextAwareFetchTail | undefined;

  constructor(contextAwareFetchTail?: ContextAwareFetchTail) {
    this.contextAwareFetchTail = contextAwareFetchTail;
  }

  cleanup() {
    this.abortController?.abort();
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = undefined;
    }
  }

  async fetchCompletion(text: string, context?: CompletionContextState): Promise<ApiResponse> {
    this.cleanup(); // Cancel previous requests
    
    // Generate context-aware cache key
    const cacheKey = await generateCacheKey(text, context);
    
    // Check cache first (true LRU: refresh recency on get)
    const cached = this.cache.get(cacheKey);
    if (cached) {
      // refresh recency
      this.cache.delete(cacheKey);
      this.cache.set(cacheKey, cached);
      const hits = (this.cacheHits.get(cacheKey) || 0) + 1;
      this.cacheHits.set(cacheKey, hits);
      const localConfidence = Math.max(0.5, Math.min(0.9, 0.5 + 0.05 * hits));
      return { success: true, data: { tail: cached, confidence: Number(localConfidence.toFixed(2)) } };
    }

    this.abortController = new AbortController();
    
    try {
      // Use context-aware fetch if available, otherwise fallback to default behavior
      let result: ApiResponse;
      
      if (this.contextAwareFetchTail) {
        result = await this.contextAwareFetchTail(text, context);
      } else {
        // Fallback to original implementation
        const response = await fetch('/api/complete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ left: text }),
          signal: this.abortController.signal,
        });

        if (!response.ok) {
          if (response.status === 429) {
            return {
              success: false,
              error: {
                type: 'RATE_LIMITED',
                message: `API error: ${response.status}`,
                retryable: true,
                retryAfter: 5
              }
            };
          } else {
            return {
              success: false,
              error: {
                type: 'SERVICE_UNAVAILABLE',
                message: `API error: ${response.status}`,
                retryable: true
              }
            };
          }
        }

        const responseData = await response.json();
        result = { success: true, data: responseData };
      }
      
      // Cache successful result with LRU eviction
      if (result.success) {
        if (this.cache.size >= this.maxCacheSize) {
          const firstKey = this.cache.keys().next().value;
          if (firstKey !== undefined) {
            this.cache.delete(firstKey);
            this.cacheHits.delete(firstKey);
          }
        }
        this.cache.set(cacheKey, result.data.tail);
        this.cacheHits.set(cacheKey, 0);
      }
      
      return result;
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        return { success: false, error: { type: 'NETWORK_ERROR', message: 'Request cancelled', retryable: true } };
      }
      return { success: false, error: { type: 'NETWORK_ERROR', message: 'Network failure', retryable: true } };
    }
  }

  private performanceMetrics = {
    totalRequests: 0,
    wordBoundaryOptimizations: 0,
  };

  debounceCompletion(fn: () => void, text: string, baseDelay: number) {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    
    // Simplified adaptive logic: instant at word boundaries, normal delay otherwise
    const isAtBoundary = this.isAtWordBoundary(text);
    const delay = isAtBoundary ? 0 : baseDelay;
    
    // Track performance metrics in development
    if (process.env.NODE_ENV === 'development') {
      this.performanceMetrics.totalRequests++;
      if (isAtBoundary) this.performanceMetrics.wordBoundaryOptimizations++;
    }
    
    this.debounceTimer = setTimeout(() => {
      fn();
      this.debounceTimer = undefined;
    }, delay) as NodeJS.Timeout;
  }

  isAtWordBoundary(text: string): boolean {
    if (text.length === 0) return true;
    
    const lastChar = text[text.length - 1] || '';
    const secondLastChar = text.length > 1 ? text[text.length - 2] || '' : '';
    
    // Word boundary patterns
    const boundaryChars = /[\s\n\r\t,.;:!?…，。？！、）\)\]\}\u2013\u2014·]/;
    const wordChars = /[a-zA-Z0-9]/;
    
    // At boundary if:
    // 1. Last character is whitespace/punctuation
    // 2. Transition from word to non-word character
    return boundaryChars.test(lastChar) || 
           (wordChars.test(secondLastChar) && !wordChars.test(lastChar));
  }
}

// Completion scheduling function
const scheduleCompletion = (
  view: EditorView, 
  manager: AutocompleteManager, 
  pluginKey: PluginKey<InlineCompleteState>,
  options: InlineCompleteOptions,
  getContext?: () => CompletionContextState | null
) => {
  // Get current text first for adaptive debouncing
  const { state } = view;
  const { from } = state.selection;
  let left = state.doc.textBetween(0, from, '\n', '\n');
  // Enforce max prefix length before any logic
  const maxPrefix = Math.max(1, options.maxPrefixLength || 1000);
  if (left.length > maxPrefix) {
    left = left.slice(-maxPrefix);
  }
  
  manager.debounceCompletion(async () => {
    if (view.composing) return; // IME safety
    
    const { state } = view;
    const { from } = state.selection;
    let left = state.doc.textBetween(0, from, '\n', '\n');
    if (left.length > maxPrefix) {
      left = left.slice(-maxPrefix);
    }

    // Determine if at a hard word boundary; allow requests at boundaries for next-word UX
    const atBoundary = manager.isAtWordBoundary(left);

    // Minimum current token length gate (3+ alphanumeric chars)
    const match = left.match(/[A-Za-z0-9]+$/);
    const currentToken = match ? match[0] : '';
    if (!atBoundary && currentToken.length < 3) {
      return;
    }
    
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

    // Get context for request and pass explicitly to avoid redundant resolution
    const context = getContext?.() || undefined;
    const result = await manager.fetchCompletion(left, context);
    
    if (result.success && result.data.tail) {
      const adjusted = maybePrefixSpace(left, result.data.tail);
      view.dispatch(
        view.state.tr.setMeta(pluginKey, {
          suggestion: adjusted,
          isLoading: false,
          confidence: result.data.confidence
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
  }, left, options.debounceMs || 120);
};

// Plugin key for state management
const pluginKey = new PluginKey<InlineCompleteState>('inlineComplete');

// Extension definition with configuration
export const InlineComplete = Extension.create<InlineCompleteOptions>({
  name: 'inlineComplete',

  addOptions() {
    return {
      debounceMs: 120,
      maxPrefixLength: 1000,
      enabled: true,
      acceptRightArrow: false,
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
  // Create context-aware fetch function if context provider is available
  const contextAwareFetchTail = options.getContext ? createContextAwareFetchTail(options.getContext) : undefined;
  const manager = new AutocompleteManager(contextAwareFetchTail);
  
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
        if (pluginState.isLoading) widget.classList.add('loading');
        const conf = pluginState.confidence;
        if (typeof conf === 'number' && !Number.isNaN(conf)) {
          widget.setAttribute('data-confidence', String(conf));
          const clamped = Math.max(0, Math.min(1, conf));
          const opacity = 0.25 + clamped * 0.35; // 0.25–0.60
          widget.style.opacity = String(opacity);
        }
        
        const decoration = Decoration.widget(from, widget, { side: 1 });
        return DecorationSet.create(state.doc, [decoration]);
      },
      
      handleTextInput(view, from, to, text) {
        if (!options.enabled) return false;
        
        // IME safety - don't trigger during composition
        if (view.composing) {
          return false;
        }
        
        // Schedule completion with debouncing
        scheduleCompletion(view, manager, pluginKey, options, options.getContext);
        return false;
      },
      
      handleKeyDown(view, event) {
        // Enhanced IME safety - multiple checks
        if (view.composing || event.isComposing || event.keyCode === 229 || event.key === 'Unidentified') {
          return false;
        }
        
        const pluginState = pluginKey.getState(view.state);
        
        // Tab acceptance (only Tab, not Shift+Tab)
        if (event.key === 'Tab' && !event.shiftKey && pluginState?.suggestion) {
          event.preventDefault();
          const { from } = view.state.selection;
          const tr = view.state.tr.insertText(pluginState.suggestion, from);
          // Clear suggestion and lastQuery to allow immediate follow-up suggestion
          tr.setMeta(pluginKey, { suggestion: null, lastQuery: null, isLoading: false });
          view.dispatch(tr);
          return true;
        }
        
        // Escape dismissal
        if (event.key === 'Escape' && pluginState?.suggestion) {
          event.preventDefault();
          view.dispatch(
            view.state.tr.setMeta(pluginKey, { suggestion: null, isLoading: false })
          );
          return true;
        }
        
        // Optional: Right Arrow acceptance
        if (options.acceptRightArrow && event.key === 'ArrowRight' && pluginState?.suggestion) {
          event.preventDefault();
          const { from } = view.state.selection;
          const tr = view.state.tr.insertText(pluginState.suggestion, from);
          tr.setMeta(pluginKey, { suggestion: null, lastQuery: null, isLoading: false });
          view.dispatch(tr);
          return true;
        }

        // Arrow keys dismiss suggestions
        if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key) && pluginState?.suggestion) {
          view.dispatch(
            view.state.tr.setMeta(pluginKey, { suggestion: null, isLoading: false })
          );
          // Don't prevent default - let arrow keys work normally
          return false;
        }
        
        return false;
      },
      
      handleClick(view) {
        // Clear suggestions on click
        const pluginState = pluginKey.getState(view.state);
        if (pluginState?.suggestion) {
          view.dispatch(
            view.state.tr.setMeta(pluginKey, { suggestion: null, isLoading: false })
          );
        }
        return false;
      }
    },
    
    // Cleanup resources when plugin is destroyed
    destroy() {
      manager.cleanup();
    }
  });
};

// Export plugin key for external access
export { pluginKey };
