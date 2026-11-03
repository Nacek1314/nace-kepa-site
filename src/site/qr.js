// QR code encoder (2026-11-03) — ISO/IEC 18004 byte mode, versions 1–40, error-correction levels L / M / Q / H, automatic
// mask choice. Plain ES5, no dependency: inlined into the site (Site.astro) and the admin (admin.astro) like drawings.js.
// window.NK_QR.matrix(text, ecl) → { size, get(x, y) } · window.NK_QR.svg(text, { ecl, px, cls, label, quiet }) → inline SVG
// whose modules are a single <path> filled with currentColor (so it follows light / dark and prints black), with a quiet
// zone of 4 modules. Text is encoded as UTF-8. Used for the "Scan to open" codes on sheets, posts, tools and the contact
// card (app.js, "QR package") and the QR downloads in the admin Overview. To remove: delete this file and its import lines.
(function () {
  // --- tables (per version 1…40) ---
  var ECC_CW = { // error-correction codewords per block
    L: [7, 10, 15, 20, 26, 18, 20, 24, 30, 18, 20, 24, 26, 30, 22, 24, 28, 30, 28, 28, 28, 28, 30, 30, 26, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
    M: [10, 16, 26, 18, 24, 16, 18, 22, 22, 26, 30, 22, 22, 24, 24, 28, 28, 26, 26, 26, 26, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28],
    Q: [13, 22, 18, 26, 18, 24, 18, 22, 20, 24, 28, 26, 24, 20, 30, 24, 28, 28, 26, 30, 28, 30, 30, 30, 30, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
    H: [17, 28, 22, 16, 22, 28, 26, 26, 24, 28, 24, 28, 22, 24, 24, 30, 28, 28, 26, 28, 30, 24, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30]
  };
  var ECC_BLOCKS = { // number of error-correction blocks
    L: [1, 1, 1, 1, 1, 2, 2, 2, 2, 4, 4, 4, 4, 4, 6, 6, 6, 6, 7, 8, 8, 9, 9, 10, 12, 12, 12, 13, 14, 15, 16, 17, 18, 19, 19, 20, 21, 22, 24, 25],
    M: [1, 1, 1, 2, 2, 4, 4, 4, 5, 5, 5, 8, 9, 9, 10, 10, 11, 13, 14, 16, 17, 17, 18, 20, 21, 23, 25, 26, 28, 29, 31, 33, 35, 37, 38, 40, 43, 45, 47, 49],
    Q: [1, 1, 2, 2, 4, 4, 6, 6, 8, 8, 8, 10, 12, 16, 12, 17, 16, 18, 21, 20, 23, 23, 25, 27, 29, 34, 34, 35, 38, 40, 43, 45, 48, 51, 53, 56, 59, 62, 65, 68],
    H: [1, 1, 2, 4, 4, 4, 5, 6, 8, 8, 11, 11, 16, 16, 18, 16, 19, 21, 25, 25, 25, 34, 30, 32, 35, 37, 40, 42, 45, 48, 51, 54, 57, 60, 63, 66, 70, 74, 77, 81]
  };
  var ECL_BITS = { L: 1, M: 0, Q: 3, H: 2 };

  function rawDataModules(v) {
    var n = (16 * v + 128) * v + 64;
    if (v >= 2) { var a = Math.floor(v / 7) + 2; n -= (25 * a - 10) * a - 55; if (v >= 7) n -= 36; }
    return n;
  }
  function dataCodewords(v, ecl) { return Math.floor(rawDataModules(v) / 8) - ECC_CW[ecl][v - 1] * ECC_BLOCKS[ecl][v - 1]; }
  function alignPositions(v) {
    if (v === 1) return [];
    var n = Math.floor(v / 7) + 2, size = v * 4 + 17, step = v === 32 ? 26 : Math.ceil((v * 4 + 4) / (n * 2 - 2)) * 2, out = [6];
    for (var p = size - 7; out.length < n; p -= step) out.splice(1, 0, p);
    return out;
  }
  function utf8(s) {
    var out = [], str = unescape(encodeURIComponent(String(s)));
    for (var i = 0; i < str.length; i++) out.push(str.charCodeAt(i));
    return out;
  }
  // --- Reed–Solomon over GF(256), generator 0x11D ---
  function gfMul(x, y) { var z = 0; for (var i = 7; i >= 0; i--) { z = (z << 1) ^ ((z >>> 7) * 0x11D); z ^= ((y >>> i) & 1) * x; } return z & 0xFF; }
  function rsDivisor(deg) {
    var r = []; for (var i = 0; i < deg - 1; i++) r.push(0); r.push(1);
    var root = 1;
    for (var k = 0; k < deg; k++) { for (var j = 0; j < r.length; j++) { r[j] = gfMul(r[j], root); if (j + 1 < r.length) r[j] ^= r[j + 1]; } root = gfMul(root, 2); }
    return r;
  }
  function rsRemainder(data, div) {
    var r = div.map(function () { return 0; });
    data.forEach(function (b) { var f = b ^ r.shift(); r.push(0); div.forEach(function (c, i) { r[i] ^= gfMul(c, f); }); });
    return r;
  }
  // --- bit buffer ---
  function appendBits(bits, val, len) { for (var i = len - 1; i >= 0; i--) bits.push((val >>> i) & 1); }

  function encode(text, ecl) {
    ecl = ECC_CW[ecl] ? ecl : 'M';
    var bytes = utf8(text), v;
    for (v = 1; v <= 40; v++) { var cap = dataCodewords(v, ecl) * 8, need = 4 + (v < 10 ? 8 : 16) + bytes.length * 8; if (need <= cap) break; }
    if (v > 40) throw new Error('QR: text too long');
    // boost the error-correction level while the version stays the same
    ['M', 'Q', 'H'].forEach(function (e) { if (4 + (v < 10 ? 8 : 16) + bytes.length * 8 <= dataCodewords(v, e) * 8 && ['L', 'M', 'Q', 'H'].indexOf(e) > ['L', 'M', 'Q', 'H'].indexOf(ecl)) ecl = e; });
    var bits = [];
    appendBits(bits, 4, 4); appendBits(bits, bytes.length, v < 10 ? 8 : 16);
    bytes.forEach(function (b) { appendBits(bits, b, 8); });
    var capBits = dataCodewords(v, ecl) * 8;
    appendBits(bits, 0, Math.min(4, capBits - bits.length));
    appendBits(bits, 0, (8 - bits.length % 8) % 8);
    for (var pad = 0xEC; bits.length < capBits; pad ^= 0xEC ^ 0x11) appendBits(bits, pad, 8);
    var data = [];
    for (var i = 0; i < bits.length; i += 8) data.push(parseInt(bits.slice(i, i + 8).join(''), 2));
    // interleave blocks
    var nb = ECC_BLOCKS[ecl][v - 1], bl = ECC_CW[ecl][v - 1], raw = Math.floor(rawDataModules(v) / 8), shortBlocks = nb - raw % nb, shortLen = Math.floor(raw / nb);
    var blocks = [], div = rsDivisor(bl), k = 0;
    for (var b = 0; b < nb; b++) {
      var dat = data.slice(k, k + shortLen - bl + (b < shortBlocks ? 0 : 1)); k += dat.length;
      var ecc = rsRemainder(dat, div);
      if (b < shortBlocks) dat.push(-1); // placeholder so every block has the same length
      blocks.push(dat.concat(ecc));
    }
    var out = [];
    for (var c = 0; c < blocks[0].length; c++) blocks.forEach(function (bk) { if (bk[c] !== -1) out.push(bk[c]); });
    return { v: v, ecl: ecl, codewords: out };
  }

  function matrix(text, eclWant) {
    var enc = encode(text, eclWant), v = enc.v, ecl = enc.ecl, size = v * 4 + 17;
    var mod = [], fun = []; // module colours, function-pattern flags
    for (var y = 0; y < size; y++) { mod.push([]); fun.push([]); for (var x = 0; x < size; x++) { mod[y].push(0); fun[y].push(0); } }
    function setF(x, y, d) { mod[y][x] = d ? 1 : 0; fun[y][x] = 1; }
    function finder(cx, cy) { for (var dy = -4; dy <= 4; dy++) for (var dx = -4; dx <= 4; dx++) { var x = cx + dx, y = cy + dy, d = Math.max(Math.abs(dx), Math.abs(dy)); if (x >= 0 && x < size && y >= 0 && y < size) setF(x, y, d !== 2 && d !== 4); } }
    function align(cx, cy) { for (var dy = -2; dy <= 2; dy++) for (var dx = -2; dx <= 2; dx++) setF(cx + dx, cy + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1); }
    function drawFormat(mask) {
      var d = ECL_BITS[ecl] << 3 | mask, r = d;
      for (var i = 0; i < 10; i++) r = (r << 1) ^ ((r >>> 9) * 0x537);
      var bits = (d << 10 | r) ^ 0x5412, i2;
      for (i2 = 0; i2 <= 5; i2++) setF(8, i2, (bits >>> i2) & 1);
      setF(8, 7, (bits >>> 6) & 1); setF(8, 8, (bits >>> 7) & 1); setF(7, 8, (bits >>> 8) & 1);
      for (i2 = 9; i2 < 15; i2++) setF(14 - i2, 8, (bits >>> i2) & 1);
      for (i2 = 0; i2 < 8; i2++) setF(size - 1 - i2, 8, (bits >>> i2) & 1);
      for (i2 = 8; i2 < 15; i2++) setF(8, size - 15 + i2, (bits >>> i2) & 1);
      setF(8, size - 8, 1);
    }
    function drawVersion() {
      if (v < 7) return;
      var r = v; for (var i = 0; i < 12; i++) r = (r << 1) ^ ((r >>> 11) * 0x1F25);
      var bits = v << 12 | r;
      for (var i2 = 0; i2 < 18; i2++) { var b = (bits >>> i2) & 1, a = size - 11 + i2 % 3, c = Math.floor(i2 / 3); setF(a, c, b); setF(c, a, b); }
    }
    // function patterns
    for (var i = 0; i < size; i++) { setF(6, i, i % 2 === 0); setF(i, 6, i % 2 === 0); }
    finder(3, 3); finder(size - 4, 3); finder(3, size - 4);
    var ap = alignPositions(v), n = ap.length;
    for (var a = 0; a < n; a++) for (var b = 0; b < n; b++) { if (!((a === 0 && b === 0) || (a === 0 && b === n - 1) || (a === n - 1 && b === 0))) align(ap[a], ap[b]); }
    drawFormat(0); drawVersion();
    // data codewords in the zigzag
    var cw = enc.codewords, bi = 0;
    for (var right = size - 1; right >= 1; right -= 2) {
      if (right === 6) right = 5;
      for (var vert = 0; vert < size; vert++) for (var j = 0; j < 2; j++) {
        var x = right - j, up = ((right + 1) & 2) === 0, y = up ? size - 1 - vert : vert;
        if (!fun[y][x] && bi < cw.length * 8) { mod[y][x] = (cw[bi >>> 3] >>> (7 - (bi & 7))) & 1; bi++; }
      }
    }
    // masking: try all eight, keep the lowest penalty
    function maskBit(m, x, y) {
      switch (m) {
        case 0: return (x + y) % 2 === 0; case 1: return y % 2 === 0; case 2: return x % 3 === 0; case 3: return (x + y) % 3 === 0;
        case 4: return (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0; case 5: return x * y % 2 + x * y % 3 === 0;
        case 6: return (x * y % 2 + x * y % 3) % 2 === 0; default: return ((x + y) % 2 + x * y % 3) % 2 === 0;
      }
    }
    function applyMask(m) { for (var y = 0; y < size; y++) for (var x = 0; x < size; x++) if (!fun[y][x] && maskBit(m, x, y)) mod[y][x] ^= 1; }
    function fpCount(h) { var n = h[1], core = n > 0 && h[2] === n && h[3] === n * 3 && h[4] === n && h[5] === n; return (core && h[0] >= n * 4 && h[6] >= n ? 1 : 0) + (core && h[6] >= n * 4 && h[0] >= n ? 1 : 0); }
    function fpAdd(len, h) { if (h[0] === 0) len += size; h.pop(); h.unshift(len); } // a light border counts as part of the first run
    function fpEnd(color, len, h) { if (color) { fpAdd(len, h); len = 0; } fpAdd(len + size, h); return fpCount(h); }
    function penalty() {
      var res = 0, x, y, run, color, h, c;
      for (y = 0; y < size; y++) { color = 0; run = 0; h = [0, 0, 0, 0, 0, 0, 0]; for (x = 0; x < size; x++) { c = mod[y][x]; if (c === color) { run++; if (run === 5) res += 3; else if (run > 5) res++; } else { fpAdd(run, h); if (!color) res += fpCount(h) * 40; color = c; run = 1; } } res += fpEnd(color, run, h) * 40; }
      for (x = 0; x < size; x++) { color = 0; run = 0; h = [0, 0, 0, 0, 0, 0, 0]; for (y = 0; y < size; y++) { c = mod[y][x]; if (c === color) { run++; if (run === 5) res += 3; else if (run > 5) res++; } else { fpAdd(run, h); if (!color) res += fpCount(h) * 40; color = c; run = 1; } } res += fpEnd(color, run, h) * 40; }
      for (y = 0; y < size - 1; y++) for (x = 0; x < size - 1; x++) { c = mod[y][x]; if (c === mod[y][x + 1] && c === mod[y + 1][x] && c === mod[y + 1][x + 1]) res += 3; }
      var dark = 0; for (y = 0; y < size; y++) for (x = 0; x < size; x++) dark += mod[y][x];
      var total = size * size, k = Math.ceil(Math.abs(dark * 20 - total * 10) / total) - 1;
      return res + k * 10;
    }
    var best = -1, bestPen = Infinity;
    for (var m = 0; m < 8; m++) { applyMask(m); drawFormat(m); var p = penalty(); if (p < bestPen) { bestPen = p; best = m; } applyMask(m); }
    applyMask(best); drawFormat(best);
    return { size: size, version: v, ecl: ecl, mask: best, get: function (x, y) { return mod[y][x] === 1; }, rows: mod };
  }

  function svg(text, o) {
    o = o || {};
    var m = matrix(text, o.ecl), q = o.quiet == null ? 4 : o.quiet, n = m.size + q * 2, d = [];
    for (var y = 0; y < m.size; y++) for (var x = 0; x < m.size; x++) if (m.get(x, y)) d.push('M' + (x + q) + ' ' + (y + q) + 'h1v1h-1z');
    var px = o.px || 128, label = o.label ? ' role="img" aria-label="' + String(o.label).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }) + '"' : ' aria-hidden="true"';
    return '<svg class="qr' + (o.cls ? ' ' + o.cls : '') + '" viewBox="0 0 ' + n + ' ' + n + '" width="' + px + '" height="' + px + '" shape-rendering="crispEdges"' + label + ' focusable="false" data-qr-v="' + m.version + '" data-qr-ecl="' + m.ecl + '">' +
      (o.paper ? '<rect width="' + n + '" height="' + n + '" fill="' + o.paper + '"/>' : '') + '<path fill="currentColor" d="' + d.join('') + '"/></svg>';
  }
  // vCard 3.0 text for the contact card (name, e-mail, web addresses, city, a note) — only fields that are given.
  function vcard(o) {
    var esc = function (v) { return String(v == null ? '' : v).replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/[,;]/g, function (c) { return '\\' + c; }); };
    var out = ['BEGIN:VCARD', 'VERSION:3.0', 'N:' + esc(o.last) + ';' + esc(o.first) + ';;;', 'FN:' + esc(o.first + ' ' + o.last)];
    if (o.org) out.push('ORG:' + esc(o.org));
    if (o.title) out.push('TITLE:' + esc(o.title));
    if (o.email) out.push('EMAIL;TYPE=INTERNET:' + o.email);
    (o.urls || []).forEach(function (u) { out.push('URL:' + u); });
    if (o.city || o.country) out.push('ADR;TYPE=WORK:;;;' + esc(o.city) + ';;;' + esc(o.country));
    if (o.note) out.push('NOTE:' + esc(o.note));
    out.push('END:VCARD');
    return out.join('\r\n') + '\r\n';
  }
  // standalone SVG file (black on white, with the XML header) for downloads
  function file(text, o) { return '<?xml version="1.0" encoding="UTF-8"?>\n' + svg(text, Object.assign({ paper: '#fff', px: 512 }, o || {})).replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" style="color:#000" '); }
  window.NK_QR = { matrix: matrix, svg: svg, vcard: vcard, file: file };
})();
