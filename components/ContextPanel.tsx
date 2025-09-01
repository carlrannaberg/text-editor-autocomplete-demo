'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useCompletionContext } from '@/lib/context/CompletionContext';
import { useTokenMonitoring } from '@/lib/hooks/useTokenMonitoring';
import { useAccessibility } from '@/lib/hooks/useAccessibility';
import { ErrorNotification } from '@/components/ErrorNotification';
import { useContextErrorHandling } from '@/lib/hooks/useContextErrorHandling';
import { 
  getTokenCountColorClass,
  getTokenWarningMessage,
  getTokenProgress,
  getProgressBarColorClass,
  getWarningIcon,
  MAX_TOKEN_LIMIT
} from '@/lib/tokenizer';

interface ContextPanelProps {
  isCollapsed?: boolean;
  onToggleCollapse?: (collapsed: boolean) => void;
  /** Whether keyboard shortcuts are enabled (default: true) */
  keyboardShortcutsEnabled?: boolean;
}

export const ContextPanel: React.FC<ContextPanelProps> = ({
  isCollapsed = false,
  onToggleCollapse,
  keyboardShortcutsEnabled = true
}) => {
  const { 
    contextText, 
    updateContext, 
    clearContext,
    getTokenCount,
    getTokenWarningLevel,
    isWithinTokenLimit
  } = useCompletionContext();

  // Local state for controlled input
  const [localContextText, setLocalContextText] = useState(contextText);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Get token information directly from context
  const tokenCount = getTokenCount();
  const warningLevel = getTokenWarningLevel();
  const warningMessage = getTokenWarningMessage(tokenCount, warningLevel);
  const progress = getTokenProgress(tokenCount);
  const progressColor = getProgressBarColorClass(warningLevel);

  // Token monitoring for announcements
  useTokenMonitoring(tokenCount);

  // Error handling
  const { currentError, dismissError } = useContextErrorHandling();

  // Accessibility
  const accessibility = useAccessibility();

  // Sync local state with context when it changes externally
  useEffect(() => {
    setLocalContextText(contextText);
  }, [contextText]);

  // Debounced update to context
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localContextText !== contextText) {
        updateContext({ contextText: localContextText });
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [localContextText, contextText, updateContext]);

  const handleTextChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setLocalContextText(e.target.value);
  }, []);

  const handleClear = useCallback(() => {
    setLocalContextText('');
    clearContext();
    textareaRef.current?.focus();
  }, [clearContext]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!keyboardShortcutsEnabled) return;

    // Ctrl/Cmd + K to clear
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      handleClear();
    }
    
    // Escape to collapse panel
    if (e.key === 'Escape' && onToggleCollapse) {
      onToggleCollapse(true);
    }
  }, [keyboardShortcutsEnabled, handleClear, onToggleCollapse]);

  const warningIcon = getWarningIcon(warningLevel);
  const tokenColorClass = getTokenCountColorClass(warningLevel);
  const isOverLimit = !isWithinTokenLimit();

  return (
    <div 
      className="bg-white border rounded-lg shadow-sm"
      role="region"
      aria-label="Writing Context"
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 rounded-t-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <h3 className="text-sm font-medium text-gray-900">
              Writing Context
            </h3>
            {warningIcon && (
              <span className="text-sm" role="img" aria-label="warning">
                {warningIcon}
              </span>
            )}
          </div>
          
          <div className="flex items-center space-x-3">
            {/* Token Count */}
            <div className="text-xs text-gray-600">
              <span className={tokenColorClass}>
                {tokenCount.toLocaleString()}
              </span>
              <span className="text-gray-400">
                /{MAX_TOKEN_LIMIT.toLocaleString()} tokens
              </span>
            </div>

            {/* Collapse Toggle */}
            {onToggleCollapse && (
              <button
                onClick={() => onToggleCollapse(!isCollapsed)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                aria-label={isCollapsed ? 'Expand context panel' : 'Collapse context panel'}
              >
                <svg
                  className={`w-4 h-4 transition-transform ${isCollapsed ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Token Progress Bar */}
        <div className="mt-2">
          <div className="w-full bg-gray-200 rounded-full h-1.5">
            <div
              className={`h-1.5 rounded-full transition-all duration-300 ${progressColor}`}
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
        </div>

        {/* Warning Message */}
        {warningMessage && (
          <div className="mt-2 text-xs text-amber-700 bg-amber-50 px-2 py-1 rounded">
            {warningMessage}
          </div>
        )}
      </div>

      {/* Content */}
      {!isCollapsed && (
        <div className="p-4">
          {/* Error Display */}
          {currentError && (
            <div className="mb-4">
              <ErrorNotification
                error={currentError}
                onDismiss={dismissError}
              />
            </div>
          )}

          {/* Main Context Input */}
          <div className="space-y-3">
            <div>
              <label 
                htmlFor="context-text"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                What are you writing about?
              </label>
              
              <textarea
                ref={textareaRef}
                id="context-text"
                value={localContextText}
                onChange={handleTextChange}
                onKeyDown={handleKeyDown}
                placeholder="Describe what you're writing about to get better autocomplete suggestions..."
                className={`
                  w-full px-3 py-2 border rounded-md shadow-sm
                  focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                  resize-y min-h-[100px]
                  ${isOverLimit 
                    ? 'border-red-300 bg-red-50' 
                    : 'border-gray-300 bg-white'
                  }
                `}
                aria-describedby="context-help token-count"
                disabled={false}
                rows={4}
              />
              
              <div id="context-help" className="mt-1 text-xs text-gray-500">
                Provide context about your writing to improve autocomplete suggestions.
                {keyboardShortcutsEnabled && ' Press Ctrl+K to clear.'}
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-between items-center">
              <div className="text-xs text-gray-500">
                {(localContextText || '').length} characters
              </div>
              
              <button
                onClick={handleClear}
                disabled={!(localContextText || '').trim()}
                className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};