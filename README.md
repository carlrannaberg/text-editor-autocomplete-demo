# AI Autocomplete Demo

An AI-powered text editor with intelligent inline completion using Next.js, Tiptap, and Google Gemini. Features adaptive debouncing, confidence scoring, and smart caching for optimal user experience.

## Setup

### Environment Variables

Create a `.env.local` file in the root directory with the following:

```
GOOGLE_GENERATIVE_AI_API_KEY=your_api_key_here
# Optional: Override the default model (defaults to gemini-2.5-flash-lite)
# GEMINI_MODEL=gemini-2.5-flash
```

### Available Models

The implementation defaults to `gemini-2.5-flash-lite` for optimal speed (<200ms latency). You can override this with any supported model:

- `gemini-2.5-flash-lite` - Fastest, optimized for inline completions (default)
- `gemini-2.5-flash` - Fast with higher quality
- `gemini-2.5-pro` - Most capable but slower

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build

```bash
npm run build
```

### Test

```bash
npm test
```

## Features

### Core Functionality
- **AI-Powered Completions**: Real-time text suggestions using Google Gemini
- **Tab to Accept**: Press Tab to accept suggestions, Escape to dismiss
- **Smart Filtering**: Completions stop at natural boundaries (punctuation, whitespace)

### Performance Optimizations
- **Adaptive Debouncing**: 0ms delay at word boundaries, 120ms while typing
- **Token Limiting**: Max 8 tokens per completion for fast response times
- **LRU Cache**: Recently used completions with hit-based confidence boosting
- **Request Deduplication**: Prevents duplicate API calls for the same input

### User Experience
- **Confidence Scoring**: Visual opacity based on completion quality (0.25-0.60)
- **Intelligent Space Prefixing**: Automatically adds space after punctuation
- **CJK Support**: Handles Chinese, Japanese, and Korean text properly
- **Word Boundary Detection**: Smart detection of when to trigger completions

## Project Structure

```
├── app/                     # Next.js App Router
│   ├── api/complete/       # AI completion API endpoint
│   ├── globals.css         # Global styles
│   ├── layout.tsx          # Root layout
│   └── page.tsx            # Main editor page
├── lib/                    # Utility functions and types
│   ├── types.ts            # Type definitions
│   └── InlineComplete.ts   # Tiptap extension for AI completion
├── __tests__/              # Test suites
│   └── api/                # API endpoint tests
└── styles/                 # Additional stylesheets
    └── editor.css          # Editor and ghost text styling
```

## Dependencies

### Core Dependencies
- **next**: ^14.0.0 - React framework with App Router
- **ai**: ^5.0.0 - AI SDK for text completion
- **@ai-sdk/google**: ^1.0.0 - Google AI integration
- **@tiptap/react**: ^2.0.0 - Rich text editor
- **@tiptap/starter-kit**: ^2.0.0 - Essential Tiptap extensions
- **zod**: ^3.22.0 - Schema validation

### Development Dependencies
- **typescript**: ^5.0.0 - Type checking
- **@types/react**: ^18.0.0 - React type definitions
- **@types/node**: ^20.0.0 - Node.js type definitions
- **jest**: ^29.0.0 - Testing framework
- **@testing-library/react**: ^14.0.0 - React testing utilities

## Deployment

### Deploy to Vercel

1. Install Vercel CLI:
```bash
npm install -g vercel
```

2. Deploy the application:
```bash
vercel
```

3. Add your API key as an environment variable:
```bash
vercel env add GOOGLE_GENERATIVE_AI_API_KEY production
```

4. Redeploy with the environment variable:
```bash
vercel --prod
```

## Configuration

The autocomplete extension accepts several configuration options:

```typescript
{
  debounceMs: 120,           // Debounce delay in milliseconds
  maxPrefixLength: 1000,     // Maximum text length to send for completion
  enabled: true,             // Enable/disable completions
  acceptRightArrow: false    // Whether right arrow accepts suggestions
}
```

## Research & Implementation

For detailed research on AI autocomplete approaches, confidence calculation methods, and implementation strategies, see [ai_autocomplete_research.md](ai_autocomplete_research.md).