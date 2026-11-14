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

The site is a single page: `src/site/Site.astro` inlines the plain HTML/CSS/JS in `src/site/`. It is rendered twice —
`src/pages/index.astro` (English, `/`) and `src/pages/sl/index.astro` (Slovenian, `/sl/`, starts in Slovenian). The address
follows the language: switching to Slovenian moves the page to `/sl/` + the same section (and back), and the EN / SL switch
is a plain link to the other language's address (`langPath()` in `app.js`):

| File | What |
| --- | --- |
| `src/site/content.js` | All site text (EN + SL), services, skills |
| `src/data/projects.json` | The projects (edited from `/admin/`) |
| `src/site/app.js` | Rendering, page sections (`#services`, `#work`, …), the order wizard |
| `src/site/page.css` | Layout and colour tokens (light + dark) |
| `src/site/components.css` | Component styles — same as the nacekepa.work design system |
| `src/site/drawings.js` | The line drawings on project sheets |
| `src/site/qr.js` | QR-code encoder (no dependency) — "Scan to open" codes on sheets, posts, printed tools, the portfolio set and the vCard contact card; QR downloads in the admin |

Every published project also has its own page at `/portfolio/<slug>/` (Slovenian: `/sl/portfolio/<slug>/`) and every news
post at `/news/<slug>/` (`/sl/news/<slug>/`) — `src/pages/portfolio/[slug].astro`, `src/pages/news/[slug].astro` and their `/sl/`
twins render the same site with that sheet's own title, description, link preview and structured data, and open it. These
are the addresses the "Share this sheet" box, the admin and the feed hand out. Each page's link preview is its first photo or, without
photos, a card drawn at build time from the sheet (`/og/portfolio/<slug>.png`, `/og/news/<slug>.png`, `/og/sl/…`) — see
`src/og/card.ts`; the admin Overview links to every card ("Card ↗").

`#studio` ("Part studio") ends with a drawing sheet **NK-D**: an A4 first-angle drawing of the visitor's part (three views, overall
dimensions, title block) that prints on its own or downloads as SVG — `dwBox()` in `src/site/app.js`. Every tool on `#services` prints
alone from its address (`#services?tool=prices`) or its "Print this tool" button.

`#services?tool=parts` ("Parts list", sheet **NK-L**) takes several different parts — size, material, quantity — and gives each line the fit check,
plates, weight, time and price, totals them and hands the list to the order form (`bmBox()` in `src/site/app.js`; kept in the browser, localStorage `nk-parts`).
"From your files" under the list takes several STL / 3MF / OBJ files at once and adds one line per file — bounding box, and the mesh's own
volume for weight, time and price — read in the browser like the file check, nothing uploaded (`bmFiles()`).
Under the list, **Plate layout NK-N** packs the whole order on the X2D plates (maximal-rectangles nesting with 90° turns) and draws one top
view per plate; the NK-L sheet, the copied text and the brief carry the mixed plate count (`pnNest()` … `pnInner()` in `src/site/app.js`).

**Find anything** (Ctrl / Cmd + K, or the magnifier in the header) is one search box over the whole site — pages, tools, services, project
sheets, news, skills, FAQ answers and a few actions, in EN or SL words (`fxOpen()` in `src/site/app.js`). On `#skills`, a term the project
sheets mention links to those sheets with their count, and each group ends with its service and project categories (`skTerms()` / `skFoot()`).

**Presentation** ("▶ Present" in the View row of `#work`, "Present" on the shortlist, or a link such as `#work?cat=IoT&show=1`) shows the
project sheets one at a time on the whole screen — arrow keys / swipe, auto-advance, full screen, shortlist star (`pzOpen()` in
`src/site/app.js`). Find anything also finds the material picker's materials and the price-list rows.

