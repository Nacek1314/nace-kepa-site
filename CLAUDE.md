# nacekepa.work — project rules for Claude

Studio website of Nace Kepa (one-person engineering studio, Škofja Loka): CAD, 3D printing, embedded / IoT, full custom
builds. Astro static site, deployed to GitHub Pages at https://nacekepa.work by `.github/workflows/deploy.yml` on every
push to `main` (about 1–2 minutes). Talk to Nace in **Slovenian**; code, comments, commit messages and the docs in this
repo stay in **English**.

## Read first, every session

1. `README.md` — how the site is built and where every feature lives.
2. `MAINTENANCE.md` — newest entries first. The section **"Standing instructions from Nace"** and every entry marked
   **"(Nace, live: …)"** are his decisions. They override anything older, including this file. Never undo them.

## Commands

```
npm ci
npx astro build        # must pass before anything is pushed (currently 84 pages)
npx astro preview      # serves dist/ on http://localhost:4321 for Playwright checks
```

## Where things are

- The site is one app rendered on every page: `src/site/Site.astro` inlines `page.css`, `components.css`, `drawings.js`,
  `qr.js`, `content.js` (all text, EN + SL), `app.js` (views, router, tools, order wizard). `prefs.js` runs in the `<head>`.
- Data: `src/data/projects.json`, `src/data/news.json`, `src/data/settings.json` — edited by Nace in `/admin/`
  (`src/site/admin.js`, `admin.css`).
- Real pages: `/`, `/sl/`, `/services/`, `/services/<id>/`, `/portfolio/`, `/portfolio/<slug>/`, `/news/`, `/news/<slug>/`,
  `/skills/`, `/about/`, `/glossary/` (+ `/sl/…`), built from `src/pages/**`; link-preview cards from `src/og/card.ts`.
- 3D viewer `src/site/viewer.js`, protected preview format `src/site/nkm.js`, order relay Worker `cloudflare-worker/`.

## Rules that never change

- **Never invent facts.** No made-up projects, clients, prices, reviews, numbers, certifications or machine specs. Use only
  what is already on the site or in the repo. If a feature needs data Nace has not given, build it so it shows nothing
  until he adds the data, and tell him.
- **Nace owns the content.** Do not edit `projects.json` or `news.json` beyond an obvious typo; never delete entries.
  Promotion, prices, FAQ and service texts in `settings.json` are his (admin › Settings).
- **Prices (Nace, 2026-11-26 and 2026-11-27):** there is no price list. The price-list tool is switched off
  (`PRICE_LIST = false` in `app.js`) — do not switch it back on. **No published rates anywhere:** not on the home page, the
  #services cards, the service sheets, the Studio profile, Find anything, the static snapshots, the structured data
  (no `priceSpecification`) or the link-preview cards. Never add a new place that shows a rate. The prices stay in
  `settings.json` and are used only by the estimate tools (quote estimate, series price, budget, material price, parts
  list) and the admin; leave those tools as they are. The promotion text stays. `scripts/checks/no-rates.cjs` checks this.
- **Home page (Nace, 2026-11-26):** it is laid out as a path to the order form; the headline is plain ink and says what
  the studio does. No coloured or underlined word in headlines. Do not move it back.
- **Design:** "workshop technical" drawing-sheet look — paper, graphite ink, blueprint grid, mono labels, one red accent
  `--redline`, NK monogram. Fonts Schibsted Grotesk + JetBrains Mono. No redesigns. Typography rules of the 2026-11-08
  "unslop pass" are deliberate (see `MAINTENANCE.md`): heading weights 600 / 500, no trailing period on titles, card hover
  is a border-colour step, one easing curve `--ease`.
- **Security:** keep the Content-Security-Policy (the inline script is pinned by a SHA-256 hash computed at build), the
  frame guard, the admin PIN vault / auto-lock and the model / photo protection. Do not touch `cloudflare-worker/` or
  `.github/workflows/` unless something there is broken.
- **Every feature** works in EN and SL, light and dark, desktop and phone, with the keyboard, and passes the CSP. No new
  dependencies, no external services, no new binary files. Keep it self-contained (one clearly named block of functions
  with a "To remove:" comment), as the existing features are.

## Before pushing

- Build passes. Every changed view is re-tested in Playwright (Chromium) on the local preview: 1280 px and 390 px, light
  and dark, `/` and `/sl/` — no JS errors, no failed requests, no horizontal scroll, no "undefined" text, one `<h1>`,
  order form walked through all 4 steps **without sending**. Google Fonts may be blocked in a cloud session; that is fine.
- `git pull --ff-only` (or fetch + rebase) **right before** pushing. Nace often commits live during the day; if a new
  commit arrived, read its `MAINTENANCE.md` entry, adapt the work to it, rebuild and re-test.
- Add a `MAINTENANCE.md` entry in the same commit: date, what was checked, bugs fixed, the improvement, the new feature
  (with how to remove it), ideas for next time. Update `README.md` when a feature is added.
- Commit message for the daily run: `maintenance: <short summary> + new: <feature>`, blank line,
  `Co-Authored-By: Claude <noreply@anthropic.com>`.
- After the push: wait for the GitHub Actions run, confirm it succeeded and the live page shows the change. If the deploy
  failed, `git revert --no-edit HEAD`, push, and report why.
