import express, { type Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import { FacilitatorStore } from './auth/FacilitatorStore';
import { createAuthRouter } from './auth/auth.router';

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});

export function createApp(): Express {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: process.env.CLIENT_URL ?? 'http://localhost:5173' }));
  app.use(express.json());

  app.get('/health', (_req, res) => {
    res.json({ ok: true });
  });

  const store = new FacilitatorStore();
  app.use('/api/auth', authLimiter, createAuthRouter(store));

  return app;
}
