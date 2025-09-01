'use client';
import React, { useEffect } from 'react';
import { useEditor, EditorContent, Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { InlineComplete } from '@/lib/InlineComplete';
import { useCompletionContext } from '@/lib/context/CompletionContext';
import { ContextPanel } from '@/components/ContextPanel';
import { useAccessibility } from '@/lib/hooks/useAccessibility';
import type { CompletionContextState } from '@/lib/types';

const MenuButton = ({ 
  onClick,
  isActive,
  disabled,
  children,
  ariaLabel
}: {
  onClick: () => void;
  isActive: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  ariaLabel?: string;
}) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`px-3 py-1.5 text-sm rounded transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center ${
      isActive
        ? 'bg-blue-100 text-blue-700 border border-blue-200'
        : 'hover:bg-gray-100 border border-transparent'
    }`}
    aria-pressed={isActive}
    aria-label={ariaLabel}
    type="button"
  >
    {children}
  </button>
);

const MenuSeparator = () => (
  <div 
    className="w-px h-6 bg-gray-300 mx-1 self-center" 
    role="separator"
    aria-orientation="vertical"
  ></div>
);

const MenuBar = ({ editor }: { editor: Editor | null }) => {
  if (!editor) {
    return null;
  }

  return (
    <div 
      className="border-b border-gray-200 p-2 flex flex-wrap gap-1 bg-gray-50"
      role="toolbar"
      aria-label="Text formatting toolbar"
    >
      <MenuButton
        onClick={() => editor.chain().focus().toggleBold().run()}
        isActive={editor.isActive('bold')}
        disabled={!editor.can().chain().focus().toggleBold().run()}
        ariaLabel={`Toggle bold formatting ${editor.isActive('bold') ? '(currently active)' : ''}`}
      >
        <strong>B</strong>
      </MenuButton>
      <MenuButton
        onClick={() => editor.chain().focus().toggleItalic().run()}
        isActive={editor.isActive('italic')}
        disabled={!editor.can().chain().focus().toggleItalic().run()}
        ariaLabel={`Toggle italic formatting ${editor.isActive('italic') ? '(currently active)' : ''}`}
      >
        <em>I</em>
      </MenuButton>
      <MenuButton
        onClick={() => editor.chain().focus().toggleStrike().run()}
        isActive={editor.isActive('strike')}
        disabled={!editor.can().chain().focus().toggleStrike().run()}
        ariaLabel={`Toggle strikethrough formatting ${editor.isActive('strike') ? '(currently active)' : ''}`}
      >
        <s>S</s>
      </MenuButton>
      <MenuSeparator />
      <MenuButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        isActive={editor.isActive('heading', { level: 1 })}
        ariaLabel={`Toggle heading 1 ${editor.isActive('heading', { level: 1 }) ? '(currently active)' : ''}`}
      >
        H1
      </MenuButton>
      <MenuButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        isActive={editor.isActive('heading', { level: 2 })}
        ariaLabel={`Toggle heading 2 ${editor.isActive('heading', { level: 2 }) ? '(currently active)' : ''}`}
      >
        H2
      </MenuButton>
      <MenuButton
        onClick={() => editor.chain().focus().setParagraph().run()}
        isActive={editor.isActive('paragraph')}
        ariaLabel={`Set as paragraph ${editor.isActive('paragraph') ? '(currently active)' : ''}`}
      >
        P
      </MenuButton>
      <MenuSeparator />
      <MenuButton
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        isActive={editor.isActive('bulletList')}
        ariaLabel={`Toggle bullet list ${editor.isActive('bulletList') ? '(currently active)' : ''}`}
      >
        • List
      </MenuButton>
      <MenuButton
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        isActive={editor.isActive('orderedList')}
        ariaLabel={`Toggle numbered list ${editor.isActive('orderedList') ? '(currently active)' : ''}`}
      >
        1. List
      </MenuButton>
      <MenuButton
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        isActive={editor.isActive('blockquote')}
        ariaLabel={`Toggle blockquote ${editor.isActive('blockquote') ? '(currently active)' : ''}`}
      >
        <span aria-hidden="true">❝</span> Quote
      </MenuButton>
    </div>
  );
};

