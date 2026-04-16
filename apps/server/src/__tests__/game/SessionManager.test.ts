import { describe, it, expect } from 'vitest';
import { SessionManager } from '../../game/SessionManager';
import { QuizService } from '../../game/QuizService';

// ─── RED: falha até SessionManager.ts ser implementado ───────────────────────

describe('SessionManager', () => {
  it('createSession retorna sessão WAITING com PIN de 6 dígitos', () => {
    const sm = new SessionManager();
    const session = sm.createSession('fac-1');
    expect(session.state).toBe('WAITING');
    expect(session.pin).toMatch(/^\d{6}$/);
    expect(session.facilitatorId).toBe('fac-1');
    expect(session.players).toHaveLength(0);
    expect(typeof session.id).toBe('string');
    expect(session.id.length).toBeGreaterThan(0);
  });

  it('getByPin retorna a sessão criada', () => {
    const sm = new SessionManager();
    const session = sm.createSession('fac-1');
    expect(sm.getByPin(session.pin)).toBe(session);
  });

  it('getById retorna a sessão criada', () => {
    const sm = new SessionManager();
    const session = sm.createSession('fac-1');
    expect(sm.getById(session.id)).toBe(session);
  });

  it('getByPin retorna undefined para PIN desconhecido', () => {
    const sm = new SessionManager();
    expect(sm.getByPin('000000')).toBeUndefined();
  });

  it('joinSession adiciona jogador e retorna playerId', () => {
    const sm = new SessionManager();
    const { pin } = sm.createSession('fac-1');
    const { session, playerId } = sm.joinSession(pin, 'Alice');
    expect(session.players).toHaveLength(1);
    expect(session.players[0].name).toBe('Alice');
    expect(session.players[0].id).toBe(playerId);
    expect(session.players[0].position).toBe(0);
    expect(session.players[0].score).toBe(0);
    expect(session.players[0].isConnected).toBe(true);
  });

  it('joinSession lança ROOM_NOT_FOUND para PIN desconhecido', () => {
    const sm = new SessionManager();
    expect(() => sm.joinSession('000000', 'Bob')).toThrow('ROOM_NOT_FOUND');
  });

  it('joinSession lança ROOM_FULL ao atingir 4 jogadores', () => {
    const sm = new SessionManager();
    const { pin } = sm.createSession('fac-1');
    sm.joinSession(pin, 'P1');
    sm.joinSession(pin, 'P2');
    sm.joinSession(pin, 'P3');
    sm.joinSession(pin, 'P4');
    expect(() => sm.joinSession(pin, 'P5')).toThrow('ROOM_FULL');
  });

  it('joinSession lança GAME_ALREADY_STARTED se jogo ativo', () => {
    const sm = new SessionManager();
    const { pin, id } = sm.createSession('fac-1');
    sm.joinSession(pin, 'P1');
    sm.startGame(id);
    expect(() => sm.joinSession(pin, 'Late')).toThrow('GAME_ALREADY_STARTED');
  });

  it('startGame transiciona estado para ACTIVE', () => {
    const sm = new SessionManager();
    const { pin, id } = sm.createSession('fac-1');
    sm.joinSession(pin, 'P1');
    const session = sm.startGame(id);
    expect(session.state).toBe('ACTIVE');
  });

  it('startGame lança erro se não houver jogadores', () => {
    const sm = new SessionManager();
    const { id } = sm.createSession('fac-1');
    expect(() => sm.startGame(id)).toThrow();
  });

  it('startGame lança SESSION_NOT_FOUND para id desconhecido', () => {
    const sm = new SessionManager();
    expect(() => sm.startGame('bad-id')).toThrow('SESSION_NOT_FOUND');
  });

  it('rollDice retorna dice(1-6), newPosition e nextPlayerId', () => {
    const sm = new SessionManager();
    const { pin, id } = sm.createSession('fac-1');
    const { playerId: p1 } = sm.joinSession(pin, 'P1');
    const { playerId: p2 } = sm.joinSession(pin, 'P2');
    sm.startGame(id);

    const result = sm.rollDice(id, p1);

    expect(result.dice).toBeGreaterThanOrEqual(1);
    expect(result.dice).toBeLessThanOrEqual(6);
    expect(result.newPosition).toBeGreaterThanOrEqual(1);
    expect(result.nextPlayerId).toBe(p2);
  });

  it('rollDice lança NOT_YOUR_TURN para jogador errado', () => {
    const sm = new SessionManager();
    const { pin, id } = sm.createSession('fac-1');
    sm.joinSession(pin, 'P1');
    const { playerId: p2 } = sm.joinSession(pin, 'P2');
    sm.startGame(id);

    expect(() => sm.rollDice(id, p2)).toThrow('NOT_YOUR_TURN');
  });

  it('rollDice limita newPosition a 39 (tile final)', () => {
    const sm = new SessionManager(() => 6); // sempre rola 6
    const { pin, id } = sm.createSession('fac-1');
    sm.joinSession(pin, 'P1');
    sm.startGame(id);

    const session = sm.getById(id)!;
    session.players[0].position = 38;

    const result = sm.rollDice(id, session.players[0].id);
    expect(result.newPosition).toBe(39);
  });

  it('rollDice atualiza posição do jogador na sessão', () => {
    const sm = new SessionManager(() => 3); // sempre rola 3
    const { pin, id } = sm.createSession('fac-1');
    sm.joinSession(pin, 'P1');
    sm.startGame(id);

    const session = sm.getById(id)!;
    const playerId = session.players[0].id;
    sm.rollDice(id, playerId);

    expect(session.players[0].position).toBe(3);
  });

  it('rollDice lança SESSION_NOT_FOUND para id desconhecido', () => {
    const sm = new SessionManager();
    expect(() => sm.rollDice('bad-id', 'player-1')).toThrow('SESSION_NOT_FOUND');
  });

  it('dois createSession têm PINs diferentes', () => {
    const sm = new SessionManager();
    const s1 = sm.createSession('fac-1');
    const s2 = sm.createSession('fac-2');
    expect(s1.pin).not.toBe(s2.pin);
  });

  it('createSession inclui quizConfig com normas padrão', () => {
    const sm = new SessionManager();
    const session = sm.createSession('fac-1');
    expect(session.quizConfig.activeNormIds).toHaveLength(4);
    expect(session.quizConfig.timeoutSeconds).toBe(30);
  });

  it('createSession aceita quizConfig customizado', () => {
    const sm = new SessionManager();
    const session = sm.createSession('fac-1', {
      activeNormIds: ['NR-06', 'NR-35'],
      timeoutSeconds: 45,
    });
    expect(session.quizConfig.activeNormIds).toEqual(['NR-06', 'NR-35']);
    expect(session.quizConfig.timeoutSeconds).toBe(45);
  });
});

