// __tests__/integration/context-transmission.test.ts
import { POST } from '@/app/api/complete/route';
import { streamText } from 'ai';
import { NextRequest } from 'next/server';
import { setupMockCrypto } from '../utils/test-helpers';

// Set up centralized mocks
setupMockCrypto();

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

describe('Context Transmission Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock successful AI response by default
    const mockTextStream = async function* (): AsyncGenerator<string, void, unknown> {
      yield 'completion text';
    };

    mockStreamText.mockResolvedValue({
      textStream: mockTextStream(),
    });
  });

  test('should transmit context from UI to API correctly', async () => {
    const contextPayload = {
      userContext: 'Claude Code and Codex CLI documentation'
    };

    const request = createMockRequest({
      left: 'Claude',
      context: contextPayload
    });

    const response = await POST(request);
    const result = await response.json();

    // Verify successful response
    expect(response.status).toBe(200);
    expect(result.tail).toBe('completion');
    expect(result.confidence).toBeGreaterThan(0);

    // Verify AI was called with context
    expect(mockStreamText).toHaveBeenCalledWith(
      expect.objectContaining({
        system: expect.stringContaining('contextual awareness'),
        prompt: expect.stringContaining('Claude Code and Codex CLI documentation')
      })
    );
  });

  test('should handle minimal context payload', async () => {
    const request = createMockRequest({
      left: 'Hello',
      context: {
        userContext: 'Simple greeting'
      }
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    
    // Verify context was processed
    expect(mockStreamText).toHaveBeenCalledWith(
      expect.objectContaining({
        system: expect.stringContaining('contextual awareness'),
        prompt: expect.stringContaining('Simple greeting')
      })
    );
  });

  test('should handle context with userContext text', async () => {
    const request = createMockRequest({
      left: 'Technical',
      context: {
        userContext: 'Writing a formal technical article for software engineers'
      }
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    
    // Verify context was processed
    const aiCall = mockStreamText.mock.calls[0][0];
    expect(aiCall.prompt).toContain('Writing a formal technical article for software engineers');
  });

  test('should boost confidence for contextual short completions', async () => {
    // Mock short completion
    const mockShortStream = async function* (): AsyncGenerator<string, void, unknown> {
      yield 'help';
    };

    mockStreamText.mockResolvedValue({
      textStream: mockShortStream(),
    });

    const request = createMockRequest({
      left: 'Need',
      context: {
        userContext: 'Customer service context'
      }
    });

    const response = await POST(request);
    const result = await response.json();

    expect(response.status).toBe(200);
    expect(result.tail).toBe('help');
    // Context should boost confidence for short completions
    expect(result.confidence).toBeGreaterThanOrEqual(0.55);
  });

  test('should maintain backward compatibility without context', async () => {
    const request = createMockRequest({
      left: 'Hello world'
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    
    // Should use non-context system prompt
    expect(mockStreamText).toHaveBeenCalledWith(
      expect.objectContaining({
        system: expect.not.stringContaining('contextual awareness')
      })
    );
  });

  test('should reject invalid context fields', async () => {
    const request = createMockRequest({
      left: 'Test',
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

  test('should sanitize context HTML and control characters', async () => {
    const request = createMockRequest({
      left: 'Safe',
      context: {
        userContext: 'Context with <script>alert("xss")</script> HTML\x00\x1F and users\x0B with control chars'
      }
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    
    // Verify AI was called with sanitized context
    const aiCall = mockStreamText.mock.calls[0][0];
    const promptText = aiCall.prompt;
    
    // Context should be sanitized in the prompt
    expect(promptText).not.toContain('<script>');
    expect(promptText).not.toContain('\x00');
    expect(promptText).not.toContain('\x0B');
    
    // But should contain the cleaned content
    expect(promptText).toContain('Context with alert("xss") HTML and users with control chars');
  });

  test('should use extended timeout for context requests', async () => {
    const request = createMockRequest({
      left: 'Test',
      context: {
        userContext: 'This should trigger extended timeout'
      }
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    
    // Verify streamText was called with abortSignal (indicates timeout handling)
    const aiCall = mockStreamText.mock.calls[0][0];
    expect(aiCall.abortSignal).toBeDefined();
  });

  test('should handle empty context object', async () => {
    const request = createMockRequest({
      left: 'Empty',
      context: {} // Empty context object
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    
    // Should use non-context system prompt for empty context
    expect(mockStreamText).toHaveBeenCalledWith(
      expect.objectContaining({
        system: expect.not.stringContaining('contextual awareness')
      })
    );
  });
});