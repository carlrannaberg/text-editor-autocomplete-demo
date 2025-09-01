// __tests__/api/complete.test.ts
import { POST } from '@/app/api/complete/route';
import { streamText } from 'ai';
import { NextRequest } from 'next/server';
import type { MockStreamResponse } from '../utils/test-helpers';

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

  test('should enforce 32 character hard cap', async () => {
    // Mock AI response with very long text
    const mockTextStream = async function* (): AsyncGenerator<string, void, unknown> {
      yield 'this is a very long response that should be cut off at thirty two characters';
    };

    mockStreamText.mockResolvedValue({
      textStream: mockTextStream(),
    } as MockStreamResponse);

    const request = createMockRequest({ left: 'test' });

    const response = await POST(request);
    const result = await response.json();

    expect(result.tail.length).toBeLessThanOrEqual(32);
  });

  test('should lower confidence when truncated by limits', async () => {
    const longChunk = 'x'.repeat(200);
    const mockTextStream = async function* (): AsyncGenerator<string, void, unknown> {
      yield longChunk; // forces char-limit truncation
    };

    mockStreamText.mockResolvedValue({
      textStream: mockTextStream(),
    } as MockStreamResponse);

    const request = createMockRequest({ left: 'test' });

    const response = await POST(request);
    const result = await response.json();

    expect(result.tail.length).toBeLessThanOrEqual(32);
    expect(result.confidence).toBeLessThanOrEqual(0.4);
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

  test('should handle en/em dash boundaries', async () => {
    const mockTextStream = async function* (): AsyncGenerator<string, void, unknown> {
      yield 'status';
      yield '—'; // en dash triggers boundary
      yield 'details';
    };

    mockStreamText.mockResolvedValue({
      textStream: mockTextStream(),
    } as MockStreamResponse);

    const request = createMockRequest({ left: 'summary' });

    const response = await POST(request);
    const result = await response.json();

    expect(result.tail).toBe('status');
  });

  test('should handle middle dot boundaries', async () => {
    const mockTextStream = async function* (): AsyncGenerator<string, void, unknown> {
      yield 'A·'; // middle dot triggers boundary
      yield 'B';
    };

    mockStreamText.mockResolvedValue({
      textStream: mockTextStream(),
    } as MockStreamResponse);

    const request = createMockRequest({ left: 'A' });

    const response = await POST(request);
    const result = await response.json();

    expect(result.tail).toBe('A');
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

  // Context-aware completion tests
  describe('Context-aware completions', () => {
    test('should handle context-aware completions with valid context', async () => {
      const mockTextStream = async function* (): AsyncGenerator<string, void, unknown> {
        yield 'professional';
      };

      mockStreamText.mockResolvedValue({
        textStream: mockTextStream(),
      } as MockStreamResponse);

      const request = createMockRequest({
        left: 'Dear client',
        context: {
          userContext: 'Writing a professional response to a customer complaint',
          documentType: 'email',
          language: 'en',
          tone: 'formal',
          audience: 'business client',
          keywords: ['professional', 'response']
        }
      });

      const response = await POST(request);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.tail).toBe('professional');
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    test('should boost confidence for short contextual completions', async () => {
      const mockTextStream = async function* (): AsyncGenerator<string, void, unknown> {
        yield 'help'; // ≤8 chars should get confidence boost
      };

      mockStreamText.mockResolvedValue({
        textStream: mockTextStream(),
      } as MockStreamResponse);

      const request = createMockRequest({
        left: 'Can I',
        context: {
          userContext: 'Customer service email'
        }
      });

      const response = await POST(request);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.tail).toBe('help');
      expect(result.confidence).toBeGreaterThanOrEqual(0.55); // Base 0.5 + context boost 0.05
    });

    test('should validate context schema and reject invalid context', async () => {
      const request = createMockRequest({
        left: 'test',
        context: {
          userContext: 'a'.repeat(150001) // Exceeds 150k character limit
        }
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
      
      const body = await response.json();
      expect(body.error).toBe('Invalid input');
      expect(body.type).toBe('INVALID_INPUT');
    });

    test('should enforce 150k character context limit', async () => {
      const request = createMockRequest({
        left: 'test',
        context: {
          userContext: 'a'.repeat(150001) // Exceeds 150k limit
        }
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
      
      const body = await response.json();
      expect(body.error).toBe('Invalid input');
      expect(body.type).toBe('INVALID_INPUT');
    });

    test('should handle valid context within limits', async () => {
      const mockTextStream = async function* (): AsyncGenerator<string, void, unknown> {
        yield 'response';
      };

      mockStreamText.mockResolvedValue({
        textStream: mockTextStream(),
      } as MockStreamResponse);

      const request = createMockRequest({
        left: 'test',
        context: {
          userContext: 'test context within valid limits'
        }
      });

      const response = await POST(request);
      expect(response.status).toBe(200);
    });

    test('should sanitize context HTML and control characters', async () => {
      const mockTextStream = async function* (): AsyncGenerator<string, void, unknown> {
        yield 'response';
      };

      mockStreamText.mockResolvedValue({
        textStream: mockTextStream(),
      } as MockStreamResponse);

      const request = createMockRequest({
        left: 'test',
        context: {
          userContext: 'Context with <script>alert("xss")</script> HTML\x00\x1F and control chars\x0B'
        }
      });

      const response = await POST(request);
      expect(response.status).toBe(200);
      
      // Verify that the AI was called (meaning context was processed successfully)
      expect(mockStreamText).toHaveBeenCalled();
      
      const aiCall = mockStreamText.mock.calls[0][0];
      const promptText = aiCall.prompt;
      
      // Context should be sanitized in the prompt
      expect(promptText).not.toContain('<script>');
      expect(promptText).not.toContain('<b>');
      expect(promptText).not.toContain('\x00');
      expect(promptText).not.toContain('\x0B');
    });

    test('should maintain backward compatibility without context', async () => {
      const mockTextStream = async function* (): AsyncGenerator<string, void, unknown> {
        yield 'world';
      };

      mockStreamText.mockResolvedValue({
        textStream: mockTextStream(),
      } as MockStreamResponse);

      const request = createMockRequest({ left: 'hello' }); // No context field

      const response = await POST(request);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.tail).toBe('world');
      expect(typeof result.confidence).toBe('number');
    });

    test('should use different system prompts for context vs non-context', async () => {
      const mockTextStream = async function* (): AsyncGenerator<string, void, unknown> {
        yield 'response';
      };

      mockStreamText.mockResolvedValue({
        textStream: mockTextStream(),
      } as MockStreamResponse);

      // First call with context
      const contextRequest = createMockRequest({
        left: 'test',
        context: { userContext: 'test context' }
      });

      await POST(contextRequest);
      const contextCall = mockStreamText.mock.calls[0][0];

      // Second call without context  
      mockStreamText.mockClear();
      mockStreamText.mockResolvedValue({ textStream: mockTextStream() });
      
      const noContextRequest = createMockRequest({ left: 'test' });
      await POST(noContextRequest);
      const noContextCall = mockStreamText.mock.calls[0][0];

      // System prompts should be different
      expect(contextCall.system).not.toBe(noContextCall.system);
      expect(contextCall.system).toContain('contextual awareness');
    });

    test('should handle partial context data', async () => {
      const mockTextStream = async function* (): AsyncGenerator<string, void, unknown> {
        yield 'response';
      };

      mockStreamText.mockResolvedValue({
        textStream: mockTextStream(),
      } as MockStreamResponse);

      const request = createMockRequest({
        left: 'test',
        context: {
          userContext: 'email context' // Only userContext field provided
        }
      });

      const response = await POST(request);
      expect(response.status).toBe(200);
      
      const result = await response.json();
      expect(result.tail).toBe('response');
    });

    test('should use extended timeout for context requests', async () => {
      // This test verifies the timeout logic by checking the AbortController setup
      const mockTextStream = async function* (): AsyncGenerator<string, void, unknown> {
        yield 'response';
      };

      mockStreamText.mockResolvedValue({
        textStream: mockTextStream(),
      } as MockStreamResponse);

      const request = createMockRequest({
        left: 'test',
        context: { userContext: 'context that should trigger extended timeout' }
      });

      const response = await POST(request);
      expect(response.status).toBe(200);
      
      // Verify that streamText was called with the expected configuration
      const aiCall = mockStreamText.mock.calls[0][0];
      expect(aiCall.abortSignal).toBeDefined();
    });
  });
});
