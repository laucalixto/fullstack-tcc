import { describe, it, expect, beforeAll } from 'vitest';
import { AuthService } from '../../auth/AuthService';

// ─── RED: falha até AuthService.ts ser implementado ──────────────────────────

describe('AuthService', () => {
  const email = 'facilitador@empresa.com';
  const password = 'Senha@Segura123';
  let hashedPassword: string;

  beforeAll(async () => {
    hashedPassword = await AuthService.hashPassword(password);
  });

  // ── hashPassword ──────────────────────────────────────────────────────────

  it('hashPassword retorna uma string diferente da senha original', async () => {
    expect(hashedPassword).not.toBe(password);
  });

  it('hashPassword produz hash compatível com bcrypt (prefixo $2b$)', () => {
    expect(hashedPassword).toMatch(/^\$2[ab]\$\d{2}\$/);
  });

  it('hashPassword usa custo 12', () => {
    // O custo fica codificado no hash: $2b$12$...
    expect(hashedPassword).toMatch(/^\$2b\$12\$/);
  });

  it('dois hashes da mesma senha são diferentes (salt aleatório)', async () => {
    const hash2 = await AuthService.hashPassword(password);
    expect(hashedPassword).not.toBe(hash2);
  });

  // ── verifyPassword ────────────────────────────────────────────────────────

  it('verifyPassword retorna true para senha correta', async () => {
    expect(await AuthService.verifyPassword(password, hashedPassword)).toBe(true);
  });

  it('verifyPassword retorna false para senha errada', async () => {
    expect(await AuthService.verifyPassword('senha-errada', hashedPassword)).toBe(false);
  });

  // ── generateToken ─────────────────────────────────────────────────────────

  it('generateToken retorna uma string JWT (três segmentos separados por ponto)', () => {
    const token = AuthService.generateToken({ facilitatorId: 'f-001' });
    expect(token.split('.')).toHaveLength(3);
  });

  it('generateToken codifica o facilitatorId no payload', () => {
    const token = AuthService.generateToken({ facilitatorId: 'f-001' });
    const payload = AuthService.verifyToken(token);
    expect(payload.facilitatorId).toBe('f-001');
  });

  it('token expira em 24 horas', () => {
    const token = AuthService.generateToken({ facilitatorId: 'f-001' });
    const payload = AuthService.verifyToken(token);
    const nowSec = Math.floor(Date.now() / 1000);
    expect(payload.exp).toBeGreaterThan(nowSec + 23 * 3600);
    expect(payload.exp).toBeLessThanOrEqual(nowSec + 25 * 3600);
  });

  // ── verifyToken ───────────────────────────────────────────────────────────

  it('verifyToken lança erro para token expirado', () => {
    // Token expirado fabricado com exp no passado
    const expired = AuthService.generateToken({ facilitatorId: 'f-001' }, '-1s');
    expect(() => AuthService.verifyToken(expired)).toThrow(/expired|invalid/i);
  });

  it('verifyToken lança erro para token adulterado', () => {
    const token = AuthService.generateToken({ facilitatorId: 'f-001' });
    const tampered = token.slice(0, -4) + 'XXXX';
    expect(() => AuthService.verifyToken(tampered)).toThrow();
  });

  it('verifyToken lança erro para string aleatória', () => {
    expect(() => AuthService.verifyToken('nao.e.um.token')).toThrow();
  });
});
