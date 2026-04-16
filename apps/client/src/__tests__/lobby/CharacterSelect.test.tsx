import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CharacterSelect } from '../../lobby/CharacterSelect';
import type { AvatarOption } from '@safety-board/shared';

// Avatares customizados para testes — valida que o sistema é data-driven
const TEST_AVATARS: AvatarOption[] = [
  { id: 'operator', name: 'Operator', role: 'First Response', imageUrl: '/avatars/operator.png', color: '#e63946' },
  { id: 'tech', name: 'Safety Tech', role: 'Compliance', imageUrl: '/avatars/tech.png', color: '#457b9d' },
  { id: 'admin', name: 'Admin', role: 'Oversight', imageUrl: '/avatars/admin.png', color: '#2a9d8f' },
  { id: 'visitor', name: 'Visitor', role: 'Observation', imageUrl: '/avatars/visitor.png', color: '#f4a261' },
];

describe('CharacterSelect', () => {
  it('renderiza campo de nome', () => {
    render(<CharacterSelect onConfirm={vi.fn()} avatars={TEST_AVATARS} />);
    expect(screen.getByTestId('first-name-input')).toBeInTheDocument();
  });

  it('renderiza campo de sobrenome', () => {
    render(<CharacterSelect onConfirm={vi.fn()} avatars={TEST_AVATARS} />);
    expect(screen.getByTestId('last-name-input')).toBeInTheDocument();
  });

  it('renderiza o número correto de opções de avatar conforme o array fornecido', () => {
    render(<CharacterSelect onConfirm={vi.fn()} avatars={TEST_AVATARS} />);
    expect(screen.getAllByTestId(/^avatar-option-/)).toHaveLength(TEST_AVATARS.length);
  });

  it('renderiza 6 avatares quando array com 6 itens é fornecido', () => {
    const sixAvatars: AvatarOption[] = [
      ...TEST_AVATARS,
      { id: 'engineer', name: 'Engineer', role: 'Technical', imageUrl: '/avatars/engineer.png', color: '#6a4c93' },
      { id: 'medic', name: 'Medic', role: 'Health', imageUrl: '/avatars/medic.png', color: '#1a936f' },
    ];
    render(<CharacterSelect onConfirm={vi.fn()} avatars={sixAvatars} />);
    expect(screen.getAllByTestId(/^avatar-option-/)).toHaveLength(6);
  });

  it('renderiza botão de confirmar', () => {
    render(<CharacterSelect onConfirm={vi.fn()} avatars={TEST_AVATARS} />);
    expect(screen.getByTestId('confirm-button')).toBeInTheDocument();
  });

  it('botão desabilitado sem nome preenchido', () => {
    render(<CharacterSelect onConfirm={vi.fn()} avatars={TEST_AVATARS} />);
    fireEvent.click(screen.getByTestId('avatar-option-0'));
    expect(screen.getByTestId('confirm-button')).toBeDisabled();
  });

  it('botão desabilitado sem avatar selecionado', () => {
    render(<CharacterSelect onConfirm={vi.fn()} avatars={TEST_AVATARS} />);
    fireEvent.change(screen.getByTestId('first-name-input'), { target: { value: 'Alice' } });
    fireEvent.change(screen.getByTestId('last-name-input'), { target: { value: 'Silva' } });
    expect(screen.getByTestId('confirm-button')).toBeDisabled();
  });

  it('botão habilitado com nome, sobrenome e avatar selecionados', () => {
    render(<CharacterSelect onConfirm={vi.fn()} avatars={TEST_AVATARS} />);
    fireEvent.change(screen.getByTestId('first-name-input'), { target: { value: 'Alice' } });
    fireEvent.change(screen.getByTestId('last-name-input'), { target: { value: 'Silva' } });
    fireEvent.click(screen.getByTestId('avatar-option-0'));
    expect(screen.getByTestId('confirm-button')).not.toBeDisabled();
  });

  it('chama onConfirm com firstName, lastName e avatarId ao confirmar', () => {
    const onConfirm = vi.fn();
    render(<CharacterSelect onConfirm={onConfirm} avatars={TEST_AVATARS} />);
    fireEvent.change(screen.getByTestId('first-name-input'), { target: { value: 'Alice' } });
    fireEvent.change(screen.getByTestId('last-name-input'), { target: { value: 'Silva' } });
    fireEvent.click(screen.getByTestId('avatar-option-2'));
    fireEvent.click(screen.getByTestId('confirm-button'));
    expect(onConfirm).toHaveBeenCalledWith('Alice', 'Silva', 'admin');
  });

  it('avatar ocupado aparece como desabilitado', () => {
    render(<CharacterSelect onConfirm={vi.fn()} avatars={TEST_AVATARS} takenAvatarIds={['tech', 'visitor']} />);
    expect(screen.getByTestId('avatar-option-1')).toBeDisabled();
    expect(screen.getByTestId('avatar-option-3')).toBeDisabled();
    expect(screen.getByTestId('avatar-option-0')).not.toBeDisabled();
    expect(screen.getByTestId('avatar-option-2')).not.toBeDisabled();
  });

  it('avatar selecionado recebe aria-pressed="true"', () => {
    render(<CharacterSelect onConfirm={vi.fn()} avatars={TEST_AVATARS} />);
    fireEvent.click(screen.getByTestId('avatar-option-1'));
    expect(screen.getByTestId('avatar-option-1')).toHaveAttribute('aria-pressed', 'true');
  });

  it('somente um avatar pode estar selecionado por vez', () => {
    render(<CharacterSelect onConfirm={vi.fn()} avatars={TEST_AVATARS} />);
    fireEvent.click(screen.getByTestId('avatar-option-0'));
    fireEvent.click(screen.getByTestId('avatar-option-2'));
    expect(screen.getByTestId('avatar-option-0')).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByTestId('avatar-option-2')).toHaveAttribute('aria-pressed', 'true');
  });
});
