import * as THREE from 'three';
import { gameBus } from '../EventBus';
import { FACE_QUATERNIONS } from './faceRotations';
import type { BoardTheme } from '../theme/boardTheme';
import type { AssetLoader } from '../builders/tileBuilder';

/**
 * Mapeamento material-index → célula do atlas (0-indexed).
 * Combina ordem de faces da BoxGeometry com convenção do atlas (célula i = valor i+1).
 *   material 0 = +X = valor 3 → célula 2
 *   material 1 = -X = valor 4 → célula 3
 *   material 2 = +Y = valor 1 → célula 0
 *   material 3 = -Y = valor 6 → célula 5
 *   material 4 = +Z = valor 2 → célula 1
 *   material 5 = -Z = valor 5 → célula 4
 */
const DICE_MATERIAL_TO_CELL: ReadonlyArray<number> = [2, 3, 0, 5, 1, 4];

export type DiceState = 'idle' | 'spinning' | 'decelerating' | 'done';

// Posição fixa da zona de rolagem — à frente do início do tabuleiro, levemente à direita
export const DICE_ZONE = { x: 0, y: 0.5, z: -3.5 } as const;

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

  private mesh: THREE.Object3D;
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

  constructor(scene: THREE.Scene, theme?: BoardTheme, assets?: AssetLoader) {
    this.scene = scene;

    const geo  = new THREE.BoxGeometry(1, 1, 1);
    const mats = Array.from({ length: 6 }, () =>
      new THREE.MeshStandardMaterial({ color: 0xfafafa, roughness: 0.3, metalness: 0.1 }),
    );
    const baseMesh = new THREE.Mesh(geo, mats);
    baseMesh.castShadow = true;
    baseMesh.visible = false;
    this.mesh = baseMesh;
    scene.add(this.mesh);

    // Atlas — aplica clones da textura por face com offset/repeat distintos.
    // Mapeamento DICE_MATERIAL_TO_CELL respeita a ordem de faces da BoxGeometry.
    if (theme?.dice.atlas && assets?.loadTexture) {
      const atlas = theme.dice.atlas;
      assets.loadTexture(atlas.url).then((tpl) => {
        for (let i = 0; i < 6; i++) {
          const cell = DICE_MATERIAL_TO_CELL[i];
          const col  = cell % atlas.columns;
          const row  = Math.floor(cell / atlas.columns);
          const tex  = tpl.clone();
          tex.repeat.set(1 / atlas.columns, 1 / atlas.rows);
          tex.offset.set(col / atlas.columns, 1 - (row + 1) / atlas.rows);
          mats[i].map = tex;
          mats[i].needsUpdate = true;
        }
      }).catch(() => undefined);
    }

    // glTF — substitui o cubo procedural por um modelo carregado.
    // Atenção: o modelo deve estar alinhado nos eixos como uma BoxGeometry padrão
    // (face 1 = +Y, face 2 = +Z, face 3 = +X, face 4 = -X, face 5 = -Z, face 6 = -Y),
    // pois as FACE_QUATERNIONS rotacionam o objeto inteiro para a face vencedora.
    if (theme?.dice.url && assets?.loadGLTF) {
      assets.loadGLTF(theme.dice.url, 'unknown').then((tpl) => {
        const clone = tpl.clone() as THREE.Group;
        const s = theme.dice.scale;
        clone.scale.set(s, s, s);
        clone.visible = this.mesh.visible;
        clone.position.copy(this.mesh.position);
        clone.quaternion.copy(this.mesh.quaternion);
        scene.remove(this.mesh);
        this.mesh = clone;
        scene.add(this.mesh);
      }).catch(() => undefined);
    }
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
