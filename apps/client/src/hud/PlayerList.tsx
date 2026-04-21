import type { Player } from '@safety-board/shared';

interface PlayerListProps {
  players: Player[];
  currentPlayerIndex: number;
  myPlayerId?: string;
}

export function PlayerList({ players, currentPlayerIndex, myPlayerId }: PlayerListProps) {
  return (
    <ul
      data-testid="player-list"
      className="space-y-3"
      style={{ pointerEvents: 'none' }}
    >
      {players.map((player, i) => {
        const isActive = i === currentPlayerIndex;
        const isMe     = player.id === myPlayerId;
        return (
          <li
            key={player.id}
            data-testid={`player-list-item-${player.id}`}
            aria-current={isActive ? 'true' : 'false'}
            data-me={isMe ? 'true' : 'false'}
            className={[
              'flex items-center justify-between rounded-xl px-3 py-2.5 transition-all',
              isActive
                ? 'bg-primary/20 border border-primary/40'
                : 'opacity-60',
            ].join(' ')}
          >
            {/* Avatar + info */}
            <div className="flex items-center gap-3 min-w-0">
              <div className="relative shrink-0">
                <div className={[
                  'w-9 h-9 rounded-full flex items-center justify-center text-sm font-black',
                  isActive
                    ? 'bg-primary text-white shadow-md shadow-primary/40'
                    : 'bg-white/15 text-white/80',
                ].join(' ')}>
                  {player.name.charAt(0).toUpperCase()}
                </div>
                <span className={[
                  'absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-stone-900',
                  player.isConnected ? 'bg-emerald-400' : 'bg-red-400',
                ].join(' ')} />
              </div>

              <div className="min-w-0">
                <p className={[
                  'text-xs font-bold leading-tight truncate',
                  isActive ? 'text-white' : 'text-white/80',
                ].join(' ')}>
                  {isMe ? `${player.name} (Você)` : player.name}
                </p>

                {/* Score e posição — maior e visível */}
                <div className="flex items-baseline gap-1.5 mt-0.5">
                  <span className={[
                    'text-sm font-black tabular-nums leading-tight',
                    isActive ? 'text-primary-fixed' : 'text-white/90',
                  ].join(' ')}>
                    {player.score}
                    <span className="text-[10px] font-bold ml-0.5 opacity-70">pts</span>
                  </span>
                  <span className="text-[10px] text-white/40 font-medium">·</span>
                  <span className="text-[10px] text-white/60 font-medium">
                    casa {player.position}
                  </span>
                </div>
              </div>
            </div>

            {/* Status direito */}
            <div className="shrink-0 ml-2">
              {isActive && (
                <span className="text-[9px] font-black text-primary uppercase tracking-wider px-1.5 py-0.5 bg-primary/20 rounded-full">
                  Vez
                </span>
              )}
              {!player.isConnected && (
                <span
                  data-testid={`player-disconnected-${player.id}`}
                  className="text-[9px] font-bold text-red-400"
                >
                  offline
                </span>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
