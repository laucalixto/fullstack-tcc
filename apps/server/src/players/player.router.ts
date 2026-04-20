import { Router } from 'express';
import bcrypt from 'bcrypt';
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

export function createPlayerRouter(store: PlayerStore): Router {
  const router = Router();

  router.post('/register', async (req, res) => {
    const parsed = RegisterSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Campos obrigatórios ausentes ou inválidos.' });
      return;
    }

    const { firstName, lastName, email, industrialUnit, password, sessionScore } =
      parsed.data;

    if (await store.existsByEmailAsync(email)) {
      res.status(409).json({ error: 'E-mail já cadastrado.' });
      return;
    }

    const rounds = Number(process.env.BCRYPT_ROUNDS ?? 12);
    const passwordHash = await bcrypt.hash(password, rounds);

    const record = await store.createAsync({
      firstName,
      lastName,
      email,
      industrialUnit,
      passwordHash,
      totalScore: sessionScore ?? 0,
    });

    res.status(201).json({ playerId: record.playerId });
  });

  return router;
}
