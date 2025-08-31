// lib/hooks/useAccessibility.ts
'use client';

import React, { useEffect, useRef, useCallback, useState } from 'react';

/**
 * WCAG 2.1 AA Compliance Hook
 * Provides comprehensive accessibility features including:
 * - Live regions for screen reader announcements
 * - Focus management and keyboard traps
 * - Reduced motion detection
 * - High contrast mode support
 * - ARIA attribute management
 */

// Live region types for different announcement urgency levels
export type LiveRegionType = 'polite' | 'assertive' | 'off';

// Focus trap options
export interface FocusTrapOptions {
  /** Whether the focus trap is active */
  enabled: boolean;
  /** Element to focus when trap activates */
  initialFocus?: HTMLElement;
  /** Element to return focus to when trap deactivates */
  returnFocus?: HTMLElement;
  /** Whether to include tabbable elements only */
  tabbableOnly?: boolean;
}

// Accessibility preferences
export interface AccessibilityPreferences {
  /** User prefers reduced motion */
  prefersReducedMotion: boolean;
  /** User prefers high contrast */
  prefersHighContrast: boolean;
  /** User prefers dark mode */
  prefersDarkMode: boolean;
  /** Current font scale factor */
  fontScale: number;
}

/**
 * Hook for managing live regions and screen reader announcements
 * Enhanced with token warning announcements and better timing
 */
export function useLiveRegion() {
  const liveRegionRef = useRef<HTMLDivElement | null>(null);
  const statusRegionRef = useRef<HTMLDivElement | null>(null);
  const alertRegionRef = useRef<HTMLDivElement | null>(null);
  const lastAnnouncementRef = useRef<string>('');
  const lastAnnouncementTimeRef = useRef<number>(0);

  // Ensure live regions exist in the DOM
  useEffect(() => {
    // Create polite live region if it doesn't exist
    if (!liveRegionRef.current) {
      liveRegionRef.current = document.getElementById('live-region-polite') as HTMLDivElement;
      if (!liveRegionRef.current) {
        liveRegionRef.current = document.createElement('div');
        liveRegionRef.current.id = 'live-region-polite';
        liveRegionRef.current.setAttribute('aria-live', 'polite');
        liveRegionRef.current.setAttribute('aria-atomic', 'true');
        liveRegionRef.current.className = 'sr-only';
        document.body.appendChild(liveRegionRef.current);
      }
    }

    // Create status region
    if (!statusRegionRef.current) {
      statusRegionRef.current = document.getElementById('live-region-status') as HTMLDivElement;
      if (!statusRegionRef.current) {
        statusRegionRef.current = document.createElement('div');
        statusRegionRef.current.id = 'live-region-status';
        statusRegionRef.current.setAttribute('role', 'status');
        statusRegionRef.current.setAttribute('aria-live', 'polite');
        statusRegionRef.current.className = 'sr-only';
        document.body.appendChild(statusRegionRef.current);
      }
    }

    // Create alert region for urgent announcements
    if (!alertRegionRef.current) {
      alertRegionRef.current = document.getElementById('live-region-alert') as HTMLDivElement;
      if (!alertRegionRef.current) {
        alertRegionRef.current = document.createElement('div');
        alertRegionRef.current.id = 'live-region-alert';
        alertRegionRef.current.setAttribute('role', 'alert');
        alertRegionRef.current.setAttribute('aria-live', 'assertive');
        alertRegionRef.current.className = 'sr-only';
        document.body.appendChild(alertRegionRef.current);
      }
    }

    return () => {
      // Cleanup on unmount
      [liveRegionRef.current, statusRegionRef.current, alertRegionRef.current].forEach(region => {
        if (region && region.parentNode) {
          region.parentNode.removeChild(region);
        }
      });
    };
  }, []);

  const announce = useCallback((message: string, type: LiveRegionType = 'polite') => {
    if (!message.trim()) return;

    // Prevent duplicate announcements within 1 second
    const now = Date.now();
    const timeSinceLastAnnouncement = now - lastAnnouncementTimeRef.current;
    if (lastAnnouncementRef.current === message && timeSinceLastAnnouncement < 1000) {
      return;
    }

    let targetRegion: HTMLDivElement | null = null;
    
    switch (type) {
      case 'assertive':
        targetRegion = alertRegionRef.current;
        break;
      case 'polite':
        targetRegion = liveRegionRef.current;
        break;
      case 'off':
        return; // Don't announce anything
    }

    if (targetRegion) {
      // Clear and set new message
      targetRegion.textContent = '';
      // Small delay to ensure screen readers notice the change
      setTimeout(() => {
        if (targetRegion) {
          targetRegion.textContent = message;
          lastAnnouncementRef.current = message;
          lastAnnouncementTimeRef.current = now;
        }
      }, 50);
    }
  }, []);

  const announceStatus = useCallback((message: string) => {
    if (!message.trim() || !statusRegionRef.current) return;
    
    statusRegionRef.current.textContent = '';
    setTimeout(() => {
      if (statusRegionRef.current) {
        statusRegionRef.current.textContent = message;
      }
    }, 50);
  }, []);

  const announceAlert = useCallback((message: string) => {
    announce(message, 'assertive');
  }, [announce]);

  const announceTokenWarning = useCallback((tokenCount: number, warningLevel: string, maxTokens: number) => {
    const percentage = Math.round((tokenCount / maxTokens) * 100);
    let message = '';
    
    switch (warningLevel) {
      case 'warning':
        message = `Token usage at ${percentage}% - approaching limit`;
        break;
      case 'danger':
        message = `Token usage at ${percentage}% - nearing maximum`;
        break;
      case 'error':
        message = `Token limit exceeded at ${percentage}% - reduce content`;
        break;
      default:
        return; // No announcement for normal levels
    }
    
    announce(message, warningLevel === 'error' ? 'assertive' : 'polite');
  }, [announce]);

  const announceContextChange = useCallback((field: string, value: string) => {
    if (value.trim()) {
      announceStatus(`${field} updated`);
    } else {
      announceStatus(`${field} cleared`);
    }
  }, [announceStatus]);

  return {
    announce,
    announceStatus,
    announceAlert,
    announceTokenWarning,
    announceContextChange,
    liveRegionRef,
    statusRegionRef,
    alertRegionRef
  };
}

