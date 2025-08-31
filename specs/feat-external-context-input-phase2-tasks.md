# Task Breakdown: External Context Input Phase 2 - Enhanced UX and Performance

Generated: 2025-08-30  
Source: specs/feat-external-context-input.md  
Phase: 2 - Enhanced UX and Performance (Polish)

## Overview

Phase 2 focuses on polishing the basic context functionality from Phase 1 with structured hint selectors, client-side token counting, accessibility features, and caching optimizations. This phase transforms the basic textarea context input into a professional, full-featured UI with comprehensive user experience enhancements.

## Phase 2 Success Criteria
- Full UI feature set with professional polish
- Token counting accuracy within 10% of server count
- Accessibility compliance (WCAG 2.1 AA)
- TTFT improvements visible with cache hits
- Enhanced error handling and user feedback

## Implementation Tasks

---

### Task 2.1: Add Structured Hint Selectors to ContextPanel
**Description**: Enhance ContextPanel with document type, tone, language, and audience selectors
**Size**: Large  
**Priority**: High  
**Dependencies**: Phase 1 completed  
**Can run parallel with**: Task 2.2

**Technical Requirements**:
Extend the existing ContextPanel component with structured hint selectors as specified in the design.

**Updated ContextPanelState Interface**:
```typescript
interface ContextPanelState {
  contextText: string;
  documentType: DocumentType;
  language: Language;
  tone: Tone;
  audience: string;
  keywords: string[];
  isCollapsed: boolean;
}

type DocumentType = 'email' | 'article' | 'note' | 'other';
type Language = 'en' | 'es' | 'fr' | 'de';
type Tone = 'neutral' | 'formal' | 'casual' | 'persuasive';
```

**Enhanced ContextPanel Implementation**:
```typescript
export const ContextPanel: React.FC<ContextPanelProps> = ({
  isCollapsed = false,
  onToggleCollapse
}) => {
  const { 
    contextText, 
    documentType, 
    language, 
    tone, 
    audience, 
    keywords,
    updateContext, 
    clearContext, 
    getTokenCount 
  } = useCompletionContext();

  // ... existing state and handlers ...

  const handleDocumentTypeChange = useCallback((type: DocumentType) => {
    updateContext({ documentType: type });
  }, [updateContext]);

  const handleLanguageChange = useCallback((lang: Language) => {
    updateContext({ language: lang });
  }, [updateContext]);

  const handleToneChange = useCallback((toneValue: Tone) => {
    updateContext({ tone: toneValue });
  }, [updateContext]);

  const handleAudienceChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    updateContext({ audience: e.target.value });
  }, [updateContext]);

  const handleKeywordsChange = useCallback((newKeywords: string[]) => {
    updateContext({ keywords: newKeywords });
  }, [updateContext]);

  return (
    <>
      <div className="context-panel border border-gray-200 rounded-lg mb-4 bg-white shadow-sm">
        {/* Existing header */}
        <div className="flex items-center justify-between p-3 border-b border-gray-200 bg-gray-50">
          <h3 className="text-sm font-medium text-gray-700">Document Context</h3>
          <div className="flex items-center gap-3">
            <span 
              className="text-xs text-gray-500"
              aria-live="polite"
              aria-label={`Token count: ${tokenCount}`}
            >
              {tokenCount} tokens
            </span>
            <button
              onClick={handleClearClick}
              disabled={!contextText || !contextText.trim()}
              className="text-xs text-gray-500 hover:text-red-600 transition-colors disabled:text-gray-400 disabled:hover:text-gray-400 disabled:cursor-not-allowed"
              title={contextText && contextText.trim() ? 'Clear context' : 'No context to clear'}
              aria-label="Clear context"
            >
              Clear
            </button>
            <button
              onClick={handleToggleCollapse}
              className="text-xs text-gray-500 hover:text-gray-700 transition-colors p-1 -m-1"
              title={localCollapsed ? 'Expand panel' : 'Collapse panel'}
              aria-label={localCollapsed ? 'Expand panel' : 'Collapse panel'}
              aria-expanded={!localCollapsed}
            >
              <span className="inline-block transform transition-transform duration-200" style={{
                transform: localCollapsed ? 'rotate(0deg)' : 'rotate(180deg)'
              }}>
                ↓
              </span>
            </button>
          </div>
        </div>
        
        {!localCollapsed && (
          <div className="p-4 space-y-4">
            {/* Context textarea - existing */}
            <div>
              <label htmlFor="context-text" className="block text-sm font-medium text-gray-700 mb-2">
                Additional Context
              </label>
              <textarea
                id="context-text"
                value={contextText || ''}
                onChange={handleTextChange}
                placeholder="Describe your document context (optional)..."
                className="w-full min-h-[80px] max-h-[200px] p-3 border border-gray-300 rounded-md resize-vertical focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
                rows={3}
                aria-describedby="context-help context-token-count"
              />
              <div id="context-help" className="text-xs text-gray-500 mt-2">
                Provide additional context to help the AI understand your writing goals.
                This information stays private and is not saved on our servers.
              </div>
            </div>

            {/* Structured hints section */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Document Type Selector */}
              <div>
                <label htmlFor="document-type" className="block text-sm font-medium text-gray-700 mb-1">
                  Document Type
                </label>
                <select
                  id="document-type"
                  value={documentType || ''}
                  onChange={(e) => handleDocumentTypeChange(e.target.value as DocumentType)}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
                  aria-describedby="document-type-help"
                >
                  <option value="">Select type...</option>
                  <option value="email">Email</option>
                  <option value="article">Article</option>
                  <option value="note">Note</option>
                  <option value="other">Other</option>
                </select>
                <div id="document-type-help" className="text-xs text-gray-500 mt-1">
                  Choose the type of document you're writing
                </div>
              </div>

              {/* Language Selector */}
              <div>
                <label htmlFor="language" className="block text-sm font-medium text-gray-700 mb-1">
                  Language
                </label>
                <select
                  id="language"
                  value={language || ''}
                  onChange={(e) => handleLanguageChange(e.target.value as Language)}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
                  aria-describedby="language-help"
                >
                  <option value="">Select language...</option>
                  <option value="en">English</option>
                  <option value="es">Spanish</option>
                  <option value="fr">French</option>
                  <option value="de">German</option>
                </select>
                <div id="language-help" className="text-xs text-gray-500 mt-1">
                  Primary language for suggestions
                </div>
              </div>

              {/* Tone Selector */}
              <div>
                <label htmlFor="tone" className="block text-sm font-medium text-gray-700 mb-1">
                  Tone
                </label>
                <select
                  id="tone"
                  value={tone || ''}
                  onChange={(e) => handleToneChange(e.target.value as Tone)}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
                  aria-describedby="tone-help"
                >
                  <option value="">Select tone...</option>
                  <option value="neutral">Neutral</option>
                  <option value="formal">Formal</option>
                  <option value="casual">Casual</option>
                  <option value="persuasive">Persuasive</option>
                </select>
                <div id="tone-help" className="text-xs text-gray-500 mt-1">
                  Desired writing tone
                </div>
              </div>

              {/* Audience Input */}
              <div>
                <label htmlFor="audience" className="block text-sm font-medium text-gray-700 mb-1">
                  Target Audience
                </label>
                <input
                  id="audience"
                  type="text"
                  value={audience || ''}
                  onChange={handleAudienceChange}
                  placeholder="e.g., developers, clients..."
                  maxLength={64}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
                  aria-describedby="audience-help"
                />
                <div id="audience-help" className="text-xs text-gray-500 mt-1">
                  Who you're writing for (max 64 chars)
                </div>
              </div>
            </div>

            {/* Keywords Section */}
            <KeywordsInput
              keywords={keywords || []}
              onChange={handleKeywordsChange}
              maxKeywords={10}
              maxLength={32}
            />
          </div>
        )}
      </div>

      {/* Existing confirmation dialog */}
      {showConfirmDialog && (
        // ... existing confirmation dialog ...
      )}
    </>
  );
};
```

**KeywordsInput Component**:
```typescript
interface KeywordsInputProps {
  keywords: string[];
  onChange: (keywords: string[]) => void;
  maxKeywords?: number;
  maxLength?: number;
}

const KeywordsInput: React.FC<KeywordsInputProps> = ({
  keywords,
  onChange,
  maxKeywords = 10,
  maxLength = 32
}) => {
  const [inputValue, setInputValue] = useState('');

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',' || e.key === ' ') {
      e.preventDefault();
      addKeyword();
    } else if (e.key === 'Backspace' && !inputValue && keywords.length > 0) {
      removeKeyword(keywords.length - 1);
    }
  };

  const addKeyword = () => {
    const keyword = inputValue.trim();
    if (keyword && 
        keyword.length <= maxLength && 
        keywords.length < maxKeywords && 
        !keywords.includes(keyword)) {
      onChange([...keywords, keyword]);
      setInputValue('');
    }
  };

  const removeKeyword = (index: number) => {
    const newKeywords = keywords.filter((_, i) => i !== index);
    onChange(newKeywords);
  };

  return (
    <div>
      <label htmlFor="keywords-input" className="block text-sm font-medium text-gray-700 mb-2">
        Keywords ({keywords.length}/{maxKeywords})
      </label>
      <div className="flex flex-wrap gap-2 p-2 border border-gray-300 rounded-md min-h-[2.5rem] focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500">
        {keywords.map((keyword, index) => (
          <span
            key={index}
            className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-md"
          >
            {keyword}
            <button
              onClick={() => removeKeyword(index)}
              className="text-blue-600 hover:text-blue-800 focus:outline-none"
              aria-label={`Remove keyword: ${keyword}`}
            >
              ×
            </button>
          </span>
        ))}
        {keywords.length < maxKeywords && (
          <input
            id="keywords-input"
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={addKeyword}
            placeholder={keywords.length === 0 ? "Enter keywords..." : ""}
            maxLength={maxLength}
            className="flex-1 min-w-[100px] outline-none bg-transparent"
            aria-describedby="keywords-help"
          />
        )}
      </div>
      <div id="keywords-help" className="text-xs text-gray-500 mt-1">
        Press Enter, comma, or space to add keywords (max {maxLength} chars each)
      </div>
    </div>
  );
};
```

**Acceptance Criteria**:
- [ ] Document type selector with 4 options (email, article, note, other)
- [ ] Language selector with 4 options (en, es, fr, de) 
- [ ] Tone selector with 4 options (neutral, formal, casual, persuasive)
- [ ] Target audience text input with 64 character limit
- [ ] Keywords input supporting up to 10 keywords, max 32 chars each
- [ ] Keyword chips with remove functionality
- [ ] Keyboard shortcuts for keyword entry (Enter, comma, space)
- [ ] All form inputs update context state immediately
- [ ] Responsive grid layout works on mobile/tablet/desktop
- [ ] All inputs have proper labels and ARIA attributes
- [ ] Form validation prevents oversized inputs
- [ ] Visual feedback for character/keyword limits

---

### Task 2.2: Implement Client-Side Token Counting with Warnings
**Description**: Add precise token counting with color-coded warnings and token budget management
**Size**: Medium  
**Priority**: High  
**Dependencies**: Task 2.1 (uses enhanced context structure)  
**Can run parallel with**: Task 2.3

