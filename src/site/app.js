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
  // Landing pages (2026-11-01): /portfolio/<slug>/ and /news/<slug>/ (+ /sl/…) are the same site with <meta name="nk-start">
  // naming the sheet / post to open when there is no hash. The first in-app navigation moves the address back to / or /sl/
  // (see the hashchange listener at the end), so every other view keeps its usual address.
  function landingView() { var m = /^\/(?:sl\/)?(portfolio|news)\/([a-z0-9-]+)\/?$/.exec(location.pathname); if (m) return (m[1] === 'news' ? 'n-' : 'p-') + m[2]; var ss = /^\/(?:sl\/)?services\/([a-z0-9-]+)\/?$/.exec(location.pathname); if (ss) return 's-' + ss[1]; /* Service sheets (2026-11-26) */ var sv = /^\/(?:sl\/)?(news|services|portfolio|skills|about|glossary)\/?$/.exec(location.pathname); return sv ? (sv[1] === 'portfolio' ? 'work' : sv[1]) : ''; } // /news/ index (blog package, 2026-11-02) + section pages /services/, /portfolio/, /skills/, /about/ (2026-11-25)
  var START_VIEW = (function () { var m = document.querySelector('meta[name="nk-start"]'); return m ? String(m.getAttribute('content') || '') : landingView(); })();
  var LANDING = !!START_VIEW;
  var LAND_TITLE = LANDING ? document.title : '', LAND_LANG = document.documentElement.lang === 'sl' ? 'sl' : 'en'; // Section pages (2026-11-25): a landing page keeps the title it was built with while it shows the view it opened with
  // EN/SL on a landing page: keep the address on the right language (/portfolio/… ↔ /sl/portfolio/…).
  // Language package (2026-11-09): the address follows the language on every view — / for English, /sl/ for Slovenian
  // (landing pages: /portfolio/<slug>/ ↔ /sl/portfolio/<slug>/, /news/ ↔ /sl/news/) — so a copied address, a bookmark or
  // Back always opens the page in the language the visitor was reading, and the EN / SL switch is a real link to the other
  // language's address (right-click → copy, middle-click → new tab). Only the site's own paths are touched. To remove: put
  // landingLang() back (the LANDING-only replaceState: "/sl" + the path without it) and the two <button data-lang> elements in frame().
  function langPath() {
    var p = location.pathname; if (!/^\/(?:sl\/?)?(?:(?:portfolio|news|services)\/[a-z0-9-]+\/?|(?:news|services|portfolio|skills|about|glossary)\/?)?$/.test(p)) return;
    var isSl = /^\/sl(?:\/|$)/.test(p), want = lang === 'sl'; if (isSl === want) return;
    var np = langHref(lang, p);
    try { history.replaceState(history.state, '', np + location.search + location.hash); state.navHref = location.href; } catch (e) {}
  }
  function langHref(l, p) { // the address of this view in language l (path only; the hash is added by the caller)
    var rest = String(p == null ? location.pathname : p).replace(/^\/sl(?=\/|$)/, '') || '/';
    return l === 'sl' ? '/sl' + (rest === '/' ? '/' : rest) : rest;
  }
  function siteUrl(hash) { return 'https://nacekepa.work/' + (lang === 'sl' ? 'sl/' : '') + (hash || ''); } // the public address of a view in the current language
  function langLinkHash(l) { var h = (location.hash || '').slice(1).replace(/^(en|sl)-?/, ''); return h ? '#' + (l === 'en' ? 'en-' : '') + h : ''; } // the view part of the hash; the English link keeps the explicit #en- prefix, so opened in a new tab it stays English even for a reader whose saved language is Slovenian (/sl/ is always Slovenian)
  function hashPath() { var h = (location.hash || '').replace('#', ''); return h || START_VIEW; }
  var state = { send: 'idle', filter: 'all', step: 0, order: { website: '', services: [], what: '', qty: '1', deadline: '', files: 0, mat: 0, name: '', email: '', note: '' }, errors: {} };
  var app = document.getElementById('app');
  // Projects come from src/data/projects.json, inlined at build time (the admin dashboard edits that file).
  var PROJECTS = (window.NK_PROJECTS || []).filter(function (p) { return !p.hidden; });
  // News comes from src/data/news.json (also edited in the admin): pinned first, then newest.
  var TODAY = new Date().toISOString().slice(0, 10);
  var NEWS = (window.NK_NEWS || []).filter(function (n) { return !n.hidden && !(n.date && n.date > TODAY); }) // a post dated in the future is scheduled (blog package, 2026-11-02).sort(function (x, y) { return (y.pinned ? 1 : 0) - (x.pinned ? 1 : 0) || String(y.date).localeCompare(String(x.date)); });
  var PAGES = ['home', 'services', 'work', 'news', 'skills', 'about', 'studio', 'order', 'gift', 'mine', 'glossary'];
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
    var h = hashPath();
    var m = /^(en|sl)-?(.*)$/.exec(h);
    if (m) { lang = m[1]; try { localStorage.setItem('nk-lang', lang); } catch (e) {} h = m[2]; }
    var qi = h.indexOf('?'), qs = qi >= 0 ? h.slice(qi + 1) : ''; if (qi >= 0) { if (h.slice(0, qi) === 'work' && location.hash !== state.findHash) findRead(qs); h = h.slice(0, qi); }
    if (h === 'compare' && PROJECTS.length) { cmpRead(qs); return 'compare'; }
    if (h === 'services') { state.tool = (/(?:^|&)tool=([a-z]+)/.exec(qs) || [])[1] || ''; if (state.bg && location.hash !== state.clHash) { state.clHash = location.hash; clRead(state.tool, qs); } } // clRead: Calculation links (2026-11-17)
    if (h === 'order' && state.dh && location.hash !== state.dh.hash) { state.dh.hash = location.hash; dhRead(qs); } // Draft hand-over (2026-11-19)
    if (h === 'contact') { state.ctGo = true; return 'about'; } // Contact package (2026-10-29): #contact opens the contact card on #about
    if (/^p-/.test(h) && bySlug(h.slice(2))) { rlRead(h.slice(2), qs); return 'project'; } // rlRead: Redline notes (2026-11-24)
    if (/^n-/.test(h) && newsBySlug(h.slice(2))) return 'post';
    if (/^s-/.test(h) && svById(h.slice(2))) return 'service'; // Service sheets (2026-11-26)
    if (h === 'profile') { if (location.hash !== state.pfHash) { state.pfHash = location.hash; pfRead(qs); } return 'profile'; } // Studio profile NK-A (2026-11-25)
    if (h === 'glossary') { if (!GL.length) return 'home'; if (location.hash !== state.glHash) { state.glHash = location.hash; glRead(qs); } return 'glossary'; } // Glossary NK-G (2026-11-27)
    if (h === 'gift' && !giftOn()) return 'home';
    return PAGES.indexOf(h) >= 0 ? h : 'home'; }
  // A hash with a language prefix (#en-…, #sl-… from shared links and feeds) would switch the language back on render,
  // so the EN/SL buttons rewrite the prefix to the chosen language.
  function langHash() { var h = location.hash; if (/^#(en|sl)-?/.test(h)) try { history.replaceState(history.state, '', h.replace(/^#(en|sl)/, '#' + lang)); } catch (e) {} }
  function currentSlug() { var h = hashPath().replace(/^(en|sl)-?/, '').replace(/\?.*$/, ''); return h.slice(2); } // a "?…" after the slug (Redline notes link) is not part of it

  // ---------- Real addresses package (2026-11-26) ----------
  // The header navigation, the wordmark, every project card, news card and service-sheet link carry the real address of
  // their page (/services/, /portfolio/<slug>/, /news/<slug>/, /services/<id>/ — /sl/… in Slovenian) in href, so "copy link
  // address", "open in a new tab", the status bar and search engines get the page with its own title and link preview.
  // A plain click still moves inside the app: the click handler reads data-ra (the in-app hash) and sets it, exactly as the
  // old href="#…" did. To remove: raPath() / ra(), the data-ra block at the top of the click handler, and turn every
  // ' + ra('#x') + ' back into href="#x" (the two data-ra selectors in findApply() and render() fall back to href by themselves).
  var RA_SEC = { services: '/services/', work: '/portfolio/', news: '/news/', skills: '/skills/', about: '/about/', glossary: '/glossary/' };
  function raPath(h) { // '#services' → '/services/' ('' = the view has no page of its own)
    var pre = lang === 'sl' ? '/sl' : '', m, n; h = String(h).replace(/^#/, '');
    if (h === 'home') return pre + '/';
    if (RA_SEC[h]) return pre + RA_SEC[h];
    if ((m = /^p-([a-z0-9-]+)$/.exec(h)) && bySlug(m[1])) return pre + '/portfolio/' + m[1] + '/';
    if ((m = /^n-([a-z0-9-]+)$/.exec(h)) && (n = newsBySlug(m[1])) && !n.draft) return pre + '/news/' + m[1] + '/';
    if ((m = /^s-([a-z0-9-]+)$/.exec(h)) && svById(m[1])) return pre + '/services/' + m[1] + '/';
    return '';
  }
  function ra(h) { var p = raPath(h); return p ? 'href="' + p + '" data-ra="' + esc(h) + '"' : 'href="' + esc(h) + '"'; }

  function btn(label, href, variant, size, arrow) {
    return '<a class="nk-btn' + (variant ? ' nk-btn--' + variant : '') + (size ? ' nk-btn--' + size : '') + '" ' + (String(href).charAt(0) === '#' ? ra(href) : 'href="' + href + '"') + '>' + esc(label) + (arrow ? '<span class="nk-btn__arrow" aria-hidden="true">→</span>' : '') + '</a>';
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
    return '<a class="nk-sheet" ' + ra('#p-' + p.slug) + ' data-cat="' + esc(p.category) + '"><div class="nk-sheet__head"><span class="nk-label">' + sheetNo(p) + '</span><span class="nk-label">' + (slRead().indexOf(p.slug) >= 0 ? '<b class="sl-mark" title="' + esc(t().sl.on) + '"><span aria-hidden="true">★ </span><span class="vh">' + esc(t().sl.on) + ' · </span></b>' : '') + (p.model ? '<b class="has3d">3D · </b>' : '') + esc(cat(p)) + ' · ' + esc(p.year) + '</span></div>' +
      '<div class="nk-sheet__art">' + art(p, hl === 'h2') + '</div><div class="nk-sheet__foot"><' + h + ' class="nk-sheet__title">' + esc(P(p, 'title')) + '</' + h + '><p class="nk-sheet__desc">' + esc(P(p, 'description')) + '</p></div></a>';
  }
  function sheetH2(p) { return sheet(p, 'h2'); }
  function featured() { var f = PROJECTS.filter(function (p) { return p.featured; }); return (f.length ? f : PROJECTS).slice(0, 4); }
  // No published rates (Nace, 2026-11-27): the service cards, the service sheets and the Studio profile carry no rate line.
  // The prices in settings.json are used only by the estimate tools and the admin.
  function service(s, full) {
    var x = t();
    return '<article class="nk-service" id="' + s.id + '"><div class="nk-service__top"><span class="nk-service__code">' + s.code + '</span><span class="nk-label">' + esc(s.time ? L(s.time) : x.onRequest) + '</span></div>' +
      (full ? '<h2' : '<h3') + ' class="nk-service__title">' + (full ? '<a class="sv-tl" ' + ra('#s-' + s.id) + '>' + esc(L(s.title)) + '</a>' : esc(L(s.title))) + (full ? '</h2>' : '</h3>') + '<p>' + esc(L(s.body)) + '</p>' +
      (full ? '<div class="svc-cols"><div><p class="nk-label">' + esc(x.deliverables) + '</p><ul>' + L(s.get).map(function (g) { return '<li>' + esc(g) + '</li>'; }).join('') + '</ul></div><div><p class="nk-label">' + esc(x.needs) + '</p><ul>' + L(s.need).map(function (g) { return '<li>' + esc(g) + '</li>'; }).join('') + '</ul></div></div>'
        : '<ul>' + L(s.get).slice(0, 3).map(function (g) { return '<li>' + esc(g) + '</li>'; }).join('') + '</ul>') + 
      '<div class="svc-act">' + (full ? '<button type="button" class="nk-btn nk-btn--sm" data-hm-go="' + s.key + '">' + esc(x.quote) + '<span class="nk-btn__arrow" aria-hidden="true">→</span></button><a class="svc-more" ' + ra('#s-' + s.id) + '>' + esc(x.sv.more) + '<span class="vh"> — ' + esc(L(s.title)) + '</span> →</a>' : '<button type="button" class="nk-btn nk-btn--sm" data-hm-go="' + s.key + '">' + esc(x.quote) + '<span class="nk-btn__arrow" aria-hidden="true">→</span></button><a class="svc-more" ' + ra('#s-' + s.id) + '>' + esc(x.hm.svcMore) + '<span class="vh"> — ' + esc(L(s.title)) + '</span></a>') + '</div></article>';
  }
  // labelHtml (optional) replaces the escaped label, e.g. to wrap a date in <time>.
  function head(label, title, lead, h1, labelHtml) {
    var tag = h1 ? 'h1' : 'h2';
    return '<header class="sec-head"><div><p class="nk-label">' + (labelHtml || esc(label)) + '</p><' + tag + ' class="' + (h1 ? 'page-title' : 'sec-title') + '">' + esc(title) + '</' + tag + '></div>' + (lead ? '<p class="lead">' + esc(lead) + '</p>' : '') + '</header>';
  }
  // Home for orders (2026-11-26): the quick-start card in the hero — one button per service with its turnaround (no rates);
  // hmGo() ticks that service in the order form and opens the form at the next step ("What should it do?"). To remove: hmQuick(),
  // hmGo(), the data-hm-go line in the click handler, hm: in content.js, the "Home for orders" block at the end of page.css, and put
  // views.home / the home button in service() back from git (commit before 2026-11-26).
  function hmQuick() {
    var x = t(), h = x.hm;
    return '<div class="hm-qs"><div class="hm-qs__head"><span class="nk-label">' + esc(h.qsLabel) + '</span><span class="nk-label">' + esc(x.orderLabel.split(' · ')[1] || '') + '</span></div><h2 class="hm-qs__t">' + esc(h.qsTitle) + '</h2><div class="hm-qs__opts">' +
      SERVICES.map(function (s) { var r = ''; /* no rates on the home page (2026-11-26) */ return '<button type="button" class="hm-qs__opt" data-hm-go="' + s.key + '"><span class="nk-service__code">' + s.code + '</span><span class="hm-qs__n">' + esc(L(s.title)) + '</span><span class="hm-qs__m">' + esc((s.time ? L(s.time) : x.onRequest) + (r ? ' · ' + r : '')) + '</span><span class="hm-qs__a" aria-hidden="true">→</span></button>'; }).join('') +
      '</div><p class="hm-qs__hint">' + esc(h.qsHint) + '</p><p class="hm-qs__alt"><a href="' + tlHash('plan') + '">' + esc(h.qsNot) + ' →</a>' + (CONTACT_EMAIL ? '<a href="' + ctMail(x.ct.subject) + '">' + esc(h.qsMail) + ' →</a>' : '') + '</p></div>';
  }
  function hmGo(k) {
    var o = state.order; if (state.send === 'sent') { location.hash = 'order'; return; }
    if (k && o.services.indexOf(k) < 0) o.services.push(k);
    state.step = o.services.length ? 1 : 0; state.errors = {}; location.hash = 'order';
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
      // Home for orders (2026-11-26, Nace: "prenovi home z najboljšim order ratingom"): the page is ordered as a path to the order form —
      // hero with the three assurances + quick start (pick a service → the form opens with it ticked), how it works in three steps,
      // proof (selected work), services with rates and their own "Request a quote", news, about, final call. On phones the order
      // button stays at the bottom of the screen (.hm-bar). Only facts the site already states. hmQuick() / hmGo() below.
      var x = t(), h = x.hm, pm = promo();
      return '<section class="hero hm-hero"><div class="hero-text"><p class="nk-label"><b>' + esc(x.status) + ' · </b>' + esc(x.heroLabel) + '</p>' +
        '<h1 class="display">' + esc(x.heroA + ' ' + x.heroB + x.heroEm) + '</h1><p class="lead">' + esc(x.heroLead) + '</p>' +
        '<ul class="hm-ok">' + h.ok.map(function (v) { return '<li>' + esc(v) + '</li>'; }).join('') + '</ul>' +
        '<div class="cta-row">' + btn(ctaText(), '#order', 'primary', 'lg', true) + btn(x.seeWork, '#work', null, 'lg') + '</div><p class="hm-micro">' + esc(h.micro) + '</p>' +
        (pm ? '<a class="hm-promo" href="#order"><span class="nk-tag nk-tag--rev">' + esc(x.promo.label) + (pm.until ? ' · ' + esc(x.promo.until.replace('{d}', pcDate(pm.until))) : '') + '</span><b>' + esc(L(pm.title)) + '</b><span aria-hidden="true">→</span></a>' : '') + '</div>' +
        hmQuick() + '</section>' +
        '<section class="block hm-how">' + head(h.howLabel, h.howTitle) + '<ol class="hm-steps">' + h.how.map(function (st, i) { return '<li><span class="hm-n">' + String(i + 1).padStart(2, '0') + '</span><h3>' + esc(st[0]) + '</h3><p>' + esc(st[1]) + '</p></li>'; }).join('') + '</ol>' +
        '<div class="hm-act">' + btn(ctaText(), '#order', 'primary', null, true) + '<a class="hm-link" ' + ra('#about') + '>' + esc(h.howMore) + ' →</a></div></section>' +
        '<section class="block">' + head(x.workLabel, x.workTitle) + '<div class="grid-4 sheets">' + featured().map(sheet).join('') + '</div><div class="more">' + btn(x.seeWork + ' · ' + PROJECTS.length, '#work', null, null, true) + '</div></section>' +
        '<section class="block">' + head(x.servicesLabel, x.servicesTitle, x.servicesLead) + promoBand('promo--home') + '<div class="grid-4">' + SERVICES.map(function (s) { return service(s, false); }).join('') + '</div>' + tlHome() + '</section>' +
        (NEWS.length ? '<section class="block">' + head(x.newsLabel, x.newsTitle, x.newsLead) + '<div class="news-list">' + NEWS.slice(0, 3).map(newsCard).join('') + '</div>' + '<div class="more">' + btn(x.allNews + ' · ' + NEWS.length, '#news', null, null, true) + '</div>' + '</section>' : '') +
        '<section class="block about-strip"><div>' + '<p class="nk-label">' + esc(x.aboutLabel) + '</p><h2 class="sec-title">' + esc(x.aboutTitle) + '</h2></div><div><p class="lead">' + esc(x.aboutBody) + '</p>' + timelineDims() + '</div></section>' +
        ctaBand() + '<div class="hm-bar"><span>' + esc(h.ok[0]) + '</span>' + btn(ctaText(), '#order', 'primary', null, true) + '</div>';
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
        tlWrap('plate', pbBox()) +
        (pcOn() ? (PRICE_LIST ? tlWrap('prices', pcList()) : '') + tlWrap('quote', qcBox()) : '') + tlWrap('parts', bmBox()) + (srOn() ? tlWrap('series', srBox()) : '') + (bgOn() ? tlWrap('budget', bgBox()) : '') + (mxOn() ? tlWrap('matprice', mxBox()) : '') + (scOn() ? tlWrap('schedule', scBox()) : '') + faqBox() +
        '<section class="block">' + head(x.processLabel, x.processTitle) + process(-1) + '</section>' + ctaBand();
    },
    work: function () {
      var x = t(), cats = ['all'].concat(Object.keys(CATS));
      var list = PROJECTS.filter(function (p) { return state.filter === 'all' || (state.filter === '3d' ? !!p.model : p.category === state.filter); });
      var has3d = PROJECTS.some(function (p) { return p.model; });
      if (has3d) cats.splice(1, 0, '3d');
      return '<section class="block first">' + head(PROJECTS.length + ' ' + x.shown, x.workPageTitle, x.workPageLead, true) +
        sxBox() + slBox() +
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
        SKILLS.map(function (g, i) { return '<div class="skill-group"><h2 class="sub">' + esc(g[lang]) + '</h2>' + skSpecs(g.items) + skFoot(i) + '</div>'; }).join('') + '</div>' + skLegend() + glLink('sk') + '</section>' +
        '<section class="block"><p class="nk-label">' + esc(x.certs) + '</p><div class="certs"><div class="cert"><span class="nk-tag nk-tag--ok">CSWA</span><span>Certified SolidWorks Associate</span></div><div class="cert"><span class="nk-tag nk-tag--ok">CSWA-AM</span><span>Certified SolidWorks Associate — Additive Manufacturing</span></div></div></section>' + ctaBand();
    },
    about: function () {
      var x = t();
      return '<section class="block first about-page">' + head(x.aboutLabel, x.aboutTitle, null, true) + '<div class="about-cols"><div><p class="lead">' + esc(x.aboutBody) + '</p>' + timelineDims() + '</div><div><p class="nk-label">' + esc(x.facts) + '</p>' +
        specs(pfFacts()) + pfLink() + ctCard() + '</div></div></section>' +
        '<section class="block">' + head(x.processLabel, x.processTitle) + process(-1) + '</section>' + ctaBand();
    },
    glossary: glView, // Glossary NK-G (2026-11-27)
    order: orderView,
    gift: giftView,
    mine: mnView, // My corner (2026-11-02)
    project: projectView,
    news: function () {
      var x = t();
      return '<section class="block first">' + head(x.newsLabel + ' · ' + NEWS.length, x.newsPageTitle, x.newsLead, true) +
        (NEWS.length ? blogYears() + '<div class="news-list" id="blog-list">' + blogList().map(newsCard).join('') + '</div>' + feedBox() : '<p class="lead">' + esc(x.newsEmpty) + '</p>') + '</section>' + ctaBand();
    },
    post: postView,
    compare: function () { return cmpView(); },
    profile: function () { return pfView(); }, // Studio profile NK-A (2026-11-25)
    service: function () { return svView(); }, // Service sheets (2026-11-26)
    studio: function () { return stView(); }
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
    return '<a class="news-card" ' + ra('#n-' + n.slug) + '>' +
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
      (prev ? '<a class="next-project prev-project" ' + ra('#n-' + prev.slug) + ' rel="prev"><span class="nk-label">' + esc(x.rd.prev) + '</span><span class="sub">← ' + esc(P(prev, 'title')) + '</span></a>' : '<span></span>') +
      (next ? '<a class="next-project" ' + ra('#n-' + next.slug) + ' rel="next"><span class="nk-label">' + esc(x.rd.next) + '</span><span class="sub">' + esc(P(next, 'title')) + ' →</span></a>' : '<span></span>') + '</nav>';
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
      '</section>' + blogMentions(n) + ctaBand();
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
      '<a class="back" ' + ra('#work') + '>← ' + esc(x.allWork) + '</a>' +
      head(sheetNo(p) + ' · ' + cat(p) + ' · ' + p.year, P(p, 'title'), P(p, 'description'), true) +
      '<div class="project-grid"><div class="project-stage">' + (m ? stage : '<div class="rl-stage">' + stage + rlLayer() + '</div>') + rlBox() /* Redline notes (2026-11-24) */ + '</div><div class="project-side">' + specs(rows).replace('</dl>', sdRows(p) + '</dl>') +
      (details ? '<div class="project-details">' + details.split(/\n{2,}/).map(function (s) { return '<p>' + esc(s) + '</p>'; }).join('') + '</div>' : '') +
      '<div class="cta-row">' + btn(ctaText(), '#order', 'primary', null, true) + askLink(p) + '</div>' + slToggle(p) + cmpFrom(p) + shareBox('p', p) + printBox('p', p) + '</div></div>' +
      (photos.length ? '<div class="gallery"><p class="nk-label">' + esc(x.photos) + ' · ' + photos.length + '</p><div class="photos">' + photos.map(function (ph, i) { return '<button type="button" data-lb="' + i + '" aria-label="' + esc(x.openPhoto + ' ' + (i + 1) + ' / ' + photos.length) + '"><' + 'img src="' + esc(asset(ph)) + '" alt="' + esc(P(p, 'title') + ' · ' + (i + 1)) + '" loading="lazy" decoding="async" draggable="false"></button>'; }).join('') + '</div></div>' : '') +
      relRow(p, next) +
      (next && next !== p ? '<nav class="sheet-nav" aria-label="' + esc(x.sheetNav) + '">' +
        (prev !== next ? '<a class="next-project prev-project" ' + ra('#p-' + prev.slug) + ' rel="prev"><span class="nk-label">' + esc(x.prevProject) + '</span><span class="sub">← ' + esc(P(prev, 'title')) + '</span></a>' : '<span></span>') +
        '<a class="next-project" ' + ra('#p-' + next.slug) + ' rel="next"><span class="nk-label">' + esc(x.nextProject) + '</span><span class="sub">' + esc(P(next, 'title')) + ' →</span></a></nav>' : '') +
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
    if (SET.links && SET.links.gbp) rows.push('<div><dt>Google</dt><dd><a href="' + esc(SET.links.gbp) + '" target="_blank" rel="noopener">' + esc(lang === 'sl' ? 'Google profil podjetja' : 'Google Business Profile') + ' <span aria-hidden="true">↗</span><span class="vh"> (' + esc(x.newTab) + ')</span></a></dd></div>'); // from admin › Settings › Links (2026-11-02)
    rows.push('<div><dt>' + esc(c.where) + '</dt><dd>' + esc(lang === 'sl' ? 'Škofja Loka, Slovenija' : 'Škofja Loka, Slovenia') + '</dd></div>');
    x.heroSpecs.slice(2).forEach(function (r) { rows.push('<div><dt>' + esc(r[0]) + '</dt><dd>' + esc(r[1]) + '</dd></div>'); });
    return '<section class="ct" id="contact" tabindex="-1" aria-labelledby="ct-title"><p class="nk-label" id="ct-title">' + esc(c.title) + '</p><p class="ct-lead">' + esc(c.lead) + '</p><dl class="nk-specs ct-specs">' + rows.join('') + '</dl>' +
      qrContact() + // QR package (2026-11-03): vCard code + .vcf download
      '<div class="cta-row">' + btn(ctaText(), '#order', 'primary', null, true) + (CONTACT_EMAIL ? '<a class="nk-btn" href="' + ctMail(c.subject) + '">' + esc(c.write) + '</a>' : '') + '</div></section>';
  }
  function ctAlt() { return CONTACT_EMAIL ? '<a class="cta-band__alt" href="' + ctMail(t().ct.subject) + '">' + esc(t().ct.or) + ' →</a>' : ''; }
  function ctCopy() {
    var x = t(), msg = document.getElementById('ct-msg'), el = document.getElementById('ct-mail'); if (!msg || !el) return;
    var fail = function () { msg.textContent = x.mailFail; var r = document.createRange(); r.selectNodeContents(el); var g = getSelection(); g.removeAllRanges(); g.addRange(r); };
    try { navigator.clipboard.writeText(CONTACT_EMAIL).then(function () { msg.textContent = x.tbCopied; }, fail); } catch (e) { fail(); }
  }

  // ---------- Studio profile NK-A (2026-11-25) ----------
  // #profile — the studio on one A4 sheet to print, save as PDF, copy as text or forward by e-mail: who, the services with their
  // turnaround and deliverables, skills and equipment, selected work, contact + QR. The visitor ticks which
  // services and whether selected work belong on the sheet; the choice lives in the address
  // (#profile?s=cad,print&w=0), so "Copy link" opens the same sheet. No rates (Nace, 2026-11-27). Only text the site already publishes
  // (SERVICES, SKILLS, featured projects) — nothing typed in here, nothing stored, nothing sent.
  // Self-contained: remove this block, views.profile, the 'profile' line in page(), the pf lines in pageTitle(), frame() (two),
  // the click + change handlers and fxIndex(), put the facts rows back into views.about (pfFacts() + pfLink()), pf: in
  // content.js and the "Studio profile" block at the end of page.css.
  function pfState() { if (!state.pf) state.pf = { s: SERVICES.map(function (s) { return s.key; }), w: true }; return state.pf; }
  function pfRead(qs) {
    var f = pfState(), q = String(qs || ''), m = /(?:^|&)s=([a-z,]*)/.exec(q), all = SERVICES.map(function (s) { return s.key; });
    f.s = m ? all.filter(function (k) { return m[1].split(',').indexOf(k) >= 0; }) : all;
    f.w = !/(?:^|&)w=0(?:&|$)/.test(q);
  }
  function pfQuery() { var f = pfState(), q = []; if (f.s.length !== SERVICES.length) q.push('s=' + f.s.join(',')); if (!f.w) q.push('w=0'); return q.length ? '?' + q.join('&') : ''; }
  function pfUrl() { return siteUrl('#profile' + pfQuery()); }
  function pfSvcs() { var f = pfState(); return SERVICES.filter(function (s) { return f.s.indexOf(s.key) >= 0; }); }
  function pfFacts() { var x = t(); return [[lang === 'sl' ? 'Lokacija' : 'Location', lang === 'sl' ? 'Škofja Loka, Slovenija' : 'Škofja Loka, Slovenia'], [lang === 'sl' ? 'Šola' : 'School', 'Šolski center Kranj'], ['CAD', lang === 'sl' ? 'SolidWorks 4 leta · CSWA · CSWA-AM' : 'SolidWorks 4 yrs · CSWA · CSWA-AM']].concat(x.heroSpecs.slice(2)); } // the Studio facts of #about
  function pfLink() { return '<p class="pl-open pf-open"><a href="#profile">' + esc(t().pf.link) + ' →</a></p>'; }
  function pfName() { return 'Nace Kepa · ' + (lang === 'sl' ? 'Inženirski studio' : 'Engineering Studio'); }
  function pfToday() { var d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function pfSkill(g) { return g.items.map(function (it) { return L(it[0]) + ': ' + L(it[1]); }); }
  function pfSheet() {
    var x = t(), c = x.pf, f = pfState(), sv = pfSvcs(), work = f.w ? featured() : [];
    var svc = sv.length ? '<div class="pf-svcs">' + sv.map(function (s) {
      return '<article class="pf-svc"><p class="pf-svc__top"><span class="nk-service__code">' + s.code + '</span><span class="nk-label">' + esc(x.turnaround + ': ' + (s.time ? L(s.time) : x.onRequest)) + '</span></p><h3>' + esc(L(s.title)) + '</h3><p>' + esc(L(s.body)) + '</p>' +
        '<p class="pf-kv"><span class="nk-label">' + esc(x.deliverables) + '</span> ' + esc(L(s.get).join(' · ')) + '</p></article>';
    }).join('') + '</div>' : '<p class="pf-none">' + esc(c.none) + '</p>';
    var contact = [];
    if (CONTACT_EMAIL) contact.push('<div><dt>' + esc(x.ct.email) + '</dt><dd><a href="mailto:' + esc(CONTACT_EMAIL) + '">' + esc(CONTACT_EMAIL) + '</a></dd></div>');
    contact.push('<div><dt>LinkedIn</dt><dd><a href="' + LINKEDIN + '" target="_blank" rel="noopener">' + esc(LINKEDIN.replace(/^https?:\/\/(www\.)?/, '')) + '<span class="vh"> (' + esc(x.newTab) + ')</span></a></dd></div>');
    contact.push('<div><dt>' + esc(c.web) + '</dt><dd>nacekepa.work</dd></div>');
    return '<article class="pf-sheet" id="pf-sheet" aria-label="' + esc(c.label) + '">' +
      '<header class="pf-top">' + logo() + '<span class="wm-text">nacekepa<span>.work</span></span><span class="nk-label">NK-A · ' + esc(fmtDate(pfToday())) + '</span></header>' +
      '<div class="pf-who"><div><h2 class="pf-name">' + esc(pfName()) + '</h2><p class="pf-lead">' + esc(x.heroLead) + '</p><p class="pf-body">' + esc(x.aboutBody) + '</p></div>' + specs(pfFacts()) + '</div>' +
      '<section class="pf-sec"><p class="nk-label">' + esc(c.svc) + (sv.length ? ' · ' + String(sv.length).padStart(2, '0') : '') + '</p>' + svc + '</section>' +
      '<section class="pf-sec"><p class="nk-label">' + esc(c.equip) + '</p><dl class="pf-skills">' + SKILLS.map(function (g) { return '<div><dt>' + esc(g[lang]) + '</dt><dd>' + pfSkill(g).map(esc).join('<span aria-hidden="true"> · </span><span class="vh">; </span>') + '</dd></div>'; }).join('') + '</dl></section>' +
      (work.length ? '<section class="pf-sec"><p class="nk-label">' + esc(c.work) + '</p><ul class="pf-work">' + work.map(function (p) { return '<li><span class="nk-label">' + sheetNo(p) + '</span><span><a ' + ra('#p-' + p.slug) + '>' + esc(P(p, 'title')) + '</a> — ' + esc(cat(p)) + ', ' + esc(p.year) + '. ' + esc(P(p, 'description')) + '</span></li>'; }).join('') + '</ul></section>' : '') +
      '<footer class="pf-sec pf-contact"><div><p class="nk-label">' + esc(c.contact) + '</p><dl class="nk-specs">' + contact.join('') + '</dl></div>' + qrBox(pfUrl(), c.scan, { px: 96, cls: 'pf-qr', print: true }) + '</footer>' +
      '<p class="pf-foot">' + esc(c.foot.replace('{d}', fmtDate(pfToday()))) + '</p></article>';
  }
  function pfText() {
    var x = t(), c = x.pf, f = pfState(), sv = pfSvcs(), out = [];
    out.push(pfName().toUpperCase() + ' — ' + c.label.split(' · ')[0] + ' (NK-A)', x.heroLead, '');
    pfFacts().forEach(function (r) { out.push(r[0] + ': ' + r[1]); });
    if (sv.length) { out.push('', c.svc.toUpperCase());
      sv.forEach(function (s) { out.push(s.code + ' ' + L(s.title) + ' — ' + x.turnaround + ': ' + (s.time ? L(s.time) : x.onRequest), '  ' + L(s.body), '  ' + x.deliverables + ': ' + L(s.get).join(' · ')); }); }
    out.push('', c.equip.toUpperCase());
    SKILLS.forEach(function (g) { out.push(g[lang] + ' — ' + pfSkill(g).join('; ')); });
    if (f.w && featured().length) { out.push('', c.work.toUpperCase()); featured().forEach(function (p) { out.push(sheetNo(p) + ' ' + P(p, 'title') + ' — ' + cat(p) + ', ' + p.year + ' — ' + shareUrl('p', p)); }); }
    out.push('', c.contact.toUpperCase());
    if (CONTACT_EMAIL) out.push(CONTACT_EMAIL);
    out.push(LINKEDIN, pfUrl());
    return out.join('\n');
  }
  function pfMail() { var c = t().pf; return 'mailto:?subject=' + encodeURIComponent(c.subject) + '&body=' + encodeURIComponent(pfText()); }
  function pfView() {
    var x = t(), c = x.pf, f = pfState();
    var ck = function (key, label, on) { return '<label class="pl-opt"><input type="checkbox" data-pf="' + key + '"' + (on ? ' checked' : '') + '><span>' + esc(label) + '</span></label>'; };
    return '<section class="block first pf"><a class="back" ' + ra('#about') + '>← ' + esc(x.nav.about) + '</a>' + head(c.label, c.title, c.lead, true) +
      '<div class="pf-grid"><div class="pf-ctl"><fieldset class="pl-q"><legend class="nk-label">' + esc(c.show + ' · ' + c.svc) + '</legend><div class="pl-opts pf-opts">' + SERVICES.map(function (s) { return ck('s:' + s.key, L(s.title), f.s.indexOf(s.key) >= 0); }).join('') + '</div></fieldset>' +
      '<fieldset class="pl-q"><legend class="nk-label">' + esc(c.show + ' · ' + c.more) + '</legend><div class="pl-opts pf-opts">' + ck('w', c.work, f.w) + '</div></fieldset>' +
      '<div class="cta-row pf-act"><button type="button" class="nk-btn nk-btn--primary" data-pf-act="print">' + esc(c.print) + '</button><button type="button" class="nk-btn" data-pf-act="copy">' + esc(c.copy) + '</button><button type="button" class="nk-btn" data-pf-act="link">' + esc(c.copyLink) + '</button><a class="nk-btn" id="pf-mail" href="' + esc(pfMail()) + '">' + esc(c.mail) + '</a></div>' +
      '<p class="copy-msg pf-msg" id="pf-msg" role="status" aria-live="polite"></p><pre class="brief pf-text" id="pf-text" tabindex="0" hidden></pre>' +
      '<p class="fit-note">' + esc(c.note) + '</p></div>' + pfSheet() + '</div></section>' + ctaBand();
  }
  function pfToggle(el) {
    var f = pfState(), k = el.getAttribute('data-pf');
    if (k === 'w') f.w = el.checked;
    else { var key = k.slice(2), on = {}; f.s.forEach(function (v) { on[v] = 1; }); on[key] = el.checked ? 1 : 0; f.s = SERVICES.map(function (s) { return s.key; }).filter(function (v) { return on[v]; }); }
    // the address follows the choice, so the address bar, "Copy link" and the QR code all open the same sheet
    var pre = (/^#((?:en|sl)-)/.exec(location.hash) || ['', ''])[1];
    try { history.replaceState(history.state, '', location.pathname + location.search + '#' + pre + 'profile' + pfQuery()); } catch (e) {}
    state.pfHash = location.hash; state.navHref = location.href;
    var sh = document.getElementById('pf-sheet'), ml = document.getElementById('pf-mail'), msg = document.getElementById('pf-msg'), tx = document.getElementById('pf-text');
    if (sh) sh.outerHTML = pfSheet(); if (ml) ml.setAttribute('href', pfMail()); if (msg) msg.textContent = ''; if (tx) tx.hidden = true;
  }
  function pfAct(what) {
    var c = t().pf, msg = document.getElementById('pf-msg'), tx = document.getElementById('pf-text'); if (!msg || !tx) return;
    if (what === 'print') { printSheet(); return; }
    var text = what === 'link' ? pfUrl() : pfText();
    var fail = function () { tx.textContent = text; tx.hidden = false; msg.textContent = t().copyFail; try { var r = document.createRange(); r.selectNodeContents(tx); var g = getSelection(); g.removeAllRanges(); g.addRange(r); } catch (e) {} };
    msg.textContent = ''; tx.hidden = true;
    try { navigator.clipboard.writeText(text).then(function () { msg.textContent = what === 'link' ? c.linkCopied : c.copied; }, fail); } catch (e) { fail(); }
  }

  // ---------- Share this sheet (project + news pages) ----------
  // Self-contained: remove shareUrl()…shareCopy(), the two shareBox() calls in projectView() / postView(), the two
  // data-share-* lines in the click handler, share: in both languages in content.js and the .share-* rules at the end of page.css.
  // Share & link package (2026-11-01): the short address of a sheet / post is its landing page (/portfolio/<slug>/,
  // /news/<slug>/, Slovenian under /sl/) — one real page per item with its own link preview; #en-p-… links still work.
  function shareUrl(kind, item) { return 'https://nacekepa.work/' + (lang === 'sl' ? 'sl/' : '') + (kind === 'n' ? 'news/' : 'portfolio/') + item.slug + '/'; }
  function shareBox(kind, item) {
    var x = t().share, url = shareUrl(kind, item), title = P(item, 'title');
    var mail = 'mailto:?subject=' + encodeURIComponent(x.subject + ': ' + title) + '&body=' + encodeURIComponent(title + '\n' + url);
    return '<div class="share" data-share-title="' + esc(title) + '"><p class="nk-label" id="share-l">' + esc(x.label) + '</p>' +
      '<div class="share-row"><input class="share-url" id="share-url" type="text" readonly value="' + esc(url) + '" aria-labelledby="share-l" spellcheck="false">' +
      '<button type="button" class="nk-btn nk-btn--sm" data-share-copy>' + esc(x.copy) + '</button></div>' +
      (kind === 'p' ? '<p class="share-no"><span class="nk-label">' + esc(x.no) + '</span> <code id="share-no">' + esc(sheetNo(item)) + '</code> <button type="button" class="tb-copy" data-share-no>' + esc(x.noCopy) + '</button></p>' : '') +
      qrBox(url, t().qr.scan, { dl: item.slug, cls: 'share-qr' }) + // QR package (2026-11-03)
      '<div class="share-act"><a class="share-link" href="' + esc(mail) + '">' + esc(x.mail) + ' →</a>' +
      (navigator.share ? '<button type="button" class="share-link" data-share-more>' + esc(x.more) + '</button>' : '') +
      '<span class="share-note">' + esc(x.note) + '</span></div>' +
      '<p class="share-msg" id="share-msg" role="status" aria-live="polite"></p></div>';
  }
  function shareCopy(no) {
    var f = document.getElementById(no ? 'share-no' : 'share-url'), msg = document.getElementById('share-msg'), x = t().share; if (!f) return;
    var fail = function () { if (no) { var r = document.createRange(); r.selectNodeContents(f); var g = getSelection(); g.removeAllRanges(); g.addRange(r); } else { f.focus(); f.select(); } msg.textContent = no ? x.noCopyFail : x.copyFail; };
    try { navigator.clipboard.writeText(no ? f.textContent : f.value).then(function () { msg.textContent = no ? x.noCopied : x.copied; }, fail); } catch (e) { fail(); }
  }
  // ---------- QR package (2026-11-03): "Scan to open" codes ----------
  // window.NK_QR (src/site/qr.js, inlined before this script) encodes any text as a QR code drawn as one SVG path in
  // currentColor — it follows light / dark and prints black. qrBox() puts one on: the "Share this sheet" box of project
  // sheets and news posts (+ "Download QR (SVG)"), the print-only footer of a printed sheet / post / tool (so a printout
  // leads back to the live page), every page footer of the printable portfolio set, and the contact card on #about as a
  // vCard ("Save my contact": scan with the phone camera, or download the .vcf). Only addresses and facts already on the
  // site: name, e-mail, nacekepa.work, LinkedIn, Škofja Loka. Self-contained: remove qrOn() … qrDl(), the qrBox() calls in
  // shareBox() / printBox() / tlWrap() / psDoc() / ctCard(), the data-qr-* lines in the click handler, qr: in both
  // languages in content.js, the qr import in Site.astro + admin.astro, src/site/qr.js and the "QR package" rules in page.css.
  function qrOn() { return !!(window.NK_QR && window.NK_QR.svg); }
  function qrSvg(text, px, label, ecl) { try { return window.NK_QR.svg(text, { px: px, ecl: ecl || 'M', label: label }); } catch (e) { return ''; } }
  function qrBox(url, cap, o) { // o: { px, cls, dl: file base name for the download button, print: true = no button }
    if (!qrOn()) return '';
    o = o || {}; var x = t().qr, svg = qrSvg(url, o.px || 112, x.label.replace('{u}', url)); if (!svg) return '';
    return '<div class="qr-box' + (o.cls ? ' ' + o.cls : '') + '">' + svg + '<div class="qr-side"><p class="qr-cap">' + esc(cap) + '</p>' +
      (o.dl ? '<button type="button" class="tb-copy" data-qr-svg="' + esc(url) + '" data-qr-name="' + esc(o.dl) + '">' + esc(x.svg) + '</button><span class="tb-msg qr-msg" role="status" aria-live="polite"></span>' : '') + '</div></div>';
  }
  function qrVcard() {
    var x = t().qr;
    // kept short on purpose (no note / job title) so the code stays at version 10 — easy to scan from a screen
    return window.NK_QR.vcard({ first: 'Nace', last: 'Kepa', org: x.ctOrg, email: CONTACT_EMAIL || '', urls: ['https://nacekepa.work', LINKEDIN], city: 'Škofja Loka', country: lang === 'sl' ? 'Slovenija' : 'Slovenia' });
  }
  function qrContact() { // "Save my contact" on the contact card
    if (!qrOn()) return '';
    var x = t().qr, v = qrVcard(), svg = qrSvg(v, 168, x.ctLabel, 'L'); if (!svg) return '';
    return '<div class="ct-qr"><p class="nk-label">' + esc(x.ctTitle) + '</p><div class="qr-box qr-box--ct">' + svg + '<div class="qr-side"><p class="qr-cap">' + esc(x.ctLead) + '</p>' +
      '<button type="button" class="nk-btn nk-btn--sm" data-qr-vcf>' + esc(x.ctDl) + '</button><span class="tb-msg qr-msg" role="status" aria-live="polite"></span></div></div></div>';
  }
  function qrDl(el, kind) { // kind: 'svg' (QR of el's address) | 'vcf' (the contact card)
    var x = t().qr, msg = el.parentNode.querySelector('.qr-msg');
    try {
      var text, name, type;
      if (kind === 'vcf') { text = qrVcard(); name = 'nace-kepa.vcf'; type = 'text/vcard;charset=utf-8'; }
      else { text = window.NK_QR.file(el.getAttribute('data-qr-svg')); name = 'qr-' + (el.getAttribute('data-qr-name') || 'nacekepa-work') + '.svg'; type = 'image/svg+xml;charset=utf-8'; }
      var blob = new Blob([text], { type: type }), url = URL.createObjectURL(blob), a = document.createElement('a');
      a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
      if (msg) msg.textContent = kind === 'vcf' ? x.ctSaved : x.svgSaved;
    } catch (e) { if (msg) msg.textContent = x.svgFail; }
  }
  // ---------- Print this sheet (project + news pages) ----------
  // Self-contained: remove printBox()…printSheet(), the two printBox() calls in projectView() / postView(), the data-print
  // line in the click handler, print: in both languages in content.js and the "Print this sheet" rules at the end of page.css.
  // The print rules also apply to Ctrl+P on any page (clean A4 sheet: no menu, buttons, photos or 3D model).
  function printBox(kind, item) {
    var x = t().print, url = shareUrl(kind, item);
    return '<div class="print-act"><button type="button" class="nk-btn nk-btn--sm" data-print>' +
      '<svg class="print-ico" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M7 9V3h10v6M7 17H4v-7h16v7h-3M7 14h10v7H7z"/></svg>' + esc(x.btn) + '</button>' +
      '<span class="print-note">' + esc(x.note) + '</span></div>' +
      '<div class="print-only print-url"><span>' + esc(x.link) + '</span> ' + esc(url) + qrBox(url, t().qr.scanPrint, { px: 72, cls: 'print-qr' }) + '</div>'; // QR package (2026-11-03): the printout leads back to the live sheet
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
    var rows = [[x.steps[0], svc], [x.fWhat, bfWhat()], [x.fQty, o.qty], [x.fDeadline, o.deadline ? fmtDate(o.deadline) : '—'], [x.fFiles, x.fFilesO[o.files]], [x.fMat, x.fMatO[o.mat]], [x.fName, o.name], [x.fEmail, o.email]];
    if (String(o.phone || '').trim()) rows.push([x.eq.phoneB, o.phone.trim()]); rows.push([x.eq.reply, eqReply()]); // Enquiry package (2026-11-04)
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
        '<span><i>' + esc(ps.page) + '</i>' + pg + ' / ' + total + '</span><span><i>' + esc(x.tb.date) + '</i>' + esc(date) + '</span><span class="ps-tb__url"><i>' + esc(ps.online) + '</i>' + esc(url) + '</span>' +
        (qrOn() ? '<span class="ps-tb__qr">' + qrSvg('https://' + url, 40, t().qr.label.replace('{u}', 'https://' + url)) + '</span>' : '') + '</footer>'; // QR package (2026-11-03)
    };
    var home = siteUrl('#work').replace('https://', ''); // Language package: the real language address
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
        foot(sheetNo(p), shareUrl('p', p).replace(/^https:\/\//, '')) + '</section>');
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
    var sv = sdSvc(p); if (sv && !o.services.length) o.services = [sv.key]; // Sheet → service package (2026-11-14)
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
        return '<li><a ' + ra('#p-' + p.slug) + '><span class="nk-label">' + sheetNo(p) + '</span><span class="sl-t">' + esc(P(p, 'title')) + '</span><span class="nk-label sl-c">' + esc(cat(p)) + '</span></a>' +
          '<button type="button" class="chip sl-x" data-sl-del="' + esc(p.slug) + '" aria-label="' + esc(x.del.replace('{t}', P(p, 'title'))) + '">✕</button></li>';
      }).join('') + '</ul>' +
      '<div class="cta-row"><button type="button" class="nk-btn nk-btn--primary nk-btn--sm" data-sl-go>' + esc(x.start) + '<span class="nk-btn__arrow" aria-hidden="true">→</span></button>' +
      cmpSlBtn(a) + '<button type="button" class="nk-btn nk-btn--sm" data-pz="sl" aria-haspopup="dialog">' + esc(t().pz.btn) + '</button><button type="button" class="nk-btn nk-btn--sm" data-sl-copy>' + esc(x.copy) + '</button><button type="button" class="nk-btn nk-btn--sm" data-sx-copy="sl">' + esc(t().sx.link) + '</button><button type="button" class="share-link" data-sl-clear>' + esc(x.clear) + '</button></div>' +
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
  function slToOrder(b) {
    var a = b || slRead(), o = state.order; if (!a.length) return;
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
  function cmpLink() { return siteUrl(cmpHash()); } // Language package (2026-11-09): /sl/#compare… instead of /#sl-compare…
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
      return '<th scope="col" role="columnheader" class="cmp-col"><a class="cmp-sheet" ' + ra('#p-' + p.slug) + '><span class="nk-sheet__art cmp-art" aria-hidden="true">' + art(p) + '</span>' +
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
      '<button type="button" class="nk-btn nk-btn--sm" data-cmp-sl><span class="sl-star" aria-hidden="true">☆</span>' + esc(c.toSl) + '</button><button type="button" class="nk-btn nk-btn--sm nk-btn--ghost" data-mn-cmp>' + esc(t().mn.cmpSave) + '</button></div>' +
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
      var p = bySlug((a.getAttribute('data-ra') || a.getAttribute('href')).slice(3)), hit = !q || (p && findHit(findProjectText(p), q));
      a.hidden = !hit; if (hit) shown++;
    });
    var news = q ? NEWS.filter(function (n) { return findHit(findNewsText(n), q); }) : [];
    var out = document.getElementById('find-out'), nw = document.getElementById('find-news'), none = document.getElementById('find-none'), clr = app.querySelector('[data-find-clear]');
    out.textContent = q ? f.count.replace('{p}', shown).replace('{n}', news.length) : '';
    nw.hidden = !news.length;
    nw.innerHTML = news.length ? '<p class="nk-label">' + esc(f.news) + ' · ' + news.length + '</p><ul>' + news.map(function (n) { return '<li><a ' + ra('#n-' + n.slug) + '><span class="nk-label">' + esc(fmtDate(n.date)) + '</span><span>' + esc(P(n, 'title')) + ' →</span></a></li>'; }).join('') + '</ul>' : '';
    none.hidden = !(q && !shown && !news.length);
    none.innerHTML = none.hidden ? '' : '<p class="sub">' + esc(f.none.replace('{q}', q)) + '</p><p class="lead">' + esc(f.noneBody) + '</p><div class="cta-row">' + btn(t().cta, '#order', 'primary', null, true) + fxElse(q) + '</div>';
    if (clr) clr.hidden = !state.q;
    findSync();
    psSync();
    rgApply();
    pzSync(); // Presentation (2026-11-13)
  }

  // ---------- Shared selection / "Poslani izbor" (#work?list=slug,slug; 2026-11-14) ----------
  // A shortlist as a link: "Copy link" in the shortlist box (and in a shortlist presentation) gives
  // https://nacekepa.work/#work?list=slug,slug — opened on any device it shows those sheets in a "Shared selection" box
  // above the work: open a sheet, Present (…&show=1 opens the presentation at once), Compare, add them to the visitor's
  // own shortlist, start a project with them as references, or close it. Nothing is stored until the visitor adds them;
  // unknown slugs are dropped. Only projects.json; no request. Self-contained: remove sxParse() … sxClose(), the sxBox()
  // call in views.work, the data-sx-copy button in slBox(), the `b` argument of slToOrder(), the three "Shared selection"
  // lines in findQuery() / findRead() (and `noList`), the four data-sx-* lines in the click handler, the 'sx' lines in
  // pzList() / pzLink() / render(), sx: + pz.sets.sx in content.js and the "Shared selection" rules in page.css.
  function sxParse(v) { var a = []; String(v).split(',').forEach(function (s) { s = s.trim(); if (bySlug(s) && a.indexOf(s) < 0) a.push(s); }); return a; }
  function sxList() { return (state.sx || []).map(bySlug).filter(Boolean); }
  function sxUrl(slugs, show) { return siteUrl('#work?list=' + slugs.join(',') + (show ? '&show=' + encodeURIComponent(show) : '')); }
  function sxBox() {
    var x = t().sx, a = sxList(), mine = slRead(); if (!a.length) return '';
    var fresh = a.filter(function (p) { return mine.indexOf(p.slug) < 0; }).length;
    return '<section class="sl sx" aria-labelledby="sx-h"><div class="sl-head"><p class="nk-label">' + esc(x.label) + ' · ' + a.length + '</p><h2 class="sub" id="sx-h" tabindex="-1">' + esc(x.title) + '</h2><p class="sl-lead">' + esc(x.lead) + '</p></div>' +
      '<ol class="sl-list sx-list">' + a.map(function (p) {
        var on = mine.indexOf(p.slug) >= 0;
        return '<li><a ' + ra('#p-' + p.slug) + '><span class="nk-label">' + sheetNo(p) + '</span><span class="sl-t">' + esc(P(p, 'title')) + (on ? ' <span class="sl-mark" aria-hidden="true">★</span><span class="vh"> — ' + esc(t().sl.on) + '</span>' : '') + '<span class="sx-d">' + esc(P(p, 'description')) + '</span></span><span class="nk-label sl-c">' + esc(cat(p)) + '</span></a></li>';
      }).join('') + '</ol>' +
      '<div class="cta-row"><button type="button" class="nk-btn nk-btn--primary nk-btn--sm" data-pz="sx" aria-haspopup="dialog"><span aria-hidden="true">▶ </span>' + esc(t().pz.btn) + '</button>' + cmpSlBtn(a) +
      (fresh ? '<button type="button" class="nk-btn nk-btn--sm" data-sx-keep><span class="sl-star" aria-hidden="true">☆</span>' + esc(x.keep) + '</button>' : '') +
      '<button type="button" class="nk-btn nk-btn--sm" data-sx-go>' + esc(t().sl.start) + '<span class="nk-btn__arrow" aria-hidden="true">→</span></button>' +
      '<button type="button" class="nk-btn nk-btn--sm" data-sx-copy="sx">' + esc(x.link) + '</button><button type="button" class="share-link" data-sx-close>' + esc(x.close) + '</button></div>' +
      '<p class="share-msg" id="sx-msg" role="status" aria-live="polite">' + (fresh ? '' : esc(x.have)) + '</p></section>';
  }
  function sxCopy(src) {
    var x = t().sx, a = src === 'sl' ? slRead() : state.sx || [], msg = document.getElementById(src === 'sl' ? 'sl-msg' : 'sx-msg'); if (!a.length || !msg) return;
    var url = sxUrl(a), ok = x.copied.replace('{n}', a.length), fail = function () { msg.textContent = x.copyFail + ' ' + url; };
    try { navigator.clipboard.writeText(url).then(function () { msg.textContent = ok; }, fail); } catch (e) { fail(); }
  }
  function sxKeep() {
    var a = slRead(), n = 0; (state.sx || []).forEach(function (s) { if (a.indexOf(s) < 0) { a.push(s); n++; } });
    slSave(a); state.sx = []; render(true);
    var h = document.getElementById('sl-h'), msg = document.getElementById('sl-msg');
    if (h) { h.scrollIntoView({ block: 'center' }); h.focus({ preventScroll: true }); } if (msg) msg.textContent = t().sx.kept.replace('{n}', n);
  }
  function sxClose() { state.sx = []; render(true); var f = document.getElementById('find-q'); if (f) f.focus(); }

  // ---------- Search links (#work): the search and category filter live in the address, e.g. #en-work?q=esp32&cat=iot ----------
  // Self-contained: remove findQuery()…findShareCopy(), the "?" line in page(), the findShareBox() call in findBox(),
  // the findSync() call at the end of findApply(), the data-find-copy line in the click handler, find.link* in content.js
  // and the "Search links" rules at the end of page.css.
  function findQuery(noList) {
    var a = [], q = state.q.trim();
    if (!noList && state.sx && state.sx.length) a.push('list=' + state.sx.join(',')); // Shared selection (2026-11-14)
    if (q) a.push('q=' + encodeURIComponent(q));
    if (state.filter !== 'all') a.push('cat=' + encodeURIComponent(state.filter));
    if (state.rg && state.rg.view === 'reg') a.push('view=list');
    return a.length ? '?' + a.join('&') : '';
  }
  function findRead(qs) {
    var q = '', c = 'all', sx = [];
    qs.split('&').forEach(function (kv) {
      var i = kv.indexOf('='), k = i < 0 ? kv : kv.slice(0, i), v = i < 0 ? '' : kv.slice(i + 1);
      try { v = decodeURIComponent(v.replace(/\+/g, ' ')); } catch (e) { v = ''; }
      if (k === 'q') q = v.slice(0, 100);
      if (k === 'cat' && (v === '3d' || CATS[v])) c = v;
      if (k === 'view' && state.rg) state.rg.view = v === 'list' ? 'reg' : 'grid';
      if (k === 'show') state.pzGo = v || '1'; // Presentation (2026-11-13): #work?…&show=1 / &show=<slug>
      if (k === 'list') sx = sxParse(v); // Shared selection (2026-11-14)
    });
    state.q = q; state.filter = c; state.sx = sx;
  }
  function findLink() { return siteUrl('#work' + findQuery()); } // Language package (2026-11-09)
  function findSync() {
    var h = location.hash, m = /^#(en|sl)-?/.exec(h), want = '#' + (m ? m[1] + '-' : '') + 'work' + findQuery();
    if (h !== want) try { history.replaceState(history.state, '', want); } catch (e) {}
    state.findHash = location.hash; // read back from the address only when it changes from outside (link, Back, typed)
    var box = document.getElementById('find-share'); if (!box) return;
    var on = !!findQuery(true), url = document.getElementById('find-url');
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
      '<button type="button" class="chip rg-v" data-rg-view="reg" aria-pressed="' + on + '"><span class="rg-ico" aria-hidden="true">≡</span>' + esc(x.reg) + '</button>' + pzBtn() + '</div>'; // + Presentation (2026-11-13)
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
          k === 'name' ? '<a class="rg-t" ' + ra('#p-' + p.slug) + '>' + esc(ti) + '</a><span class="rg-d">' + esc(P(p, 'description')) + '</span>' :
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
  function v3State(k) { return k === 'fc' ? state.fc : k === 'st' ? state.st : state.vw; }
  function v3Handle(k) { return k === 'fc' ? fc3d : k === 'st' ? st3d : viewer; }
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
      '<div class="cta-row"><button type="button" class="nk-btn nk-btn--primary" data-fit-go>' + esc(f.cta) + '<span class="nk-btn__arrow" aria-hidden="true">→</span></button></div>' + pbFitLink() + bmFitLink() +
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
      '<p class="fc-msg" id="fc-msg" role="status" aria-live="polite"></p>' + stOpen();
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
    stRefresh(state.fc.res ? '#st-axes' : '#st-file'); // Part studio shares the read file
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
    tlSetFold('fit', true); var fb = document.querySelector('.block.fit'); if (fb) fb.scrollIntoView({ block: 'start' });
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
      (refs.length ? '<div class="pl-refs"><p class="nk-label">' + esc(f.refs) + '</p><ul>' + refs.map(function (p) { return '<li><a ' + ra('#p-' + p.slug) + '><span class="nk-label">' + sheetNo(p) + '</span> ' + esc(P(p, 'title')) + '</a></li>'; }).join('') + '</ul></div>' : '') +
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
    prepRefresh(); tlSetFold('prep', true); var b = document.getElementById('prep'); if (b) { b.scrollIntoView({ block: 'start' }); var c = b.querySelector('[data-prep-svc]'); if (c) c.focus({ preventScroll: true }); }
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
    return top + '<ol class="mp-list" id="mp-list">' + rows + '</ol>' + act + mpMxLink() + '<p class="share-msg" id="mp-msg" role="status" aria-live="polite"></p>';
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
  var DR_FIELDS = ['what', 'qty', 'deadline', 'name', 'email', 'note', 'phone'];
  function drHas() { var o = state.order; return o.services.length > 0 || DR_FIELDS.some(function (k) { return k !== 'qty' && String(o[k] || '').trim(); }); }
  function drSave() {
    try {
      if (state.send === 'sent' || !drHas()) { if (dr.at) localStorage.removeItem(DR_KEY); dr.at = 0; return; }
      var o = state.order, d = { v: 1, at: Date.now(), step: Math.min(state.step, 2), services: o.services.slice(), files: +o.files || 0, mat: +o.mat || 0, reply: +o.reply || 0, have: state.prep.have };
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
    o.reply = d.reply === 1 ? 1 : 0;
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
    state.order = { website: '', services: [], what: '', qty: '1', deadline: '', files: 0, mat: 0, name: '', email: '', note: '', phone: '', reply: 0 };
    state.prep.have = {}; state.prep.svc = null; state.step = 0; state.errors = {}; state.send = 'idle';
    dr.at = 0; dr.restored = false; dr.ask = false; dr.msg = t().dr.cleared;
    render(true); dr.msg = '';
    var c = document.querySelector('[data-svc]'); if (c) c.focus();
  }

  // ---------- Draft hand-over / "Predaja osnutka" (order form, #order?draft=…; 2026-11-19) ----------
  // "Hand this draft over" under the order form (every step until the brief is sent) turns the unfinished brief into a
  // link — https://nacekepa.work/#order?draft=1.<base64url of a small JSON> — to finish on another device or to let a
  // colleague check it: copy, e-mail (mailto:) or a QR code. Opening such a link shows a "Received draft" preview above
  // the form; the form is filled in only after "Use this draft" (it then replaces this browser's own saved draft).
  // Everything is in the address after # (browsers never send that part to a server). What is read from a link goes
  // through the same checks as the saved draft (known service keys, capped strings, numbers, a date) and is only ever
  // written with esc(). Nothing is stored or sent by this feature itself.
  // Self-contained: remove DH_MAX … dhDone(), the dhRead line in page(), the dhIn() / dhOut() calls in orderView(), the
  // data-dh lines in the click and change handlers, dh: in both languages in content.js and the "Draft hand-over" rules
  // in page.css.
  var DH_MAX = 16000, DH_MAIL = 1800, DH_QR = 900; // longest payload read · longest link put into a mailto: · longest link drawn as a QR code
  state.dh = { inc: null, bad: false, hash: '', contact: true, msg: '' };
  function dhEnc(s) { var b = new TextEncoder().encode(s), o = ''; for (var i = 0; i < b.length; i++) o += String.fromCharCode(b[i]); return btoa(o).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
  function dhDec(s) { var a = atob(s.replace(/-/g, '+').replace(/_/g, '/')), b = new Uint8Array(a.length); for (var i = 0; i < a.length; i++) b[i] = a.charCodeAt(i); return new TextDecoder('utf-8', { fatal: true }).decode(b); }
  function dhNeed() { var ids = {}; SERVICES.forEach(function (s) { if (s.need) s.need.en.forEach(function (n) { ids[n] = 1; }); }); return ids; }
  function dhPack(withContact) { // short keys keep the link (and its QR code) small; empty answers are left out
    var o = state.order, d = { v: 1, at: Date.now(), st: Math.min(state.step, 2), s: o.services.slice() };
    [['w', 'what'], ['d', 'deadline'], ['o', 'note']].concat(withContact ? [['n', 'name'], ['e', 'email'], ['p', 'phone']] : []).forEach(function (k) { var v = String(o[k[1]] || '').trim(); if (v) d[k[0]] = v; });
    if (/^\d{1,6}$/.test(o.qty) && String(o.qty) !== '1') d.q = String(o.qty);
    if (+o.files) d.f = +o.files;
    if (+o.mat) d.m = +o.mat;
    if (withContact && +o.reply === 1) d.r = 1;
    var need = dhNeed(), h = Object.keys(state.prep.have).filter(function (k) { return state.prep.have[k] === true && need[k]; }); if (h.length) d.h = h;
    return d;
  }
  function dhUrl(withContact) { return siteUrl('#order?draft=1.' + dhEnc(JSON.stringify(dhPack(withContact)))); }
  function dhRead(qs) { // from page(), once per address
    var m = /(?:^|&)draft=([^&]*)/.exec(qs), s = state.dh; if (!m) return;
    s.inc = null; s.bad = true; s.msg = '';
    var mm = /^1\.([A-Za-z0-9_-]{8,})$/.exec(m[1]); if (!mm || mm[1].length > DH_MAX) return;
    var d; try { d = JSON.parse(dhDec(mm[1])); } catch (e) { return; }
    if (!d || typeof d !== 'object' || Array.isArray(d) || d.v !== 1) return;
    var keys = SERVICES.map(function (v) { return v.key; }), x = t(), need = dhNeed();
    var str = function (v, n) { return typeof v === 'string' ? v.slice(0, n) : ''; }, idx = function (v, a) { return typeof v === 'number' && v > 0 && v < a.length ? v | 0 : 0; };
    var r = { services: (Array.isArray(d.s) ? d.s : []).filter(function (k, i, a) { return keys.indexOf(k) >= 0 && a.indexOf(k) === i; }),
      what: str(d.w, 5000), note: str(d.o, 5000), name: str(d.n, 300), email: str(d.e, 300), phone: str(d.p, 60),
      qty: typeof d.q === 'string' && /^\d{1,6}$/.test(d.q) ? d.q : '1', deadline: typeof d.d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d.d) ? d.d : '',
      files: idx(d.f, x.fFilesO), mat: idx(d.m, x.fMatO), reply: d.r === 1 ? 1 : 0,
      have: (Array.isArray(d.h) ? d.h : []).filter(function (k, i, a) { return typeof k === 'string' && need[k] === 1 && a.indexOf(k) === i; }),
      at: typeof d.at === 'number' && d.at > 0 && d.at < Date.now() + 864e5 ? d.at : 0, step: d.st === 1 || d.st === 2 ? d.st : 0 };
    if (!r.services.length && !(r.what + r.note + r.name + r.email + r.phone).trim()) return;
    s.inc = r; s.bad = false;
  }
  function dhWhen(at) { try { return new Date(at).toLocaleString(lang === 'sl' ? 'sl-SI' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }); } catch (e) { return ''; } }
  function dhCut(v) { return v.length > 600 ? v.slice(0, 600) + '…' : v; }
  function dhRows(r) {
    var x = t(), f = x.dh, svc = SERVICES.filter(function (v) { return r.services.indexOf(v.key) >= 0; }).map(function (v) { return L(v.title); }).join(', ');
    return [[x.steps[0], svc], [x.fWhat, dhCut(r.what)], [x.fQty, r.qty !== '1' ? r.qty : ''], [x.fDeadline, r.deadline ? fmtDate(r.deadline) : ''], [x.fFiles, r.files ? x.fFilesO[r.files] : ''], [x.fMat, r.mat ? x.fMatO[r.mat] : ''],
      [f.ready, r.have.length ? f.items.replace('{n}', r.have.length) : ''], [x.fName, r.name], [x.fEmail, r.email], [x.eq.phone, r.phone], [x.fNote, dhCut(r.note)]].filter(function (w) { return w[1]; });
  }
  function dhIn() { // above the order form: the preview of a received draft, a damaged-link note, or the "filled in" status
    var s = state.dh, f = t().dh;
    if (s.msg) return '<p class="dh-in dh-in--msg" id="dh-in" role="status" tabindex="-1">' + esc(s.msg) + '</p>';
    if (s.bad) return '<div class="dh-in" id="dh-in"><p class="nk-label">' + esc(f.inLabel) + '</p><p class="dh-txt dh-bad" role="alert">' + esc(f.bad) + '</p><div class="cta-row"><button type="button" class="nk-btn nk-btn--sm" data-dh="ignore">' + esc(f.close) + '</button></div></div>';
    if (!s.inc) return '';
    var r = s.inc;
    return '<section class="dh-in" id="dh-in" aria-labelledby="dh-in-h"><p class="nk-label">' + esc(f.inLabel) + '</p><h2 class="sub dh-h" id="dh-in-h" tabindex="-1">' + esc(f.inT) + '</h2>' +
      '<p class="dh-txt">' + esc((r.at ? f.inWhen.replace('{d}', dhWhen(r.at)) + ' ' : '') + f.inLead) + '</p>' +
      '<dl class="nk-specs dh-rows">' + dhRows(r).map(function (w) { return '<div><dt>' + esc(w[0]) + '</dt><dd>' + esc(w[1]) + '</dd></div>'; }).join('') + '</dl>' +
      (dr.at && drHas() ? '<p class="dh-txt dh-own">' + esc(f.inOwn) + '</p>' : '') +
      '<div class="cta-row"><button type="button" class="nk-btn nk-btn--primary nk-btn--sm" data-dh="use">' + esc(f.use) + '</button><button type="button" class="nk-btn nk-btn--sm" data-dh="ignore">' + esc(f.ignore) + '</button></div></section>';
  }
  function dhOut() { // under the order form
    if (state.send === 'sent' || state.send === 'sending') return '';
    var f = t().dh;
    return '<details class="dh" id="dh"><summary class="dh-sum"><span class="nk-label">' + esc(f.label) + '</span><span class="dh-sum-t">' + esc(f.sum) + '</span></summary><div class="dh-body">' +
      '<p class="dh-txt">' + esc(f.lead) + '</p><p class="dh-txt">' + esc(f.priv) + '</p>' +
      '<label class="dh-check"><input type="checkbox" data-dh-contact' + (state.dh.contact ? ' checked' : '') + '><span>' + esc(f.contact) + '</span></label>' +
      '<div class="cta-row"><button type="button" class="nk-btn nk-btn--primary nk-btn--sm" data-dh="copy">' + esc(f.copy) + '</button><a class="nk-btn nk-btn--sm" href="mailto:" data-dh="mail">' + esc(f.mail) + '</a>' +
      (qrOn() ? '<button type="button" class="nk-btn nk-btn--sm" data-dh="qr" aria-expanded="false" aria-controls="dh-qr">' + esc(f.qr) + '</button>' : '') + '</div>' +
      '<p class="share-msg dh-msg" id="dh-msg" role="status" aria-live="polite"></p>' +
      '<input class="nk-input dh-url" id="dh-url" readonly hidden aria-label="' + esc(f.urlLabel) + '"><div class="dh-qr" id="dh-qr" hidden></div></div></details>';
  }
  function dhAct(kind, el, ev) {
    var s = state.dh, f = t().dh;
    if (kind === 'use') { dhUse(); return; }
    if (kind === 'ignore') { dhDone(''); return; }
    var msg = document.getElementById('dh-msg'), u = document.getElementById('dh-url'), q = document.getElementById('dh-qr'), qb = document.querySelector('[data-dh="qr"]'); if (!msg || !u || !q) return;
    var qrOff = function () { q.hidden = true; q.innerHTML = ''; if (qb) qb.setAttribute('aria-expanded', 'false'); };
    if (kind === 'qr' && !q.hidden) { qrOff(); msg.textContent = ''; return; }
    readForm();
    if (!drHas()) { if (ev) ev.preventDefault(); u.hidden = true; qrOff(); msg.textContent = f.empty; return; }
    var url = dhUrl(s.contact); u.value = url; u.hidden = false;
    if (kind === 'fresh') { if (!q.hidden) { qrOff(); } msg.textContent = (s.contact ? f.withC : f.noC); return; } // the contact tick changed
    if (kind === 'copy') {
      var fail = function () { msg.textContent = f.copyFail; u.focus(); u.select(); };
      try { navigator.clipboard.writeText(url).then(function () { msg.textContent = f.copied.replace('{n}', url.length); }, fail); } catch (e) { fail(); }
    } else if (kind === 'mail') {
      if (url.length > DH_MAIL) { if (ev) ev.preventDefault(); msg.textContent = f.mailLong; return; }
      el.setAttribute('href', 'mailto:?subject=' + encodeURIComponent(f.mailSubj) + '&body=' + encodeURIComponent(f.mailBody + '\n\n' + url + '\n'));
      msg.textContent = f.mailOpen;
    } else if (kind === 'qr') {
      var svg = url.length > DH_QR ? '' : qrSvg(url, 240, f.qrLabel, 'L');
      if (!svg) { msg.textContent = f.qrLong; return; }
      q.innerHTML = svg + '<p class="qr-cap">' + esc(f.qrCap) + '</p>'; q.hidden = false; if (qb) qb.setAttribute('aria-expanded', 'true'); msg.textContent = f.qrShown;
    }
  }
  function dhUse() {
    var r = state.dh.inc; if (!r) return;
    state.order = { website: '', services: r.services.slice(), what: r.what, qty: r.qty, deadline: r.deadline, files: r.files, mat: r.mat, name: r.name, email: r.email, note: r.note, phone: r.phone, reply: r.reply };
    state.prep.have = {}; r.have.forEach(function (k) { state.prep.have[k] = true; }); state.prep.svc = null;
    state.step = r.step; state.errors = {}; state.send = 'idle'; dr.restored = false; dr.ask = false;
    dhDone(t().dh.used);
  }
  function dhDone(m) { // leave the draft address (#order?draft=… → #order) so a reload or Back does not offer the draft again
    var s = state.dh; s.inc = null; s.bad = false; s.msg = m || '';
    try { history.replaceState(history.state, '', location.pathname + location.search + location.hash.replace(/\?.*$/, '')); } catch (e) {}
    s.hash = location.hash; state.navHref = location.href;
    render(true); s.msg = '';
    var el = document.getElementById(m ? 'dh-in' : 'wiz-h'); if (el) { el.focus({ preventScroll: true }); el.scrollIntoView({ block: 'center' }); }
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
        field('files', x.fFiles, select('files', x.fFilesO, o.files), x.yf.hint) + // Your files (2026-11-10): where the files go
        field('mat', x.fMat, select('mat', x.fMatO, o.mat)).replace(/<\/div>$/, mpOpen() + '</div>') + dlBox() + ocBox() + '</div>';
    } else if (st === 2) {
      body = '<h2 class="sub" id="wiz-h" tabindex="-1">' + esc(x.q3) + '</h2><div class="form">' +
        field('name', x.fName, '<input class="nk-input" id="f-name" data-f="name" autocomplete="name" enterkeyhint="next" value="' + esc(o.name) + '">', e.name ? x.errName : null, e.name) +
        field('email', x.fEmail, '<input class="nk-input" id="f-email" data-f="email" type="email" autocomplete="email" autocapitalize="off" spellcheck="false" enterkeyhint="next" value="' + esc(o.email) + '">', e.email ? x.errEmail : null, e.email) +
        '<div class="hp" aria-hidden="true"><label for="f-website">Website</label><input id="f-website" data-f="website" tabindex="-1" autocomplete="off"></div>' +
        ofTypoBox() +
        field('phone', x.eq.phone, '<input class="nk-input" id="f-phone" data-f="phone" type="tel" autocomplete="tel" inputmode="tel" enterkeyhint="next" value="' + esc(o.phone) + '">', e.phone ? x.eq.errPhone : x.eq.phoneH, e.phone) + // Enquiry package (2026-11-04)
        field('reply', x.eq.reply, select('reply', x.eq.replyO, o.reply), e.reply ? x.eq.errReply : null, e.reply) +
        field('note', x.fNote, '<textarea class="nk-input" id="f-note" data-f="note">' + esc(o.note) + '</textarea>', x.fNoteH, false, true) + '</div>' + rvBox(); // Review package (2026-11-05): what the brief says so far, with Edit links
    } else {
      var brief = briefText();
      if (state.send === 'sent') {
        body = '<div class="sent" role="status"><span class="nk-tag nk-tag--ok">' + esc(x.sentTag) + '</span><h2 class="sub" id="wiz-h" tabindex="-1">' + esc(x.sentTitle) + '</h2><p class="hint">' + esc(x.sentBody) + '</p></div>' +
          ocNext() + yfBox(true) + '<pre class="brief" tabindex="0">' + esc(briefText()) + '</pre>' + bpBtn() + rvSelf(); // yfBox: Your files (2026-11-10) // Review package (2026-11-05): a copy to the client's own address
      } else {
      body = (state.send === 'sending' ? '<p class="nk-label" role="status">' + esc(x.sending) + '</p>' : '') + (state.send === 'error' || state.send === 'limited' ? '<p class="err" role="alert">' + esc(state.send === 'limited' ? x.sendLimited : x.sendFail) + '</p>' : '') +
        '<h2 class="sub" id="wiz-h" tabindex="-1">' + esc(x.briefTitle) + '</h2><p class="hint">' + esc(x.briefLead) + '</p>' +
        '<div class="brief-grid"><pre class="brief" id="brief" tabindex="0">' + esc(brief) + '</pre><div class="brief-side"><p class="nk-label">' + esc(x.estimate) + '</p>' + estimate() +
        '<div class="cta-row"><button type="button" class="nk-btn nk-btn--primary" id="copy">' + esc(x.copy) + '</button>' + eqMail() + '<span class="copy-msg" id="copy-msg" role="status"></span></div>' + yfBox(false) + bpBtn() + rvSelf() + // yfBox: Your files (2026-11-10)
        '<p class="nk-label">' + esc(x.sendVia) + '</p>' + (CONTACT_EMAIL ? '<p class="mail" id="mail">' + esc(CONTACT_EMAIL) + '</p><div class="cta-row"><button type="button" class="nk-btn nk-btn--sm" data-mail-copy>' + esc(x.mailCopy) + '</button><span class="copy-msg" id="mail-msg" role="status"></span></div>' : '') +
        '<a class="nk-btn nk-btn--sm" href="' + LINKEDIN + '" target="_blank" rel="noopener">' + esc(x.linkedin) + '<span class="vh"> (' + esc(t().newTab) + ')</span><span class="nk-btn__arrow" aria-hidden="true">↗</span></a></div></div>';
      }
    }
    var steps = '<ol class="nk-process wiz" style="--steps:4" aria-label="' + esc(x.a11y.steps) + '">' + ofSteps(x, st) + '</ol>';
    var nav = '<div class="wiz-nav">' + (st > 0 ? '<button type="button" class="nk-btn" id="back">' + esc(st === 3 ? x.edit : x.back) + '</button>' : '<span></span>') +
      (st < 3 ? '<button type="button" class="nk-btn nk-btn--primary nk-btn--lg" id="next">' + esc(st === 2 ? x.finish : x.next) + '<span class="nk-btn__arrow" aria-hidden="true">→</span></button>' : '') + '</div>';
    return '<section class="block first' + (st === 3 ? ' bp-page' : '') + '">' + head(x.orderLabel, x.orderTitle, x.orderLead, true) + dhIn() + steps + '<form class="wiz-body" id="wiz" novalidate>' + (st < 3 ? drBar() : '') + body + nav + '</form>' + dhOut() + (st === 3 ? bpSheet() : '') + '</section>'; // dhIn / dhOut: Draft hand-over (2026-11-19)
  }
  // ---------- Part studio (#studio; 2026-10-29, 2nd run — "update 2.0") ----------
  // One page from file to order: the part (a client's STL / 3MF / OBJ read by the file check, or a typed size shown as a
  // box) on the X2D build plate with the drawing views + section bar, an orientation picker (all six axis orders, "Turn to
  // fit the printer" from fitCalc), two-point measuring, the material picker's needs, quantity + deadline check, and a live
  // spec sheet (NK-S) that prints as an A4 page, copies as text or fills the order form. Uses only the visitor's own numbers
  // and what is already on the site (BED, MP_MATS, SERVICES turnarounds). Nothing is stored or sent.
  // Self-contained: remove ST_PERMS … stToOrder(), views.studio, 'studio' in PAGES / KBD_GO, the stRefresh() line in
  // fcRefresh(), the 'st' cases in v3State() / v3Handle(), the stMount() / stDispose() lines in render(), the studio items
  // in tlIndex() / tlHome(), the data-st-* lines in the click / input / change handlers, st: + nav.studio in both languages
  // in content.js and the "Part studio" rules at the end of page.css.
  var ST_PERMS = [[0, 1, 2], [1, 0, 2], [0, 2, 1], [2, 0, 1], [1, 2, 0], [2, 1, 0]]; // same order as fitCalc()
  state.st = { name: '', l: '', w: '', h: '', qty: '1', deadline: '', fn: '', axes: 0, meas: null, mon: false, view: 'iso', cut: 100 };
  var st3d = null, st3dTok = 0, stDimTimer = 0;
  function stBoxPos(l, w, h) { // 12 triangles of an l × w × h box (file units = mm, Z-up), for the "typed size" part
    var P = [[0, 0, 0], [l, 0, 0], [l, w, 0], [0, w, 0], [0, 0, h], [l, 0, h], [l, w, h], [0, w, h]], F = [[0, 3, 2, 1], [4, 5, 6, 7], [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7]], out = [];
    F.forEach(function (f) { [[0, 1, 2], [0, 2, 3]].forEach(function (tri) { tri.forEach(function (i) { out.push.apply(out, P[f[i]]); }); }); });
    return new Float32Array(out);
  }
  function stSrc() { // { kind: 'file' | 'box', pos, scale, size: [X, Y, Z] mm } or null
    var r = state.fc.res, s = state.st;
    if (r) return { kind: 'file', pos: r.pos, scale: fcK(), size: fcSize(), name: r.name };
    var d = [fitNum(s.l), fitNum(s.w), fitNum(s.h)];
    if (d[0] && d[1] && d[2]) return { kind: 'box', pos: stBoxPos(d[0], d[1], d[2]), scale: 1, size: d };
    return null;
  }
  function stPerm() { return ST_PERMS[state.st.axes] || ST_PERMS[0]; }
  function stDims(src) { var p = stPerm(); return p.map(function (k) { return fcR1(src.size[k]); }); }
  function stFit(src) { return fitCalc({ l: src.size[0], w: src.size[1], h: src.size[2] }); } // over all orientations
  function stFitPerm(src) { // index into ST_PERMS of the orientation fitCalc found, or -1
    var r = stFit(src); if (!r || !r.fits) return -1;
    for (var i = 0; i < ST_PERMS.length; i++) { var o = ST_PERMS[i].map(function (k) { return src.size[k]; }); if (o[0] === r.o[0] && o[1] === r.o[1] && o[2] === r.o[2]) return i; }
    return -1;
  }
  function stOver(src) { // bed axes the part exceeds in the chosen orientation
    var d = stDims(src);
    return ['X', 'Y', 'Z'].map(function (a, i) { return d[i] > BED[i] ? a + ' ' + fitFmt(d[i]) + ' > ' + BED[i] : ''; }).filter(Boolean);
  }
  function stFitLine(src) {
    var f = t().st, over = stOver(src), r = stFit(src);
    if (!over.length) return ['ok', f.fitsNow];
    if (r && !r.fits) return ['rev', f.noFitAny.replace('{d}', fitFmt(r.over))];
    return ['rev', f.noFit.replace('{d}', over.join(', '))];
  }
  function stDue() { // deadline against the published printing turnaround (S-02), like the planner
    var x = t().dl, d = dlDays(state.st.deadline); if (d == null) return '';
    if (d <= 0) return '<span class="nk-tag nk-tag--rev">' + esc(x.pastTag) + '</span>';
    var svc = SERVICES.filter(function (s) { return s.key === 'print'; })[0], r = svc && dlRange(svc); if (!r) return '';
    var v = d < r[0] ? ['rev', x.short] : d < r[1] ? ['', x.tight] : ['ok', x.ok];
    return '<span class="nk-tag' + (v[0] ? ' nk-tag--' + v[0] : '') + '">' + esc(v[1]) + '</span> ' + esc(d === 1 ? x.day : x.days.replace('{n}', d));
  }
  function stMeasText() {
    var f = t().st, m = state.st.meas;
    if (!m) return st3d && st3d.measuring ? f.measureOn : f.mNone;
    return f.mRes.replace('{mm}', fitFmt(fcR1(m.mm))) + ' · ' + f.mDelta.replace('{x}', fitFmt(fcR1(m.d[0]))).replace('{y}', fitFmt(fcR1(m.d[1]))).replace('{z}', fitFmt(fcR1(m.d[2])));
  }
  function stRows(src) { // [[label, text, tagHtml?]] for the sheet, the clipboard and the brief
    var f = t().st, x = t(), s = state.st, rows = [], fc = t().fc, r = state.fc.res, k = fcK();
    rows.push([f.rows.name, s.name.trim() || f.unnamed]);
    if (!src) return rows;
    rows.push([f.rows.src, src.kind === 'file' ? f.srcFile.replace('{n}', r.name).replace('{f}', r.fmt).replace('{t}', fcNum(r.st.n, 0)) : f.srcBox]);
    rows.push([f.rows.size, fitDims(stDims(src)) + ' mm']);
    rows.push([f.rows.orient, s.axes ? f.turned + ' (' + ['X', 'Y', 'Z'].map(function (a, i) { return 'XYZ'[stPerm()[i]] + '→' + a; }).join(' ') + ')' : f.asFile]);
    var fl = stFitLine(src); rows.push([f.rows.fit, fl[1], fl[0]]);
    rows.push.apply(rows, spRows(src)); // support check (2026-10-31)
    rows.push.apply(rows, wtRows(src)); // wall thickness (2026-11-02)
    if (src.kind === 'file') {
      rows.push([f.rows.closed, r.st.open === null ? fc.closedSkip : r.st.open === 0 ? fc.closedY : fc.closedN + ' · ' + fc.openEdges.replace('{n}', fcNum(r.st.open, 0))]);
      if (r.st.open === 0) rows.push([f.rows.vol, fcNum(r.st.vol * k * k * k / 1000) + ' cm³']);
      rows.push([f.rows.area, fcNum(r.st.area * k * k / 100) + ' cm²']);
    }
    var ch = mpChosen(), need = mpTicked();
    rows.push([f.rows.mat, ch ? ch.name + (ch.ch ? ' · ' + t().mp.chamber : '') : f.matNone]);
    rows.push([f.rows.needs, need.length ? need.map(function (n) { return t().mp.short[n]; }).join(', ') : f.noNeeds]);
    rows.push([f.rows.qty, String(Math.max(1, Math.round(+s.qty || 1)))]);
    var svc = SERVICES.filter(function (v) { return v.key === 'print'; })[0];
    rows.push([f.rows.due, s.deadline ? fmtDate(s.deadline) : '—', 'due']);
    if (svc) rows.push([f.rows.time, svc.code + ' · ' + L(svc.time)]);
    rows.push.apply(rows, stEstRows(src)); // time / material / price estimate (2026-11-02)
    if (s.meas) rows.push([f.rows.meas, stMeasText()]);
    if (s.fn.trim()) rows.push([f.rows.fn, s.fn.trim()]);
    return rows;
  }
  function stSheet() {
    var f = t().st, src = stSrc(), rows = stRows(src), due = stDue();
    return '<div class="pl-head"><span class="nk-label">' + esc(f.sheet) + '</span><span class="nk-label">NK-S · ' + esc(new Date().toISOString().slice(0, 10)) + '</span></div>' +
      '<dl class="st-rows">' + rows.map(function (r) {
        var v = r[2] === 'due' ? esc(r[1]) + (due ? ' <span class="st-due">' + due + '</span>' : '') : r[2] ? '<span class="nk-tag nk-tag--' + r[2] + '">' + esc(r[1]) + '</span>' : esc(r[1]);
        return '<div><dt>' + esc(r[0]) + '</dt><dd>' + v + '</dd></div>';
      }).join('') + '</dl>' +
      (src ? '<div class="cta-row st-act"><button type="button" class="nk-btn nk-btn--primary" data-st-go>' + esc(f.go) + '<span class="nk-btn__arrow" aria-hidden="true">→</span></button>' +
        '<button type="button" class="nk-btn" data-st-print>' + psIco() + ' ' + esc(f.print) + '</button><button type="button" class="nk-btn nk-btn--ghost" data-st-copy>' + esc(f.copy) + '</button><button type="button" class="nk-btn nk-btn--ghost" data-mn-st>' + esc(t().mn.stSave) + '</button><button type="button" class="nk-btn nk-btn--ghost" data-bm-st>' + esc(t().bm.stAdd) + '</button></div>' : '<p class="hint st-hint">' + esc(f.emptyD) + '</p>') +
      '<p class="share-msg" id="st-msg" role="status" aria-live="polite"></p>' + (src ? stEstBox(src) : '') + '<p class="fit-note st-note">' + esc(f.note) + '</p>';
  }
  function stTools(src) {
    var f = t().st, s = state.st, fp = src ? stFitPerm(src) : -1;
    if (!src) return '';
    return '<div class="st-tools"><div class="st-orient"><label class="nk-field__label" for="st-axes">' + esc(f.orient) + '</label><select class="nk-input" id="st-axes" data-st-axes>' +
      ST_PERMS.map(function (p, i) { var d = p.map(function (k) { return fitFmt(fcR1(src.size[k])); }).join(' × '), ok = p.every(function (k, j) { return src.size[k] <= BED[j]; }); return '<option value="' + i + '"' + (s.axes === i ? ' selected' : '') + '>' + esc(d + ' mm' + (i === 0 ? ' · ' + f.asFile : '') + (ok ? ' ✓' : '')) + '</option>'; }).join('') + '</select>' +
      (fp >= 0 && fp !== s.axes ? '<button type="button" class="nk-btn nk-btn--sm" data-st-fit>' + esc(f.fitBtn) + '</button>' : '') + '</div>' +
      '<div class="st-measure"><button type="button" class="chip" data-st-measure aria-pressed="' + !!s.mon + '"><span aria-hidden="true">⟷ </span>' + esc(f.measure) + '</button><output class="nk-label st-meas" id="st-meas">' + esc(stMeasText()) + '</output>' + (s.meas ? '<button type="button" class="pl-link" data-st-mclear>' + esc(f.mClear) + '</button>' : '') + '</div></div>';
  }
  function stStage(src) {
    var f = t().st, x = t();
    if (!src) return '<div class="nk-sheet__art st-empty"><svg viewBox="0 0 120 90" aria-hidden="true" focusable="false"><path class="hid" d="M30 70 L30 30 L60 15 L90 30 L90 70 L60 85 Z M30 30 L60 45 L90 30 M60 45 V85"/></svg><p class="nk-label">' + esc(f.emptyT) + '</p><p class="hint">' + esc(f.emptyD) + '</p></div>';
    return '<div class="nk-viewer st-3d" id="st-3d" role="img" aria-label="' + esc(f.label + ': ' + (src.name || f.srcBox)) + '"><div class="nk-viewer__msg" id="st-3d-msg">' + esc(x.loading3d) + '</div></div>' + v3Bar('st') + stTools(src) + spBox(src) + wtBox(src) + '<p class="viewer-hint">' + esc(f.hint3d) + '</p>';
  }
  function stForm() {
    var f = t().st, x = t(), s = state.st, r = state.fc.res, fs = state.fc, mp = t().mp;
    var num = function (k, label, attrs) { return '<div class="nk-field"><label class="nk-field__label" for="st-' + k + '">' + esc(label) + '</label><input class="nk-input" id="st-' + k + '" data-st-f="' + k + '" ' + attrs + ' value="' + esc(s[k]) + '"></div>'; };
    var file = r ? '<p class="st-file"><span class="nk-label">' + esc(f.file) + '</span> <b>' + esc(r.name) + '</b> · ' + esc(r.fmt) + ' <button type="button" class="pl-link" data-st-fclear>' + esc(f.remove) + '</button></p>' :
      '<label class="fc-drop st-drop" for="st-file"><span class="fc-drop__t">' + esc(t().fc.pick) + '</span><span class="fc-drop__h">' + esc(f.fileHint) + '</span><input class="fc-file" id="st-file" type="file" accept=".stl,.3mf,.obj,model/stl,model/3mf" data-st-file' + (fs.busy ? ' disabled' : '') + '></label>' +
      (fs.busy ? '<p class="hint">' + esc(t().fc.busy) + '</p>' : fs.err ? '<p class="fc-err"><span class="nk-tag nk-tag--rev">' + esc(t().fc.errTag) + '</span> ' + esc(fs.err) + '</p>' : '');
    return '<form class="pl-form st-form" novalidate>' +
      '<fieldset class="pl-q"><legend class="nk-label">' + esc(f.s1) + '</legend>' + num('name', f.name, 'type="text" maxlength="80" placeholder="' + esc(f.namePh) + '" autocomplete="off"') + file +
      (r ? '' : '<p class="nk-field__label st-or" id="st-size-l">' + esc(f.orSize) + '</p><div class="fit-inputs" role="group" aria-labelledby="st-size-l">' + num('l', t().fit.l, 'type="number" inputmode="decimal" min="0" step="any"') + num('w', t().fit.w, 'type="number" inputmode="decimal" min="0" step="any"') + num('h', t().fit.h, 'type="number" inputmode="decimal" min="0" step="any"') + '</div>') + '</fieldset>' +
      '<fieldset class="pl-q"><legend class="nk-label">' + esc(f.s2) + '</legend><div class="mp-opts">' + MP_NEEDS.map(function (k) { return '<label class="pl-opt"><input type="checkbox" value="' + k + '" data-st-need' + (state.mp.needs[k] ? ' checked' : '') + '><span>' + esc(mp.needs[k]) + '</span></label>'; }).join('') + '</div></fieldset>' +
      '<fieldset class="pl-q"><legend class="nk-label">' + esc(f.s3) + '</legend><div class="pl-pair">' + num('qty', x.fQty, 'type="number" min="1" step="1"') + num('deadline', x.fDeadline, 'type="date" min="' + dlMin() + '"') + '</div>' + pbStLink() +
      '<div class="nk-field"><label class="nk-field__label" for="st-fn">' + esc(f.fn) + '</label><textarea class="nk-input st-fn" id="st-fn" data-st-f="fn" rows="3" placeholder="' + esc(f.fnPh) + '">' + esc(s.fn) + '</textarea></div></fieldset></form>';
  }
  function stView() {
    var f = t().st, src = stSrc();
    return '<section class="block first st" id="studio">' + head(f.label, f.title, f.lead, true) +
      '<div class="st-grid"><div class="st-stage" id="st-stage">' + stStage(src) + '</div><div class="st-side" id="st-side">' + stForm() + '</div>' +
      '<div class="pl-sheet st-sheet" id="st-sheet">' + stSheet() + '</div></div>' + dwBox() + '</section>' + ctaBand(); // dwBox(): drawing sheet NK-D (2026-11-02, evening run)
  }
  function stDispose() { st3dTok++; if (st3d) { st3d.dispose(); st3d = null; } }
  function stMount() {
    stDispose();
    var el = document.getElementById('st-3d'), src = stSrc(); if (!el || !src) return;
    var tok = st3dTok, go = function () {
      if (tok !== st3dTok || !document.body.contains(el)) return;
      window.NKViewer.mount(el, { positions: src.pos, scale: src.scale, bed: BED, still: true, onMeasure: function (m) { state.st.meas = m; stMeasShow(); } }).then(function (v) {
        if (tok !== st3dTok || !document.body.contains(el)) { v.dispose(); return; }
        st3d = v; var m = document.getElementById('st-3d-msg'); if (m) m.remove();
        if (state.st.axes) v.setAxes(stPerm());
        v.setMeasure(!!state.st.mon);
        v3Sync('st'); stMeasShow(); spApply(); wtApply();
      }, function () { var m = document.getElementById('st-3d-msg'); if (m) m.textContent = t().viewerFail; });
    };
    if (window.NKViewer) go(); else { window.addEventListener('nkviewer:ready', go, { once: true }); if (window.NKViewerLoad) window.NKViewerLoad(); }
  }
  function stSheetShow() { var el = document.getElementById('st-sheet'); if (el) el.innerHTML = stSheet(); dwShow(); } // dwShow(): the drawing sheet follows every change (2026-11-02, evening run)
  function stMeasShow() {
    var o = document.getElementById('st-meas'); if (o) o.textContent = stMeasText();
    var c = document.querySelector('[data-st-mclear]'), tools = document.querySelector('.st-measure');
    if (state.st.meas && !c && tools) tools.insertAdjacentHTML('beforeend', '<button type="button" class="pl-link" data-st-mclear>' + esc(t().st.mClear) + '</button>');
    if (!state.st.meas && c) c.remove();
    stSheetShow();
  }
  function stRefresh(focusSel) { // the file changed (read, failed or removed): stage, form and sheet are rebuilt
    var stage = document.getElementById('st-stage'), side = document.getElementById('st-side'); if (!stage || !side) return;
    state.st.axes = 0; state.st.meas = null;
    stage.innerHTML = stStage(stSrc()); side.innerHTML = stForm(); stSheetShow(); stMount();
    var el = focusSel && document.querySelector(focusSel); if (el) el.focus({ preventScroll: true });
  }
  function stDims3d() { // typed size changed: a new box after a short pause (not on every keystroke)
    clearTimeout(stDimTimer);
    stDimTimer = setTimeout(function () { if (!document.getElementById('st-stage') || state.fc.res) return; var stage = document.getElementById('st-stage'); state.st.axes = 0; state.st.meas = null; stage.innerHTML = stStage(stSrc()); stSheetShow(); stMount(); }, 350);
  }
  function stAxes(i) {
    state.st.axes = +i || 0; state.st.meas = null;
    if (st3d) st3d.setAxes(stPerm());
    var src = stSrc(), tools = document.querySelector('.st-tools'); if (tools && src) tools.outerHTML = stTools(src);
    var sup = document.getElementById('st-sup'); if (sup && src) sup.outerHTML = spBox(src);
    spApply(); stSheetShow();
    var sel = document.getElementById('st-axes'); if (sel) sel.focus({ preventScroll: true });
  }
  function stMeasure() {
    state.st.mon = !state.st.mon; if (!state.st.mon) state.st.meas = null;
    if (st3d) st3d.setMeasure(state.st.mon);
    var b = document.querySelector('[data-st-measure]'); if (b) b.setAttribute('aria-pressed', String(state.st.mon));
    stMeasShow();
  }
  function stText() {
    var f = t().st, rows = stRows(stSrc());
    return [f.sheet.toUpperCase() + ' NK-S — nacekepa.work'].concat(rows.map(function (r) { return r[0] + ': ' + r[1]; })).join('\n');
  }
  function stCopy() {
    var msg = document.getElementById('st-msg'), f = t().st;
    var fail = function () { msg.textContent = f.copyFail; var o = document.querySelector('.st-rows'); if (o) { var r = document.createRange(); r.selectNodeContents(o); var g = getSelection(); g.removeAllRanges(); g.addRange(r); } };
    try { navigator.clipboard.writeText(stText()).then(function () { msg.textContent = f.copied; }, fail); } catch (e) { fail(); }
  }
  function stToOrder() {
    var o = state.order, f = t().st, s = state.st, src = stSrc(); if (!src) return;
    if (o.services.indexOf('print') < 0) o.services.push('print');
    if (src.kind === 'box' && o.services.indexOf('cad') < 0) o.services.push('cad');
    o.files = src.kind === 'file' ? 2 : Math.max(+o.files || 0, 0);
    var ch = mpChosen(); o.mat = ch ? ch.o : 0;
    o.qty = String(Math.max(1, Math.round(+s.qty || 1)));
    if (dlDays(s.deadline) > 0) o.deadline = s.deadline;
    var rows = stRows(src).filter(function (r) { return r[0] !== f.rows.fn && r[0] !== f.rows.needs; });
    var line = f.brief + ': ' + rows.map(function (r) { return r[0] + ': ' + r[1]; }).join('; ') + '.';
    if (o.what.indexOf(f.brief + ':') < 0) o.what = o.what ? line + '\n' + o.what : line;
    else o.what = o.what.split('\n').map(function (l) { return l.indexOf(f.brief + ':') === 0 ? line : l; }).join('\n');
    if (s.fn.trim() && o.what.indexOf(s.fn.trim()) < 0) o.what += '\n' + s.fn.trim();
    state.step = 1; state.errors = {}; state.send = 'idle';
    location.hash = 'order';
  }
  function stOpen() { return '<p class="pl-open st-open"><a href="#studio">' + esc(t().st.open) + ' →</a></p>'; }

  // ---------- Support check in the Part studio (2026-10-31): faces that need support, per orientation ----------
  // Every triangle's downward tilt is compared with the limit (default 45° from vertical) in each of the six orientations
  // of ST_PERMS; faces lying flat on the plate count as the first layer instead. The faces of the chosen orientation are
  // painted red in the 3D view (viewer.setOverlay). Geometry only — no print times, no prices. Self-contained: remove
  // SP_DEF … spToggle(), spBox() in stStage(), the spRows() line in stRows(), spApply() in stMount() / stAxes(), the
  // data-st-sp* lines in the click handler and the sp input listener, sp: in st in both languages in content.js,
  // setOverlay() in viewer.js and the "Support check" rules at the end of page.css.
  var SP_DEF = 45, spCache = null;
  state.sp = { on: false, deg: String(SP_DEF) };
  function spDeg() { var d = parseFloat(String(state.sp.deg).replace(',', '.')); return d >= 10 && d <= 89 ? Math.round(d) : SP_DEF; }
  function spCm2(mm2) { return fcNum(mm2 / 100) + ' cm²'; }
  function spCalc(src) { // { per: [{ sup, base, fits }] in mm² per ST_PERMS, total mm², best: index } — cached per source and limit
    var deg = spDeg(), key = src.pos.length + ':' + src.scale + ':' + deg + ':' + (src.kind === 'file' && state.fc.res ? state.fc.res.name : 'box');
    if (spCache && spCache.key === key && spCache.pos === src.pos) return spCache;
    var pos = src.pos, n = Math.floor(pos.length / 9), k = src.scale > 0 ? src.scale : 1, sin = Math.sin(deg * Math.PI / 180), eps = 0.02 / k;
    var mn = [Infinity, Infinity, Infinity], i, j;
    for (i = 0; i < n * 9; i++) { j = i % 3; if (pos[i] < mn[j]) mn[j] = pos[i]; }
    var per = ST_PERMS.map(function (p) { return { sup: 0, base: 0, fits: p.every(function (ax, q) { return src.size[ax] <= BED[q]; }) }; }), total = 0;
    for (i = 0; i < n; i++) {
      var o = i * 9, ux = pos[o + 3] - pos[o], uy = pos[o + 4] - pos[o + 1], uz = pos[o + 5] - pos[o + 2], wx = pos[o + 6] - pos[o], wy = pos[o + 7] - pos[o + 1], wz = pos[o + 8] - pos[o + 2];
      var nx = uy * wz - uz * wy, ny = uz * wx - ux * wz, nz = ux * wy - uy * wx, len = Math.sqrt(nx * nx + ny * ny + nz * nz);
      if (!(len > 0) || !isFinite(len)) continue;
      var a = len / 2, un = [nx / len, ny / len, nz / len]; total += a;
      for (j = 0; j < ST_PERMS.length; j++) {
        var z = ST_PERMS[j][2], down = -un[z];
        if (down > 0.999 && pos[o + z] <= mn[z] + eps && pos[o + 3 + z] <= mn[z] + eps && pos[o + 6 + z] <= mn[z] + eps) per[j].base += a;
        else if (down >= sin) per[j].sup += a;
      }
    }
    var kk = k * k; per.forEach(function (r) { r.sup *= kk; r.base *= kk; }); total *= kk;
    var best = 0;
    for (j = 1; j < per.length; j++) { var b = per[best], c = per[j]; if ((c.fits && !b.fits) || (c.fits === b.fits && (c.sup < b.sup - 1e-6 || (Math.abs(c.sup - b.sup) <= 1e-6 && c.base > b.base + 1e-6)))) best = j; }
    spCache = { key: key, pos: pos, per: per, total: total, best: best };
    return spCache;
  }
  function spTris(src) { // the triangles that need support in the chosen orientation (file coordinates), for the 3D overlay
    var pos = src.pos, n = Math.floor(pos.length / 9), k = src.scale > 0 ? src.scale : 1, sin = Math.sin(spDeg() * Math.PI / 180), eps = 0.02 / k, z = stPerm()[2];
    var mn = Infinity, i, o, out = [];
    for (i = z; i < n * 9; i += 3) if (pos[i] < mn) mn = pos[i];
    for (i = 0; i < n; i++) {
      o = i * 9;
      var ux = pos[o + 3] - pos[o], uy = pos[o + 4] - pos[o + 1], uz = pos[o + 5] - pos[o + 2], wx = pos[o + 6] - pos[o], wy = pos[o + 7] - pos[o + 1], wz = pos[o + 8] - pos[o + 2];
      var nn = [uy * wz - uz * wy, uz * wx - ux * wz, ux * wy - uy * wx], len = Math.sqrt(nn[0] * nn[0] + nn[1] * nn[1] + nn[2] * nn[2]);
      if (!(len > 0) || !isFinite(len)) continue;
      var down = -nn[z] / len;
      if (down > 0.999 && pos[o + z] <= mn + eps && pos[o + 3 + z] <= mn + eps && pos[o + 6 + z] <= mn + eps) continue;
      if (down >= sin) for (var q = 0; q < 9; q++) out.push(pos[o + q]);
    }
    return new Float32Array(out);
  }
  function spApply() { if (st3d && st3d.setOverlay) { var src = stSrc(); st3d.setOverlay(state.sp.on && src ? spTris(src) : null); } }
  function spRows(src) { // two sheet rows: support area in the chosen orientation and the first-layer area
    var f = t().st.sp, r = spCalc(src), c = r.per[state.st.axes] || r.per[0];
    return [[f.rowSup.replace('{d}', spDeg()), c.sup > 0 ? spCm2(c.sup) + ' · ' + fcNum(r.total > 0 ? c.sup / r.total * 100 : 0, 0) + ' %' : f.rowNone], [f.rowBase, spCm2(c.base)]];
  }
  function spOut(src) {
    var f = t().st.sp, r = spCalc(src), cur = state.st.axes, c = r.per[cur] || r.per[0], deg = spDeg();
    var res = c.sup > 0 ? f.sup.replace('{a}', fcNum(c.sup / 100)).replace('{p}', fcNum(r.total > 0 ? c.sup / r.total * 100 : 0, 0)) : f.none.replace('{d}', deg);
    var rows = ST_PERMS.map(function (p, i) {
      var q = r.per[i], d = p.map(function (ax) { return fitFmt(fcR1(src.size[ax])); }).join(' × ');
      return '<tr' + (i === cur ? ' class="is-cur" aria-current="true"' : '') + '><td>' + esc(d) + (q.fits ? ' <span class="st-sup__ok" title="' + esc(f.fits) + '">✓</span>' : ' <span class="st-sup__no">' + esc(f.noFit) + '</span>') + (i === r.best ? '<br><span class="st-sup__best">' + esc(f.best) + '</span>' : '') + '</td>' +
        '<td>' + (q.sup > 0 ? esc(spCm2(q.sup) + ' · ' + fcNum(r.total > 0 ? q.sup / r.total * 100 : 0, 0) + ' %') : '0') + '</td><td>' + esc(spCm2(q.base)) + '</td>' +
        '<td>' + (i === cur ? '<span class="nk-label">' + esc(f.cur) + '</span>' : '<button type="button" class="pl-link" data-st-sp-use="' + i + '">' + esc(f.use) + '</button>') + '</td></tr>';
    }).join('');
    return '<p class="st-sup__res" role="status" aria-live="polite">' + esc(res) + ' · ' + esc(f.base.replace('{a}', fcNum(c.base / 100))) + '</p>' +
      '<table class="st-sup__t"><caption class="nk-label">' + esc(f.table) + '</caption><thead><tr><th scope="col">' + esc(f.colSize) + '</th><th scope="col">' + esc(f.colSup) + '</th><th scope="col">' + esc(f.colBase) + '</th><th scope="col">' + esc(f.colUse) + '</th></tr></thead><tbody>' + rows + '</tbody></table>' +
      '<p class="fit-note st-sup__note">' + esc(src.kind === 'box' ? f.box : f.note.replace('{d}', deg)) + '</p>';
  }
  function spBox(src) {
    var f = t().st.sp;
    if (!src) return '';
    return '<div class="st-sup" id="st-sup"><div class="st-sup__head"><span class="nk-label">' + esc(f.label) + '</span>' +
      '<button type="button" class="chip" data-st-sp aria-pressed="' + !!state.sp.on + '"><span aria-hidden="true">▲ </span>' + esc(f.toggle) + '</button>' +
      '<label class="st-sup__deg"><span class="nk-field__label">' + esc(f.deg) + '</span><input class="nk-input" id="st-sp-deg" type="number" inputmode="numeric" min="10" max="89" step="5" value="' + esc(state.sp.deg) + '" data-st-sp-deg><span aria-hidden="true">°</span></label></div>' +
      '<div id="st-sp-out">' + spOut(src) + '</div></div>';
  }
  function spUpdate() { // the limit changed: results, table, sheet and overlay follow (the input keeps focus)
    var src = stSrc(), o = document.getElementById('st-sp-out'); if (!src || !o) return;
    o.innerHTML = spOut(src); stSheetShow(); spApply();
  }
  function spToggle() {
    state.sp.on = !state.sp.on;
    if (state.sp.on && state.wt.on) { state.wt.on = false; var wb = document.querySelector('[data-st-wt]'); if (wb) wb.setAttribute('aria-pressed', 'false'); } // one overlay slot (2026-11-02)
    var b = document.querySelector('[data-st-sp]'); if (b) { b.setAttribute('aria-pressed', String(state.sp.on)); b.focus({ preventScroll: true }); }
    spApply();
  }


  // ---------- Part studio 2.0 (2026-11-02, big update part 3): wall-thickness check + time / material / price estimate ----------
  // wtCalc(): every triangle's local thickness = distance from its centroid straight inwards to the first other triangle
  // (ray → uniform grid, Möller–Trumbore), sampled to ≤ WT_MAX triangles on big meshes; a typed size is a box (smallest
  // side). Output: thinnest wall (2nd percentile by area, so one sliver does not decide), a histogram by thickness, the
  // area under a limit the visitor types (empty = none) and a red overlay of the thin triangles (shares the viewer's one
  // overlay slot with the support check — switching one on switches the other off).
  // stEst(): material ≈ shell (surface × walls × line width) + infill of the rest, mass from the material's density,
  // time = material volume / deposition rate, price through the same rates as the quote estimate — every number from
  // settings.json (printing + pricing); a missing one hides that row.
  // Self-contained: remove WT_MAX … stEstRows(), wtBox(src) in stStage(), the wtRows / stEstRows lines in stRows(), the
  // wtApply() line in stMount() / stAxes(), the data-st-wt* lines in the click / input handlers, the sp↔wt exclusivity line
  // in spToggle(), st.wt + st.est in both languages in content.js and the "Part studio 2.0" rules at the end of page.css.
  var WT_MAX = 40000, WT_BINS = [0.8, 1.2, 2, 4], wtCache = null;
  state.wt = { on: false, limit: '' };
  function wtLimit() { var v = parseFloat(String(state.wt.limit).replace(',', '.')); return v > 0 && v < 1000 ? v : 0; }
  function wtCalc(src) { // { th: Float32Array(n) mm (-1 = no hit), area: Float32Array(n) mm², total, p2, median, bins[], sampled }
    var key = src.pos.length + ':' + src.scale + ':' + (src.kind === 'file' && state.fc.res ? state.fc.res.name : 'box');
    if (wtCache && wtCache.key === key && wtCache.pos === src.pos) return wtCache;
    var pos = src.pos, n = Math.floor(pos.length / 9), k = src.scale > 0 ? src.scale : 1, i, j;
    var mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity];
    for (i = 0; i < n * 9; i++) { j = i % 3; if (pos[i] < mn[j]) mn[j] = pos[i]; if (pos[i] > mx[j]) mx[j] = pos[i]; }
    var ext = [mx[0] - mn[0] || 1, mx[1] - mn[1] || 1, mx[2] - mn[2] || 1], diag = Math.sqrt(ext[0] * ext[0] + ext[1] * ext[1] + ext[2] * ext[2]);
    // normals, centroids, areas; signed volume tells whether the file's winding points outwards
    var nx = new Float32Array(n), ny = new Float32Array(n), nz = new Float32Array(n), cx = new Float32Array(n), cy = new Float32Array(n), cz = new Float32Array(n), ar = new Float32Array(n), vol6 = 0;
    for (i = 0; i < n; i++) {
      var o = i * 9, ax = pos[o], ay = pos[o + 1], az = pos[o + 2], bx = pos[o + 3], by = pos[o + 4], bz = pos[o + 5], qx = pos[o + 6], qy = pos[o + 7], qz = pos[o + 8];
      var ux = bx - ax, uy = by - ay, uz = bz - az, wx = qx - ax, wy = qy - ay, wz = qz - az;
      var x = uy * wz - uz * wy, y = uz * wx - ux * wz, z = ux * wy - uy * wx, len = Math.sqrt(x * x + y * y + z * z);
      if (len > 0 && isFinite(len)) { nx[i] = x / len; ny[i] = y / len; nz[i] = z / len; ar[i] = len / 2; }
      cx[i] = (ax + bx + qx) / 3; cy[i] = (ay + by + qy) / 3; cz[i] = (az + bz + qz) / 3;
      vol6 += ax * (by * qz - bz * qy) - ay * (bx * qz - bz * qx) + az * (bx * qy - by * qx);
    }
    var sgn = vol6 < 0 ? 1 : -1; // ray direction = -normal (inwards) when the winding is outward
    // uniform grid over the bounding box
    var G = Math.max(4, Math.min(40, Math.round(Math.cbrt(n / 4)))), cs = [ext[0] / G, ext[1] / G, ext[2] / G], cells = new Array(G * G * G), ci = function (a, b, c) { return (a * G + b) * G + c; };
    var cl = function (v, d) { var q = Math.floor((v - mn[d]) / cs[d]); return q < 0 ? 0 : q >= G ? G - 1 : q; };
    for (i = 0; i < n; i++) {
      var o2 = i * 9, x0 = cl(Math.min(pos[o2], pos[o2 + 3], pos[o2 + 6]), 0), x1 = cl(Math.max(pos[o2], pos[o2 + 3], pos[o2 + 6]), 0), y0 = cl(Math.min(pos[o2 + 1], pos[o2 + 4], pos[o2 + 7]), 1), y1 = cl(Math.max(pos[o2 + 1], pos[o2 + 4], pos[o2 + 7]), 1), z0 = cl(Math.min(pos[o2 + 2], pos[o2 + 5], pos[o2 + 8]), 2), z1 = cl(Math.max(pos[o2 + 2], pos[o2 + 5], pos[o2 + 8]), 2);
      for (var a = x0; a <= x1; a++) for (var b = y0; b <= y1; b++) for (var c = z0; c <= z1; c++) { var id = ci(a, b, c); (cells[id] || (cells[id] = [])).push(i); }
    }
    var hit = function (ti, ox, oy, oz, dx, dy, dz, tmax) { // Möller–Trumbore: distance along the ray or -1
      var o3 = ti * 9, ax = pos[o3], ay = pos[o3 + 1], az = pos[o3 + 2], e1x = pos[o3 + 3] - ax, e1y = pos[o3 + 4] - ay, e1z = pos[o3 + 5] - az, e2x = pos[o3 + 6] - ax, e2y = pos[o3 + 7] - ay, e2z = pos[o3 + 8] - az;
      var px = dy * e2z - dz * e2y, py = dz * e2x - dx * e2z, pz = dx * e2y - dy * e2x, det = e1x * px + e1y * py + e1z * pz;
      if (det > -1e-12 && det < 1e-12) return -1;
      var inv = 1 / det, tx = ox - ax, ty = oy - ay, tz = oz - az, u = (tx * px + ty * py + tz * pz) * inv; if (u < -1e-6 || u > 1 + 1e-6) return -1;
      var qx2 = ty * e1z - tz * e1y, qy2 = tz * e1x - tx * e1z, qz2 = tx * e1y - ty * e1x, v = (dx * qx2 + dy * qy2 + dz * qz2) * inv; if (v < -1e-6 || u + v > 1 + 1e-6) return -1;
      var tt = (e2x * qx2 + e2y * qy2 + e2z * qz2) * inv; return tt > 0 && tt <= tmax ? tt : -1;
    };
    var stride = n > WT_MAX ? Math.ceil(n / WT_MAX) : 1, th = new Float32Array(n).fill(-1), eps = diag * 1e-5;
    for (i = 0; i < n; i += stride) {
      if (!(ar[i] > 0)) continue;
      var dx = sgn * nx[i], dy = sgn * ny[i], dz = sgn * nz[i], ox = cx[i] + dx * eps, oy = cy[i] + dy * eps, oz = cz[i] + dz * eps, best = diag;
      // 3D DDA through the grid
      var gx = cl(ox, 0), gy = cl(oy, 1), gz = cl(oz, 2), sx = dx > 0 ? 1 : -1, sy = dy > 0 ? 1 : -1, sz = dz > 0 ? 1 : -1;
      var tmx = dx !== 0 ? ((mn[0] + (gx + (dx > 0 ? 1 : 0)) * cs[0]) - ox) / dx : Infinity, tmy = dy !== 0 ? ((mn[1] + (gy + (dy > 0 ? 1 : 0)) * cs[1]) - oy) / dy : Infinity, tmz = dz !== 0 ? ((mn[2] + (gz + (dz > 0 ? 1 : 0)) * cs[2]) - oz) / dz : Infinity;
      var tdx = dx !== 0 ? Math.abs(cs[0] / dx) : Infinity, tdy = dy !== 0 ? Math.abs(cs[1] / dy) : Infinity, tdz = dz !== 0 ? Math.abs(cs[2] / dz) : Infinity, tcur = 0, guard = 0;
      while (guard++ < 3 * G + 3) {
        var list = cells[ci(gx, gy, gz)];
        if (list) for (j = 0; j < list.length; j++) { var ti = list[j]; if (ti === i) continue; var tt = hit(ti, ox, oy, oz, dx, dy, dz, best); if (tt > 0 && tt < best) best = tt; }
        if (tmx < tmy && tmx < tmz) { tcur = tmx; tmx += tdx; gx += sx; } else if (tmy < tmz) { tcur = tmy; tmy += tdy; gy += sy; } else { tcur = tmz; tmz += tdz; gz += sz; }
        if (tcur > best || gx < 0 || gy < 0 || gz < 0 || gx >= G || gy >= G || gz >= G) break;
      }
      th[i] = best < diag ? best * k : -1;
    }
    // area-weighted statistics in mm (file units × scale)
    var kk = k * k, items = [], total = 0;
    for (i = 0; i < n; i++) if (th[i] >= 0) { items.push([th[i], ar[i] * kk * stride]); total += ar[i] * kk * stride; }
    items.sort(function (a, b) { return a[0] - b[0]; });
    var acc = 0, p2 = 0, median = 0;
    for (i = 0; i < items.length; i++) { acc += items[i][1]; if (!p2 && acc >= total * 0.02) p2 = items[i][0]; if (!median && acc >= total * 0.5) { median = items[i][0]; break; } }
    var bins = WT_BINS.concat([Infinity]).map(function () { return 0; });
    items.forEach(function (it) { for (j = 0; j < WT_BINS.length; j++) if (it[0] < WT_BINS[j]) break; bins[j] += it[1]; });
    wtCache = { key: key, pos: pos, th: th, area: ar, kk: kk, stride: stride, total: total, p2: p2, median: median, bins: bins, sampled: stride > 1 };
    return wtCache;
  }
  function wtUnder(r, lim) { var a = 0, i; for (i = 0; i < r.th.length; i++) if (r.th[i] >= 0 && r.th[i] < lim) a += r.area[i] * r.kk * r.stride; return a; }
  function wtTris(src, lim) { var r = wtCalc(src), pos = src.pos, out = [], i, q; for (i = 0; i < r.th.length; i++) if (r.th[i] >= 0 && r.th[i] < lim) for (q = 0; q < 9; q++) out.push(pos[i * 9 + q]); return new Float32Array(out); }
  function wtApply() { if (st3d && st3d.setOverlay) { var src = stSrc(), lim = wtLimit(); if (state.wt.on) st3d.setOverlay(src && src.kind === 'file' && lim ? wtTris(src, lim) : null); } }
  function wtOut(src) {
    var f = t().st.wt;
    if (src.kind === 'box') { var m = Math.min.apply(null, src.size); return '<p class="st-sup__res">' + esc(f.thin.replace('{mm}', fitFmt(fcR1(m)))) + '</p><p class="fit-note st-sup__note">' + esc(f.box) + '</p>'; }
    var r = wtCalc(src), lim = wtLimit(), under = lim ? wtUnder(r, lim) : 0;
    var hist = '<div class="st-wt__hist" role="img" aria-label="' + esc(f.hist) + '">' + r.bins.map(function (a, i) { var lo = i ? WT_BINS[i - 1] : 0, hi = WT_BINS[i], lbl = hi === undefined ? '≥ ' + lo : (i ? lo + '–' + hi : '< ' + hi), pct = r.total > 0 ? a / r.total * 100 : 0; return '<div class="st-wt__bar"><span class="nk-label">' + esc(lbl + ' ' + f.mm) + '</span><i style="--w:' + Math.max(1, Math.round(pct)) + '%"></i><b>' + esc(fcNum(pct, 0) + ' %') + '</b></div>'; }).join('') + '</div>';
    return '<p class="st-sup__res" role="status" aria-live="polite">' + esc(f.thin.replace('{mm}', fitFmt(fcR1(r.p2)))) + (r.median ? ' · ' + esc(f.typical.replace('{mm}', fitFmt(fcR1(r.median)))) : '') +
      (lim ? '<br>' + (under > 0 ? '<span class="nk-tag nk-tag--rev">' + esc(f.under.replace('{l}', fitFmt(lim)).replace('{a}', fcNum(under / 100)).replace('{p}', fcNum(r.total > 0 ? under / r.total * 100 : 0, 0))) + '</span>' : '<span class="nk-tag nk-tag--ok">' + esc(f.underNone.replace('{l}', fitFmt(lim))) + '</span>') : '') + '</p>' + hist +
      '<p class="fit-note st-sup__note">' + esc(f.note) + '</p>';
  }
  function wtBox(src) {
    var f = t().st.wt; if (!src) return '';
    return '<div class="st-sup st-wt" id="st-wt"><div class="st-sup__head"><span class="nk-label">' + esc(f.label) + '</span>' +
      (src.kind === 'file' ? '<button type="button" class="chip" data-st-wt aria-pressed="' + !!state.wt.on + '"><span aria-hidden="true">▣ </span>' + esc(f.toggle) + '</button>' +
      '<label class="st-sup__deg"><span class="nk-field__label">' + esc(f.limit) + '</span><input class="nk-input" id="st-wt-lim" type="number" inputmode="decimal" min="0.1" max="50" step="0.1" value="' + esc(state.wt.limit) + '" data-st-wt-lim placeholder="—"><span aria-hidden="true">mm</span></label>' : '') + '</div>' +
      '<div id="st-wt-out">' + wtOut(src) + '</div></div>';
  }
  function wtRows(src) {
    var f = t().st.wt, rows = [];
    if (src.kind === 'box') { rows.push([f.rowThin, fitFmt(fcR1(Math.min.apply(null, src.size))) + ' mm']); return rows; }
    var r = wtCalc(src), lim = wtLimit();
    rows.push([f.rowThin, '≈ ' + fitFmt(fcR1(r.p2)) + ' mm']);
    if (lim) { var u = wtUnder(r, lim); rows.push([f.rowUnder.replace('{l}', fitFmt(lim)), u > 0 ? fcNum(u / 100) + ' cm² · ' + fcNum(r.total > 0 ? u / r.total * 100 : 0, 0) + ' %' : f.underNone.replace('{l}', fitFmt(lim)), u > 0 ? 'rev' : 'ok']); }
    return rows;
  }
  function wtUpdate() { var src = stSrc(), o = document.getElementById('st-wt-out'); if (!src || !o) return; o.innerHTML = wtOut(src); stSheetShow(); wtApply(); }
  function wtToggle() {
    state.wt.on = !state.wt.on;
    if (state.wt.on && state.sp.on) { state.sp.on = false; var sb = document.querySelector('[data-st-sp]'); if (sb) sb.setAttribute('aria-pressed', 'false'); }
    var b = document.querySelector('[data-st-wt]'); if (b) { b.setAttribute('aria-pressed', String(state.wt.on)); b.focus({ preventScroll: true }); }
    if (state.wt.on) wtApply(); else if (st3d && st3d.setOverlay) st3d.setOverlay(null);
  }
  // Estimate rows (material, print time, price) for the NK-S sheet, the clipboard and the brief.
  function stEst(src) { // { vcm3, g, h, mat, cost } or null when settings give no rate
    var pr = SET.printing || {}, rate = +pr.rateCm3h; if (!(rate > 0) || !src) return null;
    var vmm3, amm2;
    if (src.kind === 'box') { vmm3 = src.size[0] * src.size[1] * src.size[2]; amm2 = 2 * (src.size[0] * src.size[1] + src.size[1] * src.size[2] + src.size[0] * src.size[2]); }
    else { var r = state.fc.res, k = fcK(); if (!r || r.st.open !== 0) return null; vmm3 = r.st.vol * k * k * k; amm2 = r.st.area * k * k; }
    var ch = mpChosen();
    return estPrint(vmm3, amm2, ch ? pcMat(ch.id) : null, +state.st.qty);
  }
  function estPrint(vmm3, amm2, m, qty) { // the print estimate's rules in one place (Part studio, parts list): volume + surface in mm → { vcm3, g, h, mat, qty, cost } or null without a rate
    var pr = SET.printing || {}, rate = +pr.rateCm3h; if (!(rate > 0) || !(vmm3 > 0)) return null;
    var walls = +pr.walls > 0 ? +pr.walls : 3, lw = +pr.lineWidth > 0 ? +pr.lineWidth : 0.4, infill = +pr.infill >= 0 ? Math.min(100, +pr.infill) : 15;
    var shell = Math.min(vmm3, amm2 * walls * lw), inner = Math.max(0, vmm3 - shell), vmat = (shell + inner * infill / 100) / 1000; // cm³ — every surface gets its wall loops; the rest is infill
    var g = m && +m.density > 0 ? vmat * +m.density : 0, h = vmat / rate;
    qty = Math.max(1, Math.round(+qty || 1)); var cost = null;
    if (PRICE && m && g && (+PRICE.print.machineHour > 0 || +m.perGram > 0)) {
      var part = g * +m.perGram + h * (+PRICE.print.machineHour || 0); if (+PRICE.print.minPart > 0 && part < +PRICE.print.minPart) part = +PRICE.print.minPart;
      var order = part * qty + (+PRICE.print.setup || 0); if (+PRICE.print.minOrder > 0 && order < +PRICE.print.minOrder) order = +PRICE.print.minOrder;
      cost = { part: part, order: order };
    }
    return { vcm3: vmm3 / 1000, g: g, h: h, mat: m, qty: qty, cost: cost };
  }
  function stEstRows(src) {
    var f = t().st.est, e = stEst(src), rows = []; if (!e) return rows;
    rows.push([f.rowMat, e.g ? f.mat.replace('{g}', fcNum(e.g, 0)).replace('{m}', e.mat.name) : f.matNo]);
    rows.push([f.rowTime, f.time.replace('{h}', fcNum(e.h, 1))]);
    if (e.cost) rows.push([f.rowPrice, e.qty > 1 ? f.price.replace('{p}', pcMoney(e.cost.part, 2)).replace('{q}', pcMoney(e.cost.order, 2)).replace('{n}', e.qty) : f.priceOne.replace('{p}', pcMoney(e.cost.order, 2))]);
    return rows;
  }
  function stEstBox(src) {
    var f = t().st.est, e = stEst(src), pr = SET.printing || {}; if (!e) return '';
    return '<p class="fit-note st-est">' + esc(f.note.replace('{infill}', pr.infill).replace('{walls}', pr.walls).replace('{rate}', pr.rateCm3h)) + (pcOn() ? ' <a href="#services?tool=quote" data-st-qc>' + esc(f.link) + ' →</a>' : '') + (srOn() ? ' <a href="#services?tool=series" data-st-sr>' + esc(t().sr.fromQuote) + ' →</a>' : '') + '</p>';
  }

  // ---------- Drawing sheet NK-D (#studio; 2026-11-02, evening run) ----------
  // An A4 landscape drawing of the Part studio part: front, left-side and top view in first-angle projection (ISO "E" —
  // the view from the left sits on the right, the plan below the front), at the largest standard scale that fits the
  // sheet, with the three overall dimensions (dimension lines, arrowheads, values in mm), a light grid and a title block
  // (name, source, size, material, quantity, scale, units, date, sheet, projection symbol, X2D fit). The views are the
  // same silhouettes as the file check (fcMask: every triangle rasterised into a mask), stored as white-with-alpha PNGs
  // and used as SVG masks over a rect filled with var(--ink) — so the drawing follows light / dark on screen, prints black
  // on white (print tokens) and the downloaded SVG carries fixed colours in its own <style>. Only the visitor's own
  // numbers and the published X2D volume; nothing is uploaded. Self-contained: remove DW_SCALES … dwDownload(), the
  // dwBox() call in stView(), the dwShow() line in stSheetShow(), the data-dw-* lines in the click handler, dw: in both
  // languages in content.js and the "Drawing sheet" rules at the end of page.css.
  var DW_SCALES = [[10, 1], [5, 1], [2, 1], [1, 1], [1, 2], [1, 5], [1, 10], [1, 20], [1, 50], [1, 100]];
  var DW_W = 297, DW_H = 210, DW_M = 10, DW_TB = 30, DW_GAP = 14, DW_DIM = 15; // sheet, margin, title-block height, view gap, room for a dimension (paper mm)
  var dwCache = { key: '', imgs: null }, dwPrintOn = false;
  function dwScale(src) { // paper mm per part mm: the largest standard scale that fits the three views + dimensions in the drawing area
    var d = stDims(src), aw = DW_W - 2 * DW_M - DW_DIM - DW_GAP - 6, ah = DW_H - 2 * DW_M - DW_TB - DW_DIM - DW_GAP - DW_DIM;
    for (var i = 0; i < DW_SCALES.length; i++) { var s = DW_SCALES[i][0] / DW_SCALES[i][1]; if ((d[0] + d[1]) * s <= aw && (d[2] + d[1]) * s <= ah) return { s: s, txt: DW_SCALES[i][0] + ':' + DW_SCALES[i][1] }; }
    var l = DW_SCALES[DW_SCALES.length - 1]; return { s: l[0] / l[1], txt: l[0] + ':' + l[1] };
  }
  function dwMask(pos, n, a, b, mn, s, PW, PH, flipX, r) { // white PNG whose alpha is the silhouette: outline 255 (r px wide), inside 46
    var m = fcMask(pos, n, a, b, mn, s, 1, PH - 1, PW, PH), cv = document.createElement('canvas'); cv.width = PW; cv.height = PH;
    var g = cv.getContext('2d'); if (!g) return '';
    var img = g.createImageData(PW, PH), d = img.data, y, x, k;
    var e = new Uint8Array(PW * PH); // outline = inside pixels next to an outside one, grown to `r` px (≈ 0.3 mm on paper)
    for (y = 0; y < PH; y++) for (x = 0; x < PW; x++) { k = y * PW + x; if (m[k] && (x === 0 || y === 0 || x === PW - 1 || y === PH - 1 || !m[k - 1] || !m[k + 1] || !m[k - PW] || !m[k + PW])) e[k] = 1; }
    for (var i = 1; i < r; i++) { var e2 = new Uint8Array(e); for (y = 1; y < PH - 1; y++) for (x = 1; x < PW - 1; x++) { k = y * PW + x; if (m[k] && !e[k] && (e[k - 1] || e[k + 1] || e[k - PW] || e[k + PW])) e2[k] = 1; } e = e2; }
    for (y = 0; y < PH; y++) for (x = 0; x < PW; x++) {
      var sx = flipX ? PW - 1 - x : x; k = y * PW + sx; if (!m[k]) continue;
      var o = (y * PW + x) * 4; d[o] = 255; d[o + 1] = 255; d[o + 2] = 255; d[o + 3] = e[k] ? 255 : 46;
    }
    g.putImageData(img, 0, 0);
    try { return cv.toDataURL('image/png'); } catch (e) { return ''; }
  }
  function dwImgs(src, sc) { // the three view PNGs for this part / orientation / scale (cached — the title block changes far more often)
    var key = (src.kind === 'file' ? state.fc.res.name + '|' + src.pos.length : 'box|' + src.size.join('x')) + '|' + state.st.axes + '|' + sc.s + '|' + src.scale;
    if (dwCache.key === key && dwCache.imgs) return dwCache.imgs;
    var p = stPerm(), d = stDims(src), pos = src.pos, n = Math.floor(pos.length / 9), mn = [Infinity, Infinity, Infinity], i, k;
    for (i = 0; i < n * 9; i++) { k = i % 3; if (pos[i] < mn[k]) mn[k] = pos[i]; }
    var big = Math.max(d[0], d[1], d[2]) * sc.s || 1, kpx = Math.min(8, 1000 / big), s = kpx * sc.s * src.scale; // px per paper mm, px per file unit
    var r = Math.max(1, Math.round(kpx * 0.3)); // outline width in px (≈ 0.3 mm on paper)
    var view = function (a, b, flipX) { var PW = Math.max(2, Math.ceil(d[a] * sc.s * kpx) + 2), PH = Math.max(2, Math.ceil(d[b] * sc.s * kpx) + 2); return { url: dwMask(pos, n, p[a], p[b], mn, s, PW, PH, flipX, r), w: PW / kpx, h: PH / kpx }; };
    dwCache = { key: key, imgs: { front: view(0, 2, false), side: view(1, 2, true), top: view(0, 1, false) } };
    return dwCache.imgs;
  }
  function dwN(v) { return fitFmt(fcR1(v)); }
  function dwFit(txt, mm, fs) { var max = Math.floor(mm / (fs * 0.62)); return txt.length > max ? txt.slice(0, Math.max(1, max - 1)) + '…' : txt; } // crude ellipsis for the title block cells
  function dwSvg(src, standalone) {
    var f = t().dw, x = t(), s = state.st, sc = dwScale(src), im = dwImgs(src, sc), d = stDims(src), r = state.fc.res, mono = "'JetBrains Mono', ui-monospace, Menlo, monospace", sans = "'Schibsted Grotesk', 'Helvetica Neue', Arial, sans-serif";
    var fw = d[0] * sc.s, fh = d[2] * sc.s, sw = d[1] * sc.s, th = d[1] * sc.s; // front w/h, side w, top h (paper mm)
    var gw = DW_DIM + fw + DW_GAP + sw, gh = DW_DIM + fh + DW_GAP + th + DW_DIM, aw = DW_W - 2 * DW_M, ah = DW_H - 2 * DW_M - DW_TB;
    var gx = DW_M + Math.max(0, (aw - gw) / 2), gy = DW_M + Math.max(0, (ah - gh) / 2), x0 = gx + DW_DIM, y0 = gy + DW_DIM, sx = x0 + fw + DW_GAP, ty = y0 + fh + DW_GAP;
    var n2 = function (v) { return Math.round(v * 100) / 100; };
    var mask = function (id, v, ox, oy, w, h) { var iw = v.w, ih = v.h, ix = ox + (w - iw) / 2, iy = oy + (h - ih) / 2; return '<mask id="' + id + '" maskUnits="userSpaceOnUse" x="' + n2(ix) + '" y="' + n2(iy) + '" width="' + n2(iw) + '" height="' + n2(ih) + '"><image href="' + v.url + '" x="' + n2(ix) + '" y="' + n2(iy) + '" width="' + n2(iw) + '" height="' + n2(ih) + '" preserveAspectRatio="none"/></mask><rect class="dw-part" x="' + n2(ix) + '" y="' + n2(iy) + '" width="' + n2(iw) + '" height="' + n2(ih) + '" mask="url(#' + id + ')"/>'; };
    var arrow = function (x, y, dir) { var l = 2.6, w = 0.9; return dir === 'l' ? 'M' + n2(x) + ' ' + n2(y) + 'l' + l + ' -' + w + 'v' + 2 * w + 'z' : dir === 'r' ? 'M' + n2(x) + ' ' + n2(y) + 'l-' + l + ' -' + w + 'v' + 2 * w + 'z' : dir === 'u' ? 'M' + n2(x) + ' ' + n2(y) + 'l-' + w + ' ' + l + 'h' + 2 * w + 'z' : 'M' + n2(x) + ' ' + n2(y) + 'l-' + w + ' -' + l + 'h' + 2 * w + 'z'; };
    var dimH = function (xa, xb, yv, yl, txt) { // horizontal dimension: extension lines from yv to the dimension line at yl, value above the line
      var up = yl < yv, e1 = up ? yv - 1 : yv + 1, e2 = up ? yl - 2 : yl + 2;
      return '<g class="dw-dim"><path d="M' + n2(xa) + ' ' + n2(e1) + 'V' + n2(e2) + 'M' + n2(xb) + ' ' + n2(e1) + 'V' + n2(e2) + 'M' + n2(xa) + ' ' + n2(yl) + 'H' + n2(xb) + '"/><path class="dw-arr" d="' + arrow(xa, yl, 'l') + arrow(xb, yl, 'r') + '"/><text x="' + n2((xa + xb) / 2) + '" y="' + n2(yl - 1.2) + '" text-anchor="middle">' + esc(txt) + '</text></g>';
    };
    var dimV = function (ya, yb, xv, xl, txt) { // vertical dimension on the left of a view, value reads bottom-to-top
      return '<g class="dw-dim"><path d="M' + n2(xv - 1) + ' ' + n2(ya) + 'H' + n2(xl - 2) + 'M' + n2(xv - 1) + ' ' + n2(yb) + 'H' + n2(xl - 2) + 'M' + n2(xl) + ' ' + n2(ya) + 'V' + n2(yb) + '"/><path class="dw-arr" d="' + arrow(xl, ya, 'u') + arrow(xl, yb, 'd') + '"/><text transform="translate(' + n2(xl - 1.2) + ' ' + n2((ya + yb) / 2) + ') rotate(-90)" text-anchor="middle">' + esc(txt) + '</text></g>';
    };
    var label = function (cx, y, txt) { return '<text class="dw-vl" x="' + n2(cx) + '" y="' + n2(y) + '" text-anchor="middle">' + esc(txt) + '</text>'; };
    // title block: two rows of cells (label above value), like the footer of the site
    var fitR = stFit(src), tb = f.tb, ch = mpChosen(), today = new Date().toISOString().slice(0, 10);
    var name = s.name.trim() || tb.unnamed, srcTxt = src.kind === 'file' ? r.name + ' · ' + r.fmt + ' · ' + f.file : f.box;
    var cells = [
      [[tb.title, name, 86, true], [tb.size, fitDims(d) + ' mm', 56], [tb.scale, sc.txt, 24], [tb.units, 'mm', 20], [tb.date, today, 32], [tb.sheet, 'NK-D', 24], [tb.proj, '', 35]],
      [[tb.src, srcTxt, 86], [tb.mat, ch ? ch.name : tb.matNone, 56], [tb.qty, String(Math.max(1, Math.round(+s.qty || 1))), 24], [tb.printer, fitR ? (fitR.fits ? tb.fits : tb.noFit) : '—', 52], [tb.drawn, tb.by, 59]]
    ];
    var tbY = DW_H - DW_M - DW_TB, tbH = DW_TB / 2, out = '';
    cells.forEach(function (row, ri) {
      var cx = DW_M, cy = tbY + ri * tbH;
      row.forEach(function (c) {
        out += '<rect class="dw-cell" x="' + n2(cx) + '" y="' + n2(cy) + '" width="' + c[2] + '" height="' + tbH + '"/><text class="dw-k" x="' + n2(cx + 2) + '" y="' + n2(cy + 4) + '">' + esc(String(c[0]).toUpperCase()) + '</text>';
        if (c[0] === tb.proj) { // first-angle symbol: the frustum (narrow end left) and its end view (two circles) on the right, like the views on this sheet
          var px = cx + 2, py = cy + 6.5; out += '<g class="dw-sym"><path d="M' + n2(px) + ' ' + n2(py + 2.2) + 'l9 -2.2v8.8l-9 -2.2z"/><circle cx="' + n2(px + 17) + '" cy="' + n2(py + 4.4) + '" r="4.4"/><circle cx="' + n2(px + 17) + '" cy="' + n2(py + 4.4) + '" r="2.2"/></g><text class="dw-v" x="' + n2(px + 24) + '" y="' + n2(cy + 11.6) + '">E</text>';
        } else out += '<text class="dw-v' + (c[3] ? ' dw-title' : '') + '" x="' + n2(cx + 2) + '" y="' + n2(cy + (c[3] ? 12.2 : 11.6)) + '">' + esc(dwFit(c[1], c[2] - 3, c[3] ? 5 : 3.1)) + '</text>';
        cx += c[2];
      });
    });
    var style = standalone ? '<style>svg{--paper:#fff;--ink:#1a1c1e;--ink-muted:#53585e;--grid:#dde3ea;--line-strong:#767c83;--dimension:#2559a8}.dw-frame{fill:none;stroke:var(--ink);stroke-width:.5}.dw-grid{fill:url(#dw-g)}.dw-part{fill:var(--ink)}.dw-dim path{fill:none;stroke:var(--dimension);stroke-width:.25}.dw-dim .dw-arr{fill:var(--dimension);stroke:none}.dw-dim text{font:3.2px ' + mono + ';fill:var(--dimension)}.dw-vl{font:2.6px ' + mono + ';fill:var(--ink-muted);letter-spacing:.08em}.dw-cell{fill:none;stroke:var(--ink);stroke-width:.35}.dw-k{font:2.1px ' + mono + ';fill:var(--ink-muted);letter-spacing:.1em}.dw-v{font:3.1px ' + mono + ';fill:var(--ink)}.dw-title{font:800 5px ' + sans + ';fill:var(--ink)}.dw-sym{fill:none;stroke:var(--ink);stroke-width:.35}</style>' : '';
    var alt = f.alt.replace('{n}', name).replace('{s}', fitDims(d)).replace('{sc}', sc.txt);
    return '<svg' + (standalone ? ' xmlns="http://www.w3.org/2000/svg" width="297mm" height="210mm"' : ' class="dw-svg" role="img" aria-label="' + esc(alt) + '"') + ' viewBox="0 0 297 210">' + style +
      '<defs><pattern id="dw-g" width="5" height="5" patternUnits="userSpaceOnUse"><path d="M5 0H0V5" fill="none" stroke="var(--grid)" stroke-width=".15"/></pattern></defs>' +
      '<rect width="297" height="210" style="fill:var(--paper)"/><rect class="dw-grid" x="' + DW_M + '" y="' + DW_M + '" width="' + (DW_W - 2 * DW_M) + '" height="' + (DW_H - 2 * DW_M) + '"/><rect class="dw-frame" x="' + DW_M + '" y="' + DW_M + '" width="' + (DW_W - 2 * DW_M) + '" height="' + (DW_H - 2 * DW_M) + '"/>' +
      mask('dw-m1', im.front, x0, y0, fw, fh) + mask('dw-m2', im.side, sx, y0, sw, fh) + mask('dw-m3', im.top, x0, ty, fw, th) +
      dimH(x0, x0 + fw, y0, y0 - 7, dwN(d[0])) + dimV(y0, y0 + fh, x0, x0 - 7, dwN(d[2])) + dimH(sx, sx + sw, y0 + fh, y0 + fh + 8, dwN(d[1])) +
      label(x0 + fw / 2, ty - 5, f.views.front) + label(sx + sw / 2, y0 + fh + 11.5, f.views.side) + label(x0 + fw / 2, ty + th + 4.5, f.views.top) +
      out + '</svg>';
  }
  function dwBox() {
    var f = t().dw, src = stSrc();
    return '<section class="block dw" id="st-dw" aria-labelledby="dw-h">' + head(f.label, f.title, f.lead).replace('class="sec-title"', 'class="sec-title" id="dw-h"') +
      (src ? '<figure class="dw-sheet" id="dw-sheet" tabindex="0" role="group" aria-label="' + esc(f.label) + '">' + dwSvg(src, false) + '</figure><div class="cta-row dw-act"><button type="button" class="nk-btn nk-btn--primary" data-dw-print>' + psIco() + ' ' + esc(f.print) + '</button><button type="button" class="nk-btn" data-dw-svg>' + esc(f.svg) + '</button><span class="copy-msg" id="dw-msg" role="status" aria-live="polite"></span></div>' :
        '<div class="dw-empty"><svg viewBox="0 0 120 90" aria-hidden="true" focusable="false"><path class="hid" d="M20 20h50v30H20zM80 20h20v30H80zM20 60h50v20H20z"/></svg><p class="hint">' + esc(f.empty) + '</p></div>') +
      '<p class="fit-note dw-note">' + esc(f.note) + '</p></section>';
  }
  function dwShow() { var el = document.getElementById('st-dw'); if (el) el.outerHTML = dwBox(); }
  function dwPrintOff() { if (!dwPrintOn) return; dwPrintOn = false; document.documentElement.classList.remove('dw-print'); var st = document.getElementById('dw-page'); if (st) st.remove(); }
  function dwPrint() { // only the sheet, A4 landscape; the inline <style> is allowed by the CSP (style-src 'unsafe-inline')
    if (!document.getElementById('dw-sheet')) return;
    dwPrintOn = true; document.documentElement.classList.add('dw-print');
    var st = document.createElement('style'); st.id = 'dw-page'; st.textContent = '@page { size: A4 landscape; margin: 0; }'; document.head.appendChild(st);
    window.addEventListener('afterprint', dwPrintOff, { once: true });
    try { window.print(); } catch (e) { dwPrintOff(); }
    setTimeout(function () { document.addEventListener('click', dwPrintOff, { once: true }); document.addEventListener('keydown', dwPrintOff, { once: true }); }, 0);
  }
  function dwDownload() {
    var src = stSrc(), f = t().dw, msg = document.getElementById('dw-msg'); if (!src) return;
    try {
      var svg = '<?xml version="1.0" encoding="UTF-8"?>\n' + dwSvg(src, true), blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }), url = URL.createObjectURL(blob), a = document.createElement('a');
      var base = (state.st.name.trim() || (state.fc.res ? state.fc.res.name.replace(/\.[a-z0-9]+$/i, '') : 'part')).replace(/[^\w\-]+/g, '-').replace(/^-+|-+$/g, '') || 'part';
      a.href = url; a.download = 'NK-D-' + base + '-' + new Date().toISOString().slice(0, 10) + '.svg'; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
      if (msg) msg.textContent = f.saved;
    } catch (e) { if (msg) msg.textContent = f.saveFail; }
  }

  // ---------- Batch on the plate (#services?tool=plate): how many copies of a part fit on one X2D plate, plates per batch ----------
  // Added 2026-10-30. Rectangular nesting of one footprint (as entered, turned 90°, or a grid plus a strip of turned parts) on
  // the published 256 × 256 mm plate (BED), with the gap the visitor sets. No prices, no print times — only counts and a
  // top-view drawing. Self-contained: remove PB_LAYS … pbToOrder(), tlWrap('plate', pbBox()) in views.services, the 'plate'
  // entry in TL_TOOLS, pbFitLink() in fitChecker(), pbStLink() in stForm(), the data-pb-* lines in the click handler, the pb input listener,
  // pb: + tl.plate in both languages in content.js and the "Batch on the plate" rules at the end of page.css.
  var PB_LAYS = ['asIs', 'turned', 'mixed'], PB_DRAW_MAX = 600;
  state.pb = { x: '', y: '', z: '', qty: '', gap: '5', lay: '' };
  function pbNum(v) { var n = parseFloat(String(v).replace(',', '.')); return n >= 0 && n < 100000 ? Math.round(n * 10) / 10 : -1; }
  function pbPlural(n, forms) { // forms: EN [1, more], SL [1, 2, 3–4, 5+]
    if (lang !== 'sl') return forms[n === 1 ? 0 : 1];
    var m = n % 100; return forms[m === 1 ? 0 : m === 2 ? 1 : m === 3 || m === 4 ? 2 : 3];
  }
  function pbGrid(W, H, pa, pb, g) { // parts of pa × pb in a W × H plate with gap g: columns, rows
    return [Math.floor((W + g) / (pa + g)), Math.floor((H + g) / (pb + g))];
  }
  function pbFill(x0, y0, W, H, pa, pb, g) { // grid of pa × pb parts in a W × H area at (x0, y0); rects only for the first PB_DRAW_MAX
    var cr = pbGrid(W, H, pa, pb, g), cols = cr[0], rows = cr[1], rects = [];
    if (cols < 1 || rows < 1) return { n: 0, cols: 0, rows: 0, w: 0, h: 0, rects: rects };
    for (var j = 0; j < rows && rects.length < PB_DRAW_MAX; j++) for (var i = 0; i < cols && rects.length < PB_DRAW_MAX; i++) rects.push([x0 + i * (pa + g), y0 + j * (pb + g), pa, pb]);
    return { n: cols * rows, cols: cols, rows: rows, w: cols * (pa + g) - g, h: rows * (pb + g) - g, rects: rects };
  }
  function pbLayout(a, b, g, lay) { // a × b footprint on the plate: { n, rects, w, h } or null
    var W = BED[0], H = BED[1], best = null;
    if (lay !== 'mixed') {
      var pa = lay === 'turned' ? b : a, pb = lay === 'turned' ? a : b; if (pa > W || pb > H) return null;
      var m = pbFill(0, 0, W, H, pa, pb, g); return m.n ? m : null;
    }
    [[a, b], [b, a]].forEach(function (d) { // a grid of d[0] × d[1] plus the leftover strip (right or bottom, whichever takes more) filled with turned parts
      var pa = d[0], pb = d[1]; if (pa > W || pb > H) return;
      var m = pbFill(0, 0, W, H, pa, pb, g); if (!m.n) return;
      var right = pbFill(m.cols * (pa + g), 0, W - m.cols * (pa + g), H, pb, pa, g), bottom = pbFill(0, m.rows * (pb + g), W, H - m.rows * (pb + g), pb, pa, g);
      var ex = right.n >= bottom.n ? right : bottom; if (!ex.n) return;
      var r = { n: m.n + ex.n, rects: m.rects.concat(ex.rects).slice(0, PB_DRAW_MAX), w: ex === right ? m.cols * (pa + g) + ex.w : Math.max(m.w, ex.w), h: ex === bottom ? m.rows * (pb + g) + ex.h : Math.max(m.h, ex.h) };
      if (!best || r.n > best.n) best = r;
    });
    return best;
  }
  function pbCalc() { // { a, b, z, g, qty, lays: { asIs, turned, mixed }, best, lay, res, over, tall } or null when the footprint is incomplete
    var s = state.pb, a = pbNum(s.x), b = pbNum(s.y), z = pbNum(s.z), g = pbNum(s.gap), qty = Math.round(pbNum(s.qty));
    if (a <= 0 || b <= 0) return null;
    if (g < 0) g = 0;
    var out = { a: a, b: b, z: z > 0 ? z : 0, g: g, qty: qty > 0 ? qty : 0, lays: {}, best: '', tall: z > BED[2] };
    PB_LAYS.forEach(function (k) { out.lays[k] = pbLayout(a, b, g, k); });
    if (out.lays.mixed && out.lays.mixed.n <= (out.lays.asIs ? out.lays.asIs.n : 0)) out.lays.mixed = null;
    if (out.lays.turned && out.lays.asIs && a === b) out.lays.turned = null; // a square part turns into itself
    var bestN = 0; PB_LAYS.forEach(function (k) { var l = out.lays[k]; if (l && l.n > bestN) { bestN = l.n; out.best = k; } });
    if (!bestN) { out.over = Math.round((Math.max(a, b) - BED[0]) * 10) / 10; return out; }
    out.lay = out.lays[s.lay] ? s.lay : out.best;
    out.res = out.lays[out.lay];
    return out;
  }
  function pbPlates(c) { // plates for the batch, parts on the last plate
    if (!c || !c.res || !c.qty) return null;
    var plates = Math.ceil(c.qty / c.res.n), last = c.qty - (plates - 1) * c.res.n;
    return { plates: plates, last: last, full: last === c.res.n };
  }
  function pbSvg(c) { // top view of the plate: 1 unit = 1 mm, 16 mm grid like the 3D view, parts in red, dimension lines
    var W = BED[0], H = BED[1], M = 22, f = t().pb, out = '<svg class="pb-svg" viewBox="0 0 ' + (W + M + 10) + ' ' + (H + M + 14) + '" role="img" aria-label="' + esc(f.layoutOf) + (c && c.res ? ' · ' + esc(f.perPlate.replace('{n}', c.res.n)) : '') + '"><g transform="translate(8 8)">';
    var grid = ''; for (var k = 16; k < W; k += 16) grid += 'M' + k + ' 0 V' + H + ' M0 ' + k + ' H' + W + ' ';
    out += '<path class="pb-grid" d="' + grid + '"/><rect class="ln pb-plate" x="0" y="0" width="' + W + '" height="' + H + '"/>';
    if (c && c.res) {
      var ox = Math.round((W - c.res.w) / 2 * 10) / 10, oy = Math.round((H - c.res.h) / 2 * 10) / 10, num = c.res.n <= 60, rs = c.res.rects.slice(0, PB_DRAW_MAX);
      out += '<g transform="translate(' + ox + ' ' + oy + ')">' + rs.map(function (r, i) {
        return '<rect class="fit-part" x="' + r[0] + '" y="' + r[1] + '" width="' + r[2] + '" height="' + r[3] + '"/>' + (num && Math.min(r[2], r[3]) >= 12 ? '<text class="pb-n" x="' + (r[0] + r[2] / 2) + '" y="' + (r[1] + r[3] / 2) + '" text-anchor="middle" dominant-baseline="central">' + (i + 1) + '</text>' : '');
      }).join('') + '</g>';
    }
    out += '<path class="dim" d="M0 ' + (H + 6) + ' v10 M' + W + ' ' + (H + 6) + ' v10 M0 ' + (H + 11) + ' H' + W + '"/><text class="dimt" x="' + (W / 2) + '" y="' + (H + M + 1) + '" text-anchor="middle">' + W + '</text>' +
      '<path class="dim" d="M' + (W + 6) + ' 0 h10 M' + (W + 6) + ' ' + H + ' h10 M' + (W + 11) + ' 0 V' + H + '"/><text class="dimt" x="' + (W + 17) + '" y="' + (H / 2) + '" text-anchor="middle" transform="rotate(-90 ' + (W + 17) + ' ' + (H / 2) + ')">' + H + '</text>';
    return out + '</g></svg>';
  }
  function pbOut(c) {
    var f = t().pb;
    if (!c) return '<p class="hint">' + esc(f.empty) + '</p>';
    if (!c.res) return '<span class="nk-tag nk-tag--rev">' + esc(f.noFit) + '</span><p>' + esc(f.tooBig.replace('{d}', fitFmt(c.over))) + '</p>';
    var p = pbPlates(c), lays = PB_LAYS.filter(function (k) { return c.lays[k]; });
    var h = '<div class="pb-lays" role="group" aria-label="' + esc(f.layout) + '">' + lays.map(function (k) {
      var l = c.lays[k]; return '<button type="button" class="pb-lay" data-pb-lay="' + k + '" aria-pressed="' + (k === c.lay) + '"><span class="nk-label">' + esc(f[k]) + (k === c.best ? ' · ' + esc(f.best) : '') + '</span><b>' + esc(f.perPlate.replace('{n}', l.n)) + '</b></button>';
    }).join('') + '</div>';
    h += '<p class="pb-sum"><span class="nk-tag nk-tag--ok">' + esc(f.perPlate.replace('{n}', c.res.n)) + '</span> ' + esc(f.used.replace('{p}', Math.round(c.res.n * c.a * c.b / (BED[0] * BED[1]) * 100))) +
      (p ? ' · <b>' + esc(pbPlural(p.plates, f.plates).replace('{n}', p.plates).replace('{q}', c.qty)) + '</b>' + (p.plates > 1 ? ' (' + esc(p.full ? f.full : f.last.replace('{n}', p.last)) + ')' : '') : '') + '</p>';
    if (c.tall) h += '<p class="pb-warn"><span class="nk-tag nk-tag--rev">' + esc(f.tallTag) + '</span> ' + esc(f.tooTall.replace('{h}', fitFmt(c.z))) + '</p>';
    return h;
  }
  function pbText(c) { // the layout as plain text (copy + brief)
    var f = t().pb, p = pbPlates(c);
    var s = f.brief + ': ' + fitFmt(c.a) + ' × ' + fitFmt(c.b) + (c.z ? ' × ' + fitFmt(c.z) : '') + ' mm, ' + f.gapShort.replace('{g}', fitFmt(c.g)) + ' → ' + f.perPlate.replace('{n}', c.res.n) + ' (' + f[c.lay] + ')' +
      (p ? ', ' + pbPlural(p.plates, f.plates).replace('{n}', p.plates).replace('{q}', c.qty) : '');
    return /\.$/.test(s) ? s : s + '.';
  }
  function pbBox() {
    var f = t().pb, s = state.pb, c = pbCalc();
    var num = function (k, label, attrs) { return '<div class="nk-field"><label class="nk-field__label" for="pb-' + k + '">' + esc(label) + '</label><input class="nk-input" id="pb-' + k + '" data-pb-f="' + k + '" type="number" inputmode="decimal" min="0" ' + attrs + ' value="' + esc(s[k]) + '"></div>'; };
    return '<section class="block pb">' + head(f.label, f.title, f.lead) + '<div class="fit-grid"><div class="fit-form">' +
      '<div class="fit-inputs">' + num('x', f.x + ' · mm', 'step="any"') + num('y', f.y + ' · mm', 'step="any"') + num('z', f.z + ' · mm', 'step="any"') + '</div>' +
      '<div class="pb-pair">' + num('qty', f.qty, 'step="1" inputmode="numeric"') + num('gap', f.gap + ' · mm', 'step="any"') + '</div>' +
      '<div class="fit-out pb-out" id="pb-out" role="status" aria-live="polite">' + pbOut(c) + '</div>' +
      '<div class="cta-row"><button type="button" class="nk-btn nk-btn--primary" data-pb-go' + (c && c.res ? '' : ' disabled') + '>' + esc(f.go) + '<span class="nk-btn__arrow" aria-hidden="true">→</span></button><button type="button" class="nk-btn" data-pb-copy' + (c && c.res ? '' : ' disabled') + '>' + esc(f.copy) + '</button><span class="copy-msg" id="pb-msg" role="status"></span></div>' +
      '<p class="fit-note">' + esc(f.note) + '</p></div>' +
      '<figure class="fit-fig"><div class="nk-sheet__art pb-fig" id="pb-fig">' + pbSvg(c) + '</div><figcaption class="nk-label" id="pb-cap">' + esc(f.layoutOf) + ' · ' + BED[0] + ' × ' + BED[1] + ' mm</figcaption></figure></div></section>';
  }
  function pbUpdate(keepLay) {
    if (!keepLay) state.pb.lay = '';
    var c = pbCalc(), o = document.getElementById('pb-out'), fg = document.getElementById('pb-fig');
    if (o) o.innerHTML = pbOut(c);
    if (fg) fg.innerHTML = pbSvg(c);
    var ok = !!(c && c.res); ['data-pb-go', 'data-pb-copy'].forEach(function (a) { var b = document.querySelector('[' + a + ']'); if (b) b.disabled = !ok; });
  }
  function pbLay(k) { state.pb.lay = k; pbUpdate(true); var b = document.querySelector('[data-pb-lay="' + k + '"]'); if (b) b.focus(); }
  function pbSet(d, qty) { // another tool hands over a size [X, Y, Z] and a quantity before the link opens the tool
    state.pb.x = d[0] ? String(d[0]) : ''; state.pb.y = d[1] ? String(d[1]) : ''; state.pb.z = d[2] ? String(d[2]) : ''; state.pb.lay = '';
    if (qty) state.pb.qty = String(qty);
  }
  function pbFitLink() { return '<p class="pl-open pb-open"><a href="#services?tool=plate" data-pb-fit>' + esc(t().pb.link) + ' →</a></p>'; }
  function pbStLink() { return '<p class="pl-open pb-open"><a href="#services?tool=plate" data-pb-st>' + esc(t().pb.link) + ' →</a></p>'; }
  function pbCopy() {
    var c = pbCalc(), msg = document.getElementById('pb-msg'), f = t().pb; if (!c || !c.res || !msg) return;
    var fail = function () { msg.textContent = f.copyFail; };
    try { navigator.clipboard.writeText(pbText(c)).then(function () { msg.textContent = f.copied; }, fail); } catch (e) { fail(); }
  }
  function pbToOrder() {
    var c = pbCalc(), o = state.order, f = t().pb; if (!c || !c.res) return;
    if (o.services.indexOf('print') < 0) o.services.push('print');
    if (c.qty) o.qty = String(c.qty);
    var line = pbText(c);
    if (o.what.indexOf(f.brief + ':') < 0) o.what = o.what ? o.what + '\n' + line : line;
    else o.what = o.what.split('\n').map(function (l) { return l.indexOf(f.brief + ':') === 0 ? line : l; }).join('\n');
    state.step = 0; state.errors = {}; state.send = 'idle';
    location.hash = 'order';
  }


  // ---------- Pricing package (2026-11-02): price list (T-07), quote estimate (T-08) and the promotion banner ----------
  // Every number comes from src/data/settings.json (inlined as window.NK_SETTINGS, edited in /admin/ › Settings). With no
  // pricing in the file the two tools and the banner do not render at all. Self-contained: remove SET … promoBand(), the
  // two entries in TL_TOOLS, tlWrap('prices' / 'quote') in views.services, promoBand() in views.home / orderView(), the
  // data-qc-* lines in the click / input / change handlers, pc: / qc: / promo: in both languages in content.js and the
  // "Pricing package" rules at the end of page.css.
  var SET = window.NK_SETTINGS || {};
  // Services overrides (2026-11-02): turnaround and the "What I need" / "What you get" lists can be edited in admin › Settings ›
  // Services; a filled value replaces the text in content.js, an empty one keeps it.
  (function () { var ov = SET.services || {}; SERVICES.forEach(function (s) { var o = ov[s.key]; if (!o) return;
    if (o.time && (o.time.en || o.time.sl)) s.time = { en: o.time.en || o.time.sl, sl: o.time.sl || o.time.en };
    ['need', 'get'].forEach(function (k) { if (o[k]) ['en', 'sl'].forEach(function (l) { if (Array.isArray(o[k][l]) && o[k][l].length) s[k][l] = o[k][l]; else if (Array.isArray(o[k][l === 'en' ? 'sl' : 'en']) && o[k][l === 'en' ? 'sl' : 'en'].length) s[k][l] = o[k][l === 'en' ? 'sl' : 'en']; }); }); }); })();
  var PRICE = SET.pricing && SET.pricing.hourly && SET.pricing.print ? SET.pricing : null;
  // 2026-11-26 (Nace: "cene skrij na prvi strani in cenik ukini"): the price-list tool (#services?tool=prices) is switched off —
  // no tool, no links to it, no price rows in Find anything — and the home page shows no rates. The prices stay in settings.json
  // for the estimate tools and the admin quote. To bring the price list back: set PRICE_LIST to true.
  var PRICE_LIST = false;
  function pcOn() { return !!(PRICE && (PRICE.hourly.cad || PRICE.hourly.iot || PRICE.print.machineHour || (PRICE.print.materials || []).length)); }
  function pcMats() { return PRICE ? (PRICE.print.materials || []).filter(function (m) { return m && m.name && +m.perGram > 0; }) : []; }
  function pcMat(key) { var ms = pcMats(); return ms.filter(function (m) { return m.key === key; })[0] || ms[0] || null; }
  function pcMoney(n, dec) { // 42 → "42 €", 0.036 → "0,036 €" (SL) / "0.036 €"
    var d = dec != null ? dec : (Math.abs(n - Math.round(n)) < 0.005 ? 0 : 2), str = (+n).toFixed(d);
    if (lang === 'sl') str = str.replace('.', ',');
    return str + ' €';
  }
  function pcDate(d) { // 2026-12-31 → 31. 12. 2026
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(d || '')); if (!m) return d || '';
    return lang === 'sl' ? +m[3] + '. ' + +m[2] + '. ' + m[1] : +m[3] + ' ' + ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][+m[2] - 1] + ' ' + m[1];
  }
  function promo() { // the promotion while it runs (pct > 0, text, not past its last day)
    var pr = SET.promo; if (!pr || !(+pr.pct > 0) || !L(pr.title)) return null;
    if (pr.until && /^\d{4}-\d{2}-\d{2}$/.test(pr.until) && new Date().toISOString().slice(0, 10) > pr.until) return null;
    return pr;
  }
  // Promotion scope 'cadprint' (2026-11-25, Nace: "-20 % on 3D design and printing orders"): the discount comes off the 3D design
  // and 3D printing rows only (hours of S-01, printed parts, setup, post-processing) and applies by itself — no "first order" tick.
  // part = the sum of those rows, sum = all rows before the minimum order. The other scopes work as before.
  function promoAuto(pm) { return !!pm && pm.scope === 'cadprint'; }
  function promoDisc(pm, total, part, sum, first, hasPrint) {
    if (!pm) return 0;
    if (pm.scope === 'cadprint') return Math.round((part >= sum - 1e-9 ? total : Math.min(part, total)) * pm.pct) / 100;
    return first && (pm.scope === 'all' || pm.scope === 'first' || (pm.scope === 'print' && hasPrint)) ? Math.round(total * pm.pct) / 100 : 0;
  }
  function promoBand(cls) {
    var pr = promo(), x = t().promo; if (!pr) return '';
    return '<aside class="promo' + (cls ? ' ' + cls : '') + '" aria-label="' + esc(x.label) + '"><span class="nk-tag nk-tag--rev promo-tag">' + esc(x.label) + (pr.until ? ' · ' + esc(x.until.replace('{d}', pcDate(pr.until))) : '') + '</span>' +
      '<p class="promo-t">' + esc(L(pr.title)) + '</p><p class="promo-x">' + esc(L(pr.text)) + (pr.code ? ' <b>' + esc(pr.code) + '</b>' : '') + '</p>' + btn(x.cta, '#order', 'primary', 'sm', true) + '</aside>';
  }
  function pcPrintRows() { // the 3D-printing rows of the price list (also on the 3D printing service sheet, 2026-11-26)
    var x = t().pc, h = PRICE.hourly, pr = PRICE.print, pros = [];
    pcMats().forEach(function (m) { pros.push([m.name, x.perGram.replace('{n}', pcMoney(m.perGram, 3)) + (+m.density > 0 ? ' · ' + x.density.replace('{d}', String(m.density).replace('.', lang === 'sl' ? ',' : '.')) : '')]); });
    if (+pr.machineHour > 0) pros.push([x.machine, x.perHour.replace('{n}', pcMoney(pr.machineHour))]);
    if (+pr.setup > 0) pros.push([x.setup, pcMoney(pr.setup) + ' ' + x.perOrder]);
    if (+pr.minPart > 0) pros.push([x.minPart, pcMoney(pr.minPart)]);
    if (+pr.minOrder > 0) pros.push([x.minOrder, pcMoney(pr.minOrder)]);
    if (+h.post > 0) pros.push([x.post, x.perHour.replace('{n}', pcMoney(h.post))]);
    if (+pr.rushPct > 0) pros.push([x.rush, '+' + pr.rushPct + ' %']);
    return pros;
  }
  function pcList() {
    var x = t().pc, P = PRICE, h = P.hourly, pr = P.print, rows = [], pros = [];
    SERVICES.forEach(function (s) { if (s.key !== 'print' && +h[s.key] > 0) rows.push([L(s.title), x.perHour.replace('{n}', pcMoney(h[s.key])) + (s.key === 'build' && L(P.buildNote) ? ' · ' + L(P.buildNote) : '')]); });
    pros = pcPrintRows();
    var pm = promo();
    return '<section class="block pc">' + head(x.label, x.title, x.lead) + '<div class="pc-grid">' +
      '<div class="pc-col"><p class="nk-label">' + esc(x.hourly) + '</p>' + specs(rows) + (+P.minHours > 0 ? '<p class="pc-how">' + esc(x.minHours.replace('{n}', P.minHours)) + '</p>' : '') + (pm ? '<p class="pc-promo"><span class="nk-tag nk-tag--rev">' + esc(x.promoRow) + '</span> ' + esc(L(pm.title)) + (pm.until ? ' · ' + esc(t().promo.until.replace('{d}', pcDate(pm.until))) : '') + '</p>' : '') + '</div>' +
      '<div class="pc-col"><p class="nk-label">' + esc(x.printing) + '</p>' + specs(pros) + '<p class="pc-how">' + esc(x.printHow) + '</p></div></div>' +
      '<div class="cta-row pc-act"><button type="button" class="nk-btn" data-tl-print="prices">' + psIco() + ' ' + esc(t().tl.printPrices) + '</button></div>' + // Print package (2026-11-02, evening run)
      '<p class="fit-note">' + esc(L(P.vatNote) || '') + '</p><p class="pl-open"><a href="#services?tool=quote">' + esc(x.calc) + ' →</a>' + (giftOn() ? '<span aria-hidden="true"> · </span><a href="#gift">' + esc(t().gift.link) + ' →</a>' : '') + '</p></section>';
  }
  // Quote estimate: state.qc holds what the visitor typed; qcCalc() applies the published rates and minimums.
  state.qc = { cad: 0, iot: 0, build: 0, print: 0, cadH: '', iotH: '', buildH: '', mat: '', g: '', h: '', qty: '1', postH: '', rush: 0, first: 1, src: '' };
  function qcNum(v) { var n = parseFloat(String(v).replace(',', '.')); return isFinite(n) && n > 0 ? n : 0; }
  function qcCalc() {
    var q = state.qc, P = PRICE, x = t().qc, rows = [], total = 0, notes = [], pcsN = 0, hrN = 0, part0 = 0;
    if (!P) return null;
    [['cad', 'cadH'], ['iot', 'iotH'], ['build', 'buildH']].forEach(function (k) {
      if (!q[k[0]] || !(+P.hourly[k[0]] > 0)) return;
      var hrs = qcNum(q[k[1]]); if (!hrs) return;
      if (+P.minHours > 0 && hrs < +P.minHours) hrs = +P.minHours;
      var c = hrs * +P.hourly[k[0]], sv = SERVICES.filter(function (s) { return s.key === k[0]; })[0];
      rows.push([L(sv.title) + ' · ' + hrs + ' h', c]); total += c; hrN++; if (k[0] === 'cad') part0 += c;
    });
    if (q.print) {
      var m = pcMat(q.mat), g = qcNum(q.g), hh = qcNum(q.h), qty = Math.max(1, Math.round(qcNum(q.qty) || 1)), pr = P.print;
      if (g || hh) {
        var part = g * (m ? +m.perGram : 0) + hh * (+pr.machineHour || 0);
        if (+pr.minPart > 0 && part < +pr.minPart) { part = +pr.minPart; notes.push(x.minPartApplied); }
        var pc = part * qty, lbl = (m ? m.name + ' · ' : '') + (g ? g + ' g' : '') + (g && hh ? ' + ' : '') + (hh ? hh + ' h' : '') + (qty > 1 ? ' × ' + qty : '');
        if (q.rush && +pr.rushPct > 0) { pc *= 1 + pr.rushPct / 100; lbl += ' · +' + pr.rushPct + ' %'; }
        rows.push([L(SERVICES[1].title) + ' · ' + lbl, pc]); total += pc; pcsN = qty; part0 += pc;
        if (+pr.setup > 0) { rows.push([t().pc.setup, +pr.setup]); total += +pr.setup; part0 += +pr.setup; }
      }
      var ph = qcNum(q.postH); if (ph && +P.hourly.post > 0) { rows.push([t().pc.post + ' · ' + ph + ' h', ph * +P.hourly.post]); total += ph * +P.hourly.post; part0 += ph * +P.hourly.post; }
    }
    if (!rows.length) return null;
    var sum0 = total;
    if (+P.print.minOrder > 0 && total < +P.print.minOrder) { total = +P.print.minOrder; notes.push(x.minApplied); }
    var pm = promo(), disc = promoDisc(pm, total, part0, sum0, q.first, q.print);
    return { rows: rows, total: Math.round(total * 100) / 100, disc: disc, after: Math.round((total - disc) * 100) / 100, notes: notes, promo: pm, pcs: pcsN > 1 && !hrN ? pcsN : 0 }; // pcs: printing only and more than one piece → the total also reads per piece (2026-11-15)
  }
  function qcOut(c) {
    var x = t().qc; if (!c) return '<p class="hint">' + esc(x.empty) + '</p>';
    return '<p class="nk-label">' + esc(x.rows) + '</p><dl class="nk-specs qc-rows">' + c.rows.map(function (r) { return '<div><dt>' + esc(r[0]) + '</dt><dd>' + esc(pcMoney(r[1], 2)) + '</dd></div>'; }).join('') + '</dl>' +
      '<p class="qc-total"><span class="nk-label">' + esc(x.total) + '</span><b>' + esc('≈ ' + pcMoney(c.disc ? c.after : c.total, 2)) + '</b>' + (c.disc ? '<span class="qc-was">' + esc(pcMoney(c.total, 2)) + ' → −' + esc(pcMoney(c.disc, 2)) + ' ' + esc(x.withPromo) + '</span>' : '') + (c.pcs ? '<span class="qc-was qc-each">' + esc(x.each.replace('{p}', pcMoney((c.disc ? c.after : c.total) / c.pcs, 2)).replace('{n}', c.pcs)) + '</span>' : '') + '</p>' +
      (c.notes.length ? '<p class="qc-notes">' + c.notes.map(esc).join(' · ') + '</p>' : '') +
      (srOn() && state.qc.print && (qcNum(state.qc.g) || qcNum(state.qc.h)) ? '<p class="pl-open qc-sr"><a href="#services?tool=series" data-qc-sr>' + esc(t().sr.fromQuote) + ' →</a>' + (mxOn() ? '<span aria-hidden="true"> · </span><a href="#services?tool=matprice" data-qc-mx>' + esc(t().mx.fromQuote) + ' →</a>' : '') + '</p>' : ''); // Series price NK-R (2026-11-15) // data-qc-mx: Material price NK-V (2026-11-17, second run)
  }
  function qcText(c) {
    var x = t().qc; if (!c) return '';
    return x.brief + ': ' + c.rows.map(function (r) { return r[0] + ' ' + pcMoney(r[1], 2); }).join('; ') + ' → ≈ ' + pcMoney(c.disc ? c.after : c.total, 2) + (c.disc ? ' (' + x.withPromo + ' −' + pcMoney(c.disc, 2) + ')' : '') + '.';
  }
  function qcBox() {
    var x = t().qc, q = state.qc, P = PRICE, c = qcCalc(), pm = promo();
    var chk = function (k, label, extra) { return '<div class="qc-svc"><label class="nk-choice qc-choice"><input type="checkbox" data-qc-k="' + k + '"' + (q[k] ? ' checked' : '') + '><span class="nk-choice__t">' + esc(label) + '</span></label>' + (q[k] ? extra : '') + '</div>'; };
    var num = function (k, label, unit, attrs, hint) { return '<div class="nk-field"><label class="nk-field__label" for="qc-' + k + '">' + esc(label) + (unit ? ' · ' + esc(unit) : '') + '</label><input class="nk-input" id="qc-' + k + '" data-qc-f="' + k + '" type="number" inputmode="decimal" min="0" ' + (attrs || 'step="0.5"') + ' value="' + esc(q[k]) + '">' + (hint ? '<span class="nk-field__hint">' + esc(hint) + '</span>' : '') + '</div>'; };
    var svcs = '';
    SERVICES.forEach(function (s) {
      if (s.key === 'print') { if (+P.print.machineHour > 0 || pcMats().length) svcs += chk('print', L(s.title), '<div class="qc-print"><div class="nk-field"><label class="nk-field__label" for="qc-mat">' + esc(t().pc.material) + '</label><select class="nk-input" id="qc-mat" data-qc-f="mat">' + pcMats().map(function (m) { return '<option value="' + esc(m.key) + '"' + (pcMat(q.mat) === m ? ' selected' : '') + '>' + esc(m.name) + '</option>'; }).join('') + '</select></div>' + num('g', x.weight, x.grams, 'step="1"', q.src ? x.fromStudio : x.weightHint) + num('h', x.printHours, x.h, 'step="0.25"') + num('qty', x.qty, '', 'step="1" inputmode="numeric" min="1"') + (+P.hourly.post > 0 ? num('postH', x.postHours, x.h) : '') + (+P.print.rushPct > 0 ? '<label class="ad-check qc-check"><input type="checkbox" data-qc-k="rush"' + (q.rush ? ' checked' : '') + '> ' + esc(x.rush.replace('{n}', P.print.rushPct)) + '</label>' : '') + '</div>'); }
      else if (+P.hourly[s.key] > 0) svcs += chk(s.key, L(s.title), num(s.key + 'H', x.hours, x.h));
    });
    return '<section class="block qc">' + head(x.label, x.title, x.lead) + '<div class="fit-grid"><div class="fit-form"><p class="nk-label">' + esc(x.services) + '</p><div class="qc-svcs">' + svcs + '</div>' +
      (pm && !promoAuto(pm) ? '<label class="ad-check qc-check qc-first"><input type="checkbox" data-qc-k="first"' + (q.first ? ' checked' : '') + '> ' + esc(x.first.replace('{n}', pm.pct)) + '</label>' : '') +
      '<div class="cta-row"><button type="button" class="nk-btn nk-btn--primary" data-qc-go' + (c ? '' : ' disabled') + '>' + esc(x.go) + '<span class="nk-btn__arrow" aria-hidden="true">→</span></button><button type="button" class="nk-btn" data-qc-copy' + (c ? '' : ' disabled') + '>' + esc(x.copy) + '</button><button type="button" class="nk-btn" data-tl-print="quote"' + (c ? '' : ' disabled') + '>' + psIco() + ' ' + esc(t().tl.printQuote) + '</button><button type="button" class="nk-btn nk-btn--ghost" data-mn-qc' + (c ? '' : ' disabled') + '>' + esc(t().mn.qcSave) + '</button><span class="copy-msg" id="qc-msg" role="status"></span></div>' +
      '<p class="fit-note">' + esc(x.note.replace('{vat}', L(P.vatNote) || '')) + '</p>' + (bgOn() ? '<p class="pl-open"><a href="#services?tool=budget" data-qc-bg>' + esc(t().bg.fromQuote) + ' →</a></p>' : '') + '</div>' +
      '<div class="fit-out qc-out" id="qc-out" role="status" aria-live="polite">' + qcOut(c) + '</div></div></section>';
  }
  function qcUpdate(full) {
    if (full) { var sec = document.querySelector('.qc'); if (sec) { var f = document.activeElement && document.activeElement.id; sec.outerHTML = qcBox(); if (f) { var el = document.getElementById(f); if (el) el.focus(); } } return; }
    var c = qcCalc(), o = document.getElementById('qc-out'); if (o) o.innerHTML = qcOut(c);
    ['data-qc-go', 'data-qc-copy', 'data-mn-qc', 'data-tl-print="quote"'].forEach(function (a) { var b = document.querySelector('[' + a + ']'); if (b) b.disabled = !c; });
  }
  function qcSet(o) { // the Part studio hands over material, weight, print time and quantity before the link opens the tool
    var q = state.qc; q.print = 1; if (o.mat) q.mat = o.mat; if (o.g) q.g = String(Math.round(o.g)); if (o.h) q.h = String(Math.round(o.h * 10) / 10); if (o.qty) q.qty = String(o.qty); q.src = 'studio';
  }
  function qcCopy() {
    var c = qcCalc(), msg = document.getElementById('qc-msg'), x = t().qc; if (!c || !msg) return;
    var fail = function () { msg.textContent = x.copyFail; };
    try { navigator.clipboard.writeText(qcText(c) + (clUrl('quote') ? '\n' + clUrl('quote') : '')).then(function () { msg.textContent = x.copied; }, fail); } catch (e) { fail(); }
  }
  function qcToOrder() {
    var c = qcCalc(), q = state.qc, o = state.order, x = t().qc; if (!c) return;
    ['cad', 'iot', 'build', 'print'].forEach(function (k) { if (q[k] && o.services.indexOf(k) < 0) o.services.push(k); });
    if (q.print) { var m = pcMat(q.mat), mm = m && MP_MATS.filter(function (v) { return v.id === m.key; })[0]; if (mm) o.mat = mm.o; var qty = Math.round(qcNum(q.qty)); if (qty > 0) o.qty = String(qty); }
    var line = qcText(c);
    if (o.what.indexOf(x.brief + ':') < 0) o.what = o.what ? o.what + '\n' + line : line;
    else o.what = o.what.split('\n').map(function (l) { return l.indexOf(x.brief + ':') === 0 ? line : l; }).join('\n');
    state.step = 0; state.errors = {}; state.send = 'idle';
    location.hash = 'order';
  }

  // ---------- Series price / "Cena serije" NK-R (#services?tool=series, the tool after the parts list; 2026-11-15) ----------
  // One printed part (material, weight, print time — typed, or taken over from the quote estimate / the Part studio) priced at
  // 1 … 100 pieces and at the visitor's own quantity: price per piece, order total and the difference to a single piece, a
  // chart of the price per piece against the quantity, and plain-language lines on why it falls (file preparation once per
  // order, minimum order, minimum per part). The sums are the quote estimate's (qcCalc): piece = material + machine time (not
  // below the minimum per part, + rush), order = pieces + file preparation, not below the minimum order — every number from
  // settings.json, no quantity discount is invented. Without print prices the tool does not render. Nothing is stored or sent.
  // Self-contained: remove SR_STEPS … srFromQc(), the 'series' entry in TL_TOOLS, tlWrap('series', srBox()) in views.services,
  // the data-qc-sr link in qcOut() and the data-st-sr link in stEstBox(), the data-sr-* lines in the click / input / change
  // handlers, sr: and tl.series in both languages in content.js and the "Series price" rules at the end of page.css.
  var SR_STEPS = [1, 2, 5, 10, 25, 50, 100];
  state.sr = { mat: '', g: '', h: '', qty: '10', rush: 0, seeded: 0 };
  function srOn() { return !!(PRICE && (pcMats().length || +PRICE.print.machineHour > 0)); }
  function srQty() { var n = Math.round(qcNum(state.sr.qty)); return n >= 1 ? Math.min(n, 10000) : 0; }
  function srPart() { // one piece: { m, g, h, part, minPart, rush, unit }, or null without a weight or a print time
    var s = state.sr, pr = PRICE.print, m = pcMat(s.mat), g = qcNum(s.g), h = qcNum(s.h); if (!g && !h) return null;
    var raw = g * (m ? +m.perGram : 0) + h * (+pr.machineHour || 0), low = +pr.minPart > 0 && raw < +pr.minPart, part = low ? +pr.minPart : raw;
    var rush = s.rush && +pr.rushPct > 0;
    return { m: m, g: g, h: h, part: part, minPart: low, rush: rush, unit: part * (rush ? 1 + pr.rushPct / 100 : 1) };
  }
  function srAt(p, q) { // the order of q pieces
    var pr = PRICE.print, sum = p.unit * q + (+pr.setup || 0), low = +pr.minOrder > 0 && sum < +pr.minOrder, total = Math.round((low ? +pr.minOrder : sum) * 100) / 100;
    return { q: q, total: total, each: total / q, min: low };
  }
  function srCalc() {
    var p = srPart(); if (!p || !(p.unit > 0)) return null;
    var pr = PRICE.print, own = srQty(), qs = SR_STEPS.slice(); if (own && qs.indexOf(own) < 0) qs.push(own);
    qs.sort(function (a, b) { return a - b; });
    var setup = +pr.setup || 0, minO = +pr.minOrder || 0;
    var qMin = minO > setup ? Math.max(1, Math.ceil((minO - setup) / p.unit - 1e-9)) : 1; // first quantity the minimum order no longer applies to
    var near = setup > 0 ? Math.max(qMin, Math.ceil(setup / (0.05 * p.unit) - 1e-9)) : 0; // from here the piece carries under 5 % of preparation
    return { p: p, own: own, rows: qs.map(function (q) { return srAt(p, q); }), one: srAt(p, 1), pick: own ? srAt(p, own) : null, qMin: qMin, near: near, max: qs[qs.length - 1] };
  }
  function srPcs(n) { var x = t().sr; return n + ' ' + (lang === 'sl' ? (n % 100 === 1 ? x.pc1 : n % 100 === 2 ? x.pc2 : n % 100 === 3 || n % 100 === 4 ? x.pc3 : x.pcs) : n === 1 ? x.pc1 : x.pcs); }
  function srPartText(p) { return (p.m ? p.m.name + ' · ' : '') + (p.g ? fitFmt(p.g) + ' g' : '') + (p.g && p.h ? ' + ' : '') + (p.h ? fitFmt(p.h) + ' h' : ''); }
  function srSave(c, r) { var d = Math.round((1 - r.each / c.one.each) * 100); return r.q === 1 || d <= 0 ? '—' : '−' + d + ' %'; }
  function srSvg(c) { // price per piece against the quantity (log scale), the piece itself as a dashed line, the visitor's quantity marked
    var x = t().sr, nar = window.innerWidth < 600, W = nar ? 292 : 360, H = nar ? 208 : 216, l = 46, r = 12, tp = 16, b = 34, // a narrower drawing on a phone keeps the labels readable
      pw = W - l - r, ph = H - tp - b;
    var maxQ = Math.max(100, c.max), top = c.one.each * 1.08, lx = Math.log(maxQ);
    var X = function (q) { return l + (Math.log(q) / lx) * pw; }, Y = function (v) { return tp + ph - (v / top) * ph; };
    var f1 = function (n) { return (Math.round(n * 10) / 10).toFixed(1); };
    var pts = [], q = 1; while (q <= maxQ) { pts.push(f1(X(q)) + ',' + f1(Y(srAt(c.p, q).each))); q = q < 30 ? q + 1 : Math.ceil(q * 1.08); }
    if (q !== maxQ) pts.push(f1(X(maxQ)) + ',' + f1(Y(srAt(c.p, maxQ).each)));
    var s = '<svg class="sr-svg' + (nar ? ' sr-svg--n' : '') + '" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(x.chartAria.replace('{a}', pcMoney(c.one.each, 2)).replace('{b}', pcMoney(srAt(c.p, maxQ).each, 2)).replace('{n}', maxQ)) + '">';
    [0, 0.5, 1].forEach(function (k) { var v = c.one.each * k, y = f1(Y(v)); s += '<line class="sr-g" x1="' + l + '" x2="' + (W - r) + '" y1="' + y + '" y2="' + y + '"/><text class="sr-tx" x="' + (l - 6) + '" y="' + f1(Y(v) + 3.5) + '" text-anchor="end">' + esc(pcMoney(v, v >= 100 ? 0 : 2).replace(' €', '')) + '</text>'; });
    SR_STEPS.forEach(function (n) { var xx = f1(X(n)); s += '<line class="sr-g" x1="' + xx + '" x2="' + xx + '" y1="' + tp + '" y2="' + (tp + ph) + '"/><text class="sr-tx" x="' + xx + '" y="' + (tp + ph + 14) + '" text-anchor="middle">' + n + '</text>'; });
    s += '<text class="sr-tx" x="' + (W - r) + '" y="' + (H - 4) + '" text-anchor="end">' + esc(x.axisX) + '</text><text class="sr-tx" x="' + 2 + '" y="' + 9 + '">' + esc(x.axisY) + '</text>';
    s += '<line class="sr-ax" x1="' + l + '" x2="' + (W - r) + '" y1="' + (tp + ph) + '" y2="' + (tp + ph) + '"/><line class="sr-ax" x1="' + l + '" x2="' + l + '" y1="' + tp + '" y2="' + (tp + ph) + '"/>';
    var fy = f1(Y(c.p.unit)); s += '<line class="sr-fl" x1="' + l + '" x2="' + (W - r) + '" y1="' + fy + '" y2="' + fy + '"/><text class="sr-tx sr-tx--d" x="' + (W - r - 2) + '" y="' + f1(Y(c.p.unit) + 11) + '" text-anchor="end">' + esc(x.floor + ' ' + pcMoney(c.p.unit, 2)) + '</text>';
    s += '<polyline class="sr-ln" points="' + pts.join(' ') + '"/>';
    c.rows.forEach(function (rw) { if (rw.q !== c.own) s += '<circle class="sr-pt" cx="' + f1(X(rw.q)) + '" cy="' + f1(Y(rw.each)) + '" r="2.5"/>'; });
    if (c.pick) { var ox = f1(X(c.own)), oy = f1(Y(c.pick.each)); s += '<line class="sr-own" x1="' + ox + '" x2="' + ox + '" y1="' + oy + '" y2="' + (tp + ph) + '"/><circle class="sr-pt sr-pt--on" cx="' + ox + '" cy="' + oy + '" r="4"/>'; }
    return s + '</svg>';
  }
  function srSum(c) {
    var x = t().sr; if (!c) return x.empty;
    return c.pick ? x.sum.replace('{each}', pcMoney(c.pick.each, 2)).replace('{total}', pcMoney(c.pick.total, 2)).replace('{n}', srPcs(c.own)) : x.pickQ;
  }
  function srNotes(c) {
    var x = t().sr, pr = PRICE.print, a = [];
    a.push(x.nPiece.replace('{p}', pcMoney(c.p.unit, 2)).replace('{part}', srPartText(c.p)) + (c.p.minPart ? ' (' + t().qc.minPartApplied + ')' : '') + (c.p.rush ? ' (' + x.rushIn.replace('{n}', pr.rushPct) + ')' : ''));
    if (+pr.setup > 0) a.push(x.nSetup.replace('{s}', pcMoney(pr.setup)));
    if (c.qMin > 1) a.push(x.nMin.replace('{m}', pcMoney(pr.minOrder)).replace('{n}', srPcs(c.qMin - 1)));
    if (c.near > 1) a.push(x.nNear.replace('{n}', srPcs(c.near)));
    a.push(x.nNoDisc);
    return a;
  }
  function srBody(c) {
    var x = t().sr; if (!c) return '';
    var rows = c.rows.map(function (r) {
      var on = r.q === c.own;
      return '<tr' + (on ? ' class="is-on"' : '') + '><th scope="row"><button type="button" class="sr-q" data-sr-q="' + r.q + '" aria-pressed="' + on + '" aria-label="' + esc(x.choose.replace('{n}', srPcs(r.q))) + '">' + r.q + '</button></th><td>' + esc(pcMoney(r.each, 2)) + '</td><td>' + esc(pcMoney(r.total, 2)) + (r.min ? '<abbr class="sr-min" title="' + esc(t().qc.minApplied) + '">*</abbr>' : '') + '</td><td>' + esc(srSave(c, r)) + '</td></tr>';
    }).join('');
    var anyMin = c.rows.some(function (r) { return r.min; });
    return '<div class="sr-fig">' + srSvg(c) + '</div>' +
      '<div class="sr-scroll"><table class="sr-table"><caption class="vh">' + esc(x.caption) + '</caption><thead><tr><th scope="col">' + esc(x.cQty) + '</th><th scope="col">' + esc(x.cEach) + '</th><th scope="col">' + esc(x.cTotal) + '</th><th scope="col">' + esc(x.cSave) + '</th></tr></thead><tbody>' + rows + '</tbody></table></div>' +
      (anyMin ? '<p class="sr-foot">* ' + esc(t().qc.minApplied) + '</p>' : '') +
      '<ul class="sr-notes">' + srNotes(c).map(function (n) { return '<li>' + esc(n) + '</li>'; }).join('') + '</ul>';
  }
  function srLine(c) { // one line for the brief and the clipboard
    var x = t().sr, r = c.pick || c.one;
    return x.brief + ': ' + srPartText(c.p) + ' ' + x.perPiece + '; ' + srPcs(r.q) + ' ≈ ' + pcMoney(r.each, 2) + ' ' + x.perPiece + ', ≈ ' + pcMoney(r.total, 2) + ' ' + x.inTotal + (r.q > 1 ? ' (' + srPcs(1) + ' ≈ ' + pcMoney(c.one.total, 2) + ')' : '') + '.';
  }
  function srText(c) {
    var x = t().sr, out = [x.label.split(' · ')[0].toUpperCase() + ' NK-R — nacekepa.work', srPartText(c.p) + ' ' + x.perPiece, '', [x.cQty, x.cEach, x.cTotal, x.cSave].join(' | ')];
    c.rows.forEach(function (r) { out.push((r.q === c.own ? '→ ' : '  ') + [r.q, pcMoney(r.each, 2), pcMoney(r.total, 2) + (r.min ? ' *' : ''), srSave(c, r)].join(' | ')); });
    if (c.rows.some(function (r) { return r.min; })) out.push('* ' + t().qc.minApplied);
    out.push(''); srNotes(c).forEach(function (n) { out.push('- ' + n); });
    out.push('', t().qc.note.replace('{vat}', L(PRICE.vatNote) || '').trim());
    return out.join('\n');
  }
  function srSeed() { // first look at the tool: the part typed in the quote estimate (or handed over by the Part studio) is taken over
    var s = state.sr, q = state.qc; if (s.seeded || s.g || s.h) return;
    if (q.print && (qcNum(q.g) || qcNum(q.h))) srFromQc();
  }
  function srFromQc() { var s = state.sr, q = state.qc; s.mat = q.mat; s.g = q.g; s.h = q.h; s.rush = q.rush ? 1 : 0; var n = Math.round(qcNum(q.qty)); if (n > 1) s.qty = String(n); s.seeded = 1; }
  function srBox() {
    srSeed();
    var x = t().sr, s = state.sr, pr = PRICE.print, c = srCalc();
    var num = function (k, label, unit, attrs, hint) { return '<div class="nk-field"><label class="nk-field__label" for="sr-' + k + '">' + esc(label) + (unit ? ' · ' + esc(unit) : '') + '</label><input class="nk-input" id="sr-' + k + '" data-sr-f="' + k + '" type="number" inputmode="decimal" min="0" ' + attrs + ' value="' + esc(s[k]) + '">' + (hint ? '<span class="nk-field__hint">' + esc(hint) + '</span>' : '') + '</div>'; };
    return '<section class="block sr">' + head(x.label, x.title, x.lead) + '<div class="fit-grid sr-grid"><div class="fit-form"><p class="nk-label">' + esc(x.part) + '</p><div class="qc-print sr-form">' +
      (pcMats().length ? '<div class="nk-field"><label class="nk-field__label" for="sr-mat">' + esc(t().pc.material) + '</label><select class="nk-input" id="sr-mat" data-sr-f="mat">' + pcMats().map(function (m) { return '<option value="' + esc(m.key) + '"' + (pcMat(s.mat) === m ? ' selected' : '') + '>' + esc(m.name) + '</option>'; }).join('') + '</select></div>' + num('g', t().qc.weight, t().qc.grams, 'step="1"', s.seeded ? (state.qc.src ? t().qc.fromStudio : x.seeded) : '') : '') +
      (+pr.machineHour > 0 ? num('h', t().qc.printHours, t().qc.h, 'step="0.25"') : '') + num('qty', x.yourQty, '', 'step="1" inputmode="numeric" min="1" max="10000"') +
      (+pr.rushPct > 0 ? '<label class="ad-check qc-check"><input type="checkbox" data-sr-rush' + (s.rush ? ' checked' : '') + '> ' + esc(t().qc.rush.replace('{n}', pr.rushPct)) + '</label>' : '') + '</div>' +
      '<div class="cta-row"><button type="button" class="nk-btn nk-btn--primary" data-sr-go' + (c ? '' : ' disabled') + '>' + esc(x.go) + '<span class="nk-btn__arrow" aria-hidden="true">→</span></button><button type="button" class="nk-btn" data-sr-copy' + (c ? '' : ' disabled') + '>' + esc(x.copy) + '</button><button type="button" class="nk-btn nk-btn--ghost" data-mn-calc="series"' + (c ? '' : ' disabled') + '>' + esc(t().mn.calcSave) + '</button><span class="copy-msg" id="sr-msg" role="status"></span></div>' +
      '<p class="fit-note">' + esc(t().qc.note.replace('{vat}', L(PRICE.vatNote) || '')) + '</p>' +
      '<p class="pl-open"><a href="#services?tool=quote" data-sr-qc>' + esc(x.toQuote) + ' →</a><span aria-hidden="true"> · </span><a href="#studio">' + esc(x.toStudio) + ' →</a>' + (mxOn() ? '<span aria-hidden="true"> · </span><a href="#services?tool=matprice" data-sr-mx>' + esc(t().mx.fromQuote) + ' →</a>' : '') + '</p></div>' +
      '<div class="pl-sheet sr-sheet"><div class="pl-head"><span class="nk-label">' + esc(x.table) + '</span><span class="nk-label">NK-R</span></div><div class="sr-out"><p class="sr-sum' + (c ? '' : ' is-empty') + '" id="sr-sum" role="status" aria-live="polite">' + esc(srSum(c)) + '</p><div id="sr-body">' + srBody(c) + '</div></div></div></div></section>';
  }
  function srUpdate(focusQ) {
    var c = srCalc(), sum = document.getElementById('sr-sum'), body = document.getElementById('sr-body'); if (!sum || !body) return;
    sum.textContent = srSum(c); sum.classList.toggle('is-empty', !c); body.innerHTML = srBody(c);
    ['data-sr-go', 'data-sr-copy', 'data-mn-calc="series"'].forEach(function (a) { var b = document.querySelector('[' + a + ']'); if (b) b.disabled = !c; });
    if (focusQ) { var el = body.querySelector('[data-sr-q="' + focusQ + '"]'); if (el) el.focus({ preventScroll: true }); }
  }
  function srPick(q) { state.sr.qty = String(q); var i = document.getElementById('sr-qty'); if (i) i.value = state.sr.qty; srUpdate(q); }
  function srCopy() {
    var c = srCalc(), msg = document.getElementById('sr-msg'), x = t().sr; if (!c || !msg) return;
    var fail = function () { msg.textContent = t().qc.copyFail; };
    try { navigator.clipboard.writeText(srText(c) + (clUrl('series') ? '\n' + clUrl('series') : '')).then(function () { msg.textContent = x.copied; }, fail); } catch (e) { fail(); }
  }
  function srToQc() { var s = state.sr, q = state.qc; q.print = 1; q.mat = s.mat; q.g = s.g; q.h = s.h; q.rush = s.rush ? 1 : 0; if (srQty()) q.qty = String(srQty()); q.src = ''; } // the link itself opens the estimate
  function srToOrder() {
    var c = srCalc(), o = state.order, x = t().sr; if (!c) return;
    if (o.services.indexOf('print') < 0) o.services.push('print');
    var mm = c.p.m && MP_MATS.filter(function (v) { return v.id === c.p.m.key; })[0]; if (mm) o.mat = mm.o;
    if (c.own) o.qty = String(c.own);
    var line = srLine(c);
    if (o.what.indexOf(x.brief + ':') < 0) o.what = o.what ? o.what + '\n' + line : line;
    else o.what = o.what.split('\n').map(function (l) { return l.indexOf(x.brief + ':') === 0 ? line : l; }).join('\n');
    state.step = 0; state.errors = {}; state.send = 'idle';
    location.hash = 'order';
  }

  // ---------- Budget / "Proračun" NK-B (#services?tool=budget, the tool after the series price; 2026-11-17) ----------
  // The quote estimate run backwards: the visitor types an amount and — optionally — the hours of work they already expect and
  // one printed part; the tool shows what the amount covers: a plan (the hours as typed + as many whole pieces as still fit),
  // a drawn bar of the budget split into the plan's rows and what is left, and a table of what the whole budget covers when it
  // is spent on one service (hours in half-hour steps, whole pieces). The sums are the quote estimate's (qcCalc): hourly rates
  // with the minimum hours, piece = material + machine time (not below the minimum per part, + rush), file preparation once,
  // minimum order, the running promotion — every number from settings.json, nothing invented. Without a price list the tool
  // does not render. Nothing is stored or sent. Uses srPcs() (piece plural) of the Series price.
  // Self-contained: remove BG_HR … bgToSr(), the 'budget' entry in TL_TOOLS, tlWrap('budget', bgBox()) in views.services, the
  // data-qc-bg link in qcBox(), the data-bg-* lines in the click / input / change handlers, the 'budget' branches of clUrl() /
  // clRead(), bg: and tl.budget in both languages in content.js and the "Budget NK-B" rules at the end of page.css.
  var BG_HR = ['cad', 'iot', 'build'];
  state.bg = { amt: '', first: 1, cadH: '', iotH: '', buildH: '', mat: '', g: '', h: '', rush: 0 };
  function bgOn() { return pcOn(); }
  function bgPrintOn() { return !!(PRICE && (pcMats().length || +PRICE.print.machineHour > 0)); }
  function bgAmt() { return Math.min(qcNum(state.bg.amt), 1000000); }
  function bgSvc(k) { return SERVICES.filter(function (s) { return s.key === k; })[0]; }
  function bgHrs() { var o = {}; BG_HR.forEach(function (k) { if (+PRICE.hourly[k] > 0) { var h = Math.min(qcNum(state.bg[k + 'H']), 10000); if (h) o[k] = h; } }); return o; }
  function bgPart() { // one printed piece, priced like the quote estimate; null without a weight or a print time
    if (!bgPrintOn()) return null;
    var s = state.bg, pr = PRICE.print, m = pcMat(s.mat), g = qcNum(s.g), h = qcNum(s.h), raw = g * (m ? +m.perGram : 0) + h * (+pr.machineHour || 0); if (!(raw > 0)) return null;
    var low = +pr.minPart > 0 && raw < +pr.minPart, rush = !!(s.rush && +pr.rushPct > 0);
    return { m: m, g: g, h: h, minPart: low, rush: rush, unit: (low ? +pr.minPart : raw) * (rush ? 1 + pr.rushPct / 100 : 1) };
  }
  function bgPartText(p) { return (p.m ? p.m.name + ' · ' : '') + (p.g ? fitFmt(p.g) + ' g' : '') + (p.g && p.h ? ' + ' : '') + (p.h ? fitFmt(p.h) + ' h' : '') + (p.rush ? ' · +' + PRICE.print.rushPct + ' %' : ''); }
  function bgPlan(hrs, p, q) { // the quote estimate's sums for these hours + q pieces of the part
    var P = PRICE, pr = P.print, rows = [], total = 0, minH = false, part0 = 0;
    BG_HR.forEach(function (k) {
      var h = hrs[k]; if (!h || !(+P.hourly[k] > 0)) return;
      if (+P.minHours > 0 && h < +P.minHours) { h = +P.minHours; minH = true; }
      rows.push({ k: k, t: L(bgSvc(k).title) + ' · ' + fitFmt(h) + ' h', c: h * +P.hourly[k], h: h }); total += h * +P.hourly[k]; if (k === 'cad') part0 += h * +P.hourly[k];
    });
    if (p && q > 0) {
      rows.push({ k: 'print', t: L(bgSvc('print').title) + ' · ' + bgPartText(p) + ' × ' + q, c: p.unit * q }); total += p.unit * q; part0 += p.unit * q;
      if (+pr.setup > 0) { rows.push({ k: 'setup', t: t().pc.setup, c: +pr.setup }); total += +pr.setup; part0 += +pr.setup; }
    }
    var sum0 = total, minO = +pr.minOrder > 0 && rows.length > 0 && total < +pr.minOrder; if (minO) total = +pr.minOrder;
    var pm = promo(), disc = promoDisc(pm, total, part0, sum0, state.bg.first, p && q > 0);
    return { rows: rows, total: Math.round(total * 100) / 100, disc: disc, after: Math.round((total - disc) * 100) / 100, minO: minO, minH: minH, minPart: !!(p && q > 0 && p.minPart), q: p && q > 0 ? q : 0, pm: disc ? pm : null };
  }
  function bgFits(B, pl) { return pl.after <= B + 1e-9; }
  function bgMaxQ(B, hrs, p) { // the most whole pieces that still fit next to the hours
    if (!p || !bgFits(B, bgPlan(hrs, p, 1))) return 0;
    var lo = 1, hi = 100000; if (bgFits(B, bgPlan(hrs, p, hi))) return hi;
    while (hi - lo > 1) { var mid = (lo + hi) >> 1; if (bgFits(B, bgPlan(hrs, p, mid))) lo = mid; else hi = mid; }
    return lo;
  }
  function bgMaxH(B, k) { // the most hours of one service, in half-hour steps
    var one = function (n) { var o = {}; o[k] = n / 2; return bgPlan(o, null, 0); };
    if (!bgFits(B, one(1))) return 0;
    var lo = 1, hi = 40000; if (bgFits(B, one(hi))) return hi / 2;
    while (hi - lo > 1) { var mid = (lo + hi) >> 1; if (bgFits(B, one(mid))) lo = mid; else hi = mid; }
    return Math.max(lo / 2, +PRICE.minHours || 0);
  }
  function bgCalc() {
    var B = bgAmt(); if (!B) return null;
    var hrs = bgHrs(), p = bgPart(), anyH = Object.keys(hrs).length > 0, work = bgPlan(hrs, null, 0);
    var c = { B: B, p: p, hrs: hrs, anyH: anyH, work: work, over: anyH && !bgFits(B, work), plan: null, q: 0, first: null, alone: [] };
    if (!c.over && (anyH || p)) {
      c.q = bgMaxQ(B, hrs, p);
      if (anyH || c.q) c.plan = bgPlan(hrs, p, c.q);
      if (p && !c.q) c.first = bgPlan(hrs, p, 1);
    }
    BG_HR.forEach(function (k) {
      if (!(+PRICE.hourly[k] > 0)) return;
      var h = bgMaxH(B, k), o = {}; o[k] = h || +PRICE.minHours || 0.5;
      c.alone.push({ k: k, t: L(bgSvc(k).title), h: h, plan: bgPlan(o, null, 0) });
    });
    if (bgPrintOn()) { var q = p ? bgMaxQ(B, {}, p) : 0; c.alone.push({ k: 'print', t: L(bgSvc('print').title), q: q, need: !p, plan: p ? bgPlan({}, p, q || 1) : null }); }
    c.any = c.alone.some(function (r) { return r.h || r.q || (r.need && B >= (+PRICE.print.minOrder || 0)); });
    return c;
  }
  function bgLeft(c) { return Math.max(0, Math.round((c.B - c.plan.after) * 100) / 100); }
  function bgWhat(c) { // "CAD design 2 h + 3D printing 14 pieces"
    return c.plan.rows.filter(function (r) { return r.k !== 'setup'; }).map(function (r) { return r.k === 'print' ? L(bgSvc('print').title) + ' ' + srPcs(c.plan.q) : L(bgSvc(r.k).title) + ' ' + fitFmt(r.h) + ' h'; }).join(' + ');
  }
  function bgSum(c) {
    var x = t().bg; if (!c) return x.empty;
    if (c.over) return x.over.replace('{c}', pcMoney(c.work.after, 2)).replace('{d}', pcMoney(c.work.after - c.B, 2));
    if (c.plan) return x.sum.replace('{b}', pcMoney(c.B)).replace('{what}', bgWhat(c)) + ' · ' + x.sumLeft.replace('{l}', pcMoney(bgLeft(c), 2)) + (c.first ? '. ' + x.noPiece.replace('{c}', pcMoney(c.first.after, 2)) : '');
    if (!c.any && +PRICE.print.minOrder > 0 && c.B < +PRICE.print.minOrder) return x.tooLow.replace('{b}', pcMoney(c.B)).replace('{m}', pcMoney(+PRICE.print.minOrder));
    if (c.first) return x.noPiece.replace('{c}', pcMoney(c.first.after, 2));
    return x.sumOnly.replace('{b}', pcMoney(c.B));
  }
  function bgSvg(c) { // the budget as a dimensioned bar: one segment per row of the plan, the rest dashed
    var x = t().bg, pl = c.plan, W = 360, H = 78, l = 8, bw = W - 16, y = 32, bh = 20, raw = pl.rows.reduce(function (a, r) { return a + r.c; }, 0) || 1, k = pl.after / raw;
    var f1 = function (n) { return (Math.round(n * 10) / 10).toFixed(1); }, at = l, left = bgLeft(c);
    var s = '<svg class="bg-svg" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(x.chartAria.replace('{b}', pcMoney(c.B)).replace('{n}', pl.rows.length).replace('{l}', pcMoney(left, 2))) + '">' +
      '<line class="bg-dim" x1="' + l + '" x2="' + (W - 8) + '" y1="18" y2="18"/><line class="bg-dim" x1="' + l + '" x2="' + l + '" y1="12" y2="' + (y + bh) + '"/><line class="bg-dim" x1="' + (W - 8) + '" x2="' + (W - 8) + '" y1="12" y2="' + (y + bh) + '"/>' +
      '<text class="bg-tx bg-tx--d" x="' + (W / 2) + '" y="11" text-anchor="middle">' + esc(x.budget + ' ' + pcMoney(c.B)) + '</text>';
    pl.rows.forEach(function (r, i) {
      var w = Math.max(0, r.c * k / c.B * bw);
      s += '<rect class="bg-s bg-s--' + (i % 4) + '" x="' + f1(at) + '" y="' + y + '" width="' + f1(w) + '" height="' + bh + '"/>' + (w >= 9 ? '<text class="bg-tx" x="' + f1(at + w / 2) + '" y="' + (y + bh + 14) + '" text-anchor="middle">' + (i + 1) + '</text>' : '');
      at += w;
    });
    var lw = Math.max(0, l + bw - at);
    if (lw > 0.5) s += '<rect class="bg-left" x="' + f1(at) + '" y="' + (y + 0.5) + '" width="' + f1(lw) + '" height="' + (bh - 1) + '"/>' + (lw >= 56 ? '<text class="bg-tx" x="' + f1(at + lw / 2) + '" y="' + (y + bh + 14) + '" text-anchor="middle">' + esc(x.sumLeft.replace('{l}', pcMoney(left, 2))) + '</text>' : '');
    return s + '</svg>';
  }
  function bgNotes(c) {
    var x = t().bg, P = PRICE, a = [];
    if (c.plan && c.plan.pm) a.push(x.nPromo.replace('{n}', c.plan.pm.pct));
    if (c.plan && c.plan.minO) a.push(t().qc.minApplied.charAt(0).toUpperCase() + t().qc.minApplied.slice(1) + ' (' + pcMoney(P.print.minOrder) + ').');
    else if (+P.print.minOrder > 0) a.push(x.nMinO.replace('{m}', pcMoney(P.print.minOrder)));
    if (c.plan && c.plan.minPart) a.push(t().qc.minPartApplied.charAt(0).toUpperCase() + t().qc.minPartApplied.slice(1) + ' (' + pcMoney(P.print.minPart) + ').');
    if (+P.minHours > 0) a.push(x.nMinH.replace('{n}', fitFmt(+P.minHours)));
    a.push(x.nHalf);
    if (+P.hourly.build > 0 && L(P.buildNote)) a.push(L(bgSvc('build').title) + ': ' + L(P.buildNote));
    a.push(x.nQuote);
    return a;
  }
  function bgAlone(r) { // [covers, costs] of one "whole budget on one service" row
    var x = t().bg;
    if (r.k === 'print') return r.need ? [x.needPart, '—'] : r.q ? [srPcs(r.q), '≈ ' + pcMoney(r.plan.after, 2)] : [x.none.replace('{c}', pcMoney(r.plan.after, 2)), '—'];
    return r.h ? [fitFmt(r.h) + ' h', '≈ ' + pcMoney(r.plan.after, 2)] : [x.none.replace('{c}', pcMoney(r.plan.after, 2)), '—'];
  }
  function bgBody(c) {
    var x = t().bg, h = ''; if (!c) return '';
    if (c.plan) {
      var pl = c.plan;
      h += '<div class="bg-fig">' + bgSvg(c) + '</div><p class="nk-label">' + esc(x.plan) + '</p><dl class="nk-specs qc-rows bg-rows">' +
        pl.rows.map(function (r, i) { return '<div><dt><span class="bg-n" aria-hidden="true">' + (i + 1) + '</span>' + esc(r.t) + '</dt><dd>' + esc(pcMoney(r.c, 2)) + '</dd></div>'; }).join('') +
        (pl.disc ? '<div><dt>' + esc(x.disc.replace('{n}', pl.pm.pct)) + '</dt><dd>−' + esc(pcMoney(pl.disc, 2)) + '</dd></div>' : '') + '</dl>' +
        '<p class="qc-total"><span class="nk-label">' + esc(x.total) + '</span><b>' + esc('≈ ' + pcMoney(pl.after, 2)) + '</b><span class="qc-was">' + esc(x.left + ': ' + pcMoney(bgLeft(c), 2)) + '</span></p>';
    }
    h += '<p class="nk-label">' + esc(x.alone) + '</p><div class="bg-scroll"><table class="bg-table"><caption class="vh">' + esc(x.caption) + '</caption><thead><tr><th scope="col">' + esc(x.cWhat) + '</th><th scope="col">' + esc(x.cCovers) + '</th><th scope="col">' + esc(x.cCost) + '</th></tr></thead><tbody>' +
      c.alone.map(function (r) { var v = bgAlone(r); return '<tr><th scope="row">' + esc(r.t) + '</th><td>' + esc(v[0]) + '</td><td>' + esc(v[1]) + '</td></tr>'; }).join('') + '</tbody></table></div>' +
      '<ul class="bg-notes">' + bgNotes(c).map(function (n) { return '<li>' + esc(n) + '</li>'; }).join('') + '</ul>';
    return h;
  }
  function bgLine(c) { // one line for the brief
    var x = t().bg, s = x.brief + ': ' + pcMoney(c.B) + ' ' + x.exVat;
    if (c.plan) s += ' → ' + c.plan.rows.map(function (r) { return r.t + ' ' + pcMoney(r.c, 2); }).join('; ') + (c.plan.disc ? '; ' + x.disc.replace('{n}', c.plan.pm.pct) + ' −' + pcMoney(c.plan.disc, 2) : '') + ' → ≈ ' + pcMoney(c.plan.after, 2) + ' (' + x.sumLeft.replace('{l}', pcMoney(bgLeft(c), 2)) + ')';
    return s + '.';
  }
  function bgText(c) {
    var x = t().bg, out = [x.label.split(' · ')[0].toUpperCase() + ' NK-B — nacekepa.work', x.budget + ': ' + pcMoney(c.B) + ' ' + x.exVat];
    if (c.over) out.push(bgSum(c));
    if (c.plan) {
      out.push('', x.plan + ':'); c.plan.rows.forEach(function (r) { out.push('- ' + r.t + ': ' + pcMoney(r.c, 2)); });
      if (c.plan.disc) out.push('- ' + x.disc.replace('{n}', c.plan.pm.pct) + ': −' + pcMoney(c.plan.disc, 2));
      out.push(x.total + ': ≈ ' + pcMoney(c.plan.after, 2) + ' · ' + x.left + ': ' + pcMoney(bgLeft(c), 2));
    }
    out.push('', x.alone + ':'); c.alone.forEach(function (r) { var v = bgAlone(r); out.push('- ' + r.t + ': ' + v[0] + (v[1] !== '—' ? ' (' + v[1] + ')' : '')); });
    out.push(''); bgNotes(c).forEach(function (n) { out.push('- ' + n); });
    out.push('', t().qc.note.replace('{vat}', L(PRICE.vatNote) || '').trim());
    var u = clUrl('budget'); if (u) out.push(u);
    return out.join('\n');
  }
  function bgLinks(c) {
    var x = t().bg, a = [];
    if (c && c.plan) a.push('<a href="#services?tool=quote" data-bg-qc>' + esc(x.toQuote) + ' →</a>');
    if (c && c.p && srOn()) a.push('<a href="#services?tool=series" data-bg-sr>' + esc(x.toSeries) + ' →</a>');
    if (PRICE_LIST) a.push('<a href="#services?tool=prices">' + esc(x.toPrices) + ' →</a>');
    return a.join('<span aria-hidden="true"> · </span>');
  }
  function bgBox() {
    var x = t().bg, s = state.bg, P = PRICE, c = bgCalc(), pm = promo();
    var num = function (k, id, label, unit, attrs, hint) { return '<div class="nk-field"><label class="nk-field__label" for="bg-' + id + '">' + esc(label) + (unit ? ' · ' + esc(unit) : '') + '</label><input class="nk-input" id="bg-' + id + '" data-bg-f="' + k + '" type="number" inputmode="decimal" min="0" ' + attrs + ' value="' + esc(s[k]) + '">' + (hint ? '<span class="nk-field__hint">' + esc(hint) + '</span>' : '') + '</div>'; };
    var hrs = BG_HR.filter(function (k) { return +P.hourly[k] > 0; });
    return '<section class="block bg">' + head(x.label, x.title, x.lead) + '<div class="fit-grid"><div class="fit-form">' + num('amt', 'amt', x.amount, '€', 'step="10" max="1000000"', x.amountHint) +
      (pm && !promoAuto(pm) ? '<label class="ad-check qc-check"><input type="checkbox" data-bg-k="first"' + (s.first ? ' checked' : '') + '> ' + esc(t().qc.first.replace('{n}', pm.pct)) + '</label>' : '') +
      (hrs.length ? '<div class="bg-group" role="group" aria-labelledby="bg-work-l"><p class="nk-label" id="bg-work-l">' + esc(x.work) + '</p><div class="qc-print bg-form">' + hrs.map(function (k) { return num(k + 'H', k, L(bgSvc(k).title), t().qc.h, 'step="0.5"'); }).join('') + '</div><p class="bg-hint">' + esc(bgPrintOn() ? x.workHint : x.workHintNoPrint) + '</p></div>' : '') +
      (bgPrintOn() ? '<div class="bg-group" role="group" aria-labelledby="bg-part-l"><p class="nk-label" id="bg-part-l">' + esc(x.part) + '</p><div class="qc-print bg-form">' +
        (pcMats().length ? '<div class="nk-field"><label class="nk-field__label" for="bg-mat">' + esc(t().pc.material) + '</label><select class="nk-input" id="bg-mat" data-bg-f="mat">' + pcMats().map(function (m) { return '<option value="' + esc(m.key) + '"' + (pcMat(s.mat) === m ? ' selected' : '') + '>' + esc(m.name) + '</option>'; }).join('') + '</select></div>' + num('g', 'g', t().qc.weight, t().qc.grams, 'step="1"') : '') +
        (+P.print.machineHour > 0 ? num('h', 'h', t().qc.printHours, t().qc.h, 'step="0.25"') : '') +
        (+P.print.rushPct > 0 ? '<label class="ad-check qc-check"><input type="checkbox" data-bg-k="rush"' + (s.rush ? ' checked' : '') + '> ' + esc(t().qc.rush.replace('{n}', P.print.rushPct)) + '</label>' : '') + '</div></div>' : '') +
      '<div class="cta-row"><button type="button" class="nk-btn nk-btn--primary" data-bg-go' + (c ? '' : ' disabled') + '>' + esc(x.go) + '<span class="nk-btn__arrow" aria-hidden="true">→</span></button><button type="button" class="nk-btn" data-bg-copy' + (c ? '' : ' disabled') + '>' + esc(x.copy) + '</button><button type="button" class="nk-btn nk-btn--ghost" data-mn-calc="budget"' + (c ? '' : ' disabled') + '>' + esc(t().mn.calcSave) + '</button><span class="copy-msg" id="bg-msg" role="status"></span></div>' +
      '<p class="fit-note">' + esc(t().qc.note.replace('{vat}', L(P.vatNote) || '')) + '</p><p class="pl-open" id="bg-links">' + bgLinks(c) + '</p></div>' +
      '<div class="pl-sheet bg-sheet"><div class="pl-head"><span class="nk-label">' + esc(x.sheet) + '</span><span class="nk-label">NK-B</span></div><div class="bg-out"><p class="bg-sum' + (c && (c.plan || c.over) ? '' : ' is-empty') + (c && c.over ? ' is-over' : '') + '" id="bg-sum" role="status" aria-live="polite">' + esc(bgSum(c)) + '</p><div id="bg-body">' + bgBody(c) + '</div></div></div></div></section>';
  }
  function bgUpdate() {
    var c = bgCalc(), sum = document.getElementById('bg-sum'), body = document.getElementById('bg-body'), ln = document.getElementById('bg-links'); if (!sum || !body) return;
    sum.textContent = bgSum(c); sum.classList.toggle('is-empty', !(c && (c.plan || c.over))); sum.classList.toggle('is-over', !!(c && c.over)); body.innerHTML = bgBody(c);
    if (ln) ln.innerHTML = bgLinks(c);
    ['data-bg-go', 'data-bg-copy', 'data-mn-calc="budget"'].forEach(function (a) { var b = document.querySelector('[' + a + ']'); if (b) b.disabled = !c; });
  }
  function bgCopy() {
    var c = bgCalc(), msg = document.getElementById('bg-msg'), x = t().bg; if (!c || !msg) return;
    var fail = function () { msg.textContent = t().qc.copyFail; };
    try { navigator.clipboard.writeText(bgText(c)).then(function () { msg.textContent = x.copied; }, fail); } catch (e) { fail(); }
  }
  function bgToOrder() {
    var c = bgCalc(), o = state.order, x = t().bg; if (!c) return;
    if (c.plan) {
      c.plan.rows.forEach(function (r) { if (r.k !== 'setup' && o.services.indexOf(r.k) < 0) o.services.push(r.k); });
      if (c.plan.q) { var mm = c.p.m && MP_MATS.filter(function (v) { return v.id === c.p.m.key; })[0]; if (mm) o.mat = mm.o; o.qty = String(c.plan.q); }
    }
    var line = bgLine(c);
    if (o.what.indexOf(x.brief + ':') < 0) o.what = o.what ? o.what + '\n' + line : line;
    else o.what = o.what.split('\n').map(function (l) { return l.indexOf(x.brief + ':') === 0 ? line : l; }).join('\n');
    state.step = 0; state.errors = {}; state.send = 'idle';
    location.hash = 'order';
  }
  function bgToQc() { // the link itself opens the estimate
    var c = bgCalc(), s = state.bg, q = state.qc; if (!c || !c.plan) return;
    BG_HR.forEach(function (k) { q[k] = c.hrs[k] ? 1 : 0; q[k + 'H'] = c.hrs[k] ? String(c.hrs[k]) : ''; });
    q.print = c.plan.q ? 1 : 0; if (c.plan.q) { q.mat = s.mat; q.g = s.g; q.h = s.h; q.qty = String(c.plan.q); q.rush = s.rush ? 1 : 0; q.postH = ''; }
    q.first = s.first ? 1 : 0; q.src = '';
  }
  function bgFromQc() { // "Have a fixed budget?" in the quote estimate: the hours and the part come along, the amount stays the visitor's
    var s = state.bg, q = state.qc;
    BG_HR.forEach(function (k) { s[k + 'H'] = q[k] && qcNum(q[k + 'H']) ? q[k + 'H'] : ''; });
    if (q.print && (qcNum(q.g) || qcNum(q.h))) { s.mat = q.mat; s.g = q.g; s.h = q.h; s.rush = q.rush ? 1 : 0; }
    s.first = q.first ? 1 : 0;
  }
  function bgToSr() { var c = bgCalc(), s = state.bg, r = state.sr; if (!c || !c.p) return; r.mat = s.mat; r.g = s.g; r.h = s.h; r.rush = s.rush ? 1 : 0; if (c.q > 0) r.qty = String(c.q); r.seeded = 0; }

  // ---------- Calculation links (2026-11-17, improvement package) ----------
  // "Copy link to this tool" under the quote estimate, the series price and the budget tool copies the address WITH the numbers
  // typed into the tool (#services?tool=series&m=petg&g=40&h=2&q=25), and such an address fills the tool again — so a client can
  // send a calculation, and Nace can answer with one. Only numbers and a material key from the price list are read; nothing is
  // stored. The copied text of the three tools ends with the same link.
  // To remove: clNum() … clRead(), the clRead line in page(), the data-tl-k part of tlWrap() / tlCopy(), the clUrl() lines in
  // qcCopy() / srCopy() / bgText() and tl.copiedCalc in content.js.
  function clNum(v) { var n = qcNum(v); return n ? String(Math.round(Math.min(n, 1000000) * 100) / 100) : ''; }
  function clUrl(k) { // '' when nothing is typed into the tool
    var a = [], s, m, add = function (n, v) { if (v !== '' && v != null) a.push(n + '=' + encodeURIComponent(v)); };
    var part = function () { m = pcMat(s.mat); add('m', m ? m.key : ''); add('g', clNum(s.g)); add('h', clNum(s.h)); };
    if (k === 'schedule') return scUrl(); // Schedule NK-T (2026-11-18)
    if (k === 'fit' || k === 'plate' || k === 'material') return clFreeUrl(k); // Calculation links, part 2 (2026-11-18)
    if (!PRICE) return '';
    if (k === 'quote') {
      s = state.qc; BG_HR.forEach(function (h) { if (s[h]) add(h, clNum(s[h + 'H'])); });
      if (s.print && (qcNum(s.g) || qcNum(s.h))) { part(); if (qcNum(s.qty) > 1) add('q', clNum(Math.round(qcNum(s.qty)))); add('post', clNum(s.postH)); if (s.rush) add('r', 1); }
      if (a.length && !s.first) add('f', 0);
    } else if (k === 'series') {
      s = state.sr; if (qcNum(s.g) || qcNum(s.h)) { part(); add('q', srQty() || ''); if (s.rush) add('r', 1); }
    } else if (k === 'budget') {
      s = state.bg; if (bgAmt()) { add('b', clNum(s.amt)); BG_HR.forEach(function (h) { add(h, clNum(s[h + 'H'])); }); if (qcNum(s.g) || qcNum(s.h)) { part(); if (s.rush) add('r', 1); } if (!s.first) add('f', 0); }
    } else if (k === 'matprice') { // Material price NK-V (2026-11-17, second run)
      s = state.mx; if (qcNum(s.g) || qcNum(s.h)) { part(); if (mxQty() > 1) add('q', mxQty()); if (s.rush) add('r', 1); var pk = mxCalc(); if (pk && !pk.pick.ref) add('p', pk.pick.m.key); }
    }
    return a.length ? tlUrl(k) + '&' + a.join('&') : '';
  }
  // Calculation links, part 2 (2026-11-18, improvement package): the tools that need no price list — the fit check
  // (#services?tool=fit&l=120&w=80&h=40), the plate tool (…tool=plate&x=60&y=40&z=30&q=24&gap=3) and the material picker
  // (…tool=material&n=23&p=asa; n = numbers of the ticked needs in MP_NEEDS order) — get the same "address with what is typed",
  // and the printed footer line + QR of every tool carry that address (tlFoot() / tlFootFresh()). Only numbers, need numbers
  // and a material id of the picker are read. To remove: clFreeUrl() / clFreeRead(), their two lines in clUrl() / clRead(),
  // tlFoot() / tlFootFresh() (put the plain footer back into tlWrap()), the beforeprint listener and the tlFootFresh() call in tlPrint().
  function clFreeUrl(k) {
    var a = [], s, add = function (n, v) { if (v !== '' && v != null) a.push(n + '=' + encodeURIComponent(v)); };
    if (k === 'fit') { s = state.fit; ['l', 'w', 'h'].forEach(function (f) { add(f, fitNum(s[f]) || ''); }); if (a.length < 3) return ''; }
    else if (k === 'plate') {
      s = state.pb; if (!(pbNum(s.x) > 0 && pbNum(s.y) > 0)) return '';
      add('x', pbNum(s.x)); add('y', pbNum(s.y)); if (pbNum(s.z) > 0) add('z', pbNum(s.z)); if (Math.round(pbNum(s.qty)) > 0) add('q', Math.round(pbNum(s.qty))); if (pbNum(s.gap) >= 0 && pbNum(s.gap) !== 5) add('gap', pbNum(s.gap));
    } else if (k === 'material') {
      var nd = MP_NEEDS.map(function (v, i) { return state.mp.needs[v] ? String(i + 1) : ''; }).join(''); if (!nd) return '';
      add('n', nd); var ch = state.mp.pick && mpChosen(); if (ch && ch.id === state.mp.pick) add('p', ch.id);
    }
    return a.length ? tlUrl(k) + '&' + a.join('&') : '';
  }
  function clFreeRead(k, qs) {
    var o = {}; qs.split('&').forEach(function (kv) { var i = kv.indexOf('='); if (i > 0) o[kv.slice(0, i)] = kv.slice(i + 1, i + 13); });
    var f = function (key) { var n = fitNum(o[key]); return n ? String(n) : ''; };
    if (k === 'fit' && f('l') && f('w') && f('h')) state.fit = { l: f('l'), w: f('w'), h: f('h') };
    else if (k === 'plate' && f('x') && f('y')) { var q = Math.round(fitNum(o.q)), g = pbNum(o.gap); state.pb = { x: f('x'), y: f('y'), z: f('z'), qty: q > 0 ? String(Math.min(q, 100000)) : '', gap: o.gap != null && g >= 0 ? String(g) : '5', lay: '' }; }
    else if (k === 'material' && /^[1-9]{1,9}$/.test(o.n || '')) {
      var nd = {}; MP_NEEDS.forEach(function (v, i) { if (o.n.indexOf(String(i + 1)) >= 0) nd[v] = true; });
      state.mp = { needs: nd, pick: MP_MATS.some(function (v) { return v.id === o.p; }) ? o.p : '' };
    }
  }
  function clRead(k, qs) { // fills the tool the address names from its numbers; an address without numbers changes nothing
    if (k === 'schedule') { scRead(qs); return; } // Schedule NK-T (2026-11-18)
    if (k === 'fit' || k === 'plate' || k === 'material') { clFreeRead(k, qs); return; } // Calculation links, part 2 (2026-11-18)
    if (!PRICE || !/^(quote|series|budget|matprice)$/.test(k)) return;
    var o = {}; qs.split('&').forEach(function (kv) { var i = kv.indexOf('='); if (i > 0) { try { o[kv.slice(0, i)] = decodeURIComponent(kv.slice(i + 1)).slice(0, 12); } catch (e) {} } });
    var n = function (key) { return clNum(o[key]); }, mat = function () { var m = pcMats().filter(function (v) { return v.key === o.m; })[0]; return m ? m.key : ''; }, s;
    if (k === 'quote' && (n('cad') || n('iot') || n('build') || n('g') || n('h'))) {
      s = state.qc; BG_HR.forEach(function (h) { s[h] = n(h) ? 1 : 0; s[h + 'H'] = n(h); });
      s.print = n('g') || n('h') ? 1 : 0; if (s.print) { s.mat = mat(); s.g = n('g'); s.h = n('h'); s.qty = String(Math.max(1, Math.round(+n('q') || 1))); s.postH = n('post'); s.rush = o.r === '1' ? 1 : 0; }
      s.first = o.f === '0' ? 0 : 1; s.src = '';
    } else if (k === 'series' && (n('g') || n('h'))) {
      s = state.sr; s.mat = mat(); s.g = n('g'); s.h = n('h'); s.rush = o.r === '1' ? 1 : 0; s.seeded = 0; if (n('q')) s.qty = String(Math.min(10000, Math.max(1, Math.round(+n('q')))));
    } else if (k === 'budget' && n('b')) {
      s = state.bg; s.amt = n('b'); BG_HR.forEach(function (h) { s[h + 'H'] = n(h); }); s.mat = mat(); s.g = n('g'); s.h = n('h'); s.rush = o.r === '1' ? 1 : 0; s.first = o.f === '0' ? 0 : 1;
    } else if (k === 'matprice' && state.mx && (n('g') || n('h'))) { // Material price NK-V (2026-11-17, second run)
      s = state.mx; s.mat = mat(); s.g = n('g'); s.h = n('h'); s.rush = o.r === '1' ? 1 : 0; s.seeded = 0; s.qty = String(Math.min(10000, Math.max(1, Math.round(+n('q') || 1))));
      s.pick = pcMats().some(function (v) { return v.key === o.p; }) ? o.p : '';
    }
  }

  // ---------- Material price / "Cena po materialih" NK-V (#services?tool=matprice, the tool after the budget; 2026-11-17, second run) ----------
  // The same printed part priced in every material of the price list: the visitor types the weight in one material, the print
  // time and the quantity; the weight in the other materials follows from the densities in settings.json (same volume of
  // plastic), the print time is taken as the same. Table (weight, per piece, order, difference to the typed material), a drawn
  // bar per material and plain notes. With ticks in the material picker each row also says whether that material suits them
  // (mpRank) — price and suitability on one sheet. A row is a button: the chosen material goes to the order form, the series
  // price or the quote estimate. The sums are the quote estimate's (piece = material + machine time, not below the minimum per
  // part, + rush; order = pieces + file preparation, not below the minimum order) — every number from settings.json. Without
  // at least two priced materials the tool does not render. Nothing is stored or sent.
  // Self-contained: remove MX_KEY … mxFrom(), the 'matprice' entry in TL_TOOLS, tlWrap('matprice', mxBox()) in views.services,
  // the data-qc-mx link in qcOut(), the data-sr-mx link in srBox(), the mpMxLink() call in mpOut(), the data-mx-* lines in the
  // click / input / change handlers, the 'matprice' branches of clUrl() / clRead() / mnSaveCalc(), mx: and tl.matprice in both
  // languages in content.js and the "Material price" rules at the end of page.css. (Uses srPcs() of the series price for "pieces".)
  var MX_KEY = 'matprice';
  state.mx = { mat: '', g: '', h: '', qty: '1', rush: 0, pick: '', seeded: 0 };
  function mxOn() { return !!(PRICE && pcMats().length > 1); }
  function mxQty() { var n = Math.round(qcNum(state.mx.qty)); return n >= 1 ? Math.min(n, 10000) : 1; }
  function mxR1(n) { return Math.round(n * 10) / 10; }
  function mxSuit(m) { // 1 suits / 0 does not suit what is ticked in the material picker; -1 when nothing is ticked or the material is not in the picker
    var need = mpTicked(), mm = MP_MATS.filter(function (v) { return v.id === m.key; })[0];
    return !need.length || !mm ? -1 : need.every(function (k) { return mm.v[k] > 0; }) ? 1 : 0;
  }
  function mxCalc() {
    var s = state.mx, pr = PRICE.print, ref = pcMat(s.mat), g = qcNum(s.g), h = +pr.machineHour > 0 ? qcNum(s.h) : 0, q = mxQty(); if (!ref || (!g && !h)) return null;
    var rush = !!(s.rush && +pr.rushPct > 0), setup = +pr.setup || 0;
    var rows = pcMats().map(function (m, i) {
      var conv = g > 0 && +ref.density > 0 && +m.density > 0, gm = conv ? g * m.density / ref.density : g;
      var raw = gm * +m.perGram + h * (+pr.machineHour || 0), low = +pr.minPart > 0 && raw < +pr.minPart, unit = (low ? +pr.minPart : raw) * (rush ? 1 + pr.rushPct / 100 : 1);
      var sum = unit * q + setup, min = +pr.minOrder > 0 && sum < +pr.minOrder, total = Math.round((min ? +pr.minOrder : sum) * 100) / 100;
      return { m: m, i: i, g: gm, conv: conv, minPart: low, min: min, total: total, each: total / q, ref: m === ref, suit: mxSuit(m) };
    });
    if (!rows.some(function (r) { return r.total > 0; })) return null;
    var refRow = rows.filter(function (r) { return r.ref; })[0];
    rows.sort(function (a, b) { return (a.total - b.total) || (a.i - b.i); });
    var pick = rows.filter(function (r) { return r.m.key === s.pick; })[0] || refRow;
    return { rows: rows, ref: refRow, pick: pick, q: q, g: g, h: h, rush: rush, lo: rows[0], hi: rows[rows.length - 1], same: rows.every(function (r) { return r.conv || !g; }), ticked: mpTicked().length > 0 };
  }
  function mxDiff(c, r) { var d = Math.round((r.total / c.ref.total - 1) * 100); return r.ref ? '—' : d === 0 ? '±0 %' : (d > 0 ? '+' : '−') + Math.abs(d) + ' %'; }
  function mxPart(c, r) { return r.m.name + (c.g ? ' · ' + fitFmt(mxR1(r.g)) + ' g' : '') + (c.g && c.h ? ' + ' : c.h ? ' · ' : '') + (c.h ? fitFmt(c.h) + ' h' : ''); }
  function mxSum(c) {
    var x = t().mx; if (!c) return x.empty;
    return c.q > 1 ? x.sum.replace('{m}', c.pick.m.name).replace('{each}', pcMoney(c.pick.each, 2)).replace('{total}', pcMoney(c.pick.total, 2)).replace('{n}', srPcs(c.q)) : x.sum1.replace('{m}', c.pick.m.name).replace('{total}', pcMoney(c.pick.total, 2));
  }
  function mxSvg(c) { // one bar per material, cheapest first; the typed material as a dashed dimension line, the chosen one in red
    var x = t().mx, W = 320, rh = 22, tp = 14, l = 62, r = 64, pw = W - l - r, H = tp + c.rows.length * rh + 6, top = c.hi.total || 1;
    var f1 = function (n) { return (Math.round(n * 10) / 10).toFixed(1); };
    var s = '<svg class="mx-svg" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(x.chartAria.replace('{a}', c.lo.m.name).replace('{pa}', pcMoney(c.lo.total, 2)).replace('{b}', c.hi.m.name).replace('{pb}', pcMoney(c.hi.total, 2))) + '">';
    var rx = f1(l + (c.ref.total / top) * pw);
    s += '<line class="mx-ref" x1="' + rx + '" x2="' + rx + '" y1="' + (tp - 3) + '" y2="' + (H - 4) + '"/><text class="mx-tx mx-tx--d" x="' + rx + '" y="9" text-anchor="' + (c.ref.total / top > 0.6 ? 'end' : 'start') + '">' + esc(c.ref.m.name + ' · ' + x.typed) + '</text>';
    c.rows.forEach(function (rw, n) {
      var y = tp + n * rh, w = Math.max(1, (rw.total / top) * pw), on = rw === c.pick;
      s += '<text class="mx-tx mx-tx--n' + (on ? ' is-on' : '') + '" x="' + (l - 6) + '" y="' + (y + 14) + '" text-anchor="end">' + esc(rw.m.name) + '</text>' +
        '<rect class="mx-bar' + (on ? ' is-on' : '') + (rw.suit === 0 ? ' is-out' : '') + '" x="' + l + '" y="' + (y + 4) + '" width="' + f1(w) + '" height="' + (rh - 8) + '"/>' +
        '<text class="mx-tx' + (on ? ' is-on' : '') + '" x="' + f1(l + w + 5) + '" y="' + (y + 14) + '">' + esc(pcMoney(rw.total, 2)) + '</text>';
    });
    return s + '<line class="mx-ax" x1="' + l + '" x2="' + l + '" y1="' + (tp - 3) + '" y2="' + (H - 4) + '"/></svg>';
  }
  function mxNeeds() { var f = t().mp; return mpTicked().map(function (k) { return f.short[k]; }).join(', '); }
  function mxNotes(c) {
    var x = t().mx, pr = PRICE.print, a = [];
    a.push(c.g ? (c.same ? x.nSame : x.nSameW) + (c.h ? ' ' + x.nTime : '') : x.nNoW);
    if (c.hi.total > c.lo.total) a.push(x.nRange.replace('{a}', c.lo.m.name).replace('{pa}', pcMoney(c.lo.total, 2)).replace('{b}', c.hi.m.name).replace('{pb}', pcMoney(c.hi.total, 2)).replace('{d}', pcMoney(c.hi.total - c.lo.total, 2)));
    if (c.rush) a.push(x.nRush.replace('{n}', pr.rushPct));
    a.push(c.ticked ? x.nSuit.replace('{needs}', mxNeeds()) : x.nPick);
    a.push(x.nQuote);
    return a;
  }
  function mxMark(r) { var x = t().mx; return r.suit < 0 ? '' : '<span class="mx-mk mx-mk--' + (r.suit ? 'g' : 'x') + '"><span aria-hidden="true">' + (r.suit ? '●' : '✕') + '</span><span class="vh"> ' + esc(r.suit ? x.suits : x.suitsNot) + '</span></span>'; }
  function mxBody(c) {
    var x = t().mx; if (!c) return '';
    var many = c.q > 1, anyMin = c.rows.some(function (r) { return r.min; }), anyLow = c.rows.some(function (r) { return r.minPart; });
    var rows = c.rows.map(function (r) {
      var on = r === c.pick;
      return '<tr class="' + (on ? 'is-on' : '') + (r.suit === 0 ? ' is-out' : '') + '"><th scope="row"><button type="button" class="sr-q mx-m" data-mx-m="' + esc(r.m.key) + '" aria-pressed="' + on + '" aria-label="' + esc(x.choose.replace('{m}', r.m.name)) + '">' + esc(r.m.name) + '</button>' + mxMark(r) + (r.ref ? '<span class="mx-typed">' + esc(x.typed) + '</span>' : '') + '</th>' +
        (c.g ? '<td class="mx-w">' + esc(fitFmt(mxR1(r.g))) + ' g</td>' : '') + (many ? '<td>' + esc(pcMoney(r.each, 2)) + (r.minPart ? '<abbr class="sr-min" title="' + esc(t().qc.minPartApplied) + '">†</abbr>' : '') + '</td>' : '') +
        '<td>' + esc(pcMoney(r.total, 2)) + (r.min ? '<abbr class="sr-min" title="' + esc(t().qc.minApplied) + '">*</abbr>' : '') + (!many && r.minPart ? '<abbr class="sr-min" title="' + esc(t().qc.minPartApplied) + '">†</abbr>' : '') + '</td><td>' + esc(mxDiff(c, r)) + '</td></tr>';
    }).join('');
    return '<div class="sr-fig mx-fig">' + mxSvg(c) + '</div>' +
      '<div class="sr-scroll"><table class="sr-table mx-table"><caption class="vh">' + esc(x.caption) + '</caption><thead><tr><th scope="col">' + esc(t().pc.material) + '</th>' + (c.g ? '<th scope="col" class="mx-w">' + esc(x.cWeight) + '</th>' : '') + (many ? '<th scope="col">' + esc(t().sr.cEach) + '</th>' : '') + '<th scope="col">' + esc(many ? t().sr.cTotal : x.cPrice) + '</th><th scope="col">' + esc(x.cDiff.replace('{m}', c.ref.m.name)) + '</th></tr></thead><tbody>' + rows + '</tbody></table></div>' +
      (anyMin ? '<p class="sr-foot">* ' + esc(t().qc.minApplied) + '</p>' : '') + (anyLow ? '<p class="sr-foot">† ' + esc(t().qc.minPartApplied) + '</p>' : '') +
      (c.ticked ? '<p class="sr-foot mx-legend">' + esc(x.legend) + '</p>' : '') +
      '<ul class="sr-notes">' + mxNotes(c).map(function (n) { return '<li>' + esc(n) + '</li>'; }).join('') + '</ul>';
  }
  function mxLine(c) { // one line for the brief
    var x = t().mx, p = c.pick;
    return x.brief + ': ' + mxPart(c, p) + ' ' + t().sr.perPiece + '; ' + srPcs(c.q) + ' ≈ ' + pcMoney(p.total, 2) + (c.q > 1 ? ' (≈ ' + pcMoney(p.each, 2) + ' ' + t().sr.perPiece + ')' : '') + '; ' + x.others + ': ' + c.rows.filter(function (r) { return r !== p; }).map(function (r) { return r.m.name + ' ≈ ' + pcMoney(r.total, 2); }).join(', ') + '.';
  }
  function mxText(c) {
    var x = t().mx, many = c.q > 1, out = [x.label.split(' · ')[0].toUpperCase() + ' NK-V — nacekepa.work', mxPart(c, c.ref) + ' ' + t().sr.perPiece + ' · ' + srPcs(c.q), ''];
    out.push([t().pc.material].concat(c.g ? [x.cWeight] : [], many ? [t().sr.cEach] : [], [many ? t().sr.cTotal : x.cPrice, x.cDiff.replace('{m}', c.ref.m.name)], c.ticked ? [x.cSuit] : []).join(' | '));
    c.rows.forEach(function (r) { out.push((r === c.pick ? '→ ' : '  ') + [r.m.name].concat(c.g ? [fitFmt(mxR1(r.g)) + ' g'] : [], many ? [pcMoney(r.each, 2)] : [], [pcMoney(r.total, 2) + (r.min ? ' *' : '') + (r.minPart ? ' †' : ''), mxDiff(c, r)], c.ticked ? [r.suit < 0 ? '—' : r.suit ? x.suits : x.suitsNot] : []).join(' | ')); });
    if (c.rows.some(function (r) { return r.min; })) out.push('* ' + t().qc.minApplied);
    if (c.rows.some(function (r) { return r.minPart; })) out.push('† ' + t().qc.minPartApplied);
    out.push(''); mxNotes(c).forEach(function (n) { out.push('- ' + n); });
    out.push('', t().qc.note.replace('{vat}', L(PRICE.vatNote) || '').trim());
    if (clUrl(MX_KEY)) out.push(clUrl(MX_KEY));
    return out.join('\n');
  }
  function mxFrom(k) { // the part typed in the quote estimate ('qc') or the series price ('sr') comes along
    var s = state.mx, q = k === 'qc' ? state.qc : state.sr; s.mat = q.mat; s.g = q.g; s.h = q.h; s.rush = q.rush ? 1 : 0; s.pick = '';
    var n = Math.round(qcNum(q.qty)); s.qty = String(n >= 1 ? n : 1); s.seeded = k === 'qc' ? 1 : 2;
  }
  function mxSeed() { var s = state.mx, q = state.qc; if (s.seeded || s.g || s.h) return; if (q.print && (qcNum(q.g) || qcNum(q.h))) mxFrom('qc'); }
  function mxLinks(c) {
    var x = t().mx, a = [];
    if (c && srOn()) a.push('<a href="#services?tool=series" data-mx-sr>' + esc(x.toSeries.replace('{m}', c.pick.m.name)) + ' →</a>');
    if (c && pcOn()) a.push('<a href="#services?tool=quote" data-mx-qc>' + esc(x.toQuote.replace('{m}', c.pick.m.name)) + ' →</a>');
    a.push('<a href="#services?tool=material">' + esc(x.toPicker) + ' →</a>');
    return a.join('<span aria-hidden="true"> · </span>');
  }
  function mxGo(c) { return t().mx.go.replace('{m}', c ? c.pick.m.name : pcMat(state.mx.mat).name); }
  function mxBox() {
    mxSeed();
    var x = t().mx, s = state.mx, pr = PRICE.print, c = mxCalc();
    var num = function (k, label, unit, attrs, hint) { return '<div class="nk-field"><label class="nk-field__label" for="mx-' + k + '">' + esc(label) + (unit ? ' · ' + esc(unit) : '') + '</label><input class="nk-input" id="mx-' + k + '" data-mx-f="' + k + '" type="number" inputmode="decimal" min="0" ' + attrs + ' value="' + esc(s[k]) + '">' + (hint ? '<span class="nk-field__hint">' + esc(hint) + '</span>' : '') + '</div>'; };
    return '<section class="block mx">' + head(x.label, x.title, x.lead) + '<div class="fit-grid sr-grid"><div class="fit-form"><p class="nk-label">' + esc(x.part) + '</p><div class="qc-print sr-form">' +
      '<div class="nk-field"><label class="nk-field__label" for="mx-mat">' + esc(x.weighedIn) + '</label><select class="nk-input" id="mx-mat" data-mx-f="mat">' + pcMats().map(function (m) { return '<option value="' + esc(m.key) + '"' + (pcMat(s.mat) === m ? ' selected' : '') + '>' + esc(m.name) + '</option>'; }).join('') + '</select></div>' +
      num('g', t().qc.weight, t().qc.grams, 'step="1"', s.seeded === 1 ? (state.qc.src ? t().qc.fromStudio : t().sr.seeded) : s.seeded === 2 ? x.seededSr : x.weightHint) +
      (+pr.machineHour > 0 ? num('h', t().qc.printHours, t().qc.h, 'step="0.25"') : '') + num('qty', t().qc.qty, '', 'step="1" inputmode="numeric" min="1" max="10000"') +
      (+pr.rushPct > 0 ? '<label class="ad-check qc-check"><input type="checkbox" data-mx-rush' + (s.rush ? ' checked' : '') + '> ' + esc(t().qc.rush.replace('{n}', pr.rushPct)) + '</label>' : '') + '</div>' +
      '<div class="cta-row"><button type="button" class="nk-btn nk-btn--primary" data-mx-go' + (c ? '' : ' disabled') + '><span id="mx-go-t">' + esc(mxGo(c)) + '</span><span class="nk-btn__arrow" aria-hidden="true">→</span></button><button type="button" class="nk-btn" data-mx-copy' + (c ? '' : ' disabled') + '>' + esc(t().sr.copy) + '</button><button type="button" class="nk-btn nk-btn--ghost" data-mn-calc="' + MX_KEY + '"' + (c ? '' : ' disabled') + '>' + esc(t().mn.calcSave) + '</button><span class="copy-msg" id="mx-msg" role="status"></span></div>' +
      '<p class="fit-note">' + esc(t().qc.note.replace('{vat}', L(PRICE.vatNote) || '')) + '</p><p class="pl-open" id="mx-links">' + mxLinks(c) + '</p></div>' +
      '<div class="pl-sheet sr-sheet"><div class="pl-head"><span class="nk-label">' + esc(x.table) + '</span><span class="nk-label">NK-V</span></div><div class="sr-out"><p class="sr-sum' + (c ? '' : ' is-empty') + '" id="mx-sum" role="status" aria-live="polite">' + esc(mxSum(c)) + '</p><div id="mx-body" class="mx-body">' + mxBody(c) + '</div></div></div></div></section>';
  }
  function mxUpdate(focusM) {
    var c = mxCalc(), sum = document.getElementById('mx-sum'), body = document.getElementById('mx-body'), ln = document.getElementById('mx-links'), go = document.getElementById('mx-go-t'); if (!sum || !body) return;
    sum.textContent = mxSum(c); sum.classList.toggle('is-empty', !c); body.innerHTML = mxBody(c);
    if (ln) ln.innerHTML = mxLinks(c); if (go) go.textContent = mxGo(c);
    ['data-mx-go', 'data-mx-copy', 'data-mn-calc="' + MX_KEY + '"'].forEach(function (a) { var b = document.querySelector('[' + a + ']'); if (b) b.disabled = !c; });
    if (focusM) { var el = body.querySelector('[data-mx-m="' + focusM + '"]'); if (el) el.focus({ preventScroll: true }); }
  }
  function mxPick(k) { state.mx.pick = k; mxUpdate(k); }
  function mxCopy() {
    var c = mxCalc(), msg = document.getElementById('mx-msg'); if (!c || !msg) return;
    var fail = function () { msg.textContent = t().qc.copyFail; };
    try { navigator.clipboard.writeText(mxText(c)).then(function () { msg.textContent = t().sr.copied; }, fail); } catch (e) { fail(); }
  }
  function mxHand(to) { // the chosen material with its own weight goes to the series price ('sr') or the quote estimate ('qc'); the link itself opens the tool
    var c = mxCalc(), s = state.mx; if (!c) return;
    var o = to === 'sr' ? state.sr : state.qc; o.mat = c.pick.m.key; o.g = c.g ? String(mxR1(c.pick.g)) : ''; o.h = s.h; o.rush = c.rush ? 1 : 0;
    if (to === 'sr') { if (c.q > 1) o.qty = String(c.q); o.seeded = 0; } else { o.print = 1; o.qty = String(c.q); o.src = ''; }
  }
  function mxToOrder() {
    var c = mxCalc(), o = state.order, x = t().mx; if (!c) return;
    if (o.services.indexOf('print') < 0) o.services.push('print');
    var mm = MP_MATS.filter(function (v) { return v.id === c.pick.m.key; })[0]; if (mm) o.mat = mm.o;
    if (c.q > 1) o.qty = String(c.q);
    var line = mxLine(c);
    if (o.what.indexOf(x.brief + ':') < 0) o.what = o.what ? o.what + '\n' + line : line;
    else o.what = o.what.split('\n').map(function (l) { return l.indexOf(x.brief + ':') === 0 ? line : l; }).join('\n');
    state.step = 0; state.errors = {}; state.send = 'idle';
    location.hash = 'order';
  }
  function mpMxLink() { return mxOn() ? '<p class="pl-open mp-mx"><a href="#services?tool=' + MX_KEY + '">' + esc(t().mx.fromPicker) + ' →</a></p>' : ''; }

  // ---------- Schedule / "Terminski plan" NK-T (#services?tool=schedule, the tool after the material price; 2026-11-18) ----------
  // The published turnarounds laid end to end: the visitor picks the services, a start date (empty = today) and, optionally, the
  // date the job is needed by. The sheet draws one row per stage (fastest case / longest case), gives the earliest and the latest
  // day each stage is done and, with a date, a verdict (fits / tight / too short) and the day the job has to start by. Every number
  // is a turnaround already on the site (SERVICES[].time in content.js or the admin Settings, read by dlRange() of the deadline
  // check): stages run one after another in calendar days; a full custom build covers the other services (its own text says "the
  // whole product, end to end"), a service without a published turnaround is listed as "quoted per project" and not counted.
  // Hand-offs: order form (services, deadline, a "Schedule: …" line), copy as text, a calendar file (.ics, made in the browser),
  // "Save in My corner", calculation link (#services?tool=schedule&s=12&a=2026-11-20&d=2026-12-10; s = service numbers S-0N).
  // Nothing is stored or sent. Without any published turnaround the tool does not render.
  // Self-contained: remove SC_KEY … dlScLink(), the 'schedule' entry in TL_TOOLS, tlWrap('schedule', scBox()) in views.services,
  // the dlScLink() call in dlInner(), the data-sc-* / data-dl-sc lines in the click / input handlers, the 'schedule' branches of
  // clUrl() / clRead() / mnSaveCalc() (+ 'schedule' in MN_CALC and in mnView()), sc: and tl.schedule in both languages in
  // content.js and the "Schedule NK-T" rules at the end of page.css.
  var SC_KEY = 'schedule';
  state.sc = { svcs: [], from: '', due: '', seeded: 0 };
  function scOn() { return SERVICES.some(function (s) { return !!dlRange(s); }); }
  function scIso(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function scDate(v) { var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(v || '')); if (!m || +m[1] < 2020 || +m[1] > 2099) return null; var d = new Date(+m[1], +m[2] - 1, +m[3]); return d.getMonth() === +m[2] - 1 && d.getDate() === +m[3] ? d : null; }
  function scAdd(iso, n) { var d = scDate(iso); d.setDate(d.getDate() + n); return scIso(d); }
  function scDiff(a, b) { return Math.round((scDate(b) - scDate(a)) / 864e5); }
  function scToday() { return scIso(new Date()); }
  function scDays(n) { return n + ' ' + pbPlural(n, t().sc.days); }
  function scD(iso) { try { return scDate(iso).toLocaleDateString(lang === 'sl' ? 'sl-SI' : 'en-GB', { day: 'numeric', month: 'short' }); } catch (e) { return iso; } } // short date for the drawing and the table
  function scCalc() {
    var s = state.sc, pk = SERVICES.filter(function (v) { return s.svcs.indexOf(v.key) >= 0; }); if (!pk.length) return null;
    var build = pk.filter(function (v) { return v.key === 'build' && dlRange(v); })[0];
    var c = { pk: pk, stages: [], open: [], inc: [], from: scDate(s.from) ? s.from : scToday(), lo: 0, hi: 0, due: '', d: null, v: '' };
    pk.forEach(function (v) {
      var r = dlRange(v);
      if (build && v !== build) { c.inc.push(v); return; }
      if (!r) { c.open.push(v); return; }
      c.stages.push({ s: v, r: r, a0: c.lo, a1: c.lo + r[0], b0: c.hi, b1: c.hi + r[1] }); c.lo += r[0]; c.hi += r[1];
    });
    if (!c.stages.length) return c;
    c.fast = scAdd(c.from, c.lo); c.slow = scAdd(c.from, c.hi);
    if (scDate(s.due)) {
      c.due = s.due; c.d = scDiff(c.from, c.due);
      c.v = c.d <= 0 ? 'past' : c.d < c.lo ? 'short' : c.d < c.hi ? 'tight' : 'ok';
      c.startSlow = scAdd(c.due, -c.hi); c.startFast = scAdd(c.due, -c.lo);
    }
    return c;
  }
  function scNames(a) { return a.map(function (v) { return L(v.title); }).join(' + '); }
  function scSum(c) {
    var x = t().sc; if (!c) return x.empty; if (!c.stages.length) return x.noneT;
    var a = fmtDate(c.fast), b = fmtDate(c.slow);
    if (c.v === 'past') return x.past;
    if (c.v === 'ok') return c.d === c.hi ? x.ok0 : x.ok.replace('{b}', b).replace('{n}', scDays(c.d - c.hi));
    if (c.v === 'tight') return x.tight.replace('{a}', a).replace('{b}', b).replace('{d}', fmtDate(c.due));
    if (c.v === 'short') return x.short.replace('{a}', a).replace('{n}', scDays(c.lo - c.d));
    return x.sum.replace('{a}', a).replace('{b}', b);
  }
  function scSvg(c) { // one row per stage: the fastest case above, the longest case below; dimension lines at both ends, the visitor's date in red
    var x = t().sc, W = 320, l = 44, r = 12, pw = W - l - r, rh = 26, tp = 18, H = tp + c.stages.length * rh + 22, base = H - 18;
    var span = Math.max(c.hi, c.d > 0 ? c.d : 0, 1) * 1.04, px = function (n) { return (Math.round((l + Math.min(n, span) / span * pw) * 10) / 10).toFixed(1); };
    var s = '<svg class="sc-svg" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(x.chartAria.replace('{f}', fmtDate(c.from)).replace('{a}', fmtDate(c.fast)).replace('{b}', fmtDate(c.slow))) + '">';
    s += '<line class="sc-dim" x1="' + px(c.lo) + '" x2="' + px(c.lo) + '" y1="' + (tp - 2) + '" y2="' + (base + 4) + '"/><line class="sc-dim" x1="' + px(c.hi) + '" x2="' + px(c.hi) + '" y1="' + (tp - 2) + '" y2="' + (base + 4) + '"/>';
    c.stages.forEach(function (g, n) {
      var y = tp + n * rh;
      s += '<text class="sc-tx sc-tx--n" x="' + (l - 6) + '" y="' + (y + 15) + '" text-anchor="end">' + esc(g.s.code) + '</text>' +
        '<rect class="sc-bar" x="' + px(g.a0) + '" y="' + (y + 4) + '" width="' + Math.max(1, px(g.a1) - px(g.a0)).toFixed(1) + '" height="7"/>' +
        '<rect class="sc-bar sc-bar--hi" x="' + px(g.b0) + '" y="' + (y + 13) + '" width="' + Math.max(1, px(g.b1) - px(g.b0)).toFixed(1) + '" height="7"/>';
    });
    s += '<line class="sc-ax" x1="' + l + '" x2="' + l + '" y1="' + (tp - 2) + '" y2="' + (base + 4) + '"/><line class="sc-ax" x1="' + l + '" x2="' + (W - r) + '" y1="' + base + '" y2="' + base + '"/>';
    var xa = +px(c.lo), xb = +px(c.hi);
    s += '<text class="sc-tx" x="' + l + '" y="' + (H - 3) + '">' + esc(scD(c.from)) + '</text>';
    if (xb - l >= 84) s += '<text class="sc-tx sc-tx--d" x="' + xb + '" y="' + (H - 3) + '" text-anchor="end">' + esc(scD(c.slow)) + '</text>';
    if (xa - l >= 50 && xb - xa >= 84) s += '<text class="sc-tx sc-tx--d" x="' + xa + '" y="' + (H - 3) + '" text-anchor="middle">' + esc(scD(c.fast)) + '</text>';
    if (c.d > 0) { var xd = +px(c.d); s += '<line class="sc-due" x1="' + xd + '" x2="' + xd + '" y1="' + (tp - 6) + '" y2="' + (base + 4) + '"/><text class="sc-tx sc-tx--r" x="' + (xd > l + pw / 2 ? xd - 4 : xd + 4) + '" y="9" text-anchor="' + (xd > l + pw / 2 ? 'end' : 'start') + '">' + esc(x.lgDue + ' · ' + scD(c.due)) + '</text>'; }
    return s + '</svg>';
  }
  function scNotes(c) {
    var x = t().sc, a = [x.nSeq], today = scToday();
    if (c.v && c.v !== 'past') a.push((c.startFast < today ? x.nStartGone : c.startSlow < today ? x.nStartLate : x.nStart).replace('{u}', fmtDate(c.startSlow)).replace('{f}', fmtDate(c.startFast)));
    if (c.stages.some(function (g) { return g.s.key === 'print' && /\+/.test(g.s.time.en || ''); })) a.push(x.nPost);
    c.open.forEach(function (v) { a.push(x.nOpen.replace('{s}', L(v.title))); });
    if (c.inc.length) a.push(x.nInc.replace('{s}', c.inc.map(function (v) { return L(v.title); }).join(', ')));
    if (c.v === 'short') a.push(x.nShort);
    a.push(x.nQuote);
    return a;
  }
  function scRows(c) { // [stage, usual turnaround, earliest done, latest done] — the same rows for the table and the copied text
    var x = t().sc, rows = c.stages.map(function (g) { return [g.s.code + ' ' + L(g.s.title), L(g.s.time), scD(scAdd(c.from, g.a1)), scD(scAdd(c.from, g.b1))]; });
    c.open.forEach(function (v) { rows.push([v.code + ' ' + L(v.title), t().dl.none, '—', '—']); });
    c.inc.forEach(function (v) { rows.push([v.code + ' ' + L(v.title), x.incT, '—', '—']); });
    return rows;
  }
  function scBody(c) {
    var x = t().sc; if (!c) return '';
    if (!c.stages.length) return '<ul class="sr-notes">' + c.open.map(function (v) { return '<li>' + esc(x.nOpen.replace('{s}', L(v.title))) + '</li>'; }).join('') + '</ul>';
    var rows = scRows(c).map(function (r) { return '<tr><th scope="row">' + esc(r[0]) + '</th><td>' + esc(r[1]) + '</td><td>' + esc(r[2]) + '</td><td>' + esc(r[3]) + '</td></tr>'; }).join('');
    var whole = c.stages.length + c.open.length + c.inc.length > 1 ? '<tr class="is-on"><th scope="row">' + esc(x.whole) + '</th><td>' + esc(c.lo + '–' + scDays(c.hi)) + '</td><td>' + esc(scD(c.fast)) + '</td><td>' + esc(scD(c.slow)) + '</td></tr>' : '';
    return '<div class="sr-fig sc-fig">' + scSvg(c) + '<p class="dl-legend sc-legend" aria-hidden="true"><span><i class="sc-k"></i>' + esc(x.lgFast) + '</span><span><i class="sc-k sc-k--hi"></i>' + esc(x.lgSlow) + '</span>' + (c.d > 0 ? '<span><i class="sc-k sc-k--due"></i>' + esc(x.lgDue) + '</span>' : '') + '</p></div>' +
      '<div class="sr-scroll"><table class="sr-table sc-table"><caption class="vh">' + esc(x.caption) + '</caption><thead><tr><th scope="col">' + esc(x.cStage) + '</th><th scope="col">' + esc(x.cUsual) + '</th><th scope="col">' + esc(x.cFast) + '</th><th scope="col">' + esc(x.cSlow) + '</th></tr></thead><tbody>' + rows + whole + '</tbody></table></div>' +
      '<ul class="sr-notes">' + scNotes(c).map(function (n) { return '<li>' + esc(n) + '</li>'; }).join('') + '</ul>';
  }
  function scOk(c) { return !!(c && c.stages.length && c.v !== 'past'); }
  function scLine(c) { // one line for the brief
    var x = t().sc;
    return x.brief + ': ' + scNames(c.pk) + ', ' + x.lStart.replace('{f}', fmtDate(c.from)) + ' — ' + x.lReady.replace('{a}', fmtDate(c.fast)).replace('{b}', fmtDate(c.slow)) + (c.due ? '; ' + x.lDue.replace('{d}', fmtDate(c.due)).replace('{v}', x.verdict[c.v] || '') : '') + '.';
  }
  function scText(c) {
    var x = t().sc, out = [x.label.split(' · ')[0].toUpperCase() + ' NK-T — nacekepa.work', x.lStart.replace('{f}', fmtDate(c.from)) + (c.due ? ' · ' + x.lgDue + ' ' + fmtDate(c.due) : ''), ''];
    out.push([x.cStage, x.cUsual, x.cFast, x.cSlow].join(' | '));
    scRows(c).forEach(function (r) { out.push(r.join(' | ')); });
    if (c.stages.length > 1) out.push([x.whole, c.lo + '–' + scDays(c.hi), scD(c.fast), scD(c.slow)].join(' | '));
    out.push('', scSum(c), ''); scNotes(c).forEach(function (n) { out.push('- ' + n); });
    if (clUrl(SC_KEY)) out.push('', clUrl(SC_KEY));
    return out.join('\n');
  }
  function scSeed() { var s = state.sc, o = state.order; if (s.seeded || s.svcs.length || !o.services.length) return; s.svcs = o.services.slice(); if (scDate(o.deadline)) s.due = o.deadline; s.seeded = 1; }
  function scLinks() {
    var a = ['<a href="#services?tool=prep">' + esc(t().prep.title) + ' →</a>'];
    if (pcOn()) a.push('<a href="#services?tool=quote">' + esc(t().qc.title) + ' →</a>');
    return a.join('<span aria-hidden="true"> · </span>');
  }
  function scBox() {
    scSeed();
    var x = t().sc, s = state.sc, c = scCalc(), ok = scOk(c), dis = ok ? '' : ' disabled';
    var date = function (k, label, hint) { return '<div class="nk-field"><label class="nk-field__label" for="sc-' + k + '">' + esc(label) + '</label><input class="nk-input" id="sc-' + k + '" data-sc-f="' + k + '" type="date" min="2020-01-01" max="2099-12-31" value="' + esc(scDate(s[k]) ? s[k] : '') + '">' + (hint ? '<span class="nk-field__hint">' + esc(hint) + '</span>' : '') + '</div>'; };
    return '<section class="block sc">' + head(x.label, x.title, x.lead) + '<div class="fit-grid sr-grid"><div class="fit-form">' +
      '<p class="nk-label" id="sc-pick">' + esc(x.pick) + '</p><div class="filters sc-svc" role="group" aria-labelledby="sc-pick">' + SERVICES.map(function (v) {
        return '<button type="button" class="chip" data-sc-svc="' + v.key + '" aria-pressed="' + (s.svcs.indexOf(v.key) >= 0) + '">' + esc(L(v.title)) + ' <span>' + esc(v.time ? L(v.time) : t().dl.none) + '</span></button>';
      }).join('') + '</div>' +
      '<div class="qc-print sr-form sc-form">' + date('from', x.from, x.fromH) + date('due', x.due) + '</div>' +
      '<div class="cta-row"><button type="button" class="nk-btn nk-btn--primary" data-sc-go' + dis + '>' + esc(x.go) + '<span class="nk-btn__arrow" aria-hidden="true">→</span></button><button type="button" class="nk-btn" data-sc-copy' + dis + '>' + esc(x.copy) + '</button><button type="button" class="nk-btn" data-sc-ics' + dis + '>' + esc(x.ics) + '</button><button type="button" class="nk-btn nk-btn--ghost" data-mn-calc="' + SC_KEY + '"' + dis + '>' + esc(t().mn.calcSave) + '</button><span class="copy-msg" id="sc-msg" role="status"></span></div>' +
      '<p class="fit-note">' + esc(x.note) + '</p><p class="pl-open">' + scLinks() + '</p></div>' +
      '<div class="pl-sheet sr-sheet"><div class="pl-head"><span class="nk-label">' + esc(x.table) + '</span><span class="nk-label">NK-T</span></div><div class="sr-out"><p class="sr-sum' + (ok ? '' : ' is-empty') + '" id="sc-sum" role="status" aria-live="polite">' + esc(scSum(c)) + '</p><div id="sc-body" class="mx-body">' + scBody(c) + '</div></div></div></div></section>';
  }
  function scUpdate() {
    var c = scCalc(), ok = scOk(c), sum = document.getElementById('sc-sum'), body = document.getElementById('sc-body'), msg = document.getElementById('sc-msg'); if (!sum || !body) return;
    sum.textContent = scSum(c); sum.classList.toggle('is-empty', !ok); body.innerHTML = scBody(c); if (msg) msg.textContent = '';
    ['data-sc-go', 'data-sc-copy', 'data-sc-ics', 'data-mn-calc="' + SC_KEY + '"'].forEach(function (a) { var b = document.querySelector('[' + a + ']'); if (b) b.disabled = !ok; });
  }
  function scToggle(btn) {
    var s = state.sc, k = btn.getAttribute('data-sc-svc'), i = s.svcs.indexOf(k);
    if (i >= 0) s.svcs.splice(i, 1); else s.svcs.push(k);
    s.seeded = 0; btn.setAttribute('aria-pressed', String(i < 0)); scUpdate();
  }
  function scCopy() {
    var c = scCalc(), msg = document.getElementById('sc-msg'); if (!scOk(c) || !msg) return;
    var fail = function () { msg.textContent = t().qc.copyFail; };
    try { navigator.clipboard.writeText(scText(c)).then(function () { msg.textContent = t().sc.copied; }, fail); } catch (e) { fail(); }
  }
  function scIcsText(c) { // an all-day event per date; plain iCalendar text, made in the browser
    var x = t().sc, names = scNames(c.pk), z = function (iso) { return iso.replace(/-/g, ''); }, esc2 = function (v) { return String(v).replace(/([\;,])/g, '\\$1').replace(/\n/g, '\\n'); };
    var stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, ''), url = clUrl(SC_KEY) || tlUrl(SC_KEY);
    var ev = [[c.from, x.evStart], [c.fast, x.evFast], [c.slow, x.evSlow]]; if (c.fast === c.slow) ev.splice(1, 1); if (c.due) ev.push([c.due, x.evDue]);
    var out = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//nacekepa.work//Schedule NK-T//' + (lang === 'sl' ? 'SL' : 'EN'), 'CALSCALE:GREGORIAN'];
    ev.forEach(function (e, i) { out.push('BEGIN:VEVENT', 'UID:nk-t-' + stamp + '-' + i + '@nacekepa.work', 'DTSTAMP:' + stamp, 'DTSTART;VALUE=DATE:' + z(e[0]), 'DTEND;VALUE=DATE:' + z(scAdd(e[0], 1)), 'SUMMARY:' + esc2(e[1].replace('{s}', names)), 'DESCRIPTION:' + esc2(x.evNote + ' ' + url), 'TRANSP:TRANSPARENT', 'END:VEVENT'); });
    out.push('END:VCALENDAR');
    return out.map(function (ln) { var a = []; while (ln.length > 60) { a.push(ln.slice(0, 60)); ln = ' ' + ln.slice(60); } a.push(ln); return a.join('\r\n'); }).join('\r\n') + '\r\n';
  }
  function scIcs() {
    var c = scCalc(), msg = document.getElementById('sc-msg'); if (!scOk(c)) return;
    try {
      var blob = new Blob([scIcsText(c)], { type: 'text/calendar;charset=utf-8' }), url = URL.createObjectURL(blob), a = document.createElement('a');
      a.href = url; a.download = 'nacekepa-' + (lang === 'sl' ? 'terminski-plan' : 'schedule') + '.ics'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
      if (msg) msg.textContent = t().sc.icsDone;
    } catch (e) { if (msg) msg.textContent = t().qc.copyFail; }
  }
  function scToOrder() {
    var c = scCalc(), o = state.order, x = t().sc; if (!scOk(c)) return;
    c.pk.forEach(function (v) { if (o.services.indexOf(v.key) < 0) o.services.push(v.key); });
    if (c.due && c.due > scToday()) o.deadline = c.due;
    var line = scLine(c);
    if (o.what.indexOf(x.brief + ':') < 0) o.what = o.what ? o.what + '\n' + line : line;
    else o.what = o.what.split('\n').map(function (l) { return l.indexOf(x.brief + ':') === 0 ? line : l; }).join('\n');
    state.step = 0; state.errors = {}; state.send = 'idle';
    location.hash = 'order';
  }
  function scRead(qs) { // #services?tool=schedule&s=12&a=2026-11-20&d=2026-12-10 — only service numbers and real dates are read
    var o = {}; qs.split('&').forEach(function (kv) { var i = kv.indexOf('='); if (i > 0) o[kv.slice(0, i)] = kv.slice(i + 1, i + 12); });
    var sv = SERVICES.filter(function (v, i) { return /^[1-9]{1,9}$/.test(o.s || '') && o.s.indexOf(String(i + 1)) >= 0; }).map(function (v) { return v.key; }); if (!sv.length) return;
    state.sc = { svcs: sv, from: scDate(o.a) ? o.a : '', due: scDate(o.d) ? o.d : '', seeded: 0 };
  }
  function scUrl() { // '' until a service is picked
    var s = state.sc, n = SERVICES.map(function (v, i) { return s.svcs.indexOf(v.key) >= 0 ? String(i + 1) : ''; }).join(''); if (!n) return '';
    return tlUrl(SC_KEY) + '&s=' + n + (scDate(s.from) ? '&a=' + s.from : '') + (scDate(s.due) ? '&d=' + s.due : '');
  }
  function dlScLink() { // order form, step 2: the deadline check hands its services and date to the schedule
    return scOn() ? '<p class="pl-open dl-sc"><a href="#services?tool=' + SC_KEY + '" data-dl-sc>' + esc(t().sc.fromDl) + ' →</a></p>' : '';
  }
  function dlScHand() { var o = state.order; state.sc = { svcs: o.services.slice(), from: '', due: scDate(o.deadline) ? o.deadline : '', seeded: 0 }; }

  // ---------- Parts list / "Kosovnica" NK-L (#services?tool=parts, T-10; 2026-11-05) ----------
  // An order of several different parts on one sheet: every line is a part (name, L × W × H, material, quantity) and gets
  // the fit check (fitCalc), the plates it needs (pbLayout — the plate tool's nesting with the gap set here) and, with a
  // price list in settings.json, the same estimate as the Part studio (estPrint: walls + infill from the print settings,
  // material price × grams + machine hours, minimum per part). The sheet totals pieces, weight, print time, plates and the
  // order price (file preparation once, minimum order). The list stays in this browser (localStorage "nk-parts") so it
  // survives a reload and the trip to the order form; the Part studio and the fit check add their part to it. Uses only
  // numbers already on the site (BED, settings.json). Nothing is sent. Self-contained: remove BM_KEY … bmToOrder(), the
  // 'parts' entry in TL_TOOLS, tlWrap('parts', bmBox()) in views.services, the data-bm-st button in stSheet(), bmFitLink()
  // in fitChecker(), the data-bm-* lines in the click / input / change handlers, bm: + tl.parts in both languages in
  // content.js and the "Parts list" rules at the end of page.css.
  var BM_KEY = 'nk-parts', BM_MAX = 30;
  state.bm = { rows: [], gap: '5', msg: '', ask: false };
  function bmNew(o) { o = o || {}; var r = { name: String(o.name || '').slice(0, 60), l: String(o.l || ''), w: String(o.w || ''), h: String(o.h || ''), mat: String(o.mat || ''), qty: String(o.qty || '1') };
    if (+o.vol > 0 && +o.area > 0) { r.vol = +o.vol; r.area = +o.area; } if (o.file) r.file = String(o.file).slice(0, 80); return r; } // vol / area (mm³ / mm²) and file: set by bmFiles() (2026-11-10) — the mesh's own numbers instead of the box
  function bmLoad() { try { var d = JSON.parse(localStorage.getItem(BM_KEY) || 'null'); if (d && d.v === 1 && Array.isArray(d.rows)) { state.bm.rows = d.rows.slice(0, BM_MAX).map(bmNew); if (d.gap != null) state.bm.gap = String(d.gap); } } catch (e) {} }
  function bmSave() { try { localStorage.setItem(BM_KEY, JSON.stringify({ v: 1, rows: state.bm.rows, gap: state.bm.gap })); } catch (e) {} }
  function bmMat(r) { return pcMats().filter(function (m) { return m.key === r.mat; })[0] || null; }
  function bmAdd(o) { // → index of the new line, or -1 when the list is full
    if (state.bm.rows.length >= BM_MAX) { state.bm.msg = t().bm.full.replace('{n}', BM_MAX); return -1; }
    state.bm.rows.push(bmNew(o)); bmSave(); state.bm.msg = t().bm.added.replace('{n}', state.bm.rows.length); return state.bm.rows.length - 1;
  }
  function bmCalc(r) { // one line: { d, qty, mat, fit, per, plates, est } — fit stays null while the size is incomplete
    var d = [fitNum(r.l), fitNum(r.w), fitNum(r.h)], qty = Math.max(1, Math.round(parseFloat(String(r.qty).replace(',', '.')) || 1)), g = pbNum(state.bm.gap); if (g < 0) g = 0;
    var out = { d: d, qty: qty, mat: bmMat(r), fit: null, per: 0, plates: 0, est: null };
    if (!d[0] || !d[1] || !d[2]) return out;
    out.fit = fitCalc({ l: d[0], w: d[1], h: d[2] });
    if (out.fit.fits) { var best = 0; PB_LAYS.forEach(function (k) { var l = pbLayout(out.fit.o[0], out.fit.o[1], g, k); if (l && l.n > best) best = l.n; }); out.per = best; out.plates = best ? Math.ceil(qty / best) : 0; }
    if (out.fit.fits) out.est = r.vol > 0 && r.area > 0 ? estPrint(r.vol, r.area, out.mat, qty) : estPrint(d[0] * d[1] * d[2], 2 * (d[0] * d[1] + d[1] * d[2] + d[0] * d[2]), out.mat, qty); // a part over the build volume is not estimated — it needs a look first; a line read from a file (bmFiles, 2026-11-10) uses the mesh's volume and surface
    out.file = r.file || ''; out.mesh = r.vol > 0 && r.area > 0; out.vol = out.mesh ? r.vol : 0;
    return out;
  }
  function bmTotals() { // { rows: [bmCalc…], tot: { types, pcs, open, noFit, plates, g, h, noMat, price } }
    var rows = state.bm.rows.map(bmCalc), tot = { types: 0, pcs: 0, open: 0, noFit: 0, plates: 0, g: 0, h: 0, noMat: 0, price: null }, sum = 0, priced = 0;
    rows.forEach(function (c) {
      if (!c.fit) { tot.open++; return; }
      tot.types++; tot.pcs += c.qty; if (!c.fit.fits) { tot.noFit++; return; } tot.plates += c.plates;
      if (c.est) { tot.g += c.est.g * c.qty; tot.h += c.est.h * c.qty; if (c.est.cost) { sum += c.est.cost.part * c.qty; priced++; } else tot.noMat++; }
    });
    if (PRICE && priced) { var order = sum + (+PRICE.print.setup || 0), min = false; if (+PRICE.print.minOrder > 0 && order < +PRICE.print.minOrder) { order = +PRICE.print.minOrder; min = true; } tot.price = { order: order, min: min, setup: +PRICE.print.setup || 0 }; }
    var tt = { rows: rows, tot: tot }; tt.pn = pnNest(tt); // Plate layout NK-N (2026-11-08): the whole order mixed on the plates
    return tt;
  }
  function bmBits(c) { // the result of one line as short strings: fit, plates, weight, time, price
    var f = t().bm, x = t().fit, b = [];
    b.push(c.fit.fits ? (c.fit.asIs ? x.ok : f.fitTurned.replace('{o}', fitDims(c.fit.o))) : x.no);
    if (c.fit.fits && c.per) b.push(f.perPlate.replace('{n}', c.per) + ' · ' + pbPlural(c.plates, f.plates).replace('{n}', c.plates));
    if (c.est) {
      b.push(c.est.g ? '≈ ' + fcNum(c.est.g, 0) + ' g' + (c.qty > 1 ? ' × ' + c.qty : '') : f.noMat);
      b.push(f.time.replace('{h}', fcNum(c.est.h * c.qty, 1)));
      if (c.est.cost) b.push(f.price.replace('{p}', pcMoney(c.est.cost.part, 2)) + (c.qty > 1 ? ' · ' + pcMoney(c.est.cost.part * c.qty, 2) : ''));
    }
    if (c.file) b.push(c.mesh ? f.fromFile.replace('{v}', fcNum(c.vol / 1000)) : f.fromFileOpen); // Files → parts list (2026-11-10)
    return b;
  }
  function bmLine(c) { // the result line under a part's inputs
    var f = t().bm; if (!c.fit) return '<span class="hint">' + esc(f.lineEmpty) + '</span>';
    var b = bmBits(c);
    return '<span class="nk-tag nk-tag--' + (c.fit.fits ? 'ok' : 'rev') + '">' + esc(b[0]) + '</span>' + (b.length > 1 ? ' <span class="bm-bits">' + esc(b.slice(1).join(' · ')) + '</span>' : '');
  }
  function bmSheetRows(tt) { // [[label, value, note?]] for the NK-L sheet, the clipboard and the brief
    var f = t().bm, tot = tt.tot, rows = [];
    if (!tot.types) return rows;
    rows.push([f.sTypes, pbPlural(tot.types, f.sTypesV).replace('{t}', tot.types).replace('{p}', tot.pcs)]);
    rows.push([f.sFit, tot.noFit ? pbPlural(tot.noFit, f.sFitNo).replace('{n}', tot.noFit) : f.sFitOk]);
    if (tot.plates) rows.push([f.sPlates, tt.pn && tt.pn.n ? t().pn.sheetV.replace('{n}', tt.pn.n).replace('{m}', tot.plates) : f.sPlatesV.replace('{n}', tot.plates)]); // Plate layout NK-N (2026-11-08): the mixed count when it is drawn
    if (tot.g) rows.push([f.sWeight, '≈ ' + fcNum(tot.g, 0) + ' g']);
    if (tot.h) rows.push([f.sTime, f.time.replace('{h}', fcNum(tot.h, 1))]);
    if (tot.price) rows.push([f.sPrice, f.sPriceV.replace('{p}', pcMoney(tot.price.order, 2)), [tot.price.setup ? f.sPriceNote.replace('{s}', pcMoney(tot.price.setup, 2)) : '', tot.price.min ? f.sMin : '', tot.noMat ? pbPlural(tot.noMat, f.sNoMat).replace('{n}', tot.noMat) : ''].filter(Boolean).join(' · ')]);
    if (tot.open) rows.push([f.sOpen, pbPlural(tot.open, f.sOpenV).replace('{n}', tot.open)]);
    var nf = tt.rows.filter(function (c) { return c.fit && c.mesh; }).length; if (nf) rows.push([f.fLines, pbPlural(nf, f.fLinesV).replace('{n}', nf)]); // Files → parts list (2026-11-10)
    return rows;
  }
  function bmSheet(tt) {
    var f = t().bm, rows = bmSheetRows(tt), on = tt.tot.types > 0, s = state.bm;
    return '<div class="pl-head"><span class="nk-label">' + esc(f.sheet) + '</span><span class="nk-label">NK-L · ' + esc(new Date().toISOString().slice(0, 10)) + '</span></div>' +
      (rows.length ? '<dl class="nk-specs bm-specs">' + rows.map(function (r) { return '<div><dt>' + esc(r[0]) + '</dt><dd>' + esc(r[1]) + (r[2] ? '<span class="bm-note">' + esc(r[2]) + '</span>' : '') + '</dd></div>'; }).join('') + '</dl>' : '<p class="hint st-hint">' + esc(f.sEmpty) + '</p>') +
      '<div class="cta-row st-act"><button type="button" class="nk-btn nk-btn--primary" data-bm-go' + (on ? '' : ' disabled') + '>' + esc(f.go) + '<span class="nk-btn__arrow" aria-hidden="true">→</span></button>' +
      '<button type="button" class="nk-btn" data-tl-print="parts"' + (on ? '' : ' disabled') + '>' + psIco() + ' ' + esc(t().tl.print) + '</button><button type="button" class="nk-btn nk-btn--ghost" data-bm-copy' + (on ? '' : ' disabled') + '>' + esc(f.copy) + '</button>' +
      (s.rows.length ? (s.ask ? '<span class="mn-ask">' + esc(f.clearAsk) + ' <button type="button" class="nk-btn nk-btn--sm nk-btn--primary" data-bm-clear="yes">' + esc(f.clearYes) + '</button> <button type="button" class="nk-btn nk-btn--sm" data-bm-clear="no">' + esc(f.clearNo) + '</button></span>' : '<button type="button" class="nk-btn nk-btn--ghost" data-bm-clear="ask">' + esc(f.clear) + '</button>') : '') + '</div>' +
      '<p class="share-msg" id="bm-msg" role="status" aria-live="polite">' + esc(s.msg) + '</p>' +
      '<p class="fit-note st-note">' + esc((PRICE && (SET.printing || {}).rateCm3h ? f.note.replace('{infill}', (SET.printing || {}).infill).replace('{walls}', (SET.printing || {}).walls) : f.noteNoPrice)) + '</p>';
  }
  function bmBox() {
    var f = t().bm, s = state.bm, tt = bmTotals(), mats = pcMats();
    var cell = function (i, k, label, inner) { return '<label class="bm-cell bm-' + k + '"><span class="bm-k"><span class="vh">' + esc(f.part.replace('{n}', i + 1)) + ' · </span>' + esc(label) + '</span>' + inner + '</label>'; };
    var num = function (i, k, label, attrs) { return cell(i, k, label, '<input class="nk-input" data-bm-f="' + k + '" data-bm-i="' + i + '" type="number" inputmode="decimal" min="0" ' + attrs + ' value="' + esc(s.rows[i][k]) + '">'); };
    var rows = s.rows.map(function (r, i) {
      return '<li class="bm-row" id="bm-row-' + i + '"><span class="bm-n nk-label" aria-hidden="true">' + String(i + 1).padStart(2, '0') + '</span>' +
        cell(i, 'name', f.name, '<input class="nk-input" data-bm-f="name" data-bm-i="' + i + '" type="text" maxlength="60" autocomplete="off" placeholder="' + esc(f.namePh.replace('{n}', i + 1)) + '" value="' + esc(r.name) + '">') +
        num(i, 'l', f.l + ' · mm', 'step="any"') + num(i, 'w', f.w + ' · mm', 'step="any"') + num(i, 'h', f.h + ' · mm', 'step="any"') +
        (mats.length ? cell(i, 'mat', f.mat, '<select class="nk-input" data-bm-f="mat" data-bm-i="' + i + '"><option value="">' + esc(f.matNone) + '</option>' + mats.map(function (m) { return '<option value="' + esc(m.key) + '"' + (r.mat === m.key ? ' selected' : '') + '>' + esc(m.name) + '</option>'; }).join('') + '</select>') : '') +
        num(i, 'qty', f.qty, 'step="1" inputmode="numeric" min="1"') +
        '<button type="button" class="bm-rm" data-bm-rm="' + i + '" aria-label="' + esc(f.remove.replace('{n}', i + 1)) + '" title="' + esc(f.removeT) + '"><span aria-hidden="true">×</span></button>' +
        '<p class="bm-line" id="bm-line-' + i + '">' + bmLine(tt.rows[i]) + '</p></li>';
    }).join('');
    var headRow = '<div class="bm-head' + (mats.length ? '' : ' bm-head--nomat') + '" aria-hidden="true"><span></span><span class="nk-label">' + esc(f.name) + '</span><span class="nk-label">' + esc(f.l) + ' · mm</span><span class="nk-label">' + esc(f.w) + ' · mm</span><span class="nk-label">' + esc(f.h) + ' · mm</span>' + (mats.length ? '<span class="nk-label">' + esc(f.mat) + '</span>' : '') + '<span class="nk-label">' + esc(f.qty) + '</span><span></span></div>';
    return '<section class="block bm">' + head(f.label, f.title, f.lead) + '<div class="bm-grid"><div class="bm-list' + (mats.length ? '' : ' bm-list--nomat') + '">' +
      (s.rows.length ? headRow + '<ol class="bm-rows">' + rows + '</ol>' : '<p class="hint bm-empty">' + esc(f.empty) + '</p>') +
      bmDrop() + // Files → parts list (2026-11-10)
      '<div class="bm-foot"><button type="button" class="nk-btn" data-bm-add' + (s.rows.length >= BM_MAX ? ' disabled' : '') + '>+ ' + esc(f.add) + '</button>' +
      '<label class="bm-gap"><span class="nk-field__label">' + esc(f.gap) + ' · mm</span><input class="nk-input" id="bm-gap" data-bm-gap type="number" inputmode="decimal" min="0" step="any" value="' + esc(s.gap) + '"></label></div>' +
      '<p class="fit-note bm-privacy">' + esc(f.privacy) + '</p></div>' +
      '<div class="pl-sheet bm-sheet" id="bm-sheet">' + bmSheet(tt) + '</div></div>' +
      '<div class="pn" id="bm-plates">' + pnInner(tt) + '</div></section>'; // Plate layout NK-N (2026-11-08)
  }
  function bmUpdate() { // a value changed: only the result lines and the sheet are redrawn (focus stays in the input)
    var tt = bmTotals();
    tt.rows.forEach(function (c, i) { var el = document.getElementById('bm-line-' + i); if (el) el.innerHTML = bmLine(c); });
    var sh = document.getElementById('bm-sheet'); if (sh) sh.innerHTML = bmSheet(tt);
    var pn = document.getElementById('bm-plates'); if (pn) pn.innerHTML = pnInner(tt); // Plate layout NK-N (2026-11-08)
  }
  function bmRefresh(focusSel) { // a line was added or removed: the whole tool is redrawn
    var sec = document.querySelector('.bm'); if (!sec) return;
    sec.outerHTML = tlWrap('parts', bmBox());
    if (focusSel) { var el = document.querySelector(focusSel); if (el) el.focus({ preventScroll: true }); }
    tlMark(state.tool);
  }
  function bmSet(i, k, v) { var r = state.bm.rows[i]; if (!r) return; r[k] = k === 'name' ? String(v).slice(0, 60) : String(v); if ((k === 'l' || k === 'w' || k === 'h') && r.file) { delete r.vol; delete r.area; delete r.file; } state.bm.msg = ''; bmSave(); bmUpdate(); } // a size typed over a file's line → back to the box (2026-11-10)
  function bmRemove(i) { state.bm.rows.splice(i, 1); state.bm.msg = ''; state.bm.ask = false; bmSave(); bmRefresh(state.bm.rows[i] ? '#bm-row-' + i + ' [data-bm-f="name"]' : '[data-bm-add]'); }
  function bmClear(a) { if (a === 'yes') { state.bm.rows = []; state.bm.msg = t().bm.cleared; bmSave(); } state.bm.ask = a === 'ask'; bmRefresh(a === 'ask' ? '[data-bm-clear="no"]' : a === 'yes' ? '[data-bm-add]' : '[data-bm-clear="ask"]'); }
  function bmText(tt) { // the list as plain text (clipboard, brief)
    var f = t().bm, n = 0, lines = [];
    state.bm.rows.forEach(function (r, i) { var c = tt.rows[i]; if (!c.fit) return; n++;
      lines.push(n + '. ' + (r.name.trim() ? r.name.trim() + ' — ' : '') + fitDims(c.d) + ' mm' + (c.mat ? ' · ' + c.mat.name : '') + ' · × ' + c.qty + ' · ' + bmBits(c).join(' · ')); });
    return lines.concat(bmSheetRows(tt).map(function (r) { return r[0] + ': ' + r[1] + (r[2] ? ' (' + r[2] + ')' : ''); }));
  }
  function bmCopy() {
    var tt = bmTotals(), msg = document.getElementById('bm-msg'), f = t().bm; if (!tt.tot.types || !msg) return;
    var txt = [f.sheet.toUpperCase() + ' NK-L — nacekepa.work', ''].concat(bmText(tt)).join('\n');
    var fail = function () { msg.textContent = f.copyFail; };
    try { navigator.clipboard.writeText(txt).then(function () { msg.textContent = f.copied; }, fail); } catch (e) { fail(); }
  }
  function bmToOrder() {
    var tt = bmTotals(), o = state.order, f = t().bm; if (!tt.tot.types) return;
    if (o.services.indexOf('print') < 0) o.services.push('print');
    o.qty = String(tt.tot.pcs);
    var keys = []; tt.rows.forEach(function (c) { if (c.fit && c.mat && keys.indexOf(c.mat.key) < 0) keys.push(c.mat.key); });
    var mm = keys.length === 1 ? MP_MATS.filter(function (v) { return v.id === keys[0]; })[0] : null; o.mat = mm ? mm.o : 0;
    var line = f.brief + ': ' + bmText(tt).join('; ') + '.';
    if (o.what.indexOf(f.brief + ':') < 0) o.what = o.what ? o.what + '\n' + line : line;
    else o.what = o.what.split('\n').map(function (l) { return l.indexOf(f.brief + ':') === 0 ? line : l; }).join('\n');
    state.step = 0; state.errors = {}; state.send = 'idle';
    location.hash = 'order';
  }
  function bmFitLink() { return '<p class="pl-open bm-open"><a href="#services?tool=parts" data-bm-fit>' + esc(t().bm.fitLink) + ' →</a></p>'; }
  // ---------- Files → parts list (2026-11-10): several STL / 3MF / OBJ files → one line per file ----------
  // The drop zone under the parts list takes any number of 3D files at once (choose or drop). Each is parsed in the browser
  // with the file check's readers (fcSTL / fcOBJ / fc3MF / fcStats) and becomes one line: name = file name, L × W × H = the
  // mesh's bounding box (mm; a 3MF brings its own unit, STL / OBJ are read as mm), quantity 1, and — for a closed mesh — the
  // mesh's own volume and surface (row.vol / row.area), which bmCalc() uses for weight, time and price instead of the box. The
  // line says "from the file · 12.3 cm³"; typing a size over it drops the file's numbers again. Files are read one after
  // another (a phone stays responsive), unreadable ones are listed as skipped (STEP / IGES, wrong type, over FC_MAX, empty,
  // damaged), the list stops at BM_MAX. Nothing is uploaded — like the file check. Self-contained: remove this block, bmDrop()
  // in bmBox(), the vol / area / file lines in bmNew() / bmCalc() / bmBits() / bmSet() / bmSheetRows(), the data-bm-files /
  // data-bm-drop lines in the change / dragover / dragleave / drop handlers, the f* + fromFile* + fLines* keys of bm: in both
  // languages in content.js and the "Files → parts list" rules in page.css.
  state.bmf = { busy: false, i: 0, n: 0 };
  function bmDrop() {
    var f = t().bm, b = state.bmf, full = state.bm.rows.length >= BM_MAX;
    return '<div class="bm-drop" id="bm-drop" data-bm-drop><p class="nk-label">' + esc(f.fLabel) + '</p>' +
      '<label class="bm-drop__zone" for="bm-files"><span class="bm-drop__t">' + esc(f.fPick) + '</span><span class="bm-drop__h">' + esc(f.fHint) + '</span>' +
      '<input class="bm-drop__file" id="bm-files" type="file" multiple accept=".stl,.obj,.3mf,model/stl,model/3mf,model/obj" data-bm-files' + (full || b.busy ? ' disabled' : '') + '></label>' +
      '<p class="bm-drop__msg share-msg" id="bm-fmsg" role="status" aria-live="polite">' + (b.busy ? esc(f.fBusy.replace('{i}', b.i).replace('{n}', b.n)) : '') + '</p>' +
      '<p class="fit-note bm-drop__note">' + esc(f.fPrivate) + ' ' + esc(f.fUnits) + '</p></div>';
  }
  function bmFiles(list) {
    var f = t().bm, files = Array.prototype.slice.call(list || []), b = state.bmf; if (!files.length || b.busy) return;
    b.busy = true; b.i = 0; b.n = files.length;
    var added = 0, skipped = [], msgEl = function () { return document.getElementById('bm-fmsg'); };
    var say = function (txt) { var m = msgEl(); if (m) m.textContent = txt; };
    var skip = function (file, why) { skipped.push(file.name + ' (' + why + ')'); };
    var one = function (file) { // → Promise, never rejects
      var ext = (/\.([a-z0-9]+)$/i.exec(file.name) || [])[1]; ext = ext ? ext.toLowerCase() : '';
      if (ext === 'step' || ext === 'stp' || ext === 'iges' || ext === 'igs') { skip(file, f.fStep); return Promise.resolve(); }
      if (ext !== 'stl' && ext !== 'obj' && ext !== '3mf') { skip(file, f.fType); return Promise.resolve(); }
      if (file.size > FC_MAX) { skip(file, f.fBig); return Promise.resolve(); }
      return (file.arrayBuffer ? file.arrayBuffer() : new Response(file).arrayBuffer()).then(function (buf) {
        if (ext === '3mf') return fc3MF(buf);
        return { pos: ext === 'stl' ? fcSTL(buf) : fcOBJ(buf), objects: 1, unit: '' };
      }).then(function (r) {
        var st = fcStats(r.pos); if (!st.ok) { skip(file, f.fEmpty); return; }
        var k = r.unit && FC_3MF_UNITS[r.unit] ? FC_3MF_UNITS[r.unit] : 1, closed = st.open === 0;
        var i = bmAdd({ name: file.name.replace(/\.[a-z0-9]+$/i, ''), l: fcR1(st.size[0] * k), w: fcR1(st.size[1] * k), h: fcR1(st.size[2] * k), qty: 1, vol: closed ? st.vol * k * k * k : 0, area: closed ? st.area * k * k : 0, file: file.name });
        if (i < 0) skip(file, f.fFull.replace('{n}', BM_MAX)); else added++;
      }).catch(function () { skip(file, f.fRead); });
    };
    var step = function (idx) {
      if (idx < files.length && state.bm.rows.length >= BM_MAX) { files.slice(idx).forEach(function (fl) { skip(fl, f.fFull.replace('{n}', BM_MAX)); }); idx = files.length; }
      if (idx >= files.length) {
        b.busy = false; state.bm.msg = '';
        bmRefresh('#bm-files');
        say((added ? pbPlural(added, f.fDone).replace('{n}', added) : f.fNone) + (skipped.length ? ' ' + f.fSkipped.replace('{list}', skipped.join(', ')) : ''));
        return;
      }
      b.i = idx + 1; say(f.fBusy.replace('{i}', b.i).replace('{n}', b.n));
      one(files[idx]).then(function () { setTimeout(function () { step(idx + 1); }, 0); });
    };
    step(0);
  }
  bmLoad();

  // ---------- Plate layout NK-N (#services?tool=parts, under the parts list; 2026-11-08) ----------
  // The whole order on the X2D plates at once: every piece of every part that fits (the footprint from the fit check's
  // orientation, turned by 90° where that helps) is packed with a maximal-rectangles layout (best short-side fit), plate after plate.
  // The result is the number of plates for the whole order (the per-line "up to N" counts each part type alone — mixing
  // usually needs fewer), one top-view drawing per plate with the line numbers in the pieces, a legend that says on which
  // plates each part lands, and the plates row on the NK-L sheet, in the copied text and in the brief. Only the visitor's
  // own sizes, the gap set under the list and BED (256 × 256 mm) are used; nothing is stored or sent. Over PN_MAX pieces
  // the layout is not drawn and the sheet keeps the per-type count. Self-contained: remove PN_MAX … pnInner(), the
  // `tt.pn = pnNest(tt)` line in bmTotals(), the pn branch in bmSheetRows(), the `<div class="pn" id="bm-plates">` in
  // bmBox(), the #bm-plates line in bmUpdate(), the data-pn-more line in the click handler, pn: in both languages in
  // content.js and the "Plate layout" rules at the end of page.css.
  var PN_MAX = 400, PN_DRAW = 8;
  state.pn = { all: false };
  function pnPieces(tt) { // every piece of every fitting line as { i, a, b } with a ≥ b — the footprint the fit check chose
    var out = [];
    tt.rows.forEach(function (c, i) {
      if (!c.fit || !c.fit.fits) return;
      var a = Math.max(c.fit.o[0], c.fit.o[1]), b = Math.min(c.fit.o[0], c.fit.o[1]);
      for (var k = 0; k < c.qty && out.length <= PN_MAX; k++) out.push({ i: i, a: a, b: b });
    });
    return out;
  }
  function pnPack(pieces, g) { // maximal-rectangles packing (best short-side fit, 90° turns allowed), plate after plate → [{ rects: [[x, y, w, h, line]], area }]
    // The gap is handled the usual way: the plate is W + g × H + g and every piece takes w + g × h + g, so neighbours are g apart and the last one still ends inside the plate.
    var W = BED[0] + g, H = BED[1] + g, plates = [];
    function fit(pl, p) { // the best free rectangle of this plate for the piece, as it is or turned
      var best = null;
      pl.free.forEach(function (f) {
        [[p.a + g, p.b + g], [p.b + g, p.a + g]].forEach(function (d) {
          if (d[0] > f.w || d[1] > f.h) return;
          var ss = Math.min(f.w - d[0], f.h - d[1]), ls = Math.max(f.w - d[0], f.h - d[1]);
          if (!best || ss < best.ss || (ss === best.ss && ls < best.ls)) best = { f: f, w: d[0], h: d[1], ss: ss, ls: ls };
        });
      });
      return best;
    }
    function place(pl, b, p) {
      var r = { x: b.f.x, y: b.f.y, w: b.w, h: b.h }, next = [];
      pl.free.forEach(function (f) { // split every free rectangle the piece overlaps into the parts left over
        if (r.x >= f.x + f.w || r.x + r.w <= f.x || r.y >= f.y + f.h || r.y + r.h <= f.y) { next.push(f); return; }
        if (r.x > f.x) next.push({ x: f.x, y: f.y, w: r.x - f.x, h: f.h });
        if (r.x + r.w < f.x + f.w) next.push({ x: r.x + r.w, y: f.y, w: f.x + f.w - r.x - r.w, h: f.h });
        if (r.y > f.y) next.push({ x: f.x, y: f.y, w: f.w, h: r.y - f.y });
        if (r.y + r.h < f.y + f.h) next.push({ x: f.x, y: r.y + r.h, w: f.w, h: f.y + f.h - r.y - r.h });
      });
      pl.free = next.filter(function (f, i) { // drop rectangles contained in another one
        return !next.some(function (o, j) { return j !== i && f.x >= o.x && f.y >= o.y && f.x + f.w <= o.x + o.w && f.y + f.h <= o.y + o.h && !(o.x === f.x && o.y === f.y && o.w === f.w && o.h === f.h && j < i); });
      });
      pl.rects.push([r.x, r.y, b.w - g, b.h - g, p.i]); pl.area += (b.w - g) * (b.h - g);
    }
    pieces.forEach(function (p) {
      for (var n = 0; n < plates.length; n++) { var b = fit(plates[n], p); if (b) { place(plates[n], b, p); return; } }
      var np = { free: [{ x: 0, y: 0, w: W, h: H }], rects: [], area: 0 }, nb = fit(np, p); if (!nb) return; // cannot happen: the fit check said the footprint fits
      place(np, nb, p); plates.push(np);
    });
    return plates;
  }
  function pnBest(pieces, g) { // two sort orders (area, longest side), the layout with fewer plates (then more plate used) wins
    var best = null;
    [function (p, q) { return q.a * q.b - p.a * p.b || q.a - p.a; }, function (p, q) { return q.a - p.a || q.b - p.b; }].forEach(function (cmp) {
      var pl = pnPack(pieces.slice().sort(cmp), g), used = pl.reduce(function (m, x) { return m + x.area; }, 0);
      if (!best || pl.length < best.plates.length || (pl.length === best.plates.length && used > best.used)) best = { plates: pl, used: used };
    });
    return best.plates;
  }
  function pnNest(tt) { // { plates: [...], n, pcs, perType, used, lines: { i: [first plate, last plate] } } · null while nothing fits · { tooMany: true } over PN_MAX pieces
    var pieces = pnPieces(tt); if (!pieces.length) return null;
    if (pieces.length > PN_MAX) return { tooMany: true, pcs: pieces.length };
    var g = pbNum(state.bm.gap); if (g < 0) g = 0;
    var plates = pnBest(pieces, g), lines = {}, used = 0;
    plates.forEach(function (pl, n) { used += pl.area / (BED[0] * BED[1]); pl.rects.forEach(function (r) { var l = lines[r[4]]; if (!l) lines[r[4]] = [n, n]; else l[1] = n; }); });
    return { plates: plates, n: plates.length, pcs: pieces.length, perType: tt.tot.plates, used: Math.round(used / plates.length * 100), lines: lines, g: g };
  }
  function pnSvg(pl, n) { // one plate, top view: 1 unit = 1 mm, 16 mm grid like the plate tool, pieces in red with their line number
    var W = BED[0], H = BED[1], f = t().pn, pcs = pl.rects.length, grid = '';
    for (var k = 16; k < W; k += 16) grid += 'M' + k + ' 0 V' + H + ' M0 ' + k + ' H' + W + ' ';
    return '<svg class="pb-svg pn-svg" viewBox="-4 -4 ' + (W + 8) + ' ' + (H + 8) + '" role="img" aria-label="' + esc(f.plate.replace('{n}', n + 1) + ' · ' + pbPlural(pcs, f.pcs).replace('{n}', pcs)) + '">' +
      '<path class="pb-grid" d="' + grid + '"/><rect class="ln pb-plate" x="0" y="0" width="' + W + '" height="' + H + '"/>' +
      pl.rects.map(function (r) {
        return '<rect class="fit-part" x="' + r[0] + '" y="' + r[1] + '" width="' + r[2] + '" height="' + r[3] + '"/>' +
          (Math.min(r[2], r[3]) >= 18 ? '<text class="pb-n pn-n" x="' + (r[0] + r[2] / 2) + '" y="' + (r[1] + r[3] / 2) + '" text-anchor="middle" dominant-baseline="central">' + String(r[4] + 1).padStart(2, '0') + '</text>' : '');
      }).join('') + '</svg>';
  }
  function pnInner(tt) { // the block under the parts list: summary, one drawing per plate, legend, note
    var f = t().pn, nest = tt.pn, head = '<div class="pl-head"><span class="nk-label">' + esc(f.label) + '</span><span class="nk-label">' + esc(f.code) + ' · ' + BED[0] + ' × ' + BED[1] + ' mm</span></div>';
    if (!nest) return head + '<p class="hint pn-empty">' + esc(f.empty) + '</p>';
    if (nest.tooMany) return head + '<p class="hint pn-empty">' + esc(f.tooMany.replace('{n}', PN_MAX)) + '</p>';
    var saved = nest.perType - nest.n, show = state.pn.all ? nest.plates : nest.plates.slice(0, PN_DRAW);
    var sum = '<p class="pn-sum"><span class="nk-tag nk-tag--ok">' + esc(pbPlural(nest.n, f.plates).replace('{n}', nest.n)) + '</span> <span>' + esc(f.mixed) + ' · ' +
      esc(saved > 0 ? pbPlural(saved, f.saves).replace('{n}', saved) : f.same) + ' · ' + esc(f.avg.replace('{p}', nest.used)) + '</span></p>';
    var plates = '<ol class="pn-plates">' + show.map(function (pl, n) {
      var pcs = pl.rects.length, used = Math.round(pl.area / (BED[0] * BED[1]) * 100);
      return '<li class="pn-plate"><figure class="pn-fig">' + pnSvg(pl, n) + '<figcaption class="nk-label">' + esc(f.plate.replace('{n}', n + 1)) + ' · ' + esc(pbPlural(pcs, f.pcs).replace('{n}', pcs)) + ' · ' + esc(f.used.replace('{p}', used)) + '</figcaption></figure></li>';
    }).join('') + '</ol>';
    var more = nest.n > PN_DRAW ? '<p class="pn-more"><button type="button" class="nk-btn nk-btn--sm" data-pn-more aria-expanded="' + state.pn.all + '">' + esc(state.pn.all ? f.less.replace('{n}', PN_DRAW) : f.more.replace('{n}', nest.n)) + '</button></p>' : '';
    var legend = '<p class="nk-label pn-legend-l">' + esc(f.legend) + '</p><ul class="pn-legend">' + state.bm.rows.map(function (r, i) {
      var l = nest.lines[i], c = tt.rows[i]; if (!l) return '';
      return '<li><b>' + String(i + 1).padStart(2, '0') + '</b> ' + esc((r.name.trim() ? r.name.trim() + ' · ' : '') + fitDims(c.fit.o) + ' mm · × ' + c.qty) + ' <span class="pn-on">' + esc(l[0] === l[1] ? f.onPlate.replace('{a}', l[0] + 1) : f.onPlates.replace('{a}', l[0] + 1).replace('{b}', l[1] + 1)) + '</span></li>';
    }).join('') + '</ul>';
    return head + sum + plates + more + legend + '<p class="fit-note pn-note">' + esc(f.note.replace('{g}', fitFmt(nest.g))) + '</p>';
  }
  function pnMore() { state.pn.all = !state.pn.all; var el = document.getElementById('bm-plates'); if (el) el.innerHTML = pnInner(bmTotals()); var b = document.querySelector('[data-pn-more]'); if (b) b.focus({ preventScroll: true }); }

  // ---------- Blog package (2026-11-02, big update part 5) ----------
  // blogYears(): a year strip on #news (chips, keyboard, aria-pressed) once there is more than one year or six posts;
  // blogMentions(n): projects whose title (EN or SL) appears in a post → sheet cards under the article; posts dated after the
  // build day are scheduled (NEWS skips them — the site rebuilds at least daily). Self-contained: remove blogYears() …
  // blogMentions(), the two calls in views.news / postView(), the data-blog-year line in the click handler, blog: in both
  // languages in content.js and the "Blog package" rules at the end of page.css.
  state.blogYear = '';
  function blogYearOf(n) { return String(n.date || '').slice(0, 4); }
  function blogYears() {
    var x = t().blog, years = [], counts = {};
    NEWS.forEach(function (n) { var y = blogYearOf(n); if (!counts[y]) { counts[y] = 0; years.push(y); } counts[y]++; });
    if (years.length < 2 && NEWS.length < 6) return '';
    years.sort().reverse();
    return '<div class="filters blog-years" role="group" aria-label="' + esc(x.years) + '"><button type="button" class="chip" data-blog-year="" aria-pressed="' + (!state.blogYear) + '">' + esc(x.all) + ' <span>' + NEWS.length + '</span></button>' +
      years.map(function (y) { return '<button type="button" class="chip" data-blog-year="' + y + '" aria-pressed="' + (state.blogYear === y) + '">' + y + ' <span>' + counts[y] + '</span></button>'; }).join('') + '</div>';
  }
  function blogList() { return state.blogYear ? NEWS.filter(function (n) { return blogYearOf(n) === state.blogYear; }) : NEWS; }
  function blogMentions(n) {
    var text = (' ' + [P(n, 'title'), P(n, 'summary'), P(n, 'body'), n.title && n.title.en, n.title && n.title.sl, n.body && n.body.en, n.body && n.body.sl].filter(Boolean).join(' ') + ' ').toLowerCase();
    var hits = PROJECTS.filter(function (p) {
      return ['en', 'sl'].some(function (l) { var tt = p.title && p.title[l] ? String(p.title[l]).trim().toLowerCase() : ''; if (tt.length < 4) return false; var i = text.indexOf(tt); if (i < 0) return false; var b = text[i - 1], a = text[i + tt.length]; return !/[a-z0-9čšž]/i.test(b || ' ') && !/[a-z0-9čšž]/i.test(a || ' '); });
    }).slice(0, 3);
    if (!hits.length) return '';
    return '<section class="block blog-mentions" aria-labelledby="blog-m"><h2 class="sub" id="blog-m">' + esc(t().blog.mentioned) + '</h2><div class="grid-4 sheets">' + hits.map(sheetH2).join('') + '</div></section>';
  }

  // ---------- Gift cards (#gift) + FAQ (2026-11-02, big update part 2) ----------
  // A gift card is a request, not a sale: the visitor picks an amount (settings.json gift.amounts / gift.min), names the
  // recipient and sends the request through the same Worker endpoint as a brief; Nace invoices by e-mail and issues the
  // code after payment. The live preview is the card itself (NK-G sheet) and prints on its own. The FAQ renders the
  // questions from settings.json as <details> on #services. Self-contained: remove GIFT … faqBox(), 'gift' in PAGES /
  // views, giftLink() calls, the data-gift-* lines in the click / input handlers, gift: + faq: + nav.gift in both languages
  // in content.js and the "Gift cards" / "FAQ" rules at the end of page.css.
  var GIFT = SET.gift && Array.isArray(SET.gift.amounts) && SET.gift.amounts.length ? SET.gift : null;
  state.gift = { amt: '', custom: '', to: '', from: '', msg: '', name: '', email: '', website: '', send: 'idle', errors: {} };
  function giftOn() { return !!GIFT; }
  function giftMin() { return +GIFT.min > 0 ? +GIFT.min : 1; }
  function giftAmount() { var g = state.gift; if (g.amt === 'custom') { var n = qcNum(g.custom); return n >= giftMin() ? Math.round(n) : 0; } return +g.amt > 0 ? +g.amt : 0; }
  function giftValidate() {
    var g = state.gift, e = {};
    if (!giftAmount()) e.amt = 1;
    if (!g.name.trim()) e.name = 1;
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(g.email)) e.email = 1;
    g.errors = e; return !Object.keys(e).length;
  }
  function giftText() {
    var g = state.gift, x = t().gift, a = giftAmount();
    return [x.brief.toUpperCase() + ' — nacekepa.work', '', x.amount + ': ' + (a ? pcMoney(a) : '—'), x.to + ': ' + (g.to || '—'), x.from + ': ' + (g.from || '—'), g.msg ? x.msg + ': ' + g.msg : '', '', x.name + ': ' + g.name, x.email + ': ' + g.email].filter(function (l, i, arr) { return l !== '' || arr[i - 1] !== ''; }).join('\n').trim();
  }
  function giftCard(forPrint) { // the card as an NK-G sheet (live preview + print)
    var g = state.gift, x = t().gift, a = giftAmount(), d = new Date(), iso = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    return '<div class="gift-card' + (forPrint ? ' gift-card--print' : '') + '" id="' + (forPrint ? 'gift-print' : 'gift-card') + '"' + (forPrint ? ' aria-hidden="true"' : ' role="img" aria-label="' + esc(x.preview) + '"') + '>' +
      '<div class="gift-card__top">' + logo() + '<span class="wm-text">nacekepa<span>.work</span></span><span class="nk-label">NK-G · ' + esc(fmtDate(iso)) + '</span></div>' +
      '<p class="gift-card__kind">' + esc(x.card) + '</p>' +
      '<p class="gift-card__amt">' + esc(a ? pcMoney(a) : '— €') + '</p>' +
      '<dl class="gift-card__rows"><div><dt>' + esc(x.cardFor) + '</dt><dd>' + esc(g.to || '…') + '</dd></div><div><dt>' + esc(x.cardFrom) + '</dt><dd>' + esc(g.from || '…') + '</dd></div>' +
      (g.msg ? '<div class="gift-card__msg"><dt>' + esc(x.msg.replace(/ \(.*\)$/, '')) + '</dt><dd>' + esc(g.msg) + '</dd></div>' : '') +
      '<div><dt>' + esc(x.cardCode) + '</dt><dd class="gift-card__code">NK-G-______ <span>' + esc(x.cardCodeHint) + '</span></dd></div></dl>' +
      '<p class="gift-card__foot">' + esc(+GIFT.validMonths > 0 ? x.cardValid.replace('{n}', GIFT.validMonths) + ' · ' : '') + esc(x.cardUse) + '</p></div>';
  }
  function giftView() {
    var g = state.gift, x = t().gift, e = g.errors, a = giftAmount(), sent = g.send === 'sent';
    var amts = GIFT.amounts.map(function (n) { return '<button type="button" class="pb-lay gift-amt" data-gift-amt="' + n + '" aria-pressed="' + (String(g.amt) === String(n)) + '"><b>' + esc(pcMoney(n)) + '</b></button>'; }).join('') +
      '<button type="button" class="pb-lay gift-amt" data-gift-amt="custom" aria-pressed="' + (g.amt === 'custom') + '"><span class="nk-label">' + esc(x.custom) + '</span><b>' + esc(g.amt === 'custom' && a ? pcMoney(a) : '…') + '</b></button>';
    var fieldG = function (k, label, ctl, hint, err) { return '<div class="nk-field' + (err ? ' nk-field--error' : '') + '"><label class="nk-field__label" for="gift-' + k + '">' + esc(label) + '</label>' + ctl.replace('<input ', '<input id="gift-' + k + '" ' + (hint || err ? 'aria-describedby="gift-' + k + '-h" ' : '') + (err ? 'aria-invalid="true" ' : '')).replace('<textarea ', '<textarea id="gift-' + k + '" ') + (hint || err ? '<span class="nk-field__hint" id="gift-' + k + '-h">' + esc(err || hint) + '</span>' : '') + '</div>'; };
    var form = '<div class="fit-form gift-form"><p class="nk-label">' + esc(x.amount) + '</p><div class="pb-lays gift-amts" role="group" aria-label="' + esc(x.amount) + '">' + amts + '</div>' +
      (g.amt === 'custom' ? fieldG('custom', x.custom + ' · €', '<input class="nk-input" data-gift-f="custom" type="number" inputmode="numeric" min="' + giftMin() + '" step="1" value="' + esc(g.custom) + '">', x.customH.replace('{n}', giftMin()), e.amt ? x.errAmt.replace('{n}', giftMin()) : '') : (e.amt ? '<p class="err" role="alert">' + esc(x.errAmt.replace('{n}', giftMin())) + '</p>' : '')) +
      '<div class="form">' + fieldG('to', x.to, '<input class="nk-input" data-gift-f="to" autocomplete="off" value="' + esc(g.to) + '">') + fieldG('from', x.from, '<input class="nk-input" data-gift-f="from" autocomplete="off" value="' + esc(g.from) + '">') +
      '<div class="full">' + fieldG('msg', x.msg, '<textarea class="nk-input" data-gift-f="msg" rows="2" maxlength="160">' + esc(g.msg) + '</textarea>') + '</div></div>' +
      '<p class="nk-label">' + esc(x.you) + '</p><div class="form">' + fieldG('name', x.name, '<input class="nk-input" data-gift-f="name" autocomplete="name" value="' + esc(g.name) + '">', '', e.name ? x.errName : '') + fieldG('email', x.email, '<input class="nk-input" data-gift-f="email" type="email" autocomplete="email" autocapitalize="off" spellcheck="false" value="' + esc(g.email) + '">', x.emailH, e.email ? x.errEmail : '') + '</div>' +
      '<div class="hp" aria-hidden="true"><label for="gift-website">Website</label><input id="gift-website" data-gift-f="website" tabindex="-1" autocomplete="off"></div>' +
      (g.send === 'error' ? '<p class="err" role="alert">' + esc(x.fail) + '</p><pre class="brief" tabindex="0">' + esc(giftText()) + '</pre><div class="cta-row"><button type="button" class="nk-btn" data-gift-copy>' + esc(x.copy) + '</button>' + (CONTACT_EMAIL ? '<a class="nk-btn" href="mailto:' + esc(CONTACT_EMAIL) + '?subject=' + esc(encodeURIComponent(x.brief)) + '&amp;body=' + esc(encodeURIComponent(giftText())) + '">' + esc(x.mail) + '</a>' : '') + '<span class="copy-msg" id="gift-msg" role="status"></span></div>' : '') +
      '<div class="cta-row"><button type="button" class="nk-btn nk-btn--primary nk-btn--lg" data-gift-send' + (g.send === 'sending' ? ' disabled' : '') + '>' + esc(g.send === 'sending' ? x.sending : x.send) + '<span class="nk-btn__arrow" aria-hidden="true">→</span></button><button type="button" class="nk-btn" data-gift-print>' + esc(x.print) + '</button></div>' +
      '<p class="fit-note">' + esc(L(GIFT.note) || '') + (PRICE && L(PRICE.vatNote) ? ' ' + esc(L(PRICE.vatNote)) : '') + '</p></div>';
    var done = '<div class="fit-form gift-form"><div class="sent" role="status"><span class="nk-tag nk-tag--ok">' + esc(x.sent) + '</span><p class="hint">' + esc(x.sentBody.replace('{c}', CODE)) + '</p></div><pre class="brief" tabindex="0">' + esc(giftText()) + '</pre><div class="cta-row"><button type="button" class="nk-btn" data-gift-print>' + esc(x.print) + '</button><button type="button" class="nk-btn" data-gift-reset>' + esc(x.another) + '</button></div></div>';
    return '<section class="block first gift-page"><a class="back" href="' + (PRICE_LIST ? '#services?tool=prices' : '#services') + '">← ' + esc(PRICE_LIST ? t().pc.title : t().nav.services) + '</a>' + head(x.label, x.title, x.lead, true) +
      '<div class="fit-grid gift-grid">' + (sent ? done : form) + '<div class="gift-side"><p class="nk-label">' + esc(x.preview) + '</p>' + giftCard(false) +
      '<p class="nk-label gift-how">' + esc(x.how) + '</p><ol class="gift-steps">' + [x.how1, x.how2, x.how3, x.how4].map(function (h) { return '<li>' + esc(h) + '</li>'; }).join('') + '</ol></div></div>' + giftCard(true) + '</section>' + ctaBand();
  }
  function giftRefresh() { var c = document.getElementById('gift-card'), p = document.getElementById('gift-print'); if (c) c.outerHTML = giftCard(false); if (p) p.outerHTML = giftCard(true); }
  function giftSend() {
    var g = state.gift, x = t().gift;
    if (!giftValidate()) { render(true); var f = document.querySelector('.gift-form [aria-invalid="true"], .gift-form .err'); if (f) (f.focus ? f : f).focus && f.focus(); return; }
    if (!ORDER_ENDPOINT) { g.send = 'error'; render(true); return; }
    if (g.send === 'sending') return;
    g.send = 'sending'; render(true);
    var payload = JSON.stringify({ code: CODE, subject: (lang === 'sl' ? 'Darilni bon' : 'Gift card') + ' ' + pcMoney(giftAmount()) + ' — ' + g.name, summary: 'Tracking code: ' + CODE + '\n\n' + giftText(), contact: g.email, lang: lang, attachments: [], website: g.website || '' });
    var url = ORDER_ENDPOINT.replace(/\/+$/, '') + '/';
    var post = function (type) { return fetch(url, { method: 'POST', mode: 'cors', credentials: 'omit', referrerPolicy: 'origin', cache: 'no-store', headers: { 'content-type': type }, body: payload }); };
    post('text/plain;charset=UTF-8')
      .then(function (r) { return r.status === 415 ? post('application/json') : r; }, function () { return post('application/json'); })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return r.ok && j.ok !== false; }); })
      .then(function (ok) { g.send = ok ? 'sent' : 'error'; render(true); }, function () { g.send = 'error'; render(true); });
  }
  function giftCopy() { var msg = document.getElementById('gift-msg'), x = t().gift; if (!msg) return; var fail = function () { msg.textContent = t().share.copyFail; }; try { navigator.clipboard.writeText(giftText()).then(function () { msg.textContent = x.copied; }, fail); } catch (e) { fail(); } }
  function giftLink(cls) { return giftOn() ? '<a class="' + (cls || 'pl-open') + '" href="#gift">' + esc(t().gift.link) + ' →</a>' : ''; }
  function faqBox() {
    var list = (SET.faq || []).filter(function (f) { return f && f.q && L(f.q) && f.a && L(f.a); }), x = t().faq;
    if (!list.length) return '';
    return '<section class="block faq" id="faq" aria-labelledby="faq-h"><header class="sec-head"><div><p class="nk-label">' + esc(x.label) + ' · ' + list.length + '</p><h2 class="sec-title" id="faq-h">' + esc(x.title) + '</h2></div><p class="lead">' + esc(x.lead) + '</p></header>' +
      '<div class="faq-list">' + list.map(function (f, i) { return '<details class="faq-item"' + (i === 0 ? ' open' : '') + '><summary>' + esc(L(f.q)) + '</summary><div class="faq-a">' + L(f.a).split(/\n{2,}/).map(function (par) { return '<p>' + esc(par) + '</p>'; }).join('') + '</div></details>'; }).join('') + '</div></section>';
  }

  // ---------- Tools on #services: index of the five tools, deep links #services?tool=plan|fit|file|material|prep ----------
  // Added 2026-10-29 (#services tools package). Only links and scrolling; the tools themselves are unchanged.
  // To remove: TL_TOOLS … tlGo(), the tlIndex() / tlWrap() calls in views.services, tlHome() in views.home, the state.tool
  // line in page(), the tlGo line in render(), tl: in both languages in content.js and the "Tools index" rules in page.css.
  var TL_TOOLS = [['plan', 'pl', 'plan'], ['fit', 'fit', 'fit'], ['file', 'fc', 'file-check'], ['material', 'mp', 'material'], ['prep', 'prep', 'prep'], ['plate', 'pb', 'plate']].concat(pcOn() ? (PRICE_LIST ? [['prices', 'pc', 'prices']] : []).concat([['quote', 'qc', 'quote']]) : []).concat([['parts', 'bm', 'parts']]).concat(srOn() ? [['series', 'sr', 'series']] : []).concat(bgOn() ? [['budget', 'bg', 'budget']] : []).concat(mxOn() ? [['matprice', 'mx', 'matprice']] : []).concat(scOn() ? [['schedule', 'sc', 'schedule']] : []); // 'schedule': Schedule NK-T (2026-11-18), only with a published turnaround // // 'matprice': Material price NK-V (2026-11-17, second run), only with two or more priced materials // 'budget': Budget NK-B (2026-11-17), only with a price list // // 'series': Series price NK-R (2026-11-15), only with print prices // 'parts': the parts list NK-L (2026-11-05) // [link name, content key, section id]; the two pricing tools only with a price list in settings.json
  function tlHash(k) { return '#services?tool=' + k; }
  function tlNo(i) { return 'T-' + String(i).padStart(2, '0'); } // T-01 … T-13 (two digits from the tenth tool on)
  function tlIndex() {
    var x = t().tl;
    var n = TL_TOOLS.length + 1; // the tools on this page + the Part studio
    return '<section class="block tl" id="tools" aria-labelledby="tl-h"><div class="tl-head"><p class="nk-label">' + esc(x.label.replace('{n}', tlNo(n))) + '</p><h2 class="sub" id="tl-h" tabindex="-1">' + esc(x.title) + '</h2><p class="tl-lead">' + esc(x.lead.replace('{n}', n).replace('{m}', n - 1)) + '</p></div>' +
      '<ol class="tl-list">' + TL_TOOLS.map(function (d, i) {
        return '<li><a class="tl-item" href="' + tlHash(d[0]) + '"><span class="nk-label">' + tlNo(i + 1) + '</span><span class="tl-t">' + esc(t()[d[1]].title) + '</span><span class="tl-d">' + esc(x[d[0]]) + '</span><span class="tl-go" aria-hidden="true">↓</span></a></li>';
      }).join('') + '<li><a class="tl-item tl-item--st" href="#studio"><span class="nk-label">' + tlNo(TL_TOOLS.length + 1) + '</span><span class="tl-t">' + esc(t().st.label.split(' · ')[0]) + '</span><span class="tl-d">' + esc(t().st.tlLine) + '</span><span class="tl-go" aria-hidden="true">→</span></a></li></ol><p class="tl-all"><button type="button" class="tb-copy" data-tl-all>' + esc(tlAllOpen() ? x.foldNone : x.foldAll) + '</button></p></section>';
  }
  function tlWrap(k, html) { // gives the tool section its id + a T-0N tag and ends it with "↑ All tools"
    var d = TL_TOOLS.filter(function (v) { return v[0] === k; })[0], n = TL_TOOLS.indexOf(d) + 1;
    html = html.replace(/^<section class="block ([a-z-]+)"(?: id="[^"]*")?/, '<section class="block $1 tl-tool' + (state.tool === k ? ' tl-on' : '') + (tlIsOpen(k) ? '' : ' tl-fold') + '" id="' + d[2] + '" data-tl="' + tlNo(n) + '"'); // tl-on: the tool the address names — the one that prints alone (Print package, 2026-11-02, evening run)
    html = html.replace('</header>', '</header>' + tlFoldRow(k)); // Services on the phone (2026-11-20): the "Open the tool" row under the tool's heading
    // SEO package (2026-11-02): every tool has a shareable address (https://nacekepa.work/#services?tool=<name>); the footer copies it.
    return html.replace(/<\/section>$/, '<p class="tl-back"><a href="#services?tool=index">↑ ' + esc(t().tl.back) + '</a><span aria-hidden="true"> · </span><button type="button" class="tb-copy" data-tl-k="' + k + '" data-tl-copy="' + esc(tlUrl(k)) + '">' + esc(t().tl.copy) + '</button><span aria-hidden="true"> · </span><button type="button" class="tb-copy" data-tl-print="' + k + '">' + esc(t().tl.print) + '</button><span class="tl-msg" role="status" aria-live="polite"></span></p>' +
      '<div class="print-only print-url tl-print" data-tl-foot="' + k + '">' + tlFoot(k) + '</div></section>'); // print-only footer line of a tool printed alone (Print package)
  }
  // Services on the phone (2026-11-20): on screens up to 720 px every tool on #services starts folded — its number, title and
  // lead stay, the tool itself opens with "Open the tool" (or from the index, a tool link, Find anything, a hand-off). The page
  // was 27 000 px long on a phone; the process steps, the FAQ and "Start a project" came after fourteen open tools. Wider
  // screens and print are unchanged: the `tl-fold` class only has rules inside `@media screen and (max-width: 720px)`.
  // To remove: tlOpen … tlAllFresh(), the tl-fold / tlFoldRow() parts of tlWrap(), the tl-all line in tlIndex(), the
  // tlSetFold() calls (tlGo, fit check, prep, render), the data-tl-fold / data-tl-all click lines, tl.fold… in content.js
  // and the "Services on the phone" rules in page.css.
  var tlOpen = {};
  function tlIsOpen(k) { return k in tlOpen ? tlOpen[k] : state.tool === k; }
  function tlFoldRow(k) { var on = tlIsOpen(k); return '<p class="tl-foldrow"><button type="button" class="nk-btn nk-btn--sm tl-foldbtn" data-tl-fold="' + k + '" aria-expanded="' + on + '">' + esc(on ? t().tl.foldClose : t().tl.foldOpen) + '</button></p>'; }
  function tlSetFold(k, open) {
    var d = TL_TOOLS.filter(function (v) { return v[0] === k; })[0]; if (!d) return;
    tlOpen[k] = !!open;
    var sec = document.getElementById(d[2]); if (!sec) return;
    sec.classList.toggle('tl-fold', !open);
    var b = sec.querySelector('[data-tl-fold]'); if (b) { b.setAttribute('aria-expanded', !!open); b.textContent = open ? t().tl.foldClose : t().tl.foldOpen; }
    tlAllFresh();
  }
  function tlAllOpen() { return TL_TOOLS.every(function (d) { return tlIsOpen(d[0]); }); }
  function tlAllFresh() { var b = document.querySelector('[data-tl-all]'); if (b) b.textContent = tlAllOpen() ? t().tl.foldNone : t().tl.foldAll; }
  function tlAll() { var open = !tlAllOpen(); TL_TOOLS.forEach(function (d) { tlSetFold(d[0], open); }); }
  function tlFoot(k) { // the printed footer line + QR: the address with what is typed into the tool, when there is something (Calculation links, part 2, 2026-11-18)
    var calc = clUrl(k), url = calc || tlUrl(k);
    return '<span>' + esc(t().tl.printed) + '</span> ' + esc(url) + ' · ' + esc(new Date().toISOString().slice(0, 10)) + qrBox(url, calc ? t().tl.scanCalc : t().qr.scanTool, { px: calc ? 88 : 72, cls: 'print-qr' });
  }
  function tlFootFresh() { Array.prototype.forEach.call(document.querySelectorAll('[data-tl-foot]'), function (el) { el.innerHTML = tlFoot(el.getAttribute('data-tl-foot')); }); }
  function tlUrl(k) { return 'https://nacekepa.work/' + (lang === 'sl' ? 'sl/' : '') + tlHash(k); }
  function tlCopy(btn) {
    var calc = clUrl(btn.getAttribute('data-tl-k')), url = calc || btn.getAttribute('data-tl-copy'), msg = btn.parentNode.querySelector('.tl-msg'), x = t().tl; // msg: the status line of the row (was the aria-hidden separator after the button, fixed 2026-11-17) // calc: the address with the typed numbers (Calculation links, 2026-11-17)
    var fail = function () { if (msg) msg.textContent = x.copyFail; };
    try { navigator.clipboard.writeText(url).then(function () { if (msg) msg.textContent = calc ? x.copiedCalc : x.copied; }, fail); } catch (e) { fail(); }
  }
  // Print package (2026-11-02, evening run): a tool prints on its own — from its address (#services?tool=<name>, Ctrl+P) or
  // its "Print this tool" button — with the tool's address and the date as a footer line (`.tl-print`, print only). tlMark(k)
  // puts data-tool on <html> and `tl-on` on that section; the "Print package" rules in page.css hide everything else.
  // To remove: tlMark() / tlPrint(), the tlMark() line in render(), the tl-on / tl-print parts of tlWrap(), the data-tl-print
  // buttons (price list, quote tool), the data-tl-print handler line, tl.print… in content.js and the CSS rules.
  function tlMark(k) {
    var on = k && k !== 'index' ? k : '';
    if (on) document.documentElement.setAttribute('data-tool', on); else document.documentElement.removeAttribute('data-tool');
    var d = TL_TOOLS.filter(function (v) { return v[0] === on; })[0];
    Array.prototype.forEach.call(document.querySelectorAll('.tl-tool'), function (sec) { sec.classList.toggle('tl-on', !!d && sec.id === d[2]); });
  }
  function tlPrint(k) {
    tlMark(k);
    var back = function () { tlMark(page() === 'services' ? state.tool : ''); };
    window.addEventListener('afterprint', back, { once: true });
    tlFootFresh();
    printSheet();
    setTimeout(function () { document.addEventListener('click', back, { once: true }); document.addEventListener('keydown', back, { once: true }); }, 0);
  }
  function tlHome() {
    var x = t().tl;
    return '<p class="tl-home"><span class="nk-label">' + esc(x.home) + '</span>' + TL_TOOLS.slice(0, 4).map(function (d) { return '<a href="' + tlHash(d[0]) + '">' + esc(t()[d[1]].title) + '</a>'; }).concat(['<a href="#studio"><b>' + esc(t().st.label.split(' · ')[0]) + '</b></a>']).join('<span aria-hidden="true"> · </span>') + '</p>';
  }
  function tlGo(k) {
    var d = TL_TOOLS.filter(function (v) { return v[0] === k; })[0], el = document.getElementById(d ? d[2] : 'tools');
    if (!el) return;
    if (d) tlSetFold(k, true); // Services on the phone (2026-11-20): a tool that is asked for is open
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
    return head + when + '<ul class="dl-rows">' + rows + '</ul>' + legend + '<p class="dl-note">' + esc(x.note) + '</p>' + dlScLink(); // dlScLink: Schedule NK-T (2026-11-18)
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
  // ---------- Enquiry package (2026-11-04): fewer steps between the brief and a reply ----------
  // Step 3 gets an optional phone number and "How should I reply?" (e-mail / phone call — a phone call needs the number);
  // both go into the brief, the printable brief and the saved draft. Step 4 gets "Open in your e-mail app" (the brief as the
  // body of a mailto: to the studio) next to Copy. The footer title block gets "Save my contact" (.vcf, QR package) on every
  // page. Ticking "STL / STEP / 3MF file" in the step-2 checklist pre-selects "Do you have files? → STL / STEP / 3MF" while it
  // is still on "No". Remove: eqReply() / eqMail() / eqPhoneOk(), the phone / reply lines in orderView() step 2, briefText(),
  // bpSheet(), validate(), drSave() / drLoad() / DR_FIELDS and the two state.order literals, the eqMail() call in step 4,
  // the data-qr-vcf cell in the footer, the eqFiles() line in the change handler, eq: in both languages in content.js.
  function eqReply() { return +state.order.reply === 1 ? t().eq.replyO[1] : t().eq.replyO[0]; }
  function eqPhoneOk(v) { return !String(v || '').trim() || /^[+\d][\d\s().\/-]{5,}$/.test(String(v).trim()); }
  function eqMail() { // step 4: the brief as an e-mail to the studio
    if (!CONTACT_EMAIL) return '';
    var x = t(), subj = bfSubject(); // Brief readability package (2026-11-08): services in the subject, like the Worker's e-mail
    return '<a class="nk-btn" id="eq-mail" href="mailto:' + esc(CONTACT_EMAIL) + '?subject=' + esc(encodeURIComponent(subj)) + '&amp;body=' + esc(encodeURIComponent(briefText() + (yfOn() ? '\n\n' + x.yf.mailLine : '') + '\n')) + '">' + esc(x.eq.mail) + '</a>'; // the files reminder: Your files (2026-11-10)
  }
  // ---------- Your files (2026-11-10): how the client's 3D files reach the studio ----------
  // The order form sends text only (Nace's choice: no upload with the brief), so a client who answered "STL / STEP / 3MF" or
  // "Native CAD" to "Do you have files?" — or whose brief carries a parts list / file check built from files — is told where
  // the files go: a hint under that field on step 2, a "Your files" box on step 4 (attach them to the e-mail with the brief;
  // the "Open in your e-mail app" body ends with a reminder line) and, once the brief is sent through the Worker, the same box
  // with the tracking code and a "Send the files by e-mail" button whose subject carries the code, so the files land next to
  // the brief. File names the brief already mentions (parts list lines read from files, the file check) are listed.
  // Self-contained: remove yfOn() … yfBox(), the three yfBox / yf.hint / yf.mailLine call sites above, yf: in both languages
  // in content.js and the "Your files" rules in page.css.
  function yfNames() {
    var o = state.order, x = t(), n = [];
    if ((o.what || '').indexOf(x.bm.brief + ':') >= 0) state.bm.rows.forEach(function (r) { if (r.file && n.indexOf(r.file) < 0) n.push(r.file); });
    if ((o.what || '').indexOf(x.fc.brief + ':') >= 0 && state.fc.res && state.fc.res.name && n.indexOf(state.fc.res.name) < 0) n.push(state.fc.res.name);
    return n;
  }
  function yfOn() { return +state.order.files >= 2 || yfNames().length > 0; }
  function yfBox(sent) {
    if (!yfOn()) return '';
    var f = t().yf, o = state.order, names = yfNames(), mail = '';
    if (sent && CONTACT_EMAIL) {
      var svc = SERVICES.filter(function (s) { return o.services.indexOf(s.key) >= 0; }).map(function (s) { return L(s.title); }).join(', ');
      mail = '<div class="cta-row"><a class="nk-btn nk-btn--sm" href="mailto:' + esc(CONTACT_EMAIL) + '?subject=' + esc(encodeURIComponent(f.mailSubj.replace('{c}', CODE).replace('{n}', String(o.name || '').trim()))) + '&amp;body=' + esc(encodeURIComponent(f.mailBody.replace('{c}', CODE).replace('{s}', svc) + '\n\n' + String(o.name || '').trim() + '\n')) + '">' + esc(f.mail) + '</a></div>';
    }
    return '<div class="yf" id="yf"><p class="nk-label">' + esc(f.label) + '</p><p>' + esc(sent ? f.sent.replace('{c}', CODE) : f.brief) + '</p>' +
      (names.length ? '<p class="yf-names">' + esc(f.named.replace('{list}', names.join(', '))) + '</p>' : '') + mail + '</div>';
  }
  function eqFiles(el) { // checklist "STL / STEP / 3MF file" ticked → "Do you have files?" jumps to that option while it still says "No"
    var it = ocItems()[+el.getAttribute('data-oc-have')], sel = document.getElementById('f-files'); if (!it || !el.checked || !sel || +sel.value !== 0) return;
    if (/STL \/ STEP \/ 3MF/.test(it.id)) { sel.value = '2'; state.order.files = 2; }
  }
  // ---------- Review package (2026-11-05): "What you're sending" on step 3 + "Send a copy to myself" on step 4 ----------
  // Step 3 (Contact) is the last step before "Send project", so it ends with a review of steps 1–2 — one row per answer with
  // "Edit" that jumps back to that step and field (rvGo) and "optional" marks on empty deadline / files / material. Step 4
  // (sent or fallback) gets a mailto: to the client's own address with the brief as the body. To remove: rvRows() … rvSelf(),
  // the rvBox() / rvSelf() calls in orderView(), the data-rv-go line in the click handler, rv: in both languages in content.js
  // and the "Review package" rules in page.css.
  function rvRows() { // [[label, value, step, field id, optional?]]
    var o = state.order, x = t();
    var svc = SERVICES.filter(function (s) { return o.services.indexOf(s.key) >= 0; });
    return [[x.steps[0], svc.map(function (s) { return L(s.title); }).join(', '), 0, svc.length ? 'svc-' + svc[0].key : 'svc-' + SERVICES[0].key],
      [x.fWhat, bfWhat().trim(), 1, 'f-what'] /* Brief readability package (2026-11-08): tool lines as lists */, [x.fQty, o.qty, 1, 'f-qty'], [x.fDeadline, o.deadline ? fmtDate(o.deadline) : '', 1, 'f-deadline', true],
      [x.fFiles, +o.files ? x.fFilesO[o.files] : '', 1, 'f-files', true], [x.fMat, +o.mat ? x.fMatO[o.mat] : '', 1, 'f-mat', true]]
      .concat(ocRows().map(function (r) { return [r[0].replace(/:$/, ''), r[1], 1, 'oc']; }));
  }
  function rvBox() {
    var r = t().rv;
    return '<section class="rv" aria-labelledby="rv-h"><p class="nk-label" id="rv-h">' + esc(r.title) + '</p><p class="hint rv-lead">' + esc(r.lead) + '</p><dl class="nk-specs rv-rows">' + rvRows().map(function (w) {
      return '<div><dt>' + esc(w[0]) + '</dt><dd>' + (w[1] ? '<span class="rv-v">' + esc(w[1]) + '</span>' : '<span class="rv-opt">' + esc(w[4] ? r.opt : '—') + '</span>') + ' <button type="button" class="pl-link rv-go" data-rv-go="' + w[2] + ':' + esc(w[3]) + '" aria-label="' + esc((w[1] ? r.edit : r.add) + ': ' + w[0]) + '">' + esc(w[1] ? r.edit : r.add) + '</button></dd></div>';
    }).join('') + '</dl></section>';
  }
  function rvGo(v) { // "Edit" on the review: back to that step, cursor in that field
    var m = /^(\d):(.*)$/.exec(v || ''); if (!m) return;
    readForm(); state.errors = {}; state.send = 'idle'; state.step = +m[1]; render(true);
    var el = m[2] === 'oc' ? document.querySelector('[data-oc-have]') : document.getElementById(m[2]); if (el) { el.focus({ preventScroll: true }); el.scrollIntoView({ block: 'center' }); } else wizFocus(true);
  }
  function rvSelf() { // step 4: the brief to the client's own address
    var o = state.order, r = t().rv; if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(o.email)) return '';
    return '<p class="rv-self"><a class="nk-btn nk-btn--sm" id="rv-self" href="mailto:' + esc(encodeURIComponent(o.email).replace(/%40/g, '@')) + '?subject=' + esc(encodeURIComponent(r.selfSubj)) + '&amp;body=' + esc(encodeURIComponent(briefText() + '\n')) + '">' + esc(r.self) + '</a> <span class="hint">' + esc(r.selfH) + '</span></p>';
  }
  function field(k, label, ctl, hint, err, full) {
    var attrs = (hint ? ' aria-describedby="f-' + k + '-h"' : '') + (err ? ' aria-invalid="true"' : '') + (REQUIRED[k] ? ' aria-required="true"' : '');
    ctl = ctl.replace('id="f-' + k + '"', 'id="f-' + k + '"' + attrs);
    return '<div class="nk-field' + (err ? ' nk-field--error' : '') + (full ? ' full' : '') + '"><label class="nk-field__label" for="f-' + k + '">' + esc(label) + '</label>' + ctl + (hint ? '<span class="nk-field__hint" id="f-' + k + '-h">' + esc(hint) + '</span>' : '') + '</div>';
  }
  function select(k, opts, v) { return '<select class="nk-input" id="f-' + k + '" data-f="' + k + '">' + opts.map(function (o, i) { return '<option value="' + i + '"' + (+v === i ? ' selected' : '') + '>' + esc(o) + '</option>'; }).join('') + '</select>'; }
  function estimate() {
    var o = state.order, x = t(), rows = [];
    SERVICES.forEach(function (s) { if (o.services.indexOf(s.key) >= 0) rows.push([L(s.title), s.time ? L(s.time) : x.onRequest]); });
    var pm = promo(); if (pm) rows.push([t().promo.label, L(pm.title)]); // Pricing package (2026-11-02)
    return specs(rows);
  }
  // ---------- Brief readability package (2026-11-08): the brief as the studio and the client read it ----------
  // bfWhat(): the "What should it do?" answer on lines of its own; a tool's hand-off line ("Parts list: 1. …; 2. …; Plates: …")
  // becomes a heading with one indented item per line, so a long order reads as a list on the sent screen, in the copied
  // text, in the e-mail the Worker sends (rendered pre-wrap), in the mailto: bodies and in the printable brief. bfSubject():
  // the e-mail subject names the services and the client, like the Worker's. To remove: put o.what back into briefText()
  // and bpSheet() and the old subject into eqMail().
  function bfWhat() {
    return String(state.order.what || '').split('\n').map(function (l) {
      var m = /^([^:;]{2,40}): (.+)$/.exec(l.trim()); if (!m) return l;
      var items = m[2].replace(/\.$/, '').split('; '); if (items.length < 2) return l;
      return m[1] + ':\n' + items.map(function (it) { return '  – ' + it.trim(); }).join('\n');
    }).join('\n');
  }
  function bfSubject() {
    var o = state.order, svc = SERVICES.filter(function (s) { return o.services.indexOf(s.key) >= 0; }).map(function (s) { return L(s.title); }).join(', ');
    return (lang === 'sl' ? 'Novo povpraševanje' : 'New project') + (svc ? ': ' + svc : '') + ' — ' + o.name;
  }
  function briefText() {
    var o = state.order, x = t(), what = bfWhat();
    var svc = SERVICES.filter(function (s) { return o.services.indexOf(s.key) >= 0; }).map(function (s) { return L(s.title); }).join(', ');
    return [x.orderTitle.toUpperCase() + ' — nacekepa.work', '', x.steps[0] + ': ' + svc, x.fWhat + (what.indexOf('\n') >= 0 ? '\n' : ' ') + what, x.fQty + ': ' + o.qty, x.fDeadline + ': ' + (o.deadline || '—'),
      x.fFiles + ' ' + x.fFilesO[o.files], x.fMat + ': ' + x.fMatO[o.mat], '', x.fName + ': ' + o.name, x.fEmail + ': ' + o.email, String(o.phone || '').trim() ? x.eq.phoneB + ': ' + o.phone.trim() : '', x.eq.reply + ' ' + eqReply(), o.note ? x.fNote + ' ' + o.note : ''].concat(ocRows().length ? [''].concat(ocRows().map(function (r) { return r[0] + ' ' + r[1]; })) : []).join('\n').replace(/\n{3,}/g, '\n\n').trim();
  }


  // ---------- My corner (#mine, 2026-11-02): everything a visitor saved in this browser, on one page ----------
  // Shortlist (nk-shortlist) and the unfinished brief (nk-order-draft) are read through their own functions; saved
  // comparisons, Part studio sheets and price estimates live in localStorage "nk-mine" ({ v: 1, cmp: [], st: [], qc: [] },
  // newest first, MN_MAX of each; in memory if storage is blocked). Nothing leaves the browser unless the visitor puts it
  // in a brief and sends that. Export: print (the "Print" rules for .mine-page in page.css) and a plain-text download
  // (blob URL on an <a download>). Self-contained: remove MN_KEY … mnView(), 'mine' in PAGES / views, the mnLink() calls in
  // frame(), the data-mn-* save buttons in cmpView() / stSheet() / qcBox(), the data-mn-* lines in the click handler,
  // mn: + nav.mine in both languages in content.js and the "My corner" rules in page.css.
  var MN_KEY = 'nk-mine', MN_MAX = 20, mnMem = null, mnAsk = false, mnMsg = '';
  function mnRead() {
    if (!mnMem) {
      mnMem = { v: 1, cmp: [], st: [], qc: [], calc: [] };
      try { var d = JSON.parse(localStorage.getItem(MN_KEY) || 'null'); if (d && d.v === 1) ['cmp', 'st', 'qc', 'calc'].forEach(function (k) { if (Array.isArray(d[k])) mnMem[k] = d[k].filter(function (e) { return e && typeof e === 'object' && typeof e.at === 'number'; }).slice(0, MN_MAX); }); } catch (e) {}
    }
    return mnMem;
  }
  function mnSave() { try { localStorage.setItem(MN_KEY, JSON.stringify(mnMem)); } catch (e) {} }
  function mnAdd(kind, entry) { var m = mnRead(); entry.at = Date.now(); m[kind] = [entry].concat(m[kind]).slice(0, MN_MAX); mnSave(); return entry; }
  function mnDrop(kind, at) { var m = mnRead(); m[kind] = m[kind].filter(function (e) { return e.at !== +at; }); mnSave(); }
  function mnCount() { var m = mnRead(); return slRead().length + (dr.at && state.send !== 'sent' ? 1 : 0) + m.cmp.length + m.st.length + m.qc.length + m.calc.length + rlCount(); }
  function mnWhen(at) { try { return new Date(at).toLocaleString(lang === 'sl' ? 'sl-SI' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }); } catch (e) { return ''; } }
  function mnLink() { var n = mnCount(), x = t().mn; return '<a class="mine-link" href="#mine" aria-label="' + esc(n ? x.linkN.replace('{n}', n) : x.link) + '" title="' + esc(x.link) + '"' + (page() === 'mine' ? ' aria-current="page"' : '') + '><span aria-hidden="true">★</span>' + (n ? '<b>' + n + '</b>' : '') + '</a>'; }
  function mnFlash(id, text) { var el = document.getElementById(id); if (el) el.textContent = text; }
  // Save buttons on the compare page, the studio sheet and the quote tool (rows are stored as [label, text] pairs in the
  // language they were made in, so a saved sheet reads the same later).
  function mnSaveCmp() { var a = state.cmp.filter(bySlug); if (a.length < 2) return; mnAdd('cmp', { s: a.slice(0, 3) }); mnFlash('cmp-msg', t().mn.cmpSaved); mnLinkShow(); }
  function mnSaveSt() {
    var src = stSrc(), f = t().st; if (!src) return;
    var rows = stRows(src).map(function (r) { return [r[0], r[1]]; });
    mnAdd('st', { name: state.st.name.trim() || f.unnamed, kind: src.kind, size: stDims(src), qty: Math.max(1, Math.round(+state.st.qty || 1)), rows: rows, line: f.brief });
    mnFlash('st-msg', t().mn.stSaved); mnLinkShow();
  }
  function mnSaveQc() {
    var c = qcCalc(); if (!c) return;
    mnAdd('qc', { rows: c.rows.map(function (r) { return [r[0], pcMoney(r[1], 2)]; }), total: pcMoney(c.disc ? c.after : c.total, 2), text: qcText(c), svcs: ['cad', 'iot', 'build', 'print'].filter(function (k) { return state.qc[k]; }), hash: mnCalcHash('quote') });
    mnFlash('qc-msg', t().mn.qcSaved); mnLinkShow();
  }
  // My corner: calculations (2026-11-17, second run, improvement package): the series price, the budget and the material price
  // save their calculation like the quote estimate does — one card each under "Calculations" with the result, the line for the
  // brief and the calculation link (clUrl) that opens the tool with the same numbers; saved quote estimates get the same link.
  // To remove: MN_CALC … mnOpen(), 'calc' in mnRead() / mnCount() / mnForget(), calcB + its sec() in mnView(), the calc lines in
  // mnText(), hash: in mnSaveQc(), the data-mn-calc buttons in srBox() / bgBox() / mxBox() + their click line, mn.calc… in content.js.
  var MN_CALC = /^#services\?tool=(quote|series|budget|matprice|schedule)(&[a-z]{1,5}=[\w.%-]{0,16})*$/;
  function mnCalcHash(k) { var u = clUrl(k), h = u ? u.slice(u.indexOf('#')) : ''; return MN_CALC.test(h) ? h : ''; }
  function mnSaveCalc(k) {
    var e = null, c, id = { series: 'sr', budget: 'bg', matprice: 'mx', schedule: 'sc' }[k]; if (!id || (!PRICE && k !== 'schedule')) return;
    if (k === 'schedule') { c = scCalc(); if (scOk(c)) e = { sum: scNames(c.pk) + ' — ' + scSum(c), text: scLine(c), svcs: c.pk.map(function (v) { return v.key; }) }; } else /* ↑ Schedule NK-T (2026-11-18) */ if (k === 'series' && (c = srCalc())) e = { sum: srPartText(c.p) + ' — ' + srSum(c), text: srLine(c), svcs: ['print'] };
    else if (k === 'budget' && (c = bgCalc())) e = { sum: bgSum(c), text: bgLine(c), svcs: c.plan ? c.plan.rows.map(function (r) { return r.k; }).filter(function (v) { return v !== 'setup'; }) : [] };
    else if (k === 'matprice' && (c = mxCalc())) e = { sum: mxPart(c, c.ref) + ' — ' + mxSum(c), text: mxLine(c), svcs: ['print'] };
    if (!e) return;
    e.tool = k; e.title = t()[id].label.split(' · ')[0]; e.hash = mnCalcHash(k);
    mnAdd('calc', e); mnFlash(id + '-msg', t().mn.calcSaved); mnLinkShow();
  }
  function mnOpen(e, fallback) { // "Open this calculation" when the entry carries a valid calculation link, else the plain tool
    var ok = typeof e.hash === 'string' && MN_CALC.test(e.hash);
    return btn(ok ? t().mn.calcOpen : fallback[0], ok ? e.hash : fallback[1], 'ghost', 'sm');
  }
  function mnLinkShow() { var el = document.querySelector('.mine-link'); if (el) el.outerHTML = mnLink(); }
  // A saved sheet or estimate goes into the brief the same way the studio and the quote tool hand over (one line each).
  function mnToBrief(kind, at) {
    var m = mnRead(), e = m[kind].filter(function (v) { return v.at === +at; })[0], o = state.order, x = t().mn; if (!e) return;
    var line;
    if (kind === 'st') {
      line = (e.line || t().st.brief) + ': ' + e.rows.filter(function (r) { return r[0] !== t().st.rows.fn && r[0] !== t().st.rows.needs; }).map(function (r) { return r[0] + ': ' + r[1]; }).join('; ') + '.';
      if (o.services.indexOf('print') < 0) o.services.push('print');
      if (e.kind === 'box' && o.services.indexOf('cad') < 0) o.services.push('cad');
      o.qty = String(e.qty || 1);
    } else {
      line = e.text || '';
      (e.svcs || []).forEach(function (k) { if (o.services.indexOf(k) < 0) o.services.push(k); });
    }
    if (line && o.what.indexOf(line) < 0) o.what = o.what ? o.what + '\n' + line : line;
    state.step = 1; state.errors = {}; state.send = 'idle';
    location.hash = 'order';
  }
  function mnForget() {
    mnMem = { v: 1, cmp: [], st: [], qc: [], calc: [] }; try { localStorage.removeItem(MN_KEY); localStorage.removeItem(SL_KEY); } catch (e) {}
    slMem = []; mnAsk = false; rlWipe(); // Redline notes (2026-11-24)
    try { localStorage.removeItem(DR_KEY); } catch (e) {}
    state.order = { website: '', services: [], what: '', qty: '1', deadline: '', files: 0, mat: 0, name: '', email: '', note: '', phone: '', reply: 0 };
    state.prep.have = {}; state.prep.svc = null; state.step = 0; state.errors = {}; state.send = 'idle'; dr.at = 0; dr.restored = false; dr.ask = false;
    mnMsg = t().mn.forgotten; render(true); mnMsg = '';
  }
  function mnText() { // plain-text export, in the page language
    var x = t().mn, m = mnRead(), out = [x.label + ' · nacekepa.work · ' + new Date().toISOString().slice(0, 10), ''];
    var sl = slRead().map(bySlug);
    out.push(x.slT); out.push(sl.length ? sl.map(function (p) { return '- ' + P(p, 'title') + ' (' + sheetNo(p) + ') ' + shareUrl('p', p); }).join('\n') : x.slEmpty); out.push('');
    out.push(x.drT); out.push(dr.at && state.send !== 'sent' ? x.drSaved.replace('{d}', drWhen()).replace('{s}', state.step + 1) + '\n' + x.drServices + ': ' + state.order.services.map(function (k) { var sv = SERVICES.filter(function (v) { return v.key === k; })[0]; return sv ? L(sv.title) : k; }).join(', ') + (state.order.what ? '\n' + x.drWhat + ': ' + state.order.what : '') : x.drEmpty); out.push('');
    out.push(x.cmpT); out.push(m.cmp.length ? m.cmp.map(function (e) { return '- ' + e.s.map(function (sl) { var p = bySlug(sl); return p ? P(p, 'title') : sl; }).join(' · ') + ' — ' + mnWhen(e.at) + '\n  https://nacekepa.work/' + (lang === 'sl' ? 'sl/' : '') + cmpHash(e.s); }).join('\n') : x.cmpEmpty); out.push('');
    out.push(x.stT); out.push(m.st.length ? m.st.map(function (e) { return '- ' + e.name + ' — ' + mnWhen(e.at) + '\n' + e.rows.map(function (r) { return '  ' + r[0] + ': ' + r[1]; }).join('\n'); }).join('\n') : x.stEmpty); out.push('');
    out.push(x.qcT); out.push(m.qc.length ? m.qc.map(function (e) { return '- ' + mnWhen(e.at) + ': ' + e.text; }).join('\n') : x.qcEmpty); out.push('');
    var site = 'https://nacekepa.work/' + (lang === 'sl' ? 'sl/' : '');
    out.push(x.calcT); out.push(m.calc.length ? m.calc.map(function (e) { return '- ' + mnWhen(e.at) + ' · ' + (e.title || '') + ': ' + (e.sum || '') + '\n  ' + (e.text || '') + (typeof e.hash === 'string' && MN_CALC.test(e.hash) ? '\n  ' + site + e.hash : ''); }).join('\n') : x.calcEmpty); out.push('');
    out.push(x.privacy);
    return out.join('\n');
  }
  function mnDownload() {
    try {
      var blob = new Blob([mnText()], { type: 'text/plain;charset=utf-8' }), url = URL.createObjectURL(blob), a = document.createElement('a');
      a.href = url; a.download = t().mn.file + '-' + new Date().toISOString().slice(0, 10) + '.txt'; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
    } catch (e) {}
  }
  function mnView() {
    var x = t().mn, m = mnRead(), sl = slRead().map(bySlug), total = mnCount();
    var sec = function (title, body, n) { return '<section class="mn-sec"><h2 class="sub">' + esc(title) + (n ? ' <span class="nk-label">' + n + '</span>' : '') + '</h2>' + body + '</section>'; };
    var when = function (e) { return '<span class="mn-when">' + esc(x.on) + ' ' + esc(mnWhen(e.at)) + '</span>'; };
    var rm = function (kind, e) { return '<button type="button" class="tb-copy" data-mn-rm="' + kind + '" data-mn-at="' + e.at + '">' + esc(x.remove) + '</button>'; };
    var slB = sl.length ? '<ul class="mn-list">' + sl.map(function (p) { return '<li><a ' + ra('#p-' + p.slug) + '><b>' + esc(P(p, 'title')) + '</b> <span class="nk-label">' + esc(sheetNo(p)) + '</span></a><button type="button" class="tb-copy" data-sl-tog="' + esc(p.slug) + '" data-mn-sl>' + esc(x.slRemove) + '</button></li>'; }).join('') + '</ul>' +
      '<div class="cta-row">' + (sl.length > 1 ? btn(x.slCompare.replace('{n}', Math.min(3, sl.length)), cmpHash(slRead().slice(0, 3)), '', 'sm') : '') + '<button type="button" class="nk-btn nk-btn--sm" data-sl-go>' + esc(x.slStart) + '</button></div>' : '<p class="hint">' + esc(x.slEmpty) + '</p>';
    var drB = dr.at && state.send !== 'sent' ? '<p class="mn-row"><b>' + esc(x.drSaved.replace('{d}', drWhen()).replace('{s}', state.step + 1)) + '</b></p>' +
      '<dl class="nk-specs mn-specs"><div><dt>' + esc(x.drServices) + '</dt><dd>' + esc(state.order.services.map(function (k) { var sv = SERVICES.filter(function (v) { return v.key === k; })[0]; return sv ? L(sv.title) : k; }).join(', ') || '—') + '</dd></div>' +
      (state.order.what ? '<div><dt>' + esc(x.drWhat) + '</dt><dd class="mn-pre">' + esc(state.order.what.slice(0, 600)) + (state.order.what.length > 600 ? '…' : '') + '</dd></div>' : '') + '</dl>' +
      '<div class="cta-row">' + btn(x.drCont, '#order', 'primary', 'sm', true) + '<button type="button" class="nk-btn nk-btn--sm" data-mn-drclear>' + esc(t().dr.clear) + '</button></div>' : '<p class="hint">' + esc(x.drEmpty) + '</p>';
    var cmpB = m.cmp.length ? '<ul class="mn-list">' + m.cmp.map(function (e) { return '<li><a href="' + esc(cmpHash(e.s)) + '"><b>' + esc(e.s.map(function (sl) { var p = bySlug(sl); return p ? P(p, 'title') : sl; }).join(' · ')) + '</b>' + when(e) + '</a>' + rm('cmp', e) + '</li>'; }).join('') + '</ul>' : '<p class="hint">' + esc(x.cmpEmpty) + '</p>';
    var stB = m.st.length ? m.st.map(function (e) { return '<details class="mn-card"><summary><b>' + esc(e.name) + '</b> <span class="nk-label">' + esc((e.size || []).map(fitFmt).join(' × ')) + (e.size ? ' mm' : '') + ' · ×' + esc(e.qty || 1) + '</span>' + when(e) + '</summary><dl class="nk-specs mn-specs">' + e.rows.map(function (r) { return '<div><dt>' + esc(r[0]) + '</dt><dd>' + esc(r[1]) + '</dd></div>'; }).join('') + '</dl>' +
      '<div class="cta-row"><button type="button" class="nk-btn nk-btn--sm" data-mn-brief="st" data-mn-at="' + e.at + '">' + esc(x.stBrief) + '</button>' + btn(x.stAgain, '#studio', 'ghost', 'sm') + rm('st', e) + '</div></details>'; }).join('') : '<p class="hint">' + esc(x.stEmpty) + '</p>';
    var qcB = m.qc.length ? m.qc.map(function (e) { return '<details class="mn-card"><summary><b>≈ ' + esc(e.total) + '</b> <span class="nk-label">' + esc(e.rows.map(function (r) { return r[0]; }).join(' · ')) + '</span>' + when(e) + '</summary><dl class="nk-specs mn-specs">' + e.rows.map(function (r) { return '<div><dt>' + esc(r[0]) + '</dt><dd>' + esc(r[1]) + '</dd></div>'; }).join('') + '</dl>' +
      '<div class="cta-row"><button type="button" class="nk-btn nk-btn--sm" data-mn-brief="qc" data-mn-at="' + e.at + '">' + esc(x.qcBrief) + '</button>' + mnOpen(e, [t().qc.title, '#services?tool=quote']) + rm('qc', e) + '</div></details>'; }).join('') : '<p class="hint">' + esc(x.qcEmpty) + '</p>';
    var calcB = m.calc.length ? m.calc.map(function (e) { var tk = /^(series|budget|matprice|schedule)$/.test(e.tool) ? e.tool : 'series'; return '<details class="mn-card"><summary><b>' + esc(e.title || '') + '</b> <span class="nk-label mn-calc-sum">' + esc(e.sum || '') + '</span>' + when(e) + '</summary><p class="mn-pre mn-calc-text">' + esc(e.text || '') + '</p>' +
      '<div class="cta-row"><button type="button" class="nk-btn nk-btn--sm" data-mn-brief="calc" data-mn-at="' + e.at + '">' + esc(x.qcBrief) + '</button>' + mnOpen(e, [e.title || x.calcT, tlHash(tk)]) + rm('calc', e) + '</div></details>'; }).join('') : '<p class="hint">' + esc(x.calcEmpty) + '</p>';
    var tools = '<div class="mn-tools"><div class="cta-row"><button type="button" class="nk-btn nk-btn--sm" data-mn-print>' + psIco() + ' ' + esc(x.print) + '</button><button type="button" class="nk-btn nk-btn--sm" data-mn-dl>' + esc(x.download) + '</button>' +
      (mnAsk ? '<span class="mn-ask">' + esc(x.forgetAsk) + ' <button type="button" class="nk-btn nk-btn--sm nk-btn--primary" data-mn-forget="yes">' + esc(x.forgetYes) + '</button> <button type="button" class="nk-btn nk-btn--sm" data-mn-forget="no">' + esc(x.forgetNo) + '</button></span>' : '<button type="button" class="nk-btn nk-btn--sm nk-btn--ghost" data-mn-forget="ask">' + esc(x.forget) + '</button>') + '</div>' +
      '<p class="share-msg" id="mn-msg" role="status" aria-live="polite">' + esc(mnMsg) + '</p><p class="fit-note">' + esc(x.privacy) + ' ' + esc(x.max.replace('{n}', MN_MAX)) + '</p></div>';
    return '<section class="block first mine-page">' + head(x.label, x.title, x.lead, true) + (total ? '' : '<p class="mn-empty">' + esc(x.empty) + '</p>') +
      sec(x.slT, slB, sl.length) + sec(x.drT, drB) + sec(x.cmpT, cmpB, m.cmp.length) + sec(x.stT, stB, m.st.length) + sec(x.qcT, qcB, m.qc.length) + sec(x.calcT, calcB, m.calc.length) + rlMine() + tools + '</section>' + ctaBand();
  }
  function frame(inner) {
    var x = t(), p = page();
    var zones = '<div class="zones zones-top" aria-hidden="true">' + [1, 2, 3, 4, 5, 6, 7, 8].map(function (n) { return '<span>' + n + '</span>'; }).join('') + '</div>' +
      '<div class="zones zones-side zl" aria-hidden="true"><span>A</span><span>B</span><span>C</span><span>D</span></div><div class="zones zones-side zr" aria-hidden="true"><span>A</span><span>B</span><span>C</span><span>D</span></div>';
    var nav = '<header class="top"><a class="wordmark" ' + ra('#home') + ' aria-label="' + esc(x.aria.home) + '">' + logo() + '<span class="wm-text">nacekepa<span>.work</span></span></a><nav aria-label="' + esc(x.aria.main) + '">' +
      ['services', 'work', 'news', 'skills', 'about'].filter(function (k) { return k !== 'news' || NEWS.length; }).map(function (k) { return '<a ' + ra('#' + k) + (p === k || ((p === 'project' || p === 'compare') && k === 'work') || (p === 'post' && k === 'news') || (p === 'profile' && k === 'about') || (p === 'service' && k === 'services') ? ' aria-current="page"' : '') + '>' + esc(x.nav[k]) + '</a>'; }).join('') +
      '</nav><div class="top-act"><div class="lang" role="group" aria-label="' + esc(x.aria.lang) + '">' + ['en', 'sl'].map(function (l) { return '<a href="' + esc(langHref(l) + langLinkHash(l)) + '" hreflang="' + l + '" lang="' + l + '" data-lang="' + l + '" aria-current="' + (lang === l) + '">' + l.toUpperCase() + '</a>'; }).join('') + '</div>' + fxBtn() + vwBtn() + mnLink() + btn(ctaText(), '#order', 'primary', 'sm') + '</div></header>';
    var idx = PAGES.indexOf(p === 'project' || p === 'compare' ? 'work' : p === 'post' ? 'news' : p === 'profile' ? 'about' : p === 'service' ? 'services' : p) + 1;
    var d = new Date().toISOString().slice(0, 10);
    var tb = '<footer class="foot"><div class="nk-tb" style="--tb-cols:6">' +
      cell(x.tb.title, '<span class="tb-brand">' + logo() + '<span>Nace Kepa · Engineering Studio</span></span>', 'wide', true, true) + cell(x.tb.drawn, 'N. Kepa') + cell(x.tb.loc, 'Škofja Loka, SI') + cell(x.tb.sheet, String(idx).padStart(2, '0') + ' / ' + String(PAGES.length).padStart(2, '0')) +
      cell(x.tb.scale, '1:1') + cell(x.tb.rev, 'B') + cell(x.tb.date, d) + cell(x.tb.contact, (CONTACT_EMAIL ? '<a href="mailto:' + esc(CONTACT_EMAIL) + '" id="tb-mail">' + esc(CONTACT_EMAIL) + '</a> <button type="button" class="tb-copy" data-tb-copy>' + esc(x.tbCopy) + '</button><span class="tb-msg" id="tb-msg" role="status" aria-live="polite"></span> · ' : '') + '<a href="' + LINKEDIN + '" target="_blank" rel="noopener">LinkedIn <span aria-hidden="true">↗</span><span class="vh"> (' + esc(t().newTab) + ')</span></a>' + (qrOn() ? ' · <button type="button" class="tb-copy" data-qr-vcf>' + esc(t().eq.vcf) + '</button><span class="tb-msg qr-msg" role="status" aria-live="polite"></span>' : ''), 'wide', false, true) + cell(x.tb.order, '<a href="#order">' + esc(ctaText()) + ' →</a>' + (giftOn() ? ' · <a href="#gift">' + esc(t().gift.tbLink) + '</a>' : ''), 'wide', false, true) +
      cell('', esc(x.footerNote), 'full', false, true) + '</div><p class="copy">© ' + new Date().getFullYear() + ' Nace Kepa' + kbdBtn() + vwFoot() + '<a class="mine-foot" href="#mine">' + esc(x.mn.link) + '</a>' + glLink('foot') + '<button type="button" class="to-top" data-top>' + esc(x.toTop) + ' <span aria-hidden="true">↑</span></button></p></footer>';
    return '<div class="frame"><a class="skip" href="#main" data-skip>' + esc(x.skip) + '</a>' + zones + nav + '<main id="main" tabindex="-1">' + inner + '</main>' + tb + '</div>';
  }
  function cell(k, v, span, title, raw) {
    return '<div class="nk-tb__cell' + (span === 'wide' ? ' nk-tb__cell--wide' : span === 'full' ? ' nk-tb__cell--full' : '') + '">' + (k ? '<span class="nk-tb__k">' + esc(k) + '</span>' : '') + '<span class="nk-tb__v' + (title ? ' nk-tb__v--title' : '') + '">' + (raw ? v : esc(v)) + '</span></div>';
  }

  // Tab / history / screen-reader title for the current view, e.g. "FamFive · Nace Kepa".
  function pageTitle(p) {
    var x = t(), s = '';
    if (LANDING && LAND_TITLE && !location.hash && lang === LAND_LANG && landingView() === START_VIEW && !/^[pn]-/.test(START_VIEW)) return LAND_TITLE;
    if (p === 'project') { var pr = bySlug(currentSlug()); s = pr ? P(pr, 'title') : ''; }
    else if (p === 'post') { var n = newsBySlug(currentSlug()); s = n ? P(n, 'title') : ''; }
    else if (p === 'order') s = x.cta + ' · ' + (state.step + 1) + '/4 ' + x.steps[state.step];
    else if (p === 'profile') s = x.pf.label.split(' · ')[0];
    else if (p === 'service') { var sv = svById(currentSlug()); s = sv ? L(sv.title) : ''; } // Service sheets (2026-11-26)
    else if (p !== 'home') s = x.nav[p] || '';
    return s ? s + ' · Nace Kepa' : 'Nace Kepa · ' + (lang === 'sl' ? 'Inženirski studio' : 'Engineering Studio');
  }
  function render(keepScroll) {
    var p = page();
    document.documentElement.lang = lang === 'sl' ? 'sl' : 'en';
    document.title = pageTitle(p);
    if (viewer) { viewer.dispose(); viewer = null; }
    fc3dDispose(); stDispose();
    closeLightbox();
    psDone();
    app.innerHTML = frame(views[p]());
    if (!keepScroll) window.scrollTo(0, 0);
    if (p === 'project') mountViewer();
    if (p === 'order') drSave();
    if (p === 'services' && state.fc.res) { fcDraw(); fc3dMount(); } // File check views + 3D preview
    if (p === 'studio') stMount();
    if (p === 'glossary') glMount(); // Glossary NK-G (2026-11-27)
    tlMark(p === 'services' ? state.tool : ''); // Print package (2026-11-02, evening run)
    if (p === 'services' && state.tool && location.hash !== state.tlAt) { state.tlAt = location.hash; tlGo(state.tool); } else if (p !== 'services') state.tlAt = '';
    if (p === 'services' && state.mpFocus) { state.mpFocus = false; var mb = document.getElementById('material'); if (mb) { tlSetFold('material', true); mb.scrollIntoView({ block: 'start' }); var mi = mb.querySelector('input'); if (mi) mi.focus({ preventScroll: true }); } }
    if (p === 'services' && state.plFocus) { state.plFocus = false; var pb = document.getElementById('plan'); if (pb) { tlSetFold('plan', true); pb.scrollIntoView({ block: 'start' }); var pr = pb.querySelector('input'); if (pr) pr.focus({ preventScroll: true }); } }
    if (p === 'about' && state.ctGo) { state.ctGo = false; var ct = document.getElementById('contact'); if (ct) { ct.scrollIntoView({ block: 'start' }); ct.focus({ preventScroll: true }); } }
    if (p === 'work') { findApply(); if (state.findFocus) { state.findFocus = false; var fq = document.getElementById('find-q'); if (fq) fq.focus(); } }
    if (p === 'work' && state.pzGo) { var pg = state.pzGo; state.pzGo = ''; pzOpen(state.sx && state.sx.length ? 'sx' : 'work', pg); } else state.pzGo = ''; // Presentation (2026-11-13)
    // Back from a project sheet / news post to its list: scroll to and focus the card the visitor opened, not the top.
    var came = state.from; state.from = p === 'project' ? '#p-' + currentSlug() : p === 'post' ? '#n-' + currentSlug() : '';
    if (came && !keepScroll && (p === 'work' || p === 'news')) {
      var card = app.querySelector((p === 'work' ? (rgOn() ? '#rg' : '#find-grid') : '.news-list') + ' a[data-ra="' + came + '"], ' + (p === 'work' ? (rgOn() ? '#rg' : '#find-grid') : '.news-list') + ' a[href="' + came + '"]');
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
    if (state.step === 2) { if (!o.name.trim()) e.name = 1; if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(o.email)) e.email = 1; if (!eqPhoneOk(o.phone)) e.phone = 1; if (+o.reply === 1 && !String(o.phone).trim()) e.reply = 1; } // Enquiry package: phone optional but sane, a phone call needs a number
    state.errors = e; return !Object.keys(e).length;
  }

  app.addEventListener('click', function (ev) {
    var el = ev.target.closest('button, a'); if (!el) return;
    if (el.tagName === 'A' && el.hasAttribute('data-ra')) { // Real addresses package (2026-11-26): a plain click moves inside the app; Ctrl / middle click and "copy link" get the real page
      if (ev.button || ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.altKey) return;
      ev.preventDefault(); var rah = el.getAttribute('data-ra'); if (location.hash !== rah) location.hash = rah;
    }
    if (el.hasAttribute('data-sv-copy')) { svCopy(el); return; } // Service sheets (2026-11-26)
    if (glClick(el)) return; // Glossary NK-G (2026-11-27)
    if (el.hasAttribute('data-fx')) { fxOpen(el.getAttribute('data-fx')); return; } // Find anything (2026-11-12)
    if (el.hasAttribute('data-hm-go')) { hmGo(el.getAttribute('data-hm-go')); return; } // Home for orders (2026-11-26)
    if (el.hasAttribute('data-pf-act')) { pfAct(el.getAttribute('data-pf-act')); return; } // Studio profile NK-A (2026-11-25)
    if (el.hasAttribute('data-pz')) { pzOpen(el.getAttribute('data-pz')); return; } // Presentation (2026-11-13)
    if (el.hasAttribute('data-top')) { window.scrollTo({ top: 0, behavior: vwCalm() ? 'auto' : 'smooth' }); var tm = document.getElementById('main'); if (tm) tm.focus({ preventScroll: true }); return; }
    if (el.hasAttribute('data-skip')) { ev.preventDefault(); var mn = document.getElementById('main'); mn.focus({ preventScroll: true }); mn.scrollIntoView({ block: 'start' }); return; }
    var th = el.tagName === 'A' && /^#services\?tool=([a-z]+)$/.exec(el.getAttribute('href') || ''); // Tools index: same link again → jump again
    if (th && location.hash === th[0]) { ev.preventDefault(); tlGo(th[1]); return; }
    if (el.hasAttribute('data-fit-go')) { fitToOrder(); return; }
    if (el.hasAttribute('data-pb-go')) { pbToOrder(); return; }
    if (el.hasAttribute('data-rv-go')) { rvGo(el.getAttribute('data-rv-go')); return; } // Review package (2026-11-05)
    // Parts list NK-L (2026-11-05)
    if (el.hasAttribute('data-bm-add')) { var bi = bmAdd({}); bmRefresh(bi >= 0 ? '#bm-row-' + bi + ' [data-bm-f="name"]' : '[data-bm-add]'); return; }
    if (el.hasAttribute('data-bm-rm')) { bmRemove(+el.getAttribute('data-bm-rm')); return; }
    if (el.hasAttribute('data-bm-go')) { bmToOrder(); return; }
    if (el.hasAttribute('data-bm-copy')) { bmCopy(); return; }
    if (el.hasAttribute('data-bm-clear')) { bmClear(el.getAttribute('data-bm-clear')); return; }
    if (el.hasAttribute('data-pn-more')) { pnMore(); return; } // Plate layout NK-N (2026-11-08)
    if (el.hasAttribute('data-bm-fit')) { bmAdd({ l: fitNum(state.fit.l) || '', w: fitNum(state.fit.w) || '', h: fitNum(state.fit.h) || '' }); } // the link itself opens the tool
    if (el.hasAttribute('data-bm-st')) { var bs = stSrc(); if (bs) { var bd = stDims(bs), bc = mpChosen(); bmAdd({ name: String(state.st.name || '').trim() || (bs.kind === 'file' ? String(bs.name || '').replace(/\.[a-z0-9]+$/i, '') : ''), l: bd[0], w: bd[1], h: bd[2], mat: bc ? bc.id : '', qty: Math.max(1, Math.round(+state.st.qty || 1)) }); location.hash = 'services?tool=parts'; } return; }
    if (el.hasAttribute('data-qc-go')) { qcToOrder(); return; } // Pricing package (2026-11-02)
    if (el.dataset.srQ) { srPick(+el.dataset.srQ); return; } // Series price NK-R (2026-11-15)
    if (el.hasAttribute('data-sc-svc')) { scToggle(el); return; } // Schedule NK-T (2026-11-18)
    if (el.hasAttribute('data-sc-go')) { scToOrder(); return; }
    if (el.hasAttribute('data-sc-copy')) { scCopy(); return; }
    if (el.hasAttribute('data-sc-ics')) { scIcs(); return; }
    if (el.hasAttribute('data-dl-sc')) { dlScHand(); } // the link itself opens the tool
    if (el.dataset.mxM) { mxPick(el.dataset.mxM); return; } // Material price NK-V (2026-11-17, second run)
    if (el.hasAttribute('data-mx-go')) { mxToOrder(); return; }
    if (el.hasAttribute('data-mx-copy')) { mxCopy(); return; }
    if (el.hasAttribute('data-mx-sr')) { mxHand('sr'); } // the links themselves open the tools
    if (el.hasAttribute('data-mx-qc')) { mxHand('qc'); }
    if (el.hasAttribute('data-qc-mx')) { mxFrom('qc'); }
    if (el.hasAttribute('data-sr-mx') && (qcNum(state.sr.g) || qcNum(state.sr.h))) { mxFrom('sr'); }
    if (el.dataset.mnCalc) { mnSaveCalc(el.dataset.mnCalc); return; } // My corner: calculations (2026-11-17, second run)
    if (el.hasAttribute('data-bg-go')) { bgToOrder(); return; } // Budget NK-B (2026-11-17)
    if (el.hasAttribute('data-bg-copy')) { bgCopy(); return; }
    if (el.hasAttribute('data-bg-qc')) { bgToQc(); } // the links themselves open the tools
    if (el.hasAttribute('data-bg-sr')) { bgToSr(); }
    if (el.hasAttribute('data-qc-bg')) { bgFromQc(); }
    if (el.hasAttribute('data-sr-go')) { srToOrder(); return; }
    if (el.hasAttribute('data-sr-copy')) { srCopy(); return; }
    if (el.hasAttribute('data-sr-qc')) { srToQc(); } // the link itself opens the estimate
    if (el.hasAttribute('data-qc-sr')) { srFromQc(); } // the link itself opens the series price
    if (el.hasAttribute('data-st-sr')) { var ss = stEst(stSrc()); if (ss) { qcSet({ mat: ss.mat ? ss.mat.key : '', g: ss.g, h: ss.h, qty: ss.qty }); srFromQc(); } }
    if (el.dataset.giftAmt) { state.gift.amt = el.dataset.giftAmt; state.gift.errors = {}; render(true); var gc = document.getElementById('gift-custom'); if (gc) gc.focus(); else { var ga = document.querySelector('[data-gift-amt="' + el.dataset.giftAmt + '"]'); if (ga) ga.focus(); } return; } // Gift cards (2026-11-02)
    if (el.hasAttribute('data-gift-send')) { giftSend(); return; }
    if (el.dataset.blogYear != null) { state.blogYear = el.dataset.blogYear; var bl = document.getElementById('blog-list'), bs = document.querySelector('.blog-years'); if (bl) bl.innerHTML = blogList().map(newsCard).join(''); if (bs) bs.outerHTML = blogYears(); var bb = document.querySelector('[data-blog-year="' + state.blogYear + '"]'); if (bb) bb.focus(); return; } // Blog package (2026-11-02)
    if (el.hasAttribute('data-gift-copy')) { giftCopy(); return; }
    if (el.hasAttribute('data-gift-print')) { printSheet(); return; }
    if (el.hasAttribute('data-gift-reset')) { state.gift = { amt: '', custom: '', to: '', from: '', msg: '', name: state.gift.name, email: state.gift.email, website: '', send: 'idle', errors: {} }; render(false); return; }
    if (el.hasAttribute('data-qc-copy')) { qcCopy(); return; }
    if (el.hasAttribute('data-pb-copy')) { pbCopy(); return; }
    if (el.dataset.pbLay) { pbLay(el.dataset.pbLay); return; }
    if (el.hasAttribute('data-pb-fit')) { var pbr = fitCalc(); pbSet(pbr ? pbr.o : [fitNum(state.fit.l), fitNum(state.fit.w), fitNum(state.fit.h)]); } // the link itself opens the tool
    if (el.hasAttribute('data-pb-st')) { var pbs = stSrc(); if (pbs) pbSet(stDims(pbs), Math.round(+state.st.qty) || 0); }
    if (el.hasAttribute('data-fc-go')) { fcToOrder(); return; }
    if (el.hasAttribute('data-fc-fit')) { fcToFit(); return; }
    if (el.hasAttribute('data-fc-copy')) { fcCopy(); return; }
    if (el.hasAttribute('data-fc-clear')) { fcClear(); return; }
    if (el.hasAttribute('data-fc-3d')) { fc3dToggle(); return; }
    if (el.hasAttribute('data-ct-copy')) { ctCopy(); return; }
    if (el.hasAttribute('data-st-go')) { stToOrder(); return; }
    if (el.hasAttribute('data-st-copy')) { stCopy(); return; }
    if (el.hasAttribute('data-st-print')) { printSheet(); return; }
    if (el.hasAttribute('data-tl-print')) { tlPrint(el.getAttribute('data-tl-print')); return; } // Print package (2026-11-02, evening run)
    if (el.hasAttribute('data-dw-print')) { dwPrint(); return; } // Drawing sheet NK-D (2026-11-02, evening run)
    if (el.hasAttribute('data-dw-svg')) { dwDownload(); return; }
    if (el.hasAttribute('data-st-fit')) { var sfp = stFitPerm(stSrc()); if (sfp >= 0) stAxes(sfp); return; }
    if (el.hasAttribute('data-st-measure')) { stMeasure(); return; }
    if (el.hasAttribute('data-st-mclear')) { if (st3d) st3d.clearMeasure(); state.st.meas = null; stMeasShow(); return; }
    if (el.hasAttribute('data-st-sp')) { spToggle(); return; }
    if (el.hasAttribute('data-st-wt')) { wtToggle(); return; } // Part studio 2.0 (2026-11-02)
    if (el.hasAttribute('data-st-qc')) { var se = stEst(stSrc()); if (se) qcSet({ mat: se.mat ? se.mat.key : '', g: se.g, h: se.h, qty: se.qty }); } // the link itself opens the estimate
    if (el.hasAttribute('data-st-sp-use')) { stAxes(el.getAttribute('data-st-sp-use')); var su = document.querySelector('[data-st-sp-use], .st-sup__t .is-cur .nk-label'); if (su) su.focus({ preventScroll: true }); return; }
    if (el.hasAttribute('data-st-fclear')) { state.fc = { busy: false, err: '', res: null, unit: state.fc.unit }; fcRefresh(); return; }
    if (el.hasAttribute('data-v3-view')) { v3Set(el.dataset.v3For, 'view', el.dataset.v3View); return; }
    if (el.hasAttribute('data-pl-go')) { plToOrder(); return; }
    if (el.hasAttribute('data-mp-go')) { mpToOrder(); return; }
    if (el.hasAttribute('data-mp-copy')) { mpCopy(); return; }
    if (el.hasAttribute('data-mp-clear')) { state.mp = { needs: {}, pick: '' }; mpRefresh('[data-mp-need]'); mxUpdate(); return; }
    if (el.hasAttribute('data-mp-open')) { ev.preventDefault(); state.mpFocus = true; if (page() === 'services') render(true); else location.hash = 'services'; return; }
    if (el.hasAttribute('data-pl-copy')) { plCopy(); return; }
    if (el.hasAttribute('data-pl-prep')) { plPrep(); return; }
    if (el.hasAttribute('data-pl-reset')) { state.pl = { have: '', kind: '', back: '', l: '', w: '', h: '', qty: '1', mat: 0, deadline: '' }; plRefresh('input[name="pl-q1"]'); return; }
    if (el.hasAttribute('data-pl-open')) { ev.preventDefault(); state.plFocus = true; if (page() === 'services') render(true); else location.hash = 'services'; return; }
    if (el.dataset.prepSvc) { var ps = prepSvc(), pk = el.dataset.prepSvc, pi = ps.indexOf(pk); if (pi < 0) ps.push(pk); else ps.splice(pi, 1); ps.sort(function (p, q) { return SERVICES.map(function (s) { return s.key; }).indexOf(p) - SERVICES.map(function (s) { return s.key; }).indexOf(q); }); prepRefresh(pk); return; }
    if (el.hasAttribute('data-prep-go')) { prepToOrder(); return; }
    if (el.hasAttribute('data-prep-copy')) { prepCopy(); return; }
    if (el.hasAttribute('data-mail-copy')) { mailCopy(); return; }
    if (el.hasAttribute('data-mn-sl')) { slFlip(el.dataset.slTog); mnMsg = t().mn.removed; render(true); mnMsg = ''; return; } // My corner (2026-11-02)
    if (el.dataset.mnRm) { mnDrop(el.dataset.mnRm, el.dataset.mnAt); mnMsg = t().mn.removed; render(true); mnMsg = ''; return; }
    if (el.dataset.mnBrief) { mnToBrief(el.dataset.mnBrief, el.dataset.mnAt); return; }
    if (el.hasAttribute('data-mn-cmp')) { mnSaveCmp(); return; }
    if (el.hasAttribute('data-mn-st')) { mnSaveSt(); return; }
    if (el.hasAttribute('data-mn-qc')) { mnSaveQc(); return; }
    if (el.hasAttribute('data-mn-print')) { [].forEach.call(document.querySelectorAll('.mn-card'), function (d) { d.open = true; }); printSheet(); return; }
    if (el.hasAttribute('data-mn-dl')) { mnDownload(); return; }
    if (el.hasAttribute('data-mn-drclear')) { drClearAll(); return; }
    if (el.dataset.mnForget) { if (el.dataset.mnForget === 'yes') { mnForget(); return; } mnAsk = el.dataset.mnForget === 'ask'; render(true); var mf = document.querySelector(mnAsk ? '[data-mn-forget="no"]' : '[data-mn-forget="ask"]'); if (mf) mf.focus(); return; }
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
    if (el.hasAttribute('data-dh')) { dhAct(el.getAttribute('data-dh'), el, ev); return; } // Draft hand-over (2026-11-19)
    if (el.hasAttribute('data-sl-clear')) { slClear(); return; }
    if (el.hasAttribute('data-sx-copy')) { sxCopy(el.getAttribute('data-sx-copy')); return; } // Shared selection (2026-11-14)
    if (el.hasAttribute('data-sx-keep')) { sxKeep(); return; }
    if (el.hasAttribute('data-sx-go')) { slToOrder(state.sx); return; }
    if (el.hasAttribute('data-sx-close')) { sxClose(); return; }
    if (el.hasAttribute('data-tb-copy')) { tbCopy(); return; }
    if (el.hasAttribute('data-find-clear')) { state.q = ''; var fq = document.getElementById('find-q'); fq.value = ''; findApply(); fq.focus(); return; }
    if (el.dataset.lang) { if (ev.ctrlKey || ev.metaKey || ev.shiftKey || ev.altKey) return; ev.preventDefault(); if (el.dataset.lang === lang) return; lang = el.dataset.lang; try { localStorage.setItem('nk-lang', lang); } catch (e) {} langHash(); langPath(); render(true); return; } // Language package: a real link, switched in place on a plain click
    if (el.dataset.filter) { // keep keyboard focus on the chip and announce how many sheets are shown
      state.filter = el.dataset.filter; render(true);
      var fc = app.querySelector('[data-filter="' + state.filter + '"]'); if (fc) fc.focus({ preventScroll: true });
      var fo = document.getElementById('find-out'), fg = document.getElementById('find-grid');
      if (fo && !state.q.trim() && fg) fo.textContent = t().sl.shownN.replace('{n}', fg.querySelectorAll('.nk-sheet:not([hidden])').length);
      return; }
    if (el.dataset.relCat) { state.filter = el.dataset.relCat; state.q = ''; return; }
    if (el.hasAttribute('data-rel-go')) { relToOrder(); return; }
    if (el.hasAttribute('data-share-copy')) { shareCopy(); return; }
    if (el.hasAttribute('data-share-no')) { shareCopy(true); return; } // Share & link package (2026-11-01): copy the sheet number
    if (el.hasAttribute('data-tl-fold')) { tlSetFold(el.getAttribute('data-tl-fold'), el.getAttribute('aria-expanded') !== 'true'); return; } // Services on the phone (2026-11-20)
    if (el.hasAttribute('data-tl-all')) { tlAll(); return; }
    if (el.hasAttribute('data-tl-copy')) { tlCopy(el); return; } // SEO package (2026-11-02): copy a tool's address
    if (el.hasAttribute('data-find-copy')) { findShareCopy(); return; }
    if (el.hasAttribute('data-rg-view')) { rgView(el.getAttribute('data-rg-view')); return; }
    if (el.hasAttribute('data-rg-sort')) { rgSort(el.getAttribute('data-rg-sort')); return; }
    if (el.hasAttribute('data-rg-sl')) { rgStar(el.getAttribute('data-rg-sl')); return; }
    if (el.hasAttribute('data-rg-copy')) { rgCopy(); return; }
    if (el.hasAttribute('data-feed-copy')) { feedCopy(); return; }
    if (el.hasAttribute('data-qr-svg')) { qrDl(el, 'svg'); return; } // QR package (2026-11-03)
    if (el.hasAttribute('data-qr-vcf')) { qrDl(el, 'vcf'); return; }
    if (el.hasAttribute('data-print')) { printSheet(); return; }
    if (el.hasAttribute('data-bp-print')) { printSheet(); return; }
    if (el.hasAttribute('data-ps-print')) { psPrint(); return; }
    if (el.hasAttribute('data-kbd')) { kbdOpen(); return; }
    if (el.hasAttribute('data-vw')) { vwOpen(); return; } // Sheet settings (2026-11-21)
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
  app.addEventListener('input', function (ev) { var v3 = ev.target.dataset && ev.target.dataset.v3Cut; if (v3) { v3Set(v3, 'cut', ev.target.value); return; } var sf = ev.target.dataset && ev.target.dataset.stF; if (sf) { state.st[sf] = ev.target.value; if (sf === 'l' || sf === 'w' || sf === 'h') stDims3d(); stSheetShow(); return; } var fk = ev.target.dataset && ev.target.dataset.f; if (fk && fk !== 'website' && page() === 'order') { state.order[fk] = ev.target.value; drSave(); ofInput(ev.target, fk); } if (ev.target.id === 'f-deadline') { state.order.deadline = ev.target.value; dlUpdate(); return; } if (ev.target.id === 'find-q') { state.q = ev.target.value; findApply(); return; } var pf = ev.target.dataset && ev.target.dataset.plF; if (pf && pf !== 'mat') { state.pl[pf] = ev.target.value; plUpdate(); return; } var k = ev.target.dataset && ev.target.dataset.fit; if (k) { state.fit[k] = ev.target.value; fitUpdate(); } });
  app.addEventListener('change', function (ev) {
    if (ev.target.hasAttribute('data-pf')) { pfToggle(ev.target); return; } // Studio profile NK-A (2026-11-25)
    if (ev.target.hasAttribute('data-dh-contact')) { state.dh.contact = ev.target.checked; if (!document.getElementById('dh-url').hidden) dhAct('fresh'); return; } // Draft hand-over (2026-11-19)
    if (ev.target.hasAttribute('data-fc-file')) { if (ev.target.files && ev.target.files[0]) fcRead(ev.target.files[0]); return; }
    if (ev.target.hasAttribute('data-bm-files')) { if (ev.target.files && ev.target.files.length) bmFiles(ev.target.files); return; } // Files → parts list (2026-11-10)
    if (ev.target.hasAttribute('data-st-file')) { if (ev.target.files && ev.target.files[0]) fcRead(ev.target.files[0]); return; }
    if (ev.target.hasAttribute('data-st-need')) { state.mp.needs[ev.target.value] = ev.target.checked; stSheetShow(); return; }
    if (ev.target.hasAttribute('data-st-axes')) { stAxes(ev.target.value); return; }
    if (ev.target.hasAttribute('data-fc-unit')) { state.fc.unit = ev.target.value; fcRefresh(); var fu = document.getElementById('fc-unit'); if (fu) fu.focus(); return; }
    if (ev.target.dataset.cmpSlot) { var cs = state.cmp.slice(), ck = +ev.target.dataset.cmpSlot; cs[ck] = ev.target.value; cmpSet(cs, '#cmp-' + ck); return; }
    if (ev.target.hasAttribute('data-ps-scope')) { state.ps.scope = ev.target.value; psSync(); return; }
    if (ev.target.dataset.plQ) { var hadReset = plDone() > 0; state.pl[{ q1: 'have', q2: 'kind', q3: 'back' }[ev.target.dataset.plQ]] = ev.target.value; if (!hadReset) plRefresh('input[name="' + ev.target.name + '"]:checked'); else plUpdate(); return; }
    if (ev.target.hasAttribute('data-mp-need')) { var mh = mpTicked().length > 0; state.mp.needs[ev.target.value] = ev.target.checked; if (mh !== mpTicked().length > 0) mpRefresh('[data-mp-need][value="' + ev.target.value + '"]'); else { var mo = document.getElementById('mp-out'); if (mo) mo.innerHTML = mpOut(); } return; }
    if (ev.target.hasAttribute('data-mp-pick')) { state.mp.pick = ev.target.value; var mo2 = document.getElementById('mp-out'); if (mo2) mo2.innerHTML = mpOut(); var mr = document.querySelector('#mp-out [data-mp-pick][value="' + state.mp.pick + '"]'); if (mr) mr.focus(); return; }
    if (ev.target.dataset.plF === 'mat') { state.pl.mat = +ev.target.value || 0; plUpdate(); return; }
    if (ev.target.dataset.psInc) { state.ps[ev.target.dataset.psInc] = ev.target.checked; psSync(); return; }
    if (ev.target.dataset.prepHave != null) { var it = prepItems()[+ev.target.dataset.prepHave]; if (it) { state.prep.have[it.id] = ev.target.checked; var po = document.getElementById('prep-out'); if (po) po.textContent = prepStatus(prepItems()); } return; }
    if (ev.target.dataset.ocHave != null) { var oi = ocItems()[+ev.target.dataset.ocHave]; if (oi) { state.prep.have[oi.id] = ev.target.checked; var oo = document.getElementById('oc-out'); if (oo) oo.textContent = ocStatus(ocItems()); eqFiles(ev.target); drSave(); } return; }
    if (ev.target.dataset.bmF === 'mat') { bmSet(+ev.target.dataset.bmI, 'mat', ev.target.value); return; } // Parts list NK-L (2026-11-05)
    var k = ev.target.dataset.svc; if (!k) return;
    var a = state.order.services, i = a.indexOf(k);
    if (ev.target.checked && i < 0) a.push(k); if (!ev.target.checked && i >= 0) a.splice(i, 1);
    if (a.length) state.errors = {};
    drSave();
  });
  app.addEventListener('input', function (ev) { var pbf = ev.target.dataset && ev.target.dataset.pbF; if (pbf) { state.pb[pbf] = ev.target.value; pbUpdate(); } }); // Batch on the plate (2026-10-30)
  app.addEventListener('input', function (ev) { var bk = ev.target.dataset && ev.target.dataset.bmF; if (bk && ev.target.tagName !== 'SELECT') { bmSet(+ev.target.dataset.bmI, bk, ev.target.value); return; } if (ev.target.hasAttribute && ev.target.hasAttribute('data-bm-gap')) { state.bm.gap = ev.target.value; state.bm.msg = ''; bmSave(); bmUpdate(); } }); // Parts list NK-L (2026-11-05)
  app.addEventListener('input', function (ev) { var k = ev.target.dataset && ev.target.dataset.giftF; if (k) { state.gift[k] = ev.target.value; if (state.gift.send === 'error') state.gift.send = 'idle'; giftRefresh(); } }); // Gift cards (2026-11-02)
  app.addEventListener('input', function (ev) { var k = ev.target.dataset && ev.target.dataset.qcF; if (k && ev.target.tagName !== 'SELECT') { state.qc[k] = ev.target.value; state.qc.src = ''; qcUpdate(); } }); // Quote estimate (2026-11-02)
  app.addEventListener('change', function (ev) { var d = ev.target.dataset || {}; if (d.qcK) { state.qc[d.qcK] = ev.target.checked ? 1 : 0; qcUpdate(true); } else if (d.qcF === 'mat') { state.qc.mat = ev.target.value; qcUpdate(); } });
  app.addEventListener('input', function (ev) { var k = ev.target.dataset && ev.target.dataset.srF; if (k && ev.target.tagName !== 'SELECT') { state.sr[k] = ev.target.value; if (k !== 'qty') state.sr.seeded = 0; srUpdate(); } }); // Series price NK-R (2026-11-15)
  app.addEventListener('change', function (ev) { var d = ev.target.dataset || {}; if (d.srF === 'mat') { state.sr.mat = ev.target.value; srUpdate(); } else if (ev.target.hasAttribute('data-sr-rush')) { state.sr.rush = ev.target.checked ? 1 : 0; srUpdate(); } });
  app.addEventListener('input', function (ev) { var k = ev.target.dataset && ev.target.dataset.scF; if (k === 'from' || k === 'due') { state.sc[k] = ev.target.value; state.sc.seeded = 0; scUpdate(); } }); // Schedule NK-T (2026-11-18)
  app.addEventListener('input', function (ev) { var k = ev.target.dataset && ev.target.dataset.mxF; if (k && ev.target.tagName !== 'SELECT') { state.mx[k] = ev.target.value; state.mx.seeded = 0; mxUpdate(); } }); // Material price NK-V (2026-11-17, second run)
  app.addEventListener('change', function (ev) { var d = ev.target.dataset || {}; if (d.mxF === 'mat') { state.mx.mat = ev.target.value; state.mx.pick = ''; mxUpdate(); } else if (ev.target.hasAttribute('data-mx-rush')) { state.mx.rush = ev.target.checked ? 1 : 0; mxUpdate(); } else if (ev.target.hasAttribute('data-mp-need')) { mxUpdate(); } }); // data-mp-need: the ● / ✕ marks follow the material picker
  app.addEventListener('input', function (ev) { var k = ev.target.dataset && ev.target.dataset.bgF; if (k && ev.target.tagName !== 'SELECT') { state.bg[k] = ev.target.value; bgUpdate(); } }); // Budget NK-B (2026-11-17)
  app.addEventListener('change', function (ev) { var d = ev.target.dataset || {}; if (d.bgF === 'mat') { state.bg.mat = ev.target.value; bgUpdate(); } else if (d.bgK) { state.bg[d.bgK] = ev.target.checked ? 1 : 0; bgUpdate(); } });
  app.addEventListener('input', function (ev) { if (ev.target.hasAttribute('data-st-sp-deg')) { state.sp.deg = ev.target.value; spUpdate(); } }); // Support check (2026-10-31)
  app.addEventListener('input', function (ev) { if (ev.target.hasAttribute('data-st-wt-lim')) { state.wt.limit = ev.target.value; wtUpdate(); } }); // Wall thickness (2026-11-02)
  // File check: drop a file on the box; the views follow the light/dark theme.
  app.addEventListener('dragover', function (ev) { var d = ev.target.closest && ev.target.closest('#fc-drop, #bm-drop'); if (!d) return; ev.preventDefault(); d.classList.add('is-over'); });
  app.addEventListener('dragleave', function (ev) { var d = ev.target.closest && ev.target.closest('#fc-drop, #bm-drop'); if (d) d.classList.remove('is-over'); });
  app.addEventListener('drop', function (ev) { var d = ev.target.closest && ev.target.closest('#fc-drop, #bm-drop'); if (!d) return; ev.preventDefault(); d.classList.remove('is-over'); var fl = ev.dataTransfer && ev.dataTransfer.files; if (d.id === 'bm-drop') { if (fl && fl.length) bmFiles(fl); return; } if (fl && fl[0] && !state.fc.busy) fcRead(fl[0]); }); // #bm-drop: Files → parts list (2026-11-10)
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

  // ---------- Skills → proof package (#skills; 2026-11-12) ----------
  // Every term on the Skills page that the project sheets mention opens those sheets (#work?q=…) with their count, each
  // group ends with its service (code, turnaround) and its project categories / tools, a legend explains the underline.
  // Counts come from projects.json at view time; a term is a link only when a whole-word match exists and the #work
  // search (which matches parts of words) finds exactly the same sheets. Self-contained: remove SK_MAP … skLegend(),
  // put specs(g.items) back in views.skills, sk: in content.js and the "Skills → proof" rules in page.css.
  var SK_MAP = [{ svc: 'cad', cats: ['CAD', 'Mechanical'] }, { svc: 'iot', cats: ['IoT', 'Embedded'] }, { svc: 'print', tools: ['material', 'fit', 'plate'] }, {}];
  var skAny = false;
  function skCount(term) {
    var f = findFold(term).trim(); if (f.length < 2 || !/[a-z]/.test(f)) return 0;
    var re = new RegExp('(^|[^a-z0-9])' + f.replace(/[.*+?^${}()|[\]\\\/-]/g, '\\$&') + '($|[^a-z0-9])'), n = 0, loose = 0;
    PROJECTS.forEach(function (p) { var tx = findProjectText(p); if (findHit(tx, f)) loose++; if (re.test(tx)) n++; });
    return n && n === loose ? n : 0;
  }
  function skTerms(v) {
    var k = t().sk;
    return String(v).split(/( · |, )/).map(function (part, i) {
      if (i % 2) return esc(part);
      var n = skCount(part); if (!n) return esc(part);
      skAny = true;
      return '<a class="sk-term" href="#work?q=' + encodeURIComponent(part) + '">' + esc(part) + '<span class="sk-n" aria-hidden="true">' + n + '</span><span class="vh"> — ' + esc((n === 1 ? k.one : k.many).replace('{n}', n)) + '</span></a>';
    }).join('');
  }
  function skSpecs(items) { return '<dl class="nk-specs">' + items.map(function (i) { return '<div><dt>' + skTerms(L(i[0])) + '</dt><dd>' + skTerms(L(i[1])) + '</dd></div>'; }).join('') + '</dl>'; }
  function skFoot(i) {
    var m = SK_MAP[i] || {}, k = t().sk, a = [];
    var s = SERVICES.filter(function (v) { return v.key === m.svc; })[0];
    if (s) a.push('<a ' + ra('#s-' + s.id) + '><span class="nk-label">' + esc(s.code) + '</span> ' + esc(L(s.title)) + (s.time ? ' · ' + esc(L(s.time)) : '') + ' →</a>');
    (m.cats || []).forEach(function (c) { var n = PROJECTS.filter(function (p) { return p.category === c; }).length; if (n && CATS[c]) a.push('<a href="#work?cat=' + encodeURIComponent(c) + '">' + esc(k.cat.replace('{c}', CATS[c][lang]).replace('{n}', n)) + ' →</a>'); });
    (m.tools || []).forEach(function (tk) { var d = TL_TOOLS.filter(function (v) { return v[0] === tk; })[0]; if (d) a.push('<a href="' + tlHash(tk) + '">' + esc(t()[d[1]].title) + ' →</a>'); });
    return a.length ? '<p class="sk-foot"><span class="nk-label">' + esc(m.tools ? k.tools : k.proof) + '</span>' + a.join('') + '</p>' : '';
  }
  function skLegend() { var on = skAny; skAny = false; return on ? '<p class="sk-legend"><span class="sk-term sk-term--demo" aria-hidden="true">abc<span class="sk-n">3</span></span> ' + esc(t().sk.legend) + '</p>' : ''; }

  // ---------- Sheet → service & skills package (project sheets; 2026-11-14) ----------
  // The reverse of the Skills → proof links: a project sheet's spec table gets a "Service" row (the service behind the
  // sheet's discipline, with its code and published turnaround → #services) and a "Skills" row (the Skills-page terms
  // this sheet mentions; a term other sheets mention too opens those sheets with the count, then "All skills" → #skills).
  // "Start a project like this" ticks that service in the order form when none is ticked yet. Counts and terms come from
  // projects.json + SKILLS at view time. Self-contained: remove sdSvc() … sdRows(), the .replace(…sdRows(p)…) in
  // projectView(), the sdSvc line in relToOrder() and sd: in content.js.
  function sdSvc(p) { var k = ''; SK_MAP.forEach(function (m) { if ((m.cats || []).indexOf(p.category) >= 0) k = m.svc; }); return SERVICES.filter(function (v) { return v.key === k; })[0] || null; }
  function sdTerms(p) {
    var tx = findProjectText(p), out = [];
    SKILLS.forEach(function (g) { g.items.forEach(function (it) { [L(it[0]), L(it[1])].forEach(function (v) { String(v).split(/ · |, /).forEach(function (term) {
      var f = findFold(term).trim(); if (out.indexOf(term) >= 0 || !skCount(term)) return;
      if (new RegExp('(^|[^a-z0-9])' + f.replace(/[.*+?^${}()|[\]\\\/-]/g, '\\$&') + '($|[^a-z0-9])').test(tx)) out.push(term);
    }); }); }); });
    return out;
  }
  function sdRows(p) {
    var x = t().sd, s = sdSvc(p), a = sdTerms(p), h = '';
    if (s) h += '<div><dt>' + esc(x.svc) + '</dt><dd><a class="sk-term" ' + ra('#s-' + s.id) + '>' + esc(s.code + ' ' + L(s.title)) + '</a>' + (s.time ? ' · ' + esc(L(s.time)) : '') + '</dd></div>';
    if (a.length) h += '<div><dt>' + esc(x.skills) + '</dt><dd>' + a.map(function (term) { return skCount(term) > 1 ? skTerms(term) : esc(term); }).join(' · ') + ' · <a class="sk-term" href="#skills">' + esc(x.all) + ' →</a></dd></div>';
    skAny = false;
    return h;
  }

  // ---------- Service sheets / "Listi storitev" (#s-<id>, real pages /services/<id>/ + /sl/…; 2026-11-26) ----------
  // One sheet per service (S-01 … S-04) that puts everything the site already says about it in one place: what it is, what
  // the client gets and has to bring, turnaround, the running
  // promotion when it covers the service, how an order goes, the project sheets behind it (by discipline; for 3D printing
  // the sheets whose text mentions printing or a printing material), the skills group, the tools that go with it and the
  // other services. "Request a quote" ticks the service and opens the order form (hmGo). Every sheet is also a real page
  // with its own title, description, link preview and structured data (src/pages/services/[id].astro, `service` in Site.astro).
  // No rate on the sheet (Nace, 2026-11-27); no matching sheets → no work block. Nothing is stored or sent.
  // Self-contained: remove svById() … svCopy(), the 'service' lines in page() / pageTitle() / frame() / views, the data-sv-copy
  // line in the click handler, the ra('#s-…') links in service() / skFoot() / sdRows() / fxIndex() (back to '#services'),
  // sv: in content.js, the "Service sheets" block at the end of page.css, src/pages/services/[id].astro (+ /sl/), the
  // `service` parts of Site.astro, serviceCard in src/og/card.ts and the service paths in astro.config.mjs.
  var SV_TOOLS = { cad: ['plan', 'quote', 'budget', 'schedule'], print: ['fit', 'file', 'material', 'prep', 'plate', 'parts', 'series', 'matprice', 'quote', 'schedule'], iot: ['plan', 'quote', 'budget', 'schedule'], build: ['plan', 'quote', 'budget', 'schedule'] };
  function svById(id) { for (var i = 0; i < SERVICES.length; i++) if (SERVICES[i].id === id) return SERVICES[i]; return null; }
  function svMap(s) { var out = { cats: [], grp: -1 }; SK_MAP.forEach(function (m, i) { if (m.svc === s.key) { out.cats = m.cats || []; out.grp = i; } }); return out; }
  function svWork(s) { // the project sheets behind a service — only what the sheets themselves say
    var c = svMap(s).cats;
    if (c.length) return PROJECTS.filter(function (p) { return c.indexOf(p.category) >= 0; });
    if (s.key === 'print') return PROJECTS.filter(function (p) { return /(^|[^a-z0-9])(3d[- ]?print\w*|printed|natisnjen\w*|pla|petg|tpu|abs|asa|pa-cf|nylon|najlon\w*)($|[^a-z0-9])/.test(findProjectText(p)); });
    return [];
  }
  function svPromo(s) { var pm = promo(); if (!pm) return null; return pm.scope === 'cadprint' ? (s.key === 'cad' || s.key === 'print' ? pm : null) : pm.scope === 'print' ? (s.key === 'print' ? pm : null) : pm; }
  function svPrice(s) { // the rows of the price list that belong to this service ([] = nothing published, or the price list is switched off)
    if (!pcOn() || !PRICE_LIST) return []; // 2026-11-26 (Nace): the price list is off, so the sheet shows no price rows
    var x = t().pc, h = PRICE.hourly, rows = [];
    if (s.key === 'print') return pcPrintRows();
    if (+h[s.key] > 0) rows.push([L(s.title), x.perHour.replace('{n}', pcMoney(h[s.key]))]);
    return rows;
  }
  function svView() {
    var x = t(), v = x.sv, s = svById(currentSlug()), mp = svMap(s), work = svWork(s), price = svPrice(s), pm = svPromo(s);
    var li = function (a) { return '<ul class="sv-list">' + a.map(function (g) { return '<li><span>' + glAuto(g) + '</span></li>'; }).join('') + '</ul>'; }; // glAuto: Glossary NK-G (2026-11-27) — a term the glossary explains is a link to it
    var glance = [[x.sd.svc, s.code], [x.turnaround, s.time ? L(s.time) : x.onRequest]];
    var tools = (SV_TOOLS[s.key] || []).map(function (k) { return TL_TOOLS.filter(function (d) { return d[0] === k; })[0]; }).filter(Boolean);
    var grp = mp.grp >= 0 ? SKILLS[mp.grp] : null, url = siteUrl('services/' + s.id + '/');
    var notes = [];
    if (price.length) {
      if (s.key !== 'print' && +PRICE.minHours > 0) notes.push(x.pc.minHours.replace('{n}', PRICE.minHours));
      if (s.key === 'build' && L(PRICE.buildNote)) notes.push(L(PRICE.buildNote));
      if (s.key === 'print') notes.push(x.pc.printHow);
      if (L(PRICE.vatNote)) notes.push(L(PRICE.vatNote));
    }
    return '<section class="block first sv">' +
      '<a class="back" ' + ra('#services') + '>← ' + esc(v.back) + '</a>' +
      head(s.code + ' · ' + v.label, L(s.title), L(s.body), true) +
      '<div class="sv-grid"><div class="sv-main">' +
        '<div class="sv-cols"><div><h2 class="nk-label">' + esc(x.deliverables) + '</h2>' + li(L(s.get)) + '</div><div><h2 class="nk-label">' + esc(x.needs) + '</h2>' + li(L(s.need)) + '</div></div>' +
        (price.length || pm ? '<div class="sv-price">' + (price.length ? '<h2 class="nk-label">' + esc(v.price) + '</h2>' + specs(price) : '') +
          (pm ? '<p class="pc-promo"><span class="nk-tag nk-tag--rev">' + esc(x.pc.promoRow) + '</span> ' + esc(L(pm.title)) + (pm.until ? ' · ' + esc(x.promo.until.replace('{d}', pcDate(pm.until))) : '') + '</p>' : '') +
          notes.map(function (n) { return '<p class="pc-how">' + esc(n) + '</p>'; }).join('') +
          (pcOn() ? '<p class="sv-links"><a href="' + tlHash('quote') + '">' + esc(x.hm.est) + ' →</a>' + (PRICE_LIST ? '<a href="' + tlHash('prices') + '">' + esc(v.list) + ' →</a>' : '') + '</p>' : '') + '</div>' : '') +
      '</div><aside class="sv-side" aria-label="' + esc(v.glance) + '"><p class="nk-label">' + esc(v.glance) + '</p>' + specs(glance) +
        '<ul class="hm-ok">' + x.hm.ok.map(function (o) { return '<li>' + esc(o) + '</li>'; }).join('') + '</ul>' +
        '<div class="cta-row"><button type="button" class="nk-btn nk-btn--primary" data-hm-go="' + s.key + '">' + esc(x.quote) + '<span class="nk-btn__arrow" aria-hidden="true">→</span></button>' +
        (CONTACT_EMAIL ? '<a class="nk-btn" href="' + ctMail(v.subject + ': ' + s.code + ' ' + L(s.title)) + '">' + esc(x.ct.write) + '</a>' : '') + '</div>' +
        '<p class="sv-share"><button type="button" class="tb-copy" data-sv-copy="' + esc(url) + '">' + esc(v.copy) + '</button><span class="tl-msg" role="status" aria-live="polite"></span></p></aside></div></section>' +
      '<section class="block sv-how">' + head(x.hm.howLabel, v.how) + '<ol class="hm-steps">' + x.hm.how.map(function (st, i) { return '<li><span class="hm-n">' + String(i + 1).padStart(2, '0') + '</span><h3>' + esc(st[0]) + '</h3><p>' + esc(st[1]) + '</p></li>'; }).join('') + '</ol></section>' +
      (work.length ? '<section class="block sv-work">' + head((work.length === 1 ? x.sk.one : x.sk.many).replace('{n}', work.length), v.work, mp.cats.length ? v.workCats.replace('{c}', mp.cats.map(function (c) { return CATS[c][lang]; }).join(', ')) : v.workMats) +
        '<div class="grid-4 sheets">' + work.slice(0, 4).map(sheet).join('') + '</div><div class="more sv-more">' +
        (mp.cats.length ? mp.cats.map(function (c) { var n = PROJECTS.filter(function (p) { return p.category === c; }).length; return n ? btn(x.sk.cat.replace('{c}', CATS[c][lang]).replace('{n}', n), '#work?cat=' + encodeURIComponent(c), null, null, true) : ''; }).join('') : btn(x.seeWork + ' · ' + PROJECTS.length, '#work', null, null, true)) + '</div></section>' : '') +
      (grp ? '<section class="block sv-skills">' + head(x.nav.skills, grp[lang]) + '<div class="skill-group">' + skSpecs(grp.items) + '<p class="sk-foot"><a ' + ra('#skills') + '>' + esc(x.sd.all) + ' →</a></p></div>' + skLegend() + '</section>' : '') +
      (tools.length ? '<section class="block sv-tools">' + head(x.tl.home, v.tools, v.toolsLead) + '<ol class="tl-list sv-tl-list">' + tools.map(function (d) { return '<li><a class="tl-item" href="' + tlHash(d[0]) + '"><span class="nk-label">' + tlNo(TL_TOOLS.indexOf(d) + 1) + '</span><span class="tl-t">' + esc(x[d[1]].title) + '</span><span class="tl-d">' + esc(x.tl[d[0]]) + '</span><span class="tl-go" aria-hidden="true">→</span></a></li>'; }).join('') + '</ol></section>' : '') +
      '<section class="block sv-other">' + head('S-01 … S-0' + SERVICES.length, v.other) + '<nav class="sv-nav" aria-label="' + esc(v.other) + '">' + SERVICES.filter(function (o) { return o !== s; }).map(function (o) { var r = '';
        return '<a class="sv-o" ' + ra('#s-' + o.id) + '><span class="nk-service__code">' + o.code + '</span><span class="sv-o__t">' + esc(L(o.title)) + '</span><span class="sv-o__m">' + esc((o.time ? L(o.time) : x.onRequest) + (r ? ' · ' + r : '')) + '</span></a>'; }).join('') + '</nav></section>' +
      ctaBand();
  }
  function svCopy(b) {
    var url = b.getAttribute('data-sv-copy'), msg = b.parentNode.querySelector('.tl-msg'), x = t().tl;
    var fail = function () { if (msg) msg.textContent = x.copyFail; };
    try { navigator.clipboard.writeText(url).then(function () { if (msg) msg.textContent = x.copied; }, fail); } catch (e) { fail(); }
  }

  // ---------- Glossary NK-G / "Slovar" (#glossary, real pages /glossary/ + /sl/glossary/; 2026-11-27) ----------
  // The technical words a quote, a brief or this site uses (STEP, STL, FDM, PETG, tolerance, firmware …), each in a sentence
  // or two of plain language — GLOSSARY in content.js. Per term: other names, the definition, for a material the note of
  // the material picker, "On this site" (the tool, service sheet, Part studio or Skills page where the term matters, and the
  // project sheets that mention it — counted like the Skills → proof links) and "Copy link to this term"
  // (#glossary?t=<id> opens the page at that term). A search box and group chips filter the list in place; a link may carry
  // ?q=… and ?g=<group>. Entry points: the footer, the Skills page, Find anything (every term), the G key, and the "What you
  // get" / "What I need" lists on the service sheets, where a term the glossary explains is a link (glAuto()).
  // Nothing stored, nothing sent; the terms are general technical vocabulary, not statements about the studio.
  // Self-contained. To remove: this block (GL … glClick()), 'glossary' in PAGES / KBD_GO / RA_SEC / views and the two section
  // regexes at the top, the glossary line in page(), the glMount() line in render(), the glClick line in the click handler,
  // the gl-q line in the keydown handler, glLink() in frame() + views.skills, glAuto() in svView() (put esc(g) back), the GL
  // line in fxIndex(), gl: + nav.glossary + fx.groups.glossary + GLOSSARY in content.js, the "Glossary" rules in page.css,
  // `glossary` in SECTIONS / secTitle / secDesc / the snapshot / termsLd in Site.astro, the two src/pages/**/glossary/
  // files, the 'glossary' entries in src/pages/og/[...path].png.ts, src/og/card.ts and astro.config.mjs.
  var GL = (typeof GLOSSARY !== 'undefined' && Array.isArray(GLOSSARY) ? GLOSSARY : []).filter(function (g) { return g && /^[a-z0-9-]+$/.test(g.id) && g.t && g.d; });
  var GL_GROUPS = ['files', 'print', 'mat', 'cad', 'elec'].filter(function (k) { return GL.some(function (g) { return g.g === k; }); });
  state.gl = { q: '', g: 'all', t: '' };
  function glById(id) { for (var i = 0; i < GL.length; i++) if (GL[i].id === id) return GL[i]; return null; }
  function glRead(qs) { // #glossary?t=<term id>&q=<words>&g=<group>
    var get = function (k) { var m = new RegExp('(?:^|&)' + k + '=([^&]*)').exec(qs || ''); if (!m) return ''; try { return decodeURIComponent(m[1].replace(/\+/g, ' ')); } catch (e) { return ''; } };
    var tid = get('t'), g = get('g');
    state.gl.t = glById(tid) ? tid : '';
    state.gl.q = state.gl.t ? '' : get('q').slice(0, 60);
    state.gl.g = !state.gl.t && GL_GROUPS.indexOf(g) >= 0 ? g : 'all';
  }
  function glHref(id) { return 'href="' + (lang === 'sl' ? '/sl' : '') + '/glossary/#glossary?t=' + id + '" data-ra="#glossary?t=' + id + '"'; } // real address + in-app hash, like ra()
  function glLink(where) {
    if (!GL.length) return '';
    var g = t().gl;
    if (where === 'foot') return '<a class="mine-foot gl-foot" ' + ra('#glossary') + '>' + esc(g.foot) + '</a>';
    return '<p class="gl-in"><a ' + ra('#glossary') + '>' + esc(g.skLink) + ' →</a></p>';
  }
  function glKey(g) { return findFold([findBoth(g.t), (g.aka || []).join(' '), L(g.d), g.m ? t().mp.notes[g.m] || '' : ''].join(' ')); }
  function glGo(g) { // where the term matters on this site
    var x = t(), k = x.gl, a = [];
    (g.go || []).forEach(function (to) {
      var m;
      if ((m = /^tool:([a-z]+)$/.exec(to))) { var d = TL_TOOLS.filter(function (v) { return v[0] === m[1]; })[0]; if (d) a.push('<a href="' + tlHash(m[1]) + '"><span class="nk-label">' + esc(k.tool) + '</span> ' + esc(x[d[1]].title) + ' →</a>'); }
      else if ((m = /^s:([a-z0-9-]+)$/.exec(to))) { var s = svById(m[1]); if (s) a.push('<a ' + ra('#s-' + s.id) + '><span class="nk-label">' + esc(s.code) + '</span> ' + esc(L(s.title)) + ' →</a>'); }
      else if (to === 'studio') a.push('<a href="#studio"><span class="nk-label">' + esc(k.tool) + '</span> ' + esc(k.studio) + ' →</a>');
      else if (to === 'skills') a.push('<a ' + ra('#skills') + '>' + esc(k.skills) + ' →</a>');
    });
    var term = String(L(g.t)).replace(/\s*\(.*\)$/, ''), n = skCount(term);
    if (n) a.push('<a href="#work?q=' + encodeURIComponent(term) + '">' + esc((n === 1 ? k.sheets1 : k.sheetsN).replace('{n}', n)) + ' →</a>');
    return a.length ? '<p class="gl-go"><span class="nk-label">' + esc(k.here) + '</span>' + a.join('') + '</p>' : '';
  }
  function glTerm(g) {
    var x = t(), k = x.gl, note = g.m && x.mp && x.mp.notes ? x.mp.notes[g.m] : '';
    var aka = (g.aka || []).filter(function (n) { return n === n.toUpperCase() && findFold(L(g.t)).indexOf(findFold(n)) < 0; }).slice(0, 3); // shown: other abbreviations only (the rest of aka serves the search and glAuto)
    return '<div class="gl-term" id="gl-' + g.id + '" tabindex="-1" data-gl-g="' + g.g + '" data-gl-k="' + esc(glKey(g)) + '"><dt><span class="gl-t">' + esc(L(g.t)) + '</span>' +
      (aka.length ? '<span class="gl-aka">' + esc(k.also) + ': ' + esc(aka.join(', ')) + '</span>' : '') + '</dt>' +
      '<dd><p>' + esc(L(g.d)) + (note ? ' ' + esc(note) : '') + '</p>' + glGo(g) +
      '<p class="gl-act"><button type="button" class="tb-copy" data-gl-copy="' + g.id + '">' + esc(k.copy) + '<span class="vh"> — ' + esc(L(g.t)) + '</span></button><span class="tl-msg" role="status" aria-live="polite"></span></p></dd></div>';
  }
  function glView() {
    var x = t(), k = x.gl, st = state.gl;
    var chips = ['all'].concat(GL_GROUPS).map(function (c) {
      var n = c === 'all' ? GL.length : GL.filter(function (g) { return g.g === c; }).length;
      return '<button type="button" class="chip" data-gl-grp="' + c + '" aria-pressed="' + (st.g === c) + '">' + esc(c === 'all' ? k.all : k.groups[c]) + ' <span>' + n + '</span></button>';
    }).join('');
    var mail = CONTACT_EMAIL ? '<a class="nk-btn nk-btn--sm" href="mailto:' + esc(CONTACT_EMAIL) + '?subject=' + encodeURIComponent(k.mailSub + ' · nacekepa.work') + '">' + esc(k.mail) + '</a>' : '';
    return '<section class="block first gl">' + head(k.label, k.title, k.lead, true) +
      '<div class="find gl-find" role="search"><label class="nk-label" for="gl-q">' + esc(k.q) + '</label>' +
      '<div class="find-row"><input class="nk-input" id="gl-q" type="search" enterkeyhint="search" autocomplete="off" spellcheck="false" maxlength="60" placeholder="' + esc(k.ph) + '" value="' + esc(st.q) + '" aria-describedby="gl-out">' +
      '<button type="button" class="chip find-clear" data-gl-clear aria-label="' + esc(k.clear) + '"' + (st.q ? '' : ' hidden') + '>✕</button></div>' +
      '<div class="filters gl-filters" role="group" aria-label="' + esc(k.label.split(' · ')[0]) + '">' + chips + '</div>' +
      '<p class="nk-label find-out" id="gl-out" role="status" aria-live="polite"></p></div>' +
      GL_GROUPS.map(function (c) {
        return '<section class="gl-grp" data-gl-sec="' + c + '" aria-labelledby="gl-h-' + c + '"><h2 class="sub" id="gl-h-' + c + '">' + esc(k.groups[c]) + '</h2><dl class="gl-list">' + GL.filter(function (g) { return g.g === c; }).map(glTerm).join('') + '</dl></section>';
      }).join('') +
      '<p class="gl-none" id="gl-none" hidden>' + esc(k.none) + ' <button type="button" class="tb-copy" data-gl-clear>' + esc(k.clear) + '</button></p>' +
      '<div class="gl-ask"><h2 class="sub">' + esc(k.askT) + '</h2><p>' + esc(k.askB) + '</p><div class="cta-row">' + btn(k.order, '#order', 'primary', 'sm', true) + mail + '</div></div>' +
      '</section>' + ctaBand();
  }
  function glApply() { // filter the rendered list in place (no re-render, so the box keeps the caret)
    var box = app.querySelector('.gl'); if (!box) return;
    var st = state.gl, w = findFold(st.q).split(/\s+/).filter(Boolean), n = 0, k = t().gl;
    Array.prototype.forEach.call(box.querySelectorAll('.gl-term'), function (el) {
      var key = el.getAttribute('data-gl-k'), ok = (st.g === 'all' || el.getAttribute('data-gl-g') === st.g) && w.every(function (x) { return key.indexOf(x) >= 0; });
      el.hidden = !ok; if (ok) n++;
    });
    Array.prototype.forEach.call(box.querySelectorAll('.gl-grp'), function (sec) { sec.hidden = !sec.querySelector('.gl-term:not([hidden])'); });
    Array.prototype.forEach.call(box.querySelectorAll('[data-gl-grp]'), function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-gl-grp') === st.g)); });
    var none = document.getElementById('gl-none'), out = document.getElementById('gl-out'), clr = box.querySelector('.find-clear');
    if (none) none.hidden = n > 0;
    if (clr) clr.hidden = !st.q;
    if (out) out.textContent = (n === 1 ? k.count1 : k.countN).replace('{n}', n);
  }
  function glMount() {
    glApply();
    var st = state.gl; if (!st.t) return;
    var el = document.getElementById('gl-' + st.t); st.t = '';
    if (el) { el.classList.add('is-on'); el.scrollIntoView({ block: 'center' }); el.focus({ preventScroll: true }); }
  }
  function glClick(el) {
    if (el.hasAttribute('data-gl-grp')) { state.gl.g = el.getAttribute('data-gl-grp'); glApply(); return true; }
    if (el.hasAttribute('data-gl-clear')) { state.gl.q = ''; state.gl.g = 'all'; var q = document.getElementById('gl-q'); if (q) { q.value = ''; q.focus(); } glApply(); return true; }
    if (el.hasAttribute('data-gl-copy')) {
      var id = el.getAttribute('data-gl-copy'), msg = el.parentNode.querySelector('.tl-msg'), x = t().tl, url = siteUrl('glossary/#glossary?t=' + id);
      var fail = function () { if (msg) msg.textContent = x.copyFail; };
      try { navigator.clipboard.writeText(url).then(function () { if (msg) msg.textContent = x.copied; }, fail); } catch (e) { fail(); }
      return true;
    }
    return false;
  }
  app.addEventListener('input', function (ev) { if (ev.target && ev.target.id === 'gl-q') { state.gl.q = ev.target.value; glApply(); } });
  // glAuto(text) → escaped HTML in which the first mention of each glossary term is a link to it (service sheets).
  // A name written in capitals (STL, PC, PA …) must match in the same case; other names match in any case.
  var glRe = null, glNames = {};
  function glAuto(s) {
    s = String(s == null ? '' : s); if (!GL.length) return esc(s);
    if (!glRe) {
      var names = [];
      GL.forEach(function (g) { [g.t.en || g.t, g.t.sl || g.t].concat(g.aka || []).forEach(function (n) { n = String(n).replace(/\s*\(.*\)$/, ''); var kk = n.toLowerCase(); if (n.length < 2 || glNames[kk]) return; glNames[kk] = { id: g.id, n: n }; names.push(n); }); });
      names.sort(function (a, b) { return b.length - a.length; });
      glRe = new RegExp('(^|[^0-9A-Za-zÀ-ž])(' + names.map(function (n) { return n.replace(/[.*+?^${}()|[\]\\\/-]/g, '\\$&'); }).join('|') + ')(?![0-9A-Za-zÀ-ž])', 'gi');
    }
    var out = '', last = 0, seen = {}, m; glRe.lastIndex = 0;
    while ((m = glRe.exec(s))) {
      var hit = glNames[m[2].toLowerCase()];
      if (!hit || seen[hit.id] || (hit.n === hit.n.toUpperCase() && m[2] !== hit.n)) continue;
      seen[hit.id] = 1;
      var at = m.index + m[1].length;
      out += esc(s.slice(last, at)) + '<a class="gl-ref" ' + glHref(hit.id) + '>' + esc(m[2]) + '</a>';
      last = at + m[2].length;
    }
    return out + esc(s.slice(last));
  }

  // ---------- Find anything / "Poišči karkoli" (Ctrl / Cmd + K or the magnifier in the header; 2026-11-12) ----------
  // One box that finds every page, tool, service, project sheet, news post, skill and FAQ answer of the site (EN or SL
  // words, with or without č š ž) and opens it with Enter. Built from the data the site already renders; nothing leaves
  // the browser. Self-contained: remove fxBtn() … fxKey(), the fxBtn() call in frame(), the data-fx line in the click
  // handler, the fxKey(ev) line in the keydown handler, the fxClose hashchange listener, the 'Ctrl K' row in kbdRows(),
  // fx: in both languages in content.js and the "Find anything" rules in page.css.
  var fxItems = [], fxShown = [], fxAt = 0, fxRecent = []; // fxRecent: the last five picks of this visit (memory only), shown on the empty box
  function fxBtn() {
    var f = t().fx;
    return '<button type="button" class="fx-open" data-fx aria-haspopup="dialog" aria-keyshortcuts="Control+K Meta+K" aria-label="' + esc(f.btn) + '" title="' + esc(f.btn) + ' (Ctrl K)">' +
      '<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" focusable="false"><circle cx="6.5" cy="6.5" r="4.5" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M10 10l4.5 4.5" fill="none" stroke="currentColor" stroke-width="1.5"/></svg><kbd aria-hidden="true">K</kbd></button>';
  }
  function fxIndex() {
    var x = t(), f = x.fx, a = [];
    function add(g, title, sub, href, kw, tag, act) { if (title) a.push({ g: g, t: String(title), s: sub || '', h: href, tag: tag || '', act: act, ft: findFold(title), fk: findFold([sub, kw, tag].join(' ')) }); }
    [['home', x.nav.home], ['services', x.nav.services], ['work', x.nav.work], ['news', NEWS.length ? x.nav.news : ''], ['skills', x.nav.skills], ['about', x.nav.about], ['contact', f.contact],
      ['order', x.cta], ['compare', PROJECTS.length > 1 ? x.nav.compare : ''], ['gift', giftOn() ? x.nav.gift : ''], ['mine', x.nav.mine]].forEach(function (p) { add('pages', p[1], '', '#' + p[0], [p[0], T.en.nav[p[0]], T.sl.nav[p[0]], p[0] === 'order' ? T.en.cta + ' ' + T.sl.cta : '', p[0] === 'contact' ? 'kontakt e-mail e-posta LinkedIn Škofja Loka' : ''].join(' ')); });
    add('pages', x.pf.label.split(' · ')[0], x.pf.fx, '#profile', 'profile profil studio one page pager en list a4 pdf capability capabilities statement company predstavitev podjetja zmogljivosti nabava purchasing forward posreduj print natisni NK-A'); // Studio profile NK-A (2026-11-25)
    TL_TOOLS.forEach(function (d, i) { add('tools', x[d[1]].label.split(' · ')[0], x[d[1]].title + ' — ' + x.tl[d[0]], tlHash(d[0]), [d[0], T.en[d[1]].label, T.en[d[1]].title, T.sl[d[1]].label, T.sl[d[1]].title].join(' '), tlNo(i + 1)); });
    add('tools', x.st.label.split(' · ')[0], x.st.title + ' — ' + x.st.tlLine, '#studio', [T.en.st.label, T.en.st.title, T.sl.st.label, T.sl.st.title].join(' '), tlNo(TL_TOOLS.length + 1));
    SERVICES.forEach(function (s) { add('services', L(s.title), L(s.body), '#s-' + s.id, findBoth(s.title) + ' ' + T.en.sv.label + ' ' + T.sl.sv.label + ' ' + L(s.get).join(' ') + ' ' + (s.time ? L(s.time) : ''), s.code); });
    PROJECTS.forEach(function (p) { add('projects', P(p, 'title'), P(p, 'description'), '#p-' + p.slug, [findBoth(p.title), findBoth(p.description), findBoth(p.details), p.category, cat(p), p.materials, p.year].join(' '), sheetNo(p)); });
    NEWS.forEach(function (n) { add('news', P(n, 'title'), P(n, 'summary'), '#n-' + n.slug, [findBoth(n.title), findBoth(n.summary), findBoth(n.body)].join(' '), fmtDate(n.date)); });
    if (GL.length) { add('pages', x.nav.glossary, x.gl.fxS, '#glossary', 'glossary slovar terms izrazi dictionary slovarcek pojmi meaning pomen what is kaj je kaj pomeni NK-G'); GL.forEach(function (g) { add('glossary', L(g.t), L(g.d), '#glossary?t=' + g.id, [findBoth(g.t), (g.aka || []).join(' '), findBoth(g.d), T.en.gl.groups[g.g], T.sl.gl.groups[g.g], 'glossary slovar term izraz what is kaj je kaj pomeni'].join(' '), ''); }); } // Glossary NK-G (2026-11-27)
    SKILLS.forEach(function (g) { g.items.forEach(function (it) { add('skills', L(it[0]), L(it[1]), '#skills', g[lang] + ' ' + findBoth(it[0]) + ' ' + findBoth(it[1]), ''); }); });
    // Search package (2026-11-13): the materials of the material picker (no price per gram — Nace, 2026-11-27) and, while PRICE_LIST is on, the rows of the price list.
    MP_MATS.forEach(function (m) {
      add('materials', m.name, x.mp.notes[m.id], tlHash('material'), [T.en.mp.label, T.sl.mp.label, T.en.mp.title, T.sl.mp.title, T.en.mp.notes[m.id], T.sl.mp.notes[m.id], 'material filament'].join(' '), '', function () { state.mp.pick = m.id; /* pre-selected once the visitor ticks what the part must cope with */ if (location.hash === tlHash('material')) { render(true); tlGo('material'); } else location.hash = tlHash('material').slice(1); });
    });
    if (pcOn() && PRICE_LIST) {
      var pk = 'price prices cost rate cena cene cenik postavka koliko stane ', pr = PRICE.print, ph = PRICE.hourly, vat = String(L(PRICE.vatNote) || '').split('. ')[0].replace(/\.$/, '');
      var prow = function (title, val, kw, tag) { add('prices', title, val + (vat ? ' · ' + vat : ''), tlHash('prices'), pk + kw, tag); };
      SERVICES.forEach(function (sv) { if (sv.key !== 'print' && +ph[sv.key] > 0) prow(L(sv.title), x.pc.perHour.replace('{n}', pcMoney(ph[sv.key])), findBoth(sv.title), sv.code); });
      [['machine', +pr.machineHour > 0 && x.pc.perHour.replace('{n}', pcMoney(pr.machineHour))], ['setup', +pr.setup > 0 && pcMoney(pr.setup) + ' ' + x.pc.perOrder], ['minPart', +pr.minPart > 0 && pcMoney(pr.minPart)], ['minOrder', +pr.minOrder > 0 && pcMoney(pr.minOrder)],
        ['post', +ph.post > 0 && x.pc.perHour.replace('{n}', pcMoney(ph.post))], ['rush', +pr.rushPct > 0 && '+' + pr.rushPct + ' %']].forEach(function (r) { if (r[1]) prow(x.pc.printing + ' · ' + x.pc[r[0]], r[1], T.en.pc[r[0]] + ' ' + T.sl.pc[r[0]] + ' ' + T.en.pc.printing + ' ' + T.sl.pc.printing, ''); });
    }
    (SET.faq || []).filter(function (q) { return q && q.q && L(q.q) && q.a && L(q.a); }).forEach(function (q, i) { add('faq', L(q.q), L(q.a).replace(/\s+/g, ' '), '#services', '', '', function () { fxFaq(i); }); });
    add('actions', lang === 'en' ? 'Slovenščina' : 'English', x.keys.lang, '', 'language jezik slovensko english anglesko', 'L', function () { lang = lang === 'en' ? 'sl' : 'en'; try { localStorage.setItem('nk-lang', lang); } catch (e) {} langHash(); langPath(); render(true); });
    add('actions', x.keys.btn, x.keys.title, '', 'keyboard tipkovnica', '?', kbdOpen);
    if (VW) add('actions', x.vw.btn, x.vw.fxS, '', 'theme dark light mode tema temno svetlo temni svetli nacin barve colours colors text size font velikost besedila pisava contrast kontrast grid mreza motion animation gibanje animacije display prikaz settings nastavitve accessibility dostopnost', 'D', vwOpen); // Sheet settings (2026-11-21)
    if (VW) { // Sheet settings everywhere package (2026-11-24): one-step display actions — only the ones that would change something
      var vc = VW.read(), vf = x.vw.fx, vk = ' sheet settings nastavitve lista display prikaz ';
      if (vc.theme !== 'dark') add('actions', vf.dark, vf.now, '', 'dark mode night theme temno temni nacin tema noc crno black' + vk, '', function () { vwSet('theme', 'dark'); });
      if (vc.theme !== 'light') add('actions', vf.light, vf.now, '', 'light mode day theme svetlo svetli nacin tema dan belo white' + vk, '', function () { vwSet('theme', 'light'); });
      if (vc.theme !== 'auto') add('actions', vf.auto, vf.now, '', 'device system auto theme colours colors barve naprava sistem samodejno tema' + vk, '', function () { vwSet('theme', 'auto'); });
      if (vc.size !== '125') add('actions', vf.big, vf.now, '', 'larger bigger text size font zoom vecje besedilo velikost pisava povecaj crke' + vk, '', function () { vwSet('size', '125'); });
      if (vc.spacing !== 'wide') add('actions', vf.wide, vf.now, '', 'line spacing reading wider razmik vrstic branje sirse' + vk, '', function () { vwSet('spacing', 'wide'); });
      if (VW_KEYS.some(function (k) { return vc[k] !== VW.OPT[k][0]; })) add('actions', x.vw.reset, vf.now, '', 'reset standard default ponastavi obicajno privzeto' + vk, '', function () { vwSet(); });
    }
    if (PROJECTS.length) add('actions', x.pz.fxT, x.pz.fxS, '', 'presentation present slideshow slides predstavitev predstavi diaprojekcija', '▶', function () { pzOpen('all'); }); // Presentation (2026-11-13)
    if (CONTACT_EMAIL) add('actions', f.mail, CONTACT_EMAIL, '', 'email e-mail mail e-posta posta pisi write', '', function () { location.href = 'mailto:' + CONTACT_EMAIL; });
    return a;
  }
  // Search package (2026-11-13): the #work search found nothing, but the rest of the site (tools, prices, materials, services,
  // skills, pages, answers) may have it — a button with the count that opens this box with the same words.
  function fxElse(q) {
    var w = findFold(q).split(/\s+/).filter(Boolean); if (!w.length) return '';
    var n = fxIndex().filter(function (it) { return it.g !== 'projects' && it.g !== 'news' && it.g !== 'actions' && fxScore(it, w); }).length;
    return n ? '<button type="button" class="nk-btn" data-fx="' + esc(q) + '" aria-haspopup="dialog">' + esc(t().fx.elsewhere.replace('{n}', n)) + '</button>' : '';
  }
  function fxFaq(i) {
    var go = function () { var el = document.querySelectorAll('#faq .faq-item')[i]; if (!el) return; el.open = true; el.scrollIntoView({ block: 'center' }); var s = el.querySelector('summary'); if (s) s.focus({ preventScroll: true }); };
    if (page() === 'services' && !state.tool) go(); else { location.hash = 'services'; setTimeout(go, 250); } // after the view is drawn and navFocus() has run
  }
  function fxScore(it, w) {
    var sc = 0;
    for (var i = 0; i < w.length; i++) {
      var q = w[i], p = it.ft.indexOf(q);
      if (p === 0) sc += 8; else if (p > 0 && /[^a-z0-9]/.test(it.ft.charAt(p - 1))) sc += 5; else if (p > 0) sc += 3; else if (it.fk.indexOf(q) >= 0) sc += 1; else return 0;
    }
    return sc;
  }
  function fxMark(s, w) { // underline the typed words in a title; the folded text has the same length as the original
    var f = findFold(s), on = [], out = '', i;
    if (f.length !== s.length) return esc(s);
    w.forEach(function (q) { var p = f.indexOf(q); while (p >= 0) { for (i = p; i < p + q.length; i++) on[i] = 1; p = f.indexOf(q, p + q.length); } });
    for (i = 0; i < s.length; i++) out += (on[i] && !on[i - 1] ? '<mark>' : '') + esc(s.charAt(i)) + (on[i] && !on[i + 1] ? '</mark>' : '');
    return out;
  }
  function fxDraw() {
    var d = document.getElementById('fx'); if (!d) return;
    var f = t().fx, inp = d.querySelector('#fx-q'), box = d.querySelector('#fx-list'), out = d.querySelector('#fx-out');
    var q = inp.value.trim(), w = findFold(q).split(/\s+/).filter(Boolean), groups = {}, order = [], html = '', n = 0, total = 0;
    fxShown = [];
    fxItems.forEach(function (it, i) {
      var sc = w.length ? fxScore(it, w) : (it.g === 'pages' || it.g === 'tools' ? 1 : 0); if (!sc) return;
      if (!groups[it.g]) { groups[it.g] = []; order.push(it.g); }
      groups[it.g].push({ it: it, sc: sc, i: i }); total++;
    });
    if (!w.length) { // Search package (2026-11-13): what this visitor opened from the box earlier in the visit
      var rc = fxRecent.map(function (r) { return fxItems[r.i] && fxItems[r.i].g === r.g ? { it: fxItems[r.i], sc: 1, i: r.i } : null; }).filter(Boolean);
      if (rc.length) { groups.recent = rc; order.unshift('recent'); }
    }
    if (w.length) {
      order.forEach(function (g) { groups[g].sort(function (a, b) { return b.sc - a.sc || a.i - b.i; }); });
      order.sort(function (a, b) { return groups[b][0].sc - groups[a][0].sc; });
    }
    order.forEach(function (g) {
      var list = groups[g], cap = w.length ? 5 : 20, more = list.length - cap;
      html += '<div role="group" aria-labelledby="fx-g-' + g + '"><p class="nk-label fx-g" id="fx-g-' + g + '">' + esc(f.groups[g]) + ' · ' + list.length + '</p>';
      list.slice(0, cap).forEach(function (r) {
        html += '<div class="fx-o" role="option" id="fx-o-' + n + '" data-fx-i="' + n + '" aria-selected="false"><span class="fx-t">' + fxMark(r.it.t, w) + '</span>' + (r.it.tag ? '<span class="nk-label fx-tag">' + esc(r.it.tag) + '</span>' : '') + (r.it.s ? '<span class="fx-s">' + fxMark(r.it.s, w) + '</span>' : '') + '</div>';
        fxShown.push(r.it); n++;
      });
      if (more > 0 && (g === 'projects' || g === 'news')) {
        html += '<div class="fx-o fx-o--more" role="option" id="fx-o-' + n + '" data-fx-i="' + n + '" aria-selected="false"><span class="fx-t">' + esc(f.more.replace('{n}', more)) + ' →</span></div>';
        fxShown.push({ h: '#work?q=' + encodeURIComponent(q) }); n++;
      }
      html += '</div>';
    });
    if (!n) html = '<p class="fx-none">' + esc(f.none.replace('{q}', q)) + '</p><div class="fx-o" role="option" id="fx-o-0" data-fx-i="0" aria-selected="false"><span class="fx-t">' + esc(f.ask) + ' →</span><span class="fx-s">' + esc(f.askSub) + '</span></div>';
    if (!n) fxShown.push({ h: '#order' });
    box.innerHTML = html; box.scrollTop = 0;
    out.textContent = w.length ? (total ? (total === 1 ? f.count1 : f.count).replace('{n}', total) : f.none.replace('{q}', q)) : '';
    out.classList.toggle('vh', !n); // the same sentence is on screen in the list
    fxSel(0);
  }
  function fxSel(i, scroll) {
    var d = document.getElementById('fx'); if (!d || !fxShown.length) return;
    fxAt = (i + fxShown.length) % fxShown.length;
    Array.prototype.forEach.call(d.querySelectorAll('.fx-o'), function (el) { var on = +el.getAttribute('data-fx-i') === fxAt; el.setAttribute('aria-selected', on); if (on && scroll) el.scrollIntoView({ block: 'nearest' }); });
    d.querySelector('#fx-q').setAttribute('aria-activedescendant', 'fx-o-' + fxAt);
  }
  function fxPick(i) {
    var it = fxShown[i]; if (!it) return;
    var ri = fxItems.indexOf(it); if (ri >= 0 && it.g !== 'actions') fxRecent = [{ i: ri, g: it.g }].concat(fxRecent.filter(function (r) { return r.i !== ri; })).slice(0, 5);
    var d = document.getElementById('fx'); if (d) { d.fxBack = null; d.close(); }
    if (it.act) { it.act(); return; }
    var h = it.h.slice(1);
    if (hashPath().replace(/^(en|sl)-?/, '') === h) { window.scrollTo(0, 0); var mn = document.getElementById('main'); if (mn) mn.focus({ preventScroll: true }); }
    else location.hash = h;
  }
  function fxClose() { var d = document.getElementById('fx'); if (d && d.open) d.close(); else if (d) d.remove(); }
  function fxOpen(q) { // q (optional): start with these words typed
    if (document.getElementById('fx')) return;
    kbdClose();
    var f = t().fx, d = document.createElement('dialog');
    d.id = 'fx'; d.className = 'kbd fx'; d.setAttribute('aria-labelledby', 'fx-l'); d.lang = lang;
    d.fxBack = document.activeElement;
    d.innerHTML = '<div class="kbd-head"><label class="nk-label" id="fx-l" for="fx-q">' + esc(f.label) + '</label><button type="button" class="chip kbd-x" data-fx-close aria-label="' + esc(t().keys.close) + '">✕</button></div>' +
      '<input class="nk-input" id="fx-q" type="search" role="combobox" aria-expanded="true" aria-controls="fx-list" aria-autocomplete="list" aria-describedby="fx-out" enterkeyhint="go" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="' + esc(f.ph) + '">' +
      '<div class="fx-list" id="fx-list" role="listbox" aria-labelledby="fx-l" tabindex="-1"></div>' +
      '<p class="nk-label fx-out" id="fx-out" role="status" aria-live="polite"></p>' +
      '<p class="kbd-note fx-keys"><kbd>↑</kbd> <kbd>↓</kbd> ' + esc(f.kMove) + ' · <kbd>Enter</kbd> ' + esc(f.kOpen) + ' · <kbd>Esc</kbd> ' + esc(t().keys.close.toLowerCase()) + '</p>';
    var inp = d.querySelector('#fx-q');
    d.addEventListener('click', function (e) {
      if (e.target === d || e.target.closest('[data-fx-close]')) { d.close(); return; }
      var o = e.target.closest('.fx-o'); if (o) fxPick(+o.getAttribute('data-fx-i'));
    });
    d.addEventListener('mousemove', function (e) { var o = e.target.closest && e.target.closest('.fx-o'); if (o && +o.getAttribute('data-fx-i') !== fxAt) fxSel(+o.getAttribute('data-fx-i')); });
    inp.addEventListener('input', fxDraw);
    inp.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); fxSel(fxAt + (e.key === 'ArrowDown' ? 1 : -1), true); }
      else if (e.key === 'Enter') { e.preventDefault(); fxPick(fxAt); }
      else if (e.key === 'Escape' && inp.value) { e.preventDefault(); inp.value = ''; fxDraw(); } // first Esc clears, the second closes
    });
    d.addEventListener('close', function () { var b = d.fxBack; d.remove(); if (b && b.focus && document.contains(b)) b.focus(); else if (b) { var o = document.querySelector('.fx-open'); if (o) o.focus(); } });
    document.body.appendChild(d);
    fxItems = fxIndex();
    try { d.showModal(); } catch (e) { d.setAttribute('open', ''); }
    if (typeof q === 'string' && q) inp.value = q.slice(0, 100);
    fxDraw(); inp.focus();
  }
  // Ctrl / Cmd + K from anywhere (also while typing in a field); not in the photo viewer. Returns true when handled.
  function fxKey(ev) {
    if (!(ev.ctrlKey || ev.metaKey) || ev.altKey || ev.shiftKey || !ev.key || ev.key.toLowerCase() !== 'k' || lb) return false;
    ev.preventDefault();
    if (document.getElementById('fx')) fxClose(); else fxOpen();
    return true;
  }
  // ---------- Presentation / "Predstavitev" (2026-11-13) ----------
  // The project sheets one at a time on the whole screen — for a meeting, a second screen or a phone handed across the
  // table. "Present" in the View row of #work shows the sheets the page shows right now (category filter + search, the
  // register's sort order), the shortlist has its own "Present" button, Find anything has "Present the work", and a link
  // (#work?cat=IoT&show=1 or &show=<slug>) opens it directly. ← → / PageUp PageDown / Space / swipe move, Home / End
  // jump, A = auto-advance (off by default), F = full screen, S = shortlist star, Esc closes. Built only from
  // projects.json (photo or drawing, sheet number, discipline, year, title, description, materials / details when Nace
  // has filled them in); nothing is stored or sent. Self-contained: remove PZ_SECS … pzKey(), the pzBtn() call in rgBar(),
  // the pzSync() call in findApply(), the data-pz button in slBox(), the `show` line in findRead(), the state.pzGo line in
  // render(), the data-pz line in the click handler, the pzKey(ev) line in the keydown handler, the pzClose hashchange
  // listener, the "Present the work" action in fxIndex(), pz: in both languages in content.js and the "Presentation"
  // rules in page.css.
  var PZ_SECS = 8, pz = null;
  function pzList(src) {
    if (src === 'sl') return slRead().map(bySlug).filter(Boolean);
    if (src === 'sx') return sxList(); // Shared selection (2026-11-14)
    if (src !== 'work') return PROJECTS.slice();
    var q = state.q.trim();
    return (rgOn() ? rgSorted() : PROJECTS).filter(function (p) { return (state.filter === 'all' || (state.filter === '3d' ? !!p.model : p.category === state.filter)) && (!q || findHit(findProjectText(p), q)); });
  }
  function pzBtn() {
    var x = t().pz, n = pzList('work').length;
    return '<button type="button" class="chip pz-open" data-pz="work" aria-haspopup="dialog" title="' + esc(x.btnT) + '"' + (n ? '' : ' disabled') + '><span class="rg-ico" aria-hidden="true">▶</span>' + esc(x.btn) + ' <span id="pz-n">' + n + '</span></button>';
  }
  function pzSync() { var b = app.querySelector('.pz-open'), n = pzList('work').length; if (!b) return; b.disabled = !n; var s = b.querySelector('#pz-n'); if (s) s.textContent = n; }
  function pzName() {
    var x = t().pz, s = pz.src, q = state.q.trim();
    if (s !== 'work') return x.sets[s] || x.sets.all;
    return (state.filter === 'all' ? x.sets.all : state.filter === '3d' ? t().with3d : CATS[state.filter][lang]) + (q ? ' · “' + q + '”' : '');
  }
  function pzSlide() {
    var x = t().pz, p = pz.list[pz.at], rows = [], d = P(p, 'details'), on = slRead().indexOf(p.slug) >= 0;
    if (p.materials) rows.push([t().pMaterials, p.materials]);
    if (p.model) rows.push([t().pModel, t().interactive]);
    if (p.photos && p.photos.length > 1) rows.push([t().photos, String(p.photos.length)]);
    return '<article class="pz-slide"><div class="nk-sheet__art pz-art">' + art(p, true) + '</div><div class="pz-text">' +
      '<p class="nk-label">' + sheetNo(p) + ' · ' + esc(cat(p)) + ' · ' + esc(p.year) + '</p><h2 class="pz-title" id="pz-t">' + esc(P(p, 'title')) + '</h2>' +
      '<p class="lead">' + esc(P(p, 'description')) + '</p>' + (rows.length ? specs(rows) : '') +
      (d ? '<div class="pz-details">' + d.split(/\n{2,}/).slice(0, 2).map(function (s) { return '<p>' + esc(s) + '</p>'; }).join('') + '</div>' : '') +
      '<div class="cta-row"><a class="nk-btn nk-btn--sm" ' + ra('#p-' + p.slug) + '>' + esc(x.open) + '<span class="nk-btn__arrow" aria-hidden="true">→</span></a>' +
      '<button type="button" class="nk-btn nk-btn--sm" data-pz-sl><span class="sl-star" aria-hidden="true">' + (on ? '★' : '☆') + '</span>' + esc(on ? t().sl.remove : t().sl.add) + '</button></div></div></article>';
  }
  function pzDraw(say) {
    var d = document.getElementById('pz'); if (!d || !pz) return;
    var x = t().pz, n = pz.list.length, p = pz.list[pz.at], pos = String(pz.at + 1).padStart(2, '0') + ' / ' + String(n).padStart(2, '0');
    d.querySelector('#pz-stage').innerHTML = pzSlide(); d.querySelector('#pz-stage').scrollTop = 0;
    d.querySelector('#pz-count').textContent = pos;
    Array.prototype.forEach.call(d.querySelectorAll('.pz-ticks i'), function (el, i) { el.className = i === pz.at ? 'on' : i < pz.at ? 'past' : ''; });
    if (say !== false) d.querySelector('#pz-live').textContent = x.live.replace('{i}', pz.at + 1).replace('{n}', n).replace('{t}', P(p, 'title'));
    d.querySelector('#pz-msg').textContent = '';
  }
  function pzGo(i, keepAuto) {
    if (!pz) return; var n = pz.list.length;
    pz.at = ((i % n) + n) % n; pzDraw();
    if (pz.timer && !keepAuto) pzAuto(true); // a manual step restarts the countdown
  }
  function pzAuto(on) {
    var d = document.getElementById('pz'); if (!pz || !d) return;
    if (pz.timer) { clearInterval(pz.timer); pz.timer = 0; }
    if (on && pz.list.length > 1) pz.timer = setInterval(function () { pzGo(pz.at + 1, true); }, PZ_SECS * 1000);
    var b = d.querySelector('[data-pz-auto]'); if (b) b.setAttribute('aria-pressed', !!pz.timer);
  }
  function pzFull() {
    var d = document.getElementById('pz'); if (!d || !d.requestFullscreen) return;
    try { if (document.fullscreenElement) document.exitFullscreen(); else { var r = d.requestFullscreen(); if (r && r.catch) r.catch(function () {}); } } catch (e) {}
  }
  function pzLink() { var p = pz.list[pz.at], q = pz.src === 'work' ? findQuery(true) : ''; if (pz.src === 'sl' || pz.src === 'sx') return sxUrl(pz.list.map(function (v) { return v.slug; }), p.slug); return siteUrl('#work' + q + (q ? '&' : '?') + 'show=' + encodeURIComponent(p.slug)); }
  function pzCopy() {
    var d = document.getElementById('pz'), msg = d.querySelector('#pz-msg'), x = t().pz, url = pzLink();
    var fail = function () { msg.textContent = x.copyFail + ' ' + url; };
    try { navigator.clipboard.writeText(url).then(function () { msg.textContent = x.copied; }, fail); } catch (e) { fail(); }
  }
  function pzStar() {
    var p = pz.list[pz.at], a = slRead(), i = a.indexOf(p.slug), x = t().sl, d = document.getElementById('pz');
    if (i < 0) a.push(p.slug); else a.splice(i, 1);
    slSave(a); pz.dirty = true; pzDraw(false);
    var b = d.querySelector('[data-pz-sl]'); if (b) b.focus();
    d.querySelector('#pz-msg').textContent = i < 0 ? x.added.replace('{n}', a.length) : x.removed;
  }
  function pzClose(ev) { var d = document.getElementById('pz'); if (!d) return; if (pz && ev && ev.type === 'hashchange') { if (location.href === pz.href) return; pz.nav = true; } if (d.open) d.close(); else d.remove(); }
  // src: 'work' (what #work shows now), 'sl' (the shortlist) or 'all'; start: a slug, or anything else for the first sheet.
  function pzOpen(src, start) {
    if (document.getElementById('pz')) return;
    var list = pzList(src); if (!list.length && src === 'work') { src = 'all'; list = pzList('all'); } if (!list.length) return;
    kbdClose();
    var x = t().pz, k = t().keys, d = document.createElement('dialog'), at = 0;
    list.forEach(function (p, i) { if (p.slug === start) at = i; });
    pz = { list: list, at: at, src: src, timer: 0, back: document.activeElement, dirty: false, nav: false, href: location.href };
    d.id = 'pz'; d.className = 'pz'; d.setAttribute('aria-labelledby', 'pz-l'); d.lang = lang;
    d.innerHTML = '<div class="pz-top"><p class="nk-label" id="pz-l">' + esc(x.label) + ' · <b>' + esc(pzName()) + '</b></p><div class="pz-tools">' +
      (list.length > 1 ? '<button type="button" class="chip" data-pz-auto aria-pressed="false" title="' + esc(x.autoT.replace('{s}', PZ_SECS)) + '">' + esc(x.auto) + '</button>' : '') +
      (d.requestFullscreen && document.fullscreenEnabled ? '<button type="button" class="chip" data-pz-full aria-pressed="false">' + esc(x.full) + '</button>' : '') +
      '<button type="button" class="chip" data-pz-copy>' + esc(t().share.copy) + '</button>' +
      '<button type="button" class="chip kbd-x" data-pz-close aria-label="' + esc(k.close) + '">✕</button></div></div>' +
      '<div class="pz-stage" id="pz-stage" tabindex="-1"></div>' +
      '<p class="share-msg pz-msg" id="pz-msg" role="status" aria-live="polite"></p>' +
      '<div class="pz-nav"><button type="button" class="nk-btn" data-pz-step="-1" aria-label="' + esc(x.prevA) + '"' + (list.length > 1 ? '' : ' disabled') + '><span aria-hidden="true">←</span><span class="pz-w"> ' + esc(x.prev) + '</span></button>' +
      '<div class="pz-pos"><span class="nk-label" id="pz-count"></span><div class="pz-ticks" aria-hidden="true">' + (list.length <= 60 ? list.map(function () { return '<i></i>'; }).join('') : '') + '</div></div>' +
      '<button type="button" class="nk-btn nk-btn--primary" data-pz-step="1" aria-label="' + esc(x.nextA) + '"' + (list.length > 1 ? '' : ' disabled') + '><span class="pz-w">' + esc(x.next) + ' </span><span aria-hidden="true">→</span></button></div>' +
      '<p class="vh" id="pz-live" role="status" aria-live="polite"></p>' +
      '<p class="kbd-note pz-keys"><kbd>←</kbd> <kbd>→</kbd> ' + esc(x.kStep) + ' · <kbd>A</kbd> ' + esc(x.auto.toLowerCase()) + ' · <kbd>F</kbd> ' + esc(x.full.toLowerCase()) + ' · <kbd>S</kbd> ' + esc(x.kStar) + ' · <kbd>Esc</kbd> ' + esc(k.close.toLowerCase()) + '</p>';
    var tx = null;
    d.addEventListener('click', function (e) {
      var el = e.target.closest('button, a'); if (!el) return;
      if (el.hasAttribute('data-pz-close')) d.close();
      else if (el.hasAttribute('data-pz-step')) pzGo(pz.at + +el.getAttribute('data-pz-step'));
      else if (el.hasAttribute('data-pz-auto')) pzAuto(!pz.timer);
      else if (el.hasAttribute('data-pz-full')) pzFull();
      else if (el.hasAttribute('data-pz-copy')) pzCopy();
      else if (el.hasAttribute('data-pz-sl')) pzStar();
      else if (el.tagName === 'A' && el.getAttribute('href') === location.hash) d.close(); // the sheet that is already open behind
    });
    d.addEventListener('touchstart', function (e) { tx = e.touches.length === 1 ? [e.touches[0].clientX, e.touches[0].clientY] : null; }, { passive: true });
    d.addEventListener('touchend', function (e) {
      if (!tx || !pz) return; var c = e.changedTouches[0], dx = c.clientX - tx[0], dy = c.clientY - tx[1]; tx = null;
      if (Math.abs(dx) > 56 && Math.abs(dx) > Math.abs(dy) * 1.6) pzGo(pz.at + (dx < 0 ? 1 : -1));
    }, { passive: true });
    var onFs = function () { var b = d.querySelector('[data-pz-full]'); if (b) b.setAttribute('aria-pressed', document.fullscreenElement === d); };
    document.addEventListener('fullscreenchange', onFs);
    d.addEventListener('close', function () {
      var s = pz || {}; pz = null;
      if (s.timer) clearInterval(s.timer);
      document.removeEventListener('fullscreenchange', onFs);
      try { if (document.fullscreenElement === d) document.exitFullscreen(); } catch (e) {}
      d.remove();
      if (s.nav) return; // the visitor opened a sheet: the new view takes the focus
      if (s.dirty && (page() === 'work' || page() === 'mine' || page() === 'project')) render(true); // stars changed in the presentation
      var b = s.back && s.back !== document.body && s.back.focus && document.contains(s.back) ? s.back : app.querySelector('[data-pz="' + s.src + '"]') || app.querySelector('.pz-open') || document.getElementById('main');
      if (b) b.focus({ preventScroll: true });
    });
    document.body.appendChild(d);
    try { d.showModal(); } catch (e) { d.setAttribute('open', ''); }
    pzDraw();
    var nx = d.querySelector('[data-pz-step="1"]'); if (nx && !nx.disabled) nx.focus(); else d.querySelector('[data-pz-close]').focus();
  }
  // Keys while the presentation is open; everything else is kept away from the site's own shortcuts. Returns true when open.
  function pzKey(ev) {
    if (!pz || !document.getElementById('pz')) return false;
    if (ev.ctrlKey || ev.metaKey || ev.altKey) return true;
    var k = ev.key, tg = ev.target, onCtl = tg && tg.closest && tg.closest('button, a');
    if (k === 'ArrowRight' || k === 'PageDown' || (k === ' ' && !onCtl)) { ev.preventDefault(); pzGo(pz.at + 1); }
    else if (k === 'ArrowLeft' || k === 'PageUp') { ev.preventDefault(); pzGo(pz.at - 1); }
    else if (k === 'Home') { ev.preventDefault(); pzGo(0); }
    else if (k === 'End') { ev.preventDefault(); pzGo(pz.list.length - 1); }
    else if (k && k.length === 1 && !ev.shiftKey) {
      var c = k.toLowerCase();
      if (c === 'a') pzAuto(!pz.timer); else if (c === 'f') pzFull(); else if (c === 's') pzStar();
    }
    return true;
  }
  // ---------- Keyboard shortcuts: "?" opens a list; ← / → previous/next sheet; H S W N O jump; L switches EN/SL ----------
  // Self-contained: remove this block (KBD_GO … kbdKey()), kbdBtn() in frame(), the data-kbd line in the click handler,
  // the kbdKey(ev) line in the keydown handler, keys: in both languages in content.js and the "Keyboard shortcuts" rules in page.css.
  var KBD_GO = { h: 'home', s: 'services', w: 'work', n: 'news', p: 'studio', o: 'order', c: 'compare', g: 'glossary' };
  // ── Redline notes / "Rdeči svinčnik" on project sheets (2026-11-24) ──────────────────────────────────────────────────
  // "One like this, but different": on a project sheet the visitor marks the drawing (or the first photo) with numbered red
  // marks — a click in "Mark on the drawing" mode, or "Add a note" and the arrow keys on the mark — and writes one line per
  // mark. "Start a project with these notes" puts them into the brief with the sheet number, each mark's place (x / y in %
  // of the drawing) and a link (#p-<slug>?rl=x.y_x.y) that opens the sheet with the same numbered marks, read-only, so the
  // studio sees where every note points. A sheet with a 3D model has no flat drawing: notes there are a plain list.
  // Kept in this browser only (localStorage 'nk-redline', up to 12 notes of 160 characters per sheet, read back through
  // rlClean()); listed in My corner and wiped by its "forget everything". No studio data is used or invented.
  // Self-contained. To remove: this block (RL_KEY … rlMine() and the two listeners), the rl-stage wrapper + rlLayer() +
  // rlBox() in projectView(), the rlRead() call in page(), the rlKey(ev) line in the keydown handler, rlWipe() in
  // mnForget(), rlCount() in mnCount(), rlMine() in mnView(), rl: in both languages in content.js and the "Redline notes"
  // block in page.css. (currentSlug() ignoring a "?…" after the slug can stay.)
  var RL_KEY = 'nk-redline', RL_MAX = 12, RL_LEN = 160, rlMem = null;
  state.rl = { mode: false, got: null, undo: null };
  function rlTxt(s) { return String(typeof s === 'string' ? s : '').replace(/[\u0000-\u001f\u007f]+/g, ' ').slice(0, RL_LEN); }
  function rlPct(v) { v = Math.round(+v); return !isFinite(v) || v < 0 ? 0 : v > 100 ? 100 : v; }
  function rlClean(a) { // [[x, y, text], …] from storage or a link → [{ x, y, t }]; x / y null = a note without a mark
    if (!Array.isArray(a)) return [];
    return a.slice(0, RL_MAX).filter(Array.isArray).map(function (n) {
      var pin = typeof n[0] === 'number' && typeof n[1] === 'number' && isFinite(n[0]) && isFinite(n[1]);
      return { x: pin ? rlPct(n[0]) : null, y: pin ? rlPct(n[1]) : null, t: rlTxt(n[2]) };
    });
  }
  function rlAll() {
    if (!rlMem) {
      rlMem = {};
      try { var o = JSON.parse(localStorage.getItem(RL_KEY) || '{}'); if (o && typeof o === 'object' && !Array.isArray(o)) PROJECTS.forEach(function (p) { if (Object.prototype.hasOwnProperty.call(o, p.slug)) { var a = rlClean(o[p.slug]); if (a.length) rlMem[p.slug] = a; } }); } catch (e) {}
    }
    return rlMem;
  }
  function rlStore() {
    var all = rlAll(), o = {}, n = 0;
    Object.keys(all).forEach(function (k) { if (all[k].length) { o[k] = all[k].map(function (v) { return [v.x, v.y, v.t]; }); n++; } else delete all[k]; });
    try { if (n) localStorage.setItem(RL_KEY, JSON.stringify(o)); else localStorage.removeItem(RL_KEY); } catch (e) {}
  }
  function rlWipe() { rlMem = {}; state.rl.undo = null; try { localStorage.removeItem(RL_KEY); } catch (e) {} }
  function rlCount() { var all = rlAll(); return Object.keys(all).filter(function (k) { return all[k].length; }).length; }
  function rlCur() { // the sheet on screen and its notes: the visitor's own, or the marks that came with a link
    var p = bySlug(currentSlug()); if (!p) return null;
    var g = state.rl.got && state.rl.got.slug === p.slug ? state.rl.got : null;
    return { p: p, got: !!g, list: g ? g.notes : (rlAll()[p.slug] || []), pins: !p.model };
  }
  function rlUrl(p, list) { return 'https://nacekepa.work/' + (lang === 'sl' ? 'sl/' : '') + '#p-' + p.slug + '?rl=' + list.map(function (n) { return n.x === null ? 'n' : n.x + '.' + n.y; }).join('_'); }
  function rlRead(slug, qs) { // #p-<slug>?rl=20.25_40.60_n — only numbers are read; anything else in the address is ignored
    var m = /(?:^|&)rl=([0-9n._]{1,120})(?:&|$)/.exec(qs || ''), g = state.rl.got;
    if (!m) { state.rl.got = null; return; }
    if (g && g.slug === slug && g.src === m[1]) return;
    var a = m[1].split('_').slice(0, RL_MAX).map(function (v) { var q = /^(\d{1,3})\.(\d{1,3})$/.exec(v); return q ? [+q[1], +q[2], ''] : [null, null, '']; });
    state.rl.got = { slug: slug, src: m[1], notes: rlClean(a) };
  }
  function rlPins() {
    var c = rlCur(), x = t().rl; if (!c || !c.pins) return '';
    return c.list.map(function (n, i) {
      if (n.x === null) return '';
      var at = ' style="left:' + n.x + '%;top:' + n.y + '%"';
      return c.got ? '<span class="rl-pin" role="img"' + at + ' aria-label="' + esc(x.mk.replace('{n}', i + 1)) + '">' + (i + 1) + '</span>'
        : '<button type="button" class="rl-pin" data-rl-pin="' + i + '"' + at + ' aria-label="' + esc(x.pin.replace('{n}', i + 1)) + '">' + (i + 1) + '</button>';
    }).join('');
  }
  function rlLayer() { state.rl.mode = false; return '<div class="rl-layer" id="rl-layer">' + rlPins() + '</div>'; }
  function rlInner() {
    var c = rlCur(), x = t().rl; if (!c) return '';
    var n = c.list.length, h = '<p class="nk-label" id="rl-t">' + esc(c.got ? x.gotT : x.label) + (n ? ' · ' + n : '') + '</p>';
    if (c.got) return h + '<p class="rl-lead">' + esc(x.gotL.replace('{n}', n)) + '</p><div class="cta-row"><button type="button" class="nk-btn nk-btn--sm" data-rl="use">' + esc(x.use) + '</button><button type="button" class="nk-btn nk-btn--sm nk-btn--ghost" data-rl="close">' + esc(x.close) + '</button></div>';
    h += '<p class="rl-lead">' + esc(x.lead) + '</p><div class="cta-row">' +
      (c.pins ? '<button type="button" class="chip" data-rl="mode" aria-pressed="' + (state.rl.mode ? 'true' : 'false') + '">' + esc(state.rl.mode ? x.marking : x.mark) + '</button>' : '') +
      '<button type="button" class="chip" data-rl="add">' + esc(x.add) + '</button></div>' + (state.rl.mode ? '<p class="rl-hint">' + esc(x.hint) + '</p>' : '');
    if (n) h += '<ol class="rl-list">' + c.list.map(function (v, i) {
      return '<li><span class="rl-no" aria-hidden="true">' + (i + 1) + '</span><input class="rl-in" type="text" maxlength="' + RL_LEN + '" data-rl-t="' + i + '" value="' + esc(v.t) + '" placeholder="' + esc(x.ph) + '" aria-label="' + esc(x.note.replace('{n}', i + 1)) + '" autocomplete="off">' +
        '<button type="button" class="rl-del" data-rl="del" data-rl-i="' + i + '" aria-label="' + esc(x.del.replace('{n}', i + 1)) + '">✕</button></li>';
    }).join('') + '</ol>' + (c.pins ? '<p class="rl-hint rl-move">' + esc(x.move) + '</p>' : '') +
      '<div class="cta-row"><button type="button" class="nk-btn nk-btn--primary nk-btn--sm" data-rl="go">' + esc(x.go) + '<span class="nk-btn__arrow" aria-hidden="true">→</span></button>' +
      '<button type="button" class="nk-btn nk-btn--sm" data-rl="copy">' + esc(x.copy) + '</button><button type="button" class="nk-btn nk-btn--sm nk-btn--ghost" data-rl="clear">' + esc(x.clear) + '</button></div>';
    else if (state.rl.undo && state.rl.undo.slug === c.p.slug) h += '<div class="cta-row"><button type="button" class="nk-btn nk-btn--sm" data-rl="undo">' + esc(x.undo) + '</button></div>';
    return h;
  }
  function rlBox() { return '<section class="rl-box" aria-labelledby="rl-t"><div id="rl-box">' + rlInner() + '</div><p class="share-msg" id="rl-msg" role="status" aria-live="polite"></p><p class="fit-note">' + esc(t().rl.keep) + '</p></section>'; }
  function rlDraw(msg, focus) {
    var b = document.getElementById('rl-box'), l = document.getElementById('rl-layer'), m = document.getElementById('rl-msg'); if (!b) return;
    if (l) { l.innerHTML = rlPins(); l.classList.toggle('is-on', !!state.rl.mode); }
    b.innerHTML = rlInner(); if (m) m.textContent = msg || '';
    var f = focus && b.querySelector(focus); if (f) f.focus();
  }
  function rlAdd(x, y) {
    var c = rlCur(), X = t().rl; if (!c || c.got) return;
    var all = rlAll(), a = all[c.p.slug] || (all[c.p.slug] = []);
    if (a.length >= RL_MAX) { rlDraw(X.full.replace('{n}', RL_MAX)); return; }
    a.push({ x: c.pins ? rlPct(x) : null, y: c.pins ? rlPct(y) : null, t: '' }); state.rl.undo = null; rlStore();
    rlDraw(X.added.replace('{n}', a.length), '[data-rl-t="' + (a.length - 1) + '"]');
  }
  function rlDel(i) {
    var c = rlCur(); if (!c || c.got || !c.list[i]) return;
    c.list.splice(i, 1); rlStore();
    rlDraw(t().rl.gone, c.list.length ? '[data-rl-t="' + Math.min(i, c.list.length - 1) + '"]' : '[data-rl="add"]');
  }
  function rlItems(c) { return c.list.map(function (n, i) { return (i + 1) + ' – ' + (n.t.replace(/;/g, ',').trim() || '—') + (n.x === null ? '' : ' (' + n.x + ' / ' + n.y + ' %)'); }); }
  function rlLine(c) { return t().rl.brief + ' ' + sheetNo(c.p) + ': ' + [P(c.p, 'title').replace(/;/g, ',')].concat(rlItems(c), c.pins ? [rlUrl(c.p, c.list)] : []).join('; '); }
  function rlToOrder(c) {
    var o = state.order, s = sdSvc(c.p), line = rlLine(c), had = false;
    var pre = [T.en.rl.brief, T.sl.rl.brief].map(function (b) { return b + ' ' + sheetNo(c.p) + ':'; });
    if (s && o.services.indexOf(s.key) < 0) o.services.push(s.key);
    var lines = (o.what ? o.what.split('\n') : []).map(function (l) { if (l.indexOf(pre[0]) === 0 || l.indexOf(pre[1]) === 0) { had = true; return line; } return l; });
    if (!had) lines.push(line);
    o.what = lines.join('\n'); state.step = 0; state.errors = {}; state.send = 'idle';
    location.hash = 'order';
  }
  function rlCopy(c) {
    var X = t().rl, m = document.getElementById('rl-msg'), txt = [X.brief + ' ' + sheetNo(c.p) + ' · ' + P(c.p, 'title')].concat(rlItems(c), c.pins ? [rlUrl(c.p, c.list)] : []).join('\n');
    var say = function (ok) { if (m) m.textContent = ok ? X.copied : X.copyFail; };
    try { navigator.clipboard.writeText(txt).then(function () { say(true); }, function () { say(false); }); } catch (e) { say(false); }
  }
  function rlClick(ev) {
    var tg = ev.target; if (!tg || !tg.closest || !document.getElementById('rl-box')) return;
    var pin = tg.closest('[data-rl-pin]'), l = tg.closest('#rl-layer'), b = tg.closest('[data-rl]'), c = rlCur(); if (!c) return;
    if (pin) { var inp = document.querySelector('[data-rl-t="' + pin.getAttribute('data-rl-pin') + '"]'); if (inp) inp.focus(); return; }
    if (l) { var r = l.getBoundingClientRect(); if (state.rl.mode && !c.got && r.width && r.height) rlAdd((ev.clientX - r.left) / r.width * 100, (ev.clientY - r.top) / r.height * 100); return; }
    if (!b) return;
    var k = b.getAttribute('data-rl'), all = rlAll(), a = all[c.p.slug] || [], X = t().rl;
    if (k === 'close') location.hash = 'p-' + c.p.slug;
    else if (k === 'use') { all[c.p.slug] = a.concat(c.list.map(function (n) { return { x: n.x, y: n.y, t: '' }; })).slice(0, RL_MAX); rlStore(); location.hash = 'p-' + c.p.slug; }
    else if (c.got) return;
    else if (k === 'mode') { state.rl.mode = !state.rl.mode; rlDraw('', '[data-rl="mode"]'); }
    else if (k === 'add') rlAdd(50 + (a.length % 5 - 2) * 9, 50 + (a.length % 3 - 1) * 12);
    else if (k === 'del') rlDel(+b.getAttribute('data-rl-i'));
    else if (k === 'clear') { state.rl.undo = { slug: c.p.slug, notes: a.slice() }; all[c.p.slug] = []; state.rl.mode = false; rlStore(); rlDraw(X.cleared, '[data-rl="undo"]'); }
    else if (k === 'undo' && state.rl.undo) { all[c.p.slug] = state.rl.undo.notes; state.rl.undo = null; rlStore(); rlDraw('', '[data-rl="add"]'); }
    else if (k === 'copy') rlCopy(c);
    else if (k === 'go' && a.length) rlToOrder(c);
  }
  function rlInput(ev) {
    var tg = ev.target; if (!tg || !tg.hasAttribute || !tg.hasAttribute('data-rl-t')) return;
    var c = rlCur(), n = c && !c.got && c.list[+tg.getAttribute('data-rl-t')]; if (n) { n.t = rlTxt(tg.value); rlStore(); }
  }
  function rlKey(ev) {
    var tg = ev.target; if (!tg || !tg.hasAttribute || !document.getElementById('rl-box')) return false;
    if (ev.key === 'Escape' && state.rl.mode && !document.querySelector('dialog[open]')) { state.rl.mode = false; rlDraw('', '[data-rl="mode"]'); ev.preventDefault(); return true; }
    if (!tg.hasAttribute('data-rl-pin') || ev.ctrlKey || ev.metaKey || ev.altKey) return false;
    var c = rlCur(), i = +tg.getAttribute('data-rl-pin'), n = c && !c.got && c.list[i], d = ev.shiftKey ? 5 : 1; if (!n) return false;
    var mv = { ArrowLeft: [-d, 0], ArrowRight: [d, 0], ArrowUp: [0, -d], ArrowDown: [0, d] }[ev.key];
    if (mv) { n.x = rlPct(n.x + mv[0]); n.y = rlPct(n.y + mv[1]); rlStore(); tg.style.left = n.x + '%'; tg.style.top = n.y + '%'; ev.preventDefault(); return true; }
    if (ev.key === 'Delete' || ev.key === 'Backspace') { rlDel(i); ev.preventDefault(); return true; }
    return false;
  }
  function rlMine() { // My corner: the sheets that carry notes
    var all = rlAll(), x = t().rl, ks = Object.keys(all).filter(function (k) { return all[k].length && bySlug(k); }); if (!ks.length) return '';
    return '<section class="mn-sec"><h2 class="sub">' + esc(x.label) + ' <span class="nk-label">' + ks.length + '</span></h2><ul class="mn-list">' + ks.map(function (k) {
      var p = bySlug(k); return '<li><a href="#p-' + esc(k) + '"><b>' + esc(P(p, 'title')) + '</b> <span class="nk-label">' + esc(sheetNo(p) + ' · ' + x.count.replace('{n}', all[k].length)) + '</span></a></li>';
    }).join('') + '</ul></section>';
  }
  app.addEventListener('click', rlClick);
  app.addEventListener('input', rlInput);
  // ── Sheet settings / "Nastavitve lista" (2026-11-21) ─────────────────────────────────────────────────────────────────
  // A display panel: colours (as the device / light / dark), text size, stronger lines and small text, the drawing grid,
  // motion. Opened from the half-disc button in the header, "Sheet settings" in the footer, the D key or Find anything.
  // The choice is kept in this browser only (localStorage 'nk-view') and applied by src/site/prefs.js (window.NKView),
  // which also runs in the <head>, on the 404 page and in the admin; the rules are the "Sheet settings" block in page.css.
  // Self-contained. To remove: this block (VW … vwKey()), vwBtn() and vwFoot() in frame(), the data-vw line in the click
  // handler, the vwKey(ev) line in the keydown handler, the vwClose hashchange listener, the 'D' row in kbdRows(), the
  // Sheet settings line in fxIndex(), vwCalm() at the data-top line (put the matchMedia test back), vw: in both languages
  // in content.js, the "Sheet settings" block in page.css and prefs.js with its imports (see the top of that file).
  var VW = window.NKView || null, vwCur = null;
  var VW_KEYS = ['theme', 'size', 'contrast', 'grid', 'motion', 'spacing'];
  function vwSet(k, v) { if (!VW) return; var c = k ? VW.read() : {}; if (k) c[k] = v; VW.save(VW.apply(c)); } // one-step change from Find anything (2026-11-24)
  function vwCalm() { if (VW) return VW.calm(); try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } }
  function vwIcon() { return '<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" focusable="false"><circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M8 2a6 6 0 0 1 0 12z" fill="currentColor"/></svg>'; }
  function vwBtn() { if (!VW) return ''; var v = t().vw; return '<button type="button" class="fx-open vw-open" data-vw aria-haspopup="dialog" aria-keyshortcuts="D" aria-label="' + esc(v.btn) + '" title="' + esc(v.btn) + ' (D)">' + vwIcon() + '</button>'; }
  function vwFoot() { return VW ? '<button type="button" class="kbd-open vw-link" data-vw aria-haspopup="dialog">' + esc(t().vw.btn) + ' <kbd>D</kbd></button>' : ''; }
  function vwClose() { var d = document.getElementById('vw'); if (d && d.open) d.close(); }
  function vwMark(d) {
    var def = true;
    VW_KEYS.forEach(function (k) { if (vwCur[k] !== VW.OPT[k][0]) def = false; });
    Array.prototype.forEach.call(d.querySelectorAll('[data-vw-set]'), function (b) { var p = b.getAttribute('data-vw-set').split(':'); b.setAttribute('aria-pressed', String(vwCur[p[0]] === p[1])); });
    var r = d.querySelector('[data-vw-reset]'); if (r) r.disabled = def;
  }
  function vwOpen() {
    if (!VW || document.getElementById('vw')) return;
    var v = t().vw, back = document.activeElement, d = document.createElement('dialog');
    vwCur = VW.read();
    d.id = 'vw'; d.className = 'kbd vw'; d.setAttribute('aria-labelledby', 'vw-t'); d.lang = lang;
    d.innerHTML = '<div class="kbd-head"><div><p class="nk-label">' + esc(v.label) + '</p><h2 class="sub" id="vw-t">' + esc(v.title) + '</h2></div>' +
      '<button type="button" class="chip kbd-x" data-vw-close aria-label="' + esc(v.close) + '">✕</button></div>' +
      '<p class="vw-lead">' + esc(v.lead) + '</p>' +
      VW_KEYS.map(function (k) {
        return '<div class="vw-row" role="group" aria-labelledby="vw-l-' + k + '" aria-describedby="vw-h-' + k + '"><p class="nk-label" id="vw-l-' + k + '">' + esc(v.rows[k]) + '</p><div class="vw-opts">' +
          VW.OPT[k].map(function (o) { return '<button type="button" class="chip" data-vw-set="' + k + ':' + o + '" aria-pressed="false">' + esc(v.opts[k][o]) + '</button>'; }).join('') +
          '</div><p class="vw-hint" id="vw-h-' + k + '">' + esc(v.hints[k]) + '</p></div>';
      }).join('') +
      '<div class="vw-foot"><button type="button" class="nk-btn nk-btn--sm" data-vw-reset>' + esc(v.reset) + '</button><p class="vw-msg" id="vw-msg" role="status" aria-live="polite"></p></div>' +
      '<p class="kbd-note">' + esc(v.note) + '</p>';
    d.addEventListener('click', function (e) {
      if (e.target === d || e.target.closest('[data-vw-close]')) { d.close(); return; }
      var b = e.target.closest('[data-vw-set], [data-vw-reset]'); if (!b) return;
      var msg = d.querySelector('#vw-msg'), text;
      if (b.hasAttribute('data-vw-reset')) { vwCur = {}; text = v.resetDone; }
      else { var p = b.getAttribute('data-vw-set').split(':'); vwCur[p[0]] = p[1]; text = v.saved.replace('{k}', v.rows[p[0]]).replace('{v}', v.opts[p[0]][p[1]]); }
      vwCur = VW.apply(vwCur);
      if (!VW.save(vwCur)) text = v.noStore;
      vwMark(d);
      if (b.disabled) { var first = d.querySelector('[data-vw-set]'); if (first) first.focus(); } // Reset switched itself off
      msg.textContent = text;
    });
    d.addEventListener('close', function () { d.remove(); if (back && back.focus && document.contains(back)) back.focus(); else { var o = document.querySelector('.vw-open'); if (o) o.focus(); } });
    document.body.appendChild(d);
    vwMark(d);
    try { d.showModal(); } catch (e) { d.setAttribute('open', ''); }
    var x = d.querySelector('[data-vw-set][aria-pressed="true"]'); if (x) x.focus();
  }
  function vwKey(ev, typing) {
    if (document.getElementById('vw')) return ev.key !== 'Escape' && ev.key !== 'Tab' && ev.key !== 'Enter' && ev.key !== ' '; // open: the page's own shortcuts stay off
    if (!VW || typing || lb || ev.ctrlKey || ev.metaKey || ev.altKey || ev.shiftKey || ev.defaultPrevented || !ev.key || ev.key.toLowerCase() !== 'd') return false;
    if (document.querySelector('dialog[open]') || (ev.target && ev.target.closest && ev.target.closest('.nk-viewer'))) return false;
    ev.preventDefault(); vwOpen(); return true;
  }
  function kbdBtn() { return '<button type="button" class="kbd-open" data-kbd aria-haspopup="dialog">' + esc(t().keys.btn) + ' <kbd>?</kbd></button>'; }
  function kbdRows() {
    var x = t(), k = x.keys, r = [['?', k.help], ['Ctrl K', x.fx.key], ['/', k.find], ['← →', k.prevNext]];
    Object.keys(KBD_GO).forEach(function (c) { var v = KBD_GO[c]; if ((v === 'news' && !NEWS.length) || (v === 'compare' && PROJECTS.length < 2)) return; r.push([c.toUpperCase(), v === 'order' ? x.cta : v === 'home' ? x.nav.home : x.nav[v]]); });
    if (VW) r.push(['D', x.vw.key]); // Sheet settings (2026-11-21)
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
    if (c === 'l') { lang = lang === 'en' ? 'sl' : 'en'; try { localStorage.setItem('nk-lang', lang); } catch (e) {} langHash(); langPath(); render(true); ev.preventDefault(); return true; }
    var to = KBD_GO[c]; if (!to || (to === 'news' && !NEWS.length) || (to === 'compare' && PROJECTS.length < 2)) return false;
    ev.preventDefault(); if (page() === to) window.scrollTo(0, 0); else location.hash = to; return true;
  }
  window.addEventListener('beforeprint', tlFootFresh); // Calculation links, part 2 (2026-11-18): Ctrl+P prints the address with the typed numbers
  window.addEventListener('hashchange', kbdClose);
  window.addEventListener('hashchange', fxClose);
  window.addEventListener('hashchange', pzClose);
  window.addEventListener('hashchange', vwClose);
  // Search keys: "/" jumps to the search on #work from anywhere; Esc in the box clears it.
  document.addEventListener('keydown', function (ev) {
    var tg = ev.target, typing = tg && (/^(INPUT|TEXTAREA|SELECT)$/.test(tg.tagName) || tg.isContentEditable);
    if (ev.key === 'Escape' && tg && tg.id === 'gl-q' && tg.value) { tg.value = ''; state.gl.q = ''; glApply(); ev.preventDefault(); return; } // Glossary NK-G (2026-11-27)
    if (ev.key === 'Escape' && tg && tg.id === 'find-q' && state.q) { state.q = ''; tg.value = ''; findApply(); ev.preventDefault(); return; }
    if (rlKey(ev)) return; // Redline notes (2026-11-24)
    if (pzKey(ev)) return; // Presentation (2026-11-13)
    if (fxKey(ev)) return; // Find anything (2026-11-12)
    if (ofKey(ev)) return;
    if (vwKey(ev, typing)) return; // Sheet settings (2026-11-21)
    if (kbdKey(ev, typing)) return;
    if (ev.key !== '/' || typing || lb || ev.ctrlKey || ev.metaKey || ev.altKey) return;
    ev.preventDefault();
    if (page() === 'work') { var fq = document.getElementById('find-q'); if (fq) fq.focus(); }
    else { state.findFocus = true; location.hash = 'work'; }
  });
  // Landing pages: once the visitor moves on from the sheet / post the page opened with, carry on at / or /sl/ (same app,
  // same state) so the address bar shows the usual address of every view; the landing address stays in history, and Back
  // to it (popstate without a hash) opens that sheet again. hashchange and popstate both fire on a hash link, so the
  // address is compared to the last one handled and rendered once.
  function onNav() {
    var lv = landingView();
    if (lv && !location.hash) { START_VIEW = lv; LANDING = true; }
    else if (LANDING) { LANDING = false; START_VIEW = ''; try { history.replaceState(history.state, '', (lang === 'sl' ? '/sl/' : '/') + (location.hash || '')); } catch (e) {} }
    if (location.href === state.navHref) return;
    state.navHref = location.href;
    render(false); navFocus();
  }
  window.addEventListener('scroll', function () { var hb = document.querySelector('.hm-bar'); if (hb) hb.classList.toggle('is-on', window.scrollY > 420); }, { passive: true }); // Home for orders (2026-11-26): the phone order bar appears once the hero buttons scroll away
  window.addEventListener('hashchange', onNav);
  window.addEventListener('popstate', onNav);
  drLoad();
  state.navHref = location.href;
  render(true);
  langPath(); // Language package: a returning Slovenian reader who opened / carries on at /sl/ (and the other way round)
})();
