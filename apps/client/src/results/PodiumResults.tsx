import type { GameResultPlayer } from '@safety-board/shared';

interface PodiumResultsProps {
  players: GameResultPlayer[];
  durationSeconds: number;
  myPlayerId?: string;
  onViewResults?: () => void;
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

export function PodiumResults({ players, durationSeconds, myPlayerId, onViewResults }: PodiumResultsProps) {
  const byRank = Object.fromEntries(players.map((p) => [p.rank, p]));
  const sorted = [...players].sort((a, b) => a.rank - b.rank);

  // Show only the podium players that exist, ordered visually
  const visibleOrder = PODIUM_ORDER.filter((r) => byRank[r]);

  const myPlayer = myPlayerId ? players.find((p) => p.playerId === myPlayerId) : undefined;

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

        {/* Bottom section: performance card + leaderboard */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">

          {/* Performance card — só exibido para o jogador atual */}
          {myPlayer && (
            <div className="lg:col-span-1 space-y-6">
              <div
                data-testid="podium-performance-card"
                className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm border border-stone-100"
              >
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-widest text-stone-500 mb-1">
                      Seu Desempenho
                    </h3>
                    <p className="text-xl font-bold text-on-surface">{myPlayer.name}</p>
                  </div>
                  <span className="bg-primary-container/10 text-primary-container px-3 py-1 rounded-full text-[10px] font-black uppercase">
                    {RANK_LABEL[myPlayer.rank]}
                  </span>
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-end">
                    <span className="text-xs text-stone-500 uppercase tracking-tight">Score Total</span>
                    <span className="text-3xl font-black text-primary">{myPlayer.score}</span>
                  </div>
                  <div className="w-full bg-stone-100 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-primary h-full"
                      style={{ width: `${Math.min(100, Math.round((myPlayer.score / Math.max(...players.map((p) => p.score), 1)) * 100))}%` }}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4 pt-4">
                    <div className="bg-surface-container-low p-3 rounded-xl">
                      <p className="text-lg font-bold">
                        {myPlayer.correctAnswers}/{myPlayer.totalAnswers}
                      </p>
                      <p className="text-[10px] text-stone-500 uppercase font-bold">Acertos</p>
                    </div>
                    <div className="bg-surface-container-low p-3 rounded-xl">
                      <p className="text-lg font-bold">{myPlayer.finalPosition}</p>
                      <p className="text-[10px] text-stone-500 uppercase font-bold">Casa Final</p>
                    </div>
                  </div>
                </div>
              </div>

              <button
                data-testid="podium-btn-individual"
                onClick={onViewResults}
                className="w-full bg-primary text-white py-4 rounded-xl font-bold uppercase text-xs tracking-widest hover:bg-primary-container transition-all active:scale-[0.98] flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
              >
                Verifique seu desempenho
              </button>
            </div>
          )}

          {/* Leaderboard table */}
          <div className={myPlayer ? 'lg:col-span-2' : 'lg:col-span-3'}>
            <div className="bg-surface-container-lowest rounded-2xl shadow-sm border border-stone-100 overflow-hidden">
              <div className="p-6 border-b border-stone-50 flex justify-between items-center">
                <h2 className="font-bold uppercase tracking-widest text-xs text-stone-500">Leaderboard</h2>
                <span className="text-[10px] font-bold text-secondary uppercase bg-secondary-fixed px-2 py-0.5 rounded">
                  Ranking Final
                </span>
              </div>
              <div className="overflow-x-auto">
                <table
                  data-testid="podium-leaderboard"
                  className="w-full text-left"
                >
                  <thead>
                    <tr className="bg-surface-container-low">
                      <th className="px-6 py-4 text-[10px] uppercase font-black text-stone-500 tracking-tighter">Pos</th>
                      <th className="px-6 py-4 text-[10px] uppercase font-black text-stone-500 tracking-tighter">Nome</th>
                      <th className="px-6 py-4 text-[10px] uppercase font-black text-stone-500 tracking-tighter text-center">Acertos</th>
                      <th className="px-6 py-4 text-[10px] uppercase font-black text-stone-500 tracking-tighter text-right">Score SST</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-50">
                    {sorted.map((player) => {
                      const isCurrent = player.playerId === myPlayerId;
                      return (
                        <tr
                          key={player.playerId}
                          data-testid={`podium-leaderboard-row-${player.rank}`}
                          data-current={String(isCurrent)}
                          className={`hover:bg-stone-50 transition-colors ${isCurrent ? 'bg-orange-50/30' : ''}`}
                        >
                          <td className="px-6 py-4">
                            <span className={`w-6 h-6 flex items-center justify-center rounded-full text-[10px] font-black ${isCurrent ? 'bg-primary text-white' : 'text-stone-400 font-bold text-xs'}`}>
                              {String(player.rank).padStart(2, '0')}
                            </span>
                          </td>
                          <td className="px-6 py-4 font-bold text-on-surface">
                            {player.name}{isCurrent ? ' (Você)' : ''}
                          </td>
                          <td className="px-6 py-4 text-center text-sm font-medium">{player.correctAnswers}</td>
                          <td className="px-6 py-4 text-right font-black text-primary">{player.score}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
