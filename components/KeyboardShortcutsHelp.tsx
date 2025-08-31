'use client';

import React from 'react';
import type { KeyboardShortcut } from '@/lib/hooks/useKeyboardShortcuts';

interface KeyboardShortcutsHelpProps {
  /** Whether the help dialog is visible */
  isOpen: boolean;
  /** Function to close the dialog */
  onClose: () => void;
  /** Array of shortcuts to display */
  shortcuts: KeyboardShortcut[];
  /** Function to get display-friendly key combinations */
  getDisplayKey: (key: string) => string;
}

interface ShortcutRowProps {
  shortcut: KeyboardShortcut;
  displayKey: string;
}

const ShortcutRow: React.FC<ShortcutRowProps> = ({ shortcut, displayKey }) => (
  <div className="flex items-center justify-between py-2 px-3 hover:bg-gray-50 rounded">
    <span className="text-sm text-gray-700">{shortcut.description}</span>
    <kbd className="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-xs font-mono text-gray-800 shadow-sm">
      {displayKey}
    </kbd>
  </div>
);

export const KeyboardShortcutsHelp: React.FC<KeyboardShortcutsHelpProps> = ({
  isOpen,
  onClose,
  shortcuts,
  getDisplayKey
}) => {
  if (!isOpen) return null;

  // Filter out disabled shortcuts
  const enabledShortcuts = shortcuts.filter(s => s.enabled !== false);

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="shortcuts-help-title"
      aria-describedby="shortcuts-help-description"
    >
      <div 
        className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[80vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 id="shortcuts-help-title" className="text-lg font-semibold text-gray-900">
            Keyboard Shortcuts
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded p-1"
            aria-label="Close shortcuts help"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          <p id="shortcuts-help-description" className="text-sm text-gray-600 mb-4">
            Use these keyboard shortcuts to quickly navigate and control the editor.
          </p>
          
          {enabledShortcuts.length > 0 ? (
            <div className="space-y-1 max-h-60 overflow-y-auto">
              {enabledShortcuts.map((shortcut, index) => (
                <ShortcutRow
                  key={`${shortcut.key}-${index}`}
                  shortcut={shortcut}
                  displayKey={getDisplayKey(shortcut.key)}
                />
              ))}
            </div>
          ) : (
            <div className="text-center text-gray-500 py-8">
              <p>No keyboard shortcuts are currently available.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>Press Esc to close this dialog</span>
            <button
              onClick={onClose}
              className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};