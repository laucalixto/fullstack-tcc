import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import App from '../App';
import { socket } from '../ws/socket';

// ─── Mocks ────────────────────────────────────────────────────────────────────
vi.mock('../three/ThreeCanvas', () => ({
  ThreeCanvas: () => <div data-testid="three-canvas" />,
}));

vi.mock('../ws/socket', () => ({
  socket: {
    connected: false,
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
  },
}));

describe('App', () => {
  const onMock = () => (socket.on as ReturnType<typeof vi.fn>).mock.calls;
  const offMock = () => (socket.off as ReturnType<typeof vi.fn>).mock.calls;

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
    const registeredEvents = onMock().map((call) => call[0] as string);
    expect(registeredEvents).toContain('connect');
    expect(registeredEvents).toContain('disconnect');
  });

  it('remove listeners ao desmontar', () => {
    const { unmount } = render(<App />);
    unmount();
    const removedEvents = offMock().map((call) => call[0] as string);
    expect(removedEvents).toContain('connect');
    expect(removedEvents).toContain('disconnect');
  });

  it('exibe "connected" ao receber evento connect', () => {
    render(<App />);
    const connectCb = onMock().find((call) => call[0] === 'connect')?.[1] as () => void;

    act(() => { connectCb(); });

    expect(screen.getByTestId('ws-status')).toHaveTextContent('connected');
  });

  it('exibe "disconnected" ao receber evento disconnect', () => {
    render(<App />);
    const disconnectCb = onMock().find((call) => call[0] === 'disconnect')?.[1] as () => void;

    act(() => { disconnectCb(); });

    expect(screen.getByTestId('ws-status')).toHaveTextContent('disconnected');
  });
});
