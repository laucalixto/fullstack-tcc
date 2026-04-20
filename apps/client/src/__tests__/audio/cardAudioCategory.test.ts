import { describe, it, expect } from 'vitest';
import { cardAudioCategory } from '../../audio/cardAudioCategory';

describe('cardAudioCategory', () => {
  it('mapeia "accident" para "accident"', () => {
    expect(cardAudioCategory('accident')).toBe('accident');
  });

  it('mapeia "prevention" para "prevention"', () => {
    expect(cardAudioCategory('prevention')).toBe('prevention');
  });

  it('mapeia "back-to-start" para "special"', () => {
    expect(cardAudioCategory('back-to-start')).toBe('special');
  });

  it('mapeia "skip-turn" para "special"', () => {
    expect(cardAudioCategory('skip-turn')).toBe('special');
  });

  it('retorna um dos três valores válidos para qualquer tipo', () => {
    const tipos = ['accident', 'prevention', 'back-to-start', 'skip-turn'] as const;
    for (const t of tipos) {
      expect(['accident', 'prevention', 'special']).toContain(cardAudioCategory(t));
    }
  });
});
