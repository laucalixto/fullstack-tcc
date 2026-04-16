import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CharacterSelect } from '../../lobby/CharacterSelect';

// ─── RED: falha até CharacterSelect.tsx ser implementado ─────────────────────

describe('CharacterSelect', () => {
  it('renderiza campo de nome', () => {
    render(<CharacterSelect onConfirm={vi.fn()} />);
    expect(screen.getByTestId('first-name-input')).toBeInTheDocument();
  });

  it('renderiza campo de sobrenome', () => {
    render(<CharacterSelect onConfirm={vi.fn()} />);
    expect(screen.getByTestId('last-name-input')).toBeInTheDocument();
  });

  it('renderiza 4 opções de avatar', () => {
    render(<CharacterSelect onConfirm={vi.fn()} />);
    expect(screen.getAllByTestId(/^avatar-option-/)).toHaveLength(4);
  });

  it('renderiza botão de confirmar', () => {
    render(<CharacterSelect onConfirm={vi.fn()} />);
    expect(screen.getByTestId('confirm-button')).toBeInTheDocument();
  });

  it('botão desabilitado sem nome preenchido', () => {
    render(<CharacterSelect onConfirm={vi.fn()} />);
    fireEvent.click(screen.getByTestId('avatar-option-0'));
    expect(screen.getByTestId('confirm-button')).toBeDisabled();
  });

  it('botão desabilitado sem avatar selecionado', () => {
    render(<CharacterSelect onConfirm={vi.fn()} />);
    fireEvent.change(screen.getByTestId('first-name-input'), { target: { value: 'Alice' } });
    fireEvent.change(screen.getByTestId('last-name-input'), { target: { value: 'Silva' } });
    expect(screen.getByTestId('confirm-button')).toBeDisabled();
  });

  it('botão habilitado com nome, sobrenome e avatar selecionados', () => {
    render(<CharacterSelect onConfirm={vi.fn()} />);
    fireEvent.change(screen.getByTestId('first-name-input'), { target: { value: 'Alice' } });
    fireEvent.change(screen.getByTestId('last-name-input'), { target: { value: 'Silva' } });
    fireEvent.click(screen.getByTestId('avatar-option-0'));
    expect(screen.getByTestId('confirm-button')).not.toBeDisabled();
  });

  it('chama onConfirm com firstName, lastName e colorIndex ao confirmar', () => {
    const onConfirm = vi.fn();
    render(<CharacterSelect onConfirm={onConfirm} />);
    fireEvent.change(screen.getByTestId('first-name-input'), { target: { value: 'Alice' } });
    fireEvent.change(screen.getByTestId('last-name-input'), { target: { value: 'Silva' } });
    fireEvent.click(screen.getByTestId('avatar-option-2'));
    fireEvent.click(screen.getByTestId('confirm-button'));
    expect(onConfirm).toHaveBeenCalledWith('Alice', 'Silva', 2);
  });

  it('avatar ocupado aparece como desabilitado', () => {
    render(<CharacterSelect onConfirm={vi.fn()} takenColors={[1, 3]} />);
    expect(screen.getByTestId('avatar-option-1')).toBeDisabled();
    expect(screen.getByTestId('avatar-option-3')).toBeDisabled();
    expect(screen.getByTestId('avatar-option-0')).not.toBeDisabled();
    expect(screen.getByTestId('avatar-option-2')).not.toBeDisabled();
  });

  it('avatar selecionado recebe aria-pressed="true"', () => {
    render(<CharacterSelect onConfirm={vi.fn()} />);
    fireEvent.click(screen.getByTestId('avatar-option-1'));
    expect(screen.getByTestId('avatar-option-1')).toHaveAttribute('aria-pressed', 'true');
  });

  it('somente um avatar pode estar selecionado por vez', () => {
    render(<CharacterSelect onConfirm={vi.fn()} />);
    fireEvent.click(screen.getByTestId('avatar-option-0'));
    fireEvent.click(screen.getByTestId('avatar-option-2'));
    expect(screen.getByTestId('avatar-option-0')).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByTestId('avatar-option-2')).toHaveAttribute('aria-pressed', 'true');
  });
});
