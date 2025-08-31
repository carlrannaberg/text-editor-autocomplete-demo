'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useCompletionContext } from '@/lib/context/CompletionContext';
import type { DocumentType, Language, Tone, CompletionContextState } from '@/lib/types';
import { useTokenMonitoring } from '@/lib/hooks/useTokenMonitoring';
import { useAccessibility } from '@/lib/hooks/useAccessibility';
import { ContextErrorHandler, type ContextError } from '@/lib/errors/ContextErrorHandler';
import { ErrorNotification, useErrorNotification } from '@/components/ErrorNotification';
import { ContextValidator, useDebouncedValidation, type ValidationResult } from '@/lib/validation/contextValidation';
import { 
  useKeyboardShortcuts, 
  useEscapeKey, 
  useFocusManagement,
  type KeyboardShortcut 
} from '@/lib/hooks/useKeyboardShortcuts';
import { KeyboardShortcutsHelp } from '@/components/KeyboardShortcutsHelp';
import { AccessibleKeywordsInput } from '@/components/AccessibleKeywordsInput';
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


// Enhanced error handling for UI components
const handleUIError = (error: ContextError, showError?: (error: ContextError) => void) => {
  if (process.env.NODE_ENV === 'development') {
    console.warn(`UI ${error.type}:`, error.message);
  }
  // Show error notification to user (if not in test environment)
  if (showError && process.env.NODE_ENV !== 'test') {
    showError(error);
  }
};


