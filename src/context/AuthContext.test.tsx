import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';

// Create mock functions at module level
const mockGetSession = vi.fn();
const mockOnAuthStateChange = vi.fn();
const mockSignUp = vi.fn();
const mockSignInWithPassword = vi.fn();
const mockSignOut = vi.fn();
const mockFrom = vi.fn();

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
    auth: {
      signUp: (...args: unknown[]) => mockSignUp(...args),
      signInWithPassword: (...args: unknown[]) => mockSignInWithPassword(...args),
      signOut: (...args: unknown[]) => mockSignOut(...args),
      getSession: (...args: unknown[]) => mockGetSession(...args),
      onAuthStateChange: (...args: unknown[]) => mockOnAuthStateChange(...args),
    },
  },
}));

// Import after mock setup
import { AuthProvider, useAuth } from './AuthContext';

function TestConsumer() {
  const auth = useAuth();
  return (
    <div>
      <span data-testid="loading">{String(auth.loading)}</span>
      <span data-testid="user">{auth.user?.id ?? 'null'}</span>
      <span data-testid="profile">{auth.profile?.username ?? 'null'}</span>
      <button data-testid="sign-in" onClick={() => auth.signIn('test@test.com', 'password')}>
        Sign In
      </button>
      <button data-testid="sign-up" onClick={() => auth.signUp('test@test.com', 'pass', 'TestUser!@#', 'Test User')}>
        Sign Up
      </button>
      <button data-testid="sign-out" onClick={() => auth.signOut()}>
        Sign Out
      </button>
    </div>
  );
}

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue({ data: { session: null } });
    mockOnAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    });
  });

  it('throws when useAuth is used outside AuthProvider', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<TestConsumer />)).toThrow('useAuth must be used within AuthProvider');
    consoleSpy.mockRestore();
  });

  it('initializes with loading state and then resolves to no session', async () => {
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });
    expect(screen.getByTestId('user').textContent).toBe('null');
    expect(screen.getByTestId('profile').textContent).toBe('null');
  });

  it('loads profile when session exists', async () => {
    const mockUser = { id: 'user-123', email: 'test@test.com' };
    const mockSession = { user: mockUser };

    mockGetSession.mockResolvedValue({ data: { session: mockSession } });

    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: { id: 'user-123', username: 'testuser', display_name: 'Test User', avatar_url: null },
          }),
        }),
      }),
    });

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });
    expect(screen.getByTestId('profile').textContent).toBe('testuser');
  });

  it('signUp sanitizes username to lowercase alphanumeric and underscores', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });

    const upsertMock = vi.fn().mockResolvedValue({ error: null });
    mockFrom.mockImplementation(() => {
      // First call: check if username exists -> not found
      // Second call: upsert profile
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: null }),
          }),
        }),
        upsert: upsertMock,
      };
    });

    mockSignUp.mockResolvedValue({
      data: { user: { id: 'new-user' } },
      error: null,
    });

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });

    await act(async () => {
      screen.getByTestId('sign-up').click();
    });

    expect(mockSignUp).toHaveBeenCalledWith({ email: 'test@test.com', password: 'pass' });

    // Upsert should use cleaned username (lowercase, no special chars)
    expect(upsertMock).toHaveBeenCalledWith({
      id: 'new-user',
      username: 'testuser', // 'TestUser!@#' -> 'testuser'
      display_name: 'Test User',
    });
  });

  it('signUp returns error if username already exists', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });

    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'existing-user' } }),
        }),
      }),
    });

    let signUpResult: { error: string | null } | undefined;

    function SignUpConsumer() {
      const auth = useAuth();
      return (
        <button
          data-testid="sign-up-btn"
          onClick={async () => {
            signUpResult = await auth.signUp('x@x.com', 'p', 'taken', 'Name');
          }}
        >
          Go
        </button>
      );
    }

    render(
      <AuthProvider>
        <SignUpConsumer />
      </AuthProvider>
    );

    await waitFor(() => expect(mockGetSession).toHaveBeenCalled());

    await act(async () => {
      screen.getByTestId('sign-up-btn').click();
    });

    expect(signUpResult?.error).toBe('Este @username já está em uso');
    expect(mockSignUp).not.toHaveBeenCalled();
  });

  it('signIn calls supabase signInWithPassword', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });
    mockSignInWithPassword.mockResolvedValue({ error: null });

    let signInResult: { error: string | null } | undefined;

    function SignInConsumer() {
      const auth = useAuth();
      return (
        <button
          data-testid="sign-in-btn"
          onClick={async () => {
            signInResult = await auth.signIn('a@b.com', 'secret');
          }}
        >
          Go
        </button>
      );
    }

    render(
      <AuthProvider>
        <SignInConsumer />
      </AuthProvider>
    );

    await waitFor(() => expect(mockGetSession).toHaveBeenCalled());

    await act(async () => {
      screen.getByTestId('sign-in-btn').click();
    });

    expect(mockSignInWithPassword).toHaveBeenCalledWith({ email: 'a@b.com', password: 'secret' });
    expect(signInResult?.error).toBeNull();
  });

  it('signIn returns error on failure', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });
    mockSignInWithPassword.mockResolvedValue({ error: { message: 'Invalid credentials' } });

    let signInResult: { error: string | null } | undefined;

    function SignInConsumer() {
      const auth = useAuth();
      return (
        <button
          data-testid="sign-in-btn"
          onClick={async () => {
            signInResult = await auth.signIn('a@b.com', 'wrong');
          }}
        >
          Go
        </button>
      );
    }

    render(
      <AuthProvider>
        <SignInConsumer />
      </AuthProvider>
    );

    await waitFor(() => expect(mockGetSession).toHaveBeenCalled());

    await act(async () => {
      screen.getByTestId('sign-in-btn').click();
    });

    expect(signInResult?.error).toBe('Invalid credentials');
  });

  it('signOut calls supabase signOut and clears profile', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });
    mockSignOut.mockResolvedValue({ error: null });

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });

    await act(async () => {
      screen.getByTestId('sign-out').click();
    });

    expect(mockSignOut).toHaveBeenCalled();
  });

  it('unsubscribes from auth state change on unmount', async () => {
    const unsubscribe = vi.fn();
    mockOnAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe } },
    });

    const { unmount } = render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });

    unmount();
    expect(unsubscribe).toHaveBeenCalled();
  });
});
