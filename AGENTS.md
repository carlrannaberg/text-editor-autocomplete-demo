# AGENTS.md
This file provides guidance to AI coding assistants working in this repository.

**Note:** CLAUDE.md, .clinerules, .cursorrules, .windsurfrules, and other AI config files are symlinks to AGENTS.md in this project.

# AI Autocomplete Demo

A sophisticated text editor application demonstrating real-time AI-powered autocomplete functionality using Next.js 14, Tiptap, and Google AI (Gemini).

## Architecture Overview

- **Frontend**: React with Tiptap (ProseMirror-based) rich text editor
- **API**: Next.js API routes streaming completions from Google AI
- **AI Model**: Gemini 2.5 Flash-Lite (optimized for <200ms latency)
- **State Management**: Custom ProseMirror plugin with caching and request management
- **Styling**: Tailwind CSS with professional editor theming

## Build & Commands

**CRITICAL**: Use these EXACT script names from package.json:

### Development
- **Start dev server**: `npm run dev`
- **Build production**: `npm run build`
- **Start production**: `npm run start`

### Testing
- **Run tests**: `npm test`
- **Watch mode**: `npm run test:watch`
- **Coverage report**: `npm run test:coverage`
- **CI testing**: `npm run test:ci`

### Code Quality
- **Lint**: `npm run lint`
- **Type check**: `npx tsc --noEmit` (not in scripts, use directly)

