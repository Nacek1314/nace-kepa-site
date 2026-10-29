// nacekepa.work admin dashboard.
// Edits src/data/projects.json, src/data/news.json and the files under public/models/ and public/news/
// by committing straight to GitHub
// (Git Data API) with a fine-grained token that lives only in this browser. GitHub Pages rebuilds on push.
import { mount as mountViewer, loadObject, FORMATS, THREE } from './viewer.js';
import { flatten, simplify, encode } from './nkm.js';

const OWNER = 'Nacek1314';
const REPO = 'nace-kepa-site';
const BRANCH = 'main';
const DATA_PATH = 'src/data/projects.json';
const NEWS_PATH = 'src/data/news.json';
const PUBLIC_DIR = 'public/';
const MAX_MODEL = 50 * 1024 * 1024;
const MAX_PHOTO_EDGE = 2000;
const CATEGORIES = ['CAD', 'Mechanical', 'IoT', 'Embedded'];
const DRAWINGS = Object.keys(window.NK_DRAWINGS || {});
const VAULT_KEY = 'nk-admin-vault';      // GitHub token, AES-GCM encrypted with your admin PIN
const LOCK_AFTER_MS = 15 * 60 * 1000;     // lock the dashboard after 15 minutes without activity
const PREVIEW_TRIANGLES = 150000;         // published 3D previews are simplified to at most this
for (const k of ['nk-admin-token']) { try { localStorage.removeItem(k); sessionStorage.removeItem(k); } catch {} } // old plain-text storage

const root = document.getElementById('admin');
const S = {
  token: null, user: null,
  headSha: null, dataSha: null,
  projects: [], savedJson: '',
  news: [], savedNews: '[]\n', newsSha: null, selNews: null,
  tab: 'projects',
  sel: null, query: '',
  uploads: new Map(),   // repoPath -> File|Blob
  deletes: new Set(),   // repoPath of committed files to remove
  busy: '', error: '', notice: '',
  deploy: null,         // { sha, status, conclusion, url }
  confirmDelete: false,
};
let viewer = null;

// ---------- helpers ----------
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const slugify = (t) => String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'project';
const fmtMB = (n) => n < 1048576 ? Math.max(1, Math.round(n / 1024)) + ' KB' : (n / 1048576).toFixed(n < 10485760 ? 1 : 0) + ' MB';
const sitePath = (repoPath) => repoPath.replace(/^public\//, '');
const repoPath = (site) => PUBLIC_DIR + String(site).replace(/^\/+/, '');
const isNews = () => S.tab === 'news';
const isTodo = () => S.tab === 'todo';
const cur = () => isNews() ? (S.news.find((n) => n.slug === S.selNews) || null) : (S.projects.find((p) => p.slug === S.sel) || null);
const projectsChanged = () => JSON.stringify(S.projects, null, 2) + '\n' !== S.savedJson;
const newsChanged = () => JSON.stringify(S.news, null, 2) + '\n' !== S.savedNews;
const dirty = () => projectsChanged() || newsChanged() || S.uploads.size > 0 || S.deletes.size > 0;
const changeCount = () => S.uploads.size + S.deletes.size + (projectsChanged() ? 1 : 0) + (newsChanged() ? 1 : 0);
const today = () => new Date().toISOString().slice(0, 10);
const sortNews = (list) => list.slice().sort((x, y) => (y.pinned ? 1 : 0) - (x.pinned ? 1 : 0) || String(y.date).localeCompare(String(x.date)));

// ---------- token vault (PBKDF2 → AES-GCM; the PIN never leaves the browser) ----------
const enc = new TextEncoder();
const b64 = (u8) => btoa(String.fromCharCode(...u8));
const unb64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
async function pinKey(pin, salt) {
  const base = await crypto.subtle.importKey('raw', enc.encode(pin), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: 600000, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}
async function sealToken(tok, pin) {
  const salt = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await pinKey(pin, salt), enc.encode(tok)));
  try { localStorage.setItem(VAULT_KEY, JSON.stringify({ v: 1, salt: b64(salt), iv: b64(iv), ct: b64(ct), user: S.user })); } catch {}
}
async function openVault(pin) {
  const v = vault();
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(v.iv) }, await pinKey(pin, unb64(v.salt)), unb64(v.ct));
  return new TextDecoder().decode(pt);
}
function vault() { try { return JSON.parse(localStorage.getItem(VAULT_KEY) || 'null'); } catch { return null; } }
function clearToken() { try { localStorage.removeItem(VAULT_KEY); } catch {} }

// ---------- auto-lock ----------
let lastActive = Date.now();
['pointerdown', 'keydown', 'wheel', 'touchstart'].forEach((ev) => window.addEventListener(ev, () => { lastActive = Date.now(); }, { passive: true }));
setInterval(() => {
  if (S.user && !S.locked && !S.busy && Date.now() - lastActive > LOCK_AFTER_MS) lock('Locked after 15 minutes without activity.');
}, 15000);
document.addEventListener('visibilitychange', () => { if (document.hidden) lastActive = Math.min(lastActive, Date.now()); });
function lock(msg) {
  S.token = null; S.locked = true; S.error = ''; S.notice = msg || '';
  render();
}

async function gh(path, opts = {}) {
  const r = await fetch('https://api.github.com' + path, {
    ...opts,
    cache: 'no-store',
    headers: {
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      Authorization: 'Bearer ' + S.token,
      ...(opts.body ? { 'Content-Type': 'application/json' } : {}),
    },
  });
  if (!r.ok) {
    let msg = '';
    try { msg = (await r.json()).message || ''; } catch {}
    const e = new Error(msg || 'HTTP ' + r.status);
    e.status = r.status;
    throw e;
  }
  return r.status === 204 ? null : r.json();
}
const repo = (p) => `/repos/${OWNER}/${REPO}${p}`;

function b64ToUtf8(b64) {
  const bin = atob(b64.replace(/\n/g, ''));
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}
function fileToB64(file) {
  return new Promise((res, rej) => {
    const fr = new FileReader();
    fr.onload = () => res(String(fr.result).split(',')[1] || '');
    fr.onerror = () => rej(fr.error);
    fr.readAsDataURL(file);
  });
}

// Every photo is re-drawn: resized to at most 2000 px, stripped of camera metadata (GPS etc.) and
// watermarked with the NK mark + nacekepa.work. Only this copy is published; the original stays on your device.
async function preparePhoto(file) {
  if (!/^image\/(jpeg|png|webp|heic|heif)$/.test(file.type) && !/\.(jpe?g|png|webp)$/i.test(file.name)) throw new Error(`“${file.name}” isn’t a JPG, PNG or WebP photo.`);
  const img = await createImageBitmap(file, { imageOrientation: 'from-image' }).catch(() => null);
  if (!img) throw new Error(`“${file.name}” couldn’t be opened as an image.`);
  const scale = Math.min(1, MAX_PHOTO_EDGE / Math.max(img.width, img.height));
  const c = document.createElement('canvas');
  c.width = Math.round(img.width * scale);
  c.height = Math.round(img.height * scale);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.drawImage(img, 0, 0, c.width, c.height);
  watermark(ctx, c.width, c.height);
  const blob = await new Promise((r) => c.toBlob(r, 'image/jpeg', 0.86));
  if (!blob) throw new Error(`“${file.name}” couldn’t be converted.`);
  return new File([blob], 'photo.jpg', { type: 'image/jpeg' });
}

function watermark(ctx, w, h) {
  const u = Math.max(w, h) / 100; // 1% of the long edge
  // 1. A faint diagonal repeat across the whole photo, so a crop can't remove it.
  ctx.save();
  ctx.translate(w / 2, h / 2);
  ctx.rotate(-Math.PI / 7);
  ctx.font = `600 ${Math.round(u * 2.2)}px "JetBrains Mono", ui-monospace, monospace`;
  ctx.fillStyle = 'rgba(255,255,255,0.13)';
  ctx.strokeStyle = 'rgba(0,0,0,0.07)';
  ctx.lineWidth = Math.max(1, u * 0.08);
  const step = u * 22, span = Math.hypot(w, h);
  for (let y = -span; y < span; y += u * 9) {
    for (let x = -span + ((y / (u * 9)) % 2) * step / 2; x < span; x += step) {
      ctx.strokeText('NACEKEPA.WORK', x, y);
      ctx.fillText('NACEKEPA.WORK', x, y);
    }
  }
  ctx.restore();
  // 2. A solid corner mark: the NK monogram + wordmark on a paper plate.
  const s = Math.round(u * 5.2), pad = Math.round(u * 1.6), text = 'nacekepa.work';
  ctx.font = `800 ${Math.round(s * 0.5)}px "Schibsted Grotesk", Arial, sans-serif`;
  const tw = ctx.measureText(text).width;
  const bw = s + u * 1.2 + tw + u * 2.4, bh = s + u * 1.6;
  const bx = w - bw - pad, by = h - bh - pad;
  ctx.fillStyle = 'rgba(250,251,248,0.92)';
  ctx.fillRect(bx, by, bw, bh);
  const mx = bx + u * 0.8, my = by + u * 0.8, k = s / 64;
  ctx.save(); ctx.translate(mx, my); ctx.scale(k, k);
  ctx.fillStyle = '#fafbf8'; ctx.fillRect(3, 3, 58, 58);
  ctx.strokeStyle = '#1a1c1e'; ctx.lineWidth = 3.5; ctx.strokeRect(3, 3, 58, 58);
  ctx.lineWidth = 5; ctx.lineJoin = 'miter'; ctx.lineCap = 'butt';
  ctx.beginPath(); ctx.moveTo(14, 48); ctx.lineTo(14, 16); ctx.lineTo(30, 48); ctx.lineTo(30, 16);
  ctx.moveTo(38, 16); ctx.lineTo(38, 48); ctx.moveTo(38, 32); ctx.lineTo(52, 16); ctx.moveTo(38, 32); ctx.lineTo(52, 48); ctx.stroke();
  ctx.fillStyle = '#b52b16'; ctx.fillRect(53, 40, 6, 6);
  ctx.restore();
  ctx.fillStyle = '#1a1c1e';
  ctx.textBaseline = 'middle';
  ctx.fillText('nacekepa', mx + s + u * 1.2, by + bh / 2);
  const w1 = ctx.measureText('nacekepa').width;
  ctx.fillStyle = '#b52b16';
  ctx.fillText('.work', mx + s + u * 1.2 + w1, by + bh / 2);
}

// Turn an uploaded CAD export into the published preview: one simplified, quantised, scrambled NKM mesh.
async function makePreview(file, ext) {
  const obj = await loadObject(await file.arrayBuffer(), ext);
  if (ext === 'stl' || ext === '3mf') obj.rotation.x = -Math.PI / 2; // CAD is Z-up; store Y-up
  const holder = new THREE.Group();
  holder.add(obj);
  const soup = flatten(holder);
  if (!soup.length) throw new Error(`“${file.name}” contains no surfaces.`);
  const out = simplify(soup, PREVIEW_TRIANGLES);
  const blob = encode(out);
  return { file: new File([blob], 'model.nkm', { type: 'application/octet-stream' }), original: out.original, triangles: out.indices.length / 3 };
}

function blankProject() {
  let base = 'new-project', slug = base, n = 2;
  while (S.projects.some((p) => p.slug === slug)) slug = base + '-' + n++;
  return {
    slug, _new: true,
    title: { en: '', sl: '' }, year: new Date().getFullYear(), category: 'CAD',
    description: { en: '', sl: '' }, details: { en: '', sl: '' }, materials: '',
    drawing: '', featured: false, hidden: false, model: null, photos: [],
  };
}

function blankNews() {
  let base = 'news-' + today(), slug = base, n = 2;
  while (S.news.some((p) => p.slug === slug)) slug = base + '-' + n++;
  return { slug, _new: true, date: today(), title: { en: '', sl: '' }, summary: { en: '', sl: '' }, body: { en: '', sl: '' }, photos: [], pinned: false, hidden: false };
}

function stageDelete(site) {
  const rp = repoPath(site);
  if (S.uploads.has(rp)) S.uploads.delete(rp); // uploaded in this session, never committed
  else S.deletes.add(rp);
}

function previewUrl(site) {
  const rp = repoPath(site);
  const f = S.uploads.get(rp);
  if (f) {
    f._url ||= URL.createObjectURL(f);
    return f._url;
  }
  return '/' + site.split('/').map(encodeURIComponent).join('/');
}

// ---------- data ----------
async function signIn(tok, pin) {
  S.token = tok.trim();
  S.busy = 'Checking access…'; S.error = ''; render();
  try {
    const [user, r] = await Promise.all([gh('/user'), gh(repo(''))]);
    if (!r.permissions || !r.permissions.push) throw new Error(`This token can read ${OWNER}/${REPO} but not write to it. Give it “Contents: Read and write”.`);
    S.user = user.login;
    if (pin) await sealToken(S.token, pin);
    S.locked = false;
    if (S.projects.length && S.headSha) { S.busy = ''; render(); } else await load();
  } catch (e) {
    S.token = null;
    S.busy = '';
    if (e.status === 401) clearToken();
    S.error = e.status === 401 ? 'GitHub rejected this token. Check it was copied whole and hasn’t expired.'
      : e.status === 404 ? `This token can’t see ${OWNER}/${REPO}. Under “Repository access”, select that repository.`
      : e.message;
    render();
  }
}

async function getNews(ref) {
  try { return await gh(repo(`/contents/${NEWS_PATH}?ref=${ref}`)); }
  catch (e) { if (e.status === 404) return null; throw e; }
}

async function load() {
  S.busy = 'Loading projects and news…'; render();
  const ref = await gh(repo(`/git/ref/heads/${BRANCH}`));
  const [file, news] = await Promise.all([gh(repo(`/contents/${DATA_PATH}?ref=${ref.object.sha}`)), getNews(ref.object.sha)]);
  S.headSha = ref.object.sha;
  S.dataSha = file.sha;
  S.newsSha = news ? news.sha : null;
  S.projects = JSON.parse(b64ToUtf8(file.content));
  S.savedJson = JSON.stringify(S.projects, null, 2) + '\n';
  S.news = news ? JSON.parse(b64ToUtf8(news.content)) : [];
  S.savedNews = JSON.stringify(S.news, null, 2) + '\n';
  if (!S.news.some((n) => n.slug === S.selNews)) S.selNews = sortNews(S.news)[0]?.slug || null;
  S.uploads.clear(); S.deletes.clear();
  if (!S.projects.some((p) => p.slug === S.sel)) S.sel = S.projects[0]?.slug || null;
  S.busy = ''; S.error = '';
  render();
}

function validate() {
  const slugs = new Set();
  for (const p of S.projects) {
    if (!p.title.en.trim()) return `“${p.slug}” needs an English title.`;
    if (!/^[a-z0-9-]+$/.test(p.slug)) return `“${p.slug}” has an invalid URL name. Use lowercase letters, numbers and dashes.`;
    if (slugs.has(p.slug)) return `Two projects use the URL name “${p.slug}”.`;
    slugs.add(p.slug);
    if (!CATEGORIES.includes(p.category)) return `“${p.title.en}” has an unknown category.`;
    if (!(+p.year >= 1990 && +p.year <= 2100)) return `“${p.title.en}” needs a year like 2026.`;
  }
  const ns = new Set();
  for (const n of S.news) {
    if (!n.title.en.trim()) return `A news post (${n.date}) needs an English title.`;
    if (!/^[a-z0-9-]+$/.test(n.slug)) return `News “${n.title.en}” has an invalid URL name.`;
    if (ns.has(n.slug)) return `Two news posts use the URL name “${n.slug}”.`;
    ns.add(n.slug);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(n.date)) return `News “${n.title.en}” needs a date.`;
  }
  return '';
}

