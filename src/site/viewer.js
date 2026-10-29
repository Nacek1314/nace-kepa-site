// 3D model viewer in the drawing-sheet style: pale surfaces, graphite feature edges, blueprint floor grid.
// Used by the public site (project pages) and the admin dashboard (upload preview).
// window.NKViewer.mount(container, { url, format, file }) -> Promise<{ dispose(), info, setView(), setCut() }>
// Drawing views + section (2026-10-29): mount() also takes { positions, scale, bed } — a mesh already read in the browser
// (the file check on #services: Float32Array, 9 numbers per triangle, Z-up, in file units × scale = mm) shown on the X2D
// build plate (bed = [X, Y, Z] mm as a dashed box; the part turns red where it is bigger than the box). Every viewer gets
// setView('iso' | 'top' | 'front' | 'side') — orthographic drawing views — and setCut(mm | null), a section plane that
// hides everything above that height. Remove: meshFromPositions(), the bed / ortho / cut blocks below and the two returned
// functions; mount({ url }) then works as before.
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
    muted: new THREE.Color(css('--ink-muted', '#53585e')),
    accent: new THREE.Color(css('--redline', '#b52b16'))
  };
}

// A mesh from raw triangles (the file check already has them): Z-up like an STL, so mount() rotates it the same way.
function meshFromPositions(positions) {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.computeVertexNormals();
  return new THREE.Mesh(geo);
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
  meshes.forEach((m) => { const g = m.geometry; tris += (g.index ? g.index.count : g.attributes.position.count) / 3; });
  meshes.forEach((m) => {
    m.material = fill;
    const g = m.geometry;
    if (!g.attributes.normal) g.computeVertexNormals();
    // Feature edges only (creases over 24°): reads like a line drawing instead of a wireframe. Skipped on very large
    // client meshes (the edge search would stall a phone); the shaded surface is still shown.
    if (tris <= 250000) m.add(new THREE.LineSegments(new THREE.EdgesGeometry(g, 24), line));
  });
  return { tris: Math.round(tris), materials: [fill, line] };
}

