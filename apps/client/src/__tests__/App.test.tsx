import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import App from '../App';
import { socket } from '../ws/socket';

// ─── Mock do socket para isolar o componente da rede ─────────────────────────
vi.mock('../ws/socket', () => ({
  socket: {
    connected: false,
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
  },
}));

// ─── RED: falha até App.tsx ser implementado ──────────────────────────────────

describe('App', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renderiza o elemento ws-status', () => {
    render(<App />);
    expect(screen.getByTestId('ws-status')).toBeInTheDocument();
  });

  it('exibe "connecting..." no estado inicial', () => {
    render(<App />);
    expect(screen.getByTestId('ws-status')).toHaveTextContent('connecting...');
  });

  it('registra listeners connect e disconnect ao montar', () => {
    render(<App />);
    const registeredEvents = (socket.on as ReturnType<typeof vi.fn>).mock.calls.map(
      ([event]: [string]) => event,
    );
    expect(registeredEvents).toContain('connect');
    expect(registeredEvents).toContain('disconnect');
  });

  it('remove listeners ao desmontar', () => {
    const { unmount } = render(<App />);
    unmount();
    const removedEvents = (socket.off as ReturnType<typeof vi.fn>).mock.calls.map(
      ([event]: [string]) => event,
    );
    expect(removedEvents).toContain('connect');
    expect(removedEvents).toContain('disconnect');
  });

  it('exibe "connected" ao receber evento connect', () => {
    render(<App />);
    const connectCb = (socket.on as ReturnType<typeof vi.fn>).mock.calls.find(
      ([e]: [string]) => e === 'connect',
    )?.[1] as () => void;

    act(() => { connectCb(); });

    expect(screen.getByTestId('ws-status')).toHaveTextContent('connected');
  });

  it('exibe "disconnected" ao receber evento disconnect', () => {
    render(<App />);
    const disconnectCb = (socket.on as ReturnType<typeof vi.fn>).mock.calls.find(
      ([e]: [string]) => e === 'disconnect',
    )?.[1] as () => void;

    act(() => { disconnectCb(); });

    expect(screen.getByTestId('ws-status')).toHaveTextContent('disconnected');
  });
});
