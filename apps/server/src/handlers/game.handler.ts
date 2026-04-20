import type { Socket, Server } from 'socket.io';
import {
  EVENTS,
  type RoomErrorPayload,
  type QuizAnswerPayload,
  type GameFinishedPayload,
  type TileEffectAckPayload,
} from '@safety-board/shared';
import { SessionManager } from '../game/SessionManager.js';

export function registerGameHandler(socket: Socket, io: Server, sm: SessionManager): void {
  socket.on(EVENTS.GAME_START, (payload: { sessionId: string }) => {
    try {
      const session = sm.startGame(payload.sessionId);
      io.to(payload.sessionId).emit(EVENTS.GAME_STATE, session);
      const currentPlayer = session.players[session.currentPlayerIndex];
      io.to(payload.sessionId).emit(EVENTS.TURN_CHANGED, { playerId: currentPlayer.id });
    } catch (e) {
      const error: RoomErrorPayload = {
        code: 'ROOM_NOT_FOUND',
        message: (e as Error).message,
      };
      socket.emit(EVENTS.ROOM_ERROR, error);
    }
  });

  socket.on(EVENTS.TURN_ROLL, (payload: { sessionId: string; playerId: string }) => {
    try {
      const result = sm.rollDice(payload.sessionId, payload.playerId);

      io.to(payload.sessionId).emit(EVENTS.TURN_RESULT, {
        playerId: payload.playerId,
        dice: result.dice,
        newPosition: result.newPosition,
      });

      const session = sm.getById(payload.sessionId);
      if (session) io.to(payload.sessionId).emit(EVENTS.GAME_STATE, session);

      // Todos da rodada jogaram e alguém chegou ao final — encerra a partida
      if (result.gameOver) {
        try {
          const gameResult = sm.finishGame(payload.sessionId);
          const finished: GameFinishedPayload = gameResult;
          io.to(payload.sessionId).emit(EVENTS.GAME_FINISHED, finished);
        } catch {
          // sessão já encerrada ou erro inesperado — não bloqueia o fluxo
        }
        return;
      }

      if (result.tileEffect) {
        // Casa especial — emite SOMENTE ao jogador da vez (não broadcast), igual ao quiz
        socket.emit(EVENTS.TILE_EFFECT, {
          sessionId: payload.sessionId,
          playerId: payload.playerId,
          card: result.tileEffect,
        });
      } else if (result.quiz) {
        // Casa de quiz — emite pergunta SOMENTE ao jogador da vez (não broadcast)
        socket.emit(EVENTS.QUIZ_QUESTION, {
          sessionId: payload.sessionId,
          playerId: payload.playerId,
          question: result.quiz,
          timeoutSeconds: session?.quizConfig.timeoutSeconds ?? 30,
        });
      } else {
        io.to(payload.sessionId).emit(EVENTS.TURN_CHANGED, { playerId: result.nextPlayerId });
      }
    } catch (e) {
      const msg = (e as Error).message;
      const code: RoomErrorPayload['code'] =
        msg === 'NOT_YOUR_TURN' ? 'NOT_YOUR_TURN' : 'ROOM_NOT_FOUND';
      socket.emit(EVENTS.ROOM_ERROR, { code, message: msg } satisfies RoomErrorPayload);
    }
  });

  socket.on(EVENTS.TILE_EFFECT_ACK, (payload: TileEffectAckPayload) => {
    try {
      const { nextPlayerId } = sm.applyTileEffect(payload.sessionId, payload.playerId);
      const session = sm.getById(payload.sessionId);
      if (session) io.to(payload.sessionId).emit(EVENTS.GAME_STATE, session);
      io.to(payload.sessionId).emit(EVENTS.TURN_CHANGED, { playerId: nextPlayerId });
    } catch (e) {
      const msg = (e as Error).message;
      const code: RoomErrorPayload['code'] =
        msg === 'NOT_YOUR_TURN' ? 'NOT_YOUR_TURN' : 'ROOM_NOT_FOUND';
      socket.emit(EVENTS.ROOM_ERROR, { code, message: msg } satisfies RoomErrorPayload);
    }
  });

  socket.on(EVENTS.QUIZ_ANSWER, (payload: QuizAnswerPayload) => {
    try {
      const latencyMs: number = socket.data.latencyMs ?? 0;
      const { result, nextPlayerId } = sm.submitAnswer(
        payload.sessionId,
        payload.playerId,
        payload.questionId,
        payload.selectedText,
        latencyMs,
      );

      io.to(payload.sessionId).emit(EVENTS.QUIZ_RESULT, {
        sessionId: payload.sessionId,
        playerId: payload.playerId,
        correct: result.correct,
        correctText: result.correctText,
      });

      const session = sm.getById(payload.sessionId);
      if (session) io.to(payload.sessionId).emit(EVENTS.GAME_STATE, session);

      io.to(payload.sessionId).emit(EVENTS.TURN_CHANGED, { playerId: nextPlayerId });
    } catch (e) {
      const msg = (e as Error).message;
      const code: RoomErrorPayload['code'] =
        msg === 'NOT_YOUR_TURN' ? 'NOT_YOUR_TURN' : 'ROOM_NOT_FOUND';
      socket.emit(EVENTS.ROOM_ERROR, { code, message: msg } satisfies RoomErrorPayload);
    }
  });
}
