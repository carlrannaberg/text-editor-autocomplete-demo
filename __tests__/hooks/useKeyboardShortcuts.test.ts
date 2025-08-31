// __tests__/hooks/useKeyboardShortcuts.test.ts

import { renderHook, act } from '@testing-library/react';
import { useKeyboardShortcuts, useEscapeKey, useFocusManagement } from '@/lib/hooks/useKeyboardShortcuts';
import type { KeyboardShortcut } from '@/lib/hooks/useKeyboardShortcuts';

// Mock navigator.platform for cross-platform testing
const originalNavigator = global.navigator;

describe('useKeyboardShortcuts', () => {
  beforeEach(() => {
    // Reset navigator for each test
    Object.defineProperty(global, 'navigator', {
      value: { platform: 'Win32' }, // Default to Windows for consistent testing
      writable: true
    });
  });

  afterEach(() => {
    // Restore original navigator
    Object.defineProperty(global, 'navigator', {
      value: originalNavigator,
      writable: true
    });
  });

  it('should register keyboard shortcuts and trigger handlers', () => {
    const mockHandler = jest.fn();
    const shortcuts: KeyboardShortcut[] = [
      {
        key: 'ctrl+shift+c',
        description: 'Test shortcut',
        handler: mockHandler
      }
    ];

    renderHook(() => useKeyboardShortcuts(shortcuts));

    // Simulate keyboard event with proper target
    const event = new KeyboardEvent('keydown', {
      key: 'c',
      ctrlKey: true,
      shiftKey: true,
      bubbles: true
    });
    
    // Set target to document.body to avoid null issues
    Object.defineProperty(event, 'target', {
      value: document.body,
      writable: false
    });

    act(() => {
      document.dispatchEvent(event);
    });

    expect(mockHandler).toHaveBeenCalledTimes(1);
  });

  it('should handle ctrl+shift+c shortcut', () => {
    const mockHandler = jest.fn();
    const shortcuts: KeyboardShortcut[] = [
      {
        key: 'ctrl+shift+c',
        description: 'Test shortcut',
        handler: mockHandler
      }
    ];

    renderHook(() => useKeyboardShortcuts(shortcuts));

    // Simulate Ctrl+Shift+C
    const event = new KeyboardEvent('keydown', {
      key: 'c',
      ctrlKey: true,
      shiftKey: true,
      bubbles: true
    });

    // Set target to document.body to avoid null issues
    Object.defineProperty(event, 'target', {
      value: document.body,
      writable: false
    });

    act(() => {
      document.dispatchEvent(event);
    });

    expect(mockHandler).toHaveBeenCalledTimes(1);
  });

  it('should ignore shortcuts when disabled', () => {
    const mockHandler = jest.fn();
    const shortcuts: KeyboardShortcut[] = [
      {
        key: 'ctrl+shift+c',
        description: 'Test shortcut',
        handler: mockHandler,
        enabled: false
      }
    ];

    renderHook(() => useKeyboardShortcuts(shortcuts));

    const event = new KeyboardEvent('keydown', {
      key: 'c',
      ctrlKey: true,
      shiftKey: true,
      bubbles: true
    });

    // Set target to document.body to avoid null issues
    Object.defineProperty(event, 'target', {
      value: document.body,
      writable: false
    });

    act(() => {
      document.dispatchEvent(event);
    });

    expect(mockHandler).not.toHaveBeenCalled();
  });

  it('should ignore shortcuts when focused on input elements', () => {
    const mockHandler = jest.fn();
    const shortcuts: KeyboardShortcut[] = [
      {
        key: 'ctrl+shift+c',
        description: 'Test shortcut',
        handler: mockHandler
      }
    ];

    renderHook(() => useKeyboardShortcuts(shortcuts));

    // Create and focus an input element
    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();

    const event = new KeyboardEvent('keydown', {
      key: 'c',
      ctrlKey: true,
      shiftKey: true,
      bubbles: true
    });
    
    Object.defineProperty(event, 'target', {
      value: input,
      writable: false
    });

    act(() => {
      document.dispatchEvent(event);
    });

    expect(mockHandler).not.toHaveBeenCalled();

    // Cleanup
    document.body.removeChild(input);
  });

  it('should allow shortcuts on elements with data-allow-shortcuts', () => {
    const mockHandler = jest.fn();
    const shortcuts: KeyboardShortcut[] = [
      {
        key: 'ctrl+shift+c',
        description: 'Test shortcut',
        handler: mockHandler
      }
    ];

    renderHook(() => useKeyboardShortcuts(shortcuts));

    // Create and focus an input element with allow shortcuts attribute
    const input = document.createElement('input');
    input.setAttribute('data-allow-shortcuts', 'true');
    document.body.appendChild(input);
    input.focus();

    const event = new KeyboardEvent('keydown', {
      key: 'c',
      ctrlKey: true,
      shiftKey: true,
      bubbles: true
    });
    
    Object.defineProperty(event, 'target', {
      value: input,
      writable: false
    });

    act(() => {
      document.dispatchEvent(event);
    });

    expect(mockHandler).toHaveBeenCalledTimes(1);

    // Cleanup
    document.body.removeChild(input);
  });

  it('should provide correct display keys', () => {
    const { result } = renderHook(() => 
      useKeyboardShortcuts([], { enabled: false })
    );

    // Test basic key display
    const displayKey = result.current.getDisplayKey('ctrl+shift+c');
    expect(displayKey).toContain('Ctrl');
    expect(displayKey).toContain('Shift');
    expect(displayKey).toContain('C');
  });
});

