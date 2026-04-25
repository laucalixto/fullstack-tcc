export interface TilePosition {
  index: number;
  x: number;
  z: number;
  y: number;
}

/**
 * Layout canônico do tabuleiro — 40 casas, diorama isométrico.
 * y cresce progressivamente em 4 grupos de 10 (0.0 → 0.5 → 1.0 → ~2.0).
 *
 * ⚠️ Ponto de partida: posições devem ser ajustadas para organicidade visual
 *    antes da Fase 3 ser considerada concluída visualmente.
 */
export const BOARD_PATH: TilePosition[] = [
  // ─── Grupo 1: y=0.0 — NR-06 (EPI / verde) ───────────────────────────────
  { index: 0,  x: 0, z: 0, y: 0.0 }, // START
  { index: 1,  x: 1, z: 0, y: 0.0 },
  { index: 2,  x: 2, z: 0, y: 0.0 },
  { index: 3,  x: 2, z: 1, y: 0.0 },
  { index: 4,  x: 2, z: 2, y: 0.0 },
  { index: 5,  x: 1, z: 2, y: 0.0 },
  { index: 6,  x: 0, z: 2, y: 0.0 },
  { index: 7,  x: 0, z: 3, y: 0.0 },
  { index: 8,  x: 1, z: 3, y: 0.0 },
  { index: 9,  x: 2, z: 3, y: 0.0 },

  // ─── Grupo 2: y=0.5 — NR-35 (trabalho em altura / azul) ─────────────────
  { index: 10, x: 3, z: 3, y: 0.5 },
  { index: 11, x: 4, z: 3, y: 0.5 },
  { index: 12, x: 4, z: 2, y: 0.5 },
  { index: 13, x: 4, z: 1, y: 0.5 },
  { index: 14, x: 5, z: 1, y: 0.5 },
  { index: 15, x: 5, z: 2, y: 0.5 },
  { index: 16, x: 5, z: 3, y: 0.5 },
  { index: 17, x: 5, z: 4, y: 0.5 },
  { index: 18, x: 4, z: 4, y: 0.5 },
  { index: 19, x: 3, z: 4, y: 0.5 },

  // ─── Grupo 3: y=1.0 — NR-33 (espaço confinado / vermelho) ───────────────
  { index: 20, x: 3, z: 5, y: 1.0 },
  { index: 21, x: 4, z: 5, y: 1.0 },
  { index: 22, x: 5, z: 5, y: 1.0 },
  { index: 23, x: 6, z: 5, y: 1.0 },
  { index: 24, x: 6, z: 4, y: 1.0 },
  { index: 25, x: 6, z: 3, y: 1.0 },
  { index: 26, x: 7, z: 3, y: 1.0 },
  { index: 27, x: 7, z: 4, y: 1.0 },
  { index: 28, x: 7, z: 5, y: 1.0 },
  { index: 29, x: 7, z: 6, y: 1.0 },

  // ─── Grupo 4: y=1.5–2.5 — subida final ───────────────────────────────────
  { index: 30, x: 6, z: 6, y: 1.50 },
  { index: 31, x: 5, z: 6, y: 1.50 },
  { index: 32, x: 5, z: 7, y: 1.50 },
  { index: 33, x: 6, z: 7, y: 1.75 },
  { index: 34, x: 7, z: 7, y: 1.75 },
  { index: 35, x: 8, z: 7, y: 2.00 },
  { index: 36, x: 8, z: 6, y: 2.00 },
  { index: 37, x: 8, z: 5, y: 2.00 },
  { index: 38, x: 9, z: 5, y: 2.25 },
  { index: 39, x: 9, z: 4, y: 2.50 }, // FINISH
];

export function getTileByIndex(index: number): TilePosition {
  if (index < 0 || index >= BOARD_PATH.length) {
    throw new RangeError(`Tile index ${index} out of range (0–${BOARD_PATH.length - 1})`);
  }
  return BOARD_PATH[index];
}

export function isStartTile(index: number): boolean {
  return index === 0;
}

export function isFinishTile(index: number): boolean {
  return index === BOARD_PATH.length - 1;
}

/**
 * Casas do tabuleiro que disparam um desafio de quiz.
 * 2 casas por grupo de 10 (posições relativas 5 e 8 dentro do grupo).
 */
export const QUIZ_TILE_INDICES = new Set([5, 8, 15, 18, 25, 28, 35, 38]);

export function isQuizTile(index: number): boolean {
  return QUIZ_TILE_INDICES.has(index);
}