async function publish() {
  const problem = validate();
  if (problem) { S.error = problem; render(); return; }
  S.error = ''; S.notice = '';
  try {
    S.busy = 'Checking for changes made elsewhere…'; render();
    const ref = await gh(repo(`/git/ref/heads/${BRANCH}`));
    const head = ref.object.sha;
    if (head !== S.headSha) {
      const [f, nf] = await Promise.all([gh(repo(`/contents/${DATA_PATH}?ref=${head}`)), getNews(head)]);
      if (f.sha !== S.dataSha || (nf ? nf.sha : null) !== S.newsSha) throw new Error('Projects or news were changed somewhere else since you opened the dashboard. Copy anything you need, then press “Reload”.');
    }
    const base = await gh(repo(`/git/commits/${head}`));
    const clean = S.projects.map(({ _new, _slugTouched, ...p }) => (p.model ? { ...p, model: { file: p.model.file, format: p.model.format, size: p.model.size, triangles: p.model.triangles } } : p));
    const json = JSON.stringify(clean, null, 2) + '\n';
    const cleanNews = sortNews(S.news).map(({ _new, _slugTouched, ...n }) => n);
    const newsJson = JSON.stringify(cleanNews, null, 2) + '\n';
    const tree = [];
    if (projectsChanged()) tree.push({ path: DATA_PATH, mode: '100644', type: 'blob', content: json });
    if (newsChanged()) tree.push({ path: NEWS_PATH, mode: '100644', type: 'blob', content: newsJson });

    let i = 0;
    for (const [path, file] of S.uploads) {
      i++;
      S.busy = `Uploading ${i}/${S.uploads.size}: ${path.split('/').pop()} (${fmtMB(file.size)})…`; render();
      const blob = await gh(repo('/git/blobs'), { method: 'POST', body: JSON.stringify({ content: await fileToB64(file), encoding: 'base64' }) });
      tree.push({ path, mode: '100644', type: 'blob', sha: blob.sha });
    }
    for (const path of S.deletes) tree.push({ path, mode: '100644', type: 'blob', sha: null });

    S.busy = 'Committing…'; render();
    const t = await gh(repo('/git/trees'), { method: 'POST', body: JSON.stringify({ base_tree: base.tree.sha, tree }) });
    const summary = summarize();
    const commit = await gh(repo('/git/commits'), { method: 'POST', body: JSON.stringify({ message: `admin: ${summary}\n\nPublished from the nacekepa.work dashboard.`, tree: t.sha, parents: [head] }) });
    await gh(repo(`/git/refs/heads/${BRANCH}`), { method: 'PATCH', body: JSON.stringify({ sha: commit.sha }) });

    S.projects = clean;
    S.savedJson = json;
    S.news = cleanNews;
    S.savedNews = newsJson;
    S.headSha = commit.sha;
    const [df, nf] = await Promise.all([gh(repo(`/contents/${DATA_PATH}?ref=${commit.sha}`)), getNews(commit.sha)]);
    S.dataSha = df.sha;
    S.newsSha = nf ? nf.sha : null;
    S.uploads.forEach((f) => f._url && URL.revokeObjectURL(f._url));
    S.uploads.clear(); S.deletes.clear();
    S.busy = '';
    S.notice = 'Published. The site is rebuilding.';
    S.deploy = { sha: commit.sha, status: 'queued' };
    render();
    watchDeploy(commit.sha);
  } catch (e) {
    S.busy = '';
    S.error = e.status === 403
      ? 'Your GitHub token can read the repository but isn’t allowed to save to it. On GitHub open Settings → Developer settings → Fine-grained tokens → your token → Edit, set Repository permissions → Contents to “Read and write”, press Update, then press Publish again (nothing is lost).'
      : e.status === 409 || e.status === 422 ? 'GitHub refused the commit (' + e.message + '). Press “Reload” and try again.' : e.message;
    render();
  }
}

function summarize() {
  const before = JSON.parse(S.savedJson || '[]');
  const bs = new Set(before.map((p) => p.slug));
  const as = new Set(S.projects.map((p) => p.slug));
  const added = S.projects.filter((p) => !bs.has(p.slug)).map((p) => p.title.en || p.slug);
  const removed = before.filter((p) => !as.has(p.slug)).map((p) => p.title.en || p.slug);
  const parts = [];
  if (added.length) parts.push('add ' + added.join(', '));
  if (removed.length) parts.push('remove ' + removed.join(', '));
  if (!added.length && !removed.length && arOrderChanged()) parts.push('reorder projects');
  const before2 = JSON.parse(S.savedNews || '[]');
  const nb = new Set(before2.map((n) => n.slug));
  const addedNews = S.news.filter((n) => !nb.has(n.slug)).map((n) => n.title.en || n.slug);
  if (addedNews.length) parts.push('news: ' + addedNews.join(', '));
  else if (newsChanged()) parts.push('update news');
  const models = [...S.uploads.keys()].filter((p) => p.endsWith('.nkm')).length;
  const photos = S.uploads.size - models;
  if (models) parts.push(models + ' model' + (models > 1 ? 's' : ''));
  if (photos) parts.push(photos + ' photo' + (photos > 1 ? 's' : ''));
  if (!parts.length) parts.push(projectsChanged() ? 'update projects' : 'update');
  return parts.join('; ').slice(0, 120);
}

async function watchDeploy(sha) {
  for (let n = 0; n < 60 && S.deploy && S.deploy.sha === sha; n++) {
    await new Promise((r) => setTimeout(r, n === 0 ? 4000 : 6000));
    try {
      const r = await gh(repo(`/actions/runs?head_sha=${sha}&per_page=1`));
      const run = r.workflow_runs && r.workflow_runs[0];
      if (run) {
        S.deploy = { sha, status: run.status, conclusion: run.conclusion, url: run.html_url };
        render();
        if (run.status === 'completed') return;
      }
    } catch (e) {
      if (e.status === 403 || e.status === 404) { S.deploy = { sha, status: 'unknown' }; render(); return; }
    }
  }
}

// ---------- views ----------
function logo() {
  return '<svg class="nk-mark" viewBox="0 0 64 64" aria-hidden="true"><rect class="nk-mark__frame" x="3" y="3" width="58" height="58"/><path class="nk-mark__ln" d="M14 48 V16 L30 48 V16"/><path class="nk-mark__ln" d="M38 16 V48 M38 32 L52 16 M38 32 L52 48"/><rect class="nk-mark__dot" x="53" y="40" width="6" height="6"/></svg>';
}

function loginView() {
  return `<div class="ad-login">
    <a class="wordmark" href="/">${logo()}<span class="wm-text">nacekepa<span>.work</span></span></a>
    <p class="nk-label">Admin · Sheet NK-ADM</p>
    <h1 class="page-title">Dashboard</h1>
    <p class="lead">Add projects, 3D models, photos and news. Changes are saved to your GitHub repository and the site updates about a minute later.</p>
    <form class="ad-card" id="login" novalidate>
      <div class="nk-field">
        <label class="nk-field__label" for="tok">GitHub access token</label>
        <input class="nk-input" id="tok" type="password" autocomplete="off" spellcheck="false" placeholder="github_pat_…" required>
        <span class="nk-field__hint">A fine-grained token for ${OWNER}/${REPO} only, with <b>Contents: Read and write</b> (add <b>Actions: Read-only</b> to see deploy status).
          <a href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noopener">Create one on GitHub ↗</a></span>
      </div>
      <div class="nk-field">
        <label class="nk-field__label" for="pin">Admin PIN for this device</label>
        <input class="nk-input" id="pin" type="password" inputmode="text" autocomplete="new-password" minlength="6" placeholder="At least 6 characters">
        <span class="nk-field__hint">Encrypts the token on this device. Next time you only type the PIN. Leave empty to not remember the token at all.</span>
      </div>
      ${S.error ? `<p class="err" role="alert">${esc(S.error)}</p>` : ''}
      ${S.busy ? `<p class="nk-label" role="status">${esc(S.busy)}</p>` : ''}
      <button class="nk-btn nk-btn--primary" type="submit" ${S.busy ? 'disabled' : ''}>Sign in<span class="nk-btn__arrow" aria-hidden="true">→</span></button>
      <p class="ad-small">The token is sent only to GitHub. With a PIN it is kept encrypted on this device; the dashboard locks itself after 15 minutes without activity.</p>
    </form>
  </div>`;
}

function unlockView() {
  const v = vault();
  return `<div class="ad-login">
    <a class="wordmark" href="/">${logo()}<span class="wm-text">nacekepa<span>.work</span></span></a>
    <p class="nk-label">Admin · Locked</p>
    <h1 class="page-title">Unlock</h1>
    ${S.notice ? `<p class="lead">${esc(S.notice)}</p>` : ''}
    <form class="ad-card" id="unlock" novalidate>
      <div class="nk-field">
        <label class="nk-field__label" for="pin">Admin PIN${v && v.user ? ' · ' + esc(v.user) : ''}</label>
        <input class="nk-input" id="pin" type="password" autocomplete="current-password" autofocus>
      </div>
      ${S.error ? `<p class="err" role="alert">${esc(S.error)}</p>` : ''}
      ${S.busy ? `<p class="nk-label" role="status">${esc(S.busy)}</p>` : ''}
      <button class="nk-btn nk-btn--primary" type="submit" ${S.busy ? 'disabled' : ''}>Unlock<span class="nk-btn__arrow" aria-hidden="true">→</span></button>
      <button class="nk-btn nk-btn--sm nk-btn--ghost" type="button" data-act="forget">Use a different token</button>
      ${S.projects.length && dirty() ? '<p class="ad-small">Your unpublished changes are still here and come back after unlocking.</p>' : ''}
    </form>
  </div>`;
}

function deployPill() {
  const d = S.deploy;
  if (!d) return '';
  if (d.status === 'unknown') return '<span class="nk-tag">Rebuilding · status hidden</span>';
  if (d.status !== 'completed') return `<span class="nk-tag nk-tag--rev ad-pulse">Rebuilding site…</span>`;
  if (d.conclusion === 'success') return '<span class="nk-tag nk-tag--ok">Live on nacekepa.work</span>';
  return `<a class="nk-tag nk-tag--rev" href="${esc(d.url)}" target="_blank" rel="noopener">Build failed ↗</a>`;
}

function tabsView() {
  return `<div class="ad-tabs" role="tablist" aria-label="Content">
    <button type="button" role="tab" data-tab="projects" aria-selected="${S.tab === 'projects'}">Projects <span>${S.projects.length}</span></button>
    <button type="button" role="tab" data-tab="news" aria-selected="${isNews()}">News <span>${S.news.length}</span></button>
    <button type="button" role="tab" data-tab="todo" aria-selected="${isTodo()}">To do <span>${todoItems().length}</span></button>
    <button type="button" role="tab" data-tab="arrange" aria-selected="${isArr()}">Arrange</button>
    <button type="button" role="tab" data-tab="translate" aria-selected="${isTr()}">EN ⇄ SL <span>${trCount()}</span></button>
    <button type="button" role="tab" data-tab="table" aria-selected="${isTb()}">Table <span>${S.projects.length}</span></button>
  </div>`;
}

function newsListView() {
  const q = S.query.toLowerCase();
  const items = sortNews(S.news).filter((n) => !q || (n.title.en + ' ' + n.title.sl).toLowerCase().includes(q));
  return `<div class="ad-list">
    ${tabsView()}
    <div class="ad-list__top">
      <input class="nk-input" id="q" type="search" placeholder="Search ${S.news.length} posts" value="${esc(S.query)}" aria-label="Search news">
      <button class="nk-btn nk-btn--sm" type="button" data-act="new">+ New</button>
    </div>
    <ol class="ad-items">${items.length ? items.map((n) => `
      <li class="ad-item${n.slug === S.selNews ? ' is-sel' : ''}${n.hidden ? ' is-hidden' : ''}">
        <button type="button" class="ad-item__main" data-sel="${esc(n.slug)}">
          <span class="ad-item__t">${esc(n.title.en || 'Untitled')}</span>
          <span class="ad-item__m">${esc(n.date)}${n.pinned ? ' · ★ pinned' : ''}${n.photos.length ? ` · ${n.photos.length} ph` : ''}${n.hidden ? ' · draft' : ''}</span>
        </button>
      </li>`).join('') : '<li class="ad-item"><span class="ad-item__main"><span class="ad-item__m">No posts yet. Press “+ New”.</span></span></li>'}
    </ol>
  </div>`;
}

function listView() {
  if (isTodo()) return todoListView();
  if (isArr()) return arListView();
  if (isTr()) return trListView();
  if (isTb()) return tbListView();
  if (isNews()) return newsListView();
  const q = S.query.toLowerCase();
  const items = S.projects.map((p, i) => ({ p, i })).filter(({ p }) => !q || (p.title.en + ' ' + p.title.sl + ' ' + p.category).toLowerCase().includes(q));
  return `<div class="ad-list">
    ${tabsView()}
    <div class="ad-list__top">
      <input class="nk-input" id="q" type="search" placeholder="Search ${S.projects.length} projects" value="${esc(S.query)}" aria-label="Search projects">
      <button class="nk-btn nk-btn--sm" type="button" data-act="new">+ New</button>
    </div>
    <ol class="ad-items">${items.map(({ p, i }) => `
      <li class="ad-item${p.slug === S.sel ? ' is-sel' : ''}${p.hidden ? ' is-hidden' : ''}">
        <button type="button" class="ad-item__main" data-sel="${esc(p.slug)}">
          <span class="ad-item__t">${esc(p.title.en || 'Untitled')}</span>
          <span class="ad-item__m">${esc(p.category)} · ${esc(p.year)}${p.model ? ' · <b>3D</b>' : ''}${p.photos.length ? ` · ${p.photos.length} ph` : ''}${p.featured ? ' · ★' : ''}${p.hidden ? ' · hidden' : ''}</span>
        </button>
        <span class="ad-item__ord">
          <button type="button" data-up="${i}" aria-label="Move up" ${i === 0 ? 'disabled' : ''}>↑</button>
          <button type="button" data-down="${i}" aria-label="Move down" ${i === S.projects.length - 1 ? 'disabled' : ''}>↓</button>
        </span>
      </li>`).join('')}
    </ol>
  </div>`;
}

function fld(id, label, control, hint, full) {
  return `<div class="nk-field${full ? ' full' : ''}"><label class="nk-field__label" for="${id}">${label}</label>${control}${hint ? `<span class="nk-field__hint">${hint}</span>` : ''}</div>`;
}
function inp(id, val, attrs = '') { return `<input class="nk-input" id="${id}" data-k="${id}" value="${esc(val)}" ${attrs}>`; }
function area(id, val, rows = 3) { return `<textarea class="nk-input" id="${id}" data-k="${id}" rows="${rows}">${esc(val)}</textarea>`; }

function photosSection(p) {
  return `<fieldset class="ad-sec"><legend class="nk-label">Photos</legend>
      <div class="ad-photos">
        ${p.photos.map((ph, i) => `<figure class="ad-photo">
          <img src="${esc(previewUrl(ph))}" alt="">
          <figcaption>${i === 0 ? '<span class="nk-tag nk-tag--ok">Cover</span>' : `<button type="button" data-cover="${i}">Make cover</button>`}<button type="button" data-rm-photo="${i}" aria-label="Remove photo">Remove</button></figcaption>
        </figure>`).join('')}
        <label class="ad-photo ad-drop" for="photo-in"><span class="sub">+ Photos</span><span class="nk-field__hint">Watermarked, resized to ${MAX_PHOTO_EDGE} px, location data removed</span></label>
        <input type="file" id="photo-in" accept="image/jpeg,image/png,image/webp" multiple hidden>
      </div>
    </fieldset>`;
}