**Technical Requirements**:
Replace the basic character-based token estimation with more accurate token counting and add user feedback.

**Enhanced Token Counting Implementation**:
```typescript
// lib/tokenizer.ts - New file for token counting utilities

import { encode } from 'gpt3-tokenizer';

/**
 * More accurate token counting using gpt3-tokenizer
 * Falls back to character-based estimation if tokenizer fails
 */
export function getTokenCount(text: string): number {
  try {
    return encode(text).length;
  } catch (error) {
    console.warn('Token counting failed, using fallback:', error);
    // Fallback: ~4 characters per token
    return Math.ceil(text.length / 4);
  }
}

/**
 * Calculate token count for complete context object
 */
export function getContextTokenCount(context: CompletionContextState): number {
  const contextString = JSON.stringify({
    userContext: context.contextText || '',
    documentType: context.documentType || '',
    language: context.language || '',
    tone: context.tone || '',
    audience: context.audience || '',
    keywords: (context.keywords || []).join(', ')
  });
  
  return getTokenCount(contextString);
}

/**
 * Get token count warning level
 */
export type TokenWarningLevel = 'safe' | 'warning' | 'danger' | 'error';

export function getTokenWarningLevel(tokenCount: number): TokenWarningLevel {
  if (tokenCount >= 20000) return 'error';   // At/over limit
  if (tokenCount >= 18000) return 'danger';  // Red warning
  if (tokenCount >= 15000) return 'warning'; // Yellow warning
  return 'safe';                             // Green, under 15k
}

/**
 * Get display color class for token count
 */
export function getTokenCountColorClass(level: TokenWarningLevel): string {
  switch (level) {
    case 'safe': return 'text-green-600';
    case 'warning': return 'text-yellow-600'; 
    case 'danger': return 'text-red-600';
    case 'error': return 'text-red-800 font-semibold';
  }
}

/**
 * Get user-friendly warning message
 */
export function getTokenWarningMessage(level: TokenWarningLevel, count: number): string | null {
  switch (level) {
    case 'warning': return `Approaching token limit (${count.toLocaleString()}/20,000)`;
    case 'danger': return `Very close to token limit (${count.toLocaleString()}/20,000)`;
    case 'error': return `Context too large! Please reduce content (${count.toLocaleString()}/20,000)`;
    default: return null;
  }
}
```

**Enhanced CompletionContext with Token Counting**:
```typescript
// lib/context/CompletionContext.tsx - Updates to existing file

import { getContextTokenCount, getTokenWarningLevel, TokenWarningLevel } from '@/lib/tokenizer';

// Add to CompletionContextValue interface
export interface CompletionContextValue extends CompletionContextState {
  // ... existing methods ...
  getTokenCount: () => number;
  getTokenWarningLevel: () => TokenWarningLevel;
  isWithinTokenLimit: () => boolean;
}

// Update provider implementation
export const CompletionContextProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // ... existing state ...

  const getTokenCount = useCallback(() => {
    return getContextTokenCount(context);
  }, [context]);

  const getTokenWarningLevel = useCallback(() => {
    const count = getContextTokenCount(context);
    return getTokenWarningLevel(count);
  }, [context]);

  const isWithinTokenLimit = useCallback(() => {
    const count = getContextTokenCount(context);
    return count < 20000;
  }, [context]);

  const value: CompletionContextValue = {
    ...context,
    updateContext,
    clearContext,
    getContextHash,
    getTokenCount,
    getTokenWarningLevel,
    isWithinTokenLimit
  };

  // ... rest of implementation
};
```

**Enhanced ContextPanel with Token Warnings**:
```typescript
// components/ContextPanel.tsx - Updates to existing component

import { 
  getTokenCountColorClass, 
  getTokenWarningMessage, 
  TokenWarningLevel 
} from '@/lib/tokenizer';

export const ContextPanel: React.FC<ContextPanelProps> = ({ ... }) => {
  const { 
    // ... existing context values ...
    getTokenCount, 
    getTokenWarningLevel, 
    isWithinTokenLimit 
  } = useCompletionContext();

  const tokenCount = getTokenCount();
  const warningLevel = getTokenWarningLevel();
  const warningMessage = getTokenWarningMessage(warningLevel, tokenCount);

  return (
    <>
      <div className="context-panel border border-gray-200 rounded-lg mb-4 bg-white shadow-sm">
        <div className="flex items-center justify-between p-3 border-b border-gray-200 bg-gray-50">
          <h3 className="text-sm font-medium text-gray-700">Document Context</h3>
          <div className="flex items-center gap-3">
            {/* Enhanced token count display */}
            <div className="flex items-center gap-2">
              <span 
                className={`text-xs font-medium ${getTokenCountColorClass(warningLevel)}`}
                aria-live="polite"
                aria-label={`Token count: ${tokenCount.toLocaleString()} of 20,000`}
              >
                {tokenCount.toLocaleString()} tokens
              </span>
              
              {/* Token limit progress bar */}
              <div className="w-16 h-1 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-200 ${
                    warningLevel === 'error' ? 'bg-red-600' :
                    warningLevel === 'danger' ? 'bg-red-500' :
                    warningLevel === 'warning' ? 'bg-yellow-500' :
                    'bg-green-500'
                  }`}
                  style={{ width: `${Math.min(100, (tokenCount / 20000) * 100)}%` }}
                />
              </div>
            </div>

            {/* Warning icon for high token counts */}
            {warningLevel !== 'safe' && (
              <span 
                className={`text-xs ${getTokenCountColorClass(warningLevel)}`}
                title={warningMessage || ''}
                aria-label={warningMessage || ''}
              >
                {warningLevel === 'error' ? '⚠️' : '⚡'}
              </span>
            )}

            {/* ... existing clear and collapse buttons ... */}
          </div>
        </div>
        
        {/* Warning message banner */}
        {warningMessage && (
          <div className={`px-3 py-2 text-xs border-b ${
            warningLevel === 'error' ? 'bg-red-50 text-red-800 border-red-200' :
            warningLevel === 'danger' ? 'bg-red-50 text-red-700 border-red-200' :
            'bg-yellow-50 text-yellow-700 border-yellow-200'
          }`}>
            <div className="flex items-center gap-2">
              <span>{warningLevel === 'error' ? '⚠️' : '💡'}</span>
              <span>{warningMessage}</span>
            </div>
          </div>
        )}
        
        {/* ... rest of component implementation ... */}
      </div>
    </>
  );
};
```

**Real-time Token Monitoring Hook**:
```typescript
// lib/hooks/useTokenMonitoring.ts - New file

import { useEffect, useRef } from 'react';
import { useCompletionContext } from '@/lib/context/CompletionContext';
import { TokenWarningLevel } from '@/lib/tokenizer';

export function useTokenMonitoring() {
  const { getTokenCount, getTokenWarningLevel } = useCompletionContext();
  const previousLevel = useRef<TokenWarningLevel>('safe');
  const announcedWarnings = useRef(new Set<TokenWarningLevel>());

  useEffect(() => {
    const currentLevel = getTokenWarningLevel();
    const tokenCount = getTokenCount();

    // Announce to screen readers on warning level changes
    if (currentLevel !== previousLevel.current) {
      if (currentLevel === 'warning' && !announcedWarnings.current.has('warning')) {
        announceToScreenReader(`Approaching token limit: ${tokenCount.toLocaleString()} of 20,000 tokens used`);
        announcedWarnings.current.add('warning');
      } else if (currentLevel === 'danger' && !announcedWarnings.current.has('danger')) {
        announceToScreenReader(`Close to token limit: ${tokenCount.toLocaleString()} of 20,000 tokens used`);
        announcedWarnings.current.add('danger');
      } else if (currentLevel === 'error' && !announcedWarnings.current.has('error')) {
        announceToScreenReader(`Token limit exceeded: ${tokenCount.toLocaleString()} of 20,000 tokens. Please reduce content.`);
        announcedWarnings.current.add('error');
      } else if (currentLevel === 'safe') {
        // Reset warnings when back to safe
        announcedWarnings.current.clear();
      }

      previousLevel.current = currentLevel;
    }
  }, [getTokenCount, getTokenWarningLevel]);

  return {
    tokenCount: getTokenCount(),
    warningLevel: getTokenWarningLevel(),
    isWithinLimit: getTokenCount() < 20000
  };
}

function announceToScreenReader(message: string) {
  const announcement = document.createElement('div');
  announcement.setAttribute('aria-live', 'assertive');
  announcement.setAttribute('aria-atomic', 'true');
  announcement.className = 'sr-only';
  announcement.textContent = message;
  
  document.body.appendChild(announcement);
  
  setTimeout(() => {
    document.body.removeChild(announcement);
  }, 1000);
}
```

**Acceptance Criteria**:
- [ ] Token counting uses gpt3-tokenizer library for accuracy
- [ ] Token count updates in real-time as context changes
- [ ] Color-coded token count: green (<15k), yellow (15k-18k), red (18k-20k), dark red (≥20k)
- [ ] Visual progress bar shows token usage proportion
- [ ] Warning messages display for approaching/exceeding limits
- [ ] Warning icons appear at appropriate thresholds
- [ ] Screen reader announcements for token limit warnings
- [ ] Fallback to character-based counting if tokenizer fails
- [ ] Context submission prevented when over 20k tokens
- [ ] Token monitoring hook provides reusable functionality

---

### Task 2.3: Add Keyboard Shortcuts and Enhanced Clear/Collapse Actions
**Description**: Implement keyboard shortcuts, enhanced clear actions, and improved collapse/expand UX
**Size**: Medium  
**Priority**: Medium  
**Dependencies**: Task 2.1 (enhanced UI structure)  
**Can run parallel with**: Task 2.2, Task 2.4

**Technical Requirements**:
Add comprehensive keyboard shortcuts and enhance the user interaction patterns for the context panel.

**Keyboard Shortcut System**:
```typescript
// lib/hooks/useKeyboardShortcuts.ts - New file

import { useEffect, useCallback } from 'react';

export interface KeyboardShortcuts {
  togglePanel?: string;           // Default: 'Ctrl+Shift+C' (Cmd+Shift+C on Mac)
  clearContext?: string;          // Default: 'Ctrl+Shift+X' (Cmd+Shift+X on Mac)
  focusContext?: string;          // Default: 'Ctrl+Shift+/' (Cmd+Shift+/ on Mac)
}

interface UseKeyboardShortcutsProps {
  shortcuts?: KeyboardShortcuts;
  onTogglePanel?: () => void;
  onClearContext?: () => void;
  onFocusContext?: () => void;
  disabled?: boolean;
}

