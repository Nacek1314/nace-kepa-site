// Sheet settings (2026-11-21): how the visitor wants to read the site — colours, text size, line contrast, the drawing
// grid, motion. This small file only READS the choice (localStorage 'nk-view', this browser only, nothing is sent) and
// puts it on <html> as data-theme / data-size / data-contrast / data-grid / data-motion before the page is drawn, so
// there is no flash of the wrong colours. The panel that changes it is the vw…() block in app.js; the rules are the
// "Sheet settings" block in page.css. Loaded in the <head> of Site.astro (own CSP hash) and at the start of the inline
// script of 404.astro and admin.astro, so every page follows the same choice.
// To remove: delete this file and its three imports (Site.astro, 404.astro, admin.astro), the vw…() block in app.js,
// vw: in content.js and the "Sheet settings" block in page.css.
(function () {
  var KEY = 'nk-view';
  // The first value of every list is the default (= attribute absent = the site as it always was).
  var OPT = { theme: ['auto', 'light', 'dark'], size: ['auto', '100', '112', '125'], contrast: ['auto', 'more'], grid: ['on', 'off'], motion: ['auto', 'reduce'] };
  var TC = { light: '#eef0ec', dark: '#131517' }; // --paper in both themes, for the browser's toolbar colour
  function clean(s) {
    var o = {};
    Object.keys(OPT).forEach(function (k) { var v = s && typeof s[k] === 'string' ? s[k] : ''; o[k] = OPT[k].indexOf(v) >= 0 ? v : OPT[k][0]; });
    return o;
  }
  function browserSize() {
    var f = 16;
    try { f = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16; } catch (x) {}
    return f >= 19.5 ? '125' : f >= 17.5 ? '112' : '100';
  }
  function read() { var s = null; try { s = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) {} return clean(s); }
  function apply(o) {
    o = clean(o);
    var r = document.documentElement;
    Object.keys(OPT).forEach(function (k) { if (o[k] === OPT[k][0]) r.removeAttribute('data-' + k); else r.setAttribute('data-' + k, o[k]); });
    // Text size "auto" follows the browser: the site is drawn in px, so a larger default font size set in the browser
    // (16 px is the factory value) would otherwise change nothing. 18 px and up -> 112 %, 20 px and up -> 125 %.
    if (o.size === 'auto') { var b = browserSize(); if (b !== '100') r.setAttribute('data-size', b); }
    else if (o.size === '100') r.setAttribute('data-size', '100');
    var m = document.querySelectorAll('meta[name="theme-color"]');
    for (var i = 0; i < m.length; i++) {
      var dark = /dark/.test(m[i].getAttribute('media') || '');
      m[i].setAttribute('content', TC[o.theme === 'auto' ? (dark ? 'dark' : 'light') : o.theme]);
    }
    return o;
  }
  function save(o) {
    o = clean(o);
    var d = {}, n = 0;
    Object.keys(OPT).forEach(function (k) { if (o[k] !== OPT[k][0]) { d[k] = o[k]; n++; } });
    try { if (n) localStorage.setItem(KEY, JSON.stringify(d)); else localStorage.removeItem(KEY); } catch (e) { return false; }
    return true;
  }
  // True when motion should be kept calm: the visitor's choice here or the system setting.
  function calm() {
    if (document.documentElement.getAttribute('data-motion') === 'reduce') return true;
    try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; }
  }
  window.NKView = { OPT: OPT, read: read, apply: apply, save: save, calm: calm, browserSize: browserSize };
  apply(read());
  // Another tab changed the settings: follow it. The theme-colour tags may come after this script in the <head>.
  try { window.addEventListener('storage', function (e) { if (e.key === KEY || e.key === null) apply(read()); }); } catch (e) {}
  try { document.addEventListener('DOMContentLoaded', function () { apply(read()); }); } catch (e) {}
})();
