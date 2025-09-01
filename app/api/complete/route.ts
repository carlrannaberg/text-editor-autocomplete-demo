// app/api/complete/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { streamText } from 'ai';
import { google } from '@ai-sdk/google';
import { z } from 'zod';

// Input validation with optional context
const ContextSchema = z.object({
  userContext: z.string().max(150000).optional(), // Increased limit for larger contexts (20k tokens + user text)
  documentType: z.enum(['email', 'article', 'note', 'other']).optional(),
  language: z.enum(['en', 'es', 'fr', 'de']).optional(),
  tone: z.enum(['neutral', 'formal', 'casual', 'persuasive']).optional(),
  audience: z.string().max(64).optional(),
  keywords: z.array(z.string().max(32)).max(10).optional()
});

const RequestSchema = z.object({
  left: z.string().min(1).max(1000),
  context: ContextSchema.optional()
});

// Context sanitization
function sanitizeContext(text: string): string {
  return text
    .replace(/[\x00-\x1F\x7F-\x9F]/g, '') // Remove control characters
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .trim();
}

// Cache-optimized system prompts - stable content for Gemini caching
const SYSTEM_BASE_CACHED = `You are an inline autocomplete engine.

# Core Instructions
- Output ONLY the minimal continuation of the user's text
- No introductions, explanations, or complete sentences
- No punctuation unless it is literally the next character needed
- Never add quotes, formatting, or trailing whitespace
- Stop at natural boundaries (spaces, punctuation, line breaks)

# Quality Guidelines
- Provide contextually appropriate completions
- Maintain consistency with the existing text style
- Consider the document flow and natural language patterns
- Prioritize brevity and relevance`;

const SYSTEM_WITH_CONTEXT_CACHED = `You are an intelligent inline autocomplete engine with contextual awareness.

# Core Instructions
- Output ONLY the minimal continuation of the user's text
- Use the provided context to make more relevant and appropriate suggestions
- Adapt to the specified document type, tone, language, and target audience
- Incorporate relevant keywords naturally when appropriate
- No introductions, explanations, or complete sentences
- No punctuation unless it is literally the next character needed
- Never add quotes, formatting, or trailing whitespace
- Stop at natural boundaries (spaces, punctuation, line breaks)

# Quality Guidelines
- Provide contextually appropriate completions
- Maintain consistency with the existing text style and context
- Consider the document flow and natural language patterns
- Prioritize brevity and relevance
- Ensure suggestions align with the specified tone and audience
- Use context information to improve completion accuracy`;

// Cache metrics interface for development monitoring
interface CacheMetrics {
  cacheHit?: boolean;
  cacheCreated?: boolean;
  inputTokens?: number;
  outputTokens?: number;
  ttft?: number; // Time to First Token in ms
}

function buildSystemPrompt(hasContext: boolean): string {
  return hasContext ? SYSTEM_WITH_CONTEXT_CACHED : SYSTEM_BASE_CACHED;
}

// Build cache-optimized prompt structure for Gemini implicit caching
function buildCacheOptimizedPrompt(left: string, context?: z.infer<typeof ContextSchema>): { system: string; user: string; cacheContext?: string } {
  const hasContext = !!context;
  const systemPrompt = buildSystemPrompt(hasContext);
  
  if (!hasContext) {
    return {
      system: systemPrompt,
      user: left
    };
  }
  
  // Build stable context block for caching - place immediately after system
  const sanitizedContext = context.userContext ? sanitizeContext(context.userContext) : '';
  const sanitizedKeywords = context.keywords && context.keywords.length > 0 
    ? context.keywords.map(keyword => sanitizeContext(keyword)).join(', ') 
    : 'none specified';
  
  const stableContextBlock = `
# Document Context Information
Document Type: ${context.documentType || 'unspecified'}
Language: ${context.language || 'unspecified'}
Tone: ${context.tone || 'unspecified'}
Target Audience: ${context.audience ? sanitizeContext(context.audience) : 'unspecified'}
Keywords: ${sanitizedKeywords}
Additional Context: ${sanitizedContext}

# Completion Task
Provide the next few words or characters to continue this text:`;
  
  return {
    system: systemPrompt,
    user: `${stableContextBlock}\n\n${left}`,
    cacheContext: stableContextBlock
  };
}

