import type { LeaderboardEntry } from '@safety-board/shared';

interface GlobalLeaderboardProps {
  entries: LeaderboardEntry[];
  currentPlayerId?: string;
  playerName?: string;
  onViewProfile?: (playerId: string) => void;
  onViewDashboard?: () => void;
  onViewHistory?: () => void;
  onEditProfile?: () => void;
  onLogout?: () => void;
}

const MEDAL: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };

const NAV_ITEMS = [
  { label: 'Visão Geral', key: 'overview' },
  { label: 'Histórico',   key: 'history'  },
  { label: 'Ranking',     key: 'ranking'  },
  { label: 'Perfil',      key: 'profile'  },
];

export function GlobalLeaderboard({
  entries, currentPlayerId, playerName,
  onViewProfile, onViewDashboard, onViewHistory, onEditProfile, onLogout,
}: GlobalLeaderboardProps) {
  const currentEntry = entries.find((e) => e.playerId === currentPlayerId);
  const initial = playerName ? playerName.charAt(0).toUpperCase() : null;

  function handleNavClick(key: string) {
    if (key === 'overview') onViewDashboard?.();
    if (key === 'history')  onViewHistory?.();
    if (key === 'profile')  onEditProfile?.();
  }

  return (
    <div className="bg-surface text-on-surface antialiased min-h-screen">

      {/* Top nav */}
      <nav className="fixed top-0 w-full z-50 bg-surface-bright/80 backdrop-blur-xl border-b border-outline-variant/10 shadow-sm flex justify-between items-center px-6 h-16">
        <span className="text-xl font-black uppercase tracking-tighter text-on-surface">Safety Board</span>
        {playerName && (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center text-sm font-black text-primary">
              {initial}
            </div>
            <span className="text-sm font-bold text-on-surface hidden sm:block">{playerName}</span>
            {onLogout && (
              <button
                onClick={onLogout}
                className="ml-4 text-xs font-bold text-on-surface-variant hover:text-error transition-colors uppercase tracking-widest"
              >
                Sair
              </button>
            )}
          </div>
        )}
      </nav>

      {/* Sidebar (desktop) */}
      <aside className="h-full w-60 fixed left-0 top-0 z-40 bg-surface-container-low pt-20 hidden md:flex flex-col p-4 gap-2">
        {playerName && (
          <div className="mb-6 px-4">
            <p className="text-[10px] font-bold tracking-widest text-on-surface/50 uppercase">Área do Jogador</p>
            <p className="text-sm font-bold text-on-surface mt-1 truncate">{playerName}</p>
          </div>
        )}

        <nav className="space-y-1">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.key}
              onClick={() => handleNavClick(item.key)}
              className={`w-full flex items-center gap-3 p-3 rounded-lg text-[11px] font-bold uppercase tracking-widest transition-all text-left ${
                item.key === 'ranking'
                  ? 'bg-surface-container-lowest text-primary shadow-sm'
                  : 'text-on-surface/60 hover:bg-surface-bright hover:translate-x-1 duration-300'
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>

        {onLogout && (
          <div className="mt-auto p-4">
            <button
              onClick={onLogout}
              className="w-full py-3 bg-surface-container-high text-on-surface/60 font-bold rounded-md hover:bg-error/10 hover:text-error transition-colors uppercase text-[11px] tracking-widest active:scale-95"
            >
              Sair
            </button>
          </div>
        )}
      </aside>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 w-full z-50 bg-surface-bright/90 backdrop-blur-xl border-t border-outline-variant/10 flex justify-around items-center h-14">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.key}
            onClick={() => handleNavClick(item.key)}
            className={`flex-1 text-[10px] font-bold uppercase tracking-wider py-2 transition-colors ${
              item.key === 'ranking' ? 'text-primary' : 'text-on-surface/60 hover:text-primary'
            }`}
          >
            {item.label}
          </button>
        ))}
      </nav>

      {/* Main */}
      <main className="md:ml-60 pt-20 pb-20 md:pb-12 px-6 md:px-8 min-h-screen bg-surface">
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
