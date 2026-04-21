interface GameHistoryEntry {
  sessionId: string;
  sessionName: string;
  playedAt: string;
  score: number;
  rank: number;
  totalPlayers: number;
}

interface PlayerHistoryProps {
  entries: GameHistoryEntry[];
  onBack: () => void;
}

export function PlayerHistory({ entries, onBack }: PlayerHistoryProps) {
  return (
    <div className="min-h-screen bg-surface font-body">
      <header className="fixed top-0 w-full z-50 bg-surface/80 backdrop-blur-xl border-b border-outline-variant/20 shadow-sm flex items-center gap-4 px-6 h-16">
        <button
          data-testid="history-back-btn"
          onClick={onBack}
          className="text-on-surface-variant hover:text-on-surface transition-colors font-bold"
        >
          ← Voltar
        </button>
        <span className="text-xl font-black uppercase tracking-tighter text-on-surface">Histórico de Partidas</span>
      </header>

      <main className="pt-24 pb-12 px-6 max-w-4xl mx-auto">
        {entries.length === 0 ? (
          <div data-testid="history-empty" className="text-center py-16 text-on-surface-variant">
            <p className="text-lg font-semibold">Nenhuma partida registrada ainda.</p>
          </div>
        ) : (
          <ul className="space-y-4">
            {entries.map((entry) => (
              <li
                key={entry.sessionId}
                data-testid="history-entry"
                className="bg-surface-container-lowest rounded-lg p-6 shadow-sm border border-outline-variant/10"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-black text-on-surface">{entry.sessionName}</p>
                    <p className="text-xs text-on-surface-variant mt-1">
                      {new Date(entry.playedAt).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p
                      data-testid={`history-entry-score-${entry.sessionId}`}
                      className="text-2xl font-black text-primary"
                    >
                      {entry.score}
                    </p>
                    <p className="text-xs text-on-surface-variant">
                      #{<span data-testid={`history-entry-rank-${entry.sessionId}`}>{entry.rank}</span>} de {entry.totalPlayers}
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
