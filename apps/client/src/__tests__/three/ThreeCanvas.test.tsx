import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ThreeCanvas } from '../../three/ThreeCanvas';

vi.mock('../../three/scene', () => ({
  initThreeScene: vi.fn(() => vi.fn()), // retorna cleanup fn
}));

// ─── RED: falha até ThreeCanvas.tsx ser implementado ─────────────────────────

describe('ThreeCanvas', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('renderiza um div com data-testid="three-canvas"', () => {
    render(<ThreeCanvas />);
    expect(screen.getByTestId('three-canvas')).toBeInTheDocument();
  });

  it('chama initThreeScene com o elemento div ao montar', async () => {
    const { initThreeScene } = await import('../../three/scene');
    render(<ThreeCanvas />);
    expect(initThreeScene).toHaveBeenCalledTimes(1);
    expect(initThreeScene).toHaveBeenCalledWith(expect.any(HTMLDivElement));
  });

  it('não chama initThreeScene duas vezes em re-renders', async () => {
    const { initThreeScene } = await import('../../three/scene');
    const { rerender } = render(<ThreeCanvas />);
    rerender(<ThreeCanvas />);
    expect(initThreeScene).toHaveBeenCalledTimes(1);
  });

  it('chama a função de cleanup ao desmontar', async () => {
    const cleanup = vi.fn();
    const { initThreeScene } = await import('../../three/scene');
    vi.mocked(initThreeScene).mockReturnValue(cleanup);
    const { unmount } = render(<ThreeCanvas />);
    unmount();
    expect(cleanup).toHaveBeenCalledTimes(1);
  });
});
