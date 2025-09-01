// __tests__/accessibility/accessibility.test.tsx

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import { ContextPanel } from '@/components/ContextPanel';
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
      expect(screen.getByRole('region', { name: /writing context/i })).toBeInTheDocument();
      
      // Check for proper heading
      expect(screen.getByText('Writing Context')).toBeInTheDocument();
    });
  });

  describe('Keyboard Navigation', () => {
    it('should allow keyboard navigation through all interactive elements', async () => {
      renderWithAccessibility();
      
      // Get all focusable elements in the context panel
      const buttons = screen.getAllByRole('button');
      const textboxes = screen.getAllByRole('textbox');
      
      const focusableElements = [...buttons, ...textboxes];
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

    it('should support keyboard navigation of textarea', async () => {
      const user = userEvent.setup();
      renderWithAccessibility();
      
      const textarea = screen.getByRole('textbox', { name: /what are you writing about/i });
      await user.click(textarea);
      expect(textarea).toHaveFocus();
      
      await user.type(textarea, 'Test content');
      expect(textarea).toHaveValue('Test content');
    });
  });

  describe('Screen Reader Support', () => {
    it('should have proper ARIA labels and descriptions', () => {
      renderWithAccessibility();
      
      // Check textarea has proper labeling
      const textarea = screen.getByRole('textbox', { name: /what are you writing about/i });
      expect(textarea).toHaveAttribute('aria-describedby');
      expect(textarea).toHaveAttribute('id');
    });

    it('should have proper form labeling', () => {
      renderWithAccessibility();
      
      // All form controls should have labels
      const textInputs = screen.getAllByRole('textbox');
      textInputs.forEach(input => {
        expect(input).toHaveAccessibleName();
      });
      
      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        expect(button).toHaveAccessibleName();
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

  });

  describe('Integration Tests', () => {
    it('should maintain accessibility during user interactions', async () => {
      const user = userEvent.setup();
      renderWithAccessibility();
      
      // Test textarea interaction
      const textarea = screen.getByRole('textbox', { name: /what are you writing about/i });
      await user.click(textarea);
      expect(textarea).toHaveFocus();
      
      // Test clear button interaction
      await user.type(textarea, 'Test content');
      const clearButton = screen.getByRole('button', { name: /clear/i });
      expect(clearButton).not.toBeDisabled();
    });

    it('should have live regions for announcements', async () => {
      renderWithAccessibility();
      
      // Check that live regions are properly set up
      const liveRegions = document.querySelectorAll('[aria-live]');
      expect(liveRegions.length).toBeGreaterThan(0);
      
      // Check that we have at least some polite regions
      const politeRegions = document.querySelectorAll('[aria-live="polite"]');
      expect(politeRegions.length).toBeGreaterThan(0);
    });
  });
});