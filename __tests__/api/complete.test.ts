// __tests__/api/complete.test.ts
import { POST } from '@/app/api/complete/route';
import { streamText } from 'ai';
import { NextRequest } from 'next/server';

// Mock the AI SDK
jest.mock('ai', () => ({
  streamText: jest.fn(),
}));

// Mock the Google AI SDK
jest.mock('@ai-sdk/google', () => ({
  google: jest.fn(),
}));

const mockStreamText = streamText as jest.Mock;

// Helper to create NextRequest-like objects for testing
function createMockRequest(body: object): NextRequest {
  return {
    json: async () => body,
  } as NextRequest;
}

// Type for mock text stream response
interface MockStreamResponse {
  textStream: AsyncGenerator<string, void, unknown>;
}

describe('Completion API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should enforce input validation', async () => {
    const request = createMockRequest({ left: '' }); // Empty string should fail

    const response = await POST(request);
    expect(response.status).toBe(400);
    
    const body = await response.json();
    expect(body.error).toBe('Invalid input');
    expect(body.type).toBe('INVALID_INPUT');
  });

  test('should enforce maximum input length', async () => {
    const longText = 'a'.repeat(1001); // Over 1000 char limit
    const request = createMockRequest({ left: longText });

    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  test('should trim at English word boundaries', async () => {
    // Mock successful AI response
    const mockTextStream = async function* (): AsyncGenerator<string, void, unknown> {
      yield 'hello';
      yield ' world'; // Should be trimmed at space
      yield '!';
    };

    mockStreamText.mockResolvedValue({
      textStream: mockTextStream(),
    } as MockStreamResponse);

    const request = createMockRequest({ left: 'The quick' });

    const response = await POST(request);
    const result = await response.json();

    expect(result.tail).toBe('hello'); // Should stop at space
    expect(result.confidence).toBe(0.8);
  });

  test('should handle timeout gracefully', async () => {
    // Mock the timeout behavior by making the AbortController signal aborted
    const abortError = new Error('Request aborted');
    abortError.name = 'AbortError';
    
    mockStreamText.mockRejectedValue(abortError);

    const request = createMockRequest({ left: 'test' });

    const response = await POST(request);
    // Either 408 (timeout) or 503 (service unavailable) is acceptable
    expect([408, 503]).toContain(response.status);
    
    const body = await response.json();
    expect(body.type).toBe('SERVICE_UNAVAILABLE');
  });

  test('should handle AI service errors', async () => {
    mockStreamText.mockRejectedValue(new Error('AI service unavailable'));

    const request = createMockRequest({ left: 'test' });

    const response = await POST(request);
    expect(response.status).toBe(503);
    
    const body = await response.json();
    expect(body.error).toBe('AI service unavailable');
    expect(body.type).toBe('SERVICE_UNAVAILABLE');
  });

  test('should enforce 40 character hard cap', async () => {
    // Mock AI response with very long text
    const mockTextStream = async function* (): AsyncGenerator<string, void, unknown> {
      yield 'this is a very long response that should be cut off at forty characters';
    };

    mockStreamText.mockResolvedValue({
      textStream: mockTextStream(),
    } as MockStreamResponse);

    const request = createMockRequest({ left: 'test' });

    const response = await POST(request);
    const result = await response.json();

    expect(result.tail.length).toBeLessThanOrEqual(40);
  });

  test('should return non-empty completions', async () => {
    const mockTextStream = async function* (): AsyncGenerator<string, void, unknown> {
      yield 'hello';
      yield ' world';
    };

    mockStreamText.mockResolvedValue({
      textStream: mockTextStream(),
    } as MockStreamResponse);

    const request = createMockRequest({ left: 'test' });

    const response = await POST(request);
    const result = await response.json();

    expect(result.tail).toBe('hello'); // Should stop at space boundary
    expect(result.tail.length).toBeGreaterThan(0);
  });

  test('should handle CJK punctuation boundaries', async () => {
    const mockTextStream = async function* (): AsyncGenerator<string, void, unknown> {
      yield '世界'; // Chinese characters
      yield '，'; // Chinese comma - should trigger boundary
      yield '你好';
    };

    mockStreamText.mockResolvedValue({
      textStream: mockTextStream(),
    } as MockStreamResponse);

    const request = createMockRequest({ left: '你好' });

    const response = await POST(request);
    const result = await response.json();

    expect(result.tail).toBe('世界'); // Should stop at Chinese comma
  });

  test('should return proper confidence scores', async () => {
    // Test with empty result
    const mockEmptyStream = async function* (): AsyncGenerator<string, void, unknown> {
      yield '';
    };

    mockStreamText.mockResolvedValue({
      textStream: mockEmptyStream(),
    } as MockStreamResponse);

    const request = createMockRequest({ left: 'test' });

    const response = await POST(request);
    const result = await response.json();

    expect(result.confidence).toBe(0.0); // Empty result should have 0 confidence
  });
});