/**
 * Hook for managing focus traps in modal dialogs
 * Enhanced with better element detection and escape key handling
 */
export function useFocusTrap(options: FocusTrapOptions) {
  const containerRef = useRef<HTMLElement | null>(null);
  const previousActiveElementRef = useRef<HTMLElement | null>(null);

  const getFocusableElements = useCallback((container: HTMLElement): HTMLElement[] => {
    const selector = options.tabbableOnly 
      ? 'button:not([disabled]), [href]:not([tabindex="-1"]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]):not([disabled]), details:not([disabled]), summary:not(:disabled)'
      : 'button, [href], input, select, textarea, [tabindex], details, summary, [contenteditable]';
    
    return Array.from(container.querySelectorAll(selector))
      .filter(el => {
        const element = el as HTMLElement;
        const isFormElement = element as HTMLInputElement | HTMLButtonElement | HTMLSelectElement | HTMLTextAreaElement;
        
        // Check if element is visible and not disabled
        const isVisible = element.offsetParent !== null && 
                         element.offsetWidth > 0 && 
                         element.offsetHeight > 0 &&
                         window.getComputedStyle(element).visibility !== 'hidden';
        
        const isDisabled = isFormElement.disabled;
        const hasNegativeTabIndex = element.tabIndex === -1;
        
        return isVisible && !isDisabled && !hasNegativeTabIndex;
      }) as HTMLElement[];
  }, [options.tabbableOnly]);

  const trapFocus = useCallback((event: KeyboardEvent) => {
    if (!options.enabled || !containerRef.current) return;

    if (event.key === 'Tab') {
      const focusableElements = getFocusableElements(containerRef.current);
      
      if (focusableElements.length === 0) return;
      
      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      const currentElement = document.activeElement as HTMLElement;

      if (event.shiftKey) {
        // Shift + Tab - going backwards
        if (currentElement === firstElement || !focusableElements.includes(currentElement)) {
          event.preventDefault();
          lastElement?.focus();
        }
      } else {
        // Tab - going forwards
        if (currentElement === lastElement || !focusableElements.includes(currentElement)) {
          event.preventDefault();
          firstElement?.focus();
        }
      }
    }
  }, [options.enabled, getFocusableElements]);

  const activateTrap = useCallback((container: HTMLElement) => {
    containerRef.current = container;
    previousActiveElementRef.current = document.activeElement as HTMLElement;

    // Focus initial element or first focusable element
    const focusTarget = options.initialFocus || getFocusableElements(container)[0];
    if (focusTarget) {
      focusTarget.focus();
    }

    document.addEventListener('keydown', trapFocus);
  }, [trapFocus, getFocusableElements, options.initialFocus]);

  const deactivateTrap = useCallback(() => {
    document.removeEventListener('keydown', trapFocus);
    
    // Return focus to previous element
    if (options.returnFocus || previousActiveElementRef.current) {
      const returnTarget = options.returnFocus || previousActiveElementRef.current;
      returnTarget?.focus();
    }

    containerRef.current = null;
    previousActiveElementRef.current = null;
  }, [trapFocus, options.returnFocus]);

  useEffect(() => {
    return () => {
      // Cleanup on unmount
      document.removeEventListener('keydown', trapFocus);
    };
  }, [trapFocus]);

  return {
    activateTrap,
    deactivateTrap,
    containerRef
  };
}

