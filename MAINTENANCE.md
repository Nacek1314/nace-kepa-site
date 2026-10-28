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
