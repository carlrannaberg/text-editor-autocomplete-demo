// __tests__/lib/errors/ContextErrorHandler.test.ts

import { ContextErrorHandler, ContextError, ErrorMetrics } from '@/lib/errors/ContextErrorHandler';

describe('ContextErrorHandler', () => {
  beforeEach(() => {
    // Reset metrics before each test
    ContextErrorHandler.resetMetrics();
  });

  describe('createError', () => {
    it('should create a structured error with default values', () => {
      const error = ContextErrorHandler.createError('VALIDATION_FAILED', 'Test validation error');
      
      expect(error.type).toBe('VALIDATION_FAILED');
      expect(error.severity).toBe('low');
      expect(error.message).toBe('Test validation error');
      expect(error.userMessage).toBe('Please check your input and try again.');
      expect(error.retryable).toBe(false);
      expect(error.recoverable).toBe(true);
      expect(error.timestamp).toBeInstanceOf(Date);
    });

    it('should create error with custom options', () => {
      const originalError = new Error('Original error');
      const context = { field: 'test', value: 'invalid' };
      
      const error = ContextErrorHandler.createError('NETWORK_ERROR', 'Custom message', {
        severity: 'high',
        originalError,
        context,
        code: 'NET001'
      });
      
      expect(error.severity).toBe('high');
      expect(error.originalError).toBe(originalError);
      expect(error.context).toEqual(context);
      expect(error.code).toBe('NET001');
    });

    it('should update metrics when creating errors', () => {
      ContextErrorHandler.createError('STORAGE_UNAVAILABLE', 'Storage error');
      ContextErrorHandler.createError('TOKEN_LIMIT_EXCEEDED', 'Token limit error');
      
      const metrics = ContextErrorHandler.getMetrics();
      expect(metrics.errorCount).toBe(2);
      expect(metrics.lastError).toBeInstanceOf(Date);
    });
  });

  describe('specialized error handlers', () => {
    it('should handle storage errors', () => {
      const originalError = new Error('Storage unavailable');
      const error = ContextErrorHandler.handleStorageError('save', originalError);
      
      expect(error.type).toBe('STORAGE_UNAVAILABLE');
      expect(error.message).toBe('Failed to save context data');
      expect(error.severity).toBe('medium');
      expect(error.originalError).toBe(originalError);
      expect(error.context).toEqual({ operation: 'save' });
    });

    it('should handle validation errors', () => {
      const error = ContextErrorHandler.handleValidationError('audience', 'too long text', 'max length');
      
      expect(error.type).toBe('VALIDATION_FAILED');
      expect(error.message).toBe('Validation failed for audience: max length');
      expect(error.severity).toBe('low');
      expect(error.context).toEqual({ field: 'audience', value: 'too long text', rule: 'max length' });
    });

    it('should handle token limit errors', () => {
      const error = ContextErrorHandler.handleTokenLimitError(25000, 20000);
      
      expect(error.type).toBe('TOKEN_LIMIT_EXCEEDED');
      expect(error.message).toBe('Token count 25000 exceeds maximum 20000');
      expect(error.severity).toBe('high');
      expect(error.context).toEqual({ currentCount: 25000, maxCount: 20000 });
    });

    it('should handle network errors', () => {
      const networkError = new Error('Network connection failed');
      networkError.name = 'NetworkError';
      
      const error = ContextErrorHandler.handleNetworkError('API call', networkError);
      
      expect(error.type).toBe('NETWORK_ERROR');
      expect(error.message).toBe('API call failed: Network connection failed');
      expect(error.severity).toBe('medium');
    });

    it('should handle crypto errors', () => {
      const cryptoError = new Error('Crypto API not available');
      const error = ContextErrorHandler.handleCryptoError(cryptoError);
      
      expect(error.type).toBe('CRYPTO_UNAVAILABLE');
      expect(error.message).toBe('Crypto API not available, using fallback');
      expect(error.severity).toBe('low');
    });

    it('should handle browser compatibility errors', () => {
      const error = ContextErrorHandler.handleBrowserError('localStorage');
      
      expect(error.type).toBe('BROWSER_UNSUPPORTED');
      expect(error.message).toBe('Browser does not support localStorage');
      expect(error.severity).toBe('critical');
      expect(error.context).toEqual({ feature: 'localStorage' });
    });
  });

  describe('recovery strategies', () => {
    it('should provide retry strategy for network errors', () => {
      const strategy = ContextErrorHandler.getRecoveryStrategy('NETWORK_ERROR');
      
      expect(strategy.type).toBe('retry');
      expect(strategy.maxRetries).toBe(3);
      expect(strategy.description).toContain('Retry');
    });

    it('should provide fallback strategy for storage errors', () => {
      const strategy = ContextErrorHandler.getRecoveryStrategy('STORAGE_UNAVAILABLE');
      
      expect(strategy.type).toBe('fallback');
      expect(strategy.fallbackValue).toBe(null);
      expect(strategy.description).toContain('fallback');
    });

    it('should provide reset strategy for token limit errors', () => {
      const strategy = ContextErrorHandler.getRecoveryStrategy('TOKEN_LIMIT_EXCEEDED');
      
      expect(strategy.type).toBe('reset');
      expect(strategy.description).toContain('Clear');
    });
  });

  describe('error recovery', () => {
    it('should attempt recovery with retry strategy', async () => {
      const error = ContextErrorHandler.createError('NETWORK_ERROR', 'Network failed');
      let callCount = 0;
      
      const operation = jest.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          throw new Error('First attempt failed');
        }
        return Promise.resolve('success');
      });
      
      const result = await ContextErrorHandler.attemptRecovery(error, operation);
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('should return fallback value for fallback strategy', async () => {
      const error = ContextErrorHandler.createError('STORAGE_UNAVAILABLE', 'Storage failed');
      const operation = jest.fn().mockRejectedValue(new Error('Operation failed'));
      
      const result = await ContextErrorHandler.attemptRecovery(error, operation);
      expect(result).toBe(null);
    });

    it('should return null for reset strategy', async () => {
      const error = ContextErrorHandler.createError('TOKEN_LIMIT_EXCEEDED', 'Token limit exceeded');
      const operation = jest.fn();
      
      const result = await ContextErrorHandler.attemptRecovery(error, operation);
      expect(result).toBe(null);
    });
  });

  describe('metrics tracking', () => {
    it('should track error metrics correctly', () => {
      ContextErrorHandler.createError('VALIDATION_FAILED', 'Error 1');
      ContextErrorHandler.createError('BROWSER_UNSUPPORTED', 'Error 2'); // Critical
      ContextErrorHandler.createError('NETWORK_ERROR', 'Error 3');
      
      const metrics = ContextErrorHandler.getMetrics();
      expect(metrics.errorCount).toBe(3);
      expect(metrics.criticalCount).toBe(1);
      expect(metrics.lastError).toBeInstanceOf(Date);
      expect(metrics.recoveredCount).toBe(0);
    });

    it('should reset metrics correctly', () => {
      ContextErrorHandler.createError('VALIDATION_FAILED', 'Error');
      
      let metrics = ContextErrorHandler.getMetrics();
      expect(metrics.errorCount).toBe(1);
      
      ContextErrorHandler.resetMetrics();
      
      metrics = ContextErrorHandler.getMetrics();
      expect(metrics.errorCount).toBe(0);
      expect(metrics.lastError).toBe(null);
      expect(metrics.criticalCount).toBe(0);
      expect(metrics.recoveredCount).toBe(0);
    });
  });

  describe('error classification', () => {
    it('should classify errors as retryable correctly', () => {
      const retryableError = ContextErrorHandler.createError('NETWORK_ERROR', 'Network failed');
      const nonRetryableError = ContextErrorHandler.createError('VALIDATION_FAILED', 'Invalid input');
      
      expect(retryableError.retryable).toBe(true);
      expect(nonRetryableError.retryable).toBe(false);
    });

    it('should classify errors as recoverable correctly', () => {
      const recoverableError = ContextErrorHandler.createError('STORAGE_UNAVAILABLE', 'Storage failed');
      const nonRecoverableError = ContextErrorHandler.createError('BROWSER_UNSUPPORTED', 'Browser not supported');
      
      expect(recoverableError.recoverable).toBe(true);
      expect(nonRecoverableError.recoverable).toBe(false);
    });

    it('should assign correct severity levels', () => {
      const criticalError = ContextErrorHandler.createError('BROWSER_UNSUPPORTED', 'Browser error');
      const highError = ContextErrorHandler.createError('TOKEN_LIMIT_EXCEEDED', 'Token error');
      const mediumError = ContextErrorHandler.createError('STORAGE_UNAVAILABLE', 'Storage error');
      const lowError = ContextErrorHandler.createError('VALIDATION_FAILED', 'Validation error');
      
      expect(criticalError.severity).toBe('critical');
      expect(highError.severity).toBe('high');
      expect(mediumError.severity).toBe('medium');
      expect(lowError.severity).toBe('low');
    });
  });

  describe('user-friendly messages', () => {
    it('should generate appropriate user messages', () => {
      const storageError = ContextErrorHandler.createError('STORAGE_UNAVAILABLE', 'Storage failed');
      const tokenError = ContextErrorHandler.createError('TOKEN_LIMIT_EXCEEDED', 'Token limit');
      const validationError = ContextErrorHandler.createError('VALIDATION_FAILED', 'Invalid');
      const networkError = ContextErrorHandler.createError('NETWORK_ERROR', 'Network failed');
      
      expect(storageError.userMessage).toContain('save your settings');
      expect(tokenError.userMessage).toContain('context is too long');
      expect(validationError.userMessage).toContain('check your input');
      expect(networkError.userMessage).toContain('Network connection issue');
    });
  });
});