/**
 * Hook for detecting accessibility preferences
 */
export function useAccessibilityPreferences(): AccessibilityPreferences {
  const [preferences, setPreferences] = useState<AccessibilityPreferences>({
    prefersReducedMotion: false,
    prefersHighContrast: false,
    prefersDarkMode: false,
    fontScale: 1
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const updatePreferences = () => {
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const prefersHighContrast = window.matchMedia('(prefers-contrast: high)').matches;
      const prefersDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
      
      // Font scale detection (approximate based on default 16px)
      const testElement = document.createElement('div');
      testElement.style.cssText = 'position: absolute; visibility: hidden; font-size: 1rem; padding: 0; margin: 0; border: 0;';
      testElement.textContent = 'M';
      document.body.appendChild(testElement);
      const fontSize = window.getComputedStyle(testElement).fontSize;
      const fontScale = parseFloat(fontSize) / 16;
      document.body.removeChild(testElement);

      setPreferences({
        prefersReducedMotion,
        prefersHighContrast,
        prefersDarkMode,
        fontScale
      });
    };

    // Initial check
    updatePreferences();

    // Listen for changes
    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const highContrastQuery = window.matchMedia('(prefers-contrast: high)');
    const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleChange = () => updatePreferences();

    reducedMotionQuery.addEventListener('change', handleChange);
    highContrastQuery.addEventListener('change', handleChange);
    darkModeQuery.addEventListener('change', handleChange);

    return () => {
      reducedMotionQuery.removeEventListener('change', handleChange);
      highContrastQuery.removeEventListener('change', handleChange);
      darkModeQuery.removeEventListener('change', handleChange);
    };
  }, []);

  return preferences;
}

/**
 * Hook for managing ARIA attributes dynamically
 */
