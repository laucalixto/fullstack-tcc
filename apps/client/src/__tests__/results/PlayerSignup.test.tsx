import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PlayerSignup } from '../../results/PlayerSignup';

// ─── RED: falha até PlayerSignup.tsx ser implementado ────────────────────────

describe('PlayerSignup', () => {
  it('renderiza campo de nome', () => {
    render(<PlayerSignup onSignup={vi.fn()} />);
    expect(screen.getByTestId('signup-firstname')).toBeInTheDocument();
  });

  it('renderiza campo de sobrenome', () => {
    render(<PlayerSignup onSignup={vi.fn()} />);
    expect(screen.getByTestId('signup-lastname')).toBeInTheDocument();
  });

  it('renderiza campo de email', () => {
    render(<PlayerSignup onSignup={vi.fn()} />);
    expect(screen.getByTestId('signup-email')).toBeInTheDocument();
  });

  it('renderiza campo de unidade industrial', () => {
    render(<PlayerSignup onSignup={vi.fn()} />);
    expect(screen.getByTestId('signup-unit')).toBeInTheDocument();
  });

  it('renderiza campo de senha', () => {
    render(<PlayerSignup onSignup={vi.fn()} />);
    expect(screen.getByTestId('signup-password')).toBeInTheDocument();
  });

  it('renderiza botão de submit', () => {
    render(<PlayerSignup onSignup={vi.fn()} />);
    expect(screen.getByTestId('signup-submit')).toBeInTheDocument();
  });

  it('botão desabilitado com campos vazios', () => {
    render(<PlayerSignup onSignup={vi.fn()} />);
    expect(screen.getByTestId('signup-submit')).toBeDisabled();
  });

  it('botão habilitado com todos os campos preenchidos', () => {
    render(<PlayerSignup onSignup={vi.fn()} />);
    fireEvent.change(screen.getByTestId('signup-firstname'), { target: { value: 'Alice' } });
    fireEvent.change(screen.getByTestId('signup-lastname'), { target: { value: 'Silva' } });
    fireEvent.change(screen.getByTestId('signup-email'), { target: { value: 'alice@empresa.com' } });
    fireEvent.change(screen.getByTestId('signup-unit'), { target: { value: 'unidade-sp' } });
    fireEvent.change(screen.getByTestId('signup-password'), { target: { value: 'senha123!' } });
    expect(screen.getByTestId('signup-submit')).not.toBeDisabled();
  });

  it('chama onSignup com os dados corretos ao submeter', () => {
    const onSignup = vi.fn();
    render(<PlayerSignup onSignup={onSignup} />);
    fireEvent.change(screen.getByTestId('signup-firstname'), { target: { value: 'Alice' } });
    fireEvent.change(screen.getByTestId('signup-lastname'), { target: { value: 'Silva' } });
    fireEvent.change(screen.getByTestId('signup-email'), { target: { value: 'alice@empresa.com' } });
    fireEvent.change(screen.getByTestId('signup-unit'), { target: { value: 'unidade-sp' } });
    fireEvent.change(screen.getByTestId('signup-password'), { target: { value: 'senha123!' } });
    fireEvent.click(screen.getByTestId('signup-submit'));
    expect(onSignup).toHaveBeenCalledWith({
      firstName: 'Alice',
      lastName: 'Silva',
      email: 'alice@empresa.com',
      industrialUnit: 'unidade-sp',
      password: 'senha123!',
    });
  });

  it('exibe mensagem de erro quando prop error está definida', () => {
    render(<PlayerSignup onSignup={vi.fn()} error="E-mail já cadastrado" />);
    expect(screen.getByTestId('signup-error')).toHaveTextContent('E-mail já cadastrado');
  });

  it('não exibe erro quando error é undefined', () => {
    render(<PlayerSignup onSignup={vi.fn()} />);
    expect(screen.queryByTestId('signup-error')).not.toBeInTheDocument();
  });

  it('desabilita botão e exibe loading quando isLoading=true', () => {
    render(<PlayerSignup onSignup={vi.fn()} isLoading />);
    expect(screen.getByTestId('signup-submit')).toBeDisabled();
    expect(screen.getByTestId('signup-loading')).toBeInTheDocument();
  });

  it('campo de senha inicia como type=password', () => {
    render(<PlayerSignup onSignup={vi.fn()} />);
    expect(screen.getByTestId('signup-password')).toHaveAttribute('type', 'password');
  });

  it('toggle alterna visibilidade da senha', () => {
    render(<PlayerSignup onSignup={vi.fn()} />);
    const input = screen.getByTestId('signup-password');
    const toggle = screen.getByTestId('toggle-password-visibility');
    fireEvent.click(toggle);
    expect(input).toHaveAttribute('type', 'text');
    fireEvent.click(toggle);
    expect(input).toHaveAttribute('type', 'password');
  });
});
