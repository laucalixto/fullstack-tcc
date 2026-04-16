import type { LeaderboardEntry } from '@safety-board/shared';

interface GlobalLeaderboardProps {
  entries: LeaderboardEntry[];
  currentPlayerId?: string;
  onViewProfile?: (playerId: string) => void;
}

const MEDAL: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };

export function GlobalLeaderboard({ entries, currentPlayerId, onViewProfile }: GlobalLeaderboardProps) {
  const currentEntry = entries.find((e) => e.playerId === currentPlayerId);

  return (
    <div className="bg-surface text-on-surface antialiased flex min-h-screen font-body">
      {/* Side nav — desktop */}
      <aside className="h-screen w-64 hidden lg:flex flex-col border-r border-outline-variant/10 bg-gradient-to-b from-surface-bright to-surface-container-low fixed left-0 top-0 z-40">
        <div className="p-6">
          <h1 className="text-lg font-bold text-on-surface tracking-tighter">Dashboard</h1>
        </div>
        <nav className="flex flex-col gap-2 p-4">
          <div className="flex items-center gap-3 px-4 py-3 bg-surface-container-lowest text-primary shadow-sm rounded-md font-semibold text-sm uppercase tracking-[0.05rem]">
            <span className="text-lg">📊</span>
            <span>Ranking</span>
          </div>
          <div className="flex items-center gap-3 px-4 py-3 text-on-surface/70 hover:bg-surface-bright transition-all rounded-md font-semibold text-sm uppercase tracking-[0.05rem] cursor-pointer">
            <span className="text-lg">👤</span>
            <span>Perfil</span>
          </div>
        </nav>
      </aside>

      {/* Top nav */}
      <header className="fixed top-0 w-full z-50 bg-surface-bright/80 backdrop-blur-xl border-b border-outline-variant/10 shadow-sm lg:ml-64 lg:w-[calc(100%-16rem)]">
        <div className="flex justify-between items-center px-6 h-16 w-full">
          <div className="flex items-center gap-2">
            <span className="text-primary text-xl">🛡</span>
            <span className="text-xl font-black text-on-surface tracking-tighter uppercase">Safety Board</span>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 mt-16 pb-24 lg:ml-64 lg:pb-8">
        <div className="max-w-6xl mx-auto p-6 md:p-10">
          {/* Hero header */}
          <header className="mb-10">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-primary mb-2">
                  Performance &amp; Compliance
                </p>
                <h2 className="text-4xl font-extrabold text-on-surface tracking-tight md:text-5xl">
                  Ranking Global
                </h2>
                <p className="text-on-surface/60 mt-2 max-w-md">
                  Monitore o desempenho de segurança operacional em todas as unidades industriais.
                </p>
              </div>

              {/* Current user HUD card */}
              {currentEntry && (
                <div className="bg-surface-container-lowest p-6 rounded-2xl shadow-xl border border-outline-variant/10 min-w-[240px] relative overflow-hidden">
                  <p className="text-[10px] font-black uppercase tracking-widest text-on-surface/40 relative z-10">
                    Sua Posição Atual
                  </p>
                  <div className="flex items-baseline gap-2 relative z-10">
                    <span
                      data-testid="leaderboard-current-rank"
                      className="text-4xl font-black text-primary"
                    >
                      #{currentEntry.rank}
                    </span>
                    <span className="text-xs font-bold text-on-surface/50">
                      de {entries.length}
                    </span>
                  </div>
                  <div className="mt-2 relative z-10">
                    <div className="flex-1 h-1 bg-surface-container-high rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full"
                        style={{ width: `${Math.round(((entries.length - currentEntry.rank) / entries.length) * 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </header>

          {/* Table */}
          <section className="bg-surface-container-lowest rounded-3xl shadow-sm border border-outline-variant/10 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-container-low border-b border-outline-variant/10">
                    <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.1em] text-on-surface/50">Posição</th>
                    <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.1em] text-on-surface/50">Colaborador</th>
                    <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.1em] text-on-surface/50">Unidade Industrial</th>
                    <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.1em] text-on-surface/50 text-right">SST Score Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/10">
                  {entries.map((entry) => {
                    const isCurrent = entry.playerId === currentPlayerId;
                    return (
                      <tr
                        key={entry.playerId}
                        data-testid={`leaderboard-entry-${entry.rank}`}
                        data-current={isCurrent ? 'true' : 'false'}
                        onClick={() => onViewProfile?.(entry.playerId)}
                        className={`transition-colors cursor-pointer ${
                          isCurrent
                            ? 'bg-primary-fixed/30 border-y-2 border-primary/20'
                            : 'hover:bg-surface-bright'
                        }`}
                      >
                        <td className="px-6 py-6">
                          <div className="flex items-center gap-2">
                            <span className={`text-xl font-black ${isCurrent ? 'text-primary' : 'text-on-surface'}`}>
                              {String(entry.rank).padStart(2, '0')}
                            </span>
                            {MEDAL[entry.rank] && (
                              <span className="text-lg">{MEDAL[entry.rank]}</span>
                            )}
                            {isCurrent && (
                              <span className="px-2 py-0.5 bg-primary text-white text-[8px] font-bold rounded uppercase">
                                Você
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-6">
                          <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-xl overflow-hidden flex items-center justify-center bg-primary/10 font-black text-primary text-lg shadow-md ${isCurrent ? 'ring-4 ring-white shadow-xl' : ''}`}>
                              {entry.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-bold text-on-surface">{entry.name}</p>
                              {entry.role && (
                                <p className="text-xs text-on-surface/50">{entry.role}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-6">
                          <span className="inline-flex items-center px-3 py-1 rounded-full bg-surface-container-high text-on-surface/70 text-[10px] font-bold uppercase tracking-wider">
                            {entry.industrialUnit}
                          </span>
                        </td>
                        <td className="px-6 py-6 text-right">
                          <span className={`text-lg font-black ${isCurrent ? 'text-primary' : 'text-on-surface'}`}>
                            {entry.totalScore}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
