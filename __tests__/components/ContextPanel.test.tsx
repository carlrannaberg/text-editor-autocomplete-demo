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
    
    expect(screen.getByText('Writing Context')).toBeInTheDocument();
    expect(screen.getByText(/20.*000/)).toBeInTheDocument();
    expect(screen.getByText('0')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Describe what you\'re writing about to get better autocomplete suggestions...')).toBeInTheDocument();
    expect(screen.getByText('Clear')).toBeInTheDocument();
  });

  it('updates token count when text changes', async () => {
    const user = userEvent.setup();
    renderContextPanel();
    
    const textarea = screen.getByRole('textbox', { name: /what are you writing about/i });
    expect(screen.getByText('0')).toBeInTheDocument();
    
    await user.type(textarea, 'This is a test context');
    
    // Token count should increase - just check that we no longer see '0' as the only number
    await waitFor(() => {
      expect(screen.queryByText('0')).not.toBeInTheDocument();
    });
  });

  it('handles text input properly', async () => {
    const user = userEvent.setup();
    renderContextPanel();
    
    const textarea = screen.getByRole('textbox', { name: /what are you writing about/i });
    
    await user.type(textarea, 'Test context content');
    expect(textarea).toHaveValue('Test context content');
  });

  it('accepts user input in textarea', async () => {
    const user = userEvent.setup();
    renderContextPanel();
    
    const textarea = screen.getByRole('textbox', { name: /what are you writing about/i });
    await user.type(textarea, 'Persistent test content');
    
    // Check that the value is set in the textarea
    expect(textarea).toHaveValue('Persistent test content');
  });

  it('clears context immediately without confirmation dialog', async () => {
    const user = userEvent.setup();
    renderContextPanel();
    
    const textarea = screen.getByRole('textbox', { name: /what are you writing about/i });
    const clearButton = screen.getByRole('button', { name: /clear/i });
    
    // Add some text
    await user.type(textarea, 'Some context');
    expect(textarea).toHaveValue('Some context');
    
    // Click clear button - should clear immediately
    await user.click(clearButton);
    
    // Context should be cleared immediately (no confirmation dialog)
    expect(textarea).toHaveValue('');
  });

  it('focuses textarea after clearing', async () => {
    const user = userEvent.setup();
    renderContextPanel();
    
    const textarea = screen.getByRole('textbox', { name: /what are you writing about/i });
    const clearButton = screen.getByRole('button', { name: /clear/i });
    
    // Add some text
    await user.type(textarea, 'Some context');
    expect(textarea).toHaveValue('Some context');
    
    // Click clear button
    await user.click(clearButton);
    
    // Context should be cleared and textarea should be focused
    expect(textarea).toHaveValue('');
    expect(textarea).toHaveFocus();
  });


  it('disables clear button when context is empty', () => {
    renderContextPanel();
    
    const clearButton = screen.getByRole('button', { name: /clear/i });
    expect(clearButton).toBeDisabled();
  });

  it('has proper accessibility attributes', () => {
    renderContextPanel();
    
    // Check that textarea has aria-describedby
    const textarea = screen.getByRole('textbox', { name: /what are you writing about/i });
    expect(textarea).toHaveAttribute('aria-describedby');
    const describedBy = textarea.getAttribute('aria-describedby');
    expect(describedBy).toBeTruthy();
    expect(describedBy).toContain('context-help'); // Should contain help text reference
    
    // Check that help text exists
    expect(screen.getByText(/Provide context about your writing/)).toBeInTheDocument();
  });

  it('calls clear callback when clear button is used', async () => {
    const user = userEvent.setup();
    renderContextPanel();
    
    const textarea = screen.getByRole('textbox', { name: /what are you writing about/i });
    await user.type(textarea, 'Some content');
    
    const clearButton = screen.getByRole('button', { name: /clear/i });
    await user.click(clearButton);
    
    expect(textarea).toHaveValue('');
  });

  it('starts with empty textarea by default', () => {
    renderContextPanel();
    
    // Textarea should start empty
    const textarea = screen.getByRole('textbox', { name: /what are you writing about/i });
    expect(textarea).toHaveValue('');
  });

  it('handles localStorage errors gracefully', () => {
    mockLocalStorage.getItem.mockImplementation(() => {
      throw new Error('localStorage error');
    });
    
    // Should render without crashing
    expect(() => renderContextPanel()).not.toThrow();
  });

  describe('Context debounce behavior', () => {
    it('debounces context updates', async () => {
      jest.useFakeTimers();
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      renderContextPanel();
      
      const textarea = screen.getByRole('textbox', { name: /what are you writing about/i });
      
      // Type quickly
      await user.type(textarea, 'test');
      
      // Context should update after debounce delay
      jest.advanceTimersByTime(300);
      
      expect(textarea).toHaveValue('test');
      jest.useRealTimers();
    });
  });

  describe('Character count display', () => {
    it('shows character count', async () => {
      const user = userEvent.setup();
      renderContextPanel();
      
      const textarea = screen.getByRole('textbox', { name: /what are you writing about/i });
      await user.type(textarea, 'test');
      
      expect(screen.getByText('4 characters')).toBeInTheDocument();
    });
  });

  describe('Simplified layout', () => {
    it('renders simplified context form with proper structure', () => {
      renderContextPanel();
      
      // Check for the simplified single context field
      expect(screen.getByRole('textbox', { name: /what are you writing about/i })).toBeInTheDocument();
      expect(screen.getByText('Clear')).toBeInTheDocument();
    });

    it('has proper layout for simplified context field', () => {
      renderContextPanel();
      
      // Check for the main context input field
      expect(screen.getByLabelText('What are you writing about?')).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/Describe what you're writing about/)).toBeInTheDocument();
    });
  });
});