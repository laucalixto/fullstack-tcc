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
});
