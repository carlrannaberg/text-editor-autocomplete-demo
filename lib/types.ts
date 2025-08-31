// lib/types.ts

// Simple type aliases for better code readability
export type ValidatedText = string;
export type CompletionText = string;

// Context-related types
export type DocumentType = 'email' | 'article' | 'note' | 'other';
export type Language = 'en' | 'es' | 'fr' | 'de';
export type Tone = 'neutral' | 'formal' | 'casual' | 'persuasive';

/**
 * State interface for completion context
 */
export interface CompletionContextState {
  contextText: string;
  documentType?: DocumentType;
  language?: Language;
  tone?: Tone;
  audience?: string;
  keywords?: string[];
}

/**
 * Extended context interface with methods
 */
export interface CompletionContextValue extends CompletionContextState {
  updateContext: (updates: Partial<CompletionContextState>) => void;
  clearContext: () => void;
  getContextHash: () => Promise<string>;
  getTokenCount: () => number;
  getTokenWarningLevel: () => import('@/lib/tokenizer').TokenWarningLevel;
  isWithinTokenLimit: () => boolean;
}

/**
 * Request interface for AI completion with validation
 * @interface CompletionRequest
 */
export interface CompletionRequest {
  /** The validated text content before the cursor */
  left: ValidatedText;
  /** Optional unique identifier for tracking requests */
  requestId?: string;
  /** Additional context to improve completion quality */
  context?: {
    /** Type of document being edited */
    documentType?: DocumentType;
    /** Language for completion generation */
    language?: Language;
    /** Writing tone preference */
    tone?: Tone;
    /** Target audience description */
    audience?: string;
    /** Relevant keywords for completion */
    keywords?: string[];
    /** Additional user-provided context */
    userContext?: string;
  };
}

/**
 * Cache metrics for development monitoring and optimization
 * @interface CacheDebugInfo
 */
export interface CacheDebugInfo {
  cacheMetrics: {
    cacheHit?: boolean;
    cacheCreated?: boolean;
    inputTokens?: number;
    outputTokens?: number;
    ttft?: number; // Time to First Token in ms
  };
  promptStructure: {
    systemLength: number;
    userLength: number;
    hasCacheContext: boolean;
    cacheContextLength: number;
  };
  timing: {
    requestStart: number;
    firstToken: number;
    totalTime: number;
  };
}

/**
 * Successful completion response from AI service
 * @interface CompletionResponse
 */
export interface CompletionResponse {
  /** The completion text to be inserted */
  tail: CompletionText;
  /** AI confidence score between 0 and 1 */
  confidence?: number;
  /** Request ID for correlation with original request */
  requestId?: string;
  /** Development-only debug information including cache metrics */
  debug?: CacheDebugInfo;
}

/**
 * Comprehensive error types for completion failures
 * Includes retry information and specific error contexts
 */
export type CompletionError = 
  | { type: 'NETWORK_ERROR'; message: string; retryable: true }
  | { type: 'INVALID_INPUT'; message: string; retryable: false }
  | { type: 'RATE_LIMITED'; message: string; retryable: true; retryAfter: number }
  | { type: 'SERVICE_UNAVAILABLE'; message: string; retryable: true }
  | { type: 'CONTENT_FILTERED'; message: string; retryable: false };

/**
 * Context operation error types are defined in ContextErrorHandler.ts
 * Import ContextError from @/lib/errors/ContextErrorHandler
 */

/**
 * Union type for API responses handling both success and error cases
 * Provides type-safe error handling with discriminated unions
 */
export type ApiResponse = 
  | { success: true; data: CompletionResponse }
  | { success: false; error: CompletionError };

/**
 * Configuration options for the InlineComplete extension
 * Matches Tiptap extension patterns with proper TypeScript support
 * @interface InlineCompleteOptions
 */
export interface InlineCompleteOptions {
  /** Function to fetch completion tail for given input (optional - uses built-in API if not provided) */
  fetchTail?: (left: string) => Promise<ApiResponse>;
  /** Function to get current completion context (optional) */
  getContext?: () => CompletionContextState | null;
  /** Debounce delay in milliseconds before triggering completion */
  debounceMs?: number;
  /** Maximum length of prefix text to send for completion */
  maxPrefixLength?: number;
  /** Whether the completion feature is enabled */
  enabled?: boolean;
  /** Whether Right Arrow also accepts the suggestion (off by default) */
  acceptRightArrow?: boolean;
}

/**
 * Plugin state interface for ProseMirror integration
 * Manages completion state and request lifecycle
 * @interface InlineCompleteState
 */
export interface InlineCompleteState {
  /** Current completion suggestion or null if none */
  suggestion: CompletionText | null;
  /** ID of the current or last completion request */
  requestId: string | null;
  /** Last query text that was sent for completion */
  lastQuery: string | null;
  /** Whether a completion request is currently in progress */
  isLoading: boolean;
  /** AbortController for cancelling in-flight requests */
  abortController: AbortController | null;
  /** Optional confidence score for current suggestion */
  confidence?: number;
}
