(function () {
  // Orders go to the Cloudflare Worker in cloudflare-worker/ (keys stay secret there). The build fills this in
  // from the PUBLIC_ORDER_ENDPOINT repository variable; empty = no sending, the client copies the brief instead.
  var ORDER_ENDPOINT = '__ORDER_ENDPOINT__'.indexOf('__') === 0 ? '' : '__ORDER_ENDPOINT__';
  var CONTACT_EMAIL = '__CONTACT_EMAIL__'.indexOf('__') === 0 ? null : '__CONTACT_EMAIL__';
  var CODE = 'NK-' + Math.random().toString(36).slice(2, 8).toUpperCase(); // set to the studio address, e.g. 'name@nacekepa.work', to show it on the brief step
  var LINKEDIN = 'https://www.linkedin.com/in/nace-kepa-82735038a';
  var lang = 'en';
  try { var s = localStorage.getItem('nk-lang'); if (s === 'sl' || s === 'en') lang = s; } catch (e) {}
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
    if (/^p-/.test(h) && bySlug(h.slice(2))) return 'project';
    if (/^n-/.test(h) && newsBySlug(h.slice(2))) return 'post';
    return PAGES.indexOf(h) >= 0 ? h : 'home'; }
  function currentSlug() { var h = (location.hash || '').replace('#', '').replace(/^(en|sl)-?/, ''); return h.slice(2); }

  function btn(label, href, variant, size, arrow) {
    return '<a class="nk-btn' + (variant ? ' nk-btn--' + variant : '') + (size ? ' nk-btn--' + size : '') + '" href="' + href + '">' + esc(label) + (arrow ? '<span class="nk-btn__arrow" aria-hidden="true">→</span>' : '') + '</a>';
  }
  function specs(items) { return '<dl class="nk-specs">' + items.map(function (i) { return '<div><dt>' + esc(L(i[0])) + '</dt><dd>' + esc(L(i[1])) + '</dd></div>'; }).join('') + '</dl>'; }
  function art(p) {
    if (p.photos && p.photos.length) return '<' + 'img class="sheet-photo" src="' + asset(p.photos[0]) + '" alt="" loading="lazy" decoding="async">';
    var d = p.drawing || (CATS[p.category] && CATS[p.category].d) || 'cad';
    return NK_DRAWINGS[d] || NK_DRAWINGS.cad;
  }
  function sheet(p) {
    return '<a class="nk-sheet" href="#p-' + esc(p.slug) + '" data-cat="' + esc(p.category) + '"><div class="nk-sheet__head"><span class="nk-label">' + sheetNo(p) + '</span><span class="nk-label">' + (p.model ? '<b class="has3d">3D · </b>' : '') + esc(cat(p)) + ' · ' + esc(p.year) + '</span></div>' +
      '<div class="nk-sheet__art">' + art(p) + '</div><div class="nk-sheet__foot"><h3 class="nk-sheet__title">' + esc(P(p, 'title')) + '</h3><p class="nk-sheet__desc">' + esc(P(p, 'description')) + '</p></div></a>';
  }
  function featured() { var f = PROJECTS.filter(function (p) { return p.featured; }); return (f.length ? f : PROJECTS).slice(0, 4); }
  function service(s, full) {
    var x = t();
    return '<article class="nk-service" id="' + s.id + '"><div class="nk-service__top"><span class="nk-service__code">' + s.code + '</span><span class="nk-label">' + esc(s.time ? L(s.time) : x.onRequest) + '</span></div>' +
      '<h3 class="nk-service__title">' + esc(L(s.title)) + '</h3><p>' + esc(L(s.body)) + '</p>' +
      (full ? '<div class="svc-cols"><div><p class="nk-label">' + esc(x.deliverables) + '</p><ul>' + L(s.get).map(function (g) { return '<li>' + esc(g) + '</li>'; }).join('') + '</ul></div><div><p class="nk-label">' + esc(x.needs) + '</p><ul>' + L(s.need).map(function (g) { return '<li>' + esc(g) + '</li>'; }).join('') + '</ul></div></div>'
        : '<ul>' + L(s.get).slice(0, 3).map(function (g) { return '<li>' + esc(g) + '</li>'; }).join('') + '</ul>') +
      '<div class="svc-act">' + btn(full ? x.quote : x.allServices, full ? '#order' : '#services', null, 'sm', true) + '</div></article>';
  }
  function head(label, title, lead, h1) {
    var tag = h1 ? 'h1' : 'h2';
    return '<header class="sec-head"><div><p class="nk-label">' + esc(label) + '</p><' + tag + ' class="' + (h1 ? 'page-title' : 'sec-title') + '">' + esc(title) + '</' + tag + '></div>' + (lead ? '<p class="lead">' + esc(lead) + '</p>' : '') + '</header>';
  }
  function process(active) {
    return '<ol class="nk-process" style="--steps:8">' + t().process.map(function (s, i) { return '<li' + (i === active ? ' class="is-active"' : '') + '><span class="nk-process__n">' + String(i + 1).padStart(2, '0') + '</span><span class="nk-process__t">' + esc(s) + '</span></li>'; }).join('') + '</ol>';
  }
  function ctaBand() {
    var x = t();
    return '<section class="cta-band"><div><h2 class="sec-title">' + esc(x.ctaBandTitle) + '</h2><p class="lead">' + esc(x.ctaBandBody) + '</p></div><div class="cta-row">' + btn(x.cta, '#order', 'primary', 'lg', true) + '</div></section>';
  }

  var views = {
    home: function () {
      var x = t();
      return '<section class="hero"><div class="hero-text"><p class="nk-label"><b>' + esc(x.status) + ' · </b>' + esc(x.heroLabel) + '</p>' +
        '<h1 class="display">' + esc(x.heroA) + '<br>' + esc(x.heroB) + '<em>' + esc(x.heroEm) + '</em></h1><p class="lead">' + esc(x.heroLead) + '</p>' +
        '<div class="cta-row">' + btn(x.cta, '#order', 'primary', 'lg', true) + btn(x.seeWork, '#work', null, 'lg') + '</div></div>' +
        '<div class="hero-sheet">' + (PROJECTS.length ? sheet(featured()[0]) : '') + specs([x.heroSpecs[0], [x.heroSpecs[1][0], String(PROJECTS.length)]].concat(x.heroSpecs.slice(2))) + '</div></section>' +
        '<section class="block">' + head(x.servicesLabel, x.servicesTitle, x.servicesLead) + '<div class="grid-4">' + SERVICES.map(function (s) { return service(s, false); }).join('') + '</div></section>' +
        '<section class="block">' + head(x.processLabel, x.processTitle) + process(-1) + '</section>' +
        '<section class="block">' + head(x.workLabel, x.workTitle) + '<div class="grid-4 sheets">' + featured().map(sheet).join('') + '</div><div class="more">' + btn(x.seeWork, '#work', null, null, true) + '</div></section>' +
        (NEWS.length ? '<section class="block">' + head(x.newsLabel, x.newsTitle, x.newsLead) + '<div class="news-list">' + NEWS.slice(0, 3).map(newsCard).join('') + '</div>' + (NEWS.length > 3 ? '<div class="more">' + btn(x.allNews, '#news', null, null, true) + '</div>' : '') + '</section>' : '') +
        '<section class="block about-strip"><div>' + '<p class="nk-label">' + esc(x.aboutLabel) + '</p><h2 class="sec-title">' + esc(x.aboutTitle) + '</h2></div><div><p class="lead">' + esc(x.aboutBody) + '</p>' + timelineDims() + '</div></section>' +
        ctaBand();
    },
    services: function () {
      var x = t();
      return '<section class="block first">' + head('S-01 … S-04', x.servicesPageTitle, x.servicesPageLead, true) + '<div class="grid-2">' + SERVICES.map(function (s) { return service(s, true); }).join('') + '</div></section>' +
        fitChecker() +
        '<section class="block">' + head(x.processLabel, x.processTitle) + process(-1) + '</section>' + ctaBand();
    },
    work: function () {
      var x = t(), cats = ['all'].concat(Object.keys(CATS));
      var list = PROJECTS.filter(function (p) { return state.filter === 'all' || (state.filter === '3d' ? !!p.model : p.category === state.filter); });
      var has3d = PROJECTS.some(function (p) { return p.model; });
      if (has3d) cats.splice(1, 0, '3d');
      return '<section class="block first">' + head(PROJECTS.length + ' ' + x.shown, x.workPageTitle, x.workPageLead, true) +
        findBox() +
        '<div class="filters" role="group" aria-label="' + esc(x.aria.filter) + '">' + cats.map(function (c) {
          var n = c === 'all' ? PROJECTS.length : PROJECTS.filter(function (p) { return c === '3d' ? !!p.model : p.category === c; }).length;
          return '<button type="button" class="chip" data-filter="' + c + '" aria-pressed="' + (state.filter === c) + '">' + esc(c === 'all' ? x.all : c === '3d' ? x.with3d : CATS[c][lang]) + ' <span>' + n + '</span></button>';
        }).join('') + '</div>' +
        '<div class="grid-4 sheets" id="find-grid">' + list.map(sheet).join('') + '</div>' + findResults() + '</section>' + ctaBand();
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
        specs([[lang === 'sl' ? 'Lokacija' : 'Location', lang === 'sl' ? 'Škofja Loka, Slovenija' : 'Škofja Loka, Slovenia'], [lang === 'sl' ? 'Šola' : 'School', 'Šolski center Kranj'], ['CAD', lang === 'sl' ? 'SolidWorks 4 leta · CSWA · CSWA-AM' : 'SolidWorks 4 yrs · CSWA · CSWA-AM']].concat(x.heroSpecs.slice(2))) + '</div></div></section>' +
        '<section class="block">' + head(x.processLabel, x.processTitle) + process(-1) + '</section>' + ctaBand();
    },
    order: orderView,
    project: projectView,
    news: function () {
      var x = t();
      return '<section class="block first">' + head(x.newsLabel + ' · ' + NEWS.length, x.newsPageTitle, x.newsLead, true) +
        (NEWS.length ? '<div class="news-list">' + NEWS.map(newsCard).join('') + '</div>' : '<p class="lead">' + esc(x.newsEmpty) + '</p>') + '</section>' + ctaBand();
    },
    post: postView
  };

  function newsCard(n) {
    var x = t();
    return '<a class="news-card" href="#n-' + esc(n.slug) + '">' +
      (n.photos && n.photos.length ? '<span class="news-card__img"><' + 'img src="' + esc(asset(n.photos[0])) + '" alt="" loading="lazy" decoding="async" draggable="false"></span>' : '<span class="news-card__img news-card__img--none" aria-hidden="true">' + logo() + '</span>') +
      '<span class="news-card__body"><span class="nk-label">' + (n.pinned ? '<b>' + esc(x.pinned) + ' · </b>' : '') + esc(fmtDate(n.date)) + '</span>' +
      '<span class="news-card__title">' + esc(P(n, 'title')) + '</span><span class="news-card__sum">' + esc(P(n, 'summary')) + '</span>' +
      '<span class="news-card__more">' + esc(x.readMore) + ' →</span></span></a>';
  }
  function richText(s) {
    return String(s || '').split(/\n{2,}/).map(function (block) {
      var lines = block.split('\n');
      if (lines.every(function (l) { return /^\s*-\s+/.test(l); })) return '<ul>' + lines.map(function (l) { return '<li>' + esc(l.replace(/^\s*-\s+/, '')) + '</li>'; }).join('') + '</ul>';
      return '<p>' + lines.map(esc).join('<br>') + '</p>';
    }).join('');
  }
  function postView() {
    var x = t(), n = newsBySlug(currentSlug()), photos = n.photos || [];
    var i = NEWS.indexOf(n), next = NEWS[i + 1];
    return '<section class="block first post">' +
      '<a class="back" href="#news">← ' + esc(x.allNews) + '</a>' +
      head(fmtDate(n.date) + (n.pinned ? ' · ' + x.pinned : ''), P(n, 'title'), P(n, 'summary'), true) +
      '<div class="post-grid">' +
      (photos.length ? '<button type="button" class="nk-sheet__art project-art post-cover" data-lb="0" aria-label="' + esc(x.openPhoto) + '"><' + 'img class="sheet-photo" src="' + esc(asset(photos[0])) + '" alt="" draggable="false"></button>' : '') +
      '<div class="post-body">' + richText(P(n, 'body')) + '<div class="cta-row">' + btn(x.cta, '#order', 'primary', null, true) + '</div></div></div>' +
      (photos.length > 1 ? '<div class="gallery"><p class="nk-label">' + esc(x.photos) + ' · ' + photos.length + '</p><div class="photos">' + photos.map(function (ph, k) { return '<button type="button" data-lb="' + k + '" aria-label="' + esc(x.openPhoto + ' ' + (k + 1) + ' / ' + photos.length) + '"><' + 'img src="' + esc(asset(ph)) + '" alt="" loading="lazy" decoding="async" draggable="false"></button>'; }).join('') + '</div></div>' : '') +
      (next ? '<a class="next-project" href="#n-' + esc(next.slug) + '"><span class="nk-label">' + esc(x.newsLabel) + '</span><span class="sub">' + esc(P(next, 'title')) + ' →</span></a>' : '') +
      '</section>' + ctaBand();
  }

  function projectView() {
    var x = t(), p = bySlug(currentSlug()), i = PROJECTS.indexOf(p);
    var next = PROJECTS[(i + 1) % PROJECTS.length];
    var m = p.model;
    var photos = p.photos || [];
    var stage = m
      ? '<div class="nk-viewer" id="viewer" data-src="' + esc(asset(m.file)) + '" data-format="' + esc(m.format || '') + '" role="img" aria-label="' + esc(x.viewerLabel + ': ' + P(p, 'title')) + '"><div class="nk-viewer__msg" id="viewer-msg">' + esc(x.loading3d) + '</div></div>' +
        '<p class="viewer-hint">' + esc(x.viewerHint) + '</p>'
      : (photos.length ? '<button type="button" class="nk-sheet__art project-art" data-lb="0" aria-label="' + esc(x.openPhoto) + '">' + art(p) + '</button>' : '<div class="nk-sheet__art project-art">' + art(p) + '</div>');
    var rows = [[x.pCategory, cat(p)], [x.pYear, String(p.year)]];
    if (p.materials) rows.push([x.pMaterials, p.materials]);
    if (m) rows.push([x.pModel, x.interactive]);
    var details = P(p, 'details');
    return '<section class="block first project">' +
      '<a class="back" href="#work">← ' + esc(x.allWork) + '</a>' +
      head(sheetNo(p) + ' · ' + cat(p) + ' · ' + p.year, P(p, 'title'), P(p, 'description'), true) +
      '<div class="project-grid"><div class="project-stage">' + stage + '</div><aside class="project-side">' + specs(rows) +
      (details ? '<div class="project-details">' + details.split(/\n{2,}/).map(function (s) { return '<p>' + esc(s) + '</p>'; }).join('') + '</div>' : '') +
      '<div class="cta-row">' + btn(x.cta, '#order', 'primary', null, true) + '</div></aside></div>' +
      (photos.length ? '<div class="gallery"><p class="nk-label">' + esc(x.photos) + ' · ' + photos.length + '</p><div class="photos">' + photos.map(function (ph, i) { return '<button type="button" data-lb="' + i + '" aria-label="' + esc(x.openPhoto + ' ' + (i + 1) + ' / ' + photos.length) + '"><' + 'img src="' + esc(asset(ph)) + '" alt="" loading="lazy" decoding="async" draggable="false"></button>'; }).join('') + '</div></div>' : '') +
      relRow(p, next) +
      (next && next !== p ? '<a class="next-project" href="#p-' + esc(next.slug) + '"><span class="nk-label">' + esc(x.nextProject) + '</span><span class="sub">' + esc(P(next, 'title')) + ' →</span></a>' : '') +
      '</section>' + ctaBand();
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
        viewer = v; var msg = document.getElementById('viewer-msg'); if (msg) msg.remove();
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
      '<div class="find-row"><input class="nk-input" id="find-q" type="search" autocomplete="off" spellcheck="false" placeholder="' + esc(f.ph) + '" value="' + esc(state.q) + '" aria-describedby="find-out">' +
      '<button type="button" class="chip find-clear" data-find-clear aria-label="' + esc(f.clear) + '"' + (state.q ? '' : ' hidden') + '>✕</button></div>' +
      '<p class="nk-label find-out" id="find-out" role="status" aria-live="polite"></p></div>';
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
  }

  // ---------- Fit check (#services): will a part fit the X2D build volume in one piece? ----------
  // Self-contained: remove fitChecker()…fitToOrder(), the fitChecker() call in views.services, the two
  // data-fit handlers below, T.*.fit in content.js and the .fit-* rules in page.css.
  var BED = [256, 256, 260]; // X × Y × Z in mm, Bambu Lab X2D (from the news post "bambu-lab-x2d")
  state.fit = { l: '', w: '', h: '' };
  function fitNum(v) { var n = parseFloat(String(v).replace(',', '.')); return n > 0 && n < 100000 ? Math.round(n * 10) / 10 : 0; }
  function fitFmt(n) { var s = String(n); return lang === 'sl' ? s.replace('.', ',') : s; }
  function fitDims(a) { return a.map(fitFmt).join(' × '); }
  function fitCalc() {
    var d = [fitNum(state.fit.l), fitNum(state.fit.w), fitNum(state.fit.h)];
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

  function orderView() {
    var x = t(), o = state.order, e = state.errors, st = state.step, body = '';
    var keyMap = { cad: 0, print: 1, iot: 2, build: 3 };
    if (st === 0) {
      body = '<h2 class="sub">' + esc(x.q1) + '</h2><p class="hint">' + esc(x.q1h) + '</p><div class="grid-2 choices">' + SERVICES.map(function (s) {
        var on = o.services.indexOf(s.key) >= 0;
        return '<label class="nk-choice"><input type="checkbox" id="svc-' + s.key + '" data-svc="' + s.key + '"' + (on ? ' checked' : '') + '><span class="nk-choice__t">' + esc(L(s.title)) + '</span><span class="nk-choice__d">' + esc(L(s.body)) + '</span></label>';
      }).join('') + '</div>' + (e.services ? '<p class="err" role="alert">' + esc(x.errService) + '</p>' : '');
    } else if (st === 1) {
      body = '<h2 class="sub">' + esc(x.q2) + '</h2><div class="form">' +
        field('what', x.fWhat, '<textarea class="nk-input" id="f-what" data-f="what" placeholder="' + esc(x.fWhatPh) + '">' + esc(o.what) + '</textarea>', e.what ? x.errWhat : x.fWhatH, e.what, true) +
        field('qty', x.fQty, '<input class="nk-input" id="f-qty" data-f="qty" type="number" min="1" value="' + esc(o.qty) + '">') +
        field('deadline', x.fDeadline, '<input class="nk-input" id="f-deadline" data-f="deadline" type="date" value="' + esc(o.deadline) + '">') +
        field('files', x.fFiles, select('files', x.fFilesO, o.files)) +
        field('mat', x.fMat, select('mat', x.fMatO, o.mat)) + '</div>';
    } else if (st === 2) {
      body = '<h2 class="sub">' + esc(x.q3) + '</h2><div class="form">' +
        field('name', x.fName, '<input class="nk-input" id="f-name" data-f="name" autocomplete="name" value="' + esc(o.name) + '">', e.name ? x.errName : null, e.name) +
        field('email', x.fEmail, '<input class="nk-input" id="f-email" data-f="email" type="email" autocomplete="email" value="' + esc(o.email) + '">', e.email ? x.errEmail : null, e.email) +
        '<div class="hp" aria-hidden="true"><label for="f-website">Website</label><input id="f-website" data-f="website" tabindex="-1" autocomplete="off"></div>' +
        field('note', x.fNote, '<textarea class="nk-input" id="f-note" data-f="note">' + esc(o.note) + '</textarea>', x.fNoteH, false, true) + '</div>';
    } else {
      var brief = briefText();
      if (state.send === 'sent') {
        body = '<div class="sent" role="status"><span class="nk-tag nk-tag--ok">' + esc(x.sentTag) + '</span><h2 class="sub">' + esc(x.sentTitle) + '</h2><p class="hint">' + esc(x.sentBody) + '</p></div>' +
          '<pre class="brief" tabindex="0">' + esc(briefText()) + '</pre>';
      } else {
      body = (state.send === 'sending' ? '<p class="nk-label" role="status">' + esc(x.sending) + '</p>' : '') + (state.send === 'error' || state.send === 'limited' ? '<p class="err" role="alert">' + esc(state.send === 'limited' ? x.sendLimited : x.sendFail) + '</p>' : '') +
        '<h2 class="sub">' + esc(x.briefTitle) + '</h2><p class="hint">' + esc(x.briefLead) + '</p>' +
        '<div class="brief-grid"><pre class="brief" id="brief" tabindex="0">' + esc(brief) + '</pre><div class="brief-side"><p class="nk-label">' + esc(x.estimate) + '</p>' + estimate() +
        '<div class="cta-row"><button type="button" class="nk-btn nk-btn--primary" id="copy">' + esc(x.copy) + '</button><span class="copy-msg" id="copy-msg" role="status"></span></div>' +
        '<p class="nk-label">' + esc(x.sendVia) + '</p>' + (CONTACT_EMAIL ? '<p class="mail">' + esc(CONTACT_EMAIL) + '</p>' : '') +
        '<a class="nk-btn nk-btn--sm" href="' + LINKEDIN + '" target="_blank" rel="noopener">' + esc(x.linkedin) + '<span class="nk-btn__arrow" aria-hidden="true">↗</span></a></div></div>';
      }
    }
    var steps = '<ol class="nk-process wiz" style="--steps:4">' + x.steps.map(function (s, i) { return '<li' + (i === st ? ' class="is-active"' : '') + '><span class="nk-process__n">' + String(i + 1).padStart(2, '0') + ' / 04</span><span class="nk-process__t">' + esc(s) + '</span></li>'; }).join('') + '</ol>';
    var nav = '<div class="wiz-nav">' + (st > 0 ? '<button type="button" class="nk-btn" id="back">' + esc(st === 3 ? x.edit : x.back) + '</button>' : '<span></span>') +
      (st < 3 ? '<button type="button" class="nk-btn nk-btn--primary nk-btn--lg" id="next">' + esc(st === 2 ? x.finish : x.next) + '<span class="nk-btn__arrow" aria-hidden="true">→</span></button>' : '') + '</div>';
    return '<section class="block first">' + head(x.orderLabel, x.orderTitle, x.orderLead, true) + steps + '<form class="wiz-body" id="wiz" novalidate>' + body + nav + '</form></section>';
  }
  function field(k, label, ctl, hint, err, full) {
    return '<div class="nk-field' + (err ? ' nk-field--error' : '') + (full ? ' full' : '') + '"><label class="nk-field__label" for="f-' + k + '">' + esc(label) + '</label>' + ctl + (hint ? '<span class="nk-field__hint">' + esc(hint) + '</span>' : '') + '</div>';
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
      x.fFiles + ' ' + x.fFilesO[o.files], x.fMat + ': ' + x.fMatO[o.mat], '', x.fName + ': ' + o.name, x.fEmail + ': ' + o.email, o.note ? x.fNote + ' ' + o.note : ''].join('\n').trim();
  }

  function frame(inner) {
    var x = t(), p = page();
    var zones = '<div class="zones zones-top" aria-hidden="true">' + [1, 2, 3, 4, 5, 6, 7, 8].map(function (n) { return '<span>' + n + '</span>'; }).join('') + '</div>' +
      '<div class="zones zones-side zl" aria-hidden="true"><span>A</span><span>B</span><span>C</span><span>D</span></div><div class="zones zones-side zr" aria-hidden="true"><span>A</span><span>B</span><span>C</span><span>D</span></div>';
    var nav = '<header class="top"><a class="wordmark" href="#home" aria-label="' + esc(x.aria.home) + '">' + logo() + '<span class="wm-text">nacekepa<span>.work</span></span></a><nav aria-label="' + esc(x.aria.main) + '">' +
      ['services', 'work', 'news', 'skills', 'about'].filter(function (k) { return k !== 'news' || NEWS.length; }).map(function (k) { return '<a href="#' + k + '"' + (p === k || (p === 'project' && k === 'work') || (p === 'post' && k === 'news') ? ' aria-current="page"' : '') + '>' + esc(x.nav[k]) + '</a>'; }).join('') +
      '</nav><div class="top-act"><div class="lang" role="group" aria-label="' + esc(x.aria.lang) + '"><button type="button" data-lang="en" aria-pressed="' + (lang === 'en') + '">EN</button><button type="button" data-lang="sl" aria-pressed="' + (lang === 'sl') + '">SL</button></div>' + btn(x.cta, '#order', 'primary', 'sm') + '</div></header>';
    var idx = PAGES.indexOf(p === 'project' ? 'work' : p === 'post' ? 'news' : p) + 1;
    var d = new Date().toISOString().slice(0, 10);
    var tb = '<footer class="foot"><div class="nk-tb" style="--tb-cols:6">' +
      cell(x.tb.title, '<span class="tb-brand">' + logo() + '<span>Nace Kepa · Engineering Studio</span></span>', 'wide', true, true) + cell(x.tb.drawn, 'N. Kepa') + cell(x.tb.loc, 'Škofja Loka, SI') + cell(x.tb.sheet, String(idx).padStart(2, '0') + ' / ' + String(PAGES.length).padStart(2, '0')) +
      cell(x.tb.scale, '1:1') + cell(x.tb.rev, 'B') + cell(x.tb.date, d) + cell(x.tb.contact, (CONTACT_EMAIL ? '<a href="mailto:' + esc(CONTACT_EMAIL) + '">' + esc(CONTACT_EMAIL) + '</a> · ' : '') + '<a href="' + LINKEDIN + '" target="_blank" rel="noopener">LinkedIn ↗</a>', 'wide', false, true) + cell(x.tb.order, '<a href="#order">' + esc(x.cta) + ' →</a>', 'wide', false, true) +
      cell('', esc(x.footerNote), 'full', false, true) + '</div><p class="copy">© ' + new Date().getFullYear() + ' Nace Kepa</p></footer>';
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
    else if (p === 'order') s = x.cta;
    else if (p !== 'home') s = x.nav[p] || '';
    return s ? s + ' · Nace Kepa' : 'Nace Kepa · ' + (lang === 'sl' ? 'Inženirski studio' : 'Engineering Studio');
  }
  function render(keepScroll) {
    var p = page();
    document.documentElement.lang = lang === 'sl' ? 'sl' : 'en';
    document.title = pageTitle(p);
    if (viewer) { viewer.dispose(); viewer = null; }
    closeLightbox();
    app.innerHTML = frame(views[p]());
    if (!keepScroll) window.scrollTo(0, 0);
    if (p === 'project') mountViewer();
    if (p === 'work') { findApply(); if (state.findFocus) { state.findFocus = false; var fq = document.getElementById('find-q'); if (fq) fq.focus(); } }
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
    if (el.hasAttribute('data-fit-go')) { fitToOrder(); return; }
    if (el.hasAttribute('data-find-clear')) { state.q = ''; var fq = document.getElementById('find-q'); fq.value = ''; findApply(); fq.focus(); return; }
    if (el.dataset.lang) { lang = el.dataset.lang; try { localStorage.setItem('nk-lang', lang); } catch (e) {} render(true); return; }
    if (el.dataset.filter) { state.filter = el.dataset.filter; render(true); return; }
    if (el.dataset.relCat) { state.filter = el.dataset.relCat; state.q = ''; return; }
    if (el.hasAttribute('data-rel-go')) { relToOrder(); return; }
    if (el.dataset.lb != null) { var pr = page() === 'post' ? newsBySlug(currentSlug()) : bySlug(currentSlug()); if (pr && pr.photos && pr.photos.length) openLightbox(pr.photos, +el.dataset.lb, P(pr, 'title')); return; }
    if (el.id === 'next') { ev.preventDefault(); readForm(); var ok = validate(); if (ok) state.step++; if (ok && state.step === 3) submitOrder(); render(true); var w = document.getElementById('wiz'); if (w) w.scrollIntoView({ block: 'start' }); return; }
    if (el.id === 'back') { ev.preventDefault(); readForm(); state.errors = {}; state.send = 'idle'; state.step = state.step === 3 ? 0 : state.step - 1; render(true); return; }
    if (el.id === 'copy') {
      var txt = briefText(), msg = document.getElementById('copy-msg');
      var fail = function () { msg.textContent = t().copyFail; var r = document.createRange(); r.selectNodeContents(document.getElementById('brief')); var s = getSelection(); s.removeAllRanges(); s.addRange(r); };
      try { navigator.clipboard.writeText(txt).then(function () { msg.textContent = t().copied; }, fail); } catch (e) { fail(); }
    }
  });
  app.addEventListener('input', function (ev) { if (ev.target.id === 'find-q') { state.q = ev.target.value; findApply(); return; } var k = ev.target.dataset && ev.target.dataset.fit; if (k) { state.fit[k] = ev.target.value; fitUpdate(); } });
  app.addEventListener('change', function (ev) {
    var k = ev.target.dataset.svc; if (!k) return;
    var a = state.order.services, i = a.indexOf(k);
    if (ev.target.checked && i < 0) a.push(k); if (!ev.target.checked && i >= 0) a.splice(i, 1);
    if (a.length) state.errors = {};
  });
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
  // Search keys: "/" jumps to the search on #work from anywhere; Esc in the box clears it.
  document.addEventListener('keydown', function (ev) {
    var tg = ev.target, typing = tg && (/^(INPUT|TEXTAREA|SELECT)$/.test(tg.tagName) || tg.isContentEditable);
    if (ev.key === 'Escape' && tg && tg.id === 'find-q' && state.q) { state.q = ''; tg.value = ''; findApply(); ev.preventDefault(); return; }
    if (ev.key !== '/' || typing || lb || ev.ctrlKey || ev.metaKey || ev.altKey) return;
    ev.preventDefault();
    if (page() === 'work') { var fq = document.getElementById('find-q'); if (fq) fq.focus(); }
    else { state.findFocus = true; location.hash = 'work'; }
  });
  window.addEventListener('hashchange', function () { render(false); });
  render(true);
})();
