import { useEffect, useRef } from 'react';
import type * as THREE from 'three';
import type { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import GUI from 'lil-gui';
import { createScene as initThreeScene } from './scene/createScene';
import { DEFAULT_THEME, type BoardTheme } from './theme/boardTheme';
import { gameBus } from './EventBus';
import type { Player } from '@safety-board/shared';
import { LAYOUTS } from './layouts';

type Win = Record<string, unknown>;

interface PreviewHandles {
  setTileScale: (s: number) => void;
  setTilePosition: (index: number, x: number, y: number, z: number) => void;
  getTilePosition: (index: number) => { x: number; y: number; z: number } | null;
  setAmbientIntensity: (v: number) => void;
  setSunIntensity: (v: number) => void;
  setSunPosition: (x: number, y: number, z: number) => void;
  setFogNear: (v: number) => void;
  setFogFar:  (v: number) => void;
  setFogColor: (hex: number) => void;
  setBackgroundColor: (hex: number) => void;
  setGroundColor: (hex: number) => void;
  setPawnScale: (s: number) => void;
  setToneMappingExposure: (v: number) => void;
  setToneMapping: (name: 'none' | 'linear' | 'aces' | 'reinhard' | 'cineon') => void;
  exportLayout: () => Array<{ index: number; x: number; y: number; z: number }>;
}

function getCamera()   { return (window as unknown as Win).__previewCamera__   as THREE.PerspectiveCamera | undefined; }
function getControls() { return (window as unknown as Win).__previewControls__ as OrbitControls          | undefined; }
function getTheme()    { return (window as unknown as Win).__previewTheme__    as BoardTheme             | undefined; }
function getHandles()  { return (window as unknown as Win).__previewHandles__  as PreviewHandles         | undefined; }

export function BoardPreview() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Estado mutável compartilhado: layout selecionado + cleanup atual.
    const previewState = {
      layoutName: 'classic',
      cleanup: null as (() => void) | null,
      pawnsTimer: 0 as ReturnType<typeof setTimeout> | 0,
    };

    // Spawn de 4 peões dummy para visualizar escala/cor (só no preview).
    const dummyPlayers: Player[] = [
      { id: 'preview-1', name: 'Alice', position: 0,  score: 0, isConnected: true },
      { id: 'preview-2', name: 'Bob',   position: 5,  score: 0, isConnected: true },
      { id: 'preview-3', name: 'Carol', position: 15, score: 0, isConnected: true },
      { id: 'preview-4', name: 'Dan',   position: 25, score: 0, isConnected: true },
    ];

    function buildScene(layoutName: string) {
      previewState.cleanup?.();
      if (previewState.pawnsTimer) clearTimeout(previewState.pawnsTimer);

      // Cópia mutável do tema com layout escolhido.
      const theme: BoardTheme = JSON.parse(JSON.stringify(DEFAULT_THEME));
      theme.boardLayout = LAYOUTS[layoutName] ?? LAYOUTS.classic;

      previewState.cleanup = initThreeScene(container!, theme);
      previewState.layoutName = layoutName;
      // Aguarda 1 frame para garantir que createScene terminou de montar.
      previewState.pawnsTimer = setTimeout(() => gameBus.emit('players:sync', dummyPlayers), 50);
    }

    buildScene(previewState.layoutName);

    const gui = new GUI({ title: 'Preview Controls' });

    // ── Layout (Opção B) ────────────────────────────────────────────────────
    const layoutFolder = gui.addFolder('Layout (caminho do tabuleiro)');
    const layoutNames = Object.keys(LAYOUTS);
    layoutFolder
      .add({ layout: previewState.layoutName }, 'layout', layoutNames)
      .name('escolher')
      .onChange((name: string) => buildScene(name));

    // ── Câmera: helper de leitura de posição (mantido) ──────────────────────
    const cameraFolder = gui.addFolder('Câmera (debug)');
    const cameraActions = {
      'Ler posição atual': () => {
        const cam  = getCamera();
        const ctrl = getControls();
        if (!cam || !ctrl) return;
        const p = cam.position;
        const t = ctrl.target;
        const text =
          `OVERVIEW_POSITION = new THREE.Vector3(${p.x.toFixed(2)}, ${p.y.toFixed(2)}, ${p.z.toFixed(2)})\n` +
          `OVERVIEW_TARGET   = new THREE.Vector3(${t.x.toFixed(2)}, ${t.y.toFixed(2)}, ${t.z.toFixed(2)})`;
        console.info('[BoardPreview]\n' + text);
        navigator.clipboard.writeText(text).catch(() => {});
        alert('Câmera copiada para clipboard!\n\n' + text);
      },
    };
    cameraFolder.add(cameraActions, 'Ler posição atual');

    const pos = { x: 0, y: 0, z: 0 };
    const tgt = { x: 0, y: 0, z: 0 };
    const folderPos = cameraFolder.addFolder('Câmera position (live)').close();
    const px = folderPos.add(pos, 'x').decimals(2).disable().name('X');
    const py = folderPos.add(pos, 'y').decimals(2).disable().name('Y');
    const pz = folderPos.add(pos, 'z').decimals(2).disable().name('Z');
    const folderTgt = cameraFolder.addFolder('Target (live)').close();
    const tx = folderTgt.add(tgt, 'x').decimals(2).disable().name('X');
    const ty = folderTgt.add(tgt, 'y').decimals(2).disable().name('Y');
    const tz = folderTgt.add(tgt, 'z').decimals(2).disable().name('Z');

    // ── Tile (escala global) ─────────────────────────────────────────────────
    const tileFolder = gui.addFolder('Tile (escala global)');
    tileFolder.add({ scale: 1 }, 'scale', 0.1, 3, 0.05).name('scale').onChange((v: number) => {
      getHandles()?.setTileScale(v);
    });

    // ── Tile específico (xyz por índice) ────────────────────────────────────
    const tileSpecific = gui.addFolder('Tile específico (posição XYZ)');
    const tileEdit = { index: 0, x: 0, y: 0, z: 0 };
    function syncTileEdit() {
      const p = getHandles()?.getTilePosition(tileEdit.index);
      if (!p) return;
      tileEdit.x = p.x; tileEdit.y = p.y; tileEdit.z = p.z;
      tileSpecific.controllers.forEach((c) => c.updateDisplay());
    }
    tileSpecific
      .add(tileEdit, 'index', 0, 39, 1)
      .name('índice (0-39)')
      .onChange(() => syncTileEdit());
    tileSpecific.add(tileEdit, 'x', -20, 20, 0.1).name('X (m)').onChange((v: number) => {
      getHandles()?.setTilePosition(tileEdit.index, v, tileEdit.y, tileEdit.z);
    });
    tileSpecific.add(tileEdit, 'y', -5, 10, 0.05).name('Y (m)').onChange((v: number) => {
      getHandles()?.setTilePosition(tileEdit.index, tileEdit.x, v, tileEdit.z);
    });
    tileSpecific.add(tileEdit, 'z', -20, 20, 0.1).name('Z (m)').onChange((v: number) => {
      getHandles()?.setTilePosition(tileEdit.index, tileEdit.x, tileEdit.y, v);
    });
    tileSpecific.add({
      'Exportar boardLayout (JSON)': () => {
        const layout = getHandles()?.exportLayout();
        if (!layout) return;
        const json = JSON.stringify(layout, null, 2);
        console.info('[BoardPreview] boardLayout atual:\n' + json);
        navigator.clipboard.writeText(json).catch(() => {});
        alert('boardLayout copiado para clipboard');
      },
    }, 'Exportar boardLayout (JSON)');
    // Inicializa com posição do tile 0
    setTimeout(syncTileEdit, 100);

    // ── Pawn ────────────────────────────────────────────────────────────────
    const pawnFolder = gui.addFolder('Peão');
    pawnFolder.add({ scale: 1 }, 'scale', 0.1, 3, 0.05).name('scale').onChange((v: number) => {
      getHandles()?.setPawnScale(v);
    });

    // ── Lighting ────────────────────────────────────────────────────────────
    const lightFolder = gui.addFolder('Luzes');
    lightFolder.add({ ambientIntensity: 0.5 }, 'ambientIntensity', 0, 2, 0.05).name('ambient').onChange((v: number) => {
      getHandles()?.setAmbientIntensity(v);
    });
    lightFolder.add({ sunIntensity: 1.2 }, 'sunIntensity', 0, 3, 0.05).name('sun intensity').onChange((v: number) => {
      getHandles()?.setSunIntensity(v);
    });
    const sunPos = { x: 10, y: 20, z: 10 };
    lightFolder.add(sunPos, 'x', -50, 50, 0.5).name('sun X').onChange((v: number) => {
      getHandles()?.setSunPosition(v, sunPos.y, sunPos.z);
    });
    lightFolder.add(sunPos, 'y', 0, 50, 0.5).name('sun Y').onChange((v: number) => {
      getHandles()?.setSunPosition(sunPos.x, v, sunPos.z);
    });
    lightFolder.add(sunPos, 'z', -50, 50, 0.5).name('sun Z').onChange((v: number) => {
      getHandles()?.setSunPosition(sunPos.x, sunPos.y, v);
    });

    // ── Cores ───────────────────────────────────────────────────────────────
    const colorFolder = gui.addFolder('Cores');
    const colors = { background: '#1a1a2e', fog: '#1a1a2e', ground: '#3d2b1f' };
    function hexStringToInt(hex: string): number { return parseInt(hex.replace('#', ''), 16); }
    colorFolder.addColor(colors, 'background').name('background').onChange((v: string) => {
      getHandles()?.setBackgroundColor(hexStringToInt(v));
    });
    colorFolder.addColor(colors, 'fog').name('fog').onChange((v: string) => {
      getHandles()?.setFogColor(hexStringToInt(v));
    });
    colorFolder.addColor(colors, 'ground').name('ground').onChange((v: string) => {
      getHandles()?.setGroundColor(hexStringToInt(v));
    });

    // ── Tone mapping / exposição ────────────────────────────────────────────
    const toneFolder = gui.addFolder('Tone mapping');
    toneFolder
      .add({ exposure: 1.0 }, 'exposure', 0, 3, 0.05)
      .name('exposure')
      .onChange((v: number) => { getHandles()?.setToneMappingExposure(v); });
    toneFolder
      .add({ mode: 'aces' }, 'mode', ['none', 'linear', 'aces', 'reinhard', 'cineon'])
      .name('mode')
      .onChange((name: 'none' | 'linear' | 'aces' | 'reinhard' | 'cineon') => {
        getHandles()?.setToneMapping(name);
      });

    // ── Fog ─────────────────────────────────────────────────────────────────
    const fogFolder = gui.addFolder('Fog');
    fogFolder.add({ near: 30 }, 'near', 0, 100, 1).onChange((v: number) => {
      getHandles()?.setFogNear(v);
    });
    fogFolder.add({ far: 60 }, 'far', 0, 200, 1).onChange((v: number) => {
      getHandles()?.setFogFar(v);
    });

    // ── Export JSON do tema ─────────────────────────────────────────────────
    const themeActions = {
      'Exportar tema (JSON)': () => {
        const live = getTheme();
        if (!live) return;
        const json = JSON.stringify(live, null, 2);
        console.info('[BoardPreview] tema atual:\n' + json);
        navigator.clipboard.writeText(json).catch(() => {});
        alert('Tema copiado para clipboard como JSON');
      },
    };
    gui.add(themeActions, 'Exportar tema (JSON)');

    let rafId: number;
    function tick() {
      rafId = requestAnimationFrame(tick);
      const cam = getCamera();
      const orb = getControls();
      if (!cam || !orb) return;
      pos.x = cam.position.x; pos.y = cam.position.y; pos.z = cam.position.z;
      tgt.x = orb.target.x;   tgt.y = orb.target.y;   tgt.z = orb.target.z;
      px.updateDisplay(); py.updateDisplay(); pz.updateDisplay();
      tx.updateDisplay(); ty.updateDisplay(); tz.updateDisplay();
    }
    tick();

    return () => {
      previewState.cleanup?.();
      if (previewState.pawnsTimer) clearTimeout(previewState.pawnsTimer);
      cancelAnimationFrame(rafId);
      gui.destroy();
    };
  }, []);

  return (
    <div className="relative w-screen h-screen bg-[#1a1a2e] overflow-hidden">
      <div ref={containerRef} className="w-full h-full" />
    </div>
  );
}