/**
 * Determina a norma ativa para uma casa, baseada no grupo de 10.
 * O grupo mapeia para a norma na posição correspondente de activeNormIds.
 * Se não houver norma para o grupo, retorna a última norma da lista.
 */
export function getNormForTile(tileIndex: number, activeNormIds: string[]): string {
  const group = Math.min(Math.floor(tileIndex / 10), activeNormIds.length - 1);
  return activeNormIds[group];
}

// ─── Casas especiais (Effect Cards) ──────────────────────────────────────────

export type TileEffectType = 'accident' | 'prevention' | 'back-to-start' | 'skip-turn';

export interface TileEffectDefinition {
  type: TileEffectType;
  title: string;
  description: string;
  normRef: string;
  imagePath: string;
  deltaPosition: number;  // negativo = volta casas; positivo = avança
  deltaScore: number;     // negativo = perde pontos
  skipTurns: number;      // 1 = perde próxima rodada
  backToStart: boolean;
}

export const TILE_EFFECTS: Record<number, TileEffectDefinition> = {
  2:  { type: 'prevention',   title: 'EPI em Dia!',             description: 'Todos os EPIs utilizados corretamente antes de iniciar a atividade.',        normRef: 'NR-06 Art. 6º',      imagePath: '/cards/prevention/epi-correto.svg',            deltaPosition:  3, deltaScore:  25, skipTurns: 0, backToStart: false },
  3:  { type: 'accident',     title: 'Objeto em queda!',        description: 'Trabalhador atingido por objeto sem usar capacete.',                          normRef: 'NR-06 Art. 6º',      imagePath: '/cards/accidents/sem-capacete.svg',            deltaPosition: -3, deltaScore: -20, skipTurns: 0, backToStart: false },
  6:  { type: 'prevention',   title: 'DDS Realizado!',          description: 'Diálogo Diário de Segurança realizado com toda a equipe.',                    normRef: 'NR-01 item 1.7',     imagePath: '/cards/prevention/dds-realizado.svg',          deltaPosition:  2, deltaScore:  20, skipTurns: 0, backToStart: false },
  7:  { type: 'accident',     title: 'Queda em Altura!',        description: 'Trabalho em altura realizado sem cinto de segurança.',                        normRef: 'NR-35 item 35.4',    imagePath: '/cards/accidents/sem-cinto-altura.svg',        deltaPosition: -4, deltaScore: -25, skipTurns: 0, backToStart: false },
  10: { type: 'back-to-start',title: 'Acidente Grave!',         description: 'Falta de cultura de segurança resultou em acidente com afastamento.',        normRef: 'NR-01',              imagePath: '/cards/special/acidente-grave.svg',            deltaPosition:  0, deltaScore: -50, skipTurns: 0, backToStart: true  },
  11: { type: 'accident',     title: 'Choque Elétrico!',        description: 'Equipamento energizado sem bloqueio/etiquetagem.',                            normRef: 'NR-10 item 10.7',    imagePath: '/cards/accidents/acidente-eletrico.svg',       deltaPosition: -5, deltaScore: -30, skipTurns: 0, backToStart: false },
  12: { type: 'prevention',   title: 'Risco Reportado!',        description: 'Condição insegura identificada e comunicada ao supervisor.',                  normRef: 'NR-01 item 1.7.4',   imagePath: '/cards/prevention/condicao-reportada.svg',     deltaPosition:  3, deltaScore:  25, skipTurns: 0, backToStart: false },
  13: { type: 'skip-turn',    title: 'Afastamento Médico',      description: 'Acidente de trabalho resulta em afastamento.',                                normRef: 'NR-07',              imagePath: '/cards/special/afastamento.svg',               deltaPosition:  0, deltaScore:   0, skipTurns: 1, backToStart: false },
  16: { type: 'accident',     title: 'Exposição Química!',      description: 'Manuseio de substância química sem EPI adequado.',                            normRef: 'NR-06 Anexo I',      imagePath: '/cards/accidents/exposicao-quimica.svg',       deltaPosition: -3, deltaScore: -20, skipTurns: 0, backToStart: false },
  17: { type: 'prevention',   title: 'Simulacro Concluído!',    description: 'Simulacro de emergência e evacuação realizado com sucesso.',                  normRef: 'NR-23 item 23.4',    imagePath: '/cards/prevention/simulacro-emergencia.svg',   deltaPosition:  2, deltaScore:  20, skipTurns: 0, backToStart: false },
  21: { type: 'accident',     title: 'Acidente com Máquina!',   description: 'Máquina operada sem protetor na parte móvel.',                                normRef: 'NR-12 item 12.38',   imagePath: '/cards/accidents/acidente-maquina.svg',        deltaPosition: -4, deltaScore: -25, skipTurns: 0, backToStart: false },
  22: { type: 'prevention',   title: 'Primeiros Socorros!',     description: 'Treinamento de primeiros socorros concluído pela equipe.',                    normRef: 'NR-07 item 7.3',     imagePath: '/cards/prevention/primeiros-socorros.svg',     deltaPosition:  3, deltaScore:  25, skipTurns: 0, backToStart: false },
  23: { type: 'skip-turn',    title: 'Autuação do MTE!',        description: 'Ministério do Trabalho autua a empresa por descumprimento de NR.',            normRef: 'NR-01',              imagePath: '/cards/special/autuacao-fiscal.svg',           deltaPosition:  0, deltaScore:   0, skipTurns: 1, backToStart: false },
  26: { type: 'prevention',   title: 'Checklist Aprovado!',     description: 'Checklist de segurança de máquinas preenchido antes da operação.',            normRef: 'NR-12 item 12.130',  imagePath: '/cards/prevention/checklist-maquina.svg',      deltaPosition:  2, deltaScore:  20, skipTurns: 0, backToStart: false },
  27: { type: 'accident',     title: 'LER — Lesão por Esforço!',description: 'Atividade repetitiva sem adequação ergonômica.',                              normRef: 'NR-17 item 17.3',    imagePath: '/cards/accidents/ler-ergonomia.svg',           deltaPosition: -2, deltaScore: -15, skipTurns: 0, backToStart: false },
  31: { type: 'accident',     title: 'Escorregão Perigoso!',    description: 'Piso molhado sem sinalização de segurança.',                                  normRef: 'NR-26 item 26.3',    imagePath: '/cards/accidents/queda-piso.svg',              deltaPosition: -2, deltaScore: -15, skipTurns: 0, backToStart: false },
  32: { type: 'prevention',   title: 'Área Sinalizada!',        description: 'Sinalização de área de risco instalada e visível.',                           normRef: 'NR-26 item 26.1',    imagePath: '/cards/prevention/sinalizacao-risco.svg',      deltaPosition:  2, deltaScore:  20, skipTurns: 0, backToStart: false },
  33: { type: 'skip-turn',    title: 'Máquina Interditada!',    description: 'Máquina interditada pelo fiscal até adequação às normas.',                    normRef: 'NR-12',              imagePath: '/cards/special/interdicao.svg',                deltaPosition:  0, deltaScore:   0, skipTurns: 1, backToStart: false },
  36: { type: 'accident',     title: 'Incêndio no Local!',      description: 'Ausência de extintores e rota de fuga sinalizada.',                           normRef: 'NR-23 item 23.3',    imagePath: '/cards/accidents/incendio.svg',                deltaPosition: -3, deltaScore: -20, skipTurns: 0, backToStart: false },
  37: { type: 'prevention',   title: 'LOTO Aplicado!',          description: 'Procedimento de bloqueio e etiquetagem seguido corretamente.',                normRef: 'NR-10 item 10.7',    imagePath: '/cards/prevention/bloqueio-etiquetagem.svg',   deltaPosition:  3, deltaScore:  25, skipTurns: 0, backToStart: false },
};

export function isTileEffect(index: number): boolean {
  return index in TILE_EFFECTS;
}

// ─── Categoria de tile (UI) ──────────────────────────────────────────────────

export type TileCategory =
  | 'start'
  | 'finish'
  | 'quiz'
  | 'accident'
  | 'prevention'
  | 'special-back'
  | 'special-skip'
  | 'neutral';

/**
 * Classifica um tile de acordo com sua responsabilidade no jogo.
 * Usado pela UI 3D (atlas de textura, cor de borda, etc.) para identificar
 * visualmente cada casa.
 */
export function tileCategory(index: number): TileCategory {
  if (index === 0) return 'start';
  if (index === BOARD_PATH.length - 1) return 'finish';
  if (QUIZ_TILE_INDICES.has(index)) return 'quiz';
  const effect = TILE_EFFECTS[index];
  if (effect) {
    switch (effect.type) {
      case 'accident':      return 'accident';
      case 'prevention':    return 'prevention';
      case 'back-to-start': return 'special-back';
      case 'skip-turn':     return 'special-skip';
    }
  }
  return 'neutral';
}
