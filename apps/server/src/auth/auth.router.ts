import { Router, type Request, type Response } from 'express';
import { AuthService } from './AuthService';
import { FacilitatorStore } from './FacilitatorStore';
import { jwtMiddleware, type AuthRequest } from './jwt.middleware';
import { RegisterSchema, LoginSchema } from './auth.schemas';

export function createAuthRouter(store: FacilitatorStore): Router {
  const router = Router();

  // POST /api/auth/register
  router.post('/register', async (req: Request, res: Response): Promise<void> => {
    const parsed = RegisterSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Validation failed', details: parsed.error.issues });
      return;
    }

    const { email, password, name } = parsed.data;

    if (store.existsByEmail(email)) {
      res.status(409).json({ error: 'Email already registered' });
      return;
    }

    const passwordHash = await AuthService.hashPassword(password);
    const facilitator = store.create({ email, name, passwordHash });
    const token = AuthService.generateToken({ facilitatorId: facilitator.id });

    res.status(201).json({ token });
  });

  // POST /api/auth/login
  router.post('/login', async (req: Request, res: Response): Promise<void> => {
    const parsed = LoginSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Validation failed', details: parsed.error.issues });
      return;
    }

    const { email, password } = parsed.data;
    const facilitator = store.findByEmail(email);

    if (!facilitator) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const valid = await AuthService.verifyPassword(password, facilitator.passwordHash);
    if (!valid) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const token = AuthService.generateToken({ facilitatorId: facilitator.id });
    res.json({ token });
  });

  // GET /api/auth/me — rota protegida usada nos testes do middleware
  router.get('/me', jwtMiddleware, (req: AuthRequest, res: Response): void => {
    res.json({ facilitatorId: req.facilitatorId });
  });

  return router;
}
