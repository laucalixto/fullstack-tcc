import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../../app.js';
import { FacilitatorStore } from '../../auth/FacilitatorStore.js';
import { PlayerStore } from '../../players/PlayerStore.js';
import { QuestionModel } from '../../db/models/Question.model.js';

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
    findOneAndUpdate: vi.fn().mockImplementation((_filter, _update, _opts) => ({
      lean: vi.fn().mockResolvedValue({ normId: 'NR-33', title: 'Espaços Confinados' }),
    })),
    findOneAndDelete: vi.fn().mockImplementation(({ normId }: { normId: string }) => ({
      lean: vi.fn().mockResolvedValue({ normId, title: 'Mock' }),
    })),
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
          ? { ...mockQuestions.find((q) => q._id === id), ...(update as { $set?: object })?.$set }
          : null,
      ),
    })),
    findByIdAndDelete: vi.fn().mockImplementation((id: string) => ({
      lean: vi.fn().mockResolvedValue(mockQuestions.find((q) => q._id === id) ?? null),
    })),
    deleteMany: vi.fn().mockResolvedValue({ deletedCount: 0 }),
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

describe('PATCH /api/questions/:id — 500 error', () => {
  let app: ReturnType<typeof createApp>;
  let token: string;

  beforeEach(async () => {
    app = createApp({ facilitatorStore: new FacilitatorStore(), playerStore: new PlayerStore() });
    token = await getManagerToken(app);
    vi.mocked(QuestionModel.findByIdAndUpdate).mockImplementation(() => ({
      lean: vi.fn().mockRejectedValue(new Error('DB error')),
    }) as never);
  });

  afterEach(() => {
    vi.mocked(QuestionModel.findByIdAndUpdate).mockImplementation((id: string, update) => ({
      lean: vi.fn().mockResolvedValue(
        mockQuestions.find((q) => q._id === id)
          ? { ...mockQuestions.find((q) => q._id === id), ...(update as { $set?: object })?.$set }
          : null,
      ),
    }) as never);
  });

  it('retorna 500 quando banco falha no update', async () => {
    const res = await request(app)
      .patch('/api/questions/q1')
      .set('Authorization', `Bearer ${token}`)
      .send({ text: 'X' });
    expect(res.status).toBe(500);
  });
});

