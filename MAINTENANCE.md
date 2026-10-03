# Maintenance log

Daily automated check of https://nacekepa.work (newest first). Each entry: what was checked,
bugs fixed, the one improvement, ideas for next time.

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
