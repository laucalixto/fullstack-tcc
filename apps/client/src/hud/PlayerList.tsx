import type { Player } from '@safety-board/shared';

interface PlayerListProps {
  players: Player[];
  currentPlayerIndex: number;
  myPlayerId?: string;
}

export function PlayerList({ players, currentPlayerIndex, myPlayerId }: PlayerListProps) {
  return (
    <ul data-testid="player-list">
      {players.map((player, i) => (
        <li
          key={player.id}
          data-testid={`player-list-item-${player.id}`}
          aria-current={i === currentPlayerIndex ? 'true' : 'false'}
          data-me={player.id === myPlayerId ? 'true' : 'false'}
        >
          <span>{player.name}</span>
          {' '}
          <span>casa {player.position}</span>
          {' '}
          <span>{player.score} pts</span>
          {!player.isConnected && (
            <span data-testid={`player-disconnected-${player.id}`}>desconectado</span>
          )}
        </li>
      ))}
    </ul>
  );
}
