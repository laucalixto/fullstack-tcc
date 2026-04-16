import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../../app';
import { AuthService } from '../../auth/AuthService';

// ─── RED: falha até jwt.middleware.ts ser implementado ───────────────────────

describe('JWT Middleware', () => {
  const app = createApp();

  it('retorna 401 quando Authorization header está ausente', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('retorna 401 quando token está mal formatado', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer nao-e-um-jwt');
    expect(res.status).toBe(401);
  });

  it('retorna 401 quando Bearer está ausente no header', async () => {
    const token = AuthService.generateToken({ facilitatorId: 'f-001' });
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', token); // sem "Bearer "
    expect(res.status).toBe(401);
  });

  it('passa para next() com token válido e adiciona facilitatorId ao req', async () => {
    const token = AuthService.generateToken({ facilitatorId: 'f-001' });
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.facilitatorId).toBe('f-001');
  });
});
