import { describe, it, expect } from 'vitest';
import { QuizService, type QuizQuestion } from '../../game/QuizService.js';

// ─── RED: falha até QuizService.ts ser implementado ──────────────────────────

// Banco mínimo para testes unitários (independe do seed padrão)
const makeQuestion = (id: string, normId: string, correctIndex = 0): QuizQuestion => ({
  id,
  normId,
  text: `Pergunta ${id}`,
  options: ['Opção A', 'Opção B', 'Opção C', 'Opção D'],
  correctIndex,
});

const TEST_QUESTIONS: QuizQuestion[] = [
  makeQuestion('q1', 'NR-06', 0),
  makeQuestion('q2', 'NR-06', 1),
  makeQuestion('q3', 'NR-10', 2),
  makeQuestion('q4', 'NR-10', 3),
];

describe('QuizService — banco configurável', () => {
  it('aceita banco de questões externo no construtor', () => {
    const svc = new QuizService({ questions: TEST_QUESTIONS });
    expect(svc.getAllQuestions()).toHaveLength(4);
  });

  it('banco padrão tem mínimo 16 questões (4 normas × 4 para o TCC)', () => {
    const svc = new QuizService();
    expect(svc.getAllQuestions().length).toBeGreaterThanOrEqual(16);
  });

  it('normas são derivadas das questões — sem hardcode', () => {
    const custom: QuizQuestion[] = [
      makeQuestion('x1', 'NR-CUSTOM-A', 0),
      makeQuestion('x2', 'NR-CUSTOM-B', 1),
    ];
    const svc = new QuizService({ questions: custom });
    const normIds = svc.getNorms().map((n) => n.id);
    expect(normIds).toContain('NR-CUSTOM-A');
    expect(normIds).toContain('NR-CUSTOM-B');
  });

  it('cada questão tem id, normId, text, 4 options e correctIndex', () => {
    const svc = new QuizService({ questions: TEST_QUESTIONS });
    for (const q of svc.getAllQuestions()) {
      expect(typeof q.id).toBe('string');
      expect(typeof q.normId).toBe('string');
      expect(typeof q.text).toBe('string');
      expect(q.options).toHaveLength(4);
      expect(q.correctIndex).toBeGreaterThanOrEqual(0);
      expect(q.correctIndex).toBeLessThanOrEqual(3);
    }
  });

  it('ids de questões são únicos', () => {
    const svc = new QuizService();
    const ids = svc.getAllQuestions().map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('textos de questões são únicos no banco padrão', () => {
    const svc = new QuizService();
    const texts = svc.getAllQuestions().map((q) => q.text);
    expect(new Set(texts).size).toBe(texts.length);
  });

  it('getNorms retorna normas únicas derivadas das questões', () => {
    const svc = new QuizService({ questions: TEST_QUESTIONS });
    const norms = svc.getNorms();
    expect(norms).toHaveLength(2); // NR-06 e NR-10
    expect(norms.map((n) => n.id).sort()).toEqual(['NR-06', 'NR-10']);
  });

  it('cada norma tem id e title', () => {
    const svc = new QuizService();
    for (const n of svc.getNorms()) {
      expect(typeof n.id).toBe('string');
      expect(typeof n.title).toBe('string');
    }
  });

  it('getQuestionsByNorm retorna só questões da norma solicitada', () => {
    const svc = new QuizService({ questions: TEST_QUESTIONS });
    const q06 = svc.getQuestionsByNorm('NR-06');
    expect(q06).toHaveLength(2);
    expect(q06.every((q) => q.normId === 'NR-06')).toBe(true);
  });

  it('getQuestionsByNorm retorna vazio para norma desconhecida', () => {
    const svc = new QuizService({ questions: TEST_QUESTIONS });
    expect(svc.getQuestionsByNorm('NR-99')).toHaveLength(0);
  });

  it('getQuestion retorna questão pelo id', () => {
    const svc = new QuizService({ questions: TEST_QUESTIONS });
    expect(svc.getQuestion('q1')).toEqual(TEST_QUESTIONS[0]);
  });

  it('getQuestion retorna undefined para id desconhecido', () => {
    const svc = new QuizService({ questions: TEST_QUESTIONS });
    expect(svc.getQuestion('nao-existe')).toBeUndefined();
  });
});

describe('QuizService — seleção aleatória', () => {
  it('getRandomQuestion retorna questão válida sem filtro de norma', () => {
    const svc = new QuizService({ questions: TEST_QUESTIONS });
    const q = svc.getRandomQuestion();
    expect(q.options).toHaveLength(4);
  });

  it('getRandomQuestion retorna questão da norma solicitada', () => {
    const svc = new QuizService({ questions: TEST_QUESTIONS });
    const q = svc.getRandomQuestion('NR-06');
    expect(q.normId).toBe('NR-06');
  });

  it('getRandomQuestion respeita conjunto de ids excluídos', () => {
    const svc = new QuizService({ questions: TEST_QUESTIONS });
    // Exclui q1 — só resta q2 na NR-06
    const q = svc.getRandomQuestion('NR-06', new Set(['q1']));
    expect(q.id).toBe('q2');
  });

  it('randomFn injetável torna a seleção determinística', () => {
    // randomFn = () => 0 → índice 0, sempre o primeiro da lista da norma
    const svc = new QuizService({ questions: TEST_QUESTIONS, randomFn: () => 0 });
    expect(svc.getRandomQuestion('NR-10').id).toBe('q3');
  });

  it('lança erro se todos os ids da norma estiverem excluídos', () => {
    const svc = new QuizService({ questions: TEST_QUESTIONS });
    const excluded = new Set(['q1', 'q2']);
    expect(() => svc.getRandomQuestion('NR-06', excluded)).toThrow();
  });
});

describe('QuizService — servir e validar', () => {
  it('serveQuestion retorna id, normId, text e options (mesmas do original)', () => {
    const svc = new QuizService({ questions: TEST_QUESTIONS });
    const served = svc.serveQuestion('q1');
    expect(served!.id).toBe('q1');
    expect(served!.normId).toBe('NR-06');
    expect(served!.options).toHaveLength(4);
    expect(served!.options.sort()).toEqual([...TEST_QUESTIONS[0].options].sort());
  });

  it('serveQuestion NÃO expõe correctIndex', () => {
    const svc = new QuizService({ questions: TEST_QUESTIONS });
    const served = svc.serveQuestion('q1');
    expect(served).not.toHaveProperty('correctIndex');
  });

  it('serveQuestion retorna undefined para id desconhecido', () => {
    const svc = new QuizService({ questions: TEST_QUESTIONS });
    expect(svc.serveQuestion('nao-existe')).toBeUndefined();
  });

  it('shuffleFn injetável mantém ordem original quando é identidade', () => {
    const noShuffle = <T>(arr: T[]) => [...arr];
    const svc = new QuizService({ questions: TEST_QUESTIONS });
    const served = svc.serveQuestion('q1', noShuffle);
    expect(served!.options).toEqual(TEST_QUESTIONS[0].options);
  });

  it('checkAnswer retorna correct:true para o texto da opção correta', () => {
    const svc = new QuizService({ questions: TEST_QUESTIONS });
    const q = TEST_QUESTIONS[0]; // correctIndex = 0 → 'Opção A'
    const result = svc.checkAnswer('q1', 'Opção A');
    expect(result.correct).toBe(true);
    expect(result.correctText).toBe('Opção A');
  });

  it('checkAnswer retorna correct:false para texto errado', () => {
    const svc = new QuizService({ questions: TEST_QUESTIONS });
    const result = svc.checkAnswer('q1', 'Opção B'); // correto é Opção A
    expect(result.correct).toBe(false);
    expect(result.correctText).toBe('Opção A');
  });

  it('checkAnswer retorna correct:false para id desconhecido', () => {
    const svc = new QuizService({ questions: TEST_QUESTIONS });
    expect(svc.checkAnswer('nao-existe', 'qualquer').correct).toBe(false);
  });
});
