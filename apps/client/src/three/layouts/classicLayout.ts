import type { TilePosition } from '@safety-board/shared';
import { BOARD_PATH } from '@safety-board/shared';

/**
 * Layout clássico — alias para o BOARD_PATH default (diorama isométrico em 4
 * grupos de 10 com altura crescente). Útil para retomar o visual original
 * quando trocar para outro layout via tema e quiser voltar.
 */
export const classicLayout: TilePosition[] = BOARD_PATH.map((t) => ({ ...t }));
