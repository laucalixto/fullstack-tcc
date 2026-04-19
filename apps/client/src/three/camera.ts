import * as THREE from 'three';
import type { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

const ISO_OFFSET      = new THREE.Vector3(8, 10, 8);
const DICE_ISO_OFFSET = new THREE.Vector3(4,  5,  4); // close-up para zona do dado
const LERP_FACTOR = 0.03;

export class CameraController {
  private readonly camera: THREE.PerspectiveCamera;
  private readonly controls: OrbitControls;
  private lastInteractionTime = 0;
  private isReturning = false;

  readonly RETURN_DELAY_MS = 4_000;

  constructor(camera: THREE.PerspectiveCamera, controls: OrbitControls) {
    this.camera = camera;
    this.controls = controls;

    this.controls.addEventListener('start', () => {
      this.lastInteractionTime = Date.now();
      this.isReturning = false;
    });
  }

  update(activeTilePosition: THREE.Vector3): void {
    this.controls.update();

    const idle = Date.now() - this.lastInteractionTime;
    if (idle > this.RETURN_DELAY_MS) {
      this.returnToActivePawn(activeTilePosition);
    }
  }

  /** Retorno suave ao peão ativo após inatividade. */
  private returnToActivePawn(tilePos: THREE.Vector3): void {
    this.isReturning = true;
    const targetCameraPos = tilePos.clone().add(ISO_OFFSET);
    this.camera.position.lerp(targetCameraPos, LERP_FACTOR);
    this.controls.target.lerp(tilePos, LERP_FACTOR);
  }

  /** Chamado na troca de turno — salta imediatamente para o novo peão. */
  snapToPlayer(tilePos: THREE.Vector3): void {
    this.lastInteractionTime = 0;
    this.isReturning = false;
    const targetCameraPos = tilePos.clone().add(ISO_OFFSET);
    this.camera.position.copy(targetCameraPos);
    this.controls.target.copy(tilePos);
  }

  /** Câmera close-up isométrica sobre a zona do dado. Previne auto-return durante a física. */
  panToDice(dicePos: THREE.Vector3): void {
    this.lastInteractionTime = Date.now(); // bloqueia auto-return enquanto dado rola
    const targetCameraPos = dicePos.clone().add(DICE_ISO_OFFSET);
    this.camera.position.copy(targetCameraPos);
    this.controls.target.copy(dicePos);
    this.controls.update();
  }
}
