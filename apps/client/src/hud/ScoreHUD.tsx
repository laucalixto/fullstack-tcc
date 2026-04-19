import type { Player } from '@safety-board/shared';

interface ScoreHUDProps {
  players: Player[];
  currentPlayerIndex: number;
  myPlayerId?: string;
}

export function ScoreHUD({ players, currentPlayerIndex, myPlayerId }: ScoreHUDProps) {
  return (
    <div
      data-testid="score-hud"
      className="absolute top-4 left-1/2 -translate-x-1/2 flex gap-3 z-30"
      style={{ pointerEvents: 'none' }}
    >
      {players.map((player, i) => {
        const isActive = i === currentPlayerIndex;
        const isMe     = player.id === myPlayerId;
        return (
          <div
            key={player.id}
            data-testid={`score-player-${player.id}`}
            aria-current={isActive ? 'true' : 'false'}
            data-me={isMe ? 'true' : 'false'}
            data-disconnected={player.isConnected ? 'false' : 'true'}
            className={[
              'flex items-center gap-2 px-4 py-2 rounded-xl shadow-lg border transition-all backdrop-blur-xl',
              isActive
                ? 'bg-primary/90 border-primary/40 text-white scale-105 shadow-primary/20'
                : 'bg-white/80 border-white/50 text-stone-800',
              !player.isConnected ? 'opacity-40' : '',
            ].join(' ')}
            style={{ backdropFilter: 'blur(12px)' }}
          >
            {/* Avatar inicial */}
            <div className={[
              'w-7 h-7 rounded-full flex items-center justify-center font-black text-xs shrink-0',
              isActive ? 'bg-white/20 text-white' : 'bg-primary/10 text-primary',
            ].join(' ')}>
              {player.name.charAt(0).toUpperCase()}
            </div>

            {/* Info */}
            <div className="flex flex-col leading-tight">
              <span className={[
                'text-[10px] font-bold uppercase tracking-widest',
                isActive ? 'text-white/70' : 'text-stone-500',
              ].join(' ')}>
                {isMe ? 'Você' : player.name}
              </span>
              <span className="text-sm font-black tabular-nums">
                {player.score} pts
              </span>
            </div>

            {/* Casa atual — mantém o texto para os testes */}
            <span className={[
              'text-[10px] font-bold pl-1 border-l',
              isActive ? 'border-white/30 text-white/70' : 'border-stone-200 text-stone-400',
            ].join(' ')}>
              casa {player.position}
            </span>
          </div>
        );
      })}
    </div>
  );
}
