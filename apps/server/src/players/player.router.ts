import { Router } from 'express';
import { createHash } from 'node:crypto';
import { z } from 'zod';
import type { PlayerStore } from './PlayerStore.js';

const RegisterSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  industrialUnit: z.string().min(1),
  password: z.string().min(1),
  sessionScore: z.number().int().nonnegative().optional(),
});

function hashPassword(password: string): string {
  return createHash('sha256').update(password).digest('hex');
}

export function createPlayerRouter(store: PlayerStore): Router {
  const router = Router();

  router.post('/register', (req, res) => {
    const parsed = RegisterSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Campos obrigatórios ausentes ou inválidos.' });
      return;
    }

    const { firstName, lastName, email, industrialUnit, password, sessionScore } =
      parsed.data;

    if (store.existsByEmail(email)) {
      res.status(409).json({ error: 'E-mail já cadastrado.' });
      return;
    }

    const record = store.create({
      firstName,
      lastName,
      email,
      industrialUnit,
      passwordHash: hashPassword(password),
      totalScore: sessionScore ?? 0,
    });

    res.status(201).json({ playerId: record.playerId });
  });

  return router;
}
