import { Routes, Route, useNavigate } from 'react-router-dom';
import { useCallback, useEffect, useState } from 'react';
import type { PlayerSignupData, NewSessionConfig, RoomErrorPayload, GameStartingPayload, RoomJoinedPayload, ManagedPlayer, QuizQuestionFull, QuizQuestionPayload, SessionDetail } from '@safety-board/shared';
import { useParams } from 'react-router-dom';

import { ProtectedRoute } from './components/ProtectedRoute';
import { GameGuard } from './components/GameGuard';
import { PlayerGuard } from './components/PlayerGuard';
import { PinJoinPage } from './lobby/PinJoinPage';

import { PinEntry } from './lobby/PinEntry';
import { CharacterSelect } from './lobby/CharacterSelect';
import { LobbyWaiting } from './lobby/LobbyWaiting';
import { GameLoading } from './lobby/GameLoading';
import { TutorialOverlay } from './lobby/TutorialOverlay';
import { ThreeCanvas } from './three/ThreeCanvas';
import { GamePage } from './three/GamePage';
import { BoardPreview } from './three/BoardPreview';
import { PodiumResults } from './results/PodiumResults';
import { IndividualCard } from './results/IndividualCard';
import { PlayerSignup } from './results/PlayerSignup';
import { GlobalLeaderboard } from './results/GlobalLeaderboard';
import { ManagerLogin } from './manager/ManagerLogin';
import { ManagerDashboard } from './manager/ManagerDashboard';
import { ManagerLayout } from './manager/ManagerLayout';
import { ManagerPlayersPage } from './manager/ManagerPlayersPage';
import { ManagerSessionsPage } from './manager/ManagerSessionsPage';
import { ManagerSessionDetailPage } from './manager/ManagerSessionDetailPage';
import { ManagerReportsPage } from './manager/ManagerReportsPage';
import { ManagerContentPage } from './manager/ManagerContentPage';
import { ManagerProfilePage } from './manager/ManagerProfilePage';
import { ManagerSupportPage } from './manager/ManagerSupportPage';
import { NewSessionForm } from './manager/NewSessionForm';
import { audioManager } from './audio/AudioManager';
import { MuteButton } from './audio/MuteButton';

import { useGameStore } from './stores/gameStore';
import { useAudioStore } from './stores/audioStore';
import { useManagerStore } from './stores/managerStore';
import { usePlayerStore } from './stores/playerStore';
import { PlayerLogin } from './player/PlayerLogin';
import { PlayerDashboard } from './player/PlayerDashboard';
import { PlayerHistory } from './player/PlayerHistory';
import { PlayerProfile } from './player/PlayerProfile';
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
    audioManager.syncMuted(useAudioStore.getState().muted);
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
        onPlayerLogin={() => navigate('/jogador')}
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

  const playerName = usePlayerStore((s) => s.name);
  const [playerFirst, playerLast] = playerName
    ? [playerName.split(' ')[0], playerName.split(' ').slice(1).join(' ')]
    : ['', ''];

  return (
    <>
      <div className="fixed top-6 right-8 z-50">
        <MuteButton />
      </div>
      <CharacterSelect
        onConfirm={handleConfirm}
        initialFirstName={playerFirst}
        initialLastName={playerLast}
      />
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
  const navigate = useNavigate();
  const gameResult = useGameStore((s) => s.gameResult);
  const myPlayerId = useGameStore((s) => s.myPlayerId);
  const isAuthenticated = usePlayerStore((s) => s.isAuthenticated);

  const player = gameResult?.players.find((p) => p.playerId === myPlayerId) ?? DEFAULT_PLAYER;

  return (
    <IndividualCard
      player={player}
      onViewDashboard={isAuthenticated() ? () => navigate('/jogador/dashboard') : undefined}
      onRegister={isAuthenticated() ? undefined : () => navigate('/cadastrar')}
    />
  );
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
  const navigate = useNavigate();
  const myPlayerId = useGameStore((s) => s.myPlayerId);
  const entries = useGameStore((s) => s.leaderboardEntries);
  const setLeaderboardEntries = useGameStore((s) => s.setLeaderboardEntries);
  const playerName = usePlayerStore((s) => s.name);
  const clearPlayer = usePlayerStore((s) => s.clearPlayer);
  const playerToken = usePlayerStore((s) => s.token);

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
      playerName={playerToken && playerName ? playerName : undefined}
      onViewDashboard={() => navigate('/jogador/dashboard')}
      onViewHistory={() => navigate('/jogador/historico')}
      onEditProfile={() => navigate('/jogador/perfil')}
      onLogout={playerToken ? () => { clearPlayer(); navigate('/jogador'); } : undefined}
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

function useManagerNav() {
  const navigate = useNavigate();
  const clearToken = useManagerStore((s) => s.clearToken);
  const managerName = useManagerStore((s) => s.managerName ?? 'Gestor SST');

  function onNavigate(page: string) {
    if (page === 'dashboard') navigate('/manager/dashboard');
    else if (page === 'sessoes') navigate('/manager/sessoes');
    else if (page === 'relatorios') navigate('/manager/relatorios');
    else if (page === 'conteudos') navigate('/manager/conteudos');
    else if (page === 'jogadores') navigate('/manager/jogadores');
    else if (page === 'ranking') navigate('/manager/ranking');
    else if (page === 'perfil') navigate('/manager/perfil');
    else if (page === 'suporte') navigate('/manager/suporte');
  }

  function onLogout() {
    clearToken?.();
    navigate('/manager');
  }

  return { managerName, onNavigate, onLogout };
}

function ManagerDashboardPage() {
  const navigate = useNavigate();
  const { managerName, onNavigate, onLogout } = useManagerNav();
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
    <ManagerLayout activePage="dashboard" managerName={managerName} onNavigate={onNavigate} onLogout={onLogout}>
      <ManagerDashboard
        stats={stats ?? defaultStats}
        recentSessions={recentSessions}
        onNewSession={() => navigate('/manager/nova-sessao')}
        onNavigateToSessions={() => navigate('/manager/sessoes')}
        onNavigateToReports={() => navigate('/manager/relatorios')}
      />
    </ManagerLayout>
  );
}