describe('DELETE /api/questions/:id — 500 error', () => {
  let app: ReturnType<typeof createApp>;
  let token: string;

  beforeEach(async () => {
    app = createApp({ facilitatorStore: new FacilitatorStore(), playerStore: new PlayerStore() });
    token = await getManagerToken(app);
    vi.mocked(QuestionModel.findByIdAndDelete).mockImplementation(() => ({
      lean: vi.fn().mockRejectedValue(new Error('DB error')),
    }) as never);
  });

  afterEach(() => {
    vi.mocked(QuestionModel.findByIdAndDelete).mockImplementation((id: string) => ({
      lean: vi.fn().mockResolvedValue(mockQuestions.find((q) => q._id === id) ?? null),
    }) as never);
  });

  it('retorna 500 quando banco falha no delete', async () => {
    const res = await request(app)
      .delete('/api/questions/q1')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(500);
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

import { NormModel } from '../../db/models/Norm.model.js';

describe('GET /api/questions/norms — NormModel retorna dados', () => {
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    app = createApp({ facilitatorStore: new FacilitatorStore(), playerStore: new PlayerStore() });
    vi.mocked(NormModel.find).mockReturnValue({
      lean: vi.fn().mockResolvedValue([
        { normId: 'NR-06', title: 'EPI' },
        { normId: 'NR-10', title: 'Elétrica' },
      ]),
    } as never);
  });

  afterEach(() => {
    vi.mocked(NormModel.find).mockReturnValue({
      lean: vi.fn().mockResolvedValue([]),
    } as never);
  });

  it('retorna normas do NormModel quando disponíveis', async () => {
    const res = await request(app).get('/api/questions/norms');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body[0].normId).toBe('NR-06');
  });
});

describe('GET /api/questions — fallback quando banco vazio', () => {
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    app = createApp({ facilitatorStore: new FacilitatorStore(), playerStore: new PlayerStore() });
    vi.mocked(QuestionModel.find).mockReturnValue({
      lean: vi.fn().mockResolvedValue([]),
    } as never);
  });

  afterEach(() => {
    vi.mocked(QuestionModel.find).mockReturnValue({
      lean: vi.fn().mockResolvedValue(mockQuestions),
    } as never);
  });

  it('retorna fallback do QuizService quando banco vazio', async () => {
    const res = await request(app).get('/api/questions');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

describe('PATCH /api/questions/:id — validation error', () => {
  let app: ReturnType<typeof createApp>;
  let token: string;

  beforeEach(async () => {
    app = createApp({ facilitatorStore: new FacilitatorStore(), playerStore: new PlayerStore() });
    token = await getManagerToken(app);
    // Restore original mock
    vi.mocked(QuestionModel.findByIdAndUpdate).mockImplementation((id: string, update) => ({
      lean: vi.fn().mockResolvedValue(
        mockQuestions.find((q) => q._id === id)
          ? { ...mockQuestions.find((q) => q._id === id), ...(update as { $set?: object })?.$set }
          : null,
      ),
    }) as never);
  });

  it('retorna 400 para body com options inválido (array vazio)', async () => {
    const res = await request(app)
      .patch('/api/questions/q1')
      .set('Authorization', `Bearer ${token}`)
      .send({ options: [] });
    expect(res.status).toBe(400);
  });
});

describe('POST /api/questions/norms', () => {
  let app: ReturnType<typeof createApp>;
  let token: string;

  beforeEach(async () => {
    app = createApp({ facilitatorStore: new FacilitatorStore(), playerStore: new PlayerStore() });
    token = await getManagerToken(app);
  });

  it('retorna 401 sem token', async () => {
    const res = await request(app).post('/api/questions/norms').send({ normId: 'NR-33', title: 'T' });
    expect(res.status).toBe(401);
  });

  it('cria norma com dados válidos', async () => {
    const res = await request(app)
      .post('/api/questions/norms')
      .set('Authorization', `Bearer ${token}`)
      .send({ normId: 'NR-33', title: 'Espaços Confinados' });
    expect(res.status).toBe(201);
    expect(res.body.normId).toBe('NR-33');
  });

  it('retorna 400 para dados inválidos', async () => {
    const res = await request(app)
      .post('/api/questions/norms')
      .set('Authorization', `Bearer ${token}`)
      .send({ normId: '' });
    expect(res.status).toBe(400);
  });
});

describe('DELETE /api/questions/norms/:normId', () => {
  let app: ReturnType<typeof createApp>;
  let token: string;

  beforeEach(async () => {
    app = createApp({ facilitatorStore: new FacilitatorStore(), playerStore: new PlayerStore() });
    token = await getManagerToken(app);
  });

  it('retorna 401 sem token', async () => {
    const res = await request(app).delete('/api/questions/norms/NR-33');
    expect(res.status).toBe(401);
  });

  it('retorna 409 quando há apenas MIN_NORMS temas (não pode excluir)', async () => {
    vi.mocked(NormModel.countDocuments).mockResolvedValue(4);
    const res = await request(app)
      .delete('/api/questions/norms/NR-06')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(409);
    vi.mocked(NormModel.countDocuments).mockResolvedValue(5);
  });

  it('retorna 404 para norma inexistente', async () => {
    vi.mocked(NormModel.countDocuments).mockResolvedValue(6);
    vi.mocked(NormModel.findOneAndDelete).mockReturnValue({ lean: vi.fn().mockResolvedValue(null) } as never);
    const res = await request(app)
      .delete('/api/questions/norms/NR-NAOEXISTE')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
    vi.mocked(NormModel.countDocuments).mockResolvedValue(5);
    vi.mocked(NormModel.findOneAndDelete).mockReturnValue({
      lean: vi.fn().mockResolvedValue({ normId: 'NR-NAOEXISTE', title: 'Mock' }),
    } as never);
  });

  it('exclui norma com sucesso', async () => {
    vi.mocked(NormModel.countDocuments).mockResolvedValue(6);
    const res = await request(app)
      .delete('/api/questions/norms/NR-06')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.deleted).toBe(true);
    vi.mocked(NormModel.countDocuments).mockResolvedValue(5);
  });
});

describe('GET /api/questions/norms — fallback total (NormModel e QuestionModel vazios)', () => {
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    app = createApp({ facilitatorStore: new FacilitatorStore(), playerStore: new PlayerStore() });
    vi.mocked(NormModel.find).mockReturnValue({ lean: vi.fn().mockResolvedValue([]) } as never);
    vi.mocked(QuestionModel.find).mockReturnValue({ lean: vi.fn().mockResolvedValue([]) } as never);
  });

  afterEach(() => {
    vi.mocked(NormModel.find).mockReturnValue({ lean: vi.fn().mockResolvedValue([]) } as never);
    vi.mocked(QuestionModel.find).mockReturnValue({ lean: vi.fn().mockResolvedValue(mockQuestions) } as never);
  });

  it('retorna fallback do QuizService quando banco totalmente vazio', async () => {
    const res = await request(app).get('/api/questions/norms');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });
});

