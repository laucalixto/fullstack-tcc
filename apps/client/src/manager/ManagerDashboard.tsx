import type { DashboardStats, SessionSummary } from '@safety-board/shared';

interface ManagerDashboardProps {
  stats: DashboardStats;
  recentSessions: SessionSummary[];
  onNewSession: () => void;
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

export function ManagerDashboard({ stats, recentSessions, onNewSession }: ManagerDashboardProps) {
  return (
    <div className="bg-surface text-on-surface antialiased">
      {/* Top nav */}
      <nav className="fixed top-0 w-full z-50 bg-surface-bright/80 backdrop-blur-xl border-b border-outline-variant/10 shadow-sm flex justify-between items-center px-6 h-16">
        <span className="text-xl font-black uppercase tracking-tighter text-on-surface">Safety Board</span>
        <div className="hidden md:flex items-center gap-8 tracking-tight">
          <span className="text-primary font-bold border-b-2 border-primary px-1 py-4">Dashboard</span>
          <span className="text-on-surface/50 px-1 py-4 cursor-pointer">Sessões</span>
          <span className="text-on-surface/50 px-1 py-4 cursor-pointer">Relatórios</span>
          <span className="text-on-surface/50 px-1 py-4 cursor-pointer">Conteúdos</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center text-sm font-bold text-on-surface">
            G
          </div>
          <span className="text-sm font-bold text-on-surface hidden sm:block">Gestor SST</span>
        </div>
      </nav>

      {/* Side nav (desktop) */}
      <aside className="h-full w-64 fixed left-0 top-0 z-40 bg-surface-container-low pt-20 hidden md:flex flex-col p-4 gap-2">
        <div className="mb-8 px-4">
          <p className="text-xs font-bold tracking-widest text-on-surface/50 uppercase">Missão Ativa</p>
          <p className="text-sm font-bold text-on-surface mt-1">SST Nível 4</p>
        </div>
        <nav className="space-y-1">
          {['Mapa 3D', 'Jogadores', 'Missões', 'Conquistas', 'Suporte'].map((item, i) => (
            <div
              key={item}
              className={`flex items-center gap-3 p-3 rounded-lg text-[11px] font-bold uppercase tracking-widest cursor-pointer transition-all ${
                i === 0
                  ? 'bg-surface-container-lowest text-primary shadow-sm'
                  : 'text-on-surface/60 hover:bg-surface-bright hover:translate-x-1 duration-300'
              }`}
            >
              {item}
            </div>
          ))}
        </nav>
        <div className="mt-auto p-4 space-y-2">
          <button className="w-full py-3 bg-primary text-white font-bold rounded-md hover:bg-primary-container transition-colors uppercase text-[11px] tracking-widest active:scale-95">
            Encerrar Sessão
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="md:ml-64 pt-20 px-8 pb-12 min-h-screen bg-surface">
        {/* Header */}
        <div className="flex justify-between items-end mb-10">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-on-surface mb-2">Visão Geral da Operação</h1>
            <p className="text-on-surface/60 font-medium">Relatório de conformidade em tempo real</p>
          </div>
          <div className="flex gap-4">
            <button className="flex items-center gap-2 px-6 py-3 bg-surface-container-high text-on-surface font-bold rounded-md hover:bg-surface-bright transition-all uppercase text-[11px] tracking-widest">
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
          <div className="bg-surface-container-lowest p-6 rounded-xl shadow-sm relative overflow-hidden">
            <p className="text-[10px] font-black uppercase tracking-[0.1em] text-on-surface/50 mb-1">Total de Jogadores</p>
            <div className="flex items-baseline gap-2">
              <span data-testid="dashboard-stat-players" className="text-4xl font-black text-on-surface">
                {stats.totalPlayers}
              </span>
            </div>
          </div>

          <div className="bg-surface-container-lowest p-6 rounded-xl shadow-sm relative overflow-hidden">
            <p className="text-[10px] font-black uppercase tracking-[0.1em] text-on-surface/50 mb-1">Média de Pontuação</p>
            <div className="flex items-baseline gap-2">
              <span data-testid="dashboard-stat-score" className="text-4xl font-black text-on-surface">
                {stats.avgScore}
              </span>
            </div>
          </div>

          <div className="bg-surface-container-lowest p-6 rounded-xl shadow-sm relative overflow-hidden">
            <p className="text-[10px] font-black uppercase tracking-[0.1em] text-on-surface/50 mb-1">Taxa de Conclusão</p>
            <div className="flex items-baseline gap-2">
              <span data-testid="dashboard-stat-completion" className="text-4xl font-black text-on-surface">
                {stats.completionRate}
              </span>
              <span className="text-sm font-bold text-on-surface/50">%</span>
            </div>
          </div>

          <div className="bg-surface-container-lowest p-6 rounded-xl shadow-sm relative overflow-hidden border-l-4 border-primary">
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
        <div className="mt-8 bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden">
          <div className="p-6 border-b border-surface-container">
            <h3 className="text-lg font-bold tracking-tight text-on-surface">Últimas Sessões Realizadas</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-low">
                  {['ID Sessão', 'Data', 'Grupo/Área', 'Média SST', 'Status'].map((h) => (
                    <th key={h} className="p-4 text-[10px] font-black uppercase tracking-[0.1em] text-on-surface/50">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container">
                {recentSessions.map((session) => (
                  <tr
                    key={session.id}
                    data-testid={`dashboard-session-${session.id}`}
                    className="hover:bg-surface-bright transition-colors"
                  >
                    <td className="p-4 text-sm font-bold text-on-surface">#{session.id}</td>
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
              <button className="text-[11px] font-black uppercase tracking-widest text-secondary hover:underline transition-all">
                Ver Histórico Completo
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
