// __tests__/components/AutocompleteEditor.test.tsx
import { render, screen } from '@testing-library/react';
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
    const mockEditor = {
      destroy: jest.fn(),
    };
    mockUseEditor.mockReturnValue(mockEditor);

    render(<Page />);
    
    expect(screen.getByText('Editor loaded')).toBeInTheDocument();
    expect(screen.getByText('AI Autocomplete Demo')).toBeInTheDocument();
  });

  test('should display keyboard shortcuts', () => {
    const mockEditor = { destroy: jest.fn() };
    mockUseEditor.mockReturnValue(mockEditor);

    render(<Page />);

    expect(screen.getByText('Tab')).toBeInTheDocument();
    expect(screen.getByText('Esc')).toBeInTheDocument();
  });

  test('should configure editor with proper options', () => {
    const mockEditor = { destroy: jest.fn() };
    mockUseEditor.mockReturnValue(mockEditor);

    render(<Page />);

    expect(mockUseEditor).toHaveBeenCalledWith(
      expect.objectContaining({
        extensions: expect.any(Array),
        content: '',
        autofocus: 'end',
      }),
      expect.any(Array)
    );
  });

  test('should have editor content area', () => {
    const mockEditor = { destroy: jest.fn() };
    mockUseEditor.mockReturnValue(mockEditor);

    render(<Page />);

    expect(screen.getByTestId('editor-content')).toBeInTheDocument();
  });
});