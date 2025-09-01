// lib/utils/contextUtils.ts
import type { CompletionContextState } from '@/lib/types';

/**
 * Determines if a context object contains any meaningful values that should be sent to the API.
 * Empty strings, undefined values, and empty arrays are considered non-meaningful.
 * 
 * @param context - The completion context state to check
 * @returns true if context has at least one meaningful value, false otherwise
 * 
 * @example
 * hasMeaningfulContext({ contextText: '', keywords: [] }) // false
 * hasMeaningfulContext({ contextText: 'Hello', keywords: [] }) // true
 * hasMeaningfulContext({ documentType: 'email' }) // true
 */
export const hasMeaningfulContext = (context?: CompletionContextState): boolean => {
  if (!context) return false;
  
  return !!(
    context.contextText?.trim() ||
    context.documentType ||
    context.language ||
    context.tone ||
    context.audience?.trim() ||
    (context.keywords && context.keywords.length > 0)
  );
};

/**
 * Normalizes context for API payload with proper undefined handling.
 * Only includes fields that have meaningful values.
 * 
 * @param context - The completion context state to normalize
 * @returns Normalized context object for API or undefined if no meaningful context
 */
export const normalizeContextForAPI = (context: CompletionContextState): object => {
  // Build payload only including fields with actual values
  const payload: Record<string, any> = {};
  
  // Map contextText to userContext (API field name)
  if (context.contextText?.trim()) {
    payload.userContext = context.contextText.trim();
  }
  
  // Only include other fields if they have values
  if (context.documentType) {
    payload.documentType = context.documentType;
  }
  
  if (context.language) {
    payload.language = context.language;
  }
  
  if (context.tone) {
    payload.tone = context.tone;
  }
  
  if (context.audience?.trim()) {
    payload.audience = context.audience.trim();
  }
  
  if (context.keywords && context.keywords.length > 0) {
    payload.keywords = context.keywords;
  }
  
  return payload;
};

/**
 * Normalizes context for cache key generation with consistent ordering.
 * All fields are converted to strings for stable hashing.
 * 
 * @param context - The completion context state to normalize
 * @returns Normalized context object with string values for hashing
 */
export const normalizeContextForCache = (context: CompletionContextState): Record<string, string> => {
  return {
    userContext: context.contextText?.trim() || '',
    documentType: context.documentType || '',
    language: context.language || '',
    tone: context.tone || '',
    audience: context.audience?.trim() || '',
    keywords: context.keywords?.sort().join(',') || ''
  };
};

/**
 * Creates a safe context snapshot that avoids race conditions.
 * Only includes properties that have meaningful values.
 * 
 * @param source - The source context object to snapshot
 * @returns Immutable snapshot of context state
 */
export const createContextSnapshot = (source: CompletionContextState): CompletionContextState => {
  return {
    contextText: source.contextText || '',
    ...(source.documentType && { documentType: source.documentType }),
    ...(source.language && { language: source.language }),
    ...(source.tone && { tone: source.tone }),
    ...(source.audience && { audience: source.audience }),
    ...(source.keywords && source.keywords.length > 0 && { 
      keywords: [...source.keywords] 
    })
  };
};