import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { gameBus } from '../EventBus';
import { FACE_QUATERNIONS } from './faceRotations';

export type DiceState = 'idle' | 'simulating' | 'snapping' | 'done';

// Posição fixa da zona de rolagem — à direita do tabuleiro
export const DICE_ZONE = { x: 12, y: 0.5, z: 4 } as const;

const SIMULATING_DURATION = 1.5; // segundos de física livre
const SNAPPING_DURATION   = 0.3; // segundos de lerp para face correta

export class DicePhysics {
  state: DiceState = 'idle';
  pendingFace: number | null = null;

  private readonly mesh: THREE.Mesh;
  private readonly body: CANNON.Body;
  private readonly world: CANNON.World;
  private readonly scene: THREE.Scene;

  private simulatingTimer = 0;
  private snappingTimer   = 0;
  // valores da quaternion no início do snap (para interpolação)
  private snapFromQ = { x: 0, y: 0, z: 0, w: 1 };

  constructor(scene: THREE.Scene, world: CANNON.World) {
    this.scene = scene;
    this.world = world;

    // Mesh — cubo branco simples (face textures podem ser adicionadas depois)
    const geo = new THREE.BoxGeometry(1, 1, 1);
    const mats = Array.from({ length: 6 }, () =>
      new THREE.MeshStandardMaterial({ color: 0xfafafa, roughness: 0.3, metalness: 0.1 }),
    );
    this.mesh = new THREE.Mesh(geo, mats);
    this.mesh.castShadow = true;
    this.mesh.visible = false;
    scene.add(this.mesh);

    // Corpo físico (ainda não adicionado ao world — adicionado no throw)
    const shape = new CANNON.Box(new CANNON.Vec3(0.5, 0.5, 0.5));
    this.body = new CANNON.Body({ mass: 1, shape });
  }

  /** Lança o dado na posição informada com velocidade/spin aleatórios. */
  throw(position: { x: number; y: number; z: number }): void {
    this.state = 'simulating';
    this.simulatingTimer = 0;
    this.pendingFace = null;

    this.body.position.set(position.x, position.y + 2, position.z);
    this.body.velocity.set(
      (Math.random() - 0.5) * 3,
      -2,
      (Math.random() - 0.5) * 3,
    );
    this.body.angularVelocity.set(
      Math.random() * 12 - 6,
      Math.random() * 12 - 6,
      Math.random() * 12 - 6,
    );

    this.world.addBody(this.body);
    this.mesh.visible = true;
  }

  /** Recebe o resultado autoritativo do servidor para snap posterior. */
  setResult(face: number): void {
    this.pendingFace = face;
  }

  /** Chamado a cada frame com o delta em segundos. */
  update(delta: number): void {
    if (this.state === 'idle' || this.state === 'done') return;

    if (this.state === 'simulating') {
      this.world.step(1 / 60, delta, 3);

      // Sincroniza posição/rotação do mesh com o corpo físico
      const { x: px, y: py, z: pz } = this.body.position;
      this.mesh.position.set(px, py, pz);

      const { x: qx, y: qy, z: qz, w: qw } = this.body.quaternion;
      this.mesh.quaternion.set(qx, qy, qz, qw);

      this.simulatingTimer += delta;
      if (this.simulatingTimer >= SIMULATING_DURATION && this.pendingFace !== null) {
        this.beginSnap();
      }
      return;
    }

    if (this.state === 'snapping') {
      this.snappingTimer += delta;
      const t = Math.min(this.snappingTimer / SNAPPING_DURATION, 1);

      const qFrom = new THREE.Quaternion(
        this.snapFromQ.x, this.snapFromQ.y, this.snapFromQ.z, this.snapFromQ.w,
      );
      const qTarget = FACE_QUATERNIONS[this.pendingFace!];
      this.mesh.quaternion.slerpQuaternions(qFrom, qTarget, t);

      if (t >= 1) {
        this.state = 'done';
        this.world.removeBody(this.body);
        gameBus.emit('dice:done', { face: this.pendingFace });
      }
    }
  }

  dispose(): void {
    if (this.world.bodies.includes(this.body)) {
      this.world.removeBody(this.body);
    }
    this.scene.remove(this.mesh);
  }

  private beginSnap(): void {
    this.state = 'snapping';
    this.snappingTimer = 0;
    this.body.velocity.setZero();
    this.body.angularVelocity.setZero();
    // Captura quaternion atual como ponto de partida do lerp
    this.snapFromQ = {
      x: this.mesh.quaternion.x,
      y: this.mesh.quaternion.y,
      z: this.mesh.quaternion.z,
      w: this.mesh.quaternion.w,
    };
  }
}