// Extract cache metrics from AI response metadata
function extractCacheMetrics(response: unknown): CacheMetrics {
  const metrics: CacheMetrics = {};
  
  try {
    // Type guard for response object
    if (typeof response === 'object' && response !== null) {
      const resp = response as Record<string, unknown>;
      
      // Check for Gemini-specific metadata
      if (resp.response && typeof resp.response === 'object' && resp.response !== null) {
        const geminiResponse = resp.response as Record<string, unknown>;
        
        if (geminiResponse.usageMetadata && typeof geminiResponse.usageMetadata === 'object' && geminiResponse.usageMetadata !== null) {
          const usage = geminiResponse.usageMetadata as Record<string, unknown>;
          if (typeof usage.promptTokenCount === 'number') {
            metrics.inputTokens = usage.promptTokenCount;
          }
          if (typeof usage.candidatesTokenCount === 'number') {
            metrics.outputTokens = usage.candidatesTokenCount;
          }
        }
        
        if (geminiResponse.metadata && typeof geminiResponse.metadata === 'object' && geminiResponse.metadata !== null) {
          const metadata = geminiResponse.metadata as Record<string, unknown>;
          metrics.cacheHit = Boolean(metadata.cacheHit);
          metrics.cacheCreated = Boolean(metadata.cacheCreated);
        }
      }
      
      // Extract timing information if available
      if (resp.timing && typeof resp.timing === 'object' && resp.timing !== null) {
        const timing = resp.timing as Record<string, unknown>;
        if (typeof timing.firstToken === 'number') {
          metrics.ttft = timing.firstToken;
        }
      }
    }
  } catch (error) {
    // Silently handle metadata extraction errors
    console.warn('Failed to extract cache metrics:', error);
  }
  
  return metrics;
}

// Legacy function kept for compatibility - now uses cache-optimized version
function buildContextPrompt(context: z.infer<typeof ContextSchema>): string {
  const optimized = buildCacheOptimizedPrompt('', context);
  return optimized.cacheContext || '';
}

const BOUNDARY = /[\s\n\r\t,.;:!?…，。？！、）\)\]\}\u2013\u2014·]/;

function computeConfidence(output: string, flags: { boundaryStop: boolean; truncatedByCharLimit: boolean; truncatedByTokenLimit: boolean; hasContext?: boolean }): number {
  if (!output || output.length === 0) return 0.0;
  let conf = 0.5; // base
  const len = output.length;
  if (len <= 8) {
    conf += 0.2; // short, crisp completions
    // Boost confidence for contextual completions ≤8 tokens
    if (flags.hasContext) conf += 0.05;
  } else if (len <= 16) {
    conf += 0.1;
  }
  if (flags.boundaryStop) conf += 0.1; // stopped cleanly at boundary
  if (flags.truncatedByCharLimit || flags.truncatedByTokenLimit) conf -= 0.2; // lower confidence when truncated
  conf = Math.max(0, Math.min(1, conf));
  return Number(conf.toFixed(2));
}

