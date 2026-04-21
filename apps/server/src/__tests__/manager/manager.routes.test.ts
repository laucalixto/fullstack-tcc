import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../../app.js';
import { FacilitatorStore } from '../../auth/FacilitatorStore.js';
import { PlayerStore } from '../../players/PlayerStore.js';

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
