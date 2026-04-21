import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ManagerContentPage } from '../../manager/ManagerContentPage';
import type { QuizQuestionFull, QuizQuestionPayload } from '@safety-board/shared';

// ─── RED: falha até ManagerContentPage.tsx ser implementado ──────────────────

const norms = [
  { normId: 'NR-06', title: 'Equipamentos de Proteção Individual' },
  { normId: 'NR-10', title: 'Segurança em Instalações Elétricas' },
];

const makeQuestions = (): QuizQuestionFull[] => [
  { id: 'q1', normId: 'NR-06', text: 'Pergunta NR06?', options: ['A', 'B', 'C', 'D'], correctIndex: 0, difficulty: 'basic' },
  { id: 'q2', normId: 'NR-06', text: 'Outra NR06?', options: ['X', 'Y'], correctIndex: 1, difficulty: 'intermediate' },
  { id: 'q3', normId: 'NR-10', text: 'Pergunta NR10?', options: ['P', 'Q', 'R'], correctIndex: 2, difficulty: 'basic' },
];

const defaultProps = {
  norms,
  questions: makeQuestions(),
  onSaveQuestion: vi.fn(),
  onAddQuestion: vi.fn(),
  onDeleteQuestion: vi.fn(),
  onAddNorm: vi.fn(),
  onDeleteNorm: vi.fn(),
};

describe('ManagerContentPage', () => {
  it('exibe tabs de NR', () => {
    render(<ManagerContentPage {...defaultProps} />);
    expect(screen.getByTestId('norm-tab-NR-06')).toBeInTheDocument();
    expect(screen.getByTestId('norm-tab-NR-10')).toBeInTheDocument();
  });

  it('NR ativa por padrão é a primeira', () => {
    render(<ManagerContentPage {...defaultProps} />);
    expect(screen.getByTestId('norm-tab-NR-06')).toHaveAttribute('data-active', 'true');
  });

  it('filtra questões pelo normId selecionado', () => {
    render(<ManagerContentPage {...defaultProps} />);
    expect(screen.getAllByTestId(/^question-row-/)).toHaveLength(2); // NR-06 tem 2
  });

  it('ao clicar em outra NR, exibe questões dessa NR', () => {
    render(<ManagerContentPage {...defaultProps} />);
    fireEvent.click(screen.getByTestId('norm-tab-NR-10'));
    expect(screen.getAllByTestId(/^question-row-/)).toHaveLength(1); // NR-10 tem 1
  });

  it('botão Editar ativa modo edição na linha', () => {
    render(<ManagerContentPage {...defaultProps} />);
    fireEvent.click(screen.getByTestId('question-edit-q1'));
    expect(screen.getByTestId('question-input-text-q1')).toBeInTheDocument();
  });

  it('campo de texto editável exibe valor atual', () => {
    render(<ManagerContentPage {...defaultProps} />);
    fireEvent.click(screen.getByTestId('question-edit-q1'));
    expect(screen.getByTestId('question-input-text-q1')).toHaveValue('Pergunta NR06?');
  });

  it('botão Salvar chama onSaveQuestion com payload correto', () => {
    const onSaveQuestion = vi.fn();
    render(<ManagerContentPage {...defaultProps} onSaveQuestion={onSaveQuestion} />);
    fireEvent.click(screen.getByTestId('question-edit-q1'));
    fireEvent.change(screen.getByTestId('question-input-text-q1'), { target: { value: 'Texto novo' } });
    fireEvent.click(screen.getByTestId('question-save-q1'));
    expect(onSaveQuestion).toHaveBeenCalledWith('q1', expect.objectContaining({ text: 'Texto novo' }));
  });

  it('botão Excluir chama onDeleteQuestion', () => {
    const onDeleteQuestion = vi.fn();
    render(<ManagerContentPage {...defaultProps} onDeleteQuestion={onDeleteQuestion} />);
    fireEvent.click(screen.getByTestId('question-delete-q1'));
    expect(onDeleteQuestion).toHaveBeenCalledWith('q1');
  });

  it('formulário de nova questão chama onAddQuestion', () => {
    const onAddQuestion = vi.fn();
    render(<ManagerContentPage {...defaultProps} onAddQuestion={onAddQuestion} />);
    fireEvent.change(screen.getByTestId('new-question-text'), { target: { value: 'Nova pergunta?' } });
    fireEvent.change(screen.getByTestId('new-question-option-0'), { target: { value: 'Opção A' } });
    fireEvent.change(screen.getByTestId('new-question-option-1'), { target: { value: 'Opção B' } });
    fireEvent.click(screen.getByTestId('new-question-submit'));
    expect(onAddQuestion).toHaveBeenCalledWith(expect.objectContaining({
      text: 'Nova pergunta?',
      normId: 'NR-06',
    }));
  });

  it('botão "+ Novo Tema" exibe formulário de nova NR', () => {
    render(<ManagerContentPage {...defaultProps} />);
    fireEvent.click(screen.getByTestId('add-norm-btn'));
    expect(screen.getByTestId('new-norm-form')).toBeInTheDocument();
  });

  it('formulário de nova NR chama onAddNorm com normId e title', () => {
    const onAddNorm = vi.fn();
    render(<ManagerContentPage {...defaultProps} onAddNorm={onAddNorm} />);
    fireEvent.click(screen.getByTestId('add-norm-btn'));
    fireEvent.change(screen.getByTestId('new-norm-id'), { target: { value: 'NR-33' } });
    fireEvent.change(screen.getByTestId('new-norm-title'), { target: { value: 'Espaços Confinados' } });
    fireEvent.click(screen.getByTestId('new-norm-submit'));
    expect(onAddNorm).toHaveBeenCalledWith('NR-33', 'Espaços Confinados');
  });

  it('não exibe botão excluir NR quando há apenas 2 normas (mínimo 4)', () => {
    render(<ManagerContentPage {...defaultProps} />);
    expect(screen.queryByTestId('delete-norm-btn-NR-06')).not.toBeInTheDocument();
  });

  it('exibe badge de dificuldade colorido na linha da questão', () => {
    render(<ManagerContentPage {...defaultProps} />);
    expect(screen.getByTestId('question-row-q1').textContent).toMatch(/Básico/i);
    expect(screen.getByTestId('question-row-q2').textContent).toMatch(/Interm/i);
  });
});
