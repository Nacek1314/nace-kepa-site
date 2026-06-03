/**
 * Cloudflare Worker — order relay + file upload for nace-kepa-site.
 *
 * Endpoints:
 *   OPTIONS *                         CORS preflight
 *   POST    /upload?code=&name=       Stream-upload one file to R2 bucket UPLOADS.
 *                                     Body = raw file bytes. Returns { ok, key, size, url }.
 *   GET     /d/<key...>?exp=&sig=     Signed download (HMAC-SHA256). Streams from R2.
 *   POST    /                         JSON order relay (email + optional Telegram).
 *
 * Required env / bindings:
 *   ALLOWED_ORIGIN   Text   exact origin, e.g. https://nacekepa.work
 *   DOWNLOAD_SECRET  Secret random 32+ char string (used to sign download URLs)
 *   UPLOADS          R2 binding to bucket (e.g. nace-kepa-orders)
 *
 * Optional (email):
 *   RESEND_API_KEY, MAIL_FROM, MAIL_TO
 *
 * Optional (telegram):
 *   BOT_TOKEN, CHAT_ID
 *
 * Optional (rate limit):
 *   RATE_LIMIT_MAX (5) / RATE_LIMIT_WINDOW (300)
 *   UPLOAD_RATE_MAX (20) / UPLOAD_RATE_WINDOW (600)
 */

const MAX_BODY_BYTES   = 16_000;
const MAX_SUMMARY      = 6000;
const MAX_SUBJECT      = 200;
const MAX_CONTACT      = 200;
const MAX_CODE         = 16;
const MIN_SUMMARY      = 10;
const MAX_ATTACHMENTS  = 5;
const MAX_UPLOAD_BYTES = 100 * 1024 * 1024;     // 100 MB / file (Workers free body cap)
const MAX_FILENAME     = 120;
const DOWNLOAD_TTL_SEC = 30 * 24 * 3600;        // 30 days
const ALLOWED_LANGS    = new Set(['en', 'sl']);
const EMAIL_RE         = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CODE_RE          = /^[A-Za-z0-9-]{4,16}$/;
const FILENAME_RE      = /^[A-Za-z0-9._() -]{1,120}$/;
const CONTROL_CHARS_RE = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;
const ALLOWED_EXTS     = new Set([
  'stl','obj','step','stp','iges','igs','3mf','zip',
  'pdf','jpg','jpeg','png','webp','heic','svg','dxf','dwg','ipt','sldprt'
]);

export default {
  async fetch(request, env) {
    const cors = corsHeaders(env.ALLOWED_ORIGIN);
    const sec  = securityHeaders();
    const headers = { ...cors, ...sec };

    if (!env.ALLOWED_ORIGIN) return json({ ok: false, error: 'worker_misconfigured' }, 500, sec);

    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers });
    }

    // Signed download — public GET (no origin check; integrity via HMAC).
    if (request.method === 'GET' && url.pathname.startsWith('/d/')) {
      return handleDownload(url, env, sec);
    }

    // Private API — strict origin check.
    const origin  = request.headers.get('Origin')  || '';
    const referer = request.headers.get('Referer') || '';
    if (origin !== env.ALLOWED_ORIGIN && !referer.startsWith(env.ALLOWED_ORIGIN + '/')) {
      return json({ ok: false, error: 'forbidden_origin' }, 403, headers);
    }

    if (request.method === 'POST' && url.pathname === '/upload') {
      return handleUpload(request, url, env, headers);
    }
    if (request.method === 'POST' && (url.pathname === '/' || url.pathname === '')) {
      return handleOrder(request, env, headers);
    }

    return json({ ok: false, error: 'not_found' }, 404, headers);
  }
};

// =====================================================================
// UPLOAD
// =====================================================================

