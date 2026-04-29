import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../../app.js';
import { FacilitatorStore } from '../../auth/FacilitatorStore.js';
import { PlayerStore } from '../../players/PlayerStore.js';
import { GameResultModel } from '../../db/models/GameResult.model.js';

// Mock dos modelos para evitar timeout de conexão no MongoDB
vi.mock('../../db/models/Facilitator.model.js', () => ({
  FacilitatorModel: {
    findOne: vi.fn().mockResolvedValue(null),
    create: vi.fn().mockImplementation((data) => Promise.resolve({ id: 'mock-fac-id', ...data })),
  },
}));

vi.mock('../../db/models/Player.model.js', () => ({
  PlayerModel: {
    findOne: vi.fn().mockResolvedValue(null),
    create: vi.fn().mockImplementation((data) => Promise.resolve({ id: `id-${data.email}`, ...data })),
    countDocuments: vi.fn().mockResolvedValue(0),
  },
}));

vi.mock('../../db/models/GameResult.model.js', () => ({
  GameResultModel: {
    find: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue([]) }),
    findOne: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue(null) }),
    create: vi.fn().mockResolvedValue({}),
  },
}));

// ─── RED: falha até manager.router.ts ser implementado ───────────────────────

async function registerAndLogin(app: ReturnType<typeof createApp>) {
  await request(app).post('/api/auth/register').send({
    email: 'gestor@empresa.com',
    password: 'Senha@Segura123',
    name: 'Gestor',
  });
  const res = await request(app).post('/api/auth/login').send({
    email: 'gestor@empresa.com',
    password: 'Senha@Segura123',
  });
  return res.body.token as string;
}

describe('GET /api/manager/stats', () => {
  let app: ReturnType<typeof createApp>;
  let token: string;

  beforeEach(async () => {
    app = createApp({
      facilitatorStore: new FacilitatorStore(),
      playerStore: new PlayerStore(),
    });
    token = await registerAndLogin(app);
  });

  it('retorna 401 sem token', async () => {
    const res = await request(app).get('/api/manager/stats');
    expect(res.status).toBe(401);
  });

  it('retorna 200 com token válido', async () => {
    const res = await request(app)
      .get('/api/manager/stats')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
  });

  it('retorna os campos corretos de DashboardStats', async () => {
    const res = await request(app)
      .get('/api/manager/stats')
      .set('Authorization', `Bearer ${token}`);
    expect(res.body).toHaveProperty('totalPlayers');
    expect(res.body).toHaveProperty('avgScore');
    expect(res.body).toHaveProperty('completionRate');
    expect(res.body).toHaveProperty('activeSessions');
  });

  it('totalPlayers reflete jogadores registrados', async () => {
    const playerStore = new PlayerStore();
    const app2 = createApp({ facilitatorStore: new FacilitatorStore(), playerStore });
    const tok = await registerAndLogin(app2);

    await request(app2).post('/api/players/register').send({
      firstName: 'A', lastName: 'B', email: 'a@b.com',
      industrialUnit: 'u1', password: 'Senha@111',
    });
    await request(app2).post('/api/players/register').send({
      firstName: 'C', lastName: 'D', email: 'c@d.com',
      industrialUnit: 'u2', password: 'Senha@222',
    });

    const res = await request(app2)
      .get('/api/manager/stats')
      .set('Authorization', `Bearer ${tok}`);
    expect(res.body.totalPlayers).toBe(2);
  });
});