const AutocompleteEditor: React.FC = () => {
  const completionContext = useCompletionContext();
  const { addSkipLink, preferences, getHighContrastStyles } = useAccessibility();
  
  const editor = useEditor({
    extensions: [
      StarterKit,
      InlineComplete.configure({
        debounceMs: 120,
        maxPrefixLength: 1000,
        enabled: true,
        getContext: () => {
          // Extract only the state portion, not the methods
          const { 
            contextText, 
            documentType, 
            language, 
            tone, 
            audience, 
            keywords 
          } = completionContext;
          return { 
            contextText: contextText || '', 
            documentType, 
            language, 
            tone, 
            audience, 
            keywords 
          } as CompletionContextState;
        },
      }),
    ],
    content: '',
    autofocus: 'end',
    immediatelyRender: false,
    editorProps: {
      attributes: {
        'data-placeholder': 'Start typing to see AI autocomplete suggestions...',
        spellcheck: 'false',
      },
    },
  }); // Remove context dependency - getContext callback provides current context

  // Add skip links and cleanup on unmount
  useEffect(() => {
    // Add skip links for accessibility
    const removeContextSkip = addSkipLink('context-panel', 'Skip to context panel');
    const removeEditorSkip = addSkipLink('editor-main', 'Skip to main editor');
    
    return () => {
      editor?.destroy();
      removeContextSkip();
      removeEditorSkip();
    };
  }, [editor, addSkipLink]);

  if (!editor) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="text-gray-500">Loading editor...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50" style={getHighContrastStyles()}>
      <div className="max-w-4xl mx-auto px-6 py-12">
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-3">AI Autocomplete Demo</h1>
          <p className="text-lg text-gray-600">Experience AI-powered writing assistance as you type</p>
        </header>
        
        <ContextPanel />
        
        <main>
          <div 
            id="editor-main"
            className="editor-container mb-6"
            role="application"
            aria-label="AI-powered text editor with autocomplete suggestions"
          >
            <MenuBar editor={editor} />
            <EditorContent editor={editor} className="editor-content" />
          </div>
          
          {/* Editor instructions section */}
          <section aria-labelledby="editor-help-heading">
            <h2 id="editor-help-heading" className="sr-only">Editor keyboard shortcuts and help</h2>
            
            <div className="space-y-4">
              {/* Editor shortcuts */}
              <div className="flex items-center justify-center gap-8 text-sm text-gray-500">
                <div className="flex items-center gap-2">
                  <kbd className="px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-xs font-mono shadow-sm">Tab</kbd>
                  <span>Accept suggestion</span>
                </div>
                <div className="flex items-center gap-2">
                  <kbd className="px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-xs font-mono shadow-sm">Esc</kbd>
                  <span>Dismiss</span>
                </div>
              </div>
              
              {/* Context panel shortcuts */}
              <div className="flex items-center justify-center gap-6 text-xs text-gray-400">
                <div className="flex items-center gap-1.5">
                  <kbd className="px-2 py-1 bg-gray-100 border border-gray-200 rounded text-xs font-mono shadow-sm">
                    Ctrl+Shift+C
                  </kbd>
                  <span>Toggle context</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <kbd className="px-2 py-1 bg-gray-100 border border-gray-200 rounded text-xs font-mono shadow-sm">
                    Ctrl+Shift+/
                  </kbd>
                  <span>Focus context</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <kbd className="px-2 py-1 bg-gray-100 border border-gray-200 rounded text-xs font-mono shadow-sm">
                    Ctrl+Shift+?
                  </kbd>
                  <span>Shortcuts help</span>
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
};

// Error boundary wrapper
class AutocompleteErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Autocomplete Editor Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="max-w-4xl mx-auto p-6">
          <div className="p-4 border border-red-300 rounded-lg bg-red-50">
            <h2 className="text-lg font-semibold text-red-800 mb-2">
              Editor Failed to Load
            </h2>
            <p className="text-red-600 mb-4">
              The autocomplete editor encountered an error. Please refresh the page to try again.
            </p>
            <button 
              onClick={() => window.location.reload()} 
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function Page() {
  return (
    <AutocompleteErrorBoundary>
      <AutocompleteEditor />
    </AutocompleteErrorBoundary>
  );
}