async function handleUpload(request, url, env, headers) {
  if (!env.UPLOADS || !env.DOWNLOAD_SECRET) {
    return json({ ok: false, error: 'uploads_disabled' }, 503, headers);
  }

  const ip = request.headers.get('CF-Connecting-IP') || '0.0.0.0';
  const rl = await checkRateLimit(ip, env, 'up', env.UPLOAD_RATE_MAX, env.UPLOAD_RATE_WINDOW, 20, 600);
  if (!rl.ok) {
    return json({ ok: false, error: 'rate_limited', retry_after: rl.retryAfter }, 429,
      { ...headers, 'Retry-After': String(rl.retryAfter) });
  }

  const code = clean(url.searchParams.get('code'), MAX_CODE);
  const name = clean(url.searchParams.get('name'), MAX_FILENAME);
  if (!CODE_RE.test(code)) return json({ ok: false, error: 'invalid_code' }, 422, headers);
  if (!FILENAME_RE.test(name)) return json({ ok: false, error: 'invalid_filename' }, 422, headers);

  const ext = (name.split('.').pop() || '').toLowerCase();
  if (!ALLOWED_EXTS.has(ext)) return json({ ok: false, error: 'unsupported_type' }, 415, headers);

  const lenHeader = request.headers.get('Content-Length');
  const declared  = lenHeader ? parseInt(lenHeader, 10) : NaN;
  if (Number.isFinite(declared) && declared > MAX_UPLOAD_BYTES) {
    return json({ ok: false, error: 'file_too_large', max: MAX_UPLOAD_BYTES }, 413, headers);
  }
  if (!request.body) return json({ ok: false, error: 'empty_body' }, 400, headers);

  const uuid = crypto.randomUUID();
  const safeName = name.replace(/\s+/g, '_');
  const key = `${code}/${uuid}-${safeName}`;

  let object;
  try {
    object = await env.UPLOADS.put(key, request.body, {
      httpMetadata: { contentType: 'application/octet-stream' },
      customMetadata: { code, original: safeName }
    });
  } catch (err) {
    console.warn('r2_put_failed', String(err));
    return json({ ok: false, error: 'upload_failed' }, 502, headers);
  }

  const size = object && typeof object.size === 'number' ? object.size : (Number.isFinite(declared) ? declared : 0);
  if (size > MAX_UPLOAD_BYTES) {
    try { await env.UPLOADS.delete(key); } catch { /* ignore */ }
    return json({ ok: false, error: 'file_too_large', max: MAX_UPLOAD_BYTES }, 413, headers);
  }

  const exp = Math.floor(Date.now() / 1000) + DOWNLOAD_TTL_SEC;
  const sig = await sign(`${key}|${exp}`, env.DOWNLOAD_SECRET);
  const downloadUrl = `${url.origin}/d/${encodePath(key)}?exp=${exp}&sig=${sig}`;

  return json({ ok: true, key, size, name: safeName, url: downloadUrl, exp }, 200, headers);
}

// =====================================================================
// DOWNLOAD (signed)
// =====================================================================

async function handleDownload(url, env, sec) {
  if (!env.UPLOADS || !env.DOWNLOAD_SECRET) {
    return json({ ok: false, error: 'uploads_disabled' }, 503, sec);
  }
  const key = decodeURIComponent(url.pathname.slice(3));   // strip "/d/"
  const exp = parseInt(url.searchParams.get('exp') || '0', 10);
  const sig = url.searchParams.get('sig') || '';
  if (!key || !exp || !sig) return json({ ok: false, error: 'bad_link' }, 400, sec);
  if (Math.floor(Date.now() / 1000) > exp) return json({ ok: false, error: 'expired' }, 410, sec);

  const expected = await sign(`${key}|${exp}`, env.DOWNLOAD_SECRET);
  if (!timingSafeEqual(sig, expected)) return json({ ok: false, error: 'bad_sig' }, 403, sec);

  const obj = await env.UPLOADS.get(key);
  if (!obj) return json({ ok: false, error: 'not_found' }, 404, sec);

  const original = (obj.customMetadata && obj.customMetadata.original) || key.split('/').pop() || 'file';
  const headers = new Headers(sec);
  headers.set('Content-Type', 'application/octet-stream');
  headers.set('Content-Disposition', `attachment; filename="${original.replace(/"/g, '')}"`);
  if (obj.size != null) headers.set('Content-Length', String(obj.size));
  headers.set('Cache-Control', 'private, max-age=0, no-store');
  return new Response(obj.body, { status: 200, headers });
}

// =====================================================================
// ORDER (email/telegram relay)
// =====================================================================

