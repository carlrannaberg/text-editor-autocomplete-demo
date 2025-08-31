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
    expect(screen.getByText(/\d+(?:[\s,]\d{3})* \/ 20[\s,]000/)).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Describe your document context (optional)...')).toBeInTheDocument();
    expect(screen.getByText('Clear')).toBeInTheDocument();
  });

  it('updates token count when text changes', async () => {
    const user = userEvent.setup();
    renderContextPanel();
    
    const textarea = screen.getByRole('textbox', { name: /additional context/i });
    const initialTokenText = screen.getByText(/\d+(?:[\s,]\d{3})* \/ 20[\s,]000/);
    const initialTokenCount = parseInt(initialTokenText.textContent?.match(/(\d+(?:[\s,]\d{3})*)/)?.[0]?.replace(/[\s,]/g, '') || '0');
    
    await user.type(textarea, 'This is a test context');
    
    // Token count should increase
    const newTokenText = screen.getByText(/\d+(?:[\s,]\d{3})* \/ 20[\s,]000/);
    const newTokenCount = parseInt(newTokenText.textContent?.match(/(\d+(?:[\s,]\d{3})*)/)?.[0]?.replace(/[\s,]/g, '') || '0');
    
    expect(newTokenCount).toBeGreaterThan(initialTokenCount);
  });

  it('handles collapse/expand functionality', async () => {
    const user = userEvent.setup();
    renderContextPanel();
    
    const collapseButton = screen.getByRole('button', { name: /collapse panel/i });
    const textarea = screen.getByRole('textbox', { name: /additional context/i });
    
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
    
    const textarea = screen.getByRole('textbox', { name: /additional context/i });
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
    
    const textarea = screen.getByRole('textbox', { name: /additional context/i });
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
    expect(screen.getByText(/\d+(?:[\s,]\d{3})* \/ 20[\s,]000/)).toBeInTheDocument();
  });

  it('cancels clear operation', async () => {
    const user = userEvent.setup();
    renderContextPanel();
    
    const textarea = screen.getByRole('textbox', { name: /additional context/i });
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
    
    // Check that textarea has aria-describedby (with generated IDs)
    const textarea = screen.getByRole('textbox', { name: /additional context/i });
    expect(textarea).toHaveAttribute('aria-describedby');
    const describedBy = textarea.getAttribute('aria-describedby');
    expect(describedBy).toBeTruthy();
    expect(describedBy).toContain('help'); // Should contain help text reference
    
    // Check token count has proper live region attributes
    const tokenCount = screen.getByText(/\d+(?:[\s,]\d{3})* \/ 20[\s,]000/);
    expect(tokenCount).toHaveAttribute('aria-live', 'polite');
    expect(tokenCount).toHaveAttribute('aria-atomic', 'true');
    
    // Check collapse button has proper ARIA expanded state
    const collapseButton = screen.getByRole('button', { name: /collapse panel/i });
    expect(collapseButton).toHaveAttribute('aria-expanded', 'true');
    
    // Check that the context panel has proper region attributes
    const contextPanel = screen.getByText('Document Context').closest('div[role="region"]');
    expect(contextPanel).toBeInTheDocument();
    expect(contextPanel).toHaveAttribute('aria-labelledby');
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
      expect(screen.queryByRole('textbox', { name: /additional context/i })).not.toBeInTheDocument();
    });
  });

  it('handles localStorage errors gracefully', () => {
    mockLocalStorage.getItem.mockImplementation(() => {
      throw new Error('localStorage error');
    });
    
    // Should render without crashing
    expect(() => renderContextPanel()).not.toThrow();
  });

  // New tests for enhanced functionality
  describe('Structured hints', () => {
    it('updates document type when selected', async () => {
      const user = userEvent.setup();
      renderContextPanel();
      
      const documentTypeSelect = screen.getByRole('combobox', { name: /document type/i });
      await user.selectOptions(documentTypeSelect, 'email');
      
      expect(documentTypeSelect).toHaveValue('email');
    });

    it('updates language when selected', async () => {
      const user = userEvent.setup();
      renderContextPanel();
      
      const languageSelect = screen.getByRole('combobox', { name: /language/i });
      await user.selectOptions(languageSelect, 'es');
      
      expect(languageSelect).toHaveValue('es');
    });

    it('updates tone when selected', async () => {
      const user = userEvent.setup();
      renderContextPanel();
      
      const toneSelect = screen.getByRole('combobox', { name: /tone/i });
      await user.selectOptions(toneSelect, 'formal');
      
      expect(toneSelect).toHaveValue('formal');
    });

    it('updates audience when typed', async () => {
      const user = userEvent.setup();
      renderContextPanel();
      
      const audienceInput = screen.getByRole('textbox', { name: /target audience/i });
      await user.type(audienceInput, 'developers');
      
      expect(audienceInput).toHaveValue('developers');
    });

    it('enforces audience character limit', async () => {
      const user = userEvent.setup();
      renderContextPanel();
      
      const audienceInput = screen.getByRole('textbox', { name: /target audience/i }) as HTMLInputElement;
      const longText = 'a'.repeat(70); // Exceeds 64 char limit
      
      await user.type(audienceInput, longText);
      
      expect(audienceInput.value.length).toBeLessThanOrEqual(64);
    });
  });

  describe('Keywords input', () => {
    it('adds keywords with Enter key', async () => {
      const user = userEvent.setup();
      renderContextPanel();
      
      const keywordsInput = screen.getByRole('textbox', { name: /keywords/i });
      await user.type(keywordsInput, 'react{enter}');
      
      expect(screen.getByText('react')).toBeInTheDocument();
      expect(keywordsInput).toHaveValue('');
    });

    it('adds keywords with comma separator', async () => {
      const user = userEvent.setup();
      renderContextPanel();
      
      const keywordsInput = screen.getByRole('textbox', { name: /keywords/i });
      await user.type(keywordsInput, 'typescript,');
      
      expect(screen.getByText('typescript')).toBeInTheDocument();
    });

    it('adds keywords with space separator', async () => {
      const user = userEvent.setup();
      renderContextPanel();
      
      const keywordsInput = screen.getByRole('textbox', { name: /keywords/i });
      await user.type(keywordsInput, 'nextjs ');
      
      expect(screen.getByText('nextjs')).toBeInTheDocument();
    });

    it('removes keywords when chip button clicked', async () => {
      const user = userEvent.setup();
      renderContextPanel();
      
      const keywordsInput = screen.getByRole('textbox', { name: /keywords/i });
      await user.type(keywordsInput, 'test{enter}');
      
      const removeButton = screen.getByRole('button', { name: /remove keyword: test/i });
      await user.click(removeButton);
      
      expect(screen.queryByText('test')).not.toBeInTheDocument();
    });

    it('removes last keyword with backspace when input empty', async () => {
      const user = userEvent.setup();
      renderContextPanel();
      
      const keywordsInput = screen.getByRole('textbox', { name: /keywords/i });
      await user.type(keywordsInput, 'first{enter}second{enter}');
      
      // Clear input and press backspace
      await user.clear(keywordsInput);
      await user.type(keywordsInput, '{backspace}');
      
      expect(screen.queryByText('second')).not.toBeInTheDocument();
      expect(screen.getByText('first')).toBeInTheDocument();
    });

    it('prevents duplicate keywords', async () => {
      const user = userEvent.setup();
      renderContextPanel();
      
      const keywordsInput = screen.getByRole('textbox', { name: /keywords/i });
      await user.type(keywordsInput, 'duplicate{enter}duplicate{enter}');
      
      const keywordChips = screen.getAllByText('duplicate');
      expect(keywordChips).toHaveLength(1);
    });

    it('enforces keyword character limit', async () => {
      const user = userEvent.setup();
      renderContextPanel();
      
      const keywordsInput = screen.getByRole('textbox', { name: /keywords/i });
      expect(keywordsInput).toHaveAttribute('maxLength', '32');
    });

    it('shows keyword count and limits', () => {
      renderContextPanel();
      
      expect(screen.getByText('Keywords (0/10)')).toBeInTheDocument();
    });

    it('hides input when max keywords reached', async () => {
      const user = userEvent.setup();
      renderContextPanel();
      
      const keywordsInput = screen.getByRole('textbox', { name: /keywords/i });
      
      // Add 10 keywords (max limit)
      for (let i = 1; i <= 10; i++) {
        await user.type(keywordsInput, `keyword${i}{enter}`);
      }
      
      // Input should be hidden when max reached
      expect(screen.queryByRole('textbox', { name: /keywords/i })).not.toBeInTheDocument();
      expect(screen.getByText('Keywords (10/10)')).toBeInTheDocument();
    });

    it('adds keyword on blur', async () => {
      const user = userEvent.setup();
      renderContextPanel();
      
      const keywordsInput = screen.getByRole('textbox', { name: /keywords/i });
      await user.type(keywordsInput, 'blurtest');
      await user.tab(); // This will blur the input
      
      expect(screen.getByText('blurtest')).toBeInTheDocument();
    });
  });

  describe('Responsive layout', () => {
    it('renders all form elements with proper structure', () => {
      renderContextPanel();
      
      expect(screen.getByRole('combobox', { name: /document type/i })).toBeInTheDocument();
      expect(screen.getByRole('combobox', { name: /language/i })).toBeInTheDocument();
      expect(screen.getByRole('combobox', { name: /tone/i })).toBeInTheDocument();
      expect(screen.getByRole('textbox', { name: /target audience/i })).toBeInTheDocument();
      expect(screen.getByRole('textbox', { name: /keywords/i })).toBeInTheDocument();
    });

    it('has proper grid layout classes', () => {
      renderContextPanel();
      
      const gridContainer = screen.getByText('Document Type').closest('.grid');
      expect(gridContainer).toHaveClass('grid-cols-1', 'md:grid-cols-2', 'lg:grid-cols-4', 'gap-4');
    });
  });
});