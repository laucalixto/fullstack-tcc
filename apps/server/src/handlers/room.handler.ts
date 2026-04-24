import type { Socket, Server } from 'socket.io';
import {
  EVENTS,
  type RoomCreatePayload,
  type RoomJoinPayload,
  type RoomJoinedPayload,
  type RoomErrorPayload,
  type LobbyReadyPayload,
  type LobbyForceStartPayload,
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

  // Voto dos presentes no lobby para forçar início sem esperar sala cheia.
  // Unanimidade dispara GAME_STARTING; ausentes recebem PLAYER_DROPPED.
  socket.on(EVENTS.LOBBY_FORCE_START, (payload: LobbyForceStartPayload) => {
    try {
      const result = sm.requestForceStart(payload.sessionId, payload.playerId);

      if (!result.started) {
        io.to(payload.sessionId).emit(EVENTS.LOBBY_FORCE_START_PROGRESS, {
          sessionId: payload.sessionId,
          votes: result.votes,
          needed: result.needed,
        });
        return;
      }

      // Unânime → notifica dropados (ainda estão em CharacterSelect/PinEntry)
      // antes de iniciar, para que seus sockets saiam da sala sem receber GAME_STATE ACTIVE.
      for (const droppedId of result.droppedPlayerIds ?? []) {
        io.to(payload.sessionId).emit(EVENTS.PLAYER_DROPPED, {
          sessionId: payload.sessionId,
          playerId: droppedId,
          reason: 'FORCE_START',
        });
      }

      // Broadcast novo GAME_STATE (sem os dropados) e agenda auto-start
      const updatedSession = sm.getById(payload.sessionId);
      if (updatedSession) {
        io.to(payload.sessionId).emit(EVENTS.GAME_STATE, updatedSession);
      }
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
          // sessão já iniciada ou finalizada
        }
      }, autoStartDelayMs);
    } catch {
      // NOT_APPLICABLE / NOT_ENOUGH_READY / NOT_IN_LOBBY / SESSION_NOT_FOUND — ignora
    }
  });

  // Todos saíram do tutorial → emite GAME_BEGIN + TURN_DRAW (sorteio visual).
  // TURN_DRAW é atrasado para garantir que todos os clientes montaram o GamePage
  // e registraram o listener (eles estão em transição TutorialOverlay → GameLoading → GamePage).
  socket.on(EVENTS.PLAYER_GAME_READY, (payload: PlayerGameReadyPayload) => {
    try {
      const allReady = sm.markGameReady(payload.sessionId, payload.playerId);
      if (!allReady) return;
      io.to(payload.sessionId).emit(EVENTS.GAME_BEGIN, { sessionId: payload.sessionId });

      const TURN_DRAW_DELAY_MS    = 800;   // tempo para clientes montarem GamePage
      const TURN_DRAW_DURATION_MS = 6000;  // intro(2s) + animação(2s) + hold(2s) no cliente

      setTimeout(() => {
        const session = sm.getById(payload.sessionId);
        if (!session) return;
        const winner = session.players[session.currentPlayerIndex];
        if (!winner) return;
        io.to(payload.sessionId).emit(EVENTS.TURN_DRAW, {
          sessionId: payload.sessionId,
          winnerPlayerId: winner.id,
          durationMs: TURN_DRAW_DURATION_MS,
        });
      }, TURN_DRAW_DELAY_MS);
    } catch {
      // sessão não encontrada
    }
  });
}
