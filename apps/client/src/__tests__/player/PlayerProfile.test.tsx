import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PlayerProfile } from '../../player/PlayerProfile';

// ─── RED: falha até PlayerProfile.tsx ser implementado ───────────────────────

const defaultProps = {
  firstName: 'Ana',
  lastName: 'Silva',
  onSave: vi.fn(),
  onBack: vi.fn(),
};

describe('PlayerProfile', () => {
  it('renderiza campo de nome preenchido', () => {
    render(<PlayerProfile {...defaultProps} />);
    expect(screen.getByTestId('profile-firstname')).toHaveValue('Ana');
  });

  it('renderiza campo de sobrenome preenchido', () => {
    render(<PlayerProfile {...defaultProps} />);
    expect(screen.getByTestId('profile-lastname')).toHaveValue('Silva');
  });

  it('renderiza campo de senha atual', () => {
    render(<PlayerProfile {...defaultProps} />);
    expect(screen.getByTestId('profile-current-password')).toBeInTheDocument();
  });

  it('renderiza campo de nova senha', () => {
    render(<PlayerProfile {...defaultProps} />);
    expect(screen.getByTestId('profile-new-password')).toBeInTheDocument();
  });

  it('chama onSave com firstName e lastName atualizados', () => {
    const onSave = vi.fn();
    render(<PlayerProfile {...defaultProps} onSave={onSave} />);
    fireEvent.change(screen.getByTestId('profile-firstname'), { target: { value: 'Maria' } });
    fireEvent.click(screen.getByTestId('profile-save-btn'));
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ firstName: 'Maria', lastName: 'Silva' }));
  });

  it('chama onSave com currentPassword e newPassword quando preenchidos', () => {
    const onSave = vi.fn();
    render(<PlayerProfile {...defaultProps} onSave={onSave} />);
    fireEvent.change(screen.getByTestId('profile-current-password'), { target: { value: 'Atual@123' } });
    fireEvent.change(screen.getByTestId('profile-new-password'), { target: { value: 'Nova@456!' } });
    fireEvent.click(screen.getByTestId('profile-save-btn'));
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ currentPassword: 'Atual@123', newPassword: 'Nova@456!' }));
  });

  it('exibe mensagem de erro quando error prop é fornecida', () => {
    render(<PlayerProfile {...defaultProps} error="Senha atual incorreta." />);
    expect(screen.getByTestId('profile-error')).toHaveTextContent('Senha atual incorreta.');
  });

  it('exibe mensagem de sucesso quando success prop é fornecida', () => {
    render(<PlayerProfile {...defaultProps} success="Perfil atualizado." />);
    expect(screen.getByTestId('profile-success')).toHaveTextContent('Perfil atualizado.');
  });

  it('botão voltar chama onBack', () => {
    const onBack = vi.fn();
    render(<PlayerProfile {...defaultProps} onBack={onBack} />);
    screen.getByTestId('profile-back-btn').click();
    expect(onBack).toHaveBeenCalled();
  });

  it('exibe o e-mail como campo somente leitura quando fornecido', () => {
    render(<PlayerProfile {...defaultProps} email="ana@test.com" />);
    const emailField = screen.getByTestId('profile-email');
    expect(emailField).toHaveValue('ana@test.com');
    expect(emailField).toBeDisabled();
  });

  it('campos de senha iniciam como type=password', () => {
    render(<PlayerProfile {...defaultProps} />);
    expect(screen.getByTestId('profile-current-password')).toHaveAttribute('type', 'password');
    expect(screen.getByTestId('profile-new-password')).toHaveAttribute('type', 'password');
  });

  it('toggle alterna visibilidade da senha atual', () => {
    render(<PlayerProfile {...defaultProps} />);
    const input = screen.getByTestId('profile-current-password');
    const toggle = screen.getByTestId('toggle-current-password-visibility');
    fireEvent.click(toggle);
    expect(input).toHaveAttribute('type', 'text');
    fireEvent.click(toggle);
    expect(input).toHaveAttribute('type', 'password');
  });

  it('toggle alterna visibilidade da nova senha', () => {
    render(<PlayerProfile {...defaultProps} />);
    const input = screen.getByTestId('profile-new-password');
    const toggle = screen.getByTestId('toggle-new-password-visibility');
    fireEvent.click(toggle);
    expect(input).toHaveAttribute('type', 'text');
    fireEvent.click(toggle);
    expect(input).toHaveAttribute('type', 'password');
  });
});
