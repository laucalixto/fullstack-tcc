import { describe, it, expect } from 'vitest';
import { SessionManager } from '../../game/SessionManager.js';
import { QuizService } from '../../game/QuizService.js';

// ─── RED: falha até SessionManager rastrear quizLog/tileLog/droppedPlayerIds ──

function makeGame(rollValue: number, maxPlayers: 2 | 3 | 4 = 2) {
  const sm = new SessionManager({ rollDiceFn: () => rollValue });
  const { pin, id } = sm.createSession('fac-1', {}, 'Tracking Test', maxPlayers);
  const { playerId: p1 } = sm.joinSession(pin, 'Ana');
  const { playerId: p2 } = sm.joinSession(pin, 'Bruno');
  sm.startGame(id);
  return { sm, id, pin, p1, p2 };
}

function getEntry(sm: SessionManager, sessionId: string) {
  return sm.allSessions().find((s) => s.session.id === sessionId)!;
}

describe('SessionManager — quiz log', () => {
  it('quizLog começa vazio', () => {
    const { sm, id } = makeGame(1);
    expect(getEntry(sm, id).quizLog).toHaveLength(0);
  });

  it('quizLog acumula entrada após submitAnswer', () => {
    // tile 5 = quiz tile; rolar 5 desde posição 0 cai nele
    const { sm, id, p1 } = makeGame(5);
    const roll = sm.rollDice(id, p1);
    expect(roll.quiz).toBeDefined();
    sm.submitAnswer(id, p1, roll.quiz!.id, roll.quiz!.options[0], 100);

    const entry = getEntry(sm, id);
    expect(entry.quizLog).toHaveLength(1);
    const log = entry.quizLog[0];
    expect(log.playerId).toBe(p1);
    expect(log.playerName).toBe('Ana');
    expect(log.questionId).toBe(roll.quiz!.id);
    expect(log.selectedText).toBe(roll.quiz!.options[0]);
    expect(typeof log.correct).toBe('boolean');
    expect(typeof log.correctText).toBe('string');
    expect(typeof log.latencyMs).toBe('number');
  });

  it('quizLog acumula múltiplas respostas ao longo do jogo', () => {
    // tile 5 = quiz; p1 e p2 ambos rolarão 5 (cai no mesmo tile quiz)
    const { sm, id, p1, p2 } = makeGame(5);

    const r1 = sm.rollDice(id, p1);
    sm.submitAnswer(id, p1, r1.quiz!.id, r1.quiz!.options[0], 50);

    const r2 = sm.rollDice(id, p2);
    sm.submitAnswer(id, p2, r2.quiz!.id, r2.quiz!.options[0], 50);

    expect(getEntry(sm, id).quizLog).toHaveLength(2);
  });
});

describe('SessionManager — tile log', () => {
  it('tileLog começa vazio', () => {
    const { sm, id } = makeGame(1);
    expect(getEntry(sm, id).tileLog).toHaveLength(0);
  });

  it('tileLog acumula entrada após applyTileEffect', () => {
    // tile 2 = tile effect; rolar 2 desde posição 0 cai nele
    const { sm, id, p1 } = makeGame(2);
    const roll = sm.rollDice(id, p1);
    expect(roll.tileEffect).toBeDefined();
    sm.applyTileEffect(id, p1);

    const entry = getEntry(sm, id);
    expect(entry.tileLog).toHaveLength(1);
    const log = entry.tileLog[0];
    expect(log.playerId).toBe(p1);
    expect(log.playerName).toBe('Ana');
    expect(typeof log.tileIndex).toBe('number');
    expect(typeof log.effectTitle).toBe('string');
    expect(typeof log.effectType).toBe('string');
    expect(typeof log.deltaScore).toBe('number');
    expect(typeof log.deltaPosition).toBe('number');
  });
});

describe('SessionManager — dropout tracking', () => {
  it('droppedPlayerIds começa vazio', () => {
    const { sm, id } = makeGame(1);
    expect(getEntry(sm, id).droppedPlayerIds).toHaveLength(0);
  });

  it('droppedPlayerIds registra jogador desconectado durante jogo ativo', () => {
    const { sm, id, p1 } = makeGame(1);
    sm.markDisconnected(id, p1);
    expect(getEntry(sm, id).droppedPlayerIds).toContain(p1);
  });

  it('droppedPlayerIds não duplica o mesmo jogador', () => {
    const { sm, id, p1 } = makeGame(1);
    sm.markDisconnected(id, p1);
    sm.markDisconnected(id, p1);
    expect(getEntry(sm, id).droppedPlayerIds.filter((x) => x === p1)).toHaveLength(1);
  });
});
