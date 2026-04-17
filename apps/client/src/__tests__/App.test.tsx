import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
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

  const wrap = (ui: React.ReactElement) =>
    render(<MemoryRouter initialEntries={['/']}>{ui}</MemoryRouter>);

  it('renderiza o elemento ws-status', () => {
    wrap(<App />);
    expect(screen.getByTestId('ws-status')).toBeInTheDocument();
  });

  it('exibe "connecting..." no estado inicial', () => {
    wrap(<App />);
    expect(screen.getByTestId('ws-status')).toHaveTextContent('connecting...');
  });

  it('registra listeners connect e disconnect ao montar', () => {
    wrap(<App />);
    const registeredEvents = onMock().map((call) => call[0] as string);
    expect(registeredEvents).toContain('connect');
    expect(registeredEvents).toContain('disconnect');
  });

  it('remove listeners ao desmontar', () => {
    const { unmount } = wrap(<App />);
    unmount();
    const removedEvents = offMock().map((call) => call[0] as string);
    expect(removedEvents).toContain('connect');
    expect(removedEvents).toContain('disconnect');
  });

  it('exibe "connected" ao receber evento connect', () => {
    wrap(<App />);
    const connectCb = onMock().find((call) => call[0] === 'connect')?.[1] as () => void;

    act(() => { connectCb(); });

    expect(screen.getByTestId('ws-status')).toHaveTextContent('connected');
  });

  it('exibe "disconnected" ao receber evento disconnect', () => {
    wrap(<App />);
    const disconnectCb = onMock().find((call) => call[0] === 'disconnect')?.[1] as () => void;

    act(() => { disconnectCb(); });

    expect(screen.getByTestId('ws-status')).toHaveTextContent('disconnected');
  });
});
