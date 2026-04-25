import * as THREE from 'three';
import { BOARD_PATH } from '@safety-board/shared';
import type { Player } from '@safety-board/shared';
import { gameBus } from '../EventBus';
import type { PawnManager } from '../PawnManager';
import type { CameraController } from '../camera';
import type { DicePhysics } from '../dice/DicePhysics';
import { DICE_ZONE } from '../dice/DicePhysics';

export interface EventBindingsDeps {
  pawnManager: PawnManager;
  dicePhysics: DicePhysics;
  cameraController: CameraController;
  activePos: THREE.Vector3;
  onDiceRollingChange: (rolling: boolean) => void;
}

/**
 * Registra todos os listeners do gameBus relacionados a peões e ao dado.
 * Retorna cleanup único que desfaz todas as assinaturas.
 */
export function bindGameEvents(deps: EventBindingsDeps): () => void {
  const { pawnManager, dicePhysics, cameraController, activePos, onDiceRollingChange } = deps;

  const knownPlayers  = new Set<string>();
  const pawnPositions = new Map<string, number>();
  let diceRolling = false;
  let localDiceActive = false;
  let pendingPawnSync: Player[] | null = null;

  function applyPawnPositions(players: Player[], animateOnlyId: string | null = null): void {
    players.forEach((player, i) => {
      if (!knownPlayers.has(player.id)) {
        pawnManager.addPawn(player.id, i);
        knownPlayers.add(player.id);
        pawnManager.movePawn(player.id, player.position);
        pawnPositions.set(player.id, player.position);
      } else {
        const oldPos = pawnPositions.get(player.id) ?? player.position;
        if (oldPos !== player.position) {
          pawnPositions.set(player.id, player.position);
          if (animateOnlyId === null || player.id === animateOnlyId) {
            const onDone = animateOnlyId !== null && player.id === animateOnlyId
              ? () => { gameBus.emit('pawn:done', { playerId: player.id }); }
              : undefined;
            pawnManager.animatePawn(player.id, oldPos, player.position, onDone);
            const tile = BOARD_PATH[player.position] ?? BOARD_PATH[0];
            activePos.set(tile.x, tile.y, tile.z);
          } else {
            pawnManager.movePawn(player.id, player.position);
          }
        }
      }
    });
  }

  const unsubPlayers = gameBus.on<Player[]>('players:sync', (players) => {
    if (diceRolling) { pendingPawnSync = players; return; }
    applyPawnPositions(players);
  });

  const unsubActive = gameBus.on<{ tileIndex: number; playerId?: string }>('active:player', ({ tileIndex }) => {
    const tile = BOARD_PATH[tileIndex] ?? BOARD_PATH[0];
    activePos.set(tile.x, tile.y, tile.z);
    if (!diceRolling && !cameraController.overviewMode) {
      cameraController.snapToPlayer(activePos);
    }
  });

  const diceZoneVec = new THREE.Vector3(DICE_ZONE.x, DICE_ZONE.y, DICE_ZONE.z);

  const unsubDiceThrow = gameBus.on<{ position: typeof DICE_ZONE }>('dice:throw', ({ position }) => {
    diceRolling = true;
    localDiceActive = true;
    onDiceRollingChange(true);
    cameraController.disableOverviewMode();
    dicePhysics.throw(position);
    cameraController.panToDice(diceZoneVec);
  });

  const unsubRollStart = gameBus.on('dice:rollStart', () => {
    if (localDiceActive) return;
    diceRolling = true;
    onDiceRollingChange(true);
    dicePhysics.throw(DICE_ZONE);
  });

  const unsubRollEnd = gameBus.on('dice:rollEnd', () => {
    if (localDiceActive) return;
  });

  const unsubDiceResult = gameBus.on<{ face: number }>('dice:result', ({ face }) => {
    dicePhysics.setResult(face);
  });

  const unsubDiceDone = gameBus.on<{ face: number }>('dice:done', () => {
    diceRolling = false;
    localDiceActive = false;
    onDiceRollingChange(false);
    const synced = pendingPawnSync;
    pendingPawnSync = null;
    const movedPlayer = synced?.find((p) => {
      const oldPos = pawnPositions.get(p.id);
      return oldPos !== undefined && oldPos !== p.position;
    });
    if (movedPlayer) {
      const tile = BOARD_PATH[movedPlayer.position] ?? BOARD_PATH[0];
      activePos.set(tile.x, tile.y, tile.z);
    }
    cameraController.smoothReturnToPlayer();
    if (!synced) return;
    setTimeout(() => {
      applyPawnPositions(synced, movedPlayer?.id ?? null);
    }, 700);
  });

  const finishTile = BOARD_PATH[BOARD_PATH.length - 1];
  const finishPos = new THREE.Vector3(finishTile.x, finishTile.y, finishTile.z);
  const unsubVictory = gameBus.on('camera:victory', () => {
    cameraController.zoomToVictory(finishPos);
  });

  return () => {
    unsubPlayers();
    unsubActive();
    unsubDiceThrow();
    unsubRollStart();
    unsubRollEnd();
    unsubDiceResult();
    unsubDiceDone();
    unsubVictory();
  };
}