export function useKeyboardShortcuts({
  shortcuts = {},
  onTogglePanel,
  onClearContext, 
  onFocusContext,
  disabled = false
}: UseKeyboardShortcutsProps) {
  const isMac = typeof navigator !== 'undefined' && navigator.platform.includes('Mac');
  
  const defaultShortcuts: Required<KeyboardShortcuts> = {
    togglePanel: isMac ? 'Cmd+Shift+C' : 'Ctrl+Shift+C',
    clearContext: isMac ? 'Cmd+Shift+X' : 'Ctrl+Shift+X',
    focusContext: isMac ? 'Cmd+Shift+/' : 'Ctrl+Shift+/',
    ...shortcuts
  };

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (disabled) return;

    const isCtrlOrCmd = isMac ? event.metaKey : event.ctrlKey;
    const key = event.key;
    const shiftKey = event.shiftKey;

    // Toggle panel: Ctrl/Cmd + Shift + C
    if (isCtrlOrCmd && shiftKey && key.toLowerCase() === 'c') {
      event.preventDefault();
      onTogglePanel?.();
      return;
    }

    // Clear context: Ctrl/Cmd + Shift + X
    if (isCtrlOrCmd && shiftKey && key.toLowerCase() === 'x') {
      event.preventDefault();
      onClearContext?.();
      return;
    }

    // Focus context: Ctrl/Cmd + Shift + /
    if (isCtrlOrCmd && shiftKey && key === '/') {
      event.preventDefault();
      onFocusContext?.();
      return;
    }
  }, [disabled, isMac, onTogglePanel, onClearContext, onFocusContext]);

  useEffect(() => {
    if (disabled) return;

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown, disabled]);

  return {
    shortcuts: defaultShortcuts,
    isMac
  };
}
```

**Enhanced ContextPanel with Keyboard Support**:
```typescript
// components/ContextPanel.tsx - Updates to existing component

import { useKeyboardShortcuts } from '@/lib/hooks/useKeyboardShortcuts';
import { useRef } from 'react';

export const ContextPanel: React.FC<ContextPanelProps> = ({
  isCollapsed = false,
  onToggleCollapse
}) => {
  const contextTextareaRef = useRef<HTMLTextAreaElement>(null);
  const [localCollapsed, setLocalCollapsed] = useState(isCollapsed);

  // ... existing context and state ...

  // Enhanced clear function with confirmation
  const handleClearWithConfirmation = useCallback(() => {
    if (contextText && contextText.trim()) {
      setShowConfirmDialog(true);
    }
  }, [contextText]);

  // Focus context textarea
  const handleFocusContext = useCallback(() => {
    if (!localCollapsed && contextTextareaRef.current) {
      contextTextareaRef.current.focus();
      contextTextareaRef.current.setSelectionRange(
        contextTextareaRef.current.value.length, 
        contextTextareaRef.current.value.length
      );
    }
  }, [localCollapsed]);

  // Enhanced toggle with focus management
  const handleToggleCollapse = useCallback(() => {
    const newCollapsed = !localCollapsed;
    setLocalCollapsed(newCollapsed);
    onToggleCollapse?.(newCollapsed);
    
    // Persist collapse state
    try {
      localStorage.setItem('context-panel-collapsed', JSON.stringify(newCollapsed));
    } catch (error) {
      console.warn('Failed to save collapse state:', error);
    }

    // Focus context textarea when expanding
    if (!newCollapsed) {
      setTimeout(() => handleFocusContext(), 100);
    }
  }, [localCollapsed, onToggleCollapse, handleFocusContext]);

  // Keyboard shortcuts
  const { shortcuts, isMac } = useKeyboardShortcuts({
    onTogglePanel: handleToggleCollapse,
    onClearContext: handleClearWithConfirmation,
    onFocusContext: handleFocusContext,
    disabled: false
  });

  // Escape key handler for clearing focus
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
    }
  }, []);

  return (
    <>
      <div className="context-panel border border-gray-200 rounded-lg mb-4 bg-white shadow-sm">
        <div className="flex items-center justify-between p-3 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-medium text-gray-700">Document Context</h3>
            
            {/* Keyboard shortcut hints */}
            <div className="hidden lg:flex items-center gap-2 text-xs text-gray-500">
              <kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded text-xs">
                {shortcuts.togglePanel}
              </kbd>
              <span>toggle</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* ... existing token count display ... */}

            {/* Enhanced clear button with keyboard hint */}
            <div className="relative group">
              <button
                onClick={handleClearWithConfirmation}
                disabled={!contextText || !contextText.trim()}
                className="text-xs text-gray-500 hover:text-red-600 transition-colors disabled:text-gray-400 disabled:hover:text-gray-400 disabled:cursor-not-allowed"
                title={`Clear context (${shortcuts.clearContext})`}
                aria-label={`Clear context (${shortcuts.clearContext})`}
              >
                Clear
              </button>
              
              {/* Tooltip with keyboard shortcut */}
              <div className="hidden group-hover:block absolute bottom-full right-0 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap z-10">
                Clear context ({shortcuts.clearContext})
              </div>
            </div>

            {/* Enhanced collapse button */}
            <div className="relative group">
              <button
                onClick={handleToggleCollapse}
                className="text-xs text-gray-500 hover:text-gray-700 transition-colors p-1 -m-1"
                title={`${localCollapsed ? 'Expand' : 'Collapse'} panel (${shortcuts.togglePanel})`}
                aria-label={`${localCollapsed ? 'Expand' : 'Collapse'} panel (${shortcuts.togglePanel})`}
                aria-expanded={!localCollapsed}
              >
                <span className="inline-block transform transition-transform duration-200" style={{
                  transform: localCollapsed ? 'rotate(0deg)' : 'rotate(180deg)'
                }}>
                  ↓
                </span>
              </button>
              
              {/* Tooltip with keyboard shortcut */}
              <div className="hidden group-hover:block absolute bottom-full right-0 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap z-10">
                {localCollapsed ? 'Expand' : 'Collapse'} ({shortcuts.togglePanel})
              </div>
            </div>
          </div>
        </div>
        
        {/* ... existing warning message banner ... */}
        
        {!localCollapsed && (
          <div className="p-4 space-y-4" onKeyDown={handleKeyDown}>
            {/* Enhanced context textarea with focus support */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label htmlFor="context-text" className="block text-sm font-medium text-gray-700">
                  Additional Context
                </label>
                <div className="text-xs text-gray-500 flex items-center gap-2">
                  <kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded text-xs">
                    {shortcuts.focusContext}
                  </kbd>
                  <span>focus</span>
                </div>
              </div>
              <textarea
                ref={contextTextareaRef}
                id="context-text"
                value={contextText || ''}
                onChange={handleTextChange}
                placeholder="Describe your document context (optional)..."
                className="w-full min-h-[80px] max-h-[200px] p-3 border border-gray-300 rounded-md resize-vertical focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
                rows={3}
                aria-describedby="context-help context-token-count"
              />
              <div id="context-help" className="text-xs text-gray-500 mt-2">
                Provide additional context to help the AI understand your writing goals.
                This information stays private and is not saved on our servers.
              </div>
            </div>

            {/* ... rest of structured hints section ... */}
          </div>
        )}
      </div>

      {/* Enhanced confirmation dialog with keyboard support */}
      {showConfirmDialog && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={handleCancelClear}
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-clear-title"
          aria-describedby="confirm-clear-description"
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              e.preventDefault();
              handleCancelClear();
            }
          }}
        >
          <div 
            className="bg-white rounded-lg p-6 max-w-sm mx-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h4 id="confirm-clear-title" className="text-lg font-semibold text-gray-900 mb-2">
              Clear Context
            </h4>
            <p id="confirm-clear-description" className="text-gray-600 mb-6">
              Are you sure you want to clear all context data? This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={handleCancelClear}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    e.preventDefault();
                    handleCancelClear();
                  }
                }}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
                autoFocus
              >
                Cancel <span className="text-xs text-gray-500">(Esc)</span>
              </button>
              <button
                onClick={handleConfirmClear}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleConfirmClear();
                  }
                }}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
              >
                Clear <span className="text-xs opacity-75">(Enter)</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
```

**Keyboard Shortcuts Help Component**:
```typescript
// components/KeyboardShortcutsHelp.tsx - New file

import React, { useState } from 'react';
import { useKeyboardShortcuts } from '@/lib/hooks/useKeyboardShortcuts';

