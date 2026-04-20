import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { EVENTS } from '@safety-board/shared';

// ─── RED: falha até PinJoinPage.tsx ser implementado ─────────────────────────

const socketHandlers: Record<string, ((...args: unknown[]) => void)[]> = {};

vi.mock('../../ws/socket', () => ({
  socket: {
    emit: vi.fn(),
    once: vi.fn((ev: string, cb: (...args: unknown[]) => void) => {
      socketHandlers[ev] = socketHandlers[ev] ?? [];
      socketHandlers[ev].push(cb);
    }),
  },
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (orig) => {
  const actual = await orig();
  return { ...(actual as object), useNavigate: () => mockNavigate };
});

function triggerSocket(event: string, payload: unknown) {
  socketHandlers[event]?.forEach((h) => h(payload));
}

import { PinJoinPage } from '../../lobby/PinJoinPage';
import { useGameStore } from '../../stores/gameStore';
import { socket } from '../../ws/socket';

function renderPage(pin = '123456') {
  return render(
    <MemoryRouter initialEntries={[`/sala/${pin}`]}>
      <Routes>
        <Route path="/sala/:pin" element={<PinJoinPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

const makeSession = (pin = '123456') => ({
  id: 'sess-1', pin, name: 'Sessão', shareLink: `/sala/${pin}`,
  facilitatorId: 'f1', state: 'WAITING' as const,
  players: [{ id: 'p1', name: 'Jogador 1', position: 0, score: 0, isConnected: true }],
  currentPlayerIndex: 0, createdAt: Date.now(),
  quizConfig: { activeNormIds: ['NR-06'], timeoutSeconds: 30 },
  maxPlayers: 4 as const,
});

describe('PinJoinPage', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    vi.mocked(socket.emit).mockClear();
    Object.keys(socketHandlers).forEach((k) => { socketHandlers[k] = []; });
    useGameStore.setState({ session: null, myPlayerId: null });
  });

  it('exibe mensagem de carregamento enquanto aguarda resposta', () => {
    renderPage();
    expect(screen.getByText(/entrando na sessão/i)).toBeInTheDocument();
  });

  it('emite ROOM_JOIN com o PIN extraído da URL', () => {
    renderPage('999888');
    expect(socket.emit).toHaveBeenCalledWith(EVENTS.ROOM_JOIN, expect.objectContaining({ pin: '999888' }));
  });

  it('ao receber ROOM_JOINED salva playerId na store', () => {
    renderPage();
    act(() => { triggerSocket(EVENTS.ROOM_JOINED, { playerId: 'uuid-p1', sessionId: 'sess-1', pin: '123456' }); });
    expect(useGameStore.getState().myPlayerId).toBe('uuid-p1');
  });

  it('ao receber GAME_STATE salva sessão e navega para /personagem', () => {
    renderPage();
    act(() => { triggerSocket(EVENTS.GAME_STATE, makeSession()); });
    expect(useGameStore.getState().session).not.toBeNull();
    expect(mockNavigate).toHaveBeenCalledWith('/personagem');
  });

  it('exibe mensagem de erro ao receber ROOM_NOT_FOUND', () => {
    renderPage();
    act(() => { triggerSocket(EVENTS.ROOM_ERROR, { code: 'ROOM_NOT_FOUND', message: '' }); });
    expect(screen.getByText(/pin inválido/i)).toBeInTheDocument();
  });

  it('exibe mensagem de erro ao receber ROOM_FULL', () => {
    renderPage();
    act(() => { triggerSocket(EVENTS.ROOM_ERROR, { code: 'ROOM_FULL', message: '' }); });
    expect(screen.getByText(/sala cheia/i)).toBeInTheDocument();
  });

  it('exibe mensagem de erro ao receber GAME_ALREADY_STARTED', () => {
    renderPage();
    act(() => { triggerSocket(EVENTS.ROOM_ERROR, { code: 'GAME_ALREADY_STARTED', message: '' }); });
    expect(screen.getByText(/já iniciada/i)).toBeInTheDocument();
  });

  it('botão "Voltar ao início" navega para /', () => {
    renderPage();
    act(() => { triggerSocket(EVENTS.ROOM_ERROR, { code: 'ROOM_NOT_FOUND', message: '' }); });
    screen.getByRole('button', { name: /voltar/i }).click();
    expect(mockNavigate).toHaveBeenCalledWith('/');
  });
});
