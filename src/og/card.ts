// Link-preview images (SEO package, 2026-11-02). Every project and news landing page gets its own 1200×630 PNG at
// /og/<lang-prefix>portfolio/<slug>.png or /og/<lang-prefix>news/<slug>.png, drawn at build time from the same data as the
// page (projects.json / news.json, NK_DRAWINGS in drawings.js) and rendered with @resvg/resvg-js — the only new dependency.
// The card is a drawing sheet: frame, grid, the project's line drawing, title block with sheet number, category, year and
// materials. Fonts are the site's own (Schibsted Grotesk ExtraBold + Medium, JetBrains Mono Medium — OFL; the static TTFs
// from github.com/schibsted/schibsted-grotesk and github.com/JetBrains/JetBrainsMono, see src/og/fonts/SOURCES.txt) in
// src/og/fonts/, so the build needs no network and no system fonts. Text is wrapped with the glyph widths in
// src/og/metrics.json (advance widths per 1000 em, generated from those files).
// To remove: delete src/og/, src/pages/og/[...path].png.ts, the `og` lines in Site.astro and the dependency in package.json.
import { Resvg } from '@resvg/resvg-js';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import metrics from './metrics.json';
import drawings from '../site/drawings.js?raw';
import content from '../site/content.js?raw';

export type Lang = 'en' | 'sl';
const W = 1200, H = 630;
// Light theme tokens from page.css (link previews are shown on white/grey backgrounds, so the light sheet fits everywhere).
const C = { paper: '#eef0ec', raised: '#fafbf8', sunk: '#e2e5df', ink: '#1a1c1e', muted: '#53585e', grid: '#d3dbe3', line: '#cdd1ca', lineStrong: '#767c83', redline: '#b52b16', dimension: '#2559a8' };
// The font files are read from the source tree (the build runs from the repo root; the bundled module's own URL would point
// into dist/). If they are missing, resvg says so in the build log and the cards come out without text.
const fontDir = [resolve(process.cwd(), 'src/og/fonts'), fileURLToPath(new URL('./fonts/', import.meta.url))].find((d) => existsSync(join(d, 'JetBrainsMono-Medium.ttf'))) || resolve(process.cwd(), 'src/og/fonts');
const FONT_FILES = ['SchibstedGrotesk-ExtraBold.ttf', 'SchibstedGrotesk-Medium.ttf', 'JetBrainsMono-Medium.ttf'].map((f) => join(fontDir, f));
if (!existsSync(FONT_FILES[0])) console.warn('[og/card.ts] fonts not found in ' + fontDir + ' — link-preview cards will have no text');
const NK_DRAWINGS: Record<string, string> = new Function(drawings + '\nreturn NK_DRAWINGS;')();
const CATS: any = new Function(content + '\nreturn CATS;')();
const T: any = new Function(content + '\nreturn T;')();

const ex = (s: unknown) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const tl = (v: any, lang: Lang) => (v && typeof v === 'object' ? v[lang] || v.en || '' : v || '');
// Width of a string in px for one of the three fonts at a given size (metrics are advance widths per 1000 em units).
type Face = 'bold' | 'med' | 'mono';
const width = (s: string, face: Face, size: number) => { const m: Record<string, number> = (metrics as any)[face]; let w = 0; for (const ch of s) w += (m[ch] ?? m['n'] ?? 600); return (w * size) / 1000; };
// Greedy word wrap into at most `max` lines; the last line is cut with an ellipsis when the text is longer.
function wrap(text: string, face: Face, size: number, maxWidth: number, max: number): string[] {
  const words = String(text || '').replace(/\s+/g, ' ').trim().split(' ');
  const lines: string[] = []; let cur = '';
  for (const w of words) {
    const next = cur ? cur + ' ' + w : w;
    if (width(next, face, size) <= maxWidth || !cur) cur = next; else { lines.push(cur); cur = w; }
  }
  if (cur) lines.push(cur);
  if (lines.length > max) {
    let last = lines.slice(max - 1).join(' ');
    while (last.length && width(last + '…', face, size) > maxWidth) last = last.replace(/\s*\S+$/, '');
    return lines.slice(0, max - 1).concat(last + '…');
  }
  return lines;
}
const textBlock = (lines: string[], x: number, y: number, face: Face, size: number, lineHeight: number, fill: string, extra = '') =>
  lines.map((l, i) => `<text x="${x}" y="${y + i * lineHeight}" font-family="${face === 'mono' ? 'JetBrains Mono' : 'Schibsted Grotesk'}" font-weight="${face === 'bold' ? 800 : 500}" font-size="${size}" fill="${fill}" ${extra}>${ex(l)}</text>`).join('');
