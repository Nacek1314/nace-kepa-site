// "No published rates" check (Nace's rule of 2026-11-27, see CLAUDE.md): the #services cards, the service sheets, the Studio
// profile, Find anything, the static snapshots and the structured data must not show a rate. The estimate tools are not checked.
// Run from the repo root after `npx astro build` with `npx astro preview` running:
//   NODE_PATH=$(npm root -g) node scripts/checks/no-rates.cjs
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const REPO = process.env.REPO || process.cwd(), B = process.env.BASE || 'http://localhost:4321';
let n = 0, fail = [];
const ok = (c, m) => { n++; if (!c) fail.push(m); };
const IDS = ['3d-design', '3d-printing', 'embedded-iot', 'full-builds'];
const PRICE = /€|EUR\b|\/ ?h\b|najmanjše naročilo|minimum order/i;
(async () => {
  // 1. built files: structured data + snapshot without JS
  const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(d, e.name)) : e.name.endsWith('.html') ? [path.join(d, e.name)] : []);
  const files = walk(REPO + '/dist');
  let ps = 0, ld = 0;
  for (const f of files) { const h = fs.readFileSync(f, 'utf8'); (h.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g) || []).forEach(b => { ld++; if (/priceSpecification|"price"|minPrice|priceCurrency/.test(b)) ps++; }); }
  ok(ld > 80, 'ld blocks found ' + ld); ok(ps === 0, 'priceSpecification in ' + ps + ' JSON-LD blocks');
  const br = await chromium.launch();
  for (const sl of [false, true]) {
    const pre = sl ? '/sl' : '';
    // snapshot (JS off)
    const c0 = await br.newContext({ javaScriptEnabled: false }); const p0 = await c0.newPage();
    for (const u of ['/', '/services/', ...IDS.map(i => '/services/' + i + '/'), '/about/', '/portfolio/']) {
      await p0.goto(B + pre + u); const txt = await p0.evaluate(() => document.body.innerText);
      ok(txt.length > 200, 'snapshot text ' + pre + u); ok(!PRICE.test(txt.replace('€40 service call','').replace(/40 € za servis[^.]*/,'')), 'snapshot has a price ' + pre + u + ' :: ' + (txt.match(PRICE) || [''])[0]);
      const d = await p0.evaluate(() => (document.querySelector('meta[name=description]') || {}).content || ''); ok(!/published prices|objavljene cene|€/.test(d), 'description ' + pre + u);
    }
    await c0.close();
    for (const w of [1280, 390]) for (const scheme of (w === 1280 ? ['light', 'dark'] : ['dark'])) {
      const tag = (sl ? 'SL ' : 'EN ') + w + ' ' + scheme + ' ';
      const ctx = await br.newContext({ viewport: { width: w, height: 844 }, colorScheme: scheme }); const page = await ctx.newPage();
      const errs = []; page.on('pageerror', e => errs.push(e.message));
      const go = async (h) => { await page.goto('about:blank'); await page.goto(B + pre + '/' + h); await page.waitForTimeout(400); };
      // home
      await go(''); let t = await page.evaluate(() => document.querySelector('#app').innerText);
      ok(!/€ ?\/ ?h|\d ?€/.test(t.replace(/[−-]\s?20 ?%/g, '')), tag + 'home has a rate');
      ok(/20 ?%/.test(t), tag + 'home promotion still shown');
      // #services cards
      await go('#services'); let cards = await page.$$eval('.nk-service', a => a.map(e => e.innerText));
      ok(cards.length === 4, tag + 'four service cards'); cards.forEach((c, i) => ok(!PRICE.test(c), tag + 'card ' + i + ' has a rate: ' + c.match(PRICE)));
      ok(await page.$('.svc-rate') === null, tag + '.svc-rate gone');
      // the estimate tool still prices
      const hasQuote = await page.evaluate(() => /Quote estimate|Ocena ponudbe/i.test(document.querySelector('#app').innerText)); ok(hasQuote, tag + 'quote estimate tool still there');
      // service sheets
      for (const id of IDS) {
        await go('#s-' + id); const side = await page.$eval('.sv-side', e => e.innerText).catch(() => null);
        ok(side !== null, tag + 'sheet ' + id + ' renders'); if (side === null) continue;
        ok(!PRICE.test(side), tag + 'sheet ' + id + ' glance has a rate');
        ok(await page.$$eval('.sv-side dl > div, .sv-side .nk-specs > div', a => a.length) === 2, tag + 'sheet ' + id + ' glance has 2 rows');
        const all = await page.$eval('.sv', e => e.innerText); ok(!/€/.test(all), tag + 'sheet ' + id + ' shows €');
        ok(!/undefined|NaN/.test(all), tag + 'sheet ' + id + ' undefined');
        const promo = /20 ?%/.test(all); ok(promo === (id === '3d-design' || id === '3d-printing'), tag + 'sheet ' + id + ' promotion ' + promo);
        const sw = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth); ok(sw <= 1, tag + 'sheet ' + id + ' hscroll');
      }
      // quote hand-off
      await go('#s-embedded-iot'); await page.click('.sv-side [data-hm-go]'); await page.waitForTimeout(400);
      ok(/#(en-|sl-)?order/.test(page.url()), tag + 'quote → order'); 
      // profile
      await go('#profile'); const pf = await page.$eval('#pf-sheet', e => e.innerText);
      ok(!PRICE.test(pf.replace(/Cene in roke potrdi ponudba|Prices and turnarounds[^.]*\./i, '')) , tag + 'profile has a rate: ' + pf.match(PRICE));
      ok(await page.$('[data-pf="pr"]') === null, tag + 'profile prices tick gone'); ok(await page.$('[data-pf="w"]') !== null, tag + 'profile work tick stays');
      ok(await page.$$eval('.pf-svc', a => a.length) === 4, tag + 'profile 4 services');
      await page.click('[data-pf-act="copy"]').catch(() => {}); await page.waitForTimeout(200);
      const txt = await page.$eval('#pf-text', e => e.textContent).catch(() => ''); const mail = decodeURIComponent(await page.$eval('#pf-mail', e => e.getAttribute('href')));
      ok(!/€/.test(txt) && !/€/.test(mail), tag + 'profile text / mail has €'); ok(mail.length > 300, tag + 'profile mail body');
      await page.uncheck('[data-pf="w"]'); await page.waitForTimeout(200); ok(/w=0/.test(page.url()) && !/pr=/.test(page.url()), tag + 'profile address ' + page.url());
      await go('#profile?s=cad,print&pr=0&w=0'); ok(await page.$$eval('.pf-svc', a => a.length) === 2, tag + 'old profile link with pr=0 opens');
      const lead = await page.$eval('.pf .lead', e => e.innerText); ok(!/costs|stane/.test(lead), tag + 'profile lead');
      // Find anything
      await go(''); await page.keyboard.press('Control+k'); await page.waitForSelector('#fx-q'); await page.fill('#fx-q', 'PETG'); await page.waitForTimeout(300);
      const fx = await page.$eval('#fx-list', e => e.innerText); ok(/PETG/.test(fx), tag + 'search finds PETG'); ok(!/€/.test(fx), tag + 'search shows €: ' + fx.slice(0, 120));
      await page.fill('#fx-q', sl ? 'tisk' : 'printing'); await page.waitForTimeout(300); ok(!/€ ?\/ ?[hg]/.test(await page.$eval('#fx-list', e => e.innerText)), tag + 'search service rows');
      ok(errs.length === 0, tag + 'JS errors: ' + errs.join(' | '));
      await ctx.close();
    }
  }
  await br.close();
  console.log(n + ' checks, ' + fail.length + ' failed'); fail.forEach(f => console.log('FAIL ' + f));
})();
