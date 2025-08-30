'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { useCompletionContext } from '@/lib/context/CompletionContext';
import type { ContextError } from '@/lib/types';

interface ContextPanelProps {
  isCollapsed?: boolean;
  onToggleCollapse?: (collapsed: boolean) => void;
}

// Structured error handling for UI components
const handleUIError = (error: ContextError) => {
  if (process.env.NODE_ENV === 'development') {
    console.warn(`UI ${error.type}:`, error.message);
  }
  // In production, UI errors are silent
};

export const ContextPanel: React.FC<ContextPanelProps> = ({
  isCollapsed = false,
  onToggleCollapse
}) => {
  const { contextText, updateContext, clearContext, getTokenCount } = useCompletionContext();
  const [localCollapsed, setLocalCollapsed] = useState(isCollapsed);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  
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
      const contextError: ContextError = {
        type: 'STORAGE_ERROR',
        message: 'Failed to load collapse state from localStorage',
        operation: 'load'
      };
      
      handleUIError(contextError);
    }
  }, [onToggleCollapse]);

  const handleToggleCollapse = useCallback(() => {
    const newCollapsed = !localCollapsed;
    setLocalCollapsed(newCollapsed);
    onToggleCollapse?.(newCollapsed);
    
    // Persist collapse state
    try {
      localStorage.setItem('context-panel-collapsed', JSON.stringify(newCollapsed));
    } catch (error) {
      console.warn('Failed to save collapse state:', error);
    }
  }, [localCollapsed, onToggleCollapse]);

  const handleTextChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    updateContext({ contextText: newText });
  }, [updateContext]);

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

  const tokenCount = getTokenCount();

  return (
    <>
      <div className="context-panel border border-gray-200 rounded-lg mb-4 bg-white shadow-sm">
        <div className="flex items-center justify-between p-3 border-b border-gray-200 bg-gray-50">
          <h3 className="text-sm font-medium text-gray-700">Document Context</h3>
          <div className="flex items-center gap-3">
            <span 
              className="text-xs text-gray-500"
              aria-live="polite"
              aria-label={`Token count: ${tokenCount}`}
            >
              {tokenCount} tokens
            </span>
            <button
              onClick={handleClearClick}
              disabled={!contextText || !contextText.trim()}
              className="text-xs text-gray-500 hover:text-red-600 transition-colors disabled:text-gray-400 disabled:hover:text-gray-400 disabled:cursor-not-allowed"
              title={contextText && contextText.trim() ? 'Clear context' : 'No context to clear'}
              aria-label="Clear context"
            >
              Clear
            </button>
            <button
              onClick={handleToggleCollapse}
              className="text-xs text-gray-500 hover:text-gray-700 transition-colors p-1 -m-1"
              title={localCollapsed ? 'Expand panel' : 'Collapse panel'}
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
          <div className="p-3">
            <textarea
              value={contextText || ''}
              onChange={handleTextChange}
              placeholder="Describe your document context (optional)..."
              className="w-full min-h-[80px] max-h-[200px] p-3 border border-gray-300 rounded-md resize-vertical focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
              rows={3}
              aria-label="Document context input"
              aria-describedby="context-help context-token-count"
            />
            <div id="context-help" className="text-xs text-gray-500 mt-2">
              Provide additional context to help the AI understand your writing goals.
              This information stays private and is not saved on our servers.
            </div>
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
          onClick={handleCancelClear}
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
                onClick={handleCancelClear}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
                autoFocus
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmClear}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};