const label = (s: string, x: number, y: number, fill = C.muted, anchor = 'start') => `<text x="${x}" y="${y}" font-family="JetBrains Mono" font-weight="500" font-size="18" letter-spacing="1.6" fill="${fill}" text-anchor="${anchor}">${ex(s.toUpperCase())}</text>`;

// A drawing from drawings.js with its CSS classes turned into presentation attributes (the card has no stylesheet).
function art(key: string, x: number, y: number, w: number, h: number): string {
  const svg = NK_DRAWINGS[key] || NK_DRAWINGS.cad; if (!svg) return '';
  const inner = svg.replace(/^<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
  const styles: Record<string, string> = {
    ln: `fill="none" stroke="${C.ink}" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round"`,
    hid: `fill="none" stroke="${C.muted}" stroke-width="1" stroke-dasharray="4 3"`,
    ctr: `fill="none" stroke="${C.muted}" stroke-width=".8" stroke-dasharray="10 3 2 3"`,
    dim: `fill="none" stroke="${C.dimension}" stroke-width="1"`,
    dimt: `fill="${C.dimension}" font-family="JetBrains Mono" font-weight="500" font-size="11"`,
    mark: `fill="none" stroke="${C.redline}" stroke-width="1.6"`,
    fill: `fill="${C.sunk}" stroke="${C.ink}" stroke-width="1.6"`
  };
  const body = inner.replace(/class="([a-z]+)"/g, (m, c) => styles[c] || m);
  // Children of <g class="ln"> inherit the stroke; `fill="none"` etc. on the group is enough. viewBox 240×180 → fit (w, h).
  const s = Math.min(w / 240, h / 180); const ox = x + (w - 240 * s) / 2, oy = y + (h - 180 * s) / 2;
  return `<g transform="translate(${ox.toFixed(1)} ${oy.toFixed(1)}) scale(${s.toFixed(4)})">${body}</g>`;
}

const frame = (lang: Lang) => `<defs><pattern id="g" width="24" height="24" patternUnits="userSpaceOnUse"><path d="M24 0H0V24" fill="none" stroke="${C.grid}" stroke-width="1"/></pattern></defs>` +
  `<rect width="${W}" height="${H}" fill="${C.paper}"/><rect x="28" y="28" width="${W - 56}" height="${H - 56}" fill="${C.raised}" stroke="${C.ink}" stroke-width="2"/>` +
  `<line x1="28" y1="80" x2="${W - 28}" y2="80" stroke="${C.ink}" stroke-width="1.5"/>` +
  label('Nace Kepa · ' + (lang === 'sl' ? 'Inženirski studio' : 'Engineering studio'), 56, 61, C.ink) + label('nacekepa.work', W - 56, 61, C.redline, 'end');

// Title block at the bottom of the sheet (like the one on a technical drawing).
function titleBlock(cells: [string, string][], y: number): string {
  const x0 = 28, w = W - 56, cw = w / cells.length; let s = `<line x1="${x0}" y1="${y}" x2="${W - 28}" y2="${y}" stroke="${C.ink}" stroke-width="1.5"/>`;
  cells.forEach(([k, v], i) => {
    const x = x0 + i * cw; if (i) s += `<line x1="${x.toFixed(1)}" y1="${y}" x2="${x.toFixed(1)}" y2="${H - 28}" stroke="${C.lineStrong}" stroke-width="1"/>`;
    s += label(k, x + 20, y + 32) + textBlock(wrap(v, 'mono', 22, cw - 40, 1), x + 20, y + 68, 'mono', 22, 26, C.ink);
  });
  return s;
}

export function projectCard(p: any, lang: Lang, sheetNo: string): string {
  const cat = CATS[p.category] ? CATS[p.category][lang] : p.category;
  const x = T[lang];
  const title = wrap(tl(p.title, lang), 'bold', 60, 600, 3);
  const descY = 190 + title.length * 66;
  const desc = wrap(tl(p.description, lang), 'med', 26, 600, 3);
  const cells: [string, string][] = [[x.pCategory, cat], [x.pYear, String(p.year)], [x.pMaterials, p.materials || '—'], [lang === 'sl' ? 'List' : 'Sheet', sheetNo]];
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${frame(lang)}` +
    `<rect x="720" y="81" width="${W - 28 - 720}" height="${470 - 81}" fill="url(#g)"/><line x1="720" y1="80" x2="720" y2="470" stroke="${C.line}" stroke-width="1"/>` +
    art(p.drawing || (CATS[p.category] && CATS[p.category].d) || 'cad', 740, 96, W - 28 - 760, 360) +
    label(sheetNo + ' · ' + cat + ' · ' + p.year, 56, 128, C.dimension) +
    textBlock(title, 56, 190, 'bold', 60, 66, C.ink) + textBlock(desc, 56, descY, 'med', 26, 34, C.muted) +
    titleBlock(cells, 470) + '</svg>';
}

export function postCard(n: any, lang: Lang): string {
  const title = wrap(tl(n.title, lang), 'bold', 60, 1040, 3);
  const descY = 206 + title.length * 66;
  const desc = wrap(tl(n.summary, lang), 'med', 26, 1040, 3);
  const date = String(n.date || '');
  const nice = /^\d{4}-\d{2}-\d{2}$/.test(date) ? (lang === 'sl' ? date.slice(8, 10).replace(/^0/, '') + '. ' + date.slice(5, 7).replace(/^0/, '') + '. ' + date.slice(0, 4) : new Date(date + 'T00:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })) : date;
  const cells: [string, string][] = [[lang === 'sl' ? 'Objavljeno' : 'Published', nice], [lang === 'sl' ? 'Avtor' : 'Author', 'Nace Kepa'], [lang === 'sl' ? 'Rubrika' : 'Section', lang === 'sl' ? 'Novice iz delavnice' : 'Workshop news']];
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${frame(lang)}` +
    label((lang === 'sl' ? 'Novice' : 'News') + ' · ' + date, 56, 128, C.dimension) +
    `<rect x="56" y="150" width="56" height="6" fill="${C.redline}"/>` +
    textBlock(title, 56, 206, 'bold', 60, 66, C.ink) + textBlock(desc, 56, descY, 'med', 26, 34, C.muted) +
    titleBlock(cells, 470) + '</svg>';
}

export function newsIndexCard(lang: Lang): string {
  const x = T[lang];
  const title = wrap(x.newsPageTitle, 'bold', 72, 1040, 2);
  const desc = wrap(x.newsLead, 'med', 28, 1040, 3);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${frame(lang)}` +
    `<rect x="28" y="81" width="${W - 56}" height="${470 - 81}" fill="url(#g)"/>` +
    label(lang === 'sl' ? 'Novice iz delavnice' : 'Workshop news', 56, 128, C.dimension) +
    textBlock(title, 56, 220, 'bold', 72, 78, C.ink) + textBlock(desc, 56, 220 + title.length * 78 + 10, 'med', 28, 36, C.muted) +
    titleBlock([[lang === 'sl' ? 'Rubrika' : 'Section', lang === 'sl' ? 'Novice' : 'News'], [lang === 'sl' ? 'Avtor' : 'Author', 'Nace Kepa'], ['RSS', lang === 'sl' ? '/news-sl.xml' : '/news.xml']], 470) + '</svg>';
}

export function renderPng(svg: string): Buffer {
  const r = new Resvg(svg, { fitTo: { mode: 'width', value: W }, font: { fontFiles: FONT_FILES, loadSystemFonts: false, defaultFontFamily: 'Schibsted Grotesk' }, background: C.paper });
  return r.render().asPng();
}
