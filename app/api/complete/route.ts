// app/api/complete/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { streamText } from 'ai';
import { google } from '@ai-sdk/google';
import { z } from 'zod';

// Input validation with optional context
const ContextSchema = z.object({
  userContext: z.string().max(20000).optional(),
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

// System prompts
const SYSTEM_BASE = `You are an inline autocomplete engine.
- Output ONLY the minimal continuation of the user's text.
- No introductions, no sentences, no punctuation unless it is literally the next character.
- Never add quotes/formatting; no trailing whitespace.`;

const SYSTEM_WITH_CONTEXT = `You are an intelligent inline autocomplete engine with contextual awareness.
- Output ONLY the minimal continuation of the user's text.
- Use the provided context to make more relevant and appropriate suggestions.
- Adapt to the specified document type, tone, language, and target audience.
- Incorporate relevant keywords naturally when appropriate.
- No introductions, no sentences, no punctuation unless it is literally the next character.
- Never add quotes/formatting; no trailing whitespace.`;

function buildSystemPrompt(hasContext: boolean): string {
  return hasContext ? SYSTEM_WITH_CONTEXT : SYSTEM_BASE;
}

function buildContextPrompt(context: z.infer<typeof ContextSchema>): string {
  const sanitizedContext = context.userContext ? sanitizeContext(context.userContext) : '';
  const sanitizedKeywords = context.keywords && context.keywords.length > 0 
    ? context.keywords.map(keyword => sanitizeContext(keyword)).join(', ') 
    : 'none specified';
  
  return `Context Information:
- Document Type: ${context.documentType || 'unspecified'}
- Language: ${context.language || 'unspecified'}
- Tone: ${context.tone || 'unspecified'}
- Target Audience: ${context.audience ? sanitizeContext(context.audience) : 'unspecified'}
- Keywords: ${sanitizedKeywords}
- Additional Context: ${sanitizedContext}

Text to complete:`;
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
      
      // Build prompt based on whether context is provided
      const systemPrompt = buildSystemPrompt(hasContext);
      const userPrompt = hasContext ? `${buildContextPrompt(context!)}\n${left}` : left;
      
      const { textStream } = await streamText({
        model: google(modelName),
        system: systemPrompt,
        prompt: userPrompt,
        temperature: 0.1,
        topP: 0.9,
        stopSequences: ['\n', ' ', '.', '?', '!'],
        maxRetries: 1,
        abortSignal: controller.signal,
      });

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
      
      return NextResponse.json({ 
        tail: output,
        confidence: computeConfidence(output, { boundaryStop, truncatedByCharLimit, truncatedByTokenLimit, hasContext })
      });
      
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
