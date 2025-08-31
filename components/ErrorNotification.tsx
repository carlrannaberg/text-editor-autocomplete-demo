// components/ErrorNotification.tsx
'use client';

import React, { useEffect, useCallback, useState } from 'react';
import { ContextError, RecoveryStrategy, ContextErrorHandler } from '@/lib/errors/ContextErrorHandler';

export interface ErrorNotificationProps {
  /** The error to display */
  error: ContextError | null;
  /** Callback when error is dismissed */
  onDismiss?: () => void;
  /** Callback when retry is requested */
  onRetry?: () => void;
  /** Auto dismiss duration in milliseconds (0 = no auto dismiss) */
  autoDismissMs?: number;
  /** Whether to show technical details (development mode) */
  showTechnicalDetails?: boolean;
  /** Custom CSS classes */
  className?: string;
}

/**
 * Error notification component with retry functionality and auto-dismissal
 * Provides user-friendly error messages with appropriate styling
 */
export const ErrorNotification: React.FC<ErrorNotificationProps> = ({
  error,
  onDismiss,
  onRetry,
  autoDismissMs = 5000,
  showTechnicalDetails = process.env.NODE_ENV === 'development',
  className = ''
}) => {
  const [isVisible, setIsVisible] = useState(false);

  const handleDismiss = useCallback(() => {
    setIsVisible(false);
    setTimeout(() => {
      onDismiss?.();
    }, 200); // Allow fade-out animation
  }, [onDismiss]);

  // Show/hide animation
  useEffect(() => {
    if (error) {
      setIsVisible(true);
    } else {
      setIsVisible(false);
    }
  }, [error, autoDismissMs]);

  // Auto-dismiss timer
  useEffect(() => {
    if (!error || !autoDismissMs || autoDismissMs === 0) {
      return;
    }

    const timeout = setTimeout(() => {
      handleDismiss();
    }, autoDismissMs);

    return () => clearTimeout(timeout);
  }, [error, autoDismissMs, handleDismiss]);

  const handleRetry = useCallback(() => {
    onRetry?.();
    handleDismiss();
  }, [onRetry, handleDismiss]);

  if (!error || !isVisible) {
    return null;
  }

  const recoveryStrategy = ContextErrorHandler.getRecoveryStrategy(error.type);
  const canRetry = error.retryable && onRetry;

  // Styling based on error severity
  const getSeverityStyles = (severity: string) => {
    switch (severity) {
      case 'critical':
        return {
          container: 'bg-red-50 border-red-200 text-red-900',
          icon: '🚨',
          iconColor: 'text-red-600',
          button: 'bg-red-600 hover:bg-red-700 text-white',
          progress: 'bg-red-500'
        };
      case 'high':
        return {
          container: 'bg-red-50 border-red-200 text-red-800',
          icon: '❌',
          iconColor: 'text-red-500',
          button: 'bg-red-600 hover:bg-red-700 text-white',
          progress: 'bg-red-500'
        };
      case 'medium':
        return {
          container: 'bg-yellow-50 border-yellow-200 text-yellow-900',
          icon: '⚠️',
          iconColor: 'text-yellow-600',
          button: 'bg-yellow-600 hover:bg-yellow-700 text-white',
          progress: 'bg-yellow-500'
        };
      case 'low':
        return {
          container: 'bg-blue-50 border-blue-200 text-blue-900',
          icon: 'ℹ️',
          iconColor: 'text-blue-600',
          button: 'bg-blue-600 hover:bg-blue-700 text-white',
          progress: 'bg-blue-500'
        };
      default:
        return {
          container: 'bg-gray-50 border-gray-200 text-gray-900',
          icon: '⚪',
          iconColor: 'text-gray-600',
          button: 'bg-gray-600 hover:bg-gray-700 text-white',
          progress: 'bg-gray-500'
        };
    }
  };

  const styles = getSeverityStyles(error.severity);

  return (
    <div
      className={`
        fixed top-4 right-4 max-w-md w-full z-50 transition-all duration-200
        rounded-lg border shadow-lg p-4 relative overflow-hidden
        ${isVisible ? 'opacity-100 transform translate-y-0' : 'opacity-0 transform -translate-y-2'}
        ${styles.container}
        ${className}
      `}
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
    >
      <div>
        <div className="flex items-start gap-3">
          {/* Error icon */}
          <div className={`flex-shrink-0 ${styles.iconColor} text-lg mt-0.5`}>
            {styles.icon}
          </div>

          {/* Error content */}
          <div className="flex-1 min-w-0">
            {/* Main error message */}
            <div className="text-sm font-medium mb-1">
              {error.userMessage}
            </div>

            {/* Recovery strategy hint */}
            {error.recoverable && (
              <div className="text-xs opacity-75 mb-2">
                {recoveryStrategy.description}
              </div>
            )}

            {/* Technical details (development only) */}
            {showTechnicalDetails && (
              <details className="text-xs opacity-60 mb-2">
                <summary className="cursor-pointer hover:opacity-80">
                  Technical Details
                </summary>
                <div className="mt-1 pl-2 border-l-2 border-current border-opacity-20">
                  <div><strong>Type:</strong> {error.type}</div>
                  <div><strong>Severity:</strong> {error.severity}</div>
                  <div><strong>Time:</strong> {error.timestamp.toLocaleTimeString()}</div>
                  {error.code && <div><strong>Code:</strong> {error.code}</div>}
                  {error.context && (
                    <div><strong>Context:</strong> {JSON.stringify(error.context)}</div>
                  )}
                  {error.originalError && (
                    <div><strong>Original:</strong> {error.originalError.message}</div>
                  )}
                </div>
              </details>
            )}

            {/* Action buttons */}
            <div className="flex items-center gap-2">
              {canRetry && (
                <button
                  onClick={handleRetry}
                  className={`
                    px-3 py-1.5 text-xs font-medium rounded transition-colors
                    focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-current
                    ${styles.button}
                  `}
                  aria-label="Retry the failed operation"
                >
                  Try Again
                </button>
              )}
              
              <button
                onClick={handleDismiss}
                className="
                  px-3 py-1.5 text-xs font-medium rounded transition-colors
                  bg-transparent border border-current opacity-60 hover:opacity-80
                  focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-current
                "
                aria-label="Dismiss this notification"
              >
                Dismiss
              </button>
            </div>
          </div>

          {/* Close button */}
          <button
            onClick={handleDismiss}
            className="
              flex-shrink-0 p-1 rounded transition-colors opacity-60 hover:opacity-80
              focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-current
            "
            aria-label="Close notification"
          >
            <span className="text-sm">×</span>
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * Hook for managing error notifications
 */
export function useErrorNotification() {
  const [currentError, setCurrentError] = useState<ContextError | null>(null);

  const showError = useCallback((error: ContextError) => {
    setCurrentError(error);
  }, []);

  const dismissError = useCallback(() => {
    setCurrentError(null);
  }, []);

  const retryOperation = useCallback(async (operation: () => Promise<void>) => {
    if (!currentError) return;

    try {
      await ContextErrorHandler.attemptRecovery(
        currentError,
        operation,
        0 // Start with 0 retries
      );
      dismissError();
    } catch (error) {
      // If retry fails, show the new error
      if (error instanceof Error) {
        const newError = ContextErrorHandler.handleNetworkError('retry operation', error);
        showError(newError);
      }
    }
  }, [currentError, dismissError, showError]);

  return {
    currentError,
    showError,
    dismissError,
    retryOperation
  };
}

export default ErrorNotification;