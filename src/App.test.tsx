import { describe, it, expect, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import App from './App';

// Mock the auth context
const mockUseAuth = vi.fn();
vi.mock('./context/AuthContext', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  useAuth: () => mockUseAuth(),
}));

// Mock screens
vi.mock('./screens/AuthScreen', () => ({
  default: () => <div data-testid="auth-screen">Auth Screen</div>,
}));
vi.mock('./screens/HomeScreen', () => ({
  default: ({ onOpenChat }: { onOpenChat: (id: string, partner: unknown) => void }) => (
    <div data-testid="home-screen">
      <button
        data-testid="open-chat"
        onClick={() => onOpenChat('chat-1', { id: 'p1', username: 'partner', display_name: 'Partner', avatar_url: null })}
      >
        Open Chat
      </button>
    </div>
  ),
}));
vi.mock('./screens/ChatScreen', () => ({
  default: ({ chatId, partner, onBack }: { chatId: string; partner: { display_name: string }; onBack: () => void }) => (
    <div data-testid="chat-screen">
      Chat: {chatId} with {partner.display_name}
      <button data-testid="back-btn" onClick={onBack}>Back</button>
    </div>
  ),
}));

describe('App', () => {
  it('shows loading spinner when auth is loading', () => {
    mockUseAuth.mockReturnValue({ session: null, loading: true });
    render(<App />);
    // The Loader2 icon renders an SVG with animate-spin class
    const spinner = document.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });

  it('shows AuthScreen when there is no session', () => {
    mockUseAuth.mockReturnValue({ session: null, loading: false });
    render(<App />);
    expect(screen.getByTestId('auth-screen')).toBeInTheDocument();
  });

  it('shows HomeScreen when user is authenticated', () => {
    mockUseAuth.mockReturnValue({
      session: { user: { id: 'u1' } },
      loading: false,
    });
    render(<App />);
    expect(screen.getByTestId('home-screen')).toBeInTheDocument();
  });

  it('navigates to ChatScreen when a chat is opened', async () => {
    mockUseAuth.mockReturnValue({
      session: { user: { id: 'u1' } },
      loading: false,
    });
    render(<App />);

    await act(async () => {
      screen.getByTestId('open-chat').click();
    });

    expect(screen.getByTestId('chat-screen')).toBeInTheDocument();
    expect(screen.getByText('Chat: chat-1 with Partner')).toBeInTheDocument();
  });

  it('navigates back from ChatScreen to HomeScreen', async () => {
    mockUseAuth.mockReturnValue({
      session: { user: { id: 'u1' } },
      loading: false,
    });
    render(<App />);

    await act(async () => {
      screen.getByTestId('open-chat').click();
    });
    expect(screen.getByTestId('chat-screen')).toBeInTheDocument();

    await act(async () => {
      screen.getByTestId('back-btn').click();
    });
    expect(screen.getByTestId('home-screen')).toBeInTheDocument();
  });
});
