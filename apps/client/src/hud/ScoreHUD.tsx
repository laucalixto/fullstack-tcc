import type { Player } from '@safety-board/shared';

interface ScoreHUDProps {
  players: Player[];
  currentPlayerIndex: number;
  myPlayerId?: string;
}

export function ScoreHUD({ players, currentPlayerIndex, myPlayerId }: ScoreHUDProps) {
  return (
    <div data-testid="score-hud">
      {players.map((player, i) => (
        <div
          key={player.id}
          data-testid={`score-player-${player.id}`}
          aria-current={i === currentPlayerIndex ? 'true' : 'false'}
          data-me={player.id === myPlayerId ? 'true' : 'false'}
          data-disconnected={player.isConnected ? 'false' : 'true'}
        >
          <span>{player.name}</span>
          {' '}
          <span>{player.score} pts</span>
          {' '}
          <span>casa {player.position}</span>
        </div>
      ))}
    </div>
  );
}
