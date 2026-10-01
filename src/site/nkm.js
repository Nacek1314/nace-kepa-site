// NKM — the site's own preview-mesh format.
// The admin turns an uploaded STL/3MF/OBJ/GLB into a simplified, quantised, scrambled mesh and publishes
// only that. The original CAD export never leaves your computer, so what visitors' browsers receive is a
// lower-detail display copy, not a printable file.
//
// Layout (little-endian), after the 16-byte header everything is XOR-scrambled:
//   0  'NKM1'            4 bytes
//   4  vertexCount       uint32
//   8  triangleCount     uint32
//   12 seed              uint32
//   16 min xyz, size xyz 6 × float32
//   40 positions         vertexCount × 3 × uint16 (quantised to the bounding box)
//   .. indices           triangleCount × 3 × uint32
import * as THREE from 'three';

const MAGIC = 0x314d4b4e; // 'NKM1'

function scramble(bytes, seed) {
  let s = seed >>> 0 || 1;
  for (let i = 0; i < bytes.length; i++) {
    s ^= s << 13; s >>>= 0;
    s ^= s >>> 17;
    s ^= s << 5; s >>>= 0;
    bytes[i] ^= s & 0xff;
  }
}

// Merge every mesh under `root` into one indexed position-only geometry, in world space.
export function flatten(root) {
  root.updateMatrixWorld(true);
  const pos = [];
  const v = new THREE.Vector3();
  root.traverse((o) => {
    if (!o.isMesh) return;
    const g = o.geometry;
    const p = g.attributes.position;
    const idx = g.index;
    const count = idx ? idx.count : p.count;
    for (let i = 0; i < count; i++) {
      v.fromBufferAttribute(p, idx ? idx.getX(i) : i).applyMatrix4(o.matrixWorld);
      pos.push(v.x, v.y, v.z);
    }
  });
  return new Float32Array(pos); // triangle soup
}

// Vertex-clustering simplification: snap vertices to a grid of `cells` per longest side and weld.
function cluster(soup, box, cells) {
  const sx = box.max.x - box.min.x, sy = box.max.y - box.min.y, sz = box.max.z - box.min.z;
  const cell = Math.max(sx, sy, sz, 1e-9) / cells;
  const n = cells + 2;
  const map = new Map();
  const sums = [];
  const tris = [];
  const id = (x, y, z) => {
    const key = Math.floor((x - box.min.x) / cell) + n * (Math.floor((y - box.min.y) / cell) + n * Math.floor((z - box.min.z) / cell));
    let i = map.get(key);
    if (i === undefined) { i = sums.length / 4; map.set(key, i); sums.push(0, 0, 0, 0); }
    sums[i * 4] += x; sums[i * 4 + 1] += y; sums[i * 4 + 2] += z; sums[i * 4 + 3]++;
    return i;
  };
  for (let t = 0; t < soup.length; t += 9) {
    const a = id(soup[t], soup[t + 1], soup[t + 2]);
    const b = id(soup[t + 3], soup[t + 4], soup[t + 5]);
    const c = id(soup[t + 6], soup[t + 7], soup[t + 8]);
    if (a !== b && b !== c && a !== c) tris.push(a, b, c);
  }
  const vc = sums.length / 4;
  const positions = new Float32Array(vc * 3);
  for (let i = 0; i < vc; i++) {
    const w = sums[i * 4 + 3];
    positions[i * 3] = sums[i * 4] / w; positions[i * 3 + 1] = sums[i * 4 + 1] / w; positions[i * 3 + 2] = sums[i * 4 + 2] / w;
  }
  return { positions, indices: Uint32Array.from(tris) };
}

// Weld exact duplicates without simplifying (used when the mesh is already under budget).
function weld(soup) {
  const map = new Map();
  const pos = [];
  const tris = [];
  for (let i = 0; i < soup.length; i += 3) {
    const key = soup[i].toFixed(4) + ',' + soup[i + 1].toFixed(4) + ',' + soup[i + 2].toFixed(4);
    let j = map.get(key);
    if (j === undefined) { j = pos.length / 3; map.set(key, j); pos.push(soup[i], soup[i + 1], soup[i + 2]); }
    tris.push(j);
  }
  return { positions: new Float32Array(pos), indices: Uint32Array.from(tris) };
}

export function simplify(soup, maxTriangles) {
  const box = new THREE.Box3().setFromArray(soup);
  const original = soup.length / 9;
  if (original <= maxTriangles) return { ...weld(soup), original, box };
  // Binary-search the grid resolution for the most detail that fits the triangle budget.
  let lo = 16, hi = 4096, best = cluster(soup, box, lo);
  for (let step = 0; step < 10 && hi - lo > 8; step++) {
    const mid = Math.round((lo + hi) / 2);
    const out = cluster(soup, box, mid);
    if (out.indices.length / 3 <= maxTriangles) { best = out; lo = mid; } else hi = mid;
  }
  return { ...best, original, box };
}

export function encode({ positions, indices }) {
  const vc = positions.length / 3, tc = indices.length / 3;
  const box = new THREE.Box3().setFromArray(positions);
  const size = box.getSize(new THREE.Vector3());
  const buf = new ArrayBuffer(40 + vc * 6 + tc * 12 + ((vc * 6) % 4 ? 2 : 0));
  const dv = new DataView(buf);
  const seed = (crypto.getRandomValues(new Uint32Array(1))[0] | 1) >>> 0;
  dv.setUint32(0, MAGIC, true); dv.setUint32(4, vc, true); dv.setUint32(8, tc, true); dv.setUint32(12, seed, true);
  [box.min.x, box.min.y, box.min.z, size.x || 1, size.y || 1, size.z || 1].forEach((f, i) => dv.setFloat32(16 + i * 4, f, true));
  let o = 40;
  for (let i = 0; i < vc; i++) {
    for (let k = 0; k < 3; k++) {
      const min = [box.min.x, box.min.y, box.min.z][k], s = [size.x, size.y, size.z][k] || 1;
      dv.setUint16(o, Math.round(((positions[i * 3 + k] - min) / s) * 65535), true); o += 2;
    }
  }
  if (o % 4) o += 2;
  for (let i = 0; i < indices.length; i++) { dv.setUint32(o, indices[i], true); o += 4; }
  scramble(new Uint8Array(buf, 16), seed);
  return new Blob([buf], { type: 'application/octet-stream' });
}

export function decode(buffer) {
  const head = new DataView(buffer, 0, 16);
  if (head.getUint32(0, true) !== MAGIC) throw new Error('not_nkm');
  const vc = head.getUint32(4, true), tc = head.getUint32(8, true), seed = head.getUint32(12, true);
  const body = new Uint8Array(buffer.slice(16));
  scramble(body, seed);
  const dv = new DataView(body.buffer);
  const f = [0, 1, 2, 3, 4, 5].map((i) => dv.getFloat32(i * 4, true));
  const pos = new Float32Array(vc * 3);
  let o = 24;
  for (let i = 0; i < vc * 3; i++) { const k = i % 3; pos[i] = f[k] + (dv.getUint16(o, true) / 65535) * f[3 + k]; o += 2; }
  if ((o + 16) % 4) o += 2;
  const idx = new Uint32Array(tc * 3);
  for (let i = 0; i < tc * 3; i++) { idx[i] = dv.getUint32(o, true); o += 4; }
  // Un-index so every face gets its own flat normal (crisp CAD look).
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setIndex(new THREE.BufferAttribute(idx, 1));
  const flat = g.toNonIndexed();
  flat.computeVertexNormals();
  return flat;
}
