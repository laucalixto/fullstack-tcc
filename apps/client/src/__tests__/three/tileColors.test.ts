import { describe, it, expect } from 'vitest';
import { computeTileHSL } from '../../three/tileColors';

// ─── RED: variação determinística de cor por tile ────────────────────────────
// Cada tile deve ter lightness ligeiramente diferente dos vizinhos do mesmo grupo,
// mas dentro do matiz e saturação do grupo, e nunca extrapolar os limites válidos.

describe('computeTileHSL', () => {
  it('retorna valores HSL dentro do range válido [0,1] para todos os tiles', () => {
    for (let i = 0; i < 40; i++) {
      const group = Math.min(3, Math.floor(i / 10));
      const [h, s, l] = computeTileHSL(i, group);
      expect(h).toBeGreaterThanOrEqual(0);
      expect(h).toBeLessThanOrEqual(1);
      expect(s).toBeGreaterThanOrEqual(0);
      expect(s).toBeLessThanOrEqual(1);
      expect(l).toBeGreaterThanOrEqual(0);
      expect(l).toBeLessThanOrEqual(1);
    }
  });

  it('tiles do mesmo grupo têm lightness diferente entre si', () => {
    const l0 = computeTileHSL(0, 0)[2];
    const l5 = computeTileHSL(5, 0)[2];
    expect(l0).not.toBeCloseTo(l5, 5);
  });

  it('variação de lightness não excede 0.08 em relação ao base do grupo', () => {
    const BASE_L: Record<number, number> = { 0: 0.47, 1: 0.47, 2: 0.53, 3: 0.50 };
    for (let group = 0; group < 4; group++) {
      for (let tile = group * 10; tile < group * 10 + 10; tile++) {
        const [, , l] = computeTileHSL(tile, group);
        expect(Math.abs(l - BASE_L[group])).toBeLessThanOrEqual(0.08);
      }
    }
  });

  it('é determinístico — mesmo índice sempre retorna o mesmo resultado', () => {
    expect(computeTileHSL(7, 1)).toEqual(computeTileHSL(7, 1));
    expect(computeTileHSL(23, 2)).toEqual(computeTileHSL(23, 2));
  });

  it('hue e saturation são constantes dentro do grupo', () => {
    const [h0, s0] = computeTileHSL(0, 0);
    const [h9, s9] = computeTileHSL(9, 0);
    expect(h0).toBeCloseTo(h9, 5);
    expect(s0).toBeCloseTo(s9, 5);
  });
});
