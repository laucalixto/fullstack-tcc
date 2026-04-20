import { Routes, Route, useNavigate } from 'react-router-dom';
import { useCallback, useEffect, useState } from 'react';
import type { PlayerSignupData, NewSessionConfig, RoomErrorPayload, GameStartingPayload, RoomJoinedPayload } from '@safety-board/shared';

import { ProtectedRoute } from './components/ProtectedRoute';
import { GameGuard } from './components/GameGuard';
import { PinJoinPage } from './lobby/PinJoinPage';

import { PinEntry } from './lobby/PinEntry';
import { CharacterSelect } from './lobby/CharacterSelect';
import { LobbyWaiting } from './lobby/LobbyWaiting';
import { GameLoading } from './lobby/GameLoading';
import { TutorialOverlay } from './lobby/TutorialOverlay';
import { ThreeCanvas } from './three/ThreeCanvas';
import { GamePage } from './three/GamePage';
import { PodiumResults } from './results/PodiumResults';
import { IndividualCard } from './results/IndividualCard';
import { PlayerSignup } from './results/PlayerSignup';
import { GlobalLeaderboard } from './results/GlobalLeaderboard';
import { ManagerLogin } from './manager/ManagerLogin';
import { ManagerDashboard } from './manager/ManagerDashboard';
import { NewSessionForm } from './manager/NewSessionForm';
import { audioManager } from './audio/AudioManager';
import { MuteButton } from './audio/MuteButton';

import { useGameStore } from './stores/gameStore';
import { useManagerStore } from './stores/managerStore';
import { useSocket } from './hooks/useSocket';
import { socket } from './ws/socket';
import { EVENTS } from '@safety-board/shared';

// ─── Page containers ──────────────────────────────────────────────────────────

const ROOM_ERROR_MESSAGES: Record<RoomErrorPayload['code'], string> = {
  ROOM_FULL:            'Sala cheia.',
  ROOM_NOT_FOUND:       'PIN inválido ou sessão encerrada.',
  GAME_ALREADY_STARTED: 'Partida em andamento.',
  NOT_YOUR_TURN:        'Não é o seu turno.',
};

function PinEntryPage() {
  const navigate = useNavigate();
  const setMyPlayerId = useGameStore((s) => s.setMyPlayerId);
  const setSession = useGameStore((s) => s.setSession);
  const [roomError, setRoomError] = useState<string | undefined>();

  useEffect(() => {
    audioManager.startLobbyTrack();
  }, []);

  const handleJoin = useCallback((pin: string) => {
    setRoomError(undefined);
    socket.emit(EVENTS.ROOM_JOIN, { pin, playerName: 'Jogador' });

    function onJoined({ playerId }: RoomJoinedPayload) {
      setMyPlayerId(playerId);
      socket.off(EVENTS.ROOM_ERROR, onError);
    }
    function onState(session: Parameters<typeof setSession>[0]) {
      setSession(session);
      navigate('/personagem');
      socket.off(EVENTS.ROOM_ERROR, onError);
    }
    function onError(payload: RoomErrorPayload) {
      setRoomError(ROOM_ERROR_MESSAGES[payload.code] ?? 'Erro ao entrar na sala.');
      socket.off(EVENTS.ROOM_JOINED, onJoined);
      socket.off(EVENTS.GAME_STATE, onState);
    }

    socket.once(EVENTS.ROOM_JOINED, onJoined);
    socket.once(EVENTS.GAME_STATE, onState);
    socket.once(EVENTS.ROOM_ERROR, onError);
  }, [navigate, setMyPlayerId, setSession]);

  return (
    <>
      <div className="fixed top-6 right-8 z-50">
        <MuteButton />
      </div>
      <PinEntry
        onJoin={handleJoin}
        error={roomError}
        onPinChange={() => setRoomError(undefined)}
      />
    </>
  );
}

