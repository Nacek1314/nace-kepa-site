# Maintenance log

Daily automated check of https://nacekepa.work (newest first). Each entry: what was checked,
bugs fixed, the one improvement, ideas for next time.

## Standing instructions from Nace (read first, every run)

- **2026-10-19:** Daily updates must be BIGGER — not tiny things like one "Copy" button, a badge, a link or one line of
  copy. Every run:
  - **Improvement = a package:** pick one area (SEO, accessibility, performance, copy in EN + SL, or one whole flow such as
    the order wizard / #work browsing / news reading) and do a thorough pass across the whole site with several related
    changes. A single small tweak never counts as the whole improvement.
  - **Innovation = a substantial feature:** its own section, tool, view or mode with UI, logic, EN + SL text and styling
    (typically a few hundred lines), e.g. an interactive part configurator that hands a full brief to the order form, a
    project comparison view, a 3D viewer upgrade (exploded view, cut plane, measuring, orthographic drawing views), a news
    archive with years/tags, a printable A4 portfolio set; in the admin: drag-and-drop reordering, a full sheet preview,
    bulk editing, a content-health dashboard, an EN/SL translation workspace. If it is too big for one day, ship a
    complete, usable first version and continue it in the next run (max 2 days per feature).
  - All the other rules still apply: only facts already in the repo, EN + SL, light + dark, desktop + phone, keyboard,
    CSP, no new dependencies, no redesign of the look, easy to remove.
  - Ideas in the list below that are too small should be merged into bigger features or treated as parts of a package.
- **2026-11-08 (Nace, live): unslop pass** (skill by Damir Sokolovsky, github.com/heydamir/unslop, CC BY 4.0). The results are
  deliberate — do not "fix" them back: headings are weight **600** (display, page and section titles, wordmark) and **500**
  (card, news, register, service titles, buttons, nav), tight tracking only on display sizes (−.03/−.025/−.02em), none under
  32 px; **no trailing period on headlines and titles** (EN + SL); the blue `--dimension` colour lives only inside drawings
  (dimension lines, ranges), list "+" markers are `--ink-muted`; card hover is a border-colour step, never a lift or shadow;
  one easing curve `--ease`; mono uppercase labels stay (title-block convention, Nace's choice) at .06em tracking.

## 2026-11-12

**Checked:** build (66 pages), home, #services (incl. `?tool=parts`, `?tool=prices`), #work, #work?view=list, #p-famfive, #p-rfid-drawer-lock,
#news, #n-bambu-lab-x2d, #skills, #about, #contact, #studio, #order, #mine, #compare, #gift, `/news/`, `/portfolio/famfive/`,
`/sl/portfolio/famfive/`, 404, /admin/ sign-in — 1280 + 390 px, light + dark, `/` + `/sl/`: no JS errors, no failed requests (Google Fonts
blocked in the cloud, as always), no horizontal scroll, no CSP violations, no broken images; EN ↔ SL key comparison of `content.js`: complete.
Live site from the laptop (`check-live.ps1`): `/`, `/sl/`, `/admin/`, `/news/`, feed, sitemap, a landing page all 200, an unknown address 404;
the live inline-script hash equals the CSP hash; last Actions run (5b4b992) succeeded. (The cloud session still cannot reach `nacekepa.work`
or the Actions API — both checked from the laptop.)
**Fixed:** nothing was broken.

**Improvement — Skills → proof package (`SK_MAP` … `skLegend()` in `app.js`, `sk:` in `content.js`, "Skills → proof" rules in `page.css`):**
#skills was a list of claims with no way on to the work behind them. Now (a) every term on the page that the project sheets mention is a
link to those sheets (`#work?q=ESP32`) with their count as a small superscript ("ESP32 ⁶", "Telegram ²", "PETG ¹" …) — counted from
`projects.json` when the page is drawn, so the numbers follow what Nace publishes; a term is linked only when a whole-word match exists
and the #work search finds exactly the same sheets (so "PA" or "PC" never link to "packaged" / "PCB"); screen readers hear "ESP32 — 6
project sheets"; (b) each group ends with a dashed foot: its service with code and published turnaround (S-01 3D design & CAD · 2–5 days;
S-03; S-02) and its project categories with counts (`#work?cat=CAD` "Projects · CAD (17)", Mechanical, IoT, Embedded), the Manufacturing
group with the three print tools (material picker, fit check, batch on the plate); Industrial automation has no service or projects on
the site, so it gets no foot; (c) a one-line legend under the grid explains the underline and the number. Hidden in print. Tested in
Playwright (EN 1280 light, SL 390 dark): 7 linked terms, the count on the link = the sheets #work shows after the click, category link
presses the right filter chip; axe 0 violations (the first version used `aria-label` → `label-content-name-mismatch`, replaced by hidden
text); no overflow.
*To remove:* see the comment above `SK_MAP` in `app.js`.

**Innovation — Find anything / "Poišči karkoli" (Ctrl / Cmd + K anywhere, or the magnifier button in the header; `fxBtn()` … `fxKey()` in
`app.js`, `fx:` in `content.js`, "Find anything" rules in `page.css`):** the site has grown to 12 views, 10 tools, 29 sheets, posts, skills
and a FAQ, and the only search was the project / news box on #work. The new box finds **everything** from every view: pages (incl.
Contact, Start a project, Compare, Gift card, My corner), the tools T-01 … T-10 by their name ("Price list", "Parts list", "Fit check" —
shown with their question and one-line description), the four services, every project sheet (title, description, details, category,
materials, year, sheet number), news posts, every Skills row, the FAQ questions from Settings (**none yet — the group appears once Nace adds
questions in the admin**; picking one opens that answer on #services) and three actions (switch language, keyboard shortcuts, write an
e-mail). It reads EN and SL words in either language and ignores č š ž ("cenik" finds the price list on the English page, "skofja" finds
Contact). Results are grouped (best group first, 5 per group, "N more — show all on the Work page" hands the query to `#work?q=…`), the
typed words are underlined in redline, each row carries its code (T-04, S-03, NK-25-09, date). Empty box = all pages and tools as a site
index. Nothing found → "Ask about it — start a project". Keyboard: a combobox + listbox (`aria-activedescendant`), ↑ ↓ move, Enter opens,
Esc clears then closes, focus returns to where it was; mouse / touch: hover and tap; a status line announces the count. Drawing-sheet
look (the shortcuts dialog's frame), light + dark, 390 px, hidden in print, forced-colours rule; the `?` list has a "Ctrl K" row. No
dependency, no request, passes the CSP.
- Tested in Playwright (EN 1280 light, SL 390 dark, 66 checks): Ctrl+K / Cmd+K / button / Enter on the button open it with focus in the
  box; empty → Pages 11 + Tools 10; "esp32" → Services 1, Projects 6 (+1 more), Skills 1; arrows + Enter → the sheet, on `/sl/` the address
  stays `/sl/#p-…`; "cenik", "price", "skofja", "petg", "fit", "solidworks"; "parts list" / "kosovnica" → `#services?tool=parts`;
  FAQ with two temporary test questions (build only, not committed) → #services, answer open, summary focused and in view; "zzzqqq" →
  the message + Enter → #order; "slovenščina" / "english" → language switched; backdrop click closes and focus returns to the button;
  Ctrl+K from the `?` list; "more" row → `#work?q=a` with the box filled; from a landing page → `/sl/#skills`; axe 0 violations (empty,
  with results, nothing found; light + dark, both sizes); full audit of every view: no errors, no overflow.
*To remove:* see the comment above `fxItems` in `app.js`.

**Ideas for next time** (added to the list below)
- Public: Find anything — remember the last five picks ("Recent") and index the price-list rows and the materials of the material picker.
- Public: Skills — a "Used in" row on project sheets (the skills terms a sheet mentions → back to #skills), the reverse of today's links.
- Admin: Overview — "Search preview": what Find anything shows for a project / post (title, description, code) and which sheets no skill term reaches.

## 2026-11-11

**Checked:** build (66 pages), home, #services (incl. `?tool=parts`, `?tool=prices`), #work, #work?view=list, #p-famfive, #p-rfid-drawer-lock,
#news, #n-bambu-lab-x2d, #skills, #about, #studio, #order (all 4 steps on the local build in EN + SL, nothing sent), #mine, #compare, #gift,
`/news/`, `/portfolio/famfive/`, `/sl/portfolio/famfive/`, 404, /admin/ sign-in — 1280 + 390 px, light + dark, `/` + `/sl/`: no JS errors,
no failed requests (Google Fonts blocked in the cloud, as always), no horizontal scroll, no CSP violations, no broken images; EN ↔ SL key
comparison of `content.js`: complete. axe-core 4.10 (WCAG 2.1 AA + best practice) on **every** public view in both languages and sizes:
0 violations. axe on the **signed-in admin** (mocked GitHub API), all nine tabs, 1280 + 390: see the improvement. Live site from the laptop:
`/` 200, last Actions run (0d080dc) succeeded. Note: the cloud session can no longer reach `nacekepa.work` or the GitHub Actions API directly
(egress proxy); both were checked from the laptop.
**Fixed:** nothing broken on the public site. Admin (found by axe, fixed inside the package below): no `<main>` landmark and no `<h1>` on the
dashboard (two moderate violations on every tab, noted on 11-09); two empty `<th>` (Overview "Pages" table, Settings materials table);
the sheet-preview card used an `<h4>` straight under the editor's `<h2>` (heading order); the tabs lost keyboard focus after every click
(the buttons had no ids, so `render()` could not restore focus); the 7th tab (Table) drew a doubled left line (the `border-left: 0` rule
only covered the 4th tab).

**Improvement — admin accessibility package (`dashView()`, `tabsView()` / `tabKey()`, `loginView()` / `unlockView()` in `admin.js`,
"Admin accessibility package" rules in `admin.css`):** the dashboard is now a proper page for keyboards and screen readers: `<header>` +
`<main>` landmarks (sign-in and unlock screens are a `<main>` too), the "Admin · user" line is the `<h1>`, a **skip link** ("Skip to the
Quote tab" — names the open tab) is the first Tab stop and lands on the editor column (`#ad-editor`, `role="tabpanel"` labelled by the
open tab), the tab list is a **real tab list**: ids on every tab (focus survives re-renders), roving tabindex (one Tab stop), **← → ↑ ↓
Home End** move between tabs and open them, `aria-controls` → the panel; empty table headers got visually-hidden names ("Remove",
"Open and copy links"); the preview card title is an `<h3>`; the tab grid's first-of-row rule; the quote sheet's "QUOTE" title 800 → 600
like every title since the unslop pass. Tested in Playwright (1280 light, 390 dark, mocked GitHub API): landmarks, h1, skip link →
editor focused, ArrowRight / End select + focus tabs, exactly one tab stop in the list; axe on all ten tabs: 0 violations (was 3–4 per tab);
no overflow; the public site untouched (axe 0 on every view).
*To remove:* the comments "admin accessibility package (2026-11-11)" in `admin.js` mark each line.

**Innovation — Jobs board + job card NK-J / "Posli" (admin tab "Jobs"; `JB_KEY` … `jbAct()` in `admin.js`, `.jb-*` rules in `admin.css`,
"Start a job" button in `qtView()`):** what happens to an enquiry after the quote was nowhere in the admin — the brief in the mailbox, the
quote in the Quote tab, the deadline in Nace's head. The new tab is a **board** of every job in four columns — Enquiry · Quoted · In
progress · Delivered (declined jobs sit in the last column, marked) — each card with job number (`NK-J-YYMMDD-NN`), client, reference,
the due date as the board reads it (**"Overdue by 3 days"** in redline, "Due today", "Due in 5 days", else the date), steps done / total
and the agreed total; a summary line ("3 open · 1 in progress · 1 overdue · 1 due within a week · 2 delivered or declined") and a Jobs
count on the tab button (open jobs). A job starts in three ways: **"+ New job"** (blank), **"From a brief"** (paste the e-mail / Telegram
text, EN or SL — `qbParse()` of the Quote tab reads client, e-mail, phone, reference, the `[NK-…]` tracking code, deadline, services and
the parts list → one job in Enquiry, due date set) or **"Start a job"** under the quote in the Quote tab (client, e-mail, reference,
language, services from the lines, printed parts with material / grams / hours, the quote number and total, the requested deadline from
the quote's note → a job in Quoted; the same quote twice opens the existing job). The **editor** under the board: client, e-mail, phone,
reference, tracking code, client's language, due date (with the plain-English hint), status, quote no. (datalist of the saved quotes →
"Open quote NK-O-…" button loads it in the Quote tab), agreed total (typed, never calculated), the five services as checkboxes, the
**steps checklist** built from the home page's process steps filtered by the services (Brief · CAD · Sim & calc · Slice & print ·
Firmware · Assembly · Post-processing · Test · Deliver — e.g. a printing-only job gets Brief, Slice & print, Deliver), parts and notes;
every change is saved at once (localStorage `nk-admin-jobs`, 60 jobs, browser only — like the quotes, nothing goes to the repo or the
site), a status change is logged with its date, "Mark delivered" ticks Deliver. The **job card NK-J** (A4, drawing-sheet look, same
frame as the quote sheet NK-O): title block (job no., started, due, status, client with e-mail / phone / language, reference with code,
quote and total), services, a steps table with ☐ / ☑ boxes and a "Date · initials" column to fill by hand, parts, notes, the status log;
**"Print the job card"** prints it alone (the quote's print mode), **"Copy as text"** gives the same as plain text. Keyboard: cards are
buttons (`aria-pressed`), delete asks first (focus on the confirm), focus lands in the right field after every action.
- Tested in Playwright (1280 light, 390 dark, mocked GitHub API, 116 checks): landmarks / tabs; blank job → due "Due in 2 days", services
  → steps "Brief, CAD, Sim & calc, Slice & print, Deliver", 2 / 5 ticked, localStorage record, card in Enquiry, sheet with 5 rows and ☑;
  status select → In progress column + log; EN brief with `[NK-7Q2M4A]`, phone, 2 parts-list lines, deadline → job no. -02 with
  everything read ("Spacer · 40 × 30 × 20 mm × 4 · PETG · ≈ 11 g"); SL brief → Slovenian job, "Due in 1 day"; nonsense → message;
  past due → "10 days late", "1 overdue" in the summary, first in the list; quote (PLA 20 g / 1.5 h × 4 + 2 h CAD, deadline note) →
  Quoted job with the same total (114,48 €) and due 27/11/2026, duplicate → existing job; saved quote → "Open quote" works; Mark
  delivered → Delivered column; copied text; print mode shows only the card; delete confirm / keep / delete; reload → "Jobs 3" and 3
  cards; axe 0 on the tab (empty and full) and on five other tabs; no overflow at 390; no errors.
*To remove:* see the comment above `JB_KEY` in `admin.js`.

**Ideas for next time** (added to the list below)
- Admin: Jobs — a week / month calendar strip of due dates above the board, and "e-mail the client" (mailto with the job's reference and code).
- Admin: Jobs — "Quote this job" (job → new quote with client, reference, parts as printed-part lines), the reverse of "Start a job".
- Admin: Overview — "Jobs" card (open, overdue, due this week) next to the content health.

## 2026-11-10

**Checked:** build (66 pages), home, #services (incl. `?tool=parts`, `?tool=prices`), #work, #work?view=list, #p-famfive, #p-rfid-drawer-lock,
#news, #n-bambu-lab-x2d, #skills, #about, #studio, #order (all 4 steps on the local build in EN + SL, nothing sent), #mine, #compare, #gift,
/admin/ sign-in — 1280 + 390 px, light + dark, `/` + `/sl/`: no JS errors, no failed requests (Google Fonts blocked in the cloud, as always),
no horizontal scroll, no clipped text, no CSP violations, no broken images; EN ↔ SL key comparison of `content.js`: complete (only the intended
plural forms differ); an English-word scan of every Slovenian view: clean. Live site from the laptop (`check-live.ps1`): `/`, `/sl/`, `/admin/`,
`/news/`, feed, sitemap, a landing page all 200, an unknown address 404; the live inline-script hash equals the CSP hash; the live page is the
f21e2ad build. Last Actions run (f21e2ad) succeeded. axe-core 4.10 (WCAG 2.1 AA + best practice) on the parts list, order step 2 and step 4: see the fixes.
**Fixed:** (1) **Parts list, desktop: the inputs of every line had no accessible name** (axe `label` + `select-name`, critical) — the per-cell
labels (`.bm-k`) were `display: none` above 720 px (the header row shows the column names, but it is `aria-hidden`), so a screen reader heard
"edit text" ×4 per line; the labels are now visually hidden (clip) instead, static again on phones and in print — nothing changes on screen.
(2) Admin: the sheet-preview title (`.pv-title`) was still weight 800 — 600 like the site's titles since the unslop pass.

**Improvement — "Your files" package (`yfNames()` … `yfBox()` in `app.js`, `yf:` in `content.js`, "Your files" rules in `page.css`):** the
order form sends text only (Nace's choice on 11-02: no upload with the brief), but nothing told a client with files where they go. Now:
(a) step 2, under "Do you have files?": "Files are not uploaded here — attach them to the e-mail with the brief, or send them after my reply"
(`aria-describedby`); (b) step 4, for a client who answered "STL / STEP / 3MF" or "Native CAD" — or whose brief carries parts-list lines read
from files / a file check — a **"Your files"** box under Copy brief / Open in your e-mail app: attach them to the e-mail with this brief (STL,
STEP or 3MF, native CAD, sketches or photos), the form itself sends text only; the "Open in your e-mail app" body ends with "Files: see the
attachments of this e-mail"; (c) the **sent screen** (Worker path): the same box with the tracking code — "Send the files by e-mail with the
code NK-… in the subject, so they land next to your brief" — and a **"Send the files by e-mail"** button (`mailto:` with the code and the
client's name in the subject, the services in the body), plus the file names the brief already mentions ("Named in the brief: Spacer.stl,
Cube.obj"). Hidden in print. Tested in Playwright (EN 1280 light, SL 390 dark) with a mocked Worker (`PUBLIC_ORDER_ENDPOINT` test build +
`page.route` → `{ok:true}`): hint + `aria-describedby` on step 2, the box on step 4 and on the sent screen with the same code the Worker
received, the mailto subject/body in both languages, the names from a parts list built from files; no box when "No, starting from scratch"
is chosen and no file-based line is in the brief; axe 0 violations; no overflow.
*To remove:* see the comment above `yfNames()` in `app.js`.

**Innovation — Files → parts list / "Iz vaših datotek" (`#services?tool=parts`, drop zone "From your files" under the list; `bmDrop()` /
`bmFiles()` in `app.js`, `f*`, `fromFile*`, `fLines*` keys of `bm:` in `content.js`, "Files → parts list" rules in `page.css`):** a client with
several STL / 3MF / OBJ files chooses or drops them all at once and gets **one parts-list line per file** — name = file name, L × W × H = the
mesh's bounding box (a 3MF brings its own unit, STL / OBJ are read as mm), quantity 1 — and, for a closed mesh, the line carries the **mesh's
own volume and surface** (`row.vol` / `row.area`), which `bmCalc()` now uses for weight, print time and price instead of the bounding box
(the Part studio already did this for one file; the parts list only knew boxes). The result line says "from the file · 24 cm³" (open mesh:
"from the file · open mesh, box volume"); the NK-L sheet gets a row **"From files: 3 lines (volume from the mesh)"**; typing a size over such a
line drops the file's numbers again (the box no longer matches). Files are read one after another with the file check's own readers
(`fcSTL` / `fcOBJ` / `fc3MF` / `fcStats`) with a live "Reading file 2 of 6…" status; unreadable ones are listed as skipped with the reason
(STEP / IGES → export STL, wrong type, over 200 MB, no triangles, damaged), the list stops at 30 parts (`BM_MAX`). Nothing is uploaded — like
the file check, and the zone says so. Keyboard: the file input is in the tab order (focus ring on the zone), Enter / Space opens the picker;
drag-and-drop highlights the zone; light + dark, 390 px (full-width zone), print (zone hidden). The line text in the brief keeps its form, so
the admin's "Quote from a brief" still reads the lines (the extra "from the file · N cm³" item is ignored by its regexes).
- Tested in Playwright (EN 1280 light, SL 390 dark) with generated files — Spacer.stl 40×30×20 (closed), "Big bracket.stl" 300×100×50 (too
  big), open-lid.stl (one triangle, open), Cube.obj 50³, housing.step, notes.txt: "4 lines added from files. Skipped: housing.step (STEP /
  IGES …), notes.txt (not an STL …)" / "Iz datotek dodane 4 vrstice. Izpuščeno: …"; sizes, "from the file · 24 cm³", "open mesh, box
  volume", "Too big for one piece · from the file · 1,500 cm³"; sheet row "From files: 2 lines" (the open mesh and the too-big part don't
  count); PLA on line 1 → ≈ 11 g · 0.7 h · 6.00 €/pc from the mesh volume; typing L = 41 → marker gone, box estimate (0.8 h); localStorage
  keeps vol / area / file; a dropped empty STL → "No line added. Skipped: empty.stl (no triangles found)"; "Start a project with this list"
  → the brief with the lines; print: zone hidden; axe 0 violations; no errors, no overflow.
*To remove:* see the comment above `state.bmf` in `app.js`.

**Ideas for next time** (added to the list below)
- Public: parts list — read a ZIP of files, and a 3MF with several objects → one line per object.
- Public: parts list — "Show in 3D" per file line (the file check's plate preview, viewer.js) and the three drawing views on the NK-L sheet.
- Admin: Quote from a brief — pick up "from the file · N cm³" as the line's volume so the quote can show cm³ next to grams.

## 2026-11-09

**Checked:** build (66 pages), home, #services (incl. `?tool=parts`, `?tool=prices`), #work, #work?view=list, #p-famfive, #p-rfid-drawer-lock,
#news, #n-bambu-lab-x2d, #skills, #about, #contact, #compare, #studio, #gift, #mine, #order (all 4 steps on the local build in EN + SL,
nothing sent), /admin/ sign-in — 1280 + 390 px, light + dark, `/` + `/sl/`: no JS errors, no failed requests (Google Fonts blocked in
the cloud, as always), no horizontal scroll, no CSP violations, no broken images; every model / photo path in `projects.json` exists;
EN ↔ SL key comparison of `content.js`: complete (only the intended plural forms differ); an English-word scan of every Slovenian view:
clean. Live site from the laptop (`check-live.ps1`): `/`, `/sl/`, `/admin/`, `/news/`, feed, sitemap, a landing page all 200, an unknown
address 404; the live inline-script hash equals the CSP hash; the live page is the 115ba42 build. Last Actions run (115ba42) succeeded.
axe-core 4.10 (WCAG 2.1 AA + best practice) on #work EN light, #about SL dark: 0 violations; on the admin Quote tab: see the fixes.
**Fixed:** (1) **Admin quote: the rush surcharge was applied to the whole subtotal** (hours, custom lines and file preparation included)
while the price list, the public estimate (`qcCalc()`) and the tab's own label say "+25 % on printed parts" — the same job came out
213,20 € in the admin and 148,92 € on the site; `qtCalc()` now adds the surcharge on the printed-part lines only (the sheet row reads
"Rush surcharge on printed parts" / "Doplačilo za hitro izvedbo tiskanih delov"), and the admin quote now equals the public estimate to
the cent (checked: 3 h CAD + 4 × PETG 40 g / 2 h, rush, promotion → 148,92 € in both). (2) Admin tabs: the counts ("Projects 29",
"To do 116") sat at .75 opacity → 3.9:1 contrast (axe `color-contrast`, serious); opacity dropped, now 6.4:1. (Noticed, not changed:
axe still reports two moderate best-practice items on the admin — no `<main>` landmark, no `<h1>`.)

**Improvement — language package (`langPath()` … `langLinkHash()` in `app.js`, `.lang a` rules in `page.css`, README):** the address
now follows the language on every view — `/#work` ↔ `/sl/#work`, `/portfolio/<slug>/` ↔ `/sl/portfolio/<slug>/`, `/news/` ↔
`/sl/news/` — not only on landing pages as before: the EN / SL switch and the `L` shortcut move the path with `replaceState`, a
returning reader whose saved language is Slovenian who opens `/` carries on at `/sl/`, so a copied address bar, a bookmark or a
shared tab always opens the page in the language that was on screen (and Google's `/sl/` page gets the Slovenian visitors' links).
The **EN / SL switch is now a pair of real links** (`<a href hreflang lang aria-current>` instead of buttons): a plain click still
switches in place without a reload, Ctrl / Cmd / Shift / middle-click open the other language in a new tab, right-click copies the
address; the English link keeps the explicit `#en-` prefix so it stays English even for a reader whose saved language is Slovenian.
The links the site hands out follow: "Link to these results" on #work and the compare link are `https://nacekepa.work/sl/#work?q=…`
/ `/sl/#compare?s=…` instead of `/#sl-work?q=…` (old `#sl-…` links keep working), the portfolio set's cover shows the same. Only the
site's own paths are touched (`/`, `/sl/`, landing pages); the 404 page has its own script. Tested in Playwright (1280 light, 390
dark): switch → `/sl/#work` + `<html lang="sl">` + Slovenian h1; compare / find links; Enter on the focused EN link; `/#en-work`
stays English; landing page → `/sl/portfolio/famfive/` → moving on → `/sl/#work`; `/news/` with saved SL → `/sl/news/`; `L` toggles
`/#n-…` ↔ `/sl/#n-…`; Ctrl-click opens `/#en-n-…` in a new tab with the original untouched; clicking the current language does
nothing; dark-mode colours as the buttons had; axe 0 violations; full audit of every view: no errors, no overflow.
*To remove:* see the comment above `langPath()` in `app.js`.

