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
| `src/site/content.js` | All site text (EN + SL), services, skills |
| `src/data/projects.json` | The projects (edited from `/admin/`) |
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

## Admin dashboard (projects, 3D models, photos)

Open **https://nacekepa.work/admin/** (not linked from the site, `noindex`).

It edits `src/data/projects.json` and stores files under `public/models/<project>/`, by committing
straight to this repo with your own GitHub token. GitHub Pages then rebuilds (about a minute); the
dashboard shows when the change is live.

**One-time setup: create the token**

1. GitHub → Settings → Developer settings → **Fine-grained tokens** → *Generate new token*
   (direct link: https://github.com/settings/personal-access-tokens/new).
2. Repository access: **Only select repositories → Nacek1314/nace-kepa-site**.
3. Permissions: **Contents: Read and write**, and **Actions: Read-only** (for the "Live" status).
4. Pick an expiry, generate, and paste the token into the dashboard's sign-in box.

The token is kept only in that browser (local storage) and only sent to api.github.com. Nothing
secret is stored in the repo. If a device is lost, revoke the token on GitHub.

**What you can do:** add, edit, hide, reorder and delete projects (EN + SL text, category, year,
materials, featured on home); attach a 3D model (STL, 3MF, OBJ, GLB/GLTF, up to 50 MB; visitors can
rotate it, and optionally download it); add photos (resized to 2000 px JPEG in the browser; the first
one is the cover on the project sheet).

## Project structure

```
src/pages/index.astro   the site (inlines src/site/*, projects from src/data/projects.json)
src/pages/admin.astro   the admin dashboard (src/site/admin.js)
src/data/projects.json  all projects, edited by the dashboard
src/site/viewer.js      3D model viewer (three.js), loaded only on project pages
src/pages/404.astro     not-found page
src/site/               content, app script, styles, drawings
public/                 CNAME, favicons, og.png, robots.txt, models/ (uploaded 3D models + photos)
cloudflare-worker/      order relay (email + Telegram); setup in its README
.github/workflows/      GitHub Pages deploy
```

## Adding a project

Use the admin dashboard, or edit `src/data/projects.json` by hand and push.
