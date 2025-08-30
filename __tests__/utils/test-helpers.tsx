// __tests__/utils/test-helpers.tsx
import { render, RenderOptions, screen, waitFor } from '@testing-library/react';
import { ReactElement } from 'react';
import { CompletionContextProvider } from '@/lib/context/CompletionContext';

// Wrapper component with all required providers
const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  return (
    <CompletionContextProvider>
      {children}
    </CompletionContextProvider>
  );
};

// Custom render function with providers
const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllTheProviders, ...options });

export * from '@testing-library/react';
export { customRender as render };

// Mock API responses
export const mockApiResponse = <T,>(response: T, delay = 0) => {
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

// Test-specific types
export interface MockStreamResponse {
  textStream: AsyncGenerator<string, void, unknown>;
}

// Common mock setups
export const setupMockLocalStorage = () => {
  const mockLocalStorage = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn(),
  };

  Object.defineProperty(window, 'localStorage', {
    value: mockLocalStorage,
    writable: true
  });

  return mockLocalStorage;
};

export const setupMockCrypto = () => {
  const mockDigest = jest.fn();
  
  Object.defineProperty(global, 'crypto', {
    value: {
      subtle: {
        digest: mockDigest
      }
    },
    writable: true,
    configurable: true
  });

  return { mockDigest };
};

// Domain-specific test utilities
export const waitForLoadingToFinish = () => 
  waitFor(() => expect(screen.queryByText('Loading...')).not.toBeInTheDocument());

export const expectTokenCount = (expectedCount: number) => {
  const tokenElement = screen.getByText(/\d+ tokens/);
  const actualCount = parseInt(tokenElement.textContent?.match(/\d+/)?.[0] || '0');
  expect(actualCount).toBe(expectedCount);
};

export const createMockContextState = (overrides = {}) => ({
  contextText: '',
  keywords: [],
  ...overrides
});

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