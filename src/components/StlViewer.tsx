import { useEffect, useRef, useState } from 'react';

interface Stats {
  volumeCm3: number;
  sizeMm: [number, number, number];
  triangles: number;
  watertight: boolean;
}

interface Props {
  labels?: { drop: string; loaded: string; volume: string; size: string };
  lang?: 'sl' | 'en';
  onStats?: (stats: Stats) => void;
  onFile?: (file: File) => void;
}

const DEFAULT_LABELS = {
  drop: 'Drop a 3D file here or click to upload',
  loaded: 'Model loaded',
  volume: 'Volume',
  size: 'Size (X×Y×Z)'
};

export default function StlViewer({ labels = DEFAULT_LABELS, lang = 'en', onStats, onFile }: Props) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const sceneRef = useRef<{ dispose: () => void; setMesh: (geom: any) => void } | null>(null);

  useEffect(() => {
    let cancelled = false;
    let cleanup: (() => void) | undefined;
    (async () => {
      const THREE = await import('three');
      if (cancelled || !mountRef.current) return;
      const mount = mountRef.current;
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 5000);
      camera.position.set(120, 100, 160);
      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      const resize = () => {
        const w = mount.clientWidth;
        const h = mount.clientHeight;
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
      };
      mount.appendChild(renderer.domElement);
      resize();
      window.addEventListener('resize', resize);

      const dir = new THREE.DirectionalLight(0xffffff, 1.0); dir.position.set(1, 1.5, 1); scene.add(dir);
      const dir2 = new THREE.DirectionalLight(0xffffff, 0.4); dir2.position.set(-1, -0.5, -1); scene.add(dir2);
      scene.add(new THREE.AmbientLight(0xffffff, 0.55));

      const grid = new THREE.GridHelper(256, 16, 0x888888, 0xcccccc);
      (grid.material as any).transparent = true;
      (grid.material as any).opacity = 0.25;
      scene.add(grid);

      let mesh: any | null = null;
      const setMesh = (geom: any) => {
        if (mesh) { scene.remove(mesh); mesh.geometry?.dispose?.(); }
        geom.computeVertexNormals();
        geom.center();
        const mat = new THREE.MeshStandardMaterial({ color: 0x3a64f5, metalness: 0.05, roughness: 0.6, flatShading: false });
        mesh = new THREE.Mesh(geom, mat);
        mesh.rotation.x = -Math.PI / 2;
        scene.add(mesh);
        // fit camera
        geom.computeBoundingBox();
        const box = geom.boundingBox!;
        const size = new THREE.Vector3(); box.getSize(size);
        const max = Math.max(size.x, size.y, size.z);
        camera.position.set(max * 1.6, max * 1.2, max * 1.6);
        camera.lookAt(0, 0, 0);
      };
      sceneRef.current = {
        dispose: () => { renderer.dispose(); mount.removeChild(renderer.domElement); window.removeEventListener('resize', resize); },
        setMesh
      };
      let raf = 0;
      const tick = () => { if (mesh) mesh.rotation.z += 0.005; renderer.render(scene, camera); raf = requestAnimationFrame(tick); };
      tick();
      cleanup = () => { cancelAnimationFrame(raf); sceneRef.current?.dispose(); };
    })();
    return () => { cancelled = true; cleanup?.(); };
  }, []);

  async function handleFile(file: File) {
    if (!file) return;
    setError(null);
    setLoading(true);
    // surface the file to the parent first — even if preview parsing fails
    // (e.g. STEP / IGES), the wizard still needs the raw file for upload.
    onFile?.(file);
    try {
      const ext = file.name.toLowerCase().split('.').pop();
      const buf = await file.arrayBuffer();
      const THREE = await import('three');
      let geom: any;
      if (ext === 'stl') {
        const { STLLoader } = await import('three/examples/jsm/loaders/STLLoader.js');
        geom = new STLLoader().parse(buf);
      } else if (ext === 'obj') {
        const { OBJLoader } = await import('three/examples/jsm/loaders/OBJLoader.js');
        const text = new TextDecoder().decode(buf);
        const obj = new OBJLoader().parse(text);
        // merge first child geometry for stats
        let merged: any = null;
        obj.traverse((child: any) => { if (child.isMesh && !merged) merged = child.geometry; });
        if (!merged) throw new Error('OBJ contains no mesh');
        geom = merged;
      } else {
        throw new Error(`Unsupported format .${ext} (use STL or OBJ here; STEP is fine to attach to the form)`);
      }
      sceneRef.current?.setMesh(geom);
      // compute stats
      geom.computeBoundingBox();
      const bb = geom.boundingBox;
      const sizeMm: [number, number, number] = [bb.max.x - bb.min.x, bb.max.y - bb.min.y, bb.max.z - bb.min.z];
      const { volumeMm3, triangles, watertight } = computeMeshStats(geom);
      const s: Stats = { volumeCm3: volumeMm3 / 1000, sizeMm, triangles, watertight };
      setStats(s); onStats?.(s);
    } catch (e: any) {
      setError(e.message || 'Could not load file');
    } finally {
      setLoading(false);
    }
  }

  function computeMeshStats(geom: any): { volumeMm3: number; triangles: number; watertight: boolean } {
    // Signed tetrahedron volume sum. Assumes file units = mm (typical for STL).
    // Watertight heuristic: |signed sum| / |abs sum| close to 1 → closed mesh.
    const pos = geom.attributes.position;
    const idx = geom.index;
    let signed = 0;
    let absSum = 0;
    const n = idx ? idx.count : pos.count;
    const triangles = Math.floor(n / 3);
    for (let i = 0; i < n; i += 3) {
      const i0 = idx ? idx.getX(i) : i;
      const i1 = idx ? idx.getX(i + 1) : i + 1;
      const i2 = idx ? idx.getX(i + 2) : i + 2;
      const ax = pos.getX(i0), ay = pos.getY(i0), az = pos.getZ(i0);
      const bx = pos.getX(i1), by = pos.getY(i1), bz = pos.getZ(i1);
      const cx = pos.getX(i2), cy = pos.getY(i2), cz = pos.getZ(i2);
      const v = (ax * (by * cz - bz * cy) - ay * (bx * cz - bz * cx) + az * (bx * cy - by * cx)) / 6;
      signed += v;
      absSum += Math.abs(v);
    }
    const volumeMm3 = Math.abs(signed);
    const watertight = absSum > 0 ? Math.abs(signed) / absSum > 0.95 : false;
    return { volumeMm3, triangles, watertight };
  }

  return (
    <div className="space-y-3">
      <div
        className="relative h-72 rounded-xl border border-dashed border-ink-300 dark:border-ink-700 overflow-hidden bg-ink-50/40 dark:bg-ink-900/40"
        onDragOver={(e) => { e.preventDefault(); }}
        onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) handleFile(f); }}
      >
        <div ref={mountRef} className="absolute inset-0" />
        {!stats && !loading && (
          <button type="button" onClick={() => inputRef.current?.click()}
                  className="absolute inset-0 flex items-center justify-center text-sm text-ink-500 dark:text-ink-400 hover:text-accent-600 dark:hover:text-accent-300 transition-colors">
            {labels.drop}
          </button>
        )}
        {loading && <div className="absolute inset-0 flex items-center justify-center text-sm text-ink-500 bg-white/60 dark:bg-ink-950/60">…</div>}
        <input ref={inputRef} type="file" accept=".stl,.obj,.step,.stp,.iges,.igs,.3mf" hidden
               onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
      </div>
      {error && <p className="text-xs text-amber-600 dark:text-amber-400">{error}</p>}
      {stats && (() => {
        // PLA density 1.24 g/cm³. Estimated print mass at common infill levels.
        // Assumes ~25% effective material at 20% infill (walls + tops/bottoms),
        // 100% solid for the upper bound. Real value depends on slicer settings.
        const PLA_DENSITY = 1.24;
        const massSolid = stats.volumeCm3 * PLA_DENSITY;
        const massInfill20 = stats.volumeCm3 * PLA_DENSITY * 0.30;
        const fmtMass = (g: number) => g >= 1000 ? `${(g / 1000).toFixed(2)} kg` : `${g.toFixed(0)} g`;
        const isSL = lang === 'sl';
        return (
          <div className="space-y-2">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
              <div className="p-3 rounded-lg bg-ink-100 dark:bg-ink-800/50">
                <div className="text-xs text-ink-500 dark:text-ink-400">{labels.size}</div>
                <div className="font-display font-bold tabular-nums text-sm">
                  {stats.sizeMm.map(n => n.toFixed(1)).join(' × ')}
                  <span className="text-xs font-normal text-ink-500"> mm</span>
                </div>
              </div>
              <div className="p-3 rounded-lg bg-ink-100 dark:bg-ink-800/50">
                <div className="text-xs text-ink-500 dark:text-ink-400">{labels.volume}</div>
                <div className="font-display font-bold tabular-nums text-sm">
                  {stats.volumeCm3.toFixed(1)}
                  <span className="text-xs font-normal text-ink-500"> cm³</span>
                </div>
              </div>
              <div className="p-3 rounded-lg bg-ink-100 dark:bg-ink-800/50">
                <div className="text-xs text-ink-500 dark:text-ink-400">{isSL ? 'Trikotniki' : 'Triangles'}</div>
                <div className="font-display font-bold tabular-nums text-sm">{stats.triangles.toLocaleString('en-US')}</div>
              </div>
              <div className="p-3 rounded-lg bg-ink-100 dark:bg-ink-800/50">
                <div className="text-xs text-ink-500 dark:text-ink-400">{isSL ? 'Teža PLA (20% / 100%)' : 'PLA mass (20% / 100%)'}</div>
                <div className="font-display font-bold tabular-nums text-sm">
                  {fmtMass(massInfill20)} <span className="text-ink-500">/</span> {fmtMass(massSolid)}
                </div>
              </div>
            </div>
            {!stats.watertight && (
              <p className="text-xs text-amber-600 dark:text-amber-400">
                {isSL
                  ? 'Mreža verjetno ni vodotesna — volumen in teža sta lahko netočna.'
                  : 'Mesh appears non-watertight — volume and mass are approximate.'}
              </p>
            )}
            <p className="text-[11px] text-ink-500 dark:text-ink-500">
              {isSL
                ? 'Ocene predpostavljajo enote v mm in PLA gostoto 1,24 g/cm³. Dejanska poraba je odvisna od nastavitev slicerja.'
                : 'Estimates assume mm units and PLA density 1.24 g/cm³. Actual usage depends on slicer settings.'}
            </p>
          </div>
        );
      })()}
    </div>
  );
}
