import { describe, it, expect } from 'vitest';
import { SessionManager } from '../../game/SessionManager.js';

// ─── RED: Bugs 1 & 2 — maxPlayers configurável + auto-start ─────────────────
//
// Bug 2: joinSession usa MAX_PLAYERS=4 fixo; deve usar maxPlayers por sessão.
// Bug 1: quando sala atinge maxPlayers, joinSession deve sinalizar isFull=true
//        para o handler agendar o auto-start.

describe('SessionManager — maxPlayers por sessão', () => {
  it('createSession armazena maxPlayers=4 por padrão na sessão', () => {
    const sm = new SessionManager();
    // @ts-ignore — 4º param ainda não existe
    const session = sm.createSession('fac-1', undefined, undefined, undefined) as any;
    // após implementação session.maxPlayers === 4
    expect((sm.getByPin(session.pin) as any).maxPlayers).toBe(4);
  });

  it('createSession armazena maxPlayers=2 quando configurado', () => {
    const sm = new SessionManager();
    // @ts-ignore — 4º param ainda não existe na assinatura
    const session = (sm as any).createSession('fac-1', undefined, undefined, 2);
    expect(session.maxPlayers).toBe(2);
  });

  it('createSession armazena maxPlayers=3 quando configurado', () => {
    const sm = new SessionManager();
    // @ts-ignore
    const session = (sm as any).createSession('fac-1', undefined, undefined, 3);
    expect(session.maxPlayers).toBe(3);
  });

  it('joinSession lança ROOM_FULL ao atingir maxPlayers=2', () => {
    const sm = new SessionManager();
    // @ts-ignore
    const { pin } = (sm as any).createSession('fac-1', undefined, undefined, 2);
    sm.joinSession(pin, 'P1');
    sm.joinSession(pin, 'P2');
    expect(() => sm.joinSession(pin, 'P3')).toThrow('ROOM_FULL');
  });

  it('joinSession ainda permite 4 jogadores com maxPlayers=4 padrão', () => {
    const sm = new SessionManager();
    const { pin } = sm.createSession('fac-1');
    sm.joinSession(pin, 'P1');
    sm.joinSession(pin, 'P2');
    sm.joinSession(pin, 'P3');
    // deve permitir o 4º
    expect(() => sm.joinSession(pin, 'P4')).not.toThrow();
  });

  it('joinSession continua lançando ROOM_FULL ao atingir maxPlayers=4 padrão', () => {
    const sm = new SessionManager();
    const { pin } = sm.createSession('fac-1');
    sm.joinSession(pin, 'P1');
    sm.joinSession(pin, 'P2');
    sm.joinSession(pin, 'P3');
    sm.joinSession(pin, 'P4');
    expect(() => sm.joinSession(pin, 'P5')).toThrow('ROOM_FULL');
  });

  it('joinSession retorna isFull=true quando sala atinge maxPlayers', () => {
    const sm = new SessionManager();
    // @ts-ignore
    const { pin } = (sm as any).createSession('fac-1', undefined, undefined, 2);
    sm.joinSession(pin, 'P1');
    const result = sm.joinSession(pin, 'P2') as any;
    expect(result.isFull).toBe(true);
  });

  it('joinSession retorna isFull=false quando sala ainda tem vagas', () => {
    const sm = new SessionManager();
    // @ts-ignore
    const { pin } = (sm as any).createSession('fac-1', undefined, undefined, 3);
    sm.joinSession(pin, 'P1');
    const result = sm.joinSession(pin, 'P2') as any;
    expect(result.isFull).toBe(false);
  });

  it('joinSession retorna isFull=false na primeira entrada com maxPlayers=2', () => {
    const sm = new SessionManager();
    // @ts-ignore
    const { pin } = (sm as any).createSession('fac-1', undefined, undefined, 2);
    const result = sm.joinSession(pin, 'P1') as any;
    expect(result.isFull).toBe(false);
  });
});
