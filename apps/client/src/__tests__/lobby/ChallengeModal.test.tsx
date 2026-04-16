import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { ChallengeModal } from '../../lobby/ChallengeModal';

// ─── RED: falha até ChallengeModal.tsx ser implementado ──────────────────────

const fakeQuestion = {
  id: 'q1',
  normId: 'NR-06',
  text: 'O que significa EPI?',
  options: ['Equipamento de Proteção Individual', 'Equipamento de Prevenção de Incêndio', 'Equipamento de Proteção Interna', 'Equipamento de Primeiros-socorros Integrado'],
};

describe('ChallengeModal', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('não renderiza nada quando open é false', () => {
    render(<ChallengeModal open={false} question={fakeQuestion} onAnswer={vi.fn()} onTimeout={vi.fn()} />);
    expect(screen.queryByTestId('challenge-modal')).not.toBeInTheDocument();
  });

  it('renderiza o modal quando open é true', () => {
    render(<ChallengeModal open={true} question={fakeQuestion} onAnswer={vi.fn()} onTimeout={vi.fn()} />);
    expect(screen.getByTestId('challenge-modal')).toBeInTheDocument();
  });

  it('exibe o texto da pergunta', () => {
    render(<ChallengeModal open={true} question={fakeQuestion} onAnswer={vi.fn()} onTimeout={vi.fn()} />);
    expect(screen.getByTestId('challenge-question')).toHaveTextContent('O que significa EPI?');
  });

  it('exibe a norma relacionada', () => {
    render(<ChallengeModal open={true} question={fakeQuestion} onAnswer={vi.fn()} onTimeout={vi.fn()} />);
    expect(screen.getByTestId('challenge-norm')).toHaveTextContent('NR-06');
  });

  it('exibe 4 botões de opção', () => {
    render(<ChallengeModal open={true} question={fakeQuestion} onAnswer={vi.fn()} onTimeout={vi.fn()} />);
    expect(screen.getAllByTestId(/^challenge-option-/)).toHaveLength(4);
  });

  it('chama onAnswer com o texto da opção selecionada', () => {
    const onAnswer = vi.fn();
    render(<ChallengeModal open={true} question={fakeQuestion} onAnswer={onAnswer} onTimeout={vi.fn()} />);
    fireEvent.click(screen.getByTestId('challenge-option-0'));
    expect(onAnswer).toHaveBeenCalledWith(fakeQuestion.options[0]);
  });

  it('desabilita opções após resposta', () => {
    render(<ChallengeModal open={true} question={fakeQuestion} onAnswer={vi.fn()} onTimeout={vi.fn()} />);
    fireEvent.click(screen.getByTestId('challenge-option-1'));
    for (let i = 0; i < 4; i++) {
      expect(screen.getByTestId(`challenge-option-${i}`)).toBeDisabled();
    }
  });

  it('exibe o timer inicial (30 segundos por padrão)', () => {
    render(<ChallengeModal open={true} question={fakeQuestion} onAnswer={vi.fn()} onTimeout={vi.fn()} />);
    expect(screen.getByTestId('challenge-timer')).toHaveTextContent('30');
  });

  it('timer decrementa a cada segundo', () => {
    render(<ChallengeModal open={true} question={fakeQuestion} onAnswer={vi.fn()} onTimeout={vi.fn()} />);
    act(() => { vi.advanceTimersByTime(5000); });
    expect(screen.getByTestId('challenge-timer')).toHaveTextContent('25');
  });

  it('chama onTimeout quando o timer chega a zero', () => {
    const onTimeout = vi.fn();
    render(<ChallengeModal open={true} question={fakeQuestion} onAnswer={vi.fn()} onTimeout={onTimeout} />);
    act(() => { vi.advanceTimersByTime(30_000); });
    expect(onTimeout).toHaveBeenCalledTimes(1);
  });

  it('aceita timeoutSeconds customizado', () => {
    render(<ChallengeModal open={true} question={fakeQuestion} onAnswer={vi.fn()} onTimeout={vi.fn()} timeoutSeconds={10} />);
    expect(screen.getByTestId('challenge-timer')).toHaveTextContent('10');
  });

  it('exibe resultado correto quando result="correct"', () => {
    render(<ChallengeModal open={true} question={fakeQuestion} onAnswer={vi.fn()} onTimeout={vi.fn()} result="correct" />);
    expect(screen.getByTestId('challenge-result')).toHaveTextContent(/correto/i);
  });

  it('exibe resultado incorreto quando result="incorrect"', () => {
    render(<ChallengeModal open={true} question={fakeQuestion} onAnswer={vi.fn()} onTimeout={vi.fn()} result="incorrect" />);
    expect(screen.getByTestId('challenge-result')).toHaveTextContent(/incorreto/i);
  });

  it('não exibe resultado quando result é undefined', () => {
    render(<ChallengeModal open={true} question={fakeQuestion} onAnswer={vi.fn()} onTimeout={vi.fn()} />);
    expect(screen.queryByTestId('challenge-result')).not.toBeInTheDocument();
  });
});