### Script Command Consistency
When modifying npm scripts in package.json, ensure all references are updated:
- GitHub Actions workflows (.github/workflows/*.yml)
- README.md documentation
- Test files and mocks
- This AGENTS.md file

## Code Style

### TypeScript Configuration
- **Strict mode** enabled with additional safety:
  - `noImplicitReturns: true`
  - `noUncheckedIndexedAccess: true`
  - `exactOptionalPropertyTypes: true`
- **Path aliases**: `@/*` maps to root directory
- **Module resolution**: `bundler` for Next.js 14

### Import Conventions
```typescript
// 1. React/Next.js imports
import React from 'react';
import { NextRequest, NextResponse } from 'next/server';

// 2. Third-party libraries
import { streamText } from 'ai';
import { google } from '@ai-sdk/google';

// 3. Local imports with @ alias
import { InlineComplete } from '@/lib/InlineComplete';
import { ApiResponse } from '@/lib/types';
```

### Naming Conventions
- **Components**: PascalCase (`AutocompleteEditor`, `MenuBar`)
- **Utilities/Functions**: camelCase (`scheduleCompletion`, `fetchTail`)
- **Types/Interfaces**: PascalCase with descriptive names (`InlineCompleteOptions`)
- **Constants**: UPPER_SNAKE_CASE (`BOUNDARY`, `SYSTEM`)
- **Files**: Component files in PascalCase, utilities in camelCase

### Error Handling Patterns
```typescript
// Use discriminated unions for API responses
type ApiResponse = 
  | { success: true; data: CompletionResponse }
  | { success: false; error: CompletionError };

// Proper error boundaries for React components
class AutocompleteErrorBoundary extends React.Component {
  // Handle errors gracefully with user feedback
}

// AbortController for request cancellation
const controller = new AbortController();
```

### Best Practices
- **Functional components** with hooks (no class components except error boundaries)
- **Immutable state updates** throughout
- **Resource cleanup** in useEffect and component lifecycle
- **Type safety** for all props, API contracts, and function parameters
- **No `any` types** - use proper typing or `unknown` with type guards

## Testing

### Framework & Tools
- **Test Runner**: Jest v29+
- **React Testing**: @testing-library/react v14+
- **DOM Matchers**: @testing-library/jest-dom v6+
- **User Events**: @testing-library/user-event v14+
- **Environment**: jest-environment-jsdom v30+

### Testing Patterns
```typescript
// Component testing with user-centric approach
test('should accept autocomplete suggestion on Tab', async () => {
  const user = userEvent.setup();
  render(<AutocompleteEditor />);
  
  // Simulate user typing
  await user.type(editor, 'Hello');
  
  // Verify suggestion appears
  expect(screen.getByText('world')).toBeInTheDocument();
  
  // Accept with Tab
  await user.keyboard('{Tab}');
  expect(editor).toHaveTextContent('Hello world');
});
```

### Test File Patterns
- Unit tests: `__tests__/**/*.test.ts(x)`
- Component tests: `__tests__/components/*.test.tsx`
- API tests: `__tests__/api/*.test.ts`

### Running Tests
```bash
# Run all tests
npm test

# Run specific test file
npm test -- AutocompleteEditor.test.tsx

# Run with coverage
npm run test:coverage

# Watch mode for development
npm run test:watch
```

### Testing Philosophy
**When tests fail, fix the code, not the test.**

Key principles:
- **Tests should be meaningful** - Avoid tests that always pass
- **Test actual functionality** - Call real functions, not just side effects
- **Failing tests are valuable** - They reveal bugs or missing features
- **Fix the root cause** - When a test fails, fix the underlying issue
- **Test edge cases** - Tests that reveal limitations help improve code
- **Document test purpose** - Each test should explain what it validates

## Security

### API Security
- **Input validation**: Zod schemas for all API inputs
- **Rate limiting**: Consider implementing rate limiting for production
- **Request timeouts**: 500ms timeout on AI requests
- **AbortController**: Proper request cancellation

### Environment Variables
```bash
# Required in .env.local
GOOGLE_GENERATIVE_AI_API_KEY=your-api-key

# Optional
GEMINI_MODEL=gemini-2.5-flash-lite
```

### Data Protection
- No user data persistence
- Client-side caching only (LRU with size limits)
- No sensitive data in logs
- Secure API key handling

## Directory Structure & File Organization

```
text-editor-autocomplete-demo/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   │   └── complete/      # Autocomplete endpoint
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Main editor page
├── lib/                   # Core libraries
│   ├── InlineComplete.ts  # Tiptap extension
│   └── types.ts          # TypeScript definitions
├── __tests__/            # Test files
│   ├── api/             # API tests
│   ├── components/      # Component tests
│   └── lib/            # Library tests
├── reports/             # All project reports
│   └── *.md            # Various report types
├── temp/               # Temporary files (gitignored)
└── .claude/           # Claude Code configuration
    ├── agents/        # Specialized AI agents
    └── settings.json  # Team settings
```

### Reports Directory
ALL project reports and documentation should be saved to the `reports/` directory:

**Implementation Reports:**
- Phase validation: `PHASE_X_VALIDATION_REPORT.md`
- Implementation summaries: `IMPLEMENTATION_SUMMARY_[FEATURE].md`
- Feature completion: `FEATURE_[NAME]_REPORT.md`

**Testing & Analysis Reports:**
- Test results: `TEST_RESULTS_[DATE].md`
- Coverage reports: `COVERAGE_REPORT_[DATE].md`
- Performance analysis: `PERFORMANCE_ANALYSIS_[SCENARIO].md`

**Report Naming Conventions:**
- Use descriptive names: `[TYPE]_[SCOPE]_[DATE].md`
- Include dates: `YYYY-MM-DD` format
- Group with prefixes: `TEST_`, `PERFORMANCE_`, `SECURITY_`
- Markdown format: All reports end in `.md`

### Temporary Files & Debugging
All temporary files should go in `/temp`:
- Debug scripts: `temp/debug-*.js`
- Test artifacts: `temp/test-results/`
- Generated files: `temp/generated/`
- Logs: `temp/logs/*.log`

**Guidelines:**
- Never commit files from `/temp`
- Include `/temp/` in `.gitignore`
- Clean up regularly

### Claude Code Settings (.claude Directory)

#### Version Controlled Files (commit these):
- `.claude/settings.json` - Shared team settings
- `.claude/agents/*.md` - Specialized AI agents

#### Ignored Files (do NOT commit):
- `.claude/settings.local.json` - Personal preferences

## Configuration

### Development Setup
```bash
# Install dependencies
npm install

# Set up environment
cp .env.example .env.local
# Add your GOOGLE_GENERATIVE_AI_API_KEY

# Start development
npm run dev
```

### Required Dependencies
- Node.js 18+
- npm or yarn
- Google AI API key

### Key Configuration Files
- `tsconfig.json` - TypeScript configuration
- `next.config.js` - Next.js configuration
- `tailwind.config.ts` - Tailwind CSS configuration
- `jest.config.js` - Jest test configuration
- `.env.local` - Environment variables (not committed)

## Agent Delegation & Tool Execution

### ⚠️ MANDATORY: Always Delegate to Specialists & Execute in Parallel

**When specialized agents are available, you MUST use them instead of attempting tasks yourself.**

**When performing multiple operations, send all tool calls in a single message to execute them concurrently.**

### Available Specialized Agents

This repository includes 32 specialized AI agents. Key agents for this project:

#### Most Relevant to This Project:
- **`ai-sdk-expert`** - Vercel AI SDK v5 specialist (CRITICAL for this project)
- **`react-expert`** - React patterns and performance
- **`framework-nextjs-expert`** - Next.js App Router optimization
- **`typescript-expert`** - Type safety and advanced patterns
- **`oracle`** - Advanced debugging and architectural reviews

#### Frontend Development:
- **`react-performance-expert`** - React optimization
- **`frontend-accessibility-expert`** - A11y compliance
- **`frontend-css-styling-expert`** - CSS and Tailwind

#### Testing & Quality:
- **`jest-testing-expert`** - Jest testing patterns
- **`testing-expert`** - General testing strategies
- **`code-review-expert`** - Systematic code review
- **`refactoring-expert`** - Safe code refactoring

#### Development Tools:
- **`typescript-type-expert`** - Advanced type system
- **`typescript-build-expert`** - Build optimization
- **`code-quality-linting-expert`** - Code quality
- **`git-expert`** - Git workflows

#### Backend & Infrastructure:
- **`nodejs-expert`** - Node.js optimization
- **`docker-expert`** - Containerization
- **`github-actions-expert`** - CI/CD automation

### Using Agents Effectively

```bash
# Example: Delegate AI SDK issues to specialist
Task: "Fix streaming issue" -> Delegate to ai-sdk-expert

# Example: Performance optimization
Task: "Optimize React rendering" -> Delegate to react-performance-expert

# Example: Multiple parallel delegations
Task: "Review code quality and test coverage"
-> Delegate to code-review-expert AND jest-testing-expert in parallel
```

### Critical: Always Use Parallel Tool Calls

**Send all tool calls in a single message for parallel execution.**

**Good (Parallel):**
```
[Single message with multiple tool calls]
- Grep for "InlineComplete"
- Glob for "*.test.ts"
- Read package.json
- Task to ai-sdk-expert
```

**Bad (Sequential):**
```
[Message 1] Grep for "InlineComplete"
[Wait for result]
[Message 2] Glob for "*.test.ts"
[Wait for result]
...
```

### Performance Impact
Parallel execution is 3-5x faster than sequential calls. This is not optional—it's required.

## Git Commit Conventions

Based on project history, use conventional commits:

### Format
```
type: description

[optional body]

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

### Types
- `feat`: New features
- `fix`: Bug fixes
- `perf`: Performance improvements
- `refactor`: Code refactoring
- `test`: Test additions/changes
- `docs`: Documentation updates
- `chore`: Maintenance tasks

### Examples from Project
- `feat: add comprehensive MenuBar and fix CSS architecture`
- `fix: replace production placeholder with proper error message`
- `perf: optimize autocomplete with adaptive debounce and token limiting`
- `refactor: eliminate MenuBar code duplication with reusable components`

## Quick Reference

### Common Tasks
```bash
# Start development
npm run dev

# Run tests
npm test

# Type check
npx tsc --noEmit

# Lint code
npm run lint

# Build for production
npm run build
```

### Key Files
- Main editor: `/app/page.tsx`
- Autocomplete logic: `/lib/InlineComplete.ts`
- API endpoint: `/app/api/complete/route.ts`
- Type definitions: `/lib/types.ts`
- Tests: `/__tests__/`

### Environment Variables
```bash
# Required
GOOGLE_GENERATIVE_AI_API_KEY=your-key

# Optional
GEMINI_MODEL=gemini-2.5-flash-lite
```

### Performance Targets
- Autocomplete latency: <200ms
- Debounce: 0ms at word boundaries, 120ms otherwise
- Token limit: 8 tokens max
- Character limit: 32 chars max

## Project-Specific Notes

### Autocomplete Implementation Details
- Uses Tiptap extension with ProseMirror plugin
- Ghost text rendering via decorations
- Keyboard shortcuts: Tab (accept), Esc (dismiss)
- LRU cache with 50-item limit
- AbortController for request cancellation
- Adaptive debounce based on typing patterns

### AI Integration
- Model: Gemini 2.5 Flash-Lite
- Stop sequences: `['\n', ' ', '.', '?', '!']` (5 max for Gemini)
- Temperature: 0.1 (deterministic)
- Top-p: 0.9
- Streaming enabled for real-time response

### Known Limitations
- Gemini API: Maximum 5 stop sequences
- Character limit: 32 chars for performance
- Token estimation: ~4 chars per token (approximate)