export async function POST(request: NextRequest) {
  try {
    // Basic input validation
    const body = await request.json();
    const validation = RequestSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', type: 'INVALID_INPUT' },
        { status: 400 }
      );
    }

    const { left, context } = validation.data;
    const hasContext = !!context;

    // AI completion with timeout - longer timeout for context-aware requests
    const controller = new AbortController();
    const timeoutDuration = hasContext ? 3000 : 500;
    const timeoutId = setTimeout(() => controller.abort(), timeoutDuration);

    try {
      // Use model from environment or default to spec's model
      const modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash-lite';
      
      // Build cache-optimized prompt structure
      const promptStructure = buildCacheOptimizedPrompt(left, context);
      const startTime = Date.now();
      
      const result = await streamText({
        model: google(modelName),
        system: promptStructure.system,
        prompt: promptStructure.user,
        temperature: 0.1,
        topP: 0.9,
        stopSequences: ['\n', ' ', '.', '?', '!'],
        maxRetries: 1,
        abortSignal: controller.signal,
      });

      // Extract stream and metadata for cache monitoring
      const { textStream } = result;
      const cacheMetrics = extractCacheMetrics(result);
      const ttft = cacheMetrics.ttft || (Date.now() - startTime);
      
      // Stream processing with boundary detection and token limiting
      let output = '';
      let boundaryStop = false;
      let truncatedByCharLimit = false;
      let truncatedByTokenLimit = false;
      const maxTokens = 8; // Hard limit to reduce compute time
      const maxChars = 32; // Character limit backup
      
      for await (const delta of textStream) {
        const potentialOutput = output + delta;
        
        // Check character limit first
        if (potentialOutput.length > maxChars) {
          // Only take what fits within the limit
          output = potentialOutput.slice(0, maxChars);
          truncatedByCharLimit = true;
          break;
        }
        
        // Check token limit (rough estimation: 4 chars per token)
        const tokenCount = Math.ceil(potentialOutput.length / 4);
        if (tokenCount >= maxTokens) {
          // Only take what fits within token limit
          const maxAllowedChars = maxTokens * 4;
          output = potentialOutput.slice(0, maxAllowedChars);
          truncatedByTokenLimit = true;
          break;
        }
        
        output = potentialOutput;
        
        // Check for boundary markers
        const boundaryMatch = output.match(BOUNDARY);
        if (boundaryMatch) {
          output = output.slice(0, boundaryMatch.index!);
          boundaryStop = true;
          break;
        }
      }

      // Clean output
      output = output.replace(/^\s+/, '').trimEnd();
      
      clearTimeout(timeoutId);
      
      // Development-only cache monitoring and logging
      const isDevelopment = process.env.NODE_ENV === 'development';
      let debugInfo = undefined;
      
      if (isDevelopment) {
        cacheMetrics.ttft = ttft;
        debugInfo = {
          cacheMetrics,
          promptStructure: {
            systemLength: promptStructure.system.length,
            userLength: promptStructure.user.length,
            hasCacheContext: !!promptStructure.cacheContext,
            cacheContextLength: promptStructure.cacheContext?.length || 0
          },
          timing: {
            requestStart: startTime,
            firstToken: ttft,
            totalTime: Date.now() - startTime
          }
        };
        
        // Log cache performance for development monitoring
        console.log('🚀 Cache Performance:', {
          cacheHit: cacheMetrics.cacheHit,
          ttft: `${ttft}ms`,
          contextSize: promptStructure.cacheContext?.length || 0,
          totalTokens: (cacheMetrics.inputTokens || 0) + (cacheMetrics.outputTokens || 0)
        });
      }
      
      const response: { tail: string; confidence: number; debug?: typeof debugInfo } = { 
        tail: output,
        confidence: computeConfidence(output, { boundaryStop, truncatedByCharLimit, truncatedByTokenLimit, hasContext })
      };
      
      // Add debug info only in development
      if (isDevelopment && debugInfo) {
        response.debug = debugInfo;
      }
      
      return NextResponse.json(response);
      
    } catch (aiError) {
      clearTimeout(timeoutId);
      
      if (controller.signal.aborted) {
        return NextResponse.json(
          { error: 'Request timeout', type: 'SERVICE_UNAVAILABLE' },
          { status: 408 }
        );
      }
      
      console.error('AI completion failed:', aiError);
      return NextResponse.json(
        { error: 'AI service unavailable', type: 'SERVICE_UNAVAILABLE' },
        { status: 503 }
      );
    }
    
  } catch (error) {
    console.error('API route error:', error);
    return NextResponse.json(
      { error: 'Internal server error', type: 'SERVICE_UNAVAILABLE' },
      { status: 500 }
    );
  }
}
