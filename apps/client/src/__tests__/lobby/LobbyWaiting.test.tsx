import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LobbyWaiting } from '../../lobby/LobbyWaiting';
import type { Player } from '@safety-board/shared';

// ─── RED: falha até LobbyWaiting.tsx ser implementado ────────────────────────

const makePlayers = (n: number): Player[] =>
  Array.from({ length: n }, (_, i) => ({
    id: `p${i}`,
    name: `Jogador ${i + 1}`,
    position: 0,
    score: 0,
    isConnected: true,
  }));

describe('LobbyWaiting', () => {
  it('exibe o PIN da sala', () => {
    render(
      <LobbyWaiting pin="123456" players={makePlayers(1)} onStart={vi.fn()} isFacilitator={false} />,
    );
    expect(screen.getByTestId('lobby-pin')).toHaveTextContent('123456');
  });

  it('lista os jogadores presentes', () => {
    render(
      <LobbyWaiting pin="123456" players={makePlayers(3)} onStart={vi.fn()} isFacilitator={false} />,
    );
    expect(screen.getAllByTestId(/^lobby-player-/)).toHaveLength(3);
  });

  it('exibe o nome de cada jogador', () => {
    render(
      <LobbyWaiting
        pin="123456"
        players={makePlayers(2)}
        onStart={vi.fn()}
        isFacilitator={false}
      />,
    );
    expect(screen.getByText('Jogador 1')).toBeInTheDocument();
    expect(screen.getByText('Jogador 2')).toBeInTheDocument();
  });

  it('botão iniciar visível apenas para o facilitador', () => {
    const { rerender } = render(
      <LobbyWaiting pin="123456" players={makePlayers(1)} onStart={vi.fn()} isFacilitator={true} />,
    );
    expect(screen.getByTestId('start-button')).toBeInTheDocument();

    rerender(
      <LobbyWaiting pin="123456" players={makePlayers(1)} onStart={vi.fn()} isFacilitator={false} />,
    );
    expect(screen.queryByTestId('start-button')).not.toBeInTheDocument();
  });

  it('chama onStart ao clicar no botão iniciar', () => {
    const onStart = vi.fn();
    render(
      <LobbyWaiting pin="123456" players={makePlayers(2)} onStart={onStart} isFacilitator={true} />,
    );
    fireEvent.click(screen.getByTestId('start-button'));
    expect(onStart).toHaveBeenCalledTimes(1);
  });

  it('botão iniciar desabilitado com menos de 2 jogadores', () => {
    render(
      <LobbyWaiting pin="123456" players={makePlayers(1)} onStart={vi.fn()} isFacilitator={true} />,
    );
    expect(screen.getByTestId('start-button')).toBeDisabled();
  });

  it('botão iniciar habilitado com 2 ou mais jogadores', () => {
    render(
      <LobbyWaiting pin="123456" players={makePlayers(2)} onStart={vi.fn()} isFacilitator={true} />,
    );
    expect(screen.getByTestId('start-button')).not.toBeDisabled();
  });

  it('exibe contagem de jogadores', () => {
    render(
      <LobbyWaiting pin="123456" players={makePlayers(3)} onStart={vi.fn()} isFacilitator={false} />,
    );
    expect(screen.getByTestId('player-count')).toHaveTextContent('3');
  });

  // ─── RED: falha até sessionName e shareLink serem implementados ───────────────

  it('exibe o nome da sessão quando fornecido', () => {
    render(
      <LobbyWaiting
        pin="123456"
        players={makePlayers(1)}
        onStart={vi.fn()}
        isFacilitator={false}
        sessionName="Treinamento NR-35"
      />,
    );
    expect(screen.getByTestId('lobby-session-name')).toHaveTextContent('Treinamento NR-35');
  });

  it('exibe o shareLink quando fornecido', () => {
    render(
      <LobbyWaiting
        pin="123456"
        players={makePlayers(1)}
        onStart={vi.fn()}
        isFacilitator={false}
        shareLink="/sala/123456"
      />,
    );
    expect(screen.getByTestId('lobby-share-link')).toBeInTheDocument();
  });
});