export function useAriaAttributes() {
  const generateUniqueId = useCallback((prefix: string = 'aria'): string => {
    return `${prefix}-${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  const createAriaRelationship = useCallback((
    sourceElement: HTMLElement,
    targetElement: HTMLElement,
    relationship: 'describedby' | 'labelledby' | 'controls' | 'owns'
  ) => {
    if (!targetElement.id) {
      targetElement.id = generateUniqueId(`${relationship}-target`);
    }

    const currentValue = sourceElement.getAttribute(`aria-${relationship}`) || '';
    const ids = currentValue ? currentValue.split(' ') : [];
    
    if (!ids.includes(targetElement.id)) {
      ids.push(targetElement.id);
      sourceElement.setAttribute(`aria-${relationship}`, ids.join(' '));
    }

    return () => {
      const currentIds = sourceElement.getAttribute(`aria-${relationship}`)?.split(' ') || [];
      const filteredIds = currentIds.filter(id => id !== targetElement.id);
      
      if (filteredIds.length > 0) {
        sourceElement.setAttribute(`aria-${relationship}`, filteredIds.join(' '));
      } else {
        sourceElement.removeAttribute(`aria-${relationship}`);
      }
    };
  }, [generateUniqueId]);

  return {
    generateUniqueId,
    createAriaRelationship
  };
}

/**
 * Hook for announcing form validation errors
 */
export function useFormAnnouncements() {
  const { announceAlert, announceStatus } = useLiveRegion();

  const announceFieldError = useCallback((fieldName: string, errorMessage: string) => {
    announceAlert(`Error in ${fieldName}: ${errorMessage}`);
  }, [announceAlert]);

  const announceFormSubmission = useCallback((success: boolean, message?: string) => {
    if (success) {
      announceStatus(message || 'Form submitted successfully');
    } else {
      announceAlert(message || 'Form submission failed. Please check for errors and try again.');
    }
  }, [announceStatus, announceAlert]);

  const announceFieldChange = useCallback((fieldName: string, newValue: string) => {
    announceStatus(`${fieldName} changed to ${newValue}`);
  }, [announceStatus]);

  return {
    announceFieldError,
    announceFormSubmission,
    announceFieldChange
  };
}

/**
 * Hook for keyboard navigation in lists and grids
 */
export function useKeyboardNavigation(
  containerRef: React.RefObject<HTMLElement>,
  options: {
    /** Navigation mode: list (up/down) or grid (arrow keys) */
    mode: 'list' | 'grid';
    /** Whether navigation wraps around */
    wrap?: boolean;
    /** Selector for focusable items */
    itemSelector?: string;
    /** Callback when selection changes */
    onSelectionChange?: (index: number, element: HTMLElement) => void;
  }
) {
  const currentIndexRef = useRef<number>(-1);

  const getFocusableItems = useCallback((): HTMLElement[] => {
    if (!containerRef.current) return [];
    
    const selector = options.itemSelector || 
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]):not([disabled])';
    
    return Array.from(containerRef.current.querySelectorAll(selector))
      .filter(el => {
        const element = el as HTMLElement;
        const isFormElement = element as HTMLInputElement | HTMLButtonElement | HTMLSelectElement | HTMLTextAreaElement;
        return element.offsetParent !== null && !(isFormElement.disabled);
      }) as HTMLElement[];
  }, [containerRef, options.itemSelector]);

  const focusItem = useCallback((index: number) => {
    const items = getFocusableItems();
    if (index >= 0 && index < items.length) {
      items[index]?.focus();
      currentIndexRef.current = index;
      const item = items[index];
      if (item) {
        options.onSelectionChange?.(index, item);
      }
    }
  }, [getFocusableItems, options]);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!containerRef.current) return;

    const items = getFocusableItems();
    if (items.length === 0) return;

    let handled = false;
    let newIndex = currentIndexRef.current;

    if (options.mode === 'list') {
      // List navigation (up/down arrow keys)
      if (event.key === 'ArrowUp') {
        newIndex = newIndex <= 0 ? (options.wrap ? items.length - 1 : 0) : newIndex - 1;
        handled = true;
      } else if (event.key === 'ArrowDown') {
        newIndex = newIndex >= items.length - 1 ? (options.wrap ? 0 : items.length - 1) : newIndex + 1;
        handled = true;
      }
    } else if (options.mode === 'grid') {
      // Grid navigation (all arrow keys)
      // This is a simplified grid - assumes single column for now
      if (event.key === 'ArrowUp') {
        newIndex = newIndex <= 0 ? (options.wrap ? items.length - 1 : 0) : newIndex - 1;
        handled = true;
      } else if (event.key === 'ArrowDown') {
        newIndex = newIndex >= items.length - 1 ? (options.wrap ? 0 : items.length - 1) : newIndex + 1;
        handled = true;
      }
    }

    // Home/End keys
    if (event.key === 'Home') {
      newIndex = 0;
      handled = true;
    } else if (event.key === 'End') {
      newIndex = items.length - 1;
      handled = true;
    }

    if (handled) {
      event.preventDefault();
      event.stopPropagation();
      focusItem(newIndex);
    }
  }, [containerRef, getFocusableItems, focusItem, options]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('keydown', handleKeyDown);
    return () => {
      container.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown, containerRef]);

  return {
    focusItem,
    getCurrentIndex: () => currentIndexRef.current,
    getFocusableItems
  };
}

/**
 * Hook for implementing accessible modals with focus traps
 * Enhanced with body scroll lock and better focus management
 */
export function useAccessibleModal(isOpen: boolean, options?: {
  onClose?: () => void;
  returnFocusTo?: HTMLElement;
}) {
  const modalRef = useRef<HTMLDivElement | null>(null);
  const previousBodyOverflowRef = useRef<string>('');
  const { activateTrap, deactivateTrap } = useFocusTrap({
    enabled: isOpen,
    ...(options?.returnFocusTo && { returnFocus: options.returnFocusTo })
  });
  const { announceStatus } = useLiveRegion();

  useEffect(() => {
    if (isOpen && modalRef.current) {
      // Store current body overflow
      previousBodyOverflowRef.current = document.body.style.overflow;
      
      // Announce modal opening
      announceStatus('Dialog opened');
      
      // Activate focus trap
      activateTrap(modalRef.current);
      
      // Prevent body scroll
      document.body.style.overflow = 'hidden';
      
      // Handle escape key globally
      const handleEscape = (event: KeyboardEvent) => {
        if (event.key === 'Escape') {
          event.preventDefault();
          options?.onClose?.();
        }
      };
      
      document.addEventListener('keydown', handleEscape);
      
      return () => {
        // Cleanup
        deactivateTrap();
        document.body.style.overflow = previousBodyOverflowRef.current;
        document.removeEventListener('keydown', handleEscape);
        announceStatus('Dialog closed');
      };
    }
    
    // Return empty cleanup function for when modal is not open
    return () => {};
  }, [isOpen, activateTrap, deactivateTrap, announceStatus, options]);

  const handleBackdropClick = useCallback((event: React.MouseEvent) => {
    if (event.target === event.currentTarget) {
      // Only close if clicked on backdrop, not content
      options?.onClose?.();
    }
  }, [options]);

  return {
    modalRef,
    handleBackdropClick,
    ariaProps: {
      role: 'dialog' as const,
      'aria-modal': true as const,
      'aria-hidden': !isOpen
    },
    isActive: isOpen
  };
}

/**
 * Hook for color contrast validation and enhancement
 */
export function useColorContrast() {
  const validateContrast = useCallback((
    foreground: string,
    background: string,
    level: 'AA' | 'AAA' = 'AA'
  ): { ratio: number; passes: boolean } => {
    // Simple RGB color extraction (works for hex colors)
    const hexToRgb = (hex: string) => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result && result[1] && result[2] && result[3] ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      } : null;
    };

    const getLuminance = (r: number, g: number, b: number) => {
      const [rs, gs, bs] = [r, g, b].map(c => {
        const normalized = c / 255;
        return normalized <= 0.03928 ? normalized / 12.92 : Math.pow((normalized + 0.055) / 1.055, 2.4);
      });
      
      // Type guard to ensure we have valid numbers
      if (rs === undefined || gs === undefined || bs === undefined) {
        return 0;
      }
      
      return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
    };

    const fg = hexToRgb(foreground);
    const bg = hexToRgb(background);
    
    if (!fg || !bg) {
      return { ratio: 1, passes: false };
    }

    const fgLuminance = getLuminance(fg.r, fg.g, fg.b);
    const bgLuminance = getLuminance(bg.r, bg.g, bg.b);
    
    const ratio = (Math.max(fgLuminance, bgLuminance) + 0.05) / (Math.min(fgLuminance, bgLuminance) + 0.05);
    
    const minRatio = level === 'AAA' ? 7 : 4.5;
    const passes = ratio >= minRatio;

    return { ratio, passes };
  }, []);

  return {
    validateContrast
  };
}

/**
 * Hook for managing skip links
 */
export function useSkipLinks() {
  const addSkipLink = useCallback((target: string, label: string) => {
    const skipLink = document.createElement('a');
    skipLink.href = `#${target}`;
    skipLink.textContent = label;
    skipLink.className = 'sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white focus:rounded focus:font-medium';
    
    // Insert at beginning of body
    document.body.insertBefore(skipLink, document.body.firstChild);
    
    return () => {
      if (skipLink.parentNode) {
        skipLink.parentNode.removeChild(skipLink);
      }
    };
  }, []);

  return {
    addSkipLink
  };
}

