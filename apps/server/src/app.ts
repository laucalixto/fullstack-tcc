import express, { type Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import { FacilitatorStore } from './auth/FacilitatorStore.js';
import { createAuthRouter } from './auth/auth.router.js';
import { PlayerStore } from './players/PlayerStore.js';
import { createPlayerRouter } from './players/player.router.js';
import { SessionManager } from './game/SessionManager.js';
import { createManagerRouter } from './manager/manager.router.js';

const isTest = process.env.NODE_ENV === 'test' || !!process.env.VITEST;

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: isTest ? 1000 : 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1h
  max: isTest ? 1000 : Number(process.env.REGISTER_LIMIT_MAX ?? 10),
  message: { error: 'Limite de cadastros atingido. Tente mais tarde.' },
});

interface AppOptions {
  facilitatorStore?: FacilitatorStore;
  playerStore?: PlayerStore;
  sessionManager?: SessionManager;
}

export function createApp(options: AppOptions = {}): Express {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: process.env.CLIENT_URL ?? 'http://localhost:5173' }));
  app.use(express.json());

  app.get('/health', (_req, res) => {
    res.json({ ok: true });
  });

  const facilitatorStore = options.facilitatorStore ?? new FacilitatorStore();
  app.use('/api/auth', authLimiter, createAuthRouter(facilitatorStore));

  const playerStore = options.playerStore ?? new PlayerStore();
  app.use('/api/players/register', registerLimiter);
  app.use('/api/players/login', authLimiter);
  app.use('/api/players', createPlayerRouter(playerStore));

  app.get('/api/leaderboard', async (_req, res) => {
    res.json(await playerStore.leaderboard());
  });

  const sessionManager = options.sessionManager ?? new SessionManager();
  app.use('/api/manager', createManagerRouter(playerStore, sessionManager));

  return app;
}
