// Link-preview images for the landing pages (SEO package, 2026-11-02): one PNG per published project and news post, in both
// languages, plus the two /news/ index pages. Built from src/og/card.ts; Site.astro points og:image / twitter:image here.
import type { APIRoute } from 'astro';
import projects from '../../data/projects.json';
import news from '../../data/news.json';
import { projectCard, postCard, newsIndexCard, renderPng, type Lang } from '../../og/card';

const TODAY = new Date().toISOString().slice(0, 10);
const shown = (projects as any[]).filter((p) => !p.hidden);
const sheetNo = (p: any) => 'NK-' + String(p.year).slice(2) + '-' + String(shown.indexOf(p) + 1).padStart(2, '0'); // same as sheetNo() in app.js
const posts = (news as any[]).filter((n) => !n.hidden && !n.draft && !(n.date && n.date > TODAY));

export function getStaticPaths() {
  const out: { params: { path: string }; props: any }[] = [];
  for (const lang of ['en', 'sl'] as Lang[]) {
    const pre = lang === 'sl' ? 'sl/' : '';
    out.push({ params: { path: pre + 'news' }, props: { kind: 'news', lang } });
    shown.forEach((p) => out.push({ params: { path: pre + 'portfolio/' + p.slug }, props: { kind: 'project', lang, item: p } }));
    posts.forEach((n) => out.push({ params: { path: pre + 'news/' + n.slug }, props: { kind: 'post', lang, item: n } }));
  }
  return out;
}

export const GET: APIRoute = ({ props }) => {
  const { kind, lang, item } = props as { kind: string; lang: Lang; item?: any };
  const svg = kind === 'project' ? projectCard(item, lang, sheetNo(item)) : kind === 'post' ? postCard(item, lang) : newsIndexCard(lang);
  return new Response(new Uint8Array(renderPng(svg)), { headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=86400' } });
};
