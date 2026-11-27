// Page sweep for nacekepa.work (used by the daily maintenance run).
// Opens every main view at 1280 px and 390 px, light and dark, in English and Slovenian, and reports JS errors, failed
// requests, HTTP errors, horizontal scrolling, broken images, "undefined" text, a wrong page language and views without
// exactly one <h1>. (The 404 page reports "H1 :: 2" by design: it holds an English and a Slovenian heading, one hidden.)
//
// Run from the repo root after `npx astro build` with `npx astro preview` running:
//   NODE_PATH=$(npm root -g) node scripts/checks/sweep.cjs            (Playwright installed globally, as in Claude's cloud)
//   BASE=https://nacekepa.work node scripts/checks/sweep.cjs          (the live site)
// Playwright is not a dependency of this repo on purpose; it only has to be available to Node.
const { chromium } = require('playwright');
const REPO = process.env.REPO || process.cwd(); // the repo folder (run from the repo root, or set REPO)
const B = process.env.BASE || 'http://localhost:4321';
const projects = require(REPO + '/src/data/projects.json').filter(p=>!p.hidden);
const news = require(REPO + '/src/data/news.json').filter(n=>!n.hidden);
const withModel = projects.find(p=>p.model) || projects[0];
const paths = ['', '#services', '#work', '#p-'+projects[0].slug, '#p-'+withModel.slug, '#news', '#n-'+news[0].slug, '#skills', '#about', '#order', '#s-3d-printing', '#s-full-builds', '#profile', '#mine', '#studio', '#gift', '#contact', '#glossary', '#glossary?t=step'];
const extra = ['/services/3d-design/','/services/embedded-iot/','/services/','/portfolio/','/skills/','/about/','/glossary/','/news/','/portfolio/'+projects[0].slug+'/','/news/'+news[0].slug+'/','/admin/','/nope-404'];
(async () => {
  const br = await chromium.launch();
  const problems = [];
  for (const w of [1280, 390]) for (const scheme of ['light','dark']) for (const lp of ['/', '/sl/']) {
    const ctx = await br.newContext({ viewport: { width: w, height: w===390?844:800 }, colorScheme: scheme });
    const page = await ctx.newPage();
    let cur = '';
    page.on('pageerror', e => problems.push([cur, 'JSERR', e.message]));
    page.on('console', m => { if (m.type()==='error' && !/fonts\.g|ERR_|Failed to load resource/.test(m.text())) problems.push([cur,'CONSOLE',m.text().slice(0,200)]); });
    page.on('requestfailed', r => { if (!/fonts\.(googleapis|gstatic)/.test(r.url())) problems.push([cur,'REQFAIL',r.url()]); });
    page.on('response', r => { if (r.status()>=400 && !/fonts\./.test(r.url()) && !/nope-404/.test(r.url())) problems.push([cur,'HTTP'+r.status(),r.url()]); });
    const list = paths.map(p=>lp+p).concat(extra.map(e=> (lp==='/sl/' && !/admin|nope/.test(e) ? '/sl'+e : e)));
    for (const p of list) {
      cur = `${w} ${scheme} ${p}`;
      await page.goto('about:blank');
      await page.goto(B + p, { waitUntil: 'load' }).catch(e=>problems.push([cur,'GOTO',e.message]));
      await page.waitForTimeout(450);
      const r = await page.evaluate(() => {
        const de = document.documentElement;
        const imgs = [...document.images].filter(i => i.complete && i.naturalWidth === 0 && i.getAttribute('src')).map(i=>i.src);
        const wide = [];
        if (de.scrollWidth > de.clientWidth + 1) { document.querySelectorAll('body *').forEach(el => { const b = el.getBoundingClientRect(); if (b.right > de.clientWidth + 2 && b.width>0 && wide.length<4) wide.push(el.tagName+'.'+el.className+' '+Math.round(b.right)); }); }
        return { sw: de.scrollWidth, cw: de.clientWidth, imgs, wide, lang: de.lang, h1: document.querySelectorAll('h1').length, title: document.title, und: /undefined|\[object Object\]|NaN/.test(document.querySelector('#app')?.innerText||'') };
      });
      if (r.sw > r.cw + 1) problems.push([cur, 'HSCROLL', r.sw+'>'+r.cw+' '+r.wide.join(' | ')]);
      if (r.imgs.length) problems.push([cur, 'IMG', r.imgs.join(',')]);
      if (r.und) problems.push([cur, 'UNDEF-TEXT', '']);
      if (r.h1 !== 1 && !/admin/.test(p)) problems.push([cur, 'H1', String(r.h1)]);
      if (!/admin|nope/.test(p) && r.lang !== (lp==='/sl/'?'sl':'en')) problems.push([cur,'LANG',r.lang]);
    }
    await ctx.close();
  }
  await br.close();
  console.log(problems.length + ' problems'); const seen = {}; problems.forEach(p => { const k = p[1]+p[2]; seen[k] = (seen[k]||0)+1; if (seen[k]<=2) console.log(p.join(' :: ')); });
})();