// ---------- To do checklist (what the site still needs: photos, 3D models, Slovenian text …) ----------
// Read-only view over S.projects / S.news (including unpublished edits). Remove: this block, the "To do" tab
// in tabsView(), the isTodo() lines in listView()/editorView(), the two data-todo-* lines in the click
// handler, isTodo and the .td-* rules at the end of admin.css.
const blank = (v) => !String(v ?? '').trim();
const TODO_CHECKS = [
  { id: 'photo', label: 'Photos', kind: 'p', field: 'photo-in', test: (p) => !p.photos.length },
  { id: 'model', label: '3D model', kind: 'p', field: 'model-in', test: (p) => !p.model },
  { id: 'd-en', label: 'Description EN', kind: 'p', field: 'd-en', test: (p) => blank(p.description?.en) },
  { id: 'x-en', label: 'Details EN', kind: 'p', field: 'x-en', test: (p) => blank(p.details?.en) },
  { id: 'mat', label: 'Materials', kind: 'p', field: 'mat', test: (p) => blank(p.materials) },
  { id: 't-sl', label: 'Title SL', kind: 'p', field: 't-sl', test: (p) => blank(p.title?.sl), sl: true },
  { id: 'd-sl', label: 'Description SL', kind: 'p', field: 'd-sl', test: (p) => blank(p.description?.sl), sl: true },
  { id: 'x-sl', label: 'Details SL', kind: 'p', field: 'x-sl', test: (p) => !blank(p.details?.en) && blank(p.details?.sl), sl: true },
  { id: 'n-photo', label: 'Photos', kind: 'n', field: 'photo-in', test: (n) => !n.photos.length },
  { id: 'n-t-sl', label: 'Headline SL', kind: 'n', field: 'n-t-sl', test: (n) => blank(n.title?.sl), sl: true },
  { id: 'n-s-sl', label: 'Summary SL', kind: 'n', field: 'n-s-sl', test: (n) => blank(n.summary?.sl), sl: true },
  { id: 'n-b-en', label: 'Article EN', kind: 'n', field: 'n-b-en', test: (n) => blank(n.body?.en) },
  { id: 'n-b-sl', label: 'Article SL', kind: 'n', field: 'n-b-sl', test: (n) => !blank(n.body?.en) && blank(n.body?.sl), sl: true },
];
const TODO_FILTERS = [['all', 'Everything'], ['sl', 'Slovenian text'], ['photo', 'Photos'], ['model', '3D models'], ['x-en', 'Project details'], ['mat', 'Materials'], ['news', 'News posts']];
function todoMatch(c, f) {
  return f === 'all' || (f === 'sl' && c.sl) || (f === 'news' && c.kind === 'n') || (f === 'photo' && (c.id === 'photo' || c.id === 'n-photo')) || c.id === f;
}
function todoItems(f = 'all') {
  const out = [];
  const add = (kind, list) => list.forEach((x) => TODO_CHECKS.forEach((c) => { if (c.kind === kind && todoMatch(c, f) && c.test(x)) out.push({ kind, x, c }); }));
  add('p', S.projects);
  add('n', sortNews(S.news));
  return out;
}
function todoListView() {
  const f = S.todoF || 'all';
  const total = S.projects.length + S.news.length;
  const done = S.projects.filter((p) => !TODO_CHECKS.some((c) => c.kind === 'p' && c.test(p))).length + S.news.filter((n) => !TODO_CHECKS.some((c) => c.kind === 'n' && c.test(n))).length;
  return `<div class="ad-list">
    ${tabsView()}
    <p class="ad-small td-sum"><b>${done} / ${total}</b> projects and posts have everything.</p>
    <ol class="ad-items" aria-label="Show">${TODO_FILTERS.map(([id, label]) => `
      <li class="ad-item${id === f ? ' is-sel' : ''}">
        <button type="button" class="ad-item__main" data-todo-f="${id}" aria-pressed="${id === f}">
          <span class="ad-item__t">${label}</span>
          <span class="ad-item__m">${todoItems(id).length} missing</span>
        </button>
      </li>`).join('')}
    </ol>
  </div>`;
}
function todoView() {
  const f = S.todoF || 'all';
  const rows = new Map();
  todoItems(f).forEach((it) => {
    const key = it.kind + '|' + it.x.slug;
    if (!rows.has(key)) rows.set(key, { kind: it.kind, x: it.x, cs: [] });
    rows.get(key).cs.push(it.c);
  });
  const label = TODO_FILTERS.find(([id]) => id === f)?.[1] || '';
  const row = ({ kind, x, cs }) => `<li class="td-row">
      <div class="td-row__h">
        <span class="nk-label">${kind === 'n' ? 'News · ' + esc(x.date) : esc(x.category) + ' · ' + esc(x.year)}${x.hidden ? (kind === 'n' ? ' · draft' : ' · hidden') : ''}${x._new ? ' · new' : ''}</span>
        <button type="button" class="td-row__t" data-todo-go="${kind}|${esc(x.slug)}|">${esc(x.title.en || 'Untitled')}</button>
      </div>
      <div class="td-row__miss">${cs.map((c) => `<button type="button" class="td-miss" data-todo-go="${kind}|${esc(x.slug)}|${c.field}" aria-label="Add ${esc(c.label)} to ${esc(x.title.en || x.slug)}">+ ${esc(c.label)}</button>`).join('')}</div>
    </li>`;
  return `<div class="ad-editor">
    <div class="ad-editor__head"><div><p class="nk-label">To do · ${esc(label)}</p><h2 class="sub">What the site still needs</h2></div></div>
    <p class="ad-small">Projects and news posts with something missing, in site order. Click an item to open it with that field ready.
      Slovenian details/article are only listed when the English one exists. Includes your unpublished edits.</p>
    ${rows.size ? `<ol class="td-list">${[...rows.values()].map(row).join('')}</ol>`
      : `<div class="ad-empty"><span class="nk-tag nk-tag--ok">Complete</span><p class="lead">Nothing missing here.</p></div>`}
  </div>`;
}
function todoGo(spec) {
  const [kind, slug, field] = spec.split('|');
  S.tab = kind === 'n' ? 'news' : 'projects';
  if (kind === 'n') S.selNews = slug; else S.sel = slug;
  S.query = ''; S.confirmDelete = false;
  render();
  const el = field && document.getElementById(field);
  const target = !el ? null : el.hidden ? (document.querySelector(`label[for="${field}"]`) || el.closest('fieldset')) : el;
  if (target) {
    target.scrollIntoView({ block: 'center' });
    if (!el.hidden) el.focus({ preventScroll: true });
    else { const fs = target.closest('fieldset') || target; fs.classList.add('td-flash'); setTimeout(() => fs.classList.remove('td-flash'), 1600); target.setAttribute('tabindex', '-1'); target.focus({ preventScroll: true }); }
  }
}

