import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { InactivityTimer } from '../../hud/InactivityTimer';

// ─── RED: falha até InactivityTimer.tsx ser implementado ─────────────────────

describe('InactivityTimer', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('renderiza o elemento raiz', () => {
    render(<InactivityTimer seconds={15} active={true} />);
    expect(screen.getByTestId('inactivity-timer')).toBeInTheDocument();
  });

  it('exibe o tempo restante inicial', () => {
    render(<InactivityTimer seconds={15} active={true} />);
    expect(screen.getByTestId('timer-value')).toHaveTextContent('15');
  });

  it('decrementa a cada segundo quando active=true', () => {
    render(<InactivityTimer seconds={15} active={true} />);
    act(() => { vi.advanceTimersByTime(3000); });
    expect(screen.getByTestId('timer-value')).toHaveTextContent('12');
  });

  it('não decrementa quando active=false', () => {
    render(<InactivityTimer seconds={15} active={false} />);
    act(() => { vi.advanceTimersByTime(5000); });
    expect(screen.getByTestId('timer-value')).toHaveTextContent('15');
  });

  it('chama onTimeout quando chega a zero', () => {
    const onTimeout = vi.fn();
    render(<InactivityTimer seconds={5} active={true} onTimeout={onTimeout} />);
    act(() => { vi.advanceTimersByTime(5000); });
    expect(onTimeout).toHaveBeenCalledTimes(1);
  });

  it('reinicia o timer quando seconds muda', () => {
    const { rerender } = render(<InactivityTimer seconds={10} active={true} />);
    act(() => { vi.advanceTimersByTime(4000); });
    rerender(<InactivityTimer seconds={15} active={true} />);
    expect(screen.getByTestId('timer-value')).toHaveTextContent('15');
  });

  it('para e reinicia quando active muda de false para true', () => {
    const { rerender } = render(<InactivityTimer seconds={10} active={false} />);
    act(() => { vi.advanceTimersByTime(3000); });
    rerender(<InactivityTimer seconds={10} active={true} />);
    act(() => { vi.advanceTimersByTime(2000); });
    expect(screen.getByTestId('timer-value')).toHaveTextContent('8');
  });

  it('exibe barra de progresso proporcional ao tempo restante', () => {
    render(<InactivityTimer seconds={10} active={true} />);
    act(() => { vi.advanceTimersByTime(5000); });
    const bar = screen.getByTestId('timer-bar');
    const width = bar.style.width;
    expect(width).toBe('50%');
  });

  it('aplica data-urgent="true" quando restam menos de 30% do tempo', () => {
    render(<InactivityTimer seconds={10} active={true} />);
    act(() => { vi.advanceTimersByTime(8000); }); // 2s restantes = 20%
    expect(screen.getByTestId('inactivity-timer')).toHaveAttribute('data-urgent', 'true');
  });

  it('aplica data-urgent="false" quando há tempo suficiente', () => {
    render(<InactivityTimer seconds={10} active={true} />);
    expect(screen.getByTestId('inactivity-timer')).toHaveAttribute('data-urgent', 'false');
  });
});
