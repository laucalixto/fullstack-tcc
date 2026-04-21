import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { EffectCard } from '../../lobby/EffectCard';
import type { TileEffectDefinition } from '@safety-board/shared';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const makeCard = (overrides?: Partial<TileEffectDefinition>): TileEffectDefinition => ({
  type: 'accident',
  title: 'Objeto em queda!',
  description: 'Trabalhador atingido por objeto sem usar capacete.',
  normRef: 'NR-06 Art. 6º',
  imagePath: '/cards/accidents/sem-capacete.svg',
  deltaPosition: -3,
  deltaScore: -20,
  skipTurns: 0,
  backToStart: false,
  ...overrides,
});

// ─── RED: falha até EffectCard.tsx ser implementado ───────────────────────────

describe('EffectCard', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('não renderiza nada quando open é false', () => {
    render(<EffectCard open={false} card={makeCard()} onClose={vi.fn()} />);
    expect(screen.queryByTestId('effect-card')).not.toBeInTheDocument();
  });

  it('renderiza o card quando open é true', () => {
    render(<EffectCard open={true} card={makeCard()} onClose={vi.fn()} />);
    expect(screen.getByTestId('effect-card')).toBeInTheDocument();
  });

  it('exibe o título do card', () => {
    render(<EffectCard open={true} card={makeCard()} onClose={vi.fn()} />);
    expect(screen.getByText('Objeto em queda!')).toBeInTheDocument();
  });

  it('exibe a descrição do card', () => {
    render(<EffectCard open={true} card={makeCard()} onClose={vi.fn()} />);
    expect(screen.getByText('Trabalhador atingido por objeto sem usar capacete.')).toBeInTheDocument();
  });

  it('exibe a referência normativa', () => {
    render(<EffectCard open={true} card={makeCard()} onClose={vi.fn()} />);
    expect(screen.getByText('NR-06 Art. 6º')).toBeInTheDocument();
  });

  it('exibe o efeito de posição negativo (accident)', () => {
    render(<EffectCard open={true} card={makeCard({ deltaPosition: -3 })} onClose={vi.fn()} />);
    expect(screen.getByText(/-3 casas/i)).toBeInTheDocument();
  });

  it('exibe o efeito de posição positivo (prevention)', () => {
    render(<EffectCard open={true} card={makeCard({ type: 'prevention', deltaPosition: 3 })} onClose={vi.fn()} />);
    expect(screen.getByText(/\+3 casas/i)).toBeInTheDocument();
  });

  it('exibe efeito de pontuação negativo', () => {
    render(<EffectCard open={true} card={makeCard({ deltaScore: -20 })} onClose={vi.fn()} />);
    expect(screen.getByText(/-20 pts/i)).toBeInTheDocument();
  });

  it('exibe efeito de pontuação positivo', () => {
    render(<EffectCard open={true} card={makeCard({ type: 'prevention', deltaScore: 25 })} onClose={vi.fn()} />);
    expect(screen.getByText(/\+25 pts/i)).toBeInTheDocument();
  });

  it('exibe badge "ACIDENTE" para tipo accident', () => {
    render(<EffectCard open={true} card={makeCard({ type: 'accident' })} onClose={vi.fn()} />);
    expect(screen.getByText(/ACIDENTE/i)).toBeInTheDocument();
  });

  it('exibe badge "PREVENÇÃO" para tipo prevention', () => {
    render(<EffectCard open={true} card={makeCard({ type: 'prevention' })} onClose={vi.fn()} />);
    expect(screen.getByText(/PREVENÇÃO/i)).toBeInTheDocument();
  });

  it('exibe badge "PERDE A VEZ" para tipo skip-turn', () => {
    render(<EffectCard open={true} card={makeCard({ type: 'skip-turn', deltaPosition: 0, deltaScore: 0, skipTurns: 1 })} onClose={vi.fn()} />);
    expect(screen.getByText(/PERDE A VEZ/i)).toBeInTheDocument();
  });

  it('exibe badge "VOLTA AO INÍCIO" para tipo back-to-start', () => {
    render(<EffectCard open={true} card={makeCard({ type: 'back-to-start', backToStart: true, deltaScore: -50 })} onClose={vi.fn()} />);
    expect(screen.getByText(/VOLTA AO INÍCIO/i)).toBeInTheDocument();
  });

  it('renderiza botão "Continuar"', () => {
    render(<EffectCard open={true} card={makeCard()} onClose={vi.fn()} />);
    expect(screen.getByRole('button', { name: /continuar/i })).toBeInTheDocument();
  });

  it('chama onClose ao clicar em "Continuar"', () => {
    const onClose = vi.fn();
    render(<EffectCard open={true} card={makeCard()} onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: /continuar/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('chama onClose automaticamente após autoCloseSeconds', () => {
    const onClose = vi.fn();
    render(<EffectCard open={true} card={makeCard()} onClose={onClose} autoCloseSeconds={8} />);
    expect(onClose).not.toHaveBeenCalled();
    act(() => { vi.advanceTimersByTime(8000); });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('não chama onClose antes de autoCloseSeconds', () => {
    const onClose = vi.fn();
    render(<EffectCard open={true} card={makeCard()} onClose={onClose} autoCloseSeconds={8} />);
    act(() => { vi.advanceTimersByTime(7999); });
    expect(onClose).not.toHaveBeenCalled();
  });

  it('renderiza imagem com src correto', () => {
    render(<EffectCard open={true} card={makeCard()} onClose={vi.fn()} />);
    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('src', '/cards/accidents/sem-capacete.svg');
  });
});
