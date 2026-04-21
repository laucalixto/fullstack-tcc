import type { Request, Response, NextFunction } from 'express';
import { AuthService } from './AuthService.js';

export interface PlayerAuthRequest extends Request {
  playerId?: string;
}

export function playerJwtMiddleware(
  req: PlayerAuthRequest,
  res: Response,
  next: NextFunction,
): void {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Token ausente.' });
    return;
  }

  try {
    const payload = AuthService.verifyToken(authHeader.slice(7));
    if (!payload.playerId) {
      res.status(401).json({ error: 'Token inválido para jogador.' });
      return;
    }
    req.playerId = payload.playerId;
    next();
  } catch {
    res.status(401).json({ error: 'Token inválido ou expirado.' });
  }
}