describe('GET /api/questions — questão sem difficulty retorna "basic"', () => {
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    app = createApp({ facilitatorStore: new FacilitatorStore(), playerStore: new PlayerStore() });
    vi.mocked(QuestionModel.find).mockReturnValue({
      lean: vi.fn().mockResolvedValue([
        { _id: 'q-nd', normId: 'NR-06', text: 'Sem dificuldade?', options: ['A', 'B'], correctIndex: 0 },
      ]),
    } as never);
  });

  afterEach(() => {
    vi.mocked(QuestionModel.find).mockReturnValue({ lean: vi.fn().mockResolvedValue(mockQuestions) } as never);
  });

  it('usa "basic" como difficulty padrão quando ausente', async () => {
    const res = await request(app).get('/api/questions');
    expect(res.status).toBe(200);
    expect(res.body[0].difficulty).toBe('basic');
  });
});

describe('POST /api/questions — 500 error', () => {
  let app: ReturnType<typeof createApp>;
  let token: string;

  beforeEach(async () => {
    app = createApp({ facilitatorStore: new FacilitatorStore(), playerStore: new PlayerStore() });
    token = await getManagerToken(app);
    vi.mocked(QuestionModel.create).mockRejectedValue(new Error('DB error'));
  });

  afterEach(() => {
    vi.mocked(QuestionModel.create).mockImplementation((data) =>
      Promise.resolve({ _id: 'new-id', id: 'new-id', ...data } as never),
    );
  });

  it('retorna 500 quando banco falha ao criar questão', async () => {
    const res = await request(app)
      .post('/api/questions')
      .set('Authorization', `Bearer ${token}`)
      .send({ normId: 'NR-06', text: 'Falha?', options: ['A', 'B'], correctIndex: 0 });
    expect(res.status).toBe(500);
  });
});

describe('POST /api/questions/norms — 500 error', () => {
  let app: ReturnType<typeof createApp>;
  let token: string;

  beforeEach(async () => {
    app = createApp({ facilitatorStore: new FacilitatorStore(), playerStore: new PlayerStore() });
    token = await getManagerToken(app);
    vi.mocked(NormModel.findOneAndUpdate).mockImplementation(() => ({
      lean: vi.fn().mockRejectedValue(new Error('DB error')),
    }) as never);
  });

  afterEach(() => {
    vi.mocked(NormModel.findOneAndUpdate).mockImplementation((_filter, _update, _opts) => ({
      lean: vi.fn().mockResolvedValue({ normId: 'NR-33', title: 'Espaços Confinados' }),
    }) as never);
  });

  it('retorna 500 quando banco falha ao criar norma', async () => {
    const res = await request(app)
      .post('/api/questions/norms')
      .set('Authorization', `Bearer ${token}`)
      .send({ normId: 'NR-99', title: 'Erro' });
    expect(res.status).toBe(500);
  });
});

describe('DELETE /api/questions/norms/:normId — 500 error', () => {
  let app: ReturnType<typeof createApp>;
  let token: string;

  beforeEach(async () => {
    app = createApp({ facilitatorStore: new FacilitatorStore(), playerStore: new PlayerStore() });
    token = await getManagerToken(app);
    vi.mocked(NormModel.countDocuments).mockRejectedValue(new Error('DB error'));
  });

  afterEach(() => {
    vi.mocked(NormModel.countDocuments).mockResolvedValue(5);
  });

  it('retorna 500 quando banco falha ao deletar norma', async () => {
    const res = await request(app)
      .delete('/api/questions/norms/NR-06')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(500);
  });
});
