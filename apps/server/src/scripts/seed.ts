import 'dotenv/config';
import { connectDB, disconnectDB } from '../db/connection.js';
import { QuestionModel } from '../db/models/Question.model.js';

const QUESTIONS = [
  // NR-06
  { normId: 'NR-06', text: 'Qual é a obrigação do empregador segundo a NR-06?', options: ['Fornecer EPI adequado gratuitamente', 'Cobrar pelo EPI', 'Deixar o trabalhador escolher', 'Fornecer apenas EPCs'], correctIndex: 0, difficulty: 'basic' as const },
  { normId: 'NR-06', text: 'O que deve constar no EPI para ser considerado legal?', options: ['CA — Certificado de Aprovação', 'Apenas a marca', 'Garantia do fabricante', 'Nota fiscal'], correctIndex: 0, difficulty: 'basic' as const },
  { normId: 'NR-06', text: 'Em caso de dano do EPI por negligência do trabalhador, o empregador pode descontar do salário?', options: ['Somente se houver acordo coletivo', 'Sempre pode descontar', 'Nunca pode descontar', 'Pode reter férias'], correctIndex: 0, difficulty: 'intermediate' as const },
  // NR-10
  { normId: 'NR-10', text: 'Bloqueio e etiquetagem (LOTO) deve ser aplicado em:', options: ['Toda manutenção elétrica', 'Apenas instalações de alta tensão', 'Somente à noite', 'Apenas por eletricistas'], correctIndex: 0, difficulty: 'basic' as const },
  { normId: 'NR-10', text: 'O que é obrigatório antes de iniciar serviço em instalação elétrica?', options: ['Verificar ausência de tensão', 'Usar qualquer luva', 'Avisar o supervisor depois', 'Ligar o disjuntor principal'], correctIndex: 0, difficulty: 'basic' as const },
  { normId: 'NR-10', text: 'Qual documento é exigido para trabalho em instalações elétricas?', options: ['Ordem de Serviço com APR', 'Apenas crachá de acesso', 'Anotação em caderno', 'E-mail do supervisor'], correctIndex: 0, difficulty: 'intermediate' as const },
  // NR-12
  { normId: 'NR-12', text: 'Proteções fixas em máquinas devem ser removidas:', options: ['Somente com ferramentas, por pessoal autorizado', 'A qualquer tempo manualmente', 'Para ganho de produção', 'Apenas em manutenções anuais'], correctIndex: 0, difficulty: 'basic' as const },
  { normId: 'NR-12', text: 'O que é o Dispositivo de Parada de Emergência?', options: ['Botão que desliga a máquina imediatamente', 'Pausa temporária do equipamento', 'Desaceleração gradual', 'Alarme sonoro'], correctIndex: 0, difficulty: 'basic' as const },
  { normId: 'NR-12', text: 'O checklist de máquinas deve ser realizado:', options: ['Antes de cada jornada', 'Mensalmente', 'Só após manutenção', 'Anualmente'], correctIndex: 0, difficulty: 'basic' as const },
  // NR-35
  { normId: 'NR-35', text: 'Considera-se trabalho em altura quando a atividade ocorre acima de:', options: ['2 metros do nível inferior', '1 metro', '3 metros', '5 metros'], correctIndex: 0, difficulty: 'basic' as const },
  { normId: 'NR-35', text: 'O cinto de segurança tipo paraquedista é obrigatório em:', options: ['Trabalho em altura com risco de queda', 'Toda atividade externa', 'Apenas em torres', 'Somente em andaimes'], correctIndex: 0, difficulty: 'basic' as const },
  { normId: 'NR-35', text: 'A APR em trabalho em altura deve ser:', options: ['Realizada antes de iniciar a atividade', 'Realizada após o trabalho', 'Opcional para equipes experientes', 'Feita apenas na primeira vez'], correctIndex: 0, difficulty: 'intermediate' as const },
];

async function seed(): Promise<void> {
  await connectDB();
  const count = await QuestionModel.countDocuments();
  if (count > 0) {
    console.log(`[seed] ${count} perguntas já existem — seed ignorado`);
    await disconnectDB();
    return;
  }
  await QuestionModel.insertMany(QUESTIONS);
  console.log(`[seed] ${QUESTIONS.length} perguntas inseridas`);
  await disconnectDB();
}

seed().catch((err) => {
  console.error('[seed] falhou:', err);
  process.exit(1);
});
