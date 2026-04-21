import type { DashboardStats, SessionSummary } from '@safety-board/shared';

interface ManagerDashboardProps {
  stats: DashboardStats;
  recentSessions: SessionSummary[];
  onNewSession: () => void;
  onNavigateToSessions?: () => void;
  onNavigateToReports?: () => void;
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

export function ManagerDashboard({ stats, recentSessions, onNewSession, onNavigateToSessions, onNavigateToReports }: ManagerDashboardProps) {
  return (
    <div className="px-6 md:px-8 py-8 pb-12">
      {/* Header */}
      <div className="flex justify-between items-end mb-10 mt-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-on-surface mb-2">Visão Geral da Operação</h1>
          <p className="text-on-surface/60 font-medium">Relatório de conformidade em tempo real</p>
        </div>
        <div className="flex gap-4">
          <button
            data-testid="dashboard-export-btn"
            onClick={onNavigateToReports}
            className="flex items-center gap-2 px-6 py-3 bg-surface-container-high text-on-surface font-bold rounded-md hover:bg-surface-bright transition-all uppercase text-[11px] tracking-widest"
          >
            Exportar Relatórios
          </button>
          <button
            data-testid="dashboard-new-session"
            onClick={onNewSession}
            className="flex items-center gap-2 px-6 py-3 bg-primary text-white font-bold rounded-md shadow-lg hover:bg-primary-container transition-all uppercase text-[11px] tracking-widest"
          >
            + Nova Sessão
          </button>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        <div className="bg-surface-container-lowest p-6 rounded-xl shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-[0.1em] text-on-surface/50 mb-1">Total de Jogadores</p>
          <span data-testid="dashboard-stat-players" className="text-4xl font-black text-on-surface">
            {stats.totalPlayers}
          </span>
        </div>

        <div className="bg-surface-container-lowest p-6 rounded-xl shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-[0.1em] text-on-surface/50 mb-1">Média de Pontuação</p>
          <span data-testid="dashboard-stat-score" className="text-4xl font-black text-on-surface">
            {stats.avgScore}
          </span>
        </div>

        <div className="bg-surface-container-lowest p-6 rounded-xl shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-[0.1em] text-on-surface/50 mb-1">Taxa de Conclusão</p>
          <div className="flex items-baseline gap-2">
            <span data-testid="dashboard-stat-completion" className="text-4xl font-black text-on-surface">
              {stats.completionRate}
            </span>
            <span className="text-sm font-bold text-on-surface/50">%</span>
          </div>
        </div>

        <div className="bg-surface-container-lowest p-6 rounded-xl shadow-sm border-l-4 border-primary">
          <p className="text-[10px] font-black uppercase tracking-[0.1em] text-on-surface/50 mb-1">Sessões Ativas</p>
          <div className="flex items-baseline gap-2">
            <span data-testid="dashboard-stat-active" className="text-4xl font-black text-primary">
              {stats.activeSessions}
            </span>
            <span className="flex h-2 w-2 rounded-full bg-primary animate-pulse" />
          </div>
        </div>
      </div>

      {/* Recent sessions table */}
      <div className="bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-surface-container flex justify-between items-center">
          <h3 className="text-lg font-bold tracking-tight text-on-surface">Últimas Sessões Realizadas</h3>
          <button
            onClick={onNavigateToSessions}
            className="text-[11px] font-black uppercase tracking-widest text-secondary hover:underline transition-all"
          >
            Ver Todas as Sessões
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low">
                {['ID Sessão', 'PIN', 'Data', 'Grupo/Área', 'Média SST', 'Status'].map((h) => (
                  <th key={h} className="p-4 text-[10px] font-black uppercase tracking-[0.1em] text-on-surface/50">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container">
              {recentSessions.map((session) => (
                <tr
                  key={session.id}
                  data-testid={`dashboard-session-${session.id}`}
                  className="hover:bg-surface-bright transition-colors cursor-pointer"
                  onClick={onNavigateToSessions}
                >
                  <td className="p-4 text-sm font-bold text-on-surface font-mono">{session.id.slice(0, 8)}…</td>
                  <td className="p-4 text-sm font-mono text-on-surface/70">{session.pin}</td>
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
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase ${STATUS_BADGE[session.status]}`}>
                      {STATUS_LABEL[session.status]}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {recentSessions.length > 0 && (
          <div className="p-4 bg-surface-container-low flex justify-center">
            <button
              data-testid="dashboard-history-link"
              onClick={onNavigateToSessions}
              className="text-[11px] font-black uppercase tracking-widest text-secondary hover:underline transition-all"
            >
              Ver Histórico Completo
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
