import * as THREE from 'three';
import { gameBus } from '../EventBus';
import { FACE_QUATERNIONS } from './faceRotations';

export type DiceState = 'idle' | 'spinning' | 'decelerating' | 'done';

// Posição fixa da zona de rolagem — à direita do tabuleiro
export const DICE_ZONE = { x: 12, y: 0.5, z: 4 } as const;

const SPIN_DURATION  = 1.2; // segundos de rotação rápida + queda
const DECEL_DURATION = 0.8; // segundos de desaceleração suave até face correta
const SPIN_SPEED     = 15;  // rad/s durante a fase spinning
const DROP_HEIGHT    = 2.5; // metros acima da zona

// Easing functions
function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

function easeOutBounce(t: number): number {
  const n1 = 7.5625;
  const d1 = 2.75;
  if (t < 1 / d1)        return n1 * t * t;
  if (t < 2 / d1)        return n1 * (t -= 1.5 / d1) * t + 0.75;
  if (t < 2.5 / d1)      return n1 * (t -= 2.25 / d1) * t + 0.9375;
  return n1 * (t -= 2.625 / d1) * t + 0.984375;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export class DicePhysics {
  state: DiceState = 'idle';
  pendingFace: number | null = null;

  private readonly mesh: THREE.Mesh;
  private readonly scene: THREE.Scene;

  private spinTimer   = 0;
  private decelTimer  = 0;

  // Eixo de rotação aleatório para a fase spinning
  private readonly spinAxis = new THREE.Vector3(1, 0, 0);

  // Quaternion no início da desaceleração (ponto de partida do slerp)
  private readonly startQ = new THREE.Quaternion();

  // Posição Y: queda da altura DROP_HEIGHT até o chão da zona
  private startY  = 0;
  private targetY = 0;

  constructor(scene: THREE.Scene) {
    this.scene = scene;

    const geo  = new THREE.BoxGeometry(1, 1, 1);
    const mats = Array.from({ length: 6 }, () =>
      new THREE.MeshStandardMaterial({ color: 0xfafafa, roughness: 0.3, metalness: 0.1 }),
    );
    this.mesh = new THREE.Mesh(geo, mats);
    this.mesh.castShadow = true;
    this.mesh.visible = false;
    scene.add(this.mesh);
  }

  /** Lança o dado na posição informada iniciando a animação de tween. */
  throw(position: { x: number; y: number; z: number }): void {
    this.state = 'spinning';
    this.spinTimer = 0;
    this.pendingFace = null;

    // Eixo de spin aleatório para cada lançamento
    this.spinAxis.set(
      Math.random() - 0.5,
      Math.random() - 0.5,
      Math.random() - 0.5,
    ).normalize();

    this.startY  = position.y + DROP_HEIGHT;
    this.targetY = position.y;

    this.mesh.position.set(position.x, this.startY, position.z);
    this.mesh.quaternion.set(0, 0, 0, 1);
    this.mesh.visible = true;
  }

  /** Recebe o resultado autoritativo do servidor para alinhar ao completar. */
  setResult(face: number): void {
    this.pendingFace = face;
  }

  /** Chamado a cada frame com delta em segundos. */
  update(delta: number): void {
    if (this.state === 'idle' || this.state === 'done') return;

    if (this.state === 'spinning') {
      this.spinTimer += delta;

      // Gira o dado em torno do eixo aleatório a velocidade constante
      const dq = new THREE.Quaternion().setFromAxisAngle(this.spinAxis, SPIN_SPEED * delta);
      this.mesh.quaternion.premultiply(dq);

      // Queda com bounce suave: startY → targetY
      const t = Math.min(this.spinTimer / SPIN_DURATION, 1);
      this.mesh.position.y = lerp(this.startY, this.targetY, easeOutBounce(t));

      if (this.spinTimer >= SPIN_DURATION && this.pendingFace !== null) {
        this.beginDecel();
      }
      return;
    }

    if (this.state === 'decelerating') {
      this.decelTimer += delta;
      const t = Math.min(this.decelTimer / DECEL_DURATION, 1);

      // Slerp suavizado: easeOutCubic faz a rotação desacelerar até parar
      const qTarget = FACE_QUATERNIONS[this.pendingFace!];
      this.mesh.quaternion.slerpQuaternions(this.startQ, qTarget, easeOutCubic(t));

      if (t >= 1) {
        this.state = 'done';
        gameBus.emit('dice:done', { face: this.pendingFace });
      }
    }
  }

  dispose(): void {
    this.scene.remove(this.mesh);
  }

  private beginDecel(): void {
    this.state = 'decelerating';
    this.decelTimer = 0;
    this.startQ.copy(this.mesh.quaternion);
  }
}
