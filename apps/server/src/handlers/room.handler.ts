import type { Socket, Server } from 'socket.io';
import {
  EVENTS,
  type RoomCreatePayload,
  type RoomJoinPayload,
  type RoomJoinedPayload,
  type RoomErrorPayload,
  type LobbyReadyPayload,
  type PlayerGameReadyPayload,
  type PlayerRenamePayload,
} from '@safety-board/shared';
import { SessionManager } from '../game/SessionManager.js';

export function registerRoomHandler(
  socket: Socket,
  io: Server,
  sm: SessionManager,
  autoStartDelayMs = 5000,
): void {
  socket.on(EVENTS.ROOM_CREATE, (payload: RoomCreatePayload) => {
    const session = sm.createSession(
      payload.facilitatorId,
      payload.quizConfig,
      payload.name,
      payload.maxPlayers,
    );
    socket.join(session.id);
    socket.emit(EVENTS.GAME_STATE, session);
  });

  socket.on(EVENTS.ROOM_JOIN, (payload: RoomJoinPayload) => {
    try {
      // Garante que o socket só esteja em uma sala por vez — previne vazamento de eventos
      for (const room of socket.rooms) {
        if (room !== socket.id) socket.leave(room);
      }

      const { session, playerId } = sm.joinSession(payload.pin, payload.playerName);
      socket.join(session.id);
      socket.data.sessionId = session.id;
      socket.data.playerId = playerId;

      const joined: RoomJoinedPayload = { sessionId: session.id, playerId, pin: payload.pin };
      socket.emit(EVENTS.ROOM_JOINED, joined);
      io.to(session.id).emit(EVENTS.GAME_STATE, session);
    } catch (e) {
      const msg = (e as Error).message;
      const validCodes = new Set<RoomErrorPayload['code']>([
        'ROOM_NOT_FOUND', 'ROOM_FULL', 'GAME_ALREADY_STARTED',
      ]);
      const code: RoomErrorPayload['code'] = validCodes.has(msg as RoomErrorPayload['code'])
        ? (msg as RoomErrorPayload['code'])
        : 'ROOM_NOT_FOUND';
      socket.emit(EVENTS.ROOM_ERROR, { code, message: msg } satisfies RoomErrorPayload);
    }
  });

  // Jogador atualizou nome+sobrenome após CharacterSelect → broadcast para todos
  socket.on(EVENTS.PLAYER_RENAME, (payload: PlayerRenamePayload) => {
    try {
      sm.renamePlayer(payload.sessionId, payload.playerId, payload.name);
      const session = sm.getById(payload.sessionId);
      if (session) {
        io.to(payload.sessionId).emit(EVENTS.GAME_STATE, session);
      }
    } catch {
      // sessão ou jogador não encontrado — ignora silenciosamente
    }
  });

  // Todos os jogadores chegaram ao lobby → agenda auto-start sincronizado
  socket.on(EVENTS.LOBBY_READY, (payload: LobbyReadyPayload) => {
    try {
      const allReady = sm.markLobbyReady(payload.sessionId, payload.playerId);
      // Broadcast updated session so all clients reflect lobby-ready players
      const updatedSession = sm.getById(payload.sessionId);
      if (updatedSession) {
        io.to(payload.sessionId).emit(EVENTS.GAME_STATE, updatedSession);
      }
      if (allReady) {
        const autoStartAt = Date.now() + autoStartDelayMs;
        io.to(payload.sessionId).emit(EVENTS.GAME_STARTING, {
          sessionId: payload.sessionId,
          autoStartAt,
        });
        setTimeout(() => {
          try {
            const session = sm.startGame(payload.sessionId);
            io.to(payload.sessionId).emit(EVENTS.GAME_STATE, session);
            const currentPlayer = session.players[session.currentPlayerIndex];
            io.to(payload.sessionId).emit(EVENTS.TURN_CHANGED, { playerId: currentPlayer.id });
          } catch {
            // sessão pode já ter sido iniciada manualmente pelo facilitador
          }
        }, autoStartDelayMs);
      }
    } catch {
      // sessão não encontrada — jogador pode ter se desconectado
    }
  });

  // Todos saíram do tutorial → emite GAME_BEGIN para entrada simultânea no tabuleiro
  socket.on(EVENTS.PLAYER_GAME_READY, (payload: PlayerGameReadyPayload) => {
    try {
      const allReady = sm.markGameReady(payload.sessionId, payload.playerId);
      if (allReady) {
        io.to(payload.sessionId).emit(EVENTS.GAME_BEGIN, { sessionId: payload.sessionId });
      }
    } catch {
      // sessão não encontrada
    }
  });
}
