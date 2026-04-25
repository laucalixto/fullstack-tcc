import { describe, it, expect } from 'vitest';
import { tileCategory, BOARD_PATH, QUIZ_TILE_INDICES, TILE_EFFECTS } from '../board';

// ─── RED: classificação de tiles por responsabilidade ────────────────────────
//
// `tileCategory(index)` retorna a categoria do tile para fins de UI:
//   - 'start'         (índice 0)
//   - 'finish'        (último índice)
//   - 'quiz'          (QUIZ_TILE_INDICES)
//   - 'accident'      (TILE_EFFECTS[i].type === 'accident')
//   - 'prevention'    (TILE_EFFECTS[i].type === 'prevention')
//   - 'special-back'  (TILE_EFFECTS[i].type === 'back-to-start')
//   - 'special-skip'  (TILE_EFFECTS[i].type === 'skip-turn')
//   - 'neutral'       (sem quiz, sem effect, e não é start/finish)

describe('tileCategory', () => {
  it('índice 0 é start', () => {
    expect(tileCategory(0)).toBe('start');
  });

  it('último índice é finish', () => {
    expect(tileCategory(BOARD_PATH.length - 1)).toBe('finish');
  });

  it('todos os índices em QUIZ_TILE_INDICES retornam quiz', () => {
    for (const i of QUIZ_TILE_INDICES) {
      expect(tileCategory(i)).toBe('quiz');
    }
  });

  it('TILE_EFFECTS do tipo accident retornam accident', () => {
    for (const [idx, def] of Object.entries(TILE_EFFECTS)) {
      if (def.type === 'accident') {
        expect(tileCategory(Number(idx))).toBe('accident');
      }
    }
  });

  it('TILE_EFFECTS do tipo prevention retornam prevention', () => {
    for (const [idx, def] of Object.entries(TILE_EFFECTS)) {
      if (def.type === 'prevention') {
        expect(tileCategory(Number(idx))).toBe('prevention');
      }
    }
  });

  it('TILE_EFFECTS do tipo back-to-start retornam special-back', () => {
    for (const [idx, def] of Object.entries(TILE_EFFECTS)) {
      if (def.type === 'back-to-start') {
        expect(tileCategory(Number(idx))).toBe('special-back');
      }
    }
  });

  it('TILE_EFFECTS do tipo skip-turn retornam special-skip', () => {
    for (const [idx, def] of Object.entries(TILE_EFFECTS)) {
      if (def.type === 'skip-turn') {
        expect(tileCategory(Number(idx))).toBe('special-skip');
      }
    }
  });

  it('tiles sem quiz, sem effect e não start/finish são neutral', () => {
    const expectedNeutrals: number[] = [];
    for (let i = 0; i < BOARD_PATH.length; i++) {
      if (i === 0 || i === BOARD_PATH.length - 1) continue;
      if (QUIZ_TILE_INDICES.has(i)) continue;
      if (i in TILE_EFFECTS) continue;
      expectedNeutrals.push(i);
    }
    for (const i of expectedNeutrals) {
      expect(tileCategory(i)).toBe('neutral');
    }
    // sanity: existem alguns neutros nesta config
    expect(expectedNeutrals.length).toBeGreaterThan(0);
  });

  it('cobertura: cada um dos 40 índices retorna alguma categoria não-undefined', () => {
    for (let i = 0; i < BOARD_PATH.length; i++) {
      expect(tileCategory(i)).toMatch(/^(start|finish|quiz|accident|prevention|special-back|special-skip|neutral)$/);
    }
  });
});
