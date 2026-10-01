// 3D model viewer in the drawing-sheet style: pale surfaces, graphite feature edges, blueprint floor grid.
// Used by the public site (project pages) and the admin dashboard (upload preview).
// window.NKViewer.mount(container, { url, format, file }) -> Promise<{ dispose(), info }>
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { ThreeMFLoader } from 'three/examples/jsm/loaders/3MFLoader.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { decode as decodeNkm } from './nkm.js';

// Formats the admin accepts for upload. The site itself only ever serves 'nkm' preview meshes.
export const FORMATS = ['stl', 'obj', '3mf', 'glb', 'gltf'];
const VIEWABLE = FORMATS.concat('nkm');

function css(name, fallback) {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

function palette() {
  return {
    paper: new THREE.Color(css('--paper-raised', '#fafbf8')),
    surface: new THREE.Color(css('--paper-sunk', '#e2e5df')),
    ink: new THREE.Color(css('--ink', '#1a1c1e')),
    grid: new THREE.Color(css('--grid', '#d3dbe3')),
    accent: new THREE.Color(css('--redline', '#b52b16'))
  };
}

export async function loadObject(buffer, format) {
  if (format === 'nkm') return new THREE.Mesh(decodeNkm(buffer));
  if (format === 'stl') {
    const geo = new STLLoader().parse(buffer);
    // Many exporters write zero normals; recompute flat face normals so shading is always right.
    geo.deleteAttribute('normal');
    geo.computeVertexNormals();
    return new THREE.Mesh(geo);
  }
  if (format === 'obj') {
    return new OBJLoader().parse(new TextDecoder().decode(buffer));
  }
  if (format === '3mf') {
    return new ThreeMFLoader().parse(buffer);
  }
  if (format === 'glb' || format === 'gltf') {
    const gltf = await new Promise((res, rej) => new GLTFLoader().parse(buffer, '', res, rej));
    return gltf.scene;
  }
  throw new Error('unsupported_format');
}

function styleObject(root, pal) {
  const fill = new THREE.MeshStandardMaterial({ color: pal.surface, roughness: 0.85, metalness: 0, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1, side: THREE.DoubleSide });
  const line = new THREE.LineBasicMaterial({ color: pal.ink });
  let tris = 0;
  const meshes = [];
  root.traverse((o) => { if (o.isMesh) meshes.push(o); });
  meshes.forEach((m) => {
    m.material = fill;
    const g = m.geometry;
    if (!g.attributes.normal) g.computeVertexNormals();
    tris += (g.index ? g.index.count : g.attributes.position.count) / 3;
    // Feature edges only (creases over 24°): reads like a line drawing instead of a wireframe.
    const edges = new THREE.LineSegments(new THREE.EdgesGeometry(g, 24), line);
    m.add(edges);
  });
  return { tris: Math.round(tris), materials: [fill, line] };
}

export async function mount(container, opts) {
  const pal = palette();
  const format = (opts.format || (opts.url || opts.file?.name || '').split('.').pop() || '').toLowerCase();
  if (!VIEWABLE.includes(format)) throw new Error('unsupported_format');

  const buffer = opts.file ? await opts.file.arrayBuffer() : await fetch(opts.url).then((r) => {
    if (!r.ok) throw new Error('fetch_failed');
    return r.arrayBuffer();
  });

  // preserveDrawingBuffer stays off, so the canvas can't simply be saved as an image.
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: false });
  renderer.domElement.addEventListener('contextmenu', (e) => e.preventDefault());
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  container.appendChild(renderer.domElement);
  renderer.domElement.className = 'nk-viewer__canvas';

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 10000);
  scene.add(new THREE.HemisphereLight(0xffffff, pal.surface, 1.6));
  const key = new THREE.DirectionalLight(0xffffff, 1.4);
  key.position.set(1, 1.6, 1.2);
  scene.add(key);

  const obj = await loadObject(buffer, format);
  // Most CAD exports (STL/3MF) are Z-up; three.js is Y-up.
  if (format === 'stl' || format === '3mf') obj.rotation.x = -Math.PI / 2; // NKM is stored Y-up already
  const info = styleObject(obj, pal);
  const holder = new THREE.Group();
  holder.add(obj);
  scene.add(holder);

  // Centre on the floor and fit the camera.
  holder.updateMatrixWorld(true);
  let box = new THREE.Box3().setFromObject(holder);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  holder.position.set(-center.x, -box.min.y, -center.z);
  holder.updateMatrixWorld(true);
  box = new THREE.Box3().setFromObject(holder);
  const radius = Math.max(size.x, size.y, size.z) || 1;

  const step = Math.pow(10, Math.floor(Math.log10(radius))) / 2 || 1;
  const divisions = Math.min(80, Math.max(8, Math.ceil((radius * 3) / step)));
  const grid = new THREE.GridHelper(divisions * step, divisions, pal.grid, pal.grid);
  grid.material.transparent = true;
  grid.material.opacity = 0.9;
  scene.add(grid);

  camera.near = radius / 100;
  camera.far = radius * 100;
  camera.position.set(radius * 1.6, radius * 1.1, radius * 1.9);
  camera.updateProjectionMatrix();

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, size.y / 2, 0);
  controls.enableDamping = true;
  controls.autoRotate = !opts.still && !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  controls.autoRotateSpeed = 1.2;
  controls.minDistance = radius * 0.3;
  controls.maxDistance = radius * 8;
  controls.addEventListener('start', () => { controls.autoRotate = false; });
  controls.update();

  const resize = () => {
    const w = container.clientWidth || 300;
    const h = container.clientHeight || 300;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  const ro = new ResizeObserver(resize);
  ro.observe(container);
  resize();

  // Re-read colours when the theme flips.
  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  const retheme = () => {
    const p = palette();
    info.materials[0].color.copy(p.surface);
    info.materials[1].color.copy(p.ink);
    grid.material.color.copy(p.grid);
  };
  mq.addEventListener('change', retheme);
  const mo = new MutationObserver(retheme);
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

  let raf = 0;
  let alive = true;
  const loop = () => {
    if (!alive) return;
    controls.update();
    renderer.render(scene, camera);
    raf = requestAnimationFrame(loop);
  };
  loop();

  return {
    info: { ...info, size: { x: size.x, y: size.y, z: size.z }, format },
    reset: () => { controls.reset(); },
    dispose: () => {
      alive = false;
      cancelAnimationFrame(raf);
      ro.disconnect();
      mo.disconnect();
      mq.removeEventListener('change', retheme);
      controls.dispose();
      scene.traverse((o) => {
        if (o.geometry) o.geometry.dispose();
        if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => m.dispose());
      });
      renderer.dispose();
      renderer.domElement.remove();
    }
  };
}

window.NKViewer = { mount, FORMATS };
export { THREE };
window.dispatchEvent(new Event('nkviewer:ready'));