function CharacterSelectPage() {
  const navigate         = useNavigate();
  const session          = useGameStore((s) => s.session);
  const myPlayerId       = useGameStore((s) => s.myPlayerId);
  const setSession       = useGameStore((s) => s.setSession);
  const setPendingPlayer = useGameStore((s) => s.setPendingPlayer);

  // Mantém sessão sincronizada enquanto o jogador escolhe personagem.
  // Sem isso, updates de lobbyReadyPlayers e GAME_STATE chegam sem listener
  // e o jogador chega ao lobby com dados stale.
  useSocket(useCallback((updatedSession) => {
    if (updatedSession.id !== session?.id) return;
    setSession(updatedSession);
    // Se o jogo já iniciou enquanto estava nessa tela, pula direto ao tutorial
    if (updatedSession.state === 'ACTIVE') {
      navigate('/tutorial');
    }
  }, [session?.id, setSession, navigate]));

  const handleConfirm = useCallback((firstName: string, lastName: string, avatarId: string) => {
    const fullName = `${firstName} ${lastName}`;
    setPendingPlayer(fullName, avatarId);
    if (session?.id && myPlayerId) {
      socket.emit(EVENTS.PLAYER_RENAME, { sessionId: session.id, playerId: myPlayerId, name: fullName });
    }
    navigate('/lobby');
  }, [navigate, session?.id, myPlayerId, setPendingPlayer]);

  return (
    <>
      <div className="fixed top-6 right-8 z-50">
        <MuteButton />
      </div>
      <CharacterSelect onConfirm={handleConfirm} />
    </>
  );
}

