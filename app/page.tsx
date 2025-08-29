'use client';
import React, { useEffect } from 'react';
import { useEditor, EditorContent, Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { InlineComplete } from '@/lib/InlineComplete';

const MenuButton = ({ 
  onClick,
  isActive,
  disabled,
  children
}: {
  onClick: () => void;
  isActive: boolean;
  disabled?: boolean;
  children: React.ReactNode;
}) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`px-3 py-1.5 text-sm rounded transition-colors ${
      isActive
        ? 'bg-blue-100 text-blue-700 border border-blue-200'
        : 'hover:bg-gray-100 border border-transparent'
    }`}
  >
    {children}
  </button>
);

const MenuSeparator = () => (
  <div className="w-px h-6 bg-gray-300 mx-1 self-center"></div>
);

const MenuBar = ({ editor }: { editor: Editor | null }) => {
  if (!editor) {
    return null;
  }

  return (
    <div className="border-b border-gray-200 p-2 flex flex-wrap gap-1 bg-gray-50">
      <MenuButton
        onClick={() => editor.chain().focus().toggleBold().run()}
        isActive={editor.isActive('bold')}
        disabled={!editor.can().chain().focus().toggleBold().run()}
      >
        <strong>B</strong>
      </MenuButton>
      <MenuButton
        onClick={() => editor.chain().focus().toggleItalic().run()}
        isActive={editor.isActive('italic')}
        disabled={!editor.can().chain().focus().toggleItalic().run()}
      >
        <em>I</em>
      </MenuButton>
      <MenuButton
        onClick={() => editor.chain().focus().toggleStrike().run()}
        isActive={editor.isActive('strike')}
        disabled={!editor.can().chain().focus().toggleStrike().run()}
      >
        <s>S</s>
      </MenuButton>
      <MenuSeparator />
      <MenuButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        isActive={editor.isActive('heading', { level: 1 })}
      >
        H1
      </MenuButton>
      <MenuButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        isActive={editor.isActive('heading', { level: 2 })}
      >
        H2
      </MenuButton>
      <MenuButton
        onClick={() => editor.chain().focus().setParagraph().run()}
        isActive={editor.isActive('paragraph')}
      >
        P
      </MenuButton>
      <MenuSeparator />
      <MenuButton
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        isActive={editor.isActive('bulletList')}
      >
        • List
      </MenuButton>
      <MenuButton
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        isActive={editor.isActive('orderedList')}
      >
        1. List
      </MenuButton>
      <MenuButton
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        isActive={editor.isActive('blockquote')}
      >
        ❝ Quote
      </MenuButton>
    </div>
  );
};

const AutocompleteEditor: React.FC = () => {
  const editor = useEditor({
    extensions: [
      StarterKit,
      InlineComplete.configure({
        debounceMs: 120,
        maxPrefixLength: 1000,
        enabled: true,
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
  }, []); // Empty dependency array since using built-in manager

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      editor?.destroy();
    };
  }, [editor]);

  if (!editor) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="text-gray-500">Loading editor...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-3">AI Autocomplete Demo</h1>
          <p className="text-lg text-gray-600">Experience AI-powered writing assistance as you type</p>
        </div>
        
        <div className="editor-container mb-6">
          <MenuBar editor={editor} />
          <EditorContent editor={editor} className="editor-content" />
        </div>
        
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