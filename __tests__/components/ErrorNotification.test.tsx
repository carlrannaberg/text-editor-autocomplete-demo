// __tests__/components/ErrorNotification.test.tsx

import React from 'react';
import { render, screen, fireEvent, waitFor } from '../utils/test-helpers';
import userEvent from '@testing-library/user-event';
import { ErrorNotification, useErrorNotification } from '@/components/ErrorNotification';
import { ContextErrorHandler } from '@/lib/errors/ContextErrorHandler';

// Mock the ContextErrorHandler to avoid console warnings in tests
jest.mock('@/lib/errors/ContextErrorHandler', () => ({
  ContextErrorHandler: {
    createError: jest.fn((type, message, options = {}) => ({
      type,
      message,
      userMessage: message,
      severity: options.severity || 'medium',
      retryable: ['NETWORK_ERROR', 'API_ERROR'].includes(type),
      recoverable: !['BROWSER_UNSUPPORTED'].includes(type),
      timestamp: new Date(),
      ...options
    })),
    getRecoveryStrategy: jest.fn((type) => ({
      type: type === 'NETWORK_ERROR' ? 'retry' : 'fallback',
      description: `Strategy for ${type}`,
      ...(type === 'NETWORK_ERROR' && { maxRetries: 3 })
    })),
    attemptRecovery: jest.fn()
  }
}));

