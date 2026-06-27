import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AuthScreen from './AuthScreen';

const mockSignIn = vi.fn().mockResolvedValue({ error: null });
const mockSignUp = vi.fn().mockResolvedValue({ error: null });

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    signIn: mockSignIn,
    signUp: mockSignUp,
  }),
}));

describe('AuthScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders login mode by default', () => {
    render(<AuthScreen />);
    expect(screen.getByPlaceholderText('E-mail')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Senha')).toBeInTheDocument();
    expect(screen.queryByPlaceholderText('@username')).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText('Nome de exibição')).not.toBeInTheDocument();
  });

  it('switches to signup mode and shows additional fields', async () => {
    render(<AuthScreen />);

    const cadastrarBtn = screen.getByText('Cadastrar');
    await userEvent.click(cadastrarBtn);

    expect(screen.getByPlaceholderText('@username')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Nome de exibição')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('E-mail')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Senha')).toBeInTheDocument();
  });

  it('calls signIn with email and password on login submit', async () => {
    render(<AuthScreen />);

    await userEvent.type(screen.getByPlaceholderText('E-mail'), 'user@test.com');
    await userEvent.type(screen.getByPlaceholderText('Senha'), 'mypassword');

    // Submit button is type="submit"
    const form = document.querySelector('form')!;
    const submitBtn = form.querySelector('button[type="submit"]')!;
    await userEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith('user@test.com', 'mypassword');
    });
  });

  it('displays error from signIn', async () => {
    mockSignIn.mockResolvedValue({ error: 'Credenciais inválidas' });

    render(<AuthScreen />);

    await userEvent.type(screen.getByPlaceholderText('E-mail'), 'user@test.com');
    await userEvent.type(screen.getByPlaceholderText('Senha'), 'wrong');

    const form = document.querySelector('form')!;
    const submitBtn = form.querySelector('button[type="submit"]')!;
    await userEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText('Credenciais inválidas')).toBeInTheDocument();
    });
  });

  it('shows validation error when signup fields are empty', async () => {
    render(<AuthScreen />);

    await userEvent.click(screen.getByText('Cadastrar'));
    await userEvent.type(screen.getByPlaceholderText('E-mail'), 'a@b.com');
    await userEvent.type(screen.getByPlaceholderText('Senha'), '123456');

    // username and displayName are empty
    await userEvent.click(screen.getByText('Criar conta'));

    await waitFor(() => {
      expect(screen.getByText('Preencha todos os campos')).toBeInTheDocument();
    });
    expect(mockSignUp).not.toHaveBeenCalled();
  });

  it('calls signUp with all fields when valid', async () => {
    render(<AuthScreen />);

    await userEvent.click(screen.getByText('Cadastrar'));

    await userEvent.type(screen.getByPlaceholderText('@username'), 'myuser');
    await userEvent.type(screen.getByPlaceholderText('Nome de exibição'), 'My User');
    await userEvent.type(screen.getByPlaceholderText('E-mail'), 'a@b.com');
    await userEvent.type(screen.getByPlaceholderText('Senha'), '123456');

    await userEvent.click(screen.getByText('Criar conta'));

    await waitFor(() => {
      expect(mockSignUp).toHaveBeenCalledWith('a@b.com', '123456', 'myuser', 'My User');
    });
  });

  it('displays error from signUp', async () => {
    mockSignUp.mockResolvedValue({ error: 'Este @username já está em uso' });

    render(<AuthScreen />);

    await userEvent.click(screen.getByText('Cadastrar'));

    await userEvent.type(screen.getByPlaceholderText('@username'), 'taken');
    await userEvent.type(screen.getByPlaceholderText('Nome de exibição'), 'User');
    await userEvent.type(screen.getByPlaceholderText('E-mail'), 'x@y.com');
    await userEvent.type(screen.getByPlaceholderText('Senha'), 'pass123');

    await userEvent.click(screen.getByText('Criar conta'));

    await waitFor(() => {
      expect(screen.getByText('Este @username já está em uso')).toBeInTheDocument();
    });
  });

  it('shows the app title and subtitle', () => {
    render(<AuthScreen />);
    expect(screen.getByText('Encenação')).toBeInTheDocument();
    expect(screen.getByText('Chat de Roleplay')).toBeInTheDocument();
  });

  it('switches back to login mode', async () => {
    render(<AuthScreen />);

    // Switch to signup
    await userEvent.click(screen.getByText('Cadastrar'));
    expect(screen.getByPlaceholderText('@username')).toBeInTheDocument();

    // Switch back to login
    const entrarBtns = screen.getAllByText('Entrar');
    // The tab button is the first one
    await userEvent.click(entrarBtns[0]);
    expect(screen.queryByPlaceholderText('@username')).not.toBeInTheDocument();
  });
});