**Shared selection**: "Copy link" in the shortlist box on `#work` gives `#work?list=slug,slug` — the link opens those sheets as a box
above the work (present, compare, add to the visitor's own shortlist, start a project; `&show=1` presents at once) — `sxBox()` in
`src/site/app.js`. A project sheet's spec table also names its service and the Skills terms it mentions (`sdRows()`).

`#mine` ("My corner") lists what a visitor saved in their browser — shortlist, unfinished brief, saved comparisons, Part
studio sheets and price estimates (localStorage `nk-shortlist`, `nk-order-draft`, `nk-mine`) — with print and text export
and a "forget everything" button. Nothing is sent to the studio until it goes into a brief. Old URLs (`/services`, `/portfolio/<old-slug>`,
`/sl/...`) redirect to the matching section or landing page (see `astro.config.mjs`).

## How orders work

The order wizard POSTs the brief to the Cloudflare Worker in `cloudflare-worker/`, which emails it
(Resend) and/or sends it to Telegram. All keys live as Worker secrets — nothing secret is in this repo
or in the page. The Worker URL comes from the `PUBLIC_ORDER_ENDPOINT` repository variable at build time.
If it isn't set or the Worker is down, the visitor gets the brief to copy and send by email.

## Deploy

Push to `main`. GitHub Actions builds and publishes to GitHub Pages.

In repository settings: **Pages → Source = GitHub Actions**.

## Admin dashboard (projects, 3D models, photos, news)

Open **https://nacekepa.work/admin/** (not linked from the site, `noindex`).

It edits `src/data/projects.json` and `src/data/news.json` and stores files under `public/models/<project>/`
and `public/news/<post>/`, by committing
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

**Overview:** the dashboard opens on the *Overview* tab — content health (photos, models, materials, details, Slovenian text,
with jumps to the To do list), what the site currently shows from Settings (price list, estimate, promotion, gift cards, FAQ,
Google link) and one row per page with its description length, Slovenian text and link-preview image, plus "Open ↗" / "Copy link".

**Settings:** the *Settings* tab edits `src/data/settings.json` — hourly rates and 3D-printing prices (the price list and
the quote estimate on `/#services`), print parameters (time / material estimate in the Part studio), the promotion banner,
gift-card amounts, the FAQ, links and the services' turnaround + "What I need" / "What you get" lists (empty = the text built
into the site). Empty numbers hide the matching feature on the site.

**Quote:** the *Quote* tab writes a quote NK-O from the Settings prices (hours, printed parts, custom lines → A4 sheet, print /
PDF, copy, e-mail; kept in the browser only). *From a brief* at its top takes a pasted enquiry (the e-mail or Telegram text, EN
or SL) and pre-fills a new quote: client, e-mail, language, reference, one line per service and per printed part, with the
weight, print time, material, rush and promotion the brief already states; what is missing is listed to fill in by hand.

**Jobs:** the *Jobs* tab is a board of every job — Enquiry → Quoted → In progress → Delivered (or declined) — with client, due
date (overdue / due in N days), services, a checklist of the workshop steps (the process steps of the home page, filtered by the
job's services), the parts and notes, and a printable A4 **job card NK-J** (the traveller that goes next to the printer). A job starts
blank, from a pasted brief (*From a brief*) or from the quote on screen (*Start a job* in the Quote tab). Jobs are kept in the
browser only (localStorage), like the quotes.

**Table:** the *Table* tab shows all projects as one spreadsheet (category, year, materials, featured, hidden): edit
cells directly, tick rows to change them together, or copy the table to Excel and paste it back.

**News:** the *News* tab adds posts with an EN + SL headline, summary and article (blank line =
new paragraph, lines starting with `- ` become a list), a date, photos, *pinned* and *draft*. The newest
three appear on the home page; all are at `/news/` (and `/#news`), each at `/news/<url-name>/` (also `/#n-<url-name>`).
Three templates (new machine, finished project, material in practice) give a new post a skeleton to fill in; the toolbar
above the article inserts links, lists and a project's page link; a post dated in the future is *scheduled* and goes live
with the first site build on that day. On the site, #news gets a year strip once there is more than one year of posts, and a
post that names a project shows that project's sheet underneath.

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
src/site/Site.astro     the site (inlines src/site/*, projects from src/data/projects.json)
src/pages/index.astro   English page (/) · src/pages/sl/index.astro Slovenian page (/sl/)
src/pages/portfolio/    project landing pages /portfolio/<slug>/ · src/pages/news/ news landing pages /news/<slug>/ (+ sl/ twins)
src/pages/admin.astro   the admin dashboard (src/site/admin.js)
src/data/projects.json  all projects, edited by the dashboard
src/data/news.json      news posts, edited by the dashboard
src/data/settings.json  prices, print parameters, promotion, gift cards, FAQ, links — edited by the dashboard
src/site/viewer.js      3D model viewer (three.js), loaded only on project pages
src/site/nkm.js         protected preview-mesh format (simplify, encode, decode)
src/pages/og/           link-preview cards /og/…png, drawn at build from src/og/card.ts (+ bundled fonts)
src/pages/404.astro     not-found page
src/site/               content, app script, styles, drawings, qr.js (QR encoder)
public/                 CNAME, favicons, og.png, robots.txt, models/ (uploaded 3D models + photos)
cloudflare-worker/      order relay (email + Telegram); setup in its README
.github/workflows/      GitHub Pages deploy
```

## Adding a project

Use the admin dashboard, or edit `src/data/projects.json` by hand and push.
