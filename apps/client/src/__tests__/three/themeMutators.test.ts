import { describe, it, expect } from 'vitest';
import { DEFAULT_THEME, type BoardTheme } from '../../three/theme/boardTheme';
import {
  setBackgroundColor,
  setFogColor,
  setFogNear,
  setFogFar,
  setAmbientIntensity,
  setSunIntensity,
  setSunPosition,
  setGroundColor,
  setTileScale,
  setPawnScale,
  setToneMapping,
  setToneMappingExposure,
  setTilePosition,
} from '../../three/theme/themeMutators';

function freshTheme(): BoardTheme {
  return JSON.parse(JSON.stringify(DEFAULT_THEME)) as BoardTheme;
}

describe('themeMutators', () => {
  it('setBackgroundColor escreve em theme.background.color', () => {
    const t = freshTheme();
    setBackgroundColor(t, 0xff0000);
    expect(t.background.color).toBe(0xff0000);
  });

  it('setFogColor escreve em theme.background.fog.color', () => {
    const t = freshTheme();
    setFogColor(t, 0x00ff00);
    expect(t.background.fog.color).toBe(0x00ff00);
  });

  it('setFogNear / setFogFar escrevem em theme.background.fog', () => {
    const t = freshTheme();
    setFogNear(t, 12);
    setFogFar(t, 80);
    expect(t.background.fog.near).toBe(12);
    expect(t.background.fog.far).toBe(80);
  });

  it('setAmbientIntensity / setSunIntensity escrevem em theme.lighting', () => {
    const t = freshTheme();
    setAmbientIntensity(t, 0.75);
    setSunIntensity(t, 1.8);
    expect(t.lighting.ambientIntensity).toBe(0.75);
    expect(t.lighting.sunIntensity).toBe(1.8);
  });

  it('setSunPosition substitui o array de posição em theme.lighting', () => {
    const t = freshTheme();
    setSunPosition(t, 5, 30, -10);
    expect(t.lighting.sunPosition).toEqual([5, 30, -10]);
  });

  it('setGroundColor escreve em theme.ground.color', () => {
    const t = freshTheme();
    setGroundColor(t, 0x123456);
    expect(t.ground.color).toBe(0x123456);
  });

  it('setTileScale / setPawnScale ajustam scale dos respectivos blocos', () => {
    const t = freshTheme();
    setTileScale(t, 1.5);
    setPawnScale(t, 0.8);
    expect(t.tile.scale).toBe(1.5);
    expect(t.pawn.scale).toBe(0.8);
  });

  it('setToneMapping / setToneMappingExposure escrevem em theme.lighting', () => {
    const t = freshTheme();
    setToneMapping(t, 'reinhard');
    setToneMappingExposure(t, 1.6);
    expect(t.lighting.toneMapping).toBe('reinhard');
    expect(t.lighting.toneMappingExposure).toBe(1.6);
  });

  it('setTilePosition cria boardLayout se ausente, com 40 itens preservando índice', () => {
    const t = freshTheme();
    expect(t.boardLayout).toBeUndefined();
    setTilePosition(t, 7, 1, 2, 3);
    expect(t.boardLayout).toBeDefined();
    expect(t.boardLayout).toHaveLength(40);
    expect(t.boardLayout![7]).toEqual({ index: 7, x: 1, y: 2, z: 3 });
    // os outros tiles preservam suas coordenadas originais (do BOARD_PATH)
    expect(t.boardLayout![0].index).toBe(0);
  });

  it('setTilePosition mutando duas vezes preserva ambas as alterações', () => {
    const t = freshTheme();
    setTilePosition(t, 0, 10, 0.5, -2);
    setTilePosition(t, 39, -5, 1, 8);
    expect(t.boardLayout![0]).toMatchObject({ x: 10, y: 0.5, z: -2 });
    expect(t.boardLayout![39]).toMatchObject({ x: -5, y: 1, z: 8 });
  });

  it('setTilePosition ignora índice fora de [0,39]', () => {
    const t = freshTheme();
    setTilePosition(t, -1, 1, 1, 1);
    setTilePosition(t, 40, 1, 1, 1);
    // não cria boardLayout porque o índice é inválido
    expect(t.boardLayout).toBeUndefined();
  });

  it('setTilePosition reusa boardLayout existente sem clonar (mutação in-place)', () => {
    const t = freshTheme();
    setTilePosition(t, 0, 1, 2, 3);
    const ref = t.boardLayout;
    setTilePosition(t, 1, 4, 5, 6);
    expect(t.boardLayout).toBe(ref);
  });

  it('mutators retornam o próprio theme para encadeamento opcional', () => {
    const t = freshTheme();
    const r = setTileScale(t, 2);
    expect(r).toBe(t);
  });
});
