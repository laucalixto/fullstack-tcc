import { Router, type Response } from 'express';
import bcrypt from 'bcrypt';
import { z } from 'zod';
import type { PlayerStore } from './PlayerStore.js';
import { AuthService } from '../auth/AuthService.js';
import { playerJwtMiddleware, type PlayerAuthRequest } from '../auth/player.jwt.middleware.js';

const RegisterSchema = z.object({
  firstName:      z.string().min(1),
  lastName:       z.string().min(1),
  email:          z.string().email(),
  industrialUnit: z.string().min(1),
  password:       z.string().min(8, 'Senha deve ter no mínimo 8 caracteres.'),
  // Tiles podem subtrair pontos durante a partida — score negativo é legítimo.
  // Sem essa flexibilização, o jogador mal posicionado recebia HTTP 400 e o
  // client exibia "Não foi possível conectar ao servidor", mascarando o bug.
  sessionScore:   z.number().int().optional(),
});

const LoginSchema = z.object({
  email:    z.string().email(),
  password: z.string().min(1),
});

export function createPlayerRouter(store: PlayerStore): Router {
  const router = Router();

  // POST /api/players/register
  router.post('/register', async (req, res) => {
    const parsed = RegisterSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Campos obrigatórios ausentes ou inválidos.' });
      return;
    }

    const { firstName, lastName, email, industrialUnit, password, sessionScore } = parsed.data;

    if (await store.existsByEmailAsync(email)) {
      res.status(409).json({ error: 'E-mail já cadastrado.' });
      return;
    }

    const rounds = Number(process.env.BCRYPT_ROUNDS ?? 12);
    const passwordHash = await bcrypt.hash(password, rounds);

    const record = await store.createAsync({
      firstName, lastName, email, industrialUnit, passwordHash,
      totalScore: sessionScore ?? 0,
    });

    res.status(201).json({ playerId: record.playerId });
  });

  // POST /api/players/login
  router.post('/login', async (req, res) => {
    const parsed = LoginSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Dados inválidos.' });
      return;
    }

    const { email, password } = parsed.data;
    const record = await store.findByEmailAsync(email);
    if (!record) {
      res.status(401).json({ error: 'Credenciais inválidas.' });
      return;
    }

    const valid = await bcrypt.compare(password, record.passwordHash);
    if (!valid) {
      res.status(401).json({ error: 'Credenciais inválidas.' });
      return;
    }

    const token = AuthService.generatePlayerToken({ playerId: record.playerId });
    res.json({
      token,
      playerId:       record.playerId,
      name:           `${record.firstName} ${record.lastName}`,
      email:          record.email,
      industrialUnit: record.industrialUnit,
      totalScore:     record.totalScore,
    });
  });

  // GET /api/players/me — requer token de jogador
  router.get('/me', playerJwtMiddleware, async (req: PlayerAuthRequest, res: Response) => {
    const record = await store.findByIdAsync(req.playerId!);
    if (!record) {
      res.status(404).json({ error: 'Jogador não encontrado.' });
      return;
    }
    res.json({
      playerId:       record.playerId,
      name:           `${record.firstName} ${record.lastName}`,
      email:          record.email,
      industrialUnit: record.industrialUnit,
      totalScore:     record.totalScore,
    });
  });

  // PATCH /api/players/me — atualizar perfil
  router.patch('/me', playerJwtMiddleware, async (req: PlayerAuthRequest, res: Response) => {
    const PatchSchema = z.object({
      firstName:       z.string().min(1).optional(),
      lastName:        z.string().min(1).optional(),
      currentPassword: z.string().optional(),
      newPassword:     z.string().min(8).optional(),
    }).refine(
      (d) => !d.newPassword || !!d.currentPassword,
      { message: 'currentPassword é obrigatório para alterar senha.' },
    );

    const parsed = PatchSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Dados inválidos.', details: parsed.error.flatten() });
      return;
    }

    const record = await store.findByIdAsync(req.playerId!);
    if (!record) { res.status(404).json({ error: 'Jogador não encontrado.' }); return; }

    const { firstName, lastName, currentPassword, newPassword } = parsed.data;
    const patch: Parameters<typeof store.update>[1] = {};

    if (firstName) patch.firstName = firstName;
    if (lastName)  patch.lastName  = lastName;

    if (newPassword) {
      const valid = await bcrypt.compare(currentPassword!, record.passwordHash);
      if (!valid) { res.status(401).json({ error: 'Senha atual incorreta.' }); return; }
      const rounds = Number(process.env.BCRYPT_ROUNDS ?? 12);
      patch.passwordHash = await bcrypt.hash(newPassword, rounds);
    }

    const updated = store.update(req.playerId!, patch);
    if (!updated) { res.status(404).json({ error: 'Jogador não encontrado.' }); return; }

    res.json({
      playerId:       updated.playerId,
      name:           `${updated.firstName} ${updated.lastName}`,
      email:          updated.email,
      industrialUnit: updated.industrialUnit,
      totalScore:     updated.totalScore,
    });
  });

  // GET /api/players/:id/history — histórico de partidas
  router.get('/:id/history', playerJwtMiddleware, async (req: PlayerAuthRequest, res: Response) => {
    if (req.playerId !== req.params.id) {
      res.status(403).json({ error: 'Acesso negado.' });
      return;
    }
    res.json(store.getHistory(req.params.id));
  });

  return router;
}
