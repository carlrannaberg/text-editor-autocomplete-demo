// __tests__/accessibility/accessibility.test.tsx

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import { ContextPanel } from '@/components/ContextPanel';
import { AccessibleKeywordsInput } from '@/components/AccessibleKeywordsInput';
import { CompletionContextProvider } from '@/lib/context/CompletionContext';

// Extend Jest matchers
expect.extend(toHaveNoViolations);

// Test wrapper with context
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <CompletionContextProvider>
    {children}
  </CompletionContextProvider>
);

const renderWithAccessibility = () => {
  return render(
    <TestWrapper>
      <ContextPanel />
    </TestWrapper>
  );
};

describe('ContextPanel Accessibility Compliance Tests', () => {
  describe('WCAG 2.1 AA Compliance', () => {
    it('should not have any accessibility violations', async () => {
      const { container } = renderWithAccessibility();
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have proper semantic structure', () => {
      renderWithAccessibility();
      
      // Check for context panel region
      expect(screen.getByRole('region', { name: /document context/i })).toBeInTheDocument();
      
      // Check for proper heading
      expect(screen.getByText('Document Context')).toBeInTheDocument();
    });
  });

  describe('Keyboard Navigation', () => {
    it('should allow keyboard navigation through all interactive elements', async () => {
      renderWithAccessibility();
      
      // Get all focusable elements in the context panel
      const buttons = screen.getAllByRole('button');
      const textboxes = screen.getAllByRole('textbox');
      const comboboxes = screen.getAllByRole('combobox');
      
      const focusableElements = [...buttons, ...textboxes, ...comboboxes];
      expect(focusableElements.length).toBeGreaterThan(0);
      
      // Each element should be focusable (skip disabled elements)
      for (const element of focusableElements) {
        if (!(element as HTMLButtonElement).disabled) {
          element.focus();
          expect(element).toHaveFocus();
        }
      }
    });

    it('should show visible focus indicators', () => {
      renderWithAccessibility();
      
      const buttons = screen.getAllByRole('button');
      if (buttons.length > 0) {
        // Find first enabled button
        const enabledButton = buttons.find(button => !(button as HTMLButtonElement).disabled);
        if (enabledButton) {
          enabledButton.focus();
          
          // Check that the focused element has focus classes
          expect(enabledButton.className).toMatch(/focus:/);
        }
      }
    });

    it('should handle escape key for dialogs', async () => {
      const user = userEvent.setup();
      renderWithAccessibility();
      
      // Open keyboard help dialog
      const helpButton = screen.getByRole('button', { name: /keyboard shortcuts help/i });
      await user.click(helpButton);
      
      // Check dialog is open
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      
      // Press escape to close
      await user.keyboard('{Escape}');
      
      // Dialog should be closed
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  describe('Screen Reader Support', () => {
    it('should have proper ARIA labels and descriptions', () => {
      renderWithAccessibility();
      
      // Check textarea has proper labeling
      const textarea = screen.getByRole('textbox', { name: /additional context/i });
      expect(textarea).toHaveAttribute('aria-describedby');
      expect(textarea).toHaveAttribute('id');
      
      // Check token count has live region
      const tokenCount = screen.getByText(/\d+(?:[\s,]\d{3})* \/ 20[\s,]000/);
      expect(tokenCount).toHaveAttribute('aria-live', 'polite');
      expect(tokenCount).toHaveAttribute('aria-atomic', 'true');
    });

    it('should have proper form labeling', () => {
      renderWithAccessibility();
      
      // All form controls should have labels
      const selects = screen.getAllByRole('combobox');
      selects.forEach(select => {
        expect(select).toHaveAccessibleName();
        expect(select).toHaveAttribute('aria-describedby');
      });
      
      const textInputs = screen.getAllByRole('textbox');
      textInputs.forEach(input => {
        expect(input).toHaveAccessibleName();
      });
    });
  });

  describe('Screen Reader Support', () => {
    it('should have proper ARIA labels and descriptions', () => {
      renderWithAccessibility();
      
      // Check textarea has proper labeling
      const textarea = screen.getByRole('textbox', { name: /additional context/i });
      expect(textarea).toHaveAttribute('aria-describedby');
      expect(textarea).toHaveAttribute('id');
      
      // Check token count has live region
      const tokenCount = screen.getByText(/\d+(?:[\s,]\d{3})* \/ 20[\s,]000/);
      expect(tokenCount).toHaveAttribute('aria-live', 'polite');
      expect(tokenCount).toHaveAttribute('aria-atomic', 'true');
    });

    it('should have proper form labeling', () => {
      renderWithAccessibility();
      
      // All form controls should have labels
      const selects = screen.getAllByRole('combobox');
      selects.forEach(select => {
        expect(select).toHaveAccessibleName();
        expect(select).toHaveAttribute('aria-describedby');
      });
      
      const textInputs = screen.getAllByRole('textbox');
      textInputs.forEach(input => {
        expect(input).toHaveAccessibleName();
      });
    });
  });

  describe('Form Accessibility', () => {
    it('should have minimum target sizes', () => {
      renderWithAccessibility();
      
      // All buttons should meet minimum target size requirements
      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        // All buttons should have minimum target size
        expect(button.className).toMatch(/min-h-\[44px\]|min-h-11|h-11|py-/);
      });
    });

    it('should have progress bar with proper attributes', () => {
      renderWithAccessibility();
      
      const progressBars = document.querySelectorAll('[role="progressbar"]');
      expect(progressBars.length).toBeGreaterThan(0);
      
      progressBars.forEach(progressBar => {
        expect(progressBar).toHaveAttribute('aria-valuenow');
        expect(progressBar).toHaveAttribute('aria-valuemin');
        expect(progressBar).toHaveAttribute('aria-valuemax');
      });
    });
  });

  describe('Integration Tests', () => {
    it('should maintain accessibility during state changes', async () => {
      const user = userEvent.setup();
      renderWithAccessibility();
      
      // Test context panel collapse/expand
      const collapseButton = screen.getByRole('button', { name: /collapse panel/i });
      expect(collapseButton).toHaveAttribute('aria-expanded', 'true');
      
      await user.click(collapseButton);
      expect(collapseButton).toHaveAttribute('aria-expanded', 'false');
    });

    it('should have live regions for announcements', async () => {
      renderWithAccessibility();
      
      // Check that live regions are properly set up (token count has aria-live)
      const liveRegions = document.querySelectorAll('[aria-live]');
      expect(liveRegions.length).toBeGreaterThan(0);
      
      // Check that we have at least the token count with aria-live="polite"
      const politeRegions = document.querySelectorAll('[aria-live="polite"]');
      expect(politeRegions.length).toBeGreaterThan(0);
      
      // Verify specific token count live region exists
      const tokenCount = screen.getByText(/\d+(?:[\s,]\d{3})* \/ 20[\s,]000/);
      expect(tokenCount).toHaveAttribute('aria-live', 'polite');
      expect(tokenCount).toHaveAttribute('aria-atomic', 'true');
    });
  });
});