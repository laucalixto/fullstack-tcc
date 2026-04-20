import { useState, useEffect } from 'react';
import type { Player } from '@safety-board/shared';

const DEFAULT_MAX_PLAYERS = 4;

interface LobbyWaitingProps {
  pin: string;
  players: Player[];
  onStart: () => void;
  isFacilitator: boolean;
  sessionName?: string;
  maxPlayers?: number;
  autoStartAt?: number; // timestamp do servidor: Date.now() + delayMs
}

export function LobbyWaiting({
  pin,
  players,
  onStart,
  isFacilitator,
  sessionName,
  maxPlayers = DEFAULT_MAX_PLAYERS,
  autoStartAt,
}: LobbyWaitingProps) {
  const canStart   = players.length >= 2;
  const emptySlots = maxPlayers - players.length;

  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (!autoStartAt) { setCountdown(0); return; }
    const update = () => setCountdown(Math.max(Math.round((autoStartAt - Date.now()) / 1000), 0));
    update();
    const id = setInterval(update, 500);
    return () => clearInterval(id);
  }, [autoStartAt]);

  return (
    <div className="bg-surface text-on-surface min-h-screen flex flex-col font-body">
      {/* TopNav */}
      <header className="fixed top-0 w-full z-50 bg-surface/80 backdrop-blur-xl border-b border-outline-variant/20 shadow-sm flex justify-between items-center px-6 h-16">
        <div className="flex items-center gap-4">
          <span className="text-xl font-black text-on-surface tracking-tighter uppercase">Safety Board</span>
        </div>
      </header>

      <main className="flex-1 mt-16 flex flex-col items-center justify-center relative p-8">
        <div className="max-w-4xl w-full space-y-12">
          {/* Hero status */}
          <div className="text-center space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full text-primary font-bold tracking-widest text-xs uppercase mb-4">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              {sessionName ? (
                <span data-testid="lobby-session-name">{sessionName}</span>
              ) : (
                <span>Sessão Ativa</span>
              )}
            </div>
            <h1 className="text-5xl md:text-6xl font-black tracking-tighter text-on-surface">
              {autoStartAt ? 'Todos prontos!' : 'Aguardando jogadores...'}
            </h1>
            {autoStartAt ? (
              <p
                data-testid="autostart-countdown"
                className="text-primary text-xl font-black max-w-2xl mx-auto"
              >
                Partida iniciando em {countdown}s...
              </p>
            ) : (
              <p className="text-secondary text-lg max-w-2xl mx-auto">
                A partida começará assim que todos acessarem o início da sessão.
              </p>
            )}
          </div>

          {/* Players card */}
          <div className="bg-surface-container-low border border-outline-variant/30 rounded-2xl p-8 shadow-sm">
            <div className="flex justify-between items-center mb-8 pb-4 border-b border-outline-variant/20">
              <h2 className="text-sm font-black tracking-widest uppercase text-on-surface">
                Jogadores Conectados
              </h2>
              <span
                data-testid="player-count"
                className="text-sm font-bold text-primary bg-primary/10 px-3 py-1 rounded-full"
              >
                {players.length} / {maxPlayers}
              </span>
            </div>

            {/* PIN */}
            <div className="flex items-center gap-3 bg-surface-container-lowest/70 rounded-xl px-4 py-3 border border-outline-variant/10 mb-8 self-start">
              <span className="text-[10px] font-black uppercase tracking-widest text-outline">PIN</span>
              <span
                data-testid="lobby-pin"
                className="text-xl font-black tracking-[0.3em] text-primary"
              >
                {pin}
              </span>
            </div>

            {/* Players grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {players.map((player) => (
                <div
                  key={player.id}
                  data-testid={`lobby-player-${player.id}`}
                  className="flex items-center gap-4 p-3 bg-surface-container-lowest/50 rounded-xl border border-outline-variant/10"
                >
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-black text-sm">
                    {player.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-bold uppercase tracking-tight text-on-surface">
                      {player.name}
                    </p>
                    <span className="text-[10px] font-medium text-primary uppercase flex items-center gap-1">
                      <span className="w-1 h-1 rounded-full bg-primary" />
                      Pronto
                    </span>
                  </div>
                </div>
              ))}

              {/* Empty slots */}
              {Array.from({ length: Math.max(emptySlots, 0) }).map((_, i) => (
                <div
                  key={`empty-${i}`}
                  className="flex items-center gap-4 p-3 border-2 border-dashed border-outline-variant/20 rounded-xl opacity-40"
                >
                  <div className="w-10 h-10 rounded-full border-2 border-dashed border-outline-variant flex items-center justify-center text-outline text-lg">
                    +
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-outline">
                    Aguardando...
                  </span>
                </div>
              ))}
            </div>

            {/* Start button (facilitator only) */}
            {isFacilitator && (
              <div className="mt-10 flex justify-center">
                <button
                  data-testid="start-button"
                  onClick={onStart}
                  disabled={!canStart}
                  className="group relative inline-flex items-center justify-center px-12 py-4 font-black uppercase tracking-[0.2em] text-white bg-primary-container rounded-xl overflow-hidden transition-all hover:scale-105 active:scale-95 shadow-lg shadow-primary/20 disabled:opacity-40 disabled:cursor-not-allowed disabled:scale-100"
                >
                  Iniciar Partida
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Background decoration */}
        <div className="fixed bottom-0 left-0 w-full h-1/3 bg-gradient-to-t from-primary/5 to-transparent -z-10 pointer-events-none" />
      </main>
    </div>
  );
}
