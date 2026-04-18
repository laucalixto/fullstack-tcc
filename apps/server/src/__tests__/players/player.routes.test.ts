import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../app.js';
import { PlayerStore } from '../../players/PlayerStore.js';

// ─── RED: falha até PlayerStore e player.router.ts serem implementados ─────────

describe('POST /api/players/register', () => {
  let store: PlayerStore;
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    store = new PlayerStore();
    app = createApp({ playerStore: store });
  });

  it('retorna 201 com playerId ao registrar com sucesso', async () => {
    const res = await request(app).post('/api/players/register').send({
      firstName: 'Alice',
      lastName: 'Silva',
      email: 'alice@empresa.com',
      industrialUnit: 'unidade-sp',
      password: 'senha123!',
    });
    expect(res.status).toBe(201);
    expect(res.body.playerId).toBeDefined();
    expect(typeof res.body.playerId).toBe('string');
  });

  it('retorna 409 quando e-mail já cadastrado', async () => {
    const data = {
      firstName: 'Alice',
      lastName: 'Silva',
      email: 'alice@empresa.com',
      industrialUnit: 'unidade-sp',
      password: 'senha123!',
    };
    await request(app).post('/api/players/register').send(data);
    const res = await request(app).post('/api/players/register').send(data);
    expect(res.status).toBe(409);
    expect(res.body.error).toBeDefined();
  });

  it('retorna 400 quando campos obrigatórios estão ausentes', async () => {
    const res = await request(app).post('/api/players/register').send({
      firstName: 'Alice',
    });
    expect(res.status).toBe(400);
  });

  it('incrementa totalScore do jogador ao associar resultado de partida', async () => {
    await request(app).post('/api/players/register').send({
      firstName: 'Bob',
      lastName: 'Costa',
      email: 'bob@empresa.com',
      industrialUnit: 'planta-a',
      password: 'senha456!',
      sessionScore: 250,
    });

    const lb = await request(app).get('/api/leaderboard');
    expect(lb.body[0].totalScore).toBe(250);
  });
});

describe('GET /api/leaderboard', () => {
  it('retorna array vazio quando não há jogadores', async () => {
    const store = new PlayerStore();
    const app = createApp({ playerStore: store });
    const res = await request(app).get('/api/leaderboard');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('retorna jogadores ordenados por totalScore decrescente', async () => {
    const store = new PlayerStore();
    const app = createApp({ playerStore: store });

    await request(app).post('/api/players/register').send({
      firstName: 'Alice', lastName: 'S', email: 'a@e.com',
      industrialUnit: 'u1', password: 'pass1', sessionScore: 500,
    });
    await request(app).post('/api/players/register').send({
      firstName: 'Bob', lastName: 'S', email: 'b@e.com',
      industrialUnit: 'u2', password: 'pass2', sessionScore: 800,
    });

    const res = await request(app).get('/api/leaderboard');
    expect(res.status).toBe(200);
    expect(res.body[0].totalScore).toBe(800);
    expect(res.body[1].totalScore).toBe(500);
  });

  it('retorna os campos corretos do LeaderboardEntry', async () => {
    const store = new PlayerStore();
    const app = createApp({ playerStore: store });

    await request(app).post('/api/players/register').send({
      firstName: 'Carlos', lastName: 'Lima', email: 'c@e.com',
      industrialUnit: 'refinaria', password: 'pass3', sessionScore: 300,
    });

    const res = await request(app).get('/api/leaderboard');
    const entry = res.body[0];
    expect(entry).toHaveProperty('rank');
    expect(entry).toHaveProperty('playerId');
    expect(entry).toHaveProperty('name');
    expect(entry).toHaveProperty('industrialUnit');
    expect(entry).toHaveProperty('totalScore');
  });

  it('atribui ranks corretos na ordem', async () => {
    const store = new PlayerStore();
    const app = createApp({ playerStore: store });

    await request(app).post('/api/players/register').send({
      firstName: 'A', lastName: 'X', email: 'ax@e.com',
      industrialUnit: 'u1', password: 'p', sessionScore: 100,
    });
    await request(app).post('/api/players/register').send({
      firstName: 'B', lastName: 'X', email: 'bx@e.com',
      industrialUnit: 'u2', password: 'p', sessionScore: 200,
    });

    const res = await request(app).get('/api/leaderboard');
    expect(res.body[0].rank).toBe(1);
    expect(res.body[1].rank).toBe(2);
  });
});
