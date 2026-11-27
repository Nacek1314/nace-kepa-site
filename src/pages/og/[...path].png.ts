// Link-preview images for the landing pages (SEO package, 2026-11-02): one PNG per published project and news post, in both
// languages, plus the two /news/ index pages. Built from src/og/card.ts; Site.astro points og:image / twitter:image here.
import type { APIRoute } from 'astro';
import projects from '../../data/projects.json';
import news from '../../data/news.json';
import { projectCard, postCard, newsIndexCard, sectionCard, serviceCard, renderPng, type Lang } from '../../og/card';
import content from '../../site/content.js?raw';
import settings from '../../data/settings.json';

// Service sheets (2026-11-26): one card per service page — code, title, text, turnaround (no prices on the card).
const SERVICES: any[] = new Function(content + '\nreturn SERVICES;')();
(() => { const ov: any = (settings as any).services || {}; SERVICES.forEach((s: any) => { const o = ov[s.key]; if (o && o.time && (o.time.en || o.time.sl)) s.time = { en: o.time.en || o.time.sl, sl: o.time.sl || o.time.en }; }); })();
const TODAY = new Date().toISOString().slice(0, 10);
const shown = (projects as any[]).filter((p) => !p.hidden);
const sheetNo = (p: any) => 'NK-' + String(p.year).slice(2) + '-' + String(shown.indexOf(p) + 1).padStart(2, '0'); // same as sheetNo() in app.js
const posts = (news as any[]).filter((n) => !n.hidden && !n.draft && !(n.date && n.date > TODAY));

export function getStaticPaths() {
  const out: { params: { path: string }; props: any }[] = [];
  for (const lang of ['en', 'sl'] as Lang[]) {
    const pre = lang === 'sl' ? 'sl/' : '';
    out.push({ params: { path: pre + 'news' }, props: { kind: 'news', lang } });
    ([['services', 'services'], ['portfolio', 'work'], ['skills', 'skills'], ['about', 'about'], ['glossary', 'glossary']] as const).forEach(([dir, view]) => out.push({ params: { path: pre + dir }, props: { kind: 'section', lang, view } })); // section pages (2026-11-25)
    SERVICES.filter((s) => /^[a-z0-9-]+$/.test(String(s.id))).forEach((s) => out.push({ params: { path: pre + 'services/' + s.id }, props: { kind: 'service', lang, item: s } }));
    shown.forEach((p) => out.push({ params: { path: pre + 'portfolio/' + p.slug }, props: { kind: 'project', lang, item: p } }));
    posts.forEach((n) => out.push({ params: { path: pre + 'news/' + n.slug }, props: { kind: 'post', lang, item: n } }));
  }
  return out;
}

export const GET: APIRoute = ({ props }) => {
  const { kind, lang, item, view } = props as { kind: string; lang: Lang; item?: any; view?: any };
  const svg = kind === 'service' ? serviceCard(lang, item) : kind === 'project' ? projectCard(item, lang, sheetNo(item)) : kind === 'post' ? postCard(item, lang) : kind === 'section' ? sectionCard(lang, view, shown.length) : newsIndexCard(lang);
  return new Response(new Uint8Array(renderPng(svg)), { headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=86400' } });
};
