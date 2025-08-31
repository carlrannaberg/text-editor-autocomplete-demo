// lib/hooks/useContextErrorHandling.ts

import { useState, useCallback } from 'react';
import { ContextError, ContextErrorHandler } from '@/lib/errors/ContextErrorHandler';
import { useErrorNotification } from '@/components/ErrorNotification';
import type { CompletionContextState } from '@/lib/types';

/**
 * Unified error handling hook that consolidates error creation, display, and retry logic.
 * Replaces the 3-layer complexity of ContextErrorHandler + handleUIError + useErrorNotification
 * with a single, cohesive error management system.
 */

// Discriminated union for tracking failed operations with retry data
export type FailedOperation = 
  | { type: 'storage-save'; data: { key: string; value: string } }
  | { type: 'storage-load'; data: { key: string } }
  | { type: 'context-update'; data: Partial<CompletionContextState> }
  | { type: 'validation'; data: CompletionContextState };

export function useContextErrorHandling() {
  const { currentError, showError, dismissError, retryOperation } = useErrorNotification();
  const [lastFailedOperation, setLastFailedOperation] = useState<FailedOperation | null>(null);

  // Unified error handler that creates context errors and manages display
  const handleError = useCallback((operation: FailedOperation, error: Error) => {
    setLastFailedOperation(operation);
    
    const contextError = createContextError(operation, error);
    
    // Development logging
    if (process.env.NODE_ENV === 'development') {
      console.warn(`UI ${contextError.type}:`, contextError.message);
    }
    
    // Show error notification (skip in test environment)
    if (process.env.NODE_ENV !== 'test') {
      showError(contextError);
    }
  }, [showError]);

  // Unified retry handler that executes the last failed operation
  const retryLastOperation = useCallback(() => {
    if (!lastFailedOperation) return;
    
    retryOperation(async () => {
      await executeFailedOperation(lastFailedOperation);
      setLastFailedOperation(null);
    });
  }, [lastFailedOperation, retryOperation]);

  // Factory functions for common error scenarios
  const createStorageErrorHandler = useCallback((operationType: 'save' | 'load') => {
    return (error: Error, data: { key: string; value?: string }) => {
      const operation: FailedOperation = operationType === 'save' 
        ? { type: 'storage-save' as const, data: { key: data.key, value: data.value! } }
        : { type: 'storage-load' as const, data: { key: data.key } };
      handleError(operation, error);
    };
  }, [handleError]);

  const createValidationErrorHandler = useCallback(() => {
    return (error: Error, context: CompletionContextState) => {
      const operation: FailedOperation = {
        type: 'validation',
        data: context
      };
      handleError(operation, error);
    };
  }, [handleError]);

  const createContextUpdateErrorHandler = useCallback(() => {
    return (error: Error, data: Partial<CompletionContextState>) => {
      const operation: FailedOperation = {
        type: 'context-update',
        data
      };
      handleError(operation, error);
    };
  }, [handleError]);

  return {
    // Current error state
    currentError,
    
    // Core error management
    handleError,
    dismissError,
    retryLastOperation,
    
    // Factory functions for common patterns
    handleStorageError: createStorageErrorHandler,
    handleValidationError: createValidationErrorHandler,
    handleContextUpdateError: createContextUpdateErrorHandler,
    
    // Access to last failed operation for debugging
    lastFailedOperation
  };
}

// Helper function to create context errors based on operation type
function createContextError(operation: FailedOperation, error: Error): ContextError {
  switch (operation.type) {
    case 'storage-save':
      return ContextErrorHandler.handleStorageError('save', error);
    case 'storage-load':
      return ContextErrorHandler.handleStorageError('load', error);
    case 'context-update':
      return ContextErrorHandler.handleNetworkError('context update', error);
    case 'validation':
      return ContextErrorHandler.handleValidationError('context', operation.data, 'validation failed');
    default:
      return ContextErrorHandler.createError('API_ERROR', error.message, { originalError: error });
  }
}

// Helper function to execute failed operations for retry
async function executeFailedOperation(operation: FailedOperation): Promise<void> {
  switch (operation.type) {
    case 'storage-save':
      localStorage.setItem(operation.data.key, operation.data.value);
      break;
    case 'storage-load':
      const value = localStorage.getItem(operation.data.key);
      if (!value) throw new Error(`No value found for key: ${operation.data.key}`);
      break;
    case 'context-update':
      // Context update retry would need to be handled by the calling component
      throw new Error('Context update retry should be handled by the component');
    case 'validation':
      // Re-validate the context data
      // This would typically involve calling the validation function again
      throw new Error('Validation retry should be handled by the component');
    default:
      throw new Error(`Unknown operation type: ${(operation as any).type}`);
  }
}