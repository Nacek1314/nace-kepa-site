# Maintenance log

Daily automated check of https://nacekepa.work (newest first). Each entry: what was checked,
bugs fixed, the one improvement, ideas for next time.

## 2026-10-09

**Checked:** build, home, #services, #work, #p-famfive, #news, #n-bambu-lab-x2d, #skills, #about, #order (all 4 steps on
the local build, no endpoint → nothing sent), /admin/ sign-in — 1280 px + 390 px, light + dark, EN + SL. Last Actions run
(cab3fad) succeeded; live site checked via the laptop. No JS errors, no CSP violations, no 404s, no horizontal scroll, no
broken images, no EN text on SL pages.

**Bugs fixed:** none found.

**Improvement:** the home page news block now always links to #news ("All news · N" / "Vse novice · N") — before, the
button only appeared with more than 3 posts, so with 1 post there was no way from the home page to the news page (and its
Follow box) except the menu. `views.home` in `app.js`.

**Innovation — "Print this sheet" / "Natisni ta list" on every project sheet (`#p-<slug>`) and news post (`#n-<slug>`),
under "Share this sheet":** a button that opens the browser's print dialog with a clean A4 drawing sheet: logo, sheet
number, title, description, specs/details (or the article), "Online: https://nacekepa.work/#en-p-<slug>" so a printed copy
leads back to the site, and the footer title block with the e-mail and date. Menu, buttons, share box, similar projects,
CTA band, photos and the 3D model are left out (photos/3D stay protected); always light colours, even in dark mode. The same
print rules apply to Ctrl+P on any page. Useful for clients who take a sheet to a meeting or pass it to a colleague. Tested:
EN + SL, light + dark, 1280 + 390 px, keyboard (Tab → Enter), `window.print` call, print-media layout and A4 PDF output.
*To remove:* delete the "Print this sheet" block in `app.js` (`printBox()` … `printSheet()`), the two `printBox(...)` calls
in `projectView()` / `postView()`, the `data-print` line in the click handler, `print:` in both languages in `content.js`
and the "Print this sheet" rules at the end of `page.css` (the older one-line `@media print` rule that hides photos stays).
*Next step:* once projects have photos, an optional "include first photo" checkbox (would need Nace's OK, photos are protected now).

**Ideas for next time** (added to the list below)
- Public: "Ask about this project" — mailto link on project sheets with the sheet number in the subject.
- Admin: character counter + warning when a news summary is longer than what fits the news card / link preview.
- Public: "Back to top" mono link in the footer title block on long pages (phone).

## 2026-10-08

**Checked:** build, home, #services, #work, #p-famfive, #news, #n-bambu-lab-x2d, #skills, #about, #order (all 4 steps on
the local build, no endpoint → nothing sent), /admin/ sign-in — 1280 px + 390 px, light + dark, EN + SL. Last Actions run
(b2d76a7) succeeded; live site returns 200 and shows yesterday's "Share this sheet" (checked via the laptop). No JS
errors, no CSP violations, no 404s, no horizontal scroll, no broken images, no EN text on SL pages.

**Bugs fixed:** none found.

