import { Router } from 'express';
import { z } from 'zod';
import type { PlayerStore } from '../players/PlayerStore.js';
import type { SessionManager } from '../game/SessionManager.js';
import { GameResultModel } from '../db/models/GameResult.model.js';
import { jwtMiddleware } from '../auth/jwt.middleware.js';
import type { DashboardStats, SessionSummary, ManagedPlayer, SessionDetail } from '@safety-board/shared';

export function createManagerRouter(
  playerStore: PlayerStore,
  sessionManager: SessionManager,
): Router {
  const router = Router();

  router.use(jwtMiddleware);

  router.get('/stats', async (_req, res) => {
    const leaderboard = await playerStore.leaderboard();
    const totalPlayers = leaderboard.length;

    const avgScore =
      totalPlayers > 0
        ? Math.round(
            (leaderboard.reduce((sum, e) => sum + e.totalScore, 0) / totalPlayers) * 10,
          ) / 10
        : 0;

    const sessions = sessionManager.allSessions();
    const activeSessions = sessions.filter((s) => s.session.state === 'ACTIVE').length;
    const finished = sessions.filter((s) => s.session.state === 'FINISHED');
    const completionRate =
      sessions.length > 0
        ? Math.round((finished.length / sessions.length) * 1000) / 10
        : 0;

    const stats: DashboardStats = { totalPlayers, avgScore, completionRate, activeSessions };
    res.json(stats);
  });

  router.get('/sessions', (_req, res) => {
    const all = sessionManager.allSessions();

    const summaries: SessionSummary[] = all.map(({ session }) => {
      const date = new Date(session.createdAt).toLocaleString('pt-BR', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      });

      const avgScore =
        session.players.length > 0
          ? Math.round(
              session.players.reduce((sum, p) => sum + p.score, 0) / session.players.length,
            )
          : null;

      const status: SessionSummary['status'] =
        session.state === 'ACTIVE'
          ? 'active'
          : session.state === 'FINISHED'
          ? 'completed'
          : 'reviewing';

      return {
        id: session.id,
        pin: session.pin,
        date,
        group: session.name,
        avgScore,
        status,
      };
    });

    res.json(summaries);
  });

  // ─── Session export (antes de /:id para evitar conflito de rota) ──────────

  router.get('/sessions/export', async (_req, res) => {
    try {
      const results = await GameResultModel.find().lean();
      const header = 'sessionId,sessionName,pin,startedAt,finishedAt,durationSeconds,playerId,playerName,score,rank,correctAnswers,totalAnswers,dropped';
      const rows: string[] = [header];
      for (const r of results) {
        for (const p of (r.players as Array<Record<string, unknown>>)) {
          rows.push([
            r.sessionId, r.sessionName, r.pin,
            r.startedAt ? new Date(r.startedAt as Date).toISOString() : '',
            r.finishedAt ? new Date(r.finishedAt as Date).toISOString() : '',
            r.durationSeconds,
            p.playerId, p.name, p.score, p.rank,
            p.correctAnswers, p.totalAnswers, p.dropped ? '1' : '0',
          ].join(','));
        }
      }
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="sessions.csv"');
      res.send(rows.join('\n'));
    } catch {
      res.status(500).json({ error: 'Export failed' });
    }
  });

  // ─── Session detail ────────────────────────────────────────────────────────

  router.get('/sessions/:id', async (req, res) => {
    const { id } = req.params;

    // Primeiro tenta sessão ativa (in-memory)
    const liveEntry = sessionManager.allSessions().find((s) => s.session.id === id);
    if (liveEntry) {
      const { session, startedAt, finishedAt, quizLog, tileLog, droppedPlayerIds } = liveEntry;
      const detail: SessionDetail = {
        sessionId: session.id,
        pin: session.pin,
        sessionName: session.name,
        startedAt: startedAt ? new Date(startedAt).toISOString() : null,
        finishedAt: finishedAt ? new Date(finishedAt).toISOString() : null,
        durationSeconds: startedAt ? Math.round((Date.now() - startedAt) / 1000) : null,
        status: session.state === 'FINISHED' ? 'completed' : 'active',
        players: session.players.map((p) => ({
          playerId: p.id,
          name: p.name,
          score: p.score,
          rank: null,
          finalPosition: p.position,
          correctAnswers: 0,
          totalAnswers: 0,
          dropped: droppedPlayerIds.includes(p.id),
        })),
        quizLog,
        tileLog,
      };
      res.json(detail);
      return;
    }

    // Tenta sessão finalizada no MongoDB
    try {
      const doc = await GameResultModel.findOne({ sessionId: id }).lean();
      if (!doc) {
        res.status(404).json({ error: 'Session not found' });
        return;
      }
      const detail: SessionDetail = {
        sessionId: doc.sessionId as string,
        pin: doc.pin as string,
        sessionName: doc.sessionName as string,
        startedAt: doc.startedAt ? new Date(doc.startedAt as Date).toISOString() : null,
        finishedAt: doc.finishedAt ? new Date(doc.finishedAt as Date).toISOString() : null,
        durationSeconds: (doc.durationSeconds as number) ?? null,
        status: 'completed',
        players: (doc.players as Array<Record<string, unknown>>).map((p) => ({
          playerId: p.playerId as string,
          name: p.name as string,
          score: p.score as number,
          rank: p.rank as number,
          finalPosition: p.finalPosition as number,
          correctAnswers: p.correctAnswers as number,
          totalAnswers: p.totalAnswers as number,
          dropped: !!(p.dropped),
        })),
        quizLog: (doc.quizLog as SessionDetail['quizLog']) ?? [],
        tileLog: (doc.tileLog as SessionDetail['tileLog']) ?? [],
      };
      res.json(detail);
    } catch {
      res.status(500).json({ error: 'Internal error' });
    }
  });

  // ─── Players management ────────────────────────────────────────────────────

  router.get('/players', (_req, res) => {
    const players: ManagedPlayer[] = playerStore.findAll().map((p) => ({
      playerId: p.playerId,
      firstName: p.firstName,
      lastName: p.lastName,
      email: p.email,
      industrialUnit: p.industrialUnit,
      totalScore: p.totalScore,
      gameCount: playerStore.getHistory(p.playerId).length,
      createdAt: p.createdAt ? new Date(p.createdAt).toISOString() : new Date(0).toISOString(),
    }));
    res.json(players);
  });

  const playerPatchSchema = z.object({
    firstName: z.string().min(1).optional(),
    lastName: z.string().min(1).optional(),
    industrialUnit: z.string().min(1).optional(),
    totalScore: z.number().int().min(0).optional(),
  });

  router.patch('/players/:id', (req, res) => {
    const parse = playerPatchSchema.safeParse(req.body);
    if (!parse.success) {
      res.status(400).json({ error: parse.error.flatten() });
      return;
    }
    const updated = playerStore.update(req.params.id, parse.data);
    if (!updated) {
      res.status(404).json({ error: 'Player not found' });
      return;
    }
    const { passwordHash: _omit, ...safe } = updated;
    res.json(safe);
  });

  return router;
}