describe('ErrorNotification', () => {
  const mockError = {
    type: 'VALIDATION_FAILED' as const,
    message: 'Test error',
    userMessage: 'Please check your input and try again.',
    severity: 'low' as const,
    retryable: false,
    recoverable: true,
    timestamp: new Date()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should not render when error is null', () => {
    const { container } = render(<ErrorNotification error={null} />);
    expect(container.firstChild).toBeNull();
  });

  it('should display error with proper styling and content', () => {
    render(<ErrorNotification error={mockError} />);
    
    expect(screen.getByText('Please check your input and try again.')).toBeInTheDocument();
    expect(screen.getByText('Dismiss')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('should show severity-appropriate icon and styling', () => {
    const criticalError = {
      ...mockError,
      severity: 'critical' as const
    };
    
    render(<ErrorNotification error={criticalError} />);
    
    // Check that the alert role exists
    expect(screen.getByRole('alert')).toBeInTheDocument();
    
    // Check for critical severity styling on the alert container
    const alertContainer = screen.getByRole('alert');
    expect(alertContainer).toHaveClass('bg-red-50', 'border-red-200', 'text-red-900');
  });

  it('should call onDismiss when dismiss button is clicked', async () => {
    const user = userEvent.setup();
    const onDismiss = jest.fn();
    
    render(<ErrorNotification error={mockError} onDismiss={onDismiss} />);
    
    await user.click(screen.getByText('Dismiss'));
    
    // Should call onDismiss after animation delay
    await waitFor(() => expect(onDismiss).toHaveBeenCalled(), { timeout: 300 });
  });

  it('should call onDismiss when close (×) button is clicked', async () => {
    const user = userEvent.setup();
    const onDismiss = jest.fn();
    
    render(<ErrorNotification error={mockError} onDismiss={onDismiss} />);
    
    await user.click(screen.getByLabelText('Close notification'));
    
    await waitFor(() => expect(onDismiss).toHaveBeenCalled(), { timeout: 300 });
  });

  it('should auto-dismiss after specified time', async () => {
    jest.useFakeTimers();
    const onDismiss = jest.fn();
    
    render(<ErrorNotification error={mockError} onDismiss={onDismiss} autoDismissMs={1000} />);
    
    // Fast-forward time
    jest.advanceTimersByTime(1200);
    
    await waitFor(() => expect(onDismiss).toHaveBeenCalled(), { timeout: 100 });
    
    jest.useRealTimers();
  });


  it('should not auto-dismiss when autoDismissMs is 0', () => {
    const onDismiss = jest.fn();
    
    render(<ErrorNotification error={mockError} onDismiss={onDismiss} autoDismissMs={0} />);
    
    // Should not auto-dismiss
    expect(onDismiss).not.toHaveBeenCalled();
  });

  it('should show retry button for retryable errors', () => {
    const retryableError = {
      ...mockError,
      type: 'NETWORK_ERROR' as const,
      retryable: true
    };
    const onRetry = jest.fn();
    
    render(<ErrorNotification error={retryableError} onRetry={onRetry} />);
    
    expect(screen.getByText('Try Again')).toBeInTheDocument();
  });

  it('should not show retry button for non-retryable errors', () => {
    render(<ErrorNotification error={mockError} />);
    
    expect(screen.queryByText('Try Again')).not.toBeInTheDocument();
  });

  it('should call onRetry when retry button is clicked', async () => {
    const user = userEvent.setup();
    const retryableError = {
      ...mockError,
      type: 'NETWORK_ERROR' as const,
      retryable: true
    };
    const onRetry = jest.fn();
    
    render(<ErrorNotification error={retryableError} onRetry={onRetry} />);
    
    await user.click(screen.getByText('Try Again'));
    
    expect(onRetry).toHaveBeenCalled();
  });

  it('should show technical details in development mode', () => {
    const errorWithDetails = {
      ...mockError,
      code: 'VAL001',
      context: { field: 'test' },
      originalError: new Error('Original error message')
    };
    
    render(<ErrorNotification error={errorWithDetails} showTechnicalDetails={true} />);
    
    expect(screen.getByText('Technical Details')).toBeInTheDocument();
  });

  it('should not show technical details in production mode', () => {
    const errorWithDetails = {
      ...mockError,
      code: 'VAL001',
      context: { field: 'test' }
    };
    
    render(<ErrorNotification error={errorWithDetails} showTechnicalDetails={false} />);
    
    expect(screen.queryByText('Technical Details')).not.toBeInTheDocument();
  });

  it('should show recovery strategy hint for recoverable errors', () => {
    const recoverableError = {
      ...mockError,
      recoverable: true
    };
    
    render(<ErrorNotification error={recoverableError} />);
    
    expect(screen.getByText('Strategy for VALIDATION_FAILED')).toBeInTheDocument();
  });
});

describe('useErrorNotification hook', () => {
  const mockError = {
    type: 'VALIDATION_FAILED' as const,
    message: 'Test error',
    userMessage: 'Please check your input and try again.',
    severity: 'low' as const,
    retryable: false,
    recoverable: true,
    timestamp: new Date()
  };

  const TestComponent = () => {
    const { currentError, showError, dismissError, retryOperation } = useErrorNotification();
    
    return (
      <div>
        <button onClick={() => showError(mockError)}>Show Error</button>
        <button onClick={() => dismissError()}>Dismiss Error</button>
        <button onClick={() => retryOperation(async () => {})}>Retry</button>
        {currentError && <div data-testid="current-error">{currentError.message}</div>}
      </div>
    );
  };

  it('should manage error state correctly', async () => {
    const user = userEvent.setup();
    render(<TestComponent />);
    
    // Initially no error
    expect(screen.queryByTestId('current-error')).not.toBeInTheDocument();
    
    // Show error
    await user.click(screen.getByText('Show Error'));
    expect(screen.getByTestId('current-error')).toHaveTextContent('Test error');
    
    // Dismiss error
    await user.click(screen.getByText('Dismiss Error'));
    expect(screen.queryByTestId('current-error')).not.toBeInTheDocument();
  });

  it('should handle retry operations', async () => {
    const user = userEvent.setup();
    render(<TestComponent />);
    
    await user.click(screen.getByText('Show Error'));
    expect(screen.getByTestId('current-error')).toBeInTheDocument();
    
    await user.click(screen.getByText('Retry'));
    
    // Error should be dismissed after successful retry
    expect(screen.queryByTestId('current-error')).not.toBeInTheDocument();
  });
});