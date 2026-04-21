import { Router } from 'express';
import { z } from 'zod';
import { QuestionModel } from '../db/models/Question.model.js';
import { NormModel } from '../db/models/Norm.model.js';
import { QuizService } from '../game/QuizService.js';
import { jwtMiddleware } from '../auth/jwt.middleware.js';

const NORM_TITLES: Record<string, string> = {
  'NR-06': 'Equipamentos de Proteção Individual',
  'NR-10': 'Segurança em Instalações e Serviços em Eletricidade',
  'NR-12': 'Segurança no Trabalho em Máquinas e Equipamentos',
  'NR-35': 'Trabalho em Altura',
};

const MIN_NORMS = 4;

const questionPayloadSchema = z.object({
  normId: z.string().min(1),
  text: z.string().min(1),
  options: z.array(z.string().min(1)).min(2).max(4),
  correctIndex: z.number().int().min(0),
  difficulty: z.enum(['basic', 'intermediate', 'advanced']).optional(),
}).refine((d) => d.correctIndex < d.options.length, {
  message: 'correctIndex fora do range de opções',
});

const questionPatchSchema = z.object({
  normId: z.string().min(1).optional(),
  text: z.string().min(1).optional(),
  options: z.array(z.string().min(1)).min(2).max(4).optional(),
  correctIndex: z.number().int().min(0).optional(),
  difficulty: z.enum(['basic', 'intermediate', 'advanced']).optional(),
});

const fallbackService = new QuizService();

export function createQuestionsRouter(): Router {
  const router = Router();

  // ─── Públicas ──────────────────────────────────────────────────────────────

  router.get('/norms', async (_req, res) => {
    try {
      // Tenta NormModel primeiro (registro explícito de normas)
      const normDocs = await NormModel.find().lean();
      if (normDocs.length > 0) {
        res.json(normDocs.map((d) => ({ normId: d.normId as string, title: d.title as string })));
        return;
      }
      // Fallback: deriva das questões existentes
      const qDocs = await QuestionModel.find().lean();
      const normIds = [...new Set(qDocs.map((d) => d.normId as string))];
      if (normIds.length > 0) {
        res.json(normIds.map((id) => ({ normId: id, title: NORM_TITLES[id] ?? id })));
        return;
      }
    } catch { /* fallback */ }
    const norms = fallbackService.getNorms().map((n) => ({ normId: n.id, title: n.title }));
    res.json(norms);
  });

  router.get('/', async (_req, res) => {
    try {
      const docs = await QuestionModel.find().lean();
      if (docs.length > 0) {
        res.json(docs.map((d) => ({
          id: (d._id as object).toString(),
          normId: d.normId,
          text: d.text,
          options: d.options,
          correctIndex: d.correctIndex,
          difficulty: d.difficulty ?? 'basic',
        })));
        return;
      }
    } catch { /* fallback */ }

    res.json(fallbackService.getAllQuestions());
  });

  // ─── Protegidas (manager auth) ─────────────────────────────────────────────

  router.use(jwtMiddleware);

  router.post('/norms', async (req, res) => {
    const parse = z.object({ normId: z.string().min(1), title: z.string().min(1) }).safeParse(req.body);
    if (!parse.success) { res.status(400).json({ error: parse.error.flatten() }); return; }
    try {
      const doc = await NormModel.findOneAndUpdate(
        { normId: parse.data.normId },
        { $setOnInsert: parse.data },
        { upsert: true, new: true },
      ).lean();
      res.status(201).json({ normId: doc!.normId as string, title: doc!.title as string });
    } catch { res.status(500).json({ error: 'Failed to create norm' }); }
  });

  router.delete('/norms/:normId', async (req, res) => {
    try {
      const count = await NormModel.countDocuments();
      if (count <= MIN_NORMS) {
        res.status(409).json({ error: `Mínimo de ${MIN_NORMS} temas exigido` });
        return;
      }
      const deleted = await NormModel.findOneAndDelete({ normId: req.params.normId }).lean();
      if (!deleted) { res.status(404).json({ error: 'Norm not found' }); return; }
      // Remove todas as questões desse tema
      await QuestionModel.deleteMany({ normId: req.params.normId });
      res.json({ deleted: true });
    } catch { res.status(500).json({ error: 'Failed to delete norm' }); }
  });

  router.post('/', async (req, res) => {
    const parse = questionPayloadSchema.safeParse(req.body);
    if (!parse.success) {
      res.status(400).json({ error: parse.error.flatten() });
      return;
    }
    try {
      const doc = await QuestionModel.create(parse.data);
      res.status(201).json({
        id: (doc._id as object).toString(),
        normId: doc.normId,
        text: doc.text,
        options: doc.options,
        correctIndex: doc.correctIndex,
        difficulty: doc.difficulty,
      });
    } catch {
      res.status(500).json({ error: 'Failed to create question' });
    }
  });

  router.patch('/:id', async (req, res) => {
    const parse = questionPatchSchema.safeParse(req.body);
    if (!parse.success) {
      res.status(400).json({ error: parse.error.flatten() });
      return;
    }
    try {
      const doc = await QuestionModel.findByIdAndUpdate(
        req.params.id,
        { $set: parse.data },
        // Note: { new: true } would return updated doc but we use lean separately
      ).lean();
      if (!doc) {
        res.status(404).json({ error: 'Question not found' });
        return;
      }
      res.json({ id: (doc._id as object).toString(), ...doc });
    } catch {
      res.status(500).json({ error: 'Failed to update question' });
    }
  });

  router.delete('/:id', async (req, res) => {
    try {
      const doc = await QuestionModel.findByIdAndDelete(req.params.id).lean();
      if (!doc) {
        res.status(404).json({ error: 'Question not found' });
        return;
      }
      res.json({ deleted: true });
    } catch {
      res.status(500).json({ error: 'Failed to delete question' });
    }
  });

  return router;
}
