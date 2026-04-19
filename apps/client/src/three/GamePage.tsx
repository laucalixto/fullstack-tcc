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
import type { TurnChangedPayload, TurnResultPayload } from '@safety-board/shared';
import { DICE_ZONE } from './dice/DicePhysics';
import { BOARD_PATH } from '@safety-board/shared';

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
  const [isDiceRolling, setIsDiceRolling] = useState(false);

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

    function onTurnResult({ dice }: TurnResultPayload) {
      gameBus.emit('dice:result', { face: dice });
    }

    function onQuizQuestion(payload: QuizQuestionPayload) {
      // Ignorar se a pergunta não é para mim (defesa extra — servidor já filtra)
      if (payload.playerId !== useGameStore.getState().myPlayerId) return;
      setQuizResult(undefined);
      setQuizPayload(payload);
    }

    function onQuizResult(payload: { correct: boolean }) {
      setQuizResult(payload.correct ? 'correct' : 'incorrect');
      setTimeout(() => setQuizPayload(null), 2000);
    }

    function onGameFinished(result: GameResultPayload) {
      setGameResult(result);
      // Câmera cinematográfica sobre o tile de chegada antes de navegar ao pódio
      const finishTile = BOARD_PATH[BOARD_PATH.length - 1];
      gameBus.emit('camera:victory', { position: finishTile });
      setTimeout(() => navigate('/podio'), 3500);
    }

    socket.on(EVENTS.GAME_STATE,    onGameState);
    socket.on(EVENTS.TURN_CHANGED,  onTurnChanged);
    socket.on(EVENTS.TURN_RESULT,   onTurnResult);
    socket.on(EVENTS.QUIZ_QUESTION, onQuizQuestion);
    socket.on(EVENTS.QUIZ_RESULT,   onQuizResult);
    socket.on(EVENTS.GAME_FINISHED, onGameFinished);

    const unsubDiceDone = gameBus.on<{ face: number }>('dice:done', () => {
      setIsDiceRolling(false);
    });

    return () => {
      socket.off(EVENTS.GAME_STATE,    onGameState);
      socket.off(EVENTS.TURN_CHANGED,  onTurnChanged);
      socket.off(EVENTS.TURN_RESULT,   onTurnResult);
      socket.off(EVENTS.QUIZ_QUESTION, onQuizQuestion);
      socket.off(EVENTS.QUIZ_RESULT,   onQuizResult);
      socket.off(EVENTS.GAME_FINISHED, onGameFinished);
      unsubDiceDone();
    };
  }, [navigate, setSession, setGameResult]);

  const handleRollDice = useCallback(() => {
    if (!session || !myPlayerId || isDiceRolling) return;
    setIsDiceRolling(true);
    socket.emit(EVENTS.TURN_ROLL, { sessionId: session.id, playerId: myPlayerId });
    gameBus.emit('dice:throw', { position: DICE_ZONE });
  }, [session, myPlayerId, isDiceRolling]);

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
          disabled={isDiceRolling}
          style={{
            position: 'absolute',
            bottom: '2rem',
            left: '50%',
            transform: 'translateX(-50%)',
            pointerEvents: 'auto',
            zIndex: 10,
          }}
          className="px-8 py-4 bg-primary text-white font-black uppercase tracking-widest rounded-xl shadow-2xl text-sm hover:scale-105 active:scale-95 transition-transform disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100"
        >
          {isDiceRolling ? 'Rolando...' : 'Rolar Dado'}
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
