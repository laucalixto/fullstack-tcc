import { Router } from 'express';
import type { PlayerStore } from '../players/PlayerStore.js';
import type { SessionManager } from '../game/SessionManager.js';
import { jwtMiddleware } from '../auth/jwt.middleware.js';
import type { DashboardStats, SessionSummary } from '@safety-board/shared';

export function createManagerRouter(
  playerStore: PlayerStore,
  sessionManager: SessionManager,
): Router {
  const router = Router();

  router.use(jwtMiddleware);

  router.get('/stats', (_req, res) => {
    const leaderboard = playerStore.leaderboard();
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
        id: session.pin,
        date,
        group: session.name,
        avgScore,
        status,
      };
    });

    res.json(summaries);
  });

  return router;
}
