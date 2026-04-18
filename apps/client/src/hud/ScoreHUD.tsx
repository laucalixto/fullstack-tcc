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
      className="absolute top-4 left-1/2 -translate-x-1/2 flex gap-3 z-10"
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
              'flex flex-col items-center px-4 py-2 rounded-xl text-white text-xs font-black uppercase tracking-widest shadow-lg',
              isActive
                ? 'bg-primary/90 ring-2 ring-white scale-105'
                : 'bg-black/60',
              isMe ? 'ring-2 ring-yellow-400' : '',
              !player.isConnected ? 'opacity-40' : '',
            ].join(' ')}
          >
            <span className="text-[10px] opacity-70 mb-0.5">{isMe ? 'VOCÊ' : ' '}</span>
            <span className="truncate max-w-[80px]">{player.name}</span>
            <span className="text-primary-container font-bold mt-0.5">{player.score} pts</span>
            <span className="text-[9px] opacity-60">casa {player.position}</span>
          </div>
        );
      })}
    </div>
  );
}
