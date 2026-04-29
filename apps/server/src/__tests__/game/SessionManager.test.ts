import { describe, it, expect } from 'vitest';
import { SessionManager } from '../../game/SessionManager.js';
import { QuizService } from '../../game/QuizService.js';

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

  it('joinSession lança GAME_ALREADY_STARTED se jogo ativo (ACTIVE)', () => {
    const sm = new SessionManager();
    const { pin, id } = sm.createSession('fac-1');
    sm.joinSession(pin, 'P1');
    sm.startGame(id);
    expect(() => sm.joinSession(pin, 'Late')).toThrow('GAME_ALREADY_STARTED');
  });

  it('joinSession lança ROOM_NOT_FOUND se sessão já encerrada (FINISHED)', () => {
    const sm = new SessionManager();
    const { pin, id } = sm.createSession('fac-1', undefined, undefined, 2);
    sm.joinSession(pin, 'P1');
    sm.joinSession(pin, 'P2');
    sm.startGame(id);
    sm.finishGame(id);
    expect(() => sm.joinSession(pin, 'Late')).toThrow('ROOM_NOT_FOUND');
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

  // ─── RED: falha até session.name e session.shareLink serem implementados ─────

  it('createSession armazena o nome da sessão fornecido pelo facilitador', () => {
    const sm = new SessionManager();
    const session = sm.createSession('fac-1', undefined, 'Treinamento NR-35');
    expect(session.name).toBe('Treinamento NR-35');
  });

  it('createSession usa nome padrão quando não fornecido', () => {
    const sm = new SessionManager();
    const session = sm.createSession('fac-1');
    expect(typeof session.name).toBe('string');
    expect(session.name.length).toBeGreaterThan(0);
  });

  it('createSession gera shareLink contendo o PIN', () => {
    const sm = new SessionManager();
    const session = sm.createSession('fac-1', undefined, 'Manutenção');
    expect(typeof session.shareLink).toBe('string');
    expect(session.shareLink).toContain(session.pin);
  });

  it('duas sessões têm shareLinks diferentes', () => {
    const sm = new SessionManager();
    const s1 = sm.createSession('fac-1', undefined, 'Sessão A');
    const s2 = sm.createSession('fac-2', undefined, 'Sessão B');
    expect(s1.shareLink).not.toBe(s2.shareLink);
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

  it('submitAnswer incorreto desconta pontos do jogador (anti-chute)', () => {
    let fakeNow = 0;
    const sm = new SessionManager({
      rollDiceFn: () => 5,
      quizService: new QuizService({ randomFn: () => 0 }),
      nowFn: () => fakeNow,
    });
    const { id, playerId } = setupActiveGame(sm);
    fakeNow = 1000;
    const roll = sm.rollDice(id, playerId);  // servedAt = 1000

    fakeNow = 6000; // 5s elapsed → timeLeftMs = 25000/30000 → ~83 pts
    const q = sm['quizService'].getQuestion(roll.quiz!.id)!;
    const wrongText = q.options.find((_, i) => i !== q.correctIndex)!;

    sm.submitAnswer(id, playerId, roll.quiz!.id, wrongText, 0);
    const session = sm.getById(id)!;
    expect(session.players[0].score).toBeLessThan(0); // penalidade aplicada
  });

  it('submitAnswer correto incrementa score entre 0 e 100', () => {
    let fakeNow = 0;
    const sm = new SessionManager({
      rollDiceFn: () => 5,
      quizService: new QuizService({ randomFn: () => 0 }),
      nowFn: () => fakeNow,
    });
    const { id, playerId } = setupActiveGame(sm);
    fakeNow = 1000;
    const roll = sm.rollDice(id, playerId);

    fakeNow = 11000; // 10s elapsed, latencyMs=0 → timeLeftMs=20000/30000 → 67 pts
    const q = sm['quizService'].getQuestion(roll.quiz!.id)!;
    const correctText = q.options[q.correctIndex];

    sm.submitAnswer(id, playerId, roll.quiz!.id, correctText, 0);
    const session = sm.getById(id)!;
    expect(session.players[0].score).toBe(67);
  });

  it('submitAnswer correto respondido imediatamente vale 100 pontos', () => {
    let fakeNow = 0;
    const sm = new SessionManager({
      rollDiceFn: () => 5,
      quizService: new QuizService({ randomFn: () => 0 }),
      nowFn: () => fakeNow,
    });
    const { id, playerId } = setupActiveGame(sm);
    const roll = sm.rollDice(id, playerId); // servedAt = 0

    // fakeNow permanece 0 → elapsed=0, timeLeftMs=30000 → 100 pts
    const q = sm['quizService'].getQuestion(roll.quiz!.id)!;
    sm.submitAnswer(id, playerId, roll.quiz!.id, q.options[q.correctIndex], 0);
    const session = sm.getById(id)!;
    expect(session.players[0].score).toBe(100);
  });

  it('submitAnswer compensa latência RTT ao calcular pontos', () => {
    let fakeNow = 0;
    const sm = new SessionManager({
      rollDiceFn: () => 5,
      quizService: new QuizService({ randomFn: () => 0 }),
      nowFn: () => fakeNow,
    });
    const { id, playerId } = setupActiveGame(sm);
    fakeNow = 1000;
    const roll = sm.rollDice(id, playerId);

    // elapsed=10s, latencyMs=2000 (RTT=2s, oneWay=1s) → adjusted=9000ms
    // timeLeftMs=21000/30000 → round(70) = 70 pts
    fakeNow = 11000;
    const q = sm['quizService'].getQuestion(roll.quiz!.id)!;
    sm.submitAnswer(id, playerId, roll.quiz!.id, q.options[q.correctIndex], 2000);
    const session = sm.getById(id)!;
    expect(session.players[0].score).toBe(70);
  });

  it('submitAnswer com timeout esgotado retorna 0 pontos (acerto tardio)', () => {
    let fakeNow = 0;
    const sm = new SessionManager({
      rollDiceFn: () => 5,
      quizService: new QuizService({ randomFn: () => 0 }),
      nowFn: () => fakeNow,
    });
    const { id, playerId } = setupActiveGame(sm);
    fakeNow = 1000;
    const roll = sm.rollDice(id, playerId); // servedAt = 1000

    fakeNow = 31000; // 30s elapsed = timeout exatamente esgotado, latencyMs=0
    const q = sm['quizService'].getQuestion(roll.quiz!.id)!;
    sm.submitAnswer(id, playerId, roll.quiz!.id, q.options[q.correctIndex], 0);
    const session = sm.getById(id)!;
    expect(session.players[0].score).toBe(0);
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

// ─── RED: falha até finishGame ser implementado ───────────────────────────────

describe('SessionManager — finishGame', () => {
  function setupFinishableGame() {
    const sm = new SessionManager({ rollDiceFn: () => 3 });
    const { pin, id } = sm.createSession('fac-1');
    const { playerId: p1 } = sm.joinSession(pin, 'Alice');
    const { playerId: p2 } = sm.joinSession(pin, 'Bob');
    sm.startGame(id);
    return { sm, id, p1, p2 };
  }

  it('finishGame transiciona sessão para estado FINISHED', () => {
    const { sm, id } = setupFinishableGame();
    sm.finishGame(id);
    expect(sm.getById(id)!.state).toBe('FINISHED');
  });

  it('finishGame retorna GameResultPayload com todos os jogadores', () => {
    const { sm, id } = setupFinishableGame();
    const result = sm.finishGame(id);
    expect(result.players).toHaveLength(2);
    expect(result.sessionId).toBe(id);
  });

  it('finishGame ordena jogadores por score decrescente', () => {
    const sm = new SessionManager({ rollDiceFn: () => 3 });
    const { pin, id } = sm.createSession('fac-1');
    sm.joinSession(pin, 'Alice');
    sm.joinSession(pin, 'Bob');
    sm.startGame(id);

    // Manipula scores diretamente para teste determinístico
    const session = sm.getById(id)!;
    session.players[0].score = 5; // Alice
    session.players[1].score = 8; // Bob

    const result = sm.finishGame(id);
    expect(result.players[0].name).toBe('Bob');
    expect(result.players[0].rank).toBe(1);
    expect(result.players[1].name).toBe('Alice');
    expect(result.players[1].rank).toBe(2);
  });

  it('finishGame atribui rank 1 ao jogador com maior score', () => {
    const { sm, id, p1 } = setupFinishableGame();
    const session = sm.getById(id)!;
    const p1Player = session.players.find((p) => p.id === p1)!;
    p1Player.score = 10;

    const result = sm.finishGame(id);
    const winner = result.players.find((p) => p.playerId === p1)!;
    expect(winner.rank).toBe(1);
  });

  it('finishGame inclui finalPosition de cada jogador', () => {
    const sm = new SessionManager({ rollDiceFn: () => 3 });
    const { pin, id } = sm.createSession('fac-1');
    sm.joinSession(pin, 'Alice');
    sm.joinSession(pin, 'Bob');
    sm.startGame(id);

    const session = sm.getById(id)!;
    session.players[0].position = 12;
    session.players[1].position = 7;

    const result = sm.finishGame(id);
    const alice = result.players.find((p) => p.name === 'Alice')!;
    expect(alice.finalPosition).toBe(12);
  });

  it('finishGame inclui durationSeconds positivo', () => {
    const { sm, id } = setupFinishableGame();
    const result = sm.finishGame(id);
    expect(result.durationSeconds).toBeGreaterThanOrEqual(0);
  });

  it('finishGame lança SESSION_NOT_FOUND para id inválido', () => {
    const sm = new SessionManager();
    expect(() => sm.finishGame('bad-id')).toThrow('SESSION_NOT_FOUND');
  });

  it('finishGame lança erro se jogo não estiver ACTIVE', () => {
    const sm = new SessionManager();
    const { id } = sm.createSession('fac-1');
    expect(() => sm.finishGame(id)).toThrow();
  });
});

// ─── RED: renamePlayer ─────────────────────────────────────────────────────────
describe('SessionManager — renamePlayer', () => {
  it('atualiza o nome completo (nome + sobrenome) do jogador na sessão', () => {
    const sm = new SessionManager();
    const { pin } = sm.createSession('fac-1');
    const { playerId } = sm.joinSession(pin, 'Jogador');
    const sessionId = sm.getByPin(pin)!.id;
    sm.renamePlayer(sessionId, playerId, 'Alice Silva');
    const player = sm.getById(sessionId)!.players.find((p) => p.id === playerId);
    expect(player?.name).toBe('Alice Silva');
  });

  it('lança SESSION_NOT_FOUND para sessão inválida', () => {
    const sm = new SessionManager();
    expect(() => sm.renamePlayer('bad-id', 'p1', 'Alice Silva')).toThrow('SESSION_NOT_FOUND');
  });

  it('lança PLAYER_NOT_FOUND para jogador inválido', () => {
    const sm = new SessionManager();
    const { id } = sm.createSession('fac-1');
    expect(() => sm.renamePlayer(id, 'unknown-player', 'Alice Silva')).toThrow('PLAYER_NOT_FOUND');
  });

  it('persiste avatarId quando informado (escolha do CharacterSelect)', () => {
    const sm = new SessionManager();
    const { pin } = sm.createSession('fac-1');
    const { playerId } = sm.joinSession(pin, 'Jogador');
    const sessionId = sm.getByPin(pin)!.id;
    sm.renamePlayer(sessionId, playerId, 'Alice Silva', 'tech');
    const player = sm.getById(sessionId)!.players.find((p) => p.id === playerId);
    expect(player?.avatarId).toBe('tech');
  });

  it('mantém avatarId previamente setado quando renomeação não passa um novo', () => {
    const sm = new SessionManager();
    const { pin } = sm.createSession('fac-1');
    const { playerId } = sm.joinSession(pin, 'Jogador');
    const sessionId = sm.getByPin(pin)!.id;
    sm.renamePlayer(sessionId, playerId, 'Alice', 'admin');
    sm.renamePlayer(sessionId, playerId, 'Alice Silva'); // sem avatarId
    const player = sm.getById(sessionId)!.players.find((p) => p.id === playerId);
    expect(player?.avatarId).toBe('admin');
    expect(player?.name).toBe('Alice Silva');
  });
});