function NewSessionFormPage() {
  const { managerName, onNavigate, onLogout } = useManagerNav();
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
      socket.emit(EVENTS.ROOM_CREATE, {
        facilitatorId: 'manager',
        maxPlayers: config.maxPlayers,
        quizConfig: { activeNormIds: ['NR-06', 'NR-10', 'NR-12', 'NR-35'], timeoutSeconds: 30, difficulty: config.difficulty },
      });
      socket.once(EVENTS.GAME_STATE, (session) => {
        useManagerStore.getState().setNewSession(session.pin, session.shareLink);
        useManagerStore.getState().setLoading(false);
      });
    } catch {
      useManagerStore.getState().setLoading(false);
    }
  }, []);

  return (
    <ManagerLayout activePage="dashboard" managerName={managerName} onNavigate={onNavigate} onLogout={onLogout}>
      <NewSessionForm
        onCreateSession={handleCreate}
        generatedPin={generatedPin ?? undefined}
        shareLink={fullShareLink}
        isLoading={isLoading}
      />
    </ManagerLayout>
  );
}

// ─── Manager sub-pages ───────────────────────────────────────────────────────

function ManagerSessionsListPage() {
  const { managerName, onNavigate, onLogout } = useManagerNav();
  const token = useManagerStore((s) => s.token);
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<import('@safety-board/shared').SessionSummary[]>([]);

  useEffect(() => {
    if (!token) return;
    fetch(`${import.meta.env.VITE_SERVER_URL ?? ''}/api/manager/sessions`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then((r) => r.json()).then(setSessions).catch(() => {});
  }, [token]);

  return (
    <ManagerLayout activePage="sessoes" managerName={managerName} onNavigate={onNavigate} onLogout={onLogout}>
      <ManagerSessionsPage sessions={sessions} onViewDetail={(id) => navigate(`/manager/sessoes/${id}`)} />
    </ManagerLayout>
  );
}

function ManagerSessionDetailWrapper() {
  const { id } = useParams<{ id: string }>();
  const { managerName, onNavigate, onLogout } = useManagerNav();
  const token = useManagerStore((s) => s.token);
  const navigate = useNavigate();
  const [detail, setDetail] = useState<SessionDetail | null>(null);

  useEffect(() => {
    if (!token || !id) return;
    fetch(`${import.meta.env.VITE_SERVER_URL ?? ''}/api/manager/sessions/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then((r) => r.json()).then(setDetail).catch(() => {});
  }, [token, id]);

  return (
    <ManagerLayout activePage="sessoes" managerName={managerName} onNavigate={onNavigate} onLogout={onLogout}>
      {detail
        ? <ManagerSessionDetailPage detail={detail} onBack={() => navigate('/manager/sessoes')} />
        : <div className="p-12 text-center text-on-surface/40 text-sm">Carregando...</div>
      }
    </ManagerLayout>
  );
}

function ManagerReportsPageWrapper() {
  const { managerName, onNavigate, onLogout } = useManagerNav();
  const token = useManagerStore((s) => s.token);
  const [isExporting, setIsExporting] = useState(false);

  async function handleExport() {
    if (!token) return;
    setIsExporting(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_SERVER_URL ?? ''}/api/manager/sessions/export`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'sessions.csv';
      a.click();
      URL.revokeObjectURL(url);
    } catch { /* silencioso */ }
    finally { setIsExporting(false); }
  }

  return (
    <ManagerLayout activePage="relatorios" managerName={managerName} onNavigate={onNavigate} onLogout={onLogout}>
      <ManagerReportsPage onExportCSV={handleExport} isExporting={isExporting} />
    </ManagerLayout>
  );
}

function ManagerContentPageWrapper() {
  const { managerName, onNavigate, onLogout } = useManagerNav();
  const token = useManagerStore((s) => s.token);
  const [norms, setNorms] = useState<Array<{ normId: string; title: string }>>([]);
  const [questions, setQuestions] = useState<QuizQuestionFull[]>([]);
  const SERVER_URL = import.meta.env.VITE_SERVER_URL ?? '';

  useEffect(() => {
    fetch(`${SERVER_URL}/api/questions/norms`).then((r) => r.json()).then(setNorms).catch(() => {});
    fetch(`${SERVER_URL}/api/questions`).then((r) => r.json()).then(setQuestions).catch(() => {});
  }, [SERVER_URL]);

  async function handleSave(id: string, patch: QuizQuestionPayload) {
    if (!token) return;
    const res = await fetch(`${SERVER_URL}/api/questions/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(patch),
    });
    if (res.ok) {
      const updated = await res.json();
      setQuestions((prev) => prev.map((q) => (q.id === id ? { ...q, ...updated } : q)));
    }
  }

  async function handleAdd(payload: QuizQuestionPayload) {
    if (!token) return;
    const res = await fetch(`${SERVER_URL}/api/questions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      const created = await res.json();
      setQuestions((prev) => [...prev, created]);
    }
  }

  async function handleDelete(id: string) {
    if (!token) return;
    await fetch(`${SERVER_URL}/api/questions/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    setQuestions((prev) => prev.filter((q) => q.id !== id));
  }

  async function handleAddNorm(normId: string, title: string) {
    if (!token) return;
    const res = await fetch(`${SERVER_URL}/api/questions/norms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ normId, title }),
    });
    if (res.ok) {
      const created = await res.json();
      setNorms((prev) => [...prev, created]);
    }
  }

  async function handleDeleteNorm(normId: string) {
    if (!token) return;
    const res = await fetch(`${SERVER_URL}/api/questions/norms/${normId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      setNorms((prev) => prev.filter((n) => n.normId !== normId));
      setQuestions((prev) => prev.filter((q) => q.normId !== normId));
    }
  }

  return (
    <ManagerLayout activePage="conteudos" managerName={managerName} onNavigate={onNavigate} onLogout={onLogout}>
      {norms.length > 0
        ? <ManagerContentPage norms={norms} questions={questions} onSaveQuestion={handleSave} onAddQuestion={handleAdd} onDeleteQuestion={handleDelete} onAddNorm={handleAddNorm} onDeleteNorm={handleDeleteNorm} />
        : <div className="p-12 text-center text-on-surface/40 text-sm">Carregando...</div>
      }
    </ManagerLayout>
  );
}

function ManagerPlayersPageWrapper() {
  const { managerName, onNavigate, onLogout } = useManagerNav();
  const token = useManagerStore((s) => s.token);
  const [players, setPlayers] = useState<ManagedPlayer[]>([]);
  const SERVER_URL = import.meta.env.VITE_SERVER_URL ?? '';

  useEffect(() => {
    if (!token) return;
    fetch(`${SERVER_URL}/api/manager/players`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then((r) => r.json()).then(setPlayers).catch(() => {});
  }, [token, SERVER_URL]);

  async function handleSave(playerId: string, patch: Partial<ManagedPlayer>) {
    if (!token) return;
    const res = await fetch(`${SERVER_URL}/api/manager/players/${playerId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(patch),
    });
    if (res.ok) {
      const updated = await res.json();
      setPlayers((prev) => prev.map((p) => (p.playerId === playerId ? { ...p, ...updated } : p)));
    }
  }

  return (
    <ManagerLayout activePage="jogadores" managerName={managerName} onNavigate={onNavigate} onLogout={onLogout}>
      <ManagerPlayersPage players={players} onSave={handleSave} />
    </ManagerLayout>
  );
}

