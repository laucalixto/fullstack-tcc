import { useEffect, useRef } from 'react';
import type * as THREE from 'three';
import type { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import GUI from 'lil-gui';
import { createScene as initThreeScene } from './scene/createScene';
import { DEFAULT_THEME, type BoardTheme } from './theme/boardTheme';

type Win = Record<string, unknown>;

function getCamera()   { return (window as unknown as Win).__previewCamera__   as THREE.PerspectiveCamera | undefined; }
function getControls() { return (window as unknown as Win).__previewControls__ as OrbitControls          | undefined; }
function getTheme()    { return (window as unknown as Win).__previewTheme__    as BoardTheme             | undefined; }

export function BoardPreview() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Cópia mutável do tema para o GUI — alterações ficam in-memory no preview.
    const theme: BoardTheme = JSON.parse(JSON.stringify(DEFAULT_THEME));
    const cleanup = initThreeScene(container, theme);

    const gui = new GUI({ title: 'Preview Controls' });

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

    // Live display de posição
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

    // ── Tile ────────────────────────────────────────────────────────────────
    const tileFolder = gui.addFolder('Tile');
    tileFolder.add(theme.tile, 'scale', 0.1, 3, 0.05).name('scale (live)').onChange(() => {
      // nota: mudança em tile já renderizado exige reinicializar a cena.
      // Por simplicidade, o GUI só atualiza o tema; a próxima recarga aplica.
    });
    tileFolder.add(theme.tile, 'useProceduralColors').name('procedural colors');

    // ── Pawn ────────────────────────────────────────────────────────────────
    const pawnFolder = gui.addFolder('Peão');
    pawnFolder.add(theme.pawn, 'scale', 0.1, 3, 0.05).name('scale');

    // ── Lighting ────────────────────────────────────────────────────────────
    const lightFolder = gui.addFolder('Luzes');
    lightFolder.add(theme.lighting, 'ambientIntensity', 0, 2, 0.05).name('ambient');
    lightFolder.add(theme.lighting, 'sunIntensity',     0, 3, 0.05).name('sun');

    // ── Fog ─────────────────────────────────────────────────────────────────
    const fogFolder = gui.addFolder('Fog');
    fogFolder.add(theme.background.fog, 'near', 0, 100, 1);
    fogFolder.add(theme.background.fog, 'far',  0, 200, 1);

    // ── Export JSON do tema ─────────────────────────────────────────────────
    const themeActions = {
      'Exportar tema (JSON)': () => {
        const live = getTheme() ?? theme;
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
      cleanup();
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
