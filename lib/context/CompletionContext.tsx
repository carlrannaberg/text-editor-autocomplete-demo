'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type {
  ContextError,
  CompletionContextState,
  CompletionContextValue,
  DocumentType,
  Language,
  Tone
} from '@/lib/types';

// Context normalization for stable hashing
const normalizeContext = (context: CompletionContextState) => ({
  userContext: context.contextText?.trim() || '',
  documentType: context.documentType || '',
  language: context.language || '',
  tone: context.tone || '',
  audience: context.audience?.trim() || '',
  keywords: context.keywords?.sort().join(',') || ''
});

// Structured error handling
const handleContextError = (error: ContextError) => {
  if (process.env.NODE_ENV === 'development') {
    console.warn(`Context ${error.type}:`, error.message);
  }
  // In production, errors are silent but still provide fallback behavior
};

// SHA-1 hash generation for cache keys
const generateContextHash = async (context: CompletionContextState): Promise<string> => {
  try {
    const normalized = normalizeContext(context);
    const contextString = JSON.stringify(normalized);
    
    const encoder = new TextEncoder();
    const data = encoder.encode(contextString);
    const hashBuffer = await crypto.subtle.digest('SHA-1', data);
    
    return Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  } catch (error) {
    const contextError: ContextError = {
      type: 'CRYPTO_UNAVAILABLE',
      message: 'Failed to generate context hash with crypto.subtle, using fallback',
      fallbackUsed: true
    };
    
    handleContextError(contextError);
    
    // Fallback to simple string hash for environments without crypto.subtle
    const contextString = JSON.stringify(normalizeContext(context));
    let hash = 0;
    for (let i = 0; i < contextString.length; i++) {
      const char = contextString.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(16);
  }
};

// Token counting approximation
const estimateTokenCount = (text: string): number => {
  // Basic approximation: ~4 characters per token
  return Math.ceil(text.length / 4);
};

// localStorage integration
const CONTEXT_STORAGE_KEY = 'autocomplete-context';

// Save to localStorage
const saveToLocalStorage = (context: CompletionContextState) => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(CONTEXT_STORAGE_KEY, JSON.stringify(context));
    }
  } catch (error) {
    const contextError: ContextError = {
      type: 'STORAGE_ERROR',
      message: 'Failed to save context to localStorage',
      operation: 'save'
    };
    
    handleContextError(contextError);
  }
};

// Load from localStorage
const loadFromLocalStorage = (): CompletionContextState => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const stored = localStorage.getItem(CONTEXT_STORAGE_KEY);
      return stored ? JSON.parse(stored) : getDefaultContext();
    }
  } catch (error) {
    const contextError: ContextError = {
      type: 'STORAGE_ERROR',
      message: 'Failed to load context from localStorage',
      operation: 'load'
    };
    
    handleContextError(contextError);
  }
  return getDefaultContext();
};

const getDefaultContext = (): CompletionContextState => ({
  contextText: '',
  keywords: []
});

// Create the context
const CompletionContext = createContext<CompletionContextValue | null>(null);

// Provider component
export const CompletionContextProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [context, setContext] = useState<CompletionContextState>(() => {
    // Initialize with default context, will load from localStorage in useEffect
    return getDefaultContext();
  });

  // Load from localStorage on mount (client-side only)
  useEffect(() => {
    const storedContext = loadFromLocalStorage();
    setContext(storedContext);
  }, []);

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

// Custom hook
export const useCompletionContext = (): CompletionContextValue => {
  const context = useContext(CompletionContext);
  if (!context) {
    throw new Error('useCompletionContext must be used within a CompletionContextProvider');
  }
  return context;
};

