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
  function asset(path) { return '/' + String(path).replace(/^\/+/, '').split('/').map(encodeURIComponent).join('/'); }
  function page() {
    var h = (location.hash || '').replace('#', '');
    var m = /^(en|sl)-?(.*)$/.exec(h);
    if (m) { lang = m[1]; try { localStorage.setItem('nk-lang', lang); } catch (e) {} h = m[2]; }
    if (/^p-/.test(h) && bySlug(h.slice(2))) return 'project';
    return ['home', 'services', 'work', 'skills', 'about', 'order'].indexOf(h) >= 0 ? h : 'home'; }
  function currentSlug() { var h = (location.hash || '').replace('#', '').replace(/^(en|sl)-?/, ''); return h.slice(2); }

  function btn(label, href, variant, size, arrow) {
    return '<a class="nk-btn' + (variant ? ' nk-btn--' + variant : '') + (size ? ' nk-btn--' + size : '') + '" href="' + href + '">' + esc(label) + (arrow ? '<span class="nk-btn__arrow" aria-hidden="true">→</span>' : '') + '</a>';
  }
  function specs(items) { return '<dl class="nk-specs">' + items.map(function (i) { return '<div><dt>' + esc(L(i[0])) + '</dt><dd>' + esc(L(i[1])) + '</dd></div>'; }).join('') + '</dl>'; }
  function art(p) {
    if (p.photos && p.photos.length) return '<img class="sheet-photo" src="' + asset(p.photos[0]) + '" alt="" loading="lazy" decoding="async">';
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
        '<section class="block about-strip"><div>' + '<p class="nk-label">' + esc(x.aboutLabel) + '</p><h2 class="sec-title">' + esc(x.aboutTitle) + '</h2></div><div><p class="lead">' + esc(x.aboutBody) + '</p>' + timelineDims() + '</div></section>' +
        ctaBand();
    },
    services: function () {
      var x = t();
      return '<section class="block first">' + head('S-01 … S-04', x.servicesPageTitle, x.servicesPageLead, true) + '<div class="grid-2">' + SERVICES.map(function (s) { return service(s, true); }).join('') + '</div></section>' +
        '<section class="block">' + head(x.processLabel, x.processTitle) + process(-1) + '</section>' + ctaBand();
    },
    work: function () {
      var x = t(), cats = ['all'].concat(Object.keys(CATS));
      var list = PROJECTS.filter(function (p) { return state.filter === 'all' || (state.filter === '3d' ? !!p.model : p.category === state.filter); });
      var has3d = PROJECTS.some(function (p) { return p.model; });
      if (has3d) cats.splice(1, 0, '3d');
      return '<section class="block first">' + head(PROJECTS.length + ' ' + x.shown, x.workPageTitle, x.workPageLead, true) +
        '<div class="filters" role="group" aria-label="Filter">' + cats.map(function (c) {
          var n = c === 'all' ? PROJECTS.length : PROJECTS.filter(function (p) { return c === '3d' ? !!p.model : p.category === c; }).length;
          return '<button type="button" class="chip" data-filter="' + c + '" aria-pressed="' + (state.filter === c) + '">' + esc(c === 'all' ? x.all : c === '3d' ? x.with3d : CATS[c][lang]) + ' <span>' + n + '</span></button>';
        }).join('') + '</div>' +
        '<div class="grid-4 sheets">' + list.map(sheet).join('') + '</div></section>' + ctaBand();
    },
    skills: function () {
      var x = t();
      return '<section class="block first">' + head('Skills', x.skillsPageTitle, x.skillsPageLead, true) + '<div class="grid-2 skills">' +
        SKILLS.map(function (g) { return '<div class="skill-group"><h2 class="sub">' + esc(g[lang]) + '</h2>' + specs(g.items) + '</div>'; }).join('') + '</div></section>' +
        '<section class="block"><p class="nk-label">' + esc(x.certs) + '</p><div class="certs"><div class="cert"><span class="nk-tag nk-tag--ok">CSWA</span><span>Certified SolidWorks Associate</span></div><div class="cert"><span class="nk-tag nk-tag--ok">CSWA-AM</span><span>Certified SolidWorks Associate — Additive Manufacturing</span></div></div></section>' + ctaBand();
    },
    about: function () {
      var x = t();
      return '<section class="block first about-page">' + head(x.aboutLabel, x.aboutTitle, null, true) + '<div class="about-cols"><div><p class="lead">' + esc(x.aboutBody) + '</p>' + timelineDims() + '</div><div><p class="nk-label">' + esc(x.facts) + '</p>' +
        specs([[lang === 'sl' ? 'Lokacija' : 'Location', 'Škofja Loka, Slovenia'], [lang === 'sl' ? 'Šola' : 'School', 'Šolski center Kranj'], ['CAD', 'SolidWorks 4 yrs · CSWA · CSWA-AM']].concat(x.heroSpecs.slice(2))) + '</div></div></section>' +
        '<section class="block">' + head(x.processLabel, x.processTitle) + process(-1) + '</section>' + ctaBand();
    },
    order: orderView,
    project: projectView
  };

  function projectView() {
    var x = t(), p = bySlug(currentSlug()), i = PROJECTS.indexOf(p);
    var next = PROJECTS[(i + 1) % PROJECTS.length];
    var m = p.model;
    var stage = m
      ? '<div class="nk-viewer" id="viewer" data-src="' + esc(asset(m.file)) + '" data-format="' + esc(m.format || '') + '" role="img" aria-label="' + esc(x.viewerLabel + ': ' + P(p, 'title')) + '"><div class="nk-viewer__msg" id="viewer-msg">' + esc(x.loading3d) + '</div></div>' +
        '<p class="viewer-hint">' + esc(x.viewerHint) + '</p>'
      : '<div class="nk-sheet__art project-art">' + art(p) + '</div>';
    var rows = [[x.pCategory, cat(p)], [x.pYear, String(p.year)]];
    if (p.materials) rows.push([x.pMaterials, p.materials]);
    if (m) rows.push([x.pModel, (m.format || '').toUpperCase() + (m.size ? ' · ' + (m.size < 1048576 ? Math.max(1, Math.round(m.size / 1024)) + ' KB' : (m.size / 1048576).toFixed(1) + ' MB') : '')]);
    var details = P(p, 'details');
    var photos = (p.photos || []).slice(m ? 0 : 1);
    return '<section class="block first project">' +
      '<a class="back" href="#work">← ' + esc(x.allWork) + '</a>' +
      head(sheetNo(p) + ' · ' + cat(p) + ' · ' + p.year, P(p, 'title'), P(p, 'description'), true) +
      '<div class="project-grid"><div class="project-stage">' + stage + '</div><aside class="project-side">' + specs(rows) +
      (details ? '<div class="project-details">' + details.split(/\n{2,}/).map(function (s) { return '<p>' + esc(s) + '</p>'; }).join('') + '</div>' : '') +
      (m && m.download ? '<a class="nk-btn nk-btn--sm" href="' + esc(asset(m.file)) + '" download>' + esc(x.downloadModel) + '<span class="nk-btn__arrow" aria-hidden="true">↓</span></a>' : '') +
      '<div class="cta-row">' + btn(x.cta, '#order', 'primary', null, true) + '</div></aside></div>' +
      (photos.length ? '<div class="photos">' + photos.map(function (ph) { return '<a href="' + esc(asset(ph)) + '" target="_blank" rel="noopener"><img src="' + esc(asset(ph)) + '" alt="' + esc(P(p, 'title')) + '" loading="lazy" decoding="async"></a>'; }).join('') + '</div>' : '') +
      (next && next !== p ? '<a class="next-project" href="#p-' + esc(next.slug) + '"><span class="nk-label">' + esc(x.nextProject) + '</span><span class="sub">' + esc(P(next, 'title')) + ' →</span></a>' : '') +
      '</section>' + ctaBand();
  }
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
    return '<section class="block first">' + head('Order · NK-Q', x.orderTitle, x.orderLead, true) + steps + '<form class="wiz-body" id="wiz" novalidate>' + body + nav + '</form></section>';
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
    var nav = '<header class="top"><a class="wordmark" href="#home" aria-label="nacekepa.work — home">' + logo() + '<span class="wm-text">nacekepa<span>.work</span></span></a><nav aria-label="Main">' +
      ['services', 'work', 'skills', 'about'].map(function (k) { return '<a href="#' + k + '"' + (p === k || (p === 'project' && k === 'work') ? ' aria-current="page"' : '') + '>' + esc(x.nav[k]) + '</a>'; }).join('') +
      '</nav><div class="top-act"><div class="lang" role="group" aria-label="Language"><button type="button" data-lang="en" aria-pressed="' + (lang === 'en') + '">EN</button><button type="button" data-lang="sl" aria-pressed="' + (lang === 'sl') + '">SL</button></div>' + btn(x.cta, '#order', 'primary', 'sm') + '</div></header>';
    var idx = ['home', 'services', 'work', 'skills', 'about', 'order'].indexOf(p === 'project' ? 'work' : p) + 1;
    var d = new Date().toISOString().slice(0, 10);
    var tb = '<footer class="foot"><div class="nk-tb" style="--tb-cols:6">' +
      cell(x.tb.title, '<span class="tb-brand">' + logo() + '<span>Nace Kepa · Engineering Studio</span></span>', 'wide', true, true) + cell(x.tb.drawn, 'N. Kepa') + cell(x.tb.loc, 'Škofja Loka, SI') + cell(x.tb.sheet, String(idx).padStart(2, '0') + ' / 06') +
      cell(x.tb.scale, '1:1') + cell(x.tb.rev, 'B') + cell(x.tb.date, d) + cell('Contact', '<a href="' + LINKEDIN + '" target="_blank" rel="noopener">LinkedIn ↗</a>', 'wide', false, true) + cell('Order', '<a href="#order">' + esc(x.cta) + ' →</a>', 'wide', false, true) +
      cell('', esc(x.footerNote), 'full', false, true) + '</div><p class="copy">© ' + new Date().getFullYear() + ' Nace Kepa</p></footer>';
    return '<div class="frame">' + zones + nav + '<main id="main">' + inner + '</main>' + tb + '</div>';
  }
  function cell(k, v, span, title, raw) {
    return '<div class="nk-tb__cell' + (span === 'wide' ? ' nk-tb__cell--wide' : span === 'full' ? ' nk-tb__cell--full' : '') + '">' + (k ? '<span class="nk-tb__k">' + esc(k) + '</span>' : '') + '<span class="nk-tb__v' + (title ? ' nk-tb__v--title' : '') + '">' + (raw ? v : esc(v)) + '</span></div>';
  }

  function render(keepScroll) {
    var p = page();
    document.documentElement.lang = lang === 'sl' ? 'sl' : 'en';
    if (viewer) { viewer.dispose(); viewer = null; }
    app.innerHTML = frame(views[p]());
    if (!keepScroll) window.scrollTo(0, 0);
    if (p === 'project') mountViewer();
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
    if (el.dataset.lang) { lang = el.dataset.lang; try { localStorage.setItem('nk-lang', lang); } catch (e) {} render(true); return; }
    if (el.dataset.filter) { state.filter = el.dataset.filter; render(true); return; }
    if (el.id === 'next') { ev.preventDefault(); readForm(); var ok = validate(); if (ok) state.step++; if (ok && state.step === 3) submitOrder(); render(true); var w = document.getElementById('wiz'); if (w) w.scrollIntoView({ block: 'start' }); return; }
    if (el.id === 'back') { ev.preventDefault(); readForm(); state.errors = {}; state.send = 'idle'; state.step = state.step === 3 ? 0 : state.step - 1; render(true); return; }
    if (el.id === 'copy') {
      var txt = briefText(), msg = document.getElementById('copy-msg');
      var fail = function () { msg.textContent = t().copyFail; var r = document.createRange(); r.selectNodeContents(document.getElementById('brief')); var s = getSelection(); s.removeAllRanges(); s.addRange(r); };
      try { navigator.clipboard.writeText(txt).then(function () { msg.textContent = t().copied; }, fail); } catch (e) { fail(); }
    }
  });
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
  window.addEventListener('hashchange', function () { render(false); });
  render(true);
})();