**Innovation — Quote from a brief / "Ponudba iz povpraševanja" (admin tab "Quote" → fold "From a brief" at the top; `QB` …
`qbAct()` in `admin.js`, `.qb-*` rules in `admin.css`):** Nace receives every enquiry as the text the order form builds (by e-mail
from the Worker or on Telegram) and until now typed the quote from it by hand. Now he **pastes the whole message** and presses
**"Fill the quote from the brief"**: `qbParse()` reads the brief's labels in both languages ("Services / Storitve", "What should it
do? / Kaj naj izdelek počne?", "Quantity / Količina", "Deadline / Rok", "Material", "Your name / Ime", "Your email / E-pošta",
the Worker's "Contact:" line and the `[NK-…]` code) and the hand-off lines of the tools inside the brief — the **parts list** (one
printed-part line per item: name, material matched to Settings, weight per piece and machine hours per piece from the list's own
estimate, copies), the **Part studio** sheet (name, material, weight, time, quantity) or the **estimate** breakdown (hours per
service, the printed part with material / grams / hours / copies, post-processing hours, rush "+25 %", "with the promotion") —
in the new 11-08 indented form and the older inline "a; b; c." form, with a sentence typed before a tool line kept as the brief.
`qbFill()` starts a **new quote**: language of the quote = language of the brief, client, e-mail, reference (the first plain
sentence of the brief, or the NK code), one **Hours** line per service (hours filled only when the estimate states them), one
**Printed part** line per part (material = the part's, else the brief's "Material" answer; weight / hours only when the brief
carries them), rush and discount ticked when the estimate says so, and the requested deadline as a quote note ("Requested
deadline: 27/11/2026" / "Želeni rok: 27. 11. 2026"). The status line says what was taken and **what is still to fill** ("hours for 3D
design & CAD; material for Lid"), the fold closes, and focus lands in the first empty field. Nothing is invented: no hours, grams or
prices that the brief does not state; nothing leaves the browser (the fold says so). Unrecognised text → "Nothing recognised — paste
the whole brief". Keyboard: textarea → Tab → Fill (Enter); the fold is a native `<details>` with the admin's ▸ / ▾ marker.
- Tested with a mocked GitHub API (1280 light, 390 dark) on briefs produced by the site itself: EN parts list (Spacer PETG ×4,
  Bracket PLA ×3, Lid no material ×6) + CAD + deadline + phone, wrapped like the Worker's e-mail → client, e-mail, English, reference
  "Housing for a sensor board, snap-fit lid.", 1 Hours line (empty), 3 Printed-part lines (11 g / 0.75 h ×4, 522 g / 35.07 h ×3, Lid
  3.55 h ×6 flagged "material for Lid"), note "Requested deadline: 27/11/2026", focus on the CAD hours; SL estimate (CAD 3 h + PETG
  40 g / 2 h ×4, rush, first order) typed on the same line as a sentence → Slovenian quote, client, reference "Ohišje za senzor.",
  CAD 3 h, PETG 40 g / 2 h ×4, rush + promotion ticked, total **148,92 €** = the public estimate; nonsense → the message; Fill
  disabled until text is typed; axe on the tab before / after: no new violations; no overflow at 390 px; no errors.
*To remove:* see the comment above `QB` in `admin.js`.

**Ideas for next time** (added to the list below)
- Admin: "From a brief" — accept the brief's attachments list (file names) as a note and the phone as a "call back" reminder on the saved quote.
- Admin: quote status (sent / accepted / declined) + "answered" mark on the brief, monthly total — browser-only.
- Public: step 4 of the order form — "Copy for the studio" variant of the brief that is one line per field (the parser already
  reads both forms; a stricter one would make the import exact for very long notes).

## 2026-11-08 (second run — Nace: "preuredi z unslop skillom")

**Unslop pass over the whole site** (skill from github.com/heydamir/unslop). Audit verdict: mostly designed, light slop — one tinted
ramp, one accent, real drawings as the moments, no gradients / glows / emoji / hype. Nace chose the full nine-pass process with
headings 800 → 600 / 700 → 500 and the uppercase mono labels kept. Direction: exact, technical, quietly warm; world = the drafting
table (sheet, graphite, blueprint grid, one red marker); moments = the drawn project sheets and the tools' drawings; signature =
the redline + the mono title block. Passes: **spacing** — off-grid controls to the 4 px scale (buttons 34/54 → 36/56, chips, lang
buttons, kbd/shortlist/compare close buttons, 6 px gaps → 8, NK mark 34 → 32, title-block keys 10 → 11 px); **color** — blue only in
drawings, list "+" markers muted; **icons** — nothing to do; **copy** — 26 headline/title strings lose the trailing period (EN + SL,
incl. the hero "firmware"); **type** — display/page/section titles 600, card/news/register/service titles, buttons, nav, process,
choices, FAQ, tools 500, tracking per the tokens, `.nk-label` .08 → .06em, gift "kind" .18 → .08em; **layout** — kept (split hero
with the sheet as the moment); **details** — kept (2 px radii, redline focus ring); **visuals** — kept, the drawn sheet is the hero
moment (no image tool used, nothing generated); **motion** — card hover lift + shadow → border-colour step, press = scale(.98),
one curve `--ease: cubic-bezier(.22,1,.36,1)`, arrow nudge 3 → 2 px. Checked: full Playwright audit (all views, 1280 + 390, light +
dark, EN + SL) clean, axe 0 violations, EN ↔ SL keys complete.

## 2026-11-08

**Checked:** build (66 pages), home, #services (incl. `?tool=parts`, `?tool=prices`), #work, #work?view=list, #p-famfive, #p-rfid-drawer-lock,
#news, #n-bambu-lab-x2d, #skills, #about, #contact, #compare, #studio, #gift, #mine, #order (all 4 steps on the local build in EN + SL,
nothing sent), /admin/ sign-in — 1280 + 390 px, light + dark, `/` + `/sl/`: no JS errors, no failed requests (Google Fonts blocked in
the cloud, as always), no horizontal scroll, no CSP violations, no broken images; axe-core 4.10 on every view: 0 violations; EN ↔ SL
key comparison of `content.js`: complete (only the intended plural forms differ). Live site from the laptop (`check-live.ps1`): `/`,
`/sl/`, `/admin/`, `/news/`, feed, sitemap, a landing page all 200, an unknown address 404; the live inline-script hash equals the CSP
hash; the live page is the a5319e6 build. Last Actions run (a5319e6) succeeded. (No run on 11-06 and 11-07 — this is the next one.)
**Fixed:** (1) a tool printed alone ("Print this tool" / `#services?tool=…`) printed its drawing as a blank frame — the fit check figure,
the plate tool's layout and the file check views are `.nk-sheet__art`, which the photo-protection rule hides in print; a print rule
under `html[data-tool] .tl-on` makes them visible again (they are the visitor's own numbers, not photos). (2) Slovenian NK-L sheet:
"13 kos" → "13 kos." (the plural form followed the number of part types, not pieces; the abbreviation is right for every count).

**Improvement — brief readability package (what Nace and the client actually read; `bfWhat()` / `bfSubject()` in `app.js`):** a tool's
hand-off line in "What should it do?" — the parts list, a Part studio spec, an estimate, a shortlist or compared sheets — was one very
long line ("Parts list: 1. …; 2. …; Plates: …"). Now, everywhere the brief is rendered — the step-4 sheet, "Copy brief", the e-mail the
Worker sends (its summary is shown pre-wrap, so the lines survive), both `mailto:` bodies, the printable A4 brief and the "What you are
sending" review on step 3 — such a line becomes a heading with one indented item per line, and a multi-line answer starts on its own
line under the question. The "Open in your e-mail app" subject now names the services like the Worker's subject does ("New project:
3D printing & prototyping — Ana"). Plain sentences with one colon are left alone (only lines with ≥ 2 "; " items expand). Tested in
Playwright (EN 1280 light, SL 390 dark): parts list → brief shows "Parts list:" + 6 indented lines, a typed sentence stays one line,
review row shows the list, subject carries the service; printable brief; no errors.
*To remove:* see the comment above `bfWhat()` in `app.js`.

**Innovation — Plate layout / "Razpored po mizah" NK-N (under the parts list, `#services?tool=parts`; `PN_MAX` … `pnMore()` in `app.js`,
`pn:` in `content.js`, "Plate layout" rules at the end of `page.css`):** the whole order packed on the X2D plates at once. Every piece
of every fitting line (the footprint from the fit check's orientation) is placed with a **maximal-rectangles packing** (best short-side
fit, 90° turns, the gap set under the list handled as plate W+g × H+g and pieces w+g × h+g; two sort orders — area and longest side —
the layout with fewer plates / more plate used wins). Output: **"N plates for the whole order"** with how many fewer than counting each
part type alone and the average plate usage; **one top-view drawing per plate** (16 mm grid, pieces in red with their line number
"01", "02" …, caption "Plate 1 · 8 pcs · 73 % used"; the first 8 plates, "Show all plates (N)" toggles the rest, keyboard-focusable);
a **legend** "Where each part lands" (line, name, oriented size, quantity, plate 1 / plates 1–2); and the **Plates row of the NK-L
sheet** now reads "2 mixed (per part type up to 4)" — in the sheet, the copied text and the brief. Over 400 pieces the drawing is skipped
and the sheet keeps the per-type count (says so). The drawings print with the tool (they are not `.nk-sheet__art`, so the photo rule
does not hide them), work at 390 px (one plate per row), light + dark, SL + EN; nothing stored or sent beyond what the list already
keeps. The two bm notes now say that each line counts alone and the layout below mixes the order.
- Tested in Playwright (EN 1280 light, SL 390 dark): empty state; Spacer 40×30×20 ×4 + Bracket 100×258×80 ×3 + Lid 120×90×10 ×6 →
  "2 plates for the whole order · 2 plates fewer than counting each part type alone · 71 %", plate 1 = 8 pcs 73 %, plate 2 = 5 pcs 70 %,
  13 rects inside the plate with no overlaps (checked geometrically), labels match the lines, legend "plates 1–2"; gap 5 → 20 → 60 on
  6 lids: 2 → 2 → 3 plates (never worse than the plate tool's per-type count); 120 lids → 31 plates, 8 drawn, Show all → 31, focus
  stays on the button; 900 pcs → "More than 400 pieces" note; clipboard + brief carry "Plates: 2 mixed (per part type up to 4)" /
  "Mize: 2 mešano (po vrstah delov do 4)"; print view shows the plates; axe on the tool: 0 violations; no overflow, no errors.
*To remove:* see the comment above `PN_MAX` in `app.js`.

**Ideas for next time** (added to the list below)
- Public: plate layout — a "Print the plates" button that prints only the NK-N drawings (one plate per page, with the legend).
- Public: plate layout — pieces coloured per line (hatch patterns, still one red ink) so a mixed plate reads without the numbers.
- Admin / Worker: the Worker cuts a brief at 6000 characters (`MAX_SUMMARY`) — a 30-line parts list with the new layout row gets close;
  Nace could raise it in `cloudflare-worker/worker.js` (not touched by the daily run).

## 2026-11-05

**Checked:** build (66 pages), home, #services (incl. `?tool=prices`), #work, #work?view=list, #p-famfive, #p-rfid-drawer-lock, #news,
#n-bambu-lab-x2d, #skills, #about, #contact, #compare, #studio, #gift, #mine, #order (all 4 steps on the local build in EN + SL,
validation, nothing sent), /admin/ sign-in — 1280 + 390 px, light + dark, `/` + `/sl/`: no JS errors, no failed requests (Google
Fonts blocked in the cloud, as always), no horizontal scroll, no CSP violations, no broken images; EN ↔ SL key comparison of
`content.js`: complete. Live site from the laptop: `/`, `/sl/`, `/admin/`, `/news/`, the two feeds, sitemap, robots, manifest, two
landing pages, an `/og/` card all 200, an unknown address 404; the live inline-script hash equals the CSP hash; "NK-D" present, no
"Fusion" — the live page is the a8ef93c build. Last Actions run (a8ef93c) succeeded. (The GitHub API and nacekepa.work are blocked
from the cloud proxy since this run — both checks now run on the laptop, `C:\Users\kepan\Webiste\check-live.ps1`.)
**No live bugs.** Fixed two latent ones the tenth tool would have hit: the tools index numbered a tenth entry "T-010"
(`tlNo()` now pads to two digits everywhere, incl. `data-tl`) and the desktop grid only cleared the left border of the fifth tile
(`:nth-child(4n + 1)` now). The tools label and lead count the tools instead of saying "nine / eight".

**Improvement — review package (order form; `rvRows()` … `rvSelf()` in `app.js`, `rv:` in `content.js`, "Review package" rules in `page.css`):**
step 3 (Contact) is the last step before "Send project", so it now ends with **"What you are sending"** — one row per answer from steps
1–2 (services, what, quantity, deadline, files, material, the "What do you already have?" rows) with **Edit** that jumps back to that
step with the cursor in that field (`rvGo()`; the checklist gets the first tick box), and "optional, not filled in · Add" on an empty
deadline / files / material. Step 4 (sent screen and the copy-and-send fallback) gets **"Send a copy to myself"** — a `mailto:` to the
address the client typed, subject + the brief as the body — so they keep what they sent. Tested in Playwright (EN 1280 light, SL 390
dark): rows and values, Add on the deadline by keyboard → step 2 with `f-deadline` focused, the date shows on the review, Edit on
services → `svc-print` focused, no button before an e-mail is typed, the mailto on step 4 carries the brief; no overflow, no errors.
*To remove:* see the comment above `rvRows()` in `app.js`.

**Innovation — Parts list / "Kosovnica" NK-L (`#services?tool=parts`, T-09 in the tools index; `BM_KEY` … `bmFitLink()` in `app.js`,
`bm:` + `tl.parts` in `content.js`, "Parts list" rules in `page.css`):** an order of **several different parts on one sheet**. Every
line is a part — name, L × W × H in mm, material (the list from Settings), quantity — and gets its own result line: the **fit check**
(`fitCalc`: fits as entered / turned / too big), **parts per plate and plates needed** (`pbLayout`, the plate tool's rectangular
nesting with the gap set under the list) and, with a price list in `settings.json`, **weight, print time and price per piece and per
line** from the same rules as the Part studio (`estPrint()`, now shared: walls + infill from the print settings, material price ×
grams + machine hours, minimum per part). The **NK-L sheet** on the right totals part types and pieces, how many fit, plates ("up to
N" — counted per part type, so mixing can need fewer), weight, print time and the order price (file preparation once, minimum order,
lines without a material not priced; a part over the build volume is not estimated at all). Buttons: **Start a project with this list**
(service "3D printing", quantity = all pieces, material when every line shares one, the whole list as one line of the brief — the
same replace-by-prefix rule as the other tools), **Copy as text**, **Print this tool** (prints alone, like every tool), **Clear the
list** (asks first). The list stays in the browser (localStorage `nk-parts`, 30 lines max) so it survives a reload and the trip to the
order form. Hand-offs: **"Add to the parts list"** on the NK-S sheet in the Part studio (name, oriented size, chosen material, quantity)
and **"Need several different parts? Add this one to the parts list"** under the fit check. Keyboard: Add a part focuses the new line's
name field, Remove focuses the next line (or the Add button), typing only redraws result lines and the sheet; every input has a label
("Part 3 · Length · mm" for screen readers; the column labels show as a header row on desktop and per field on phones). Phone layout:
name + remove, L / W / H, material + quantity, result line. Works without a price list (size, fit and plates only; a shorter note).
- Tested in Playwright (EN 1280 light, SL 390 dark): tools index T-01 … T-10 (parts = T-09, Part studio = T-10); 40×30×20 PETG ×4 →
  "Fits in one piece · 40 per plate · 1 plate · ≈ 11 g × 4 · ≈ 3 h · ≈ 6.00 € / pc · 24.00 €"; 300×100×50 → "Too big"; 100×258×80 PLA ×3
  → "Fits turned (100 × 80 × 258) · 6 per plate"; sheet "3 part types · 9 pcs · 1 part too big · up to 2 plates · ≈ 464.93 € (file
  preparation 6.00 € included)"; gap 20 → 20 per plate; copy → clipboard text; remove by keyboard; reload keeps the list; print mode
  hides everything but the tool; Start a project → step 1 with the list in "What should it do?", quantity 9; studio hand-off → line 4
  "Spacer 50×25×12 ×6"; fit-check hand-off → line 5; clear with confirm; no overflow at 390 px, no errors; full audit of every view: no errors.
*To remove:* see the comment above `BM_KEY` in `app.js`.

**Ideas for next time** (added to the list below)
- Public: parts list — a plate drawing of the whole order (all footprints mixed on the plates, not per part type).
- Public: parts list — "Save in My corner" and a `#services?tool=parts&list=…` link that opens the same list on another device.
- Admin: Quote tab — "Import a parts list" (paste the brief line → one quote line per part).

## 2026-11-04

**Checked:** build (66 pages), home, #services (incl. `?tool=prices`), #work, #work?view=list, #p-famfive, #p-rfid-drawer-lock, #news,
#n-bambu-lab-x2d, #skills, #about, #contact, #compare, #studio, #gift, #mine, #order (all 4 steps on the local build in EN + SL,
validation, nothing sent), /admin/ sign-in — 1280 + 390 px, light + dark, `/` + `/sl/`: no JS errors, no failed requests (Google
Fonts blocked in the cloud, as always), no horizontal scroll, no CSP violations, no broken images; EN ↔ SL key comparison of
`content.js`: complete (only the intended plural forms differ). Live site from the laptop: `/`, `/sl/`, `/admin/`, `/news/`, two
landing pages, the feed, sitemap, robots, manifest, an `/og/` card all 200, an unknown address 404; the live inline-script hash
equals the CSP hash; "NK-D" present, no "Fusion" — the live page is the 00df108 build. Last Actions run (00df108) succeeded.
**No bugs found.** (Noticed, not changed: the sheet codes NK-C and NK-M are each used by two tools — price list / compare,
material picker / my corner — harmless, but a renumbering would make the codes unique.)

**Improvement — enquiry package (order form + footer; `eqReply()` … `eqFiles()` in `app.js`, `eq:` in `content.js`):**
- **Step 3: "Phone (optional)"** (`type="tel"`, autocomplete, Enter = Next) and **"How should I reply?"** (by e-mail / with a
  phone call). Both go into the brief, the printable brief and the saved draft (`DR_FIELDS` + `reply`); a phone call without
  a number and a phone number that is not one are validation errors with the usual field messages; the Worker keeps getting
  the brief as text, so nothing changes on the relay side.
- **Step 4: "Open in your e-mail app"** next to Copy — a `mailto:` to the studio with the subject and the whole brief as the
  body, so a visitor whose send failed (or who prefers e-mail) does not have to copy and paste.
- **Footer title block: "Save contact"** (.vcf, the QR package's vCard) on every page, next to Copy / LinkedIn.
- **Step 2: ticking "STL / STEP / 3MF file"** in the "What do you already have?" checklist pre-selects "Do you have files? →
  STL / STEP / 3MF" while it still says "No".
- Tested in Playwright (EN 1280 light, SL 390 dark): footer download `nace-kepa.vcf` + message; checklist tick → files option 2;
  step-3 labels; phone-call-without-number → error on `f-reply` (focused); "abc" → error on `f-phone`; Enter in the phone field
  → step 4; brief + `mailto:` body + printable brief carry "Phone: +386 …" and "How should I reply? With a phone call"; draft
  survives a reload with phone and reply; no overflow, no errors.
*To remove:* see the comment above `eqReply()` in `app.js`.

**Innovation — Quote composer NK-O / "Ponudba" (admin tab "Quote"; `QT_KEY` … `qtAct()` in `admin.js`, `.qt-*` rules + the
`qt-print` block in `admin.css`):** Nace answers briefs with a written quote; this tab builds one **from the prices in
Settings** so the quote and the public estimate (`#services?tool=quote`) follow the same rules (minimum hours, minimum per
printed part, file preparation once per order with printed parts, rush surcharge on printed parts, minimum order, the running
promotion or a typed discount). Lines: **Hours** (service × hours, rate from Settings, optional description), **Printed part**
(material from Settings × grams + machine hours × copies, part name), **Custom line** (his own description × unit price × qty,
e.g. parts at cost). Header: quote no. (`NK-O-YYMMDD-NN`, auto-numbered per day, editable), date, valid until (optional — nothing
invented), client, client e-mail, language of the quote (SL default / EN), reference (free text with a datalist of the project
sheet numbers + titles). Notes (one per line) and the VAT note / full-builds note from Settings are printed under the table.
Output: the **A4 quote sheet NK-O** in the drawing-sheet look (NK monogram, title block with no / date / valid until / sheet /
client / reference, mono amounts, totals, notes, "Prepared by N. Kepa · Škofja Loka"), **"Print / save as PDF"** (`html.qt-print`
+ print rules: the sheet alone, one page), **"Copy as text"** (e-mail-ready), **"Open in e-mail"** (`mailto:` to the client with
subject + text, once an e-mail is typed), **"Save in this browser"** (localStorage `nk-admin-quotes`, newest first, 30 kept; the
list on the left loads a saved quote; "Delete saved" asks first). Quotes stay in Nace's browser — nothing goes to the repository
or the site; the tab says so. Works with the keyboard (every input has an id, focus is kept while typing — only the sheet is
redrawn), at 390 px (lines wrap, amounts stay on one line), light + dark; CSP untouched (admin.js is a bundled module).
- Tested with a mocked GitHub API (1280 light, 390 dark): 3 h CAD + 4 × PETG 40 g / 2 h + 8 inserts × 0,50 € + setup, rush,
  promotion → 126 + 34,56 + 4 + 6 = 170,56 · +25 % = 213,20 · −15 % = **181,22 €** (checked by hand) in SL and EN; copied text;
  save → list; new → `-02`; load → fields back; Remove by keyboard; delete with confirm; print class on/off, PDF = 1 page.
*To remove:* see the comment above `QT_KEY` in `admin.js`.

**Ideas for next time** (added to the list below)
- Admin: "Quote from a brief" — paste the e-mailed brief, the tab pre-fills services, quantity, reference and the client's name.
- Admin: quote status (sent / accepted / declined) on the saved list and a monthly total — still browser-only.
- Public: "Request a call" on #contact once Nace publishes a phone number (the brief already carries the client's).

## 2026-11-03

**Checked:** build (66 pages), home, #services (incl. `?tool=prices`), #work, #work?view=list, #p-famfive, #p-rfid-drawer-lock, #news,
#n-bambu-lab-x2d, #skills, #about, #contact, #compare, #studio, #gift, #mine, #order (all 4 steps on the local build in EN + SL,
validation, nothing sent), /admin/ sign-in, the landing pages `/portfolio/famfive/`, `/news/bambu-lab-x2d/` (+ `/sl/`), `/news/`, the
404 page — 1280 + 390 px, light + dark, `/` + `/sl/`: no JS errors, no failed requests (Google Fonts blocked in the cloud, as always),
no horizontal scroll, no CSP violations, no broken images. Live site from the laptop: `/`, `/sl/`, `/admin/`, `/news/`, two landing
pages, the feeds, sitemap, an `/og/` card, robots, manifest all 200, an unknown address 404 (`/news.xml` answered 503 once and 200 on
every retry — GitHub Pages hiccup, not the site); the live inline-script hash equals the CSP hash; "NK-D" present, no "Fusion" — the
live page is the 004558f build. Last Actions run (004558f) succeeded. **No bugs found.** axe-core (WCAG 2.1 AA + best practice) on the
changed views (sheet, post, contact; EN light + SL dark): 0 violations.

