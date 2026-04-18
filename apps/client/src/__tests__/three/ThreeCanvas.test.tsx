import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StrictMode } from 'react';
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

  // ─── Compatibilidade StrictMode ──────────────────────────────────────────────
  //
  // Com useCallback+[initialized] (padrão Dirksen original), o StrictMode dispara
  // o cleanup do useEffect, descartando o renderer e deixando o canvas em branco.
  // Com useCallback+[] (padrão corrigido), não há useEffect: o callback ref garante
  // o cleanup apenas no unmount real. O canvas permanece vivo durante o ciclo
  // StrictMode (mount → simulated-unmount → simulated-remount).
  it('não invoca cleanup durante ciclo StrictMode — canvas permanece vivo', async () => {
    const cleanup = vi.fn();
    const { initThreeScene } = await import('../../three/scene');
    vi.mocked(initThreeScene).mockReturnValue(cleanup);

    render(
      <StrictMode>
        <ThreeCanvas />
      </StrictMode>,
    );

    // init chamado exatamente uma vez (o canvas não é descartado e recriado)
    expect(initThreeScene).toHaveBeenCalledTimes(1);
    // cleanup NÃO deve ser chamado enquanto o componente está montado
    expect(cleanup).not.toHaveBeenCalled();
  });
});
