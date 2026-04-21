import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcrypt';
import { createApp } from '../../app.js';
import { PlayerStore } from '../../players/PlayerStore.js';

vi.mock('../../db/models/Player.model.js', () => ({
  PlayerModel: {
    findOne: vi.fn().mockResolvedValue(null),
    create: vi.fn().mockImplementation((data) => Promise.resolve({ ...data })),
    find: vi.fn().mockReturnValue({
      sort: vi.fn().mockReturnValue({ limit: vi.fn().mockResolvedValue([]) }),
    }),
    findOneAndUpdate: vi.fn().mockResolvedValue(null),
  },
}));

async function setup(score = 0) {
  const store = new PlayerStore();
  const passwordHash = await bcrypt.hash('Senha@12345', 4);
  const player = store.create({
    firstName: 'Ana', lastName: 'Silva',
    email: 'ana@test.com', industrialUnit: 'unidade-sp',
    passwordHash, totalScore: score,
  });
  const app = createApp({ playerStore: store });

  const loginRes = await request(app)
    .post('/api/players/login')
    .send({ email: 'ana@test.com', password: 'Senha@12345' });
  const token = loginRes.body.token as string;

  return { store, app, player, token };
}

// ─── GET /api/players/:id/history ───────────────────────────────────────────

describe('GET /api/players/:id/history', () => {
  it('retorna 401 sem token', async () => {
    const { app, player } = await setup();
    const res = await request(app).get(`/api/players/${player.playerId}/history`);
    expect(res.status).toBe(401);
  });

  it('retorna 403 se token pertence a outro jogador', async () => {
    const store = new PlayerStore();
    const h = await bcrypt.hash('Senha@12345', 4);
    store.create({ firstName: 'Ana', lastName: 'S', email: 'ana@test.com', industrialUnit: 'u', passwordHash: h, totalScore: 0 });
    const other = store.create({ firstName: 'Bob', lastName: 'S', email: 'bob@test.com', industrialUnit: 'u', passwordHash: h, totalScore: 0 });
    const app = createApp({ playerStore: store });

    const anaLogin = await request(app).post('/api/players/login').send({ email: 'ana@test.com', password: 'Senha@12345' });
    const anaToken = anaLogin.body.token as string;

    const res = await request(app)
      .get(`/api/players/${other.playerId}/history`)
      .set('Authorization', `Bearer ${anaToken}`);
    expect(res.status).toBe(403);
  });

  it('retorna array vazio quando jogador não tem histórico', async () => {
    const { app, player, token } = await setup();
    const res = await request(app)
      .get(`/api/players/${player.playerId}/history`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(0);
  });

  it('retorna entradas de histórico com campos corretos', async () => {
    const { app, player, token, store } = await setup();
    store.addGameResult(player.playerId, {
      sessionId: 'sess-1',
      sessionName: 'Turma A',
      playedAt: new Date().toISOString(),
      score: 300,
      rank: 2,
      totalPlayers: 4,
    });

    const res = await request(app)
      .get(`/api/players/${player.playerId}/history`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    const entry = res.body[0];
    expect(entry).toHaveProperty('sessionId', 'sess-1');
    expect(entry).toHaveProperty('sessionName', 'Turma A');
    expect(entry).toHaveProperty('playedAt');
    expect(entry).toHaveProperty('score', 300);
    expect(entry).toHaveProperty('rank', 2);
    expect(entry).toHaveProperty('totalPlayers', 4);
  });
});

// ─── PATCH /api/players/me ───────────────────────────────────────────────────

describe('PATCH /api/players/me', () => {
  it('retorna 401 sem token', async () => {
    const { app } = await setup();
    const res = await request(app).patch('/api/players/me').send({ firstName: 'Nova' });
    expect(res.status).toBe(401);
  });

  it('atualiza firstName e lastName', async () => {
    const { app, token } = await setup();
    const res = await request(app)
      .patch('/api/players/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ firstName: 'Maria', lastName: 'Souza' });
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Maria Souza');
  });

  it('atualiza senha quando currentPassword está correta', async () => {
    const { app, token } = await setup();
    const res = await request(app)
      .patch('/api/players/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: 'Senha@12345', newPassword: 'NovaSenha@99' });
    expect(res.status).toBe(200);

    // nova senha deve funcionar no login
    const loginRes = await request(app)
      .post('/api/players/login')
      .send({ email: 'ana@test.com', password: 'NovaSenha@99' });
    expect(loginRes.status).toBe(200);
  });

  it('retorna 401 quando currentPassword está errada', async () => {
    const { app, token } = await setup();
    const res = await request(app)
      .patch('/api/players/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: 'errada123', newPassword: 'NovaSenha@99' });
    expect(res.status).toBe(401);
  });

  it('retorna 400 quando newPassword tem menos de 8 caracteres', async () => {
    const { app, token } = await setup();
    const res = await request(app)
      .patch('/api/players/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: 'Senha@12345', newPassword: '123' });
    expect(res.status).toBe(400);
  });

  it('retorna 400 quando newPassword é fornecida sem currentPassword', async () => {
    const { app, token } = await setup();
    const res = await request(app)
      .patch('/api/players/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ newPassword: 'NovaSenha@99' });
    expect(res.status).toBe(400);
  });
});
