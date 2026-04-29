import { describe, it, expect } from 'vitest';
import type { GameResultPayload } from '@safety-board/shared';
import { pickMyScore } from '../../results/sessionScore';

function makeResult(players: Array<{ playerId: string; score: number; rank: 1 | 2 | 3 | 4 }>): GameResultPayload {
  return {
    sessionId: 'session-1',
    durationSeconds: 600,
    players: players.map((p) => ({
      playerId: p.playerId,
      name: `Player ${p.playerId}`,
      score: p.score,
      rank: p.rank,
      finalPosition: 39,
      correctAnswers: 5,
      totalAnswers: 6,
    })),
  };
}

describe('pickMyScore — registro pós-partida usa o score do jogador certo', () => {
  it('retorna o score do jogador identificado por playerId', () => {
    const result = makeResult([
      { playerId: 'p1', score: 207, rank: 1 },
      { playerId: 'p2', score: 65,  rank: 2 },
      { playerId: 'p3', score: -15, rank: 3 },
    ]);
    expect(pickMyScore(result, 'p1')).toBe(207);
    expect(pickMyScore(result, 'p2')).toBe(65);
    expect(pickMyScore(result, 'p3')).toBe(-15);
  });

  it('retorna undefined quando myPlayerId não está no resultado', () => {
    const result = makeResult([
      { playerId: 'p1', score: 207, rank: 1 },
    ]);
    expect(pickMyScore(result, 'ghost')).toBeUndefined();
  });

  it('retorna undefined quando gameResult é null/undefined', () => {
    expect(pickMyScore(null, 'p1')).toBeUndefined();
    expect(pickMyScore(undefined, 'p1')).toBeUndefined();
  });

  it('retorna undefined quando myPlayerId é null/undefined', () => {
    const result = makeResult([{ playerId: 'p1', score: 100, rank: 1 }]);
    expect(pickMyScore(result, null)).toBeUndefined();
    expect(pickMyScore(result, undefined)).toBeUndefined();
  });

  it('NÃO retorna o score do 1º colocado quando myPlayerId é outro (regressão do bug do find)', () => {
    const result = makeResult([
      { playerId: 'winner', score: 207, rank: 1 },
      { playerId: 'me',     score: -15, rank: 3 },
    ]);
    // Bug original: find((p) => p.playerId) sempre retornava o 1º (207).
    expect(pickMyScore(result, 'me')).toBe(-15);
    expect(pickMyScore(result, 'me')).not.toBe(207);
  });
});