export async function mount(container, opts) {
  const pal = palette();
  const raw = opts.positions instanceof Float32Array && opts.positions.length >= 9;
  const format = raw ? 'stl' : (opts.format || (opts.url || opts.file?.name || '').split('.').pop() || '').toLowerCase();
  if (!VIEWABLE.includes(format)) throw new Error('unsupported_format');

  const buffer = raw ? null : opts.file ? await opts.file.arrayBuffer() : await fetch(opts.url).then((r) => {
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

  const obj = raw ? meshFromPositions(opts.positions) : await loadObject(buffer, format);
  // Most CAD exports (STL/3MF) are Z-up; three.js is Y-up.
  if (format === 'stl' || format === '3mf') obj.rotation.x = -Math.PI / 2; // NKM is stored Y-up already
  if (raw && opts.scale > 0 && opts.scale !== 1) obj.scale.setScalar(opts.scale); // file units → mm
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
  // Build plate mode: the X2D volume as a dashed box on a 16 mm grid; a part bigger than the box in this orientation is red.
  const bed = Array.isArray(opts.bed) && opts.bed.length === 3 ? opts.bed.map(Number) : null; // [X, Y, Z] mm → three.js x, z, y
  const over = bed ? size.x > bed[0] + 0.05 || size.z > bed[1] + 0.05 || size.y > bed[2] + 0.05 : false;
  if (over) info.materials[0].color.copy(pal.accent);
  const radius = Math.max(size.x, size.y, size.z, bed ? Math.max(bed[0], bed[1], bed[2]) : 0) || 1;

  let grid;
  if (bed) {
    grid = new THREE.GridHelper(Math.max(bed[0], bed[1]), Math.round(Math.max(bed[0], bed[1]) / 16), pal.grid, pal.grid);
    const bedMat = new THREE.LineDashedMaterial({ color: pal.muted, dashSize: 6, gapSize: 4 });
    const bedBox = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(bed[0], bed[2], bed[1])), bedMat);
    bedBox.computeLineDistances();
    bedBox.position.y = bed[2] / 2;
    scene.add(bedBox);
    const plate = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-bed[0] / 2, 0, -bed[1] / 2), new THREE.Vector3(bed[0] / 2, 0, -bed[1] / 2), new THREE.Vector3(bed[0] / 2, 0, bed[1] / 2), new THREE.Vector3(-bed[0] / 2, 0, bed[1] / 2)]), new THREE.LineBasicMaterial({ color: pal.accent }));
    scene.add(plate);
    info.materials.push(bedMat, plate.material);
  } else {
    const step = Math.pow(10, Math.floor(Math.log10(radius))) / 2 || 1;
    const divisions = Math.min(80, Math.max(8, Math.ceil((radius * 3) / step)));
    grid = new THREE.GridHelper(divisions * step, divisions, pal.grid, pal.grid);
  }
  grid.material.transparent = true;
  grid.material.opacity = 0.9;
  scene.add(grid);

  // Section plane: everything above `cut` mm (from the plate) is hidden, so the inside of the part can be seen.
  renderer.localClippingEnabled = true;
  const cutPlane = new THREE.Plane(new THREE.Vector3(0, -1, 0), 1e9);
  info.materials.slice(0, 2).forEach((m) => { m.clippingPlanes = [cutPlane]; });

  // The camera orbits the part's centre; in build plate mode it stands further back so the whole box stays in view.
  const home = bed ? [radius * 2.1, radius * 1.5, radius * 2.5] : [radius * 1.6, radius * 1.1, radius * 1.9];
  const look = bed ? Math.max(size.y / 2, bed[2] * 0.3) : size.y / 2;
  camera.near = radius / 100;
  camera.far = radius * 100;
  camera.position.set(home[0], home[1], home[2]);
  camera.updateProjectionMatrix();

  // Orthographic camera for the drawing views (top / front / side); the perspective one stays for "iso".
  const ortho = new THREE.OrthographicCamera(-1, 1, 1, -1, radius / 100, radius * 100);
  const half = radius * (bed ? 0.72 : 0.68);
  const fitOrtho = (aspect) => { ortho.left = -half * aspect; ortho.right = half * aspect; ortho.top = half; ortho.bottom = -half; ortho.updateProjectionMatrix(); };
  let view = 'iso';

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, look, 0);
  controls.minZoom = 0.2;
  controls.maxZoom = 25;
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
    fitOrtho(w / h);
  };
  const ro = new ResizeObserver(resize);
  ro.observe(container);
  resize();

  // Re-read colours when the theme flips.
  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  const retheme = () => {
    const p = palette();
    info.materials[0].color.copy(over ? p.accent : p.surface);
    info.materials[1].color.copy(p.ink);
    grid.material.color.copy(p.grid);
    if (bed) { info.materials[2].color.copy(p.muted); info.materials[3].color.copy(p.accent); }
  };
  mq.addEventListener('change', retheme);
  const mo = new MutationObserver(retheme);
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

  let raf = 0;
  let alive = true;
  const loop = () => {
    if (!alive) return;
    controls.update();
    renderer.render(scene, controls.object);
    raf = requestAnimationFrame(loop);
  };
  loop();

  // Drawing views: the orthographic camera is moved onto the axis of the view; the orbit controls keep working from there.
  const setView = (name) => {
    if (!['iso', 'top', 'front', 'side'].includes(name)) name = 'iso';
    view = name;
    controls.autoRotate = false;
    if (name === 'iso') {
      controls.object = camera;
      camera.position.set(home[0], home[1], home[2]);
      camera.zoom = 1;
      camera.updateProjectionMatrix();
    } else {
      const d = radius * 4;
      controls.object = ortho;
      ortho.zoom = 1;
      ortho.position.set(name === 'side' ? d : 0, name === 'top' ? d : look, name === 'front' ? d : 0);
      fitOrtho((container.clientWidth || 300) / (container.clientHeight || 300));
    }
    controls.target.set(0, look, 0);
    controls.update();
  };
  const setCut = (mm) => { cutPlane.constant = typeof mm === 'number' && isFinite(mm) ? Math.max(0, mm) : 1e9; };

  return {
    info: { ...info, size: { x: size.x, y: size.y, z: size.z }, format, over, bed },
    views: ['iso', 'top', 'front', 'side'],
    get view() { return view; },
    setView,
    setCut,
    reset: () => { setView('iso'); setCut(null); },
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
