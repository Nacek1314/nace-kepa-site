# Maintenance log

Daily automated check of https://nacekepa.work (newest first). Each entry: what was checked,
bugs fixed, the one improvement, ideas for next time.

## 2026-10-04

**Checked:** build, home, #services, #work, #p-famfive, #p-door-open-telegram-bot, #news, #n-bambu-lab-x2d,
#skills, #about, #order (steps 1–3, validation, not submitted), /admin/ sign-in — 1280 px + 390 px, light + dark,
EN + SL. Last Actions run (0d93de3) succeeded; live site returns 200 (checked via the laptop). No JS errors, no CSP
violations, no 404s, no horizontal scroll, no broken images, no EN text on SL pages.

**Bugs fixed:** none found.

**Improvement:** "Skip to content" / "Preskoči na vsebino" link — the first Tab stop on every page, hidden until
focused; moves focus to `<main>` without changing the hash route (WCAG 2.4.1). `.skip` in `page.css`, `data-skip` in `app.js`.

**Innovation — Fit check on #services ("Will it fit the printer?" / "Ali gre v tiskalnik?"):** the visitor types the
length × width × height of a part (mm); it is checked against the Bambu Lab X2D build volume 256 × 256 × 260 mm
(from the X2D news post) in all six axis-aligned orientations. Shows "fits as entered", "fits when turned (X × Y × height)"
or "too big by up to N mm", with a top view and front view drawn to scale on the drawing-sheet grid. "Start a project with
this size" ticks 3D printing in the order form and pre-fills "Part size: L × W × H mm." in the project description.
EN + SL, light + dark, phone + desktop, keyboard (live result is `role="status"`).
*To remove:* delete the "Fit check" block in `app.js` (`BED` … `fitToOrder()`), the `fitChecker()` call in `views.services`,
the two `data-fit` handler lines, `fit:` in both languages in `content.js` and the `.fit-*` rules at the end of `page.css`.
*Next step:* if Nace gives the P1S build volume, check both printers; a link to the checker from the S-02 card / X2D post.

**Ideas for next time** (see also the list below)
- News photo `public/news/bambu-lab-x2d/*.jpg` is 1500×2000, 460 KB — admin could compress uploads further.

## Innovation ideas

Built: 2026-10-04 fit check (X2D build volume) on #services.

- Admin: checklist of projects missing photos / 3D model / Slovenian text / details (today all 29 have no photos and
  empty details — the checklist would show Nace exactly what to fill in).
- Admin: "Copy LinkedIn post" button for a news item (headline + summary + link, EN or SL).
- Material picker ("what should my part be printed in?") using only the materials and X2D facts already on the site.
- Search across projects and news (title, description, category) on #work.
- "Similar projects" row on project pages (same category).
- Atom feed for news (`/news.xml`, built at build time from news.json).
- Printable one-page project brief from the order wizard (print stylesheet only).

## 2026-10-03 (second run)

**Checked:** build, home, #services, #work, #p-famfive, #p-automated-cocktail-dispenser, #news,
#n-bambu-lab-x2d, #skills, #about, #order (steps 1–3, validation messages, not submitted), /admin/ sign-in —
1280 px + 390 px, light + dark, EN + SL. Last Actions run (d29de12) succeeded; live site returns 200 (checked
via the laptop). No JS errors, no CSP violations, no horizontal scroll, no clipped text, no broken images,
no EN text on SL pages (only format names like STEP / IGES).

**Bugs fixed:** none found.

**Improvement:** the browser tab / history title now follows the open view and language
(`FamFive · Nace Kepa`, `Projekti · Nace Kepa`, `Začni projekt · Nace Kepa`, …) instead of always
"Nace Kepa · Engineering Studio". Helps bookmarks, shared tabs and screen readers (WCAG 2.4.2).
`pageTitle()` in `app.js`; the static `<title>` in `index.astro` is unchanged.

**Ideas for next time**
- News photo `public/news/bambu-lab-x2d/*.jpg` is 1500×2000, 460 KB — the admin could resize/compress
  uploads (e.g. max 1600 px, quality ~80) to make the news page lighter on mobile.
- `meta description` / `og:*` are English only; an SL description can't be served from one static page
  without a separate `/sl/` HTML — only worth it if Slovene search traffic matters to Nace.
- Project sheets have no photos yet — real photos would help most (Nace adds via /admin/).

## 2026-10-03

**Checked:** build, home, #services, #work, #p-famfive, #p-scheduled-pet-feeder, #news, #n-bambu-lab-x2d,
#skills, #about, #order (all 4 steps on the local build, steps 1–3 only on purpose), /admin/ sign-in —
1280 px + 390 px, light + dark, EN + SL. No JS errors, no CSP violations, no horizontal scroll, no
clipped text, no broken images. (Live site and GitHub API are blocked from the cloud sandbox; checked via the laptop.)

**Bugs fixed**
- Occasional junk 404 for `/' + esc(asset(photos[0])) + '`: Chromium's preload scanner sometimes read the
  `<img src="…">` HTML strings inside the inlined script as real tags. All `'<img ` strings in `app.js` are now
  written as `'<' + 'img '`, so the scanner can't see a tag (no change in what is rendered).
- SL: the label above the order form was English ("Order · NK-Q") → now `orderLabel` in `content.js`
  ("Naročilo · NK-Q" on the Slovenian page).

**Improvement:** old `/portfolio/<old-slug>` and `/sl/portfolio/<old-slug>` links (29 projects × 2 languages)
now redirect to the matching project sheet `/#p-<new-slug>` / `/#sl-p-<new-slug>` instead of the project list.
Mapping checked one-to-one against `projects.json`; all 58 tested in Playwright.

**Ideas for next time**
- If a project slug is ever renamed in /admin/, its old redirect falls back to the home page — update `astro.config.mjs` then.
- SL process step "Test" could be "Testiranje" (Nace to decide; "Test" is also correct Slovene).
- `/admin/` is English-only (fine, it's only for Nace).
- Project sheets have no photos yet — real photos would help most (Nace adds via /admin/).

## 2026-10-02

**Checked:** build, home, #services, #work, project pages, #news, #n-bambu-lab-x2d, #skills, #about,
#order (4 steps, not submitted), /admin/ sign-in — 1280 px + 390 px, light + dark, EN + SL. Last
Actions run (5413037) succeeded. No horizontal scroll, no CSP violations.

**Bugs fixed**
- Every project page (`#p-<slug>`) was blank with a JS error: `projectView()` read `photos.length`
  before `var photos` was assigned (all projects have no 3D model, so that branch always ran).
- SL translations: footer "Contact"/"Order" labels, the "Skills" label on #skills, and
  "Slovenia" / "4 yrs" on #about and #skills were English on the Slovenian page.

**Improvement:** schema.org `ProfessionalService` JSON-LD in `index.astro` (name, Škofja Loka, email,
LinkedIn, the four services) so search engines can show the studio properly. Data block only — not
executed, so the CSP script hash is unaffected.

**Ideas for next time**
- Old `/portfolio/<old-slug>` redirects in `astro.config.mjs` all go to `/#work`; they could go to
  the matching `/#p-<slug>` now that project pages work (old slugs differ from new ones — map carefully).
- On reload, Chromium's preload scanner requests a junk URL (`' + esc(asset(photos[0])) + '`) from
  the inlined script text → harmless 404. Could be avoided by building that `src="` string differently.
- `/admin/` is English-only (fine, it's only for Nace).
- Project sheets have no photos yet — real photos would help most (Nace adds via /admin/).
