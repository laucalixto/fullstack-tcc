import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { EVENTS } from '@safety-board/shared';
import type { GameSession, GameResultPayload } from '@safety-board/shared';

import { ThreeCanvas } from './ThreeCanvas';
import { PlayerList } from '../hud/PlayerList';
import { InactivityTimer } from '../hud/InactivityTimer';
import { ChallengeModal } from '../lobby/ChallengeModal';
import { EffectCard } from '../lobby/EffectCard';
import { FirstPlayerDraw } from '../lobby/FirstPlayerDraw';
import { useGameStore } from '../stores/gameStore';
import { socket } from '../ws/socket';
import { gameBus } from './EventBus';
import type { TurnChangedPayload, TurnResultPayload, TileEffectDefinition } from '@safety-board/shared';
import { DICE_ZONE } from './dice/DicePhysics';
import { BOARD_PATH } from '@safety-board/shared';
import { audioManager } from '../audio/AudioManager';
import { cardAudioCategory } from '../audio/cardAudioCategory';
import { MuteButton } from '../audio/MuteButton';

export const QUIZ_OPEN_DELAY_MS = 2000;
export const EFFECT_OPEN_DELAY_MS = 2000;

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
  const [effectCardPayload, setEffectCardPayload] = useState<TileEffectDefinition | null>(null);

  // Quiz pendente e seu fallback controlados por refs — sem corrida com useEffect
  const quizPendingRef       = useRef<QuizQuestionPayload | null>(null);
  const quizFallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const quizResultTimerRef   = useRef<ReturnType<typeof setTimeout> | null>(null);

  // EffectCard pendente — mesmo padrão do quiz
  const effectPendingRef       = useRef<{ card: TileEffectDefinition; playerId: string } | null>(null);
  const effectFallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isDiceRolling, setIsDiceRolling] = useState(false);
  const [isPawnSettling, setIsPawnSettling] = useState(false);
  const [victoryPending, setVictoryPending] = useState(false);
  const [drawPayload, setDrawPayload] = useState<{ winnerPlayerId: string; durationMs: number } | null>(null);
  // Bloqueia turno/câmera/botão enquanto sorteio inicial está em curso.
  // Libera via onComplete do overlay ou fallback (se TURN_DRAW nunca chegar — ex: reconexão).
  const [drawBlocking, setDrawBlocking] = useState(true);

  // Dual-condition: isPawnSettling só limpa quando pawn:done E TURN_CHANGED ocorrerem
  const settlePawnDone    = useRef(false);
  const settleTurnChanged = useRef(false);
  const checkSettle = useCallback(() => {
    if (settlePawnDone.current && settleTurnChanged.current) {
      settlePawnDone.current    = false;
      settleTurnChanged.current = false;
      setIsPawnSettling(false);
    }
  }, []);

  // Sincroniza o estado inicial ao montar: GAME_STATE pode ter chegado antes do GamePage existir.
  // `players:sync` é seguro para rodar sempre (posiciona peões no tabuleiro).
  // `active:player` é atrasado até o sorteio (TURN_DRAW) terminar — evita mover câmera/turno
  // durante o overlay do sorteio. Fallback de 2.5s caso TURN_DRAW nunca chegue (ex: reconexão).
  useEffect(() => {
    const s = useGameStore.getState().session;
    if (!s) return;
    gameBus.emit('players:sync', s.players);
  }, []);

  // Fallback: libera o jogo se o TURN_DRAW não chegar dentro da janela esperada
  // (servidor atrasa 800ms + margem de segurança). Quando o overlay está rodando
  // (drawPayload setado), o onComplete cuida da liberação e desativamos o fallback
  // para não competir com ele.
  useEffect(() => {
    if (!drawBlocking || drawPayload) return;
    const fallback = setTimeout(() => setDrawBlocking(false), 2500);
    return () => clearTimeout(fallback);
  }, [drawBlocking, drawPayload]);

  // Emite active:player apenas quando o sorteio liberou.
  useEffect(() => {
    if (drawBlocking) return;
    const s = useGameStore.getState().session;
    if (!s) return;
    const currentPlayer = s.players[s.currentPlayerIndex];
    if (currentPlayer) {
      gameBus.emit('active:player', { tileIndex: currentPlayer.position, playerId: currentPlayer.id });
    }
  }, [drawBlocking]);

  // Trilha sonora do tabuleiro
  useEffect(() => {
    audioManager.startBoardTrack();
    return () => { audioManager.stopBoardTrack(); };
  }, []);

  // Timeout de segurança: abas em background pausam requestAnimationFrame,
  // então o evento dice:done (emitido pela física do dado) nunca é emitido e
  // isDiceRolling fica travado. Após 6s, forçamos o reset para o jogo não travar.
  //
  // Intencionalmente NÃO resetamos isDiceRolling no evento visibilitychange:
  // se a aba volta e o dado ainda está em voo, o rAF retoma e emite dice:done
  // naturalmente. Resetar aqui liberaria o botão prematuramente e permitiria
  // disparar um segundo TURN_ROLL, causando loop de lançamentos.
  const DICE_ROLL_SAFETY_MS = 6000;
  useEffect(() => {
    if (!isDiceRolling) return;
    const safety = setTimeout(() => setIsDiceRolling(false), DICE_ROLL_SAFETY_MS);
    return () => clearTimeout(safety);
  }, [isDiceRolling]);

  useEffect(() => {
    function onGameState(s: GameSession) {
      setSession(s);
      gameBus.emit('players:sync', s.players);
    }

    function onTurnChanged({ playerId }: TurnChangedPayload) {
      const session = useGameStore.getState().session;
      const player = session?.players.find((p) => p.id === playerId);
      if (player !== undefined) {
        gameBus.emit('active:player', { tileIndex: player.position, playerId });
      }
      // Sinaliza fim da jogada para não-roladores aplicarem o buffer de peões
      gameBus.emit('dice:rollEnd', {});
      // Dual-condition: TURN_CHANGED ocorreu — verifica se pawn:done já veio
      settleTurnChanged.current = true;
      checkSettle();
    }

    function onTurnResult({ dice }: TurnResultPayload) {
      // rollStart antes de result: throw() limpa pendingFace; setResult() define a face
      gameBus.emit('dice:rollStart', {});
      gameBus.emit('dice:result', { face: dice });
    }

    function onQuizQuestion(payload: QuizQuestionPayload) {
      if (payload.playerId !== useGameStore.getState().myPlayerId) return;
      audioManager.duckForQuiz();
      setQuizResult(undefined);
      quizPendingRef.current = payload;
      // Fallback de 7s: abre o quiz se pawn:done nunca disparar (ex: peão não moveu)
      if (quizFallbackTimerRef.current) clearTimeout(quizFallbackTimerRef.current);
      quizFallbackTimerRef.current = setTimeout(() => {
        if (quizPendingRef.current) {
          setQuizPayload(quizPendingRef.current);
          quizPendingRef.current = null;
        }
        quizFallbackTimerRef.current = null;
      }, 7000);
    }

    function onTileEffect(payload: { sessionId: string; playerId: string; card: TileEffectDefinition }) {
      if (payload.playerId !== useGameStore.getState().myPlayerId) return;
      effectPendingRef.current = { card: payload.card, playerId: payload.playerId };
      // Fallback de 7s: abre o card se pawn:done nunca disparar
      if (effectFallbackTimerRef.current) clearTimeout(effectFallbackTimerRef.current);
      effectFallbackTimerRef.current = setTimeout(() => {
        if (effectPendingRef.current) {
          setEffectCardPayload(effectPendingRef.current.card);
          effectPendingRef.current = null;
        }
        effectFallbackTimerRef.current = null;
      }, 7000);
    }

    function onQuizResult(payload: { correct: boolean }) {
      setQuizResult(payload.correct ? 'correct' : 'incorrect');
      if (quizResultTimerRef.current) clearTimeout(quizResultTimerRef.current);
      quizResultTimerRef.current = setTimeout(() => {
        setQuizPayload(null);
        audioManager.unduckFromQuiz();
        quizResultTimerRef.current = null;
      }, 2000);
    }

    function onGameFinished(result: GameResultPayload) {
      setGameResult(result);
      setVictoryPending(true); // will fire camera:victory after pawn:done
    }

    function onTurnDraw(payload: { sessionId: string; winnerPlayerId: string; durationMs: number }) {
      setDrawPayload({ winnerPlayerId: payload.winnerPlayerId, durationMs: payload.durationMs });
    }

    socket.on(EVENTS.GAME_STATE,    onGameState);
    socket.on(EVENTS.TURN_CHANGED,  onTurnChanged);
    socket.on(EVENTS.TURN_RESULT,   onTurnResult);
    socket.on(EVENTS.QUIZ_QUESTION, onQuizQuestion);
    socket.on(EVENTS.QUIZ_RESULT,   onQuizResult);
    socket.on(EVENTS.GAME_FINISHED, onGameFinished);
    socket.on(EVENTS.TILE_EFFECT,   onTileEffect);
    socket.on(EVENTS.TURN_DRAW,     onTurnDraw);

    const unsubDiceDone = gameBus.on<{ face: number }>('dice:done', () => {
      setIsDiceRolling(false);
    });

    // Marca início de settling: alguém rolou → peão vai se mover; reseta condições
    const unsubRollStart = gameBus.on('dice:rollStart', () => {
      settlePawnDone.current    = false;
      settleTurnChanged.current = false;
      setIsPawnSettling(true);
    });

    const unsubPawnDone = gameBus.on('pawn:done', () => {
      // Dual-condition: pawn:done ocorreu — verifica se TURN_CHANGED já veio
      settlePawnDone.current = true;
      checkSettle();
      // Quiz: cancela fallback e abre após delay
      if (quizFallbackTimerRef.current) {
        clearTimeout(quizFallbackTimerRef.current);
        quizFallbackTimerRef.current = null;
      }
      const pendingQuiz = quizPendingRef.current;
      if (pendingQuiz) {
        quizPendingRef.current = null;
        setTimeout(() => setQuizPayload(pendingQuiz), QUIZ_OPEN_DELAY_MS);
      }
      // EffectCard: cancela fallback e abre após delay
      if (effectFallbackTimerRef.current) {
        clearTimeout(effectFallbackTimerRef.current);
        effectFallbackTimerRef.current = null;
      }
      const pendingEffect = effectPendingRef.current;
      if (pendingEffect) {
        effectPendingRef.current = null;
        const category = cardAudioCategory(pendingEffect.card.type);
        audioManager.playCardStinger(category);
        setTimeout(() => setEffectCardPayload(pendingEffect.card), EFFECT_OPEN_DELAY_MS);
      }
      setVictoryPending((wasPending) => {
        if (wasPending) {
          const finishTile = BOARD_PATH[BOARD_PATH.length - 1];
          gameBus.emit('camera:victory', { position: finishTile });
          audioManager.startVictoryTrack();
          setTimeout(() => navigate('/podio'), 3500);
        }
        return false;
      });
    });

    return () => {
      socket.off(EVENTS.GAME_STATE,    onGameState);
      socket.off(EVENTS.TURN_CHANGED,  onTurnChanged);
      socket.off(EVENTS.TURN_RESULT,   onTurnResult);
      socket.off(EVENTS.QUIZ_QUESTION, onQuizQuestion);
      socket.off(EVENTS.QUIZ_RESULT,   onQuizResult);
      socket.off(EVENTS.GAME_FINISHED, onGameFinished);
      socket.off(EVENTS.TURN_DRAW,     onTurnDraw);
      unsubDiceDone();
      unsubRollStart();
      unsubPawnDone();
      if (quizFallbackTimerRef.current)  clearTimeout(quizFallbackTimerRef.current);
      if (effectFallbackTimerRef.current) clearTimeout(effectFallbackTimerRef.current);
      if (quizResultTimerRef.current)    { clearTimeout(quizResultTimerRef.current); audioManager.unduckFromQuiz(); }
      socket.off(EVENTS.TILE_EFFECT, onTileEffect);
    };
  }, [navigate, setSession, setGameResult]);

  const handleEffectCardClose = useCallback(() => {
    if (!effectCardPayload) return;
    audioManager.stopCardStinger();
    setEffectCardPayload(null);
    if (session && myPlayerId) {
      socket.emit(EVENTS.TILE_EFFECT_ACK, { sessionId: session.id, playerId: myPlayerId });
    }
  }, [effectCardPayload, session, myPlayerId]);

  const handleRollDice = useCallback(() => {
    if (!session || !myPlayerId || isDiceRolling || isPawnSettling || quizPayload || effectCardPayload || drawPayload || drawBlocking) return;
    audioManager.playDiceClick();
    audioManager.playDiceRoll();
    setIsDiceRolling(true);
    socket.emit(EVENTS.TURN_ROLL, { sessionId: session.id, playerId: myPlayerId });
    gameBus.emit('dice:throw', { position: DICE_ZONE });
  }, [session, myPlayerId, isDiceRolling, isPawnSettling, quizPayload, effectCardPayload, drawPayload, drawBlocking]);

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

  // Fallback: caso pawn:done nunca dispare (ex: peão sem movimento), assume-o após 5s
  // Ainda respeita TURN_CHANGED — não libera enquanto quiz do adversário estiver ativo
  useEffect(() => {
    if (!isPawnSettling) return;
    const timer = setTimeout(() => {
      settlePawnDone.current = true;
      checkSettle();
    }, 5000);
    return () => clearTimeout(timer);
  }, [isPawnSettling, checkSettle]);

  // Fallback: trigger victory camera after 3s if pawn:done never fires
  useEffect(() => {
    if (!victoryPending) return;
    const timer = setTimeout(() => {
      setVictoryPending(false);
      const finishTile = BOARD_PATH[BOARD_PATH.length - 1];
      gameBus.emit('camera:victory', { position: finishTile });
      audioManager.startVictoryTrack();
      setTimeout(() => navigate('/podio'), 3500);
    }, 3000);
    return () => clearTimeout(timer);
  }, [victoryPending, navigate]);

  const handleInactivityTimeout = useCallback(() => {
    handleRollDice();
  }, [handleRollDice]);

  const players = session?.players ?? [];
  const currentPlayerIndex = session?.currentPlayerIndex ?? 0;

  return (
    <div style={{ position: 'relative', width: '100%', height: '100vh', overflow: 'hidden' }}>

      {/* Canvas Three.js — fundo */}
      <ThreeCanvas />

      {/* ── HUD overlay ── */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>

        {/* MuteButton — superior direito */}
        <div className="absolute top-6 right-8 z-40" style={{ pointerEvents: 'auto' }}>
          <MuteButton />
        </div>

        {/* Left panel — "Equipe na Sessão" glass-card */}
        <div
          className="absolute left-6 top-6 z-30 w-60"
          style={{ pointerEvents: 'none' }}
        >
          <div className="bg-stone-950/75 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-2xl">
            <h4 className="text-[9px] font-black uppercase tracking-widest text-white/40 mb-3 px-1">
              Equipe na Sessão
            </h4>
            <PlayerList
              players={players}
              currentPlayerIndex={currentPlayerIndex}
              myPlayerId={myPlayerId ?? undefined}
            />
          </div>
        </div>

        {/* Inactivity timer */}
        {isMyTurn && !drawBlocking && !drawPayload && (
          <InactivityTimer
            seconds={15}
            active={isMyTurn && !quizPayload && !effectCardPayload && !isPawnSettling}
            onTimeout={handleInactivityTimeout}
          />
        )}
      </div>

      {/* Bottom-center: botão dado — estilo reference (círculo grande) */}
      {isMyTurn && !drawBlocking && !drawPayload && (
        <div
          className="absolute bottom-10 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-4"
          style={{ pointerEvents: 'auto' }}
        >
          <div className="relative group">
            <div className="absolute -inset-6 bg-primary/20 rounded-full blur-2xl group-hover:bg-primary/40 transition-all animate-pulse" />
            <button
              data-testid="btn-roll-dice"
              onClick={handleRollDice}
              disabled={isDiceRolling || isPawnSettling || !!quizPayload || !!effectCardPayload}
              className="relative h-32 w-32 rounded-full bg-primary shadow-2xl flex flex-col items-center justify-center text-white border-4 border-white/30 active:scale-95 hover:scale-105 transition-transform disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100"
            >
              <span className="text-5xl mb-1">🎲</span>
              <span className="font-black text-xs uppercase tracking-widest">
                {isDiceRolling ? 'Rolando...' : 'Lançar'}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* Effect Card — casa especial */}
      {effectCardPayload && (
        <EffectCard
          open={true}
          card={effectCardPayload}
          onClose={handleEffectCardClose}
        />
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

      {/* Sorteio do primeiro jogador — aparece após GAME_BEGIN */}
      {drawPayload && session && (
        <FirstPlayerDraw
          players={session.players.map((p) => ({ id: p.id, name: p.name }))}
          winnerPlayerId={drawPayload.winnerPlayerId}
          durationMs={drawPayload.durationMs}
          onComplete={() => { setDrawPayload(null); setDrawBlocking(false); }}
        />
      )}
    </div>
  );
}
