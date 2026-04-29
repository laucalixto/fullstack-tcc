import { describe, it, expect } from 'vitest';
import { AVATARS, type Player } from '@safety-board/shared';
import { hexToHsl, hslToHex, resolvePawnColor } from '../../three/pawnColors';

function makePlayer(id: string, avatarId: string): Player {
  return { id, name: id, position: 0, score: 0, isConnected: true, avatarId };
}

describe('hexToHsl / hslToHex — round-trip', () => {
  it('converte hex → HSL → hex de volta sem perder a cor (round-trip estável)', () => {
    const samples = [0xe63946, 0x457b9d, 0x2a9d8f, 0xf4a261, 0xffffff, 0x000000];
    for (const hex of samples) {
      const hsl = hexToHsl(hex);
      const back = hslToHex(hsl.h, hsl.s, hsl.l);
      expect(back).toBe(hex);
    }
  });
});

describe('resolvePawnColor — base color from avatar', () => {
  it('jogador único com avatar "operator" recebe a cor base do operator', () => {
    const players = [makePlayer('p1', 'operator')];
    const expected = parseInt(AVATARS.find((a) => a.id === 'operator')!.color.slice(1), 16);
    expect(resolvePawnColor(players, 'p1')).toBe(expected);
  });

  it('cada avatar diferente devolve sua cor base', () => {
    const players = [
      makePlayer('p1', 'operator'),
      makePlayer('p2', 'tech'),
      makePlayer('p3', 'admin'),
      makePlayer('p4', 'visitor'),
    ];
    for (const p of players) {
      const expected = parseInt(AVATARS.find((a) => a.id === p.avatarId!)!.color.slice(1), 16);
      expect(resolvePawnColor(players, p.id)).toBe(expected);
    }
  });

  it('avatarId ausente cai no avatar default (AVATARS[0])', () => {
    const players = [makePlayer('p1', '')];
    const expected = parseInt(AVATARS[0].color.slice(1), 16);
    expect(resolvePawnColor(players, 'p1')).toBe(expected);
  });

  it('avatarId desconhecido cai no avatar default (AVATARS[0])', () => {
    const players = [makePlayer('p1', 'inexistente')];
    const expected = parseInt(AVATARS[0].color.slice(1), 16);
    expect(resolvePawnColor(players, 'p1')).toBe(expected);
  });

  it('playerId desconhecido devolve fallback determinístico (cor do primeiro avatar)', () => {
    const players = [makePlayer('p1', 'operator')];
    const fallback = parseInt(AVATARS[0].color.slice(1), 16);
    expect(resolvePawnColor(players, 'ghost')).toBe(fallback);
  });
});

describe('resolvePawnColor — variação quando avatares duplicados', () => {
  it('2 jogadores com mesmo avatar recebem cores diferentes', () => {
    const players = [makePlayer('p1', 'operator'), makePlayer('p2', 'operator')];
    const c1 = resolvePawnColor(players, 'p1');
    const c2 = resolvePawnColor(players, 'p2');
    expect(c1).not.toBe(c2);
  });

  it('1ª aparição (ordem por id) recebe a cor base', () => {
    const players = [makePlayer('p1', 'operator'), makePlayer('p2', 'operator')];
    const base = parseInt(AVATARS.find((a) => a.id === 'operator')!.color.slice(1), 16);
    expect(resolvePawnColor(players, 'p1')).toBe(base);
  });

  it('2ª aparição é mais clara (lightness maior) que a 1ª', () => {
    const players = [makePlayer('p1', 'operator'), makePlayer('p2', 'operator')];
    const c1 = resolvePawnColor(players, 'p1');
    const c2 = resolvePawnColor(players, 'p2');
    const l1 = hexToHsl(c1).l;
    const l2 = hexToHsl(c2).l;
    expect(l2).toBeGreaterThan(l1);
  });

  it('3ª aparição é mais escura (lightness menor) que a 1ª', () => {
    const players = [
      makePlayer('p1', 'operator'),
      makePlayer('p2', 'operator'),
      makePlayer('p3', 'operator'),
    ];
    const c1 = resolvePawnColor(players, 'p1');
    const c3 = resolvePawnColor(players, 'p3');
    const l1 = hexToHsl(c1).l;
    const l3 = hexToHsl(c3).l;
    expect(l3).toBeLessThan(l1);
  });

  it('4ª aparição usa hue shift — todas as 4 cores são distintas', () => {
    const players = [
      makePlayer('p1', 'operator'),
      makePlayer('p2', 'operator'),
      makePlayer('p3', 'operator'),
      makePlayer('p4', 'operator'),
    ];
    const cores = players.map((p) => resolvePawnColor(players, p.id));
    expect(new Set(cores).size).toBe(4);
  });

  it('determinístico: ordem da array de players não altera a cor', () => {
    const a = [makePlayer('p1', 'operator'), makePlayer('p2', 'operator')];
    const b = [makePlayer('p2', 'operator'), makePlayer('p1', 'operator')];
    expect(resolvePawnColor(a, 'p1')).toBe(resolvePawnColor(b, 'p1'));
    expect(resolvePawnColor(a, 'p2')).toBe(resolvePawnColor(b, 'p2'));
  });

  it('avatares diferentes não compartilham contagem de variação', () => {
    const players = [
      makePlayer('p1', 'operator'),
      makePlayer('p2', 'tech'),
    ];
    const opBase = parseInt(AVATARS.find((a) => a.id === 'operator')!.color.slice(1), 16);
    const techBase = parseInt(AVATARS.find((a) => a.id === 'tech')!.color.slice(1), 16);
    // p1 é o único operator → cor base do operator
    expect(resolvePawnColor(players, 'p1')).toBe(opBase);
    // p2 é o único tech → cor base do tech
    expect(resolvePawnColor(players, 'p2')).toBe(techBase);
  });
});
