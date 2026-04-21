// Tipos de domínio compartilhados entre client e server.
// Tipos específicos de cada camada ficam nos próprios pacotes.

export type PlayerId = string;
export type SessionId = string;
export type FacilitatorId = string;

// ─── Avatar system — data-driven, escalável ──────────────────────────────────

export interface AvatarOption {
  id: string;        // identificador único (ex: 'operator', 'tech')
  name: string;      // nome exibido (ex: 'Operator')
  role: string;      // papel/descrição (ex: 'First Response / Heavy Duty')
  imageUrl: string;  // caminho relativo ou URL da imagem 3D low-poly
  color: string;     // cor hex do peão no tabuleiro 3D
}

export const AVATARS: AvatarOption[] = [
  {
    id: 'operator',
    name: 'Operator',
    role: 'First Response / Heavy Duty',
    imageUrl: '/avatars/operator.png',
    color: '#e63946',
  },
  {
    id: 'tech',
    name: 'Safety Tech',
    role: 'Compliance / Inspection',
    imageUrl: '/avatars/tech.png',
    color: '#457b9d',
  },
  {
    id: 'admin',
    name: 'Admin',
    role: 'Oversight / Logistics',
    imageUrl: '/avatars/admin.png',
    color: '#2a9d8f',
  },
  {
    id: 'visitor',
    name: 'Visitor',
    role: 'Observation / Guest',
    imageUrl: '/avatars/visitor.png',
    color: '#f4a261',
  },
];

export type GameState = 'WAITING' | 'ACTIVE' | 'FINISHED';

export interface Player {
  id: PlayerId;
  name: string;
  position: number; // índice 0-39 no BOARD_PATH
  score: number;
  skipNextTurn?: boolean;
  isConnected: boolean;
}

export interface QuizConfig {
  activeNormIds: string[];  // normas ativas escolhidas pelo facilitador
  timeoutSeconds: number;   // tempo por pergunta (padrão: 30)
  difficulty?: 'basic' | 'intermediate' | 'advanced'; // filtra questões por dificuldade; null = todas
}

export interface QuizServedQuestion {
  id: string;
  normId: string;
  text: string;
  options: string[]; // embaralhadas — sem correctIndex
}

export interface GameSession {
  id: SessionId;
  pin: string;
  name: string;       // nome definido pelo facilitador (ex: "SST Nível 4")
  shareLink: string;  // link direto para entrada na sessão: /sala/:pin
  facilitatorId: FacilitatorId;
  state: GameState;
  players: Player[];
  currentPlayerIndex: number;
  createdAt: number;
  quizConfig: QuizConfig;
  maxPlayers: 2 | 3 | 4;
  lobbyReadyPlayers?: string[];
  finishCandidateId?: string;
}

// ─── Registro de jogador pós-partida ─────────────────────────────────────────

export interface PlayerSignupData {
  firstName: string;
  lastName: string;
  email: string;
  industrialUnit: string;
  password: string;
}

// ─── Leaderboard global ───────────────────────────────────────────────────────

export interface LeaderboardEntry {
  rank: number;
  playerId: string;
  name: string;
  role?: string;           // ex: "Especialista em Logística"
  industrialUnit: string;  // ex: "Unidade Sul - Curitiba"
  totalScore: number;
}

export interface GameResultPlayer {
  playerId: PlayerId;
  name: string;
  score: number;
  rank: 1 | 2 | 3 | 4;         // calculado pelo server
  finalPosition: number;         // casa final no tabuleiro
  correctAnswers: number;
  totalAnswers: number;
}

export interface GameResultPayload {
  sessionId: SessionId;
  players: GameResultPlayer[];   // ordenados por rank (1º primeiro)
  durationSeconds: number;       // tempo da partida
}

// ─── Manager / Dashboard ─────────────────────────────────────────────────────

export interface ManagerLoginData {
  email: string;
  password: string;
}

export type SessionDifficulty = 'basic' | 'intermediate' | 'advanced';

export interface NewSessionConfig {
  difficulty: SessionDifficulty;
  maxPlayers: 2 | 3 | 4;
  name?: string;
}

export type SessionStatus = 'active' | 'completed' | 'reviewing';

export interface SessionSummary {
  id: string;        // UUID da sessão (session.id)
  pin: string;       // PIN de 6 dígitos (para exibição)
  date: string;
  group: string;
  avgScore: number | null;
  status: SessionStatus;
}

export interface DashboardStats {
  totalPlayers: number;
  avgScore: number;
  completionRate: number;
  activeSessions: number;
}

// ─── Manager extended types ───────────────────────────────────────────────────

export interface ManagedPlayer {
  playerId: string;
  firstName: string;
  lastName: string;
  email: string;
  industrialUnit: string;
  totalScore: number;
  gameCount: number;
  createdAt: string;
}

export interface QuizLogEntry {
  playerId: string;
  playerName: string;
  questionId: string;
  questionText: string;
  selectedText: string;
  correctText: string;
  correct: boolean;
  latencyMs: number;
}

export interface TileLogEntry {
  playerId: string;
  playerName: string;
  tileIndex: number;
  effectTitle: string;
  effectType: string;
  deltaScore: number;
  deltaPosition: number;
}

export interface SessionDetail {
  sessionId: string;
  pin: string;
  sessionName: string;
  startedAt: string | null;
  finishedAt: string | null;
  durationSeconds: number | null;
  status: 'active' | 'completed';
  players: Array<{
    playerId: string;
    name: string;
    score: number;
    rank: number | null;
    finalPosition: number;
    correctAnswers: number;
    totalAnswers: number;
    dropped: boolean;
  }>;
  quizLog: QuizLogEntry[];
  tileLog: TileLogEntry[];
}

export interface QuizQuestionFull {
  id: string;
  normId: string;
  text: string;
  options: string[];
  correctIndex: number;
  difficulty: 'basic' | 'intermediate' | 'advanced';
}

export interface QuizQuestionPayload {
  normId: string;
  text: string;
  options: string[];
  correctIndex: number;
  difficulty?: 'basic' | 'intermediate' | 'advanced';
}
