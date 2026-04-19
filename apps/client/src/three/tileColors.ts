// Matiz e saturação base por grupo de tiles (grupos de 10 casas)
// Lightness varia deterministicamente por tile — mesma seed = mesmo visual
const BASE_HSL: Record<number, [h: number, s: number, l: number]> = {
  0: [0.333, 0.56, 0.47], // verde  — NR-06 (casas 0–9)
  1: [0.583, 0.85, 0.47], // azul   — NR-35 (casas 10–19)
  2: [0.008, 0.78, 0.53], // vermelho — NR-33 (casas 20–29)
  3: [0.083, 1.00, 0.50], // laranja — subida final (casas 30–39)
};

const VARIATION_AMPLITUDE = 0.06; // ±6% lightness

/**
 * Retorna [h, s, l] determinístico para um tile.
 * Hue e saturação são fixos por grupo; lightness varia suavemente por tileIndex.
 */
export function computeTileHSL(
  tileIndex: number,
  groupIndex: number,
): [h: number, s: number, l: number] {
  const [h, s, lBase] = BASE_HSL[groupIndex] ?? BASE_HSL[0];
  const variation = Math.sin(tileIndex * 3.7) * VARIATION_AMPLITUDE;
  const l = Math.min(0.85, Math.max(0.10, lBase + variation));
  return [h, s, l];
}