**Improvement — publishing safety package (admin; `pfItems()` … `pfKey()` in `admin.js`, "Publishing safety" rules in `admin.css`):**
- **"Before you publish"** panel under the header whenever there is something to publish: it looks only at what changed since the
  last save (new / edited projects and posts, settings) and lists what a visitor would notice — no English description (empty search
  snippet / card), description over 160 characters, missing Slovenian title / description / headline / summary, details or article
  English only, duplicate titles, featured-but-hidden, hidden / draft / scheduled items, more than four featured, a new sheet without
  photos or a model. Warnings (red dot) vs notes; every line has "open →" that jumps to the field (`todoGo()`); folds with the keyboard
  and remembers the fold; re-drawn on every edit (`pfRefresh()` from `updatePublish()`). Nothing blocks the publish — `validate()`
  still does the hard checks.
- **Ctrl+S / Cmd+S publishes** from anywhere in the dashboard (`pfKey()`, document-level); with nothing to publish it says so; the
  Publish button carries the shortcut as its title.
- **"N to do" badge** on every row of the Projects and News lists (`pfBadge()`, the same `TODO_CHECKS` as the To do tab).
- Tested with a mocked GitHub API (1280 + 390 px): panel hidden without changes; Ctrl+S with nothing → notice; 29 project rows with
  badges; editing FamFive (SL title cleared, 170-char description, hidden) → "2 warnings · 1 note" with the right lines, "open →" focuses
  `#t-sl`; a template post → notes (draft, no photo), clearing its SL headline → warning; fold/unfold with Enter; Ctrl+S → the three
  publish calls (trees, commits, refs) → "Published."
*To remove:* see the comment above `PF` in `admin.js`.

**Innovation — QR package / "Skenirajte in odprite" (`src/site/qr.js` + `qrOn()` … `qrDl()` in `app.js`, `qr:` in `content.js`, "QR
package" rules in `page.css`; admin: `ovQr()` … `ovQrDl()`, "QR codes" fieldset in the Overview):** a **QR-code encoder written for the
site** (ISO 18004 byte mode, versions 1–40, levels L/M/Q/H, Reed–Solomon, automatic mask by the standard penalty; ~170 lines, no
dependency, inlined like `drawings.js` on both pages, CSP untouched) draws codes as one SVG path, black on white (inverted codes do not
scan on every phone), with a 4-module quiet zone and an `aria-label`. Where they appear:
- **Project sheets and news posts:** the "Share this sheet" box gets the code of the landing page ("Scan to open on your phone") and
  **"Download QR (SVG)"**; the **printed sheet** ("Print this sheet" / Ctrl+P) carries the code next to "Online: …", so a printout handed
  to a client leads back to the live sheet with its 3D model.
- **Every tool printed alone** (`#services?tool=prices` …, Print package) gets the code of its address in the footer line.
- **Printable portfolio set:** every page footer (cover, index, sheets) has an 11 mm code — the cover to `#work`, each sheet to its page.
- **Contact card (#about / #contact): "Save my contact"** — a vCard code (name, e-mail, nacekepa.work, LinkedIn, Škofja Loka; kept
  short so it stays at version 10) and **"Download contact (.vcf)"** — on a phone the file opens straight into Contacts.
- **Admin › Overview › "QR codes":** home page (EN / SL), price list (EN / SL) and the contact card as SVG downloads for stickers on
  delivered parts, business cards or the printed price list, plus **"QR ↓"** on every page row of the Pages table.
- Verified: the encoder's matrices equal the python `qrcode` reference for 44 text × level combinations (same version, level and mask →
  identical); OpenCV decodes screenshots of the rendered codes (sheet EN/SL, contact card) and the downloaded SVGs back to the exact
  text; Playwright (EN 1280 light, SL 390 dark): share box + download + message, print footer visible only in print, tool footer, contact
  card + `.vcf` by keyboard (Tab + Enter), portfolio set = 32 pages with 32 codes, admin downloads by click and keyboard; no overflow at
  390 px; full audit of every view: no errors.
*To remove:* see the comment above `qrOn()` in `app.js` and the header of `qr.js`.

**Ideas for next time** (added to the list below)
- Public: QR on the NK-S spec sheet / NK-D drawing title block pointing at `#studio`, and in the printed brief (step 4) to `#order`.
- Public: "Save my contact" also as a button in the footer title block (every page), and a vCard with a phone number once Nace publishes one.
- Admin: a printable sticker sheet (A4 grid of the home / price-list QR with the wordmark) for delivered parts.

## 2026-11-02 (evening run)

**Checked:** build (66 pages), home, #services (incl. `?tool=prices` / `?tool=quote` / `?tool=plate`), #work, #work?view=list, #p-famfive,
#p-rfid-drawer-lock, #news, #n-bambu-lab-x2d, #skills, #about, #contact, #compare, #studio, #gift, #mine, #order (all 4 steps on the
local build in EN + SL, validation, nothing sent), /admin/ sign-in — 1280 + 390 px, light + dark, `/` + `/sl/`: no JS errors, no
failed requests (Google Fonts blocked in the cloud, as always), no horizontal scroll, no CSP violations, no broken images; axe-core
(WCAG 2.1 AA + best practice) over 18 views × 2: 0 violations; EN ↔ SL key comparison of `content.js`: complete (the only
differences are the intended Slovenian dual/plural forms). Live site from the laptop: `/`, `/sl/`, `/admin/`, two landing pages,
`/news/`, a post, the feeds, sitemap, two `/og/` cards, robots, manifest all 200, an unknown address 404; the live inline-script
hash equals the CSP hash; "SolidWorks" present, no "Fusion" — the live page is the f2f94ae build. Last Actions run (f2f94ae)
succeeded. **No bugs found.**

**Improvement — print package (tools print as one clean sheet):**
- Printing from a tool's address (`#services?tool=prices` …, Ctrl+P / share → print on a phone) now prints **only that tool**:
  `tlMark()` puts `data-tool` on `<html>` and `tl-on` on the section, the "Print package" rules in `page.css` hide the header,
  footer, CTA band, zones and every other block, flatten the section head and add a print-only footer line
  "Printed from https://nacekepa.work/#services?tool=prices · 2026-11-02" (`.tl-print`, EN/SL). Before, Ctrl+P on the price
  list printed the whole Services page — five pages of forms.
- Every tool's "↑ All tools · Copy link" row has **"Print this tool"** (`tlPrint(k)`: marks that tool, prints, restores the mark
  from the address on `afterprint` or the next click/key), the price list has a **"Print the price list"** button and the quote
  estimate a **"Print the estimate"** button (disabled until there is an estimate, like Copy).
- The price list prints as one column (every row on one line) on **one A4 page**; `break-inside: avoid` on the spec rows, the
  estimate breakdown and the tool results.
- Tested in Playwright (PDF page counts + print-media screenshots): price list EN 1 page, drawing 1 page landscape; the mark
  follows the address (`#services` without a tool and `#work` carry no `data-tool`); "Print this tool" on the fit check while
  the address says prices → prints the fit check, then the price list is marked again.
*To remove:* see the comment above `tlMark()` in `app.js`.

**Innovation — Drawing sheet NK-D / "Risba" (`#studio`, section under the spec sheet; `dwBox()` … `dwDownload()` in `app.js`,
`dw:` in `content.js`, "Drawing sheet" rules in `page.css`):** an **A4 landscape technical drawing of the visitor's part**, drawn
in the browser from the file (STL / 3MF / OBJ) or the typed size in step 01 — three views in **first-angle projection** (front,
view from the left placed on the right, plan below; ISO "E" symbol in the title block), at the **largest standard scale that fits**
(10:1 … 1:100; the L-bracket test part gets 1:1, a 71 mm sphere 1:2), the three **overall dimensions** with extension lines,
arrowheads and values in mm (blue `--dimension`), a light grid, view labels, and a **title block** (title = part name, overall size,
scale, units, date, sheet NK-D, projection symbol; source file · format, material from the picker, quantity, X2D fits / does not
fit in one piece, "Part studio · nacekepa.work"). The views are the file check's silhouettes (`fcMask`) stored as white-with-alpha
PNGs and used as SVG masks over a rect filled with `var(--ink)` — the same markup follows light / dark on screen, prints black on
white and is cached per part / orientation / scale (an 80 000-triangle mesh draws in ~0.3 s; renaming the part costs ~1 ms).
Buttons: **"Print the drawing (A4)"** (`dwPrint()`: `html.dw-print` + an injected `@page { size: A4 landscape; margin: 0 }`,
allowed by the CSP's `style-src 'unsafe-inline'`; the print rules show the sheet alone, exactly one page; cleaned up on
`afterprint` / next click) and **"Download SVG"** (`NK-D-<name>-<date>.svg`, standalone with its own `<style>` and embedded
view images — opens in a browser or Inkscape; blob URL on an `<a download>` like My corner). The orientation picker turns the
drawing too (dimensions follow). On a phone the sheet scrolls sideways inside its frame (focusable, `role="group"`); the SVG has
an `aria-label` with the views, size and scale. Empty state until a part is loaded. Only the visitor's own numbers and the
published X2D volume; nothing uploaded; the note says it is an indicative sketch, not a production drawing. Studio line in the
tools index now says "… spec sheet + A4 drawing → order form".
- Tested in Playwright (EN 1280 light, SL 390 dark): empty state; typed 50 × 30 × 4 box → 3 views, dims 50 / 4 / 30, scale 2:1,
  title block cells; L-bracket STL 60 × 40 × 30 (asymmetric — the plan shows the L the right way up for first angle) → 1:1, title,
  qty 4, "fits"; orientation 2 → dims 60 / 40 / 30; SVG download (19 kB, xmlns, style, 3 images, "SVG saved."), rendered
  standalone from `file://`; print → class + page style, cleaned on afterprint; PDF of the print = 1 page; 390 px: no page
  overflow, the figure scrolls (640 px inside 322 px); 80k-triangle sphere; full audit of every page: no errors, no scroll.
*To remove:* see the comment above `DW_SCALES` in `app.js`.

**Ideas for next time** (added to the list below)
- Public: NK-D — hidden lines / inner contours (edges where the mask has holes), a section view from the Part studio's cut plane,
  and the two-point measurement as an extra dimension on the drawing.
- Public: NK-D — PNG export (draw the SVG on a canvas) for people who cannot open SVG; attach the drawing to "Print or save as
  PDF" of the NK-S spec sheet as page 2.
- Admin: a "print preview" for a project sheet — the A4 print layout shown in the editor before publishing.

## 2026-11-02 (afternoon — Nace: "izbriši modeliranje v Fusion 360")

Removed every Fusion 360 mention from the site (`content.js`): the CAD service body now reads "SolidWorks design for
parts, assemblies and prototypes …" / "Modeliranje v SolidWorksu …", and the "Fusion 360 · Secondary CAD" line is gone
from Skills › Design & CAD. Nothing else named it (checked src/, README, public/). Built and checked #services + #skills
in EN and SL — no "Fusion" left in either page, no JS errors.

## 2026-11-02 (big update — Nace asked for "everything except content": prices, studio 2.0, admin dashboard, blog, SEO, my corner, promotion, gift cards)

Shipped in parts, each built, tested in Playwright and pushed on its own. Nace confirmed every number below live in the chat
(price list proposed from 3dstudio.si / 3dnaklik.si / 2026 rate guides, then "+20 %"; print parameters; the −15 % first-order
promotion until 31 Dec 2026; gift-card amounts 30 / 50 / 100 € + custom). The Cloudflare Worker was NOT touched (his choice:
no file upload with the brief).

### Part 1 — settings.json + admin "Settings" tab + price list, quote estimate, promotion banner

- `src/data/settings.json` (new, inlined as `window.NK_SETTINGS` by `Site.astro`): `pricing` (hourly cad 42 / iot 48 / build 48 /
  post 36 €, minHours 1, print: machineHour 3.6, setup 6, minPart 6, minOrder 18, rushPct 25, materials PLA 0.036 · PETG 0.036 ·
  TPU 95A 0.06 · ABS 0.048 · ASA 0.048 · PA 0.084 · PA-CF 0.132 · PC 0.096 €/g with densities), `printing` (layer 0.2 mm, infill
  15 %, walls 3, rateCm3h 12), `promo` (−15 %, scope first, until 2026-12-31, EN/SL title + text), `gift` (30/50/100, min 20,
  12 months), `faq` (empty), `links.gbp` (empty).
- Admin › **Settings** tab (`admin.js`: `SETTINGS_PATH`, `stNormal()` … `stAct()`, `.st-*` in `admin.css`): every number and
  text above as a form (materials table with add/remove, FAQ list with add/remove/move, gift amounts), published with the
  same commit as projects/news (`settings` in the commit summary); the head-check also compares the settings sha.
  `stClean()` writes numbers as numbers and drops empty values, so an empty field hides the feature on the site.
- Site (`app.js` "Pricing package", `pc:` / `qc:` / `promo:` in `content.js`, "Pricing package" rules in `page.css`):
  - **Price list** `#services?tool=prices` (T-07, `pcList()`): hourly rates, "Minimum 1 h", the promotion row, 3D printing
    per gram + density, machine time, file preparation, minimums, post-processing, rush, the formula line, VAT note.
  - **Quote estimate** `#services?tool=quote` (T-08, `qcBox()` / `qcCalc()`): tick services, hours per service (minHours
    applied), 3D printing: material, weight, print time, quantity, post-processing hours, rush; "My first order" applies the
    promotion; breakdown + indicative total (+ "was → −discount with the promotion"), minimum-per-part / minimum-order notes;
    "Copy estimate"; "Start a project with this estimate" ticks the services, sets quantity + material and puts one
    "Estimate: …" line into the brief. `qcSet()` is the hand-off the Part studio uses (part 2).
  - **Promotion banner** (`promoBand()`): on the home page under the hero, in the price list, in the estimate; the brief's
    "Indicative turnaround" box gets a "Promotion" row. Disappears by itself after `promo.until`.
  - Tools index is now T-01 … T-09 (the two new tools only exist when `settings.json` has prices — `pcOn()`).
- Tested: price list + estimate in EN/SL, 1280/390, light/dark (3 h CAD + 3 × PETG 120 g / 4 h rush → 202.20 €, −15 % →
  171.87 €; copy; hand-off to the order form with services, qty 3, material PETG and the brief line); the admin Settings tab
  against a mocked GitHub API (sign-in, edit, add FAQ + material + gift amount, Publish → `settings.json` in the commit tree
  with numbers as numbers, FAQ saved, nav counts); full audit of every page: no errors, no horizontal scroll.
*To remove part 1:* delete `src/data/settings.json` and its import/inline in `Site.astro`, the "Pricing package" block +
TL_TOOLS entries + `promoBand()` calls + `data-qc-*` handler lines in `app.js`, `pc:` / `qc:` / `promo:` + the `prices` /
`quote` tool lines (and T-01 … T-09 → T-07) in `content.js`, the "Pricing package" CSS, and the Settings tab in `admin.js` /
`admin.css` (see the comment above `isSet`).

### Part 2 — gift cards (#gift) + FAQ + Google Business Profile link

- **Gift cards** `#gift` (`giftView()` … `giftLink()` in `app.js`, `gift:` in `content.js`, "Gift cards" rules in `page.css`;
  amounts 30 / 50 / 100 € + custom (min 20 €) and the validity (12 months) from `settings.json › gift`): amount buttons
  (keyboard, `aria-pressed`), recipient, sender, message (160 chars), the buyer's name + e-mail, honeypot; a live **NK-G
  card preview** (wordmark, date, amount, for/from/message, "Code NK-G-______ · issued after payment", validity + how to
  redeem) that also prints on its own ("Print the preview" / Ctrl+P hides everything else); validation messages; "Request
  this gift card" posts the same payload shape as a brief to the existing Worker (subject "Gift card 75 € — name", the
  request text as summary, the buyer's e-mail as contact — **no Worker change**); sent state with the tracking code and
  "Request another card"; without an endpoint or on failure: the request text with "Copy request" + "Send by e-mail".
  Linked from the price list, the footer ("Start a project → · Gift card →") and `nav.gift` for the tab title. The page
  exists only when `gift.amounts` is non-empty (`giftOn()`; `#gift` falls back to home otherwise). No payments on the site:
  Nace invoices by e-mail and issues the code after payment (that flow is written on the page in EN + SL).
- **FAQ** on `#services` under the tools (`faqBox()`: `<details>` list, first open, from `settings.json › faq`, EN/SL) and
  as `FAQPage` JSON-LD + a block in the static snapshot on the home pages (`Site.astro`). Empty today — the admin Settings
  tab has the editor; nothing is shown until Nace writes the questions.