export const KeyboardShortcutsHelp: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const { shortcuts } = useKeyboardShortcuts({});

  return (
    <>
      <button
        onClick={() => setIsVisible(true)}
        className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
        title="Keyboard shortcuts"
        aria-label="Show keyboard shortcuts help"
      >
        ⌨️
      </button>

      {isVisible && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => setIsVisible(false)}
        >
          <div 
            className="bg-white rounded-lg p-6 max-w-md mx-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Keyboard Shortcuts</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Toggle context panel</span>
                <kbd className="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-sm font-mono">
                  {shortcuts.togglePanel}
                </kbd>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Focus context input</span>
                <kbd className="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-sm font-mono">
                  {shortcuts.focusContext}
                </kbd>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Clear context</span>
                <kbd className="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-sm font-mono">
                  {shortcuts.clearContext}
                </kbd>
              </div>
              <hr className="my-3" />
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Escape</span>
                <span className="text-xs text-gray-500">Close dialogs, blur inputs</span>
              </div>
            </div>
            <div className="mt-6 text-right">
              <button
                onClick={() => setIsVisible(false)}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
```

**Acceptance Criteria**:
- [ ] Ctrl/Cmd+Shift+C toggles context panel
- [ ] Ctrl/Cmd+Shift+X opens clear confirmation (when context exists)
- [ ] Ctrl/Cmd+Shift+/ focuses context textarea and moves cursor to end
- [ ] Escape key dismisses dialogs and blurs focused inputs
- [ ] Keyboard shortcuts work across Mac/Windows/Linux
- [ ] Tooltips show keyboard shortcuts on hover
- [ ] Focus management: expanding panel auto-focuses textarea
- [ ] Visual keyboard shortcut hints in appropriate UI areas
- [ ] Keyboard shortcuts help dialog accessible via button
- [ ] All interactive elements support keyboard navigation
- [ ] Screen reader compatible with proper ARIA attributes
- [ ] Keyboard shortcuts can be disabled when needed

---

### Task 2.4: Implement Gemini Implicit Caching Optimization
**Description**: Optimize prompt structure and monitor caching performance for improved TTFT
**Size**: Medium  
**Priority**: Medium  
**Dependencies**: Phase 1 API implementation  
**Can run parallel with**: Task 2.1, Task 2.2, Task 2.3

**Technical Requirements**:
Implement caching-optimized prompt structure and add monitoring for cache hit rates.

**Enhanced Prompt Assembly for Caching**:
```typescript
// app/api/complete/route.ts - Updates to existing file

// Enhanced system prompts optimized for caching
const SYSTEM_WITH_CONTEXT_CACHED = `You are an intelligent inline autocomplete engine with contextual awareness.

INSTRUCTIONS:
- Output ONLY the minimal continuation of the user's text
- Use the provided context to make more relevant and appropriate suggestions
- Adapt to the specified document type, tone, language, and target audience
- Incorporate relevant keywords naturally when appropriate
- No introductions, no sentences, no punctuation unless it is literally the next character
- Never add quotes/formatting; no trailing whitespace

CONTEXT TEMPLATE - Large Stable Block:`;

const SYSTEM_BASE_CACHED = `You are an inline autocomplete engine.

INSTRUCTIONS:
- Output ONLY the minimal continuation of the user's text
- No introductions, no sentences, no punctuation unless it is literally the next character  
- Never add quotes/formatting; no trailing whitespace

INPUT TEXT:`;

/**
 * Build cache-optimized prompt structure
 * Places stable context immediately after system prompt for maximum cache hits
 */
function buildCacheOptimizedPrompt(left: string, context?: z.infer<typeof ContextSchema>): {
  systemPrompt: string;
  userPrompt: string;
  contextSize: number;
} {
  if (!context) {
    return {
      systemPrompt: SYSTEM_BASE_CACHED,
      userPrompt: left,
      contextSize: 0
    };
  }

  // Build structured context block (stable section)
  const contextParts: string[] = [];
  
  if (context.userContext) {
    contextParts.push(`Document Context: ${sanitizeContext(context.userContext)}`);
  }
  
  if (context.documentType) {
    contextParts.push(`Document Type: ${context.documentType}`);
  }
  
  if (context.language) {
    contextParts.push(`Language: ${context.language}`);
  }
  
  if (context.tone) {
    contextParts.push(`Tone: ${context.tone}`);
  }
  
  if (context.audience) {
    contextParts.push(`Target Audience: ${sanitizeContext(context.audience)}`);
  }
  
  if (context.keywords && context.keywords.length > 0) {
    const sanitizedKeywords = context.keywords.map(k => sanitizeContext(k)).join(', ');
    contextParts.push(`Keywords: ${sanitizedKeywords}`);
  }

  const contextBlock = contextParts.length > 0 ? contextParts.join('\n') + '\n\n' : '';
  const contextSize = contextBlock.length;

  // Cache-optimized structure: System + Large Stable Context Block + Small Variable Input
  const systemPrompt = SYSTEM_WITH_CONTEXT_CACHED + '\n\n' + contextBlock + 'INPUT TEXT:';
  const userPrompt = left;

  return { systemPrompt, userPrompt, contextSize };
}

/**
 * Extract cache metrics from AI response metadata
 */
function extractCacheMetrics(usage: any): {
  cachedInputTokens: number;
  totalInputTokens: number;
  cacheHitRate: number;
} {
  const cachedTokens = usage?.cached_input_tokens || 0;
  const totalTokens = usage?.prompt_tokens || usage?.input_tokens || 0;
  const cacheHitRate = totalTokens > 0 ? cachedTokens / totalTokens : 0;

  return {
    cachedInputTokens: cachedTokens,
    totalInputTokens: totalTokens,
    cacheHitRate: Math.round(cacheHitRate * 100) / 100 // Round to 2 decimals
  };
}
```

**Enhanced API Route with Cache Monitoring**:
```typescript
// app/api/complete/route.ts - Updates to POST handler

export async function POST(request: NextRequest) {
  try {
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

    // Build cache-optimized prompt
    const { systemPrompt, userPrompt, contextSize } = buildCacheOptimizedPrompt(left, context);

    // Enhanced timeout for context-aware requests
    const controller = new AbortController();
    const timeoutDuration = hasContext ? 3000 : 500;
    const timeoutId = setTimeout(() => controller.abort(), timeoutDuration);

    try {
      const modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash-lite';
      
      const startTime = Date.now();
      
      const { textStream, usage } = await streamText({
        model: google(modelName),
        system: systemPrompt,
        prompt: userPrompt,
        temperature: 0.1,
        topP: 0.9,
        stopSequences: ['\n', ' ', '.', '?', '!'],
        maxRetries: 1,
        abortSignal: controller.signal,
      });

      // ... existing stream processing logic ...

      const completionTime = Date.now() - startTime;
      const cacheMetrics = extractCacheMetrics(usage);

      // Log cache performance in development
      if (process.env.NODE_ENV === 'development' && hasContext) {
        console.log(`[Cache Metrics] Context size: ${contextSize} chars, ` +
                   `Cache hit rate: ${(cacheMetrics.cacheHitRate * 100).toFixed(1)}%, ` +
                   `Cached tokens: ${cacheMetrics.cachedInputTokens}/${cacheMetrics.totalInputTokens}, ` +
                   `Completion time: ${completionTime}ms`);
      }
      
      clearTimeout(timeoutId);
      
      return NextResponse.json({ 
        tail: output,
        confidence: computeConfidence(output, { 
          boundaryStop, 
          truncatedByCharLimit, 
          truncatedByTokenLimit, 
          hasContext 
        }),
        // Include cache metrics in development responses
        ...(process.env.NODE_ENV === 'development' && {
          _debug: {
            contextSize,
            cacheMetrics,
            completionTime
          }
        })
      });
      
    } catch (aiError) {
      // ... existing error handling ...
    }
    
  } catch (error) {
    // ... existing error handling ...
  }
}
```

**Cache Performance Monitoring Hook**:
```typescript
// lib/hooks/useCacheMonitoring.ts - New file

import { useRef, useCallback } from 'react';

export interface CacheMetrics {
  totalRequests: number;
  contextRequests: number;
  averageContextSize: number;
  cacheHitRate: number;
  averageCompletionTime: number;
  lastCacheHitRate?: number;
}

export function useCacheMonitoring() {
  const metricsRef = useRef<CacheMetrics>({
    totalRequests: 0,
    contextRequests: 0,
    averageContextSize: 0,
    cacheHitRate: 0,
    averageCompletionTime: 0
  });

  const recordRequest = useCallback((response: any, startTime: number) => {
    const completionTime = Date.now() - startTime;
    const debug = response._debug;
    
    metricsRef.current.totalRequests++;
    
    // Update completion time average
    metricsRef.current.averageCompletionTime = 
      (metricsRef.current.averageCompletionTime * (metricsRef.current.totalRequests - 1) + completionTime) / 
      metricsRef.current.totalRequests;

    if (debug?.contextSize > 0) {
      metricsRef.current.contextRequests++;
      
      // Update average context size
      metricsRef.current.averageContextSize = 
        (metricsRef.current.averageContextSize * (metricsRef.current.contextRequests - 1) + debug.contextSize) / 
        metricsRef.current.contextRequests;

      // Update cache hit rate
      if (debug.cacheMetrics?.cacheHitRate !== undefined) {
        metricsRef.current.lastCacheHitRate = debug.cacheMetrics.cacheHitRate;
        metricsRef.current.cacheHitRate = 
          (metricsRef.current.cacheHitRate * (metricsRef.current.contextRequests - 1) + debug.cacheMetrics.cacheHitRate) / 
          metricsRef.current.contextRequests;
      }
    }
  }, []);

  const getMetrics = useCallback((): CacheMetrics => {
    return { ...metricsRef.current };
  }, []);

  const resetMetrics = useCallback(() => {
    metricsRef.current = {
      totalRequests: 0,
      contextRequests: 0,
      averageContextSize: 0,
      cacheHitRate: 0,
      averageCompletionTime: 0
    };
  }, []);

  return {
    recordRequest,
    getMetrics,
    resetMetrics
  };
}
```

**Development Cache Performance Display**:
```typescript
// components/CachePerformanceDisplay.tsx - New file (development only)

import React, { useState, useEffect } from 'react';
import { useCacheMonitoring, CacheMetrics } from '@/lib/hooks/useCacheMonitoring';

export const CachePerformanceDisplay: React.FC = () => {
  const [metrics, setMetrics] = useState<CacheMetrics | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const { getMetrics, resetMetrics } = useCacheMonitoring();

  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return;

    const interval = setInterval(() => {
      setMetrics(getMetrics());
    }, 1000);

    return () => clearInterval(interval);
  }, [getMetrics]);

  if (process.env.NODE_ENV !== 'development' || !metrics) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {!isVisible ? (
        <button
          onClick={() => setIsVisible(true)}
          className="bg-blue-600 text-white p-2 rounded-full shadow-lg hover:bg-blue-700 text-xs"
          title="Show cache performance"
        >
          📊
        </button>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-xl max-w-sm">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold text-sm">Cache Performance</h4>
            <button
              onClick={() => setIsVisible(false)}
              className="text-gray-500 hover:text-gray-700 text-sm"
            >
              ×
            </button>
          </div>
          
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span>Total Requests:</span>
              <span className="font-mono">{metrics.totalRequests}</span>
            </div>
            <div className="flex justify-between">
              <span>Context Requests:</span>
              <span className="font-mono">{metrics.contextRequests}</span>
            </div>
            <div className="flex justify-between">
              <span>Avg Context Size:</span>
              <span className="font-mono">{Math.round(metrics.averageContextSize)} chars</span>
            </div>
            <div className="flex justify-between">
              <span>Cache Hit Rate:</span>
              <span className={`font-mono ${
                metrics.cacheHitRate > 0.7 ? 'text-green-600' :
                metrics.cacheHitRate > 0.4 ? 'text-yellow-600' : 'text-red-600'
              }`}>
                {(metrics.cacheHitRate * 100).toFixed(1)}%
              </span>
            </div>
            <div className="flex justify-between">
              <span>Avg Time:</span>
              <span className="font-mono">{Math.round(metrics.averageCompletionTime)}ms</span>
            </div>
            {metrics.lastCacheHitRate !== undefined && (
              <div className="flex justify-between">
                <span>Last Cache Hit:</span>
                <span className="font-mono">{(metrics.lastCacheHitRate * 100).toFixed(1)}%</span>
              </div>
            )}
          </div>

          <button
            onClick={resetMetrics}
            className="mt-3 w-full text-xs bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded transition-colors"
          >
            Reset Metrics
          </button>
        </div>
      )}
    </div>
  );
};
```

**Acceptance Criteria**:
- [ ] System prompts restructured with stable context block after system instructions
- [ ] Context information placed in large stable block before variable user input
- [ ] Cache metrics extracted from AI response metadata when available
- [ ] Development logging shows cache hit rates and performance data
- [ ] Cache performance monitoring hook tracks metrics over time
- [ ] Development UI displays real-time cache performance stats
- [ ] Prompt structure optimized for Gemini 2.5 Flash-Lite cache behavior
- [ ] Context size monitoring helps identify caching thresholds
- [ ] Performance improvements visible in TTFT for repeated contexts
- [ ] Debug information included in development API responses only

---

### Task 2.5: Add Comprehensive Accessibility Features
**Description**: Implement WCAG 2.1 AA compliance with full screen reader, keyboard navigation, and assistive technology support
**Size**: Large  
**Priority**: High  
**Dependencies**: Task 2.1 (enhanced UI structure), Task 2.3 (keyboard shortcuts)  
**Can run parallel with**: Task 2.2, Task 2.4

**Technical Requirements**:
Achieve full WCAG 2.1 AA compliance with comprehensive accessibility features throughout the context system.

**Accessibility Framework**:
```typescript
// lib/hooks/useAccessibility.ts - New file

import { useEffect, useCallback, useRef } from 'react';

export interface AccessibilityOptions {
  announceChanges?: boolean;
  respectPrefersReducedMotion?: boolean;
  enhanceKeyboardNavigation?: boolean;
  provideLiveRegions?: boolean;
}

