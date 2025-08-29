// app/api/complete/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { streamText } from 'ai';
import { google } from '@ai-sdk/google';
import { z } from 'zod';

// Basic input validation for demo
const RequestSchema = z.object({
  left: z.string().min(1).max(1000) // Simplified validation
});

// System prompt and boundary detection
const SYSTEM = `You are an inline autocomplete engine.
- Output ONLY the minimal continuation of the user's text.
- No introductions, no sentences, no punctuation unless it is literally the next character.
- Never add quotes/formatting; no trailing whitespace.`;

const BOUNDARY = /[\s\n\r\t,.;:!?…，。？！、）\)\]\}\u2013\u2014·]/;

function computeConfidence(output: string, flags: { boundaryStop: boolean; truncatedByCharLimit: boolean; truncatedByTokenLimit: boolean }): number {
  if (!output || output.length === 0) return 0.0;
  let conf = 0.5; // base
  const len = output.length;
  if (len <= 8) conf += 0.2; // short, crisp completions
  else if (len <= 16) conf += 0.1;
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

    const { left } = validation.data;

    // AI completion with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 500);

    try {
      // Use model from environment or default to spec's model
      const modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash-lite';
      
      const { textStream } = await streamText({
        model: google(modelName),
        system: SYSTEM,
        prompt: left,
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
        confidence: computeConfidence(output, { boundaryStop, truncatedByCharLimit, truncatedByTokenLimit })
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
