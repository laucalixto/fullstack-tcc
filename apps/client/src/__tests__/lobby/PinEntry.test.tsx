import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PinEntry } from '../../lobby/PinEntry';

// ─── RED: falha até PinEntry.tsx ser implementado ────────────────────────────

describe('PinEntry', () => {
  it('renderiza campo de PIN', () => {
    render(<PinEntry onJoin={vi.fn()} />);
    expect(screen.getByTestId('pin-input')).toBeInTheDocument();
  });

  it('renderiza botão de entrar', () => {
    render(<PinEntry onJoin={vi.fn()} />);
    expect(screen.getByTestId('join-button')).toBeInTheDocument();
  });

  it('botão desabilitado quando PIN está vazio', () => {
    render(<PinEntry onJoin={vi.fn()} />);
    expect(screen.getByTestId('join-button')).toBeDisabled();
  });

  it('botão desabilitado quando PIN tem menos de 6 dígitos', () => {
    render(<PinEntry onJoin={vi.fn()} />);
    fireEvent.change(screen.getByTestId('pin-input'), { target: { value: '123' } });
    expect(screen.getByTestId('join-button')).toBeDisabled();
  });

  it('botão habilitado com PIN de 6 dígitos', () => {
    render(<PinEntry onJoin={vi.fn()} />);
    fireEvent.change(screen.getByTestId('pin-input'), { target: { value: '123456' } });
    expect(screen.getByTestId('join-button')).not.toBeDisabled();
  });

  it('chama onJoin com o PIN ao submeter', () => {
    const onJoin = vi.fn();
    render(<PinEntry onJoin={onJoin} />);
    fireEvent.change(screen.getByTestId('pin-input'), { target: { value: '654321' } });
    fireEvent.click(screen.getByTestId('join-button'));
    expect(onJoin).toHaveBeenCalledWith('654321');
  });

  it('exibe mensagem de erro quando prop error está definida', () => {
    render(<PinEntry onJoin={vi.fn()} error="Sala não encontrada" />);
    expect(screen.getByTestId('pin-error')).toHaveTextContent('Sala não encontrada');
  });

  it('não exibe mensagem de erro quando error é undefined', () => {
    render(<PinEntry onJoin={vi.fn()} />);
    expect(screen.queryByTestId('pin-error')).not.toBeInTheDocument();
  });

  it('aceita apenas dígitos no campo de PIN', () => {
    render(<PinEntry onJoin={vi.fn()} />);
    const input = screen.getByTestId('pin-input');
    fireEvent.change(input, { target: { value: 'abc123' } });
    expect((input as HTMLInputElement).value).toBe('123');
  });

  it('limita o PIN a 6 caracteres', () => {
    render(<PinEntry onJoin={vi.fn()} />);
    const input = screen.getByTestId('pin-input');
    fireEvent.change(input, { target: { value: '1234567890' } });
    expect((input as HTMLInputElement).value).toHaveLength(6);
  });

  it('exibe link para login do jogador', () => {
    render(<PinEntry onJoin={vi.fn()} />);
    expect(screen.getByTestId('player-login-link')).toBeInTheDocument();
  });
});
