import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ManagerLayout } from '../../manager/ManagerLayout';

// ─── RED: falha até ManagerLayout.tsx ser implementado ───────────────────────

const defaultProps = {
  activePage: 'dashboard' as const,
  managerName: 'Gestor Silva',
  onNavigate: vi.fn(),
  onLogout: vi.fn(),
  children: <div data-testid="slot">conteúdo</div>,
};

describe('ManagerLayout', () => {
  it('exibe o nome do facilitador', () => {
    render(<ManagerLayout {...defaultProps} />);
    expect(screen.getByTestId('layout-manager-name')).toHaveTextContent('Gestor Silva');
  });

  it('botão Sair chama onLogout', () => {
    const onLogout = vi.fn();
    render(<ManagerLayout {...defaultProps} onLogout={onLogout} />);
    screen.getByTestId('layout-logout-btn').click();
    expect(onLogout).toHaveBeenCalled();
  });

  it('renderiza children no slot principal', () => {
    render(<ManagerLayout {...defaultProps} />);
    expect(screen.getByTestId('slot')).toBeInTheDocument();
  });

  it('item de header ativo recebe data-active="true"', () => {
    render(<ManagerLayout {...defaultProps} activePage="sessoes" />);
    expect(screen.getByTestId('nav-header-sessoes')).toHaveAttribute('data-active', 'true');
    expect(screen.getByTestId('nav-header-dashboard')).toHaveAttribute('data-active', 'false');
  });

  it('item de sidebar ativo recebe data-active="true"', () => {
    render(<ManagerLayout {...defaultProps} activePage="jogadores" />);
    expect(screen.getByTestId('nav-sidebar-jogadores')).toHaveAttribute('data-active', 'true');
    expect(screen.getByTestId('nav-sidebar-ranking')).toHaveAttribute('data-active', 'false');
  });

  it('clique em Sessões (header) chama onNavigate("sessoes")', () => {
    const onNavigate = vi.fn();
    render(<ManagerLayout {...defaultProps} onNavigate={onNavigate} />);
    fireEvent.click(screen.getByTestId('nav-header-sessoes'));
    expect(onNavigate).toHaveBeenCalledWith('sessoes');
  });

  it('clique em Relatórios (header) chama onNavigate("relatorios")', () => {
    const onNavigate = vi.fn();
    render(<ManagerLayout {...defaultProps} onNavigate={onNavigate} />);
    fireEvent.click(screen.getByTestId('nav-header-relatorios'));
    expect(onNavigate).toHaveBeenCalledWith('relatorios');
  });

  it('clique em Conteúdos (header) chama onNavigate("conteudos")', () => {
    const onNavigate = vi.fn();
    render(<ManagerLayout {...defaultProps} onNavigate={onNavigate} />);
    fireEvent.click(screen.getByTestId('nav-header-conteudos'));
    expect(onNavigate).toHaveBeenCalledWith('conteudos');
  });

  it('clique em Jogadores (sidebar) chama onNavigate("jogadores")', () => {
    const onNavigate = vi.fn();
    render(<ManagerLayout {...defaultProps} onNavigate={onNavigate} />);
    fireEvent.click(screen.getByTestId('nav-sidebar-jogadores'));
    expect(onNavigate).toHaveBeenCalledWith('jogadores');
  });

  it('clique em Ranking (sidebar) chama onNavigate("ranking")', () => {
    const onNavigate = vi.fn();
    render(<ManagerLayout {...defaultProps} onNavigate={onNavigate} />);
    fireEvent.click(screen.getByTestId('nav-sidebar-ranking'));
    expect(onNavigate).toHaveBeenCalledWith('ranking');
  });

  it('clique em Perfil (sidebar) chama onNavigate("perfil")', () => {
    const onNavigate = vi.fn();
    render(<ManagerLayout {...defaultProps} onNavigate={onNavigate} />);
    fireEvent.click(screen.getByTestId('nav-sidebar-perfil'));
    expect(onNavigate).toHaveBeenCalledWith('perfil');
  });

  it('clique em Suporte (sidebar) chama onNavigate("suporte")', () => {
    const onNavigate = vi.fn();
    render(<ManagerLayout {...defaultProps} onNavigate={onNavigate} />);
    fireEvent.click(screen.getByTestId('nav-sidebar-suporte'));
    expect(onNavigate).toHaveBeenCalledWith('suporte');
  });
});
