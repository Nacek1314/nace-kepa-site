# Nace Kepa — engineering studio site

Portfolio + project order site for Nace Kepa: CAD design, 3D printing,
embedded/IoT, and full custom builds. A single static page built with **Astro**,
deployed free to **GitHub Pages** at https://nacekepa.work.

## Local development

```powershell
npm install
npm run dev
```

Open http://localhost:4321/.

The site is a single page: `src/pages/index.astro` inlines the plain HTML/CSS/JS in `src/site/`:

| File | What |
| --- | --- |
| `src/site/content.js` | All text (EN + SL), services, the 29 projects, skills |
| `src/site/app.js` | Rendering, page sections (`#services`, `#work`, …), the order wizard |
| `src/site/page.css` | Layout and colour tokens (light + dark) |
| `src/site/components.css` | Component styles — same as the nacekepa.work design system |
| `src/site/drawings.js` | The line drawings on project sheets |

Old URLs (`/services`, `/portfolio/...`, `/sl/...`) redirect to the matching section (see `astro.config.mjs`).

## How orders work

The order wizard POSTs the brief to the Cloudflare Worker in `cloudflare-worker/`, which emails it
(Resend) and/or sends it to Telegram. All keys live as Worker secrets — nothing secret is in this repo
or in the page. The Worker URL comes from the `PUBLIC_ORDER_ENDPOINT` repository variable at build time.
If it isn't set or the Worker is down, the visitor gets the brief to copy and send by email.

## Deploy

Push to `main`. GitHub Actions builds and publishes to GitHub Pages.

In repository settings: **Pages → Source = GitHub Actions**.

## Project structure

```
src/pages/index.astro   the site (inlines src/site/*)
src/pages/404.astro     not-found page
src/site/               content, app script, styles, drawings
public/                 CNAME, favicon, robots.txt
cloudflare-worker/      order relay (email + Telegram); setup in its README
.github/workflows/      GitHub Pages deploy
```

## Adding a project

Add a line to `PROJECTS` in `src/site/content.js`:
`['Title EN', 'Naslov SL', 2026, 'CAD' | 'Mechanical' | 'IoT' | 'Embedded', 'Description EN', 'Opis SL']`.
Push to `main`.
