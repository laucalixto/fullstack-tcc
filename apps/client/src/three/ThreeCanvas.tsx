import { useRef, useCallback } from 'react';
import { initThreeScene } from './scene';

/**
 * Monta a cena Three.js em um div usando o padrão callback ref de Dirksen (Cap. 14, p.497)
 * corrigido para React 18 + StrictMode.
 *
 * deps=[] garante callback estável (sem re-renders).
 * O branch null limpa o renderer quando o nó sai do DOM (unmount ou ciclo StrictMode),
 * permitindo reinicialização completa na remontagem.
 */
export function ThreeCanvas() {
  const cleanupRef = useRef<(() => void) | null>(null);

  const mountRef = useCallback((node: HTMLDivElement | null) => {
    if (node !== null) {
      cleanupRef.current = initThreeScene(node);
    } else {
      cleanupRef.current?.();
      cleanupRef.current = null;
    }
  }, []); // deps vazias — callback estável, sem re-renders

  return (
    <div
      ref={mountRef}
      data-testid="three-canvas"
      style={{ width: '100%', height: '100vh', display: 'block' }}
    />
  );
}
