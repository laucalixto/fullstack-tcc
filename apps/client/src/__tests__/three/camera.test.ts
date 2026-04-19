import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── RED: CameraController — panToDice e comportamento de retorno ─────────────
// panToDice(pos): câmera salta para isométrica próxima da zona do dado
// Previne auto-return enquanto dado está rolando (reseta idle timer)

const mockControls = {
  update: vi.fn(),
  addEventListener: vi.fn(),
  enableDamping: false,
  dampingFactor: 0,
  minDistance: 0,
  maxDistance: 0,
  maxPolarAngle: 0,
  target: { copy: vi.fn(), lerp: vi.fn(), clone: vi.fn() },
  dispose: vi.fn(),
};

vi.mock('three/examples/jsm/controls/OrbitControls.js', () => ({
  OrbitControls: vi.fn(() => mockControls),
}));

vi.mock('three', () => ({
  PerspectiveCamera: vi.fn(() => ({
    position: {
      copy: vi.fn(),
      lerp: vi.fn(),
      clone: vi.fn(() => ({
        add: vi.fn().mockReturnThis(),
      })),
      set: vi.fn(),
    },
    aspect: 1,
    updateProjectionMatrix: vi.fn(),
    lookAt: vi.fn(),
  })),
  Vector3: vi.fn((x = 0, y = 0, z = 0) => ({
    x, y, z,
    clone: vi.fn().mockReturnValue({
      add: vi.fn().mockReturnThis(),
      x, y, z,
    }),
    add: vi.fn().mockReturnThis(),
    copy: vi.fn().mockReturnThis(),
    lerp: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
  })),
}));

import * as THREE from 'three';
import { CameraController } from '../../three/camera';

describe('CameraController', () => {
  let camera: InstanceType<typeof THREE.PerspectiveCamera>;
  let controller: CameraController;

  beforeEach(() => {
    vi.mocked(mockControls.update).mockClear();
    vi.mocked(mockControls.target.copy).mockClear();
    camera = new THREE.PerspectiveCamera();
    vi.mocked(camera.position.copy).mockClear();
    controller = new CameraController(camera, mockControls as never);
  });

  describe('panToDice', () => {
    it('copia nova posição para camera.position (não lerp — snap imediato)', () => {
      const dicePos = new THREE.Vector3(12, 0, 4);
      controller.panToDice(dicePos);
      expect(camera.position.copy).toHaveBeenCalled();
    });

    it('aponta controls.target para o dado', () => {
      const dicePos = new THREE.Vector3(12, 0, 4);
      controller.panToDice(dicePos);
      expect(mockControls.target.copy).toHaveBeenCalledWith(dicePos);
    });

    it('previne auto-return imediato: update() não lerpa logo após panToDice', () => {
      const dicePos   = new THREE.Vector3(12, 0, 4);
      const playerPos = new THREE.Vector3(0, 0, 0);
      controller.panToDice(dicePos);
      // Reseta os mocks para observar o que update() faz
      vi.mocked(camera.position.lerp).mockClear();
      controller.update(playerPos);
      // Deve chamar controls.update mas NÃO lerp (lastInteractionTime recente)
      expect(mockControls.update).toHaveBeenCalled();
      expect(camera.position.lerp).not.toHaveBeenCalled();
    });
  });
});
