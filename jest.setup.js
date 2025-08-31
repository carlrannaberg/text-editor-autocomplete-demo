// jest.setup.js
import '@testing-library/jest-dom';

// Mock fetch globally
global.fetch = jest.fn();

// Mock AbortController
global.AbortController = jest.fn(() => ({
  abort: jest.fn(),
  signal: { aborted: false },
}));

// Mock Request and Response for Next.js API testing
global.Request = jest.fn((url, init) => ({
  url,
  method: init?.method || 'GET',
  headers: new Map(),
  json: async () => JSON.parse(init?.body || '{}'),
  text: async () => init?.body || '',
}));

global.Response = jest.fn((body, init) => ({
  ok: init?.status >= 200 && init?.status < 300,
  status: init?.status || 200,
  json: async () => typeof body === 'string' ? JSON.parse(body) : body,
  text: async () => typeof body === 'string' ? body : JSON.stringify(body),
}));

// Mock AI SDK modules
jest.mock('@ai-sdk/google', () => ({
  google: jest.fn(() => 'mock-model'),
}));

// Mock Next.js server modules
jest.mock('next/server', () => ({
  NextRequest: jest.fn(),
  NextResponse: {
    json: (body, init) => ({
      status: init?.status || 200,
      ok: init?.status >= 200 && init?.status < 300,
      json: async () => body,
      text: async () => JSON.stringify(body),
    }),
  },
}));

// Mock window.matchMedia for accessibility hooks
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock crypto.subtle for accessibility hooks
Object.defineProperty(global, 'crypto', {
  value: {
    subtle: {
      digest: jest.fn().mockResolvedValue(new ArrayBuffer(20))
    }
  }
});

// Mock Tiptap/ProseMirror modules that don't work in jsdom
jest.mock('@tiptap/react', () => ({
  useEditor: jest.fn(),
  EditorContent: ({ children }) => <div data-testid="editor-content">{children}</div>,
}));

jest.mock('@tiptap/starter-kit', () => ({
  default: 'StarterKit',
}));

// Console error suppression for expected errors in tests
const originalError = console.error;
beforeAll(() => {
  console.error = (...args) => {
    if (typeof args[0] === 'string' && args[0].includes('Warning:')) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});