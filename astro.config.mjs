// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { readFileSync } from 'node:fs';

// Landing pages (2026-11-01): every published project has a real page at /portfolio/<slug>/ and /sl/portfolio/<slug>/, every
// published news post at /news/<slug>/ and /sl/news/<slug>/ (src/pages/portfolio/[slug].astro, src/pages/news/[slug].astro
// and the /sl/ twins). They go into the sitemap; the old-slug redirects below now point at them.
const data = (f) => JSON.parse(readFileSync(new URL('./src/data/' + f, import.meta.url), 'utf8'));
const landingPaths = new Set(['/news/', '/sl/news/'].concat(
  ...data('projects.json').filter((p) => !p.hidden).map((p) => ['/portfolio/' + p.slug + '/', '/sl/portfolio/' + p.slug + '/']),
  ...data('news.json').filter((n) => !n.hidden && !n.draft && !(n.date && n.date > new Date().toISOString().slice(0, 10))).map((n) => ['/news/' + n.slug + '/', '/sl/news/' + n.slug + '/'])));

// Deployed at https://nacekepa.work/ via GitHub Pages with a custom domain (public/CNAME).
// The site is one page (src/pages/index.astro) with in-page sections; old URLs redirect into it
// (old /portfolio/<old-slug> addresses go to the project's landing page /portfolio/<new-slug>/).
export default defineConfig({
  site: 'https://nacekepa.work',
  trailingSlash: 'ignore',
  integrations: [sitemap({ filter: (page) => { const path = new URL(page).pathname; return path === '/' || path === '/sl/' || landingPaths.has(path); }, lastmod: new Date() })], // home pages + landing pages only (no redirect pages, no /admin); lastmod = build date (SEO package 2026-10-20); /sl/ is the Slovenian page (2026-10-21)
  // Never inline built scripts into the HTML: the Content-Security-Policy only trusts files from this site.
  vite: { build: { assetsInlineLimit: 0 } },
  redirects: {
    "/services": "/#services",
    "/portfolio": "/#work",
    "/skills": "/#skills",
    "/about": "/#about",
    "/order": "/#order",
    "/sl/services": "/#sl-services",
    "/sl/portfolio": "/#sl-work",
    "/sl/skills": "/#sl-skills",
    "/sl/about": "/#sl-about",
    "/sl/order": "/#sl-order",
    "/portfolio/backpack-buckle": "/portfolio/engineered-backpack-buckle/",
    "/sl/portfolio/backpack-buckle": "/sl/portfolio/engineered-backpack-buckle/",
    "/portfolio/bike-light-bracket": "/portfolio/replacement-bike-light-bracket/",
    "/sl/portfolio/bike-light-bracket": "/sl/portfolio/replacement-bike-light-bracket/",
    "/portfolio/blind-cord-cleat": "/portfolio/childproof-blind-cord-cleat/",
    "/sl/portfolio/blind-cord-cleat": "/sl/portfolio/childproof-blind-cord-cleat/",
    "/portfolio/cable-clip": "/portfolio/snap-on-desk-cable-clip/",
    "/sl/portfolio/cable-clip": "/sl/portfolio/snap-on-desk-cable-clip/",
    "/portfolio/charger-strain-relief": "/portfolio/laptop-charger-strain-relief/",
    "/sl/portfolio/charger-strain-relief": "/sl/portfolio/laptop-charger-strain-relief/",
    "/portfolio/cocktail-dispenser": "/portfolio/automated-cocktail-dispenser/",
    "/sl/portfolio/cocktail-dispenser": "/sl/portfolio/automated-cocktail-dispenser/",
    "/portfolio/door-sensor-bot": "/portfolio/door-open-telegram-bot/",
    "/sl/portfolio/door-sensor-bot": "/sl/portfolio/door-open-telegram-bot/",
    "/portfolio/door-stopper-wedge": "/portfolio/adjustable-door-wedge/",
    "/sl/portfolio/door-stopper-wedge": "/sl/portfolio/adjustable-door-wedge/",
    "/portfolio/drawer-divider": "/portfolio/modular-drawer-divider-system/",
    "/sl/portfolio/drawer-divider": "/sl/portfolio/modular-drawer-divider-system/",
    "/portfolio/drill-bit-rack": "/portfolio/magnetic-back-drill-bit-rack/",
    "/sl/portfolio/drill-bit-rack": "/sl/portfolio/magnetic-back-drill-bit-rack/",
    "/portfolio/fridge-thermometer": "/portfolio/wi-fi-fridge-thermometer/",
    "/sl/portfolio/fridge-thermometer": "/sl/portfolio/wi-fi-fridge-thermometer/",
    "/portfolio/headphone-hook": "/portfolio/under-desk-headphone-hook/",
    "/sl/portfolio/headphone-hook": "/sl/portfolio/under-desk-headphone-hook/",
    "/portfolio/heatset-wall-anchor": "/portfolio/heat-set-insert-wall-anchor/",
    "/sl/portfolio/heatset-wall-anchor": "/sl/portfolio/heat-set-insert-wall-anchor/",
    "/portfolio/hose-adapter": "/portfolio/garden-hose-universal-adapter/",
    "/sl/portfolio/hose-adapter": "/sl/portfolio/garden-hose-universal-adapter/",
    "/portfolio/laptop-riser": "/portfolio/ergonomic-laptop-riser/",
    "/sl/portfolio/laptop-riser": "/sl/portfolio/ergonomic-laptop-riser/",
    "/portfolio/magnetic-cable-holder": "/portfolio/magnetic-desk-cable-holder/",
    "/sl/portfolio/magnetic-cable-holder": "/sl/portfolio/magnetic-desk-cable-holder/",
    "/portfolio/phone-wall-dock": "/portfolio/bedside-phone-wall-dock/",
    "/sl/portfolio/phone-wall-dock": "/sl/portfolio/bedside-phone-wall-dock/",
    "/portfolio/scooter-grip-tpu": "/portfolio/tpu-scooter-handlebar-grip/",
    "/sl/portfolio/scooter-grip-tpu": "/sl/portfolio/tpu-scooter-handlebar-grip/",
    "/portfolio/screwdriver-rack": "/portfolio/wall-mount-screwdriver-rack/",
    "/sl/portfolio/screwdriver-rack": "/sl/portfolio/wall-mount-screwdriver-rack/",
    "/portfolio/shelf-bracket": "/portfolio/reinforced-shelf-bracket/",
    "/sl/portfolio/shelf-bracket": "/sl/portfolio/reinforced-shelf-bracket/",
    "/portfolio/smart-pet-feeder": "/portfolio/scheduled-pet-feeder/",
    "/sl/portfolio/smart-pet-feeder": "/sl/portfolio/scheduled-pet-feeder/",
    "/portfolio/tablet-stand": "/portfolio/adjustable-tablet-stand/",
    "/sl/portfolio/tablet-stand": "/sl/portfolio/adjustable-tablet-stand/",
    "/portfolio/tripod-qr-plate": "/portfolio/arca-swiss-quick-release-plate/",
    "/sl/portfolio/tripod-qr-plate": "/sl/portfolio/arca-swiss-quick-release-plate/",
    "/portfolio/vacuum-hose-adapter": "/portfolio/universal-vacuum-hose-adapter/",
    "/sl/portfolio/vacuum-hose-adapter": "/sl/portfolio/universal-vacuum-hose-adapter/",
    "/portfolio/washing-machine-knob": "/portfolio/replacement-washing-machine-knob/",
    "/sl/portfolio/washing-machine-knob": "/sl/portfolio/replacement-washing-machine-knob/",
    "/portfolio/whistle-440hz": "/portfolio/440-hz-precision-whistle/",
    "/sl/portfolio/whistle-440hz": "/sl/portfolio/440-hz-precision-whistle/"
  }
});
