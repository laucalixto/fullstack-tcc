import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PlayerLogin } from '../../player/PlayerLogin';

// ─── RED: falha até PlayerLogin.tsx ser implementado ─────────────────────────

describe('PlayerLogin', () => {
  it('renderiza campo de e-mail', () => {
    render(<PlayerLogin onLogin={vi.fn()} />);
    expect(screen.getByTestId('login-email')).toBeInTheDocument();
  });

  it('renderiza campo de senha', () => {
    render(<PlayerLogin onLogin={vi.fn()} />);
    expect(screen.getByTestId('login-password')).toBeInTheDocument();
  });

  it('renderiza botão de submit', () => {
    render(<PlayerLogin onLogin={vi.fn()} />);
    expect(screen.getByTestId('login-submit')).toBeInTheDocument();
  });

  it('botão desabilitado com campos vazios', () => {
    render(<PlayerLogin onLogin={vi.fn()} />);
    expect(screen.getByTestId('login-submit')).toBeDisabled();
  });

  it('botão habilitado ao preencher e-mail e senha', () => {
    render(<PlayerLogin onLogin={vi.fn()} />);
    fireEvent.change(screen.getByTestId('login-email'), { target: { value: 'a@b.com' } });
    fireEvent.change(screen.getByTestId('login-password'), { target: { value: 'senha123' } });
    expect(screen.getByTestId('login-submit')).not.toBeDisabled();
  });

  it('chama onLogin com email e password ao submeter', () => {
    const onLogin = vi.fn();
    render(<PlayerLogin onLogin={onLogin} />);
    fireEvent.change(screen.getByTestId('login-email'), { target: { value: 'a@b.com' } });
    fireEvent.change(screen.getByTestId('login-password'), { target: { value: 'senha123' } });
    fireEvent.click(screen.getByTestId('login-submit'));
    expect(onLogin).toHaveBeenCalledWith({ email: 'a@b.com', password: 'senha123' });
  });

  it('exibe mensagem de erro quando error prop é fornecida', () => {
    render(<PlayerLogin onLogin={vi.fn()} error="Credenciais inválidas." />);
    expect(screen.getByTestId('login-error')).toHaveTextContent('Credenciais inválidas.');
  });

  it('mostra spinner e desabilita botão quando isLoading', () => {
    render(<PlayerLogin onLogin={vi.fn()} isLoading />);
    expect(screen.getByTestId('login-loading')).toBeInTheDocument();
    expect(screen.getByTestId('login-submit')).toBeDisabled();
  });

  it('campo de senha inicia como type=password', () => {
    render(<PlayerLogin onLogin={vi.fn()} />);
    expect(screen.getByTestId('login-password')).toHaveAttribute('type', 'password');
  });

  it('toggle alterna visibilidade da senha', () => {
    render(<PlayerLogin onLogin={vi.fn()} />);
    const input = screen.getByTestId('login-password');
    const toggle = screen.getByTestId('toggle-password-visibility');
    fireEvent.click(toggle);
    expect(input).toHaveAttribute('type', 'text');
    fireEvent.click(toggle);
    expect(input).toHaveAttribute('type', 'password');
  });
});