export const ContextPanel: React.FC<ContextPanelProps> = ({
  isCollapsed = false,
  onToggleCollapse,
  keyboardShortcutsEnabled = true
}) => {
  const { 
    contextText, 
    documentType, 
    language, 
    tone, 
    audience, 
    keywords,
    updateContext, 
    clearContext, 
    getTokenCount,
    getTokenWarningLevel,
    isWithinTokenLimit
  } = useCompletionContext();
  const [localCollapsed, setLocalCollapsed] = useState(isCollapsed);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);
  
  // Error handling
  const { currentError, showError, dismissError, retryOperation } = useErrorNotification();
  
  // Track failed operations for retry functionality
  type FailedOperation = 
    | { type: 'storage-save'; data: { key: string; value: string } }
    | { type: 'storage-load'; data: { key: string } }
    | { type: 'context-update'; data: Partial<CompletionContextState> }
    | { type: 'validation'; data: CompletionContextState };
  
  const [lastFailedOperation, setLastFailedOperation] = useState<FailedOperation | null>(null);
  
  // Real-time validation
  const currentContext: CompletionContextState = {
    contextText: contextText || '',
    audience: audience || '',
    keywords: keywords || [],
    ...(documentType && { documentType }),
    ...(language && { language }),
    ...(tone && { tone })
  };
  const { validation, isValidating } = useDebouncedValidation(currentContext, 300);
  
  // Refs for focus management
  const contextTextareaRef = useRef<HTMLTextAreaElement>(null);
  const clearButtonRef = useRef<HTMLButtonElement>(null);
  const confirmClearButtonRef = useRef<HTMLButtonElement>(null);
  
  // Accessibility features
  const { 
    announceStatus, 
    announceAlert,
    announceContextChange,
    announceTokenWarning,
    generateUniqueId,
    preferences,
    getHighContrastStyles
  } = useAccessibility();
  
  // Generate unique IDs for accessibility
  const panelId = useRef(generateUniqueId('context-panel')).current;
  const tokenStatusId = useRef(generateUniqueId('token-status')).current;
  const contextTextId = useRef(generateUniqueId('context-text')).current;
  const warningBannerId = useRef(generateUniqueId('warning-banner')).current;
  
  // Load collapse state from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('context-panel-collapsed');
      if (stored) {
        const collapsed = JSON.parse(stored);
        setLocalCollapsed(collapsed);
        onToggleCollapse?.(collapsed);
      }
    } catch (error) {
      setLastFailedOperation({ type: 'storage-load', data: { key: 'context-panel-collapsed' } });
      const contextError = ContextErrorHandler.handleStorageError('load', error as Error);
      handleUIError(contextError, showError);
    }
  }, [onToggleCollapse, showError]);

  const handleToggleCollapse = useCallback(() => {
    const newCollapsed = !localCollapsed;
    setLocalCollapsed(newCollapsed);
    onToggleCollapse?.(newCollapsed);
    
    // Persist collapse state
    try {
      localStorage.setItem('context-panel-collapsed', JSON.stringify(newCollapsed));
    } catch (error) {
      setLastFailedOperation({ type: 'storage-save', data: { key: 'context-panel-collapsed', value: JSON.stringify(newCollapsed) } });
      const contextError = ContextErrorHandler.handleStorageError('save', error as Error);
      handleUIError(contextError, showError);
    }
  }, [localCollapsed, onToggleCollapse, showError]);

  // Keyboard shortcut handlers
  const handleTogglePanel = useCallback(() => {
    handleToggleCollapse();
  }, [handleToggleCollapse]);

  const handleClearContextShortcut = useCallback(() => {
    if (contextText && contextText.trim()) {
      setShowConfirmDialog(true);
      // Focus the confirm button after a brief delay
      setTimeout(() => {
        confirmClearButtonRef.current?.focus();
      }, 100);
    }
  }, [contextText]);

  const handleFocusContext = useCallback(() => {
    if (localCollapsed) {
      // Expand panel first, then focus will be handled by useFocusManagement
      setLocalCollapsed(false);
      onToggleCollapse?.(false);
      try {
        localStorage.setItem('context-panel-collapsed', JSON.stringify(false));
      } catch (error) {
        setLastFailedOperation({ type: 'storage-save', data: { key: 'context-panel-collapsed', value: 'false' } });
        const contextError = ContextErrorHandler.handleStorageError('save', error as Error);
        handleUIError(contextError, showError);
      }
    } else {
      // Panel is already expanded, just focus the textarea
      contextTextareaRef.current?.focus();
      // Move cursor to end
      if (contextTextareaRef.current) {
        const length = contextTextareaRef.current.value.length;
        contextTextareaRef.current.setSelectionRange(length, length);
      }
    }
  }, [localCollapsed, onToggleCollapse, showError]);

  const handleShowKeyboardHelp = useCallback(() => {
    setShowKeyboardHelp(true);
  }, []);

  const handleCloseKeyboardHelp = useCallback(() => {
    setShowKeyboardHelp(false);
  }, []);

  const handleCloseConfirmDialog = useCallback(() => {
    setShowConfirmDialog(false);
  }, []);

  // Define keyboard shortcuts
  const shortcuts: KeyboardShortcut[] = [
    {
      key: 'ctrl+shift+c',
      description: 'Toggle context panel',
      handler: handleTogglePanel,
      enabled: keyboardShortcutsEnabled
    },
    {
      key: 'ctrl+shift+x',
      description: 'Clear context',
      handler: handleClearContextShortcut,
      enabled: keyboardShortcutsEnabled && !!(contextText && contextText.trim())
    },
    {
      key: 'ctrl+shift+/',
      description: 'Focus context textarea',
      handler: handleFocusContext,
      enabled: keyboardShortcutsEnabled
    },
    {
      key: 'ctrl+shift+?',
      description: 'Show keyboard shortcuts help',
      handler: handleShowKeyboardHelp,
      enabled: keyboardShortcutsEnabled
    }
  ];

  // Setup keyboard shortcuts
  const { getDisplayKey } = useKeyboardShortcuts(shortcuts, {
    enabled: keyboardShortcutsEnabled
  });

  // Handle escape key for dialogs
  useEscapeKey(() => {
    if (showConfirmDialog) {
      setShowConfirmDialog(false);
    } else if (showKeyboardHelp) {
      setShowKeyboardHelp(false);
    } else if (document.activeElement instanceof HTMLElement && 
               (document.activeElement.tagName === 'TEXTAREA' || 
                document.activeElement.tagName === 'INPUT')) {
      // Blur focused input elements
      document.activeElement.blur();
    }
  }, keyboardShortcutsEnabled);

  // Focus management for panel expansion
  useFocusManagement(!localCollapsed, contextTextareaRef);

  const handleTextChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    const previousText = contextText || '';
    
    // Validate text length and content
    try {
      updateContext({ contextText: newText });
      
      // Announce significant changes (debounced)
      if (Math.abs(newText.length - previousText.length) > 50) {
        announceContextChange('Context text', newText);
      }
    } catch (error) {
      setLastFailedOperation({ type: 'context-update', data: { contextText: newText } });
      const contextError = ContextErrorHandler.handleValidationError('contextText', newText, 'input validation');
      handleUIError(contextError, showError);
    }
  }, [updateContext, contextText, announceContextChange, showError]);

  const handleClearClick = useCallback(() => {
    if (contextText && contextText.trim()) {
      setShowConfirmDialog(true);
    }
  }, [contextText]);

  const handleConfirmClear = useCallback(() => {
    clearContext();
    setShowConfirmDialog(false);
  }, [clearContext]);

  const handleCancelClear = useCallback(() => {
    setShowConfirmDialog(false);
  }, []);

  const handleDocumentTypeChange = useCallback((type: DocumentType) => {
    updateContext({ documentType: type });
    announceContextChange('Document type', type || 'none');
  }, [updateContext, announceContextChange]);

  const handleLanguageChange = useCallback((lang: Language) => {
    updateContext({ language: lang });
    announceContextChange('Language', lang || 'none');
  }, [updateContext, announceContextChange]);

  const handleToneChange = useCallback((toneValue: Tone) => {
    updateContext({ tone: toneValue });
    announceContextChange('Tone', toneValue || 'none');
  }, [updateContext, announceContextChange]);

  const handleAudienceChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    
    // Validate audience length
    const validationErrors = ContextValidator.validateField('audience', newValue, {
      maxLength: 64
    });
    
    if (validationErrors.length > 0) {
      setLastFailedOperation({ type: 'context-update', data: { audience: newValue } });
      const contextError = ContextErrorHandler.handleValidationError('audience', newValue, validationErrors[0]?.rule || 'validation failed');
      handleUIError(contextError, showError);
      return; // Don't update if validation fails
    }
    
    updateContext({ audience: newValue });
    // Only announce when field is completed or cleared
    if (newValue.trim() === '' || newValue.length > 10) {
      announceContextChange('Target audience', newValue || 'cleared');
    }
  }, [updateContext, announceContextChange, showError]);

  const handleKeywordsChange = useCallback((newKeywords: string[]) => {
    const prevCount = keywords?.length || 0;
    const newCount = newKeywords.length;
    
    // Validate keywords
    const validationErrors = ContextValidator.validateField('keywords', newKeywords, {
      customValidator: (value) => {
        const keywords = value as string[];
        return keywords.length <= 10 && keywords.every(k => k.length <= 32);
      },
      customMessage: 'Keywords must not exceed 10 items with max 32 characters each'
    });
    
    if (validationErrors.length > 0) {
      setLastFailedOperation({ type: 'context-update', data: { keywords: newKeywords } });
      const contextError = ContextErrorHandler.handleValidationError('keywords', newKeywords, validationErrors[0]?.rule || 'validation failed');
      handleUIError(contextError, showError);
      return; // Don't update if validation fails
    }
    
    updateContext({ keywords: newKeywords });
    
    if (newCount !== prevCount) {
      if (newCount > prevCount) {
        announceStatus(`Added keyword. ${newCount} keywords total.`);
      } else {
        announceStatus(`Removed keyword. ${newCount} keywords remaining.`);
      }
    }
  }, [updateContext, keywords, announceStatus, showError]);

  const tokenCount = getTokenCount();
  const warningLevel = getTokenWarningLevel();
  const withinLimit = isWithinTokenLimit();
  const tokenProgress = getTokenProgress(tokenCount);
  const tokenColorClass = getTokenCountColorClass(warningLevel);
  const progressBarColorClass = getProgressBarColorClass(warningLevel);
  const warningMessage = getTokenWarningMessage(tokenCount, warningLevel);
  const warningIcon = getWarningIcon(warningLevel);
  
  // Enhanced token monitoring with screen reader announcements
  useTokenMonitoring(tokenCount);
  
  // Announce token warnings when they change
  const prevWarningLevelRef = useRef(warningLevel);
  useEffect(() => {
    if (prevWarningLevelRef.current !== warningLevel && warningLevel !== 'safe') {
      announceTokenWarning(tokenCount, warningLevel, MAX_TOKEN_LIMIT);
    }
    prevWarningLevelRef.current = warningLevel;
  }, [warningLevel, tokenCount, announceTokenWarning]);
  
  // High contrast styles
  const highContrastStyles = getHighContrastStyles();

  return (
    <>
      <div 
        id={panelId}
        className="context-panel border border-gray-200 rounded-lg mb-4 bg-white shadow-sm"
        style={highContrastStyles}
        role="region"
        aria-labelledby={`${panelId}-heading`}
        aria-describedby={tokenStatusId}
      >
        <div className="flex items-center justify-between p-3 border-b border-gray-200 bg-gray-50">
          <h3 
            id={`${panelId}-heading`}
            className="text-sm font-medium text-gray-700"
          >
            Document Context
          </h3>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              {warningIcon && (
                <span 
                  className="text-sm"
                  aria-label={`Warning level: ${warningLevel}`}
                  title={warningMessage || 'Token usage warning'}
                >
                  {warningIcon}
                </span>
              )}
              <div className="flex flex-col items-end">
                <span 
                  id={tokenStatusId}
                  className={`text-xs font-medium ${tokenColorClass}`}
                  aria-live="polite"
                  aria-atomic="true"
                  aria-label={`Token count: ${tokenCount.toLocaleString()} of ${MAX_TOKEN_LIMIT.toLocaleString()}`}
                >
                  {tokenCount.toLocaleString()} / {MAX_TOKEN_LIMIT.toLocaleString()}
                </span>
                {/* Progress bar with accessibility */}
                <div 
                  className="w-16 h-1.5 bg-gray-200 rounded-full mt-1 overflow-hidden"
                  role="progressbar"
                  aria-valuenow={Math.round(tokenProgress)}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`Token usage: ${tokenProgress.toFixed(1)}% of maximum`}
                  aria-describedby={warningMessage ? warningBannerId : undefined}
                >
                  <div 
                    className={`h-full transition-all duration-300 ${progressBarColorClass}`}
                    style={{ 
                      width: `${tokenProgress}%`,
                      ...(preferences.prefersReducedMotion && { transition: 'none' })
                    }}
                  />
                </div>
              </div>
            </div>
            <button
              ref={clearButtonRef}
              onClick={handleClearClick}
              disabled={!contextText || !contextText.trim()}
              className="text-xs text-gray-500 hover:text-red-600 transition-colors disabled:text-gray-400 disabled:hover:text-gray-400 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1 min-h-[44px] px-3 py-2 flex items-center justify-center rounded-md"
              title={
                contextText && contextText.trim() 
                  ? `Clear context (${getDisplayKey('ctrl+shift+x')})` 
                  : 'No context to clear'
              }
              aria-label="Clear context"
            >
              Clear
            </button>
            <button
              onClick={handleShowKeyboardHelp}
              className="text-xs text-gray-500 hover:text-blue-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 min-h-[44px] px-3 py-2 flex items-center justify-center rounded-md"
              title={`Show keyboard shortcuts (${getDisplayKey('ctrl+shift+?')})`}
              aria-label="Show keyboard shortcuts help"
            >
              <span className="text-sm">?</span>
            </button>
            <button
              onClick={handleToggleCollapse}
              className="text-xs text-gray-500 hover:text-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-1 min-h-[44px] px-3 py-2 flex items-center justify-center rounded-md"
              title={
                localCollapsed 
                  ? `Expand panel (${getDisplayKey('ctrl+shift+c')})` 
                  : `Collapse panel (${getDisplayKey('ctrl+shift+c')})`
              }
              aria-label={localCollapsed ? 'Expand panel' : 'Collapse panel'}
              aria-expanded={!localCollapsed}
            >
              <span className="inline-block transform transition-transform duration-200" style={{
                transform: localCollapsed ? 'rotate(0deg)' : 'rotate(180deg)'
              }}>
                ↓
              </span>
            </button>
          </div>
        </div>
        
        {!localCollapsed && (
          <div className="p-4 space-y-4">
            {/* Warning message banner */}
            {warningMessage && (
              <div 
                id={warningBannerId}
                className={`p-3 rounded-md border ${
                  warningLevel === 'error' 
                    ? 'bg-red-50 border-red-200 text-red-800' 
                    : warningLevel === 'danger'
                    ? 'bg-red-50 border-red-200 text-red-700'
                    : 'bg-yellow-50 border-yellow-200 text-yellow-800'
                }`}
                role={warningLevel === 'error' ? 'alert' : 'status'}
                aria-live={warningLevel === 'error' ? 'assertive' : 'polite'}
                aria-atomic="true"
                style={highContrastStyles}
              >
                <div className="flex items-start gap-2">
                  {warningIcon && (
                    <span 
                      className="text-sm mt-0.5 flex-shrink-0"
                      aria-hidden="true"
                    >
                      {warningIcon}
                    </span>
                  )}
                  <div className="text-sm">
                    <p className="font-medium mb-1">Token Usage Warning</p>
                    <p>{warningMessage}</p>
                    {warningLevel === 'error' && (
                      <p className="mt-2 text-xs">
                        Context cannot be submitted until token count is reduced below {MAX_TOKEN_LIMIT.toLocaleString()}.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
            
            {/* Context textarea */}
            <div>
              <label htmlFor={contextTextId} className="block text-sm font-medium text-gray-700 mb-2">
                Additional Context
                <span className="text-xs text-gray-500 ml-2">
                  ({getDisplayKey('ctrl+shift+/')} to focus)
                </span>
                {validation.errors.some(e => e.field === 'contextText') && (
                  <span className="text-xs text-red-600 ml-2">⚠ {validation.errors.find(e => e.field === 'contextText')?.message}</span>
                )}
              </label>
              <textarea
                ref={contextTextareaRef}
                id={contextTextId}
                value={contextText || ''}
                onChange={handleTextChange}
                placeholder="Describe your document context (optional)..."
                className="w-full min-h-[80px] max-h-[200px] p-3 border border-gray-300 rounded-md resize-vertical focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
                style={{
                  ...highContrastStyles,
                  ...(preferences.prefersReducedMotion && { transition: 'none' })
                }}
                rows={3}
                aria-describedby={`${contextTextId}-help ${tokenStatusId}`}
                aria-invalid={!withinLimit || validation.errors.some(e => e.field === 'contextText')}
                aria-required="false"
                data-allow-shortcuts="true"
                autoComplete="off"
                spellCheck="true"
              />
              <div id={`${contextTextId}-help`} className="text-xs text-gray-500 mt-2">
                Provide additional context to help the AI understand your writing goals.
                This information stays private and is not saved on our servers.
                {isValidating && <span className="ml-2 text-blue-600">Validating...</span>}
              </div>
            </div>

            {/* Structured hints section */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Document Type Selector */}
              <div>
                <label htmlFor="document-type" className="block text-sm font-medium text-gray-700 mb-1">
                  Document Type
                </label>
                <select
                  id="document-type"
                  value={documentType || ''}
                  onChange={(e) => handleDocumentTypeChange(e.target.value as DocumentType)}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors min-h-[44px]"
                  style={{
                    ...highContrastStyles,
                    ...(preferences.prefersReducedMotion && { transition: 'none' })
                  }}
                  aria-describedby="document-type-help"
                >
                  <option value="">Select type...</option>
                  <option value="email">Email</option>
                  <option value="article">Article</option>
                  <option value="note">Note</option>
                  <option value="other">Other</option>
                </select>
                <div id="document-type-help" className="text-xs text-gray-500 mt-1">
                  Choose the type of document you&apos;re writing
                </div>
              </div>

              {/* Language Selector */}
              <div>
                <label htmlFor="language" className="block text-sm font-medium text-gray-700 mb-1">
                  Language
                </label>
                <select
                  id="language"
                  value={language || ''}
                  onChange={(e) => handleLanguageChange(e.target.value as Language)}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors min-h-[44px]"
                  style={{
                    ...highContrastStyles,
                    ...(preferences.prefersReducedMotion && { transition: 'none' })
                  }}
                  aria-describedby="language-help"
                >
                  <option value="">Select language...</option>
                  <option value="en">English</option>
                  <option value="es">Spanish</option>
                  <option value="fr">French</option>
                  <option value="de">German</option>
                </select>
                <div id="language-help" className="text-xs text-gray-500 mt-1">
                  Primary language for suggestions
                </div>
              </div>

              {/* Tone Selector */}
              <div>
                <label htmlFor="tone" className="block text-sm font-medium text-gray-700 mb-1">
                  Tone
                </label>
                <select
                  id="tone"
                  value={tone || ''}
                  onChange={(e) => handleToneChange(e.target.value as Tone)}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors min-h-[44px]"
                  style={{
                    ...highContrastStyles,
                    ...(preferences.prefersReducedMotion && { transition: 'none' })
                  }}
                  aria-describedby="tone-help"
                >
                  <option value="">Select tone...</option>
                  <option value="neutral">Neutral</option>
                  <option value="formal">Formal</option>
                  <option value="casual">Casual</option>
                  <option value="persuasive">Persuasive</option>
                </select>
                <div id="tone-help" className="text-xs text-gray-500 mt-1">
                  Desired writing tone
                </div>
              </div>

              {/* Audience Input */}
              <div>
                <label htmlFor="audience" className="block text-sm font-medium text-gray-700 mb-1">
                  Target Audience
                </label>
                <input
                  id="audience"
                  type="text"
                  value={audience || ''}
                  onChange={handleAudienceChange}
                  placeholder="e.g., developers, clients..."
                  maxLength={64}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors min-h-[44px]"
                  style={{
                    ...highContrastStyles,
                    ...(preferences.prefersReducedMotion && { transition: 'none' })
                  }}
                  aria-describedby="audience-help"
                  autoComplete="off"
                  spellCheck="true"
                />
                <div id="audience-help" className="text-xs text-gray-500 mt-1">
                  Who you&apos;re writing for (max 64 chars)
                  {validation.errors.some(e => e.field === 'audience') && (
                    <div className="text-red-600 mt-1">⚠ {validation.errors.find(e => e.field === 'audience')?.message}</div>
                  )}
                </div>
              </div>
            </div>

            {/* Keywords Section */}
            <AccessibleKeywordsInput
              keywords={keywords || []}
              onChange={handleKeywordsChange}
              maxKeywords={10}
              maxLength={32}
              aria-label="Document keywords for AI completion context"
              aria-describedby="context-token-count"
            />
            
            <div id="context-token-count" className="sr-only">
              Current token count: {tokenCount}
            </div>
          </div>
        )}
      </div>

      {/* Confirmation Dialog */}
      {showConfirmDialog && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={handleCloseConfirmDialog}
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-clear-title"
          aria-describedby="confirm-clear-description"
        >
          <div 
            className="bg-white rounded-lg p-6 max-w-sm mx-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h4 id="confirm-clear-title" className="text-lg font-semibold text-gray-900 mb-2">
              Clear Context
            </h4>
            <p id="confirm-clear-description" className="text-gray-600 mb-6">
              Are you sure you want to clear all context data? This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={handleCloseConfirmDialog}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 rounded min-h-[44px] flex items-center justify-center"
                autoFocus
              >
                Cancel
              </button>
              <button
                ref={confirmClearButtonRef}
                onClick={handleConfirmClear}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded hover:bg-red-700 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 min-h-[44px] flex items-center justify-center"
              >
                Clear
              </button>
            </div>
            <div className="text-xs text-gray-500 mt-3 text-center">
              Press Esc to cancel
            </div>
          </div>
        </div>
      )}

      {/* Keyboard Shortcuts Help Dialog */}
      <KeyboardShortcutsHelp
        isOpen={showKeyboardHelp}
        onClose={handleCloseKeyboardHelp}
        shortcuts={shortcuts}
        getDisplayKey={getDisplayKey}
      />
      
      {/* Error Notification */}
      <ErrorNotification
        error={currentError}
        onDismiss={dismissError}
        onRetry={() => retryOperation(async () => {
          if (!lastFailedOperation) {
            throw new Error('No operation to retry');
          }
          
          switch (lastFailedOperation.type) {
            case 'storage-save':
              // Retry storage save operation
              localStorage.setItem(lastFailedOperation.data.key, lastFailedOperation.data.value);
              break;
            case 'storage-load':
              // Retry storage load operation
              const stored = localStorage.getItem(lastFailedOperation.data.key);
              if (stored && lastFailedOperation.data.key === 'context-panel-collapsed') {
                const collapsed = JSON.parse(stored);
                setLocalCollapsed(collapsed);
                onToggleCollapse?.(collapsed);
              }
              break;
            case 'context-update':
              // Retry context update
              updateContext(lastFailedOperation.data);
              break;
            case 'validation':
              // Re-run validation
              const result = ContextValidator.validateContext(lastFailedOperation.data);
              if (!result.isValid) {
                throw new Error(`Validation still failing: ${result.errors[0]?.message || 'Unknown error'}`);
              }
              break;
            default:
              throw new Error('Unknown operation type');
          }
          
          // Clear the failed operation on successful retry
          setLastFailedOperation(null);
        })}
        autoDismissMs={5000}
        showTechnicalDetails={process.env.NODE_ENV === 'development'}
      />
    </>
  );
};