/**
 * Hook for managing high contrast mode detection and styling
 */
export function useHighContrastMode() {
  const [isHighContrast, setIsHighContrast] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const checkHighContrast = () => {
      // Check for high contrast mode preference
      const prefersHighContrast = window.matchMedia('(prefers-contrast: high)').matches;
      
      // Also check for forced-colors (Windows High Contrast Mode)
      const forcedColors = window.matchMedia('(forced-colors: active)').matches;
      
      setIsHighContrast(prefersHighContrast || forcedColors);
    };

    checkHighContrast();

    const highContrastQuery = window.matchMedia('(prefers-contrast: high)');
    const forcedColorsQuery = window.matchMedia('(forced-colors: active)');

    highContrastQuery.addEventListener('change', checkHighContrast);
    forcedColorsQuery.addEventListener('change', checkHighContrast);

    return () => {
      highContrastQuery.removeEventListener('change', checkHighContrast);
      forcedColorsQuery.removeEventListener('change', checkHighContrast);
    };
  }, []);

  return {
    isHighContrast,
    getHighContrastStyles: useCallback(() => {
      if (!isHighContrast) return {};
      
      return {
        // High contrast mode overrides
        '--focus-ring-color': 'Highlight',
        '--text-color': 'WindowText',
        '--background-color': 'Window',
        '--border-color': 'WindowText'
      } as React.CSSProperties;
    }, [isHighContrast])
  };
}

