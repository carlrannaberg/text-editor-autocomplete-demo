import React from 'react';
import { render, screen, fireEvent, waitFor, setupMockLocalStorage } from '../utils/test-helpers';
import userEvent from '@testing-library/user-event';
import { ContextPanel } from '@/components/ContextPanel';

// Set up centralized localStorage mock
const mockLocalStorage = setupMockLocalStorage();

const renderContextPanel = (props = {}) => {
  return render(<ContextPanel {...props} />);
};

describe('ContextPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders with default state', () => {
    renderContextPanel();
    
    expect(screen.getByText('Document Context')).toBeInTheDocument();
    expect(screen.getByText(/\d+ tokens/)).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Describe your document context (optional)...')).toBeInTheDocument();
    expect(screen.getByText('Clear')).toBeInTheDocument();
  });

  it('updates token count when text changes', async () => {
    const user = userEvent.setup();
    renderContextPanel();
    
    const textarea = screen.getByRole('textbox', { name: /document context input/i });
    const initialTokenText = screen.getByText(/\d+ tokens/);
    const initialTokenCount = parseInt(initialTokenText.textContent?.match(/\d+/)?.[0] || '0');
    
    await user.type(textarea, 'This is a test context');
    
    // Token count should increase
    const newTokenText = screen.getByText(/\d+ tokens/);
    const newTokenCount = parseInt(newTokenText.textContent?.match(/\d+/)?.[0] || '0');
    
    expect(newTokenCount).toBeGreaterThan(initialTokenCount);
  });

  it('handles collapse/expand functionality', async () => {
    const user = userEvent.setup();
    renderContextPanel();
    
    const collapseButton = screen.getByRole('button', { name: /collapse panel/i });
    const textarea = screen.getByRole('textbox');
    
    // Initially expanded
    expect(textarea).toBeVisible();
    
    // Click to collapse
    await user.click(collapseButton);
    
    // Textarea should be hidden
    expect(textarea).not.toBeVisible();
    expect(screen.getByRole('button', { name: /expand panel/i })).toBeInTheDocument();
  });

  it('persists collapse state to localStorage', async () => {
    const user = userEvent.setup();
    renderContextPanel();
    
    const collapseButton = screen.getByRole('button', { name: /collapse panel/i });
    await user.click(collapseButton);
    
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
      'context-panel-collapsed',
      'true'
    );
  });

  it('shows confirmation dialog when clearing non-empty context', async () => {
    const user = userEvent.setup();
    renderContextPanel();
    
    const textarea = screen.getByRole('textbox');
    const clearButton = screen.getByRole('button', { name: /clear context/i });
    
    // Add some text
    await user.type(textarea, 'Some context');
    
    // Click clear button
    await user.click(clearButton);
    
    // Confirmation dialog should appear
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Clear Context')).toBeInTheDocument();
    expect(screen.getByText(/Are you sure you want to clear all context data/)).toBeInTheDocument();
  });

  it('clears context when confirmed', async () => {
    const user = userEvent.setup();
    renderContextPanel();
    
    const textarea = screen.getByRole('textbox');
    const clearButton = screen.getByRole('button', { name: /clear context/i });
    
    // Add some text
    await user.type(textarea, 'Some context');
    expect(textarea).toHaveValue('Some context');
    
    // Click clear and confirm
    await user.click(clearButton);
    const confirmButton = screen.getByRole('button', { name: 'Clear' });
    await user.click(confirmButton);
    
    // Context should be cleared
    expect(textarea).toHaveValue('');
    // Token count should be back to default (empty context still has some tokens from structure)
    expect(screen.getByText(/\d+ tokens/)).toBeInTheDocument();
  });

  it('cancels clear operation', async () => {
    const user = userEvent.setup();
    renderContextPanel();
    
    const textarea = screen.getByRole('textbox');
    const clearButton = screen.getByRole('button', { name: /clear context/i });
    
    // Add some text
    await user.type(textarea, 'Some context');
    
    // Click clear and cancel
    await user.click(clearButton);
    const cancelButton = screen.getByRole('button', { name: 'Cancel' });
    await user.click(cancelButton);
    
    // Context should remain
    expect(textarea).toHaveValue('Some context');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('disables clear button when context is empty', () => {
    renderContextPanel();
    
    const clearButton = screen.getByRole('button', { name: /clear context/i });
    expect(clearButton).toBeDisabled();
  });

  it('has proper accessibility attributes', () => {
    renderContextPanel();
    
    const textarea = screen.getByRole('textbox');
    expect(textarea).toHaveAttribute('aria-label', 'Document context input');
    expect(textarea).toHaveAttribute('aria-describedby', 'context-help context-token-count');
    
    const tokenCount = screen.getByText(/\d+ tokens/);
    expect(tokenCount).toHaveAttribute('aria-live', 'polite');
    
    const collapseButton = screen.getByRole('button', { name: /collapse panel/i });
    expect(collapseButton).toHaveAttribute('aria-expanded', 'true');
  });

  it('calls onToggleCollapse callback when provided', async () => {
    const user = userEvent.setup();
    const onToggleCollapse = jest.fn();
    
    renderContextPanel({ onToggleCollapse });
    
    const collapseButton = screen.getByRole('button', { name: /collapse panel/i });
    await user.click(collapseButton);
    
    expect(onToggleCollapse).toHaveBeenCalledWith(true);
  });

  it('loads initial collapse state from localStorage', async () => {
    mockLocalStorage.getItem.mockReturnValue('true');
    
    renderContextPanel();
    
    // Panel should be collapsed initially (need to wait for useEffect)
    await waitFor(() => {
      const collapseButton = screen.getByRole('button', { name: /expand panel/i });
      expect(collapseButton).toHaveAttribute('aria-expanded', 'false');
      // Textarea should not be in the document when collapsed
      expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    });
  });

  it('handles localStorage errors gracefully', () => {
    mockLocalStorage.getItem.mockImplementation(() => {
      throw new Error('localStorage error');
    });
    
    // Should render without crashing
    expect(() => renderContextPanel()).not.toThrow();
  });
});