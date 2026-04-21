import type { SessionSummary } from '@safety-board/shared';

interface ManagerSessionsPageProps {
  sessions: SessionSummary[];
  onViewDetail: (sessionId: string) => void;
}

const STATUS_BADGE: Record<SessionSummary['status'], string> = {
  completed: 'bg-emerald-100 text-emerald-800',
  reviewing: 'bg-orange-100 text-orange-800',
  active: 'bg-surface-container-high text-on-surface/70',
};

const STATUS_LABEL: Record<SessionSummary['status'], string> = {
  completed: 'Concluído',
  reviewing: 'Em Revisão',
  active: 'Ativa',
};

export function ManagerSessionsPage({ sessions, onViewDetail }: ManagerSessionsPageProps) {
  return (
    <div className="px-6 md:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-extrabold tracking-tight text-on-surface">Todas as Sessões</h1>
        <p className="text-on-surface/60 text-sm mt-1">{sessions.length} sessão(ões) registrada(s)</p>
      </div>

      <div className="bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low">
                {['ID Sessão', 'PIN', 'Data', 'Grupo/Área', 'Média SST', 'Status', 'Ações'].map((h) => (
                  <th key={h} className="p-4 text-[10px] font-black uppercase tracking-[0.1em] text-on-surface/50">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container">
              {sessions.map((session) => (
                <tr
                  key={session.id}
                  data-testid={`session-row-${session.id}`}
                  className="hover:bg-surface-bright transition-colors"
                >
                  <td className="p-4 text-xs font-mono text-on-surface/60">{session.id.slice(0, 12)}…</td>
                  <td className="p-4 text-sm font-mono font-bold text-on-surface">{session.pin}</td>
                  <td className="p-4 text-sm text-on-surface/60">{session.date}</td>
                  <td className="p-4">
                    <span className="text-xs font-bold px-2 py-1 bg-surface-container-high rounded text-on-surface/70">
                      {session.group}
                    </span>
                  </td>
                  <td className="p-4 text-center">
                    <span className="text-sm font-black text-secondary">
                      {session.avgScore !== null ? session.avgScore : '--'}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold uppercase ${STATUS_BADGE[session.status]}`}>
                      {STATUS_LABEL[session.status]}
                    </span>
                  </td>
                  <td className="p-4">
                    <button
                      data-testid={`session-detail-btn-${session.id}`}
                      onClick={() => onViewDetail(session.id)}
                      className="px-3 py-1 bg-primary/10 text-primary text-[10px] font-bold rounded uppercase tracking-widest hover:bg-primary/20 transition"
                    >
                      Ver Detalhe
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {sessions.length === 0 && (
            <div className="p-12 text-center text-on-surface/40 text-sm font-bold uppercase tracking-widest">
              Nenhuma sessão registrada
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
