import express, { type Express } from 'express';
import cors from 'cors';

export function createApp(): Express {
  const app = express();

  app.use(cors({ origin: process.env.CLIENT_URL ?? 'http://localhost:5173' }));
  app.use(express.json());

  app.get('/health', (_req, res) => {
    res.json({ ok: true });
  });

  return app;
}
