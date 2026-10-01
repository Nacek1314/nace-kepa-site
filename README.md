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
4. Pick an expiry, generate, paste the token into the dashboard and choose an admin PIN. Next time
   you only type the PIN.

The token is only sent to api.github.com and is stored encrypted with your PIN. Nothing secret is
stored in the repo. If a device is lost, revoke the token on GitHub.

**What you can do:** add, edit, hide, reorder and delete projects (EN + SL text, category, year,
materials, featured on home); attach a 3D model (STL, 3MF, OBJ, GLB/GLTF up to 50 MB); add photos (the first
one is the cover on the project sheet). Visitors open photos in a full-screen gallery and rotate models.

## Protection

- **3D models:** the dashboard converts each upload in your browser into a simplified (max 150,000
  triangles), quantised and scrambled `.nkm` preview. Only that is committed and served. Your original
  STL/3MF never leaves your computer, and the site has no download option for models.
- **Photos:** re-drawn in the browser before upload: resized to 2000 px, camera/GPS metadata removed,
  and watermarked (diagonal `NACEKEPA.WORK` repeat + NK corner mark). Originals are never uploaded.
- **On the site:** right-click saving, dragging and long-press saving of images, the 3D viewer and the
  gallery are blocked, and printing hides them. (A screenshot can't be prevented by any website.)
- **Admin:** the GitHub token is stored only encrypted (AES-GCM, key from your PIN via PBKDF2,
  600k rounds). Five wrong PINs erase it; the dashboard locks after 15 minutes idle.
  Without a PIN the token is kept in memory only.
- **Page security:** a Content-Security-Policy (as a meta tag, since GitHub Pages can't send headers)
  allows only this site's own scripts (the inline one pinned by SHA-256 hash), Google Fonts, the order
  Worker and, on /admin, api.github.com. Pages refuse to run inside another site's frame.

Note: this repository is public, so the published `.nkm` previews and watermarked photos are also visible
on GitHub. Your originals are never in it. To hide the repo too, make it private (GitHub Pages from a
private repo needs a paid GitHub plan).

## Project structure

```
src/pages/index.astro   the site (inlines src/site/*, projects from src/data/projects.json)
src/pages/admin.astro   the admin dashboard (src/site/admin.js)
src/data/projects.json  all projects, edited by the dashboard
src/site/viewer.js      3D model viewer (three.js), loaded only on project pages
src/site/nkm.js         protected preview-mesh format (simplify, encode, decode)
src/pages/404.astro     not-found page
src/site/               content, app script, styles, drawings
public/                 CNAME, favicons, og.png, robots.txt, models/ (uploaded 3D models + photos)
cloudflare-worker/      order relay (email + Telegram); setup in its README
.github/workflows/      GitHub Pages deploy
```

## Adding a project

Use the admin dashboard, or edit `src/data/projects.json` by hand and push.
