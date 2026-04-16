import { useState, useCallback, useEffect, useRef } from 'react';
import { initThreeScene } from './scene';

/**
 * Monta a cena Three.js em um div usando o padrão useCallback de Dirksen (Cap. 14, p.497).
 * initThreeScene é chamado exatamente uma vez, quando o div é adicionado ao DOM.
 */
export function ThreeCanvas() {
  const [initialized, setInitialized] = useState(false);
  const cleanupRef = useRef<(() => void) | null>(null);

  const mountRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (node !== null && !initialized) {
        cleanupRef.current = initThreeScene(node);
        setInitialized(true);
      }
    },
    [initialized],
  );

  useEffect(() => {
    return () => {
      cleanupRef.current?.();
    };
  }, []);

  return (
    <div
      ref={mountRef}
      data-testid="three-canvas"
      style={{ width: '100%', height: '100vh', display: 'block' }}
    />
  );
}
