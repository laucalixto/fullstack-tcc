import type { TileEffectType } from '@safety-board/shared';

export type CardCategory = 'accident' | 'prevention' | 'special';

export function cardAudioCategory(type: TileEffectType): CardCategory {
  if (type === 'accident')   return 'accident';
  if (type === 'prevention') return 'prevention';
  return 'special';
}
