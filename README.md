# AI Autocomplete Demo

An AI-powered text editor with inline completion using Next.js, Tiptap, and Google AI.

## Setup

### Environment Variables

Create a `.env.local` file in the root directory with the following:

```
GOOGLE_AI_API_KEY=your_api_key_here
```

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
└── styles/                 # Additional stylesheets
    └── globals.css         # Ghost text styling
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