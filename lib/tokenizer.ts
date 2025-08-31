// lib/tokenizer.ts

import GPT3TokenizerImport from 'gpt3-tokenizer';
import { CompletionContextState } from '@/lib/types';

/**
 * Interface for GPT3 tokenizer instance
 */
interface GPT3TokenizerInstance {
  encode: (text: string) => { bpe: number[] };
}

/**
 * Interface for GPT3 tokenizer constructor
 */
interface GPT3TokenizerConstructor {
  new (options: { type: 'gpt3' | 'codex' }): GPT3TokenizerInstance;
}

/**
 * Module type for gpt3-tokenizer that handles both default and named exports
 */
type GPT3TokenizerModule = GPT3TokenizerConstructor | { default: GPT3TokenizerConstructor };

// Handle default export properly for the tokenizer library
const GPT3Tokenizer: GPT3TokenizerConstructor = typeof GPT3TokenizerImport === 'function' 
  ? GPT3TokenizerImport 
  : (GPT3TokenizerImport as GPT3TokenizerModule as { default: GPT3TokenizerConstructor }).default || GPT3TokenizerImport;

/**
 * Token warning levels for user feedback
 */
export type TokenWarningLevel = 'safe' | 'warning' | 'danger' | 'error';

/**
 * Token thresholds for different warning levels
 */
const TOKEN_THRESHOLDS = {
  safe: 15000,
  warning: 18000,
  danger: 20000,
} as const;

/**
 * Maximum token limit for context
 */
export const MAX_TOKEN_LIMIT = 20000;

/**
 * Initialize tokenizer instance with error handling
 */
let tokenizer: GPT3TokenizerInstance | null = null;
let tokenizerError: Error | null = null;

try {
  tokenizer = new GPT3Tokenizer({ type: 'gpt3' });
} catch (error) {
  tokenizerError = error instanceof Error ? error : new Error('Failed to initialize tokenizer');
  console.warn('Failed to initialize GPT3Tokenizer, falling back to character-based estimation:', tokenizerError.message);
}

/**
 * Get accurate token count for text using GPT3Tokenizer
 * Falls back to character-based estimation if tokenizer unavailable
 * @param text - Text to count tokens for
 * @returns Token count
 */
export function getTokenCount(text: string): number {
  if (!text || typeof text !== 'string') {
    return 0;
  }

  // Use tokenizer if available
  if (tokenizer && !tokenizerError) {
    try {
      const encoded = tokenizer.encode(text);
      return encoded.bpe.length;
    } catch (error) {
      console.warn('Tokenizer failed, falling back to character estimation:', error);
      // Fall through to character-based estimation
    }
  }

  // Fallback: Character-based estimation (~4 characters per token)
  return Math.ceil(text.length / 4);
}

/**
 * Get comprehensive token count for complete context object
 * @param context - Complete context state object
 * @returns Total token count for all context fields
 */
export function getContextTokenCount(context: CompletionContextState): number {
  let totalTokens = 0;

  // Context text (main field)
  if (context.contextText) {
    totalTokens += getTokenCount(context.contextText);
  }

  // Document type (minimal tokens)
  if (context.documentType) {
    totalTokens += 2; // e.g., "email", "article"
  }

  // Language (minimal tokens)
  if (context.language) {
    totalTokens += 2; // e.g., "en", "es"
  }

  // Tone (minimal tokens)
  if (context.tone) {
    totalTokens += 2; // e.g., "formal", "casual"
  }

  // Audience (variable length)
  if (context.audience) {
    totalTokens += getTokenCount(context.audience);
  }

  // Keywords (sum of all keyword tokens)
  if (context.keywords && context.keywords.length > 0) {
    totalTokens += context.keywords.reduce((sum, keyword) => sum + getTokenCount(keyword), 0);
  }

  return totalTokens;
}

/**
 * Determine warning level based on token count
 * @param tokenCount - Current token count
 * @returns Warning level
 */
export function getTokenWarningLevel(tokenCount: number): TokenWarningLevel {
  if (tokenCount >= TOKEN_THRESHOLDS.danger) {
    return 'error';
  }
  if (tokenCount >= TOKEN_THRESHOLDS.warning) {
    return 'danger';
  }
  if (tokenCount >= TOKEN_THRESHOLDS.safe) {
    return 'warning';
  }
  return 'safe';
}

/**
 * Get CSS color class for token count display
 * @param warningLevel - Current warning level
 * @returns CSS class string
 */
export function getTokenCountColorClass(warningLevel: TokenWarningLevel): string {
  switch (warningLevel) {
    case 'safe':
      return 'text-green-600';
    case 'warning':
      return 'text-yellow-600';
    case 'danger':
      return 'text-red-600';
    case 'error':
      return 'text-red-800 font-semibold';
    default:
      return 'text-gray-600';
  }
}

/**
 * Get user-friendly warning message based on token count and level
 * @param tokenCount - Current token count
 * @param warningLevel - Current warning level
 * @returns Warning message or null for safe levels
 */
export function getTokenWarningMessage(tokenCount: number, warningLevel: TokenWarningLevel): string | null {
  switch (warningLevel) {
    case 'warning':
      return `Approaching token limit (${tokenCount.toLocaleString()} / ${MAX_TOKEN_LIMIT.toLocaleString()} tokens). Consider reducing context length.`;
    case 'danger':
      return `Near token limit (${tokenCount.toLocaleString()} / ${MAX_TOKEN_LIMIT.toLocaleString()} tokens). Please reduce context to avoid submission issues.`;
    case 'error':
      return `Token limit exceeded (${tokenCount.toLocaleString()} / ${MAX_TOKEN_LIMIT.toLocaleString()} tokens). Context cannot be submitted until reduced.`;
    case 'safe':
    default:
      return null;
  }
}

/**
 * Get progress bar percentage for token usage
 * @param tokenCount - Current token count
 * @returns Percentage (0-100)
 */
export function getTokenProgress(tokenCount: number): number {
  return Math.min((tokenCount / MAX_TOKEN_LIMIT) * 100, 100);
}

/**
 * Get progress bar color class based on warning level
 * @param warningLevel - Current warning level
 * @returns CSS class string for progress bar
 */
export function getProgressBarColorClass(warningLevel: TokenWarningLevel): string {
  switch (warningLevel) {
    case 'safe':
      return 'bg-green-500';
    case 'warning':
      return 'bg-yellow-500';
    case 'danger':
      return 'bg-red-500';
    case 'error':
      return 'bg-red-700';
    default:
      return 'bg-gray-400';
  }
}

/**
 * Check if context is within token limits for submission
 * @param tokenCount - Current token count
 * @returns True if within limits, false if exceeds
 */
export function isWithinTokenLimit(tokenCount: number): boolean {
  return tokenCount <= MAX_TOKEN_LIMIT;
}

/**
 * Get warning icon based on warning level
 * @param warningLevel - Current warning level
 * @returns Icon string or null for safe levels
 */
export function getWarningIcon(warningLevel: TokenWarningLevel): string | null {
  switch (warningLevel) {
    case 'warning':
      return '⚠️';
    case 'danger':
      return '⚠️';
    case 'error':
      return '🚫';
    case 'safe':
    default:
      return null;
  }
}

/**
 * Debug information about tokenizer status (development only)
 */
export function getTokenizerDebugInfo() {
  return {
    tokenizerAvailable: !!tokenizer && !tokenizerError,
    tokenizerError: tokenizerError?.message || null,
    fallbackMode: !tokenizer || !!tokenizerError,
  };
}