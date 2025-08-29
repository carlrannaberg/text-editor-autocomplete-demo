// __tests__/lib/InlineComplete.test.ts
import { InlineComplete, pluginKey } from '@/lib/InlineComplete';

// Mock fetch for request management tests
global.fetch = jest.fn();

describe('InlineComplete Extension', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ tail: 'world', confidence: 0.8 }),
    });
  });

  test('should create extension with proper configuration', () => {
    const extension = InlineComplete.configure({
      fetchTail: jest.fn(),
      debounceMs: 200,
      maxPrefixLength: 500,
      enabled: true,
    });

    expect(extension.name).toBe('inlineComplete');
    expect(extension.options.debounceMs).toBe(200);
    expect(extension.options.maxPrefixLength).toBe(500);
    expect(extension.options.enabled).toBe(true);
  });

  test('should have default options', () => {
    const extension = InlineComplete.configure({});

    expect(extension.name).toBe('inlineComplete');
    expect(extension.options.debounceMs).toBe(120);
    expect(extension.options.maxPrefixLength).toBe(1000);
    expect(extension.options.enabled).toBe(true);
  });

  test('should export plugin key', () => {
    expect(pluginKey).toBeDefined();
    expect(pluginKey.key).toBe('inlineComplete');
  });

  test('should configure fetchTail function', () => {
    const mockFetchTail = jest.fn().mockResolvedValue({
      success: true,
      data: { tail: 'completion', confidence: 0.9 }
    });

    const extension = InlineComplete.configure({
      fetchTail: mockFetchTail
    });

    expect(extension.options.fetchTail).toBe(mockFetchTail);
  });

  test('should handle disabled state', () => {
    const extension = InlineComplete.configure({
      enabled: false
    });

    expect(extension.options.enabled).toBe(false);
  });
});