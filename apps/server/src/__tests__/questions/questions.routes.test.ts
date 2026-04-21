import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../../app.js';
import { FacilitatorStore } from '../../auth/FacilitatorStore.js';
import { PlayerStore } from '../../players/PlayerStore.js';

// ─── RED: falha até questions.router.ts ser implementado ─────────────────────

const mockQuestions = vi.hoisted(() => [
  { _id: 'q1', id: 'q1', normId: 'NR-06', text: 'Pergunta 1', options: ['A', 'B', 'C', 'D'], correctIndex: 0, difficulty: 'basic' },
  { _id: 'q2', id: 'q2', normId: 'NR-06', text: 'Pergunta 2', options: ['A', 'B'], correctIndex: 1, difficulty: 'basic' },
  { _id: 'q3', id: 'q3', normId: 'NR-10', text: 'Pergunta 3', options: ['X', 'Y', 'Z'], correctIndex: 0, difficulty: 'intermediate' },
]);

vi.mock('../../db/models/Facilitator.model.js', () => ({
  FacilitatorModel: {
    findOne: vi.fn().mockResolvedValue(null),
    create: vi.fn().mockImplementation((data) => Promise.resolve({ id: 'mock-fac-id', ...data })),
  },
}));

vi.mock('../../db/models/Player.model.js', () => ({
  PlayerModel: {
    findOne: vi.fn().mockResolvedValue(null),
    create: vi.fn().mockResolvedValue({}),
    countDocuments: vi.fn().mockResolvedValue(0),
  },
}));

vi.mock('../../db/models/GameResult.model.js', () => ({
  GameResultModel: {
    find: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue([]) }),
    findOne: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue(null) }),
    create: vi.fn().mockResolvedValue({}),
  },
}));

vi.mock('../../db/models/Norm.model.js', () => ({
  NormModel: {
    find: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue([]) }),
    findOneAndUpdate: vi.fn().mockImplementation((_filter, _update, _opts) =>
      Promise.resolve({ normId: 'NR-33', title: 'Espaços Confinados' }),
    ),
    findOneAndDelete: vi.fn().mockImplementation(({ normId }: { normId: string }) =>
      Promise.resolve({ normId, title: 'Mock' }),
    ),
    countDocuments: vi.fn().mockResolvedValue(5),
  },
}));

vi.mock('../../db/models/Question.model.js', () => ({
  QuestionModel: {
    find: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue(mockQuestions) }),
    findById: vi.fn().mockImplementation((id: string) => ({
      lean: vi.fn().mockResolvedValue(mockQuestions.find((q) => q._id === id) ?? null),
    })),
    create: vi.fn().mockImplementation((data) => Promise.resolve({ _id: 'new-id', id: 'new-id', ...data })),
    findByIdAndUpdate: vi.fn().mockImplementation((id: string, update) => ({
      lean: vi.fn().mockResolvedValue(
        mockQuestions.find((q) => q._id === id)
          ? { ...mockQuestions.find((q) => q._id === id), ...update.$set }
          : null,
      ),
    })),
    findByIdAndDelete: vi.fn().mockImplementation((id: string) => ({
      lean: vi.fn().mockResolvedValue(mockQuestions.find((q) => q._id === id) ?? null),
    })),
  },
}));

async function getManagerToken(app: ReturnType<typeof createApp>) {
  await request(app).post('/api/auth/register').send({
    email: 'gestor@test.com', password: 'Senha@Segura123', name: 'Gestor',
  });
  const res = await request(app).post('/api/auth/login').send({
    email: 'gestor@test.com', password: 'Senha@Segura123',
  });
  return res.body.token as string;
}

