// lib/utils/contextUtils.ts
import type { CompletionContextState } from '@/lib/types';

/**
 * Determines if a context object contains any meaningful values that should be sent to the API.
 * 
 * @param context - The completion context state to check
 * @returns true if context has meaningful text, false otherwise
 * 
 * @example
 * hasMeaningfulContext({ contextText: '' }) // false
 * hasMeaningfulContext({ contextText: 'Hello' }) // true
 */
export const hasMeaningfulContext = (context?: CompletionContextState): boolean => {
  if (!context) return false;
  
  return !!(context.contextText?.trim());
};

/**
 * Normalizes context for API payload.
 * 
 * @param context - The completion context state to normalize
 * @returns Normalized context object for API
 */
export const normalizeContextForAPI = (context: CompletionContextState): object => {
  return {
    userContext: context.contextText?.trim() || ''
  };
};

/**
 * Normalizes context for cache key generation.
 * 
 * @param context - The completion context state to normalize
 * @returns Normalized context object with string values for hashing
 */
export const normalizeContextForCache = (context: CompletionContextState): Record<string, string> => {
  return {
    userContext: context.contextText?.trim() || ''
  };
};

/**
 * Creates a safe context snapshot that avoids race conditions.
 * 
 * @param source - The source context object to snapshot
 * @returns Immutable snapshot of context state
 */
export const createContextSnapshot = (source: CompletionContextState): CompletionContextState => {
  return {
    contextText: source.contextText || ''
  };
};