export function useAccessibility(options: AccessibilityOptions = {}) {
  const {
    announceChanges = true,
    respectPrefersReducedMotion = true,
    enhanceKeyboardNavigation = true,
    provideLiveRegions = true
  } = options;

  const liveRegionRef = useRef<HTMLDivElement | null>(null);
  const politeRegionRef = useRef<HTMLDivElement | null>(null);

  // Create live regions for screen reader announcements
  useEffect(() => {
    if (!provideLiveRegions) return;

    // Assertive live region for important announcements
    if (!liveRegionRef.current) {
      const liveRegion = document.createElement('div');
      liveRegion.setAttribute('aria-live', 'assertive');
      liveRegion.setAttribute('aria-atomic', 'true');
      liveRegion.className = 'sr-only';
      liveRegion.id = 'accessibility-live-region';
      document.body.appendChild(liveRegion);
      liveRegionRef.current = liveRegion;
    }

    // Polite live region for status updates
    if (!politeRegionRef.current) {
      const politeRegion = document.createElement('div');
      politeRegion.setAttribute('aria-live', 'polite');
      politeRegion.setAttribute('aria-atomic', 'false');
      politeRegion.className = 'sr-only';
      politeRegion.id = 'accessibility-polite-region';
      document.body.appendChild(politeRegion);
      politeRegionRef.current = politeRegion;
    }

    return () => {
      if (liveRegionRef.current) {
        document.body.removeChild(liveRegionRef.current);
        liveRegionRef.current = null;
      }
      if (politeRegionRef.current) {
        document.body.removeChild(politeRegionRef.current);
        politeRegionRef.current = null;
      }
    };
  }, [provideLiveRegions]);

  // Announce important messages
  const announceToScreenReader = useCallback((message: string, priority: 'assertive' | 'polite' = 'assertive') => {
    if (!announceChanges) return;

    const region = priority === 'assertive' ? liveRegionRef.current : politeRegionRef.current;
    if (region) {
      region.textContent = '';
      // Small delay to ensure screen readers notice the change
      setTimeout(() => {
        region.textContent = message;
      }, 100);
    }
  }, [announceChanges]);

  // Check for reduced motion preference
  const prefersReducedMotion = useCallback(() => {
    if (!respectPrefersReducedMotion) return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, [respectPrefersReducedMotion]);

  // Enhanced focus management
  const manageFocus = useCallback((element: HTMLElement | null, options: {
    preventScroll?: boolean;
    announceLabel?: string;
  } = {}) => {
    if (!element || !enhanceKeyboardNavigation) return;

    element.focus({ preventScroll: options.preventScroll });
    
    if (options.announceLabel) {
      announceToScreenReader(`Focused: ${options.announceLabel}`, 'polite');
    }
  }, [enhanceKeyboardNavigation, announceToScreenReader]);

  // Keyboard trap for modals
  const createKeyboardTrap = useCallback((containerElement: HTMLElement) => {
    const focusableElements = containerElement.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstFocusable = focusableElements[0] as HTMLElement;
    const lastFocusable = focusableElements[focusableElements.length - 1] as HTMLElement;

    const handleTabTrap = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstFocusable) {
          e.preventDefault();
          lastFocusable.focus();
        }
      } else {
        if (document.activeElement === lastFocusable) {
          e.preventDefault();
          firstFocusable.focus();
        }
      }
    };

    containerElement.addEventListener('keydown', handleTabTrap);
    
    // Focus first element
    if (firstFocusable) {
      firstFocusable.focus();
    }

    return () => {
      containerElement.removeEventListener('keydown', handleTabTrap);
    };
  }, []);

  return {
    announceToScreenReader,
    prefersReducedMotion,
    manageFocus,
    createKeyboardTrap
  };
}
```

**Enhanced ContextPanel with Full Accessibility**:
```typescript
// components/ContextPanel.tsx - Accessibility enhancements

import { useAccessibility } from '@/lib/hooks/useAccessibility';
import { useId } from 'react';

export const ContextPanel: React.FC<ContextPanelProps> = ({ ... }) => {
  // ... existing state and hooks ...

  const { 
    announceToScreenReader, 
    prefersReducedMotion, 
    manageFocus,
    createKeyboardTrap 
  } = useAccessibility();

  // Unique IDs for accessibility
  const panelId = useId();
  const contextTextId = useId();
  const documentTypeId = useId();
  const languageId = useId();
  const toneId = useId();
  const audienceId = useId();
  const keywordsId = useId();

  // Enhanced context update with announcements
  const handleTextChangeWithA11y = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    updateContext({ contextText: newText });
    
    // Announce token count changes
    const newTokenCount = getTokenCount();
    const warningLevel = getTokenWarningLevel();
    
    if (warningLevel === 'warning' || warningLevel === 'danger' || warningLevel === 'error') {
      const message = getTokenWarningMessage(warningLevel, newTokenCount);
      if (message) {
        announceToScreenReader(message, 'assertive');
      }
    }
  }, [updateContext, getTokenCount, getTokenWarningLevel, announceToScreenReader]);

  // Enhanced collapse with accessibility
  const handleToggleCollapseWithA11y = useCallback(() => {
    const newCollapsed = !localCollapsed;
    setLocalCollapsed(newCollapsed);
    onToggleCollapse?.(newCollapsed);
    
    // Announce state change
    announceToScreenReader(
      newCollapsed ? 'Context panel collapsed' : 'Context panel expanded',
      'polite'
    );
    
    // Persist state
    try {
      localStorage.setItem('context-panel-collapsed', JSON.stringify(newCollapsed));
    } catch (error) {
      console.warn('Failed to save collapse state:', error);
    }

    // Manage focus when expanding
    if (!newCollapsed && contextTextareaRef.current) {
      setTimeout(() => {
        manageFocus(contextTextareaRef.current, {
          announceLabel: 'Context input field'
        });
      }, prefersReducedMotion() ? 0 : 150);
    }
  }, [localCollapsed, onToggleCollapse, announceToScreenReader, manageFocus, prefersReducedMotion]);

  // Enhanced confirmation dialog with focus trap
  useEffect(() => {
    if (showConfirmDialog && confirmDialogRef.current) {
      const cleanup = createKeyboardTrap(confirmDialogRef.current);
      return cleanup;
    }
  }, [showConfirmDialog, createKeyboardTrap]);

  return (
    <>
      <div 
        className="context-panel border border-gray-200 rounded-lg mb-4 bg-white shadow-sm"
        role="region"
        aria-labelledby={`${panelId}-title`}
        aria-describedby={`${panelId}-description`}
      >
        {/* Enhanced header with full accessibility */}
        <div className="flex items-center justify-between p-3 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center gap-3">
            <h3 
              id={`${panelId}-title`}
              className="text-sm font-medium text-gray-700"
            >
              Document Context
            </h3>
            
            {/* Screen reader description */}
            <span 
              id={`${panelId}-description`}
              className="sr-only"
            >
              Optional context panel to provide additional information for AI autocomplete suggestions. 
              Contains form fields for context text, document type, language, tone, audience, and keywords.
            </span>
            
            {/* Keyboard shortcuts hint for screen readers */}
            <span className="sr-only">
              Keyboard shortcuts available: {shortcuts.togglePanel} to toggle panel, 
              {shortcuts.focusContext} to focus context input, 
              {shortcuts.clearContext} to clear context.
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Enhanced token count with full accessibility */}
            <div className="flex items-center gap-2">
              <span 
                className={`text-xs font-medium ${getTokenCountColorClass(warningLevel)}`}
                aria-live="polite"
                aria-label={`Token usage: ${tokenCount.toLocaleString()} of 20,000 maximum. ${warningMessage || 'Within safe limits.'}`}
                role="status"
              >
                {tokenCount.toLocaleString()} tokens
              </span>
              
              {/* Progress bar with accessibility */}
              <div 
                className="w-16 h-1 bg-gray-200 rounded-full overflow-hidden"
                role="progressbar"
                aria-valuenow={tokenCount}
                aria-valuemin={0}
                aria-valuemax={20000}
                aria-label={`Token usage: ${tokenCount} of 20,000`}
              >
                <div 
                  className={`h-full transition-all duration-200 ${
                    warningLevel === 'error' ? 'bg-red-600' :
                    warningLevel === 'danger' ? 'bg-red-500' :
                    warningLevel === 'warning' ? 'bg-yellow-500' :
                    'bg-green-500'
                  }`}
                  style={{ width: `${Math.min(100, (tokenCount / 20000) * 100)}%` }}
                />
              </div>
            </div>

            {/* Accessible buttons with enhanced labeling */}
            <button
              onClick={handleClearWithConfirmation}
              disabled={!contextText || !contextText.trim()}
              className="text-xs text-gray-500 hover:text-red-600 transition-colors disabled:text-gray-400 disabled:hover:text-gray-400 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 rounded px-1"
              aria-label={`Clear all context data. Keyboard shortcut: ${shortcuts.clearContext}. ${!contextText || !contextText.trim() ? 'No context to clear.' : 'This will remove all entered context information.'}`}
              aria-describedby={`${panelId}-clear-help`}
            >
              Clear
            </button>
            <span id={`${panelId}-clear-help`} className="sr-only">
              {!contextText || !contextText.trim() ? 
                'Clear button is disabled because there is no context to clear.' : 
                'Clear button will remove all context information after confirmation.'
              }
            </span>

            <button
              onClick={handleToggleCollapseWithA11y}
              className="text-xs text-gray-500 hover:text-gray-700 transition-colors p-1 -m-1 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 rounded"
              aria-label={`${localCollapsed ? 'Expand' : 'Collapse'} context panel. Keyboard shortcut: ${shortcuts.togglePanel}. Panel is currently ${localCollapsed ? 'collapsed' : 'expanded'}.`}
              aria-expanded={!localCollapsed}
              aria-controls={`${panelId}-content`}
            >
              <span 
                className={`inline-block transition-transform ${prefersReducedMotion() ? '' : 'duration-200'}`} 
                style={{
                  transform: localCollapsed ? 'rotate(0deg)' : 'rotate(180deg)'
                }}
                aria-hidden="true"
              >
                ↓
              </span>
            </button>
          </div>
        </div>
        
        {/* Enhanced warning banner */}
        {warningMessage && (
          <div 
            className={`px-3 py-2 text-xs border-b ${
              warningLevel === 'error' ? 'bg-red-50 text-red-800 border-red-200' :
              warningLevel === 'danger' ? 'bg-red-50 text-red-700 border-red-200' :
              'bg-yellow-50 text-yellow-700 border-yellow-200'
            }`}
            role="alert"
            aria-live="assertive"
          >
            <div className="flex items-center gap-2">
              <span aria-hidden="true">{warningLevel === 'error' ? '⚠️' : '💡'}</span>
              <span>{warningMessage}</span>
            </div>
          </div>
        )}
        
        {/* Enhanced content section */}
        {!localCollapsed && (
          <div 
            id={`${panelId}-content`}
            className="p-4 space-y-4"
            role="group"
            aria-labelledby={`${panelId}-title`}
          >
            {/* Enhanced context textarea */}
            <div>
              <label 
                htmlFor={contextTextId}
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Additional Context
                <span className="text-xs text-gray-500 ml-2">
                  (Optional - helps AI understand your writing goals)
                </span>
              </label>
              <textarea
                ref={contextTextareaRef}
                id={contextTextId}
                value={contextText || ''}
                onChange={handleTextChangeWithA11y}
                placeholder="Describe your document context (optional)..."
                className="w-full min-h-[80px] max-h-[200px] p-3 border border-gray-300 rounded-md resize-vertical focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
                rows={3}
                aria-describedby={`${contextTextId}-help ${contextTextId}-token-info`}
                aria-invalid={warningLevel === 'error'}
              />
              <div id={`${contextTextId}-help`} className="text-xs text-gray-500 mt-2">
                Provide additional context to help the AI understand your writing goals.
                This information stays private and is not saved on our servers.
              </div>
              <div id={`${contextTextId}-token-info`} className="sr-only" aria-live="polite">
                Current token count: {tokenCount.toLocaleString()}. 
                {warningLevel === 'error' && 'Token limit exceeded. Please reduce content length.'}
                {warningLevel === 'danger' && 'Approaching token limit. Consider reducing content.'}
                {warningLevel === 'warning' && 'Getting close to token limit.'}
              </div>
            </div>

            {/* Enhanced structured hints with full accessibility */}
            <fieldset className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <legend className="sr-only">Document characteristics and preferences</legend>
              
              {/* Document Type with enhanced accessibility */}
              <div>
                <label htmlFor={documentTypeId} className="block text-sm font-medium text-gray-700 mb-1">
                  Document Type
                </label>
                <select
                  id={documentTypeId}
                  value={documentType || ''}
                  onChange={(e) => {
                    handleDocumentTypeChange(e.target.value as DocumentType);
                    announceToScreenReader(`Document type changed to ${e.target.value || 'none'}`, 'polite');
                  }}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
                  aria-describedby={`${documentTypeId}-help`}
                >
                  <option value="">Choose document type...</option>
                  <option value="email">Email</option>
                  <option value="article">Article</option>
                  <option value="note">Note</option>
                  <option value="other">Other</option>
                </select>
                <div id={`${documentTypeId}-help`} className="text-xs text-gray-500 mt-1">
                  Select the type of document you're writing to get more relevant suggestions
                </div>
              </div>

              {/* Language selector with accessibility */}
              <div>
                <label htmlFor={languageId} className="block text-sm font-medium text-gray-700 mb-1">
                  Language
                </label>
                <select
                  id={languageId}
                  value={language || ''}
                  onChange={(e) => {
                    handleLanguageChange(e.target.value as Language);
                    const langName = e.target.selectedOptions[0]?.textContent || e.target.value;
                    announceToScreenReader(`Language changed to ${langName || 'default'}`, 'polite');
                  }}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
                  aria-describedby={`${languageId}-help`}
                >
                  <option value="">Default language...</option>
                  <option value="en">English</option>
                  <option value="es">Spanish</option>
                  <option value="fr">French</option>
                  <option value="de">German</option>
                </select>
                <div id={`${languageId}-help`} className="text-xs text-gray-500 mt-1">
                  Primary language for AI suggestions
                </div>
              </div>

              {/* Tone selector with accessibility */}
              <div>
                <label htmlFor={toneId} className="block text-sm font-medium text-gray-700 mb-1">
                  Writing Tone
                </label>
                <select
                  id={toneId}
                  value={tone || ''}
                  onChange={(e) => {
                    handleToneChange(e.target.value as Tone);
                    announceToScreenReader(`Writing tone changed to ${e.target.value || 'default'}`, 'polite');
                  }}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
                  aria-describedby={`${toneId}-help`}
                >
                  <option value="">Default tone...</option>
                  <option value="neutral">Neutral</option>
                  <option value="formal">Formal</option>
                  <option value="casual">Casual</option>
                  <option value="persuasive">Persuasive</option>
                </select>
                <div id={`${toneId}-help`} className="text-xs text-gray-500 mt-1">
                  Desired writing tone and style
                </div>
              </div>

              {/* Audience input with accessibility */}
              <div>
                <label htmlFor={audienceId} className="block text-sm font-medium text-gray-700 mb-1">
                  Target Audience
                </label>
                <input
                  id={audienceId}
                  type="text"
                  value={audience || ''}
                  onChange={(e) => {
                    handleAudienceChange(e);
                    if (e.target.value.length === 64) {
                      announceToScreenReader('Maximum character limit reached for audience field', 'polite');
                    }
                  }}
                  placeholder="e.g., developers, clients, students..."
                  maxLength={64}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
                  aria-describedby={`${audienceId}-help ${audienceId}-count`}
                />
                <div className="flex justify-between items-center mt-1">
                  <div id={`${audienceId}-help`} className="text-xs text-gray-500">
                    Who you're writing for
                  </div>
                  <div id={`${audienceId}-count`} className="text-xs text-gray-400">
                    {(audience?.length || 0)}/64
                  </div>
                </div>
              </div>
            </fieldset>

            {/* Enhanced keywords with full accessibility */}
            <AccessibleKeywordsInput
              id={keywordsId}
              keywords={keywords || []}
              onChange={handleKeywordsChange}
              maxKeywords={10}
              maxLength={32}
              announceChanges={announceToScreenReader}
            />
          </div>
        )}
      </div>

      {/* Enhanced confirmation dialog with accessibility */}
      {showConfirmDialog && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          role="dialog"
          aria-modal="true"
          aria-labelledby={`${panelId}-confirm-title`}
          aria-describedby={`${panelId}-confirm-description`}
          onClick={handleCancelClear}
        >
          <div 
            ref={confirmDialogRef}
            className="bg-white rounded-lg p-6 max-w-sm mx-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h4 id={`${panelId}-confirm-title`} className="text-lg font-semibold text-gray-900 mb-2">
              Clear All Context Data
            </h4>
            <p id={`${panelId}-confirm-description`} className="text-gray-600 mb-6">
              Are you sure you want to clear all context data? This will remove your context text, 
              document type, language, tone, audience, and keywords. This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={handleCancelClear}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 rounded"
                aria-label="Cancel clearing context data. This will close the dialog without making changes."
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmClear}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded hover:bg-red-700 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                aria-label="Confirm clearing all context data. This cannot be undone."
              >
                Clear All Context
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
```

**Accessible Keywords Component**:
```typescript
// components/AccessibleKeywordsInput.tsx - New file

