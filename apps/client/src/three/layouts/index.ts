// Catálogo de layouts disponíveis. Exporte novos layouts daqui para que
// fiquem visíveis ao /preview e a quem importar o módulo programaticamente.

import type { TilePosition } from '@safety-board/shared';
import { classicLayout } from './classicLayout';
import { zigzagLayout } from './zigzagLayout';

export { classicLayout, zigzagLayout };

export const LAYOUTS: Record<string, TilePosition[]> = {
  classic: classicLayout,
  zigzag:  zigzagLayout,
};
