type ActivePage = 'dashboard' | 'sessoes' | 'relatorios' | 'conteudos' | 'jogadores' | 'ranking' | 'perfil' | 'suporte';

interface ManagerLayoutProps {
  children: React.ReactNode;
  activePage: ActivePage;
  managerName: string;
  onNavigate: (page: ActivePage) => void;
  onLogout: () => void;
}

const HEADER_ITEMS: Array<{ label: string; key: ActivePage }> = [
  { label: 'Dashboard',  key: 'dashboard'  },
  { label: 'Sessões',    key: 'sessoes'    },
  { label: 'Relatórios', key: 'relatorios' },
  { label: 'Conteúdos',  key: 'conteudos'  },
];

const SIDEBAR_ITEMS: Array<{ label: string; key: ActivePage }> = [
  { label: 'Jogadores', key: 'jogadores' },
  { label: 'Ranking',   key: 'ranking'   },
  { label: 'Perfil',    key: 'perfil'    },
  { label: 'Suporte',   key: 'suporte'   },
];

export function ManagerLayout({ children, activePage, managerName, onNavigate, onLogout }: ManagerLayoutProps) {
  const initial = managerName.charAt(0).toUpperCase();

  return (
    <div className="bg-surface text-on-surface antialiased min-h-screen">

      {/* Top nav — logo esquerda | nav centralizado | usuário direita */}
      <nav className="fixed top-0 w-full z-50 bg-surface-bright/80 backdrop-blur-xl border-b border-outline-variant/10 shadow-sm h-16">
        <div className="relative flex items-center justify-between px-6 h-full">
          {/* Logo — esquerda */}
          <span className="text-xl font-black uppercase tracking-tighter text-on-surface shrink-0">Safety Board</span>

          {/* Nav items — absolutamente centrado */}
          <div className="absolute left-1/2 -translate-x-1/2 hidden md:flex items-center gap-1">
            {HEADER_ITEMS.map((item) => {
              const isActive = activePage === item.key;
              return (
                <button
                  key={item.key}
                  data-testid={`nav-header-${item.key}`}
                  data-active={String(isActive)}
                  onClick={() => onNavigate(item.key)}
                  className={`px-4 py-2 text-sm font-bold transition-colors rounded-md ${
                    isActive
                      ? 'text-primary border-b-2 border-primary'
                      : 'text-on-surface/60 hover:text-on-surface hover:bg-surface-container-high'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>

          {/* Usuário — direita */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center text-sm font-black text-primary">
              {initial}
            </div>
            <span
              data-testid="layout-manager-name"
              className="text-sm font-bold text-on-surface hidden sm:block"
            >
              {managerName}
            </span>
            <button
              data-testid="layout-logout-btn"
              onClick={onLogout}
              className="ml-2 text-xs font-bold text-on-surface-variant hover:text-error transition-colors uppercase tracking-widest"
            >
              Sair
            </button>
          </div>
        </div>
      </nav>

      {/* Sidebar (desktop) */}
      <aside className="h-full w-64 fixed left-0 top-0 z-40 bg-surface-container-low pt-20 hidden md:flex flex-col p-4 gap-2">
        <div className="mb-6 px-4">
          <p className="text-[10px] font-bold tracking-widest text-on-surface/50 uppercase">Gestão SST</p>
          <p className="text-sm font-bold text-on-surface mt-1 truncate">{managerName}</p>
        </div>

        <nav className="space-y-1">
          {SIDEBAR_ITEMS.map((item) => {
            const isActive = activePage === item.key;
            return (
              <button
                key={item.key}
                data-testid={`nav-sidebar-${item.key}`}
                data-active={String(isActive)}
                onClick={() => onNavigate(item.key)}
                className={`w-full flex items-center gap-3 p-3 rounded-lg text-[11px] font-bold uppercase tracking-widest transition-all text-left ${
                  isActive
                    ? 'bg-surface-container-lowest text-primary shadow-sm'
                    : 'text-on-surface/60 hover:bg-surface-bright hover:translate-x-1 duration-300'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="mt-auto p-4">
          <button
            onClick={onLogout}
            className="w-full py-3 bg-surface-container-high text-on-surface/60 font-bold rounded-md hover:bg-error/10 hover:text-error transition-colors uppercase text-[11px] tracking-widest active:scale-95"
          >
            Sair
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="md:ml-64 pt-16 min-h-screen bg-surface">
        {children}
      </main>
    </div>
  );
}
