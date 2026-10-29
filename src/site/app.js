(function () {
  // Orders go to the Cloudflare Worker in cloudflare-worker/ (keys stay secret there). The build fills this in
  // from the PUBLIC_ORDER_ENDPOINT repository variable; empty = no sending, the client copies the brief instead.
  var ORDER_ENDPOINT = '__ORDER_ENDPOINT__'.indexOf('__') === 0 ? '' : '__ORDER_ENDPOINT__';
  var CONTACT_EMAIL = '__CONTACT_EMAIL__'.indexOf('__') === 0 ? null : '__CONTACT_EMAIL__';
  var CODE = 'NK-' + Math.random().toString(36).slice(2, 8).toUpperCase(); // set to the studio address, e.g. 'name@nacekepa.work', to show it on the brief step
  var LINKEDIN = 'https://www.linkedin.com/in/nace-kepa-82735038a';
  var lang = 'en';
  try { var s = localStorage.getItem('nk-lang'); if (s === 'sl' || s === 'en') lang = s; } catch (e) {}
  // The Slovenian page (/sl/, <html lang="sl">) always starts in Slovenian; a #en-… link still switches (page()).
  var START_LANG = document.documentElement.lang === 'sl' ? 'sl' : ''; if (START_LANG) lang = START_LANG;
  var state = { send: 'idle', filter: 'all', step: 0, order: { website: '', services: [], what: '', qty: '1', deadline: '', files: 0, mat: 0, name: '', email: '', note: '' }, errors: {} };
  var app = document.getElementById('app');
  // Projects come from src/data/projects.json, inlined at build time (the admin dashboard edits that file).
  var PROJECTS = (window.NK_PROJECTS || []).filter(function (p) { return !p.hidden; });
  // News comes from src/data/news.json (also edited in the admin): pinned first, then newest.
  var NEWS = (window.NK_NEWS || []).filter(function (n) { return !n.hidden; }).sort(function (x, y) { return (y.pinned ? 1 : 0) - (x.pinned ? 1 : 0) || String(y.date).localeCompare(String(x.date)); });
  var PAGES = ['home', 'services', 'work', 'news', 'skills', 'about', 'order'];
  var viewer = null;

  // NK monogram — the same N/K geometry as the original logo, redrawn as a drawing-sheet mark.
  function logo(cls) {
    return '<svg class="nk-mark' + (cls ? ' ' + cls : '') + '" viewBox="0 0 64 64" aria-hidden="true" focusable="false">' +
      '<rect class="nk-mark__frame" x="3" y="3" width="58" height="58"/>' +
      '<path class="nk-mark__ln" d="M14 48 V16 L30 48 V16"/><path class="nk-mark__ln" d="M38 16 V48 M38 32 L52 16 M38 32 L52 48"/>' +
      '<rect class="nk-mark__dot" x="53" y="40" width="6" height="6"/></svg>';
  }
  function t() { return T[lang]; }
  function L(v) { return v && typeof v === 'object' && !Array.isArray(v) ? v[lang] : v; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function sheetNo(p) { return 'NK-' + String(p.year).slice(2) + '-' + String(PROJECTS.indexOf(p) + 1).padStart(2, '0'); }
  function P(p, k) { var v = p[k]; return v && typeof v === 'object' ? (v[lang] || v.en || '') : (v || ''); }
  function cat(p) { return CATS[p.category] ? CATS[p.category][lang] : p.category; }
  function bySlug(s) { for (var i = 0; i < PROJECTS.length; i++) if (PROJECTS[i].slug === s) return PROJECTS[i]; return null; }
  function newsBySlug(s) { for (var i = 0; i < NEWS.length; i++) if (NEWS[i].slug === s) return NEWS[i]; return null; }
  function fmtDate(d) { try { return new Date(d + 'T12:00:00').toLocaleDateString(lang === 'sl' ? 'sl-SI' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' }); } catch (e) { return d; } }
  function asset(path) { return '/' + String(path).replace(/^\/+/, '').split('/').map(encodeURIComponent).join('/'); }
  function page() {
    var h = (location.hash || '').replace('#', '');
    var m = /^(en|sl)-?(.*)$/.exec(h);
    if (m) { lang = m[1]; try { localStorage.setItem('nk-lang', lang); } catch (e) {} h = m[2]; }
    var qi = h.indexOf('?'), qs = qi >= 0 ? h.slice(qi + 1) : ''; if (qi >= 0) { if (h.slice(0, qi) === 'work' && location.hash !== state.findHash) findRead(qs); h = h.slice(0, qi); }
    if (h === 'compare' && PROJECTS.length) { cmpRead(qs); return 'compare'; }
    if (h === 'services') state.tool = (/(?:^|&)tool=([a-z]+)/.exec(qs) || [])[1] || '';
    if (h === 'contact') { state.ctGo = true; return 'about'; } // Contact package (2026-10-29): #contact opens the contact card on #about
    if (/^p-/.test(h) && bySlug(h.slice(2))) return 'project';
    if (/^n-/.test(h) && newsBySlug(h.slice(2))) return 'post';
    return PAGES.indexOf(h) >= 0 ? h : 'home'; }
  // A hash with a language prefix (#en-…, #sl-… from shared links and feeds) would switch the language back on render,
  // so the EN/SL buttons rewrite the prefix to the chosen language.
  function langHash() { var h = location.hash; if (/^#(en|sl)-?/.test(h)) try { history.replaceState(history.state, '', h.replace(/^#(en|sl)/, '#' + lang)); } catch (e) {} }
  function currentSlug() { var h = (location.hash || '').replace('#', '').replace(/^(en|sl)-?/, ''); return h.slice(2); }

  function btn(label, href, variant, size, arrow) {
    return '<a class="nk-btn' + (variant ? ' nk-btn--' + variant : '') + (size ? ' nk-btn--' + size : '') + '" href="' + href + '">' + esc(label) + (arrow ? '<span class="nk-btn__arrow" aria-hidden="true">→</span>' : '') + '</a>';
  }
  function specs(items) { return '<dl class="nk-specs">' + items.map(function (i) { return '<div><dt>' + esc(L(i[0])) + '</dt><dd>' + esc(L(i[1])) + '</dd></div>'; }).join('') + '</dl>'; }
  // eager = the photo is the first thing on screen (home hero sheet, project page): load it at once with high priority
  // (largest contentful paint) instead of lazily; every other sheet photo stays lazy.
  function art(p, eager) {
    if (p.photos && p.photos.length) return '<' + 'img class="sheet-photo" src="' + esc(asset(p.photos[0])) + '" alt=""' + (eager ? ' fetchpriority="high"' : ' loading="lazy"') + ' decoding="async">';
    var d = p.drawing || (CATS[p.category] && CATS[p.category].d) || 'cad';
    return NK_DRAWINGS[d] || NK_DRAWINGS.cad;
  }
  // hl = heading tag for the title ('h2' where the card sits right under the page h1, else h3). Not positional from .map().
  function sheet(p, hl) {
    var h = hl === 'h2' ? 'h2' : 'h3';
    return '<a class="nk-sheet" href="#p-' + esc(p.slug) + '" data-cat="' + esc(p.category) + '"><div class="nk-sheet__head"><span class="nk-label">' + sheetNo(p) + '</span><span class="nk-label">' + (slRead().indexOf(p.slug) >= 0 ? '<b class="sl-mark" title="' + esc(t().sl.on) + '"><span aria-hidden="true">★ </span><span class="vh">' + esc(t().sl.on) + ' · </span></b>' : '') + (p.model ? '<b class="has3d">3D · </b>' : '') + esc(cat(p)) + ' · ' + esc(p.year) + '</span></div>' +
      '<div class="nk-sheet__art">' + art(p, hl === 'h2') + '</div><div class="nk-sheet__foot"><' + h + ' class="nk-sheet__title">' + esc(P(p, 'title')) + '</' + h + '><p class="nk-sheet__desc">' + esc(P(p, 'description')) + '</p></div></a>';
  }
  function sheetH2(p) { return sheet(p, 'h2'); }
  function featured() { var f = PROJECTS.filter(function (p) { return p.featured; }); return (f.length ? f : PROJECTS).slice(0, 4); }
  function service(s, full) {
    var x = t();
    return '<article class="nk-service" id="' + s.id + '"><div class="nk-service__top"><span class="nk-service__code">' + s.code + '</span><span class="nk-label">' + esc(s.time ? L(s.time) : x.onRequest) + '</span></div>' +
      (full ? '<h2' : '<h3') + ' class="nk-service__title">' + esc(L(s.title)) + (full ? '</h2>' : '</h3>') + '<p>' + esc(L(s.body)) + '</p>' +
      (full ? '<div class="svc-cols"><div><p class="nk-label">' + esc(x.deliverables) + '</p><ul>' + L(s.get).map(function (g) { return '<li>' + esc(g) + '</li>'; }).join('') + '</ul></div><div><p class="nk-label">' + esc(x.needs) + '</p><ul>' + L(s.need).map(function (g) { return '<li>' + esc(g) + '</li>'; }).join('') + '</ul></div></div>'
        : '<ul>' + L(s.get).slice(0, 3).map(function (g) { return '<li>' + esc(g) + '</li>'; }).join('') + '</ul>') +
      '<div class="svc-act">' + btn(full ? x.quote : x.allServices, full ? '#order' : '#services', null, 'sm', true) + '</div></article>';
  }
  // labelHtml (optional) replaces the escaped label, e.g. to wrap a date in <time>.
  function head(label, title, lead, h1, labelHtml) {
    var tag = h1 ? 'h1' : 'h2';
    return '<header class="sec-head"><div><p class="nk-label">' + (labelHtml || esc(label)) + '</p><' + tag + ' class="' + (h1 ? 'page-title' : 'sec-title') + '">' + esc(title) + '</' + tag + '></div>' + (lead ? '<p class="lead">' + esc(lead) + '</p>' : '') + '</header>';
  }
  function process(active) {
    return '<ol class="nk-process" style="--steps:8">' + t().process.map(function (s, i) { return '<li' + (i === active ? ' class="is-active"' : '') + '><span class="nk-process__n">' + String(i + 1).padStart(2, '0') + '</span><span class="nk-process__t">' + esc(s) + '</span></li>'; }).join('') + '</ol>';
  }
  function ctaBand() {
    var x = t();
    return '<section class="cta-band"><div><h2 class="sec-title">' + esc(x.ctaBandTitle) + '</h2><p class="lead">' + esc(x.ctaBandBody) + '</p></div><div class="cta-row cta-band__act">' + btn(ctaText(), '#order', 'primary', 'lg', true) + ctAlt() + '</div></section>';
  }

  var views = {
    home: function () {
      var x = t();
      return '<section class="hero"><div class="hero-text"><p class="nk-label"><b>' + esc(x.status) + ' · </b>' + esc(x.heroLabel) + '</p>' +
        '<h1 class="display">' + esc(x.heroA) + '<br>' + esc(x.heroB) + '<em>' + esc(x.heroEm) + '</em></h1><p class="lead">' + esc(x.heroLead) + '</p>' +
        '<div class="cta-row">' + btn(ctaText(), '#order', 'primary', 'lg', true) + btn(x.seeWork, '#work', null, 'lg') + '</div></div>' +
        '<div class="hero-sheet">' + (PROJECTS.length ? sheetH2(featured()[0]) : '') + specs([x.heroSpecs[0], [x.heroSpecs[1][0], String(PROJECTS.length)]].concat(x.heroSpecs.slice(2))) + '</div></section>' +
        '<section class="block">' + head(x.servicesLabel, x.servicesTitle, x.servicesLead) + '<div class="grid-4">' + SERVICES.map(function (s) { return service(s, false); }).join('') + '</div>' + tlHome() + '</section>' +
        '<section class="block">' + head(x.processLabel, x.processTitle) + process(-1) + '</section>' +
        '<section class="block">' + head(x.workLabel, x.workTitle) + '<div class="grid-4 sheets">' + featured().map(sheet).join('') + '</div><div class="more">' + btn(x.seeWork, '#work', null, null, true) + '</div></section>' +
        (NEWS.length ? '<section class="block">' + head(x.newsLabel, x.newsTitle, x.newsLead) + '<div class="news-list">' + NEWS.slice(0, 3).map(newsCard).join('') + '</div>' + '<div class="more">' + btn(x.allNews + ' · ' + NEWS.length, '#news', null, null, true) + '</div>' + '</section>' : '') +
        '<section class="block about-strip"><div>' + '<p class="nk-label">' + esc(x.aboutLabel) + '</p><h2 class="sec-title">' + esc(x.aboutTitle) + '</h2></div><div><p class="lead">' + esc(x.aboutBody) + '</p>' + timelineDims() + '</div></section>' +
        ctaBand();
    },
    services: function () {
      var x = t();
      return '<section class="block first">' + head('S-01 … S-04', x.servicesPageTitle, x.servicesPageLead, true) + '<div class="grid-2">' + SERVICES.map(function (s) { return service(s, true); }).join('') + '</div></section>' +
        tlIndex() +
        tlWrap('plan', plBox()) +
        tlWrap('fit', fitChecker()) +
        tlWrap('file', fcBox()) +
        tlWrap('material', mpBox()) +
        tlWrap('prep', prepBox()) +
        '<section class="block">' + head(x.processLabel, x.processTitle) + process(-1) + '</section>' + ctaBand();
    },
    work: function () {
      var x = t(), cats = ['all'].concat(Object.keys(CATS));
      var list = PROJECTS.filter(function (p) { return state.filter === 'all' || (state.filter === '3d' ? !!p.model : p.category === state.filter); });
      var has3d = PROJECTS.some(function (p) { return p.model; });
      if (has3d) cats.splice(1, 0, '3d');
      return '<section class="block first">' + head(PROJECTS.length + ' ' + x.shown, x.workPageTitle, x.workPageLead, true) +
        slBox() +
        findBox() +
        '<div class="filters" role="group" aria-label="' + esc(x.aria.filter) + '">' + cats.map(function (c) {
          var n = c === 'all' ? PROJECTS.length : PROJECTS.filter(function (p) { return c === '3d' ? !!p.model : p.category === c; }).length;
          return '<button type="button" class="chip" data-filter="' + c + '" aria-pressed="' + (state.filter === c) + '">' + esc(c === 'all' ? x.all : c === '3d' ? x.with3d : CATS[c][lang]) + ' <span>' + n + '</span></button>';
        }).join('') + '</div>' + rgBar() + cmpOpen() + rgTable() +
        '<div class="grid-4 sheets" id="find-grid"' + (rgOn() ? ' hidden' : '') + '>' + list.map(sheetH2).join('') + '</div>' + findResults() + psBox() + '</section>' + ctaBand();
    },
    skills: function () {
      var x = t();
      return '<section class="block first">' + head(x.nav.skills, x.skillsPageTitle, x.skillsPageLead, true) + '<div class="grid-2 skills">' +
        SKILLS.map(function (g) { return '<div class="skill-group"><h2 class="sub">' + esc(g[lang]) + '</h2>' + specs(g.items) + '</div>'; }).join('') + '</div></section>' +
        '<section class="block"><p class="nk-label">' + esc(x.certs) + '</p><div class="certs"><div class="cert"><span class="nk-tag nk-tag--ok">CSWA</span><span>Certified SolidWorks Associate</span></div><div class="cert"><span class="nk-tag nk-tag--ok">CSWA-AM</span><span>Certified SolidWorks Associate — Additive Manufacturing</span></div></div></section>' + ctaBand();
    },
    about: function () {
      var x = t();
      return '<section class="block first about-page">' + head(x.aboutLabel, x.aboutTitle, null, true) + '<div class="about-cols"><div><p class="lead">' + esc(x.aboutBody) + '</p>' + timelineDims() + '</div><div><p class="nk-label">' + esc(x.facts) + '</p>' +
        specs([[lang === 'sl' ? 'Lokacija' : 'Location', lang === 'sl' ? 'Škofja Loka, Slovenija' : 'Škofja Loka, Slovenia'], [lang === 'sl' ? 'Šola' : 'School', 'Šolski center Kranj'], ['CAD', lang === 'sl' ? 'SolidWorks 4 leta · CSWA · CSWA-AM' : 'SolidWorks 4 yrs · CSWA · CSWA-AM']].concat(x.heroSpecs.slice(2))) + ctCard() + '</div></div></section>' +
        '<section class="block">' + head(x.processLabel, x.processTitle) + process(-1) + '</section>' + ctaBand();
    },
    order: orderView,
    project: projectView,
    news: function () {
      var x = t();
      return '<section class="block first">' + head(x.newsLabel + ' · ' + NEWS.length, x.newsPageTitle, x.newsLead, true) +
        (NEWS.length ? '<div class="news-list">' + NEWS.map(newsCard).join('') + '</div>' + feedBox() : '<p class="lead">' + esc(x.newsEmpty) + '</p>') + '</section>' + ctaBand();
    },
    post: postView,
    compare: function () { return cmpView(); }
  };

  // Machine-readable date for search engines and screen readers (<time datetime="YYYY-MM-DD">).
  function timeTag(d) { return /^\d{4}-\d{2}-\d{2}$/.test(String(d)) ? '<time datetime="' + esc(d) + '">' + esc(fmtDate(d)) + '</time>' : esc(fmtDate(d)); }
  // ---------- Follow the news: Atom feed box on #news ----------
  // Self-contained: remove feedBox()…feedCopy(), its call in views.news, the data-feed-copy line in the click handler,
  // feed: in both languages in content.js and the .feed-* rules at the end of page.css. The feed itself: src/site/feed.ts.
  function feedUrl() { return 'https://nacekepa.work/' + (lang === 'sl' ? 'news-sl.xml' : 'news.xml'); }
  function feedBox() {
    var x = t().feed, url = feedUrl();
    return '<aside class="feed" aria-labelledby="feed-l"><svg class="feed-ico" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M5 19h.01M5 12a7 7 0 0 1 7 7M5 5a14 14 0 0 1 14 14"/></svg>' +
      '<div class="feed-main"><p class="nk-label" id="feed-l">' + esc(x.label) + '</p><p class="feed-body">' + esc(x.body) + '</p>' +
      '<div class="feed-row"><input class="feed-url" id="feed-url" type="text" readonly value="' + esc(url) + '" aria-labelledby="feed-l" spellcheck="false">' +
      '<button type="button" class="nk-btn nk-btn--sm" data-feed-copy>' + esc(x.copy) + '</button></div>' +
      '<div class="feed-act"><a class="feed-link" href="' + esc(url.replace('https://nacekepa.work', '')) + '" type="application/atom+xml">' + esc(x.open) + ' →</a><span class="feed-note">' + esc(x.note) + '</span></div>' +
      '<p class="feed-msg" id="feed-msg" role="status" aria-live="polite"></p></div></aside>';
  }
  function feedCopy() {
    var f = document.getElementById('feed-url'), msg = document.getElementById('feed-msg'), x = t().feed; if (!f) return;
    var fail = function () { f.focus(); f.select(); msg.textContent = x.copyFail; };
    try { navigator.clipboard.writeText(f.value).then(function () { msg.textContent = x.copied; }, fail); } catch (e) { fail(); }
  }

  function newsCard(n) {
    var x = t();
    return '<a class="news-card" href="#n-' + esc(n.slug) + '">' +
      (n.photos && n.photos.length ? '<span class="news-card__img"><' + 'img src="' + esc(asset(n.photos[0])) + '" alt="" loading="lazy" decoding="async" draggable="false"></span>' : '<span class="news-card__img news-card__img--none" aria-hidden="true">' + logo() + '</span>') +
      '<span class="news-card__body"><span class="nk-label">' + (n.pinned ? '<b>' + esc(x.pinned) + ' · </b>' : '') + timeTag(n.date) + ' · ' + esc(rdMin(n)) + '</span>' +
      '<span class="news-card__title">' + esc(P(n, 'title')) + '</span><span class="news-card__sum">' + esc(P(n, 'summary')) + '</span>' +
      '<span class="news-card__more">' + esc(x.readMore) + ' →</span></span></a>';
  }
  // ---------- News reading (richText / rdMin / rdNav) ----------
  // Article text rules (same in admin.js pvRich() and feed.ts rich()): blank line = paragraph, "- " lines = list,
  // "1. " lines = numbered list, https:// links and e-mail addresses become links. rdMin(): reading time at 200 words a
  // minute. rdNav(): previous / next post. Remove: rdInline()/rdMin()/rdNav() (richText back to plain esc), the rdMin()
  // calls in newsCard()/postView(), rd: in content.js and the "News reading" rules at the end of page.css.
  var RD_LINK = /(https?:\/\/[^\s<>"]+[^\s<>".,;:!?)\]'"])|([A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,})/g;
  function rdInline(s) {
    var out = '', last = 0, m; s = String(s); RD_LINK.lastIndex = 0;
    while ((m = RD_LINK.exec(s))) {
      out += esc(s.slice(last, m.index));
      out += m[1] ? '<a href="' + esc(m[1]) + '" target="_blank" rel="noopener">' + esc(m[1].replace(/^https?:\/\//, '')) + '<span class="vh"> (' + esc(t().newTab) + ')</span></a>'
        : '<a href="mailto:' + esc(m[2]) + '">' + esc(m[2]) + '</a>';
      last = m.index + m[0].length;
    }
    return out + esc(s.slice(last));
  }
  function richText(s) {
    return String(s || '').split(/\n{2,}/).filter(function (b) { return b.trim(); }).map(function (block) {
      var lines = block.split('\n');
      if (lines.every(function (l) { return /^\s*-\s+/.test(l); })) return '<ul>' + lines.map(function (l) { return '<li>' + rdInline(l.replace(/^\s*-\s+/, '')) + '</li>'; }).join('') + '</ul>';
      if (lines.every(function (l) { return /^\s*\d+[.)]\s+/.test(l); })) return '<ol>' + lines.map(function (l) { return '<li>' + rdInline(l.replace(/^\s*\d+[.)]\s+/, '')) + '</li>'; }).join('') + '</ol>';
      return '<p>' + lines.map(rdInline).join('<br>') + '</p>';
    }).join('');
  }
  function rdMin(n) {
    var words = (P(n, 'title') + ' ' + P(n, 'summary') + ' ' + P(n, 'body')).split(/\s+/).filter(function (w) { return /[0-9A-Za-zÀ-ž]/.test(w); }).length;
    return t().rd.min.replace('{n}', Math.max(1, Math.round(words / 200)));
  }
  function rdNav(n) {
    var x = t(), i = NEWS.indexOf(n), prev = NEWS[i - 1], next = NEWS[i + 1];
    if (!prev && !next) return '';
    return '<nav class="sheet-nav" aria-label="' + esc(x.rd.nav) + '">' +
      (prev ? '<a class="next-project prev-project" href="#n-' + esc(prev.slug) + '" rel="prev"><span class="nk-label">' + esc(x.rd.prev) + '</span><span class="sub">← ' + esc(P(prev, 'title')) + '</span></a>' : '<span></span>') +
      (next ? '<a class="next-project" href="#n-' + esc(next.slug) + '" rel="next"><span class="nk-label">' + esc(x.rd.next) + '</span><span class="sub">' + esc(P(next, 'title')) + ' →</span></a>' : '<span></span>') + '</nav>';
  }
  function postView() {
    var x = t(), n = newsBySlug(currentSlug()), photos = n.photos || [];
    return '<section class="block first post">' +
      '<a class="back" href="#news">← ' + esc(x.allNews) + '</a>' +
      head('', P(n, 'title'), P(n, 'summary'), true, timeTag(n.date) + ' · ' + esc(rdMin(n)) + (n.pinned ? ' · ' + esc(x.pinned) : '')) +
      '<div class="post-grid">' +
      (photos.length ? '<button type="button" class="nk-sheet__art project-art post-cover" data-lb="0" aria-label="' + esc(x.openPhoto) + '"><' + 'img class="sheet-photo" src="' + esc(asset(photos[0])) + '" alt="' + esc(P(n, 'title')) + '" fetchpriority="high" decoding="async" draggable="false"></button>' : '') +
      '<div class="post-body">' + richText(P(n, 'body')) + '<div class="cta-row">' + btn(ctaText(), '#order', 'primary', null, true) + askLink(n, 'n') + '</div>' + shareBox('n', n) + printBox('n', n) + '</div></div>' +
      (photos.length > 1 ? '<div class="gallery"><p class="nk-label">' + esc(x.photos) + ' · ' + photos.length + '</p><div class="photos">' + photos.map(function (ph, k) { return '<button type="button" data-lb="' + k + '" aria-label="' + esc(x.openPhoto + ' ' + (k + 1) + ' / ' + photos.length) + '"><' + 'img src="' + esc(asset(ph)) + '" alt="' + esc(P(n, 'title') + ' · ' + (k + 1)) + '" loading="lazy" decoding="async" draggable="false"></button>'; }).join('') + '</div></div>' : '') +
      rdNav(n) +
      '</section>' + ctaBand();
  }

  function projectView() {
    var x = t(), p = bySlug(currentSlug()), i = PROJECTS.indexOf(p);
    var next = PROJECTS[(i + 1) % PROJECTS.length], prev = PROJECTS[(i - 1 + PROJECTS.length) % PROJECTS.length];
    var m = p.model;
    var photos = p.photos || [];
    var stage = m
      ? '<div class="nk-viewer" id="viewer" data-src="' + esc(asset(m.file)) + '" data-format="' + esc(m.format || '') + '" role="img" aria-label="' + esc(x.viewerLabel + ': ' + P(p, 'title')) + '"><div class="nk-viewer__msg" id="viewer-msg">' + esc(x.loading3d) + '</div></div>' +
        v3Bar('vw') + '<p class="viewer-hint">' + esc(x.viewerHint) + '</p>'
      : (photos.length ? '<button type="button" class="nk-sheet__art project-art" data-lb="0" aria-label="' + esc(x.openPhoto) + '">' + art(p, true) + '</button>' : '<div class="nk-sheet__art project-art">' + art(p) + '</div>');
    var rows = [[x.pCategory, cat(p)], [x.pYear, String(p.year)]];
    if (p.materials) rows.push([x.pMaterials, p.materials]);
    if (m) rows.push([x.pModel, x.interactive]);
    var details = P(p, 'details');
    return '<section class="block first project">' +
      '<a class="back" href="#work">← ' + esc(x.allWork) + '</a>' +
      head(sheetNo(p) + ' · ' + cat(p) + ' · ' + p.year, P(p, 'title'), P(p, 'description'), true) +
      '<div class="project-grid"><div class="project-stage">' + stage + '</div><div class="project-side">' + specs(rows) +
      (details ? '<div class="project-details">' + details.split(/\n{2,}/).map(function (s) { return '<p>' + esc(s) + '</p>'; }).join('') + '</div>' : '') +
      '<div class="cta-row">' + btn(ctaText(), '#order', 'primary', null, true) + askLink(p) + '</div>' + slToggle(p) + cmpFrom(p) + shareBox('p', p) + printBox('p', p) + '</div></div>' +
      (photos.length ? '<div class="gallery"><p class="nk-label">' + esc(x.photos) + ' · ' + photos.length + '</p><div class="photos">' + photos.map(function (ph, i) { return '<button type="button" data-lb="' + i + '" aria-label="' + esc(x.openPhoto + ' ' + (i + 1) + ' / ' + photos.length) + '"><' + 'img src="' + esc(asset(ph)) + '" alt="' + esc(P(p, 'title') + ' · ' + (i + 1)) + '" loading="lazy" decoding="async" draggable="false"></button>'; }).join('') + '</div></div>' : '') +
      relRow(p, next) +
      (next && next !== p ? '<nav class="sheet-nav" aria-label="' + esc(x.sheetNav) + '">' +
        (prev !== next ? '<a class="next-project prev-project" href="#p-' + esc(prev.slug) + '" rel="prev"><span class="nk-label">' + esc(x.prevProject) + '</span><span class="sub">← ' + esc(P(prev, 'title')) + '</span></a>' : '<span></span>') +
        '<a class="next-project" href="#p-' + esc(next.slug) + '" rel="next"><span class="nk-label">' + esc(x.nextProject) + '</span><span class="sub">' + esc(P(next, 'title')) + ' →</span></a></nav>' : '') +
      '</section>' + ctaBand();
  }
  // "Ask about this project": e-mail with the sheet number and title in the subject (only when the studio address is set).
  function askLink(p, kind) {
    if (!CONTACT_EMAIL) return '';
    var x = t().ask, k = kind || 'p', subj = (k === 'n' ? x.subjectPost + ': ' : x.subject + ' ' + sheetNo(p) + ' · ') + P(p, 'title');
    return '<a class="nk-btn" href="mailto:' + esc(CONTACT_EMAIL) + '?subject=' + esc(encodeURIComponent(subj)) + '&amp;body=' + esc(encodeURIComponent(shareUrl(k, p) + '\n\n')) + '">' + esc(k === 'n' ? x.btnPost : x.btn) + '</a>';
  }
  // ---------- Contact package (2026-10-29): one place with every way to reach the studio ----------
  // ctCard(): a "Contact" card on #about (e-mail with Copy, LinkedIn, location, reply time and languages from the hero
  // specs, "Write an e-mail" with the subject in the page language, "Start a project"); #contact opens it from anywhere.
  // ctAlt(): "or write an e-mail" next to "Start a project" in the band at the end of every page. Only facts already on the
  // site. Self-contained: remove ctMail() … ctAlt(), the ctCard() call in views.about, ctAlt() in ctaBand(), the 'contact'
  // line in page(), the ctGo block in render(), data-ct-copy in the click handler, ct: in content.js and the "Contact
  // package" rules at the end of page.css.
  function ctMail(subject) { return CONTACT_EMAIL ? 'mailto:' + esc(CONTACT_EMAIL) + (subject ? '?subject=' + esc(encodeURIComponent(subject)) : '') : ''; }
  function ctCard() {
    var x = t(), c = x.ct, rows = [];
    if (CONTACT_EMAIL) rows.push('<div><dt>' + esc(c.email) + '</dt><dd><a href="' + ctMail(c.subject) + '" id="ct-mail">' + esc(CONTACT_EMAIL) + '</a> <button type="button" class="tb-copy" data-ct-copy>' + esc(x.tbCopy) + '</button><span class="tb-msg" id="ct-msg" role="status" aria-live="polite"></span></dd></div>');
    rows.push('<div><dt>LinkedIn</dt><dd><a href="' + LINKEDIN + '" target="_blank" rel="noopener">' + esc(c.linkedin) + ' <span aria-hidden="true">↗</span><span class="vh"> (' + esc(x.newTab) + ')</span></a></dd></div>');
    rows.push('<div><dt>' + esc(c.where) + '</dt><dd>' + esc(lang === 'sl' ? 'Škofja Loka, Slovenija' : 'Škofja Loka, Slovenia') + '</dd></div>');
    x.heroSpecs.slice(2).forEach(function (r) { rows.push('<div><dt>' + esc(r[0]) + '</dt><dd>' + esc(r[1]) + '</dd></div>'); });
    return '<section class="ct" id="contact" tabindex="-1" aria-labelledby="ct-title"><p class="nk-label" id="ct-title">' + esc(c.title) + '</p><p class="ct-lead">' + esc(c.lead) + '</p><dl class="nk-specs ct-specs">' + rows.join('') + '</dl>' +
      '<div class="cta-row">' + btn(ctaText(), '#order', 'primary', null, true) + (CONTACT_EMAIL ? '<a class="nk-btn" href="' + ctMail(c.subject) + '">' + esc(c.write) + '</a>' : '') + '</div></section>';
  }
  function ctAlt() { return CONTACT_EMAIL ? '<a class="cta-band__alt" href="' + ctMail(t().ct.subject) + '">' + esc(t().ct.or) + ' →</a>' : ''; }
  function ctCopy() {
    var x = t(), msg = document.getElementById('ct-msg'), el = document.getElementById('ct-mail'); if (!msg || !el) return;
    var fail = function () { msg.textContent = x.mailFail; var r = document.createRange(); r.selectNodeContents(el); var g = getSelection(); g.removeAllRanges(); g.addRange(r); };
    try { navigator.clipboard.writeText(CONTACT_EMAIL).then(function () { msg.textContent = x.tbCopied; }, fail); } catch (e) { fail(); }
  }

  // ---------- Share this sheet (project + news pages) ----------
  // Self-contained: remove shareUrl()…shareCopy(), the two shareBox() calls in projectView() / postView(), the two
  // data-share-* lines in the click handler, share: in both languages in content.js and the .share-* rules at the end of page.css.
  function shareUrl(kind, item) { return 'https://nacekepa.work/#' + lang + '-' + kind + '-' + item.slug; }
  function shareBox(kind, item) {
    var x = t().share, url = shareUrl(kind, item), title = P(item, 'title');
    var mail = 'mailto:?subject=' + encodeURIComponent(x.subject + ': ' + title) + '&body=' + encodeURIComponent(title + '\n' + url);
    return '<div class="share" data-share-title="' + esc(title) + '"><p class="nk-label" id="share-l">' + esc(x.label) + '</p>' +
      '<div class="share-row"><input class="share-url" id="share-url" type="text" readonly value="' + esc(url) + '" aria-labelledby="share-l" spellcheck="false">' +
      '<button type="button" class="nk-btn nk-btn--sm" data-share-copy>' + esc(x.copy) + '</button></div>' +
      '<div class="share-act"><a class="share-link" href="' + esc(mail) + '">' + esc(x.mail) + ' →</a>' +
      (navigator.share ? '<button type="button" class="share-link" data-share-more>' + esc(x.more) + '</button>' : '') +
      '<span class="share-note">' + esc(x.note) + '</span></div>' +
      '<p class="share-msg" id="share-msg" role="status" aria-live="polite"></p></div>';
  }
  function shareCopy() {
    var f = document.getElementById('share-url'), msg = document.getElementById('share-msg'), x = t().share; if (!f) return;
    var fail = function () { f.focus(); f.select(); msg.textContent = x.copyFail; };
    try { navigator.clipboard.writeText(f.value).then(function () { msg.textContent = x.copied; }, fail); } catch (e) { fail(); }
  }
  // ---------- Print this sheet (project + news pages) ----------
  // Self-contained: remove printBox()…printSheet(), the two printBox() calls in projectView() / postView(), the data-print
  // line in the click handler, print: in both languages in content.js and the "Print this sheet" rules at the end of page.css.
  // The print rules also apply to Ctrl+P on any page (clean A4 sheet: no menu, buttons, photos or 3D model).
  function printBox(kind, item) {
    var x = t().print, url = 'https://nacekepa.work/#' + lang + '-' + kind + '-' + item.slug;
    return '<div class="print-act"><button type="button" class="nk-btn nk-btn--sm" data-print>' +
      '<svg class="print-ico" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M7 9V3h10v6M7 17H4v-7h16v7h-3M7 14h10v7H7z"/></svg>' + esc(x.btn) + '</button>' +
      '<span class="print-note">' + esc(x.note) + '</span></div>' +
      '<p class="print-only print-url"><span>' + esc(x.link) + '</span> ' + esc(url) + '</p>';
  }
  function printSheet() { try { window.print(); } catch (e) {} }
  // ---------- Printable brief (order form, step 4): "Print or save as PDF" gives a clean A4 brief sheet ----------
  // On step 4 the page prints as the brief only (also with Ctrl+P): a table of the answers, the indicative turnaround,
  // the next step and the contact line. Uses only what the visitor typed and the published turnarounds.
  // Self-contained: remove bpBtn()…bpSheet(), the two bpBtn() calls and the bp-page / bpSheet() parts in orderView(),
  // the data-bp-print line in the click handler, bp: in both languages in content.js and the "Printable brief" rules at
  // the end of page.css.
  function bpBtn() {
    var x = t().bp;
    return '<div class="print-act bp-act"><button type="button" class="nk-btn nk-btn--sm" data-bp-print>' +
      '<svg class="print-ico" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M7 9V3h10v6M7 17H4v-7h16v7h-3M7 14h10v7H7z"/></svg>' + esc(x.btn) + '</button>' +
      '<span class="print-note">' + esc(x.note) + '</span></div>';
  }
  function bpSheet() {
    var o = state.order, x = t(), b = x.bp, sent = state.send === 'sent';
    var svc = SERVICES.filter(function (s) { return o.services.indexOf(s.key) >= 0; }).map(function (s) { return L(s.title); }).join(', ');
    var d = new Date(), iso = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    var rows = [[x.steps[0], svc], [x.fWhat, o.what], [x.fQty, o.qty], [x.fDeadline, o.deadline ? fmtDate(o.deadline) : '—'], [x.fFiles, x.fFilesO[o.files]], [x.fMat, x.fMatO[o.mat]], [x.fName, o.name], [x.fEmail, o.email]];
    if (o.note) rows.push([x.fNote, o.note]);
    rows = rows.concat(ocRows());
    return '<div class="print-only bp" aria-hidden="true"><p class="nk-label">' + esc(b.label + ' · ' + fmtDate(iso) + (sent ? ' · ' + b.code + ' ' + CODE : '')) + '</p>' +
      '<h2 class="sec-title">' + esc(x.briefTitle) + '</h2>' +
      '<dl class="bp-rows">' + rows.map(function (r) { return '<div><dt>' + esc(String(r[0]).replace(/:\s*$/, '')) + '</dt><dd>' + esc(r[1]) + '</dd></div>'; }).join('') + '</dl>' +
      '<p class="nk-label bp-est">' + esc(x.estimate) + '</p>' + estimate() +
      '<p class="bp-next">' + esc(sent ? x.sentBody.split('. ')[0] + '.' : x.briefLead) + '</p>' +
      '<p class="bp-contact">' + (CONTACT_EMAIL ? esc(CONTACT_EMAIL) + ' · ' : '') + 'nacekepa.work · ' + esc(LINKEDIN.replace('https://www.', '')) + '</p></div>';
  }
  // ---------- Portfolio set (#work): the project sheets as a printable A4 set with a cover page and an index ----------
  // Line drawings only — photos and 3D models stay on the site. Built only from the published projects, services and
  // contact details. Self-contained: remove PS_ROWS…psDone(), the psBox() call in views.work, the psSync() call at the end
  // of findApply(), the psDone() call in render(), the data-ps-* lines in the click and change handlers, ps: in both
  // languages in content.js and the "Portfolio set" rules at the end of page.css.
  var PS_ROWS = 18; // index rows per A4 page (fits with the title block)
  state.ps = { scope: 'all', cover: true, index: true };
  function psShown() {
    var q = state.q.trim();
    return PROJECTS.filter(function (p) { return (state.filter === 'all' || (state.filter === '3d' ? !!p.model : p.category === state.filter)) && (!q || findHit(findProjectText(p), q)); });
  }
  function psList() {
    if (state.ps.scope === 'shown') return psShown();
    if (state.ps.scope === 'list') { var a = slRead().map(bySlug); if (a.length) return a; state.ps.scope = 'all'; }
    return PROJECTS;
  }
  function psIndexPages(n) { return state.ps.index && n ? Math.ceil(n / PS_ROWS) : 0; }
  function psPages(n) { return n ? (state.ps.cover ? 1 : 0) + psIndexPages(n) + n : 0; }
  function psArt(p) { var d = p.drawing || (CATS[p.category] && CATS[p.category].d) || 'cad'; return NK_DRAWINGS[d] || NK_DRAWINGS.cad; }
  function psIco() { return '<svg class="print-ico" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M7 9V3h10v6M7 17H4v-7h16v7h-3M7 14h10v7H7z"/></svg>'; }
  function psBox() {
    if (!PROJECTS.length) return '';
    var x = t().ps, sl = slRead().length;
    if (state.ps.scope === 'list' && !sl) state.ps.scope = 'all';
    var opt = function (k, label, n, hint) {
      return '<label class="ps-opt"><input type="radio" name="ps-scope" value="' + k + '" data-ps-scope' + (state.ps.scope === k ? ' checked' : '') + '>' +
        '<span class="ps-opt__t">' + esc(label) + ' · <b id="ps-n-' + k + '">' + n + '</b>' + (hint ? '<span class="ps-opt__h">' + esc(hint) + '</span>' : '') + '</span></label>';
    };
    var inc = function (k, label) { return '<label class="ps-opt"><input type="checkbox" data-ps-inc="' + k + '"' + (state.ps[k] ? ' checked' : '') + '><span class="ps-opt__t">' + esc(label) + '</span></label>'; };
    return '<section class="ps" aria-labelledby="ps-h"><div class="ps-head"><p class="nk-label">' + esc(x.label) + '</p><h2 class="sub" id="ps-h">' + esc(x.title) + '</h2><p class="ps-lead">' + esc(x.lead) + '</p></div>' +
      '<div class="ps-cols"><fieldset class="ps-f"><legend class="nk-label">' + esc(x.which) + '</legend>' + opt('all', x.all, PROJECTS.length) + opt('shown', x.shown, psShown().length, x.shownHint) + (sl ? opt('list', x.list, sl) : '') + '</fieldset>' +
      '<fieldset class="ps-f"><legend class="nk-label">' + esc(x.inc) + '</legend>' + inc('cover', x.cover) + inc('index', x.index) + '</fieldset>' +
      '<div class="ps-prev"><ol class="ps-thumbs" id="ps-thumbs" aria-hidden="true"></ol><p class="ps-sum" id="ps-sum" role="status" aria-live="polite"></p></div></div>' +
      '<div class="print-act ps-act"><button type="button" class="nk-btn nk-btn--primary nk-btn--sm" id="ps-go" data-ps-print>' + psIco() + esc(x.btn) + '</button><span class="print-note">' + esc(x.note) + '</span></div></section>';
  }
  function psSync() {
    var sum = document.getElementById('ps-sum'); if (!sum) return;
    var x = t().ps, list = psList(), n = list.length, max = 6, th = [];
    var sn = document.getElementById('ps-n-shown'); if (sn) sn.textContent = psShown().length;
    sum.textContent = n ? x.sum.replace('{n}', n).replace('{p}', psPages(n)) : x.none;
    document.getElementById('ps-go').disabled = !n;
    if (n && state.ps.cover) th.push('<li class="ps-th ps-th--cover">' + logo() + '<span>' + esc(x.coverT) + '</span></li>');
    if (psIndexPages(n)) th.push('<li class="ps-th ps-th--index"><i></i><i></i><i></i><i></i><i></i><span>' + esc(x.indexT) + '</span></li>');
    list.forEach(function (p) { th.push('<li class="ps-th"><span class="ps-th__art">' + psArt(p) + '</span><span>' + sheetNo(p) + '</span></li>'); });
    var more = th.length - max;
    document.getElementById('ps-thumbs').innerHTML = th.slice(0, more > 0 ? max - 1 : max).join('') + (more > 0 ? '<li class="ps-th ps-th--more"><span>+' + (more + 1) + '</span></li>' : '');
  }
  function psDl(rows) { return '<dl class="ps-dl">' + rows.map(function (r) { return '<div><dt>' + esc(r[0]) + '</dt><dd>' + esc(r[1]) + '</dd></div>'; }).join('') + '</dl>'; }
  function psDoc(list) {
    var x = t(), ps = x.ps, n = list.length, total = psPages(n), pg = 0, out = [];
    var d = new Date(), date = fmtDate(d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'));
    var first = (state.ps.cover ? 1 : 0) + psIndexPages(n) + 1;
    var foot = function (no, url) {
      pg++;
      return '<footer class="ps-tb"><span class="ps-tb__brand">' + logo() + '<span>Nace Kepa · Engineering Studio</span></span><span><i>' + esc(ps.sheet) + '</i>' + esc(no) + '</span>' +
        '<span><i>' + esc(ps.page) + '</i>' + pg + ' / ' + total + '</span><span><i>' + esc(x.tb.date) + '</i>' + esc(date) + '</span><span class="ps-tb__url"><i>' + esc(ps.online) + '</i>' + esc(url) + '</span></footer>';
    };
    var home = 'nacekepa.work/#' + lang + '-work';
    if (state.ps.cover) {
      var cats = []; list.forEach(function (p) { if (cats.indexOf(cat(p)) < 0) cats.push(cat(p)); });
      out.push('<section class="ps-page ps-cover"><div class="ps-body"><div class="ps-cover__mark">' + logo() + '</div><p class="nk-label">' + esc(ps.label) + '</p>' +
        '<h1 class="ps-cover__t">' + esc(ps.docTitle) + '</h1><p class="ps-cover__s">Nace Kepa · Engineering Studio · Škofja Loka, SI</p><p class="ps-cover__lead">' + esc(x.heroLead) + '</p>' +
        psDl([[ps.sheets, String(n)], [ps.cats, cats.join(' · ')], [x.tb.date, date], [ps.online, home]]) +
        '<p class="nk-label">' + esc(ps.services) + '</p><table class="ps-tab"><tbody>' + SERVICES.map(function (s) { return '<tr><td class="ps-mono">' + esc(s.code) + '</td><td>' + esc(L(s.title)) + '</td><td class="ps-mono">' + esc(s.time ? L(s.time) : x.onRequest) + '</td></tr>'; }).join('') + '</tbody></table>' +
        '<p class="nk-label">' + esc(ps.contact) + '</p><p class="ps-contact">' + (CONTACT_EMAIL ? esc(CONTACT_EMAIL) + ' · ' : '') + 'nacekepa.work · ' + esc(LINKEDIN.replace('https://www.', '')) + '</p></div>' + foot('—', home) + '</section>');
    }
    for (var k = 0; k < psIndexPages(n); k++) {
      var part = list.slice(k * PS_ROWS, (k + 1) * PS_ROWS);
      out.push('<section class="ps-page"><div class="ps-body"><p class="nk-label">' + esc(ps.label) + '</p><h2 class="ps-t">' + esc(ps.indexT) + '</h2>' +
        '<table class="ps-tab ps-idx"><thead><tr><th>' + esc(ps.sheet) + '</th><th>' + esc(ps.colTitle) + '</th><th>' + esc(x.pCategory) + '</th><th>' + esc(x.pYear) + '</th><th>' + esc(ps.page) + '</th></tr></thead><tbody>' +
        part.map(function (p, j) { return '<tr><td class="ps-mono">' + sheetNo(p) + '</td><td>' + esc(P(p, 'title')) + '</td><td>' + esc(cat(p)) + '</td><td class="ps-mono">' + esc(p.year) + '</td><td class="ps-mono">' + (first + k * PS_ROWS + j) + '</td></tr>'; }).join('') +
        '</tbody></table></div>' + foot('—', home) + '</section>');
    }
    list.forEach(function (p) {
      var rows = [[x.pCategory, cat(p)], [x.pYear, String(p.year)]], det = P(p, 'details');
      if (p.materials) rows.push([x.pMaterials, p.materials]);
      if (p.model) rows.push([x.pModel, ps.model3d]);
      out.push('<section class="ps-page"><div class="ps-body"><p class="nk-label">' + esc(sheetNo(p) + ' · ' + cat(p) + ' · ' + p.year) + '</p><h2 class="ps-t">' + esc(P(p, 'title')) + '</h2>' +
        '<p class="ps-desc">' + esc(P(p, 'description')) + '</p><div class="ps-art">' + psArt(p) + '</div>' + psDl(rows) +
        (det ? '<div class="ps-det">' + det.split(/\n{2,}/).map(function (s) { return '<p>' + esc(s) + '</p>'; }).join('') + '</div>' : '') + '</div>' +
        foot(sheetNo(p), 'nacekepa.work/#' + lang + '-p-' + p.slug) + '</section>');
    });
    return out.join('');
  }
  function psPrint() {
    var list = psList(); if (!list.length) return;
    psDone();
    var doc = document.createElement('div'); doc.id = 'ps-doc'; doc.className = 'ps-doc'; doc.setAttribute('aria-hidden', 'true'); doc.innerHTML = psDoc(list);
    document.body.appendChild(doc);
    document.documentElement.classList.add('ps-on');
    psDone.title = document.title; document.title = 'Nace Kepa · ' + t().ps.docTitle; // default PDF file name
    window.addEventListener('afterprint', psDone, { once: true });
    try { window.print(); } catch (e) { psDone(); }
  }
  function psDone() {
    var doc = document.getElementById('ps-doc'); if (!doc) return;
    doc.remove(); document.documentElement.classList.remove('ps-on');
    if (psDone.title) { document.title = psDone.title; psDone.title = ''; }
  }
  // ---------- Similar projects (project pages) ----------
  // Self-contained: remove relScore()…relToOrder(), the relRow() call in projectView(), the data-rel-cat / data-rel-go
  // lines in the click handler, rel: in both languages in content.js and the .rel-* rules at the end of page.css.
  var REL_STOP = 'with,from,that,this,into,for,the,and,your,without,using,built,made,part,parts,design,printed,custom'.split(',');
  function relWords(p) {
    var w = {}, src = [P(p, 'title'), P(p, 'description'), p.materials].join(' ') + ' ' + [p.title && p.title.en, p.description && p.description.en].join(' ');
    findFold(src).split(/[^a-z0-9]+/).forEach(function (x) { if (x.length > 3 && REL_STOP.indexOf(x) < 0) w[x] = 1; });
    return w;
  }
  function relScore(p, q) {
    var a = relWords(p), b = relWords(q), s = p.category === q.category ? 4 : 0;
    Object.keys(a).forEach(function (k) { if (b[k]) s += 2; });
    if (p.model && q.model) s += 1;
    if (p.year === q.year) s += 1;
    return s;
  }
  function relList(p, skip) {
    return PROJECTS.filter(function (q) { return q !== p && q !== skip; })
      .map(function (q, i) { return { q: q, s: relScore(p, q), i: i }; })
      .filter(function (r) { return r.s > 0; })
      .sort(function (x, y) { return y.s - x.s || x.i - y.i; })
      .slice(0, 3).map(function (r) { return r.q; });
  }
  function relRow(p, skip) {
    var x = t().rel, list = relList(p, skip);
    if (!list.length) return '';
    var n = PROJECTS.filter(function (q) { return q.category === p.category; }).length;
    return '<section class="rel" aria-labelledby="rel-h"><div class="rel-head"><h2 class="sub" id="rel-h">' + esc(x.title) + '</h2>' +
      '<div class="rel-act">' + (n > 1 ? '<a class="rel-all" href="#work" data-rel-cat="' + esc(p.category) + '">' + esc(x.all.replace('{n}', n).replace('{c}', cat(p))) + ' →</a>' : '') +
      '<button type="button" class="nk-btn nk-btn--sm" data-rel-go>' + esc(x.start) + '<span class="nk-btn__arrow" aria-hidden="true">→</span></button></div></div>' +
      '<div class="rel-grid">' + list.map(sheet).join('') + '</div></section>';
  }
  function relToOrder() {
    var p = bySlug(currentSlug()), o = state.order; if (!p) return;
    var line = t().rel.brief + ': ' + P(p, 'title') + ' (' + sheetNo(p) + ').';
    if (o.what.indexOf(line) < 0) o.what = o.what ? o.what + '\n' + line : line;
    state.step = 0; state.errors = {}; state.send = 'idle';
    location.hash = 'order';
  }
  // ---------- Shortlist (project sheets + #work): visitors collect sheets they like and start a project with them ----------
  // Kept only in this browser (localStorage "nk-shortlist", in memory if storage is blocked); nothing is sent anywhere
  // unless the visitor puts it in the order brief. Self-contained: remove SL_KEY…slClear(), the slToggle() call in
  // projectView(), the slBox() call in views.work, the five data-sl-* lines in the click handler, sl: in both languages in
  // content.js and the "Shortlist" rules at the end of page.css.
  var SL_KEY = 'nk-shortlist', slMem = null;
  function slRead() {
    if (!slMem) { slMem = []; try { var a = JSON.parse(localStorage.getItem(SL_KEY) || '[]'); if (Array.isArray(a)) slMem = a.filter(function (v) { return typeof v === 'string'; }); } catch (e) {} }
    return slMem.filter(function (v, i, a) { return bySlug(v) && a.indexOf(v) === i; });
  }
  function slSave(a) { slMem = a.slice(); try { localStorage.setItem(SL_KEY, JSON.stringify(slMem)); } catch (e) {} }
  function slToggle(p) {
    var x = t().sl, on = slRead().indexOf(p.slug) >= 0, n = slRead().length;
    return '<div class="sl-act"><div class="sl-row" id="sl-row"><button type="button" class="nk-btn nk-btn--sm sl-tog" data-sl-tog="' + esc(p.slug) + '"><span class="sl-star" aria-hidden="true">' + (on ? '★' : '☆') + '</span>' + esc(on ? x.remove : x.add) + '</button>' +
      (n ? '<a class="share-link" href="#work">' + esc(x.see.replace('{n}', n)) + ' →</a>' : '') + '<span class="sl-note">' + esc(x.note) + '</span></div>' +
      '<p class="share-msg" id="sl-amsg" role="status" aria-live="polite"></p></div>';
  }
  function slFlip(slug) {
    var a = slRead(), i = a.indexOf(slug), x = t().sl, p = bySlug(slug); if (!p) return;
    if (i < 0) a.push(slug); else a.splice(i, 1);
    slSave(a);
    var row = document.getElementById('sl-row'); if (!row) return;
    var tmp = document.createElement('div'); tmp.innerHTML = slToggle(p);
    row.replaceWith(tmp.querySelector('#sl-row'));
    var b = document.querySelector('[data-sl-tog]'); if (b) b.focus();
    document.getElementById('sl-amsg').textContent = i < 0 ? x.added.replace('{n}', a.length) : x.removed;
  }
  function slBox() {
    var x = t().sl, a = slRead().map(bySlug);
    if (!a.length) return '';
    return '<section class="sl" aria-labelledby="sl-h"><div class="sl-head"><p class="nk-label">' + esc(x.label) + ' · ' + a.length + '</p><h2 class="sub" id="sl-h" tabindex="-1">' + esc(x.title) + '</h2><p class="sl-lead">' + esc(x.lead) + '</p></div>' +
      '<ul class="sl-list" id="sl-list">' + a.map(function (p) {
        return '<li><a href="#p-' + esc(p.slug) + '"><span class="nk-label">' + sheetNo(p) + '</span><span class="sl-t">' + esc(P(p, 'title')) + '</span><span class="nk-label sl-c">' + esc(cat(p)) + '</span></a>' +
          '<button type="button" class="chip sl-x" data-sl-del="' + esc(p.slug) + '" aria-label="' + esc(x.del.replace('{t}', P(p, 'title'))) + '">✕</button></li>';
      }).join('') + '</ul>' +
      '<div class="cta-row"><button type="button" class="nk-btn nk-btn--primary nk-btn--sm" data-sl-go>' + esc(x.start) + '<span class="nk-btn__arrow" aria-hidden="true">→</span></button>' +
      cmpSlBtn(a) + '<button type="button" class="nk-btn nk-btn--sm" data-sl-copy>' + esc(x.copy) + '</button><button type="button" class="share-link" data-sl-clear>' + esc(x.clear) + '</button></div>' +
      '<p class="share-msg" id="sl-msg" role="status" aria-live="polite"></p></section>';
  }
  function slDel(slug) {
    var a = slRead(), i = a.indexOf(slug); if (i < 0) return;
    a.splice(i, 1); slSave(a); render(true);
    var xs = document.querySelectorAll('[data-sl-del]'), f = xs[Math.min(i, xs.length - 1)] || document.getElementById('find-q');
    if (f) f.focus();
  }
  function slClear() { slSave([]); render(true); var f = document.getElementById('find-q'); if (f) f.focus(); }
  function slText() {
    var x = t().sl;
    return [x.title + ' — nacekepa.work', ''].concat(slRead().map(function (s) { var p = bySlug(s); return sheetNo(p) + ' · ' + P(p, 'title') + ' — ' + shareUrl('p', p); })).join('\n');
  }
  function slCopy() {
    var x = t().sl, msg = document.getElementById('sl-msg'), list = document.getElementById('sl-list');
    var fail = function () { msg.textContent = x.copyFail; var r = document.createRange(); r.selectNodeContents(list); var s = getSelection(); s.removeAllRanges(); s.addRange(r); };
    try { navigator.clipboard.writeText(slText()).then(function () { msg.textContent = x.copied; }, fail); } catch (e) { fail(); }
  }
  function slToOrder() {
    var a = slRead(), o = state.order; if (!a.length) return;
    var line = t().sl.brief + ': ' + a.map(function (s) { var p = bySlug(s); return P(p, 'title') + ' (' + sheetNo(p) + ')'; }).join('; ') + '.';
    if (o.what.indexOf(line) < 0) o.what = o.what ? o.what + '\n' + line : line;
    state.step = 0; state.errors = {}; state.send = 'idle';
    location.hash = 'order';
  }
  // ---------- Compare sheets (#compare?s=a,b,c): up to three project sheets side by side (2026-10-25) ----------
  // Uses only what is already on the sheets (category, year, description, materials, 3D model, photos, details); rows
  // where the sheets differ are marked Δ. Nothing is stored or sent. The selection lives in the address, so the link can be
  // shared. Self-contained: remove CMP_MAX … cmpSlAll(), views.compare, the three 'compare' lines in page(), frame() and
  // pageTitle() (p === 'compare'), cmpFrom() in projectView(), cmpSlBtn() in slBox(), cmpOpen() in views.work, c: in
  // KBD_GO, the data-cmp-* lines in the click/change handlers, cmp: + nav.compare in both languages in content.js and the
  // "Compare sheets" rules at the end of page.css.
  var CMP_MAX = 3;
  state.cmp = [];
  function cmpRead(qs) { // "s=a,b,c" → valid, unique slugs (max three)
    var m = /(?:^|&)s=([^&]*)/.exec(qs || ''), a = [], v = '';
    try { v = m ? decodeURIComponent(m[1]) : ''; } catch (e) {}
    v.split(',').forEach(function (s) { if (s && bySlug(s) && a.indexOf(s) < 0 && a.length < CMP_MAX) a.push(s); });
    state.cmp = a; state.cmpRaw = v;
  }
  function cmpNext(a) { // a sensible sheet to add: similar to the first one, else the next unused in the published order
    var first = bySlug(a[0]), pool = (first ? relList(first) : []).concat(featured(), PROJECTS);
    for (var i = 0; i < pool.length; i++) if (a.indexOf(pool[i].slug) < 0) return pool[i].slug;
    return '';
  }
  function cmpFill() { // an empty or one-sheet comparison is completed from the shortlist, then the featured sheets
    var a = state.cmp.slice(), sl = slRead();
    if (!a.length) a = sl.length > 1 ? sl.slice(0, CMP_MAX) : featured().map(function (p) { return p.slug; }).slice(0, 2);
    while (a.length < 2) { var n = cmpNext(a); if (!n) break; a.push(n); }
    if (a.join() !== state.cmp.join() || state.cmpRaw !== a.join()) { state.cmp = a; state.cmpRaw = a.join(); cmpSync(); }
  }
  function cmpHash(a) { return '#compare?s=' + (a || state.cmp).map(encodeURIComponent).join(','); }
  function cmpSync() { try { history.replaceState(history.state, '', cmpHash()); } catch (e) {} }
  function cmpLink() { return 'https://nacekepa.work/#' + lang + '-' + cmpHash().slice(1); }
  function cmpSet(a, focusSel) {
    state.cmp = a; cmpSync(); render(true);
    var f = focusSel && app.querySelector(focusSel); if (f) f.focus();
  }
  function cmpVal(p, k) { // [text shown, value compared] for one row
    var x = t(), c = x.cmp, ph = (p.photos || []).length, det = P(p, 'details').split(/\n{2,}/)[0] || '';
    if (k === 'cat') return [cat(p), p.category];
    if (k === 'year') return [String(p.year), String(p.year)];
    if (k === 'desc') return [P(p, 'description') || '—', null];
    if (k === 'mat') return [p.materials || c.none, findFold(p.materials || '')];
    if (k === 'model') return [p.model ? x.interactive : '—', p.model ? 1 : 0];
    if (k === 'photos') return [ph ? String(ph) : '—', ph];
    return [det ? (det.length > 240 ? det.slice(0, 236).replace(/\s+\S*$/, '') + ' …' : det) : c.none, null];
  }
  var CMP_ROWS = ['cat', 'year', 'desc', 'mat', 'model', 'photos', 'details'];
  function cmpCommon(list) {
    var c = t().cmp, out = [], all = function (f) { return list.every(function (p) { return f(p) === f(list[0]); }); };
    if (all(function (p) { return p.category; })) out.push(c.sameCat.replace('{c}', cat(list[0])));
    if (all(function (p) { return p.year; })) out.push(c.sameYear.replace('{y}', list[0].year));
    if (list.every(function (p) { return p.model; })) out.push(c.all3d);
    return out;
  }
  function cmpPicker(list) {
    var c = t().cmp, used = state.cmp, L3 = 'ABC';
    var cats = Object.keys(CATS).filter(function (k) { return PROJECTS.some(function (p) { return p.category === k; }); });
    PROJECTS.forEach(function (p) { if (cats.indexOf(p.category) < 0) cats.push(p.category); });
    return '<div class="cmp-pick" role="group" aria-label="' + esc(c.pick) + '">' + list.map(function (p, i) {
      var opts = cats.map(function (k) {
        return '<optgroup label="' + esc(CATS[k] ? CATS[k][lang] : k) + '">' + PROJECTS.filter(function (q) { return q.category === k; }).map(function (q) {
          return '<option value="' + esc(q.slug) + '"' + (q === p ? ' selected' : used.indexOf(q.slug) >= 0 ? ' disabled' : '') + '>' + sheetNo(q) + ' · ' + esc(P(q, 'title')) + '</option>';
        }).join('') + '</optgroup>';
      }).join('');
      return '<div class="nk-field cmp-slot"><label class="nk-field__label" for="cmp-' + i + '">' + esc(c.slot.replace('{n}', L3[i])) + '</label><div class="cmp-slot__row">' +
        '<select class="nk-input" id="cmp-' + i + '" data-cmp-slot="' + i + '">' + opts + '</select>' +
        (list.length > 2 ? '<button type="button" class="chip cmp-x" data-cmp-del="' + i + '" aria-label="' + esc(c.del.replace('{t}', P(p, 'title'))) + '">✕</button>' : '') + '</div></div>';
    }).join('') +
      (list.length < Math.min(CMP_MAX, PROJECTS.length) ? '<div class="cmp-add"><button type="button" class="nk-btn nk-btn--sm" data-cmp-add>+ ' + esc(c.add) + '</button></div>' : '') + '</div>';
  }
  function cmpTable(list) {
    var x = t(), c = x.cmp;
    var headCells = list.map(function (p, i) {
      return '<th scope="col" role="columnheader" class="cmp-col"><a class="cmp-sheet" href="#p-' + esc(p.slug) + '"><span class="nk-sheet__art cmp-art" aria-hidden="true">' + art(p) + '</span>' +
        '<span class="nk-label">' + 'ABC'[i] + ' · ' + sheetNo(p) + '</span><span class="cmp-t">' + esc(P(p, 'title')) + '</span></a></th>';
    }).join('');
    var rows = CMP_ROWS.map(function (k) {
      var vals = list.map(function (p) { return cmpVal(p, k); });
      var diff = vals[0][1] !== null && vals.some(function (v) { return v[1] !== vals[0][1]; });
      return '<tr role="row" class="cmp-r' + (diff ? ' is-diff' : '') + (k === 'desc' || k === 'details' ? ' cmp-r--text' : '') + '"><th scope="row" role="rowheader"><span class="nk-label">' + esc(c.rows[k]) + '</span>' +
        (diff ? '<span class="cmp-d" title="' + esc(c.differs) + '"><span aria-hidden="true">Δ</span><span class="vh">(' + esc(c.differs) + ')</span></span>' : '') + '</th>' +
        vals.map(function (v, i) { return '<td role="cell" data-l="' + 'ABC'[i] + '"' + (v[0] === c.none || v[0] === '—' ? ' class="cmp-empty"' : '') + '>' + esc(v[0]) + '</td>'; }).join('') + '</tr>';
    }).join('');
    return '<div class="cmp-wrap"><table class="cmp-tab" role="table" style="--cmp-n:' + list.length + '"><caption class="vh">' + esc(c.title) + '</caption>' +
      '<thead role="rowgroup"><tr role="row" class="cmp-hr"><td class="cmp-corner" role="cell"><span class="nk-label">' + esc(c.legend) + '</span></td>' + headCells + '</tr></thead><tbody role="rowgroup">' + rows + '</tbody></table></div>';
  }
  function cmpView() {
    var x = t(), c = x.cmp;
    cmpFill();
    var list = state.cmp.map(bySlug), common = cmpCommon(list);
    var empty = list.length < 2;
    return '<section class="block first cmp-page">' + '<a class="back" href="#work">← ' + esc(x.allWork) + '</a>' +
      head(c.label, c.title, c.lead, true) +
      (empty ? '<p class="cmp-msg">' + esc(c.few) + '</p>' :
      cmpPicker(list) +
      '<p class="cmp-common"><span class="nk-label">' + esc(c.common) + '</span> ' + (common.length ? common.map(esc).join(' · ') : esc(c.noCommon)) + '</p>' +
      cmpTable(list) +
      '<div class="cmp-act"><div class="cta-row"><button type="button" class="nk-btn nk-btn--primary nk-btn--sm" data-cmp-go>' + esc(c.start) + '<span class="nk-btn__arrow" aria-hidden="true">→</span></button>' +
      '<button type="button" class="nk-btn nk-btn--sm" data-cmp-sl><span class="sl-star" aria-hidden="true">☆</span>' + esc(c.toSl) + '</button></div>' +
      '<div class="share"><p class="nk-label" id="cmp-l">' + esc(c.linkL) + '</p><div class="share-row"><input class="share-url" id="cmp-url" type="text" readonly value="' + esc(cmpLink()) + '" aria-labelledby="cmp-l" spellcheck="false">' +
      '<button type="button" class="nk-btn nk-btn--sm" data-cmp-copy>' + esc(x.share.copy) + '</button></div></div>' +
      '<p class="share-msg" id="cmp-msg" role="status" aria-live="polite"></p></div>') +
      '</section>' + ctaBand();
  }
  function cmpCopy() {
    var f = document.getElementById('cmp-url'), msg = document.getElementById('cmp-msg'), x = t().share; if (!f) return;
    var fail = function () { f.focus(); f.select(); msg.textContent = x.copyFail; };
    try { navigator.clipboard.writeText(f.value).then(function () { msg.textContent = x.copied; }, fail); } catch (e) { fail(); }
  }
  function cmpToOrder() { // one "Compared sheets: …" line in "What should it do?" — replaced, not duplicated, on a second hand-off
    var c = t().cmp, o = state.order, list = state.cmp.map(bySlug).filter(Boolean); if (!list.length) return;
    var line = c.brief + ': ' + list.map(function (p) { return P(p, 'title') + ' (' + sheetNo(p) + ')'; }).join('; ') + '.';
    var pre = [T.en.cmp.brief + ':', T.sl.cmp.brief + ':'], had = false;
    var lines = o.what ? o.what.split('\n').map(function (l) { if (pre.some(function (s) { return l.indexOf(s) === 0; })) { had = true; return line; } return l; }) : [];
    o.what = had ? lines.join('\n') : (o.what ? o.what + '\n' + line : line);
    state.step = 0; state.errors = {}; state.send = 'idle';
    location.hash = 'order';
  }
  function cmpSlAll() {
    var a = slRead(), add = state.cmp.filter(function (s) { return a.indexOf(s) < 0; }), c = t().cmp;
    slSave(a.concat(add));
    var msg = document.getElementById('cmp-msg'); if (msg) msg.textContent = add.length ? c.slDone.replace('{n}', a.length + add.length) : c.slAll;
  }
  function cmpFrom(p) { // link on a project sheet: this sheet + the most similar one
    var other = relList(p)[0] || PROJECTS[(PROJECTS.indexOf(p) + 1) % PROJECTS.length];
    if (!other || other === p) return '';
    return '<p class="cmp-from"><a class="share-link" href="' + esc(cmpHash([p.slug, other.slug])) + '"><span aria-hidden="true">⇄ </span>' + esc(t().cmp.from) + ' →</a></p>';
  }
  function cmpOpen() { return PROJECTS.length > 1 ? '<p class="cmp-from cmp-open"><a class="share-link" href="#compare"><span aria-hidden="true">⇄ </span>' + esc(t().cmp.open) + ' →</a></p>' : ''; }
  function cmpSlBtn(a) { return a.length > 1 ? '<a class="nk-btn nk-btn--sm" href="' + esc(cmpHash(a.slice(0, CMP_MAX).map(function (p) { return p.slug; }))) + '"><span aria-hidden="true">⇄ </span>' + esc(t().cmp.slBtn.replace('{n}', Math.min(a.length, CMP_MAX))) + '</a>' : ''; }
  // ---------- full-screen photo viewer ----------
  var lb = null;
  function openLightbox(list, start, title) {
    closeLightbox();
    var x = t(), i = start;
    var el = document.createElement('div');
    el.className = 'lb'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', title);
    el.innerHTML = '<div class="lb__top"><span class="nk-label lb__count"></span><span class="lb__title"></span><button type="button" class="lb__btn" data-lb-close aria-label="' + esc(x.lbClose) + '">✕</button></div>' +
      '<div class="lb__stage"><div class="lb__img" role="img"></div><div class="lb__shield"></div>' +
      '<button type="button" class="lb__btn lb__prev" data-lb-prev aria-label="' + esc(x.lbPrev) + '">←</button><button type="button" class="lb__btn lb__next" data-lb-next aria-label="' + esc(x.lbNext) + '">→</button></div>' +
      '<div class="lb__thumbs">' + list.map(function (ph, k) { return '<button type="button" data-lb-go="' + k + '" aria-label="' + (k + 1) + '"><span style="background-image:url(\'' + asset(ph) + '\')"></span></button>'; }).join('') + '</div>';
    var prevFocus = document.activeElement;
    function show(n) {
      i = (n + list.length) % list.length;
      el.querySelector('.lb__img').style.backgroundImage = 'url("' + asset(list[i]) + '")';
      el.querySelector('.lb__img').setAttribute('aria-label', title + ' — ' + (i + 1) + ' / ' + list.length);
      el.querySelector('.lb__count').textContent = String(i + 1).padStart(2, '0') + ' / ' + String(list.length).padStart(2, '0');
      el.querySelector('.lb__title').textContent = title;
      Array.prototype.forEach.call(el.querySelectorAll('[data-lb-go]'), function (b, k) { b.setAttribute('aria-current', k === i ? 'true' : 'false'); });
      var single = list.length < 2;
      el.querySelector('.lb__prev').hidden = single; el.querySelector('.lb__next').hidden = single; el.querySelector('.lb__thumbs').hidden = single;
    }
    function key(e) {
      if (e.key === 'Escape') closeLightbox();
      else if (e.key === 'ArrowLeft') show(i - 1);
      else if (e.key === 'ArrowRight') show(i + 1);
      else if (e.key === 'Tab') { var f = el.querySelectorAll('button:not([hidden])'); if (!f.length) return; var first = f[0], last = f[f.length - 1]; if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); } else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); } }
    }
    var sx = null;
    el.addEventListener('click', function (e) {
      var b = e.target.closest('button');
      if (!b) { if (e.target === el || e.target.classList.contains('lb__stage')) closeLightbox(); return; }
      if (b.hasAttribute('data-lb-close')) closeLightbox();
      else if (b.hasAttribute('data-lb-prev')) show(i - 1);
      else if (b.hasAttribute('data-lb-next')) show(i + 1);
      else if (b.dataset.lbGo != null) show(+b.dataset.lbGo);
    });
    el.addEventListener('touchstart', function (e) { sx = e.touches[0].clientX; }, { passive: true });
    el.addEventListener('touchend', function (e) { if (sx == null) return; var dx = e.changedTouches[0].clientX - sx; if (Math.abs(dx) > 40) show(i + (dx < 0 ? 1 : -1)); sx = null; });
    document.addEventListener('keydown', key);
    document.body.appendChild(el);
    document.documentElement.classList.add('lb-open');
    show(i);
    el.querySelector('[data-lb-close]').focus();
    lb = { el: el, key: key, prevFocus: prevFocus };
  }
  function closeLightbox() {
    if (!lb) return;
    document.removeEventListener('keydown', lb.key);
    lb.el.remove();
    document.documentElement.classList.remove('lb-open');
    if (lb.prevFocus && document.body.contains(lb.prevFocus)) lb.prevFocus.focus();
    lb = null;
  }

  // ---------- no saving of project media ----------
  // Blocks right-click "Save image", dragging images out and long-press saving on phones.
  // (Anything shown on screen can still be screenshotted; this stops the casual copy.)
  function guarded(t) { return t && t.closest && t.closest('img, .nk-sheet__art, .nk-viewer, .lb, .photos'); }
  document.addEventListener('contextmenu', function (e) { if (guarded(e.target)) e.preventDefault(); });
  document.addEventListener('dragstart', function (e) { if (guarded(e.target)) e.preventDefault(); });

  function mountViewer() {
    var el = document.getElementById('viewer');
    if (!el) return;
    var go = function () {
      window.NKViewer.mount(el, { url: el.dataset.src, format: el.dataset.format }).then(function (v) {
        if (!document.body.contains(el)) { v.dispose(); return; }
        viewer = v; var msg = document.getElementById('viewer-msg'); if (msg) msg.remove(); v3Sync('vw');
      }, function () { var msg = document.getElementById('viewer-msg'); if (msg) msg.textContent = t().viewerFail; });
    };
    if (window.NKViewer) go(); else { window.addEventListener('nkviewer:ready', go, { once: true }); if (window.NKViewerLoad) window.NKViewerLoad(); }
  }

  function timelineDims() {
    var x = t(), w = ['38%', '52%', '100%'];
    return '<div class="dims">' + x.timelines.map(function (r, i) { return '<div class="dim-row"><span class="nk-label">' + esc(r[0]) + '</span><div class="nk-dim" style="width:' + w[i] + '"><span>' + esc(r[1]) + '</span></div></div>'; }).join('') + '</div>';
  }

  // ---------- Search (#work): find projects and news by any word, in EN or SL ----------
  // Self-contained: remove findFold()…findApply(), the findBox()/findResults() calls and id="find-grid" in views.work,
  // the find-q lines in the input/keydown handlers and render(), T.*.find in content.js and the .find-* rules in page.css.
  state.q = '';
  function findFold(s) { return String(s == null ? '' : s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); }
  function findBoth(v) { return v && typeof v === 'object' ? [v.en, v.sl].join(' ') : (v || ''); }
  function findHit(txt, q) { var w = findFold(q).split(/\s+/).filter(Boolean); return w.every(function (x) { return txt.indexOf(x) >= 0; }); }
  function findProjectText(p) { return findFold([findBoth(p.title), findBoth(p.description), findBoth(p.details), p.category, CATS[p.category] ? CATS[p.category].sl : '', p.materials, p.year, sheetNo(p)].join(' ')); }
  function findNewsText(n) { return findFold([findBoth(n.title), findBoth(n.summary), findBoth(n.body), n.date].join(' ')); }
  function findBox() {
    var f = t().find;
    return '<div class="find" role="search"><label class="nk-label" for="find-q">' + esc(f.label) + ' <span class="find-key">' + esc(f.key) + '</span></label>' +
      '<div class="find-row"><input class="nk-input" id="find-q" type="search" enterkeyhint="search" autocomplete="off" spellcheck="false" placeholder="' + esc(f.ph) + '" value="' + esc(state.q) + '" aria-describedby="find-out">' +
      '<button type="button" class="chip find-clear" data-find-clear aria-label="' + esc(f.clear) + '"' + (state.q ? '' : ' hidden') + '>✕</button></div>' +
      '<p class="nk-label find-out" id="find-out" role="status" aria-live="polite"></p>' + findShareBox() + '</div>';
  }
  function findResults() { return '<div class="find-news" id="find-news" hidden></div><div class="find-none" id="find-none" hidden></div>'; }
  function findApply() {
    var grid = document.getElementById('find-grid'); if (!grid) return;
    var f = t().find, q = state.q.trim(), shown = 0;
    Array.prototype.forEach.call(grid.querySelectorAll('.nk-sheet'), function (a) {
      var p = bySlug(a.getAttribute('href').slice(3)), hit = !q || (p && findHit(findProjectText(p), q));
      a.hidden = !hit; if (hit) shown++;
    });
    var news = q ? NEWS.filter(function (n) { return findHit(findNewsText(n), q); }) : [];
    var out = document.getElementById('find-out'), nw = document.getElementById('find-news'), none = document.getElementById('find-none'), clr = app.querySelector('[data-find-clear]');
    out.textContent = q ? f.count.replace('{p}', shown).replace('{n}', news.length) : '';
    nw.hidden = !news.length;
    nw.innerHTML = news.length ? '<p class="nk-label">' + esc(f.news) + ' · ' + news.length + '</p><ul>' + news.map(function (n) { return '<li><a href="#n-' + esc(n.slug) + '"><span class="nk-label">' + esc(fmtDate(n.date)) + '</span><span>' + esc(P(n, 'title')) + ' →</span></a></li>'; }).join('') + '</ul>' : '';
    none.hidden = !(q && !shown && !news.length);
    none.innerHTML = none.hidden ? '' : '<p class="sub">' + esc(f.none.replace('{q}', q)) + '</p><p class="lead">' + esc(f.noneBody) + '</p><div class="cta-row">' + btn(t().cta, '#order', 'primary', null, true) + '</div>';
    if (clr) clr.hidden = !state.q;
    findSync();
    psSync();
    rgApply();
  }

  // ---------- Search links (#work): the search and category filter live in the address, e.g. #en-work?q=esp32&cat=iot ----------
  // Self-contained: remove findQuery()…findShareCopy(), the "?" line in page(), the findShareBox() call in findBox(),
  // the findSync() call at the end of findApply(), the data-find-copy line in the click handler, find.link* in content.js
  // and the "Search links" rules at the end of page.css.
  function findQuery() {
    var a = [], q = state.q.trim();
    if (q) a.push('q=' + encodeURIComponent(q));
    if (state.filter !== 'all') a.push('cat=' + encodeURIComponent(state.filter));
    if (state.rg && state.rg.view === 'reg') a.push('view=list');
    return a.length ? '?' + a.join('&') : '';
  }
  function findRead(qs) {
    var q = '', c = 'all';
    qs.split('&').forEach(function (kv) {
      var i = kv.indexOf('='), k = i < 0 ? kv : kv.slice(0, i), v = i < 0 ? '' : kv.slice(i + 1);
      try { v = decodeURIComponent(v.replace(/\+/g, ' ')); } catch (e) { v = ''; }
      if (k === 'q') q = v.slice(0, 100);
      if (k === 'cat' && (v === '3d' || CATS[v])) c = v;
      if (k === 'view' && state.rg) state.rg.view = v === 'list' ? 'reg' : 'grid';
    });
    state.q = q; state.filter = c;
  }
  function findLink() { return 'https://nacekepa.work/#' + lang + '-work' + findQuery(); }
  function findSync() {
    var h = location.hash, m = /^#(en|sl)-?/.exec(h), want = '#' + (m ? m[1] + '-' : '') + 'work' + findQuery();
    if (h !== want) try { history.replaceState(history.state, '', want); } catch (e) {}
    state.findHash = location.hash; // read back from the address only when it changes from outside (link, Back, typed)
    var box = document.getElementById('find-share'); if (!box) return;
    var on = !!findQuery(), url = document.getElementById('find-url');
    box.hidden = !on;
    if (url && url.value !== findLink()) { url.value = findLink(); document.getElementById('find-msg').textContent = ''; }
  }
  function findShareBox() {
    var f = t().find, sh = t().share;
    return '<div class="find-share" id="find-share" hidden><p class="nk-label" id="find-link-l">' + esc(f.link) + '</p>' +
      '<div class="share-row"><input class="share-url" id="find-url" type="text" readonly value="" aria-labelledby="find-link-l" aria-describedby="find-link-n" spellcheck="false">' +
      '<button type="button" class="nk-btn nk-btn--sm" data-find-copy>' + esc(sh.copy) + '</button></div>' +
      '<p class="find-link-n" id="find-link-n">' + esc(f.linkNote) + '</p>' +
      '<p class="share-msg" id="find-msg" role="status" aria-live="polite"></p></div>';
  }
  function findShareCopy() {
    var f = document.getElementById('find-url'), msg = document.getElementById('find-msg'), x = t().share; if (!f) return;
    var fail = function () { f.focus(); f.select(); msg.textContent = x.copyFail; };
    try { navigator.clipboard.writeText(f.value).then(function () { msg.textContent = x.copied; }, fail); } catch (e) { fail(); }
  }

  // ---------- Drawing register (#work, "Sheets | Register" switch, e.g. #work?view=list; 2026-10-27) ----------
  // Every project as one line of a drawing register: sheet number, title + one-line description, discipline, year (3D and
  // photo columns appear only once a sheet has a model / photos) and a ☆ shortlist toggle. Sortable columns, follows the
  // search and category filter, kept in the address so the link opens the same view, "Copy register" as plain text.
  // Uses only the published sheets; nothing is stored or sent. Self-contained: remove state.rg … rgCopy(), the rgBar() /
  // rgTable() calls and the `hidden` on #find-grid in views.work, the rgApply() call in findApply(), the view lines in
  // findQuery() and findRead(), the data-rg-* lines in the click handler, the '#rg' part of the back-to-card line in
  // render(), rg: in both languages in content.js and the "Drawing register" rules at the end of page.css.
  state.rg = { view: 'grid', sort: 'no', dir: 1 };
  function rgOn() { return state.rg.view === 'reg'; }
  function rgCols() {
    var c = ['no', 'name', 'cat', 'year'];
    if (PROJECTS.some(function (p) { return p.model; })) c.push('m3d');
    if (PROJECTS.some(function (p) { return p.photos && p.photos.length; })) c.push('photos');
    return c;
  }
  function rgKey(p, k) {
    return k === 'no' ? PROJECTS.indexOf(p) : k === 'name' ? P(p, 'title') : k === 'cat' ? cat(p) : k === 'year' ? (+p.year || 0) :
      k === 'm3d' ? (p.model ? 1 : 0) : (p.photos ? p.photos.length : 0);
  }
  function rgSorted() {
    var k = state.rg.sort, d = state.rg.dir;
    return PROJECTS.slice().sort(function (a, b) { var x = rgKey(a, k), y = rgKey(b, k); return (typeof x === 'string' ? x.localeCompare(y, lang, { sensitivity: 'base' }) : x - y) * d || PROJECTS.indexOf(a) - PROJECTS.indexOf(b); });
  }
  function rgBar() {
    if (!PROJECTS.length) return '';
    var x = t().rg, on = rgOn();
    return '<div class="rg-bar" role="group" aria-labelledby="rg-bar-l"><span class="nk-label" id="rg-bar-l">' + esc(x.label) + '</span>' +
      '<button type="button" class="chip rg-v" data-rg-view="grid" aria-pressed="' + !on + '"><span class="rg-ico" aria-hidden="true">▦</span>' + esc(x.grid) + '</button>' +
      '<button type="button" class="chip rg-v" data-rg-view="reg" aria-pressed="' + on + '"><span class="rg-ico" aria-hidden="true">≡</span>' + esc(x.reg) + '</button></div>';
  }
  function rgTable() {
    if (!rgOn() || !PROJECTS.length) return '';
    var x = t().rg, cols = rgCols(), sl = slRead();
    var none = '<span class="rg-none"><span aria-hidden="true">' + x.none + '</span><span class="vh">' + esc(x.noneSr) + '</span></span>';
    var th = cols.map(function (k) {
      var on = state.rg.sort === k, d = on ? (state.rg.dir > 0 ? 'ascending' : 'descending') : 'none';
      return '<th scope="col" class="rg-c rg-c--' + k + '"' + (on ? ' aria-sort="' + d + '"' : '') + '><button type="button" class="rg-sort" data-rg-sort="' + k + '" title="' + esc(x.sortBy.replace('{c}', x[k])) + '">' + esc(x[k]) +
        '<span class="rg-arr" aria-hidden="true">' + (on ? (state.rg.dir > 0 ? '↑' : '↓') : '↕') + '</span></button></th>';
    }).join('') + '<th scope="col" class="rg-c rg-c--sl"><span class="vh">' + esc(x.list) + '</span><span aria-hidden="true">★</span></th>';
    var rows = rgSorted().map(function (p) {
      var on = sl.indexOf(p.slug) >= 0, ti = P(p, 'title');
      var cells = cols.map(function (k) {
        var v = k === 'no' ? '<span class="nk-label">' + sheetNo(p) + '</span>' :
          k === 'name' ? '<a class="rg-t" href="#p-' + esc(p.slug) + '">' + esc(ti) + '</a><span class="rg-d">' + esc(P(p, 'description')) + '</span>' :
          k === 'cat' ? esc(cat(p)) : k === 'year' ? esc(p.year) :
          k === 'm3d' ? (p.model ? esc(x.yes) : none) : (p.photos && p.photos.length ? String(p.photos.length) : none);
        var tag = k === 'name' ? 'th' : 'td';
        return '<' + tag + (tag === 'th' ? ' scope="row"' : '') + ' class="rg-c rg-c--' + k + '" data-l="' + esc(x[k]) + '">' + v + '</' + tag + '>';
      }).join('');
      return '<tr data-rg="' + esc(p.slug) + '"' + (on ? ' class="is-sl"' : '') + '>' + cells + '<td class="rg-c rg-c--sl"><button type="button" class="rg-star" data-rg-sl="' + esc(p.slug) + '" aria-pressed="' + on + '" aria-label="' + esc((on ? x.remove : x.add).replace('{t}', ti)) + '">' + (on ? '★' : '☆') + '</button></td></tr>';
    }).join('');
    return '<section class="rg" id="rg" aria-labelledby="rg-h"><div class="rg-head"><h2 class="sub" id="rg-h">' + esc(x.title) + '</h2><p class="nk-label" id="rg-n"></p></div>' +
      '<p class="rg-note">' + esc(x.note) + '</p>' +
      '<div class="rg-wrap"><table class="rg-tab" id="rg-tab" aria-labelledby="rg-h"><thead><tr>' + th + '</tr></thead><tbody>' + rows + '</tbody></table></div>' +
      '<p class="rg-empty" id="rg-empty" hidden>' + esc(x.empty) + '</p><p class="rg-sum nk-label" id="rg-sum"></p>' +
      '<div class="cta-row rg-act"><button type="button" class="nk-btn nk-btn--sm" data-rg-copy>' + esc(x.copy) + '</button></div>' +
      '<p class="share-msg" id="rg-msg" role="status" aria-live="polite"></p></section>';
  }
  function rgShown() { var shown = psShown(); return rgSorted().filter(function (p) { return shown.indexOf(p) >= 0; }); }
  function rgApply() { // called from findApply(): hide rows outside the search / category filter, update the counts
    var tab = document.getElementById('rg-tab'); if (!tab) return;
    var x = t().rg, shown = rgShown(), cats = {}, ys = [];
    Array.prototype.forEach.call(tab.querySelectorAll('tr[data-rg]'), function (tr) { tr.hidden = shown.indexOf(bySlug(tr.getAttribute('data-rg'))) < 0; });
    shown.forEach(function (p) { cats[cat(p)] = (cats[cat(p)] || 0) + 1; if (+p.year) ys.push(+p.year); });
    var y0 = Math.min.apply(null, ys), y1 = Math.max.apply(null, ys), n = shown.length;
    document.getElementById('rg-n').textContent = x.of.replace('{n}', n).replace('{t}', PROJECTS.length);
    var nf = document.getElementById('find-none');
    document.getElementById('rg-empty').hidden = !!n || !(nf && nf.hidden);
    document.getElementById('rg-sum').textContent = n ? x.total + ': ' + Object.keys(cats).map(function (c) { return c + ' ' + cats[c]; }).join(' · ') + (ys.length ? ' · ' + (y0 === y1 ? y0 : y0 + '–' + y1) : '') : '';
    var cp = app.querySelector('[data-rg-copy]'); if (cp) cp.disabled = !n;
  }
  function rgView(v) {
    state.rg.view = v === 'reg' ? 'reg' : 'grid'; render(true);
    var b = app.querySelector('[data-rg-view="' + state.rg.view + '"]'); if (b) b.focus();
  }
  function rgSort(k) {
    if (state.rg.sort === k) state.rg.dir = -state.rg.dir; else { state.rg.sort = k; state.rg.dir = k === 'year' ? -1 : 1; }
    render(true);
    var x = t().rg, b = app.querySelector('[data-rg-sort="' + k + '"]'); if (b) b.focus();
    var m = document.getElementById('rg-msg'); if (m) m.textContent = x.sorted.replace('{c}', x[k]).replace('{d}', state.rg.dir > 0 ? x.asc : x.desc);
  }
  function rgStar(slug) {
    var a = slRead(), i = a.indexOf(slug), p = bySlug(slug), x = t().rg; if (!p) return;
    if (i < 0) a.push(slug); else a.splice(i, 1);
    slSave(a); render(true);
    var b = app.querySelector('[data-rg-sl="' + slug + '"]'); if (b) b.focus();
    var m = document.getElementById('rg-msg'); if (m) m.textContent = (i < 0 ? x.added.replace('{n}', a.length) : x.removed).replace('{t}', P(p, 'title'));
  }
  function rgText() {
    return [t().rg.title + ' — nacekepa.work', ''].concat(rgShown().map(function (p) { return sheetNo(p) + ' · ' + P(p, 'title') + ' · ' + cat(p) + ' · ' + p.year + ' — ' + shareUrl('p', p); })).join('\n');
  }
  function rgCopy() {
    var x = t().rg, msg = document.getElementById('rg-msg'), tab = document.getElementById('rg-tab');
    var fail = function () { msg.textContent = x.copyFail; var r = document.createRange(); r.selectNodeContents(tab); var s = getSelection(); s.removeAllRanges(); s.addRange(r); };
    try { navigator.clipboard.writeText(rgText()).then(function () { msg.textContent = x.copied; }, fail); } catch (e) { fail(); }
  }

  // ---------- 3D drawing views + section (project sheets and the file check on #services; 2026-10-29) ----------
  // One control bar under a 3D view: Iso / Top / Front / Side (orthographic drawing views, like the three views of a sheet)
  // and a "Section" slider that cuts the part at a height so the inside can be seen. Works for the project viewer
  // (`viewer`, for="vw") and the file check's own 3D preview (`fc3d`, for="fc"). Uses viewer.js setView() / setCut() only;
  // nothing is stored or sent. Self-contained: remove V3_VIEWS … v3Sync(), the v3Bar() calls in projectView() / fcViews(),
  // the v3Sync() call in mountViewer(), the fc3d* functions and state.fc.v3d lines, the data-v3-* / data-fc-3d lines in the
  // click and input handlers, v3: + fc.v3d* in both languages in content.js and the "3D views" rules at the end of page.css.
  var V3_VIEWS = ['iso', 'top', 'front', 'side'];
  state.vw = { view: 'iso', cut: 100 };
  function v3State(k) { return k === 'fc' ? state.fc : state.vw; }
  function v3Handle(k) { return k === 'fc' ? fc3d : viewer; }
  function v3Bar(k) {
    var x = t().v3, st = v3State(k), on = !!v3Handle(k);
    return '<div class="v3" data-v3-bar="' + k + '"' + (on ? '' : ' hidden') + '><div class="v3-views" role="group" aria-label="' + esc(x.view) + '"><span class="nk-label">' + esc(x.view) + '</span>' +
      V3_VIEWS.map(function (v) { return '<button type="button" class="chip v3-v" data-v3-view="' + v + '" data-v3-for="' + k + '" aria-pressed="' + ((st.view || 'iso') === v) + '">' + esc(x[v]) + '</button>'; }).join('') + '</div>' +
      '<div class="v3-cut"><label class="nk-label" for="v3-cut-' + k + '">' + esc(x.cut) + '</label><input type="range" id="v3-cut-' + k + '" min="0" max="100" step="1" value="' + (st.cut == null ? 100 : st.cut) + '" data-v3-cut="' + k + '" aria-describedby="v3-cut-out-' + k + '"><output class="nk-label" id="v3-cut-out-' + k + '" for="v3-cut-' + k + '">' + esc(v3CutText(k)) + '</output></div></div>';
  }
  function v3CutText(k) {
    var x = t().v3, st = v3State(k), h = v3Handle(k), c = st.cut == null ? 100 : +st.cut;
    if (c >= 100 || !h) return x.full;
    return x.at.replace('{z}', fitFmt(Math.round(h.info.size.y * c) / 100));
  }
  function v3Set(k, what, v) { // what: 'view' | 'cut'
    var st = v3State(k);
    if (what === 'view') st.view = V3_VIEWS.indexOf(v) >= 0 ? v : 'iso'; else st.cut = Math.max(0, Math.min(100, +v || 0));
    v3Sync(k);
  }
  function v3Sync(k) { // push the state into the viewer and the bar (shown once the viewer is mounted)
    var h = v3Handle(k), st = v3State(k), bar = document.querySelector('[data-v3-bar="' + k + '"]');
    if (bar) bar.hidden = !h;
    if (!h) return;
    if (h.view !== (st.view || 'iso')) h.setView(st.view || 'iso');
    var c = st.cut == null ? 100 : +st.cut;
    h.setCut(c >= 100 ? null : h.info.size.y * c / 100);
    if (bar) {
      bar.querySelectorAll('[data-v3-view]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.v3View === (st.view || 'iso'))); });
      var o = bar.querySelector('output'); if (o) o.textContent = v3CutText(k);
      var r = bar.querySelector('input[type=range]'); if (r && +r.value !== c) r.value = c;
    }
  }

  // ---------- Fit check (#services): will a part fit the X2D build volume in one piece? ----------
  // Self-contained: remove fitChecker()…fitToOrder(), the fitChecker() call in views.services, the two
  // data-fit handlers below, T.*.fit in content.js and the .fit-* rules in page.css.
  var BED = [256, 256, 260]; // X × Y × Z in mm, Bambu Lab X2D (from the news post "bambu-lab-x2d")
  state.fit = { l: '', w: '', h: '' };
  function fitNum(v) { var n = parseFloat(String(v).replace(',', '.')); return n > 0 && n < 100000 ? Math.round(n * 10) / 10 : 0; }
  function fitFmt(n) { var s = String(n); return lang === 'sl' ? s.replace('.', ',') : s; }
  function fitDims(a) { return a.map(fitFmt).join(' × '); }
  function fitCalc(src) { // src: { l, w, h } — the fit check's own fields unless another tool (the planner) passes its own
    src = src || state.fit;
    var d = [fitNum(src.l), fitNum(src.w), fitNum(src.h)];
    if (!d[0] || !d[1] || !d[2]) return null;
    var perms = [[0, 1, 2], [1, 0, 2], [0, 2, 1], [2, 0, 1], [1, 2, 0], [2, 1, 0]];
    for (var i = 0; i < perms.length; i++) {
      var o = perms[i].map(function (k) { return d[k]; });
      if (o[0] <= BED[0] && o[1] <= BED[1] && o[2] <= BED[2]) return { fits: true, asIs: i < 2 && o[2] === d[2], o: o, d: d };
    }
    var up = function (x, y) { return x - y; }, a = d.slice().sort(up), b = BED.slice().sort(up), over = 0;
    for (var j = 0; j < 3; j++) over = Math.max(over, a[j] - b[j]);
    return { fits: false, o: d, d: d, over: Math.round(over * 10) / 10 };
  }
  function fitResult(r) {
    var f = t().fit;
    if (!r) return '<p class="hint">' + esc(f.empty) + '</p>';
    if (r.fits) return '<span class="nk-tag nk-tag--ok">' + esc(f.ok) + '</span><p>' + esc(r.asIs ? f.okAsIs : f.okTurned.replace('{o}', fitDims(r.o))) + '</p>';
    return '<span class="nk-tag nk-tag--rev">' + esc(f.no) + '</span><p>' + esc(f.noBody.replace('{d}', fitFmt(r.over))) + '</p>';
  }
  // One orthographic view: build plate outline (dashed) and the part (red) at the same scale.
  function fitView(label, bw, bh, pw, ph, onPlate) {
    var s = 160 / Math.max(bw, bh, pw || 0, ph || 0), cx = 120, base = 186;
    var BW = bw * s, BH = bh * s, mid = base - BH / 2;
    var out = '<svg class="fit-svg" viewBox="0 0 240 230" aria-hidden="true" focusable="false"><text class="dimt" x="8" y="14">' + esc(label.toUpperCase()) + '</text>' +
      '<rect class="hid" x="' + (cx - BW / 2) + '" y="' + (base - BH) + '" width="' + BW + '" height="' + BH + '"/>' +
      (onPlate ? '<line class="ln" x1="' + (cx - BW / 2 - 8) + '" y1="' + base + '" x2="' + (cx + BW / 2 + 8) + '" y2="' + base + '"/>' : '') +
      '<path class="dim" d="M' + (cx - BW / 2) + ' ' + (base + 10) + ' v10 M' + (cx + BW / 2) + ' ' + (base + 10) + ' v10 M' + (cx - BW / 2) + ' ' + (base + 15) + ' H' + (cx + BW / 2) + '"/>' +
      '<text class="dimt" x="' + cx + '" y="' + (base + 32) + '" text-anchor="middle">' + fitFmt(bw) + ' × ' + fitFmt(bh) + '</text>';
    if (pw && ph) {
      var PW = pw * s, PH = ph * s, top = onPlate ? base - PH : mid - PH / 2;
      out += '<rect class="fit-part" x="' + (cx - PW / 2) + '" y="' + top + '" width="' + PW + '" height="' + PH + '"/>';
    }
    return out + '<line class="ctr" x1="' + cx + '" y1="20" x2="' + cx + '" y2="' + (base + 4) + '"/></svg>';
  }
  function fitViews(r) {
    var f = t().fit, o = r ? r.o : [0, 0, 0];
    return '<div>' + fitView(f.top + ' · X × Y', BED[0], BED[1], o[0], o[1], false) + '</div><div>' + fitView(f.front + ' · X × Z', BED[0], BED[2], o[0], o[2], true) + '</div>';
  }
  function fitChecker() {
    var f = t().fit, r = fitCalc();
    var inp = function (k) { return '<div class="nk-field"><label class="nk-field__label" for="fit-' + k + '">' + esc(f[k]) + ' · mm</label><input class="nk-input" id="fit-' + k + '" data-fit="' + k + '" type="number" inputmode="decimal" min="0" step="any" value="' + esc(state.fit[k]) + '"></div>'; };
    return '<section class="block fit">' + head(f.label, f.title, f.lead) + '<div class="fit-grid"><div class="fit-form"><div class="fit-inputs">' + inp('l') + inp('w') + inp('h') + '</div>' +
      '<div class="fit-out" id="fit-out" role="status" aria-live="polite">' + fitResult(r) + '</div>' +
      '<div class="cta-row"><button type="button" class="nk-btn nk-btn--primary" data-fit-go>' + esc(f.cta) + '<span class="nk-btn__arrow" aria-hidden="true">→</span></button></div>' +
      '<p class="fit-note">' + esc(f.note) + '</p></div>' +
      '<figure class="fit-fig"><div class="nk-sheet__art fit-views" id="fit-views">' + fitViews(r) + '</div><figcaption class="nk-label">' + esc(f.views) + ' · ' + fitDims(BED) + ' mm</figcaption></figure></div></section>';
  }
  function fitUpdate() {
    var r = fitCalc(), out = document.getElementById('fit-out'), v = document.getElementById('fit-views');
    if (out) out.innerHTML = fitResult(r);
    if (v) v.innerHTML = fitViews(r);
  }
  function fitToOrder() {
    var r = fitCalc(), o = state.order;
    if (o.services.indexOf('print') < 0) o.services.push('print');
    if (r) { var line = t().fit.brief + ': ' + fitDims(r.d) + ' mm.'; if (o.what.indexOf(line) < 0) o.what = o.what ? o.what + '\n' + line : line; }
    state.step = 0; state.errors = {}; state.send = 'idle';
    location.hash = 'order';
  }

  // ---------- File check (#services): read a client's STL / 3MF / OBJ here in the browser → size, volume, closed mesh, X2D fit ----------
  // The file never leaves the browser (no upload, no network request); only the numbers can go into the brief. Uses only the
  // X2D build volume already on the site (BED / fitCalc). Added 2026-10-21. To remove: delete FC_MAX … fcToOrder(), the
  // fcBox() call in views.services, the fcDraw line in render(), the data-fc-* lines in the click and change handlers, the
  // "File check: drop" listeners after the change handler, fc: in both languages in content.js and the "File check" rules at
  // the end of page.css.
  var FC_MAX = 200 * 1024 * 1024; // bigger files are refused — they would stall a phone
  var FC_UNITS = { mm: 1, cm: 10, m: 1000, in: 25.4 };
  var FC_3MF_UNITS = { micron: 0.001, millimeter: 1, centimeter: 10, inch: 25.4, foot: 304.8, meter: 1000 };
  state.fc = { busy: false, err: '', res: null, unit: 'mm' }; // res: { name, fmt, pos (Float32Array, 9 numbers per triangle), objects, unitSet, st }
  function fcSTL(buf) {
    var dv = new DataView(buf), n = buf.byteLength >= 84 ? dv.getUint32(80, true) : -1, i, j;
    if (n >= 0 && 84 + n * 50 === buf.byteLength) { // binary (some binary files also start with "solid", so the size decides)
      var pos = new Float32Array(n * 9);
      for (i = 0; i < n; i++) for (j = 0; j < 9; j++) pos[i * 9 + j] = dv.getFloat32(84 + i * 50 + 12 + j * 4, true);
      return pos;
    }
    var txt = new TextDecoder().decode(buf), re = /vertex\s+(\S+)\s+(\S+)\s+(\S+)/g, a = [], m;
    while ((m = re.exec(txt))) a.push(+m[1], +m[2], +m[3]);
    a.length -= a.length % 9;
    return new Float32Array(a);
  }
  function fcOBJ(buf) {
    var lines = new TextDecoder().decode(buf).split(/\r?\n/), v = [], out = [];
    for (var i = 0; i < lines.length; i++) {
      var l = lines[i].trim(), p;
      if (/^v\s/.test(l)) { p = l.split(/\s+/); v.push(+p[1], +p[2], +p[3]); }
      else if (/^f\s/.test(l)) {
        var f = l.split(/\s+/).slice(1).map(function (s) { var k = parseInt(s, 10); return k < 0 ? v.length / 3 + k : k - 1; });
        for (var j = 1; j + 1 < f.length; j++) [f[0], f[j], f[j + 1]].forEach(function (k) { out.push(v[k * 3], v[k * 3 + 1], v[k * 3 + 2]); });
      }
    }
    return new Float32Array(out);
  }
  function fcZip(buf) { // central directory of a .zip (a 3MF is a zip) → [{ name, method, csize, lho }]
    var dv = new DataView(buf), u8 = new Uint8Array(buf), e = -1, i, list = [];
    for (i = buf.byteLength - 22; i >= Math.max(0, buf.byteLength - 65557); i--) if (dv.getUint32(i, true) === 0x06054b50) { e = i; break; }
    if (e < 0) throw new Error('zip');
    var cnt = dv.getUint16(e + 10, true), off = dv.getUint32(e + 16, true);
    for (i = 0; i < cnt; i++) {
      if (off + 46 > buf.byteLength || dv.getUint32(off, true) !== 0x02014b50) throw new Error('zip');
      var nlen = dv.getUint16(off + 28, true);
      list.push({ name: new TextDecoder().decode(u8.subarray(off + 46, off + 46 + nlen)), method: dv.getUint16(off + 10, true), csize: dv.getUint32(off + 20, true), lho: dv.getUint32(off + 42, true) });
      off += 46 + nlen + dv.getUint16(off + 30, true) + dv.getUint16(off + 32, true);
    }
    return list;
  }
  function fcUnzip(buf, ent) {
    if (ent.csize === 0xffffffff) return Promise.reject(new Error('zip64'));
    var dv = new DataView(buf), s = ent.lho + 30 + dv.getUint16(ent.lho + 26, true) + dv.getUint16(ent.lho + 28, true);
    var data = new Uint8Array(buf, s, ent.csize);
    if (ent.method === 0) return Promise.resolve(new TextDecoder().decode(data));
    if (ent.method !== 8 || typeof DecompressionStream === 'undefined') return Promise.reject(new Error('zip'));
    return new Response(new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).text();
  }
  function fcAttr(s, n) { var m = new RegExp('(?:^|\\s)' + n + '="([^"]*)"').exec(s); return m ? m[1] : ''; }
  function fcMat(s) { var a = String(s || '').trim().split(/\s+/).map(Number); return a.length === 12 && a.every(isFinite) ? a : [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0]; }
  function fcMul(a, b) { // affine 3×4 matrices in 3MF row-vector order: first a, then b
    var r = [], i, j;
    for (i = 0; i < 4; i++) for (j = 0; j < 3; j++) r.push(a[i * 3] * b[j] + a[i * 3 + 1] * b[3 + j] + a[i * 3 + 2] * b[6 + j] + (i === 3 ? b[9 + j] : 0));
    return r;
  }
  function fcModel(xml) { // one .model file → { unit, objects: { id: { v, t, comps } }, items }
    var out = { unit: (/<model\b[^>]*\sunit="([^"]+)"/.exec(xml) || [])[1] || 'millimeter', objects: {}, items: [] }, m, re = /<object\b([^>]*)>([\s\S]*?)<\/object>/g;
    while ((m = re.exec(xml))) {
      var body = m[2], o = { v: [], t: [], comps: [] }, x, rv = /<vertex\b([^>]*)\/?>/g, rt = /<triangle\b([^>]*)\/?>/g, rc = /<component\b([^>]*)\/?>/g;
      while ((x = rv.exec(body))) o.v.push(+fcAttr(x[1], 'x'), +fcAttr(x[1], 'y'), +fcAttr(x[1], 'z'));
      while ((x = rt.exec(body))) o.t.push(+fcAttr(x[1], 'v1'), +fcAttr(x[1], 'v2'), +fcAttr(x[1], 'v3'));
      while ((x = rc.exec(body))) o.comps.push({ id: fcAttr(x[1], 'objectid'), path: fcAttr(x[1], 'p:path'), m: fcMat(fcAttr(x[1], 'transform')) });
      out.objects[fcAttr(m[1], 'id')] = o;
    }
    var ri = /<item\b([^>]*)\/?>/g;
    while ((m = ri.exec(xml))) out.items.push({ id: fcAttr(m[1], 'objectid'), path: fcAttr(m[1], 'p:path'), m: fcMat(fcAttr(m[1], 'transform')) });
    return out;
  }
  function fc3MF(buf) {
    var ents = fcZip(buf).filter(function (e) { return /\.model$/i.test(e.name); });
    if (!ents.length) return Promise.reject(new Error('3mf'));
    return Promise.all(ents.map(function (e) { return fcUnzip(buf, e); })).then(function (txts) {
      var files = {}, main = '', out = [];
      ents.forEach(function (e, i) { var p = '/' + e.name.replace(/^\/+/, ''); files[p.toLowerCase()] = fcModel(txts[i]); if (/^\/3d\/3dmodel\.model$/i.test(p)) main = p.toLowerCase(); });
      main = main || ('/' + ents[0].name.replace(/^\/+/, '')).toLowerCase();
      var add = function (path, id, M, depth) {
        var f = files[(path || main).toLowerCase()], o = f && f.objects[id];
        if (!o || depth > 8) return;
        for (var i = 0; i + 2 < o.t.length; i += 3) for (var k = 0; k < 3; k++) {
          var vi = o.t[i + k] * 3, x = o.v[vi], y = o.v[vi + 1], z = o.v[vi + 2];
          out.push(x * M[0] + y * M[3] + z * M[6] + M[9], x * M[1] + y * M[4] + z * M[7] + M[10], x * M[2] + y * M[5] + z * M[8] + M[11]);
        }
        o.comps.forEach(function (c) { add(c.path || path, c.id, fcMul(c.m, M), depth + 1); });
      };
      var mf = files[main], items = mf.items.length ? mf.items : Object.keys(mf.objects).map(function (id) { return { id: id, path: '', m: fcMat('') }; });
      items.forEach(function (it) { add(it.path || main, it.id, it.m, 0); });
      return { pos: new Float32Array(out), objects: items.length, unit: mf.unit };
    });
  }
  function fcStats(pos) { // in file units: box, area, volume (only meaningful when closed), open edges (null = not checked)
    var n = Math.floor(pos.length / 9), mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity], i, k;
    for (i = 0; i < n * 9; i++) { k = i % 3; if (pos[i] < mn[k]) mn[k] = pos[i]; if (pos[i] > mx[k]) mx[k] = pos[i]; }
    var c = [(mn[0] + mx[0]) / 2, (mn[1] + mx[1]) / 2, (mn[2] + mx[2]) / 2], area = 0, vol = 0;
    for (i = 0; i < n; i++) {
      var o = i * 9, ax = pos[o] - c[0], ay = pos[o + 1] - c[1], az = pos[o + 2] - c[2], bx = pos[o + 3] - c[0], by = pos[o + 4] - c[1], bz = pos[o + 5] - c[2], cx = pos[o + 6] - c[0], cy = pos[o + 7] - c[1], cz = pos[o + 8] - c[2];
      var ux = bx - ax, uy = by - ay, uz = bz - az, wx = cx - ax, wy = cy - ay, wz = cz - az;
      var nx = uy * wz - uz * wy, ny = uz * wx - ux * wz, nz = ux * wy - uy * wx, a2 = Math.sqrt(nx * nx + ny * ny + nz * nz);
      if (isFinite(a2)) area += a2 / 2;
      var v6 = ax * (by * cz - bz * cy) - ay * (bx * cz - bz * cx) + az * (bx * cy - by * cx);
      if (isFinite(v6)) vol += v6 / 6;
    }
    var open = null;
    if (n && n <= 600000) { // edge check: every edge of a closed (watertight) mesh is shared by exactly two triangles
      var ids = new Map(), edges = new Map(), id = function (j) { var key = pos[j] + ',' + pos[j + 1] + ',' + pos[j + 2], v = ids.get(key); if (v === undefined) { v = ids.size; ids.set(key, v); } return v; };
      for (i = 0; i < n; i++) {
        var t = [id(i * 9), id(i * 9 + 3), id(i * 9 + 6)];
        for (k = 0; k < 3; k++) { var p = t[k], q = t[(k + 1) % 3], e = p < q ? p * 4194304 + q : q * 4194304 + p; edges.set(e, (edges.get(e) || 0) + 1); }
      }
      open = 0; edges.forEach(function (cnt) { if (cnt !== 2) open++; });
    }
    var ok = n > 0 && mn.every(isFinite) && mx.every(isFinite);
    return { n: n, ok: ok, size: ok ? [mx[0] - mn[0], mx[1] - mn[1], mx[2] - mn[2]] : [0, 0, 0], mn: mn, area: area, vol: Math.abs(vol), open: open };
  }
  function fcRead(file) {
    var f = t().fc, ext = (/\.([a-z0-9]+)$/i.exec(file.name) || [])[1];
    ext = ext ? ext.toLowerCase() : '';
    state.fc.res = null; state.fc.err = ''; state.fc.cut = 100; // a new file starts uncut in the 3D preview
    if (ext === 'step' || ext === 'stp' || ext === 'iges' || ext === 'igs') { state.fc.err = f.errStep; fcRefresh(); return; }
    if (ext !== 'stl' && ext !== 'obj' && ext !== '3mf') { state.fc.err = f.errType; fcRefresh(); return; }
    if (file.size > FC_MAX) { state.fc.err = f.errBig; fcRefresh(); return; }
    state.fc.busy = true; fcRefresh();
    var name = file.name;
    (file.arrayBuffer ? file.arrayBuffer() : new Response(file).arrayBuffer()).then(function (buf) {
      if (ext === '3mf') return fc3MF(buf);
      return { pos: ext === 'stl' ? fcSTL(buf) : fcOBJ(buf), objects: 1, unit: '' };
    }).then(function (r) {
      var st = fcStats(r.pos);
      state.fc.busy = false;
      if (!st.ok) { state.fc.err = f.errEmpty; fcRefresh(); return; }
      var unitSet = r.unit && FC_3MF_UNITS[r.unit] ? r.unit : '';
      state.fc.unit = unitSet ? 'mm' : state.fc.unit;
      state.fc.res = { name: name, fmt: ext.toUpperCase(), pos: r.pos, objects: r.objects, unitSet: unitSet, k3mf: unitSet ? FC_3MF_UNITS[unitSet] : 1, st: st };
      fcRefresh(true);
    }).catch(function () { state.fc.busy = false; state.fc.err = f.errRead; fcRefresh(); });
  }
  function fcK() { var r = state.fc.res; return r && r.unitSet ? r.k3mf : FC_UNITS[state.fc.unit] || 1; } // file units → mm
  function fcR1(n) { return Math.round(n * 10) / 10; }
  function fcNum(n, d) { // d: decimals; default 1, more for small values (0.008 cm³ instead of 0)
    if (d == null) d = n >= 1 || n === 0 ? 1 : Math.min(4, 2 - Math.floor(Math.log10(n)));
    try { return n.toLocaleString(lang === 'sl' ? 'sl-SI' : 'en-GB', { maximumFractionDigits: d }); } catch (e) { return String(n); } }
  function fcSize() { var r = state.fc.res, k = fcK(); return r ? r.st.size.map(function (v) { return fcR1(v * k); }) : null; }
  function fcSummary() { // one line for the brief / clipboard
    var r = state.fc.res, f = t().fc, s = fcSize(); if (!r) return '';
    var st = r.st, k = fcK(), parts = [r.name + ' (' + r.fmt + ')', fitDims(s) + ' mm', f.tris.replace('{n}', fcNum(st.n, 0))];
    if (st.open === 0) parts.push(f.sumClosed + ', ' + fcNum(st.vol * k * k * k / 1000) + ' cm³');
    else if (st.open > 0) parts.push(f.sumOpen);
    var fr = fitCalc({ l: s[0], w: s[1], h: s[2] });
    if (fr) parts.push('X2D: ' + (fr.fits ? f.fitY : f.fitN));
    return f.brief + ': ' + parts.join(' · ');
  }
  function fcResult() {
    var fs = state.fc, f = t().fc;
    if (fs.busy) return '<p class="hint">' + esc(f.busy) + '</p>';
    if (fs.err) return '<p class="fc-err"><span class="nk-tag nk-tag--rev">' + esc(f.errTag) + '</span> ' + esc(fs.err) + '</p>';
    if (!fs.res) return '<p class="hint">' + esc(f.empty) + '</p>';
    var r = fs.res, st = r.st, k = fcK(), s = fcSize(), fr = fitCalc({ l: s[0], w: s[1], h: s[2] }), big = Math.max(s[0], s[1], s[2]);
    var rows = [[f.file, r.name + ' · ' + r.fmt + (r.objects > 1 ? ' · ' + f.objects.replace('{n}', r.objects) : '')], [f.size, fitDims(s) + ' mm'], [f.trisL, fcNum(st.n, 0)],
      [f.area, fcNum(st.area * k * k / 100) + ' cm²'],
      [f.closed, st.open === null ? f.closedSkip : st.open === 0 ? f.closedY : f.closedN + ' · ' + f.openEdges.replace('{n}', fcNum(st.open, 0))],
      [f.vol, st.open === 0 ? fcNum(st.vol * k * k * k / 1000) + ' cm³' : f.volNone]];
    var unit = r.unitSet ? '<p class="fc-unit nk-label">' + esc(f.unitFile.replace('{u}', f.units3[r.unitSet] || r.unitSet)) + '</p>' :
      '<div class="nk-field fc-unit"><label class="nk-field__label" for="fc-unit">' + esc(f.unit) + '</label><select class="nk-input" id="fc-unit" data-fc-unit>' +
      Object.keys(FC_UNITS).map(function (u) { return '<option value="' + u + '"' + (fs.unit === u ? ' selected' : '') + '>' + esc(f.units[u]) + '</option>'; }).join('') + '</select></div>';
    return '<dl class="fc-dl">' + rows.map(function (x) { return '<div><dt>' + esc(x[0]) + '</dt><dd>' + esc(x[1]) + '</dd></div>'; }).join('') + '</dl>' + unit +
      (big < 3 || big > 3000 ? '<p class="fc-warn">' + esc(f.odd) + '</p>' : '') +
      (fr ? '<div class="fc-fit">' + fitResult(fr) + '</div>' : '') +
      (st.open > 0 ? '<p class="fit-note">' + esc(f.openNote) + '</p>' : '') +
      '<div class="cta-row"><button type="button" class="nk-btn nk-btn--primary" data-fc-go>' + esc(f.go) + '<span class="nk-btn__arrow" aria-hidden="true">→</span></button>' +
      '<button type="button" class="nk-btn" data-fc-fit>' + esc(f.toFit) + '</button>' +
      '<button type="button" class="nk-btn nk-btn--ghost" data-fc-copy>' + esc(f.copy) + '</button><button type="button" class="nk-btn nk-btn--ghost" data-fc-clear>' + esc(f.clear) + '</button></div>' +
      '<p class="fc-msg" id="fc-msg" role="status" aria-live="polite"></p>';
  }
  function fcViews() {
    var r = state.fc.res, f = t().fc, s = fcSize();
    var v = function (id, label, a, b) { return '<figure class="fc-view"><canvas id="fc-' + id + '" width="300" height="225" aria-hidden="true"></canvas><figcaption class="nk-label">' + esc(label) + (s ? ' · ' + fitFmt(s[a]) + ' × ' + fitFmt(s[b]) + ' mm' : '') + '</figcaption></figure>'; };
    if (!r) return '<div class="fc-blank"><svg viewBox="0 0 120 90" aria-hidden="true" focusable="false"><path class="hid" d="M30 70 L30 30 L60 15 L90 30 L90 70 L60 85 Z M30 30 L60 45 L90 30 M60 45 V85"/></svg><p class="nk-label">' + esc(f.views) + '</p></div>';
    return v('top', f.top + ' · X × Y', 0, 1) + v('front', f.front + ' · X × Z', 0, 2) + v('side', f.side + ' · Y × Z', 1, 2) + fc3dBox();
  }
  // 3D preview on the X2D plate (2026-10-29): the triangles already read for the three views go into the site's own
  // 3D viewer (three.js, loaded on demand) with the X2D build volume drawn as a dashed box. Still nothing is uploaded.
  var fc3d = null, fc3dTok = 0;
  function fc3dOver() { // bed dimensions the part exceeds in the file's own orientation, e.g. "X 300 > 256"
    var s = fcSize(); if (!s) return [];
    return ['X', 'Y', 'Z'].map(function (a, i) { return s[i] > BED[i] ? a + ' ' + fitFmt(s[i]) + ' > ' + BED[i] : ''; }).filter(Boolean);
  }
  function fc3dBox() {
    var f = t().fc, fs = state.fc, over = fc3dOver();
    return '<div class="fc-3d' + (fs.v3d ? ' is-open' : '') + '"><div class="cta-row fc-3d__act"><button type="button" class="nk-btn nk-btn--sm" data-fc-3d aria-pressed="' + !!fs.v3d + '" aria-controls="fc-3d"><span aria-hidden="true">⬡ </span>' + esc(fs.v3d ? f.v3dHide : f.v3d) + '</button></div>' +
      (fs.v3d ? '<div class="nk-viewer fc-3d__view" id="fc-3d" role="img" aria-label="' + esc(f.v3dLabel + ': ' + fs.res.name) + '"><div class="nk-viewer__msg" id="fc-3d-msg">' + esc(t().loading3d) + '</div></div>' + v3Bar('fc') +
        '<p class="fc-3d__fit">' + (over.length ? '<span class="nk-tag nk-tag--rev">' + esc(f.v3dNo.replace('{d}', over.join(', '))) + '</span>' : '<span class="nk-tag nk-tag--ok">' + esc(f.v3dFit) + '</span>') + '</p><p class="fit-note">' + esc(f.v3dHint) + '</p>' : '') + '</div>';
  }
  function fc3dDispose() { fc3dTok++; if (fc3d) { fc3d.dispose(); fc3d = null; } }
  function fc3dMount() {
    fc3dDispose();
    var el = document.getElementById('fc-3d'), r = state.fc.res; if (!el || !r || !state.fc.v3d) return;
    var tok = fc3dTok, go = function () {
      if (tok !== fc3dTok || !document.body.contains(el)) return;
      window.NKViewer.mount(el, { positions: r.pos, scale: fcK(), bed: BED, still: true }).then(function (v) {
        if (tok !== fc3dTok || !document.body.contains(el)) { v.dispose(); return; }
        fc3d = v; var m = document.getElementById('fc-3d-msg'); if (m) m.remove(); v3Sync('fc');
      }, function () { var m = document.getElementById('fc-3d-msg'); if (m) m.textContent = t().viewerFail; });
    };
    if (window.NKViewer) go(); else { window.addEventListener('nkviewer:ready', go, { once: true }); if (window.NKViewerLoad) window.NKViewerLoad(); }
  }
  function fc3dToggle() {
    state.fc.v3d = !state.fc.v3d; if (state.fc.v3d && state.fc.view == null) { state.fc.view = 'iso'; state.fc.cut = 100; }
    fcRefresh();
    var b = document.querySelector('[data-fc-3d]'); if (b) b.focus({ preventScroll: true });
  }
  function fcBox() {
    var f = t().fc, fs = state.fc;
    return '<section class="block fc" id="file-check">' + head(f.label, f.title, f.lead) + '<div class="fc-grid"><div class="fc-form">' +
      '<label class="fc-drop" id="fc-drop" for="fc-file"><span class="fc-drop__t">' + esc(f.pick) + '</span><span class="fc-drop__h">' + esc(f.pickHint) + '</span>' +
      '<input class="fc-file" id="fc-file" type="file" accept=".stl,.3mf,.obj,model/stl,model/3mf" data-fc-file' + (fs.busy ? ' disabled' : '') + '></label>' +
      '<p class="fit-note fc-private">' + esc(f.private) + '</p>' +
      '<div class="fc-out" id="fc-out" role="status" aria-live="polite">' + fcResult() + '</div></div>' +
      '<div class="fc-fig nk-sheet__art" id="fc-views">' + fcViews() + '</div></div></section>';
  }
  function fcRefresh(focus) {
    var o = document.getElementById('fc-out'), v = document.getElementById('fc-views'), i = document.getElementById('fc-file');
    if (o) o.innerHTML = fcResult();
    if (v) v.innerHTML = fcViews();
    if (i) i.disabled = !!state.fc.busy;
    fcDraw(); fc3dMount();
    if (focus) { var b = o && o.querySelector('[data-fc-go]'); if (b) b.focus({ preventScroll: true }); }
  }
  // The three views: every triangle projected and rasterised into a pixel mask (own scanline fill — a canvas path with
  // hundreds of thousands of triangles is far too slow on phones), then drawn as a silhouette with an ink outline.
  function fcRgb(g, c) { g.fillStyle = '#000'; g.fillStyle = c; var h = /^#([0-9a-f]{6})$/i.exec(g.fillStyle); var v = h ? parseInt(h[1], 16) : 0; return [v >> 16 & 255, v >> 8 & 255, v & 255]; }
  function fcMask(pos, n, a, b, mn, s, ox, oy, PW, PH) {
    var m = new Uint8Array(PW * PH), step = Math.max(1, Math.ceil(n / 3000000));
    var dot = function (x, y) { x = x | 0; y = y | 0; if (x >= 0 && y >= 0 && x < PW && y < PH) m[y * PW + x] = 1; };
    for (var i = 0; i < n; i += step) {
      var o = i * 9, x0 = ox + (pos[o + a] - mn[a]) * s, y0 = oy - (pos[o + b] - mn[b]) * s, x1 = ox + (pos[o + 3 + a] - mn[a]) * s, y1 = oy - (pos[o + 3 + b] - mn[b]) * s, x2 = ox + (pos[o + 6 + a] - mn[a]) * s, y2 = oy - (pos[o + 6 + b] - mn[b]) * s;
      if (!(x0 === x0 && x1 === x1 && x2 === x2 && y0 === y0 && y1 === y1 && y2 === y2)) continue;
      var lx = Math.max(0, Math.floor(Math.min(x0, x1, x2))), hx = Math.min(PW - 1, Math.floor(Math.max(x0, x1, x2))), ly = Math.max(0, Math.floor(Math.min(y0, y1, y2))), hy = Math.min(PH - 1, Math.floor(Math.max(y0, y1, y2)));
      dot(x0, y0); dot(x1, y1); dot(x2, y2);
      if (hx - lx < 1 && hy - ly < 1) continue;
      var ar = (x1 - x0) * (y2 - y0) - (y1 - y0) * (x2 - x0); if (!ar) continue;
      var sg = ar > 0 ? 1 : -1;
      for (var y = ly; y <= hy; y++) for (var x = lx; x <= hx; x++) {
        var px = x + 0.5, py = y + 0.5;
        if (sg * ((x1 - x0) * (py - y0) - (y1 - y0) * (px - x0)) >= 0 && sg * ((x2 - x1) * (py - y1) - (y2 - y1) * (px - x1)) >= 0 && sg * ((x0 - x2) * (py - y2) - (y0 - y2) * (px - x2)) >= 0) m[y * PW + x] = 1;
      }
    }
    return m;
  }
  function fcDraw() {
    var r = state.fc.res; if (!r || !document.getElementById('fc-top')) return;
    var cs = getComputedStyle(document.documentElement), pos = r.pos, n = r.st.n, mn = r.st.mn, sz = r.st.size;
    [['top', 0, 1], ['front', 0, 2], ['side', 1, 2]].forEach(function (vw) {
      var cv = document.getElementById('fc-' + vw[0]); if (!cv || !cv.getContext) return;
      var dpr = Math.min(window.devicePixelRatio || 1, 2), W = Math.max(200, cv.clientWidth || 300), H = Math.round(W * 0.75), PW = Math.round(W * dpr), PH = Math.round(H * dpr);
      cv.width = PW; cv.height = PH;
      var g = cv.getContext('2d'); g.clearRect(0, 0, PW, PH);
      var a = vw[1], b = vw[2], pad = 18 * dpr, sa = sz[a] || 1e-9, sb = sz[b] || 1e-9, s = Math.min((PW - 2 * pad) / sa, (PH - 2 * pad) / sb);
      var ox = (PW - sa * s) / 2, oy = (PH + sb * s) / 2, m = fcMask(pos, n, a, b, mn, s, ox, oy, PW, PH);
      var ink = fcRgb(g, cs.getPropertyValue('--ink').trim() || '#1a1c1e'), mid = fcRgb(g, cs.getPropertyValue('--ink-muted').trim() || '#53585e');
      var img = g.createImageData(PW, PH), d = img.data;
      for (var y = 0; y < PH; y++) for (var x = 0; x < PW; x++) {
        var k = y * PW + x; if (!m[k]) continue;
        var edge = x === 0 || y === 0 || x === PW - 1 || y === PH - 1 || !m[k - 1] || !m[k + 1] || !m[k - PW] || !m[k + PW], c = edge ? ink : mid;
        d[k * 4] = c[0]; d[k * 4 + 1] = c[1]; d[k * 4 + 2] = c[2]; d[k * 4 + 3] = edge ? 255 : 120;
      }
      g.putImageData(img, 0, 0);
      g.strokeStyle = cs.getPropertyValue('--redline').trim() || '#b52b16'; g.lineWidth = dpr; g.setLineDash([4 * dpr, 3 * dpr]);
      g.strokeRect(Math.round(ox) - 0.5 * dpr, Math.round(oy - sb * s) - 0.5 * dpr, Math.round(sa * s) + dpr, Math.round(sb * s) + dpr);
    });
  }
  function fcToOrder() {
    var o = state.order, line = fcSummary(), s = fcSize();
    if (!line) return;
    if (o.what.indexOf(line) < 0) o.what = o.what ? o.what + '\n' + line : line;
    if (+o.files < 2) o.files = 2; // "STL / STEP / 3MF"
    var fr = s && fitCalc({ l: s[0], w: s[1], h: s[2] });
    if (fr && o.services.indexOf('print') < 0) o.services.push('print');
    state.step = 0; state.errors = {}; state.send = 'idle';
    location.hash = 'order';
  }
  function fcToFit() {
    var s = fcSize(); if (!s) return;
    state.fit = { l: String(s[0]), w: String(s[1]), h: String(s[2]) };
    ['l', 'w', 'h'].forEach(function (k, i) { var el = document.getElementById('fit-' + k); if (el) el.value = s[i]; });
    fitUpdate();
    var fb = document.querySelector('.block.fit'); if (fb) fb.scrollIntoView({ block: 'start' });
    var fl = document.getElementById('fit-l'); if (fl) fl.focus({ preventScroll: true });
  }
  function fcCopy() {
    var msg = document.getElementById('fc-msg'), txt = fcSummary();
    var done = function (ok) { if (msg) msg.textContent = ok ? t().copied : t().copyFail; };
    try { navigator.clipboard.writeText(txt).then(function () { done(true); }, function () { done(false); }); } catch (e) { done(false); }
  }
  function fcClear() { state.fc = { busy: false, err: '', res: null, unit: state.fc.unit }; var i = document.getElementById('fc-file'); if (i) { i.value = ''; } fcRefresh(); if (i) i.focus(); }

  // ---------- Project planner (#services): three questions → services, usual turnaround, fit, deadline, brief → #order ----------
  // Uses only what is already on the site: SERVICES (titles, turnarounds, needs), the X2D build volume (BED), the order
  // form's file/material options and the project sheets. Nothing is stored or sent.
  // Self-contained: remove PL_HAVE … plToOrder(), the plBox() call in views.services, the plOpen() call in orderView(),
  // the data-pl-* lines in the click/change/input handlers, the plFocus line in render(), pl: in both languages in
  // content.js and the "Project planner" rules at the end of page.css. (fitCalc(src) keeps working without it.)
  var PL_HAVE = ['idea', 'sketch', 'mesh', 'cad'], PL_KIND = ['part', 'smart', 'fw', 'product'], PL_BACK = ['files', 'parts', 'unsure'];
  var PL_FILES = { idea: 0, sketch: 1, mesh: 2, cad: 3 }; // index into fFilesO in the order form
  var PL_CATS = { part: ['Mechanical', 'CAD'], smart: ['IoT', 'Embedded'], fw: ['Embedded', 'IoT'], product: ['IoT', 'Mechanical', 'Embedded'] };
  state.pl = { have: '', kind: '', back: '', l: '', w: '', h: '', qty: '1', mat: 0, deadline: '' };
  function plDone() { var s = state.pl; return (s.have ? 1 : 0) + (s.kind ? 1 : 0) + (s.back ? 1 : 0); }
  function plPlan() { // [{ s: SERVICE, why: text key }] in SERVICES order
    var s = state.pl, out = {};
    if (plDone() < 3) return [];
    if (s.kind === 'product') out.build = 'build';
    else {
      if (s.kind !== 'fw' && (s.have === 'idea' || s.have === 'sketch')) out.cad = 'cad';
      if ((s.kind === 'part' || s.kind === 'smart') && s.back !== 'files') out.print = 'print';
      if (s.kind === 'smart' || s.kind === 'fw') out.iot = 'iot';
      if (!out.cad && !out.print && !out.iot) out.cad = 'cadEdit';
    }
    return SERVICES.filter(function (v) { return out[v.key]; }).map(function (v) { return { s: v, why: out[v.key] }; });
  }
  function plPrints() { return plPlan().some(function (r) { return r.s.key === 'print' || r.s.key === 'build'; }); }
  function plRadios(q, keys, labels) {
    return '<fieldset class="pl-q"><legend class="nk-label">' + esc(t().pl[q]) + '</legend><div class="pl-opts">' + keys.map(function (k) {
      return '<label class="pl-opt"><input type="radio" name="pl-' + q + '" value="' + k + '" data-pl-q="' + q + '"' + (state.pl[{ q1: 'have', q2: 'kind', q3: 'back' }[q]] === k ? ' checked' : '') + '><span>' + esc(labels[k]) + '</span></label>';
    }).join('') + '</div></fieldset>';
  }
  function plN(f, n) { // "{n} items" — SL needs 1 / 2 / 3–4 / 5+ forms
    if (!Array.isArray(f)) return f.replace('{n}', n);
    var m = n % 100; return f[m === 1 ? 0 : m === 2 ? 1 : m === 3 || m === 4 ? 2 : 3].replace('{n}', n);
  }
  function plNeeds(plan) {
    var seen = {}; plan.forEach(function (r) { r.s.need.en.forEach(function (n) { seen[n] = 1; }); }); return Object.keys(seen).length;
  }
  function plRefs() {
    var cats = PL_CATS[state.pl.kind] || [], list = [];
    cats.forEach(function (c) { PROJECTS.forEach(function (p) { if (p.category === c && list.indexOf(p) < 0) list.push(p); }); });
    list.sort(function (a, b) { return (b.featured ? 1 : 0) - (a.featured ? 1 : 0) || cats.indexOf(a.category) - cats.indexOf(b.category); });
    return list.slice(0, 3);
  }
  function plDue(plan) { // verdict for the whole plan: the longest published range against the deadline
    var x = t().dl, d = dlDays(state.pl.deadline); if (d == null) return '';
    if (d <= 0) return '<span class="nk-tag nk-tag--rev">' + esc(x.pastTag) + '</span>';
    var r = plan.map(function (p) { return dlRange(p.s); }).filter(Boolean); if (!r.length) return '<span class="nk-tag">' + esc(x.none) + '</span>';
    var lo = Math.max.apply(null, r.map(function (v) { return v[0]; })), hi = Math.max.apply(null, r.map(function (v) { return v[1]; }));
    var v = d < lo ? ['rev', x.short] : d < hi ? ['', x.tight] : ['ok', x.ok];
    return '<span class="nk-tag' + (v[0] ? ' nk-tag--' + v[0] : '') + '">' + esc(v[1]) + '</span> ' + esc(d === 1 ? x.day : x.days.replace('{n}', d));
  }
  function plOut() {
    var f = t().pl, x = t(), plan = plPlan(), n = plDone();
    if (!plan.length) return '<p class="nk-label pl-step">' + esc(f.step.replace('{n}', n)) + '</p><p class="hint">' + esc(f.empty) + '</p>';
    var rows = plan.map(function (r) {
      return '<li><span class="nk-service__code">' + esc(r.s.code) + '</span><span class="pl-svc"><b>' + esc(L(r.s.title)) + '</b><span class="pl-why">' + esc(f.why[r.why]) + '</span></span><span class="nk-label pl-time">' + esc(r.s.time ? L(r.s.time) : x.onRequest) + '</span></li>';
    }).join('');
    var spec = [[f.files, x.fFilesO[PL_FILES[state.pl.have]]]];
    if (plPrints()) {
      var fr = fitCalc(state.pl);
      spec.push([f.fit, fr ? (fr.fits ? t().fit.ok : t().fit.no) + ' · ' + fitDims(fr.d) + ' mm' : f.fitNone]);
      spec.push([x.fMat, x.fMatO[+state.pl.mat || 0]]);
    }
    if (+state.pl.qty > 1) spec.push([f.qty, String(+state.pl.qty)]);
    var due = plDue(plan), refs = plRefs(), needs = plNeeds(plan);
    return '<ol class="pl-rows">' + rows + '</ol>' + specs(spec) +
      (due ? '<p class="pl-due"><span class="nk-label">' + esc(f.due) + '</span> ' + due + '</p>' : '') +
      '<p class="pl-prep"><span class="nk-label">' + esc(f.prep) + '</span> ' + esc(plN(f.prepN, needs)) + ' · <button type="button" class="pl-link" data-pl-prep>' + esc(f.prepGo) + ' ↓</button></p>' +
      (refs.length ? '<div class="pl-refs"><p class="nk-label">' + esc(f.refs) + '</p><ul>' + refs.map(function (p) { return '<li><a href="#p-' + esc(p.slug) + '"><span class="nk-label">' + sheetNo(p) + '</span> ' + esc(P(p, 'title')) + '</a></li>'; }).join('') + '</ul></div>' : '') +
      '<div class="cta-row"><button type="button" class="nk-btn nk-btn--primary" data-pl-go>' + esc(f.go) + '<span class="nk-btn__arrow" aria-hidden="true">→</span></button>' +
      '<button type="button" class="nk-btn" data-pl-copy>' + esc(f.copy) + '</button></div><p class="share-msg" id="pl-msg" role="status" aria-live="polite"></p>';
  }
  function plBox() {
    var f = t().pl, x = t(), s = state.pl;
    var num = function (k, label, attrs) { return '<div class="nk-field"><label class="nk-field__label" for="pl-' + k + '">' + esc(label) + '</label><input class="nk-input" id="pl-' + k + '" data-pl-f="' + k + '" ' + attrs + ' value="' + esc(s[k]) + '"></div>'; };
    return '<section class="block pl" id="plan">' + head(f.label, f.title, f.lead) + '<div class="pl-grid"><form class="pl-form" novalidate>' +
      plRadios('q1', PL_HAVE, f.have) + plRadios('q2', PL_KIND, f.kind) + plRadios('q3', PL_BACK, f.back) +
      '<details class="pl-more"' + (s.l || s.w || s.h || s.deadline || +s.qty > 1 || +s.mat ? ' open' : '') + '><summary class="nk-label">' + esc(f.opt) + '</summary><div class="pl-more-in">' +
      '<div class="pl-size"><p class="nk-field__label" id="pl-size-l">' + esc(f.size) + ' · mm</p><div class="fit-inputs" role="group" aria-labelledby="pl-size-l">' +
      num('l', t().fit.l, 'type="number" inputmode="decimal" min="0" step="any"') + num('w', t().fit.w, 'type="number" inputmode="decimal" min="0" step="any"') + num('h', t().fit.h, 'type="number" inputmode="decimal" min="0" step="any"') + '</div></div>' +
      '<div class="pl-pair">' + num('qty', f.qty, 'type="number" min="1" step="1"') + num('deadline', f.deadline, 'type="date" min="' + dlMin() + '"') + '</div>' +
      '<div class="nk-field"><label class="nk-field__label" for="pl-mat">' + esc(x.fMat) + '</label><select class="nk-input" id="pl-mat" data-pl-f="mat">' + x.fMatO.map(function (o, i) { return '<option value="' + i + '"' + (+s.mat === i ? ' selected' : '') + '>' + esc(o) + '</option>'; }).join('') + '</select></div>' +
      '</div></details>' + (plDone() ? '<button type="button" class="pl-link pl-reset" data-pl-reset>' + esc(f.reset) + '</button>' : '') + '</form>' +
      '<div class="pl-sheet"><div class="pl-head"><span class="nk-label">' + esc(f.plan) + '</span><span class="nk-label">NK-P</span></div><div class="pl-out" id="pl-out" aria-live="polite">' + plOut() + '</div>' +
      '<p class="fit-note">' + esc(f.note) + '</p></div></div></section>';
  }
  function plUpdate() { var o = document.getElementById('pl-out'); if (o) o.innerHTML = plOut(); }
  function plRefresh(focusSel) {
    var box = document.getElementById('plan'); if (!box) return;
    var open = box.querySelector('.pl-more') && box.querySelector('.pl-more').open;
    box.outerHTML = plBox();
    var nb = document.getElementById('plan'); if (open) nb.querySelector('.pl-more').open = true;
    var el = focusSel && nb.querySelector(focusSel); if (el) el.focus();
  }
  function plText() {
    var f = t().pl, x = t(), s = state.pl, plan = plPlan();
    var out = [f.plan.toUpperCase() + ' — nacekepa.work', f.q1 + ' ' + f.have[s.have], f.q2 + ' ' + f.kind[s.kind], f.q3 + ' ' + f.back[s.back], ''];
    plan.forEach(function (r) { out.push(r.s.code + ' ' + L(r.s.title) + ' — ' + (r.s.time ? L(r.s.time) : x.onRequest)); });
    var fr = fitCalc(s); if (fr) out.push(f.size + ': ' + fitDims(fr.d) + ' mm (' + (fr.fits ? t().fit.ok : t().fit.no) + ')');
    if (plPrints()) out.push(x.fMat + ': ' + x.fMatO[+s.mat || 0]);
    if (+s.qty > 1) out.push(f.qty + ': ' + (+s.qty));
    if (s.deadline) out.push(f.deadline + ': ' + s.deadline);
    return out.join('\n');
  }
  function plCopy() {
    var msg = document.getElementById('pl-msg'), f = t().pl;
    var fail = function () { msg.textContent = f.copyFail; var o = document.getElementById('pl-out'); if (o) { var r = document.createRange(); r.selectNodeContents(o); var g = getSelection(); g.removeAllRanges(); g.addRange(r); } };
    try { navigator.clipboard.writeText(plText()).then(function () { msg.textContent = f.copied; }, fail); } catch (e) { fail(); }
  }
  function plPrep() { // fill "What to prepare" below with the planned services and jump there
    state.prep.svc = plPlan().map(function (r) { return r.s.key; });
    prepRefresh(); var b = document.getElementById('prep'); if (b) { b.scrollIntoView({ block: 'start' }); var c = b.querySelector('[data-prep-svc]'); if (c) c.focus({ preventScroll: true }); }
  }
  function plToOrder() {
    var s = state.pl, o = state.order, f = t().pl, plan = plPlan(); if (!plan.length) return;
    plan.forEach(function (r) { if (o.services.indexOf(r.s.key) < 0) o.services.push(r.s.key); });
    o.files = PL_FILES[s.have];
    if (plPrints()) o.mat = +s.mat || 0;
    if (+s.qty >= 1) o.qty = String(Math.round(+s.qty));
    if (dlDays(s.deadline) > 0) o.deadline = s.deadline;
    var fr = fitCalc(s), line = f.brief + ': ' + f.kind[s.kind] + '; ' + f.have[s.have].charAt(0).toLowerCase() + f.have[s.have].slice(1) + '; ' + f.back[s.back].charAt(0).toLowerCase() + f.back[s.back].slice(1) + '.' + (fr ? ' ' + t().fit.brief + ': ' + fitDims(fr.d) + ' mm.' : '');
    if (o.what.indexOf(f.brief + ':') < 0) o.what = o.what ? line + '\n' + o.what : line;
    else o.what = o.what.split('\n').map(function (l) { return l.indexOf(f.brief + ':') === 0 ? line : l; }).join('\n');
    state.step = 1; state.errors = {}; state.send = 'idle';
    location.hash = 'order';
  }
  function plOpen() { return '<p class="pl-open"><a href="#services" data-pl-open>' + esc(t().pl.open) + ' →</a></p>'; }

  // ---------- Material picker (#services, section under the file check; 2026-10-23) ----------
  // The visitor ticks what the part has to cope with; the materials listed on #skills (PLA · PETG · TPU 95A · ABS · ASA ·
  // PA · PA-CF · PC) are ranked from general, qualitative properties (2 good ●, 1 workable ○, 0 not suited — no numbers) and
  // the chosen one goes to the order form's "Material" field. Self-contained: remove MP_NEEDS … mpOpen(), the mpBox() call
  // in views.services, the mpOpen() call in orderView(), the data-mp-* lines in the click and change handlers, the
  // mpFocus line in render(), mp: in both languages in content.js and the "Material picker" rules at the end of page.css.
  var MP_NEEDS = ['flex', 'out', 'heat', 'load', 'wear', 'impact', 'look'];
  var MP_MATS = [ // o = option index in fMatO (order form "Material"); ch = needs the X2D's heated chamber
    { id: 'pla', name: 'PLA', o: 1, ch: 0, v: { flex: 0, out: 0, heat: 0, load: 1, wear: 0, impact: 0, look: 2 } },
    { id: 'petg', name: 'PETG', o: 2, ch: 0, v: { flex: 0, out: 1, heat: 1, load: 1, wear: 1, impact: 2, look: 1 } },
    { id: 'tpu', name: 'TPU 95A', o: 3, ch: 0, v: { flex: 2, out: 1, heat: 1, load: 0, wear: 1, impact: 2, look: 0 } },
    { id: 'abs', name: 'ABS', o: 4, ch: 1, v: { flex: 0, out: 0, heat: 2, load: 1, wear: 1, impact: 2, look: 1 } },
    { id: 'asa', name: 'ASA', o: 4, ch: 1, v: { flex: 0, out: 2, heat: 2, load: 1, wear: 1, impact: 2, look: 1 } },
    { id: 'pa', name: 'PA', o: 5, ch: 1, v: { flex: 0, out: 1, heat: 2, load: 1, wear: 2, impact: 2, look: 0 } },
    { id: 'pacf', name: 'PA-CF', o: 5, ch: 1, v: { flex: 0, out: 1, heat: 2, load: 2, wear: 2, impact: 1, look: 1 } },
    { id: 'pc', name: 'PC', o: 6, ch: 1, v: { flex: 0, out: 1, heat: 2, load: 2, wear: 1, impact: 2, look: 1 } }
  ];
  state.mp = { needs: {}, pick: '' };
  function mpTicked() { return MP_NEEDS.filter(function (k) { return state.mp.needs[k]; }); }
  function mpRank() { // [{ m, ok, score }] — suitable materials first (highest score, then list order), the rest after
    var need = mpTicked();
    return MP_MATS.map(function (m, i) {
      var ok = need.every(function (k) { return m.v[k] > 0; }), score = need.reduce(function (a, k) { return a + m.v[k]; }, 0);
      return { m: m, ok: ok, score: score, i: i };
    }).sort(function (a, b) { return need.length ? (b.ok - a.ok) || (b.score - a.score) || (a.i - b.i) : a.i - b.i; });
  }
  function mpChosen() { // the picked material if it still suits, else the best match
    var r = mpRank(); if (!mpTicked().length || !r[0].ok) return null;
    var p = r.filter(function (x) { return x.ok && x.m.id === state.mp.pick; })[0];
    return (p || r[0]).m;
  }
  function mpMark(v) { var f = t().mp; return v === 2 ? ['●', f.good, 'g'] : v === 1 ? ['○', f.ok, 'o'] : ['✕', f.no, 'x']; }
  function mpOut() {
    var f = t().mp, need = mpTicked(), r = mpRank(), ch = mpChosen();
    var rows = r.map(function (x, n) {
      var m = x.m, best = need.length && x.ok && n === 0, on = ch && ch.id === m.id;
      var marks = need.map(function (k) { var mk = mpMark(m.v[k]); return '<li class="mp-mk mp-mk--' + mk[2] + '"><span aria-hidden="true">' + mk[0] + '</span> ' + esc(f.short[k]) + '<span class="vh">: ' + esc(mk[1]) + '</span></li>'; }).join('');
      var pick = need.length && x.ok ? '<input type="radio" name="mp-pick" value="' + m.id + '" data-mp-pick aria-label="' + esc(f.choose.replace('{m}', m.name)) + '"' + (on ? ' checked' : '') + '>' : '';
      return '<li class="mp-row' + (best ? ' is-best' : '') + (need.length && !x.ok ? ' is-out' : '') + (on ? ' is-on' : '') + '">' +
        '<label class="mp-name">' + pick + '<b>' + esc(m.name) + '</b>' + (best ? '<span class="nk-label mp-best">' + esc(f.best) + '</span>' : '') + '</label>' +
        '<p class="mp-note">' + esc(f.notes[m.id]) + (m.ch ? ' <span class="mp-ch">· ' + esc(f.chamber) + '</span>' : '') + '</p>' +
        (marks ? '<ul class="mp-marks">' + marks + '</ul>' : '') + '</li>';
    }).join('');
    var top = !need.length ? '<p class="mp-msg">' + esc(f.empty) + '</p>' : !ch ? '<p class="mp-msg mp-msg--none" role="note">' + esc(f.none) + '</p>' : '<p class="nk-label mp-legend">' + esc(f.legend) + '</p>';
    var act = ch ? '<div class="cta-row"><button type="button" class="nk-btn nk-btn--primary" data-mp-go>' + esc(f.go.replace('{m}', ch.name)) + '<span class="nk-btn__arrow" aria-hidden="true">→</span></button>' +
      '<button type="button" class="nk-btn" data-mp-copy>' + esc(f.copy) + '</button></div>' : '';
    return top + '<ol class="mp-list" id="mp-list">' + rows + '</ol>' + act + '<p class="share-msg" id="mp-msg" role="status" aria-live="polite"></p>';
  }
  function mpBox() {
    var f = t().mp;
    return '<section class="block mp" id="material">' + head(f.label, f.title, f.lead) + '<div class="mp-grid"><form class="mp-form" novalidate><fieldset class="pl-q"><legend class="nk-label">' + esc(f.q) + '</legend><div class="mp-opts">' +
      MP_NEEDS.map(function (k) { return '<label class="pl-opt"><input type="checkbox" value="' + k + '" data-mp-need' + (state.mp.needs[k] ? ' checked' : '') + '><span>' + esc(f.needs[k]) + '</span></label>'; }).join('') +
      '</div></fieldset>' + (mpTicked().length ? '<button type="button" class="pl-link pl-reset" data-mp-clear>' + esc(f.clear) + '</button>' : '') + '</form>' +
      '<div class="pl-sheet"><div class="pl-head"><span class="nk-label">' + esc(f.table) + '</span><span class="nk-label">NK-M</span></div><div class="pl-out mp-out" id="mp-out" aria-live="polite">' + mpOut() + '</div>' +
      '<p class="fit-note">' + esc(f.note) + '</p></div></div></section>';
  }
  function mpRefresh(focusSel) {
    var box = document.getElementById('material'); if (!box) return;
    box.outerHTML = mpBox();
    var el = focusSel && document.querySelector('#material ' + focusSel); if (el) el.focus({ preventScroll: true });
  }
  function mpLine() {
    var f = t().mp, ch = mpChosen(); if (!ch) return '';
    return f.brief + ': ' + f.needsL.toLowerCase() + ' — ' + mpTicked().map(function (k) { return f.short[k]; }).join(', ') + '; ' + f.chose + ' ' + ch.name + '.';
  }
  function mpText() {
    var f = t().mp, need = mpTicked(), ch = mpChosen();
    var out = [f.table.toUpperCase() + ' — nacekepa.work', f.needsL + ': ' + need.map(function (k) { return f.needs[k]; }).join('; '), ''];
    mpRank().forEach(function (x) { out.push((ch && ch.id === x.m.id ? '→ ' : '  ') + x.m.name + ' — ' + need.map(function (k) { return f.short[k] + ' ' + mpMark(x.m.v[k])[1]; }).join(', ')); });
    out.push('', f.note);
    return out.join('\n');
  }
  function mpCopy() {
    var msg = document.getElementById('mp-msg'), f = t().mp;
    var fail = function () { msg.textContent = f.copyFail; var o = document.getElementById('mp-list'); if (o) { var r = document.createRange(); r.selectNodeContents(o); var g = getSelection(); g.removeAllRanges(); g.addRange(r); } };
    try { navigator.clipboard.writeText(mpText()).then(function () { msg.textContent = f.copied; }, fail); } catch (e) { fail(); }
  }
  function mpToOrder() {
    var o = state.order, f = t().mp, ch = mpChosen(), line = mpLine(); if (!ch) return;
    o.mat = ch.o;
    if (o.services.indexOf('print') < 0) o.services.push('print');
    if (o.what.indexOf(f.brief + ':') < 0) o.what = o.what ? o.what + '\n' + line : line;
    else o.what = o.what.split('\n').map(function (l) { return l.indexOf(f.brief + ':') === 0 ? line : l; }).join('\n');
    state.step = 1; state.errors = {}; state.send = 'idle';
    location.hash = 'order';
  }
  function mpOpen() { return '<p class="pl-open mp-open"><a href="#services" data-mp-open>' + esc(t().mp.open) + ' →</a></p>'; }

  // ---------- What to prepare (#services): one checklist from the published SERVICES[].need lists ----------
  // Self-contained: remove prepItems()…prepToOrder(), the prepBox() call in views.services, the data-prep-* lines in the
  // click handler, the data-prep-have line in the change handler, T.*.prep in content.js and the "What to prepare"
  // rules at the end of page.css.
  state.prep = { svc: null, have: {} };
  function prepSvc() { if (!state.prep.svc) state.prep.svc = state.order.services.slice(); return state.prep.svc; }
  function prepItems() { // unique items (by EN text) in service order, each with the codes of the services that need it
    var out = [], idx = {}, on = prepSvc();
    SERVICES.forEach(function (s) {
      if (on.indexOf(s.key) < 0) return;
      s.need.en.forEach(function (en, i) {
        if (idx[en] == null) { idx[en] = out.length; out.push({ id: en, text: { en: en, sl: s.need.sl[i] }, codes: [] }); }
        out[idx[en]].codes.push(s.code);
      });
    });
    return out;
  }
  function prepStatus(items) {
    var f = t().prep, n = items.filter(function (it) { return state.prep.have[it.id]; }).length;
    if (!items.length) return f.none;
    return f.count.replace('{n}', n).replace('{t}', items.length) + (n === items.length ? ' · ' + f.all : '');
  }
  function prepList(items) {
    if (!items.length) return '';
    return '<ul class="prep-list">' + items.map(function (it, i) {
      return '<li><label class="prep-item"><input type="checkbox" data-prep-have="' + i + '"' + (state.prep.have[it.id] ? ' checked' : '') + '>' +
        '<span class="prep-t">' + esc(L(it.text)) + '</span><span class="nk-label prep-c">' + esc(it.codes.join(' · ')) + '</span></label></li>';
    }).join('') + '</ul>';
  }
  function prepBox() {
    var f = t().prep, on = prepSvc(), items = prepItems();
    return '<section class="block prep" id="prep">' + head(f.label, f.title, f.lead) + '<div class="prep-sheet">' +
      '<div class="filters prep-svc" role="group" aria-label="' + esc(f.pick) + '">' + SERVICES.map(function (s) {
        return '<button type="button" class="chip" data-prep-svc="' + s.key + '" aria-pressed="' + (on.indexOf(s.key) >= 0) + '">' + esc(L(s.title)) + ' <span>' + esc(s.code) + '</span></button>';
      }).join('') + '</div>' +
      '<div id="prep-list">' + prepList(items) + '</div>' +
      '<p class="nk-label prep-out" id="prep-out" role="status" aria-live="polite">' + esc(prepStatus(items)) + '</p>' +
      '<div class="cta-row"><button type="button" class="nk-btn nk-btn--primary" data-prep-go' + (items.length ? '' : ' disabled') + '>' + esc(f.go) + '<span class="nk-btn__arrow" aria-hidden="true">→</span></button>' +
      '<button type="button" class="nk-btn" data-prep-copy' + (items.length ? '' : ' disabled') + '>' + esc(f.copy) + '</button></div>' +
      '<p class="share-msg" id="prep-msg" role="status" aria-live="polite"></p></div></section>';
  }
  function prepRefresh(focusKey) {
    var box = document.getElementById('prep'); if (!box) return;
    box.outerHTML = prepBox();
    if (focusKey) { var b = app.querySelector('[data-prep-svc="' + focusKey + '"]'); if (b) b.focus(); }
  }
  function prepText() {
    var f = t().prep;
    return f.head + '\n' + prepItems().map(function (it) { return (state.prep.have[it.id] ? '[x] ' : '[ ] ') + L(it.text) + ' (' + it.codes.join(', ') + ')'; }).join('\n');
  }
  function prepCopy() {
    var msg = document.getElementById('prep-msg'), f = t().prep;
    var fail = function () { msg.textContent = f.copyFail; var l = app.querySelector('.prep-list'); if (l) { var r = document.createRange(); r.selectNodeContents(l); var s = getSelection(); s.removeAllRanges(); s.addRange(r); } };
    try { navigator.clipboard.writeText(prepText()).then(function () { msg.textContent = f.copied; }, fail); } catch (e) { fail(); }
  }
  function prepToOrder() {
    var o = state.order;
    prepSvc().forEach(function (k) { if (o.services.indexOf(k) < 0) o.services.push(k); });
    state.step = 0; state.errors = {}; state.send = 'idle';
    location.hash = 'order';
  }

  // ---------- Saved draft (order form): the unfinished brief stays in this browser and is filled in on the next visit ----------
  // localStorage "nk-order-draft" (picked services, answers, contact details, checklist ticks, step) — nothing is sent
  // anywhere. Cleared once the brief is sent, with "Clear the form", or after DR_DAYS days.
  // Self-contained: remove DR_KEY … drClearAll(), the drLoad() call before the first render(true), the drSave() lines in
  // render() and the input/change handlers, the drBar() call in orderView(), the three data-dr-* lines in the click
  // handler, dr: in both languages in content.js and the "Saved draft" rules at the end of page.css.
  var DR_KEY = 'nk-order-draft', DR_DAYS = 30, dr = { at: 0, restored: false, ask: false, msg: '' };
  var DR_FIELDS = ['what', 'qty', 'deadline', 'name', 'email', 'note'];
  function drHas() { var o = state.order; return o.services.length > 0 || DR_FIELDS.some(function (k) { return k !== 'qty' && String(o[k] || '').trim(); }); }
  function drSave() {
    try {
      if (state.send === 'sent' || !drHas()) { if (dr.at) localStorage.removeItem(DR_KEY); dr.at = 0; return; }
      var o = state.order, d = { v: 1, at: Date.now(), step: Math.min(state.step, 2), services: o.services.slice(), files: +o.files || 0, mat: +o.mat || 0, have: state.prep.have };
      DR_FIELDS.forEach(function (k) { d[k] = String(o[k] || ''); });
      localStorage.setItem(DR_KEY, JSON.stringify(d)); dr.at = d.at;
    } catch (e) {}
    drShow();
  }
  function drLoad() {
    var d; try { d = JSON.parse(localStorage.getItem(DR_KEY) || 'null'); } catch (e) { return; }
    if (!d || d.v !== 1 || typeof d.at !== 'number') return;
    if (Date.now() - d.at > DR_DAYS * 864e5) { try { localStorage.removeItem(DR_KEY); } catch (e) {} return; }
    var o = state.order, keys = SERVICES.map(function (s) { return s.key; }), x = t();
    o.services = (Array.isArray(d.services) ? d.services : []).filter(function (k, i, a) { return keys.indexOf(k) >= 0 && a.indexOf(k) === i; });
    DR_FIELDS.forEach(function (k) { if (typeof d[k] === 'string') o[k] = d[k].slice(0, 5000); });
    if (!/^\d{1,6}$/.test(o.qty)) o.qty = '1';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(o.deadline)) o.deadline = '';
    o.files = d.files >= 0 && d.files < x.fFilesO.length ? d.files | 0 : 0;
    o.mat = d.mat >= 0 && d.mat < x.fMatO.length ? d.mat | 0 : 0;
    if (d.have && typeof d.have === 'object') Object.keys(d.have).forEach(function (k) { if (d.have[k] === true) state.prep.have[k] = true; });
    if (!drHas()) return;
    state.step = d.step === 1 || d.step === 2 ? d.step : 0;
    dr.at = d.at; dr.restored = true;
  }
  function drWhen() { try { return new Date(dr.at).toLocaleString(lang === 'sl' ? 'sl-SI' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }); } catch (e) { return ''; } }
  function drInner() {
    var f = t().dr;
    if (dr.msg) return '<p class="dr-txt" role="status">' + esc(dr.msg) + '</p>';
    var act = dr.ask
      ? '<span class="dr-ask">' + esc(f.ask) + '</span> <button type="button" class="nk-btn nk-btn--sm" data-dr-yes>' + esc(f.yes) + '</button> <button type="button" class="nk-btn nk-btn--sm" data-dr-keep>' + esc(f.keep) + '</button>'
      : '<button type="button" class="dr-clear" data-dr-clear>' + esc(f.clear) + '</button>';
    return '<p class="nk-label dr-l">' + esc(f.label) + '</p><p class="dr-txt">' + esc(dr.restored ? f.restored.replace('{d}', drWhen()) : f.saving) + '</p><div class="dr-act">' + act + '</div>';
  }
  // Returning visitor with an unfinished brief: every "Start a project" button says "Continue your brief" instead
  // (not on the order page itself, not after sending). Remove: this function and use x.cta again where ctaText() is called.
  function ctaText() { return dr.at && state.send !== 'sent' && page() !== 'order' ? t().dr.cont : t().cta; }
  function drMode() { return dr.msg ? 'msg' : dr.at ? 'on' : 'off'; }
  function drBar() { var m = drMode(); return '<div class="dr" id="dr" data-mode="' + m + '"' + (m === 'off' ? ' hidden' : '') + '>' + drInner() + '</div>'; }
  function drShow() { // only when the bar has to appear, disappear or leave the "Form cleared." message
    var el = document.getElementById('dr'), m = drMode(); if (!el || el.dataset.mode === m || (el.dataset.mode === 'msg' && m === 'off')) return;
    el.dataset.mode = m; el.innerHTML = drInner(); el.hidden = m === 'off';
  }
  function drClearAll() {
    try { localStorage.removeItem(DR_KEY); } catch (e) {}
    state.order = { website: '', services: [], what: '', qty: '1', deadline: '', files: 0, mat: 0, name: '', email: '', note: '' };
    state.prep.have = {}; state.prep.svc = null; state.step = 0; state.errors = {}; state.send = 'idle';
    dr.at = 0; dr.restored = false; dr.ask = false; dr.msg = t().dr.cleared;
    render(true); dr.msg = '';
    var c = document.querySelector('[data-svc]'); if (c) c.focus();
  }

  function orderView() {
    var x = t(), o = state.order, e = state.errors, st = state.step, body = '';
    var keyMap = { cad: 0, print: 1, iot: 2, build: 3 };
    if (st === 0) {
      body = '<h2 class="sub" id="wiz-h" tabindex="-1">' + esc(x.q1) + '</h2><p class="hint" id="q1-hint">' + esc(x.q1h) + '</p><div class="grid-2 choices" role="group" aria-labelledby="wiz-h" aria-describedby="q1-hint' + (e.services ? ' err-svc' : '') + '">' + SERVICES.map(function (s) {
        var on = o.services.indexOf(s.key) >= 0;
        return '<label class="nk-choice"><input type="checkbox" id="svc-' + s.key + '" data-svc="' + s.key + '"' + (on ? ' checked' : '') + '><span class="nk-choice__t">' + esc(L(s.title)) + '</span><span class="nk-choice__d">' + esc(L(s.body)) + '</span></label>';
      }).join('') + '</div>' + (e.services ? '<p class="err" id="err-svc" role="alert">' + esc(x.errService) + '</p>' : '') + plOpen();
    } else if (st === 1) {
      body = '<h2 class="sub" id="wiz-h" tabindex="-1">' + esc(x.q2) + '</h2><div class="form">' +
        field('what', x.fWhat, '<textarea class="nk-input" id="f-what" data-f="what" placeholder="' + esc(x.fWhatPh) + '">' + esc(o.what) + '</textarea>', e.what ? x.errWhat : x.fWhatH, e.what, true) +
        field('qty', x.fQty, '<input class="nk-input" id="f-qty" data-f="qty" type="number" inputmode="numeric" enterkeyhint="next" min="1" value="' + esc(o.qty) + '">') +
        field('deadline', x.fDeadline, '<input class="nk-input" id="f-deadline" data-f="deadline" type="date" min="' + dlMin() + '" value="' + esc(o.deadline) + '">') +
        field('files', x.fFiles, select('files', x.fFilesO, o.files)) +
        field('mat', x.fMat, select('mat', x.fMatO, o.mat)).replace(/<\/div>$/, mpOpen() + '</div>') + dlBox() + ocBox() + '</div>';
    } else if (st === 2) {
      body = '<h2 class="sub" id="wiz-h" tabindex="-1">' + esc(x.q3) + '</h2><div class="form">' +
        field('name', x.fName, '<input class="nk-input" id="f-name" data-f="name" autocomplete="name" enterkeyhint="next" value="' + esc(o.name) + '">', e.name ? x.errName : null, e.name) +
        field('email', x.fEmail, '<input class="nk-input" id="f-email" data-f="email" type="email" autocomplete="email" autocapitalize="off" spellcheck="false" enterkeyhint="next" value="' + esc(o.email) + '">', e.email ? x.errEmail : null, e.email) +
        '<div class="hp" aria-hidden="true"><label for="f-website">Website</label><input id="f-website" data-f="website" tabindex="-1" autocomplete="off"></div>' +
        ofTypoBox() + field('note', x.fNote, '<textarea class="nk-input" id="f-note" data-f="note">' + esc(o.note) + '</textarea>', x.fNoteH, false, true) + '</div>';
    } else {
      var brief = briefText();
      if (state.send === 'sent') {
        body = '<div class="sent" role="status"><span class="nk-tag nk-tag--ok">' + esc(x.sentTag) + '</span><h2 class="sub" id="wiz-h" tabindex="-1">' + esc(x.sentTitle) + '</h2><p class="hint">' + esc(x.sentBody) + '</p></div>' +
          ocNext() + '<pre class="brief" tabindex="0">' + esc(briefText()) + '</pre>' + bpBtn();
      } else {
      body = (state.send === 'sending' ? '<p class="nk-label" role="status">' + esc(x.sending) + '</p>' : '') + (state.send === 'error' || state.send === 'limited' ? '<p class="err" role="alert">' + esc(state.send === 'limited' ? x.sendLimited : x.sendFail) + '</p>' : '') +
        '<h2 class="sub" id="wiz-h" tabindex="-1">' + esc(x.briefTitle) + '</h2><p class="hint">' + esc(x.briefLead) + '</p>' +
        '<div class="brief-grid"><pre class="brief" id="brief" tabindex="0">' + esc(brief) + '</pre><div class="brief-side"><p class="nk-label">' + esc(x.estimate) + '</p>' + estimate() +
        '<div class="cta-row"><button type="button" class="nk-btn nk-btn--primary" id="copy">' + esc(x.copy) + '</button><span class="copy-msg" id="copy-msg" role="status"></span></div>' + bpBtn() +
        '<p class="nk-label">' + esc(x.sendVia) + '</p>' + (CONTACT_EMAIL ? '<p class="mail" id="mail">' + esc(CONTACT_EMAIL) + '</p><div class="cta-row"><button type="button" class="nk-btn nk-btn--sm" data-mail-copy>' + esc(x.mailCopy) + '</button><span class="copy-msg" id="mail-msg" role="status"></span></div>' : '') +
        '<a class="nk-btn nk-btn--sm" href="' + LINKEDIN + '" target="_blank" rel="noopener">' + esc(x.linkedin) + '<span class="vh"> (' + esc(t().newTab) + ')</span><span class="nk-btn__arrow" aria-hidden="true">↗</span></a></div></div>';
      }
    }
    var steps = '<ol class="nk-process wiz" style="--steps:4" aria-label="' + esc(x.a11y.steps) + '">' + ofSteps(x, st) + '</ol>';
    var nav = '<div class="wiz-nav">' + (st > 0 ? '<button type="button" class="nk-btn" id="back">' + esc(st === 3 ? x.edit : x.back) + '</button>' : '<span></span>') +
      (st < 3 ? '<button type="button" class="nk-btn nk-btn--primary nk-btn--lg" id="next">' + esc(st === 2 ? x.finish : x.next) + '<span class="nk-btn__arrow" aria-hidden="true">→</span></button>' : '') + '</div>';
    return '<section class="block first' + (st === 3 ? ' bp-page' : '') + '">' + head(x.orderLabel, x.orderTitle, x.orderLead, true) + steps + '<form class="wiz-body" id="wiz" novalidate>' + (st < 3 ? drBar() : '') + body + nav + '</form>' + (st === 3 ? bpSheet() : '') + '</section>';
  }
  // ---------- Tools on #services: index of the five tools, deep links #services?tool=plan|fit|file|material|prep ----------
  // Added 2026-10-29 (#services tools package). Only links and scrolling; the tools themselves are unchanged.
  // To remove: TL_TOOLS … tlGo(), the tlIndex() / tlWrap() calls in views.services, tlHome() in views.home, the state.tool
  // line in page(), the tlGo line in render(), tl: in both languages in content.js and the "Tools index" rules in page.css.
  var TL_TOOLS = [['plan', 'pl', 'plan'], ['fit', 'fit', 'fit'], ['file', 'fc', 'file-check'], ['material', 'mp', 'material'], ['prep', 'prep', 'prep']]; // [link name, content key, section id]
  function tlHash(k) { return '#services?tool=' + k; }
  function tlIndex() {
    var x = t().tl;
    return '<section class="block tl" id="tools" aria-labelledby="tl-h"><div class="tl-head"><p class="nk-label">' + esc(x.label) + '</p><h2 class="sub" id="tl-h" tabindex="-1">' + esc(x.title) + '</h2><p class="tl-lead">' + esc(x.lead) + '</p></div>' +
      '<ol class="tl-list">' + TL_TOOLS.map(function (d, i) {
        return '<li><a class="tl-item" href="' + tlHash(d[0]) + '"><span class="nk-label">T-0' + (i + 1) + '</span><span class="tl-t">' + esc(t()[d[1]].title) + '</span><span class="tl-d">' + esc(x[d[0]]) + '</span><span class="tl-go" aria-hidden="true">↓</span></a></li>';
      }).join('') + '</ol></section>';
  }
  function tlWrap(k, html) { // gives the tool section its id + a T-0N tag and ends it with "↑ All tools"
    var d = TL_TOOLS.filter(function (v) { return v[0] === k; })[0], n = TL_TOOLS.indexOf(d) + 1;
    html = html.replace(/^<section class="block ([a-z-]+)"(?: id="[^"]*")?/, '<section class="block $1 tl-tool" id="' + d[2] + '" data-tl="T-0' + n + '"');
    return html.replace(/<\/section>$/, '<p class="tl-back"><a href="#services?tool=index">↑ ' + esc(t().tl.back) + '</a></p></section>');
  }
  function tlHome() {
    var x = t().tl;
    return '<p class="tl-home"><span class="nk-label">' + esc(x.home) + '</span>' + TL_TOOLS.slice(0, 4).map(function (d) { return '<a href="' + tlHash(d[0]) + '">' + esc(t()[d[1]].title) + '</a>'; }).join('<span aria-hidden="true"> · </span>') + '</p>';
  }
  function tlGo(k) {
    var d = TL_TOOLS.filter(function (v) { return v[0] === k; })[0], el = document.getElementById(d ? d[2] : 'tools');
    if (!el) return;
    var h = el.querySelector('h2'); if (!h) return;
    if (!h.hasAttribute('tabindex')) h.setAttribute('tabindex', '-1');
    el.scrollIntoView({ block: 'start' }); h.focus({ preventScroll: true });
  }
  // ---------- Deadline check (order form, step 2) ----------
  // Compares the client's deadline with the published turnaround of each picked service (SERVICES[].time in content.js).
  // Self-contained: remove dlRange()…dlUpdate(), the dlBox() call in orderView(), the f-deadline line in the input
  // handler, dl: in both languages in content.js and the "Deadline check" rules at the end of page.css.
  function dlRange(s) {
    var m = s.time && /(\d+)\s*[–-]\s*(\d+)\s*(day|week)/.exec(s.time.en || '');
    if (!m) return null; var k = m[3] === 'week' ? 7 : 1;
    return [+m[1] * k, +m[2] * k];
  }
  function dlDays(v) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(v || '')); if (!m) return null;
    var now = new Date(), a = new Date(now.getFullYear(), now.getMonth(), now.getDate()), b = new Date(+m[1], +m[2] - 1, +m[3]);
    return Math.round((b - a) / 864e5);
  }
  function dlInner() {
    var x = t().dl, o = state.order, d = dlDays(o.deadline);
    if (d == null) return '';
    var head = '<p class="nk-label">' + esc(x.label) + '</p><p class="dl-lead">' + esc(x.lead) + '</p>';
    if (d <= 0) return head + '<p class="dl-past"><span class="nk-tag nk-tag--rev">' + esc(x.pastTag) + '</span> ' + esc(x.past) + '</p>';
    var picked = SERVICES.filter(function (s) { return o.services.indexOf(s.key) >= 0; });
    var when = '<p class="dl-when"><span class="nk-label">' + esc(x.due) + '</span> <b>' + timeTag(o.deadline) + '</b> · ' + esc(d === 1 ? x.day : x.days.replace('{n}', d)) + '</p>';
    if (!picked.length) return head + when + '<p class="dl-note">' + esc(x.pick) + '</p>';
    var span = Math.max.apply(null, [d].concat(picked.map(function (s) { var r = dlRange(s); return r ? r[1] : 0; }))) * 1.15;
    var pct = function (n) { return (Math.min(n, span) / span * 100).toFixed(2) + '%'; };
    var rows = picked.map(function (s) {
      var r = dlRange(s), tag, bar = '';
      if (!r) tag = '<span class="nk-tag">' + esc(x.none) + '</span><span class="dl-usual">' + esc(x.noneBody) + '</span>';
      else {
        var v = d < r[0] ? ['rev', x.short] : d < r[1] ? ['', x.tight] : ['ok', x.ok];
        tag = '<span class="nk-tag' + (v[0] ? ' nk-tag--' + v[0] : '') + '">' + esc(v[1]) + '</span><span class="dl-usual">' + esc(x.usual.replace('{r}', L(s.time))) + '</span>';
        bar = '<div class="dl-bar" aria-hidden="true"><span class="dl-range" style="left:' + pct(r[0]) + ';width:calc(' + pct(r[1]) + ' - ' + pct(r[0]) + ')"></span>' +
          '<span class="dl-due" style="left:' + pct(d) + '"></span></div>';
      }
      return '<li class="dl-row"><div class="dl-top"><span class="dl-svc">' + esc(L(s.title)) + '</span><span class="dl-v">' + tag + '</span></div>' + bar + '</li>';
    }).join('');
    var legend = '<p class="dl-legend" aria-hidden="true"><span><i class="dl-k dl-k--today"></i>' + esc(x.today) + '</span><span><i class="dl-k dl-k--range"></i>' + esc(x.range) + '</span><span><i class="dl-k dl-k--due"></i>' + esc(x.due) + '</span></p>';
    return head + when + '<ul class="dl-rows">' + rows + '</ul>' + legend + '<p class="dl-note">' + esc(x.note) + '</p>';
  }
  // Earliest date the picker offers: tomorrow (local time), so phones can't pick today or a past date.
  function dlMin() { var d = new Date(); d.setDate(d.getDate() + 1); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function dlBox() { var h = dlInner(); return '<div class="dl full" id="dl" aria-live="polite"' + (h ? '' : ' hidden') + '>' + h + '</div>'; }
  function dlUpdate() { var el = document.getElementById('dl'); if (!el) return; var h = dlInner(); el.innerHTML = h; el.hidden = !h; }
  // ---------- What do you already have? (order form, step 2) ----------
  // The published "What I need" lists (SERVICES[].need) of the services picked in step 1 as checkboxes; the ticks are
  // shared with "What to prepare" on #services (state.prep.have) and go into the brief / printable brief as "Ready" and
  // "Still to prepare" — only once at least one item is ticked.
  // Self-contained: remove ocItems()…ocRows(), the ocBox() call in orderView(), the ocRows() parts in briefText() and
  // bpSheet(), the data-oc-have line in the change handler, oc: in both languages in content.js and the
  // "What do you already have" rules at the end of page.css.
  function ocItems() {
    var out = [], idx = {}, on = state.order.services;
    SERVICES.forEach(function (s) {
      if (on.indexOf(s.key) < 0 || !s.need) return;
      s.need.en.forEach(function (en, i) {
        if (idx[en] == null) { idx[en] = out.length; out.push({ id: en, text: { en: en, sl: s.need.sl[i] }, codes: [] }); }
        out[idx[en]].codes.push(s.code);
      });
    });
    return out;
  }
  function ocStatus(items) {
    var n = items.filter(function (it) { return state.prep.have[it.id]; }).length;
    return t().oc.count.replace('{n}', n).replace('{t}', items.length);
  }
  function ocBox() {
    var f = t().oc, items = ocItems();
    if (!items.length) return '';
    return '<fieldset class="oc full"><legend class="nk-label">' + esc(f.label) + '</legend><h3 class="oc-title">' + esc(f.title) + '</h3><p class="oc-lead">' + esc(f.lead) + '</p>' +
      '<ul class="prep-list oc-list">' + items.map(function (it, i) {
        return '<li><label class="prep-item"><input type="checkbox" data-oc-have="' + i + '"' + (state.prep.have[it.id] ? ' checked' : '') + '>' +
          '<span class="prep-t">' + esc(L(it.text)) + '</span><span class="nk-label prep-c">' + esc(it.codes.join(' · ')) + '</span></label></li>';
      }).join('') + '</ul><p class="nk-label oc-out" id="oc-out" role="status" aria-live="polite">' + esc(ocStatus(items)) + '</p></fieldset>';
  }
  function ocRows() { // [[label, text]] for the brief; empty until something is ticked
    var f = t().oc, items = ocItems(), yes = [], no = [];
    items.forEach(function (it) { (state.prep.have[it.id] ? yes : no).push(L(it.text)); });
    if (!yes.length) return [];
    var r = [[f.ready, yes.join(', ')]];
    if (no.length) r.push([f.todo, no.join(', ')]);
    return r;
  }
  // Sent screen: the checklist items not ticked yet as "Next, send me" — only once at least one item was ticked.
  function ocNext() {
    var f = t().oc, items = ocItems(), no = items.filter(function (it) { return !state.prep.have[it.id]; });
    if (!no.length || no.length === items.length) return '';
    return '<div class="oc-next"><p class="nk-label">' + esc(f.next) + '</p><ul>' + no.map(function (it) { return '<li>' + esc(L(it.text)) + '</li>'; }).join('') + '</ul><p class="hint">' + esc(f.nextHint) + '</p></div>';
  }
  // Order step 4: copy the contact e-mail address (falls back to selecting it).
  function mailCopy() {
    var x = t(), msg = document.getElementById('mail-msg'), el = document.getElementById('mail');
    var fail = function () { msg.textContent = x.mailFail; var r = document.createRange(); r.selectNodeContents(el); var s = getSelection(); s.removeAllRanges(); s.addRange(r); };
    try { navigator.clipboard.writeText(CONTACT_EMAIL).then(function () { msg.textContent = x.mailCopied; }, fail); } catch (e) { fail(); }
  }
  // Footer title block: copy the contact e-mail (for visitors without a mail app); falls back to selecting the address.
  function tbCopy() {
    var x = t(), msg = document.getElementById('tb-msg'), el = document.getElementById('tb-mail'); if (!msg || !el) return;
    var fail = function () { msg.textContent = x.mailFail; var r = document.createRange(); r.selectNodeContents(el); var s = getSelection(); s.removeAllRanges(); s.addRange(r); };
    try { navigator.clipboard.writeText(CONTACT_EMAIL).then(function () { msg.textContent = x.tbCopied; }, fail); } catch (e) { fail(); }
  }
  // ---------- Order flow (2026-10-26): Enter = Next, finished steps are buttons, errors clear while typing, e-mail typo hint ----------
  // Remove: this block, the ofSteps() call in orderView(), the ofTypoBox() call in step 3, the ofInput()/data-of-* lines in
  // the input/click handlers, the ofKey() line in the keydown handler, the step part in pageTitle(), of: in content.js and
  // the "Order flow" rules in page.css.
  var OF_TYPO = { 'gmial.com': 'gmail.com', 'gmal.com': 'gmail.com', 'gmai.com': 'gmail.com', 'gamil.com': 'gmail.com', 'gnail.com': 'gmail.com', 'gmaill.com': 'gmail.com', 'gmail.co': 'gmail.com', 'gmail.con': 'gmail.com', 'gmail.cmo': 'gmail.com',
    'hotmial.com': 'hotmail.com', 'hotmai.com': 'hotmail.com', 'hotmal.com': 'hotmail.com', 'hotmail.con': 'hotmail.com', 'outlok.com': 'outlook.com', 'outloo.com': 'outlook.com', 'outlook.con': 'outlook.com',
    'yahooo.com': 'yahoo.com', 'yaho.com': 'yahoo.com', 'yahoo.con': 'yahoo.com', 'iclod.com': 'icloud.com', 'icloud.con': 'icloud.com', 'siol.nt': 'siol.net', 'siol.ne': 'siol.net', 'siol.met': 'siol.net' };
  function ofTypo(v) {
    var m = /^([^@\s]+)@([^@\s]+)$/.exec(String(v || '').trim()); if (!m) return '';
    var d = m[2].toLowerCase(), fix = OF_TYPO[d] || (/\.(con|cmo|ocm)$/.test(d) ? d.replace(/\.(con|cmo|ocm)$/, '.com') : '');
    return fix && fix !== d ? m[1] + '@' + fix : '';
  }
  function ofTypoInner() {
    var sug = ofTypo(state.order.email); if (!sug) return '';
    return '<span>' + esc(t().of.typo).replace('{e}', '<b>' + esc(sug) + '</b>') + '</span> <button type="button" class="nk-btn nk-btn--sm" data-of-fix>' + esc(t().of.fix) + '</button>';
  }
  function ofTypoBox() { return '<p class="of-typo full" id="of-typo" aria-live="polite">' + ofTypoInner() + '</p>'; }
  function ofValid(k, v) { v = String(v || ''); return k === 'what' ? v.trim().length >= 8 : k === 'name' ? !!v.trim() : k === 'email' ? /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v) : true; }
  function ofInput(el, k) { // a field marked as missing turns back to normal as soon as it is filled in correctly
    if (k === 'email') { var tb = document.getElementById('of-typo'); if (tb) tb.innerHTML = ofTypoInner(); }
    if (!state.errors[k] || !ofValid(k, el.value)) return;
    delete state.errors[k];
    var f = el.closest('.nk-field'); if (f) f.classList.remove('nk-field--error');
    el.removeAttribute('aria-invalid');
    var h = document.getElementById('f-' + k + '-h');
    if (k === 'what' && h) h.textContent = t().fWhatH; else if (h) { h.remove(); el.removeAttribute('aria-describedby'); }
  }
  function ofFix() {
    var sug = ofTypo(state.order.email), el = document.getElementById('f-email'); if (!sug || !el) return;
    el.value = state.order.email = sug; drSave(); ofInput(el, 'email'); el.focus();
  }
  function ofSteps(x, st) { // finished steps become buttons back to that step (not after the brief is sent)
    var open = state.send !== 'sent' && state.send !== 'sending';
    return x.steps.map(function (s, i) {
      var inner = '<span class="nk-process__n">' + String(i + 1).padStart(2, '0') + ' / 04</span><span class="nk-process__t">' + esc(s) + '</span>';
      if (i < st && open) return '<li class="of-done"><button type="button" class="of-step" data-of-step="' + i + '" aria-label="' + esc(x.of.back.replace('{n}', i + 1).replace('{s}', s)) + '">' + inner + '</button></li>';
      return '<li' + (i === st ? ' class="is-active" aria-current="step"' : i < st ? ' class="of-done"' : '') + '>' + inner + '</li>';
    }).join('');
  }
  function ofGo(i) { readForm(); state.errors = {}; state.send = 'idle'; state.step = i; render(true); var w = document.getElementById('wiz'); if (w) w.scrollIntoView({ block: 'start' }); wizFocus(true); }
  function ofKey(ev) { // Enter in a one-line field of the order form = Next
    var tg = ev.target;
    if (ev.key !== 'Enter' || ev.isComposing || ev.shiftKey || ev.ctrlKey || ev.metaKey || ev.altKey || page() !== 'order') return false;
    if (!tg || tg.tagName !== 'INPUT' || tg.id === 'f-website' || !tg.closest('#wiz')) return false;
    var nx = document.getElementById('next'); if (!nx) return false;
    ev.preventDefault(); nx.click(); return true;
  }

  // Hints and errors are tied to their control (aria-describedby / aria-invalid) so screen readers read them with the field.
  var REQUIRED = { what: 1, name: 1, email: 1 };
  function field(k, label, ctl, hint, err, full) {
    var attrs = (hint ? ' aria-describedby="f-' + k + '-h"' : '') + (err ? ' aria-invalid="true"' : '') + (REQUIRED[k] ? ' aria-required="true"' : '');
    ctl = ctl.replace('id="f-' + k + '"', 'id="f-' + k + '"' + attrs);
    return '<div class="nk-field' + (err ? ' nk-field--error' : '') + (full ? ' full' : '') + '"><label class="nk-field__label" for="f-' + k + '">' + esc(label) + '</label>' + ctl + (hint ? '<span class="nk-field__hint" id="f-' + k + '-h">' + esc(hint) + '</span>' : '') + '</div>';
  }
  function select(k, opts, v) { return '<select class="nk-input" id="f-' + k + '" data-f="' + k + '">' + opts.map(function (o, i) { return '<option value="' + i + '"' + (+v === i ? ' selected' : '') + '>' + esc(o) + '</option>'; }).join('') + '</select>'; }
  function estimate() {
    var o = state.order, x = t(), rows = [];
    SERVICES.forEach(function (s) { if (o.services.indexOf(s.key) >= 0) rows.push([L(s.title), s.time ? L(s.time) : x.onRequest]); });
    return specs(rows);
  }
  function briefText() {
    var o = state.order, x = t();
    var svc = SERVICES.filter(function (s) { return o.services.indexOf(s.key) >= 0; }).map(function (s) { return L(s.title); }).join(', ');
    return [x.orderTitle.toUpperCase() + ' — nacekepa.work', '', x.steps[0] + ': ' + svc, x.fWhat + ' ' + o.what, x.fQty + ': ' + o.qty, x.fDeadline + ': ' + (o.deadline || '—'),
      x.fFiles + ' ' + x.fFilesO[o.files], x.fMat + ': ' + x.fMatO[o.mat], '', x.fName + ': ' + o.name, x.fEmail + ': ' + o.email, o.note ? x.fNote + ' ' + o.note : ''].concat(ocRows().length ? [''].concat(ocRows().map(function (r) { return r[0] + ' ' + r[1]; })) : []).join('\n').replace(/\n{3,}/g, '\n\n').trim();
  }

  function frame(inner) {
    var x = t(), p = page();
    var zones = '<div class="zones zones-top" aria-hidden="true">' + [1, 2, 3, 4, 5, 6, 7, 8].map(function (n) { return '<span>' + n + '</span>'; }).join('') + '</div>' +
      '<div class="zones zones-side zl" aria-hidden="true"><span>A</span><span>B</span><span>C</span><span>D</span></div><div class="zones zones-side zr" aria-hidden="true"><span>A</span><span>B</span><span>C</span><span>D</span></div>';
    var nav = '<header class="top"><a class="wordmark" href="#home" aria-label="' + esc(x.aria.home) + '">' + logo() + '<span class="wm-text">nacekepa<span>.work</span></span></a><nav aria-label="' + esc(x.aria.main) + '">' +
      ['services', 'work', 'news', 'skills', 'about'].filter(function (k) { return k !== 'news' || NEWS.length; }).map(function (k) { return '<a href="#' + k + '"' + (p === k || ((p === 'project' || p === 'compare') && k === 'work') || (p === 'post' && k === 'news') ? ' aria-current="page"' : '') + '>' + esc(x.nav[k]) + '</a>'; }).join('') +
      '</nav><div class="top-act"><div class="lang" role="group" aria-label="' + esc(x.aria.lang) + '"><button type="button" data-lang="en" aria-pressed="' + (lang === 'en') + '">EN</button><button type="button" data-lang="sl" aria-pressed="' + (lang === 'sl') + '">SL</button></div>' + btn(ctaText(), '#order', 'primary', 'sm') + '</div></header>';
    var idx = PAGES.indexOf(p === 'project' || p === 'compare' ? 'work' : p === 'post' ? 'news' : p) + 1;
    var d = new Date().toISOString().slice(0, 10);
    var tb = '<footer class="foot"><div class="nk-tb" style="--tb-cols:6">' +
      cell(x.tb.title, '<span class="tb-brand">' + logo() + '<span>Nace Kepa · Engineering Studio</span></span>', 'wide', true, true) + cell(x.tb.drawn, 'N. Kepa') + cell(x.tb.loc, 'Škofja Loka, SI') + cell(x.tb.sheet, String(idx).padStart(2, '0') + ' / ' + String(PAGES.length).padStart(2, '0')) +
      cell(x.tb.scale, '1:1') + cell(x.tb.rev, 'B') + cell(x.tb.date, d) + cell(x.tb.contact, (CONTACT_EMAIL ? '<a href="mailto:' + esc(CONTACT_EMAIL) + '" id="tb-mail">' + esc(CONTACT_EMAIL) + '</a> <button type="button" class="tb-copy" data-tb-copy>' + esc(x.tbCopy) + '</button><span class="tb-msg" id="tb-msg" role="status" aria-live="polite"></span> · ' : '') + '<a href="' + LINKEDIN + '" target="_blank" rel="noopener">LinkedIn <span aria-hidden="true">↗</span><span class="vh"> (' + esc(t().newTab) + ')</span></a>', 'wide', false, true) + cell(x.tb.order, '<a href="#order">' + esc(ctaText()) + ' →</a>', 'wide', false, true) +
      cell('', esc(x.footerNote), 'full', false, true) + '</div><p class="copy">© ' + new Date().getFullYear() + ' Nace Kepa' + kbdBtn() + '</p></footer>';
    return '<div class="frame"><a class="skip" href="#main" data-skip>' + esc(x.skip) + '</a>' + zones + nav + '<main id="main" tabindex="-1">' + inner + '</main>' + tb + '</div>';
  }
  function cell(k, v, span, title, raw) {
    return '<div class="nk-tb__cell' + (span === 'wide' ? ' nk-tb__cell--wide' : span === 'full' ? ' nk-tb__cell--full' : '') + '">' + (k ? '<span class="nk-tb__k">' + esc(k) + '</span>' : '') + '<span class="nk-tb__v' + (title ? ' nk-tb__v--title' : '') + '">' + (raw ? v : esc(v)) + '</span></div>';
  }

  // Tab / history / screen-reader title for the current view, e.g. "FamFive · Nace Kepa".
  function pageTitle(p) {
    var x = t(), s = '';
    if (p === 'project') { var pr = bySlug(currentSlug()); s = pr ? P(pr, 'title') : ''; }
    else if (p === 'post') { var n = newsBySlug(currentSlug()); s = n ? P(n, 'title') : ''; }
    else if (p === 'order') s = x.cta + ' · ' + (state.step + 1) + '/4 ' + x.steps[state.step];
    else if (p !== 'home') s = x.nav[p] || '';
    return s ? s + ' · Nace Kepa' : 'Nace Kepa · ' + (lang === 'sl' ? 'Inženirski studio' : 'Engineering Studio');
  }
  function render(keepScroll) {
    var p = page();
    document.documentElement.lang = lang === 'sl' ? 'sl' : 'en';
    document.title = pageTitle(p);
    if (viewer) { viewer.dispose(); viewer = null; }
    fc3dDispose();
    closeLightbox();
    psDone();
    app.innerHTML = frame(views[p]());
    if (!keepScroll) window.scrollTo(0, 0);
    if (p === 'project') mountViewer();
    if (p === 'order') drSave();
    if (p === 'services' && state.fc.res) { fcDraw(); fc3dMount(); } // File check views + 3D preview
    if (p === 'services' && state.tool && location.hash !== state.tlAt) { state.tlAt = location.hash; tlGo(state.tool); } else if (p !== 'services') state.tlAt = '';
    if (p === 'services' && state.mpFocus) { state.mpFocus = false; var mb = document.getElementById('material'); if (mb) { mb.scrollIntoView({ block: 'start' }); var mi = mb.querySelector('input'); if (mi) mi.focus({ preventScroll: true }); } }
    if (p === 'services' && state.plFocus) { state.plFocus = false; var pb = document.getElementById('plan'); if (pb) { pb.scrollIntoView({ block: 'start' }); var pr = pb.querySelector('input'); if (pr) pr.focus({ preventScroll: true }); } }
    if (p === 'about' && state.ctGo) { state.ctGo = false; var ct = document.getElementById('contact'); if (ct) { ct.scrollIntoView({ block: 'start' }); ct.focus({ preventScroll: true }); } }
    if (p === 'work') { findApply(); if (state.findFocus) { state.findFocus = false; var fq = document.getElementById('find-q'); if (fq) fq.focus(); } }
    // Back from a project sheet / news post to its list: scroll to and focus the card the visitor opened, not the top.
    var came = state.from; state.from = p === 'project' ? '#p-' + currentSlug() : p === 'post' ? '#n-' + currentSlug() : '';
    if (came && !keepScroll && (p === 'work' || p === 'news')) {
      var card = app.querySelector((p === 'work' ? (rgOn() ? '#rg' : '#find-grid') : '.news-list') + ' a[href="' + came + '"]');
      if (card && !card.hidden) { card.scrollIntoView({ block: 'center' }); card.focus({ preventScroll: true }); }
    }
  }

  function readForm() {
    Array.prototype.forEach.call(app.querySelectorAll('[data-f]'), function (el) { state.order[el.getAttribute('data-f')] = el.value; });
  }
  function validate() {
    var o = state.order, e = {};
    if (state.step === 0 && !o.services.length) e.services = 1;
    if (state.step === 1 && o.what.trim().length < 8) e.what = 1;
    if (state.step === 2) { if (!o.name.trim()) e.name = 1; if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(o.email)) e.email = 1; }
    state.errors = e; return !Object.keys(e).length;
  }

  app.addEventListener('click', function (ev) {
    var el = ev.target.closest('button, a'); if (!el) return;
    if (el.hasAttribute('data-skip')) { ev.preventDefault(); var mn = document.getElementById('main'); mn.focus({ preventScroll: true }); mn.scrollIntoView({ block: 'start' }); return; }
    var th = el.tagName === 'A' && /^#services\?tool=([a-z]+)$/.exec(el.getAttribute('href') || ''); // Tools index: same link again → jump again
    if (th && location.hash === th[0]) { ev.preventDefault(); tlGo(th[1]); return; }
    if (el.hasAttribute('data-fit-go')) { fitToOrder(); return; }
    if (el.hasAttribute('data-fc-go')) { fcToOrder(); return; }
    if (el.hasAttribute('data-fc-fit')) { fcToFit(); return; }
    if (el.hasAttribute('data-fc-copy')) { fcCopy(); return; }
    if (el.hasAttribute('data-fc-clear')) { fcClear(); return; }
    if (el.hasAttribute('data-fc-3d')) { fc3dToggle(); return; }
    if (el.hasAttribute('data-ct-copy')) { ctCopy(); return; }
    if (el.hasAttribute('data-v3-view')) { v3Set(el.dataset.v3For, 'view', el.dataset.v3View); return; }
    if (el.hasAttribute('data-pl-go')) { plToOrder(); return; }
    if (el.hasAttribute('data-mp-go')) { mpToOrder(); return; }
    if (el.hasAttribute('data-mp-copy')) { mpCopy(); return; }
    if (el.hasAttribute('data-mp-clear')) { state.mp = { needs: {}, pick: '' }; mpRefresh('[data-mp-need]'); return; }
    if (el.hasAttribute('data-mp-open')) { ev.preventDefault(); state.mpFocus = true; if (page() === 'services') render(true); else location.hash = 'services'; return; }
    if (el.hasAttribute('data-pl-copy')) { plCopy(); return; }
    if (el.hasAttribute('data-pl-prep')) { plPrep(); return; }
    if (el.hasAttribute('data-pl-reset')) { state.pl = { have: '', kind: '', back: '', l: '', w: '', h: '', qty: '1', mat: 0, deadline: '' }; plRefresh('input[name="pl-q1"]'); return; }
    if (el.hasAttribute('data-pl-open')) { ev.preventDefault(); state.plFocus = true; if (page() === 'services') render(true); else location.hash = 'services'; return; }
    if (el.dataset.prepSvc) { var ps = prepSvc(), pk = el.dataset.prepSvc, pi = ps.indexOf(pk); if (pi < 0) ps.push(pk); else ps.splice(pi, 1); ps.sort(function (p, q) { return SERVICES.map(function (s) { return s.key; }).indexOf(p) - SERVICES.map(function (s) { return s.key; }).indexOf(q); }); prepRefresh(pk); return; }
    if (el.hasAttribute('data-prep-go')) { prepToOrder(); return; }
    if (el.hasAttribute('data-prep-copy')) { prepCopy(); return; }
    if (el.hasAttribute('data-mail-copy')) { mailCopy(); return; }
    if (el.dataset.slTog) { slFlip(el.dataset.slTog); return; }
    if (el.dataset.slDel) { slDel(el.dataset.slDel); return; }
    if (el.hasAttribute('data-sl-go')) { slToOrder(); return; }
    if (el.hasAttribute('data-sl-copy')) { slCopy(); return; }
    if (el.hasAttribute('data-cmp-go')) { cmpToOrder(); return; }
    if (el.hasAttribute('data-cmp-copy')) { cmpCopy(); return; }
    if (el.hasAttribute('data-cmp-sl')) { cmpSlAll(); return; }
    if (el.hasAttribute('data-cmp-add')) { var ca = state.cmp.slice(), cn = cmpNext(ca); if (cn) { ca.push(cn); cmpSet(ca, '#cmp-' + (ca.length - 1)); } return; }
    if (el.dataset.cmpDel) { var cd = state.cmp.slice(), ci = +el.dataset.cmpDel; cd.splice(ci, 1); cmpSet(cd, '#cmp-' + Math.min(ci, cd.length - 1)); return; }
    if (el.hasAttribute('data-dr-clear')) { dr.ask = true; var db = document.getElementById('dr'); if (db) { db.innerHTML = drInner(); var y = db.querySelector('[data-dr-keep]'); if (y) y.focus(); } return; }
    if (el.hasAttribute('data-dr-keep')) { dr.ask = false; var dk = document.getElementById('dr'); if (dk) { dk.innerHTML = drInner(); var cb = dk.querySelector('[data-dr-clear]'); if (cb) cb.focus(); } return; }
    if (el.hasAttribute('data-dr-yes')) { drClearAll(); return; }
    if (el.hasAttribute('data-sl-clear')) { slClear(); return; }
    if (el.hasAttribute('data-tb-copy')) { tbCopy(); return; }
    if (el.hasAttribute('data-find-clear')) { state.q = ''; var fq = document.getElementById('find-q'); fq.value = ''; findApply(); fq.focus(); return; }
    if (el.dataset.lang) { lang = el.dataset.lang; try { localStorage.setItem('nk-lang', lang); } catch (e) {} langHash(); render(true); return; }
    if (el.dataset.filter) { // keep keyboard focus on the chip and announce how many sheets are shown
      state.filter = el.dataset.filter; render(true);
      var fc = app.querySelector('[data-filter="' + state.filter + '"]'); if (fc) fc.focus({ preventScroll: true });
      var fo = document.getElementById('find-out'), fg = document.getElementById('find-grid');
      if (fo && !state.q.trim() && fg) fo.textContent = t().sl.shownN.replace('{n}', fg.querySelectorAll('.nk-sheet:not([hidden])').length);
      return; }
    if (el.dataset.relCat) { state.filter = el.dataset.relCat; state.q = ''; return; }
    if (el.hasAttribute('data-rel-go')) { relToOrder(); return; }
    if (el.hasAttribute('data-share-copy')) { shareCopy(); return; }
    if (el.hasAttribute('data-find-copy')) { findShareCopy(); return; }
    if (el.hasAttribute('data-rg-view')) { rgView(el.getAttribute('data-rg-view')); return; }
    if (el.hasAttribute('data-rg-sort')) { rgSort(el.getAttribute('data-rg-sort')); return; }
    if (el.hasAttribute('data-rg-sl')) { rgStar(el.getAttribute('data-rg-sl')); return; }
    if (el.hasAttribute('data-rg-copy')) { rgCopy(); return; }
    if (el.hasAttribute('data-feed-copy')) { feedCopy(); return; }
    if (el.hasAttribute('data-print')) { printSheet(); return; }
    if (el.hasAttribute('data-bp-print')) { printSheet(); return; }
    if (el.hasAttribute('data-ps-print')) { psPrint(); return; }
    if (el.hasAttribute('data-kbd')) { kbdOpen(); return; }
    if (el.hasAttribute('data-share-more')) { var sb = el.closest('.share'); try { navigator.share({ title: sb.dataset.shareTitle, url: document.getElementById('share-url').value }).catch(function () {}); } catch (e) {} return; }
    if (el.dataset.lb != null) { var pr = page() === 'post' ? newsBySlug(currentSlug()) : bySlug(currentSlug()); if (pr && pr.photos && pr.photos.length) openLightbox(pr.photos, +el.dataset.lb, P(pr, 'title')); return; }
    if (el.dataset.ofStep) { ev.preventDefault(); ofGo(+el.dataset.ofStep); return; }
    if (el.hasAttribute('data-of-fix')) { ofFix(); return; }
    if (el.id === 'next') { ev.preventDefault(); readForm(); var ok = validate(); if (ok) state.step++; if (ok && state.step === 3) submitOrder(); render(true); var w = document.getElementById('wiz'); if (w) w.scrollIntoView({ block: 'start' }); wizFocus(ok); return; }
    if (el.id === 'back') { ev.preventDefault(); readForm(); state.errors = {}; state.send = 'idle'; state.step = state.step === 3 ? 0 : state.step - 1; render(true); wizFocus(true); return; }
    if (el.id === 'copy') {
      var txt = briefText(), msg = document.getElementById('copy-msg');
      var fail = function () { msg.textContent = t().copyFail; var r = document.createRange(); r.selectNodeContents(document.getElementById('brief')); var s = getSelection(); s.removeAllRanges(); s.addRange(r); };
      try { navigator.clipboard.writeText(txt).then(function () { msg.textContent = t().copied; }, fail); } catch (e) { fail(); }
    }
  });
  app.addEventListener('input', function (ev) { var v3 = ev.target.dataset && ev.target.dataset.v3Cut; if (v3) { v3Set(v3, 'cut', ev.target.value); return; } var fk = ev.target.dataset && ev.target.dataset.f; if (fk && fk !== 'website' && page() === 'order') { state.order[fk] = ev.target.value; drSave(); ofInput(ev.target, fk); } if (ev.target.id === 'f-deadline') { state.order.deadline = ev.target.value; dlUpdate(); return; } if (ev.target.id === 'find-q') { state.q = ev.target.value; findApply(); return; } var pf = ev.target.dataset && ev.target.dataset.plF; if (pf && pf !== 'mat') { state.pl[pf] = ev.target.value; plUpdate(); return; } var k = ev.target.dataset && ev.target.dataset.fit; if (k) { state.fit[k] = ev.target.value; fitUpdate(); } });
  app.addEventListener('change', function (ev) {
    if (ev.target.hasAttribute('data-fc-file')) { if (ev.target.files && ev.target.files[0]) fcRead(ev.target.files[0]); return; }
    if (ev.target.hasAttribute('data-fc-unit')) { state.fc.unit = ev.target.value; fcRefresh(); var fu = document.getElementById('fc-unit'); if (fu) fu.focus(); return; }
    if (ev.target.dataset.cmpSlot) { var cs = state.cmp.slice(), ck = +ev.target.dataset.cmpSlot; cs[ck] = ev.target.value; cmpSet(cs, '#cmp-' + ck); return; }
    if (ev.target.hasAttribute('data-ps-scope')) { state.ps.scope = ev.target.value; psSync(); return; }
    if (ev.target.dataset.plQ) { var hadReset = plDone() > 0; state.pl[{ q1: 'have', q2: 'kind', q3: 'back' }[ev.target.dataset.plQ]] = ev.target.value; if (!hadReset) plRefresh('input[name="' + ev.target.name + '"]:checked'); else plUpdate(); return; }
    if (ev.target.hasAttribute('data-mp-need')) { var mh = mpTicked().length > 0; state.mp.needs[ev.target.value] = ev.target.checked; if (mh !== mpTicked().length > 0) mpRefresh('[data-mp-need][value="' + ev.target.value + '"]'); else { var mo = document.getElementById('mp-out'); if (mo) mo.innerHTML = mpOut(); } return; }
    if (ev.target.hasAttribute('data-mp-pick')) { state.mp.pick = ev.target.value; var mo2 = document.getElementById('mp-out'); if (mo2) mo2.innerHTML = mpOut(); var mr = document.querySelector('#mp-out [data-mp-pick][value="' + state.mp.pick + '"]'); if (mr) mr.focus(); return; }
    if (ev.target.dataset.plF === 'mat') { state.pl.mat = +ev.target.value || 0; plUpdate(); return; }
    if (ev.target.dataset.psInc) { state.ps[ev.target.dataset.psInc] = ev.target.checked; psSync(); return; }
    if (ev.target.dataset.prepHave != null) { var it = prepItems()[+ev.target.dataset.prepHave]; if (it) { state.prep.have[it.id] = ev.target.checked; var po = document.getElementById('prep-out'); if (po) po.textContent = prepStatus(prepItems()); } return; }
    if (ev.target.dataset.ocHave != null) { var oi = ocItems()[+ev.target.dataset.ocHave]; if (oi) { state.prep.have[oi.id] = ev.target.checked; var oo = document.getElementById('oc-out'); if (oo) oo.textContent = ocStatus(ocItems()); drSave(); } return; }
    var k = ev.target.dataset.svc; if (!k) return;
    var a = state.order.services, i = a.indexOf(k);
    if (ev.target.checked && i < 0) a.push(k); if (!ev.target.checked && i >= 0) a.splice(i, 1);
    if (a.length) state.errors = {};
    drSave();
  });
  // File check: drop a file on the box; the views follow the light/dark theme.
  app.addEventListener('dragover', function (ev) { var d = ev.target.closest && ev.target.closest('#fc-drop'); if (!d) return; ev.preventDefault(); d.classList.add('is-over'); });
  app.addEventListener('dragleave', function (ev) { var d = ev.target.closest && ev.target.closest('#fc-drop'); if (d) d.classList.remove('is-over'); });
  app.addEventListener('drop', function (ev) { var d = ev.target.closest && ev.target.closest('#fc-drop'); if (!d) return; ev.preventDefault(); d.classList.remove('is-over'); var fl = ev.dataTransfer && ev.dataTransfer.files; if (fl && fl[0] && !state.fc.busy) fcRead(fl[0]); });
  try { new MutationObserver(function () { fcDraw(); }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] }); window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', fcDraw); } catch (e) {}
  function submitOrder() {
    if (!ORDER_ENDPOINT || state.send === 'sending') return;
    var o = state.order;
    state.send = 'sending';
    var svc = SERVICES.filter(function (s) { return o.services.indexOf(s.key) >= 0; }).map(function (s) { return s.title.en; }).join(', ');
    var payload = JSON.stringify({ code: CODE, subject: (lang === 'sl' ? 'Novo povpraševanje' : 'New project') + ': ' + svc + ' — ' + o.name, summary: 'Tracking code: ' + CODE + '\n\n' + briefText(), contact: o.email, lang: lang, attachments: [], website: o.website || '' });
    var url = ORDER_ENDPOINT.replace(/\/+$/, '') + '/';
    var post = function (type) { return fetch(url, { method: 'POST', mode: 'cors', credentials: 'omit', referrerPolicy: 'origin', cache: 'no-store', headers: { 'content-type': type }, body: payload }); };
    // text/plain avoids a CORS preflight; a Worker that only takes JSON answers 415, so retry as JSON.
    post('text/plain;charset=UTF-8')
      .then(function (r) { return r.status === 415 ? post('application/json') : r; }, function () { return post('application/json'); })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return { ok: r.ok && j.ok !== false, status: r.status }; }); })
      .then(function (r) { state.send = r.ok ? 'sent' : (r.status === 429 ? 'limited' : 'error'); render(true); }, function () { state.send = 'error'; render(true); });
  }
  app.addEventListener('submit', function (ev) { ev.preventDefault(); });
  // Order steps: after "Next" / "Back" focus the new step's heading; when something is missing, focus the first field to fix.
  function wizFocus(ok) {
    var el = ok ? document.getElementById('wiz-h') : (app.querySelector('#wiz [aria-invalid="true"]') || (state.errors.services ? app.querySelector('[data-svc]') : null));
    if (el) el.focus({ preventScroll: true });
  }
  // Page changes: move focus to the new page's content and announce its title, so keyboard and screen-reader users don't
  // stay on a link that no longer exists. Features that set focus themselves (e.g. "/" → search) are left alone.
  function navFocus() {
    var a = document.activeElement;
    if (!a || a === document.body || !app.contains(a)) { var mn = document.getElementById('main'); if (mn) mn.focus({ preventScroll: true }); }
    var live = document.getElementById('nav-live');
    if (!live) { live = document.createElement('p'); live.id = 'nav-live'; live.className = 'vh'; live.setAttribute('aria-live', 'polite'); document.body.appendChild(live); }
    live.textContent = '';
    setTimeout(function () { live.textContent = document.title; }, 80);
  }
  // ---------- Keyboard shortcuts: "?" opens a list; ← / → previous/next sheet; H S W N O jump; L switches EN/SL ----------
  // Self-contained: remove this block (KBD_GO … kbdKey()), kbdBtn() in frame(), the data-kbd line in the click handler,
  // the kbdKey(ev) line in the keydown handler, keys: in both languages in content.js and the "Keyboard shortcuts" rules in page.css.
  var KBD_GO = { h: 'home', s: 'services', w: 'work', n: 'news', o: 'order', c: 'compare' };
  function kbdBtn() { return '<button type="button" class="kbd-open" data-kbd aria-haspopup="dialog">' + esc(t().keys.btn) + ' <kbd>?</kbd></button>'; }
  function kbdRows() {
    var x = t(), k = x.keys, r = [['?', k.help], ['/', k.find], ['← →', k.prevNext]];
    Object.keys(KBD_GO).forEach(function (c) { var v = KBD_GO[c]; if ((v === 'news' && !NEWS.length) || (v === 'compare' && PROJECTS.length < 2)) return; r.push([c.toUpperCase(), v === 'order' ? x.cta : v === 'home' ? x.nav.home : x.nav[v]]); });
    return r.concat([['L', k.lang], ['Esc', k.close]]);
  }
  function kbdClose() { var d = document.getElementById('kbd'); if (d && d.open) d.close(); }
  function kbdOpen() {
    if (document.getElementById('kbd')) return;
    var k = t().keys, back = document.activeElement, d = document.createElement('dialog');
    d.id = 'kbd'; d.className = 'kbd'; d.setAttribute('aria-labelledby', 'kbd-t'); d.lang = lang;
    d.innerHTML = '<div class="kbd-head"><div><p class="nk-label">' + esc(k.label) + '</p><h2 class="sub" id="kbd-t">' + esc(k.title) + '</h2></div>' +
      '<button type="button" class="chip kbd-x" data-kbd-close aria-label="' + esc(k.close) + '">✕</button></div>' +
      '<dl class="kbd-list">' + kbdRows().map(function (r) { return '<div><dt>' + r[0].split(' ').map(function (c) { return '<kbd>' + esc(c) + '</kbd>'; }).join(' ') + '</dt><dd>' + esc(r[1]) + '</dd></div>'; }).join('') + '</dl>' +
      '<p class="kbd-note">' + esc(k.note) + '</p>';
    d.addEventListener('click', function (e) { if (e.target === d || e.target.closest('[data-kbd-close]')) d.close(); });
    d.addEventListener('close', function () { d.remove(); if (back && back.focus && document.contains(back)) back.focus(); });
    document.body.appendChild(d);
    try { d.showModal(); } catch (e) { d.setAttribute('open', ''); }
    var x = d.querySelector('.kbd-x'); if (x) x.focus();
  }
  function kbdStep(dir) {
    var p = page(), list = p === 'project' ? PROJECTS : p === 'post' ? NEWS : null; if (!list || list.length < 2) return false;
    var cur = p === 'project' ? bySlug(currentSlug()) : newsBySlug(currentSlug()), i = list.indexOf(cur);
    var to = list[(i + dir + list.length) % list.length];
    location.hash = (p === 'project' ? 'p-' : 'n-') + to.slug; return true;
  }
  // Returns true when the key was handled. Not while typing, in the photo viewer, the 3D viewer or with Ctrl/Alt/Cmd.
  function kbdKey(ev, typing) {
    var dlg = document.getElementById('kbd');
    if (ev.key === '?' && !typing && !ev.ctrlKey && !ev.metaKey && !ev.altKey && !lb) { ev.preventDefault(); if (dlg) kbdClose(); else kbdOpen(); return true; }
    if (dlg || typing || lb || ev.ctrlKey || ev.metaKey || ev.altKey || ev.defaultPrevented) return false;
    if (ev.target && ev.target.closest && ev.target.closest('.nk-viewer')) return false;
    if ((ev.key === 'ArrowLeft' || ev.key === 'ArrowRight') && !ev.shiftKey) { if (kbdStep(ev.key === 'ArrowRight' ? 1 : -1)) { ev.preventDefault(); return true; } return false; }
    if (ev.shiftKey || !ev.key || ev.key.length !== 1) return false;
    var c = ev.key.toLowerCase();
    if (c === 'l') { lang = lang === 'en' ? 'sl' : 'en'; try { localStorage.setItem('nk-lang', lang); } catch (e) {} langHash(); render(true); ev.preventDefault(); return true; }
    var to = KBD_GO[c]; if (!to || (to === 'news' && !NEWS.length) || (to === 'compare' && PROJECTS.length < 2)) return false;
    ev.preventDefault(); if (page() === to) window.scrollTo(0, 0); else location.hash = to; return true;
  }
  window.addEventListener('hashchange', kbdClose);
  // Search keys: "/" jumps to the search on #work from anywhere; Esc in the box clears it.
  document.addEventListener('keydown', function (ev) {
    var tg = ev.target, typing = tg && (/^(INPUT|TEXTAREA|SELECT)$/.test(tg.tagName) || tg.isContentEditable);
    if (ev.key === 'Escape' && tg && tg.id === 'find-q' && state.q) { state.q = ''; tg.value = ''; findApply(); ev.preventDefault(); return; }
    if (ofKey(ev)) return;
    if (kbdKey(ev, typing)) return;
    if (ev.key !== '/' || typing || lb || ev.ctrlKey || ev.metaKey || ev.altKey) return;
    ev.preventDefault();
    if (page() === 'work') { var fq = document.getElementById('find-q'); if (fq) fq.focus(); }
    else { state.findFocus = true; location.hash = 'work'; }
  });
  window.addEventListener('hashchange', function () { render(false); navFocus(); });
  drLoad();
  render(true);
})();
