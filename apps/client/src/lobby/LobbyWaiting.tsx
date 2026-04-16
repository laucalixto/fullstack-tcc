import type { Player } from '@safety-board/shared';

interface LobbyWaitingProps {
  pin: string;
  players: Player[];
  onStart: () => void;
  isFacilitator: boolean;
}

export function LobbyWaiting({ pin, players, onStart, isFacilitator }: LobbyWaitingProps) {
  const canStart = players.length >= 2;

  return (
    <div>
      <p data-testid="lobby-pin">{pin}</p>
      <p data-testid="player-count">{players.length}</p>

      <ul>
        {players.map((player) => (
          <li key={player.id} data-testid={`lobby-player-${player.id}`}>
            {player.name}
          </li>
        ))}
      </ul>

      {isFacilitator && (
        <button
          data-testid="start-button"
          onClick={onStart}
          disabled={!canStart}
        >
          Iniciar Jogo
        </button>
      )}
    </div>
  );
}
