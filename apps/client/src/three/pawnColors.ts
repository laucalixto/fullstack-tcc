// Resolve a cor do peão 3D a partir do avatar escolhido pelo jogador, com
// variações HSL quando dois ou mais jogadores compartilham o mesmo avatar.
// Módulo puro — sem THREE, sem React — para ser 100% testável em jsdom.
//
// Estratégia de variação (ordem por Player.id, estável):
// - 1ª aparição: cor base do avatar.
// - 2ª: lightness +18% (mais claro).
// - 3ª: lightness −18% (mais escuro).
// - 4ª: hue shift de +30° + lightness +9% (último recurso).
//
// Justificativa: lightness preserva a "essência" da cor (vermelho continua
// vermelho, só mais claro/escuro), o que ajuda o jogador a se reconhecer
// visualmente. Hue shift só na 4ª porque é a primeira variação que muda
// drasticamente a percepção de cor.

import { AVATARS, type Player } from '@safety-board/shared';

export interface HSL {
  h: number; // 0–360
  s: number; // 0–1
  l: number; // 0–1
}

export function hexToHsl(hex: number): HSL {
  const r = ((hex >> 16) & 0xff) / 255;
  const g = ((hex >> 8) & 0xff) / 255;
  const b = (hex & 0xff) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)); break;
      case g: h = ((b - r) / d + 2); break;
      case b: h = ((r - g) / d + 4); break;
    }
    h *= 60;
  }
  return { h, s, l };
}

export function hslToHex(h: number, s: number, l: number): number {
  const hh = ((h % 360) + 360) % 360 / 360;
  const ss = Math.min(1, Math.max(0, s));
  const ll = Math.min(1, Math.max(0, l));

  function hue2rgb(p: number, q: number, t: number): number {
    let tt = t;
    if (tt < 0) tt += 1;
    if (tt > 1) tt -= 1;
    if (tt < 1 / 6) return p + (q - p) * 6 * tt;
    if (tt < 1 / 2) return q;
    if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
    return p;
  }

  let r: number;
  let g: number;
  let b: number;
  if (ss === 0) {
    r = g = b = ll;
  } else {
    const q = ll < 0.5 ? ll * (1 + ss) : ll + ss - ll * ss;
    const p = 2 * ll - q;
    r = hue2rgb(p, q, hh + 1 / 3);
    g = hue2rgb(p, q, hh);
    b = hue2rgb(p, q, hh - 1 / 3);
  }
  const ri = Math.round(r * 255);
  const gi = Math.round(g * 255);
  const bi = Math.round(b * 255);
  return (ri << 16) | (gi << 8) | bi;
}

function avatarBaseHex(avatarId: string | undefined): number {
  const fallback = AVATARS[0];
  const found = avatarId ? AVATARS.find((a) => a.id === avatarId) : null;
  const hexStr = (found ?? fallback).color.replace('#', '');
  return parseInt(hexStr, 16);
}

/**
 * Aplica a variação i-ésima (0-indexed) sobre a cor base.
 * - 0: base
 * - 1: lightness +18%
 * - 2: lightness −18%
 * - 3+: hue shift +30° + lightness +9% (raro com 4 jogadores)
 */
export function applyVariation(baseHex: number, variantIndex: number): number {
  if (variantIndex <= 0) return baseHex;
  const { h, s, l } = hexToHsl(baseHex);
  if (variantIndex === 1) return hslToHex(h, s, Math.min(0.95, l + 0.18));
  if (variantIndex === 2) return hslToHex(h, s, Math.max(0.05, l - 0.18));
  return hslToHex(h + 30, s, Math.min(0.95, l + 0.09));
}

/**
 * Resolve a cor final do peão de `playerId` levando em conta variações
 * quando outros jogadores compartilham o mesmo `avatarId`. Determinístico:
 * a ordem de "primeira aparição" segue `Player.id` em ordem alfabética.
 */
export function resolvePawnColor(players: Player[], playerId: string): number {
  const target = players.find((p) => p.id === playerId);
  if (!target) {
    // playerId desconhecido — fallback determinístico para a cor do primeiro avatar.
    return avatarBaseHex(undefined);
  }
  const sameAvatar = players
    .filter((p) => (p.avatarId ?? '') === (target.avatarId ?? ''))
    .sort((a, b) => a.id.localeCompare(b.id));
  const variantIndex = sameAvatar.findIndex((p) => p.id === playerId);
  const base = avatarBaseHex(target.avatarId);
  return applyVariation(base, variantIndex);
}
