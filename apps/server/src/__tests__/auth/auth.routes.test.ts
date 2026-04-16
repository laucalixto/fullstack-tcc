import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../../app';

// ─── RED: falha até auth.routes.ts ser implementado ──────────────────────────

describe('POST /api/auth/register', () => {
  const app = createApp();

  it('retorna 201 e token para dados válidos', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'novo@empresa.com', password: 'Senha@Segura123', name: 'Novo Facilitador' });
    expect(res.status).toBe(201);
    expect(res.body.token).toBeDefined();
    expect(typeof res.body.token).toBe('string');
  });

  it('retorna 400 para email inválido', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'nao-e-email', password: 'Senha@Segura123', name: 'X' });
    expect(res.status).toBe(400);
  });

  it('retorna 400 para senha com menos de 8 caracteres', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'valido@empresa.com', password: '123', name: 'X' });
    expect(res.status).toBe(400);
  });

  it('retorna 400 quando campos obrigatórios estão ausentes', async () => {
    const res = await request(app).post('/api/auth/register').send({});
    expect(res.status).toBe(400);
  });
});

describe('POST /api/auth/register — email duplicado', () => {
  const app = createApp();

  it('retorna 409 ao registrar email já existente', async () => {
    const body = { email: 'duplicado@empresa.com', password: 'Senha@Segura123', name: 'X' };
    await request(app).post('/api/auth/register').send(body);
    const res = await request(app).post('/api/auth/register').send(body);
    expect(res.status).toBe(409);
  });
});

describe('POST /api/auth/login', () => {
  const app = createApp();
  const email = 'facilitador@empresa.com';
  const password = 'Senha@Segura123';

  it('retorna 401 para email desconhecido', async () => {
    const res = await request(app).post('/api/auth/login').send({ email, password });
    expect(res.status).toBe(401);
  });

  it('retorna 401 para senha errada (usuário existe)', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({ email, password, name: 'Facilitador' });
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email, password: 'senha-errada' });
    expect(res.status).toBe(401);
  });

  it('retorna 200 e token para credenciais corretas', async () => {
    const regRes = await request(app)
      .post('/api/auth/register')
      .send({ email: 'login-ok@empresa.com', password, name: 'OK' });
    expect(regRes.status).toBe(201);
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'login-ok@empresa.com', password });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
  });

  it('retorna 400 para body inválido', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'x' });
    expect(res.status).toBe(400);
  });
});
