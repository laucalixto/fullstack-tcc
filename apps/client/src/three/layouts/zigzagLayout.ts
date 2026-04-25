import type { TilePosition } from '@safety-board/shared';

/**
 * Layout zigzag — 40 tiles num caminho serpentino plano (sem variação de Y).
 * Demonstra como o sistema permite caminhos visuais arbitrários enquanto a
 * lógica do jogo (índices, quizzes, effects) permanece inalterada.
 *
 * Linhas alternadas: par avança +X, ímpar retorna -X. Conexão por +Z entre linhas.
 */
function buildZigzag(): TilePosition[] {
  const tilesPerRow = 8;
  const rows = 5; // 8 × 5 = 40 tiles
  const tiles: TilePosition[] = [];
  for (let r = 0; r < rows; r++) {
    const evenRow = r % 2 === 0;
    for (let c = 0; c < tilesPerRow; c++) {
      const index = r * tilesPerRow + c;
      const x = evenRow ? c : tilesPerRow - 1 - c;
      const z = r;
      tiles.push({ index, x, y: 0, z });
    }
  }
  return tiles;
}

export const zigzagLayout: TilePosition[] = buildZigzag();
