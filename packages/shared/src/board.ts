export interface TilePosition {
  index: number;
  x: number;
  z: number;
  y: number;
}

/**
 * Layout canônico do tabuleiro — 40 casas, diorama isométrico.
 * y cresce progressivamente em 4 grupos de 10 (0.0 → 0.5 → 1.0 → ~2.0).
 *
 * ⚠️ Ponto de partida: posições devem ser ajustadas para organicidade visual
 *    antes da Fase 3 ser considerada concluída visualmente.
 */
export const BOARD_PATH: TilePosition[] = [
  // ─── Grupo 1: y=0.0 — NR-06 (EPI / verde) ───────────────────────────────
  { index: 0,  x: 0, z: 0, y: 0.0 }, // START
  { index: 1,  x: 1, z: 0, y: 0.0 },
  { index: 2,  x: 2, z: 0, y: 0.0 },
  { index: 3,  x: 2, z: 1, y: 0.0 },
  { index: 4,  x: 2, z: 2, y: 0.0 },
  { index: 5,  x: 1, z: 2, y: 0.0 },
  { index: 6,  x: 0, z: 2, y: 0.0 },
  { index: 7,  x: 0, z: 3, y: 0.0 },
  { index: 8,  x: 1, z: 3, y: 0.0 },
  { index: 9,  x: 2, z: 3, y: 0.0 },

  // ─── Grupo 2: y=0.5 — NR-35 (trabalho em altura / azul) ─────────────────
  { index: 10, x: 3, z: 3, y: 0.5 },
  { index: 11, x: 4, z: 3, y: 0.5 },
  { index: 12, x: 4, z: 2, y: 0.5 },
  { index: 13, x: 4, z: 1, y: 0.5 },
  { index: 14, x: 5, z: 1, y: 0.5 },
  { index: 15, x: 5, z: 2, y: 0.5 },
  { index: 16, x: 5, z: 3, y: 0.5 },
  { index: 17, x: 5, z: 4, y: 0.5 },
  { index: 18, x: 4, z: 4, y: 0.5 },
  { index: 19, x: 3, z: 4, y: 0.5 },

  // ─── Grupo 3: y=1.0 — NR-33 (espaço confinado / vermelho) ───────────────
  { index: 20, x: 3, z: 5, y: 1.0 },
  { index: 21, x: 4, z: 5, y: 1.0 },
  { index: 22, x: 5, z: 5, y: 1.0 },
  { index: 23, x: 6, z: 5, y: 1.0 },
  { index: 24, x: 6, z: 4, y: 1.0 },
  { index: 25, x: 6, z: 3, y: 1.0 },
  { index: 26, x: 7, z: 3, y: 1.0 },
  { index: 27, x: 7, z: 4, y: 1.0 },
  { index: 28, x: 7, z: 5, y: 1.0 },
  { index: 29, x: 7, z: 6, y: 1.0 },

  // ─── Grupo 4: y=1.5–2.5 — subida final ───────────────────────────────────
  { index: 30, x: 6, z: 6, y: 1.50 },
  { index: 31, x: 5, z: 6, y: 1.50 },
  { index: 32, x: 5, z: 7, y: 1.50 },
  { index: 33, x: 6, z: 7, y: 1.75 },
  { index: 34, x: 7, z: 7, y: 1.75 },
  { index: 35, x: 8, z: 7, y: 2.00 },
  { index: 36, x: 8, z: 6, y: 2.00 },
  { index: 37, x: 8, z: 5, y: 2.00 },
  { index: 38, x: 9, z: 5, y: 2.25 },
  { index: 39, x: 9, z: 4, y: 2.50 }, // FINISH
];

export function getTileByIndex(index: number): TilePosition {
  if (index < 0 || index >= BOARD_PATH.length) {
    throw new RangeError(`Tile index ${index} out of range (0–${BOARD_PATH.length - 1})`);
  }
  return BOARD_PATH[index];
}

export function isStartTile(index: number): boolean {
  return index === 0;
}

export function isFinishTile(index: number): boolean {
  return index === BOARD_PATH.length - 1;
}
