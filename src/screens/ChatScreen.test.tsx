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

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    profile: mockProfile,
  }),
}));

const mockFrom = vi.fn();
const mockChannel = vi.fn();
const mockRemoveChannel = vi.fn();

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
    channel: (...args: unknown[]) => mockChannel(...args),
    removeChannel: (...args: unknown[]) => mockRemoveChannel(...args),
  },
}));

vi.mock('./RoleplayCatalog', () => ({
  default: ({ onClose }: { onClose: () => void }) => (
    <div data-testid="catalog-modal">
      <button data-testid="close-catalog" onClick={onClose}>Close</button>
    </div>
  ),
}));

vi.mock('./BackgroundSettings', () => ({
  default: ({ onClose }: { onClose: () => void }) => (
    <div data-testid="bg-settings-modal">
      <button data-testid="close-bg" onClick={onClose}>Close</button>
    </div>
  ),
}));

import ChatScreen from './ChatScreen';

const partner: Usuario = {
  id: 'user-2',
  username: 'partner1',
  display_name: 'Partner One',
  avatar_url: null,
};

describe('ChatScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock for supabase.from - returns empty results for all tables
    mockFrom.mockImplementation(() => ({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: null }),
            order: vi.fn().mockResolvedValue({ data: [] }),
          }),
          order: vi.fn().mockReturnValue({
            ascending: true,
            then: undefined,
            data: [],
          }),
          maybeSingle: vi.fn().mockResolvedValue({ data: null }),
        }),
      }),
    }));

    // Mock for supabase.from with proper chaining for messages query
    mockFrom.mockImplementation((table: string) => {
      if (table === 'mensagens') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({ data: [] }),
            }),
          }),
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: null, error: null }),
            }),
          }),
        };
      }
      if (table === 'papeis') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({ data: [] }),
            }),
          }),
        };
      }
      if (table === 'config_chat') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: null }),
              }),
            }),
          }),
        };
      }
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: null }),
          }),
        }),
      };
    });

    // Mock channel for realtime subscription
    mockChannel.mockReturnValue({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis(),
    });
  });

  it('renders partner name in the header', async () => {
    render(<ChatScreen chatId="chat-1" partner={partner} onBack={vi.fn()} />);

    expect(screen.getByText('Partner One')).toBeInTheDocument();
    expect(screen.getByText('@partner1')).toBeInTheDocument();
  });

  it('calls onBack when back button is clicked', async () => {
    const onBack = vi.fn();
    render(<ChatScreen chatId="chat-1" partner={partner} onBack={onBack} />);

    // The back button contains ArrowLeft icon
    const buttons = screen.getAllByRole('button');
    await userEvent.click(buttons[0]);

    expect(onBack).toHaveBeenCalled();
  });

  it('shows empty message state initially', async () => {
    render(<ChatScreen chatId="chat-1" partner={partner} onBack={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('Nenhuma mensagem ainda')).toBeInTheDocument();
    });
  });

  it('opens catalog modal when catalog button is clicked', async () => {
    render(<ChatScreen chatId="chat-1" partner={partner} onBack={vi.fn()} />);

    const catalogBtn = screen.getAllByRole('button').find(btn => btn.getAttribute('title') === 'Catálogo de Papéis');
    expect(catalogBtn).toBeDefined();

    await userEvent.click(catalogBtn!);
    expect(screen.getByTestId('catalog-modal')).toBeInTheDocument();
  });

  it('closes catalog modal', async () => {
    render(<ChatScreen chatId="chat-1" partner={partner} onBack={vi.fn()} />);

    const catalogBtn = screen.getAllByRole('button').find(btn => btn.getAttribute('title') === 'Catálogo de Papéis');
    await userEvent.click(catalogBtn!);
    expect(screen.getByTestId('catalog-modal')).toBeInTheDocument();

    await userEvent.click(screen.getByTestId('close-catalog'));
    expect(screen.queryByTestId('catalog-modal')).not.toBeInTheDocument();
  });

  it('opens background settings modal', async () => {
    render(<ChatScreen chatId="chat-1" partner={partner} onBack={vi.fn()} />);

    const bgBtn = screen.getAllByRole('button').find(btn => btn.getAttribute('title') === 'Personalizar Fundo');
    await userEvent.click(bgBtn!);
    expect(screen.getByTestId('bg-settings-modal')).toBeInTheDocument();
  });

  it('toggles roleplay mode and shows message about no equipped roles', async () => {
    render(<ChatScreen chatId="chat-1" partner={partner} onBack={vi.fn()} />);

    const rpBtn = screen.getAllByRole('button').find(btn => btn.getAttribute('title') === 'Modo Encenação');
    await userEvent.click(rpBtn!);

    await waitFor(() => {
      expect(screen.getByText('Nenhum papel equipado. Abra o catálogo para equipar.')).toBeInTheDocument();
    });
  });

  it('has a message input and send button', () => {
    render(<ChatScreen chatId="chat-1" partner={partner} onBack={vi.fn()} />);
    expect(screen.getByPlaceholderText('Mensagem...')).toBeInTheDocument();
  });

  it('send button is disabled when input is empty', () => {
    render(<ChatScreen chatId="chat-1" partner={partner} onBack={vi.fn()} />);

    const sendBtns = screen.getAllByRole('button');
    const sendBtn = sendBtns[sendBtns.length - 1]; // Last button is send
    expect(sendBtn).toBeDisabled();
  });

  it('enables send button when input has text', async () => {
    render(<ChatScreen chatId="chat-1" partner={partner} onBack={vi.fn()} />);

    const input = screen.getByPlaceholderText('Mensagem...');
    await userEvent.type(input, 'Hello!');

    const sendBtns = screen.getAllByRole('button');
    const sendBtn = sendBtns[sendBtns.length - 1];
    expect(sendBtn).not.toBeDisabled();
  });

  it('changes placeholder when roleplay mode is active with no papel', async () => {
    render(<ChatScreen chatId="chat-1" partner={partner} onBack={vi.fn()} />);

    // Before roleplay: regular placeholder
    expect(screen.getByPlaceholderText('Mensagem...')).toBeInTheDocument();

    // Toggle roleplay mode
    const rpBtn = screen.getAllByRole('button').find(btn => btn.getAttribute('title') === 'Modo Encenação');
    await userEvent.click(rpBtn!);

    // Still shows "Mensagem..." because no active papel
    expect(screen.getByPlaceholderText('Mensagem...')).toBeInTheDocument();
  });
});
