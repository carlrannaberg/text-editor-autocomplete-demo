// lib/hooks/useKeyboardShortcuts.ts

import { useEffect, useCallback, useRef } from 'react';

/**
 * Keyboard shortcut configuration
 */
export interface KeyboardShortcut {
  /** Key combination (e.g., 'ctrl+shift+c') */
  key: string;
  /** Human-readable description */
  description: string;
  /** Handler function */
  handler: () => void;
  /** Whether the shortcut is enabled */
  enabled?: boolean;
  /** Prevent default browser behavior */
  preventDefault?: boolean;
  /** Stop event propagation */
  stopPropagation?: boolean;
}

/**
 * Platform-specific modifier key detection
 */
const detectMacPlatform = (): boolean => {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return false;
  }
  return /Mac|iPod|iPhone|iPad/.test(navigator.platform || '');
};

/**
 * Normalize key combination for cross-platform compatibility
 */
const normalizeKeyCombo = (combo: string): string => {
  const isMac = detectMacPlatform();
  let normalized = combo.toLowerCase();
  
  // On Mac, map cmd to meta and leave ctrl as ctrl
  if (isMac) {
    normalized = normalized.replace(/cmd\+/g, 'meta+');
  } else {
    // On non-Mac, map cmd to ctrl
    normalized = normalized.replace(/cmd\+/g, 'ctrl+');
  }
  
  return normalized;
};

/**
 * Convert event to key combination string
 */
const eventToKeyCombo = (event: KeyboardEvent): string => {
  const parts: string[] = [];
  
  if (event.ctrlKey) parts.push('ctrl');
  if (event.altKey) parts.push('alt'); 
  if (event.shiftKey) parts.push('shift');
  if (event.metaKey) parts.push('meta');
  
  // Handle special keys
  let key = event.key.toLowerCase();
  if (key === ' ') key = 'space';
  if (key === 'escape') key = 'esc';
  if (key.startsWith('arrow')) key = key.replace('arrow', '');
  
  parts.push(key);
  return parts.join('+');
};

/**
 * Check if an element should be ignored for keyboard shortcuts
 */
const shouldIgnoreElement = (element: Element | null): boolean => {
  if (!element || !element.tagName) return false;
  
  const tagName = element.tagName.toLowerCase();
  const isEditable = element.getAttribute('contenteditable') === 'true';
  const isInput = ['input', 'textarea', 'select'].includes(tagName);
  
  // Allow shortcuts in specific cases even in input elements
  const allowShortcuts = element.hasAttribute('data-allow-shortcuts');
  
  return (isInput || isEditable) && !allowShortcuts;
};

/**
 * Custom hook for managing keyboard shortcuts
 */
export function useKeyboardShortcuts(
  shortcuts: KeyboardShortcut[],
  options: {
    /** Whether shortcuts are globally enabled */
    enabled?: boolean;
    /** Element to attach listeners to (defaults to document) */
    target?: Element | null;
  } = {}
) {
  const { enabled = true, target } = options;
  const shortcutsRef = useRef<KeyboardShortcut[]>([]);
  
  // Update shortcuts ref when shortcuts change
  useEffect(() => {
    shortcutsRef.current = shortcuts;
  }, [shortcuts]);

  const handleKeyDown = useCallback((event: Event) => {
    if (!enabled) return;
    
    const keyboardEvent = event as KeyboardEvent;
    
    // Skip if focus is in an input element (unless explicitly allowed)
    if (keyboardEvent.target && shouldIgnoreElement(keyboardEvent.target as Element | null)) {
      return;
    }
    
    const keyCombo = eventToKeyCombo(keyboardEvent);
    
    // Find matching shortcut
    const shortcut = shortcutsRef.current.find(s => {
      if (s.enabled === false) return false;
      const normalizedShortcut = normalizeKeyCombo(s.key);
      return normalizedShortcut === keyCombo;
    });
    
    if (shortcut) {
      if (shortcut.preventDefault !== false) {
        keyboardEvent.preventDefault();
      }
      if (shortcut.stopPropagation) {
        keyboardEvent.stopPropagation();
      }
      
      shortcut.handler();
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    
    const element = target || document;
    element.addEventListener('keydown', handleKeyDown);
    
    return () => {
      element.removeEventListener('keydown', handleKeyDown);
    };
  }, [enabled, target, handleKeyDown]);

  return {
    /** Register a new shortcut dynamically */
    registerShortcut: useCallback((shortcut: KeyboardShortcut) => {
      shortcutsRef.current = [...shortcutsRef.current, shortcut];
    }, []),
    
    /** Unregister a shortcut by key combination */
    unregisterShortcut: useCallback((key: string) => {
      shortcutsRef.current = shortcutsRef.current.filter(s => s.key !== key);
    }, []),
    
    /** Get display-friendly key combination */
    getDisplayKey: useCallback((key: string) => {
      const isMac = detectMacPlatform();
      
      // First normalize the key combination
      let keyToProcess = key.toLowerCase();
      
      // Handle cmd/ctrl mapping for display
      if (isMac) {
        keyToProcess = keyToProcess.replace(/cmd\+/g, 'meta+');
      } else {
        keyToProcess = keyToProcess.replace(/cmd\+/g, 'ctrl+');
      }
      
      return keyToProcess
        .split('+')
        .map(part => {
          switch (part) {
            case 'ctrl': return isMac ? '⌃' : 'Ctrl';
            case 'meta': return isMac ? '⌘' : 'Win';
            case 'alt': return isMac ? '⌥' : 'Alt';
            case 'shift': return isMac ? '⇧' : 'Shift';
            case 'esc': return 'Esc';
            case 'space': return 'Space';
            case '/': return '/';
            case '?': return '?';
            default: return part.toUpperCase();
          }
        })
        .join(isMac ? '' : '+');
    }, [])
  };
}

/**
 * Hook for managing escape key behavior
 */
export function useEscapeKey(
  handler: () => void,
  enabled: boolean = true
) {
  useEffect(() => {
    if (!enabled) return;
    
    const handleEscape = (event: Event) => {
      const keyboardEvent = event as KeyboardEvent;
      if (keyboardEvent.key === 'Escape') {
        keyboardEvent.preventDefault();
        handler();
      }
    };
    
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [handler, enabled]);
}

/**
 * Hook for focus management when expanding panels
 */
export function useFocusManagement(
  isExpanded: boolean,
  focusTargetRef: React.RefObject<HTMLElement>
) {
  const wasExpandedRef = useRef(isExpanded);
  
  useEffect(() => {
    // Focus the target element when panel expands
    if (!wasExpandedRef.current && isExpanded && focusTargetRef.current) {
      // Small delay to ensure the element is rendered and focusable
      setTimeout(() => {
        focusTargetRef.current?.focus();
        
        // Move cursor to end if it's a textarea or input
        if (focusTargetRef.current instanceof HTMLTextAreaElement || 
            focusTargetRef.current instanceof HTMLInputElement) {
          const element = focusTargetRef.current;
          const length = element.value.length;
          element.setSelectionRange(length, length);
        }
      }, 100);
    }
    
    wasExpandedRef.current = isExpanded;
  }, [isExpanded, focusTargetRef]);
}