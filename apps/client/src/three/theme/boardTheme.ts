// Manifesto declarativo do tema visual do tabuleiro.
// Default = procedural (sem URLs), reproduz visual atual para garantir
// zero regressão após a refatoração. Trocar URLs para ativar glTF.
//
// Convenção: 1 unit Three.js = 1 metro. scale=1.0 = modelo exportado em
// metros do Blender. Veja apps/client/src/three/MODELING.md.

export interface TileThemeConfig {
  /** URL do modelo glTF. Se indefinido, usa BoxGeometry procedural com tileColors. */
  url?: string;
  /** URL de textura opcional (aplicada ao material procedural quando não há url). */
  texture?: string;
  /** Multiplicador de escala a partir do natural. 1.0 = sem ajuste. */
  scale: number;
  /** No modo procedural, usa cores por grupo (tileColors.ts). */
  useProceduralColors: boolean;
}

export interface GroundThemeConfig {
  url?: string;
  texture?: string;
  /** Dimensões [largura, profundidade] em metros — usado só no modo procedural. */
  size: [number, number];
  /** Cor de fallback no modo procedural. */
  color: number;
}

export interface PawnThemeConfig {
  url?: string;
  scale: number;
  /** Nome da mesh dentro do glTF cujo material recebe a cor do jogador. */
  bodyMaterialName: string;
  /** Cores por índice de entrada no jogo (até 4 jogadores). */
  colorsByIndex: number[];
}

export interface DecorationConfig {
  url: string;
  position: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
}

export interface LightingConfig {
  ambientIntensity: number;
  sunIntensity: number;
  sunPosition: [number, number, number];
}

export interface BackgroundConfig {
  color: number;
  fog: { color: number; near: number; far: number };
}

export interface BoardTheme {
  background: BackgroundConfig;
  lighting:   LightingConfig;
  tile:       TileThemeConfig;
  ground:     GroundThemeConfig;
  pawn:       PawnThemeConfig;
  decorations: DecorationConfig[];
}

export const DEFAULT_THEME: BoardTheme = {
  background: {
    color: 0x1a1a2e,
    fog:   { color: 0x1a1a2e, near: 30, far: 60 },
  },
  lighting: {
    ambientIntensity: 0.5,
    sunIntensity:     1.2,
    sunPosition:      [10, 20, 10],
  },
  tile: {
    scale: 1.0,
    useProceduralColors: true,
  },
  ground: {
    size: [12, 10],
    color: 0x3d2b1f,
  },
  pawn: {
    scale: 1.0,
    bodyMaterialName: 'pawn-body',
    colorsByIndex: [0xe63946, 0x457b9d, 0x2a9d8f, 0xf4a261],
  },
  decorations: [],
};

/**
 * Retorna lista única de URLs de assets usados pelo tema — tile, pawn, ground,
 * texturas e decorações. Consumida pelo `AssetManager.preloadAll` na entrada
 * do jogo para evitar pop-in durante a partida.
 */
export function getAllAssetUrls(theme: BoardTheme): string[] {
  const urls = new Set<string>();
  if (theme.tile.url)      urls.add(theme.tile.url);
  if (theme.tile.texture)  urls.add(theme.tile.texture);
  if (theme.pawn.url)      urls.add(theme.pawn.url);
  if (theme.ground.url)    urls.add(theme.ground.url);
  if (theme.ground.texture) urls.add(theme.ground.texture);
  for (const deco of theme.decorations) urls.add(deco.url);
  return [...urls];
}
