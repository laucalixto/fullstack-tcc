import { describe, it, expect } from 'vitest';
import { DEFAULT_THEME, getAllAssetUrls, type BoardTheme } from '../../three/theme/boardTheme';

describe('boardTheme', () => {
  it('DEFAULT_THEME não tem URLs de modelos glTF (procedural puro)', () => {
    expect(DEFAULT_THEME.tile.url).toBeUndefined();
    expect(DEFAULT_THEME.pawn.url).toBeUndefined();
    expect(DEFAULT_THEME.ground.url).toBeUndefined();
    expect(DEFAULT_THEME.dice.url).toBeUndefined();
    expect(DEFAULT_THEME.decorations).toEqual([]);
  });

  it('DEFAULT_THEME tem atlas de tile e dado configurados (placeholders SVG)', () => {
    expect(DEFAULT_THEME.tile.atlas).toEqual({ url: '/textures/tile-atlas.svg', columns: 8, rows: 5 });
    expect(DEFAULT_THEME.dice.atlas).toEqual({ url: '/textures/dice-atlas.svg', columns: 6, rows: 1 });
  });

  it('DEFAULT_THEME usa scale 1.0 (convenção 1 unit = 1 metro)', () => {
    expect(DEFAULT_THEME.tile.scale).toBe(1.0);
    expect(DEFAULT_THEME.pawn.scale).toBe(1.0);
  });

  it('DEFAULT_THEME mantém cores dos peões alinhadas à implementação atual', () => {
    // Cores originais em PawnManager.PAWN_COLORS
    expect(DEFAULT_THEME.pawn.colorsByIndex).toEqual([0xe63946, 0x457b9d, 0x2a9d8f, 0xf4a261]);
  });

  it('getAllAssetUrls do default retorna apenas as URLs dos atlases placeholder', () => {
    expect(getAllAssetUrls(DEFAULT_THEME).sort()).toEqual([
      '/textures/dice-atlas.svg',
      '/textures/tile-atlas.svg',
    ]);
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
    // 5 declarados + 2 atlases (tile e dice) do DEFAULT_THEME herdado
    expect(urls).toHaveLength(7);
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
      tile: { ...DEFAULT_THEME.tile, url: '/models/shared.glb', atlas: undefined },
      pawn: { ...DEFAULT_THEME.pawn, url: '/models/shared.glb' },
      dice: { ...DEFAULT_THEME.dice, atlas: undefined },
    };
    expect(getAllAssetUrls(theme)).toEqual(['/models/shared.glb']);
  });

  // ─── Atlas de tiles (opção A: 40 ícones únicos) ───────────────────────────

  it('getAllAssetUrls inclui o atlas quando configurado', () => {
    const theme: BoardTheme = {
      ...DEFAULT_THEME,
      tile: { ...DEFAULT_THEME.tile, atlas: { url: '/textures/tile-atlas.png', columns: 8, rows: 5 } },
    };
    expect(getAllAssetUrls(theme)).toContain('/textures/tile-atlas.png');
  });

  it('DEFAULT_THEME.tile.atlas aponta para placeholder SVG', () => {
    expect(DEFAULT_THEME.tile.atlas).toBeDefined();
    expect(DEFAULT_THEME.tile.atlas?.url).toMatch(/\.svg$/);
  });

  // ─── Cascata urlByIndex / urlByCategory / url ─────────────────────────────

  it('getAllAssetUrls inclui URLs de urlByCategory', () => {
    const theme: BoardTheme = {
      ...DEFAULT_THEME,
      tile: {
        ...DEFAULT_THEME.tile,
        urlByCategory: {
          start: '/models/start.glb',
          finish: '/models/finish.glb',
          quiz: '/models/quiz.glb',
        },
      },
    };
    const urls = getAllAssetUrls(theme);
    expect(urls).toContain('/models/start.glb');
    expect(urls).toContain('/models/finish.glb');
    expect(urls).toContain('/models/quiz.glb');
  });

  it('getAllAssetUrls inclui URLs de urlByIndex', () => {
    const theme: BoardTheme = {
      ...DEFAULT_THEME,
      tile: {
        ...DEFAULT_THEME.tile,
        urlByIndex: {
          0: '/models/tile-start.glb',
          39: '/models/tile-finish.glb',
        },
      },
    };
    const urls = getAllAssetUrls(theme);
    expect(urls).toContain('/models/tile-start.glb');
    expect(urls).toContain('/models/tile-finish.glb');
  });

  // ─── Dado (theme.dice) ────────────────────────────────────────────────────

  it('DEFAULT_THEME.dice tem scale 1.0, atlas placeholder e nenhum modelo glTF', () => {
    expect(DEFAULT_THEME.dice.scale).toBe(1.0);
    expect(DEFAULT_THEME.dice.url).toBeUndefined();
    expect(DEFAULT_THEME.dice.atlas?.url).toMatch(/\.svg$/);
    expect(DEFAULT_THEME.dice.texture).toBeUndefined();
  });

  it('getAllAssetUrls inclui URL e atlas do dado quando configurados', () => {
    const theme: BoardTheme = {
      ...DEFAULT_THEME,
      dice: {
        ...DEFAULT_THEME.dice,
        url: '/models/dice.glb',
        atlas: { url: '/textures/dice-atlas.png', columns: 6, rows: 1 },
        texture: '/textures/dice-base.png',
      },
    };
    const urls = getAllAssetUrls(theme);
    expect(urls).toContain('/models/dice.glb');
    expect(urls).toContain('/textures/dice-atlas.png');
    expect(urls).toContain('/textures/dice-base.png');
  });
});

// ─── boardLayout (Opção B) ────────────────────────────────────────────────────

describe('boardTheme — resolveLayout', () => {
  it('sem boardLayout no tema, resolveLayout retorna BOARD_PATH', async () => {
    const { resolveLayout } = await import('../../three/theme/boardTheme');
    const { BOARD_PATH } = await import('@safety-board/shared');
    expect(resolveLayout(DEFAULT_THEME)).toEqual(BOARD_PATH);
  });

  it('com boardLayout no tema, resolveLayout retorna esse layout', async () => {
    const { resolveLayout } = await import('../../three/theme/boardTheme');
    const { BOARD_PATH } = await import('@safety-board/shared');
    const customLayout = BOARD_PATH.map((t) => ({ ...t, x: t.x + 10 })); // shift X
    const theme: BoardTheme = { ...DEFAULT_THEME, boardLayout: customLayout };
    expect(resolveLayout(theme)).toBe(customLayout);
  });

  it('layout com tamanho diferente de BOARD_PATH lança erro', async () => {
    const { resolveLayout } = await import('../../three/theme/boardTheme');
    const shortLayout = [{ index: 0, x: 0, y: 0, z: 0 }];
    const theme: BoardTheme = { ...DEFAULT_THEME, boardLayout: shortLayout };
    expect(() => resolveLayout(theme)).toThrow(/40 tiles|tamanho/i);
  });
});
