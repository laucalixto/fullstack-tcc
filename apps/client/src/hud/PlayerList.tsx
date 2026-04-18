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
      className="absolute bottom-24 right-4 flex flex-col gap-2 z-10"
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
              'flex items-center gap-2 px-3 py-1.5 rounded-lg text-white text-xs font-bold shadow-md',
              isActive ? 'bg-primary/80' : 'bg-black/50',
            ].join(' ')}
          >
            {isActive && (
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse shrink-0" />
            )}
            <span className={isMe ? 'text-yellow-300' : ''}>{player.name}</span>
            <span className="opacity-60 text-[10px]">casa {player.position}</span>
            <span className="opacity-60 text-[10px]">{player.score} pts</span>
            {!player.isConnected && (
              <span
                data-testid={`player-disconnected-${player.id}`}
                className="text-red-400 text-[9px]"
              >
                desconectado
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
