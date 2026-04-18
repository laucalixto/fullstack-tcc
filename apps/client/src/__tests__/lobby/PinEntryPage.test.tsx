import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// ─── RED: Bug 4 — PinEntryPage deve exibir erro ao receber ROOM_ERROR ────────
//
// Comportamento esperado:
//   1. Usuário digita PIN e clica Entrar → socket emite ROOM_JOIN
//   2. Servidor responde com ROOM_ERROR {code:'ROOM_FULL',...}
//   3. PinEntry exibe mensagem de erro (data-testid="pin-error")

// ─── Mocks globais ────────────────────────────────────────────────────────────

// Componentes pesados que não devem renderizar em JSDOM
vi.mock('../../three/ThreeCanvas', () => ({
  ThreeCanvas: () => <div data-testid="three-canvas" />,
}));
vi.mock('../../three/GamePage', () => ({
  GamePage: () => <div data-testid="game-page" />,
}));

// Registro de handlers do socket compartilhado entre mock e testes
const socketOnHandlers: Record<string, ((...args: unknown[]) => void)[]> = {};
const socketOnceHandlers: Record<string, (...args: unknown[]) => void> = {};

vi.mock('../../ws/socket', () => ({
  socket: {
    emit: vi.fn(),
    on:   vi.fn((ev: string, cb: (...args: unknown[]) => void) => {
      socketOnHandlers[ev] = socketOnHandlers[ev] ?? [];
      socketOnHandlers[ev].push(cb);
    }),
    off:  vi.fn((ev: string, cb: (...args: unknown[]) => void) => {
      socketOnHandlers[ev] = (socketOnHandlers[ev] ?? []).filter((h) => h !== cb);
    }),
    once: vi.fn((ev: string, cb: (...args: unknown[]) => void) => {
      socketOnceHandlers[ev] = cb;
    }),
  },
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (orig) => {
  const actual = await orig();
  return { ...(actual as object), useNavigate: () => mockNavigate };
});

// Helper: dispara evento registrado via socket.once
function triggerOnce(event: string, payload: unknown) {
  const handler = socketOnceHandlers[event];
  if (handler) handler(payload);
}

// ─── Imports após mocks ───────────────────────────────────────────────────────

import { AppRouter } from '../../AppRouter';
import { EVENTS } from '@safety-board/shared';
import type { RoomErrorPayload } from '@safety-board/shared';

// ─── Setup ───────────────────────────────────────────────────────────────────

function renderPinEntry() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <AppRouter />
    </MemoryRouter>,
  );
}

// ─── Testes ──────────────────────────────────────────────────────────────────

describe('PinEntryPage — tratamento de ROOM_ERROR', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    Object.keys(socketOnHandlers).forEach((k) => { socketOnHandlers[k] = []; });
    Object.keys(socketOnceHandlers).forEach((k) => { delete socketOnceHandlers[k]; });
  });

  it('renderiza o campo de PIN na rota /', () => {
    renderPinEntry();
    expect(screen.getByTestId('pin-input')).toBeInTheDocument();
  });

  it('exibe "Sala cheia." quando ROOM_ERROR com code ROOM_FULL é recebido', async () => {
    renderPinEntry();

    // Usuário digita PIN e tenta entrar
    fireEvent.change(screen.getByTestId('pin-input'), { target: { value: '123456' } });
    fireEvent.click(screen.getByTestId('join-button'));

    // Servidor responde com ROOM_FULL
    const errorPayload: RoomErrorPayload = { code: 'ROOM_FULL', message: 'Sala cheia' };
    act(() => { triggerOnce(EVENTS.ROOM_ERROR, errorPayload); });

    expect(screen.getByTestId('pin-error')).toHaveTextContent('Sala cheia.');
  });

  it('exibe "Sala não encontrada." quando ROOM_ERROR com code ROOM_NOT_FOUND é recebido', async () => {
    renderPinEntry();

    fireEvent.change(screen.getByTestId('pin-input'), { target: { value: '000000' } });
    fireEvent.click(screen.getByTestId('join-button'));

    const errorPayload: RoomErrorPayload = { code: 'ROOM_NOT_FOUND', message: 'Room not found' };
    act(() => { triggerOnce(EVENTS.ROOM_ERROR, errorPayload); });

    expect(screen.getByTestId('pin-error')).toHaveTextContent('Sala não encontrada.');
  });

  it('exibe "Partida já iniciada." quando ROOM_ERROR com code GAME_ALREADY_STARTED', async () => {
    renderPinEntry();

    fireEvent.change(screen.getByTestId('pin-input'), { target: { value: '111111' } });
    fireEvent.click(screen.getByTestId('join-button'));

    const errorPayload: RoomErrorPayload = { code: 'GAME_ALREADY_STARTED', message: 'Game started' };
    act(() => { triggerOnce(EVENTS.ROOM_ERROR, errorPayload); });

    expect(screen.getByTestId('pin-error')).toHaveTextContent('Partida já iniciada.');
  });

  it('não exibe erro antes de qualquer resposta do servidor', () => {
    renderPinEntry();
    expect(screen.queryByTestId('pin-error')).not.toBeInTheDocument();
  });

  it('limpa o erro quando o usuário modifica o PIN após um erro', async () => {
    renderPinEntry();

    fireEvent.change(screen.getByTestId('pin-input'), { target: { value: '123456' } });
    fireEvent.click(screen.getByTestId('join-button'));

    act(() => {
      triggerOnce(EVENTS.ROOM_ERROR, { code: 'ROOM_FULL', message: 'Sala cheia' } as RoomErrorPayload);
    });

    // Erro deve estar visível
    expect(screen.getByTestId('pin-error')).toBeInTheDocument();

    // Usuário modifica o PIN → erro deve desaparecer
    fireEvent.change(screen.getByTestId('pin-input'), { target: { value: '654321' } });
    expect(screen.queryByTestId('pin-error')).not.toBeInTheDocument();
  });

  it('não navega para /personagem quando ROOM_ERROR é recebido', async () => {
    renderPinEntry();

    fireEvent.change(screen.getByTestId('pin-input'), { target: { value: '123456' } });
    fireEvent.click(screen.getByTestId('join-button'));

    act(() => {
      triggerOnce(EVENTS.ROOM_ERROR, { code: 'ROOM_FULL', message: 'Sala cheia' } as RoomErrorPayload);
    });

    expect(mockNavigate).not.toHaveBeenCalledWith('/personagem');
  });
});
