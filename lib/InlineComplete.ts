// lib/InlineComplete.ts
import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from 'prosemirror-state';
import { Decoration, DecorationSet, EditorView } from 'prosemirror-view';
import { InlineCompleteOptions, InlineCompleteState, ApiResponse, CompletionText } from './types';

// AutocompleteManager class for resource management and caching
class AutocompleteManager {
  private abortController?: AbortController;
  private debounceTimer?: NodeJS.Timeout | undefined;
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
      
      // Cache successful result with LRU eviction
      if (this.cache.size >= this.maxCacheSize) {
        const firstKey = this.cache.keys().next().value;
        if (firstKey !== undefined) {
          this.cache.delete(firstKey);
        }
      }
      this.cache.set(text, result.tail);
      
      return { success: true, data: result };
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
      
      // Log optimization rate every 20 requests
      if (this.performanceMetrics.totalRequests % 20 === 0) {
        const rate = (this.performanceMetrics.wordBoundaryOptimizations / this.performanceMetrics.totalRequests * 100).toFixed(1);
        console.log(`🚀 Autocomplete optimization: ${rate}% instant completions at word boundaries`);
      }
    }
    
    this.debounceTimer = setTimeout(() => {
      fn();
      this.debounceTimer = undefined;
    }, delay) as NodeJS.Timeout;
  }

  private isAtWordBoundary(text: string): boolean {
    if (text.length === 0) return true;
    
    const lastChar = text[text.length - 1] || '';
    const secondLastChar = text.length > 1 ? text[text.length - 2] || '' : '';
    
    // Word boundary patterns
    const boundaryChars = /[\s\n\r\t,.;:!?…，。？！、）\)\]\}]/;
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
  options: InlineCompleteOptions
) => {
  // Get current text first for adaptive debouncing
  const { state } = view;
  const { from } = state.selection;
  const left = state.doc.textBetween(0, from, '\n', '\n');
  
  manager.debounceCompletion(async () => {
    if (view.composing) return; // IME safety
    
    const { state } = view;
    const { from } = state.selection;
    const left = state.doc.textBetween(0, from, '\n', '\n');
    
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
  const manager = new AutocompleteManager();
  
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
      },
      
      handleTextInput(view, from, to, text) {
        if (!options.enabled) return false;
        
        // IME safety - don't trigger during composition
        if (view.composing) {
          return false;
        }
        
        // Schedule completion with debouncing
        scheduleCompletion(view, manager, pluginKey, options);
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