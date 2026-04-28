// Manifesto declarativo do tema visual do tabuleiro.
// Default = procedural (sem URLs), reproduz visual atual para garantir
// zero regressão após a refatoração. Trocar URLs para ativar glTF.
//
// Convenção: 1 unit Three.js = 1 metro. scale=1.0 = modelo exportado em
// metros do Blender. Veja _docs_refs/MODELING.md.

import { BOARD_PATH, type TileCategory, type TilePosition } from '@safety-board/shared';

/**
 * Atlas de ícones aplicado no topo de cada tile (opção A: 40 ícones únicos).
 * Layout linha-major: tile índice `i` mapeia para a célula `(i % columns, floor(i / columns))`.
 * Exemplo: 8 colunas × 5 linhas = 40 células, uma por tile.
 */
export interface TileAtlasConfig {
  url: string;
  columns: number;
  rows: number;
}

export interface TileThemeConfig {
  /** URL do modelo glTF base — fallback final na cascata. */
  url?: string;
  /** Override por categoria de tile (start/quiz/accident/...). Tem precedência sobre `url`. */
  urlByCategory?: Partial<Record<TileCategory, string>>;
  /** Override por índice exato (0–39). Tem precedência sobre `urlByCategory`. */
  urlByIndex?: Record<number, string>;
  /** Atlas de ícones — aplicado no modo procedural como plane "topper" sobre cada tile. */
  atlas?: TileAtlasConfig;
  /** URL de textura opcional do material procedural (aplicada na lateral, não confunde com atlas). */
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

export interface DiceThemeConfig {
  /** URL do modelo glTF do dado. Se indefinido, usa BoxGeometry procedural. */
  url?: string;
  /** Atlas de 6 faces — geralmente 6 colunas × 1 linha. Mapeamento de células
   *  para faces da BoxGeometry está documentado em DICE_FACE_TO_VALUE
   *  (apps/client/src/three/dice/DicePhysics.ts). */
  atlas?: TileAtlasConfig;
  /** Textura única aplicada uniformemente (alternativa simples ao atlas, útil
   *  para modelos glTF com material PBR). */
  texture?: string;
  /** Multiplicador de escala. 1.0 = sem ajuste. */
  scale: number;
}

export interface DecorationConfig {
  url: string;
  position: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
}

export type ToneMapping = 'none' | 'linear' | 'aces' | 'reinhard' | 'cineon';

/**
 * Environment map para iluminação PBR realista.
 * - 'none' (default): só luzes diretas (look antigo).
 * - 'room': RoomEnvironment built-in do Three.js — leve, sem arquivo externo,
 *   melhora reflexões de PBR substancialmente.
 * - 'hdr': carrega arquivo .hdr (RGBELoader). Forneça `url` apontando para um
 *   .hdr em apps/client/public/env/.
 */
export interface EnvironmentConfig {
  type: 'none' | 'room' | 'hdr';
  url?: string;
  intensity?: number;
}

export interface LightingConfig {
  ambientIntensity: number;
  sunIntensity: number;
  sunPosition: [number, number, number];
  /** Tone mapping aplicado pelo renderer. Default 'aces' = visual cinematográfico. */
  toneMapping?: ToneMapping;
  /** Multiplicador de exposição do tone mapping. Default 1.0. */
  toneMappingExposure?: number;
  /** Environment map para reflexões PBR. Default { type: 'none' }. */
  environment?: EnvironmentConfig;
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
  dice: DiceThemeConfig;
  decorations: DecorationConfig[];
  /**
   * Layout opcional com 40 posições XYZ. Se omitido, usa BOARD_PATH do shared.
   * Cliente-only: server nunca lê coords, só índices. Permite criar layouts
   * alternativos (formatos de caminho diferentes) sem afetar a lógica do jogo.
   */
  boardLayout?: TilePosition[];
}

export const DEFAULT_THEME: BoardTheme = {
  background: {
    color: 0x1a1a2e,
    fog: { color: 0x1a1a2e, near: 30, far: 60 },
  },
  lighting: {
    ambientIntensity: 0.5,
    sunIntensity: 1.2,
    sunPosition: [10, 20, 10],
    toneMapping: 'aces',
    toneMappingExposure: 0.8,
    //environment: { type: 'room', intensity: 1.0 },
    environment: { type: 'hdr', url: '/env/boiler_room_1k.hdr', intensity: 1.0 }
  },
  tile: {
    scale: 1.0,
    useProceduralColors: true,
    atlas: {
      url: '/textures/tile-atlas.png',
      columns: 8,
      rows: 5,
    },
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
  dice: {
    scale: 1.0,
    atlas: { url: '/textures/dice-atlas.png', columns: 6, rows: 1 },
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
  if (theme.tile.url) urls.add(theme.tile.url);
  if (theme.tile.texture) urls.add(theme.tile.texture);
  if (theme.tile.atlas?.url) urls.add(theme.tile.atlas.url);
  if (theme.tile.urlByCategory) {
    for (const url of Object.values(theme.tile.urlByCategory)) {
      if (url) urls.add(url);
    }
  }
  if (theme.tile.urlByIndex) {
    for (const url of Object.values(theme.tile.urlByIndex)) {
      if (url) urls.add(url);
    }
  }
  if (theme.pawn.url) urls.add(theme.pawn.url);
  if (theme.dice.url) urls.add(theme.dice.url);
  if (theme.dice.atlas?.url) urls.add(theme.dice.atlas.url);
  if (theme.dice.texture) urls.add(theme.dice.texture);
  if (theme.ground.url) urls.add(theme.ground.url);
  if (theme.ground.texture) urls.add(theme.ground.texture);
  for (const deco of theme.decorations) urls.add(deco.url);
  return [...urls];
}

/**
 * Resolve a URL do modelo glTF para um tile específico, seguindo a cascata:
 * urlByIndex → urlByCategory → url. Retorna `undefined` se nenhum nível matchar
 * (caso em que o builder cai no modo procedural).
 */
export function resolveTileUrl(theme: BoardTheme, index: number, category: TileCategory): string | undefined {
  return theme.tile.urlByIndex?.[index]
    ?? theme.tile.urlByCategory?.[category]
    ?? theme.tile.url;
}

/**
 * Resolve o layout efetivo: tema → BOARD_PATH default. Valida tamanho.
 * Lança erro se o boardLayout custom não tiver exatamente BOARD_PATH.length tiles
 * (lógica do servidor depende de 40 índices fixos com responsabilidades específicas).
 */
export function resolveLayout(theme: BoardTheme): TilePosition[] {
  const layout = theme.boardLayout ?? BOARD_PATH;
  if (layout.length !== BOARD_PATH.length) {
    throw new Error(
      `boardLayout deve ter exatamente ${BOARD_PATH.length} tiles (tamanho recebido: ${layout.length})`,
    );
  }
  return layout;
}
