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
    ${liSection(n)}
    <div class="ad-danger">
      ${S.confirmDelete ? `<span>Delete “${esc(n.title.en || n.slug)}” and its photos?</span><button type="button" class="nk-btn nk-btn--sm nk-btn--primary" data-act="del-yes">Delete</button><button type="button" class="nk-btn nk-btn--sm" data-act="del-no">Keep</button>`
        : `<button type="button" class="nk-btn nk-btn--sm nk-btn--ghost" data-act="del">Delete post</button>`}
    </div>
  </div>`;
}

function editorView() {
  if (isTodo()) return todoView();
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
});

root.addEventListener('change', async (e) => {
  const k = e.target.dataset.k, p = cur();
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
  const b = e.target.closest('button');
  if (!b) return;
  const p = cur();
  const act = b.dataset.act;
  if (b.dataset.tab) { S.tab = b.dataset.tab; S.query = ''; S.confirmDelete = false; render(); return; }
  if (b.dataset.todoF != null) { S.todoF = b.dataset.todoF; render(); return; }
  if (b.dataset.todoGo != null) { todoGo(b.dataset.todoGo); return; }
  if (b.dataset.liLang != null) { LI.lang = b.dataset.liLang; LI.msg = ''; render(); document.querySelector(`[data-li-lang="${LI.lang}"]`)?.focus(); return; }
  if (b.dataset.liCopy != null) { liCopy(); return; }
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
