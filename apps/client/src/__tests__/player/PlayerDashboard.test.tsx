import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PlayerDashboard } from '../../player/PlayerDashboard';

// ─── RED: falha até PlayerDashboard.tsx ser implementado ─────────────────────

const defaultProps = {
  name: 'Ana Silva',
  email: 'ana@test.com',
  industrialUnit: 'Unidade SP',
  totalScore: 1250,
  gameCount: 3,
  onViewHistory: vi.fn(),
  onEditProfile: vi.fn(),
  onViewRanking: vi.fn(),
  onLogout: vi.fn(),
};

describe('PlayerDashboard', () => {
  it('exibe o nome do jogador', () => {
    render(<PlayerDashboard {...defaultProps} />);
    expect(screen.getByTestId('dashboard-name')).toHaveTextContent('Ana Silva');
  });

  it('exibe o e-mail', () => {
    render(<PlayerDashboard {...defaultProps} />);
    expect(screen.getByTestId('dashboard-email')).toHaveTextContent('ana@test.com');
  });

  it('exibe a unidade industrial', () => {
    render(<PlayerDashboard {...defaultProps} />);
    expect(screen.getByTestId('dashboard-unit')).toHaveTextContent('Unidade SP');
  });

  it('exibe o totalScore', () => {
    render(<PlayerDashboard {...defaultProps} />);
    expect(screen.getByTestId('dashboard-score')).toHaveTextContent('1250');
  });

  it('exibe quantidade de partidas', () => {
    render(<PlayerDashboard {...defaultProps} />);
    expect(screen.getByTestId('dashboard-game-count')).toHaveTextContent('3');
  });

  it('botão de histórico chama onViewHistory', () => {
    const onViewHistory = vi.fn();
    render(<PlayerDashboard {...defaultProps} onViewHistory={onViewHistory} />);
    screen.getByTestId('dashboard-history-btn').click();
    expect(onViewHistory).toHaveBeenCalled();
  });

  it('botão de editar perfil chama onEditProfile', () => {
    const onEditProfile = vi.fn();
    render(<PlayerDashboard {...defaultProps} onEditProfile={onEditProfile} />);
    screen.getByTestId('dashboard-profile-btn').click();
    expect(onEditProfile).toHaveBeenCalled();
  });

  it('botão de ranking chama onViewRanking', () => {
    const onViewRanking = vi.fn();
    render(<PlayerDashboard {...defaultProps} onViewRanking={onViewRanking} />);
    screen.getByTestId('dashboard-ranking-btn').click();
    expect(onViewRanking).toHaveBeenCalled();
  });

  it('botão de sair chama onLogout', () => {
    const onLogout = vi.fn();
    render(<PlayerDashboard {...defaultProps} onLogout={onLogout} />);
    screen.getByTestId('dashboard-logout-btn').click();
    expect(onLogout).toHaveBeenCalled();
  });

  it('renderiza campo de PIN para entrar em partida', () => {
    render(<PlayerDashboard {...defaultProps} />);
    expect(screen.getByTestId('dashboard-pin-input')).toBeInTheDocument();
  });

  it('botão entrar na sala desabilitado com PIN vazio', () => {
    render(<PlayerDashboard {...defaultProps} />);
    expect(screen.getByTestId('dashboard-pin-submit')).toBeDisabled();
  });

  it('botão entrar na sala habilitado com PIN de 6 dígitos', () => {
    render(<PlayerDashboard {...defaultProps} />);
    fireEvent.change(screen.getByTestId('dashboard-pin-input'), { target: { value: '123456' } });
    expect(screen.getByTestId('dashboard-pin-submit')).not.toBeDisabled();
  });

  it('chama onJoinPin com o PIN ao submeter', () => {
    const onJoinPin = vi.fn();
    render(<PlayerDashboard {...defaultProps} onJoinPin={onJoinPin} />);
    fireEvent.change(screen.getByTestId('dashboard-pin-input'), { target: { value: '654321' } });
    fireEvent.click(screen.getByTestId('dashboard-pin-submit'));
    expect(onJoinPin).toHaveBeenCalledWith('654321');
  });
});