const MEDAL: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };

function ManagerRankingPageWrapper() {
  const { managerName, onNavigate, onLogout } = useManagerNav();
  const entries = useGameStore((s) => s.leaderboardEntries);
  const setLeaderboardEntries = useGameStore((s) => s.setLeaderboardEntries);

  useEffect(() => {
    fetch(`${import.meta.env.VITE_SERVER_URL ?? ''}/api/leaderboard`)
      .then((r) => r.json()).then(setLeaderboardEntries).catch(() => {});
  }, [setLeaderboardEntries]);

  return (
    <ManagerLayout activePage="ranking" managerName={managerName} onNavigate={onNavigate} onLogout={onLogout}>
      <div className="px-6 md:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-extrabold tracking-tight text-on-surface">Ranking Global</h1>
          <p className="text-on-surface/60 text-sm mt-1">Desempenho de todos os participantes</p>
        </div>
        <div className="bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-low">
                  {['Posição', 'Colaborador', 'Unidade Industrial', 'Score Total'].map((h) => (
                    <th key={h} className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.1em] text-on-surface/50">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container">
                {entries.map((entry) => (
                  <tr key={entry.playerId} className="hover:bg-surface-bright transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-black text-on-surface">{String(entry.rank).padStart(2, '0')}</span>
                        {MEDAL[entry.rank] && <span>{MEDAL[entry.rank]}</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-black">
                          {entry.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-bold text-on-surface text-sm">{entry.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 rounded-full bg-surface-container-high text-on-surface/70 text-[10px] font-bold uppercase tracking-wider">
                        {entry.industrialUnit}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="text-lg font-black text-on-surface">{entry.totalScore}</span>
                    </td>
                  </tr>
                ))}
                {entries.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-on-surface/40 text-sm">
                      Nenhum jogador registrado ainda.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </ManagerLayout>
  );
}

function ManagerProfilePageWrapper() {
  const { managerName, onNavigate, onLogout } = useManagerNav();
  const token = useManagerStore((s) => s.token);
  const managerEmail = useManagerStore((s) => s.managerEmail ?? '');
  const [error, setError] = useState<string | undefined>();
  const [success, setSuccess] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState(false);

  async function handleSave({ name }: { name?: string }) {
    if (!token || !name) return;
    setIsLoading(true);
    try {
      await fetch(`${import.meta.env.VITE_SERVER_URL ?? ''}/api/auth/me`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name }),
      });
      setSuccess('Perfil atualizado com sucesso.');
      setError(undefined);
    } catch {
      setError('Erro ao salvar perfil.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <ManagerLayout activePage="perfil" managerName={managerName} onNavigate={onNavigate} onLogout={onLogout}>
      <ManagerProfilePage name={managerName} email={managerEmail} onSave={handleSave} isLoading={isLoading} error={error} success={success} />
    </ManagerLayout>
  );
}

function ManagerSupportPageWrapper() {
  const { managerName, onNavigate, onLogout } = useManagerNav();
  return (
    <ManagerLayout activePage="suporte" managerName={managerName} onNavigate={onNavigate} onLogout={onLogout}>
      <ManagerSupportPage />
    </ManagerLayout>
  );
}

// ─── Player pages ────────────────────────────────────────────────────────────

const SERVER = () => import.meta.env.VITE_SERVER_URL ?? '';

function PlayerLoginPage() {
  const navigate = useNavigate();
  const setPlayer = usePlayerStore((s) => s.setPlayer);
  const [error, setError] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = useCallback(async ({ email, password }: { email: string; password: string }) => {
    setIsLoading(true);
    setError(undefined);
    try {
      const res = await fetch(`${SERVER()}/api/players/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) { setError('Credenciais inválidas.'); return; }
      const data = await res.json();
      setPlayer(data);
      navigate('/jogador/dashboard');
    } catch {
      setError('Não foi possível conectar ao servidor.');
    } finally {
      setIsLoading(false);
    }
  }, [navigate, setPlayer]);

  return <PlayerLogin onLogin={handleLogin} error={error} isLoading={isLoading} />;
}

function PlayerDashboardPage() {
  const navigate = useNavigate();
  const playerStore = usePlayerStore();
  const clearPlayer = usePlayerStore((s) => s.clearPlayer);
  const setMyPlayerId = useGameStore((s) => s.setMyPlayerId);
  const setSession = useGameStore((s) => s.setSession);
  const [pinError, setPinError] = useState<string | undefined>();

  const handleJoinPin = useCallback((pin: string) => {
    setPinError(undefined);
    socket.emit(EVENTS.ROOM_JOIN, { pin, playerName: playerStore.name ?? 'Jogador' });

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
      setPinError(ROOM_ERROR_MESSAGES[payload.code] ?? 'Erro ao entrar na sala.');
      socket.off(EVENTS.ROOM_JOINED, onJoined);
      socket.off(EVENTS.GAME_STATE, onState);
    }

    socket.once(EVENTS.ROOM_JOINED, onJoined);
    socket.once(EVENTS.GAME_STATE, onState);
    socket.once(EVENTS.ROOM_ERROR, onError);
  }, [navigate, playerStore.name, setMyPlayerId, setSession]);

  if (!playerStore.name) return null;

  return (
    <PlayerDashboard
      name={playerStore.name}
      email={playerStore.email ?? ''}
      industrialUnit={playerStore.industrialUnit ?? ''}
      totalScore={playerStore.totalScore}
      gameCount={0}
      onViewHistory={() => navigate('/jogador/historico')}
      onViewRanking={() => navigate('/ranking')}
      onEditProfile={() => navigate('/jogador/perfil')}
      onLogout={() => { clearPlayer(); navigate('/jogador'); }}
      onJoinPin={handleJoinPin}
    />
  );
}

function PlayerHistoryPage() {
  const navigate = useNavigate();
  const [entries, setEntries] = useState<{ sessionId: string; sessionName: string; playedAt: string; score: number; rank: number; totalPlayers: number }[]>([]);
  const playerId = usePlayerStore((s) => s.playerId);
  const token = usePlayerStore((s) => s.token);

  useEffect(() => {
    if (!playerId || !token) return;
    fetch(`${SERVER()}/api/players/${playerId}/history`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then(setEntries)
      .catch(() => {});
  }, [playerId, token]);

  return <PlayerHistory entries={entries} onBack={() => navigate('/jogador/dashboard')} />;
}

function PlayerProfilePage() {
  const navigate = useNavigate();
  const token = usePlayerStore((s) => s.token);
  const playerStore = usePlayerStore();
  const [error, setError] = useState<string | undefined>();
  const [success, setSuccess] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState(false);

  const handleSave = useCallback(async (data: { firstName: string; lastName: string; currentPassword?: string; newPassword?: string }) => {
    setIsLoading(true);
    setError(undefined);
    setSuccess(undefined);
    try {
      const res = await fetch(`${SERVER()}/api/players/me`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(data),
      });
      if (res.status === 401) { setError('Senha atual incorreta.'); return; }
      if (!res.ok) { setError('Erro ao atualizar perfil.'); return; }
      const updated = await res.json();
      usePlayerStore.setState({ name: updated.name });
      setSuccess('Perfil atualizado com sucesso.');
    } catch {
      setError('Não foi possível conectar ao servidor.');
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  const [first, ...rest] = (playerStore.name ?? ' ').split(' ');
  const last = rest.join(' ');

  return (
    <PlayerProfile
      firstName={first}
      lastName={last}
      email={playerStore.email ?? undefined}
      onSave={handleSave}
      onBack={() => navigate('/jogador/dashboard')}
      error={error}
      success={success}
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
      {import.meta.env.DEV && <Route path="/preview" element={<BoardPreview />} />}
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
      <Route path="/manager/sessoes"     element={<ProtectedRoute><ManagerSessionsListPage /></ProtectedRoute>} />
      <Route path="/manager/sessoes/:id" element={<ProtectedRoute><ManagerSessionDetailWrapper /></ProtectedRoute>} />
      <Route path="/manager/relatorios"  element={<ProtectedRoute><ManagerReportsPageWrapper /></ProtectedRoute>} />
      <Route path="/manager/conteudos"   element={<ProtectedRoute><ManagerContentPageWrapper /></ProtectedRoute>} />
      <Route path="/manager/jogadores"   element={<ProtectedRoute><ManagerPlayersPageWrapper /></ProtectedRoute>} />
      <Route path="/manager/ranking"     element={<ProtectedRoute><ManagerRankingPageWrapper /></ProtectedRoute>} />
      <Route path="/manager/perfil"      element={<ProtectedRoute><ManagerProfilePageWrapper /></ProtectedRoute>} />
      <Route path="/manager/suporte"     element={<ProtectedRoute><ManagerSupportPageWrapper /></ProtectedRoute>} />

      {/* Área do jogador */}
      <Route path="/jogador"              element={<PlayerLoginPage />} />
      <Route path="/jogador/dashboard"    element={<PlayerGuard><PlayerDashboardPage /></PlayerGuard>} />
      <Route path="/jogador/historico"    element={<PlayerGuard><PlayerHistoryPage /></PlayerGuard>} />
      <Route path="/jogador/perfil"       element={<PlayerGuard><PlayerProfilePage /></PlayerGuard>} />
    </Routes>
  );
}