// ---------- Translate (tab "EN ⇄ SL": every English/Slovenian text pair side by side, with checks) ----------
// Lists the title/description/details of each project and the headline/summary/article of each news post, English
// on the left (read-only), Slovenian on the right (editable, same as the field in the editor). Checks each pair: missing
// SL, SL identical to EN, numbers that differ (256 vs 265), very different length, different number of list items or
// paragraphs. "Copy for translation" copies the open texts as blocks ("### p:slug:field" + English) for a translator;
// "Paste translations" fills them back in. Only changes S.projects / S.news in memory; nothing is saved until Publish.
// Remove: this block, the "EN ⇄ SL" tab in tabsView(), the isTr() lines in listView()/editorView(), the data-tr lines
// in the click and input handlers and the "Translate" rules at the end of admin.css.
const isTr = () => S.tab === 'translate';
const TR = { f: 'check', kind: 'all', msg: '', paste: false };
const TR_FIELDS = [
  { kind: 'p', f: 'title', label: 'Title', rows: 1, field: 't-sl' },
  { kind: 'p', f: 'description', label: 'One-line description', rows: 2, field: 'd-sl' },
  { kind: 'p', f: 'details', label: 'Details', rows: 5, field: 'x-sl' },
  { kind: 'n', f: 'title', label: 'Headline', rows: 1, field: 'n-t-sl' },
  { kind: 'n', f: 'summary', label: 'Summary', rows: 3, field: 'n-s-sl' },
  { kind: 'n', f: 'body', label: 'Article', rows: 10, field: 'n-b-sl' },
];
const TR_VIEWS = [['check', 'Needs a look'], ['miss', 'Missing Slovenian'], ['all', 'All texts']];
const TR_KINDS = [['all', 'Projects + news'], ['p', 'Projects'], ['n', 'News']];
// Numbers as written (1,5 = 1.5), ignoring "3D"/"2D"; returned sorted so the order of the sentence doesn't matter.
function trNums(s) { return (String(s).match(/\d+(?:[.,]\d+)?(?![\d]*\s?[dD]\b)/g) || []).map((n) => n.replace(',', '.')).sort(); }
const trListN = (s) => String(s).split('\n').filter((l) => /^\s*(-|\d+[.)])\s+/.test(l)).length;
const trParaN = (s) => String(s).split(/\n{2,}/).filter((b) => b.trim()).length;
function trChecks(en, sl) {
  en = String(en || ''); sl = String(sl || '');
  const out = [], E = en.trim(), L = sl.trim();
  if (!E && !L) return out;
  if (!E) { out.push({ id: 'only', t: 'Only Slovenian — no English text' }); return out; }
  if (!L) { out.push({ id: 'miss', t: 'Slovenian missing — English is shown on /sl/' }); return out; }
  if (E === L && E.split(/\s+/).length > 2) out.push({ id: 'same', t: 'Same as English' });
  const a = trNums(E), b = trNums(L);
  if (a.join('|') !== b.join('|')) {
    const left = (x, y) => { const r = y.slice(); return x.filter((n) => { const i = r.indexOf(n); if (i < 0) return true; r.splice(i, 1); return false; }); };
    const onlyE = left(a, b), onlyL = left(b, a);
    out.push({ id: 'num', t: 'Numbers differ' + (onlyE.length ? ' · EN only: ' + onlyE.join(', ') : '') + (onlyL.length ? ' · SL only: ' + onlyL.join(', ') : '') });
  }
  if (E.length >= 40) {
    const r = L.length / E.length;
    if (r < 0.5) out.push({ id: 'len', t: `Much shorter than English (${Math.round(r * 100)} %)` });
    else if (r > 2) out.push({ id: 'len', t: `Much longer than English (${Math.round(r * 100)} %)` });
  }
  const la = trListN(E), lb = trListN(L);
  if (la !== lb) out.push({ id: 'list', t: `List items: EN ${la} · SL ${lb}` });
  const pa = trParaN(E), pb = trParaN(L);
  if (pa !== pb && la === lb) out.push({ id: 'para', t: `Paragraphs: EN ${pa} · SL ${pb}` });
  return out;
}
function trItems() { // every non-empty pair, in site order
  const out = [];
  const add = (kind, list) => list.forEach((x) => TR_FIELDS.filter((d) => d.kind === kind).forEach((d) => {
    const v = x[d.f] || {}, en = v.en || '', sl = v.sl || '';
    if (!String(en).trim() && !String(sl).trim()) return;
    out.push({ kind, x, d, key: `${kind}:${x.slug}:${d.f}`, en, sl, cs: trChecks(en, sl) });
  }));
  add('p', S.projects);
  add('n', sortNews(S.news));
  return out;
}
function trShown(items) {
  return items.filter((it) => (TR.kind === 'all' || it.kind === TR.kind) &&
    (TR.f === 'all' || (TR.f === 'miss' ? it.cs.some((c) => c.id === 'miss') : it.cs.length)));
}
const trCount = () => trItems().filter((it) => it.cs.length).length;
function trListView() {
  const items = trItems(), done = items.filter((it) => it.sl.trim()).length;
  const n = (f, k) => items.filter((it) => (k === 'all' || it.kind === k) && (f === 'all' || (f === 'miss' ? it.cs.some((c) => c.id === 'miss') : it.cs.length))).length;
  const pct = items.length ? Math.round(done / items.length * 100) : 100;
  return `<div class="ad-list">
    ${tabsView()}
    <div class="td-sum tr-sum"><p class="ad-small"><b>${done} / ${items.length}</b> texts have Slovenian · ${items.filter((it) => it.cs.length).length} to look at</p>
      <div class="tr-meter" role="img" aria-label="${pct} % translated"><span style="width:${pct}%"></span></div></div>
    <div class="ad-items tr-filters">
      <p class="nk-label tr-fl">Show</p>
      ${TR_VIEWS.map(([id, label]) => `<div class="ad-item${id === TR.f ? ' is-sel' : ''}"><button type="button" class="ad-item__main" data-tr-f="${id}" aria-pressed="${id === TR.f}"><span class="ad-item__t">${label}</span><span class="ad-item__m">${n(id, TR.kind)} text${n(id, TR.kind) === 1 ? "" : "s"}</span></button></div>`).join('')}
      <p class="nk-label tr-fl">In</p>
      ${TR_KINDS.map(([id, label]) => `<div class="ad-item${id === TR.kind ? ' is-sel' : ''}"><button type="button" class="ad-item__main" data-tr-k="${id}" aria-pressed="${id === TR.kind}"><span class="ad-item__t">${label}</span><span class="ad-item__m">${n(TR.f, id)} text${n(TR.f, id) === 1 ? "" : "s"}</span></button></div>`).join('')}
    </div>
  </div>`;
}
function trChips(cs) {
  return cs.length ? cs.map((c) => `<span class="tr-chip tr-chip--${c.id}">${esc(c.t)}</span>`).join('') : '<span class="tr-chip tr-chip--ok">OK</span>';
}
function trRow(it) {
  const id = 'tr-' + it.key.replace(/[^a-z0-9]+/gi, '-');
  const name = it.x.title?.en || it.x.slug;
  return `<li class="tr-row${it.cs.length ? ' is-flag' : ''}" data-tr-row="${esc(it.key)}">
    <div class="tr-row__h">
      <span class="nk-label">${it.kind === 'n' ? 'News · ' + esc(it.x.date) : esc(it.x.category) + ' · ' + esc(it.x.year)} · ${esc(it.d.label)}</span>
      <button type="button" class="td-row__t" data-todo-go="${it.kind}|${esc(it.x.slug)}|${it.d.field}" title="Open in the editor">${esc(name)}</button>
    </div>
    <div class="tr-pair">
      <div class="tr-col"><span class="tr-lang" id="${id}-en-l">EN</span><div class="tr-en" aria-labelledby="${id}-en-l">${esc(it.en) || '<em>—</em>'}</div></div>
      <div class="tr-col"><label class="tr-lang" for="${id}">SL <span class="vh">${esc(it.d.label)} · ${esc(name)}</span></label>
        <textarea class="nk-input tr-sl" id="${id}" data-tr="${esc(it.key)}" rows="${Math.max(it.d.rows, Math.min(14, Math.ceil(String(it.en).length / 70) + String(it.en).split('\n').length - 1))}" lang="sl" spellcheck="true">${esc(it.sl)}</textarea></div>
    </div>
    <div class="tr-chips" id="${id}-c" aria-live="polite">${trChips(it.cs)}</div>
  </li>`;
}
function trView() {
  const items = trShown(trItems());
  const open = trItems().filter((it) => !it.sl.trim() && it.en.trim());
  return `<div class="ad-editor">
    <div class="ad-editor__head"><div><p class="nk-label">EN ⇄ SL · ${esc(TR_VIEWS.find(([i]) => i === TR.f)[1])} · ${esc(TR_KINDS.find(([i]) => i === TR.kind)[1])}</p><h2 class="sub">Translation workspace</h2></div>
      <div class="tr-tools">
        <button type="button" class="nk-btn nk-btn--sm" data-tr-next ${items.some((it) => it.cs.length) ? '' : 'disabled'}>Next to check ↓</button>
        <button type="button" class="nk-btn nk-btn--sm" data-tr-copy ${open.length ? '' : 'disabled'}>Copy ${open.length} for translation</button>
        <button type="button" class="nk-btn nk-btn--sm nk-btn--ghost" data-tr-paste aria-expanded="${TR.paste}">Paste translations</button>
      </div></div>
    <p class="ad-small">English on the left, Slovenian on the right — type in the right column, it is the same field as in the editor. The checks
      look for missing text, Slovenian identical to English, numbers that differ, very different length and a different number of list items or
      paragraphs. Nothing is saved until you press Publish.</p>
    <p class="ad-small tr-msg" role="status" aria-live="polite">${esc(TR.msg)}</p>
    ${TR.paste ? `<div class="ad-sec tr-paste">
      <label class="nk-label" for="tr-in">Paste translations</label>
      <p class="ad-small">Paste the text you got back. Each block starts with its “### p:slug:field” line, exactly as copied; the text under it becomes the Slovenian version.</p>
      <textarea class="nk-input" id="tr-in" rows="8" lang="sl" spellcheck="false"></textarea>
      <div class="tr-tools"><button type="button" class="nk-btn nk-btn--sm nk-btn--primary" data-tr-apply>Fill in</button><button type="button" class="nk-btn nk-btn--sm nk-btn--ghost" data-tr-paste>Cancel</button></div>
    </div>` : ''}
    ${items.length ? `<ol class="tr-list">${items.map(trRow).join('')}</ol>`
      : `<div class="ad-empty"><span class="nk-tag nk-tag--ok">Complete</span><p class="lead">${TR.f === 'all' ? 'No texts here yet.' : 'Every text here has a Slovenian version that passes the checks.'}</p></div>`}
  </div>`;
}
function trFind(key) {
  const [kind, slug, f] = key.split(':');
  const x = (kind === 'n' ? S.news : S.projects).find((y) => y.slug === slug);
  return x && TR_FIELDS.some((d) => d.kind === kind && d.f === f) ? { x, f } : null;
}
function trInput(el) {
  const r = trFind(el.dataset.tr); if (!r) return;
  (r.x[r.f] ||= { en: '', sl: '' }).sl = el.value;
  const v = r.x[r.f], cs = trChecks(v.en, v.sl);
  const box = document.getElementById(el.id + '-c'); if (box) box.innerHTML = trChips(cs);
  el.closest('.tr-row')?.classList.toggle('is-flag', cs.length > 0);
  const list = root.querySelector('.ad-list'); if (list) list.outerHTML = trListView();
  const tab = root.querySelector('[data-tab="translate"] span'); if (tab) tab.textContent = trCount();
  const open = trItems().filter((it) => !it.sl.trim() && it.en.trim()).length, cp = root.querySelector('[data-tr-copy]');
  if (cp) { cp.textContent = `Copy ${open} for translation`; cp.disabled = !open; }
  const nx = root.querySelector('[data-tr-next]'); if (nx) nx.disabled = !root.querySelector('.tr-row.is-flag');
  S.notice = '';
  updatePublish();
}
function trNext() {
  const all = [...root.querySelectorAll('.tr-row.is-flag .tr-sl')];
  if (!all.length) { TR.msg = 'Nothing left to check here.'; root.querySelector('.tr-msg').textContent = TR.msg; return; }
  const curI = all.indexOf(document.activeElement);
  const el = all[(curI + 1) % all.length];
  el.scrollIntoView({ block: 'center' }); el.focus({ preventScroll: true });
}
async function trCopy() {
  const open = trItems().filter((it) => !it.sl.trim() && it.en.trim());
  const text = 'Translate each block into Slovenian. Keep every “###” line unchanged, keep numbers, units, names and the “- ” list lines.\n\n' +
    open.map((it) => `### ${it.key}\n${String(it.en).trim()}`).join('\n\n') + '\n';
  try { await navigator.clipboard.writeText(text); TR.msg = `Copied ${open.length} English text${open.length === 1 ? '' : 's'}. Paste the translation back with “Paste translations”.`; }
  catch { TR.msg = 'Could not copy to the clipboard in this browser.'; }
  root.querySelector('.tr-msg').textContent = TR.msg;
}
function trApply() {
  const src = document.getElementById('tr-in')?.value || '';
  const blocks = src.split(/^###[ \t]*/m).slice(1);
  let filled = 0, replaced = 0; const bad = [];
  blocks.forEach((b) => {
    const nl = b.indexOf('\n'), key = (nl < 0 ? b : b.slice(0, nl)).trim(), text = nl < 0 ? '' : b.slice(nl + 1).replace(/\s+$/, '').replace(/^\n+/, '');
    const r = trFind(key);
    if (!r || !text) { bad.push(key || '(empty)'); return; }
    const v = (r.x[r.f] ||= { en: '', sl: '' });
    if (String(v.sl || '').trim() && v.sl !== text) replaced++;
    v.sl = text; filled++;
  });
  TR.msg = !blocks.length ? 'No “### p:slug:field” lines found — paste the text exactly as it came back.'
    : `Filled in ${filled} text${filled === 1 ? '' : 's'}${replaced ? ` (${replaced} replaced an existing Slovenian text)` : ''}${bad.length ? ` · not used: ${bad.slice(0, 4).join(', ')}${bad.length > 4 ? '…' : ''}` : ''}. Check them below, then Publish.`;
  if (filled) { TR.paste = false; TR.f = 'all'; }
  render();
  document.querySelector(filled ? '.tr-msg' : '#tr-in')?.focus?.();
}
function trAct(b) {
  if (b.dataset.trF != null) { TR.f = b.dataset.trF; TR.msg = ''; render(); document.querySelector(`[data-tr-f="${TR.f}"]`)?.focus(); return; }
  if (b.dataset.trK != null) { TR.kind = b.dataset.trK; TR.msg = ''; render(); document.querySelector(`[data-tr-k="${TR.kind}"]`)?.focus(); return; }
  if (b.dataset.trNext != null) { trNext(); return; }
  if (b.dataset.trCopy != null) { trCopy(); return; }
  if (b.dataset.trPaste != null) { TR.paste = !TR.paste; TR.msg = ''; render(); (TR.paste ? document.getElementById('tr-in') : document.querySelector('[data-tr-paste]'))?.focus(); return; }
  if (b.dataset.trApply != null) { trApply(); }
}

// ---------- Arrange (tab "Arrange": the order of the projects as one board, with the home page and sheet numbers) ----------
// Drag a project by its ⠿ handle (mouse or touch), or focus the handle and use ↑ ↓ / PgUp PgDn / Home End, or type a
// position. Shows what the site derives from the order: the sheet numbers (NK-YY-NN, counted over visible projects, as
// sheetNo() in app.js) and the home page (hero + the first four ★ featured, as featured() in app.js). Only reorders
// S.projects and toggles ★; nothing is saved until Publish. Remove: this block, the "Arrange" tab in tabsView(), the
// isArr() lines in listView()/editorView(), the data-ar line in the click handler, the data-ar-pos line in the change
// handler and the "Arrange" rules at the end of admin.css.
const isArr = () => S.tab === 'arrange';
const AR = { undo: [], drag: null };
const AR_SORTS = [['year', 'Newest first'], ['feat', 'Featured first'], ['cat', 'By category'], ['pub', 'Published order']];
const arVisible = (list) => list.filter((p) => !p.hidden);
function arSheet(list, p) { // same rule as sheetNo() in app.js
  const v = arVisible(list), i = v.indexOf(p);
  return i < 0 ? '' : 'NK-' + String(p.year).slice(2) + '-' + String(i + 1).padStart(2, '0');
}
function arHome(list) { // same rule as featured() in app.js
  const v = arVisible(list), f = v.filter((p) => p.featured);
  return (f.length ? f : v).slice(0, 4);
}
function arSaved() { try { return JSON.parse(S.savedJson || '[]'); } catch { return []; } }
function arWas() { // slug -> published sheet number
  const saved = arSaved(), m = new Map();
  saved.forEach((p) => m.set(p.slug, arSheet(saved, p)));
  return m;
}
function arOrderChanged() {
  const a = arSaved().map((p) => p.slug).join('|');
  return a !== S.projects.filter((p) => !p._new).map((p) => p.slug).join('|');
}
let arLive = null;
function arSay(msg) {
  if (!arLive) { arLive = document.createElement('p'); arLive.className = 'ar-live'; arLive.setAttribute('aria-live', 'polite'); document.body.appendChild(arLive); }
  arLive.textContent = ''; setTimeout(() => { arLive.textContent = msg; }, 30);
}
function arPush() { AR.undo.push(S.projects.map((p) => p.slug)); if (AR.undo.length > 50) AR.undo.shift(); }
function arApply(slugs) {
  const by = new Map(S.projects.map((p) => [p.slug, p]));
  const out = slugs.map((s) => by.get(s)).filter(Boolean);
  S.projects.forEach((p) => { if (!out.includes(p)) out.unshift(p); }); // anything added since keeps its place on top
  S.projects = out;
}
function arMove(from, to) {
  const n = S.projects.length;
  to = Math.max(0, Math.min(n - 1, to));
  if (from === to || from < 0) return false;
  arPush();
  const [p] = S.projects.splice(from, 1);
  S.projects.splice(to, 0, p);
  const no = arSheet(S.projects, p);
  arSay(`${p.title.en || p.slug}: position ${to + 1} of ${n}${no ? ', sheet ' + no : ''}.`);
  return true;
}
function arFocus(id) {
  const el = document.getElementById(id);
  if (el) { el.focus({ preventScroll: true }); el.scrollIntoView({ block: 'nearest' }); }
}
function arSort(kind) {
  arPush();
  const idx = new Map(S.projects.map((p, i) => [p, i]));
  const stable = (cmp) => S.projects.slice().sort((a, b) => cmp(a, b) || idx.get(a) - idx.get(b));
  if (kind === 'year') S.projects = stable((a, b) => (parseInt(b.year, 10) || 0) - (parseInt(a.year, 10) || 0));
  if (kind === 'feat') S.projects = stable((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
  if (kind === 'cat') S.projects = stable((a, b) => { const x = CATEGORIES.indexOf(a.category), y = CATEGORIES.indexOf(b.category); return (x < 0 ? 99 : x) - (y < 0 ? 99 : y); });
  if (kind === 'pub') arApply(arSaved().map((p) => p.slug));
  arSay(`Sorted: ${AR_SORTS.find(([k]) => k === kind)[1].toLowerCase()}.`);
}
function arThumb(p) {
  if (p.photos && p.photos.length) return `<img src="${esc(previewUrl(p.photos[0]))}" alt="">`;
  const d = p.drawing || { CAD: 'cad', Mechanical: 'mech', IoT: 'iot', Embedded: 'embedded' }[p.category] || 'cad';
  return (window.NK_DRAWINGS || {})[d] || (window.NK_DRAWINGS || {}).cad || '';
}
function arListView() {
  const home = arHome(S.projects), feat = arVisible(S.projects).filter((p) => p.featured);
  const was = arWas(), moved = S.projects.filter((p) => !p.hidden && was.get(p.slug) && was.get(p.slug) !== arSheet(S.projects, p)).length;
  return `<div class="ad-list">
    ${tabsView()}
    <div class="ar-side">
      <section class="ar-box" aria-labelledby="ar-home-h">
        <p class="nk-label" id="ar-home-h">Home page · after publishing</p>
        ${home.length ? `<ol class="ar-home">${home.map((p, i) => `<li><span class="nk-label">${i === 0 ? '1 · hero' : i + 1}</span><span class="ar-home__t">${esc(p.title.en || 'Untitled')}</span><span class="nk-label">${esc(arSheet(S.projects, p))}</span></li>`).join('')}</ol>`
          : '<p class="ad-small">No visible projects.</p>'}
        <p class="ad-small">${feat.length ? `${feat.length} ★ featured — the first four in this order are on the home page.` : 'Nothing is ★ featured, so the home page shows the first four projects.'}</p>
      </section>
      <section class="ar-box" aria-labelledby="ar-sort-h">
        <p class="nk-label" id="ar-sort-h">Sort all</p>
        <div class="ar-tools">${AR_SORTS.map(([k, l]) => `<button type="button" class="nk-btn nk-btn--sm nk-btn--ghost" data-ar="sort:${k}">${l}</button>`).join('')}</div>
        <button type="button" class="nk-btn nk-btn--sm" data-ar="undo" ${AR.undo.length ? '' : 'disabled'}>↶ Undo${AR.undo.length ? ` (${AR.undo.length})` : ''}</button>
      </section>
      <p class="ad-small ar-sum">${arOrderChanged() ? `<b>Order changed.</b> ${moved ? `${moved} sheet number${moved > 1 ? 's' : ''} will change.` : 'Sheet numbers stay the same.'} Press Publish to put it on the site.` : 'Same order as on the site.'}</p>
    </div>
  </div>`;
}
function arView() {
  const n = S.projects.length, home = arHome(S.projects), was = arWas();
  const card = (p, i) => {
    const no = arSheet(S.projects, p), old = was.get(p.slug), h = home.indexOf(p);
    const t = esc(p.title.en || 'Untitled');
    const flags = [
      h === 0 ? '<span class="nk-tag nk-tag--ok">Home · hero</span>' : h > 0 ? `<span class="nk-tag nk-tag--ok">Home · ${h + 1}</span>` : '',
      p.featured && !p.hidden && h < 0 ? '<span class="nk-tag" title="Only the first four featured projects are on the home page">★ not on home</span>' : '',
      p.hidden ? '<span class="nk-tag">Hidden · no sheet</span>' : '',
      p._new ? '<span class="nk-tag nk-tag--rev">New</span>' : '',
    ].join('');
    return `<li class="ar-card${p.hidden ? ' is-hidden' : ''}" data-slug="${esc(p.slug)}">
      <button type="button" class="ar-handle" id="ar-h-${esc(p.slug)}" data-ar-h="${i}" aria-describedby="ar-help"
        aria-label="Move ${t}, position ${i + 1} of ${n}">⠿</button>
      <span class="ar-pos nk-label">${String(i + 1).padStart(2, '0')}</span>
      <span class="nk-sheet__art ar-thumb" aria-hidden="true">${arThumb(p)}</span>
      <span class="ar-main">
        <span class="ar-no nk-label">${no ? esc(no) : '—'}${old && no && old !== no ? ` <s>${esc(old)}</s>` : ''}</span>
        <button type="button" class="ar-t" data-ar="open:${esc(p.slug)}" title="Open in the editor">${t}</button>
        <span class="ar-sl">${esc(p.title.sl || '— no Slovenian title')}</span>
        <span class="ar-m nk-label">${esc(p.category)} · ${esc(p.year)}${p.photos.length ? ' · photo' : ''}${p.model ? ' · 3D' : ''}</span>
        ${flags ? `<span class="ar-flags">${flags}</span>` : ''}
      </span>
      <span class="ar-ctl">
        <button type="button" class="ar-star" id="ar-f-${esc(p.slug)}" data-ar="feat:${esc(p.slug)}" aria-pressed="${!!p.featured}" title="Featured on the home page">${p.featured ? '★' : '☆'}<span class="ar-vh"> Featured: ${t}</span></button>
        <button type="button" class="ar-btn" id="ar-t-${esc(p.slug)}" data-ar="top:${i}" ${i === 0 ? 'disabled' : ''} aria-label="Move ${t} to the top">⤒</button>
        <button type="button" class="ar-btn" id="ar-b-${esc(p.slug)}" data-ar="bottom:${i}" ${i === n - 1 ? 'disabled' : ''} aria-label="Move ${t} to the bottom">⤓</button>
        <input class="nk-input ar-in" id="ar-p-${esc(p.slug)}" data-ar-pos="${i}" type="number" inputmode="numeric" min="1" max="${n}" value="${i + 1}" aria-label="Position of ${t} (1 to ${n})">
      </span>
    </li>`;
  };
  return `<div class="ad-editor">
    <div class="ad-editor__head"><div><p class="nk-label">Arrange · ${n} projects</p><h2 class="sub">Order on the site</h2></div></div>
    <p class="ad-small" id="ar-help">Drag a project by its ⠿ handle, or focus the handle and use ↑ ↓ (PgUp / PgDn = 5 places, Home / End = top / bottom),
      or type a position. This order is the order on #work, it sets the sheet numbers (NK-YY-NN, crossed out = the number on the site now)
      and which ★ featured projects reach the home page. Project links use the URL name, so they keep working. Nothing changes on the site until you press Publish.</p>
    <ol class="ar-board" aria-label="Projects in site order">${S.projects.map(card).join('')}</ol>
  </div>`;
}
function arAct(b) {
  const [cmd, arg] = b.dataset.ar.split(/:(.*)/s);
  if (cmd === 'sort') { arSort(arg); render(); return; }
  if (cmd === 'undo') { const prev = AR.undo.pop(); if (prev) { arApply(prev); arSay('Undone.'); } render(); if (!AR.undo.length) arFocus('ar-h-' + (S.projects[0]?.slug || '')); return; }
  if (cmd === 'open') { S.tab = 'projects'; S.sel = arg; S.query = ''; render(); document.getElementById('t-en')?.focus(); return; }
  if (cmd === 'feat') {
    const p = S.projects.find((x) => x.slug === arg);
    if (p) { p.featured = !p.featured; arSay(`${p.title.en || p.slug}: ${p.featured ? 'featured' : 'not featured'}.`); render(); }
    return;
  }
  const i = +arg, p = S.projects[i];
  if ((cmd === 'top' || cmd === 'bottom') && p && arMove(i, cmd === 'top' ? 0 : S.projects.length - 1)) { render(); arFocus('ar-h-' + p.slug); }
}
function arPos(input) {
  if (input.dataset.done) return; // Enter already handled it (the change event follows when the field is replaced)
  input.dataset.done = '1';
  const i = +input.dataset.arPos, p = S.projects[i], to = parseInt(input.value, 10) - 1;
  if (!p) return;
  if (Number.isFinite(to) && arMove(i, to)) { render(); arFocus('ar-p-' + p.slug); document.getElementById('ar-p-' + p.slug)?.select(); }
  else { input.value = i + 1; delete input.dataset.done; }
}
root.addEventListener('keydown', (e) => {
  if (isTb() && tbKey(e)) return;
  if (!isArr()) return;
  if (e.target.dataset.arPos != null && e.key === 'Enter') { e.preventDefault(); arPos(e.target); return; }
  const h = e.target.closest('[data-ar-h]');
  if (!h || e.altKey || e.ctrlKey || e.metaKey) return;
  const i = +h.dataset.arH, n = S.projects.length;
  const to = { ArrowUp: i - 1, ArrowDown: i + 1, PageUp: i - 5, PageDown: i + 5, Home: 0, End: n - 1 }[e.key];
  if (to == null) return;
  e.preventDefault();
  const p = S.projects[i];
  if (arMove(i, to)) { render(); arFocus('ar-h-' + p.slug); }
});
root.addEventListener('pointerdown', (e) => {
  const h = isArr() && e.target.closest('[data-ar-h]');
  if (!h || e.button > 0) return;
  e.preventDefault();
  const li = h.closest('.ar-card');
  try { h.setPointerCapture(e.pointerId); } catch {}
  AR.drag = { li, h, ol: li.parentElement, id: e.pointerId, y: e.clientY, moved: false, from: +h.dataset.arH, timer: 0 };
  li.classList.add('is-drag');
});
function arDragTo(y) {
  const d = AR.drag, li = d.li;
  let before = null;
  for (const s of d.ol.children) {
    if (s === li) continue;
    const r = s.getBoundingClientRect();
    if (y < r.top + r.height / 2) { before = s; break; }
  }
  if (li.nextElementSibling !== before) { d.ol.insertBefore(li, before); try { d.h.setPointerCapture(d.id); } catch {} } // moving the node drops the capture
}
window.addEventListener('pointermove', (e) => {
  const d = AR.drag;
  if (!d || e.pointerId !== d.id) return;
  if (!d.moved && Math.abs(e.clientY - d.y) < 4) return;
  d.moved = true; d.y = e.clientY;
  arDragTo(e.clientY);
  clearInterval(d.timer);
  const edge = 64, v = e.clientY < edge ? -14 : e.clientY > window.innerHeight - edge ? 14 : 0;
  if (v) d.timer = setInterval(() => { window.scrollBy(0, v); if (AR.drag) arDragTo(AR.drag.y); }, 16);
});
function arDrop(e) {
  const d = AR.drag;
  if (!d || e.pointerId !== d.id) return;
  clearInterval(d.timer);
  AR.drag = null;
  d.li.classList.remove('is-drag');
  const to = [...d.ol.children].indexOf(d.li), p = S.projects[d.from];
  if (e.type === 'pointercancel' || !d.moved || !p) { render(); return; }
  arMove(d.from, to);
  render(); arFocus('ar-h-' + p.slug);
}
window.addEventListener('pointerup', arDrop);
window.addEventListener('pointercancel', arDrop);

// ---------- Table (tab "Table": every project as one row of a spreadsheet, with bulk edit and Excel copy/paste) ----------
// Category, year, materials, ★ featured and hidden of all projects in one grid, in site order. Edit a cell directly
// (Enter / Shift+Enter = next / previous row, ↑ ↓ in the materials column), tick rows and change them together, or copy the
// table to Excel and paste it back (rows are matched by URL name; an empty cell changes nothing). Cells that differ from the
// site are marked; ↶ Undo reverts the last bulk change or paste. Only changes S.projects in memory; nothing is saved until
// Publish. Added 2026-10-29. Remove: this block, the "Table" tab in tabsView(), the isTb() lines in listView()/editorView(),
// the data-tb lines in the click, input, change and keydown handlers and the "Table" rules at the end of admin.css.
const isTb = () => S.tab === 'table';
const TB = { f: 'all', sel: new Set(), undo: [], msg: '', paste: false, last: null, bulk: { cat: '', year: '', mat: '', matMode: 'set' } };
const TB_COLS = [['category', 'Category'], ['year', 'Year'], ['materials', 'Materials'], ['featured', 'Featured'], ['hidden', 'Hidden']];
const TB_YES = /^(yes|y|da|true|1|x|★)$/i, TB_NO = /^(no|n|ne|false|0|-|☆)$/i;
function tbSavedMap() { const m = new Map(); arSaved().forEach((p) => m.set(p.slug, p)); return m; }
const tbVal = (p, f) => f === 'featured' || f === 'hidden' ? !!p[f] : f === 'year' ? String(p.year ?? '') : String(p[f] ?? '');
function tbChanged(p, f, saved) { const o = saved.get(p.slug); return o ? tbVal(o, f) !== tbVal(p, f) : !!p._new; }
function tbSet(p, f, v, saved) { // keeps projects.json clean: a false flag the file never had is removed again, not written
  if (f === 'featured' || f === 'hidden') { const o = saved.get(p.slug); if (v) p[f] = true; else if (o && !(f in o)) delete p[f]; else p[f] = false; }
  else if (f === 'year') p.year = /^\d+$/.test(String(v).trim()) ? parseInt(v, 10) : v;
  else p[f] = v;
}
const TB_VIEWS = [['all', 'All projects', () => true], ['nomat', 'Materials empty', (p) => !String(p.materials || '').trim()],
  ['feat', '★ Featured', (p) => !!p.featured], ['hid', 'Hidden', (p) => !!p.hidden], ['chg', 'Changed, not published', (p, s) => TB_COLS.some(([f]) => tbChanged(p, f, s))]]
  .concat(CATEGORIES.map((c) => ['c:' + c, c, (p) => p.category === c]));
function tbShown() { const s = tbSavedMap(), v = TB_VIEWS.find(([k]) => k === TB.f) || TB_VIEWS[0]; return S.projects.filter((p) => v[2](p, s)); }
function tbSummary() {
  const s = tbSavedMap(); let vals = 0, rows = 0;
  S.projects.forEach((p) => { const n = TB_COLS.filter(([f]) => tbChanged(p, f, s)).length; vals += n; if (n) rows++; });
  return { vals, rows };
}
function tbListView() {
  const s = tbSavedMap(), sum = tbSummary(), noMat = S.projects.filter((p) => !String(p.materials || '').trim()).length;
  const item = ([id, label, fn]) => { const n = S.projects.filter((p) => fn(p, s)).length;
    return `<div class="ad-item${id === TB.f ? ' is-sel' : ''}"><button type="button" class="ad-item__main" data-tb-f="${esc(id)}" aria-pressed="${id === TB.f}"><span class="ad-item__t">${esc(label)}</span><span class="ad-item__m">${n} project${n === 1 ? '' : 's'}</span></button></div>`; };
  return `<div class="ad-list">
    ${tabsView()}
    <div class="td-sum tb-sum"><p class="ad-small" id="tb-sum"><b>${S.projects.length}</b> projects · <b>${noMat}</b> without materials${sum.vals ? ` · <b>${sum.vals}</b> value${sum.vals === 1 ? '' : 's'} changed in ${sum.rows} project${sum.rows === 1 ? '' : 's'}` : ''}</p></div>
    <div class="ad-items tr-filters">
      <p class="nk-label tr-fl">Show</p>${TB_VIEWS.slice(0, 5).map(item).join('')}
      <p class="nk-label tr-fl">Category</p>${TB_VIEWS.slice(5).map(item).join('')}
    </div>
  </div>`;
}
function tbCell(p, f, s, i) {
  const id = `tb-${f}-${p.slug}`, chg = tbChanged(p, f, s), o = s.get(p.slug), t = esc(p.title.en || p.slug);
  const was = chg && o ? ` title="On the site: ${esc(f === 'featured' || f === 'hidden' ? (o[f] ? 'yes' : 'no') : tbVal(o, f) || '(empty)')}"` : '';
  const a = `id="${id}" data-tb="${esc(p.slug)}|${f}" data-tb-r="${i}"`;
  let c;
  if (f === 'category') c = `<select class="nk-input tb-in" ${a} aria-label="Category · ${t}">${CATEGORIES.concat(CATEGORIES.includes(p.category) ? [] : [p.category]).map((x) => `<option${x === p.category ? ' selected' : ''}>${esc(x)}</option>`).join('')}</select>`;
  else if (f === 'year') c = `<input class="nk-input tb-in tb-in--year" ${a} type="number" inputmode="numeric" min="1990" max="2100" value="${esc(p.year)}" aria-label="Year · ${t}"${+p.year >= 1990 && +p.year <= 2100 ? '' : ' aria-invalid="true"'}>`;
  else if (f === 'materials') c = `<input class="nk-input tb-in tb-in--mat" ${a} value="${esc(p.materials || '')}" placeholder="—" aria-label="Materials · ${t}" autocomplete="off">`;
  else c = `<input type="checkbox" class="tb-chk" ${a} ${p[f] ? 'checked' : ''} aria-label="${f === 'featured' ? 'Featured on home page' : 'Hidden from the site'} · ${t}">`;
  return `<td class="tb-c tb-c--${f}${chg ? ' is-chg' : ''}"${was}>${c}</td>`;
}
function tbRow(p, i, s, nos) {
  const t = esc(p.title.en || 'Untitled'), on = TB.sel.has(p.slug);
  return `<tr class="${on ? 'is-on' : ''}${p.hidden ? ' is-hidden' : ''}" data-tb-row="${esc(p.slug)}">
    <td class="tb-c tb-c--sel"><input type="checkbox" class="tb-chk" id="tb-s-${esc(p.slug)}" data-tb-sel="${esc(p.slug)}" ${on ? 'checked' : ''} aria-label="Select ${t}"></td>
    <th scope="row" class="tb-c tb-c--name"><span class="nk-label">${esc(nos.get(p) || '—')}</span><button type="button" class="ar-t" data-tb-open="${esc(p.slug)}" title="Open in the editor">${t}</button></th>
    ${TB_COLS.map(([f]) => tbCell(p, f, s, i)).join('')}
  </tr>`;
}
function tbView() {
  const rows = tbShown(), s = tbSavedMap(), nos = new Map(S.projects.map((p) => [p, arSheet(S.projects, p)]));
  const nSel = rows.filter((p) => TB.sel.has(p.slug)).length, all = rows.length && nSel === rows.length, b = TB.bulk, dis = nSel ? '' : 'disabled';
  const label = (TB_VIEWS.find(([k]) => k === TB.f) || TB_VIEWS[0])[1];
  return `<div class="ad-editor">
    <div class="ad-editor__head"><div><p class="nk-label">Table · ${esc(label)} · ${rows.length} of ${S.projects.length}</p><h2 class="sub">All projects at once</h2></div>
      <div class="tr-tools">
        <button type="button" class="nk-btn nk-btn--sm" data-tb-copy ${rows.length ? '' : 'disabled'}>Copy ${rows.length} for Excel</button>
        <button type="button" class="nk-btn nk-btn--sm nk-btn--ghost" data-tb-paste aria-expanded="${TB.paste}">Paste from Excel</button>
        <button type="button" class="nk-btn nk-btn--sm" data-tb-undo ${TB.undo.length ? '' : 'disabled'}>↶ Undo${TB.undo.length ? ` (${TB.undo.length})` : ''}</button>
      </div></div>
    <p class="ad-small">Type straight into the cells — Enter / Shift+Enter moves down / up the column. Tick rows (Shift+click ticks a range) to change them
      together below. A red mark means the cell differs from the site (hover it to see the published value). Nothing changes on the site until you press Publish.</p>
    <p class="ad-small tr-msg" id="tb-msg" role="status" aria-live="polite">${esc(TB.msg)}</p>
    ${TB.paste ? `<div class="ad-sec tr-paste">
      <label class="nk-label" for="tb-in">Paste from Excel</label>
      <p class="ad-small">Paste rows copied from Excel or Google Sheets, with the header row. The “URL name” column finds the project; Category, Year,
        Materials, Featured (yes / no) and Hidden (yes / no) are filled in. Other columns and empty cells change nothing.</p>
      <textarea class="nk-input" id="tb-in" rows="8" spellcheck="false"></textarea>
      <div class="tr-tools"><button type="button" class="nk-btn nk-btn--sm nk-btn--primary" data-tb-apply>Fill in</button><button type="button" class="nk-btn nk-btn--sm nk-btn--ghost" data-tb-paste>Cancel</button></div>
    </div>` : ''}
    <fieldset class="ad-sec tb-bulk" ${dis}><legend class="nk-label">Change ${nSel ? `the ${nSel} ticked project${nSel === 1 ? '' : 's'}` : 'ticked projects · tick rows first'}</legend>
      <div class="tb-bulk__row">
        <label class="tb-b"><span class="nk-label">Category</span><select class="nk-input" id="tb-b-cat" data-tb-b="cat"><option value="">—</option>${CATEGORIES.map((c) => `<option${c === b.cat ? ' selected' : ''}>${c}</option>`).join('')}</select></label>
        <button type="button" class="nk-btn nk-btn--sm" data-tb-do="cat">Set</button>
        <label class="tb-b"><span class="nk-label">Year</span><input class="nk-input tb-in--year" id="tb-b-year" data-tb-b="year" type="number" inputmode="numeric" min="1990" max="2100" value="${esc(b.year)}"></label>
        <button type="button" class="nk-btn nk-btn--sm" data-tb-do="year">Set</button>
      </div>
      <div class="tb-bulk__row">
        <label class="tb-b tb-b--mat"><span class="nk-label">Materials</span><input class="nk-input" id="tb-b-mat" data-tb-b="mat" value="${esc(b.mat)}" placeholder="PETG · 0.2 mm" autocomplete="off"></label>
        <span class="tb-seg" role="group" aria-label="How to use the materials text"><button type="button" data-tb-mode="set" aria-pressed="${b.matMode === 'set'}">Replace</button><button type="button" data-tb-mode="add" aria-pressed="${b.matMode === 'add'}">Add to the end</button></span>
        <button type="button" class="nk-btn nk-btn--sm" data-tb-do="mat">Set</button>
      </div>
      <div class="tb-bulk__row">
        <button type="button" class="nk-btn nk-btn--sm nk-btn--ghost" data-tb-do="feat1">★ Feature</button>
        <button type="button" class="nk-btn nk-btn--sm nk-btn--ghost" data-tb-do="feat0">☆ Unfeature</button>
        <button type="button" class="nk-btn nk-btn--sm nk-btn--ghost" data-tb-do="hid1">Hide</button>
        <button type="button" class="nk-btn nk-btn--sm nk-btn--ghost" data-tb-do="hid0">Show</button>
        <button type="button" class="nk-btn nk-btn--sm nk-btn--ghost tb-none" data-tb-none>Untick all</button>
      </div>
    </fieldset>
    ${rows.length ? `<div class="tb-wrap"><table class="tb-tab">
      <caption class="ar-vh">Projects in site order: ${esc(label)}</caption>
      <thead><tr><th scope="col" class="tb-c tb-c--sel"><input type="checkbox" class="tb-chk" id="tb-s-all" data-tb-all ${all ? 'checked' : ''} aria-label="Select all ${rows.length} shown"></th>
        <th scope="col" class="tb-c tb-c--name">Sheet · title</th>${TB_COLS.map(([f, l]) => `<th scope="col" class="tb-c tb-c--${f}">${l}</th>`).join('')}</tr></thead>
      <tbody>${rows.map((p, i) => tbRow(p, i, s, nos)).join('')}</tbody></table></div>`
      : `<div class="ad-empty"><span class="nk-tag nk-tag--ok">Nothing here</span><p class="lead">No project matches “${esc(label)}”.</p></div>`}
  </div>`;
}
function tbSay(msg) { TB.msg = msg; const m = document.getElementById('tb-msg'); if (m) m.textContent = msg; }
function tbRefresh() { // after a cell edit: the marks, the summary and the counts, without moving the focus
  const s = tbSavedMap();
  root.querySelectorAll('[data-tb]').forEach((el) => {
    const [slug, f] = el.dataset.tb.split('|'), p = S.projects.find((x) => x.slug === slug); if (!p) return;
    const td = el.closest('td'), chg = tbChanged(p, f, s), o = s.get(slug);
    td.classList.toggle('is-chg', chg);
    if (chg && o) td.title = 'On the site: ' + (f === 'featured' || f === 'hidden' ? (o[f] ? 'yes' : 'no') : tbVal(o, f) || '(empty)'); else td.removeAttribute('title');
    if (f === 'hidden') el.closest('tr').classList.toggle('is-hidden', !!p.hidden);
  });
  const list = root.querySelector('.ad-list'); if (list) list.outerHTML = tbListView();
  S.notice = ''; updatePublish();
}
function tbInput(el) {
  const [slug, f] = el.dataset.tb.split('|'), p = S.projects.find((x) => x.slug === slug); if (!p) return;
  tbSet(p, f, el.type === 'checkbox' ? el.checked : el.value, tbSavedMap());
  if (f === 'year') el.setAttribute('aria-invalid', String(!(+p.year >= 1990 && +p.year <= 2100)));
  tbRefresh();
}
function tbPush() { TB.undo.push(S.projects.map((p) => ({ p, v: Object.fromEntries(TB_COLS.map(([f]) => [f, [f in p, p[f]]])) }))); if (TB.undo.length > 30) TB.undo.shift(); }
function tbUndo() {
  const snap = TB.undo.pop(); if (!snap) return;
  snap.forEach(({ p, v }) => Object.entries(v).forEach(([f, [had, val]]) => { if (had) p[f] = val; else delete p[f]; }));
  tbSay('Undone.'); render(); (document.querySelector('[data-tb-undo]:not([disabled])') || document.querySelector('[data-tb-copy]'))?.focus();
}
function tbBulk(kind) {
  const ps = tbShown().filter((p) => TB.sel.has(p.slug)), b = TB.bulk, s = tbSavedMap();
  if (!ps.length) { tbSay('Tick one or more rows first.'); return; }
  let f, v;
  if (kind === 'cat') { if (!CATEGORIES.includes(b.cat)) { tbSay('Pick a category first.'); document.getElementById('tb-b-cat')?.focus(); return; } f = 'category'; v = b.cat; }
  else if (kind === 'year') { if (!(+b.year >= 1990 && +b.year <= 2100)) { tbSay('Type a year like 2026 first.'); document.getElementById('tb-b-year')?.focus(); return; } f = 'year'; v = b.year; }
  else if (kind === 'mat') { if (b.matMode === 'add' && !b.mat.trim()) { tbSay('Type the materials text first.'); document.getElementById('tb-b-mat')?.focus(); return; } f = 'materials'; }
  else { f = kind.startsWith('feat') ? 'featured' : 'hidden'; v = kind.endsWith('1'); }
  tbPush();
  let n = 0;
  ps.forEach((p) => {
    const before = tbVal(p, f);
    const val = f !== 'materials' ? v : b.matMode === 'add' && String(p.materials || '').trim() ? String(p.materials).trim() + ' · ' + b.mat.trim() : b.mat.trim();
    tbSet(p, f, val, s); if (tbVal(p, f) !== before) n++;
  });
  if (!n) TB.undo.pop();
  const what = { category: 'Category', year: 'Year', materials: 'Materials', featured: 'Featured', hidden: 'Hidden' }[f];
  TB.msg = n ? `${what} changed in ${n} of ${ps.length} ticked project${ps.length === 1 ? '' : 's'}. ↶ Undo puts it back.` : `${what}: the ${ps.length} ticked project${ps.length === 1 ? ' already has' : 's already have'} that value.`;
  render();
}
function tbTsv(v) { return String(v ?? '').replace(/[\t\r\n]+/g, ' '); }
async function tbCopy() {
  const rows = tbShown(), nos = new Map(S.projects.map((p) => [p, arSheet(S.projects, p)]));
  const text = ['URL name\tSheet\tTitle\tCategory\tYear\tMaterials\tFeatured\tHidden']
    .concat(rows.map((p) => [p.slug, nos.get(p) || '', p.title.en, p.category, p.year, p.materials || '', p.featured ? 'yes' : 'no', p.hidden ? 'yes' : 'no'].map(tbTsv).join('\t'))).join('\n') + '\n';
  try { await navigator.clipboard.writeText(text); tbSay(`Copied ${rows.length} row${rows.length === 1 ? '' : 's'} with a header. Paste into Excel, edit, copy the rows back and use “Paste from Excel”.`); }
  catch { tbSay('Could not copy to the clipboard in this browser.'); }
}
function tbApply() {
  const src = (document.getElementById('tb-in')?.value || '').replace(/\r/g, '');
  const lines = src.split('\n').filter((l) => l.trim());
  const sep = lines[0] && lines[0].includes('\t') ? '\t' : lines[0] && lines[0].includes(';') ? ';' : ',';
  const head = (lines[0] || '').split(sep).map((h) => h.trim().toLowerCase());
  const col = (re) => head.findIndex((h) => re.test(h));
  const ci = { slug: col(/^(url name|url|slug)$/), category: col(/^(category|kategorija)$/), year: col(/^(year|leto)$/), materials: col(/^(materials?|materiali?)$/), featured: col(/^(featured|★)$/), hidden: col(/^(hidden|skrito)$/) };
  if (ci.slug < 0) { tbSay('The first line must be the header row with a “URL name” column — copy the table with “Copy for Excel” first.'); document.getElementById('tb-in')?.focus(); return; }
  const s = tbSavedMap(), bad = []; let vals = 0; const touched = new Set();
  tbPush();
  lines.slice(1).forEach((l, k) => {
    const c = l.split(sep), row = k + 2, slug = (c[ci.slug] || '').trim(), p = S.projects.find((x) => x.slug === slug);
    if (!p) { bad.push(`row ${row}: no project “${slug || '(empty)'}”`); return; }
    const put = (f, v) => { const before = tbVal(p, f); tbSet(p, f, v, s); if (tbVal(p, f) !== before) { vals++; touched.add(slug); } };
    const get = (f) => ci[f] >= 0 ? String(c[ci[f]] ?? '').trim() : '';
    const cat = get('category'), yr = get('year'), mat = get('materials'), fe = get('featured'), hi = get('hidden');
    if (cat) { const m = CATEGORIES.find((x) => x.toLowerCase() === cat.toLowerCase()); if (m) put('category', m); else bad.push(`row ${row}: category “${cat}”`); }
    if (yr) { if (/^\d{4}$/.test(yr) && +yr >= 1990 && +yr <= 2100) put('year', yr); else bad.push(`row ${row}: year “${yr}”`); }
    if (mat) put('materials', mat);
    [['featured', fe], ['hidden', hi]].forEach(([f, v]) => { if (!v) return; if (TB_YES.test(v)) put(f, true); else if (TB_NO.test(v)) put(f, false); else bad.push(`row ${row}: ${f} “${v}”`); });
  });
  if (!vals) TB.undo.pop();
  TB.msg = `${vals ? `Filled in ${vals} value${vals === 1 ? '' : 's'} in ${touched.size} project${touched.size === 1 ? '' : 's'}.` : 'Nothing to change — the pasted values are the same as here.'}${bad.length ? ` Not used: ${bad.slice(0, 4).join('; ')}${bad.length > 4 ? ` and ${bad.length - 4} more` : ''}.` : ''}${vals ? ' Check the red marks, then Publish.' : ''}`;
  if (vals) { TB.paste = false; if (TB.f !== 'all') TB.f = 'chg'; }
  render(); (vals ? document.querySelector('[data-tb-undo]') : document.getElementById('tb-in'))?.focus();
}
function tbSelect(el, shift) {
  const slug = el.dataset.tbSel, rows = tbShown(), i = rows.findIndex((p) => p.slug === slug);
  if (shift && TB.last != null) { const j = rows.findIndex((p) => p.slug === TB.last); if (j >= 0) rows.slice(Math.min(i, j), Math.max(i, j) + 1).forEach((p) => (el.checked ? TB.sel.add(p.slug) : TB.sel.delete(p.slug))); }
  if (el.checked) TB.sel.add(slug); else TB.sel.delete(slug);
  TB.last = slug; render();
}
function tbAct(b, e) {
  if (b.dataset.tbF != null) { TB.f = b.dataset.tbF; TB.msg = ''; render(); document.querySelector(`[data-tb-f="${CSS.escape(TB.f)}"]`)?.focus(); return; }
  if (b.dataset.tbOpen != null) { S.tab = 'projects'; S.sel = b.dataset.tbOpen; S.query = ''; render(); document.getElementById('t-en')?.focus(); return; }
  if (b.dataset.tbCopy != null) { tbCopy(); return; }
  if (b.dataset.tbPaste != null) { TB.paste = !TB.paste; TB.msg = ''; render(); (TB.paste ? document.getElementById('tb-in') : document.querySelector('[data-tb-paste]'))?.focus(); return; }
  if (b.dataset.tbApply != null) { tbApply(); return; }
  if (b.dataset.tbUndo != null) { tbUndo(); return; }
  if (b.dataset.tbMode != null) { TB.bulk.matMode = b.dataset.tbMode; render(); document.querySelector(`[data-tb-mode="${TB.bulk.matMode}"]`)?.focus(); return; }
  if (b.dataset.tbDo != null) { const k = b.dataset.tbDo; tbBulk(k); document.querySelector(`[data-tb-do="${k}"]`)?.focus(); return; }
  if (b.dataset.tbNone != null) { TB.sel.clear(); TB.last = null; TB.msg = ''; render(); document.getElementById('tb-s-all')?.focus(); }
}
function tbKey(e) { // Enter / Shift+Enter (and ↑ ↓ in the materials column) move along the column, like a spreadsheet
  const el = e.target, k = el.dataset && el.dataset.tb;
  if (el.dataset && el.dataset.tbB != null && e.key === 'Enter') { e.preventDefault(); document.querySelector(`[data-tb-do="${el.dataset.tbB}"]`)?.click(); return true; }
  if (!k) return false;
  const f = k.split('|')[1], down = e.key === 'Enter' ? !e.shiftKey : e.key === 'ArrowDown' ? true : e.key === 'ArrowUp' ? false : null;
  if (down == null || (e.key !== 'Enter' && f !== 'materials') || e.altKey || e.ctrlKey || e.metaKey) return false;
  const cells = [...root.querySelectorAll(`[data-tb$="|${f}"]`)], i = cells.indexOf(el), nx = cells[i + (down ? 1 : -1)];
  e.preventDefault();
  if (nx) { nx.focus(); nx.select?.(); }
  return true;
}

// ---------- LinkedIn post (news editor: ready-to-paste text for a news post, EN or SL) ----------
// Read-only: builds text from the post's own headline, summary and article; changes nothing in news.json.
// Remove: this block, the liSection(n) call in newsEditorView(), the data-li-* lines in the click/change
// handlers, the liRefresh call in the input handler and the "LinkedIn post" rules at the end of admin.css.
const LI = { lang: 'en', full: false, msg: '' };
function liText(n) {
  const sl = LI.lang === 'sl';
  const pick = (o) => (sl && o.sl.trim()) ? o.sl.trim() : o.en.trim();
  const body = pick(n.body).replace(/^- /gm, '• ');
  const link = 'https://nacekepa.work/#' + (sl ? 'sl' : 'en') + '-n-' + n.slug;
  return [pick(n.title), pick(n.summary), LI.full ? body : '', (sl ? 'Več: ' : 'Read more: ') + link].filter(Boolean).join('\n\n');
}
function liMissing(n) {
  if (LI.lang !== 'sl') return [];
  return [['title', 'headline'], ['summary', 'summary'], ['body', 'article']].filter(([k]) => LI.full || k !== 'body').filter(([k]) => n[k].en.trim() && !n[k].sl.trim()).map(([, l]) => l);
}
function liNote(n) {
  const miss = liMissing(n);
  const parts = [];
  if (miss.length) parts.push(`No Slovenian ${miss.join(', ')} yet — English is used there.`);
  if (n._new || n.hidden) parts.push('The link works once the post is published and not a draft.');
  return parts.join(' ');
}
function liSection(n) {
  const t = liText(n);
  return `<fieldset class="ad-sec li"><legend class="nk-label">LinkedIn post</legend>
    <div class="li-bar">
      <div class="li-lang" role="group" aria-label="Post language">
        <button type="button" data-li-lang="en" aria-pressed="${LI.lang === 'en'}">EN</button><button type="button" data-li-lang="sl" aria-pressed="${LI.lang === 'sl'}">SL</button>
      </div>
      <label class="ad-check"><input type="checkbox" data-li-full ${LI.full ? 'checked' : ''}> Include the full article</label>
    </div>
    <label class="nk-field__label" for="li-text">Text to paste · <span id="li-count">${t.length}</span> characters</label>
    <textarea class="nk-input li-text" id="li-text" rows="${LI.full ? 12 : 6}" readonly>${esc(t)}</textarea>
    <p class="nk-field__hint li-note" id="li-note">${esc(liNote(n))}</p>
    <div class="li-bar"><button type="button" class="nk-btn nk-btn--sm" data-li-copy>Copy post</button><span class="li-msg" id="li-msg" role="status">${esc(LI.msg)}</span></div>
  </fieldset>`;
}
function liRefresh() {
  const n = isNews() && cur(), ta = document.getElementById('li-text');
  if (!n || !ta) return;
  const t = liText(n);
  ta.value = t;
  document.getElementById('li-count').textContent = t.length;
  document.getElementById('li-note').textContent = liNote(n);
  const m = document.getElementById('li-msg'); if (m) m.textContent = LI.msg = '';
}
async function liCopy() {
  const ta = document.getElementById('li-text'), m = document.getElementById('li-msg');
  if (!ta) return;
  let ok = false;
  try { await navigator.clipboard.writeText(ta.value); ok = true; } catch {
    try { ta.focus(); ta.select(); ok = document.execCommand('copy'); } catch {}
  }
  LI.msg = ok ? 'Copied — paste it into a new LinkedIn post.' : 'Couldn’t copy. Select the text and press Ctrl+C.';
  if (m) m.textContent = LI.msg;
  if (!ok) { ta.focus(); ta.select(); }
}

// ---------- Site preview (news editor: how the post will look on nacekepa.work, EN or SL, before publishing) ----------
// Read-only: renders the post's own fields with the site's styles (news card + post page); changes nothing in news.json.
// Remove: this block, the pvSection(n) call in newsEditorView(), the data-pv-lang line in the click handler, the
// pvRefresh call in the input handler and the "Site preview" rules at the end of admin.css.
const PV = { lang: 'en' };
const PV_T = { en: { read: 'Read', pinned: 'Pinned' }, sl: { read: 'Preberi', pinned: 'Pripeto' } }; // same words as content.js
function pvPick(o, miss, label) {
  const en = String(o?.en ?? ''), sl = String(o?.sl ?? '');
  if (PV.lang !== 'sl' || sl.trim()) return { v: PV.lang === 'sl' ? sl : en, fb: false };
  if (en.trim()) miss.push(label);
  return { v: en, fb: !!en.trim() };
}
function pvWrap(h, fb, tag = 'span') { return fb ? `<${tag} class="pv-fb" title="English text — no Slovenian yet">${h}</${tag}>` : h; }
const PV_LINK = /(https?:\/\/[^\s<>"]+[^\s<>".,;:!?)\]'"])|([A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,})/g;
function pvInline(s) { // = rdInline() in app.js: links shown underlined, not clickable in the preview
  return String(s).split(PV_LINK).map((part, i) => i % 3 === 0 ? esc(part) : part ? `<u>${esc(i % 3 === 1 ? part.replace(/^https?:\/\//, '') : part)}</u>` : '').join('');
}
function pvRich(s) { // same rules as richText() in app.js: blank line = paragraph, "- " lines = list, "1. " = numbered list, links
  return String(s || '').split(/\n{2,}/).filter((b) => b.trim()).map((block) => {
    const lines = block.split('\n');
    if (lines.every((l) => /^\s*-\s+/.test(l))) return '<ul>' + lines.map((l) => `<li>${pvInline(l.replace(/^\s*-\s+/, ''))}</li>`).join('') + '</ul>';
    if (lines.every((l) => /^\s*\d+[.)]\s+/.test(l))) return '<ol>' + lines.map((l) => `<li>${pvInline(l.replace(/^\s*\d+[.)]\s+/, ''))}</li>`).join('') + '</ol>';
    return '<p>' + lines.map(pvInline).join('<br>') + '</p>';
  }).join('');
}
function pvDate(d) {
  try { const x = new Date(d + 'T12:00:00'); if (isNaN(x)) return d || '—'; return x.toLocaleDateString(PV.lang === 'sl' ? 'sl-SI' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' }); } catch { return d || '—'; }
}
function pvInner(n) {
  const miss = [], tx = PV_T[PV.lang];
  const ti = pvPick(n.title, miss, 'headline'), su = pvPick(n.summary, miss, 'summary'), bo = pvPick(n.body, miss, 'article');
  const title = pvWrap(esc(ti.v.trim() || 'Untitled'), ti.fb), sum = pvWrap(esc(su.v), su.fb);
  const date = (n.pinned ? `<b>${esc(tx.pinned)} · </b>` : '') + esc(pvDate(n.date));
  const cover = n.photos.length ? `<img src="${esc(previewUrl(n.photos[0]))}" alt="">` : '';
  const notes = [];
  if (miss.length) notes.push(`No Slovenian ${miss.join(', ')} yet — the SL page shows the English text (dashed).`);
  if (!bo.v.trim()) notes.push('The article is empty — the post page shows only the headline and summary.');
  if (n.hidden) notes.push('Draft — visitors won’t see this post until you untick “Draft” and publish.');
  else if (n._new || dirty()) notes.push('Not live yet — press Publish to put these changes on the site.');
  return `<p class="nk-field__hint pv-note">${esc(notes.join(' '))}</p>
    <p class="nk-label">News list · home page</p>
    <div class="news-card pv-card">${cover ? `<span class="news-card__img">${cover}</span>` : `<span class="news-card__img news-card__img--none" aria-hidden="true">${logo()}</span>`}
      <span class="news-card__body"><span class="nk-label">${date}</span><span class="news-card__title">${title}</span><span class="news-card__sum">${sum}</span><span class="news-card__more">${esc(tx.read)} →</span></span></div>
    <p class="nk-label">Post page · #n-${esc(n.slug)}</p>
    <article class="pv-page post">
      <p class="nk-label">${date}</p><h3 class="pv-title">${title}</h3>${su.v.trim() ? `<p class="lead">${sum}</p>` : ''}
      <div class="post-grid">${cover ? `<div class="nk-sheet__art project-art post-cover">${cover.replace('alt=""', 'class="sheet-photo" alt=""')}</div>` : ''}
        <div class="post-body">${bo.v.trim() ? pvWrap(pvRich(bo.v), bo.fb, 'div') : '<p class="pv-empty">—</p>'}</div></div>
    </article>`;
}
function pvSection(n) {
  return `<fieldset class="ad-sec pv"><legend class="nk-label">Preview on the site</legend>
    <div class="li-bar">
      <div class="li-lang" role="group" aria-label="Preview language">
        <button type="button" data-pv-lang="en" aria-pressed="${PV.lang === 'en'}">EN</button><button type="button" data-pv-lang="sl" aria-pressed="${PV.lang === 'sl'}">SL</button>
      </div>
      <span class="nk-field__hint">Updates while you type. Photos are shown as uploaded.</span>
    </div>
    <div class="pv-box" id="pv-box">${pvInner(n)}</div>
  </fieldset>`;
}
function pvRefresh() {
  const n = isNews() && cur(), box = document.getElementById('pv-box');
  if (n && box) box.innerHTML = pvInner(n);
}

// ---------- Sheet preview (project editor, box under Photos): the project as visitors will see it ----------
// Read-only: renders the project's own fields with the site's styles — the #work card between its neighbours, the
// project page and where it shows up (home, sheet number) — in EN or SL, at desktop or phone width. Changes nothing.
// Remove: this block, the spSection(p) call in editorView(), the data-sp-* line in the click handler, the spRefresh()
// call in the input handler and the "Sheet preview" rules at the end of admin.css.
const SP = { lang: 'en', w: 'desk' };
const SP_T = { // same words as content.js
  en: { cat: 'Category', year: 'Year', mat: 'Materials', model: '3D model', inter: 'Interactive preview', all: 'All work', cta: 'Start a project', ask: 'Ask about this project', photos: 'Photos' },
  sl: { cat: 'Področje', year: 'Leto', mat: 'Materiali', model: '3D model', inter: 'Interaktivni predogled', all: 'Vsi projekti', cta: 'Začni projekt', ask: 'Vprašajte o projektu', photos: 'Fotografije' },
};
const SP_CATS = { CAD: { en: 'CAD', sl: 'CAD', d: 'cad' }, Mechanical: { en: 'Mechanical', sl: 'Strojno', d: 'mech' }, IoT: { en: 'IoT', sl: 'IoT', d: 'iot' }, Embedded: { en: 'Embedded', sl: 'Vgrajeno', d: 'embedded' } }; // = CATS in content.js
function spPick(o, miss, label) {
  const en = String(o?.en ?? ''), sl = String(o?.sl ?? '');
  if (SP.lang !== 'sl' || sl.trim()) return { v: SP.lang === 'sl' ? sl : en, fb: false };
  if (en.trim() && miss) miss.push(label);
  return { v: en, fb: !!en.trim() };
}
function spWrap(h, fb, tag = 'span') { return fb ? `<${tag} class="pv-fb" title="English text — no Slovenian yet">${h}</${tag}>` : h; }
function spCat(p) { const c = SP_CATS[p.category]; return c ? c[SP.lang] : p.category || ''; }
function spArt(p) {
  if (p.photos?.length) return `<img class="sheet-photo" src="${esc(previewUrl(p.photos[0]))}" alt="">`;
  const d = p.drawing || SP_CATS[p.category]?.d || 'cad', D = window.NK_DRAWINGS || {};
  return D[d] || D.cad || '';
}
function spCard(p, miss, isCur) { // = sheet() in app.js
  const ti = spPick(p.title, isCur ? miss : null, 'title'), de = spPick(p.description, isCur ? miss : null, 'description');
  const no = arSheet(S.projects, p) || '—';
  return `<div class="nk-sheet sp-card${isCur ? ' is-cur' : ''}"${isCur ? ' aria-current="true"' : ''}><div class="nk-sheet__head"><span class="nk-label">${esc(no)}</span><span class="nk-label">${p.model ? '<b class="has3d">3D · </b>' : ''}${esc(spCat(p))} · ${esc(p.year)}</span></div>
    <div class="nk-sheet__art">${spArt(p)}</div><div class="nk-sheet__foot"><h4 class="nk-sheet__title">${spWrap(esc(ti.v.trim() || 'Untitled'), ti.fb)}</h4><p class="nk-sheet__desc">${spWrap(esc(de.v), de.fb)}</p></div></div>`;
}
function spPage(p, miss) { // = projectView() in app.js (3D viewer and buttons shown as placeholders)
  const tx = SP_T[SP.lang], no = arSheet(S.projects, p) || '—';
  const ti = spPick(p.title), de = spPick(p.description), dx = spPick(p.details || {}, miss, 'details');
  const rows = [[tx.cat, spCat(p)], [tx.year, String(p.year ?? '')]];
  if (p.materials) rows.push([tx.mat, p.materials]);
  if (p.model) rows.push([tx.model, tx.inter]);
  const stage = p.model ? `<div class="nk-sheet__art project-art sp-3d"><span class="nk-label">${esc(tx.model)} · ${esc(tx.inter)}</span>${spArt({ ...p, photos: [] })}</div>` : `<div class="nk-sheet__art project-art">${spArt(p)}</div>`;
  const det = dx.v.trim() ? spWrap(dx.v.split(/\n{2,}/).filter((x) => x.trim()).map((x) => `<p>${esc(x)}</p>`).join(''), dx.fb, 'div') : '';
  const ph = p.photos || [];
  return `<article class="pv-page sp-page">
    <p class="nk-label">← ${esc(tx.all)}</p>
    <div><p class="nk-label">${esc(no)} · ${esc(spCat(p))} · ${esc(p.year)}</p><h3 class="pv-title">${spWrap(esc(ti.v.trim() || 'Untitled'), ti.fb)}</h3></div>
    ${de.v.trim() ? `<p class="lead">${spWrap(esc(de.v), de.fb)}</p>` : ''}
    <div class="project-grid sp-grid2"><div class="project-stage">${stage}</div>
      <div class="project-side"><dl class="nk-specs">${rows.map((r) => `<div><dt>${esc(r[0])}</dt><dd>${esc(r[1])}</dd></div>`).join('')}</dl>
        ${det ? `<div class="project-details">${det}</div>` : ''}
        <div class="cta-row"><span class="nk-btn nk-btn--primary">${esc(tx.cta)}<span class="nk-btn__arrow" aria-hidden="true">→</span></span><span class="nk-btn">${esc(tx.ask)}</span></div></div></div>
    ${ph.length > 1 ? `<div class="gallery"><p class="nk-label">${esc(tx.photos)} · ${ph.length}</p><div class="sp-photos">${ph.map((f) => `<img src="${esc(previewUrl(f))}" alt="">`).join('')}</div></div>` : ''}
  </article>`;
}
function spInner(p) {
  const miss = [], v = arVisible(S.projects), i = v.indexOf(p);
  const row = i < 0 ? [p] : [v[i - 1], p, v[i + 1]].filter(Boolean);
  const cards = row.map((q) => spCard(q, miss, q === p)).join('');
  const page = spPage(p, miss);
  const notes = [], where = [];
  const no = arSheet(S.projects, p), was = arWas().get(p.slug);
  if (p.hidden) notes.push('Hidden — this sheet is not on the site and gets no sheet number until you untick “Hidden”.');
  else {
    where.push(`<li><b>${esc(no)}</b> · position ${i + 1} of ${v.length} on #work${was && was !== no ? ` (now ${esc(was)} — changes when you publish)` : ''}</li>`);
    const home = arHome(S.projects), h = home.indexOf(p);
    where.push(`<li>${h === 0 ? 'Home page · large sheet at the top' : h > 0 ? `Home page · card ${h + 1} of ${home.length} in “Selected work”` : p.featured ? 'Featured, but not on the home page (only the first four featured sheets are shown)' : 'Not on the home page (tick “Featured” to put it there)'}</li>`);
  }
  if (miss.length) notes.push(`No Slovenian ${[...new Set(miss)].join(', ')} yet — the SL page shows the English text (dashed).`);
  const d = String(spPick(p.description).v || '').trim();
  if (!d) notes.push('No one-line description — the card and the page show only the title.');
  else {
    const others = v.filter((q) => q !== p).map((q) => String(spPick(q.description).v || '').trim().length).filter(Boolean);
    const max = others.length ? Math.max(...others) : 0;
    if (max && d.length > max) notes.push(`The ${SP.lang === 'sl' ? 'Slovenian' : 'English'} one-line description is ${d.length} characters — longer than on any other sheet (up to ${max}), so this card will be taller than its neighbours.`);
  }
  if (!p.photos?.length) notes.push('No photo yet — the card and the page show the line drawing.');
  if (!p.hidden && (p._new || dirty())) notes.push('Not live yet — press Publish to put these changes on the site.');
  return `${notes.length ? `<ul class="nk-field__hint sp-notes">${notes.map((n) => `<li>${esc(n)}</li>`).join('')}</ul>` : ''}
    ${where.length ? `<ul class="sp-where">${where.join('')}</ul>` : ''}
    <p class="nk-label">#work · ${row.length > 1 ? 'between its neighbours' : 'card'}</p>
    <div class="sp-cards sp-n${row.length}">${cards}</div>
    <p class="nk-label">Project page · #p-${esc(p.slug)}</p>
    ${page}`;
}
function spSection(p) {
  return `<fieldset class="ad-sec pv sp"><legend class="nk-label">Preview on the site</legend>
    <div class="li-bar">
      <div class="li-lang" role="group" aria-label="Preview language">
        <button type="button" data-sp-lang="en" aria-pressed="${SP.lang === 'en'}">EN</button><button type="button" data-sp-lang="sl" aria-pressed="${SP.lang === 'sl'}">SL</button>
      </div>
      <div class="li-lang" role="group" aria-label="Preview width">
        <button type="button" data-sp-w="desk" aria-pressed="${SP.w === 'desk'}">Desktop</button><button type="button" data-sp-w="phone" aria-pressed="${SP.w === 'phone'}">Phone</button>
      </div>
      <span class="nk-field__hint">Updates while you type. Photos are shown as uploaded.</span>
    </div>
    <div class="pv-box sp-box${SP.w === 'phone' ? ' sp-phone' : ''}" id="sp-box">${spInner(p)}</div>
  </fieldset>`;
}
function spRefresh() {
  const p = !isNews() && !isTodo() && !isArr() && !isTr() && cur(), box = document.getElementById('sp-box');
  if (p && box) box.innerHTML = spInner(p);
}

function newsEditorView() {
  const n = cur();
  if (!n) return `<div class="ad-empty"><p class="lead">No news post selected.</p><button class="nk-btn" data-act="new" type="button">+ New post</button></div>`;
  const committed = !n._new;
  return `<div class="ad-editor">
    <div class="ad-editor__head">
      <div><p class="nk-label">${committed ? 'News · ' + esc(n.date) : 'New post · not published yet'}</p><h2 class="sub">${esc(n.title.en || 'Untitled')}</h2></div>
      ${committed && !n.hidden ? `<a class="nk-btn nk-btn--sm nk-btn--ghost" href="/#n-${esc(n.slug)}" target="_blank" rel="noopener">View on site ↗</a>` : ''}
    </div>
    <fieldset class="ad-sec"><legend class="nk-label">Post</legend><div class="form">
      ${fld('n-t-en', 'Headline · English', inp('n-t-en', n.title.en, 'required'))}
      ${fld('n-t-sl', 'Headline · Slovenian', inp('n-t-sl', n.title.sl))}
      ${fld('n-s-en', 'Summary · EN', area('n-s-en', n.summary.en, 2), 'One or two sentences, shown in lists and on the home page.')}
      ${fld('n-s-sl', 'Summary · SL', area('n-s-sl', n.summary.sl, 2))}
      ${fld('n-b-en', 'Article · EN', area('n-b-en', n.body.en, 9), 'Blank line = new paragraph. A line starting with “- ” becomes a list item.')}
      ${fld('n-b-sl', 'Article · SL', area('n-b-sl', n.body.sl, 9))}
    </div></fieldset>
    <fieldset class="ad-sec"><legend class="nk-label">Settings</legend><div class="form form-3">
      ${fld('n-date', 'Date', inp('n-date', n.date, 'type="date"'))}
      ${fld('n-slug', 'URL name', inp('n-slug', n.slug, committed ? 'readonly' : ''), committed ? 'nacekepa.work/#n-' + esc(n.slug) : 'Lowercase, numbers, dashes.')}
      <div class="nk-field"><span class="nk-field__label">Visibility</span>
        <label class="ad-check"><input type="checkbox" data-k="n-pin" ${n.pinned ? 'checked' : ''}> Pinned to the top</label>
        <label class="ad-check"><input type="checkbox" data-k="n-hid" ${n.hidden ? 'checked' : ''}> Draft (not on the site)</label>
      </div>
    </div></fieldset>
    ${photosSection(n)}
    ${pvSection(n)}
    ${liSection(n)}
    <div class="ad-danger">
      ${S.confirmDelete ? `<span>Delete “${esc(n.title.en || n.slug)}” and its photos?</span><button type="button" class="nk-btn nk-btn--sm nk-btn--primary" data-act="del-yes">Delete</button><button type="button" class="nk-btn nk-btn--sm" data-act="del-no">Keep</button>`
        : `<button type="button" class="nk-btn nk-btn--sm nk-btn--ghost" data-act="del">Delete post</button>`}
    </div>
  </div>`;
}

function editorView() {
  if (isTodo()) return todoView();
  if (isArr()) return arView();
  if (isTr()) return trView();
  if (isTb()) return tbView();
  if (isNews()) return newsEditorView();
  const p = cur();
  if (!p) return `<div class="ad-empty"><p class="lead">No project selected.</p><button class="nk-btn" data-act="new" type="button">+ New project</button></div>`;
  const committed = !p._new;
  const m = p.model;
  return `<div class="ad-editor">
    <div class="ad-editor__head">
      <div><p class="nk-label">${committed ? 'Project · ' + esc(p.slug) : 'New project · not published yet'}</p><h2 class="sub">${esc(p.title.en || 'Untitled')}</h2></div>
      ${committed ? `<a class="nk-btn nk-btn--sm nk-btn--ghost" href="/#p-${esc(p.slug)}" target="_blank" rel="noopener">View on site ↗</a>` : ''}
    </div>

    <fieldset class="ad-sec"><legend class="nk-label">Text</legend><div class="form">
      ${fld('t-en', 'Title · English', inp('t-en', p.title.en, 'required'))}
      ${fld('t-sl', 'Title · Slovenian', inp('t-sl', p.title.sl))}
      ${fld('d-en', 'One-line description · EN', area('d-en', p.description.en, 2))}
      ${fld('d-sl', 'One-line description · SL', area('d-sl', p.description.sl, 2))}
      ${fld('x-en', 'Details · EN', area('x-en', p.details?.en || '', 5), 'Shown on the project page. Blank line = new paragraph.')}
      ${fld('x-sl', 'Details · SL', area('x-sl', p.details?.sl || '', 5))}
    </div></fieldset>

    <fieldset class="ad-sec"><legend class="nk-label">Sheet</legend><div class="form form-3">
      ${fld('cat', 'Category', `<select class="nk-input" id="cat" data-k="cat">${CATEGORIES.map((c) => `<option${c === p.category ? ' selected' : ''}>${c}</option>`).join('')}</select>`)}
      ${fld('year', 'Year', inp('year', p.year, 'type="number" min="1990" max="2100"'))}
      ${fld('mat', 'Materials', inp('mat', p.materials || '', 'placeholder="PETG · 0.2 mm · 3 perimeters"'))}
      ${fld('slug', 'URL name', inp('slug', p.slug, committed ? 'readonly' : ''), committed ? 'nacekepa.work/#p-' + esc(p.slug) + ' · fixed after publishing' : 'Lowercase, numbers, dashes.')}
      ${fld('drw', 'Drawing (when no photo)', `<select class="nk-input" id="drw" data-k="drw"><option value="">By category</option>${DRAWINGS.map((d) => `<option${d === p.drawing ? ' selected' : ''}>${d}</option>`).join('')}</select>`)}
      <div class="nk-field"><span class="nk-field__label">Visibility</span>
        <label class="ad-check"><input type="checkbox" data-k="feat" ${p.featured ? 'checked' : ''}> Featured on home page</label>
        <label class="ad-check"><input type="checkbox" data-k="hid" ${p.hidden ? 'checked' : ''}> Hidden from the site</label>
      </div>
    </div></fieldset>

    <fieldset class="ad-sec"><legend class="nk-label">3D model</legend>
      <div class="ad-model">
        <div class="nk-viewer" id="ad-viewer">${m ? '<div class="nk-viewer__msg" id="ad-viewer-msg">Loading model…</div>' : `<label class="ad-drop" for="model-in"><span class="sub">Add a 3D model</span><span class="nk-field__hint">${FORMATS.map((f) => f.toUpperCase()).join(' · ')} · up to ${MAX_MODEL / 1048576} MB</span></label>`}</div>
        <div class="ad-model__side">
          ${m ? `<dl class="nk-specs"><div><dt>Source</dt><dd>${esc(m.source || m.file.split('/').pop())}${S.uploads.has(repoPath(m.file)) ? ' · <b class="has3d">unpublished</b>' : ''}</dd></div><div><dt>Published</dt><dd>Protected preview${m.triangles ? ' · ' + m.triangles.toLocaleString() + ' tri' : ''}</dd></div><div><dt>Size</dt><dd>${m.size ? fmtMB(m.size) : '—'}</dd></div><div><dt>Shape</dt><dd id="ad-viewer-info">—</dd></div></dl>` : ''}
          <label class="nk-btn nk-btn--sm" for="model-in">${m ? 'Replace model' : 'Choose file'}</label>
          <input type="file" id="model-in" accept="${FORMATS.map((f) => '.' + f).join(',')}" hidden>
          ${m ? `<button type="button" class="nk-btn nk-btn--sm nk-btn--ghost" data-act="rm-model">Remove model</button>` : ''}
          <p class="ad-small"><b>Protected:</b> only a simplified preview (max ${PREVIEW_TRIANGLES.toLocaleString()} triangles, scrambled .nkm) is published. Your original STL/3MF never leaves this computer and visitors can't download a model.</p>
        </div>
      </div>
    </fieldset>

    ${photosSection(p)}
    ${spSection(p)}

    <div class="ad-danger">
      ${S.confirmDelete ? `<span>Delete “${esc(p.title.en || p.slug)}” and its files?</span><button type="button" class="nk-btn nk-btn--sm nk-btn--primary" data-act="del-yes">Delete</button><button type="button" class="nk-btn nk-btn--sm" data-act="del-no">Keep</button>`
        : `<button type="button" class="nk-btn nk-btn--sm nk-btn--ghost" data-act="del">Delete project</button>`}
    </div>
  </div>`;
}

function dashView() {
  const n = changeCount();
  return `<div class="ad-shell">
    <header class="ad-top">
      <a class="wordmark" href="/" target="_blank" rel="noopener">${logo()}<span class="wm-text">nacekepa<span>.work</span></span></a>
      <span class="nk-label">Admin · ${esc(S.user)}</span>
      <span class="ad-top__status">${deployPill()}</span>
      <button type="button" class="nk-btn nk-btn--sm nk-btn--ghost" data-act="reload" ${S.busy ? 'disabled' : ''}>Reload</button>
      ${vault() ? '<button type="button" class="nk-btn nk-btn--sm nk-btn--ghost" data-act="lock">Lock</button>' : ''}
      <button type="button" class="nk-btn nk-btn--sm nk-btn--ghost" data-act="logout" title="Signs out and erases the saved token on this device">Sign out</button>
      <button type="button" class="nk-btn nk-btn--primary" data-act="publish" ${!n || S.busy ? 'disabled' : ''}>Publish${n ? ` ${n} change${n > 1 ? 's' : ''}` : ''}<span class="nk-btn__arrow" aria-hidden="true">→</span></button>
    </header>
    ${S.busy ? `<p class="ad-bar" role="status"><span class="nk-label">${esc(S.busy)}</span></p>` : ''}
    ${S.error ? `<p class="ad-bar err" role="alert">${esc(S.error)}</p>` : ''}
    ${S.notice && !S.busy && !S.error ? `<p class="ad-bar ok" role="status">${esc(S.notice)}</p>` : ''}
    <div class="ad-main">${listView()}${editorView()}</div>
  </div>`;
}

function render() {
  if (viewer) { viewer.dispose(); viewer = null; }
  const focus = document.activeElement && document.activeElement.id;
  const caret = focus && document.activeElement.selectionStart;
  root.innerHTML = S.locked || (!S.user && vault() && !S.forceLogin) ? unlockView() : S.user ? dashView() : loginView();
  if (focus) {
    const el = document.getElementById(focus);
    if (el) { el.focus(); try { if (caret != null) el.setSelectionRange(caret, caret); } catch {} }
  }
  const p = cur();
  if (S.user && !S.locked && S.tab === 'projects' && p && p.model) {
    const box = document.getElementById('ad-viewer');
    const rp = repoPath(p.model.file);
    const local = S.uploads.get(rp);
    mountViewer(box, local ? { file: local, format: p.model.format, still: true } : { url: previewUrl(p.model.file), format: p.model.format, still: true })
      .then((v) => {
        if (!document.body.contains(box)) { v.dispose(); return; }
        viewer = v;
        document.getElementById('ad-viewer-msg')?.remove();
        const s = v.info.size, info = document.getElementById('ad-viewer-info');
        if (info) info.textContent = `${s.x.toFixed(1)} × ${s.z.toFixed(1)} × ${s.y.toFixed(1)} mm`;
      })
      .catch(() => {
        const msg = document.getElementById('ad-viewer-msg');
        if (msg) msg.textContent = local ? 'This file could not be read as a 3D model.' : 'Not on the live site yet — publish first, or the file is missing.';
      });
  }
}

// ---------- events ----------
root.addEventListener('submit', (e) => {
  e.preventDefault();
  if (e.target.id === 'login') {
    const tok = document.getElementById('tok').value;
    if (!tok.trim()) { S.error = 'Paste your GitHub token first.'; render(); return; }
    const pin = document.getElementById('pin').value;
    if (pin && pin.length < 6) { S.error = 'Use a PIN of at least 6 characters, or leave it empty.'; render(); return; }
    S.forceLogin = false;
    signIn(tok, pin);
  }
  if (e.target.id === 'unlock') {
    const pin = document.getElementById('pin').value;
    S.busy = 'Unlocking…'; S.error = ''; render();
    openVault(pin).then((tok) => { S.busy = ''; S.notice = ''; return signIn(tok, null); }, () => {
      S.busy = '';
      S.fails = (S.fails || 0) + 1;
      if (S.fails >= 5) { clearToken(); S.locked = false; S.user = null; S.forceLogin = true; S.error = 'Too many wrong PINs. The saved token was erased; sign in with your GitHub token again.'; }
      else S.error = `Wrong PIN (${5 - S.fails} tries left before the saved token is erased).`;
      render();
    });
  }
});

root.addEventListener('input', (e) => {
  const k = e.target.dataset.k, p = cur();
  if (e.target.id === 'q') { S.query = e.target.value; render(); return; }
  if (e.target.dataset.tr != null) { trInput(e.target); return; }
  if (e.target.dataset.tb != null && e.target.type !== 'checkbox') { tbInput(e.target); return; }
  if (e.target.dataset.tbB != null) { TB.bulk[e.target.dataset.tbB] = e.target.value; return; }
  if (!k || !p) return;
  const v = e.target.value;
  if (isNews()) {
    if (k === 'n-t-en') { p.title.en = v; if (p._new && !p._slugTouched) { p.slug = slugify(v) || p.slug; S.selNews = p.slug; } }
    else if (k === 'n-t-sl') p.title.sl = v;
    else if (k === 'n-s-en') p.summary.en = v;
    else if (k === 'n-s-sl') p.summary.sl = v;
    else if (k === 'n-b-en') p.body.en = v;
    else if (k === 'n-b-sl') p.body.sl = v;
    else if (k === 'n-date') p.date = v;
    else if (k === 'n-slug' && p._new) { p.slug = slugify(v); p._slugTouched = true; S.selNews = p.slug; }
    else return;
    S.notice = '';
    const head = root.querySelector('.ad-editor__head .sub');
    if (head && k === 'n-t-en') head.textContent = p.title.en || 'Untitled';
    const list = root.querySelector('.ad-list');
    if (list && (k === 'n-t-en' || k === 'n-date')) list.outerHTML = listView();
    liRefresh();
    pvRefresh();
    updatePublish();
    return;
  }
  if (k === 't-en') { p.title.en = v; if (p._new && !p._slugTouched) p.slug = slugify(v) || p.slug, S.sel = p.slug; }
  else if (k === 't-sl') p.title.sl = v;
  else if (k === 'd-en') p.description.en = v;
  else if (k === 'd-sl') p.description.sl = v;
  else if (k === 'x-en') (p.details ||= { en: '', sl: '' }).en = v;
  else if (k === 'x-sl') (p.details ||= { en: '', sl: '' }).sl = v;
  else if (k === 'year') p.year = parseInt(v, 10) || v;
  else if (k === 'mat') p.materials = v;
  else if (k === 'slug' && p._new) { p.slug = slugify(v); p._slugTouched = true; S.sel = p.slug; }
  else return;
  S.notice = '';
  // Re-render only the parts that show these values, so typing never loses focus.
  const head = root.querySelector('.ad-editor__head .sub');
  if (head && k === 't-en') head.textContent = p.title.en || 'Untitled';
  const list = root.querySelector('.ad-list');
  if (list && (k === 't-en' || k === 'year')) list.outerHTML = listView();
  updatePublish();
  spRefresh();
});

root.addEventListener('change', async (e) => {
  const k = e.target.dataset.k, p = cur();
  if (e.target.dataset.arPos != null) { arPos(e.target); return; }
  if (e.target.dataset.tb != null) { if (e.target.type === 'checkbox' || e.target.tagName === 'SELECT') tbInput(e.target); return; }
  if (e.target.dataset.tbB != null) { TB.bulk[e.target.dataset.tbB] = e.target.value; return; }
  if (e.target.dataset.tbAll != null) { tbShown().forEach((x) => (e.target.checked ? TB.sel.add(x.slug) : TB.sel.delete(x.slug))); TB.last = null; render(); return; }
  if (e.target.dataset.liFull != null) { LI.full = e.target.checked; LI.msg = ''; render(); document.querySelector('[data-li-full]')?.focus(); return; }
  if (e.target.id === 'model-in' && p) {
    const f = e.target.files[0];
    if (!f) return;
    const ext = f.name.split('.').pop().toLowerCase();
    if (!FORMATS.includes(ext)) { S.error = `Use ${FORMATS.join(', ').toUpperCase()} — “${f.name}” isn’t a supported 3D format.`; render(); return; }
    if (f.size > MAX_MODEL) { S.error = `“${f.name}” is ${fmtMB(f.size)}. Keep models under ${MAX_MODEL / 1048576} MB (export a coarser mesh).`; render(); return; }
    S.busy = `Making a protected preview of ${f.name}…`; S.error = ''; render();
    try {
      const prev = await makePreview(f, ext);
      if (p.model) stageDelete(p.model.file);
      const site = `models/${p.slug}/${p.slug}-${Date.now().toString(36)}.nkm`;
      S.uploads.set(repoPath(site), prev.file);
      p.model = { file: site, format: 'nkm', size: prev.file.size, triangles: prev.triangles, source: f.name };
      S.notice = prev.original > prev.triangles
        ? `Preview made: ${prev.triangles.toLocaleString()} of ${prev.original.toLocaleString()} triangles. Your original file is not uploaded.`
        : `Preview made (${prev.triangles.toLocaleString()} triangles). Your original file is not uploaded.`;
    } catch (err) {
      S.error = `“${f.name}” couldn’t be read as a 3D model (${err.message}).`;
    }
    S.busy = ''; render(); return;
  }
  if (e.target.id === 'photo-in' && p) {
    const files = [...e.target.files];
    S.busy = 'Preparing photos…'; render();
    for (const f of files) {
      let ready;
      try { ready = await preparePhoto(f); } catch (err) { S.error = err.message; continue; }
      const ext = (ready.name.split('.').pop() || 'jpg').toLowerCase();
      const name = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}.${ext}`;
      const site = isNews() ? `news/${p.slug}/${name}` : `models/${p.slug}/photos/${name}`;
      S.uploads.set(repoPath(site), ready);
      p.photos.push(site);
    }
    S.busy = ''; render(); return;
  }
  if (!k || !p) return;
  if (k === 'n-pin') { p.pinned = e.target.checked; render(); return; }
  if (k === 'n-hid') { p.hidden = e.target.checked; render(); return; }
  if (k === 'cat') p.category = e.target.value;
  else if (k === 'drw') p.drawing = e.target.value;
  else if (k === 'feat') p.featured = e.target.checked;
  else if (k === 'hid') p.hidden = e.target.checked;
  else return;
  render();
});

root.addEventListener('click', (e) => {
  if (e.target.dataset && e.target.dataset.tbSel != null) { tbSelect(e.target, e.shiftKey); return; }
  const b = e.target.closest('button');
  if (!b) return;
  const p = cur();
  const act = b.dataset.act;
  if (b.dataset.tab) { S.tab = b.dataset.tab; S.query = ''; S.confirmDelete = false; render(); return; }
  if (b.dataset.todoF != null) { S.todoF = b.dataset.todoF; render(); return; }
  if (b.dataset.todoGo != null) { todoGo(b.dataset.todoGo); return; }
  if (b.dataset.ar != null) { arAct(b); return; }
  if (isTr() && Object.keys(b.dataset).some((k) => /^tr[A-Z]/.test(k))) { trAct(b); return; }
  if (isTb() && Object.keys(b.dataset).some((k) => /^tb[A-Z]/.test(k))) { tbAct(b, e); return; }
  if (b.dataset.liLang != null) { LI.lang = b.dataset.liLang; LI.msg = ''; render(); document.querySelector(`[data-li-lang="${LI.lang}"]`)?.focus(); return; }
  if (b.dataset.liCopy != null) { liCopy(); return; }
  if (b.dataset.spLang != null || b.dataset.spW != null) { if (b.dataset.spLang) SP.lang = b.dataset.spLang; else SP.w = b.dataset.spW; render(); document.querySelector(b.dataset.spLang ? `[data-sp-lang="${SP.lang}"]` : `[data-sp-w="${SP.w}"]`)?.focus(); return; }
  if (b.dataset.pvLang != null) { PV.lang = b.dataset.pvLang; render(); document.querySelector(`[data-pv-lang="${PV.lang}"]`)?.focus(); return; }
  if (b.dataset.sel != null) { if (isNews()) S.selNews = b.dataset.sel; else S.sel = b.dataset.sel; S.confirmDelete = false; render(); return; }
  if (b.dataset.up != null || b.dataset.down != null) {
    const i = +(b.dataset.up ?? b.dataset.down), j = b.dataset.up != null ? i - 1 : i + 1;
    [S.projects[i], S.projects[j]] = [S.projects[j], S.projects[i]];
    render(); return;
  }
  if (b.dataset.rmPhoto != null && p) { const [ph] = p.photos.splice(+b.dataset.rmPhoto, 1); stageDelete(ph); render(); return; }
  if (b.dataset.cover != null && p) { const [ph] = p.photos.splice(+b.dataset.cover, 1); p.photos.unshift(ph); render(); return; }
  if (act === 'new' && isNews()) { const nn = blankNews(); S.news.unshift(nn); S.selNews = nn.slug; S.query = ''; render(); document.getElementById('n-t-en')?.focus(); return; }
  if (act === 'new') { const np = blankProject(); S.projects.unshift(np); S.sel = np.slug; S.query = ''; render(); document.getElementById('t-en')?.focus(); return; }
  if (act === 'rm-model' && p && p.model) { stageDelete(p.model.file); p.model = null; render(); return; }
  if (act === 'del') { S.confirmDelete = true; render(); return; }
  if (act === 'del-no') { S.confirmDelete = false; render(); return; }
  if (act === 'del-yes' && p && isNews()) {
    p.photos.forEach(stageDelete);
    S.news = S.news.filter((x) => x !== p);
    S.selNews = sortNews(S.news)[0]?.slug || null;
    S.confirmDelete = false; render(); return;
  }
  if (act === 'del-yes' && p) {
    if (p.model) stageDelete(p.model.file);
    p.photos.forEach(stageDelete);
    S.projects = S.projects.filter((x) => x !== p);
    S.sel = S.projects[0]?.slug || null;
    S.confirmDelete = false; render(); return;
  }
  if (act === 'publish') { publish(); return; }
  if (act === 'reload') {
    if (dirty() && !b.dataset.sure) { b.dataset.sure = '1'; b.textContent = 'Discard changes?'; return; }
    S.notice = ''; load().catch((err) => { S.busy = ''; S.error = err.message; render(); }); return;
  }
  if (act === 'logout') { clearToken(); Object.assign(S, { token: null, user: null, locked: false, forceLogin: true, projects: [], headSha: null, error: '', notice: '' }); S.uploads.clear(); S.deletes.clear(); render(); }
  if (act === 'lock') { lock('Locked.'); }
  if (act === 'forget') { clearToken(); Object.assign(S, { locked: false, user: null, forceLogin: true, error: '', notice: '' }); render(); }
});

function updatePublish() {
  const btn = root.querySelector('[data-act="publish"]');
  if (!btn) return;
  const n = changeCount();
  btn.disabled = !n || !!S.busy;
  btn.firstChild.nodeValue = 'Publish' + (n ? ` ${n} change${n > 1 ? 's' : ''}` : '');
}

window.addEventListener('beforeunload', (e) => { if (S.user && dirty()) { e.preventDefault(); e.returnValue = ''; } });

// ---------- start ----------
render();
