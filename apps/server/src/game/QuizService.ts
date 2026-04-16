// ─── Tipos públicos ───────────────────────────────────────────────────────────

export interface QuizQuestion {
  id: string;
  normId: string;
  text: string;
  options: string[];
  correctIndex: number;
}

export interface Norm {
  id: string;
  title: string;
}

export interface ServedQuestion {
  id: string;
  normId: string;
  text: string;
  options: string[]; // embaralhadas — sem correctIndex exposto
}

export interface QuizCheckResult {
  correct: boolean;
  correctText: string;
}

export type ShuffleFn = <T>(arr: T[]) => T[];

interface QuizServiceConfig {
  /** Banco de questões externo. Padrão: seed TCC (4 normas × 4 questões). */
  questions?: QuizQuestion[];
  /** Função de aleatoriedade injetável para testes determinísticos. */
  randomFn?: () => number;
}

// ─── Títulos conhecidos — extensível via NORM_TITLES ─────────────────────────
// Normas não listadas aqui usam o próprio normId como título.

const NORM_TITLES: Record<string, string> = {
  'NR-06': 'Equipamentos de Proteção Individual',
  'NR-10': 'Segurança em Instalações e Serviços em Eletricidade',
  'NR-12': 'Segurança no Trabalho em Máquinas e Equipamentos',
  'NR-35': 'Trabalho em Altura',
};

// ─── Seed padrão — 4 normas × 4 questões (TCC) ───────────────────────────────
// Substitua ou amplie passando `questions` no construtor.

const DEFAULT_QUESTIONS: QuizQuestion[] = [
  // ── NR-06 ─────────────────────────────────────────────────────────────────
  {
    id: 'nr06-q1', normId: 'NR-06',
    text: 'Qual é a responsabilidade do empregador em relação ao EPI?',
    options: [
      'Fornecer gratuitamente e fiscalizar o uso',
      'Cobrar parte do custo do trabalhador',
      'Deixar o trabalhador decidir se usa ou não',
      'Fornecer apenas quando houver acidente',
    ],
    correctIndex: 0,
  },
  {
    id: 'nr06-q2', normId: 'NR-06',
    text: 'O que é o CA (Certificado de Aprovação) do EPI?',
    options: [
      'Certificado emitido pelo Ministério do Trabalho que atesta que o EPI passou por testes de eficácia',
      'Comprovante de compra do equipamento',
      'Laudo médico autorizando o uso do EPI',
      'Registro interno da empresa de que o EPI foi entregue',
    ],
    correctIndex: 0,
  },
  {
    id: 'nr06-q3', normId: 'NR-06',
    text: 'Em qual situação o trabalhador pode se recusar a usar o EPI?',
    options: [
      'Nunca — o uso é obrigatório quando exigido',
      'Quando considerar desnecessário',
      'Em dias de calor intenso',
      'Quando o serviço durar menos de 30 minutos',
    ],
    correctIndex: 0,
  },
  {
    id: 'nr06-q4', normId: 'NR-06',
    text: 'Quem é responsável por guardar e conservar o EPI entre os usos?',
    options: [
      'O próprio trabalhador',
      'O setor de segurança',
      'O almoxarifado da empresa',
      'A CIPA',
    ],
    correctIndex: 0,
  },

  // ── NR-10 ─────────────────────────────────────────────────────────────────
  {
    id: 'nr10-q1', normId: 'NR-10',
    text: 'Qual tensão é considerada de extra-baixa tensão (EBT) pela NR-10?',
    options: [
      'Até 50 V em corrente alternada ou 120 V em corrente contínua',
      'Até 127 V em corrente alternada',
      'Até 220 V em corrente alternada',
      'Até 380 V em corrente alternada',
    ],
    correctIndex: 0,
  },
  {
    id: 'nr10-q2', normId: 'NR-10',
    text: 'O que significa "Bloqueio e Etiquetagem" (Lock-out/Tag-out)?',
    options: [
      'Procedimento que impede a energização acidental de equipamentos durante manutenção',
      'Sistema de controle de acesso às subestações',
      'Etiqueta de identificação dos circuitos elétricos',
      'Procedimento de desligamento definitivo de equipamentos',
    ],
    correctIndex: 0,
  },
  {
    id: 'nr10-q3', normId: 'NR-10',
    text: 'Qual EPI é obrigatório para trabalhos em instalações elétricas energizadas?',
    options: [
      'Luvas isolantes com CA, capacete com proteção elétrica e calçado isolante',
      'Apenas luvas de borracha comuns',
      'Óculos de proteção e cinto de segurança',
      'Avental de couro e botina de segurança convencional',
    ],
    correctIndex: 0,
  },
  {
    id: 'nr10-q4', normId: 'NR-10',
    text: 'Qual é a abordagem correta ao encontrar um fio elétrico exposto no trabalho?',
    options: [
      'Isolar a área e comunicar ao responsável técnico imediatamente',
      'Cobrir com fita isolante comum e continuar o trabalho',
      'Desligar o disjuntor mais próximo e resolver sozinho',
      'Ignorar se não houver cheiro de queimado',
    ],
    correctIndex: 0,
  },

  // ── NR-12 ─────────────────────────────────────────────────────────────────
  {
    id: 'nr12-q1', normId: 'NR-12',
    text: 'Qual dispositivo de segurança impede o acionamento acidental de máquinas?',
    options: [
      'Dispositivo de intertravamento (chave de segurança)',
      'Botão de emergência vermelho',
      'Sinalização de advertência',
      'Protetor auricular',
    ],
    correctIndex: 0,
  },
  {
    id: 'nr12-q2', normId: 'NR-12',
    text: 'O que é "zona de perigo" segundo a NR-12?',
    options: [
      'Espaço onde o trabalhador pode ser exposto a risco de lesão por partes móveis da máquina',
      'Área próxima a produtos químicos',
      'Local de armazenamento de máquinas desativadas',
      'Região de alto ruído na fábrica',
    ],
    correctIndex: 0,
  },
  {
    id: 'nr12-q3', normId: 'NR-12',
    text: 'Com que frequência mínima devem ser realizadas inspeções de segurança em máquinas críticas?',
    options: [
      'Conforme periodicidade definida no plano de manutenção, baseado na análise de risco',
      'Apenas quando ocorre acidente',
      'Uma vez por ano independentemente do risco',
      'A cada troca de operador',
    ],
    correctIndex: 0,
  },
  {
    id: 'nr12-q4', normId: 'NR-12',
    text: 'Quem pode operar máquinas e equipamentos com alto potencial de risco?',
    options: [
      'Somente trabalhadores capacitados e autorizados pelo empregador',
      'Qualquer funcionário da empresa após 1 dia de treinamento',
      'Apenas engenheiros de segurança',
      'Funcionários com mais de 5 anos de empresa',
    ],
    correctIndex: 0,
  },

  // ── NR-35 ─────────────────────────────────────────────────────────────────
  {
    id: 'nr35-q1', normId: 'NR-35',
    text: 'A partir de qual altura o trabalho é considerado "trabalho em altura" pela NR-35?',
    options: [
      '2 metros acima do nível inferior de referência',
      '1 metro acima do nível inferior de referência',
      '3 metros acima do nível inferior de referência',
      'Qualquer altura acima do solo',
    ],
    correctIndex: 0,
  },
  {
    id: 'nr35-q2', normId: 'NR-35',
    text: 'Qual documento é obrigatório antes de iniciar trabalho em altura?',
    options: [
      'Permissão de Trabalho (PT) emitida e autorizada pelo responsável',
      'Apenas o crachá de identificação do trabalhador',
      'Declaração verbal do supervisor',
      'Laudo geológico do local',
    ],
    correctIndex: 0,
  },
  {
    id: 'nr35-q3', normId: 'NR-35',
    text: 'O que é o "ponto de ancoragem" no trabalho em altura?',
    options: [
      'Elemento estrutural seguro ao qual o sistema de proteção individual é fixado',
      'Local onde o trabalhador descansa durante a atividade',
      'Ponto de abastecimento de EPI no canteiro',
      'Marca no piso indicando a área de risco',
    ],
    correctIndex: 0,
  },
  {
    id: 'nr35-q4', normId: 'NR-35',
    text: 'Quais condições climáticas podem suspender o trabalho em altura?',
    options: [
      'Tempestades, ventos fortes, raios ou outras condições que comprometam a segurança',
      'Apenas quando houver chuva torrencial',
      'Somente quando a temperatura ultrapassar 35 °C',
      'O clima nunca é motivo para interrupção se houver EPI',
    ],
    correctIndex: 0,
  },
];