/**
 * Hook for managing target size compliance (minimum 44px)
 */
export function useTargetSize() {
  const validateTargetSize = useCallback((element: HTMLElement): boolean => {
    const rect = element.getBoundingClientRect();
    const minSize = 44; // WCAG 2.1 AA minimum target size
    
    return rect.width >= minSize && rect.height >= minSize;
  }, []);

  const enhanceTargetSize = useCallback((element: HTMLElement) => {
    const currentStyle = window.getComputedStyle(element);
    const currentWidth = parseFloat(currentStyle.width);
    const currentHeight = parseFloat(currentStyle.height);
    
    if (currentWidth < 44 || currentHeight < 44) {
      element.style.minWidth = '44px';
      element.style.minHeight = '44px';
      element.style.display = 'inline-flex';
      element.style.alignItems = 'center';
      element.style.justifyContent = 'center';
    }
  }, []);

  return {
    validateTargetSize,
    enhanceTargetSize
  };
}

/**
 * Main accessibility hook combining all features
 */
export function useAccessibility() {
  const liveRegion = useLiveRegion();
  const preferences = useAccessibilityPreferences();
  const formAnnouncements = useFormAnnouncements();
  const ariaAttributes = useAriaAttributes();
  const colorContrast = useColorContrast();
  const skipLinks = useSkipLinks();
  const highContrast = useHighContrastMode();
  const targetSize = useTargetSize();

  return {
    ...liveRegion,
    preferences,
    ...formAnnouncements,
    ...ariaAttributes,
    ...colorContrast,
    ...skipLinks,
    ...highContrast,
    ...targetSize,
    useFocusTrap,
    useAccessibleModal,
    useKeyboardNavigation
  };
}

/**
 * Utility function for accessibility enhancement
 * Returns accessibility context for components
 */
export function getAccessibilityProps() {
  return {
    // Utility functions for accessibility features
    createSkipLink: (target: string, label: string) => ({
      href: `#${target}`,
      className: 'sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white focus:rounded focus:font-medium',
      children: label
    }),
    
    createLiveRegionProps: (type: LiveRegionType = 'polite') => ({
      'aria-live': type,
      'aria-atomic': 'true',
      className: 'sr-only'
    }),
    
    createModalProps: (isOpen: boolean, titleId: string, descriptionId?: string) => ({
      role: 'dialog' as const,
      'aria-modal': true,
      'aria-labelledby': titleId,
      'aria-describedby': descriptionId,
      'aria-hidden': !isOpen
    })
  };
}