**Improvement:** news dates are now machine-readable `<time datetime="YYYY-MM-DD">` on the news cards (home + #news) and
in the header of each post (search engines and screen readers get the exact date; looks the same). `timeTag()` in
`app.js`; `head()` got an optional `labelHtml` argument for it.

**Innovation — Atom news feed + "Follow the news" box (`/news.xml` EN, `/news-sl.xml` SL; box at the bottom of #news):**
both feeds are built at build time from `news.json` (published posts only, newest first): title, summary, full article
(same paragraph/list rules as the site), first photo, date, and a link that opens the post in the right language
(`#en-n-<slug>` / `#sl-n-<slug>`). Every time Nace publishes a post in /admin/, the feeds update with the rebuild.
Feed readers find them automatically (two `<link rel="alternate" type="application/atom+xml">` in `<head>`). The box on
#news ("Follow the news · Atom feed" / "Spremljajte novice · vir Atom") shows the feed link for the current language in
a read-only field, "Copy feed link" (clipboard; on failure the link is selected with a "press Ctrl+C" message;
`role="status"`) and "Open the feed". Tested: EN + SL, light + dark, 1280 + 390 px, keyboard, clipboard content,
fallback path, both XML files parse, link targets open the right post.
*To remove:* delete `src/site/feed.ts`, `src/pages/news.xml.ts`, `src/pages/news-sl.xml.ts`, the two
`<link rel="alternate" … atom+xml>` lines in `index.astro`, the "Follow the news" block in `app.js` (`feedUrl()` …
`feedCopy()`), the `feedBox()` call in `views.news`, the `data-feed-copy` line in the click handler, `feed:` in both
languages in `content.js` and the "Follow the news" rules at the end of `page.css`.
*Next step:* a small "Follow" link next to "All news" on the home page; a feed of new projects once Nace adds photos.

**Ideas for next time** (added to the list below)
- Public: "Last updated" line on #work (newest project year / post date), from data already in the repo.
- Admin: after publishing a news post, show "Live in the feed" once `/news.xml` contains the slug.
- Public: anchor links on headings inside long news articles (copy link to a section).
- Public: "Ask about this project" — mailto link on project sheets with the sheet number in the subject.
- Admin: character counter + warning when a news summary is too long for the news card / link preview.
- Public: "Back to top" mono link in the footer title block on long pages (phone).

## 2026-10-07 (second run)

**Checked:** build, home, #services, #work, #p-famfive, #news, #n-bambu-lab-x2d, #skills, #about, #order (all 4 steps on
the local build, not submitted), /admin/ sign-in — 1280 px + 390 px, light + dark, EN + SL; axe-core WCAG 2 A/AA scan on 8
views (light + dark): 0 violations. Last Actions run (efc5ffe) succeeded; live site returns 200 (checked via the laptop).
No JS errors, no CSP violations, no 404s, no horizontal scroll, no broken images, no EN text on SL pages.

**Bugs fixed:** none found.

**Improvement:** link previews — added `og:site_name`, `og:locale` (en_GB) + `og:locale:alternate` (sl_SI),
`twitter:title`, `twitter:description` and `twitter:image:alt` in `index.astro`, so shared links show the studio name and
text everywhere (some apps don't fall back to the `og:` tags).

**Innovation — "Share this sheet" / "Deli ta list" on every project sheet (`#p-<slug>`, under "Start a project") and news
post (`#n-<slug>`, under the article):** shows the direct link in the current language (`https://nacekepa.work/#en-p-<slug>` /
`#sl-…`) in a read-only field, a "Copy link" button (clipboard; if that fails the link is selected with a "press Ctrl+C"
message; live `role="status"`), an "E-mail" link (opens the mail app with the title and link filled in), and "Share…" (the
phone's own share sheet) only on devices that support it. Notes which language the link opens in. Tested: EN + SL, light +
dark, 1280 + 390 px, keyboard (Tab → Enter), clipboard content, mailto text, native share (mocked), fallback path, and that
the copied link opens the same sheet in the same language.
*To remove:* delete the "Share this sheet" block in `app.js` (`shareUrl()` … `shareCopy()`), the two `shareBox(...)` calls in
`projectView()` / `postView()`, the two `data-share-*` lines in the click handler, `share:` in both languages in
`content.js` and the "Share this sheet" rules at the end of `page.css`.
*Next step:* a QR code of the link for printed brochures/business cards would need a QR encoder (no dependency allowed) —
could be a small hand-written one later.

**Ideas for next time** (added to the list below)
- Public: Atom feed for news (`/news.xml`) with a "Follow" link on #news (still open).
- Public: "Copy sheet number" (NK-YY-NN) next to the title so clients can quote it in an e-mail.
- Admin: show the public share link of each project/post next to its title (reuses the same `#en-p-` format).

## 2026-10-07

**Checked:** build, home, #services, #work, #p-famfive, #news, #n-bambu-lab-x2d, #skills, #about, #order (all 4 steps
on the local build, no endpoint → nothing sent), /admin/ sign-in — 1280 px + 390 px, light + dark, EN + SL. Last Actions
run (dd420f5) succeeded and the live site returns 200 with yesterday's changes (checked via the laptop). No JS errors, no
CSP violations, no 404s, no horizontal scroll, no broken images, no EN text on SL pages.

**Bugs fixed:** none found.

**Improvement:** news posts are now described to search engines as schema.org `BlogPosting` JSON-LD (headline, summary,
date, link `#n-<slug>`, photos, author) — built at build time from `news.json`, published posts only. Data block, not
executed, so the CSP script hash is unaffected. `newsLd` in `src/pages/index.astro`.

**Innovation — Admin "LinkedIn post" (`/admin/` → News → open a post → "LinkedIn post" box under Photos):** ready-to-paste
text for sharing a news post on LinkedIn: headline, summary, optionally the full article (list items as "•"), and a link
that opens the post in the right language (`https://nacekepa.work/#en-n-<slug>` / `#sl-n-<slug>`). EN/SL switch,
"Include the full article" checkbox, character count, "Copy post" button (clipboard, with select-and-Ctrl+C fallback;
live `role="status"` message). Updates while typing; if Slovenian text is missing it says so and uses English there; warns
when the post is a draft/unpublished (link won't work yet). Read-only — changes nothing in news.json. Tested with a mocked
GitHub API: light + dark, 1280 + 390 px, keyboard, clipboard content checked.
*To remove:* delete the "LinkedIn post" block in `admin.js` (`const LI` … `liCopy()`), the `${liSection(n)}` line in
`newsEditorView()`, the two `data-li-*` lines in the click handler, the `data-li-full` line in the change handler, the
`liRefresh();` line in the input handler, and the "LinkedIn post" rules at the end of `admin.css`.
*Next step:* the same for projects ("Share this project" text with the `#p-<slug>` link).

**Ideas for next time** (added to the list below)
- Admin: "Share project" text (like the LinkedIn post) for project sheets.
- Public: "Copy sheet number" (NK-YY-NN) next to the title so clients can quote it in an e-mail.
- Admin: show the public share link of each project/post next to its title.
- Admin: preview a news post as it will look on the site before publishing.

## 2026-10-06

**Checked:** build, home, #services, #work, #p-famfive, #p-snap-on-desk-cable-clip, #news, #n-bambu-lab-x2d, #skills,
#about, #order (all 4 steps on the local build, no endpoint → nothing sent), /admin/ sign-in, 404 page — 1280 px + 390 px,
light + dark, EN + SL. Live site returns 200 (checked via the laptop). No JS errors, no CSP violations, no 404s, no
horizontal scroll, no broken images, no EN text on SL pages.

**Bugs fixed**
- Yesterday's commits (08215fa, 655b963) never went live: both Actions runs built fine but the `deploy` job was never
  picked up by a GitHub-hosted runner ("not acquired by Runner … after multiple attempts" — GitHub outage, not our
  workflow). The live page was still on cb96489 (no "Similar projects", no footer e-mail link). Today's push redeploys
  everything; nothing in the repo needed changing.

**Improvement:** the 404 page ("Sheet not found") is now bilingual (EN + SL), has `noindex`, and offers direct links to
Projects, Start a project and the e-mail address before the auto-redirect (now 6 s instead of 4 s), so a visitor from
an old or mistyped link can still reach Nace. `src/pages/404.astro`.

**Innovation — Admin "To do" checklist (`/admin/` → tab "To do"):** a third tab next to Projects / News that lists what
the site still needs, per project and news post: photos, 3D model, EN description, EN details, materials, Slovenian
title/description/details, and for news: photos, SL headline/summary/article, EN article (SL details/article are only
asked for once the EN text exists). Left column: filters (Everything, Slovenian text, Photos, 3D models, Project details,
Materials, News posts) with counts, plus "N / M projects and posts have everything". Each missing item is a button:
it opens that project/post with the field focused (or the Photos / 3D model box highlighted). Counts include unpublished
edits. Read-only — changes nothing by itself. Tested with a mocked GitHub API (light + dark, 1280 + 390 px, keyboard).
Today: 113 open items (all 29 projects lack photos, 3D model, details and materials; the X2D post is complete).
Also fixed in the same change: the Projects tab no longer looks selected while the To do tab is open.
*To remove:* delete the "To do checklist" block in `admin.js` (`blank` … `todoGo()`), the "To do" button in `tabsView()`,
the `isTodo()` lines in `listView()` / `editorView()` and `const isTodo`, the two `data-todo-*` lines in the click
handler, and the "To do checklist tab" rules at the end of `admin.css`. (The `S.tab === 'projects'` checks in
`tabsView()` / `render()` are harmless to keep.)
*Next step:* a small "N to do" badge on each row of the Projects list; "Copy LinkedIn post" button on news.

**Ideas for next time** (added to the list below)
- Admin: "Copy LinkedIn post" button for a news item (still open).
- `#order?like=<slug>` share links (still open); `#work?q=…` shareable search.
- Public: "Related news" on project sheets once a post mentions a project title.

## 2026-10-05

**Checked:** build, home, #services, #work, #p-famfive, #p-adjustable-door-wedge, #news, #n-bambu-lab-x2d, #skills,
#about, #order (steps 1–2, not submitted), /admin/ sign-in — 1280 px + 390 px, light + dark, EN + SL. Last Actions
run (cb96489) succeeded; live site returns 200 (checked via the laptop). No JS errors, no CSP violations, no 404s,
no horizontal scroll, no broken images, no EN text on SL pages, no unlabeled inputs or unnamed links/buttons.

**Bugs fixed:** none found.

**Improvement:** the e-mail address is now a `mailto:` link in the footer title block ("Contact" cell, next to
LinkedIn) on every page — before, the address only appeared at the last step of the order form. Same address as
the order form and the JSON-LD (`CONTACT_EMAIL`). `frame()` in `app.js`.

**Innovation — Similar projects on project pages ("Similar projects" / "Podobni projekti"):** under each project
sheet, three related sheets picked from the existing projects: same category first, then shared words in title,
description and materials (accent-insensitive), then both having a 3D model / same year. The "Next project" is left
out so the row adds something new. Next to the heading: "All N <category> projects →" opens #work with that category
filter on, and "Start a project like this" opens the order form with "Similar to: <title> (NK-YY-NN)." pre-filled in
the project description. EN + SL, light + dark, phone (1 column) + tablet (2) + desktop (3), keyboard. Tested on all
29 projects (each gets 3).
*To remove:* delete the "Similar projects" block in `app.js` (`REL_STOP` … `relToOrder()`), the `relRow(p, next)` line in
`projectView()`, the two `data-rel-cat` / `data-rel-go` lines in the click handler, `rel:` in both languages in
`content.js` and the `.rel-*` rules at the end of `page.css`.
*Next step:* once projects have photos, the cards show them automatically; could also show "Related news" on posts.

**Ideas for next time** (added to the list below)
- Shareable "Start a project like this" link (`#order?like=<slug>`) for Nace to paste in LinkedIn messages.
- "Related project" link on news posts that mention a project title.
- Admin: warn when two projects have the same title or an empty SL description before publishing.

## 2026-10-04 (second run)

**Checked:** build, home, #services, #work, #p-scheduled-pet-feeder, #news, #n-bambu-lab-x2d, #skills, #about,
#order (steps 1–3, validation, not submitted), /admin/ sign-in — 1280 px + 390 px, light + dark, EN + SL.
Last Actions run (90758c2) succeeded; live site returns 200 (checked via the laptop). No JS errors, no CSP
violations, no 404s, no horizontal scroll, no EN text on SL pages.

**Bugs fixed:** none found.

**Improvement:** screen-reader labels are now translated — main menu, language switch, the filter group on #work
and the logo link were English on the Slovenian page ("Main", "Language", "Filter", "home"). `aria:` in both
languages in `content.js`, used in `frame()` / `views.work` in `app.js`.

**Innovation — Search on #work ("Search projects and news" / "Iskanje po projektih in novicah"):** a search box
above the filter chips. Every word typed must match (case- and accent-insensitive, so "drzalo" finds "držalo");
it searches project title, description, details, category, materials, year and sheet number, and news title,
summary and article — in BOTH languages, so "bracket" and "nosilec" find the same sheets. Sheets that don't match
are hidden (works together with the category chips); matching news posts are listed under the grid; with no hits
it shows "Nothing matches … yet" with a Start-a-project button. `/` from any page jumps to the search, Esc clears it,
the result count is a live `role="status"`. EN + SL, light + dark, phone + desktop.
*To remove:* delete the "Search (#work)" block in `app.js` (`state.q` … `findApply()`), the `findBox()` /
`findResults()` calls and `id="find-grid"` in `views.work`, the `find-q` / `data-find-clear` lines in the click and
input handlers, the `findApply()` line in `render()`, the "Search keys" keydown listener, `find:` in both languages
in `content.js` and the `.find-*` rules at the end of `page.css`.
*Next step:* remember the query in the URL (e.g. `#work?q=esp32`) so a search can be shared as a link.

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

Built: 2026-10-04 fit check (X2D build volume) on #services; 2026-10-04 search across projects and news on #work;
2026-10-05 similar projects row on project pages; 2026-10-06 admin "To do" checklist tab; 2026-10-07 admin
"LinkedIn post" copy box on news posts; 2026-10-07 (2nd) "Share this sheet" on project sheets and news posts;
2026-10-08 Atom news feed (`/news.xml`, `/news-sl.xml`) + "Follow the news" box on #news; 2026-10-09 "Print this sheet"
(A4 print layout) on project sheets and news posts.

- Material picker ("what should my part be printed in?") using only the materials and X2D facts already on the site.
- Printable one-page project brief from the order wizard (print stylesheet only).
- Shareable search links on #work (`#work?q=…`) and a "search" link in the 404 page.
- Admin: "SL text missing" badge on each project/news row in the list (quick view of what still needs translating).
- Materials index on #work: chips built from the `materials` field of the projects (click → filter by material).
- Shareable "Start a project like this" link (`#order?like=<slug>`) for LinkedIn messages.
- "Related project" link on news posts that mention a project title.
- Admin: warn about duplicate titles / empty SL description before publishing.
- Admin: "N to do" badge on each project row in the Projects list (reuses `TODO_CHECKS`).
- Admin: "Share project" text (like the LinkedIn post) for project sheets.
- Public: "Copy sheet number" (NK-YY-NN) next to the title so clients can quote it in an e-mail.
- Admin: show the public share link of each project/post next to its title.
- Admin: preview a news post as it will look on the site before publishing.
- Public: "Last updated" line on #work (newest project year / post date), from data already in the repo.
- Admin: after publishing a news post, show "Live in the feed" once `/news.xml` contains the slug.
- Public: anchor links on headings inside long news articles (copy link to a section).

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
