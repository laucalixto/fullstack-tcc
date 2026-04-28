// Mutadores puros do BoardTheme. Cada função recebe o tema por referência,
// altera o campo correspondente e retorna o próprio tema para encadeamento.
//
// Motivação: o `/preview` (BoardPreview.tsx) tunava propriedades direto nos
// objetos THREE (luzes, fog, materiais), mas nunca atualizava o `theme`
// exposto em `__previewTheme__`. Resultado: "Exportar tema (JSON)" gerava
// sempre o DEFAULT_THEME, ignorando os ajustes do usuário. Agora cada handle
// chama o mutator correspondente além do efeito THREE.

import { BOARD_PATH } from '@safety-board/shared';
import type { BoardTheme, ToneMapping } from './boardTheme';

export function setBackgroundColor(theme: BoardTheme, hex: number): BoardTheme {
  theme.background.color = hex;
  return theme;
}

export function setFogColor(theme: BoardTheme, hex: number): BoardTheme {
  theme.background.fog.color = hex;
  return theme;
}

export function setFogNear(theme: BoardTheme, value: number): BoardTheme {
  theme.background.fog.near = value;
  return theme;
}

export function setFogFar(theme: BoardTheme, value: number): BoardTheme {
  theme.background.fog.far = value;
  return theme;
}

export function setAmbientIntensity(theme: BoardTheme, value: number): BoardTheme {
  theme.lighting.ambientIntensity = value;
  return theme;
}

export function setSunIntensity(theme: BoardTheme, value: number): BoardTheme {
  theme.lighting.sunIntensity = value;
  return theme;
}

export function setSunPosition(theme: BoardTheme, x: number, y: number, z: number): BoardTheme {
  theme.lighting.sunPosition = [x, y, z];
  return theme;
}

export function setGroundColor(theme: BoardTheme, hex: number): BoardTheme {
  theme.ground.color = hex;
  return theme;
}

export function setTileScale(theme: BoardTheme, scale: number): BoardTheme {
  theme.tile.scale = scale;
  return theme;
}

export function setPawnScale(theme: BoardTheme, scale: number): BoardTheme {
  theme.pawn.scale = scale;
  return theme;
}

export function setToneMapping(theme: BoardTheme, mode: ToneMapping): BoardTheme {
  theme.lighting.toneMapping = mode;
  return theme;
}

export function setToneMappingExposure(theme: BoardTheme, value: number): BoardTheme {
  theme.lighting.toneMappingExposure = value;
  return theme;
}

export function setTilePosition(
  theme: BoardTheme,
  index: number,
  x: number,
  y: number,
  z: number,
): BoardTheme {
  if (index < 0 || index >= BOARD_PATH.length) return theme;
  if (!theme.boardLayout) {
    theme.boardLayout = BOARD_PATH.map((t) => ({ ...t }));
  }
  theme.boardLayout[index] = { index, x, y, z };
  return theme;
}
