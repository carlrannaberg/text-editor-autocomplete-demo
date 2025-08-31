// lib/errors/ContextErrorHandler.ts

/**
 * Comprehensive error handling system for context operations
 * Provides error classification, logging, and user-friendly messaging
 */

import { CompletionContextState } from '@/lib/types';

/**
 * Comprehensive error types for context operations
 */
export type ContextErrorType = 
  | 'STORAGE_UNAVAILABLE'
  | 'TOKEN_LIMIT_EXCEEDED'
  | 'VALIDATION_FAILED'
  | 'NETWORK_ERROR'
  | 'API_ERROR'
  | 'CRYPTO_UNAVAILABLE'
  | 'BROWSER_UNSUPPORTED'
  | 'QUOTA_EXCEEDED'
  | 'PERMISSION_DENIED';

/**
 * Severity levels for error handling
 */
export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';

/**
 * Comprehensive error interface
 */
export interface ContextError {
  type: ContextErrorType;
  severity: ErrorSeverity;
  message: string;
  userMessage: string;
  retryable: boolean;
  recoverable: boolean;
  timestamp: Date;
  context?: Record<string, unknown>;
  code?: string;
  originalError?: Error;
}

/**
 * Error recovery strategy
 */
export interface RecoveryStrategy {
  type: 'retry' | 'fallback' | 'reset' | 'ignore';
  maxRetries?: number;
  fallbackValue?: unknown;
  description: string;
}

/**
 * Error metrics for monitoring
 */
export interface ErrorMetrics {
  errorCount: number;
  lastError: Date | null;
  recoveredCount: number;
  criticalCount: number;
}

/**
 * Context error handler class
 */
export class ContextErrorHandler {
  private static metrics: ErrorMetrics = {
    errorCount: 0,
    lastError: null,
    recoveredCount: 0,
    criticalCount: 0
  };

  private static isDevelopment = process.env.NODE_ENV === 'development';

  /**
   * Create a structured context error
   */
  static createError(
    type: ContextErrorType,
    message: string,
    options: {
      severity?: ErrorSeverity;
      originalError?: Error;
      context?: Record<string, unknown>;
      code?: string;
    } = {}
  ): ContextError {
    const {
      severity = this.getDefaultSeverity(type),
      originalError,
      context,
      code
    } = options;

    const error: ContextError = {
      type,
      severity,
      message,
      userMessage: this.generateUserMessage(type, message),
      retryable: this.isRetryable(type),
      recoverable: this.isRecoverable(type),
      timestamp: new Date(),
      ...(context && { context }),
      ...(code && { code }),
      ...(originalError && { originalError })
    };

    // Update metrics
    this.updateMetrics(error);

    // Log error based on severity
    this.logError(error);

    return error;
  }

  /**
   * Handle storage-related errors
   */
  static handleStorageError(operation: 'save' | 'load', error: Error): ContextError {
    return this.createError('STORAGE_UNAVAILABLE', `Failed to ${operation} context data`, {
      severity: 'medium',
      originalError: error,
      context: { operation }
    });
  }

  /**
   * Handle validation errors
   */
  static handleValidationError(field: string, value: unknown, rule: string): ContextError {
    return this.createError('VALIDATION_FAILED', `Validation failed for ${field}: ${rule}`, {
      severity: 'low',
      context: { field, value, rule }
    });
  }

  /**
   * Handle token limit errors
   */
  static handleTokenLimitError(currentCount: number, maxCount: number): ContextError {
    return this.createError('TOKEN_LIMIT_EXCEEDED', `Token count ${currentCount} exceeds maximum ${maxCount}`, {
      severity: 'high',
      context: { currentCount, maxCount }
    });
  }

  /**
   * Handle network/API errors
   */
  static handleNetworkError(operation: string, error: Error): ContextError {
    const isNetworkError = error.name === 'NetworkError' || error.message.includes('fetch');
    const type: ContextErrorType = isNetworkError ? 'NETWORK_ERROR' : 'API_ERROR';
    
    return this.createError(type, `${operation} failed: ${error.message}`, {
      severity: 'medium',
      originalError: error,
      context: { operation }
    });
  }

  /**
   * Handle crypto API unavailability
   */
  static handleCryptoError(error: Error): ContextError {
    return this.createError('CRYPTO_UNAVAILABLE', 'Crypto API not available, using fallback', {
      severity: 'low',
      originalError: error
    });
  }

  /**
   * Handle browser compatibility issues
   */
  static handleBrowserError(feature: string): ContextError {
    return this.createError('BROWSER_UNSUPPORTED', `Browser does not support ${feature}`, {
      severity: 'critical',
      context: { feature }
    });
  }

  /**
   * Get recovery strategy for an error type
   */
  static getRecoveryStrategy(errorType: ContextErrorType): RecoveryStrategy {
    switch (errorType) {
      case 'STORAGE_UNAVAILABLE':
        return {
          type: 'fallback',
          fallbackValue: null,
          description: 'Use in-memory storage as fallback'
        };

      case 'TOKEN_LIMIT_EXCEEDED':
        return {
          type: 'reset',
          description: 'Clear context to reduce token count'
        };

      case 'VALIDATION_FAILED':
        return {
          type: 'ignore',
          description: 'Skip invalid input, keep previous value'
        };

      case 'NETWORK_ERROR':
      case 'API_ERROR':
        return {
          type: 'retry',
          maxRetries: 3,
          description: 'Retry operation with exponential backoff'
        };

      case 'CRYPTO_UNAVAILABLE':
        return {
          type: 'fallback',
          fallbackValue: 'simple-hash',
          description: 'Use simple hash algorithm instead of crypto'
        };

      case 'BROWSER_UNSUPPORTED':
        return {
          type: 'fallback',
          description: 'Provide alternative implementation or graceful degradation'
        };

      default:
        return {
          type: 'ignore',
          description: 'Log error and continue with default behavior'
        };
    }
  }

