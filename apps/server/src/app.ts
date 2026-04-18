import express, { type Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import { FacilitatorStore } from './auth/FacilitatorStore.js';
import { createAuthRouter } from './auth/auth.router.js';
import { PlayerStore } from './players/PlayerStore.js';
import { createPlayerRouter } from './players/player.router.js';

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});

interface AppOptions {
  facilitatorStore?: FacilitatorStore;
  playerStore?: PlayerStore;
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
  app.use('/api/players', createPlayerRouter(playerStore));

  app.get('/api/leaderboard', (_req, res) => {
    res.json(playerStore.leaderboard());
  });

  return app;
}