describe('GET /api/manager/sessions', () => {
  let app: ReturnType<typeof createApp>;
  let token: string;

  beforeEach(async () => {
    app = createApp({
      facilitatorStore: new FacilitatorStore(),
      playerStore: new PlayerStore(),
    });
    token = await registerAndLogin(app);
  });

  it('retorna 401 sem token', async () => {
    const res = await request(app).get('/api/manager/sessions');
    expect(res.status).toBe(401);
  });

  it('retorna 200 com token válido', async () => {
    const res = await request(app)
      .get('/api/manager/sessions')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
  });

  it('retorna um array', async () => {
    const res = await request(app)
      .get('/api/manager/sessions')
      .set('Authorization', `Bearer ${token}`);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('cada entrada tem os campos de SessionSummary', async () => {
    const res = await request(app)
      .get('/api/manager/sessions')
      .set('Authorization', `Bearer ${token}`);
    // lista pode ser vazia em ambiente in-memory — só valida quando há dados
    if (res.body.length > 0) {
      const entry = res.body[0];
      expect(entry).toHaveProperty('id');
      expect(entry).toHaveProperty('date');
      expect(entry).toHaveProperty('group');
      expect(entry).toHaveProperty('status');
    } else {
      expect(res.body).toEqual([]);
    }
  });

  it('retorna session.id (UUID) como id, não o PIN', async () => {
    const { SessionManager } = await import('../../game/SessionManager.js');
    const sm = new SessionManager();
    const session = sm.createSession('fac-1', {}, 'Teste UUID');
    const localApp = createApp({
      facilitatorStore: new FacilitatorStore(),
      playerStore: new PlayerStore(),
      sessionManager: sm,
    });
    const tok = await registerAndLogin(localApp);
    const res = await request(localApp)
      .get('/api/manager/sessions')
      .set('Authorization', `Bearer ${tok}`);
    expect(res.status).toBe(200);
    expect(res.body[0].id).toBe(session.id);
    expect(res.body[0].id).not.toBe(session.pin);
  });
});

describe('GET /api/manager/players', () => {
  let app: ReturnType<typeof createApp>;
  let token: string;
  let playerStore: PlayerStore;

  beforeEach(async () => {
    playerStore = new PlayerStore();
    app = createApp({ facilitatorStore: new FacilitatorStore(), playerStore });
    token = await registerAndLogin(app);
  });

  it('retorna 401 sem token', async () => {
    const res = await request(app).get('/api/manager/players');
    expect(res.status).toBe(401);
  });

  it('retorna 200 com token válido', async () => {
    const res = await request(app)
      .get('/api/manager/players')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
  });

  it('retorna array com todos os jogadores registrados', async () => {
    await request(app).post('/api/players/register').send({
      firstName: 'Ana', lastName: 'Silva', email: 'ana@test.com',
      industrialUnit: 'SP', password: 'Senha@111',
    });
    await request(app).post('/api/players/register').send({
      firstName: 'Bruno', lastName: 'Costa', email: 'bruno@test.com',
      industrialUnit: 'MG', password: 'Senha@222',
    });
    const res = await request(app)
      .get('/api/manager/players')
      .set('Authorization', `Bearer ${token}`);
    expect(res.body).toHaveLength(2);
    expect(res.body[0]).toHaveProperty('playerId');
    expect(res.body[0]).toHaveProperty('firstName');
    expect(res.body[0]).toHaveProperty('email');
    expect(res.body[0]).toHaveProperty('industrialUnit');
    expect(res.body[0]).toHaveProperty('totalScore');
    expect(res.body[0]).not.toHaveProperty('passwordHash');
  });
});

describe('PATCH /api/manager/players/:id', () => {
  let app: ReturnType<typeof createApp>;
  let token: string;

  beforeEach(async () => {
    app = createApp({ facilitatorStore: new FacilitatorStore(), playerStore: new PlayerStore() });
    token = await registerAndLogin(app);
  });

  it('retorna 401 sem token', async () => {
    const res = await request(app).patch('/api/manager/players/any-id').send({ firstName: 'X' });
    expect(res.status).toBe(401);
  });

  it('retorna 404 para jogador inexistente', async () => {
    const res = await request(app)
      .patch('/api/manager/players/nao-existe')
      .set('Authorization', `Bearer ${token}`)
      .send({ firstName: 'X' });
    expect(res.status).toBe(404);
  });

  it('atualiza firstName e industrialUnit', async () => {
    const reg = await request(app).post('/api/players/register').send({
      firstName: 'Carlos', lastName: 'Lima', email: 'carlos@test.com',
      industrialUnit: 'PR', password: 'Senha@333',
    });
    const playerId = reg.body.playerId;
    const res = await request(app)
      .patch(`/api/manager/players/${playerId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ firstName: 'Karl', industrialUnit: 'SC' });
    expect(res.status).toBe(200);
    expect(res.body.firstName).toBe('Karl');
    expect(res.body.industrialUnit).toBe('SC');
    expect(res.body).not.toHaveProperty('passwordHash');
  });
});

describe('GET /api/manager/sessions/:id', () => {
  let app: ReturnType<typeof createApp>;
  let token: string;

  beforeEach(async () => {
    app = createApp({ facilitatorStore: new FacilitatorStore(), playerStore: new PlayerStore() });
    token = await registerAndLogin(app);
  });

  it('retorna 401 sem token', async () => {
    const res = await request(app).get('/api/manager/sessions/any-id');
    expect(res.status).toBe(401);
  });

  it('retorna 404 para sessão inexistente', async () => {
    const res = await request(app)
      .get('/api/manager/sessions/nao-existe')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
  });

  it('retorna detalhe de sessão ativa com campos obrigatórios', async () => {
    const { SessionManager } = await import('../../game/SessionManager.js');
    const sm = new SessionManager();
    const session = sm.createSession('fac-1', {}, 'Sessão Detalhe', 2);
    sm.joinSession(session.pin, 'P1');
    sm.joinSession(session.pin, 'P2');
    const localApp = createApp({
      facilitatorStore: new FacilitatorStore(),
      playerStore: new PlayerStore(),
      sessionManager: sm,
    });
    const tok = await registerAndLogin(localApp);
    const res = await request(localApp)
      .get(`/api/manager/sessions/${session.id}`)
      .set('Authorization', `Bearer ${tok}`);
    expect(res.status).toBe(200);
    expect(res.body.sessionId).toBe(session.id);
    expect(res.body.pin).toBe(session.pin);
    expect(res.body.sessionName).toBe('Sessão Detalhe');
    expect(Array.isArray(res.body.players)).toBe(true);
    expect(Array.isArray(res.body.quizLog)).toBe(true);
    expect(Array.isArray(res.body.tileLog)).toBe(true);
  });
});

describe('PATCH /api/manager/players/:id — validation error', () => {
  let app: ReturnType<typeof createApp>;
  let token: string;

  beforeEach(async () => {
    app = createApp({ facilitatorStore: new FacilitatorStore(), playerStore: new PlayerStore() });
    token = await registerAndLogin(app);
  });

  // Tiles podem subtrair pontos durante a partida — scores negativos são
  // legítimos. O gestor precisa conseguir editar pontuações negativas para
  // corrigir dados. Validação de tipo (int) permanece.
  it('aceita totalScore negativo (gestor pode corrigir pontuação para baixo)', async () => {
    const reg = await request(app).post('/api/players/register').send({
      firstName: 'X', lastName: 'Y', email: 'xy@test.com',
      industrialUnit: 'U', password: 'Senha@123',
    });
    const playerId = reg.body.playerId;
    const res = await request(app)
      .patch(`/api/manager/players/${playerId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ totalScore: -15 });
    expect(res.status).toBe(200);
    expect(res.body.totalScore).toBe(-15);
  });

  it('retorna 400 para totalScore não-inteiro', async () => {
    const reg = await request(app).post('/api/players/register').send({
      firstName: 'A', lastName: 'B', email: 'ab@test.com',
      industrialUnit: 'U', password: 'Senha@123',
    });
    const playerId = reg.body.playerId;
    const res = await request(app)
      .patch(`/api/manager/players/${playerId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ totalScore: 'not-a-number' });
    expect(res.status).toBe(400);
  });
});

describe('GET /api/manager/sessions/export', () => {
  let app: ReturnType<typeof createApp>;
  let token: string;

  beforeEach(async () => {
    app = createApp({ facilitatorStore: new FacilitatorStore(), playerStore: new PlayerStore() });
    token = await registerAndLogin(app);
  });

  it('retorna 401 sem token', async () => {
    const res = await request(app).get('/api/manager/sessions/export');
    expect(res.status).toBe(401);
  });

  it('retorna CSV com Content-Type correto', async () => {
    const res = await request(app)
      .get('/api/manager/sessions/export')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/csv/);
  });

  it('CSV contém linha de cabeçalho', async () => {
    const res = await request(app)
      .get('/api/manager/sessions/export')
      .set('Authorization', `Bearer ${token}`);
    expect(res.text).toContain('sessionId');
    expect(res.text).toContain('playerName');
    expect(res.text).toContain('score');
  });
});

describe('GET /api/manager/sessions/export — com dados', () => {
  let app: ReturnType<typeof createApp>;
  let token: string;

  const mockResult = {
    sessionId: 'session-1',
    sessionName: 'Turma A',
    pin: '123456',
    startedAt: new Date('2026-04-01T10:00:00Z'),
    finishedAt: new Date('2026-04-01T11:00:00Z'),
    durationSeconds: 3600,
    players: [
      { playerId: 'p1', name: 'Ana Silva', score: 100, rank: 1, correctAnswers: 8, totalAnswers: 10, dropped: false },
      { playerId: 'p2', name: 'Bob Costa', score: 50, rank: 2, correctAnswers: 4, totalAnswers: 10, dropped: true },
    ],
  };

  beforeEach(async () => {
    app = createApp({ facilitatorStore: new FacilitatorStore(), playerStore: new PlayerStore() });
    token = await registerAndLogin(app);
    vi.mocked(GameResultModel.find).mockReturnValue({
      lean: vi.fn().mockResolvedValue([mockResult]),
    } as never);
  });

  afterEach(() => {
    vi.mocked(GameResultModel.find).mockReturnValue({
      lean: vi.fn().mockResolvedValue([]),
    } as never);
  });

  it('CSV contém linhas de dados quando há resultados', async () => {
    const res = await request(app)
      .get('/api/manager/sessions/export')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.text).toContain('session-1');
    expect(res.text).toContain('Ana Silva');
    expect(res.text).toContain('Bob Costa');
    expect(res.text).toContain(',1'); // dropped=true
  });
});

describe('GET /api/manager/sessions — estados variados', () => {
  let token: string;

  it('inclui sessão com estado ACTIVE como "active"', async () => {
    const { SessionManager } = await import('../../game/SessionManager.js');
    const sm = new SessionManager();
    const s = sm.createSession('fac-1', {}, 'Sessão Ativa');
    sm.joinSession(s.pin, 'P1');
    sm.startGame(s.id);

    const localApp = createApp({ facilitatorStore: new FacilitatorStore(), playerStore: new PlayerStore(), sessionManager: sm });
    const tok = (await request(localApp).post('/api/auth/register').send({ email: 'g@t.com', password: 'Senha@Seg123', name: 'G' }), 
                  (await request(localApp).post('/api/auth/login').send({ email: 'g@t.com', password: 'Senha@Seg123' })).body.token as string);

    const res = await request(localApp).get('/api/manager/sessions').set('Authorization', `Bearer ${tok}`);
    const active = res.body.find((s: { status: string }) => s.status === 'active');
    expect(active).toBeDefined();
  });

  it('inclui sessão com estado WAITING como "reviewing"', async () => {
    const { SessionManager } = await import('../../game/SessionManager.js');
    const sm = new SessionManager();
    sm.createSession('fac-1', {}, 'Aguardando');

    const localApp = createApp({ facilitatorStore: new FacilitatorStore(), playerStore: new PlayerStore(), sessionManager: sm });
    const tok = (await request(localApp).post('/api/auth/register').send({ email: 'g2@t.com', password: 'Senha@Seg123', name: 'G2' }),
                  (await request(localApp).post('/api/auth/login').send({ email: 'g2@t.com', password: 'Senha@Seg123' })).body.token as string);

    const res = await request(localApp).get('/api/manager/sessions').set('Authorization', `Bearer ${tok}`);
    const reviewing = res.body.find((s: { status: string }) => s.status === 'reviewing');
    expect(reviewing).toBeDefined();
  });
});

describe('GET /api/manager/sessions/:id — 500 error', () => {
  let app: ReturnType<typeof createApp>;
  let token: string;

  beforeEach(async () => {
    app = createApp({ facilitatorStore: new FacilitatorStore(), playerStore: new PlayerStore() });
    token = await registerAndLogin(app);
    vi.mocked(GameResultModel.findOne).mockReturnValue({
      lean: vi.fn().mockRejectedValue(new Error('DB error')),
    } as never);
  });

  afterEach(() => {
    vi.mocked(GameResultModel.findOne).mockReturnValue({
      lean: vi.fn().mockResolvedValue(null),
    } as never);
  });

  it('retorna 500 quando banco falha', async () => {
    const res = await request(app)
      .get('/api/manager/sessions/nao-existe')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(500);
  });
});

describe('GET /api/manager/sessions/:id — sessão iniciada (startedAt definido)', () => {
  it('retorna detalhe com startedAt e durationSeconds calculado', async () => {
    const { SessionManager } = await import('../../game/SessionManager.js');
    const sm = new SessionManager();
    const session = sm.createSession('fac-1', {}, 'Sessão Iniciada');
    sm.joinSession(session.pin, 'P1');
    sm.startGame(session.id); // define startedAt

    const localApp = createApp({
      facilitatorStore: new FacilitatorStore(),
      playerStore: new PlayerStore(),
      sessionManager: sm,
    });
    const tok = (await request(localApp).post('/api/auth/register').send({ email: 'g3@t.com', password: 'Senha@Seg123', name: 'G3' }),
                  (await request(localApp).post('/api/auth/login').send({ email: 'g3@t.com', password: 'Senha@Seg123' })).body.token as string);

    const res = await request(localApp)
      .get(`/api/manager/sessions/${session.id}`)
      .set('Authorization', `Bearer ${tok}`);
    expect(res.status).toBe(200);
    expect(res.body.startedAt).not.toBeNull();
    expect(typeof res.body.durationSeconds).toBe('number');
    expect(res.body.status).toBe('active');
  });
});

describe('GET /api/manager/sessions/:id — resultado do MongoDB com dados completos', () => {
  let app: ReturnType<typeof createApp>;
  let token: string;

  const fullResult = {
    sessionId: 'done-session',
    pin: '999888',
    sessionName: 'Turma Final',
    startedAt: new Date('2026-04-01T09:00:00Z'),
    finishedAt: new Date('2026-04-01T10:00:00Z'),
    durationSeconds: 3600,
    players: [
      { playerId: 'p1', name: 'Ana Silva', score: 200, rank: 1, finalPosition: 38, correctAnswers: 9, totalAnswers: 10, dropped: false },
      { playerId: 'p2', name: 'Bob Costa', score: 50, rank: 2, finalPosition: 5, correctAnswers: 3, totalAnswers: 10, dropped: true },
    ],
    quizLog: [{ questionId: 'q1', playerId: 'p1', correct: true }],
    tileLog: [{ tile: 2, playerId: 'p1' }],
  };

  beforeEach(async () => {
    app = createApp({ facilitatorStore: new FacilitatorStore(), playerStore: new PlayerStore() });
    token = await registerAndLogin(app);
    vi.mocked(GameResultModel.findOne).mockReturnValue({
      lean: vi.fn().mockResolvedValue(fullResult),
    } as never);
  });

  afterEach(() => {
    vi.mocked(GameResultModel.findOne).mockReturnValue({
      lean: vi.fn().mockResolvedValue(null),
    } as never);
  });

  it('retorna detail completo do MongoDB com startedAt, finishedAt, dropped', async () => {
    const res = await request(app)
      .get('/api/manager/sessions/done-session')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.sessionId).toBe('done-session');
    expect(res.body.startedAt).not.toBeNull();
    expect(res.body.finishedAt).not.toBeNull();
    expect(res.body.status).toBe('completed');
    expect(res.body.players[1].dropped).toBe(true);
    expect(Array.isArray(res.body.quizLog)).toBe(true);
    expect(Array.isArray(res.body.tileLog)).toBe(true);
  });
});

describe('GET /api/manager/sessions — sessão FINISHED', () => {
  it('inclui sessão FINISHED com status "completed" e avgScore calculado', async () => {
    const { SessionManager } = await import('../../game/SessionManager.js');
    const sm = new SessionManager({ rollDiceFn: () => 39 });
    const session = sm.createSession('fac-1', {}, 'Sessão Concluída');
    const joined = sm.joinSession(session.pin, 'P1');
    sm.startGame(session.id);
    sm.rollDice(session.id, joined.playerId); // lands on 39 → game over
    sm.finishGame(session.id); // transition to FINISHED

    const localApp = createApp({
      facilitatorStore: new FacilitatorStore(),
      playerStore: new PlayerStore(),
      sessionManager: sm,
    });
    const tok = (await request(localApp).post('/api/auth/register').send({ email: 'gfin@t.com', password: 'Senha@Seg123', name: 'Fin' }),
                  (await request(localApp).post('/api/auth/login').send({ email: 'gfin@t.com', password: 'Senha@Seg123' })).body.token as string);

    const res = await request(localApp).get('/api/manager/sessions').set('Authorization', `Bearer ${tok}`);
    const completed = res.body.find((s: { status: string }) => s.status === 'completed');
    expect(completed).toBeDefined();
    expect(completed.avgScore).not.toBeNull();
  });
});

describe('GET /api/manager/stats — com sessões ativas e finalizadas', () => {
  it('retorna completionRate > 0 quando há sessões FINISHED', async () => {
    const { SessionManager } = await import('../../game/SessionManager.js');
    const sm = new SessionManager({ rollDiceFn: () => 39 });
    const s = sm.createSession('fac-1', {}, 'S1');
    const p = sm.joinSession(s.pin, 'P1');
    sm.startGame(s.id);
    sm.rollDice(s.id, p.playerId); // lands on 39
    sm.finishGame(s.id); // transition to FINISHED

    const localApp = createApp({
      facilitatorStore: new FacilitatorStore(),
      playerStore: new PlayerStore(),
      sessionManager: sm,
    });
    const tok = (await request(localApp).post('/api/auth/register').send({ email: 'gstat@t.com', password: 'Senha@Seg123', name: 'Stat' }),
                  (await request(localApp).post('/api/auth/login').send({ email: 'gstat@t.com', password: 'Senha@Seg123' })).body.token as string);

    const res = await request(localApp).get('/api/manager/stats').set('Authorization', `Bearer ${tok}`);
    expect(res.status).toBe(200);
    expect(res.body.completionRate).toBeGreaterThan(0);
  });
});

describe('GET /api/manager/sessions/:id — resultado MongoDB sem datas opcionais', () => {
  let app: ReturnType<typeof createApp>;
  let token: string;

  const minimalResult = {
    sessionId: 'minimal-session',
    pin: '000000',
    sessionName: 'Minimal',
    startedAt: null,
    finishedAt: null,
    durationSeconds: null,
    players: [
      { playerId: 'p1', name: 'Ana Silva', score: 100, rank: 1, finalPosition: 10, correctAnswers: 5, totalAnswers: 5, dropped: false },
    ],
    quizLog: null,
    tileLog: null,
  };

  beforeEach(async () => {
    app = createApp({ facilitatorStore: new FacilitatorStore(), playerStore: new PlayerStore() });
    token = await registerAndLogin(app);
    vi.mocked(GameResultModel.findOne).mockReturnValue({
      lean: vi.fn().mockResolvedValue(minimalResult),
    } as never);
  });

  afterEach(() => {
    vi.mocked(GameResultModel.findOne).mockReturnValue({
      lean: vi.fn().mockResolvedValue(null),
    } as never);
  });

  it('retorna null para startedAt/finishedAt quando ausentes e arrays vazios para logs', async () => {
    const res = await request(app)
      .get('/api/manager/sessions/minimal-session')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.startedAt).toBeNull();
    expect(res.body.finishedAt).toBeNull();
    expect(res.body.durationSeconds).toBeNull();
    expect(Array.isArray(res.body.quizLog)).toBe(true);
    expect(Array.isArray(res.body.tileLog)).toBe(true);
  });
});
