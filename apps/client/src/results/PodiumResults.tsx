import type { GameResultPlayer } from '@safety-board/shared';

interface PodiumResultsProps {
  players: GameResultPlayer[];
  durationSeconds: number;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

const PODIUM_ORDER = [2, 1, 3, 4] as const; // visual order: 2nd, 1st, 3rd, 4th

const PODIUM_HEIGHT: Record<number, string> = {
  1: 'h-48',
  2: 'h-32',
  3: 'h-24',
  4: 'h-16',
};

const PODIUM_BG: Record<number, string> = {
  1: 'bg-primary-container',
  2: 'bg-surface-container-highest',
  3: 'bg-surface-container-high',
  4: 'bg-surface-container',
};

const PODIUM_LIFT: Record<number, string> = {
  1: '-translate-y-8',
  2: '',
  3: '',
  4: '',
};

const RANK_LABEL: Record<number, string> = {
  1: '1º LUGAR • VENCEDOR',
  2: '2º LUGAR',
  3: '3º LUGAR',
  4: '4º LUGAR',
};

export function PodiumResults({ players, durationSeconds }: PodiumResultsProps) {
  const byRank = Object.fromEntries(players.map((p) => [p.rank, p]));

  // Show only the podium players that exist, ordered visually
  const visibleOrder = PODIUM_ORDER.filter((r) => byRank[r]);

  return (
    <div data-testid="podium-results" className="bg-surface text-on-surface min-h-screen font-body">
      {/* TopNav */}
      <header className="fixed top-0 w-full z-50 bg-surface/80 backdrop-blur-xl border-b border-outline-variant/20 shadow-sm flex items-center px-6 h-16">
        <span className="text-xl font-black uppercase tracking-tighter text-on-surface">Safety Board</span>
      </header>

      <main className="pt-24 pb-12 px-6 max-w-7xl mx-auto">
        {/* Title */}
        <div className="mb-12 text-center">
          <h1 className="text-4xl font-black tracking-tighter uppercase text-primary mb-2">
            Missão Concluída
          </h1>
          <p className="text-secondary font-medium tracking-widest uppercase text-xs">
            Resultados finais
          </p>
          <p className="mt-2 text-sm text-on-surface-variant font-medium">
            Duração:{' '}
            <span data-testid="podium-duration" className="font-bold text-on-surface">
              {formatDuration(durationSeconds)}
            </span>
          </p>
        </div>

        {/* Podium */}
        <section className="rounded-3xl p-8 mb-16 overflow-hidden relative border border-outline-variant/10"
          style={{ background: 'linear-gradient(180deg, rgba(255,102,0,0.1) 0%, #fbf9f8 100%)' }}
        >
          <div className="grid items-end max-w-4xl mx-auto gap-4 md:gap-8 pt-12"
            style={{ gridTemplateColumns: `repeat(${visibleOrder.length}, 1fr)` }}
          >
            {visibleOrder.map((rank) => {
              const player = byRank[rank];
              if (!player) return null;
              const isFirst = rank === 1;
              return (
                <div
                  key={player.playerId}
                  data-testid={`podium-player-${rank}`}
                  data-rank={String(rank)}
                  className={`flex flex-col items-center ${PODIUM_LIFT[rank] ?? ''}`}
                >
                  <div className="mb-4 text-center relative">
                    {isFirst && (
                      <span className="absolute -top-10 left-1/2 -translate-x-1/2 text-4xl">🏆</span>
                    )}
                    <div
                      className={`rounded-full overflow-hidden mb-2 shadow-xl flex items-center justify-center bg-primary/10 ${
                        isFirst
                          ? 'w-28 h-28 md:w-32 md:h-32 border-4 border-primary-container ring-4 ring-primary-container/20'
                          : 'w-20 h-20 md:w-24 md:h-24 border-4 border-surface-container-highest'
                      }`}
                    >
                      <span className={`font-black text-primary ${isFirst ? 'text-4xl' : 'text-2xl'}`}>
                        {player.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <p className={`font-bold ${isFirst ? 'text-primary text-lg' : 'text-on-surface'}`}>
                      {player.name}
                    </p>
                    <p className={`text-[10px] uppercase tracking-tighter font-bold ${isFirst ? 'text-primary-container' : 'text-on-surface-variant'}`}>
                      {RANK_LABEL[rank]}
                    </p>
                    <p className="text-sm font-black text-on-surface mt-1">{player.score} pts</p>
                  </div>

                  {/* Podium bar */}
                  <div
                    className={`w-full ${PODIUM_BG[rank] ?? 'bg-surface-container'} ${PODIUM_HEIGHT[rank] ?? 'h-16'} rounded-t-xl flex items-center justify-center shadow-inner`}
                  >
                    <span className={`font-black text-white/50 ${isFirst ? 'text-6xl' : 'text-4xl'}`}>
                      {rank}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
}
