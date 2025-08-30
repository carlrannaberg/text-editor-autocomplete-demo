// __tests__/components/AutocompleteEditor.test.tsx
import '@testing-library/jest-dom';
import { render, screen } from '../utils/test-helpers';
import Page from '@/app/page';
import { useEditor } from '@tiptap/react';

// Mock Tiptap
jest.mock('@tiptap/react', () => ({
  useEditor: jest.fn(),
  EditorContent: ({ editor, className }: { editor: unknown; className?: string }) => (
    <div data-testid="editor-content" className={className}>
      {editor ? 'Editor loaded' : 'Loading...'}
    </div>
  ),
}));

const mockUseEditor = useEditor as jest.Mock;

const createMockEditor = () => {
  // Create a proper chained commands mock
  const createChainedCommands = () => ({
    focus: () => createChainedCommands(),
    toggleBold: () => createChainedCommands(),
    toggleItalic: () => createChainedCommands(),
    toggleStrike: () => createChainedCommands(),
    toggleHeading: (params?: { level: 1 | 2 | 3 | 4 | 5 | 6 }) => createChainedCommands(),
    setParagraph: () => createChainedCommands(),
    toggleBulletList: () => createChainedCommands(),
    toggleOrderedList: () => createChainedCommands(),
    toggleBlockquote: () => createChainedCommands(),
    run: jest.fn().mockReturnValue(true)
  });

  // Create can() mock that returns chainable commands
  const createCanChain = () => ({
    focus: () => createCanChain(),
    toggleBold: () => createCanChain(),
    toggleItalic: () => createCanChain(),
    toggleStrike: () => createCanChain(),
    toggleHeading: (params?: { level: 1 | 2 | 3 | 4 | 5 | 6 }) => createCanChain(),
    setParagraph: () => createCanChain(),
    toggleBulletList: () => createCanChain(),
    toggleOrderedList: () => createCanChain(),
    toggleBlockquote: () => createCanChain(),
    run: jest.fn().mockReturnValue(true)
  });

  return {
    destroy: jest.fn(),
    can: jest.fn().mockReturnValue({
      chain: () => createCanChain()
    }),
    chain: jest.fn().mockReturnValue(createChainedCommands()),
    isActive: jest.fn().mockReturnValue(false)
  };
};

describe('AutocompleteEditor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ tail: 'world', confidence: 0.8 }),
    });
  });

  test('should render loading state initially', () => {
    mockUseEditor.mockReturnValue(null); // Editor not ready

    render(<Page />);
    
    expect(screen.getByText('Loading editor...')).toBeInTheDocument();
  });

  test('should render editor when ready', () => {
    const mockEditor = createMockEditor();
    mockUseEditor.mockReturnValue(mockEditor);

    render(<Page />);
    
    expect(screen.getByText('Editor loaded')).toBeInTheDocument();
    expect(screen.getByText('AI Autocomplete Demo')).toBeInTheDocument();
  });

  test('should display keyboard shortcuts', () => {
    const mockEditor = createMockEditor();
    mockUseEditor.mockReturnValue(mockEditor);

    render(<Page />);

    expect(screen.getByText('Tab')).toBeInTheDocument();
    expect(screen.getByText('Esc')).toBeInTheDocument();
  });

  test('should configure editor with proper options', () => {
    const mockEditor = createMockEditor();
    mockUseEditor.mockReturnValue(mockEditor);

    render(<Page />);

    expect(mockUseEditor).toHaveBeenCalledWith(
      expect.objectContaining({
        extensions: expect.any(Array),
        content: '',
        autofocus: 'end',
        immediatelyRender: false,
        editorProps: expect.objectContaining({
          attributes: expect.objectContaining({
            'data-placeholder': 'Start typing to see AI autocomplete suggestions...',
            spellcheck: 'false'
          })
        })
      })
    );
  });

  test('should have editor content area', () => {
    const mockEditor = createMockEditor();
    mockUseEditor.mockReturnValue(mockEditor);

    render(<Page />);

    expect(screen.getByTestId('editor-content')).toBeInTheDocument();
  });
});