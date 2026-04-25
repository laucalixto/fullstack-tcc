import * as THREE from 'three';

export interface AnimationTick {
  (delta: number): void;
}

/**
 * Cria o loop de animação (rAF) com consumo de delta cappado (evita saltos
 * quando a aba volta de background). Consumer é uma função chamada a cada frame.
 * Retorna cleanup que cancela o rAF e remove listener de visibilitychange.
 */
export function startAnimationLoop(tick: AnimationTick): () => void {
  const clock = new THREE.Clock();
  const MAX_DELTA = 0.1;
  let animId: number;

  function frame() {
    animId = requestAnimationFrame(frame);
    const delta = Math.min(clock.getDelta(), MAX_DELTA);
    tick(delta);
  }
  frame();

  // Ao voltar para a aba, consome o delta acumulado para evitar jump na próxima iteração.
  function onVisibilityChange() {
    if (!document.hidden) clock.getDelta();
  }
  document.addEventListener('visibilitychange', onVisibilityChange);

  return () => {
    cancelAnimationFrame(animId);
    document.removeEventListener('visibilitychange', onVisibilityChange);
  };
}
