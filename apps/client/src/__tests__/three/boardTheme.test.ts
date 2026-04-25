import { describe, it, expect } from 'vitest';
import { DEFAULT_THEME, getAllAssetUrls, type BoardTheme } from '../../three/theme/boardTheme';

describe('boardTheme', () => {
  it('DEFAULT_THEME não tem URLs (procedural puro)', () => {
    expect(DEFAULT_THEME.tile.url).toBeUndefined();
    expect(DEFAULT_THEME.pawn.url).toBeUndefined();
    expect(DEFAULT_THEME.ground.url).toBeUndefined();
    expect(DEFAULT_THEME.decorations).toEqual([]);
  });

  it('DEFAULT_THEME usa scale 1.0 (convenção 1 unit = 1 metro)', () => {
    expect(DEFAULT_THEME.tile.scale).toBe(1.0);
    expect(DEFAULT_THEME.pawn.scale).toBe(1.0);
  });

  it('DEFAULT_THEME mantém cores dos peões alinhadas à implementação atual', () => {
    // Cores originais em PawnManager.PAWN_COLORS
    expect(DEFAULT_THEME.pawn.colorsByIndex).toEqual([0xe63946, 0x457b9d, 0x2a9d8f, 0xf4a261]);
  });

  it('getAllAssetUrls do default retorna array vazio', () => {
    expect(getAllAssetUrls(DEFAULT_THEME)).toEqual([]);
  });

  it('getAllAssetUrls coleta URLs de tile, pawn, ground e decorações', () => {
    const theme: BoardTheme = {
      ...DEFAULT_THEME,
      tile:   { ...DEFAULT_THEME.tile, url: '/models/tile.glb' },
      pawn:   { ...DEFAULT_THEME.pawn, url: '/models/pawn.glb' },
      ground: { ...DEFAULT_THEME.ground, url: '/models/ground.glb' },
      decorations: [
        { url: '/models/tree.glb',  position: [0, 0, 0] },
        { url: '/models/sign.glb',  position: [1, 0, 1] },
      ],
    };
    const urls = getAllAssetUrls(theme);
    expect(urls).toContain('/models/tile.glb');
    expect(urls).toContain('/models/pawn.glb');
    expect(urls).toContain('/models/ground.glb');
    expect(urls).toContain('/models/tree.glb');
    expect(urls).toContain('/models/sign.glb');
    expect(urls).toHaveLength(5);
  });

  it('getAllAssetUrls inclui texturas quando definidas', () => {
    const theme: BoardTheme = {
      ...DEFAULT_THEME,
      tile:   { ...DEFAULT_THEME.tile, texture: '/textures/tile.png' },
      ground: { ...DEFAULT_THEME.ground, texture: '/textures/ground.png' },
    };
    const urls = getAllAssetUrls(theme);
    expect(urls).toContain('/textures/tile.png');
    expect(urls).toContain('/textures/ground.png');
  });

  it('getAllAssetUrls não duplica URLs repetidas', () => {
    const theme: BoardTheme = {
      ...DEFAULT_THEME,
      tile: { ...DEFAULT_THEME.tile, url: '/models/shared.glb' },
      pawn: { ...DEFAULT_THEME.pawn, url: '/models/shared.glb' },
    };
    expect(getAllAssetUrls(theme)).toEqual(['/models/shared.glb']);
  });
});
