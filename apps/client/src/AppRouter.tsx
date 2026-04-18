import { Routes, Route, useNavigate } from 'react-router-dom';
import { useCallback, useEffect, useState } from 'react';
import type { PlayerSignupData, NewSessionConfig } from '@safety-board/shared';

import { PinEntry } from './lobby/PinEntry';
import { CharacterSelect } from './lobby/CharacterSelect';
import { LobbyWaiting } from './lobby/LobbyWaiting';
import { TutorialOverlay } from './lobby/TutorialOverlay';
import { ThreeCanvas } from './three/ThreeCanvas';
import { PodiumResults } from './results/PodiumResults';
import { IndividualCard } from './results/IndividualCard';
import { PlayerSignup } from './results/PlayerSignup';
import { GlobalLeaderboard } from './results/GlobalLeaderboard';
import { ManagerLogin } from './manager/ManagerLogin';
import { ManagerDashboard } from './manager/ManagerDashboard';
import { NewSessionForm } from './manager/NewSessionForm';

import { useGameStore } from './stores/gameStore';
import { useManagerStore } from './stores/managerStore';
import { useSocket } from './hooks/useSocket';
import { socket } from './ws/socket';
import { EVENTS } from '@safety-board/shared';

// ─── Page containers ──────────────────────────────────────────────────────────

function PinEntryPage() {
  const navigate = useNavigate();
  const setMyPlayerId = useGameStore((s) => s.setMyPlayerId);
  const setSession = useGameStore((s) => s.setSession);

  const handleJoin = useCallback((pin: string) => {
    socket.emit(EVENTS.ROOM_JOIN, { pin, playerName: 'Jogador' });
    socket.once(EVENTS.GAME_STATE, (session) => {
      setSession(session);
      const myId = socket.id ?? '';
      setMyPlayerId(myId);
      navigate('/personagem');
    });
  }, [navigate, setMyPlayerId, setSession]);

  return <PinEntry onJoin={handleJoin} />;
}

function CharacterSelectPage() {
  const navigate = useNavigate();
  const setPendingPlayer = useGameStore((s) => s.setPendingPlayer);

  const handleConfirm = useCallback((firstName: string, lastName: string, avatarId: string) => {
    setPendingPlayer(`${firstName} ${lastName}`, avatarId);
    navigate('/lobby');
  }, [navigate, setPendingPlayer]);

  return <CharacterSelect onConfirm={handleConfirm} />;
}

function LobbyWaitingPage() {
  const navigate = useNavigate();
  const session = useGameStore((s) => s.session);
  const players = session?.players ?? [];
  const pin = session?.pin ?? '------';
  const sessionName = session?.name;
  const shareLink = session?.shareLink;

  useSocket(useCallback((updatedSession) => {
    if (updatedSession.state === 'ACTIVE') {
      navigate('/tutorial');
    }
  }, [navigate]));

  return (
    <LobbyWaiting
      players={players}
      pin={pin}
      sessionName={sessionName}
      shareLink={shareLink}
      onStart={() => navigate('/tutorial')}
      isFacilitator={false}
    />
  );
}

function TutorialPage() {
  const navigate = useNavigate();
  return <TutorialOverlay open onClose={() => navigate('/jogo')} />;
}

function GamePage() {
  return <ThreeCanvas />;
}

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
  const gameResult = useGameStore((s) => s.gameResult);

  return (
    <PodiumResults
      players={gameResult?.players ?? []}
      durationSeconds={gameResult?.durationSeconds ?? 0}
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
      shareLink={shareLink ?? undefined}
      isLoading={isLoading}
    />
  );
}

// ─── Router ───────────────────────────────────────────────────────────────────

export function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<PinEntryPage />} />
      <Route path="/personagem" element={<CharacterSelectPage />} />
      <Route path="/lobby" element={<LobbyWaitingPage />} />
      <Route path="/tutorial" element={<TutorialPage />} />
      <Route path="/jogo" element={<GamePage />} />
      <Route path="/podio" element={<PodiumPage />} />
      <Route path="/resultado" element={<IndividualResultPage />} />
      <Route path="/cadastrar" element={<PlayerSignupPage />} />
      <Route path="/ranking" element={<GlobalLeaderboardPage />} />
      <Route path="/manager" element={<ManagerLoginPage />} />
      <Route path="/manager/dashboard" element={<ManagerDashboardPage />} />
      <Route path="/manager/nova-sessao" element={<NewSessionFormPage />} />
    </Routes>
  );
}
