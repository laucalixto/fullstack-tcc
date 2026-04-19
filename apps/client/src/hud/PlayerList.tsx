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
      className="space-y-2"
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
              'flex items-center justify-between transition-opacity',
              !isActive ? 'opacity-60' : '',
            ].join(' ')}
          >
            {/* Avatar + info */}
            <div className="flex items-center gap-3 min-w-0">
              <div className="relative shrink-0">
                <div className={[
                  'w-9 h-9 rounded-full flex items-center justify-center text-sm font-black',
                  isActive
                    ? 'bg-primary/10 text-primary border-2 border-primary shadow-sm'
                    : 'bg-stone-100 text-stone-500 border border-stone-200',
                ].join(' ')}>
                  {player.name.charAt(0).toUpperCase()}
                </div>
                <span className={[
                  'absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white',
                  player.isConnected ? 'bg-green-500' : 'bg-red-400',
                ].join(' ')} />
              </div>

              <div className="min-w-0">
                <p className="text-xs font-bold text-stone-900 leading-tight truncate">
                  {isMe ? `${player.name} (Você)` : player.name}
                </p>
                <p className="text-[10px] text-stone-400 font-medium leading-tight">
                  Casa {player.position}
                  <span className="mx-1 opacity-50">·</span>
                  {player.score} pts
                </p>
              </div>
            </div>

            {/* Status direito */}
            <div className="shrink-0 ml-2">
              {isActive && (
                <span className="text-[10px] font-bold text-primary uppercase tracking-wide">
                  Sua vez
                </span>
              )}
              {!player.isConnected && (
                <span
                  data-testid={`player-disconnected-${player.id}`}
                  className="text-[10px] font-bold text-red-400"
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