async function handleOrder(request, env, headers) {
  const ct = request.headers.get('Content-Type') || '';
  if (!ct.toLowerCase().includes('application/json')) {
    return json({ ok: false, error: 'unsupported_media_type' }, 415, headers);
  }

  const ip = request.headers.get('CF-Connecting-IP') || '0.0.0.0';
  const rl = await checkRateLimit(ip, env, 'rl', env.RATE_LIMIT_MAX, env.RATE_LIMIT_WINDOW, 5, 300);
  if (!rl.ok) {
    return json({ ok: false, error: 'rate_limited', retry_after: rl.retryAfter }, 429,
      { ...headers, 'Retry-After': String(rl.retryAfter) });
  }

  let raw;
  try { raw = await request.text(); } catch { return json({ ok: false, error: 'read_failed' }, 400, headers); }
  if (raw.length > MAX_BODY_BYTES) return json({ ok: false, error: 'payload_too_large' }, 413, headers);

  let payload;
  try { payload = JSON.parse(raw); } catch { return json({ ok: false, error: 'invalid_json' }, 400, headers); }
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return json({ ok: false, error: 'invalid_payload' }, 400, headers);
  }

  if (payload.website) return json({ ok: true, code: 'NK-XXXXXX' }, 200, headers);

  const code    = clean(payload.code,    MAX_CODE);
  const subject = clean(payload.subject, MAX_SUBJECT);
  const summary = clean(payload.summary, MAX_SUMMARY);
  const contact = clean(payload.contact, MAX_CONTACT);
  const lang    = ALLOWED_LANGS.has(payload.lang) ? payload.lang : 'en';

  if (!code || !subject || !summary || summary.length < MIN_SUMMARY) {
    return json({ ok: false, error: 'invalid_fields' }, 422, headers);
  }
  if (contact && !EMAIL_RE.test(contact)) {
    return json({ ok: false, error: 'invalid_contact' }, 422, headers);
  }

  // Validate attachment metadata (files already in R2).
  const attachments = [];
  if (Array.isArray(payload.attachments)) {
    for (const a of payload.attachments.slice(0, MAX_ATTACHMENTS)) {
      if (!a || typeof a !== 'object') continue;
      const aname = clean(a.name, MAX_FILENAME);
      const aurl  = typeof a.url === 'string' ? a.url.slice(0, 1024) : '';
      const asize = Number.isFinite(a.size) ? Math.max(0, Math.min(a.size, MAX_UPLOAD_BYTES)) : 0;
      if (aname && aurl.startsWith('https://')) {
        attachments.push({ name: aname, url: aurl, size: asize });
      }
    }
  }

  const hasEmail    = !!(env.RESEND_API_KEY && env.MAIL_FROM && env.MAIL_TO);
  const hasTelegram = !!(env.BOT_TOKEN && env.CHAT_ID);
  if (!hasEmail && !hasTelegram) return json({ ok: false, error: 'worker_misconfigured' }, 500, headers);

  const tasks = [];
  if (hasEmail)    tasks.push(['email',    sendEmail(env,    { code, subject, summary, contact, lang, attachments })]);
  if (hasTelegram) tasks.push(['telegram', sendTelegram(env, { code, subject, summary, contact, lang, attachments })]);

  const settled = await Promise.allSettled(tasks.map(([, p]) => p));
  let anyOk = false;
  let mail = hasEmail ? 'failed' : 'skipped';
  let tg   = hasTelegram ? 'failed' : 'skipped';

  settled.forEach((res, i) => {
    const channel = tasks[i][0];
    const ok = res.status === 'fulfilled' && res.value && res.value.ok;
    if (ok) {
      anyOk = true;
      if (channel === 'email')    mail = 'sent';
      if (channel === 'telegram') tg   = 'sent';
    } else {
      const detail = res.status === 'rejected' ? String(res.reason) : (res.value && res.value.detail) || '';
      console.warn(`${channel}_failed`, detail);
    }
  });

  if (!anyOk) return json({ ok: false, error: 'upstream_failed' }, 502, headers);
  return json({ ok: true, code, mail, telegram: tg, attachments: attachments.length }, 200, headers);
}

// =====================================================================
// Rate limit (Cache API, per-IP rolling window, namespaced)
// =====================================================================

async function checkRateLimit(ip, env, namespace, maxStr, windowStr, defaultMax, defaultWindow) {
  const max    = clampInt(maxStr,    1, 200, defaultMax);
  const window = clampInt(windowStr, 10, 3600, defaultWindow);
  const cache  = caches.default;
  const key    = new Request(`https://rl.invalid/${namespace}/${encodeURIComponent(ip)}`);
  const hit    = await cache.match(key);

  let count = 0;
  let firstSeen = Date.now();
  if (hit) {
    try { const data = await hit.json(); count = data.count; firstSeen = data.firstSeen; }
    catch { /* ignore */ }
  }
  const elapsed = (Date.now() - firstSeen) / 1000;
  if (elapsed > window) { count = 0; firstSeen = Date.now(); }
  count += 1;
  const remaining = Math.max(0, Math.ceil(window - (Date.now() - firstSeen) / 1000));

  await cache.put(key, new Response(JSON.stringify({ count, firstSeen }), {
    headers: { 'content-type': 'application/json', 'cache-control': `public, max-age=${window}` }
  }));

  if (count > max) return { ok: false, retryAfter: remaining };
  return { ok: true };
}

function clampInt(s, min, max, def) {
  const n = parseInt(s, 10);
  if (!Number.isFinite(n)) return def;
  return Math.max(min, Math.min(max, n));
}

// =====================================================================
// Upstream calls
// =====================================================================

