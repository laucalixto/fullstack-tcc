import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';

// ─── RED: falha até app.ts ser implementado ──────────────────────────────────

describe('GET /health', () => {
  it('retorna 200 com { ok: true }', async () => {
    const app = createApp();
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });
});