describe('SessionManager — quiz', () => {
  // Questão cujo tile 5 é quiz tile (NR-06 no grupo 0-9)
  function makeQuizSm(rollResult = 5) {
    const quizService = new QuizService({ randomFn: () => 0 }); // sempre 1ª questão
    return new SessionManager({ rollDiceFn: () => rollResult, quizService });
  }

  function setupActiveGame(sm: SessionManager) {
    const { pin, id } = sm.createSession('fac-1');
    const { playerId } = sm.joinSession(pin, 'P1');
    sm.joinSession(pin, 'P2');
    sm.startGame(id);
    return { id, playerId };
  }

  it('rollDice numa casa de quiz retorna quiz com question', () => {
    const sm = makeQuizSm(5); // tile 5 é quiz tile
    const { id, playerId } = setupActiveGame(sm);
    const result = sm.rollDice(id, playerId);
    expect(result.quiz).toBeDefined();
    expect(result.quiz!.options).toHaveLength(4);
    expect(result.quiz).not.toHaveProperty('correctIndex');
  });

  it('rollDice em casa normal não retorna quiz', () => {
    const sm = makeQuizSm(3); // tile 3 não é quiz tile
    const { id, playerId } = setupActiveGame(sm);
    const result = sm.rollDice(id, playerId);
    expect(result.quiz).toBeUndefined();
  });

  it('submitAnswer retorna resultado correto e nextPlayerId', () => {
    const sm = makeQuizSm(5);
    const { id, playerId } = setupActiveGame(sm);
    const roll = sm.rollDice(id, playerId);

    const correctText = sm['quizService'].getQuestion(roll.quiz!.id)!
      .options[sm['quizService'].getQuestion(roll.quiz!.id)!.correctIndex];

    const { result, nextPlayerId } = sm.submitAnswer(id, playerId, roll.quiz!.id, correctText);
    expect(result.correct).toBe(true);
    expect(typeof nextPlayerId).toBe('string');
  });

  it('submitAnswer incorreto não incrementa score', () => {
    const sm = makeQuizSm(5);
    const { id, playerId } = setupActiveGame(sm);
    const roll = sm.rollDice(id, playerId);

    const q = sm['quizService'].getQuestion(roll.quiz!.id)!;
    const wrongText = q.options.find((_, i) => i !== q.correctIndex)!;

    sm.submitAnswer(id, playerId, roll.quiz!.id, wrongText);
    const session = sm.getById(id)!;
    expect(session.players[0].score).toBe(0);
  });

  it('submitAnswer correto incrementa score do jogador', () => {
    const sm = makeQuizSm(5);
    const { id, playerId } = setupActiveGame(sm);
    const roll = sm.rollDice(id, playerId);

    const q = sm['quizService'].getQuestion(roll.quiz!.id)!;
    const correctText = q.options[q.correctIndex];

    sm.submitAnswer(id, playerId, roll.quiz!.id, correctText);
    const session = sm.getById(id)!;
    expect(session.players[0].score).toBe(1);
  });

  it('submitAnswer lança NO_PENDING_QUIZ se não há quiz ativo', () => {
    const sm = makeQuizSm(3); // tile 3 — sem quiz
    const { id, playerId } = setupActiveGame(sm);
    sm.rollDice(id, playerId);
    expect(() => sm.submitAnswer(id, playerId, 'q1', 'texto')).toThrow('NO_PENDING_QUIZ');
  });

  it('submitAnswer lança SESSION_NOT_FOUND para sessão inválida', () => {
    const sm = makeQuizSm(5);
    expect(() => sm.submitAnswer('bad', 'p1', 'q1', 'texto')).toThrow('SESSION_NOT_FOUND');
  });
});