  /**
   * Attempt to recover from an error
   */
  static async attemptRecovery<T>(
    error: ContextError,
    operation: () => Promise<T>,
    retryCount: number = 0
  ): Promise<T | null> {
    const strategy = this.getRecoveryStrategy(error.type);

    try {
      switch (strategy.type) {
        case 'retry':
          if (retryCount < (strategy.maxRetries || 1)) {
            // Exponential backoff (skip delay on first attempt)
            if (retryCount > 0) {
              const delay = Math.min(1000 * Math.pow(2, retryCount - 1), 5000);
              await new Promise(resolve => setTimeout(resolve, delay));
            }
            
            try {
              const result = await operation();
              this.metrics.recoveredCount++;
              return result;
            } catch (operationError) {
              // Retry with incremented count
              return this.attemptRecovery(error, operation, retryCount + 1);
            }
          }
          break;

        case 'fallback':
          return strategy.fallbackValue as T;

        case 'reset':
          // Let the caller handle reset logic
          return null;

        case 'ignore':
          return null;
      }
    } catch (recoveryError) {
      if (this.isDevelopment) {
        console.warn('Recovery attempt failed:', recoveryError);
      }
    }

    return null;
  }

  /**
   * Get error metrics for monitoring
   */
  static getMetrics(): ErrorMetrics {
    return { ...this.metrics };
  }

  /**
   * Reset error metrics
   */
  static resetMetrics(): void {
    this.metrics = {
      errorCount: 0,
      lastError: null,
      recoveredCount: 0,
      criticalCount: 0
    };
  }

  /**
   * Check if error type is retryable
   */
  private static isRetryable(type: ContextErrorType): boolean {
    return ['NETWORK_ERROR', 'API_ERROR', 'QUOTA_EXCEEDED'].includes(type);
  }

  /**
   * Check if error type is recoverable
   */
  private static isRecoverable(type: ContextErrorType): boolean {
    return ![
      'BROWSER_UNSUPPORTED',
      'PERMISSION_DENIED'
    ].includes(type);
  }

  /**
   * Get default severity for error type
   */
  private static getDefaultSeverity(type: ContextErrorType): ErrorSeverity {
    switch (type) {
      case 'BROWSER_UNSUPPORTED':
      case 'PERMISSION_DENIED':
        return 'critical';
      
      case 'TOKEN_LIMIT_EXCEEDED':
      case 'NETWORK_ERROR':
      case 'API_ERROR':
        return 'high';
      
      case 'STORAGE_UNAVAILABLE':
      case 'QUOTA_EXCEEDED':
        return 'medium';
      
      case 'VALIDATION_FAILED':
      case 'CRYPTO_UNAVAILABLE':
        return 'low';
      
      default:
        return 'medium';
    }
  }

  /**
   * Generate user-friendly error messages
   */
  private static generateUserMessage(type: ContextErrorType, message: string): string {
    switch (type) {
      case 'STORAGE_UNAVAILABLE':
        return 'Unable to save your settings. Changes will be lost when you refresh the page.';
      
      case 'TOKEN_LIMIT_EXCEEDED':
        return 'Your context is too long. Please reduce the amount of text to continue.';
      
      case 'VALIDATION_FAILED':
        return 'Please check your input and try again.';
      
      case 'NETWORK_ERROR':
        return 'Network connection issue. Please check your internet connection and try again.';
      
      case 'API_ERROR':
        return 'Service temporarily unavailable. Please try again in a moment.';
      
      case 'CRYPTO_UNAVAILABLE':
        return 'Using alternative security method. Functionality may be limited.';
      
      case 'BROWSER_UNSUPPORTED':
        return 'Your browser doesn\'t support this feature. Please update your browser or use a different one.';
      
      case 'QUOTA_EXCEEDED':
        return 'Storage limit reached. Please clear some data and try again.';
      
      case 'PERMISSION_DENIED':
        return 'Permission denied. Please check your browser settings.';
      
      default:
        return 'An unexpected error occurred. Please try again.';
    }
  }

  /**
   * Update error metrics
   */
  private static updateMetrics(error: ContextError): void {
    this.metrics.errorCount++;
    this.metrics.lastError = error.timestamp;
    
    if (error.severity === 'critical') {
      this.metrics.criticalCount++;
    }
  }

  /**
   * Log error based on severity and environment
   */
  private static logError(error: ContextError): void {
    if (!this.isDevelopment && error.severity === 'low') {
      return; // Don't log low-severity errors in production
    }

    const logData = {
      type: error.type,
      severity: error.severity,
      message: error.message,
      timestamp: error.timestamp.toISOString(),
      retryable: error.retryable,
      recoverable: error.recoverable,
      code: error.code,
      context: error.context
    };

    switch (error.severity) {
      case 'critical':
        console.error('🚨 Critical Context Error:', logData);
        break;
      case 'high':
        console.error('❌ High Priority Context Error:', logData);
        break;
      case 'medium':
        console.warn('⚠️ Context Warning:', logData);
        break;
      case 'low':
        console.info('ℹ️ Context Info:', logData);
        break;
    }

    // In development, also log the original error stack
    if (this.isDevelopment && error.originalError) {
      console.error('Original error:', error.originalError);
    }
  }
}