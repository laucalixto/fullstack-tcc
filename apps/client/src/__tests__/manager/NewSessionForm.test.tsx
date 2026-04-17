import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { NewSessionForm } from '../../manager/NewSessionForm';

// ─── RED: falha até NewSessionForm.tsx ser implementado ──────────────────────

describe('NewSessionForm', () => {
  it('renderiza opção de dificuldade básica', () => {
    render(<NewSessionForm onCreateSession={vi.fn()} />);
    expect(screen.getByTestId('session-difficulty-basic')).toBeInTheDocument();
  });

  it('renderiza opção de dificuldade intermediária', () => {
    render(<NewSessionForm onCreateSession={vi.fn()} />);
    expect(screen.getByTestId('session-difficulty-intermediate')).toBeInTheDocument();
  });

  it('renderiza opção de dificuldade avançada', () => {
    render(<NewSessionForm onCreateSession={vi.fn()} />);
    expect(screen.getByTestId('session-difficulty-advanced')).toBeInTheDocument();
  });

  it('renderiza select de número de participantes', () => {
    render(<NewSessionForm onCreateSession={vi.fn()} />);
    expect(screen.getByTestId('session-max-players')).toBeInTheDocument();
  });

  it('renderiza botão de gerar PIN', () => {
    render(<NewSessionForm onCreateSession={vi.fn()} />);
    expect(screen.getByTestId('session-generate-pin')).toBeInTheDocument();
  });

  it('dificuldade básica selecionada por padrão', () => {
    render(<NewSessionForm onCreateSession={vi.fn()} />);
    expect(screen.getByTestId('session-difficulty-basic')).toBeChecked();
    expect(screen.getByTestId('session-difficulty-intermediate')).not.toBeChecked();
    expect(screen.getByTestId('session-difficulty-advanced')).not.toBeChecked();
  });

  it('chama onCreateSession com difficulty e maxPlayers ao clicar em Gerar PIN', () => {
    const onCreateSession = vi.fn();
    render(<NewSessionForm onCreateSession={onCreateSession} />);
    fireEvent.click(screen.getByTestId('session-difficulty-advanced'));
    fireEvent.change(screen.getByTestId('session-max-players'), { target: { value: '3' } });
    fireEvent.click(screen.getByTestId('session-generate-pin'));
    expect(onCreateSession).toHaveBeenCalledWith({ difficulty: 'advanced', maxPlayers: 3 });
  });

  it('não exibe PIN quando generatedPin não está definido', () => {
    render(<NewSessionForm onCreateSession={vi.fn()} />);
    expect(screen.queryByTestId('session-pin-display')).not.toBeInTheDocument();
  });

  it('exibe o PIN gerado quando generatedPin está definido', () => {
    render(<NewSessionForm onCreateSession={vi.fn()} generatedPin="775062" />);
    expect(screen.getByTestId('session-pin-display')).toHaveTextContent('775062');
  });

  it('exibe o share link quando shareLink está definido', () => {
    render(<NewSessionForm onCreateSession={vi.fn()} generatedPin="775062" shareLink="/sala/775062" />);
    expect(screen.getByTestId('session-share-link')).toHaveTextContent('/sala/775062');
  });

  it('desabilita botão de gerar PIN quando isLoading=true', () => {
    render(<NewSessionForm onCreateSession={vi.fn()} isLoading />);
    expect(screen.getByTestId('session-generate-pin')).toBeDisabled();
  });
});
