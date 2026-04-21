import { describe, it, expect } from 'vitest';
import { BOARD_PATH, getTileByIndex, isFinishTile, isStartTile, isQuizTile, getNormForTile, QUIZ_TILE_INDICES, isTileEffect } from '../board';

// ─── RED: falha até board.ts ser implementado ─────────────────────────────────

describe('BOARD_PATH', () => {
  it('contém exatamente 40 posições', () => {
    expect(BOARD_PATH.length).toBe(40);
  });

  it('primeiro tile (START, index 0) está em y=0', () => {
    expect(BOARD_PATH[0].y).toBe(0);
    expect(BOARD_PATH[0].index).toBe(0);
  });

  it('último tile (FINISH, index 39) tem o maior y do tabuleiro', () => {
    const maxY = Math.max(...BOARD_PATH.map((t) => t.y));
    expect(BOARD_PATH[39].y).toBe(maxY);
    expect(BOARD_PATH[39].index).toBe(39);
  });

  it('elevação (y) aumenta progressivamente entre os 4 grupos de 10', () => {
    const avg = (start: number, end: number) =>
      BOARD_PATH.slice(start, end).reduce((s, t) => s + t.y, 0) / 10;

    const g1 = avg(0, 10);
    const g2 = avg(10, 20);
    const g3 = avg(20, 30);
    const g4 = avg(30, 40);

    expect(g1).toBeLessThan(g2);
    expect(g2).toBeLessThan(g3);
    expect(g3).toBeLessThan(g4);
  });

  it('nenhum par (x, z) se repete — layout sem sobreposição', () => {
    const keys = BOARD_PATH.map((t) => `${t.x},${t.z}`);
    const unique = new Set(keys);
    expect(unique.size).toBe(BOARD_PATH.length);
  });

  it('todos os índices são sequenciais de 0 a 39', () => {
    BOARD_PATH.forEach((tile, i) => {
      expect(tile.index).toBe(i);
    });
  });

  it('nenhum valor de y é negativo', () => {
    BOARD_PATH.forEach((tile) => {
      expect(tile.y).toBeGreaterThanOrEqual(0);
    });
  });
});

describe('getTileByIndex', () => {
  it('retorna o tile correto para índice válido', () => {
    expect(getTileByIndex(0)).toEqual(BOARD_PATH[0]);
    expect(getTileByIndex(39)).toEqual(BOARD_PATH[39]);
    expect(getTileByIndex(15)).toEqual(BOARD_PATH[15]);
  });

  it('lança erro para índice fora do range', () => {
    expect(() => getTileByIndex(-1)).toThrow(/index/i);
    expect(() => getTileByIndex(40)).toThrow(/index/i);
  });
});

describe('isStartTile / isFinishTile', () => {
  it('isStartTile retorna true para índice 0', () => {
    expect(isStartTile(0)).toBe(true);
  });

  it('isStartTile retorna false para qualquer outro índice', () => {
    expect(isStartTile(1)).toBe(false);
    expect(isStartTile(39)).toBe(false);
  });

  it('isFinishTile retorna true para índice 39', () => {
    expect(isFinishTile(39)).toBe(true);
  });

  it('isFinishTile retorna false para qualquer outro índice', () => {
    expect(isFinishTile(0)).toBe(false);
    expect(isFinishTile(38)).toBe(false);
  });
});

describe('isQuizTile', () => {
  it('retorna true para todas as casas de quiz definidas', () => {
    for (const idx of QUIZ_TILE_INDICES) {
      expect(isQuizTile(idx)).toBe(true);
    }
  });

  it('retorna false para casas que não são de quiz', () => {
    expect(isQuizTile(0)).toBe(false);  // start
    expect(isQuizTile(3)).toBe(false);
    expect(isQuizTile(39)).toBe(false); // finish
  });

  it('QUIZ_TILE_INDICES tem exatamente 8 casas (2 por zona)', () => {
    expect(QUIZ_TILE_INDICES.size).toBe(8);
  });
});

describe('getNormForTile', () => {
  it('zona 1 (tiles 0–9) usa activeNormIds[0]', () => {
    const norms = ['NR-A', 'NR-B', 'NR-C', 'NR-D'];
    expect(getNormForTile(5, norms)).toBe('NR-A');
    expect(getNormForTile(0, norms)).toBe('NR-A');
    expect(getNormForTile(9, norms)).toBe('NR-A');
  });

  it('zona 2 (tiles 10–19) usa activeNormIds[1]', () => {
    const norms = ['NR-A', 'NR-B', 'NR-C', 'NR-D'];
    expect(getNormForTile(15, norms)).toBe('NR-B');
  });

  it('zona 3 (tiles 20–29) usa activeNormIds[2]', () => {
    const norms = ['NR-A', 'NR-B', 'NR-C', 'NR-D'];
    expect(getNormForTile(25, norms)).toBe('NR-C');
  });

  it('zona 4 (tiles 30–39) usa activeNormIds[3]', () => {
    const norms = ['NR-A', 'NR-B', 'NR-C', 'NR-D'];
    expect(getNormForTile(35, norms)).toBe('NR-D');
  });

  it('ordem das normas é configurável pelo facilitador', () => {
    const invertida = ['NR-D', 'NR-C', 'NR-B', 'NR-A'];
    expect(getNormForTile(5, invertida)).toBe('NR-D');
    expect(getNormForTile(35, invertida)).toBe('NR-A');
  });

  it('se activeNormIds tiver menos zonas que grupos, usa a última norma', () => {
    expect(getNormForTile(35, ['NR-A'])).toBe('NR-A');
  });
});

describe('isTileEffect', () => {
  it('retorna true para índice que possui efeito de tile', () => {
    expect(isTileEffect(2)).toBe(true);
  });

  it('retorna false para índice sem efeito de tile', () => {
    expect(isTileEffect(1)).toBe(false);
  });
});
