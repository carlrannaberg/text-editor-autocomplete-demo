'use client';
import React, { useCallback, useEffect, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { InlineComplete } from '@/lib/InlineComplete';
import { ApiResponse } from '@/lib/types';

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
    <div className="prose mx-auto max-w-4xl p-6">
      <h1 className="text-3xl font-bold mb-6">AI Autocomplete Demo</h1>
      <div className="editor-container">
        <EditorContent editor={editor} className="editor-content" />
      </div>
      <div className="mt-4 text-sm text-gray-500 space-x-4">
        <span>
          Press <kbd className="px-2 py-1 bg-gray-100 rounded text-xs">Tab</kbd> to accept suggestions
        </span>
        <span>
          Press <kbd className="px-2 py-1 bg-gray-100 rounded text-xs">Esc</kbd> to dismiss
        </span>
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