function LobbyWaitingPage() {
  const navigate    = useNavigate();
  const session     = useGameStore((s) => s.session);
  const myPlayerId  = useGameStore((s) => s.myPlayerId);
  const setSession  = useGameStore((s) => s.setSession);
  const [autoStartAt, setAutoStartAt] = useState<number | undefined>();

  const pin         = session?.pin ?? '------';
  const sessionName = session?.name;
  const maxPlayers  = session?.maxPlayers;
  // Mostra apenas quem chegou ao lobby (lobbyReadyPlayers); fallback = todos (compatibilidade)
  const lobbyReady  = session?.lobbyReadyPlayers;
  const players     = lobbyReady !== undefined
    ? (session?.players ?? []).filter((p) => lobbyReady.includes(p.id))
    : (session?.players ?? []);

  // Se o jogo já iniciou (edge case: GAME_STATE ACTIVE chegou durante CharacterSelect
  // e navegação para /lobby aconteceu antes do redirect — pula direto ao tutorial)
  useEffect(() => {
    if (session?.state === 'ACTIVE') navigate('/tutorial');
  }, [session?.state, navigate]);

  // Sinaliza ao servidor que chegou ao lobby
  useEffect(() => {
    if (!session?.id || !myPlayerId) return;
    if (session.state !== 'WAITING') return; // não emitir se jogo já iniciou
    socket.emit(EVENTS.LOBBY_READY, { sessionId: session.id, playerId: myPlayerId });
  }, [session?.id, session?.state, myPlayerId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Recebe confirmação do servidor de que todos estão no lobby → exibe countdown
  useEffect(() => {
    const sessionId = session?.id;
    function onGameStarting(payload: GameStartingPayload) {
      if (payload.sessionId !== sessionId) return;
      setAutoStartAt(payload.autoStartAt);
    }
    socket.on(EVENTS.GAME_STARTING, onGameStarting);
    return () => { socket.off(EVENTS.GAME_STARTING, onGameStarting); };
  }, [session?.id]);

  // Mantém a store sincronizada com todos os GAME_STATE recebidos no lobby
  // (P1 entra antes dos demais — sem isso, não veria os peões de P2–P4 no tabuleiro)
  useSocket(useCallback((updatedSession) => {
    if (updatedSession.id !== session?.id) return;
    setSession(updatedSession);
    if (updatedSession.state === 'ACTIVE') {
      navigate('/tutorial');
    }
  }, [navigate, session?.id, setSession]));

  return (
    <>
      <div className="fixed top-6 right-8 z-50">
        <MuteButton />
      </div>
      <LobbyWaiting
        players={players}
        pin={pin}
        sessionName={sessionName}
        maxPlayers={maxPlayers}
        autoStartAt={autoStartAt}
        onStart={() => {}}
        isFacilitator={false}
      />
    </>
  );
}

function TutorialPage() {
  const navigate = useNavigate();

  useEffect(() => {
    audioManager.stopLobbyTrack();
  }, []);

  return <TutorialOverlay open onClose={() => navigate('/carregando')} />;
}

function GameLoadingPage() {
  const navigate   = useNavigate();
  const session    = useGameStore((s) => s.session);
  const myPlayerId = useGameStore((s) => s.myPlayerId);

  // Sinaliza ao servidor que saiu do tutorial e está pronto para o tabuleiro
  useEffect(() => {
    if (!session?.id || !myPlayerId) return;
    socket.emit(EVENTS.PLAYER_GAME_READY, { sessionId: session.id, playerId: myPlayerId });
  }, [session?.id, myPlayerId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Navega ao tabuleiro quando todos estão prontos
  useEffect(() => {
    const sessionId = session?.id;
    function onGameBegin(payload: { sessionId: string }) {
      if (payload.sessionId !== sessionId) return;
      navigate('/jogo');
    }
    socket.on(EVENTS.GAME_BEGIN, onGameBegin);
    return () => { socket.off(EVENTS.GAME_BEGIN, onGameBegin); };
  }, [navigate, session?.id]);

  return <GameLoading />;
}

// GamePage agora em three/GamePage.tsx (HUD + modal + socket listeners)

const DEFAULT_PLAYER = {
  playerId: '',
  name: 'Jogador',
  score: 0,
  rank: 1 as const,
  finalPosition: 0,
  correctAnswers: 0,
  totalAnswers: 0,
};

function PodiumPage() {
  const navigate = useNavigate();
  const gameResult = useGameStore((s) => s.gameResult);
  const myPlayerId = useGameStore((s) => s.myPlayerId);

  return (
    <PodiumResults
      players={gameResult?.players ?? []}
      durationSeconds={gameResult?.durationSeconds ?? 0}
      myPlayerId={myPlayerId ?? undefined}
      onViewResults={() => navigate('/resultado')}
    />
  );
}

function IndividualResultPage() {
  const gameResult = useGameStore((s) => s.gameResult);
  const myPlayerId = useGameStore((s) => s.myPlayerId);

  const player = gameResult?.players.find((p) => p.playerId === myPlayerId) ?? DEFAULT_PLAYER;

  return <IndividualCard player={player} />;
}

function PlayerSignupPage() {
  const navigate = useNavigate();
  const gameResult = useGameStore((s) => s.gameResult);
  const [error, setError] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState(false);

  const handleSignup = useCallback(async (data: PlayerSignupData) => {
    setIsLoading(true);
    setError(undefined);
    try {
      const sessionScore = gameResult?.players.find((p) => p.playerId)?.score;
      const res = await fetch(
        `${import.meta.env.VITE_SERVER_URL ?? ''}/api/players/register`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...data, sessionScore }),
        },
      );
      if (res.status === 409) {
        setError('E-mail já cadastrado.');
        return;
      }
      if (!res.ok) throw new Error('Erro ao cadastrar.');
      navigate('/ranking');
    } catch {
      setError('Não foi possível conectar ao servidor.');
    } finally {
      setIsLoading(false);
    }
  }, [navigate, gameResult]);

  return <PlayerSignup onSignup={handleSignup} error={error} isLoading={isLoading} />;
}

function GlobalLeaderboardPage() {
  const myPlayerId = useGameStore((s) => s.myPlayerId);
  const entries = useGameStore((s) => s.leaderboardEntries);
  const setLeaderboardEntries = useGameStore((s) => s.setLeaderboardEntries);

  useEffect(() => {
    fetch(`${import.meta.env.VITE_SERVER_URL ?? ''}/api/leaderboard`)
      .then((r) => r.json())
      .then(setLeaderboardEntries)
      .catch(() => {/* silencioso — exibe lista atual */});
  }, [setLeaderboardEntries]);

  return (
    <GlobalLeaderboard
      entries={entries}
      currentPlayerId={myPlayerId ?? undefined}
    />
  );
}

function ManagerLoginPage() {
  const navigate = useNavigate();
  const setToken = useManagerStore((s) => s.setToken);
  const setError = useManagerStore((s) => s.setError);
  const error = useManagerStore((s) => s.error);
  const isLoading = useManagerStore((s) => s.isLoading);

  const handleLogin = useCallback(async ({ email, password }: { email: string; password: string }) => {
    useManagerStore.getState().setLoading(true);
    useManagerStore.getState().setError(null);
    try {
      const res = await fetch(`${import.meta.env.VITE_SERVER_URL ?? ''}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) throw new Error('Credenciais inválidas');
      const { token } = await res.json();
      setToken(token);
      navigate('/manager/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao autenticar');
    } finally {
      useManagerStore.getState().setLoading(false);
    }
  }, [navigate, setToken, setError]);

  return <ManagerLogin onLogin={handleLogin} error={error ?? undefined} isLoading={isLoading} />;
}

function ManagerDashboardPage() {
  const navigate = useNavigate();
  const token = useManagerStore((s) => s.token);
  const stats = useManagerStore((s) => s.stats);
  const recentSessions = useManagerStore((s) => s.recentSessions);
  const setStats = useManagerStore((s) => s.setStats);
  const setRecentSessions = useManagerStore((s) => s.setRecentSessions);

  const SERVER = import.meta.env.VITE_SERVER_URL ?? '';

  useEffect(() => {
    if (!token) return;
    const headers = { Authorization: `Bearer ${token}` };
    fetch(`${SERVER}/api/manager/stats`, { headers })
      .then((r) => r.json())
      .then(setStats)
      .catch(() => {});
    fetch(`${SERVER}/api/manager/sessions`, { headers })
      .then((r) => r.json())
      .then(setRecentSessions)
      .catch(() => {});
  }, [token, SERVER, setStats, setRecentSessions]);

  const defaultStats = { totalPlayers: 0, avgScore: 0, completionRate: 0, activeSessions: 0 };

  return (
    <ManagerDashboard
      stats={stats ?? defaultStats}
      recentSessions={recentSessions}
      onNewSession={() => navigate('/manager/nova-sessao')}
    />
  );
}

function NewSessionFormPage() {
  const generatedPin = useManagerStore((s) => s.generatedPin);
  const shareLink = useManagerStore((s) => s.shareLink);
  const isLoading = useManagerStore((s) => s.isLoading);

  // Constrói URL completa usando a origem atual — funciona em localhost e produção
  const fullShareLink = shareLink
    ? `${window.location.origin}${shareLink}`
    : undefined;

  const handleCreate = useCallback(async (config: NewSessionConfig) => {
    useManagerStore.getState().setLoading(true);
    try {
      socket.emit(EVENTS.ROOM_CREATE, config);
      socket.once(EVENTS.GAME_STATE, (session) => {
        useManagerStore.getState().setNewSession(session.pin, session.shareLink);
        useManagerStore.getState().setLoading(false);
      });
    } catch {
      useManagerStore.getState().setLoading(false);
    }
  }, []);

  return (
    <NewSessionForm
      onCreateSession={handleCreate}
      generatedPin={generatedPin ?? undefined}
      shareLink={fullShareLink}
      isLoading={isLoading}
    />
  );
}

// ─── Router ───────────────────────────────────────────────────────────────────

export function AppRouter() {
  return (
    <Routes>
      {/* Acesso público */}
      <Route path="/"          element={<PinEntryPage />} />
      <Route path="/sala/:pin" element={<PinJoinPage />} />
      <Route path="/manager"   element={<ManagerLoginPage />} />
      <Route path="/ranking"   element={<GlobalLeaderboardPage />} />

      {/* Requer sessão ativa na store */}
      <Route path="/personagem" element={<GameGuard><CharacterSelectPage /></GameGuard>} />
      <Route path="/lobby"      element={<GameGuard><LobbyWaitingPage /></GameGuard>} />
      <Route path="/tutorial"   element={<GameGuard><TutorialPage /></GameGuard>} />
      <Route path="/carregando" element={<GameGuard><GameLoadingPage /></GameGuard>} />
      <Route path="/jogo"       element={<GameGuard><GamePage /></GameGuard>} />
      <Route path="/podio"      element={<GameGuard><PodiumPage /></GameGuard>} />
      <Route path="/resultado"  element={<GameGuard><IndividualResultPage /></GameGuard>} />
      <Route path="/cadastrar"  element={<GameGuard><PlayerSignupPage /></GameGuard>} />

      {/* Área do manager — requer JWT */}
      <Route path="/manager/dashboard"   element={<ProtectedRoute><ManagerDashboardPage /></ProtectedRoute>} />
      <Route path="/manager/nova-sessao" element={<ProtectedRoute><NewSessionFormPage /></ProtectedRoute>} />
    </Routes>
  );
}
