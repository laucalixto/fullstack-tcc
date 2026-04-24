import { useEffect, useState } from 'react';
import { audioManager } from '../audio/AudioManager';

interface DrawPlayer {
  id: string;
  name: string;
}

interface FirstPlayerDrawProps {
  players: DrawPlayer[];
  winnerPlayerId: string;
  /** Mantido por compatibilidade com o payload do servidor; o cliente usa as
   *  constantes DRAW_* abaixo para controlar as 3 fases. */
  durationMs?: number;
  onComplete: () => void;
}

// Três fases ajustáveis — manter aqui para fácil tuning sem tocar no servidor.
export const DRAW_INTRO_MS     = 2000; // Card aparece, sem destaque, para o jogador perceber o momento.
export const DRAW_ANIMATION_MS = 2000; // Highlight percorre os cards com easing ease-out.
export const DRAW_HOLD_MS      = 2000; // Destaque final no vencedor antes de fechar.

const MIN_TICKS = 14;
const MIN_INTERVAL_MS = 60;
const MAX_INTERVAL_MS = 260;

function planTicks(animationDuration: number, playerCount: number, winnerIndex: number): { highlightSequence: number[]; intervals: number[] } {
  const avgInterval = (MIN_INTERVAL_MS + MAX_INTERVAL_MS) / 2;
  const totalTicks = Math.max(MIN_TICKS, Math.round(animationDuration / avgInterval));
  const intervals: number[] = [];
  for (let i = 0; i < totalTicks; i++) {
    const t = totalTicks === 1 ? 0 : i / (totalTicks - 1);
    intervals.push(MIN_INTERVAL_MS + (MAX_INTERVAL_MS - MIN_INTERVAL_MS) * t * t);
  }
  const sum = intervals.reduce((a, b) => a + b, 0);
  const scale = animationDuration / sum;
  for (let i = 0; i < intervals.length; i++) intervals[i] *= scale;

  const startOffset = ((winnerIndex - (totalTicks - 1)) % playerCount + playerCount) % playerCount;
  const highlightSequence: number[] = [];
  for (let i = 0; i < totalTicks; i++) {
    highlightSequence.push((i + startOffset) % playerCount);
  }
  return { highlightSequence, intervals };
}

export function FirstPlayerDraw({ players, winnerPlayerId, onComplete }: FirstPlayerDrawProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [phase, setPhase] = useState<'intro' | 'animating' | 'done'>('intro');

  useEffect(() => {
    const winnerIndex = Math.max(0, players.findIndex((p) => p.id === winnerPlayerId));
    const timers: ReturnType<typeof setTimeout>[] = [];

    // Fase 1: intro. Apenas mostra cards, sem animação.
    timers.push(setTimeout(() => {
      setPhase('animating');

      // Fase 2: animação. Agenda todos os ticks em sequência cumulativa.
      const { highlightSequence, intervals } = planTicks(DRAW_ANIMATION_MS, players.length, winnerIndex);
      let cumulative = 0;
      for (let i = 0; i < highlightSequence.length; i++) {
        cumulative += intervals[i];
        const isLast = i === highlightSequence.length - 1;
        const idx = highlightSequence[i];
        timers.push(setTimeout(() => {
          setActiveIndex(idx);
          if (isLast) {
            setPhase('done');
            audioManager.playDrawWin();
          } else {
            audioManager.playDrawTick();
          }
        }, cumulative));
      }

      // Fase 3: hold. Após animação + hold, fecha o overlay.
      timers.push(setTimeout(() => { onComplete(); }, cumulative + DRAW_HOLD_MS));
    }, DRAW_INTRO_MS));

    return () => { for (const t of timers) clearTimeout(t); };
  }, [players, winnerPlayerId, onComplete]);

  const finished = phase === 'done';

  return (
    <div
      data-testid="first-player-draw"
      className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/80 backdrop-blur-sm"
    >
      <div className="w-full max-w-4xl px-8">
        <h2 className="text-center text-xs font-black uppercase tracking-[0.3em] text-white/60 mb-2">
          Sorteando quem joga primeiro
        </h2>
        <p
          data-testid="draw-phase"
          className="text-center text-[10px] uppercase tracking-widest text-white/40 mb-8"
        >
          {phase === 'intro' ? 'Preparando...' : phase === 'animating' ? 'Sorteando...' : 'Resultado!'}
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {players.map((p, i) => {
            const isActive = activeIndex === i && phase === 'animating';
            const isWinner = finished && p.id === winnerPlayerId;
            return (
              <div
                key={p.id}
                data-testid={`draw-card-${p.id}`}
                data-active={isActive ? 'true' : 'false'}
                data-winner={isWinner ? 'true' : 'false'}
                className={`
                  relative flex flex-col items-center justify-center rounded-2xl border-2 p-6 transition-all duration-150
                  ${isActive
                    ? 'border-primary bg-primary/20 scale-105 shadow-2xl shadow-primary/40'
                    : 'border-white/10 bg-stone-900/60 scale-100'}
                  ${isWinner ? 'border-primary bg-primary/30 scale-110 ring-4 ring-primary/50' : ''}
                `}
              >
                <div className={`
                  w-16 h-16 rounded-full flex items-center justify-center text-2xl font-black mb-3
                  ${isActive || isWinner ? 'bg-primary text-white' : 'bg-white/10 text-white/70'}
                `}>
                  {p.name.slice(0, 2).toUpperCase()}
                </div>
                <p className="text-sm font-bold uppercase tracking-wide text-white text-center">
                  {p.name}
                </p>
                {isWinner && (
                  <p className="mt-2 text-[10px] font-black uppercase tracking-widest text-primary">
                    Primeiro!
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
