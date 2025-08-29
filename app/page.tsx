'use client';
import React, { useCallback, useEffect, useRef } from 'react';
import { useEditor, EditorContent, Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { InlineComplete } from '@/lib/InlineComplete';
import { ApiResponse } from '@/lib/types';

const MenuBar = ({ editor }: { editor: Editor | null }) => {
  if (!editor) {
    return null;
  }

  return (
    <div className="border-b border-gray-200 p-2 flex flex-wrap gap-1 bg-gray-50">
      <button
        onClick={() => editor.chain().focus().toggleBold().run()}
        disabled={!editor.can().chain().focus().toggleBold().run()}
        className={`px-3 py-1.5 text-sm rounded transition-colors ${
          editor.isActive('bold')
            ? 'bg-blue-100 text-blue-700 border border-blue-200'
            : 'hover:bg-gray-100 border border-transparent'
        }`}
      >
        <strong>B</strong>
      </button>
      <button
        onClick={() => editor.chain().focus().toggleItalic().run()}
        disabled={!editor.can().chain().focus().toggleItalic().run()}
        className={`px-3 py-1.5 text-sm rounded transition-colors ${
          editor.isActive('italic')
            ? 'bg-blue-100 text-blue-700 border border-blue-200'
            : 'hover:bg-gray-100 border border-transparent'
        }`}
      >
        <em>I</em>
      </button>
      <button
        onClick={() => editor.chain().focus().toggleStrike().run()}
        disabled={!editor.can().chain().focus().toggleStrike().run()}
        className={`px-3 py-1.5 text-sm rounded transition-colors ${
          editor.isActive('strike')
            ? 'bg-blue-100 text-blue-700 border border-blue-200'
            : 'hover:bg-gray-100 border border-transparent'
        }`}
      >
        <s>S</s>
      </button>
      <div className="w-px h-6 bg-gray-300 mx-1 self-center"></div>
      <button
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        className={`px-3 py-1.5 text-sm rounded transition-colors ${
          editor.isActive('heading', { level: 1 })
            ? 'bg-blue-100 text-blue-700 border border-blue-200'
            : 'hover:bg-gray-100 border border-transparent'
        }`}
      >
        H1
      </button>
      <button
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        className={`px-3 py-1.5 text-sm rounded transition-colors ${
          editor.isActive('heading', { level: 2 })
            ? 'bg-blue-100 text-blue-700 border border-blue-200'
            : 'hover:bg-gray-100 border border-transparent'
        }`}
      >
        H2
      </button>
      <button
        onClick={() => editor.chain().focus().setParagraph().run()}
        className={`px-3 py-1.5 text-sm rounded transition-colors ${
          editor.isActive('paragraph')
            ? 'bg-blue-100 text-blue-700 border border-blue-200'
            : 'hover:bg-gray-100 border border-transparent'
        }`}
      >
        P
      </button>
      <div className="w-px h-6 bg-gray-300 mx-1 self-center"></div>
      <button
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={`px-3 py-1.5 text-sm rounded transition-colors ${
          editor.isActive('bulletList')
            ? 'bg-blue-100 text-blue-700 border border-blue-200'
            : 'hover:bg-gray-100 border border-transparent'
        }`}
      >
        • List
      </button>
      <button
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        className={`px-3 py-1.5 text-sm rounded transition-colors ${
          editor.isActive('orderedList')
            ? 'bg-blue-100 text-blue-700 border border-blue-200'
            : 'hover:bg-gray-100 border border-transparent'
        }`}
      >
        1. List
      </button>
      <button
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        className={`px-3 py-1.5 text-sm rounded transition-colors ${
          editor.isActive('blockquote')
            ? 'bg-blue-100 text-blue-700 border border-blue-200'
            : 'hover:bg-gray-100 border border-transparent'
        }`}
      >
        ❝ Quote
      </button>
    </div>
  );
};

const AutocompleteEditor: React.FC = () => {
  const abortControllerRef = useRef<AbortController | null>(null);
  
  const fetchTail = useCallback(async (left: string): Promise<ApiResponse> => {
    // Cancel previous request
    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();
    
    try {
      const response = await fetch('/api/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ left }),
        signal: abortControllerRef.current.signal,
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return { success: false, error: { type: 'NETWORK_ERROR', message: 'Cancelled', retryable: true } };
      }
      console.error('Autocomplete failed:', error);
      return { success: false, error: { type: 'NETWORK_ERROR', message: 'Network failure', retryable: true } };
    }
  }, []);

  const editor = useEditor({
    extensions: [
      StarterKit,
      InlineComplete.configure({
        fetchTail,
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
  }, [fetchTail]); // Proper dependency array

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
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