import React, { useState, useCallback, useId, useRef, useEffect } from 'react';

interface AccessibleKeywordsInputProps {
  id: string;
  keywords: string[];
  onChange: (keywords: string[]) => void;
  maxKeywords?: number;
  maxLength?: number;
  announceChanges?: (message: string, priority?: 'assertive' | 'polite') => void;
}

export const AccessibleKeywordsInput: React.FC<AccessibleKeywordsInputProps> = ({
  id,
  keywords,
  onChange,
  maxKeywords = 10,
  maxLength = 32,
  announceChanges
}) => {
  const [inputValue, setInputValue] = useState('');
  const [activeKeywordIndex, setActiveKeywordIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerId = useId();
  const helpId = useId();

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    switch (e.key) {
      case 'Enter':
      case ',':
        e.preventDefault();
        addKeyword();
        break;
      case ' ':
        // Only add on space if there's content and we're not in the middle of a word
        if (inputValue.trim() && !inputValue.match(/\w$/)) {
          e.preventDefault();
          addKeyword();
        }
        break;
      case 'Backspace':
        if (!inputValue && keywords.length > 0) {
          e.preventDefault();
          removeKeyword(keywords.length - 1);
        }
        break;
      case 'ArrowLeft':
        if (!inputValue && keywords.length > 0) {
          e.preventDefault();
          setActiveKeywordIndex(keywords.length - 1);
          announceChanges?.(`Navigating keywords. ${keywords[keywords.length - 1]} selected.`, 'polite');
        }
        break;
    }
  }, [inputValue, keywords, announceChanges]);

  const addKeyword = useCallback(() => {
    const keyword = inputValue.trim();
    if (keyword && 
        keyword.length <= maxLength && 
        keywords.length < maxKeywords && 
        !keywords.includes(keyword)) {
      onChange([...keywords, keyword]);
      setInputValue('');
      announceChanges?.(`Keyword "${keyword}" added. ${keywords.length + 1} of ${maxKeywords} keywords.`, 'polite');
    } else if (keyword.length > maxLength) {
      announceChanges?.(`Keyword too long. Maximum ${maxLength} characters allowed.`, 'assertive');
    } else if (keywords.length >= maxKeywords) {
      announceChanges?.(`Maximum ${maxKeywords} keywords reached. Remove a keyword to add another.`, 'assertive');
    } else if (keywords.includes(keyword)) {
      announceChanges?.(`Keyword "${keyword}" already exists.`, 'assertive');
    }
  }, [inputValue, keywords, maxKeywords, maxLength, onChange, announceChanges]);

  const removeKeyword = useCallback((index: number) => {
    const removedKeyword = keywords[index];
    const newKeywords = keywords.filter((_, i) => i !== index);
    onChange(newKeywords);
    setActiveKeywordIndex(-1);
    announceChanges?.(`Keyword "${removedKeyword}" removed. ${newKeywords.length} of ${maxKeywords} keywords remaining.`, 'polite');
    
    // Return focus to input
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, [keywords, maxKeywords, onChange, announceChanges]);

  // Handle keyword navigation with arrow keys
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (activeKeywordIndex >= 0 && document.activeElement?.closest(`#${containerId}`)) {
        switch (e.key) {
          case 'ArrowRight':
            e.preventDefault();
            if (activeKeywordIndex < keywords.length - 1) {
              setActiveKeywordIndex(activeKeywordIndex + 1);
              announceChanges?.(`${keywords[activeKeywordIndex + 1]} selected.`, 'polite');
            } else {
              setActiveKeywordIndex(-1);
              inputRef.current?.focus();
            }
            break;
          case 'ArrowLeft':
            e.preventDefault();
            if (activeKeywordIndex > 0) {
              setActiveKeywordIndex(activeKeywordIndex - 1);
              announceChanges?.(`${keywords[activeKeywordIndex - 1]} selected.`, 'polite');
            }
            break;
          case 'Delete':
          case 'Backspace':
            e.preventDefault();
            removeKeyword(activeKeywordIndex);
            break;
          case 'Enter':
            e.preventDefault();
            removeKeyword(activeKeywordIndex);
            break;
          case 'Escape':
            e.preventDefault();
            setActiveKeywordIndex(-1);
            inputRef.current?.focus();
            announceChanges?.('Keyword navigation cancelled. Returned to input field.', 'polite');
            break;
        }
      }
    };

    document.addEventListener('keydown', handleGlobalKeyDown);
    return () => document.removeEventListener('keydown', handleGlobalKeyDown);
  }, [activeKeywordIndex, keywords, removeKeyword, announceChanges]);

  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-2">
        Keywords ({keywords.length}/{maxKeywords})
        <span className="text-xs text-gray-500 ml-2">
          (Optional - helps AI understand key topics)
        </span>
      </label>
      <div 
        id={containerId}
        className="flex flex-wrap gap-2 p-2 border border-gray-300 rounded-md min-h-[2.5rem] focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500"
        role="application"
        aria-label="Keywords input with chip management"
        aria-describedby={helpId}
      >
        {keywords.map((keyword, index) => (
          <span
            key={index}
            className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded-md ${
              activeKeywordIndex === index 
                ? 'bg-blue-200 text-blue-900 ring-2 ring-blue-500' 
                : 'bg-blue-100 text-blue-800'
            }`}
            role="button"
            tabIndex={0}
            aria-label={`Keyword: ${keyword}. Press Delete or Backspace to remove.`}
            onFocus={() => setActiveKeywordIndex(index)}
            onKeyDown={(e) => {
              if (e.key === 'Delete' || e.key === 'Backspace' || e.key === 'Enter') {
                e.preventDefault();
                removeKeyword(index);
              }
            }}
          >
            {keyword}
            <button
              onClick={() => removeKeyword(index)}
              className="text-blue-600 hover:text-blue-800 focus:outline-none focus:ring-1 focus:ring-blue-500 rounded"
              aria-label={`Remove keyword: ${keyword}`}
              tabIndex={-1}
            >
              ×
            </button>
          </span>
        ))}
        {keywords.length < maxKeywords && (
          <input
            ref={inputRef}
            id={id}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={addKeyword}
            placeholder={keywords.length === 0 ? "Enter keywords..." : ""}
            maxLength={maxLength}
            className="flex-1 min-w-[100px] outline-none bg-transparent"
            aria-describedby={helpId}
            aria-invalid={inputValue.length > maxLength}
          />
        )}
      </div>
      <div id={helpId} className="text-xs text-gray-500 mt-1">
        Press Enter, comma, or space to add keywords (max {maxLength} chars each). 
        Use arrow keys to navigate keywords, Delete to remove. 
        {keywords.length >= maxKeywords && ` Maximum ${maxKeywords} keywords reached.`}
      </div>
    </div>
  );
};
```

**Acceptance Criteria**:
- [ ] WCAG 2.1 AA compliance verified with automated and manual testing
- [ ] Screen reader compatibility tested with NVDA, JAWS, and VoiceOver
- [ ] All interactive elements keyboard accessible with logical tab order
- [ ] Focus indicators visible and meet contrast requirements (3:1 minimum)
- [ ] ARIA labels, descriptions, and roles properly implemented
- [ ] Live regions announce important changes (token warnings, state changes)
- [ ] High contrast mode support for visual elements
- [ ] Reduced motion preferences respected for animations
- [ ] Keyboard traps implemented for modal dialogs
- [ ] Form validation errors announced to screen readers
- [ ] Color information not the sole method of conveying information
- [ ] All text meets minimum contrast ratios (4.5:1 for normal text)
- [ ] Interactive elements meet minimum target size (44px minimum)
- [ ] Focus management maintains logical flow when UI changes

---

### Task 2.6: Enhanced Error Handling and User Feedback
**Description**: Implement comprehensive error handling, user feedback systems, and graceful degradation
**Size**: Medium  
**Priority**: Medium  
**Dependencies**: Task 2.1 (enhanced UI), Task 2.2 (token counting)  
**Can run parallel with**: Task 2.3, Task 2.4, Task 2.5

**Technical Requirements**:
Create robust error handling with user-friendly feedback and system resilience.

**Enhanced Error System**:
```typescript
// lib/errors/ContextErrorHandler.ts - New file

export type ContextErrorType = 
  | 'STORAGE_UNAVAILABLE'
  | 'TOKEN_LIMIT_EXCEEDED'
  | 'VALIDATION_FAILED'
  | 'NETWORK_ERROR'
  | 'API_ERROR'
  | 'CRYPTO_UNAVAILABLE'
  | 'BROWSER_UNSUPPORTED';

export interface ContextError {
  type: ContextErrorType;
  message: string;
  userMessage: string;
  recoverable: boolean;
  recovery?: () => void | Promise<void>;
  retryable: boolean;
  timestamp: number;
  context?: Record<string, any>;
}

export class ContextErrorHandler {
  private static errors: ContextError[] = [];
  private static maxErrors = 10;
  
  static createError(
    type: ContextErrorType,
    message: string,
    options: {
      userMessage?: string;
      recoverable?: boolean;
      recovery?: () => void | Promise<void>;
      retryable?: boolean;
      context?: Record<string, any>;
    } = {}
  ): ContextError {
    const error: ContextError = {
      type,
      message,
      userMessage: options.userMessage || this.getDefaultUserMessage(type),
      recoverable: options.recoverable ?? true,
      recovery: options.recovery,
      retryable: options.retryable ?? false,
      timestamp: Date.now(),
      context: options.context
    };

    // Store error for debugging
    this.errors.push(error);
    if (this.errors.length > this.maxErrors) {
      this.errors.shift();
    }

    // Log in development
    if (process.env.NODE_ENV === 'development') {
      console.error(`[ContextError] ${type}:`, message, options.context);
    }

    return error;
  }

  private static getDefaultUserMessage(type: ContextErrorType): string {
    switch (type) {
      case 'STORAGE_UNAVAILABLE':
        return 'Unable to save your context. Your settings may not persist across page refreshes.';
      case 'TOKEN_LIMIT_EXCEEDED':
        return 'Your context is too large. Please reduce the content to continue.';
      case 'VALIDATION_FAILED':
        return 'Some of your context information is invalid. Please check your entries.';
      case 'NETWORK_ERROR':
        return 'Network connection issue. Please check your internet connection and try again.';
      case 'API_ERROR':
        return 'AI service temporarily unavailable. Please try again in a moment.';
      case 'CRYPTO_UNAVAILABLE':
        return 'Browser security features unavailable. Context will work but with reduced performance.';
      case 'BROWSER_UNSUPPORTED':
        return 'Some features may not work in this browser. Consider using a modern browser for the best experience.';
      default:
        return 'An unexpected error occurred. Please try again.';
    }
  }

  static getRecentErrors(): ContextError[] {
    return [...this.errors].reverse();
  }

  static clearErrors(): void {
    this.errors = [];
  }
}
```

**Error-Aware Context Provider**:
```typescript
// lib/context/CompletionContext.tsx - Error handling enhancements

import { ContextErrorHandler, ContextError } from '@/lib/errors/ContextErrorHandler';

export interface CompletionContextValue extends CompletionContextState {
  // ... existing methods ...
  
  // Error handling
  lastError: ContextError | null;
  hasError: boolean;
  clearError: () => void;
  retryLastOperation: () => Promise<boolean>;
}

export const CompletionContextProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [context, setContext] = useState<CompletionContextState>(() => getDefaultContext());
  const [lastError, setLastError] = useState<ContextError | null>(null);
  const [lastOperation, setLastOperation] = useState<(() => Promise<void>) | null>(null);

  // Enhanced error handling
  const handleError = useCallback((error: ContextError) => {
    setLastError(error);
    
    // Auto-recover if possible
    if (error.recoverable && error.recovery) {
      setTimeout(async () => {
        try {
          await error.recovery!();
          setLastError(null);
        } catch (recoveryError) {
          console.warn('Recovery failed:', recoveryError);
        }
      }, 1000);
    }
  }, []);

  // Enhanced context update with error handling
  const updateContext = useCallback(async (updates: Partial<CompletionContextState>) => {
    const operation = async () => {
      // Validate token limit before update
      const testContext = { ...context, ...updates };
      const tokenCount = getContextTokenCount(testContext);
      
      if (tokenCount > 20000) {
        throw ContextErrorHandler.createError('TOKEN_LIMIT_EXCEEDED', 
          `Context would exceed token limit: ${tokenCount}`, {
          retryable: false,
          context: { tokenCount, limit: 20000 }
        });
      }

      // Validate field contents
      if (updates.audience && updates.audience.length > 64) {
        throw ContextErrorHandler.createError('VALIDATION_FAILED',
          'Audience field exceeds maximum length', {
          retryable: false,
          context: { field: 'audience', length: updates.audience.length, max: 64 }
        });
      }

      if (updates.keywords && updates.keywords.length > 10) {
        throw ContextErrorHandler.createError('VALIDATION_FAILED',
          'Too many keywords provided', {
          retryable: false,
          context: { field: 'keywords', count: updates.keywords.length, max: 10 }
        });
      }

      // Apply updates
      setContext(prev => {
        const updated = { ...prev, ...updates };
        
        // Save to localStorage with error handling
        try {
          saveToLocalStorage(updated);
        } catch (storageError) {
          const error = ContextErrorHandler.createError('STORAGE_UNAVAILABLE',
            'Failed to save context to localStorage', {
            userMessage: 'Your context settings may not be saved across page refreshes.',
            recoverable: true,
            recovery: () => saveToLocalStorage(updated),
            context: { error: storageError }
          });
          handleError(error);
        }
        
        return updated;
      });
    };

    setLastOperation(() => operation);
    
    try {
      await operation();
      setLastError(null); // Clear error on successful operation
    } catch (error) {
      if (error instanceof Error && 'type' in error) {
        handleError(error as ContextError);
      } else {
        const contextError = ContextErrorHandler.createError('VALIDATION_FAILED',
          error instanceof Error ? error.message : 'Unknown error occurred', {
          context: { originalError: error }
        });
        handleError(contextError);
      }
      throw error; // Re-throw for component handling
    }
  }, [context, handleError]);

  // Enhanced hash generation with error handling
  const getContextHash = useCallback(async () => {
    try {
      return await generateContextHash(context);
    } catch (error) {
      const contextError = ContextErrorHandler.createError('CRYPTO_UNAVAILABLE',
        'Failed to generate context hash', {
        userMessage: 'Context caching may be less efficient, but functionality is preserved.',
        recoverable: true,
        recovery: async () => {
          // Fallback hash generation
          return 'fallback_' + Date.now().toString(36);
        },
        context: { error }
      });
      handleError(contextError);
      
      // Return fallback hash
      return 'fallback_' + Date.now().toString(36);
    }
  }, [context, handleError]);

  // Retry mechanism
  const retryLastOperation = useCallback(async (): Promise<boolean> => {
    if (!lastOperation || !lastError?.retryable) {
      return false;
    }

    try {
      await lastOperation();
      setLastError(null);
      return true;
    } catch (error) {
      // Don't update lastError here to avoid infinite loops
      return false;
    }
  }, [lastOperation, lastError]);

  const clearError = useCallback(() => {
    setLastError(null);
  }, []);

  const value: CompletionContextValue = {
    ...context,
    updateContext,
    clearContext,
    getContextHash,
    getTokenCount,
    getTokenWarningLevel,
    isWithinTokenLimit,
    lastError,
    hasError: lastError !== null,
    clearError,
    retryLastOperation
  };

  return (
    <CompletionContext.Provider value={value}>
      {children}
    </CompletionContext.Provider>
  );
};
```

**Error Notification System**:
```typescript
// components/ErrorNotification.tsx - New file

import React, { useEffect, useState } from 'react';
import { useCompletionContext } from '@/lib/context/CompletionContext';
import { ContextError } from '@/lib/errors/ContextErrorHandler';

export const ErrorNotification: React.FC = () => {
  const { lastError, clearError, retryLastOperation } = useCompletionContext();
  const [isVisible, setIsVisible] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);

  useEffect(() => {
    if (lastError) {
      setIsVisible(true);
      
      // Auto-dismiss certain errors after delay
      if (lastError.type === 'CRYPTO_UNAVAILABLE' || lastError.type === 'STORAGE_UNAVAILABLE') {
        const timer = setTimeout(() => {
          setIsVisible(false);
          setTimeout(clearError, 300); // Wait for animation
        }, 5000);
        return () => clearTimeout(timer);
      }
    } else {
      setIsVisible(false);
    }
  }, [lastError, clearError]);

  const handleRetry = async () => {
    if (!lastError?.retryable) return;
    
    setIsRetrying(true);
    const success = await retryLastOperation();
    setIsRetrying(false);
    
    if (success) {
      setIsVisible(false);
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
    setTimeout(clearError, 300); // Wait for animation
  };

  if (!lastError) return null;

  const getErrorStyles = (error: ContextError) => {
    switch (error.type) {
      case 'TOKEN_LIMIT_EXCEEDED':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'NETWORK_ERROR':
      case 'API_ERROR':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'STORAGE_UNAVAILABLE':
      case 'CRYPTO_UNAVAILABLE':
        return 'bg-blue-50 border-blue-200 text-blue-800';
      case 'VALIDATION_FAILED':
        return 'bg-orange-50 border-orange-200 text-orange-800';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  const getErrorIcon = (error: ContextError) => {
    switch (error.type) {
      case 'TOKEN_LIMIT_EXCEEDED':
        return '⚠️';
      case 'NETWORK_ERROR':
      case 'API_ERROR':
        return '🔄';
      case 'STORAGE_UNAVAILABLE':
        return '💾';
      case 'CRYPTO_UNAVAILABLE':
        return '🔒';
      case 'VALIDATION_FAILED':
        return '📝';
      case 'BROWSER_UNSUPPORTED':
        return '🌐';
      default:
        return 'ℹ️';
    }
  };

  return (
    <div 
      className={`fixed top-4 right-4 max-w-md z-50 transform transition-all duration-300 ${
        isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
      }`}
      role="alert"
      aria-live="assertive"
    >
      <div className={`p-4 rounded-lg border shadow-lg ${getErrorStyles(lastError)}`}>
        <div className="flex items-start gap-3">
          <span className="text-lg flex-shrink-0" aria-hidden="true">
            {getErrorIcon(lastError)}
          </span>
          
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-semibold mb-1">
              {lastError.type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </h4>
            <p className="text-sm opacity-90">
              {lastError.userMessage}
            </p>
            
            {process.env.NODE_ENV === 'development' && (
              <details className="mt-2">
                <summary className="text-xs opacity-75 cursor-pointer">
                  Technical Details
                </summary>
                <pre className="text-xs mt-1 opacity-75 whitespace-pre-wrap">
                  {lastError.message}
                  {lastError.context && '\n' + JSON.stringify(lastError.context, null, 2)}
                </pre>
              </details>
            )}
          </div>

          <div className="flex flex-col gap-2 flex-shrink-0">
            {lastError.retryable && (
              <button
                onClick={handleRetry}
                disabled={isRetrying}
                className="text-xs px-2 py-1 bg-white bg-opacity-50 hover:bg-opacity-75 rounded transition-colors disabled:opacity-50"
                aria-label={`Retry ${lastError.type.toLowerCase().replace(/_/g, ' ')}`}
              >
                {isRetrying ? '...' : 'Retry'}
              </button>
            )}
            <button
              onClick={handleDismiss}
              className="text-xs px-2 py-1 bg-white bg-opacity-50 hover:bg-opacity-75 rounded transition-colors"
              aria-label="Dismiss error notification"
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
```

**Enhanced Form Validation**:
```typescript
// lib/validation/contextValidation.ts - New file

import { CompletionContextState } from '@/lib/types';
import { ContextErrorHandler } from '@/lib/errors/ContextErrorHandler';
import { getContextTokenCount } from '@/lib/tokenizer';

export interface ValidationResult {
  isValid: boolean;
  errors: Array<{
    field: keyof CompletionContextState;
    message: string;
    type: string;
  }>;
  warnings: Array<{
    field: keyof CompletionContextState;
    message: string;
    type: string;
  }>;
}

export function validateContextState(context: CompletionContextState): ValidationResult {
  const errors: ValidationResult['errors'] = [];
  const warnings: ValidationResult['warnings'] = [];

  // Token count validation
  const tokenCount = getContextTokenCount(context);
  if (tokenCount > 20000) {
    errors.push({
      field: 'contextText',
      message: `Context exceeds 20,000 token limit (${tokenCount.toLocaleString()} tokens)`,
      type: 'TOKEN_LIMIT_EXCEEDED'
    });
  } else if (tokenCount > 18000) {
    warnings.push({
      field: 'contextText',
      message: `Approaching token limit (${tokenCount.toLocaleString()}/20,000 tokens)`,
      type: 'TOKEN_LIMIT_WARNING'
    });
  }

  // Text content validation
  if (context.contextText) {
    // Check for potentially problematic content
    const suspiciousPatterns = [
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      /<[^>]*on\w+\s*=/gi, // Event handlers
      /javascript:/gi
    ];
    
    for (const pattern of suspiciousPatterns) {
      if (pattern.test(context.contextText)) {
        errors.push({
          field: 'contextText',
          message: 'Context contains potentially unsafe content',
          type: 'UNSAFE_CONTENT'
        });
        break;
      }
    }
  }

  // Field length validations
  if (context.audience && context.audience.length > 64) {
    errors.push({
      field: 'audience',
      message: `Audience field too long (${context.audience.length}/64 characters)`,
      type: 'FIELD_TOO_LONG'
    });
  }

  // Keywords validation
  if (context.keywords) {
    if (context.keywords.length > 10) {
      errors.push({
        field: 'keywords',
        message: `Too many keywords (${context.keywords.length}/10)`,
        type: 'TOO_MANY_ITEMS'
      });
    }

    const invalidKeywords = context.keywords.filter(k => k.length > 32);
    if (invalidKeywords.length > 0) {
      errors.push({
        field: 'keywords',
        message: `Keywords too long: ${invalidKeywords.join(', ')} (max 32 characters each)`,
        type: 'ITEM_TOO_LONG'
      });
    }

    const emptyKeywords = context.keywords.filter(k => !k.trim());
    if (emptyKeywords.length > 0) {
      errors.push({
        field: 'keywords',
        message: 'Empty keywords are not allowed',
        type: 'EMPTY_ITEM'
      });
    }

    // Check for duplicates
    const duplicates = context.keywords.filter((item, index) => 
      context.keywords.indexOf(item) !== index
    );
    if (duplicates.length > 0) {
      warnings.push({
        field: 'keywords',
        message: `Duplicate keywords: ${[...new Set(duplicates)].join(', ')}`,
        type: 'DUPLICATE_ITEMS'
      });
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

export function validateContextUpdate(
  currentContext: CompletionContextState,
  updates: Partial<CompletionContextState>
): ValidationResult {
  const updatedContext = { ...currentContext, ...updates };
  return validateContextState(updatedContext);
}
```

**Enhanced ContextPanel with Validation**:
```typescript
// components/ContextPanel.tsx - Validation integration

import { validateContextUpdate, ValidationResult } from '@/lib/validation/contextValidation';

export const ContextPanel: React.FC<ContextPanelProps> = ({ ... }) => {
  const [validationState, setValidationState] = useState<ValidationResult>({
    isValid: true,
    errors: [],
    warnings: []
  });

  // Enhanced context update with validation
  const handleValidatedUpdate = useCallback(async (updates: Partial<CompletionContextState>) => {
    // Pre-validate the update
    const validation = validateContextUpdate(context, updates);
    setValidationState(validation);

    if (!validation.isValid) {
      // Show validation errors but don't prevent the update for recoverable issues
      const hasBlockingErrors = validation.errors.some(e => 
        e.type === 'TOKEN_LIMIT_EXCEEDED' || 
        e.type === 'FIELD_TOO_LONG' || 
        e.type === 'TOO_MANY_ITEMS'
      );

      if (hasBlockingErrors) {
        announceToScreenReader(
          `Cannot save changes: ${validation.errors[0].message}`,
          'assertive'
        );
        return; // Block the update
      }
    }

    try {
      await updateContext(updates);
      
      // Clear validation errors on successful update
      if (validation.warnings.length === 0) {
        setValidationState({ isValid: true, errors: [], warnings: [] });
      }
    } catch (error) {
      // Error is already handled by the context provider
      console.debug('Update failed:', error);
    }
  }, [context, updateContext, announceToScreenReader]);

  // Validation feedback display
  const renderValidationFeedback = () => {
    if (validationState.isValid && validationState.warnings.length === 0) {
      return null;
    }

    return (
      <div className="px-3 py-2 border-b space-y-1">
        {validationState.errors.map((error, index) => (
          <div 
            key={`error-${index}`}
            className="text-xs text-red-700 bg-red-50 px-2 py-1 rounded"
            role="alert"
          >
            <span className="font-medium">{error.field}:</span> {error.message}
          </div>
        ))}
        {validationState.warnings.map((warning, index) => (
          <div 
            key={`warning-${index}`}
            className="text-xs text-yellow-700 bg-yellow-50 px-2 py-1 rounded"
          >
            <span className="font-medium">{warning.field}:</span> {warning.message}
          </div>
        ))}
      </div>
    );
  };

  return (
    <>
      <div className="context-panel border border-gray-200 rounded-lg mb-4 bg-white shadow-sm">
        {/* ... existing header ... */}
        
        {/* Validation feedback */}
        {renderValidationFeedback()}
        
        {/* ... existing warning banner and content ... */}
      </div>

      {/* Error notification system */}
      <ErrorNotification />
    </>
  );
};
```

**Acceptance Criteria**:
- [ ] Comprehensive error classification system with user-friendly messages
- [ ] Graceful degradation when localStorage or crypto APIs unavailable
- [ ] Form validation with real-time feedback for all input fields
- [ ] Token limit enforcement with progressive warnings (15k, 18k, 20k)
- [ ] Network error handling with retry mechanisms
- [ ] Auto-recovery for transient errors (storage failures, crypto issues)
- [ ] Error notifications with appropriate styling and dismissal options
- [ ] Validation state management prevents invalid data submission
- [ ] Development mode shows technical error details
- [ ] Error messages announced to screen readers
- [ ] Retry functionality for recoverable errors
- [ ] Error logging for debugging without exposing sensitive data

---

## Phase 2 Summary

**Total Tasks**: 6  
**Estimated Complexity**: 1 Small (Task 2.3), 3 Medium (Task 2.2, 2.4, 2.6), 2 Large (Task 2.1, 2.5)  
**Critical Path**: Task 2.1 → 2.2 → 2.5  
**Parallel Opportunities**: Multiple tasks can run in parallel after Task 2.1 completes

**Phase 2 Success Criteria**:
- Professional UI with structured hint selectors and enhanced interactions
- Accurate client-side token counting with visual warnings
- Full keyboard accessibility and WCAG 2.1 AA compliance
- Cache-optimized performance with visible TTFT improvements
- Robust error handling with user-friendly feedback
- Enhanced user experience meeting production quality standards

**Risk Mitigation**:
- Accessibility testing requires manual verification with assistive technologies
- Token counting accuracy may need calibration against server-side validation  
- Cache performance benefits depend on Gemini model caching behavior
- Error handling complexity may require iterative refinement based on user feedback