async function sendTelegram(env, { code, subject, summary, contact, lang, attachments }) {
  const att = attachments.length
    ? '\n\n' + attachments.map((a) => `📎 ${escapeMd(a.name)} (${fmtSize(a.size)})\n${escapeMd(a.url)}`).join('\n\n')
    : '';
  const text =
    `🧾 *${escapeMd(subject)}*\n` +
    `\`${escapeMd(code)}\` · ${lang.toUpperCase()}\n` +
    (contact ? `📧 ${escapeMd(contact)}\n` : '') +
    `\n${escapeMd(summary)}` + att;

  const r = await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      chat_id: env.CHAT_ID,
      text: text.slice(0, 4000),
      parse_mode: 'MarkdownV2',
      disable_web_page_preview: true
    })
  });
  if (!r.ok) return { ok: false, detail: await safeText(r) };
  return { ok: true };
}

async function sendEmail(env, { code, subject, summary, contact, lang, attachments }) {
  const attHtml = attachments.length
    ? `<div style="margin-top:20px;padding:16px;background:#fff;border:1px solid #e8e7e0;border-radius:8px">
         <div style="font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:#6f6558;margin-bottom:10px">${lang === 'sl' ? 'Priložene datoteke' : 'Attached files'}</div>
         ${attachments.map((a) => `
           <div style="padding:8px 0;border-top:1px solid #f0eee6">
             <a href="${escapeHtml(a.url)}" style="color:#2f4a61;font-weight:600;text-decoration:none">📎 ${escapeHtml(a.name)}</a>
             <span style="color:#6f6558;font-size:12px;margin-left:8px">${fmtSize(a.size)}</span>
           </div>`).join('')}
         <div style="margin-top:10px;font-size:11px;color:#6f6558">${lang === 'sl' ? 'Povezave veljajo 30 dni.' : 'Links expire in 30 days.'}</div>
       </div>`
    : '';

  const html = `<!doctype html>
<html><body style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;background:#f5f4ef;margin:0;padding:24px;color:#242527">
  <table cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #d4d2c8">
    <tr><td style="background:linear-gradient(135deg,#5f8396,#2f4a61);padding:20px 24px;color:#fff">
      <div style="font-size:11px;letter-spacing:.18em;text-transform:uppercase;opacity:.85">${lang === 'sl' ? 'Novo povpraševanje' : 'New project brief'}</div>
      <div style="font-size:20px;font-weight:700;margin-top:4px">${escapeHtml(subject)}</div>
      <div style="font-size:13px;opacity:.85;margin-top:6px">${escapeHtml(code)}</div>
    </td></tr>
    <tr><td style="padding:24px;background:#f5f4ef">
      ${contact ? `<p style="margin:0 0 16px"><strong>${lang === 'sl' ? 'Kontakt:' : 'Contact:'}</strong> <a href="mailto:${escapeHtml(contact)}" style="color:#2f4a61">${escapeHtml(contact)}</a></p>` : ''}
      <pre style="white-space:pre-wrap;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:13px;line-height:1.55;background:#fff;padding:16px;border-radius:8px;border:1px solid #e8e7e0;margin:0">${escapeHtml(summary)}</pre>
      ${attHtml}
    </td></tr>
    <tr><td style="padding:14px 24px;background:#bcb9ac;border-top:1px solid #a8a59a;font-size:11px;color:#242527;letter-spacing:.12em;text-transform:uppercase">
      nacekepa.work · order relay
    </td></tr>
  </table>
</body></html>`;

  const body = {
    from: env.MAIL_FROM,
    to: [env.MAIL_TO],
    subject: `[${code}] ${subject}`,
    html,
    text: `${subject}\n${code} · ${lang.toUpperCase()}\n${contact ? 'Contact: ' + contact + '\n' : ''}\n${summary}` +
          (attachments.length ? '\n\nFiles:\n' + attachments.map((a) => `- ${a.name} (${fmtSize(a.size)}) ${a.url}`).join('\n') : '')
  };
  if (contact && EMAIL_RE.test(contact)) body.reply_to = contact;

  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'authorization': `Bearer ${env.RESEND_API_KEY}`, 'content-type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!r.ok) return { ok: false, detail: await safeText(r) };
  return { ok: true };
}

async function safeText(r) { try { return (await r.text()).slice(0, 300); } catch { return ''; } }

// =====================================================================
// Helpers
// =====================================================================

function clean(v, max) {
  if (typeof v !== 'string') return '';
  return v.replace(CONTROL_CHARS_RE, '').trim().slice(0, max);
}

function corsHeaders(allowed) {
  return {
    'Access-Control-Allow-Origin': allowed || 'null',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Headers': 'content-type',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin'
  };
}

function securityHeaders() {
  return {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'no-referrer',
    'Cache-Control': 'no-store'
  };
}

function json(obj, status, extra) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...extra }
  });
}

function escapeMd(s) {
  return String(s).replace(/[_*\[\]()~`>#+\-=|{}.!\\]/g, (c) => '\\' + c);
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[c]);
}

function fmtSize(n) {
  if (!n || n < 1024) return `${n || 0} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

function encodePath(p) {
  return p.split('/').map(encodeURIComponent).join('/');
}

async function sign(message, secret) {
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}
