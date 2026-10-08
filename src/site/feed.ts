// Atom feed of the news posts, built at build time from src/data/news.json (published posts only).
// Served as /news.xml (English) and /news-sl.xml (Slovenian) by src/pages/news.xml.ts and src/pages/news-sl.xml.ts.
// To remove the feed: delete this file, those two pages, the two <link rel="alternate"> tags in index.astro,
// feedBox() + its call in views.news + the data-feed-copy line in app.js, feed: in content.js and the .feed-* CSS.
import news from '../data/news.json';

const SITE = 'https://nacekepa.work';
const x = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string);
const asset = (p: string) => SITE + '/' + String(p).replace(/^\/+/, '').split('/').map(encodeURIComponent).join('/');
// Same text rules as richText() in app.js: blank line = paragraph, lines starting with "- " = list.
const rich = (s: string) => String(s || '').split(/\n{2,}/).map((block) => {
  const lines = block.split('\n');
  if (lines.every((l) => /^\s*-\s+/.test(l))) return '<ul>' + lines.map((l) => '<li>' + x(l.replace(/^\s*-\s+/, '')) + '</li>').join('') + '</ul>';
  return '<p>' + lines.map(x).join('<br>') + '</p>';
}).join('');

export function atom(lang: 'en' | 'sl'): Response {
  const L = (v: any) => (v && typeof v === 'object' ? v[lang] || v.en || '' : v || '');
  const posts = (news as any[]).filter((n) => !n.hidden).sort((a, b) => String(b.date).localeCompare(String(a.date)));
  const self = SITE + (lang === 'sl' ? '/news-sl.xml' : '/news.xml');
  const home = SITE + '/#' + lang + '-news';
  const stamp = (d: string) => (/^\d{4}-\d{2}-\d{2}$/.test(d) ? d + 'T12:00:00Z' : new Date().toISOString());
  const updated = posts.length ? stamp(posts[0].date) : '2026-10-01T12:00:00Z';
  const entries = posts.map((n) => {
    const url = SITE + '/#' + lang + '-n-' + n.slug;
    const img = (n.photos || []).length ? '<p><img src="' + x(asset(n.photos[0])) + '" alt=""></p>' : '';
    return '  <entry>\n' +
      '    <id>tag:nacekepa.work,2026:news/' + x(n.slug) + '</id>\n' +
      '    <title>' + x(L(n.title)) + '</title>\n' +
      '    <link rel="alternate" type="text/html" href="' + x(url) + '"/>\n' +
      '    <published>' + stamp(n.date) + '</published>\n' +
      '    <updated>' + stamp(n.date) + '</updated>\n' +
      '    <summary>' + x(L(n.summary)) + '</summary>\n' +
      '    <content type="html">' + x(img + rich(L(n.body))) + '</content>\n' +
      '  </entry>\n';
  }).join('');
  const body = '<?xml version="1.0" encoding="utf-8"?>\n' +
    '<feed xmlns="http://www.w3.org/2005/Atom" xml:lang="' + lang + '">\n' +
    '  <id>' + self + '</id>\n' +
    '  <title>' + x(lang === 'sl' ? 'Nace Kepa · Novice iz delavnice' : 'Nace Kepa · News from the workshop') + '</title>\n' +
    '  <subtitle>' + x(lang === 'sl' ? 'Novi stroji, materiali in zaključeni projekti.' : 'New machines, materials and finished jobs.') + '</subtitle>\n' +
    '  <link rel="self" type="application/atom+xml" href="' + self + '"/>\n' +
    '  <link rel="alternate" type="text/html" href="' + home + '"/>\n' +
    '  <updated>' + updated + '</updated>\n' +
    '  <author><name>Nace Kepa</name><uri>' + SITE + '/</uri></author>\n' +
    '  <icon>' + SITE + '/apple-touch-icon.png</icon>\n' +
    entries +
    '</feed>\n';
  return new Response(body, { headers: { 'Content-Type': 'application/atom+xml; charset=utf-8' } });
}
