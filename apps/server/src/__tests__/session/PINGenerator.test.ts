import { describe, it, expect, vi } from 'vitest';
import { PINGenerator } from '../../session/PINGenerator';

// ─── RED: falha até PINGenerator.ts ser implementado ─────────────────────────

describe('PINGenerator', () => {
  it('gera um PIN de exatamente 6 dígitos', () => {
    const pin = PINGenerator.generate();
    expect(pin).toMatch(/^\d{6}$/);
  });

  it('gera PINs no range 100000–999999', () => {
    for (let i = 0; i < 50; i++) {
      const num = parseInt(PINGenerator.generate(), 10);
      expect(num).toBeGreaterThanOrEqual(100_000);
      expect(num).toBeLessThanOrEqual(999_999);
    }
  });

  it('não repete PIN presente no conjunto de existentes', () => {
    const existing = new Set(['100000', '100001', '100002']);
    for (let i = 0; i < 20; i++) {
      const pin = PINGenerator.generate(existing);
      expect(existing.has(pin)).toBe(false);
    }
  });

  it('lança erro após 100 tentativas sem PIN único', () => {
    const alwaysSame = vi.fn().mockReturnValue(123456);
    const full = new Set(['123456']);
    expect(() => PINGenerator.generate(full, alwaysSame)).toThrow(/unique pin/i);
    expect(alwaysSame).toHaveBeenCalledTimes(100);
  });
});