describe('GET /api/questions', () => {
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    app = createApp({ facilitatorStore: new FacilitatorStore(), playerStore: new PlayerStore() });
  });

  it('retorna 200 sem autenticação (rota pública)', async () => {
    const res = await request(app).get('/api/questions');
    expect(res.status).toBe(200);
  });

  it('retorna array de questões', async () => {
    const res = await request(app).get('/api/questions');
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });

  it('cada questão tem os campos obrigatórios', async () => {
    const res = await request(app).get('/api/questions');
    const q = res.body[0];
    expect(q).toHaveProperty('normId');
    expect(q).toHaveProperty('text');
    expect(q).toHaveProperty('options');
    expect(q).toHaveProperty('correctIndex');
  });
});

describe('GET /api/questions/norms', () => {
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    app = createApp({ facilitatorStore: new FacilitatorStore(), playerStore: new PlayerStore() });
  });

  it('retorna lista de norms únicas com título', async () => {
    const res = await request(app).get('/api/questions/norms');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body[0]).toHaveProperty('normId');
    expect(res.body[0]).toHaveProperty('title');
  });
});

describe('POST /api/questions', () => {
  let app: ReturnType<typeof createApp>;
  let token: string;

  beforeEach(async () => {
    app = createApp({ facilitatorStore: new FacilitatorStore(), playerStore: new PlayerStore() });
    token = await getManagerToken(app);
  });

  it('retorna 401 sem token', async () => {
    const res = await request(app).post('/api/questions').send({
      normId: 'NR-06', text: 'Nova?', options: ['A', 'B'], correctIndex: 0,
    });
    expect(res.status).toBe(401);
  });

  it('cria questão com dados válidos', async () => {
    const res = await request(app)
      .post('/api/questions')
      .set('Authorization', `Bearer ${token}`)
      .send({ normId: 'NR-06', text: 'Pergunta nova?', options: ['A', 'B', 'C'], correctIndex: 1 });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('normId', 'NR-06');
  });

  it('retorna 400 com menos de 2 opções', async () => {
    const res = await request(app)
      .post('/api/questions')
      .set('Authorization', `Bearer ${token}`)
      .send({ normId: 'NR-06', text: 'Pergunta?', options: ['Só uma'], correctIndex: 0 });
    expect(res.status).toBe(400);
  });

  it('retorna 400 com mais de 4 opções', async () => {
    const res = await request(app)
      .post('/api/questions')
      .set('Authorization', `Bearer ${token}`)
      .send({ normId: 'NR-06', text: 'Muitas?', options: ['A', 'B', 'C', 'D', 'E'], correctIndex: 0 });
    expect(res.status).toBe(400);
  });
});

describe('PATCH /api/questions/:id', () => {
  let app: ReturnType<typeof createApp>;
  let token: string;

  beforeEach(async () => {
    app = createApp({ facilitatorStore: new FacilitatorStore(), playerStore: new PlayerStore() });
    token = await getManagerToken(app);
  });

  it('retorna 401 sem token', async () => {
    const res = await request(app).patch('/api/questions/q1').send({ text: 'X' });
    expect(res.status).toBe(401);
  });

  it('retorna 404 para questão inexistente', async () => {
    const res = await request(app)
      .patch('/api/questions/nao-existe')
      .set('Authorization', `Bearer ${token}`)
      .send({ text: 'X' });
    expect(res.status).toBe(404);
  });

  it('atualiza texto da questão', async () => {
    const res = await request(app)
      .patch('/api/questions/q1')
      .set('Authorization', `Bearer ${token}`)
      .send({ text: 'Texto atualizado' });
    expect(res.status).toBe(200);
  });
});

describe('DELETE /api/questions/:id', () => {
  let app: ReturnType<typeof createApp>;
  let token: string;

  beforeEach(async () => {
    app = createApp({ facilitatorStore: new FacilitatorStore(), playerStore: new PlayerStore() });
    token = await getManagerToken(app);
  });

  it('retorna 401 sem token', async () => {
    const res = await request(app).delete('/api/questions/q1');
    expect(res.status).toBe(401);
  });

  it('retorna 404 para questão inexistente', async () => {
    const res = await request(app)
      .delete('/api/questions/nao-existe')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
  });

  it('remove questão existente', async () => {
    const res = await request(app)
      .delete('/api/questions/q1')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
  });
});
