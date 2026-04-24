import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';

// ─── Sorteio do primeiro jogador: 3 fases (intro → animação → hold) ──────────

vi.mock('../../audio/AudioManager', () => ({
  audioManager: {
    playDrawTick: vi.fn(),
    playDrawWin: vi.fn(),
  },
}));

import {
  FirstPlayerDraw,
  DRAW_INTRO_MS,
  DRAW_ANIMATION_MS,
  DRAW_HOLD_MS,
} from '../../lobby/FirstPlayerDraw';
import { audioManager } from '../../audio/AudioManager';

const PLAYERS = [
  { id: 'p1', name: 'Alice' },
  { id: 'p2', name: 'Bob' },
  { id: 'p3', name: 'Carol' },
  { id: 'p4', name: 'Dan' },
];

const TOTAL = DRAW_INTRO_MS + DRAW_ANIMATION_MS + DRAW_HOLD_MS;

describe('FirstPlayerDraw', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.mocked(audioManager.playDrawTick).mockClear();
    vi.mocked(audioManager.playDrawWin).mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renderiza um card por jogador', () => {
    render(
      <FirstPlayerDraw
        players={PLAYERS}
        winnerPlayerId="p3"
        onComplete={() => undefined}
      />,
    );
    expect(screen.getByTestId('draw-card-p1')).toBeInTheDocument();
    expect(screen.getByTestId('draw-card-p2')).toBeInTheDocument();
    expect(screen.getByTestId('draw-card-p3')).toBeInTheDocument();
    expect(screen.getByTestId('draw-card-p4')).toBeInTheDocument();
  });

  it('fase inicial é "intro" — não há tick nem vencedor ainda', () => {
    render(
      <FirstPlayerDraw
        players={PLAYERS}
        winnerPlayerId="p3"
        onComplete={() => undefined}
      />,
    );
    expect(screen.getByTestId('draw-phase')).toHaveTextContent(/preparando/i);
    expect(audioManager.playDrawTick).not.toHaveBeenCalled();
  });

  it('intro dura DRAW_INTRO_MS antes dos ticks começarem', () => {
    render(
      <FirstPlayerDraw
        players={PLAYERS}
        winnerPlayerId="p3"
        onComplete={() => undefined}
      />,
    );
    act(() => { vi.advanceTimersByTime(DRAW_INTRO_MS - 100); });
    expect(audioManager.playDrawTick).not.toHaveBeenCalled();
    act(() => { vi.advanceTimersByTime(300); });
    expect(vi.mocked(audioManager.playDrawTick).mock.calls.length).toBeGreaterThan(0);
  });

  it('destaca o vencedor no fim da animação (antes do hold)', () => {
    render(
      <FirstPlayerDraw
        players={PLAYERS}
        winnerPlayerId="p3"
        onComplete={() => undefined}
      />,
    );
    act(() => { vi.advanceTimersByTime(DRAW_INTRO_MS + DRAW_ANIMATION_MS + 50); });
    expect(screen.getByTestId('draw-card-p3')).toHaveAttribute('data-winner', 'true');
  });

  it('onComplete só dispara após intro + animação + hold', () => {
    const onComplete = vi.fn();
    render(
      <FirstPlayerDraw
        players={PLAYERS}
        winnerPlayerId="p3"
        onComplete={onComplete}
      />,
    );
    act(() => { vi.advanceTimersByTime(DRAW_INTRO_MS + DRAW_ANIMATION_MS + 100); });
    expect(onComplete).not.toHaveBeenCalled();
    act(() => { vi.advanceTimersByTime(DRAW_HOLD_MS); });
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('toca playDrawTick múltiplas vezes na fase de animação', () => {
    render(
      <FirstPlayerDraw
        players={PLAYERS}
        winnerPlayerId="p3"
        onComplete={() => undefined}
      />,
    );
    act(() => { vi.advanceTimersByTime(TOTAL + 100); });
    expect(vi.mocked(audioManager.playDrawTick).mock.calls.length).toBeGreaterThan(5);
  });

  it('toca playDrawWin uma vez ao parar no vencedor', () => {
    render(
      <FirstPlayerDraw
        players={PLAYERS}
        winnerPlayerId="p3"
        onComplete={() => undefined}
      />,
    );
    act(() => { vi.advanceTimersByTime(TOTAL + 100); });
    expect(audioManager.playDrawWin).toHaveBeenCalledTimes(1);
  });
});
