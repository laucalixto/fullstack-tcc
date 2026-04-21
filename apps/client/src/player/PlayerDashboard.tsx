import { useState } from 'react';

interface PlayerDashboardProps {
  name: string;
  email: string;
  industrialUnit: string;
  totalScore: number;
  gameCount: number;
  onViewHistory: () => void;
  onEditProfile: () => void;
  onViewRanking: () => void;
  onLogout: () => void;
  onJoinPin?: (pin: string) => void;
}

const NAV_ITEMS = [
  { label: 'Visão Geral',  key: 'overview' },
  { label: 'Histórico',    key: 'history'  },
  { label: 'Ranking',      key: 'ranking'  },
  { label: 'Perfil',       key: 'profile'  },
];

export function PlayerDashboard({
  name, email, industrialUnit, totalScore, gameCount,
  onViewHistory, onEditProfile, onViewRanking, onLogout, onJoinPin,
}: PlayerDashboardProps) {
  const [pin, setPin] = useState('');

  function handlePinChange(e: React.ChangeEvent<HTMLInputElement>) {
    setPin(e.target.value.replace(/\D/g, '').slice(0, 6));
  }

  function handlePinSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (pin.length === 6) onJoinPin?.(pin);
  }

  function handleNavClick(key: string) {
    if (key === 'history') onViewHistory();
    if (key === 'ranking') onViewRanking();
    if (key === 'profile') onEditProfile();
  }

  const initial = name.charAt(0).toUpperCase();

  return (
    <div className="bg-surface text-on-surface antialiased min-h-screen">

      {/* Top nav */}
      <nav className="fixed top-0 w-full z-50 bg-surface-bright/80 backdrop-blur-xl border-b border-outline-variant/10 shadow-sm flex justify-between items-center px-6 h-16">
        <span className="text-xl font-black uppercase tracking-tighter text-on-surface">Safety Board</span>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center text-sm font-black text-primary">
            {initial}
          </div>
          <span
            data-testid="dashboard-name"
            className="text-sm font-bold text-on-surface hidden sm:block"
          >
            {name}
          </span>
          <button
            data-testid="dashboard-logout-btn"
            onClick={onLogout}
            className="ml-4 text-xs font-bold text-on-surface-variant hover:text-error transition-colors uppercase tracking-widest"
          >
            Sair
          </button>
        </div>
      </nav>

      {/* Sidebar (desktop) */}
      <aside className="h-full w-60 fixed left-0 top-0 z-40 bg-surface-container-low pt-20 hidden md:flex flex-col p-4 gap-2">
        <div className="mb-6 px-4">
          <p className="text-[10px] font-bold tracking-widest text-on-surface/50 uppercase">Área do Jogador</p>
          <p data-testid="dashboard-unit" className="text-sm font-bold text-on-surface mt-1 truncate">
            {industrialUnit}
          </p>
          <p data-testid="dashboard-email" className="text-xs text-on-surface-variant mt-0.5 truncate">
            {email}
          </p>
        </div>

        <nav className="space-y-1">
          {NAV_ITEMS.map((item, i) => (
            <button
              key={item.key}
              data-testid={
                item.key === 'history' ? 'dashboard-history-btn' :
                item.key === 'ranking' ? 'dashboard-ranking-btn' :
                item.key === 'profile' ? 'dashboard-profile-btn' : undefined
              }
              onClick={() => handleNavClick(item.key)}
              className={`w-full flex items-center gap-3 p-3 rounded-lg text-[11px] font-bold uppercase tracking-widest transition-all text-left ${
                i === 0
                  ? 'bg-surface-container-lowest text-primary shadow-sm'
                  : 'text-on-surface/60 hover:bg-surface-bright hover:translate-x-1 duration-300'
              }`}
            >
              {item.label}
            </button>
          ))}
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

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 w-full z-50 bg-surface-bright/90 backdrop-blur-xl border-t border-outline-variant/10 flex justify-around items-center h-14">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.key}
            onClick={() => handleNavClick(item.key)}
            className="flex-1 text-[10px] font-bold uppercase tracking-wider text-on-surface/60 hover:text-primary transition-colors py-2"
          >
            {item.label}
          </button>
        ))}
      </nav>

      {/* Main content */}
      <main className="md:ml-60 pt-20 pb-20 md:pb-12 px-6 md:px-8 min-h-screen bg-surface">

        {/* Page header */}
        <div className="flex justify-between items-end mb-8 mt-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-on-surface mb-1">
              Visão Geral
            </h1>
            <p className="text-on-surface/60 font-medium text-sm">Seu desempenho em SST</p>
          </div>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
          <div className="bg-surface-container-lowest p-5 md:p-6 rounded-xl shadow-sm col-span-1">
            <p className="text-[10px] font-black uppercase tracking-[0.1em] text-on-surface/50 mb-1">Pontuação Total</p>
            <p data-testid="dashboard-score" className="text-3xl md:text-4xl font-black text-primary">
              {totalScore}
            </p>
          </div>

          <div className="bg-surface-container-lowest p-5 md:p-6 rounded-xl shadow-sm col-span-1">
            <p className="text-[10px] font-black uppercase tracking-[0.1em] text-on-surface/50 mb-1">Partidas</p>
            <p data-testid="dashboard-game-count" className="text-3xl md:text-4xl font-black text-on-surface">
              {gameCount}
            </p>
          </div>
        </div>

        {/* PIN entry */}
        <div className="bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden">
          <div className="p-5 md:p-6 border-b border-surface-container">
            <h3 className="text-base font-bold tracking-tight text-on-surface">Entrar em Partida</h3>
            <p className="text-xs text-on-surface/50 mt-1">Insira o PIN fornecido pelo facilitador</p>
          </div>
          <div className="p-5 md:p-6">
            <form onSubmit={handlePinSubmit} className="flex gap-3 max-w-sm">
              <input
                data-testid="dashboard-pin-input"
                type="text"
                inputMode="numeric"
                value={pin}
                onChange={handlePinChange}
                maxLength={6}
                placeholder="000000"
                className="flex-1 border-0 border-b-2 border-outline-variant bg-surface-container-high px-4 py-3 text-center text-xl font-bold tracking-[0.5em] text-primary focus:border-primary focus:outline-none transition-colors rounded-t-md"
              />
              <button
                data-testid="dashboard-pin-submit"
                type="submit"
                disabled={pin.length < 6}
                className="px-5 py-3 rounded-lg bg-primary text-white font-black text-xs uppercase tracking-widest disabled:opacity-40 disabled:cursor-not-allowed transition-all hover:scale-[1.02] active:scale-95"
              >
                Entrar
              </button>
            </form>
          </div>
        </div>

      </main>
    </div>
  );
}
