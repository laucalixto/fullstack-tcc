import type { GameResultPayload } from '@safety-board/shared';

/**
 * Retorna o score do jogador identificado em `myPlayerId` dentro do resultado
 * da partida. Substitui o `find((p) => p.playerId)` ingênuo, que sempre retornava
 * o **primeiro** elemento com `playerId` definido (= 1º colocado), fazendo com
 * que todos os jogadores se registrassem com a pontuação do campeão.
 */
export function pickMyScore(
  result: GameResultPayload | null | undefined,
  myPlayerId: string | null | undefined,
): number | undefined {
  if (!result || !myPlayerId) return undefined;
  return result.players.find((p) => p.playerId === myPlayerId)?.score;
}
