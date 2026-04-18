import { describe, it, expect } from 'vitest';
import { DiceService } from '../../engine/DiceService.js';

// ─── RED: falha até DiceService.ts ser implementado ──────────────────────────

describe('DiceService', () => {
  it('retorna sempre um inteiro entre 1 e 6', () => {
    for (let i = 0; i < 200; i++) {
      const result = DiceService.roll();
      expect(result).toBeGreaterThanOrEqual(1);
      expect(result).toBeLessThanOrEqual(6);
      expect(Number.isInteger(result)).toBe(true);
    }
  });

  it('nunca retorna 0 nem 7', () => {
    const results = new Set(Array.from({ length: 600 }, () => DiceService.roll()));
    expect(results.has(0)).toBe(false);
    expect(results.has(7)).toBe(false);
  });

  it('produz todos os 6 faces em 600 lançamentos', () => {
    const results = new Set(Array.from({ length: 600 }, () => DiceService.roll()));
    for (let face = 1; face <= 6; face++) {
      expect(results.has(face)).toBe(true);
    }
  });
});
