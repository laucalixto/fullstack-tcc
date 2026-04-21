import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcrypt';
import { createApp } from '../../app.js';
import { PlayerStore } from '../../players/PlayerStore.js';

// ─── RED: falha até POST /api/players/login e GET /api/players/me existirem ──

vi.mock('../../db/models/Player.model.js', () => ({
  PlayerModel: {
    findOne: vi.fn().mockResolvedValue(null),
    create: vi.fn().mockImplementation((data) => Promise.resolve({ ...data })),
    find: vi.fn().mockReturnValue({
      sort: vi.fn().mockReturnValue({ limit: vi.fn().mockResolvedValue([]) }),
    }),
  },
}));

async function makeStore(
  opts: { email?: string; password?: string; score?: number } = {},
): Promise<{ store: PlayerStore; playerId: string }> {
  const store = new PlayerStore();
  const passwordHash = await bcrypt.hash(opts.password ?? 'Senha@12345', 4);
  const player = store.create({
    firstName: 'Ana',
    lastName: 'Silva',
    email: opts.email ?? 'ana@test.com',
    industrialUnit: 'unidade-sp',
    passwordHash,
    totalScore: opts.score ?? 0,
  });
  return { store, playerId: player.playerId };
}

// ─── POST /api/players/login ──────────────────────────────────────────────────

describe('POST /api/players/login', () => {
  it('retorna 200, token, playerId e name para credenciais corretas', async () => {
    const { store } = await makeStore();
    const app = createApp({ playerStore: store });

    const res = await request(app)
      .post('/api/players/login')
      .send({ email: 'ana@test.com', password: 'Senha@12345' });

    expect(res.status).toBe(200);
    expect(typeof res.body.token).toBe('string');
    expect(typeof res.body.playerId).toBe('string');
    expect(res.body.name).toBe('Ana Silva');
    expect(res.body.email).toBe('ana@test.com');
    expect(res.body.totalScore).toBe(0);
  });

  it('retorna 401 para senha incorreta', async () => {
    const { store } = await makeStore();
    const app = createApp({ playerStore: store });

    const res = await request(app)
      .post('/api/players/login')
      .send({ email: 'ana@test.com', password: 'errada' });

    expect(res.status).toBe(401);
  });

  it('retorna 401 para e-mail não cadastrado', async () => {
    const app = createApp({ playerStore: new PlayerStore() });

    const res = await request(app)
      .post('/api/players/login')
      .send({ email: 'nao@existe.com', password: 'Qualquer@1' });

    expect(res.status).toBe(401);
  });

  it('retorna 400 para body inválido', async () => {
    const app = createApp({ playerStore: new PlayerStore() });
    const res = await request(app).post('/api/players/login').send({});
    expect(res.status).toBe(400);
  });

  it('token gerado é verificável e contém playerId', async () => {
    const { store, playerId } = await makeStore();
    const app = createApp({ playerStore: store });

    const res = await request(app)
      .post('/api/players/login')
      .send({ email: 'ana@test.com', password: 'Senha@12345' });

    const { AuthService } = await import('../../auth/AuthService.js');
    const payload = AuthService.verifyToken(res.body.token) as { playerId?: string };
    expect(payload.playerId).toBe(playerId);
  });
});

// ─── GET /api/players/me ──────────────────────────────────────────────────────

describe('GET /api/players/me', () => {
  it('retorna 401 sem token', async () => {
    const app = createApp({ playerStore: new PlayerStore() });
    const res = await request(app).get('/api/players/me');
    expect(res.status).toBe(401);
  });

  it('retorna 401 com token de facilitador (não de jogador)', async () => {
    const { store } = await makeStore();
    const app = createApp({ playerStore: store });
    const { AuthService } = await import('../../auth/AuthService.js');
    const facToken = AuthService.generateToken({ facilitatorId: 'fac-1' });

    const res = await request(app)
      .get('/api/players/me')
      .set('Authorization', `Bearer ${facToken}`);

    expect(res.status).toBe(401);
  });

  it('retorna dados do jogador com token de jogador válido', async () => {
    const { store, playerId } = await makeStore({ score: 350 });
    const app = createApp({ playerStore: store });

    const loginRes = await request(app)
      .post('/api/players/login')
      .send({ email: 'ana@test.com', password: 'Senha@12345' });

    const meRes = await request(app)
      .get('/api/players/me')
      .set('Authorization', `Bearer ${loginRes.body.token}`);

    expect(meRes.status).toBe(200);
    expect(meRes.body.playerId).toBe(playerId);
    expect(meRes.body.name).toBe('Ana Silva');
    expect(meRes.body.totalScore).toBe(350);
  });
});

// ─── P.0 — password mínimo 8 chars ───────────────────────────────────────────

describe('POST /api/players/register — validação de senha', () => {
  it('rejeita senha com menos de 8 caracteres', async () => {
    const app = createApp({ playerStore: new PlayerStore() });
    const res = await request(app).post('/api/players/register').send({
      firstName: 'X', lastName: 'Y', email: 'x@test.com',
      industrialUnit: 'u', password: '123',
    });
    expect(res.status).toBe(400);
  });

  it('aceita senha com exatamente 8 caracteres', async () => {
    const app = createApp({ playerStore: new PlayerStore() });
    const res = await request(app).post('/api/players/register').send({
      firstName: 'X', lastName: 'Y', email: 'x@test.com',
      industrialUnit: 'u', password: '12345678',
    });
    expect(res.status).toBe(201);
  });
});