- **Google Business Profile**: `settings.json › links.gbp` → a "Google" row on the contact card (#about / #contact) and
  `sameAs` in the ProfessionalService JSON-LD. Empty today.
- Tested (build with a mocked Worker endpoint + a temporary FAQ/GBP, then rebuilt without): EN/SL, 1280/390, light/dark;
  empty submit → three errors; 50 € + names + message → card text; custom 15 € → error, 75 € → card; valid request →
  POST payload checked (subject, summary, contact, lang) → sent state; print media: only the card is visible; FAQ
  keyboard toggle; Google row on the contact card; footer link; full audit of every page: no errors, no horizontal scroll.
*To remove part 2:* see the comment above `GIFT` in `app.js`; the `faqLd` / `faqs` lines and the FAQ block in the
snapshot in `Site.astro`; the Google row line in `ctCard()`.

### Part 3 — Part studio 2.0: wall-thickness check + time / material / price estimate

- **Wall thickness** block under the support check on `#studio` (`WT_MAX` … `wtToggle()` in `app.js`, `st.wt` in
  `content.js`, "Part studio 2.0" rules in `page.css`): every triangle's local thickness = distance from its centroid
  straight inwards to the first other triangle (ray through a uniform grid, Möller–Trumbore; the signed volume tells the
  winding; ≤ 40 000 triangles sampled on big meshes). Output: "Thinnest wall ≈ X mm · typical Y mm" (2nd percentile and
  median by area), a histogram of the surface by thickness (< 0.8 / 0.8–1.2 / 1.2–2 / 2–4 / ≥ 4 mm), an optional limit
  "Warn under … mm" (empty by default — no nozzle width is published, so the visitor sets it) with the area + % under it,
  rows "Thinnest wall" / "Under L mm" on the NK-S sheet (copy, print, brief), and "Show thin walls" that paints the thin
  triangles in the 3D view (same overlay slot as "Show overhangs" — switching one on switches the other off). A typed size
  is a box: thinnest wall = smallest side, with a note to drop the real file.
- **Estimate** rows on the NK-S sheet (`stEst()` / `stEstRows()`): material ≈ (surface × wall loops × line width, capped
  at the volume) + infill of the rest, mass from the chosen material's density (settings materials), print time =
  material volume / deposition rate, price = mass × €/g + time × machine hour with the per-part / per-order minimums and
  the file preparation (same rates as the quote estimate); a note with the parameters and "Estimate in detail →" that
  pre-fills the quote tool (`qcSet()`: material, grams, hours, quantity). Only with `settings.json › printing.rateCm3h`
  and a closed mesh (or a typed box); the price row only with a material picked and prices in settings. New setting
  `printing.lineWidth` (0.4 mm, from Nace's "3 walls ≈ 1.2 mm") in the admin Settings tab.
- Tested in Playwright (SwiftShader) with generated STLs: closed hollow box 60 × 40 × 30 with 2 mm walls → "≈ 2 mm", 100 %
  in 1.2–2, nothing under 1.5 mm, ASA ≈ 21 g, 1.6 h, 6.88 € / 26.64 € for 3; 0.8 mm shell → 100 % under 1 mm (tag), 9 g,
  0.7 h; 40 × 40 × 1 plate → 95 % at ~1 mm + 5 % sides; typed 50 × 30 × 4 box → 4 mm; overlay toggles exclusive; hand-off
  to the quote tool (material, 21 g, 1.6 h, qty 3 → breakdown); EN/SL, 1280/390, light/dark; ~2 s for the test meshes;
  full audit of every page incl. #gift: no errors, no horizontal scroll.
*To remove part 3:* see the comment above `WT_MAX` in `app.js`; `lineWidth` in `settings.json` / admin.

### Part 4 — admin Overview dashboard + services editable from the admin

- **Overview** tab (`ovView()` … `ovCopy()` in `admin.js`, `.ov-*` in `admin.css`), now the tab the dashboard opens on:
  *Content health* (projects published, with photos / 3D / materials / details / SL description, featured, posts, posts
  with a photo — bars, red when something is missing, "N missing →" jumps to the To do filter); *What the site shows* (price
  list + estimate, studio estimate, promotion, gift cards, FAQ, Google link — on/off with the values from Settings and
  "open ↗"); *Pages & search* (home + every landing page: description length 50–160 ch, SL text, photo preview, "EN ↗ /
  SL ↗ / Copy link", sitemap count). Unpublished edits are included.
- **Services from the admin**: Settings › *Services* — per service the turnaround (EN/SL) and the "What I need" / "What
  you get" lists (one item per line, EN/SL) stored as `settings.json › services.<key>`; a filled value replaces the text
  built into `content.js` on the site (`app.js` right after `SET`), in the JSON-LD / snapshot (`Site.astro`) and in the
  order form's turnaround rows; empty keeps the built-in text (an SL list falls back to the EN one). Nothing set today.
- Project / news editors: "View on site" became "Open page ↗" to the landing page.
- Tested against the mocked GitHub API (1280/390): stats, features, 31 page rows, Copy link, "missing →" jump, services
  override written as arrays, project editor button; a build with a temporary override shows "1–3 weeks / 1–3 tedne" and
  the new need list on #services (then restored); Settings tab regression; full audit of every page.
*To remove part 4:* see the comment above `isOv` in `admin.js`; the `services` branch in `stNormal()` / `stClean()` and
the Services fieldset; the override blocks after `SET` in `app.js` and after `services` in `Site.astro`.

### Part 5 — news as a blog

- Site (`blogYears()` … `blogMentions()` in `app.js`, `blog:` in `content.js`, "Blog package" CSS): a **year strip** on
  `#news` (chips, `aria-pressed`, keyboard) once there is more than one year of posts or six posts; **"Mentioned in this
  post"** — up to three project sheets whose title (EN or SL, whole words) appears in a post, under the article; a post
  dated after the build day is **scheduled** — left out of `NEWS`, the JSON-LD, the snapshot, the landing pages, the feed
  and the sitemap until a build on or after that day (the maintenance run builds daily); a real **`/news/` index page**
  (+ `/sl/news/`, `view="news"` in `Site.astro`, `src/pages/news/index.astro`) with its own title / description / snapshot
  list, in the sitemap, opening the #news view (the folder used to 404).
- Admin (`NT_TEMPLATES` … `ntInsert()` in `admin.js`): "Start from a template" row in the News list — *New machine or
  tool*, *Finished project*, *Material in practice* — a skeleton in EN + SL with bracketed prompts (no facts), saved as a
  draft; a **toolbar** above each article field (Link, • List, 1. List, "+ Project link…" with the project's landing page,
  inserted at the cursor); **scheduling**: a future date shows "scheduled — goes live with the first site build on …" in
  the editor head and "scheduled" in the list; the date hint explains it.
- Tested with two temporary posts (2025 + one dated 2099, then restored): `/news/` title + h1 + 2 cards + year strip
  "All years 2 / 2026 1 / 2025 1", the 2025 filter, the scheduled post absent from the page, the feed and the sitemap, the
  mentioned FamFive sheet under the SL post; admin: template → draft with skeleton + slug, toolbar list + project link at
  the cursor, scheduled label after a date change; full audit of every page.
*To remove part 5:* see the comments above `state.blogYear` in `app.js` and `NT_TEMPLATES` in `admin.js`; the `TODAY`
filters in `Site.astro`, both `news/[slug].astro`, `feed.ts` and `astro.config.mjs`; the two `news/index.astro` files
and `view` in `Site.astro`.

### Part 6 — SEO: drawn link-preview cards, tool links, feed enclosures

- **Link-preview cards** (`src/og/card.ts`, `src/pages/og/[...path].png.ts`): every published project and news post gets its
  own 1200×630 PNG in both languages — `/og/portfolio/<slug>.png`, `/og/sl/portfolio/<slug>.png`, `/og/news/<slug>.png`,
  `/og/sl/news/<slug>.png` — plus `/og/news.png` and `/og/sl/news.png` for the two `/news/` index pages. Drawn at build time
  like a drawing sheet: frame, grid, the project's line drawing from `drawings.js` (CSS classes turned into attributes),
  sheet number · category · year, title (wrapped, ≤ 3 lines, ellipsis), description, a title block with category / year /
  materials / sheet (posts: published / author / section). Rendered with **`@resvg/resvg-js`** — the one new dependency
  Nace allowed (`package.json` + lockfile, all platform binaries are optional deps, so `npm ci` on Actions and on Windows
  both work). Fonts are the site's own, bundled in `src/og/fonts/` (Schibsted Grotesk ExtraBold + Medium, JetBrains Mono
  Medium — the static OFL TTFs from the two upstream GitHub repos, URLs + sha256 in `SOURCES.txt`, OFL texts next to them;
  the laptop downloaded them straight from GitHub because binary files don't travel well through the patch) so the build
  needs no network and no system fonts; `metrics.json` holds the glyph widths used for wrapping. `Site.astro`:
  `og:image` / `twitter:image` of a landing page is the card unless the item has a photo (a real part still wins), with
  `og:image:width/height/type`; the CreativeWork / BlogPosting `image` in the JSON-LD falls back to the card too. Scheduled
  posts get no card (same `TODAY` rule).
- **Tool links** (`tlUrl()` / `tlCopy()` in `app.js`, `tl.copy…` in `content.js`): every tool on #services ends with
  "↑ All tools · Copy link to this tool" — the address `https://nacekepa.work/#services?tool=<name>` (`/sl/` on the
  Slovenian page) goes to the clipboard, with a fallback message when copying is blocked.
- **Feed**: a post without photos gets `<link rel="enclosure" type="image/png">` pointing at its card. **Admin › Overview**:
  the page table says "drawn preview card" instead of "generic preview image" and has a "Card ↗" link per page.
- Tested: 64 cards built (29 + 29 projects, 1 + 1 post, 2 index) and looked at (FamFive EN, Wi-Fi fridge thermometer SL —
  longest title, Bambu post SL, news index), a temporary photo-less post with a 20-word title (3 lines + ellipsis, feed
  enclosure present) and a 2099 post (no card, not in the feed — then restored); the copy button on `?tool=plate` EN + SL
  (clipboard content, message); admin overview row + card link with the mocked GitHub API; full audit of every page.
*To remove part 6:* delete `src/og/` and `src/pages/og/`, the `ogCard` / `ogSized` lines and the two `/og` image
fallbacks in `Site.astro`, the enclosure line in `feed.ts`, `tlUrl` / `tlCopy` + the `data-tl-copy` handler in `app.js`,
`tl.copy…` in `content.js`, `.tl-back .tb-copy / .tl-msg` in `page.css`, `ovCard()` in `admin.js`, and
`@resvg/resvg-js` from `package.json` (`npm uninstall @resvg/resvg-js`).

### Part 7 — "My corner" (#mine)

- One page (`mnView()` in `app.js`, `mn:` + `nav.mine` in `content.js`, "My corner" CSS) with everything a visitor saved in
  this browser: the **shortlist** (★ sheets, remove, "Compare the first 3", "Start a project with these"), the **unfinished
  brief** (saved when, step, services, the "what" text; continue / clear), **saved comparisons**, **Part studio sheets**
  (every row of the sheet, "Put it in the brief" → the same one-line hand-off as the studio, "Open the studio") and **price
  estimates** ("Put it in the brief"). New save buttons: "Save this comparison" on #compare, "Save sheet to My corner" on
  the studio sheet, "Save estimate" in the quote tool. Storage: localStorage `nk-mine` ({ v: 1, cmp, st, qc }, newest 20
  of each; rows stored as [label, text] in the language they were made in), next to the existing `nk-shortlist` and
  `nk-order-draft`. **Export**: "Print / save as PDF" (opens every card first; print rules hide the controls) and
  "Download as text" (`my-corner-<date>.txt` / `moj-koticek-<date>.txt`, a blob URL on an `<a download>`). **Forget
  everything in this browser** asks first, then clears all three keys and the in-memory state. Entry points: a ★ with the
  count of saved things in the header (`mnLink()`, next to the language switch) and a "My corner" link in the footer.
  Nothing is sent anywhere — the page says so.
- Tested (EN 1280 light, SL 390 dark): empty page; star two sheets → compare → save; studio typed box → save; quote 3 h CAD
  → save; start a brief; #mine shows 2 / brief / 1 / 1 / 1 with the header ★ 6; card opens with 15 rows; text download
  (name, size, first lines); "Put it in the brief" lands on #order step 2 with the Part studio line; remove a comparison;
  forget: ask → yes → empty page, all three storage keys gone, header ★ without a count; full audit of every page incl.
  #mine; studio regression.
*To remove part 7:* see the comment above `MN_KEY` in `app.js`.

### Wrap-up

**Commits (all on main, each deployed by Actions and checked live from the laptop):** 46919fc (morning run: landing pages +
share & link package), dcee0ae (1/6 settings + prices + promo), e299af5 (2/6 gift cards + FAQ + GBP), 9439136 (3/6 studio
2.0), 574bc80 (4/6 admin Overview + services), 675d9eb (5/6 blog), 008aca1 (6/6 SEO cards — the one new dependency,
`@resvg/resvg-js`; the Actions build with it succeeded), 467dc42 (7/7 My corner). Idea 1 of the proposal (content sprint:
photos, materials, details) was left out at Nace's request.

**What only Nace can provide now (nothing invented in the meantime):** FAQ questions (admin › Settings › FAQ — the section
and the FAQPage data appear once there is one); the Google Business Profile URL (Settings › Links — the "Find me on Google"
row and `sameAs` appear once set); services text overrides (Settings › Services) if the built-in text is out of date; the
promo and gift-card flows end in his e-mail (he writes the invoice / card). Photos, materials and details per project stay
the biggest gap (Overview shows 0 / 29 for all three).

**Ideas for next time** (added to the list below)
- Public: the drawn link-preview card as a "Download sheet card (PNG)" button on each project page, and a small gallery
  of all cards on #work (they exist already at `/og/…`).
- Public: My corner — "Send me my corner by e-mail" (the text export as the body of a mailto:, no server).
- Admin: a "Preview card" thumbnail in the project / post editor head (the `/og/…png` of the committed version).
- Admin: a FAQ starter set as a template (questions only, answers left blank for Nace) once he wants a FAQ.

## 2026-11-01

**Checked:** build, home, #services (all tools incl. `?tool=index` / `?tool=plate`), #work, #work?view=list, #p-famfive,
#p-rfid-drawer-lock, #news, #n-bambu-lab-x2d, #skills, #about, #contact, #compare, #studio, #order (all 4 steps on the local
build in EN + SL, validation messages, the e-mail typo hint, nothing sent), /admin/ sign-in and the 404 page — 1280 + 390 px,
light + dark, EN (`/`) + SL (`/sl/`), plus a scan for anything wider than the page, broken images, unlabelled controls,
unnamed buttons/links, duplicate ids and a diff of the EN/SL text keys in `content.js` (none missing). Last Actions run
(48951b1) succeeded; nacekepa.work, /sl/, /admin/ and /news.xml return 200 (checked from the laptop — the cloud sandbox
cannot reach the live site or api.github.com). No JS errors, no CSP violations, no 404s (only Google Fonts, blocked in the
cloud), no horizontal scroll.

**Bugs fixed:** none found today.

**Improvement — share & link package (every place the site hands out the address of a sheet or a post):**
- "Share this sheet" on project sheets and news posts shows the sheet's own short address (`nacekepa.work/portfolio/famfive/`,
  Slovenian `…/sl/portfolio/famfive/`; posts `…/news/<slug>/`) instead of `…/#en-p-famfive` — the same address goes into
  the share e-mail, the native "Share…" sheet, "Ask about this project" (mail body), the printed sheet footer, the A4
  portfolio set footers and the shortlist text (`shareUrl()` in `app.js`; `#en-p-…` links still work).
- New "Sheet no. NK-25-01 · Copy" line under the share link on project sheets (`data-share-no`, status message, Ctrl+C
  fallback that selects the number), so a client can quote the sheet number in an e-mail (idea from the list).
- The admin's "LinkedIn post" box and the URL-name hints in the project / news editors use the new addresses
  (`admin.js`), so a shared post gets its own title + photo as the link preview.
- The Atom feeds link each entry to its landing page (`feed.ts`; the entry `<id>` is unchanged, so readers don't re-show
  old posts); the 404 page's "Did you mean" cards open the landing pages; the static snapshot of the home pages links every
  project and post to its landing page; the JSON-LD lists (CreativeWork / BlogPosting) use the same URLs.
*To remove:* `shareUrl()` back to `'https://nacekepa.work/#' + lang + '-' + kind + '-' + item.slug`, the `share-no` line in
`shareBox()`, `shareCopy(no)` → `shareCopy()`, the `data-share-no` click line, `no` / `noCopy` / `noCopied` / `noCopyFail` in
`share:` (both languages) in `content.js`, the "Share & link package" rules in `page.css`, and the three link lines in
`admin.js`, `404.astro` and `feed.ts` (see the diff of this commit).

**Innovation — landing pages / "Lastne strani projektov in objav" (`/portfolio/<slug>/`, `/sl/portfolio/<slug>/`,
`/news/<slug>/`, `/sl/news/<slug>/`; 60 pages today — 29 projects + 1 post × 2 languages):** every published project and news
post is now a real HTML page with its own address, so it can be found in search on its own and shared with a proper preview.
- `src/pages/portfolio/[slug].astro`, `src/pages/news/[slug].astro` and the `/sl/` twins render `Site.astro` once more per
  item (`getStaticPaths` from `projects.json` / `news.json`, hidden / draft items skipped, slugs `[a-z0-9-]` only).
  `Site.astro` takes `project` / `post` props: `<title>` "FamFive · Nace Kepa", description (project description + "Sheet
  NK-25-01 · IoT · 2025 · materials — Nace Kepa, engineering studio, Škofja Loka" / post summary), canonical + `hreflang`
  en/sl/x-default per item, `og:url`, `og:title`, `og:type article` + `article:published_time` for posts, `og:image` = the
  first photo when there is one (else og.png), JSON-LD `CreativeWork` (with `alternateName` = sheet number) / `BlogPosting`
  + `BreadcrumbList`, and a static snapshot of that sheet / post (title, sheet no., category, year, description, details,
  materials, photos with alt, back link, order link, other-language link) for crawlers and visitors without JavaScript.
  The home pages keep their lists; the inline script, styles and CSP hash are identical on every page (minified once per
  build — `globalThis.__nkMin` memo in `Site.astro`).
- `<meta name="nk-start" content="p-<slug>">` (or `n-…`) tells `app.js` which sheet to open when there is no hash
  (`START_VIEW` / `hashPath()` in `page()` and `currentSlug()`); the first in-app navigation moves the address back to `/` or
  `/sl/` + hash (`onNav()`, `history.replaceState`), Back to the landing address re-opens the sheet (`popstate`, `landingView()`
  from the path), EN/SL on a landing page swaps `/portfolio/…` ↔ `/sl/portfolio/…` (`landingLang()`), and
  `/portfolio/<slug>/#about`-style deep links still open the hash view.
- Sitemap: home pages + all landing pages (62 URLs; redirect pages and /admin stay out — `landingPaths` in
  `astro.config.mjs`). Old-slug redirects (`/portfolio/backpack-buckle` …) now point at the landing pages; the three old slugs
  that equal the new ones (famfive, rfid-drawer-lock, plant-moisture-monitor) are real pages now (redirects removed).
- Tested in Playwright: all four kinds of landing page (EN/SL, 1280/390 px): title, h1, lang, share address, sheet number,
  snapshot replaced, no horizontal scroll, no errors; nav link → `/#work` (`/sl/#work`), Back → sheet again, Forward,
  keyboard `s` / `l`, wordmark → home, deep link with hash, language switch, "Copy" of the sheet number (clipboard granted +
  denied), 404 "Did you mean" → `/sl/portfolio/famfive/`, feed links, the full audit of every section + the order walk on
  the new build. Build: 64 pages in ~5 s, dist 22 MB (each landing page carries the same 330 KB inline app).
*To remove:* delete the four `[slug].astro` files, the `landing`/`item` parts of `Site.astro` (see the note at its top),
`landingView()` … `landingLang()`, `hashPath()`, the `landingLang()` calls and `onNav()` in `app.js` (put back
`window.addEventListener('hashchange', function () { render(false); navFocus(); })`), the `landingPaths` sitemap filter and
the redirect targets in `astro.config.mjs` (`git show 48951b1:astro.config.mjs`), and the README lines.
*Next step (optional day 2):* per-project `og.png`-style preview image drawn from the sheet (line drawing + title) at build
time — needs a renderer without new dependencies, so probably an SVG `og:image` only where supported; "Copy link to this
tool" on each #services tool.

**Ideas for next time** (added to the list below)
- Public: Part studio — wall-thickness check (thinnest wall from ray casts along face normals, warned only against a limit
  the visitor types; nozzle width only if Nace publishes it).
- Public: news archive by year/month with a year strip, and a `/news/` index landing page (once there are more posts).
- Admin: "Open landing page" button next to each project / post (the new `/portfolio/<slug>/` address) and a check that
  the slug is URL-safe before publishing.

## 2026-10-31

**Checked:** build, home, #services (all tools incl. `#services?tool=index` / `?tool=plate`), #work, #work?view=list, #p-famfive,
#p-rfid-drawer-lock, #news, #n-bambu-lab-x2d, #skills, #about, #contact, #compare, #studio (typed size + two test STL files),
#order (all 4 steps on the local build in EN + SL, validation messages, nothing sent), /admin/ sign-in and the 404 page —
1280 + 390 px, light + dark, EN (`/`) + SL (`/sl/`), plus a scan for anything wider than the page, broken images, unlabelled
controls, unnamed buttons/links and duplicate ids. Last Actions run (04c2f84) succeeded; nacekepa.work, /sl/, /admin/ and
/news.xml return 200 (checked from the laptop — the cloud sandbox cannot reach the live site or api.github.com). No JS errors,
no CSP violations, no 404s (only Google Fonts, blocked in the cloud), no horizontal scroll.

**Bugs fixed:**
- Long status tags (`.nk-tag`, `white-space: nowrap`) ran out of their card on phones: in the NK-S spec sheet "Bigger than
  the X2D in this orientation: X 258 > 256 mm" / "V tej legi je večji od X2D …" was clipped at the right edge of the sheet
  at 390 px, and the same could happen to the 3D fit line under the file check and the batch warnings. Tags inside result
  cards now wrap (`page.css`, "Phone results package").

**Improvement — phone results package (`page.css`, `app.js` frame(), `content.js`):**
- Status tags wrap inside the spec sheet, the 3D fit line, the fit-check result, the file-check error and the batch warnings
  (the bug above, fixed for all of them at once).
- Under 480 px the action buttons of the NK-S sheet ("Send to the order form", "Print or save as PDF", "Copy spec") and of the
  file-check result stack full width — one thumb-sized row each instead of a ragged wrap.
- "Back to top ↑" / "Na vrh strani ↑" button in the footer line next to the copyright, shown only on touch screens
  (`(hover: none) and (pointer: coarse)` — the same spot the "Keyboard shortcuts ?" button has on desktops). Scrolls to the
  top (no animation with `prefers-reduced-motion`) and moves focus to `#main`; keyboard works (Enter); hidden in print.
  Helps on the 14 000 px long #services page and the long NK-S / batch pages on phones.
*To remove:* the `<button class="to-top" data-top>` in `frame()`, the `data-top` line in the click handler, `toTop` in both
languages in `content.js` and the "Phone results package" rules in `page.css`.

**Innovation — Support check / "Preverjanje podpor" (`#studio`, block under Orientation + Measure on the stage; rows
"Support (45°)" + "First layer" on the NK-S spec sheet, in "Copy spec", the print and the order brief):** which faces of the
part need support, and which orientation needs the least.
- Every triangle's downward tilt is compared with the overhang limit (default 45° from vertical, adjustable 10–89°) in each of
  the six orientations the studio already offers (ST_PERMS); faces lying flat on the plate count as the first layer instead.
  Output: "Needs support: 466.5 cm² · 54 % of the surface · On the plate (first layer): 0 cm²" (or "No faces over 45° —
  prints without support in this orientation."), and a table "Support by orientation" with X × Y × Z, ✓ fits / too big,
  support cm² + %, first-layer cm², the current row marked, "least support" on the best (fits first, then least support,
  then largest first layer) and a "Use" button on every other row that turns the part (same as the Orientation select).
- "▲ Show overhangs" (chip, `aria-pressed`) paints the faces that need support red in the 3D view: `viewer.js` got
  `setOverlay(positions | null)` — a second mesh of the given triangles as a child of the part, so it follows every turn,
  the scale and the section plane, drawn with a negative polygon offset so it never flickers; re-coloured on theme change.
- A typed size is a plain box (no overhangs) — the block says so and asks for the real file. No print times, no prices;
  the note calls the 45° rule a rule of thumb and says bridges and small details are not counted.
- Tested in Playwright (SwiftShader) with two generated STLs: a T-part (10 × 10 × 30 post under a 40 × 40 × 10 plate →
  16 cm² / 26 % as in the file, 3 cm² / 5 % lying on its side = "least support", first layer 1 cm² vs 4 cm²) and an
  inverted pyramid (200 × 200 × 60, faces 59° from vertical → 466.5 cm² at 45°, nothing at 60°, nothing on its side);
  red pixels in the 3D view 5 → 458 when the overlay is on, overlay visible inside the section cut; "Use" by keyboard
  (Enter) changes the select and the sheet; the limit input keeps focus while the results re-render; the rows reach
  "Copy spec" and the order brief ("Support (45°): 16 cm² · 26 %; First layer: 1 cm²"); file removed → block gone; EN + SL,
  1280 + 390 px, light + dark, no errors, no horizontal scroll.
*To remove:* `SP_DEF` … `spToggle()` in `app.js`, `spBox(src)` in `stStage()`, the `spRows(src)` line in `stRows()`,
`spApply()` in `stMount()` / `stAxes()`, the `data-st-sp` / `data-st-sp-use` lines in the click handler and the
`data-st-sp-deg` input listener, `sp:` inside `st` in both languages in `content.js`, the overlay block + `setOverlay` in
`viewer.js` and the "Support check" rules at the end of `page.css`.
*Next step (optional day 2):* paint the first-layer faces in a second colour, count bridges (down-facing faces whose edges
are both supported) separately, and print the support row on the NK-S sheet's silhouette views.

**Ideas for next time** (added to the list below)
- Public: project landing pages — real `/portfolio/<slug>/` (+ `/sl/…`) HTML pages per project (title, description, details,
  JSON-LD, canonical, hreflang) that open the same app view, so each project can rank in search on its own (today the old
  `/portfolio/<old-slug>` paths are `noindex` meta-refresh redirects to `#p-…`).
- Public: wall-thickness check in the Part studio — thinnest wall from the section plane / ray casts, warned against the
  nozzle width only if Nace publishes it.
- Admin: support-check preview for an uploaded model (same spBox on the admin upload preview), to note "prints without
  support" on the project sheet.

## 2026-10-30

**Checked:** build, home, #services (all tools incl. the new `#services?tool=plate`), #work, #work?view=list, #p-famfive,
#p-rfid-drawer-lock, #news, #n-bambu-lab-x2d, #skills, #about, #contact, #compare, #studio, #order (all 4 steps on the local
build in EN + SL, nothing sent), /admin/ sign-in and the 404 page (six wrong addresses) — 1280 + 390 px, light + dark, EN (`/`)
+ SL (`/sl/`), plus a scan for anything wider than the page, broken images, unlabelled controls, unnamed buttons/links and
duplicate ids. Last Actions run (bc053c6) succeeded; nacekepa.work, /sl/ and /admin/ return 200 (checked via the laptop).
No JS errors, no CSP violations, no 404s (only Google Fonts, blocked in the cloud), no horizontal scroll.

**Bugs fixed:**
- English `nav.studio` was missing in `content.js`: on the English page the tab title of `#studio` fell back to the generic
  "Nace Kepa · Engineering Studio" and the `P` row of the keyboard-shortcuts list (`?`) had no label. Now "Part studio".
- Tools index copy still said "T-01 … T-05" / "Five free tools on this page" although the Part studio was T-06 — now
  "T-01 … T-07" / "Seven free tools — six on this page and the Part studio" (EN + SL).
- Tools index at desktop width: six (now seven) items on a five-column grid left one orphan on a second row without a
  dividing line — now four per row with a line between the rows (`page.css`, bottom).

**Improvement — lost-visitor package (`404.astro`, served by GitHub Pages for every unknown address):**
- The 404 page had its own plain sans-serif look and a 10-second auto-redirect to the home page; it is now the same drawing
  sheet as the site (page.css + components.css minified like `Site.astro`, zones, wordmark, nav, "ERR 404 · SHEET NOT
  FOUND", footer with e-mail + LinkedIn), light + dark, and no auto-redirect.
- Language from the address (`/sl/…` → Slovenian, `/en/…` → English) or else the browser language; the whole page, the
  nav and the links to `/` or `/sl/` follow it. Without JavaScript both languages show.
- "Did you mean …": the words in the address are matched against every published project (slug + EN/SL title) and news
  post — exact words, prefixes and words one or two letters off (`/portfolio/famfiv` → FamFive, `/sl/portfolio/
  rfid-kljucavnica` → RFID ključavnica za predal, `/projects/cocktail-dispenser.html` → Avtomatski točilnik koktajlov,
  `/bambu-x2d` → the X2D post). Up to three cards with category / "News" + year, linking to `#p-…` / `#n-…` on the right
  language page.
- "Or search the projects and news for “famfiv” →" opens `#work?q=…` (the existing search link); then "All work",
  "Start a project", "Free tools" (`#services?tool=index`), "Contact" (`#contact`) and the other language.
- Only titles and slugs from `projects.json` / `news.json` are embedded (nothing fetched); the inline script is pinned by
  its SHA-256 hash in the page's own Content-Security-Policy (`connect-src 'none'`); `noindex` kept.
*To remove:* put back the old `src/pages/404.astro` from git (`git show bc053c6:src/pages/404.astro`).

**Innovation — Batch on the plate / "Serija na mizi" (`#services?tool=plate`, T-06 in the tools index; links "How many
fit on one plate? →" under the fit check result and under Quantity in the Part studio):** how many copies of a part fit on
one X2D plate and how many plates the whole batch needs.
- Inputs: footprint X × Y, height (checked against the 260 mm build height), quantity and the gap between parts (default
  5 mm, visitor's choice). Three layouts are counted on the 256 × 256 mm plate: as entered, turned 90°, and mixed (a grid
  plus the leftover strip, right or bottom, filled with turned parts — tried with both orientations as the grid). The best
  is marked and selected; the three are buttons (keyboard, `aria-pressed`) that switch the drawing.
- Output: "18 per plate", % of the plate area, "6 plates for 100 pcs (last plate: 10)" (Slovenian plural forms for
  miza/mizi/mize/miz; "kos." for the pieces), warnings "Too big for the plate" (with the mm over 256, even when turned) and
  "Too tall" (over 260 mm). Top-view drawing of the plate: 1 unit = 1 mm, 16 mm grid like the 3D view, red parts numbered
  up to 60, dimension lines 256 × 256; at most 600 rectangles are drawn (the count is still exact — 0.1 mm parts give
  6 553 600 per plate without stalling).
- "Start a project with this batch" ticks Printing, sets the quantity and puts one "Batch on the plate: 90 × 30 mm,
  gap 5 mm → 18 per plate (mixed), 6 plates for 100 pcs." line into "What should it do?" (replaced, not duplicated, on a
  second hand-off); "Copy layout" copies the same line.
- From the fit check the link carries the entered (or turned-to-fit) size; from the Part studio the size in the chosen
  orientation (after "Turn to fit") plus the quantity. The note says the number of plates says nothing about price or
  printing time (no prices, no times anywhere — only the published 256 × 256 × 260 mm volume).
Tested in Playwright: 120 × 40 / 90 × 30 (mixed = 18 vs 14) / 100 × 100 × 270 (square: no "turned", too tall) / 300 wide
(too big) / 3 × 3 (7225, 600 drawn) / 0.1 × 0.1 gap 0; layout buttons by mouse and keyboard; copy; order hand-off in EN + SL
(print ticked, qty, brief line); links from the fit check and the studio; 1280 + 390 px, light + dark, no errors, no
horizontal scroll.
*To remove:* `PB_LAYS` … `pbToOrder()` in `app.js`, `tlWrap('plate', pbBox())` in `views.services`, the `'plate'` entry
in `TL_TOOLS`, `pbFitLink()` in `fitChecker()`, `pbStLink()` in `stForm()`, the `data-pb-*` lines in the click
handler, the one-line `pb` input listener after the change handler, `pb:` + `tl.plate` in both languages in `content.js` (and the T-01 … T-07 copy back to T-06) and the "Batch on the
plate" rules at the end of `page.css`.
*Next step (optional day 2):* several different parts in one batch (a list of footprints, plates for the whole order) and
the plate layout printed on the Part studio's NK-S sheet.

**Ideas for next time** (added to the list below)
- Public: batch of several different parts (list of footprints + quantities → plates for the whole order).
- Public: the plate layout drawn on the NK-S spec sheet and in the order brief's printable page.
- Public: 404 page — "Copy e-mail" button and the three newest posts when the address matches nothing.

## 2026-10-29 (update 2.0 — Nace asked for a "mega innovative update" live)

**Checked:** the same pass as the second run below after the change (build, all pages incl. #studio, 1280 + 390 px, light +
dark, EN + SL, a11y scan, order walk, file check 3D test) — no errors, no horizontal scroll.

**Innovation — Part studio / "Studio dela" (`#studio`, shortcut `P`, T-06 in the #services tools index, link on the home
"Check it yourself first" line and under the file check result):** one page from file to order.
- 01 Part: drop an STL / 3MF / OBJ (the file check's own reader, so the two tools share the loaded file) or type the outer
  size — a typed size is shown as a box of that size on the X2D plate. Part name.
- Stage: the part on the X2D plate (the 2nd-run viewer: Iso / Top / Front / Side + Section) plus **Orientation** (all six axis
  orders with their X × Y × Z and a ✓ where the part fits; "Turn to fit the printer" appears when fitCalc finds a fitting
  orientation that differs from the current one — the part really turns in 3D, never mirrored) and **Measure** (toggle; a
  click, not a drag, on the part adds a point; two points give the distance in mm with ΔX ΔY ΔZ, drawn as a red dimension
  line; "Clear points").
- 02 What it has to cope with: the material picker's seven needs → the same ranking (mpChosen) → material (or "Not sure —
  recommend one").
- 03 Job: quantity, deadline (checked against the published S-02 printing turnaround like the planner), optional function.
- **Spec sheet NK-S** (live): part, source (file · format · triangles, or typed size), size in the chosen orientation,
  orientation, fits the X2D (per orientation, or "in no orientation, over by N mm"), closed mesh / volume / surface for a
  file, material + why, quantity, deadline + verdict, printing turnaround, measurement, function. "Send to the order form"
  (services print [+ cad for a typed size], files, material, quantity, deadline, "Part studio: …" line + function in
  "What should it do?"), "Print or save as PDF" (only the sheet prints, A4) and "Copy spec".
- `viewer.js`: `setAxes([a, b, c])` (proper rotation, re-centred on the plate, camera re-aimed), `setMeasure(on)`,
  `clearMeasure()`, `opts.onMeasure`, getters `axes` / `measuring`.
Tested in Playwright (SwiftShader): typed size 258 × 100 × 50 → does not fit as in the file → "Turn to fit" → 100 × 50 × 258
fits; measuring two clicks in the Front view (82.4 mm, ΔZ 82.4); needs → PA-CF; qty 3 + deadline in 2 days → "Tight";
copy (12 lines); loading small.stl replaces the typed size (closed mesh, 178.8 cm³); "Remove file" brings the typed size back;
"Send to the order form" fills step 2 (what / qty / material Nylon / PA-CF / files STL / deadline); back to #studio keeps
everything; `P` shortcut; 1280 + 390 px, light + dark, EN + SL, no errors, no horizontal scroll.
*To remove:* `ST_PERMS` … `stOpen()` in `app.js`, `views.studio`, `'studio'` in `PAGES` / `KBD_GO`, the `stRefresh()` line
in `fcRefresh()`, the `'st'` cases in `v3State()` / `v3Handle()`, `stDispose()` / `stMount()` in `render()`, `stOpen()` in
`fcResult()`, the studio items in `tlIndex()` / `tlHome()`, the `data-st-*` lines in the click / input / change handlers;
in `viewer.js` the axes / measure blocks; `st:` + `nav.studio` in both languages in `content.js` and the "Part studio" rules
at the end of `page.css`.
*Next steps:* "lay on the largest face" orientation from the mesh itself, a wall-thickness hint from the section plane,
and the sheet's three silhouette views (fcDraw canvases) printed on the NK-S page.

## 2026-10-29 (second run)

**Checked:** build, home, #services, #work, #work?view=list, #p-famfive, #p-rfid-drawer-lock, #news, #n-bambu-lab-x2d,
#skills, #about, #contact, #compare, #order (all 4 steps on the local build in EN + SL, nothing sent), /admin/ sign-in —
1280 + 390 px, light + dark, EN (`/`) + SL (`/sl/`), plus a scan for anything wider than the page, broken images, unlabelled
controls, unnamed buttons/links, heading jumps and duplicate ids. Last Actions run (c5608fe, this morning's run) succeeded;
nacekepa.work, /sl/, /admin/ and /news.xml return 200 (checked via the laptop — the cloud cannot reach the live site or the
GitHub API). No JS errors, no CSP violations, no 404s (only Google Fonts, blocked in the cloud), no horizontal scroll, no
missing translations.

**Bugs fixed:** none found.

**Improvement — contact package (every way to reach the studio in one place, for visitors who do not want the wizard):**
- "Contact" / "Kontakt" card on #about under the studio facts: e-mail with Copy, LinkedIn, studio location, quote reply
  (≤ 48 h), shipping and languages (the same facts as the hero specs), "Write an e-mail" (subject "Project enquiry —
  nacekepa.work" / "Povpraševanje — nacekepa.work" in the page language) and "Start a project".
- `#contact` (also `/sl/#contact`) opens #about scrolled to that card with focus on it — a short link for LinkedIn replies and
  the e-mail signature.
- The band at the end of every page ("Have a part, a prototype or a problem?") now has "or write an e-mail →" under
  "Start a project", so the second way to get in touch is always one click away.
- JSON-LD: `contactPoint` (e-mail, sl + en, EU, url `#contact`) on the ProfessionalService block.
*To remove:* `ctMail()` … `ctCopy()` in `app.js`, the `ctCard()` call in `views.about`, `ctAlt()` in `ctaBand()`, the
`'contact'` line in `page()`, the `ctGo` line in `render()`, `data-ct-copy` in the click handler, `ct:` in both languages
in `content.js`, `contactPoint` in `Site.astro` and the "Contact package" rules at the end of `page.css`.

**Innovation — 3D preview on the X2D build plate + drawing views + section plane (`#services?tool=file` and every
project sheet with a 3D model):**
- File check: once a client's STL / 3MF / OBJ is read, a new "⬡ Show in 3D on the X2D plate" / "Pokaži v 3D na mizi X2D"
  button under the three silhouette views opens the site's own 3D viewer (three.js, loaded only then) with the part standing
  on the X2D plate: 256 × 256 mm outline in red, the 260 mm build volume as a dashed box, a 16 mm grid. The triangles already
  read for the views are reused — the file still never leaves the browser. A part bigger than the box in the file's own
  orientation is drawn red and a tag says which axis is over ("Bigger than the X2D in this orientation: X 300 > 256 mm");
  otherwise "Fits the X2D in this orientation". Changing the file units re-draws it; "Clear" removes it; the state survives
  leaving #services and coming back.
- Under every 3D view (file check and project sheets): "View: Iso | Top | Front | Side" — Top / Front / Side are true
  orthographic drawing views (like the sheet's three views; orbit, pan and zoom still work from there) — and a "Section"
  slider that cuts the part at a height ("cut at Z = 50.4 mm" / "prerez pri Z = 50,4 mm") so the inside can be seen.
  Buttons and slider work with the keyboard (arrows / Page Up / Page Down on the slider); the bar appears only once the
  viewer is mounted.
- `viewer.js`: `mount()` also takes `{ positions, scale, bed }` and returns `setView()`, `setCut()`, `view`, `info.over`;
  feature edges are skipped above 250 000 triangles so huge client meshes don't stall a phone.
Tested in Playwright (SwiftShader WebGL) with a local 120 × 70 × 60 hollow box and a 300 × 80 × 50 box: open / hide / clear,
all four views, slider by keyboard, unit change, bigger-than-bed tag, leaving and returning, project-sheet bar with a
temporary local STL (no model files were committed), 1280 + 390 px, light + dark, EN + SL, no errors, no horizontal scroll.
*To remove:* in `app.js` the "3D drawing views + section" block (`V3_VIEWS` … `v3Sync()`), `fc3dBox()` … `fc3dToggle()`
and the `fc3dBox()` call in `fcViews()`, `fc3dMount()` in `fcRefresh()` / `render()`, `fc3dDispose()` in `render()`,
`v3Bar('vw')` in `projectView()`, `v3Sync('vw')` in `mountViewer()`, the `state.fc.cut` line in `fcRead()`, the
`data-fc-3d` / `data-v3-*` lines in the click and input handlers; in `viewer.js` `meshFromPositions()` and the bed / ortho /
cut blocks; `fc.v3d*` + `v3:` in both languages in `content.js` and the "3D views" rules at the end of `page.css`.
*Next step (optional day 2):* "Snap to best orientation" (lay the part flat / rotate it into the orientation the fit check
found) and a measuring tool (click two points → distance) in the same bar.

**Ideas for next time** (added to the list below)
- Public: "Snap to the fitting orientation" + two-point measuring in the 3D bar (see above).
- Public: "Copy link to this tool" on each #services tool; `#contact` is the first short link of that kind.
- Admin: upload preview uses the same View / Section bar (viewer.js already supports it — only the bar is missing).

## 2026-10-29

**Checked:** build, home, #services, #work, #work?view=list, #p-famfive, #p-rfid-drawer-lock, #news, #n-bambu-lab-x2d,
#skills, #about, #compare, #order (all 4 steps on the local build, nothing sent), /admin/ sign-in and (with a mocked GitHub
API) the dashboard — 1280 + 390 px, light + dark, EN (`/`) + SL (`/sl/`), plus a scan for anything wider than the page and
broken images. Last Actions run (9b0907b) succeeded; nacekepa.work, /sl/, /admin/ and /news.xml return 200 (checked via the
laptop). No JS errors, no CSP violations, no 404s (only Google Fonts, blocked in the cloud), no horizontal scroll, no
missing translations.

**Bugs fixed:** none found.

**Improvement — #services tools package (help visitors find the five tools on the long Services page):**
- "Check it yourself first" / "Najprej preverite sami" index right under the four service cards: T-01 … T-05 with each
  tool's title and one line (planner, fit check, file check, material picker, what to prepare). Click → the page scrolls to
  the tool and focuses its heading (keyboard and screen readers land there too).
- Deep links to each tool: `#services?tool=plan`, `fit`, `file`, `material`, `prep` (also on `/sl/`) — e.g. to paste into a
  LinkedIn reply ("check if it fits: nacekepa.work/#services?tool=fit"). Opening such a link scrolls to the tool.
- Every tool now ends with "↑ All tools" / "↑ Vsa orodja" (back to the index); the fit check got its own `id="fit"`.
- Home page: under the four service cards a "Check it yourself first" line links straight to the first four tools.
*To remove:* the "Tools on #services" block in `app.js` (`TL_TOOLS` … `tlGo()`), the `tlIndex()` / `tlWrap()` calls in
`views.services`, `tlHome()` in `views.home`, the `state.tool` line in `page()`, the `tlGo` line in `render()`, the "Tools
index" line at the top of the click handler, `tl:` in both languages in `content.js` and the "Tools index" rules at the end
of `page.css`.

**Innovation — Admin "Table" tab (`/admin/` → sixth tab "Table"): bulk editing of all projects as one spreadsheet.**
Every project in site order as one row: sheet number + title (click = open in the editor), Category, Year, Materials,
★ Featured, Hidden — all editable straight in the cells (Enter / Shift+Enter = next / previous row in the same column,
↑ ↓ in the Materials column). A cell that differs from the site gets a red mark; hovering shows the published value.
- Left column: totals ("29 projects · 29 without materials · N values changed") and filters: All, Materials empty,
  ★ Featured, Hidden, Changed (not published), and per category.
- Tick rows (Shift+click ticks a range, the header box ticks all shown) and change them together: set Category, set Year,
  Materials "Replace" or "Add to the end" (joined with " · "), ★ Feature / ☆ Unfeature, Hide / Show. ↶ Undo (up to 30
  steps) reverts a bulk change or a paste.
- "Copy N for Excel" copies the shown rows as a table with a header (URL name, Sheet, Title, Category, Year, Materials,
  Featured, Hidden). Edit it in Excel / Google Sheets, copy it back and use "Paste from Excel": rows are matched by URL
  name; Category / Year / Materials / Featured (yes/no) / Hidden (yes/no) are filled in, empty cells change nothing, and the
  message says what it could not use (unknown URL name, unknown category, bad year).
- Everything is a normal unpublished change (the Publish button counts it). A "hidden: false" the file never had is not
  written, so projects.json only changes where a value really changed.
Main use today: all 29 projects have an empty "materials" field — fill them in one go (that also unlocks the materials row on
the project sheets and the material ideas below). Tested with a mocked GitHub API: cell edit + Enter/↑ moves, change marks,
range select, bulk materials/category/hide + undo, filters, copy → edit → paste round trip (bad category and unknown URL
name reported), open in editor, Publish (checked the committed projects.json: only the intended values changed),
1280 + 390 px, light + dark, no horizontal page scroll, no errors.
*To remove:* the "Table" block in `admin.js` (`isTb` … `tbKey()`), the "Table" tab in `tabsView()`, the `isTb()` lines in
`listView()` / `editorView()`, the `data-tb*` lines in the click, input, change and keydown handlers and the "Table tab"
rules at the end of `admin.css`.
*Next step (optional day 2):* a "Drawing" column and the Slovenian title as a read-only column; drag a cell's value down
("fill down") like Excel.

**Ideas for next time** (added to the list below)
- Public: "Copy link to this tool" on each #services tool (the deep links exist since today).
- Public: once materials are filled in (Table tab) — a "Printed in" filter on #work and material chips on project cards.
- Admin: Table tab for news (date, pinned, draft) with the same bulk edit.

## 2026-10-28

**Checked:** build, home, #services, #work, #work?view=list, #p-famfive, #p-rfid-drawer-lock, #news, #n-bambu-lab-x2d,
#skills, #about, #compare, #order (steps on the local build, nothing sent), /admin/ sign-in and (with a mocked GitHub API)
the dashboard — 1280 + 390 px, light + dark, EN (`/`) + SL (`/sl/`), plus a scan for anything wider than the page and broken
images. Last Actions run (e8f43d5) succeeded; nacekepa.work, /sl/, /admin/ and /news.xml return 200 (checked via the
laptop). No JS errors, no CSP violations, no 404s (only Google Fonts, blocked in the cloud), no horizontal scroll, no
missing translations. All 62 EN/SL text pairs in projects.json / news.json were also checked with today's new tool: no
problems (FamFive's title is the same in both languages on purpose).

**Bugs fixed:** none found.

**Improvement — news reading package (#news, news posts, the admin news preview and the Atom feed):**
- Reading time on every news card and post header: "1 Oct 2026 · 1 min read" / "1. okt. 2026 · 1 min branja"
  (counted from the post's own words at 200 a minute; nothing invented).
- Links in articles: an `https://…` address or an e-mail address typed in a post now becomes a link (web links open
  in a new tab and say so to screen readers, e-mail links open the mail app). Before, they were plain text.
- Numbered lists in articles: lines starting with "1. ", "2. " become a numbered list (01, 02 … in the drawing style),
  like the existing "- " lists.
- Previous / next post: posts now end with the same "← Previous post · Next post →" pair as project sheets
  (`rel="prev"/"next"`, "Prejšnja / Naslednja objava"); before there was only a "next" link. Shows once there are two posts.
- The same text rules are used in the admin news preview (`pvRich()`, links underlined) and in the Atom feed (`feed.ts`).
*To remove:* the "News reading" block in `app.js` (`RD_LINK` … `rdNav()`, put back the old `richText()`), the two
`rdMin(n)` calls in `newsCard()` / `postView()`, `rdNav(n)` in `postView()` (put back the old `next` link), `rd:` in both
languages in `content.js`, `PV_LINK` / `pvInline()` in `admin.js`, `LINK` / `inl` in `feed.ts` and the "News reading" rules
at the end of `page.css`.

**Innovation — Admin translation workspace (`/admin/` → tab "EN ⇄ SL"):** every English/Slovenian text pair on the site
in one place — project title, one-line description and details; news headline, summary and article — English on the
left (read-only), Slovenian on the right (editable; it is the same field as in the editor, so typing here is a normal
unpublished change and the Publish button counts it). Each pair is checked as you type:
- Slovenian missing (English is shown on /sl/), Slovenian identical to English, only Slovenian;
- numbers that differ ("EN only: 260 · SL only: 206" — sizes, temperatures, counts; "3D" is ignored);
- much shorter / longer than English (under 50 % or over 200 %, for texts of 40+ characters);
- a different number of list items or paragraphs.
Left column: progress ("61 / 62 texts have Slovenian", green bar), "Needs a look" / "Missing Slovenian" / "All texts",
and Projects + news / Projects / News. "Next to check ↓" jumps the cursor to the next flagged Slovenian field. "Copy N for
translation" copies every text that has no Slovenian yet as blocks (`### p:slug:field` + English) to paste into a translator;
"Paste translations" takes the translated blocks back and fills them in (reports how many, and which lines it could not
use). The project/post name opens it in the editor at that field. The tab shows how many texts need a look.
Tested with a mocked GitHub API: missing / same / numbers / news cases, typing a fix (checks, counts, Publish button and
focus update), filters, keyboard, copy + paste round trip (unknown key reported), open in editor, 1280 + 390 px,
light + dark, no horizontal scroll, no errors. Today all real texts pass, so it opens on "Complete" — it is for the next
projects and posts.
*To remove:* the "Translate" block in `admin.js` (`isTr` … `trAct()`), the "EN ⇄ SL" tab in `tabsView()`, the `isTr()` lines
in `listView()` / `editorView()` / `spRefresh()`, the `data-tr` lines in the input and click handlers and the "Translate"
rules at the end of `admin.css` (they also set the tab bar to 3 columns × 2 rows).
*Next step (optional day 2):* include the service texts and FAQ from `content.js` read-only, and a "Copy all for review"
export of the whole site in both languages.

**Ideas for next time** (added to the list below)
- Admin: "Insert link" and "Numbered list" buttons above the news article field (the site now understands both).
- Public: "In this post" list of the links mentioned in a news article, under the article.
- Admin: translation workspace check for the same project name spelled differently in EN and SL.
- (Built 2026-10-29: admin "Table" tab — bulk edit + Excel copy/paste; #services tools index + deep links as the improvement.)
- Public: "Copy link to this tool" on each #services tool (the deep links exist since today).
- Public: once materials are filled in (Table tab) — a "Printed in" filter on #work and material chips on project cards.
- Admin: Table tab for news (date, pinned, draft) with the same bulk edit.

## 2026-10-27

**Checked:** build, home, #services, #work, #p-famfive, #p-rfid-drawer-lock, #news, #n-bambu-lab-x2d, #skills, #about,
#compare, #order (all 4 steps on the local build, nothing sent), /admin/ sign-in — 1280 + 390 px, light + dark, EN (`/`) +
SL (`/sl/`), plus an axe-core audit (WCAG 2.2 AA + best practice, test-only, not added to the repo), a phone tap-target
and keyboard-focus scan, a scan for anything wider than the page, broken images and EN text on the SL page (and vice
versa). Last Actions run (52db0c2) succeeded; nacekepa.work, /sl/, /admin/ and /news.xml return 200 (checked via the
laptop). No JS errors, no CSP violations, no 404s (only Google Fonts, blocked in the cloud), no horizontal scroll, no
missing translations.

**Bugs fixed:**
- Project sheets: the side panel (Category/Year, buttons, share, print) was an `<aside>` landmark nested inside `<main>`
  (axe "landmark-complementary-is-top-level") — screen readers announced it as a separate page region. Now a plain `div`.

**Improvement — phone & assistive-tech package:**
- Phone keyboards: order form Quantity opens the number pad (`inputmode="numeric"`); Quantity, Name and E-mail show a
  "Next" key (`enterkeyhint`, matches Enter = Next from 2026-10-26); the e-mail field no longer auto-capitalises or
  spell-checks; the #work search shows a "Search" key.
- Links that open a new tab (LinkedIn in the footer title block and on the order "sent" screen) now say so to screen
  readers: "(opens in a new tab)" / "(odpre se v novem zavihku)" (`newTab` in `content.js`); the ↗ is hidden from them.
- Footer title-block links (e-mail, LinkedIn, Start a project) get a 24 px tall touch area on phones (WCAG 2.5.8);
  they were 16 px. No visual change on desktop.
- The project side-panel landmark fix above.
*To remove:* the attributes on `f-qty` / `f-name` / `f-email` / `find-q`, the two `newTab` spans in `app.js`, `newTab` in
`content.js` and the "Phone tap targets" rule at the end of `page.css`.

**Innovation — Drawing register / "Seznam risb" (`#work` → "View: Sheets | Register", link `#work?view=list`):**
every project as one line of an engineering drawing register: sheet number, title + one-line description, discipline,
year and a ☆ button to add/remove it from the shortlist. Click (or Enter on) a column heading to sort — number, title
(A–Z in the visitor's language, Slovenian order on /sl/), discipline, year (newest first) — again to reverse; the sorted
column has a red arrow and `aria-sort`. It follows the search box and the category chips ("5 of 29 sheets", "Shown: IoT 5 ·
2025"), the view is kept in the address (so "Link to these results" and Back open the register again), and coming back
from a sheet focuses its row. "Copy register" copies the shown lines as text ("NK-25-12 · Wi-Fi fridge thermometer · IoT
· 2025 — link") for an e-mail. On phones each row becomes a compact two-line entry. A "3D" and a "Photos" column appear
on their own once a published sheet has a 3D model / photos — today none does, so they are not shown. Uses only the
published sheets; nothing is stored or sent (the ☆ uses the existing shortlist).
Tested: EN/SL, light/dark, 1280 + 390 px, keyboard (view switch, sort buttons, ☆ keep focus and announce the change),
filter + search + empty result, shortlist on/off, copy, open a sheet and Back, reload, switch back to Sheets, axe clean,
no CSP violations, no horizontal scroll.
*To remove:* the "Drawing register" block in `app.js` (`state.rg` … `rgCopy()`), `rgBar()` + `rgTable()` and the `hidden`
on `#find-grid` in `views.work`, `rgApply()` at the end of `findApply()`, the `view` lines in `findQuery()` / `findRead()`,
the four `data-rg-*` lines in the click handler, the `rgOn() ? '#rg'` part of the back-to-card line in `render()`, `rg:` in
both languages in `content.js` and the "Drawing register" rules near the end of `page.css`.
*Next step (optional day 2):* "Print register" (one A4 table page, reusing the portfolio-set print code) and a "Compare
selected" checkbox column that opens `#compare?s=…`.

**Ideas for next time** (added to the list below)
- Public: keyboard shortcut `v` to switch #work between Sheets and Register (add to the `?` list).
- Admin: "Register" check in the To do tab — sheets whose one-line description is much longer than the rest.
- Public: news register (date, title, summary) on #news once there are more posts.

## 2026-10-26

**Checked:** build, home, #services, #work, #p-famfive, #p-rfid-drawer-lock, #news, #n-bambu-lab-x2d, #skills, #about,
#compare, #order (all 4 steps on the local build, nothing sent), /admin/ sign-in and (with a mocked GitHub API) the project
editor — 1280 + 390 px, light + dark, EN (`/`) + SL (`/sl/`), plus a scan for anything wider than the page, broken images
and EN text on the SL page (and vice versa). Last Actions run (4eb8ee7) succeeded; nacekepa.work, /sl/, /admin/ and
/news.xml return 200 (checked via the laptop). No JS errors, no CSP violations, no 404s (only Google Fonts, blocked in the
cloud), no horizontal scroll, no missing translations.

**Bugs fixed:** none found.

**Improvement — order form flow package (`#order`):**
- **Enter = Next:** pressing Enter in a one-line field (or on a service checkbox) goes to the next step, like a normal
  form; Enter in the text areas still makes a new line (`ofKey()` in the keydown handler).
- **Finished steps are buttons:** in the 01–04 step bar, the steps you already did ("01 / 04 Services", …) are underlined
  buttons that jump straight back to that step with everything kept ("Back to step 1: Services" / "Nazaj na korak 1:
  Storitve" for screen readers); a finished step has a filled dot. Not offered after the brief has been sent.
- **Errors clear while typing:** a field marked as missing ("Describe the project…", name, e-mail) goes back to normal as
  soon as it is filled in correctly, instead of staying red until "Next".
- **E-mail typo hint:** "Did you mean ana@gmail.com? [Use it]" / "Ste mislili …? [Uporabi]" under the e-mail field for
  common misspelt domains (gmial.com, hotmial.com, outlok.com, siol.nt, …, and .con/.cmo endings), so replies don't get
  lost. Nothing is changed unless the visitor presses "Use it".
- **Step in the tab title:** "Start a project · 2/4 Project · Nace Kepa" / "Začni projekt · 2/4 Projekt".
*To remove:* the "Order flow" block in `app.js` (`OF_TYPO` … `ofKey()`), the `ofSteps(x, st)` call in `orderView()` (put
back the old `x.steps.map(…)`), `ofTypoBox()` in step 3, `ofInput(…)` in the input handler, the `data-of-*` lines in the
click handler, `ofKey(ev)` in the keydown handler, the step part of the `order` line in `pageTitle()`, `of:` in both
languages in `content.js` and the "Order flow" rules at the end of `page.css`.

**Innovation — Admin "Preview on the site" for projects (`/admin/` → Projects → open a project → box under Photos):**
the project as visitors will see it, updated while you type, in EN or SL and at Desktop or Phone width:
- where it appears: its sheet number and position on #work (and the old number if Publish will change it), and whether
  it is the large home-page sheet, one of the "Selected work" cards, featured-but-not-shown, or not on the home page;
- the #work card **between its neighbours** (previous and next sheet, faded), so you see how it reads in the grid;
- the project page: sheet label, title, one-line description, cover photo or line drawing (with a "3D model ·
  Interactive preview" tag when a model is attached), the Category/Year/Materials/3D model table, Details, the two buttons
  and the photo strip;
- notes: missing Slovenian text (shown dashed, as on the SL page), no description, no photo (line drawing shown), hidden
  (no sheet number), "Not live yet — press Publish", and when the one-line description is longer than on any other
  sheet (so the card would be taller than its neighbours) — the limit is taken from the other sheets, not invented.
Read-only: it changes nothing in `projects.json`. Tested with a mocked GitHub API: EN/SL, Desktop/Phone, typing in
title/description (EN + SL), clearing the SL title (fallback note + dashed), a very long description, hidden, a project
with a 3D model, materials and details, keyboard (buttons keep focus), light + dark, 1280 + 390 px, no horizontal scroll,
no errors.
*To remove:* the "Sheet preview" block in `admin.js` (`SP` … `spRefresh()`), the `spSection(p)` call in `editorView()`, the
`data-sp-*` line in the click handler, the `spRefresh()` call in the input handler and the "Sheet preview" rules at the
end of `admin.css`.
*Next step (day 2):* a "Similar projects" row and the home-page hero in the preview; the same neighbours view for news.

**Ideas for next time** (added to the list below)
- Public: "Back to step" links inside the step-4 brief (click "Material: …" → jump to that field).
- Admin: preview of the static no-JavaScript snapshot / search-engine text for a project (title + description as Google
  would show them).
- Public: order step 3 — "How should I reply?" (e-mail / phone / LinkedIn) choice carried into the brief.

## 2026-10-25

**Checked:** build, home, #services, #work, #p-famfive, #p-engineered-backpack-buckle, #news, #n-bambu-lab-x2d, #skills,
#about, #order (all 4 steps on the local build, nothing sent), /admin/ sign-in — 1280 + 390 px, light + dark, EN (`/`) +
SL (`/sl/`), plus a scan for anything wider than the page, broken images and EN text on the SL page (and vice versa).
Last Actions run (39c3e74) succeeded; nacekepa.work, /sl/, /admin/ and /news.xml return 200 (checked via the laptop).
No JS errors, no CSP violations, no 404s (only Google Fonts, blocked in the cloud), no horizontal scroll, no missing
translations.

**Bugs fixed:**
- #work: pressing a category chip (IoT, CAD, …) with the keyboard re-drew the page and dropped focus to the top of the
  document, so keyboard and screen-reader users lost their place. Focus now stays on the chip (see the package below).

**Improvement — #work browsing flow package:**
- Back from a project sheet (browser back, "← All work") or a news post lands on the card you opened — scrolled into view
  and focused — instead of the top of a 29-sheet list (`state.from` lines at the end of `render()` in `app.js`).
- Category chips keep keyboard focus and announce "5 sheets shown" / "Prikazanih listov: 5" in the existing live region
  (`data-filter` line in the click handler; `sl.shownN` in `content.js`).
- Shortlisted sheets carry a red ★ in their card header everywhere (#work grid, home, "Similar projects"), with
  "On your shortlist" / "V vašem izboru" for screen readers (`sheet()` in `app.js`, `.sl-mark` in `page.css`).
- New "⇄ Compare sheets side by side" entry under the #work filters and on each sheet (see the innovation).

**Innovation — Compare sheets / "Primerjava listov" (`#compare`, e.g. `/#compare?s=famfive,rfid-drawer-lock`):** up to
three project sheets side by side as one drawing-sheet table: drawing (or cover photo), sheet number, title, then
Category, Year, Description, Materials, 3D model, Photos and Details. Rows where the sheets differ are marked with a red Δ
and a red edge; an "In common:" line says what they share (same category / same year / all have a 3D model). Pick the
sheets with three selects (A/B/C, grouped by category, sheets already picked are disabled), "+ Add a third sheet", ✕ to
remove. The choice lives in the address, so "Link to this comparison" + "Copy link" give a shareable link
(`https://nacekepa.work/#en-compare?s=…`). "Start a project like these →" puts one "Compared sheets: … (NK-YY-NN); …"
line in the order form's "What should it do?" (replaced, not duplicated, on a second hand-off); "☆ Add all to shortlist".
Ways in: "⇄ Compare with a similar sheet" on every project sheet (this sheet + the most similar one), "⇄ Compare sheets
side by side" under the #work filters, a "⇄ Compare N sheets" button in the shortlist box, keyboard shortcut **C** (listed
in the `?` dialog). An empty `#compare` starts from the shortlist (if 2+ sheets), else the first two featured sheets.
Phone: the table turns into stacked rows with A/B/C columns. Uses only data already on the sheets — today most sheets have
no materials/photos/details yet, so those rows say "Not listed yet" and fill in by themselves when Nace adds them in the
admin. Tested: defaults, add/remove/select (focus stays on the control), disabled duplicates, bad/duplicate slugs in a
shared link (cleaned), EN/SL link prefix, copy link, shortlist add (and "already on"), order hand-off EN + SL (no
duplicates, all 4 steps, not sent), entry links, `C` key, light + dark, 1280 + 390 px, no horizontal scroll, no errors.
*To remove:* delete the "Compare sheets" block in `app.js` (`CMP_MAX` … `cmpSlBtn()`), `compare:` in `views`, the
`h === 'compare'` line in `page()`, `p === 'compare'` in `frame()` (two places), `cmpFrom(p)` in `projectView()`,
`cmpOpen()` in `views.work`, `cmpSlBtn(a)` in `slBox()`, `c: 'compare'` and the two `'compare'` checks in the keyboard
block, the `data-cmp-*` lines in the click/change handlers, `cmp:` and `nav.compare` in both languages in `content.js` and
the "Compare sheets" rules at the end of `page.css`.
*Next step (day 2):* once sheets have materials/photos, a "printed in" row and photo strip; an A4 print layout of the
comparison.

**Ideas for next time** (added to the list below)
- Public: "Compare" checkboxes directly on #work cards (pick 2–3 in the grid → open the comparison).
- Admin: "Compare preview" — check how a project reads next to its most similar sheet before publishing.
- Public: per-category landing text on #work (one sentence per discipline, EN + SL, from Nace).

## 2026-10-24

**Checked:** build, home, #services, #work, #p-famfive, #p-engineered-backpack-buckle, #news, #n-bambu-lab-x2d, #skills,
#about, #order (all 4 steps on the local build, nothing sent), /admin/ sign-in — 1280 + 390 px, light + dark, EN (`/`) +
SL (`/sl/`), plus a scan for anything wider than the page, broken images and EN text on the SL page (and vice versa).
Last Actions run (cdfe60b) succeeded; nacekepa.work, /sl/, /admin/, /news.xml, /sitemap-0.xml and /og.png return 200
(checked via the laptop). No JS errors, no CSP violations, no 404s (only Google Fonts, blocked in the cloud), no
horizontal scroll, no missing translations.

**Bugs fixed:**
- Sheet cards of unequal text length (#work grid, home, "Similar projects") left an empty band *between* the drawing
  and the title on the shorter cards, because the drawing row was the stretching row. Now the text area stretches
  (`.nk-sheet` rows `auto auto 1fr`, foot `align-content: start` in `components.css`): drawings line up, titles start at
  the same height, any spare space is at the bottom.

**Improvement — returning-visitor / contact paths package:**
- When a visitor has an unfinished brief saved in the browser (the saved draft from 2026-10-19), every "Start a project"
  button on the site — header, home hero, CTA band, project sheets, news posts, title-block footer — now says
  **"Continue your brief" / "Nadaljuj povzetek"** and leads to the filled-in form. On #order itself, after sending, or
  after "Clear the form" it is "Start a project" again. (`ctaText()` next to the saved-draft block in `app.js`,
  `dr.cont` in both languages in `content.js`.)
- 404 page: separate English and Slovenian shortcut rows (Projects / News / Start a project → `/`, Projekti / Novice /
  Začni projekt → `/sl/`) instead of one mixed row that always opened the English page; the automatic redirect waits
  10 s instead of 6 s so there is time to pick a link.
- Sheet card alignment (above) — the #work grid and "Similar projects" now read as an even drawing register.

**Innovation — Admin "Arrange" tab (`/admin/` → fourth tab "Arrange"):** the whole project order as one board, for
putting the best work first without 20 clicks on ↑ ↓. Each row: ⠿ drag handle, position, thumbnail (cover photo or the
drawing the site uses), the sheet number it will get (**NK-YY-NN**, with the current number crossed out if it changes),
EN + SL title, category · year, and tags "Home · hero / Home · 2–4", "★ not on home" (featured but beyond the first
four), "Hidden · no sheet", "New". Move a project by dragging the handle (mouse or touch, auto-scrolls at the edges), by
keyboard on the focused handle (↑ ↓, PgUp / PgDn = 5 places, Home / End; a screen-reader announcement says the new
position and sheet number), with ⤒ top / ⤓ bottom buttons, or by typing a position; ☆/★ toggles "featured" in place.
The left column shows the home page as it will be after publishing (hero + the three other cards, same rule as
`featured()` in `app.js`), "Sort all" (Newest first, Featured first, By category, Published order), Undo (up to 50
steps) and a summary ("Order changed. 6 sheet numbers will change. Press Publish …"). It only reorders `S.projects` /
toggles `featured`; nothing is committed until Publish, whose commit message now says "reorder projects" for a pure
reorder. Tested with a mocked GitHub API: drag up/down (1280 px mouse, 390 px), all keys, position field (Enter and
Tab), sorts, undo, published-order reset (= identical to the original), ★ toggle → home preview and tags, publish
(projects.json in the commit, message "admin: reorder projects"), "open in editor" link, light + dark, 1280 + 390 px,
no horizontal scroll, no errors.
*To remove:* delete the "Arrange" block in `admin.js` (`isArr` … the `pointerup`/`pointercancel` listeners), the
"Arrange" tab line in `tabsView()`, the two `isArr()` lines in `listView()` / `editorView()`, the `data-ar` line in the
click handler, the `data-ar-pos` line in the change handler, the `arOrderChanged()` line in `summarize()` and the
"Arrange" rules at the end of `admin.css`.
*Next step (day 2):* drag-and-drop reordering of photos inside a project (cover first), using the same handle code.

**Ideas for next time** (added to the list below)
- Admin: drag-and-drop photo order inside the project and news editors (reuse the Arrange handle code).
- Public: "Selected work" on the home page with a "Show 4 more" button instead of a fixed four.
- Admin: Arrange view for news (pinned first, then date) with a preview of the home "From the workshop" row.

## 2026-10-23

**Checked:** build, home, #services, #work, #p-famfive, #news, #n-bambu-lab-x2d, #skills, #about, #order (all 4 steps on
the local build, nothing sent), /admin/ sign-in — 1280 + 390 px, light + dark, EN (`/`) + SL (`/sl/`), plus a scan for
anything wider than the page and for broken images. Last Actions run (1929365) succeeded; nacekepa.work, /sl/, /admin/,
/news.xml and /sitemap-0.xml return 200 (checked via the laptop — the cloud session can't reach the live site). No JS
errors, no CSP violations, no 404s (only Google Fonts, blocked in the cloud), no horizontal scroll. Keyboard shortcuts,
file check (STL), planner and order wizard re-tested after today's changes.

**Bugs fixed:** none found. (Hardening: the sheet photo `src` in `art()` is now HTML-escaped like every other photo.)

**Improvement — performance package:**
- The inline script and styles of `/` and `/sl/` are now minified at build with esbuild (already shipped with Astro, no
  new dependency): page 290 KB → 241 KB, 80.5 KB → 67.8 KB gzipped — and that is *with* today's new feature included.
  The CSP hash is computed from the minified script, so the CSP is unchanged in strength. If esbuild is ever missing,
  the build falls back to the unminified page (`try … catch` in `src/site/Site.astro`).
- Verified with a pixel comparison (old vs new build, full-page screenshots of home, #work, a project, #news, a post,
  #skills, #about, #order, /sl/, /admin/ at 1280 + 390 px, light + dark): identical, except #services (new section).
- Largest-contentful-paint: the photo that is the first thing on screen (home hero sheet, project page, news post cover)
  now loads eagerly with `fetchpriority="high"` + `decoding="async"` instead of lazily; all other photos stay lazy.
  (No project has a photo yet, so today only the news cover benefits.)
- *To undo the minifying:* delete the `try { … transform … }` block in `Site.astro` and turn `let script`/`let css` back
  into `const`.

**Innovation — Material picker / "Izbira materiala" (`#services`, section under the file check; also a "Not sure which
material? Try the material picker →" link under the Material field in order step 2):** the client ticks what the part
has to cope with (bend/grip, outdoors, heat, load/stiffness, wear/sliding, knocks, looks/detail) and sees the eight
materials listed on #skills (PLA, PETG, TPU 95A, ABS, ASA, PA, PA-CF, PC) ranked on a drawing-sheet table: best match
marked, ● good / ○ workable / ✕ not suited per ticked need, a one-line note per material and "printed in the X2D's heated
chamber" for ABS/ASA/PA/PA-CF/PC. If nothing covers all needs (e.g. flexible + stiff), it says so and points to the order
form (X2D has two nozzles → two materials in one part). The client can choose another suitable row (radio); "Use … in
the order form →" sets the order form's Material, ticks 3D printing, adds a "Material picker: needs — …; chosen …" line to
"What should it do?" (replaced, not duplicated, on a second hand-off) and opens step 2; "Copy" copies the table; "Clear".
Ratings are qualitative general material properties (no numbers, no datasheet values) with the note "An orientation …
confirmed with your quote". Tested: rankings (heat+outdoors → ASA; +flexible → TPU 95A; +load → none), picking another
row, hand-off (material index, service, text, no duplicates), link from order step 2 back to the picker with focus,
clear, EN + SL, light + dark, 1280 + 390 px, keyboard (focus stays on the ticked box), no overflow, hidden in print.
*Nace, please check:* the ratings table `MP_MATS` at the top of the "Material picker" block in `app.js` — it is general
knowledge, adjust any value you print differently (2 good, 1 workable, 0 not suited).
*To remove:* delete the "Material picker" block in `app.js` (`MP_NEEDS` … `mpOpen()`), the `mpBox()` call in
`views.services`, `.replace(/<\/div>$/, mpOpen() + '</div>')` after the Material field in `orderView()`, the four
`data-mp-*` lines in the click handler, the two `data-mp-*` lines at the top of the change handler, the `mpFocus` line in
`render()`, `mp:` in both languages in `content.js` and the "Material picker" rules at the end of `page.css`.
*Next step (day 2):* when Nace fills the `materials` field of projects, show "Printed in this material: …" project links
under each row; let the planner's Material select open the picker.

**Ideas for next time** (added to the list below)
- Public: material picker → "projects printed in this material" (needs `materials` filled in the admin).
- Admin: "Speed" panel — page size before/after gzip and the largest photos, from the built files.

## 2026-10-21

**Checked:** build, home, #services, #work, #p-famfive, #p-scheduled-pet-feeder, #news, #n-bambu-lab-x2d, #skills, #about,
#order (steps 1–2 on the local build, nothing sent), /admin/ sign-in — 1280 + 390 px, light + dark, EN + SL, plus a scan for
anything wider than the page. Last Actions run (93e2c4a) succeeded; nacekepa.work, /admin/, /news.xml and /sitemap-0.xml
return 200 (checked via the laptop). No JS errors, no CSP violations, no 404s, no horizontal scroll, EN and SL text keys
match. No project has a 3D model yet, so the viewer could not be tested.

**Bugs fixed:** none found.

**Improvement — SEO package: a real Slovenian page, `https://nacekepa.work/sl/`:**
- Until now Slovenian existed only behind `/#sl`, which search engines treat as the English page — Google never saw the
  Slovenian text, so "3D tisk Škofja Loka"-type searches could not find it. `/sl/` (was a redirect) is now the same site
  starting in Slovenian, with `<html lang="sl">`, a Slovenian title, description, link-preview text (`og:locale sl_SI`) and
  JSON-LD (services, projects, news in Slovenian, `inLanguage: sl`), and the Slovenian static snapshot for crawlers and
  visitors without JavaScript.
- Both pages declare each other with `hreflang` (`en`, `sl`, `x-default` = English) and have their own canonical URL;
  `/sl/` is in the sitemap (the old `/sl/services`… redirects stay out).
- The Slovenian Atom feed (`/news-sl.xml`) now links to `/sl/#n-…`; the 404 page's Slovenian link goes to `/sl/`; the
  English snapshot links "Slovenščina" to `/sl/` and the Slovenian one "English" to `/`.
- Code: `src/pages/index.astro` moved to `src/site/Site.astro` (with a `lang` prop); `src/pages/index.astro` and
  `src/pages/sl/index.astro` just render it. Same script on both → same CSP hash. `START_LANG` line at the top of `app.js`
  (on `/sl/` the app starts in Slovenian; a `#en-…` link still switches). *To undo:* delete `src/pages/sl/index.astro`,
  put `"/sl": "/#sl"` back in the redirects and remove the `START_LANG` line.

**Innovation — File check / "Preverjanje datoteke" (`#services`, section right under "Will it fit the printer?"):** a client
chooses or drops an **STL, 3MF or OBJ** file and sees, without uploading anything: file name and format, size X × Y × Z in
mm, triangle count, surface (cm²), whether the mesh is closed (watertight edge check; open edges counted) and the volume
(cm³, only for closed meshes), plus the X2D one-piece check (same `fitCalc` and wording as the fit check). Three views
(top, front, side) are drawn as silhouettes on the drawing grid with the size box in red. Units: 3MF uses the units in the
file; for STL/OBJ the client can switch mm / cm / m / inch (a warning appears when the size looks odd). "Add to the order
form →" writes a "File check: …" line into "What should it do?", sets "Do you have files?" to "STL / STEP / 3MF", ticks 3D
printing when it fits and opens the order form; "Use in the fit check" fills the three sizes above; "Copy summary"; "Clear".
STEP/IGES get a clear message (export STL/3MF or send the STEP with the brief); files over 200 MB are refused. The file is
read only in the browser (plain JS parsers incl. a small zip reader for 3MF with components and build transforms; no
network, no new dependency, CSP unchanged). Tested: binary + ASCII STL, OBJ, 3MF (deflated, components, rotated build item;
stored, centimetre units), an open mesh, a part bigger than the X2D, a 405,000-triangle STL (~2 s total, views 0.16 s),
STEP, unit switch, fit-check hand-off, copy, order hand-off (service, files, text), EN + SL, light + dark (+ theme switch
redraw), 1280 + 390 px, keyboard (file input focus ring on the drop box, buttons), no overflow, hidden in print.
*To remove:* delete the "File check" block in `app.js` (`FC_MAX` … `fcClear()`), the `fcBox()` call in `views.services`,
the `fcDraw()` line in `render()`, the four `data-fc-*` lines in the click handler, the two `data-fc-*` lines at the top of
the change handler, the "File check: drop" listeners before `submitOrder()`, `fc:` in both languages in `content.js` and
the "File check" rules at the end of `page.css`.
*Next step (day 2):* print-orientation hint (which face down, from the fit check's turned orientation) and showing the
file check line as its own block in the order step 4 brief.

**Ideas for next time** (added to the list below)
- Public: EN/SL buttons on `/sl/` and `/` move between the two URLs (today they switch the language in place).
- Public: file check → "Plan a project like this" style hand-off into the project planner (have = 3D file, size filled).
- Admin: "Search preview" — how the EN and SL Google result for each project would look (title + description length).

## 2026-10-20

**Checked:** build, home, #services, #work, #p-famfive, #p-automated-cocktail-dispenser, #news, #n-bambu-lab-x2d, #skills,
#about, #order (all 4 steps on the local build, no endpoint → nothing sent), /admin/ sign-in — 360 / 390 / 768 / 1280 px,
light + dark, EN + SL, plus a layout scan for anything wider than the page column. Last Actions run (b454a5e) succeeded and
the live site, /admin/ and /news.xml return 200 (checked via the laptop). No JS errors, no CSP violations, no 404s, no
horizontal scroll; EN and SL text keys match.

**Bugs fixed:**
- "How a job moves through the studio" (home, #services, #about) stayed at 8 columns on tablets and phones — the phone
  rules in `page.css` lost to `components.css` (same specificity, loaded later), so the step names overlapped
  ("Firmware / Assembly / Test" on top of each other). Now 4 columns ≤ 1000 px and 2 columns ≤ 720 px, each row with its
  own line (`.nk-process:not(.wiz)` rules).
- On phones, long one-line buttons ("Start a project with these services →") made the whole #services column 20–50 px
  wider than the screen, so the right edge of the fit check and "What to prepare" was cut off. Buttons may now wrap to two
  lines at ≤ 480 px, at the same heights as before.
- About/home timeline dimensions: "1–4 days + post-processing" ran past its dimension line on narrow phones and the 100 %
  line stuck out 4 px; the line now grows to fit its text.

**Improvement — SEO package (search engines, link previews, no-JavaScript visitors):**
- The page now ships a static snapshot of its content inside `#app`: hero text, the four services with their turnarounds,
  all project sheets (title, category, year, description, link), the news headlines, about text and contact. Crawlers that
  don't run JavaScript (Bing, LinkedIn, AI search) and visitors without JavaScript now see real text and links instead of
  one sentence; `app.js` replaces it on its first render, so normal visitors never see it. Built at build time from
  `content.js`, `projects.json` and `news.json` — nothing new written.
- Project and news photos now get alt text (title + photo number) instead of empty alt, so image search knows what they
  show (the "Open photo" button labels are unchanged).
- Project JSON-LD: `image` (photos) and `keywords` (materials) are added automatically as soon as Nace fills them in the
  admin — empty today, so nothing changes until then.
- `sitemap-0.xml` now has `lastmod` (the build date).
- Code: `snapshot` block in `index.astro`, ".ssr" rules at the end of `page.css`, `lastmod` in `astro.config.mjs`.

**Innovation — Project planner / "Načrtovalnik projekta" (`#services`, section right under the four service cards; also
"Not sure which? Try the project planner →" under the services in order step 1):** three questions — *What do you have
now?* (idea / sketch, photos or broken part / 3D file / native CAD), *What is it?* (part / part with electronics /
firmware or electronics only / complete device) and *What should you get back?* (files / printed parts / not sure). The
plan sheet on the right updates live: the services that fit (S-01…S-04) with a one-line reason and their published
turnaround, which "Do you have files?" answer the order form will start with, and optional details — outer size (checked
against the X2D build volume like the fit check), quantity, deadline (compared with the published turnarounds) and
material (the order form's list). It also shows how many items the client will need to prepare ("Show the checklist ↓"
fills "What to prepare" below with the same services and jumps there) and up to three similar project sheets.
"Continue in the order form →" ticks the services, fills files, quantity, deadline, material and a "Planner: …" line in
"What should it do?", and opens step 2; "Copy plan" copies it as text; "Start over" clears it. Rules are simple and
visible (complete device → S-04; idea or sketch → S-01; printed parts → S-02; electronics → S-03); it says "An orientation,
not a quote." Uses only facts already on the site; nothing is stored or sent. Tested: EN + SL, light + dark, 1280 + 390 px,
keyboard (radio groups with arrow keys, details/summary, buttons), copy, checklist hand-off, order hand-off (services,
files, qty, deadline, material, text, step 2), back-link from the order form, no overflow, no CSP errors, hidden in print.
*To remove:* delete the "Project planner" block in `app.js` (`PL_HAVE` … `plOpen()`), the `plBox()` call in
`views.services`, the `plOpen()` call in `orderView()`, the five `data-pl-*` lines in the click handler, the two `plQ` /
`plF` lines in the change handler, the `pf` part of the input handler, the `plFocus` line in `render()`, `pl:` in both
languages in `content.js` and the "Project planner" rules at the end of `page.css`. (`fitCalc(src)` keeps working.)
*Next step (day 2):* a "Planner" link on project sheets that opens it pre-answered for that kind of project; maybe show the
plan in the order step 4 brief as its own block.

**Ideas for next time** (added to the list below)
- Public: planner pre-answered from a project sheet ("Plan a project like this").
- Public: static snapshot also in Slovenian for `/#sl` visitors without JavaScript (today: English with a link).
- Admin: "Planner preview" — show which services the planner suggests for each project's category, to check the rules.

## 2026-10-19 (second run)

**Checked:** build, home, #services, #work, #p-famfive, #p-snap-on-desk-cable-clip, #news, #n-bambu-lab-x2d, #skills,
#about, #order (all 4 steps on the local build, no endpoint → nothing sent), /admin/ sign-in — 1280 px + 390 px, light +
dark, EN + SL, plus an axe-core accessibility scan (test tool only, not added to the site) and a Tab-through of every page.
Last Actions run (307191b) succeeded (checked via the laptop — the cloud session can't reach nacekepa.work). No JS errors,
no CSP violations, no 404s, no horizontal scroll, no broken images.

**Bugs fixed:** none found (the accessibility findings below are handled as the improvement).

**Improvement — accessibility package (whole site):**
- Heading order: sheet cards on #work and the home hero sheet are now `h2` (they sit right under the page `h1`), and the
  service cards on #services are `h2` — axe "heading-order" warnings on home, #services and #work are gone.
- Page changes: after following a link, focus moves to the new page's content (`#main`) and its title is announced through
  a polite live region, so keyboard and screen-reader users don't stay on a link that no longer exists (`navFocus()`).
  Features that set focus themselves ("/" → search) are left alone.
- Order form: hints and errors are linked to their fields (`aria-describedby`), wrong fields get `aria-invalid`, required
  ones `aria-required`; the service choices are a labelled group with the error attached; the step list has
  `aria-current="step"`; after Next/Back focus goes to the new step's heading, and when something is missing focus goes to
  the first field to fix (`wizFocus()`).
- Touch targets ≥ 24 px: footer "Copy", "← All work/news" and the keyboard-shortcuts button.
- Reduced motion now also stops CSS animations; Windows high-contrast mode keeps pressed chips/EN-SL, the current menu item
  and the active order step visible (`forced-colors` rules).
- Code: `REQUIRED` + `field()` / `wizFocus()` / `navFocus()` / `sheetH2()` in `app.js`, `a11y.steps` in `content.js`,
  "Accessibility pass" rules in `page.css`.

**Innovation — Portfolio set / "Mapa listov" (`#work`, box under the sheet grid):** prints the project sheets as an A4
set or saves it as a PDF: choose **All sheets**, **Shown now** (follows the category filter and search above, count updates
live) or **Your shortlist** (when one exists); tick **Cover page** (studio name, the hero text, number of sheets,
categories, date, the four services with their published turnarounds, contact) and **Index of sheets** (sheet no., title,
category, year, page — 18 rows per page). A row of page thumbnails and "Sheets: N · A4 pages: M" show what will print.
Each project page: sheet number, category, year, title, description, the line drawing, a spec row (category, year,
materials / 3D model when present), details when present, and a title-block footer (studio, sheet, page X / Y, date, link
to the sheet online). The PDF gets the name "Nace Kepa · Project portfolio". Line drawings only — photos and 3D models are
never printed (same protection as "Print this sheet"). Uses only data already on the site. Tested: EN + SL, light + dark,
1280 + 390 px, keyboard (radios, checkboxes, Enter on the button), live counts while searching, "no sheets match" disables
the button, shortlist scope, real PDFs rendered with Chromium (32 pages for all 29 sheets, 3 pages for a 2-sheet
shortlist, page numbers in the index match), page cleaned up after printing, normal Ctrl+P unaffected.
*To remove:* delete the "Portfolio set" block in `app.js` (`PS_ROWS` … `psDone()`), the `psBox()` call in `views.work`,
the `psSync()` call at the end of `findApply()`, the `psDone()` call in `render()`, the `data-ps-print` line in the click
handler and the two `data-ps-*` lines at the top of the change handler, `ps:` in both languages in `content.js` and the
"Portfolio set" rules at the end of `page.css`.
*Next step (day 2):* a "Portfolio set" link in the admin that opens it with a chosen set of projects (e.g. for a client
meeting), and photos on the printed pages as an opt-in once Nace decides whether printed photos are OK (today they are
left out on purpose).

**Ideas for next time** (added to the list below)
- Public: `#work?set=slug,slug` link that opens the portfolio set with those sheets pre-selected (send a client "these 5").
- Admin: content-health dashboard — projects without photos / materials / details / SL text, with one-click jump (extends
  the "To do" tab into a scored overview).
- Public: news archive by year/month with a year strip, once there are more posts.

## 2026-10-19

**Checked:** build, home, #services, #work, #p-famfive, #p-snap-on-desk-cable-clip, #news, #n-bambu-lab-x2d, #skills,
#about, #order (all 4 steps on the local build; "sent" screen only with a mocked endpoint, nothing sent), /admin/ sign-in
— 1280 px + 390 px, light + dark, EN + SL. Last Actions run (0d6a577) succeeded; live site returns 200 (checked via the
laptop — the cloud session can't reach nacekepa.work or the GitHub API). No JS errors, no CSP violations, no 404s, no
horizontal scroll, no broken images; EN and SL text keys match.

**Bugs fixed:** none found.

**Improvement:** "Next, send me" / "Naslednje mi pošljite" on the order "sent" screen: the "What do you already have?"
items the client did not tick, with a one-line hint to reply with them — so the next e-mail already has what is missing.
Only shown when at least one item was ticked and something is still missing. `ocNext()` in `app.js`, `oc.next` /
`oc.nextHint` in `content.js`, "Next, send me" rules in `page.css`.

**Innovation — Saved draft / "Shranjen osnutek" (#order, steps 1–3):** the unfinished brief is saved in the visitor's
browser as they type (services, answers, deadline, material, name, e-mail, note, checklist ticks and the step they were
on). On the next visit the form opens where they left off with "Welcome back — your unfinished brief from <date> is
filled in. It is saved only in this browser." "Clear the form" asks "Delete everything you typed?" (Yes, clear / Keep)
before wiping it. The draft is deleted as soon as the brief is sent, and drafts older than 30 days are dropped. Kept in
`localStorage` "nk-order-draft" only — nothing is sent anywhere; stored values are validated on load (unknown services,
bad dates/numbers ignored). Tested: EN + SL, light + dark, 1280 + 390 px, keyboard (Enter on "Clear the form" moves
focus to "Keep"; after clearing, focus goes to the first service), reload restores step + fields + ticks, step 4 brief
contains the restored data, expiry, malformed storage, cleared after a (mocked) successful send; hidden in print.
*To remove:* delete the "Saved draft" block in `app.js` (`DR_KEY` … `drClearAll()`), the `drLoad()` call before the
first `render(true)`, the `drSave()` lines in `render()` and the input/change handlers, the `drBar()` call in
`orderView()`, the three `data-dr-*` lines in the click handler, `dr:` in both languages in `content.js` and the
"Saved draft" rules at the end of `page.css`.
*Next step:* also restore the "Reference projects" line that the shortlist adds (it is already part of "What should it
do?", so it is kept today); maybe a "Saved draft" hint in the header "Start a project" button when a draft exists.

**Ideas for next time** (added to the list below)
- Public: small "Draft saved" dot on the "Start a project" button in the header when an unfinished brief exists.
- Public: "Email this brief to myself" (mailto: to the client's own address) on order step 4.
- Admin: count of projects with an empty `materials` field on the dashboard (all 29 are empty today — a material picker
  or materials index needs this data first).

## 2026-10-17 (second run)

**Checked:** build, home, #services, #work, #p-famfive, #p-snap-on-desk-cable-clip, #news, #n-bambu-lab-x2d, #skills,
#about, #order (steps 1–2 on the local build, nothing sent), /admin/ sign-in — 1280 px + 390 px, light + dark, EN + SL.
Last Actions run (1bba310) succeeded; live site returns 200 (checked via the laptop — the cloud session can't reach
nacekepa.work). No JS errors, no CSP violations, no 404s, no horizontal scroll, no broken images, no EN text on SL pages.

**Bugs fixed:** none found.

**Improvement:** "Copy" / "Kopiraj" next to the e-mail address in the footer title block ("Contact" cell, every page),
with a "Copied." message (falls back to selecting the address) — for visitors whose `mailto:` link opens nothing. Only
shown when `CONTACT_EMAIL` is set; hidden in print. `tbCopy()` in `app.js`, `tbCopy` / `tbCopied` in `content.js`,
"Copy next to the e-mail" rules in `page.css`.

**Innovation — Shortlist / "Izbor" (project sheets `#p-<slug>`: "☆ Add to shortlist" under "Start a project"; `#work`:
"Your shortlist" box at the top once something is saved):** a visitor collects the sheets that are close to what they
want while browsing, then on #work sees them as a list (sheet number, title, category, ✕ to remove) with "Start a project
with these" (opens the order form with "Reference projects: FamFive (NK-25-01); …" added to "What should it do?"),
"Copy list" (sheet numbers, titles and links in the current language) and "Clear shortlist". Kept only in the visitor's
browser (`localStorage` "nk-shortlist", in memory if storage is blocked) — nothing is sent anywhere unless it goes into
the brief. Removed or hidden projects drop out automatically. Uses only projects already on the site. Tested: EN + SL,
light + dark, 1280 + 390 px, keyboard (Enter on the toggle keeps focus; ✕ moves focus to the next ✕ or the search),
status messages, clipboard text, reload keeps the list, hand-off into order step 2; hidden in print.
*To remove:* delete the "Shortlist" block in `app.js` (`SL_KEY` … `slToOrder()`), the `slToggle(p)` call in
`projectView()`, the `slBox()` call in `views.work`, the five `data-sl-*` lines in the click handler, `sl:` in both
languages in `content.js` and the "Shortlist" rules at the end of `page.css`.
*Next step:* a small ★ on shortlisted cards in the #work grid; a shareable shortlist link (`#work?list=slug,slug`) so a
client can send the selection to a colleague who sees the same list.

**Ideas for next time** (added to the list below)
- Public: shareable shortlist link (`#work?list=…`) that opens the same shortlist on another device.
- Admin: "Copy enquiry link" for a group of projects (the shortlist link above) to paste in LinkedIn replies.

## 2026-10-17

**Checked:** build, home, #services, #work, #p-famfive, #p-garden-hose-universal-adapter, #news, #n-bambu-lab-x2d, #skills,
#about, #order (all 4 steps on the local build, no endpoint → nothing sent), /admin/ sign-in — 1280 px + 390 px, light +
dark, EN + SL. Last Actions run (57ade3e) succeeded; live site, /admin/, /news.xml, the sitemap and og.png return 200
(checked via the laptop — the cloud session can't reach nacekepa.work). No JS errors, no CSP violations, no 404s, no
horizontal scroll, no broken images, no EN text on SL pages.

**Bugs fixed:** none found.

**Improvement:** "Copy e-mail" / "Kopiraj e-naslov" button under the e-mail address on order step 4 ("Send it to"), with a
"copied" message (falls back to selecting the address). Only shown when `CONTACT_EMAIL` is set. `mailCopy()` in `app.js`,
`mailCopy` / `mailCopied` / `mailFail` in `content.js`.

**Innovation — What do you already have? / "Kaj že imate?" (`#order`, step 2 "Project", box under the deadline check):**
the published "What I need" lists (`SERVICES[].need`) of the services picked in step 1, de-duplicated, as checkboxes with
the service code (S-01 …) and an "N of M ready" counter. Ticks are shared with "What to prepare" on #services (tick there
→ already ticked here, and back). Once at least one item is ticked, the brief (copy text, sent enquiry, printable A4
brief) gets "Ready: …" and "Still to prepare: …" rows, so Nace sees at once what the client already has and what to ask
for. Uses only texts already on the site; nothing new is sent anywhere except inside the existing brief. Tested: EN + SL,
light + dark, 1280 + 390 px, keyboard (Tab + Space), ticks kept after "Edit answers", brief text with and without ticks,
printable brief rows.
*To remove:* delete the "What do you already have?" block in `app.js` (`ocItems()` … `ocRows()`), the `ocBox()` call in
`orderView()`, the `ocRows()` parts in `briefText()` and `bpSheet()`, the `data-oc-have` line in the change handler,
`oc:` in both languages in `content.js` and the "What do you already have" rules at the end of `page.css`.
*Next step:* in the admin, show the "Ready / Still to prepare" rows of incoming enquiries as a checklist (needs the Worker
to pass them through — not touched today).

**Ideas for next time** (added to the list below)
- Public: "Copy e-mail" also in the footer title block and the 404 page.
- Public: list the not-yet-ready checklist items on the "sent" screen as "Next, send me: …".
- Public: "Start with what I have" — prefill "Do you have files?" in step 2 when "STL / STEP / 3MF file" is ticked.

## 2026-10-14 (second run)

**Checked:** build, home, #services, #work, #p-famfive, #p-engineered-backpack-buckle, #news, #n-bambu-lab-x2d, #skills,
#about, #order (all 4 steps on the local build, no endpoint → nothing sent), /admin/ sign-in — 1280 px + 390 px, light +
dark, EN + SL. Last Actions run (117140c) succeeded; live site returns 200 (checked via the laptop — the cloud session
can't reach nacekepa.work). No JS errors, no CSP violations, no 404s, no horizontal scroll, no broken images, no EN text on
SL pages.

**Bugs fixed:** none found.

**Improvement:** richer structured data for search engines — each service in the `ProfessionalService` JSON-LD now has
its description and a link to #services, and Nace's two certifications (CSWA, CSWA-AM) are listed as `hasCredential`.
Service names/descriptions are read at build time from `SERVICES` in `content.js`, so they can't drift from the page.
`services` + `jsonLd` in `src/pages/index.astro` (data block, the CSP script hash is unaffected).

**Innovation — What to prepare / "Kaj pripraviti" (`#services`, section under "Will it fit the printer?"):** the visitor
picks the services they need (chips S-01 … S-04, pre-set from the order form if they already ticked some) and gets one
combined, de-duplicated checklist of what to have ready — built only from the published "What I need" lists
(`SERVICES[].need`), each item tagged with the service code it comes from. They tick what they already have ("2 of 8
ready"), can "Copy checklist" (plain text with [x] / [ ]) and "Start a project with these services" (opens #order with the
same services ticked). Keyboard: chips are buttons (focus stays on the chip after toggling), items are checkboxes. Tested:
EN + SL (state kept when switching language), light + dark, 1280 + 390 px, copy, hand-off to the order form; hidden when
printing.
*To remove:* delete the "What to prepare" block in `app.js` (`prepSvc()` … `prepToOrder()`), the `prepBox()` call in
`views.services`, the three `data-prep-*` lines in the click handler and the `prepHave` line in the change handler,
`prep:` in both languages in `content.js` and the "What to prepare" rules at the end of `page.css`.
*Next step:* carry the ticked / not-yet-ready items into the order brief (step 4) as their own row.

**Ideas for next time** (added to the list below)
- Public: "What to prepare" items inside the order form (step 2), so the brief says what the client already has.
- Admin: edit the "What I need" / "What you get" lists of each service from the dashboard (EN + SL).
- Public: "Copy contact e-mail" button next to the e-mail address in the footer/CTA band.

## 2026-10-14

**Checked:** build, home, #services, #work, #p-famfive, #p-automated-cocktail-dispenser, #news, #n-bambu-lab-x2d, #skills,
#about, #order (all 4 steps on the local build, no endpoint → nothing sent), /admin/ sign-in — 1280 px + 390 px, light +
dark, EN + SL. Last Actions run (1e80e12) succeeded; live site, /admin/, /news.xml and the sitemap return 200 (checked via
the laptop — the cloud session can't reach nacekepa.work). No JS errors, no CSP violations, no 404s, no horizontal scroll,
no broken images, no EN text on SL pages.

**Bugs fixed:** none found.

**Improvement:** project sheets now have "← Previous project" / "← Prejšnji projekt" next to "Next project" (a
`<nav class="sheet-nav">` with `rel="prev"` / `rel="next"`; on phones the two stack, next first) — the mouse/touch version
of the ← key. `prev` in `projectView()` in `app.js`, `prevProject` / `sheetNav` in `content.js`, `.sheet-nav` in `page.css`.

**Innovation — Printable brief / "Natisni ali shrani kot PDF" (`#order`, step 4 "Brief", button under "Copy brief"; also
under the copy after a sent enquiry):** prints (or saves as PDF via the browser's print dialog) a clean one-page A4 brief
instead of the whole form: "Project brief · <date>" (+ the tracking code when the enquiry was sent), "Your brief", a table of
the answers (services, what it should do, quantity, deadline, files, material, name, e-mail, note), the indicative
turnaround of the picked services (published `SERVICES[].time`), the next step (existing brief/sent text) and the contact
line. Ctrl+P on step 4 gives the same sheet. Lets a client keep the brief or get it approved internally before or after
sending. Uses only what the visitor typed and texts already on the site; nothing is sent anywhere. Tested: EN + SL, light
+ dark (prints light), 1280 + 390 px, keyboard (Tab → Enter calls print once), sent state with a mocked Worker, Edit →
back to step 1, PDF render = 1 A4 page.
*To remove:* delete the "Printable brief" block in `app.js` (`bpBtn()`, `bpSheet()`), the two `bpBtn()` calls and the
`bp-page` / `bpSheet()` parts of the `return` in `orderView()`, the `data-bp-print` line in the click handler, `bp:` in both
languages in `content.js` and the "Printable brief" rules at the end of `page.css`.
*Next step:* add the reference project to the brief when the client came from "Start a project like this" (Similar
projects row) as its own row instead of inside "What should it do?".

**Ideas for next time** (added to the list below)
- Public: make the Similar-projects "Start a project like this" a shareable link (`#order?like=<slug>`) with a visible,
  removable "Reference project" card on the order form (a first version was tried today and left out: it duplicated the
  existing button — reuse `relToOrder()` instead).
- Admin: "Copy enquiry link" for each project (the `#order?like=` link above), EN + SL.
- Public: "Email this brief" button on step 4 (mailto: with the brief as body, only when `CONTACT_EMAIL` is set).

## 2026-10-13 (second run)

**Checked:** build, home, #services, #work, #work?q=esp32, #p-famfive, #news, #n-bambu-lab-x2d, #skills, #about, #order (all
4 steps on the local build, no endpoint → nothing sent), /admin/ sign-in — 1280 px + 390 px, light + dark, EN + SL. Last
Actions run (0232a82) succeeded; live site returns 200 (checked via the laptop). No JS errors, no CSP violations, no 404s,
no horizontal scroll, no broken images, no EN text on SL pages.

**Bugs fixed:** none found.

**Improvement:** projects are now described to search engines as a schema.org `ItemList` of `CreativeWork` (name, short
description, year, category, link `#p-<slug>`, author) — built at build time from `projects.json`, published projects
only. Data block, not executed, so the CSP script hash is unaffected. `projectsLd` in `src/pages/index.astro`.

**Innovation — Keyboard shortcuts / "Bližnjice na tipkovnici" (press `?` anywhere, or the "Keyboard shortcuts ?" button
at the bottom right of every page, under the title block):** a small drawing-sheet dialog listing the keys, and the keys
themselves: `?` show/hide the list, `/` search (existed), `←` / `→` previous / next project sheet (wraps around; on news
posts once there are 2+ posts), `H` home, `S` services, `W` projects, `N` news (only when there is news), `O` start a
project, `L` switch EN/SL, `Esc` close. Off while typing in a field, with Ctrl/Alt/Cmd, in the photo viewer and while
focus is in the 3D viewer. Native modal `<dialog>` (focus goes to Close, Esc / click outside closes, focus returns to the
button). The footer button is hidden on touch-only phones and in print. Tested: EN + SL, light + dark, 1280 + 390 px,
every key, typing "h?l" in the search doesn't trigger anything, Ctrl+L untouched, button via Tab + Enter.
*To remove:* delete the "Keyboard shortcuts" block in `app.js` (`KBD_GO` … `window.addEventListener('hashchange', kbdClose)`),
`+ kbdBtn()` in `frame()`, the `data-kbd` line in the click handler, the `if (kbdKey(ev, typing)) return;` line in the
keydown handler, `keys:` in both languages in `content.js` and the "Keyboard shortcuts" rules at the end of `page.css`.
*Next step:* `G` then a number to jump to sheet NK-YY-NN; show the shortcut hint (`← →`) next to "Next project".

**Ideas for next time** (added to the list below)
- Public: "← Previous project" link next to "Next project" on project sheets (mouse/touch version of the ← key).
- Admin: keyboard shortcut Ctrl+S = publish in the project/news editor.
- Public: project count per year on #work as a small timeline strip (click a year → filter), from `year` in projects.json.

## 2026-10-13

**Checked:** build, home, #services, #work, #p-famfive, #p-automated-cocktail-dispenser, #news, #n-bambu-lab-x2d, #skills,
#about, #order (all 4 steps on the local build, no endpoint → nothing sent), /admin/ sign-in — 1280 px + 390 px, light +
dark, EN + SL. Last Actions run (9ac969b) succeeded; live site returns 200 (checked via the laptop). No JS errors, no CSP
violations, no 404s, no horizontal scroll, no broken images, no EN text on SL pages. (No run on 2026-10-12.)

**Bugs fixed**
- The EN/SL switch did nothing on any address with a language prefix (`#en-p-…`, `#sl-n-…` — exactly the links from
  "Share this sheet", the news feeds and the LinkedIn post): the page switched and was immediately switched back by the
  prefix in the address. The buttons now rewrite the prefix to the chosen language (`langHash()` in `app.js`).

**Improvement:** "Ask about this post" / "Vprašajte o objavi" button next to "Start a project" on news posts — opens an
e-mail to the studio address with "Question about the post: <headline>" and the post link (same as the project button;
only shown when `CONTACT_EMAIL` is set). `askLink(p, kind)` in `app.js`, `ask.btnPost` / `ask.subjectPost` in `content.js`.

**Innovation — Search links on #work ("Link to these results" / "Povezava do teh zadetkov"):** the search box and the
category filter on #work now live in the address (`#en-work?q=esp32&cat=IoT`). As soon as a visitor types a search or
picks a category, a box under the search shows the link in the current language with "Copy link" (clipboard; on failure
the link is selected with "press Ctrl+C"; `role="status"`). Opening such a link restores the search, the filter and the
language — so Nace can send a client "all my IoT projects" or "everything with ESP32" in one link, and a visitor who
opens a project and presses Back gets the same search again. Unknown categories and broken links are ignored; query max
100 characters. Tested: EN + SL, light + dark, 1280 + 390 px, keyboard (Tab → Copy link, Esc clears), clipboard
content, Back button, language switch with an active search.
*To remove:* delete the "Search links" block in `app.js` (`findQuery()` … `findShareCopy()`), the `var qi = …` line in
`page()`, the `findShareBox()` call in `findBox()`, the `findSync()` call at the end of `findApply()`, the
`data-find-copy` line in the click handler, `link` / `linkNote` in `find:` in both languages in `content.js` and the
"Search links" rules at the end of `page.css`.
*Next step:* point the "All N <category> projects →" link under Similar projects and the 404 page at `#work?cat=…` /
a search link; let the filter chip counts follow the search.

**Ideas for next time** (added to the list below)
- Public: filter chip counts follow the active search (e.g. "IoT 2" while searching "esp32").
- Admin: "Link to all projects with …" helper that builds a `#work?q=` link from a word, for LinkedIn messages.
- Public: "Copy sheet number" (NK-YY-NN) next to project titles (still open).

## 2026-10-11

**Checked:** build, home, #services, #work, #p-famfive, #news, #n-bambu-lab-x2d, #skills, #about, #order (all 4 steps on
the local build, no endpoint → nothing sent), /admin/ sign-in — 1280 px + 390 px, light + dark, EN + SL. Last Actions run
(53a06f2) succeeded; live site, /admin/, /news.xml, sitemap and robots.txt return 200 and show yesterday's deadline check
(checked via the laptop). No JS errors, no CSP violations, no 404s, no horizontal scroll, no broken images, no EN text on
SL pages.

**Bugs fixed:** none found.

**Improvement:** the deadline field in the order form (step 2) now has `min` = tomorrow (visitor's local date), so the
date picker on phones and desktops can't offer today or a past date. `dlMin()` in `app.js` (next to `dlBox()`), used in
`orderView()`. The deadline check still handles typed past dates.

**Innovation — Admin "Preview on the site" (`/admin/` → News → open a post → box under Photos, above "LinkedIn post"):**
shows the post exactly as visitors will see it, with the site's own styles: the news card (home page / #news list) and the
post page (date, Pinned, headline, summary, cover photo, article with paragraphs and "- " lists, same rules as the site).
EN/SL switch; updates while typing; photos that are uploaded but not yet published are shown too. Where the Slovenian
headline/summary/article is missing it shows the English text with a dashed red outline and says so (the live SL page does
the same fallback). Notes for an empty article, a draft, and unpublished changes. Read-only — changes nothing in
news.json. Tested with a mocked GitHub API: light + dark, 1280 + 390 px, keyboard (Tab → Enter on EN/SL), live typing,
list rendering, SL fallback marks.
*To remove:* delete the "Site preview" block in `admin.js` (`const PV` … `pvRefresh()`), the `${pvSection(n)}` line in
`newsEditorView()`, the `data-pv-lang` line in the click handler, the `pvRefresh();` line in the input handler and the
"Site preview" rules at the end of `admin.css`.
*Next step:* the same preview for projects (project sheet: title, description, specs, details, cover photo).

**Ideas for next time** (added to the list below)
- Admin: project sheet preview (like the news preview) in the project editor.
- Public: "Ask about this post" e-mail button on news posts (already listed) — reuse `askLink()`.
- Admin: word/character count under each EN/SL article field, with a hint when SL is much shorter than EN.
- Public: "Back to top" link at the end of long news articles and project sheets on phones.
- Public: filter chip counts on #work follow the active search.
- Admin: build a `#work?q=…` link from a word (for LinkedIn messages).
- Public: open the order form from a search link with the matching category's service pre-ticked.

## 2026-10-10

**Checked:** build, home, #services, #work, #p-famfive, #news, #n-bambu-lab-x2d, #skills, #about, #order (all 4 steps on
the local build, no endpoint → nothing sent), /admin/ sign-in — 1280 px + 390 px, light + dark, EN + SL. Last Actions run
(bb205d0) succeeded; live site returns 200 and shows yesterday's "Print this sheet"; /news.xml, /admin/, sitemap and
robots.txt return 200 (checked via the laptop). No JS errors, no CSP violations, no 404s, no horizontal scroll, no broken
images, no EN text on SL pages.

**Bugs fixed:** none found.

**Improvement:** "Ask about this project" / "Vprašajte o projektu" button next to "Start a project" on every project sheet:
opens an e-mail to the studio address with "Question about NK-YY-NN · <title>" in the subject and the sheet link in the
body, so a quick question doesn't need the whole order form. Only shown when `CONTACT_EMAIL` is set. `askLink()` in
`app.js`, `ask:` in `content.js`.

**Innovation — Deadline check / "Preverba roka" in the order form (`#order`, step 2 "Project", under the fields):** as soon
as the client picks a deadline, it shows the date and "N days from today", then for every service picked in step 1 a
small scale drawing (today → usual turnaround band → red deadline line) and a verdict: "Enough time", "Tight — inside the
usual range" or "Shorter than usual". The ranges are read from the published turnarounds in `SERVICES[].time`
(2–5 days, 1–4 days + post-processing, 2–6 weeks); Embedded & IoT has no published time, so it says "Quoted per project".
Past dates get "Check the date". Calendar days, each service on its own, and it says the real date is confirmed with the
quote. If Nace changes a turnaround in `content.js`, the check follows. Tested: EN + SL, light + dark, 1280 + 390 px,
keyboard, 3 / 10 / 60 / 0 days, stays filled after Next → Back.
*To remove:* delete the "Deadline check" block in `app.js` (`dlRange()` … `dlUpdate()`), the `dlBox()` call in
`orderView()`, the `f-deadline` line at the start of the input handler, `dl:` in both languages in `content.js` and the
"Deadline check" rules at the end of `page.css`.
*Next step:* if Nace publishes a turnaround for Embedded & IoT, add `time` to that service and it is checked too; could
add the verdict as one line in the brief.

**Ideas for next time** (added to the list below)
- Admin: edit the service turnarounds (`SERVICES[].time`) from the dashboard.
- Public: "Ask about this post" e-mail button on news posts (same as on project sheets).

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
(A4 print layout) on project sheets and news posts; 2026-10-10 deadline check in the order form (published turnarounds); 2026-10-11 admin "Preview on the site" for news posts. 2026-10-13 search links on #work (`#work?q=…&cat=…`) with "Copy link"; 2026-10-13 (2nd) keyboard shortcuts with a `?` list. 2026-10-14 printable A4 brief on order step 4. 2026-10-14 (2nd) "What to prepare" checklist on #services. 2026-10-17 "What do you already have?" checklist in order step 2, carried into the brief. 2026-10-17 (2nd) visitor shortlist on project sheets + #work, handed to the order form. 2026-10-19 saved order draft (restored on the next visit). 2026-10-19 (2nd) printable A4 portfolio set on #work (cover, index, one page per sheet). 2026-10-20 project planner on #services (three questions → services, turnaround, fit, deadline → order form). 2026-10-21 file check on #services (client STL / 3MF / OBJ read in the browser → size, volume, closed mesh, X2D fit, three views → order form). 2026-10-23 material picker on #services (ticked needs → ranked materials from #skills → order form Material). 2026-10-24 admin "Arrange" tab (drag-and-drop / keyboard project order with sheet numbers and home-page preview). 2026-10-25 compare sheets (`#compare?s=…`, up to three sheets side by side, Δ on differing rows → order form). 2026-10-26 admin project "Preview on the site" (card between its neighbours, project page, home/sheet-number placement, EN/SL, desktop/phone). 2026-10-27 drawing register on #work (`#work?view=list`: one sortable line per sheet, follows search/filter, ☆ shortlist, copy as text).

- A "search" link in the 404 page (search links on #work exist since 2026-10-13).
- Admin: "SL text missing" badge on each project/news row in the list (quick view of what still needs translating).
- Materials index on #work: chips built from the `materials` field of the projects (click → filter by material).
- Shareable "Start a project like this" link (`#order?like=<slug>`) for LinkedIn messages.
- "Related project" link on news posts that mention a project title.
- Admin: warn about duplicate titles / empty SL description before publishing.
- Admin: "N to do" badge on each project row in the Projects list (reuses `TODO_CHECKS`).
- Admin: "Share project" text (like the LinkedIn post) for project sheets.
- Public: "Copy sheet number" (NK-YY-NN) next to the title so clients can quote it in an e-mail.
- Admin: show the public share link of each project/post next to its title.
- Public: "Last updated" line on #work (newest project year / post date), from data already in the repo.
- Admin: after publishing a news post, show "Live in the feed" once `/news.xml` contains the slug.
- Public: anchor links on headings inside long news articles (copy link to a section).
- Admin: edit the service turnarounds (`SERVICES[].time`) from the dashboard.
- Public: "Ask about this post" e-mail button on news posts (reuse `askLink()`).
- Admin: project sheet preview (like the news preview) in the project editor.
- Admin: word/character count under each EN/SL article field, with a hint when SL is much shorter than EN.
- Public: "Back to top" link at the end of long news articles and project sheets on phones.
- Admin: Ctrl+S = publish in the project/news editor.
- Public: projects-per-year strip on #work (click a year → filter).
- Admin: "Copy enquiry link" (`#order?like=<slug>`) for each project, EN + SL.
- Public: "Email this brief" (mailto: with the brief) on order step 4 when `CONTACT_EMAIL` is set.
- Admin: edit each service's "What I need" / "What you get" lists from the dashboard (EN + SL).
- Public: "Copy e-mail" on the 404 page (order step 4 and the footer have it since 2026-10-17).
- Public: shareable shortlist link (`#work?list=…`) that opens the same shortlist on another device.
- Admin: "Copy enquiry link" for a group of projects (the shortlist link) to paste in LinkedIn replies.
- Public: prefill "Do you have files?" in step 2 when "STL / STEP / 3MF file" is ticked in the checklist.
- Public: "Draft saved" dot on the header "Start a project" button when an unfinished brief exists.
- Public: "Email this brief to myself" (mailto: the client's own address) on order step 4.
- Admin: dashboard count of projects with empty `materials` (needed before a material picker / materials index).
- Public: `#work?set=slug,slug` link that opens the portfolio set with those sheets pre-selected.
- Admin: content-health dashboard (missing photos / materials / details / SL text) with one-click jump.
- Public: news archive by year/month with a year strip (once there are more posts).
- Public: planner pre-answered from a project sheet ("Plan a project like this").
- Public: Slovenian static snapshot for no-JavaScript visitors.
- Admin: planner preview per project category (check the planner's rules).
- Public: EN/SL buttons move between `/` and `/sl/` (real language URLs).
- Public: file check → project planner hand-off (3D file + size pre-filled).
- Admin: search-result preview per project (EN + SL title/description length).
- Public: material picker → "projects printed in this material" (needs `materials` filled in the admin).
- Admin: "Speed" panel — page size before/after gzip and the largest photos, from the built files.
- Admin: drag-and-drop photo order inside the project and news editors (reuse the Arrange handle code).
- Public: "Selected work" on the home page with a "Show 4 more" button instead of a fixed four.
- Admin: Arrange view for news (pinned first, then date) with a preview of the home "From the workshop" row.
- Public: "Compare" checkboxes directly on #work cards (pick 2–3 in the grid → open the comparison).
- Admin: "Compare preview" — check how a project reads next to its most similar sheet before publishing.
- Public: per-category landing text on #work (one sentence per discipline, EN + SL, from Nace).
- Public: "Back to step" links inside the step-4 brief (click "Material: …" → jump to that field).
- Admin: search-engine text preview for a project (title + description as Google would show them).
- Public: order step 3 — "How should I reply?" (e-mail / phone / LinkedIn) choice carried into the brief.
- Public: keyboard shortcut `v` to switch #work between Sheets and Register (add to the `?` list).
- Admin: "Register" check in the To do tab — sheets whose one-line description is much longer than the rest.
- Public: news register (date, title, summary) on #news once there are more posts.
- (Built 2026-10-28: admin translation workspace, tab "EN ⇄ SL".)
- Admin: "Insert link" and "Numbered list" buttons above the news article field (the site now understands both).
- Public: "In this post" list of the links mentioned in a news article, under the article.
- Admin: translation workspace check for the same project name spelled differently in EN and SL.
- Public: "Snap to the fitting orientation" and two-point measuring in the 3D view bar (views + section exist since 2026-10-29).
- Public: "Copy link to this tool" on each #services tool (`#contact` is the first short link of that kind).
- Admin: the upload preview in the project editor gets the same View / Section bar (viewer.js already supports it).
- (Built 2026-10-29, 2nd run: 3D preview on the X2D plate in the file check + Iso/Top/Front/Side drawing views and a section slider under every 3D view; contact package as the improvement.)
- (Built 2026-10-29, update 2.0: Part studio `#studio` — file or size → 3D on the plate → orientation + measuring → material → deadline → spec sheet NK-S → order form.)
- Public: Part studio — orientation "lay on the largest face" from the mesh; wall-thickness hint from the section plane; silhouette views printed on the NK-S sheet.
- (Built 2026-10-30: batch on the plate `#services?tool=plate` — copies per X2D plate, plates per batch, top-view drawing → order form; lost-visitor 404 package as the improvement.)
- Public: batch of several different parts (list of footprints + quantities → plates for the whole order).
- Public: the plate layout drawn on the NK-S spec sheet and in the order brief's printable page.
- Public: 404 page — "Copy e-mail" button and the three newest posts when the address matches nothing.
- (Built 2026-10-31: support check in the Part studio — overhang area per orientation, "least support" ranking, red overlay in the 3D view, rows on the NK-S sheet; phone results package as the improvement.)
- Public: project landing pages `/portfolio/<slug>/` + `/sl/…` (real HTML per project for search engines, opening the app view).
- Public: Part studio — wall-thickness check from the section plane / ray casts (nozzle width only if Nace publishes it).
- Admin: support-check preview on the upload preview, so the sheet can say "prints without support".
- (Built 2026-11-01: landing pages `/portfolio/<slug>/`, `/news/<slug>/` + `/sl/…` — real HTML per project / post with own title, description, link preview, JSON-LD and snapshot; share & link package as the improvement, incl. "Copy sheet number".)
- Public: Part studio — wall-thickness check from ray casts along face normals (limit typed by the visitor; nozzle width only if Nace publishes it).
- Public: news archive by year/month + a `/news/` index landing page (once there are more posts).
- Admin: "Open landing page" button per project / post and a URL-safe slug check before publishing.
- (Built 2026-11-02, big update: price list + quote estimate + promotion; gift cards + FAQ + GBP link; Part studio
  wall-thickness check + time / material / price estimate; admin Overview + Settings (prices, print, promo, gift, FAQ,
  links, services); news as a blog (year strip, mentioned projects, scheduled posts, `/news/` index, admin templates /
  toolbar); drawn link-preview cards per project / post + tool links; My corner `#mine`.)
- Public: "Download sheet card (PNG)" on project pages + a card gallery on #work (the `/og/…` cards exist already).
- Public: My corner — "Send me my corner by e-mail" (text export as a mailto: body, no server).
- Admin: preview-card thumbnail in the editor head; FAQ starter template (questions only).
- (Built 2026-11-02, evening run: Drawing sheet NK-D on #studio — A4 first-angle drawing with overall dimensions, title block,
  print + SVG download; print package as the improvement — a tool prints alone from its address / "Print this tool".)
- Public: NK-D — hidden lines / inner contours, a section view from the cut plane, the measured distance as a dimension.
- Public: NK-D — PNG export; the drawing as page 2 of the printed NK-S spec sheet.
- Admin: print preview of a project sheet in the editor.
- (Built 2026-11-03: QR package — own QR encoder `qr.js`; codes on sheets / posts (share box + print), printed tools, the portfolio
  set, a vCard "Save my contact" card + .vcf, admin QR downloads; publishing safety package in the admin as the improvement.)
- Public: QR on the NK-S / NK-D sheets (→ `#studio`) and the printed brief (→ `#order`).
- Public: "Save my contact" in the footer title block on every page; phone number in the vCard once published.
- Admin: printable A4 sticker sheet of the home / price-list QR with the wordmark.
- (Built 2026-11-04: Quote composer NK-O in the admin — written quote from the Settings prices, A4 sheet, print / PDF, copy as
  text, mailto, saved in the browser; enquiry package as the improvement — phone + "How should I reply?" in step 3, "Open in
  your e-mail app" on step 4, "Save contact" in the footer, checklist → files pre-select.)
- Admin: "Quote from a brief" — paste the e-mailed brief → services, quantity, reference, client pre-filled in the Quote tab.
- Admin: quote status (sent / accepted / declined) and a monthly total on the saved quotes, browser-only.
- Public: "Request a call" on #contact once Nace publishes a phone number.
- (Built 2026-11-05: Parts list NK-L `#services?tool=parts` — several different parts → fit, plates, weight, time, price per line and
  for the whole order, hand-offs from the Part studio and the fit check, into the brief; review package in the order form as the
  improvement — "What you are sending" with Edit links on step 3, "Send a copy to myself" on step 4.)
- Public: parts list — a plate drawing of the whole order (all footprints mixed on the plates, not per part type).
- Public: parts list — "Save in My corner" and a shareable `#services?tool=parts&list=…` link.
- Admin: Quote tab — "Import a parts list" (paste the brief line → one quote line per part).
- (Built 2026-11-08: Plate layout NK-N under the parts list — the whole order packed on the X2D plates with maximal-rectangles
  nesting, one drawing per plate, legend, the mixed plate count on the NK-L sheet / text / brief; brief readability package as the
  improvement — tool hand-off lines as indented lists everywhere the brief is shown, services in the e-mail subject.)
- Public: plate layout — "Print the plates" (one NK-N plate per A4 page with the legend).
- Public: plate layout — hatch patterns per line so a mixed plate reads without the numbers.
- Worker: raise `MAX_SUMMARY` (6000) so a long parts-list brief is never cut — Nace's call, the daily run does not touch the Worker.
- (Built 2026-11-09: Quote from a brief in the admin Quote tab — paste the e-mailed / Telegram brief → new quote pre-filled with client,
  language, reference, hours lines, printed-part lines from the parts list / Part studio / estimate, rush, promotion, deadline note;
  language package as the improvement — the address follows the language on every view, the EN / SL switch is a real link.)
- Admin: "From a brief" — attachments list and phone from the brief on the quote; a "quote sent" mark per brief.
- Admin: quote status (sent / accepted / declined) and a monthly total on the saved quotes, browser-only.
- Public: order step 4 — a one-line-per-field "Copy for the studio" brief variant for an exact import.
- (Built 2026-11-10: Files → parts list — several STL / 3MF / OBJ files dropped on the parts list → one line per file with the mesh's own
  volume for weight / time / price; "Your files" package as the improvement — where the client's files go: step-2 hint, step-4 box, sent-screen
  box with the tracking code and a "Send the files by e-mail" button.)
- Public: parts list — read a ZIP of files, and a 3MF with several objects → one line per object.
- Public: parts list — "Show in 3D" per file line (the file check's plate preview) and the three drawing views on the NK-L sheet.
- Admin: Quote from a brief — pick up "from the file · N cm³" as the line's volume so the quote can show cm³ next to grams.
- (Built 2026-11-11: Jobs board + job card NK-J in the admin — Enquiry / Quoted / In progress / Delivered columns, due dates, steps
  checklist from the process steps, parts, notes, from a brief / from a quote, printable A4 traveller; admin accessibility package as the
  improvement — landmarks, h1, skip link, real tab list with arrow keys and kept focus, empty headers, heading order.)
- Admin: Jobs — a week / month calendar strip of due dates above the board, and "e-mail the client" (mailto with the job's reference and code).
- Admin: Jobs — "Quote this job" (job → new quote with client, reference, parts as printed-part lines), the reverse of "Start a job".
- Admin: Overview — "Jobs" card (open, overdue, due this week) next to the content health.
- (Built 2026-11-12: Find anything — Ctrl / Cmd + K or the header magnifier: one box over pages, tools, services, projects, news, skills,
  FAQ and actions, EN + SL words, grouped results; Skills → proof package as the improvement — skill terms link to the sheets that mention
  them with counts, each group ends with its service, project categories or tools.)
- Public: Find anything — "Recent" picks; index the price-list rows and the material picker's materials.
- Public: "Used in" skills row on project sheets (back-links to #skills).
- Admin: Overview — "Search preview" per project / post and sheets no skill term reaches.

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
