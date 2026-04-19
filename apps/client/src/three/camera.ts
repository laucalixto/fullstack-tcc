import * as THREE from 'three';
import type { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

const ISO_OFFSET      = new THREE.Vector3(8, 10, 8);
const DICE_ISO_OFFSET = new THREE.Vector3(4,  5,  4); // close-up para zona do dado
const LERP_FACTOR = 0.03;

// Órbita de vitória — câmera gira em torno do campeão
const VICTORY_RADIUS = 2.5;  // distância horizontal ao peão
const VICTORY_HEIGHT = 1.8;  // elevação acima do tile
const ORBIT_SPEED    = 0.8;  // rad/s

export class CameraController {
  private readonly camera: THREE.PerspectiveCamera;
  private readonly controls: OrbitControls;
  private lastInteractionTime = 0;
  private isReturning = false;

  // Estado da câmera de vitória
  private victoryMode = false;
  private readonly victoryTarget = new THREE.Vector3();
  private victoryAngle = 0;
  private victoryStartTime = 0;

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
    if (this.victoryMode) {
      // Órbita lenta em torno do peão campeão
      const elapsed = (Date.now() - this.victoryStartTime) / 1000;
      const angle = this.victoryAngle + elapsed * ORBIT_SPEED;
      this.camera.position.set(
        this.victoryTarget.x + VICTORY_RADIUS * Math.cos(angle),
        this.victoryTarget.y + VICTORY_HEIGHT,
        this.victoryTarget.z + VICTORY_RADIUS * Math.sin(angle),
      );
      this.controls.target.copy(this.victoryTarget);
      this.controls.update();
      return;
    }

    this.controls.update();

    const idle = Date.now() - this.lastInteractionTime;
    if (idle > this.RETURN_DELAY_MS) {
      this.returnToActivePawn(activeTilePosition);
    }
  }

  /**
   * Ativa câmera cinematográfica de vitória: zoom próximo + órbita ao redor do campeão.
   * Chamado quando GAME_FINISHED é recebido.
   */
  zoomToVictory(target: THREE.Vector3): void {
    this.victoryMode = true;
    this.victoryTarget.copy(target);
    this.victoryStartTime = Date.now();
    this.victoryAngle = Math.PI * 0.25; // ângulo inicial (45°)

    // Posição inicial do close-up
    this.camera.position.set(
      target.x + VICTORY_RADIUS * Math.cos(this.victoryAngle),
      target.y + VICTORY_HEIGHT,
      target.z + VICTORY_RADIUS * Math.sin(this.victoryAngle),
    );
    this.controls.target.copy(target);
    this.controls.update();
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
