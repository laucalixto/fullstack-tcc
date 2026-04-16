import { describe, it, expect } from 'vitest';
import { SessionManager } from '../../game/SessionManager';

// ─── RED: falha até SessionManager.ts ser implementado ───────────────────────

describe('SessionManager', () => {
  it('createSession retorna sessão WAITING com PIN de 6 dígitos', () => {
    const sm = new SessionManager();
    const session = sm.createSession('fac-1');
    expect(session.state).toBe('WAITING');
    expect(session.pin).toMatch(/^\d{6}$/);
    expect(session.facilitatorId).toBe('fac-1');
    expect(session.players).toHaveLength(0);
    expect(typeof session.id).toBe('string');
    expect(session.id.length).toBeGreaterThan(0);
  });

  it('getByPin retorna a sessão criada', () => {
    const sm = new SessionManager();
    const session = sm.createSession('fac-1');
    expect(sm.getByPin(session.pin)).toBe(session);
  });

  it('getById retorna a sessão criada', () => {
    const sm = new SessionManager();
    const session = sm.createSession('fac-1');
    expect(sm.getById(session.id)).toBe(session);
  });

  it('getByPin retorna undefined para PIN desconhecido', () => {
    const sm = new SessionManager();
    expect(sm.getByPin('000000')).toBeUndefined();
  });

  it('joinSession adiciona jogador e retorna playerId', () => {
    const sm = new SessionManager();
    const { pin } = sm.createSession('fac-1');
    const { session, playerId } = sm.joinSession(pin, 'Alice');
    expect(session.players).toHaveLength(1);
    expect(session.players[0].name).toBe('Alice');
    expect(session.players[0].id).toBe(playerId);
    expect(session.players[0].position).toBe(0);
    expect(session.players[0].score).toBe(0);
    expect(session.players[0].isConnected).toBe(true);
  });

  it('joinSession lança ROOM_NOT_FOUND para PIN desconhecido', () => {
    const sm = new SessionManager();
    expect(() => sm.joinSession('000000', 'Bob')).toThrow('ROOM_NOT_FOUND');
  });

  it('joinSession lança ROOM_FULL ao atingir 4 jogadores', () => {
    const sm = new SessionManager();
    const { pin } = sm.createSession('fac-1');
    sm.joinSession(pin, 'P1');
    sm.joinSession(pin, 'P2');
    sm.joinSession(pin, 'P3');
    sm.joinSession(pin, 'P4');
    expect(() => sm.joinSession(pin, 'P5')).toThrow('ROOM_FULL');
  });

  it('joinSession lança GAME_ALREADY_STARTED se jogo ativo', () => {
    const sm = new SessionManager();
    const { pin, id } = sm.createSession('fac-1');
    sm.joinSession(pin, 'P1');
    sm.startGame(id);
    expect(() => sm.joinSession(pin, 'Late')).toThrow('GAME_ALREADY_STARTED');
  });

  it('startGame transiciona estado para ACTIVE', () => {
    const sm = new SessionManager();
    const { pin, id } = sm.createSession('fac-1');
    sm.joinSession(pin, 'P1');
    const session = sm.startGame(id);
    expect(session.state).toBe('ACTIVE');
  });

  it('startGame lança erro se não houver jogadores', () => {
    const sm = new SessionManager();
    const { id } = sm.createSession('fac-1');
    expect(() => sm.startGame(id)).toThrow();
  });

  it('startGame lança SESSION_NOT_FOUND para id desconhecido', () => {
    const sm = new SessionManager();
    expect(() => sm.startGame('bad-id')).toThrow('SESSION_NOT_FOUND');
  });

  it('rollDice retorna dice(1-6), newPosition e nextPlayerId', () => {
    const sm = new SessionManager();
    const { pin, id } = sm.createSession('fac-1');
    const { playerId: p1 } = sm.joinSession(pin, 'P1');
    const { playerId: p2 } = sm.joinSession(pin, 'P2');
    sm.startGame(id);

    const result = sm.rollDice(id, p1);

    expect(result.dice).toBeGreaterThanOrEqual(1);
    expect(result.dice).toBeLessThanOrEqual(6);
    expect(result.newPosition).toBeGreaterThanOrEqual(1);
    expect(result.nextPlayerId).toBe(p2);
  });

  it('rollDice lança NOT_YOUR_TURN para jogador errado', () => {
    const sm = new SessionManager();
    const { pin, id } = sm.createSession('fac-1');
    sm.joinSession(pin, 'P1');
    const { playerId: p2 } = sm.joinSession(pin, 'P2');
    sm.startGame(id);

    expect(() => sm.rollDice(id, p2)).toThrow('NOT_YOUR_TURN');
  });

  it('rollDice limita newPosition a 39 (tile final)', () => {
    const sm = new SessionManager(() => 6); // sempre rola 6
    const { pin, id } = sm.createSession('fac-1');
    sm.joinSession(pin, 'P1');
    sm.startGame(id);

    const session = sm.getById(id)!;
    session.players[0].position = 38;

    const result = sm.rollDice(id, session.players[0].id);
    expect(result.newPosition).toBe(39);
  });

  it('rollDice atualiza posição do jogador na sessão', () => {
    const sm = new SessionManager(() => 3); // sempre rola 3
    const { pin, id } = sm.createSession('fac-1');
    sm.joinSession(pin, 'P1');
    sm.startGame(id);

    const session = sm.getById(id)!;
    const playerId = session.players[0].id;
    sm.rollDice(id, playerId);

    expect(session.players[0].position).toBe(3);
  });

  it('rollDice lança SESSION_NOT_FOUND para id desconhecido', () => {
    const sm = new SessionManager();
    expect(() => sm.rollDice('bad-id', 'player-1')).toThrow('SESSION_NOT_FOUND');
  });

  it('dois createSession têm PINs diferentes', () => {
    const sm = new SessionManager();
    const s1 = sm.createSession('fac-1');
    const s2 = sm.createSession('fac-2');
    expect(s1.pin).not.toBe(s2.pin);
  });
});
