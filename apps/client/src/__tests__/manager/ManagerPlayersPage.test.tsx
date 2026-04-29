import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ManagerPlayersPage } from '../../manager/ManagerPlayersPage';
import type { ManagedPlayer } from '@safety-board/shared';

// ─── RED: falha até ManagerPlayersPage.tsx ser implementado ──────────────────

const makePlayers = (n: number): ManagedPlayer[] =>
  Array.from({ length: n }, (_, i) => ({
    playerId: `p-${i}`,
    firstName: `Nome${i}`,
    lastName: `Sobrenome${i}`,
    email: `player${i}@test.com`,
    industrialUnit: `Unidade ${i}`,
    totalScore: i * 100,
    gameCount: i,
    createdAt: new Date().toISOString(),
  }));

describe('ManagerPlayersPage', () => {
  it('renderiza tabela com dados dos jogadores', () => {
    render(<ManagerPlayersPage players={makePlayers(3)} onSave={vi.fn()} />);
    expect(screen.getAllByTestId(/^player-row-/)).toHaveLength(3);
  });

  it('exibe nome completo do jogador', () => {
    render(<ManagerPlayersPage players={makePlayers(1)} onSave={vi.fn()} />);
    expect(screen.getByTestId('player-row-p-0')).toHaveTextContent('Nome0 Sobrenome0');
  });

  it('exibe email do jogador', () => {
    render(<ManagerPlayersPage players={makePlayers(1)} onSave={vi.fn()} />);
    expect(screen.getByTestId('player-row-p-0')).toHaveTextContent('player0@test.com');
  });

  it('botão Editar ativa modo de edição na linha', () => {
    render(<ManagerPlayersPage players={makePlayers(1)} onSave={vi.fn()} />);
    fireEvent.click(screen.getByTestId('player-edit-p-0'));
    expect(screen.getByTestId('player-input-firstName-p-0')).toBeInTheDocument();
  });

  it('campo de firstName editável exibe valor atual', () => {
    render(<ManagerPlayersPage players={makePlayers(1)} onSave={vi.fn()} />);
    fireEvent.click(screen.getByTestId('player-edit-p-0'));
    expect(screen.getByTestId('player-input-firstName-p-0')).toHaveValue('Nome0');
  });

  it('botão Cancelar restaura valores originais e fecha edição', () => {
    render(<ManagerPlayersPage players={makePlayers(1)} onSave={vi.fn()} />);
    fireEvent.click(screen.getByTestId('player-edit-p-0'));
    fireEvent.change(screen.getByTestId('player-input-firstName-p-0'), { target: { value: 'Alterado' } });
    fireEvent.click(screen.getByTestId('player-cancel-p-0'));
    expect(screen.queryByTestId('player-input-firstName-p-0')).not.toBeInTheDocument();
    expect(screen.getByTestId('player-row-p-0')).toHaveTextContent('Nome0 Sobrenome0');
  });

  it('botão Salvar chama onSave com patch correto', () => {
    const onSave = vi.fn();
    render(<ManagerPlayersPage players={makePlayers(1)} onSave={onSave} />);
    fireEvent.click(screen.getByTestId('player-edit-p-0'));
    fireEvent.change(screen.getByTestId('player-input-firstName-p-0'), { target: { value: 'NovoNome' } });
    fireEvent.click(screen.getByTestId('player-save-p-0'));
    expect(onSave).toHaveBeenCalledWith('p-0', expect.objectContaining({ firstName: 'NovoNome' }));
  });

  it('renderiza lista vazia sem erros', () => {
    render(<ManagerPlayersPage players={[]} onSave={vi.fn()} />);
    expect(screen.queryAllByTestId(/^player-row-/)).toHaveLength(0);
  });

  // ─── Score negativo via digitação direta ─────────────────────────────────
  // Bug: input type="number" com onChange={Number(e.target.value)} descarta o
  // "-" durante digitação parcial (Number("-") = NaN → coerção para 0). Setas
  // do spinner funcionam porque entregam valor completo. Fix: aceitar "-" e
  // string vazia como estados transicionais.
  it('aceita digitar "-15" diretamente no campo de score (não zera no "-")', () => {
    const onSave = vi.fn();
    render(<ManagerPlayersPage players={makePlayers(1)} onSave={onSave} />);
    fireEvent.click(screen.getByTestId('player-edit-p-0'));
    const input = screen.getByTestId('player-input-score-p-0') as HTMLInputElement;
    // Simulação de digitação progressiva — primeiro o "-", depois "-15"
    fireEvent.change(input, { target: { value: '-' } });
    // Não deve voltar pra 0 — o usuário ainda está digitando
    expect(input.value).not.toBe('0');
    fireEvent.change(input, { target: { value: '-15' } });
    expect(input.value).toBe('-15');
    fireEvent.click(screen.getByTestId('player-save-p-0'));
    expect(onSave).toHaveBeenCalledWith('p-0', expect.objectContaining({ totalScore: -15 }));
  });

  it('aceita digitar números positivos sem regressão', () => {
    const onSave = vi.fn();
    render(<ManagerPlayersPage players={makePlayers(1)} onSave={onSave} />);
    fireEvent.click(screen.getByTestId('player-edit-p-0'));
    fireEvent.change(screen.getByTestId('player-input-score-p-0'), { target: { value: '250' } });
    fireEvent.click(screen.getByTestId('player-save-p-0'));
    expect(onSave).toHaveBeenCalledWith('p-0', expect.objectContaining({ totalScore: 250 }));
  });

  it('campo vazio durante edição é tratado como 0 ao salvar', () => {
    const onSave = vi.fn();
    render(<ManagerPlayersPage players={makePlayers(1)} onSave={onSave} />);
    fireEvent.click(screen.getByTestId('player-edit-p-0'));
    fireEvent.change(screen.getByTestId('player-input-score-p-0'), { target: { value: '' } });
    fireEvent.click(screen.getByTestId('player-save-p-0'));
    expect(onSave).toHaveBeenCalledWith('p-0', expect.objectContaining({ totalScore: 0 }));
  });
});
