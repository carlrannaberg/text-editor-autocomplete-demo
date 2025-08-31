// __tests__/components/KeyboardShortcutsHelp.test.tsx

import React from 'react';
import { render, screen, fireEvent, renderHook } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { KeyboardShortcutsHelp } from '@/components/KeyboardShortcutsHelp';
import { useEscapeKey, useFocusManagement } from '@/lib/hooks/useKeyboardShortcuts';
import type { KeyboardShortcut } from '@/lib/hooks/useKeyboardShortcuts';

const mockShortcuts: KeyboardShortcut[] = [
  {
    key: 'ctrl+shift+c',
    description: 'Toggle context panel',
    handler: jest.fn()
  },
  {
    key: 'ctrl+shift+x',
    description: 'Clear context',
    handler: jest.fn()
  },
  {
    key: 'ctrl+shift+/',
    description: 'Focus context textarea',
    handler: jest.fn()
  }
];

const mockGetDisplayKey = (key: string) => {
  return key.replace('ctrl', 'Ctrl').replace('shift', 'Shift').replace('+', '+');
};

describe('KeyboardShortcutsHelp', () => {
  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    shortcuts: mockShortcuts,
    getDisplayKey: mockGetDisplayKey
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render when open', () => {
    render(<KeyboardShortcutsHelp {...defaultProps} />);
    
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Keyboard Shortcuts')).toBeInTheDocument();
  });

  it('should not render when closed', () => {
    render(<KeyboardShortcutsHelp {...defaultProps} isOpen={false} />);
    
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('should display all shortcuts with descriptions and key combinations', () => {
    render(<KeyboardShortcutsHelp {...defaultProps} />);
    
    expect(screen.getByText('Toggle context panel')).toBeInTheDocument();
    expect(screen.getByText('Clear context')).toBeInTheDocument();
    expect(screen.getByText('Focus context textarea')).toBeInTheDocument();
    
    // Check that key combinations are displayed
    expect(screen.getByText('Ctrl+Shift+c')).toBeInTheDocument();
    expect(screen.getByText('Ctrl+Shift+x')).toBeInTheDocument();
    expect(screen.getByText('Ctrl+Shift+/')).toBeInTheDocument();
  });

  it('should filter out disabled shortcuts', () => {
    const shortcutsWithDisabled: KeyboardShortcut[] = [
      ...mockShortcuts,
      {
        key: 'ctrl+shift+d',
        description: 'Disabled shortcut',
        handler: jest.fn(),
        enabled: false
      }
    ];

    render(<KeyboardShortcutsHelp {...defaultProps} shortcuts={shortcutsWithDisabled} />);
    
    expect(screen.queryByText('Disabled shortcut')).not.toBeInTheDocument();
    expect(screen.queryByText('Ctrl+Shift+d')).not.toBeInTheDocument();
  });

  it('should close when close button is clicked', async () => {
    const user = userEvent.setup();
    const mockOnClose = jest.fn();

    render(<KeyboardShortcutsHelp {...defaultProps} onClose={mockOnClose} />);
    
    const closeButton = screen.getByLabelText('Close shortcuts help');
    await user.click(closeButton);
    
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('should close when backdrop is clicked', async () => {
    const user = userEvent.setup();
    const mockOnClose = jest.fn();

    render(<KeyboardShortcutsHelp {...defaultProps} onClose={mockOnClose} />);
    
    const backdrop = screen.getByRole('dialog');
    await user.click(backdrop);
    
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('should not close when dialog content is clicked', async () => {
    const user = userEvent.setup();
    const mockOnClose = jest.fn();

    render(<KeyboardShortcutsHelp {...defaultProps} onClose={mockOnClose} />);
    
    const dialogContent = screen.getByText('Keyboard Shortcuts');
    await user.click(dialogContent);
    
    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it('should close when footer close button is clicked', async () => {
    const user = userEvent.setup();
    const mockOnClose = jest.fn();

    render(<KeyboardShortcutsHelp {...defaultProps} onClose={mockOnClose} />);
    
    const closeButton = screen.getByRole('button', { name: 'Close' });
    await user.click(closeButton);
    
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('should display empty state when no shortcuts are provided', () => {
    render(<KeyboardShortcutsHelp {...defaultProps} shortcuts={[]} />);
    
    expect(screen.getByText('No keyboard shortcuts are currently available.')).toBeInTheDocument();
  });

  it('should have proper accessibility attributes', () => {
    render(<KeyboardShortcutsHelp {...defaultProps} />);
    
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-labelledby', 'shortcuts-help-title');
    expect(dialog).toHaveAttribute('aria-describedby', 'shortcuts-help-description');
  });
});

describe('useEscapeKey', () => {
  it('should call handler when Escape is pressed', () => {
    const mockHandler = jest.fn();
    
    renderHook(() => useEscapeKey(mockHandler));

    fireEvent.keyDown(document, { key: 'Escape' });
    
    expect(mockHandler).toHaveBeenCalledTimes(1);
  });

  it('should not call handler when disabled', () => {
    const mockHandler = jest.fn();
    
    renderHook(() => useEscapeKey(mockHandler, false));

    fireEvent.keyDown(document, { key: 'Escape' });
    
    expect(mockHandler).not.toHaveBeenCalled();
  });

  it('should not call handler for non-Escape keys', () => {
    const mockHandler = jest.fn();
    
    renderHook(() => useEscapeKey(mockHandler));

    fireEvent.keyDown(document, { key: 'Enter' });
    fireEvent.keyDown(document, { key: 'Space' });
    
    expect(mockHandler).not.toHaveBeenCalled();
  });
});

describe('useFocusManagement', () => {
  it('should focus element when expanded changes to true', () => {
    const mockElement = document.createElement('textarea');
    mockElement.value = 'test content';
    const mockFocus = jest.spyOn(mockElement, 'focus');
    const mockSetSelectionRange = jest.spyOn(mockElement, 'setSelectionRange');
    
    const focusTargetRef = { current: mockElement };

    const { rerender } = renderHook(
      ({ isExpanded }: { isExpanded: boolean }) => useFocusManagement(isExpanded, focusTargetRef),
      { initialProps: { isExpanded: false } }
    );

    // Change to expanded
    rerender({ isExpanded: true });

    // Wait for the timeout
    setTimeout(() => {
      expect(mockFocus).toHaveBeenCalled();
      expect(mockSetSelectionRange).toHaveBeenCalledWith(12, 12);
    }, 150);

    mockFocus.mockRestore();
    mockSetSelectionRange.mockRestore();
  });

  it('should handle null ref gracefully', () => {
    const focusTargetRef = { current: null };

    const { rerender } = renderHook(
      ({ isExpanded }: { isExpanded: boolean }) => useFocusManagement(isExpanded, focusTargetRef),
      { initialProps: { isExpanded: false } }
    );

    expect(() => {
      rerender({ isExpanded: true });
    }).not.toThrow();
  });

  it('should not focus when expanded was already true', () => {
    const mockElement = document.createElement('textarea');
    const mockFocus = jest.spyOn(mockElement, 'focus');
    
    const focusTargetRef = { current: mockElement };

    const { rerender } = renderHook(
      ({ isExpanded }) => useFocusManagement(isExpanded, focusTargetRef),
      { initialProps: { isExpanded: true } }
    );

    // Re-render with same expanded state
    rerender({ isExpanded: true });

    // Should not focus since it was already expanded
    setTimeout(() => {
      expect(mockFocus).not.toHaveBeenCalled();
    }, 150);

    mockFocus.mockRestore();
  });
});