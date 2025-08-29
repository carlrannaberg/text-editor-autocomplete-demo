// __tests__/utils/test-helpers.ts
import { render, RenderOptions } from '@testing-library/react';
import { ReactElement } from 'react';

// Custom render function with providers if needed
const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { ...options });

export * from '@testing-library/react';
export { customRender as render };

// Mock API responses
export const mockApiResponse = <T>(response: T, delay = 0) => {
  return jest.fn().mockImplementation(() =>
    Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve(response),
    }).then(res => delay > 0 ? new Promise(resolve => setTimeout(() => resolve(res), delay)) : res)
  );
};

export const mockApiError = (status = 500, message = 'API Error') => {
  return jest.fn().mockRejectedValue(new Error(message));
};

// ProseMirror test helpers
export const createTestView = () => ({
  state: {
    doc: { textContent: '', textBetween: jest.fn() },
    selection: { from: 0, to: 0 },
    tr: {
      insertText: jest.fn().mockReturnThis(),
      setMeta: jest.fn().mockReturnThis(),
    },
  },
  dispatch: jest.fn(),
  composing: false,
});

export const createTestViewWithSuggestion = (suggestion: string) => {
  const view = createTestView();
  // Simulate suggestion state
  return {
    ...view,
    __suggestion: suggestion,
  };
};