describe('useEscapeKey', () => {
  it('should call handler when Escape key is pressed', () => {
    const mockHandler = jest.fn();

    renderHook(() => useEscapeKey(mockHandler));

    const event = new KeyboardEvent('keydown', {
      key: 'Escape',
      bubbles: true
    });

    act(() => {
      document.dispatchEvent(event);
    });

    expect(mockHandler).toHaveBeenCalledTimes(1);
  });

  it('should not call handler when disabled', () => {
    const mockHandler = jest.fn();

    renderHook(() => useEscapeKey(mockHandler, false));

    const event = new KeyboardEvent('keydown', {
      key: 'Escape',
      bubbles: true
    });

    act(() => {
      document.dispatchEvent(event);
    });

    expect(mockHandler).not.toHaveBeenCalled();
  });
});

describe('useFocusManagement', () => {
  it('should focus element when expanded changes from false to true', () => {
    const focusTarget = document.createElement('textarea');
    focusTarget.value = 'test content';
    document.body.appendChild(focusTarget);

    const focusTargetRef = { current: focusTarget };
    const mockFocus = jest.spyOn(focusTarget, 'focus');
    const mockSetSelectionRange = jest.spyOn(focusTarget, 'setSelectionRange');

    const { rerender } = renderHook(
      ({ isExpanded }) => useFocusManagement(isExpanded, focusTargetRef),
      { initialProps: { isExpanded: false } }
    );

    // Expand the panel
    act(() => {
      rerender({ isExpanded: true });
    });

    // Wait for the timeout in the hook
    setTimeout(() => {
      expect(mockFocus).toHaveBeenCalled();
      expect(mockSetSelectionRange).toHaveBeenCalledWith(12, 12); // length of 'test content'
    }, 150);

    // Cleanup
    document.body.removeChild(focusTarget);
    mockFocus.mockRestore();
    mockSetSelectionRange.mockRestore();
  });

  it('should not focus when element is not available', () => {
    const focusTargetRef = { current: null };

    const { rerender } = renderHook(
      ({ isExpanded }) => useFocusManagement(isExpanded, focusTargetRef),
      { initialProps: { isExpanded: false } }
    );

    // Should not throw when element is null
    expect(() => {
      rerender({ isExpanded: true });
    }).not.toThrow();
  });
});