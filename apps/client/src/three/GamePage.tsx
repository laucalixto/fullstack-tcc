import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { EVENTS } from '@safety-board/shared';
import type { GameSession, GameResultPayload } from '@safety-board/shared';

import { ThreeCanvas } from './ThreeCanvas';
import { ScoreHUD } from '../hud/ScoreHUD';
import { PlayerList } from '../hud/PlayerList';
import { InactivityTimer } from '../hud/InactivityTimer';
import { ChallengeModal } from '../lobby/ChallengeModal';
import { useGameStore } from '../stores/gameStore';
import { socket } from '../ws/socket';
import { gameBus } from './EventBus';
import type { TurnChangedPayload } from '@safety-board/shared';

interface QuizQuestionPayload {
  sessionId: string;
  playerId: string;
  question: {
    id: string;
    normId: string;
    text: string;
    options: string[];
  };
  timeoutSeconds: number;
}

export function GamePage() {
  const navigate = useNavigate();
  const session    = useGameStore((s) => s.session);
  const myPlayerId = useGameStore((s) => s.myPlayerId);
  const isMyTurn   = useGameStore((s) => s.isMyTurn);
  const setSession = useGameStore((s) => s.setSession);
  const setGameResult = useGameStore((s) => s.setGameResult);

  const [quizPayload, setQuizPayload] = useState<QuizQuestionPayload | null>(null);
  const [quizResult, setQuizResult] = useState<'correct' | 'incorrect' | undefined>();

  // Sincroniza o estado inicial ao montar: GAME_STATE pode ter chegado antes do GamePage existir
  useEffect(() => {
    const s = useGameStore.getState().session;
    if (!s) return;
    gameBus.emit('players:sync', s.players);
    const currentPlayer = s.players[s.currentPlayerIndex];
    if (currentPlayer) {
      gameBus.emit('active:player', { tileIndex: currentPlayer.position });
    }
  }, []);

  useEffect(() => {
    function onGameState(s: GameSession) {
      setSession(s);
      gameBus.emit('players:sync', s.players);
    }

    function onTurnChanged({ playerId }: TurnChangedPayload) {
      const session = useGameStore.getState().session;
      const player = session?.players.find((p) => p.id === playerId);
      if (player !== undefined) {
        gameBus.emit('active:player', { tileIndex: player.position });
      }
    }

    function onQuizQuestion(payload: QuizQuestionPayload) {
      setQuizResult(undefined);
      setQuizPayload(payload);
    }

    function onQuizResult(payload: { correct: boolean }) {
      setQuizResult(payload.correct ? 'correct' : 'incorrect');
      setTimeout(() => setQuizPayload(null), 2000);
    }

    function onGameFinished(result: GameResultPayload) {
      setGameResult(result);
      navigate('/podio');
    }

    socket.on(EVENTS.GAME_STATE,    onGameState);
    socket.on(EVENTS.TURN_CHANGED,  onTurnChanged);
    socket.on(EVENTS.QUIZ_QUESTION, onQuizQuestion);
    socket.on(EVENTS.QUIZ_RESULT,   onQuizResult);
    socket.on(EVENTS.GAME_FINISHED, onGameFinished);

    return () => {
      socket.off(EVENTS.GAME_STATE,    onGameState);
      socket.off(EVENTS.TURN_CHANGED,  onTurnChanged);
      socket.off(EVENTS.QUIZ_QUESTION, onQuizQuestion);
      socket.off(EVENTS.QUIZ_RESULT,   onQuizResult);
      socket.off(EVENTS.GAME_FINISHED, onGameFinished);
    };
  }, [navigate, setSession, setGameResult]);

  const handleRollDice = useCallback(() => {
    if (!session || !myPlayerId) return;
    socket.emit(EVENTS.TURN_ROLL, { sessionId: session.id, playerId: myPlayerId });
  }, [session, myPlayerId]);

  const handleAnswer = useCallback((selectedText: string) => {
    if (!quizPayload) return;
    socket.emit(EVENTS.QUIZ_ANSWER, {
      sessionId:    quizPayload.sessionId,
      playerId:     quizPayload.playerId,
      questionId:   quizPayload.question.id,
      selectedText,
    });
  }, [quizPayload]);

  const handleTimeout = useCallback(() => {
    if (!quizPayload) return;
    socket.emit(EVENTS.QUIZ_ANSWER, {
      sessionId:    quizPayload.sessionId,
      playerId:     quizPayload.playerId,
      questionId:   quizPayload.question.id,
      selectedText: '',
    });
  }, [quizPayload]);

  const handleInactivityTimeout = useCallback(() => {
    handleRollDice();
  }, [handleRollDice]);

  const players = session?.players ?? [];
  const currentPlayerIndex = session?.currentPlayerIndex ?? 0;

  return (
    <div style={{ position: 'relative', width: '100%', height: '100vh', overflow: 'hidden' }}>

      {/* Canvas Three.js — fundo */}
      <ThreeCanvas />

      {/* HUD overlay — não bloqueia interação com o canvas */}
      <div
        style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
      >
        <ScoreHUD
          players={players}
          currentPlayerIndex={currentPlayerIndex}
          myPlayerId={myPlayerId ?? undefined}
        />

        <PlayerList
          players={players}
          currentPlayerIndex={currentPlayerIndex}
          myPlayerId={myPlayerId ?? undefined}
        />

        {isMyTurn && (
          <InactivityTimer
            seconds={15}
            active={isMyTurn && !quizPayload}
            onTimeout={handleInactivityTimeout}
          />
        )}
      </div>

      {/* Botão de rolar dado — interativo, só no turno do jogador */}
      {isMyTurn && (
        <button
          data-testid="btn-roll-dice"
          onClick={handleRollDice}
          style={{
            position: 'absolute',
            bottom: '2rem',
            left: '50%',
            transform: 'translateX(-50%)',
            pointerEvents: 'auto',
            zIndex: 10,
          }}
          className="px-8 py-4 bg-primary text-white font-black uppercase tracking-widest rounded-xl shadow-2xl text-sm hover:scale-105 active:scale-95 transition-transform"
        >
          Rolar Dado
        </button>
      )}

      {/* Modal de quiz — z-index mais alto, bloqueia tudo */}
      {quizPayload && (
        <ChallengeModal
          open={true}
          question={quizPayload.question}
          onAnswer={handleAnswer}
          onTimeout={handleTimeout}
          timeoutSeconds={quizPayload.timeoutSeconds}
          result={quizResult}
        />
      )}
    </div>
  );
}
