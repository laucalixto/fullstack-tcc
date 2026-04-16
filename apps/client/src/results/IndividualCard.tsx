import type { GameResultPlayer } from '@safety-board/shared';

interface IndividualCardProps {
  player: GameResultPlayer;
}

function calcAccuracy(correct: number, total: number): string {
  if (total === 0) return '0%';
  return `${Math.round((correct / total) * 100)}%`;
}

export function IndividualCard({ player }: IndividualCardProps) {
  const isWinner = player.rank === 1;

  return (
    <div
      data-testid="individual-card"
      data-winner={isWinner ? 'true' : 'false'}
    >
      <span data-testid="individual-card-name">{player.name}</span>
      <span data-testid="individual-card-score">{player.score}</span>
      <span data-testid="individual-card-rank">{player.rank}</span>
      <span data-testid="individual-card-answers">
        {player.correctAnswers}/{player.totalAnswers}
      </span>
      <span data-testid="individual-card-accuracy">
        {calcAccuracy(player.correctAnswers, player.totalAnswers)}
      </span>
      <span data-testid="individual-card-position">{player.finalPosition}</span>
    </div>
  );
}
