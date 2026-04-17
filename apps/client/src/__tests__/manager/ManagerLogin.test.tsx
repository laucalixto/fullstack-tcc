import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ManagerLogin } from '../../manager/ManagerLogin';

// ─── RED: falha até ManagerLogin.tsx ser implementado ────────────────────────

describe('ManagerLogin', () => {
  it('renderiza campo de email', () => {
    render(<ManagerLogin onLogin={vi.fn()} />);
    expect(screen.getByTestId('login-email')).toBeInTheDocument();
  });

  it('renderiza campo de senha', () => {
    render(<ManagerLogin onLogin={vi.fn()} />);
    expect(screen.getByTestId('login-password')).toBeInTheDocument();
  });

  it('renderiza botão de submit', () => {
    render(<ManagerLogin onLogin={vi.fn()} />);
    expect(screen.getByTestId('login-submit')).toBeInTheDocument();
  });

  it('botão desabilitado com campos vazios', () => {
    render(<ManagerLogin onLogin={vi.fn()} />);
    expect(screen.getByTestId('login-submit')).toBeDisabled();
  });

  it('botão habilitado com email e senha preenchidos', () => {
    render(<ManagerLogin onLogin={vi.fn()} />);
    fireEvent.change(screen.getByTestId('login-email'), { target: { value: 'gestor@empresa.com' } });
    fireEvent.change(screen.getByTestId('login-password'), { target: { value: 'senha123' } });
    expect(screen.getByTestId('login-submit')).not.toBeDisabled();
  });

  it('chama onLogin com email e senha ao submeter', () => {
    const onLogin = vi.fn();
    render(<ManagerLogin onLogin={onLogin} />);
    fireEvent.change(screen.getByTestId('login-email'), { target: { value: 'gestor@empresa.com' } });
    fireEvent.change(screen.getByTestId('login-password'), { target: { value: 'senha123' } });
    fireEvent.click(screen.getByTestId('login-submit'));
    expect(onLogin).toHaveBeenCalledWith({ email: 'gestor@empresa.com', password: 'senha123' });
  });

  it('exibe mensagem de erro quando prop error está definida', () => {
    render(<ManagerLogin onLogin={vi.fn()} error="Credenciais inválidas" />);
    expect(screen.getByTestId('login-error')).toHaveTextContent('Credenciais inválidas');
  });

  it('não exibe erro quando error é undefined', () => {
    render(<ManagerLogin onLogin={vi.fn()} />);
    expect(screen.queryByTestId('login-error')).not.toBeInTheDocument();
  });

  it('desabilita botão e exibe loading quando isLoading=true', () => {
    render(<ManagerLogin onLogin={vi.fn()} isLoading />);
    expect(screen.getByTestId('login-submit')).toBeDisabled();
    expect(screen.getByTestId('login-loading')).toBeInTheDocument();
  });
});
