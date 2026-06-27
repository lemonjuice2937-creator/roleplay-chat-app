import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Usuario } from '../types/database';

const mockProfile: Usuario = {
  id: 'user-1',
  username: 'player1',
  display_name: 'Player One',
  avatar_url: null,
};

const mockSignOut = vi.fn();

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    profile: mockProfile,
    signOut: (...args: unknown[]) => mockSignOut(...args),
  }),
}));

const mockFrom = vi.fn();
const mockRpc = vi.fn();

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
    rpc: (...args: unknown[]) => mockRpc(...args),
  },
}));

import HomeScreen from './HomeScreen';

describe('HomeScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default: chats returns empty, usuarios returns null
    mockFrom.mockImplementation((table: string) => {
      if (table === 'chats') {
        return {
          select: vi.fn().mockReturnValue({
            or: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({ data: [] }),
            }),
          }),
        };
      }
      if (table === 'usuarios') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: null }),
            }),
          }),
        };
      }
      if (table === 'mensagens') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                limit: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({ data: null }),
                }),
              }),
            }),
          }),
        };
      }
      return {
        select: vi.fn().mockReturnThis(),
      };
    });
  });

  it('renders the app header with username', async () => {
    render(<HomeScreen onOpenChat={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('Encenação')).toBeInTheDocument();
    });
    expect(screen.getByText('@player1')).toBeInTheDocument();
  });

  it('shows empty state when no chats exist', async () => {
    render(<HomeScreen onOpenChat={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('Nenhuma conversa ainda')).toBeInTheDocument();
    });
    expect(screen.getByText('Busque um amigo pelo @username')).toBeInTheDocument();
  });

  it('has a search input field', () => {
    render(<HomeScreen onOpenChat={vi.fn()} />);
    expect(screen.getByPlaceholderText('Buscar por @username')).toBeInTheDocument();
  });

  it('shows "Usuário não encontrado" when search yields no results', async () => {
    render(<HomeScreen onOpenChat={vi.fn()} />);

    const searchInput = screen.getByPlaceholderText('Buscar por @username');
    await userEvent.type(searchInput, 'nonexistent');
    await userEvent.click(screen.getByText('Buscar'));

    await waitFor(() => {
      expect(screen.getByText('Usuário não encontrado')).toBeInTheDocument();
    });
  });

  it('shows user card when search finds a user', async () => {
    const foundUser: Usuario = {
      id: 'user-2',
      username: 'friend1',
      display_name: 'Friend One',
      avatar_url: null,
    };

    mockFrom.mockImplementation((table: string) => {
      if (table === 'chats') {
        return {
          select: vi.fn().mockReturnValue({
            or: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({ data: [] }),
            }),
          }),
        };
      }
      if (table === 'usuarios') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: foundUser }),
            }),
          }),
        };
      }
      return {
        select: vi.fn().mockReturnThis(),
      };
    });

    render(<HomeScreen onOpenChat={vi.fn()} />);

    const searchInput = screen.getByPlaceholderText('Buscar por @username');
    await userEvent.type(searchInput, '@friend1');
    await userEvent.click(screen.getByText('Buscar'));

    await waitFor(() => {
      expect(screen.getByText('Friend One')).toBeInTheDocument();
      expect(screen.getByText('@friend1')).toBeInTheDocument();
    });
    expect(screen.getByText('Conversar')).toBeInTheDocument();
  });

  it('does not show current user in search results', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'chats') {
        return {
          select: vi.fn().mockReturnValue({
            or: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({ data: [] }),
            }),
          }),
        };
      }
      if (table === 'usuarios') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: { ...mockProfile } }),
            }),
          }),
        };
      }
      return {
        select: vi.fn().mockReturnThis(),
      };
    });

    render(<HomeScreen onOpenChat={vi.fn()} />);

    const searchInput = screen.getByPlaceholderText('Buscar por @username');
    await userEvent.type(searchInput, 'player1');
    await userEvent.click(screen.getByText('Buscar'));

    await waitFor(() => {
      expect(screen.getByText('Usuário não encontrado')).toBeInTheDocument();
    });
  });

  it('triggers search on Enter key', async () => {
    render(<HomeScreen onOpenChat={vi.fn()} />);

    const searchInput = screen.getByPlaceholderText('Buscar por @username');
    await userEvent.type(searchInput, 'someone{enter}');

    await waitFor(() => {
      // After search completes, either user found or not found text appears
      expect(screen.getByText('Usuário não encontrado')).toBeInTheDocument();
    });
  });

  it('starts a chat when "Conversar" button is clicked', async () => {
    const foundUser: Usuario = {
      id: 'user-2',
      username: 'friend1',
      display_name: 'Friend One',
      avatar_url: null,
    };

    mockFrom.mockImplementation((table: string) => {
      if (table === 'chats') {
        return {
          select: vi.fn().mockReturnValue({
            or: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({ data: [] }),
            }),
          }),
        };
      }
      if (table === 'usuarios') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: foundUser }),
            }),
          }),
        };
      }
      return {
        select: vi.fn().mockReturnThis(),
      };
    });

    mockRpc.mockResolvedValue({ data: 'chat-123', error: null });

    const onOpenChat = vi.fn();
    render(<HomeScreen onOpenChat={onOpenChat} />);

    const searchInput = screen.getByPlaceholderText('Buscar por @username');
    await userEvent.type(searchInput, 'friend1');
    await userEvent.click(screen.getByText('Buscar'));

    await waitFor(() => {
      expect(screen.getByText('Conversar')).toBeInTheDocument();
    });

    await userEvent.click(screen.getByText('Conversar'));

    await waitFor(() => {
      expect(mockRpc).toHaveBeenCalledWith('find_or_create_chat', {
        p_user1: 'user-1',
        p_user2: 'user-2',
      });
      expect(onOpenChat).toHaveBeenCalledWith('chat-123', foundUser);
    });
  });

  it('does not search when input is empty', async () => {
    render(<HomeScreen onOpenChat={vi.fn()} />);

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByText('Nenhuma conversa ainda')).toBeInTheDocument();
    });

    const fromCallsAfterLoad = mockFrom.mock.calls.length;

    await userEvent.click(screen.getByText('Buscar'));

    // No additional from('usuarios') call for search when empty
    expect(mockFrom.mock.calls.length).toBe(fromCallsAfterLoad);
  });

  it('shows "Conversas" section header', () => {
    render(<HomeScreen onOpenChat={vi.fn()} />);
    expect(screen.getByText('Conversas')).toBeInTheDocument();
  });
});