// ─── Fisher-Yates shuffle (usa Math.random — não expõe randomFn injetável) ───

function defaultShuffle<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// ─── QuizService ─────────────────────────────────────────────────────────────

export class QuizService {
  private readonly questions: Map<string, QuizQuestion>;
  private readonly byNorm: Map<string, QuizQuestion[]>;
  private readonly norms: Norm[];
  private readonly randomFn: () => number;

  constructor(config: QuizServiceConfig = {}) {
    const rawQuestions = config.questions ?? DEFAULT_QUESTIONS;
    this.randomFn = config.randomFn ?? Math.random;

    this.questions = new Map(rawQuestions.map((q) => [q.id, q]));

    this.byNorm = new Map();
    for (const q of rawQuestions) {
      const group = this.byNorm.get(q.normId) ?? [];
      group.push(q);
      this.byNorm.set(q.normId, group);
    }

    this.norms = Array.from(this.byNorm.keys()).map((id) => ({
      id,
      title: NORM_TITLES[id] ?? id,
    }));
  }

  getAllQuestions(): QuizQuestion[] {
    return Array.from(this.questions.values());
  }

  getNorms(): Norm[] {
    return this.norms;
  }

  getQuestionsByNorm(normId: string): QuizQuestion[] {
    return this.byNorm.get(normId) ?? [];
  }

  getQuestion(id: string): QuizQuestion | undefined {
    return this.questions.get(id);
  }

  getRandomQuestion(normId?: string, exclude: Set<string> = new Set()): QuizQuestion {
    const pool = normId
      ? this.getQuestionsByNorm(normId).filter((q) => !exclude.has(q.id))
      : this.getAllQuestions().filter((q) => !exclude.has(q.id));

    if (pool.length === 0) {
      throw new Error(
        `QuizService: nenhuma questão disponível${normId ? ` para ${normId}` : ''} após aplicar exclusões`,
      );
    }

    const index = Math.floor(this.randomFn() * pool.length);
    return pool[index];
  }

  serveQuestion(id: string, shuffleFn: ShuffleFn = defaultShuffle): ServedQuestion | undefined {
    const q = this.questions.get(id);
    if (!q) return undefined;

    const { correctIndex: _omit, ...rest } = q;
    return { ...rest, options: shuffleFn(q.options) };
  }

  checkAnswer(questionId: string, selectedText: string): QuizCheckResult {
    const q = this.questions.get(questionId);
    if (!q) return { correct: false, correctText: '' };
    const correctText = q.options[q.correctIndex];
    return { correct: selectedText === correctText, correctText };
  }
}
