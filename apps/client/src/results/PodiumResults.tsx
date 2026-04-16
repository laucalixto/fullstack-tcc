import type { GameResultPlayer } from '@safety-board/shared';

interface PodiumResultsProps {
  players: GameResultPlayer[]; // ordenados por rank (1º primeiro)
  durationSeconds: number;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function PodiumResults({ players, durationSeconds }: PodiumResultsProps) {
  return (
    <div data-testid="podium-results">
      <span data-testid="podium-duration">{formatDuration(durationSeconds)}</span>
      {players.map((player) => (
        <div
          key={player.playerId}
          data-testid={`podium-player-${player.rank}`}
          data-rank={String(player.rank)}
        >
          <span>{player.name}</span>
          <span>{player.score}</span>
        </div>
      ))}
    </div>
  );
}
