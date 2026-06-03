/**
 * Cloudflare Worker — order relay for nace-kepa-site.
 *
 * Hardened: strict origin, per-IP rate limit, input validation, no upstream
 * error leakage, security headers.
 *
 * Receives JSON order payloads and forwards them to:
 *   1. A Telegram chat (instant push notification).
 *   2. An email inbox via Resend (durable archive + reply-to customer).
 *
 * Required Worker environment variables:
 *   BOT_TOKEN       — Telegram bot token (Secret)
 *   CHAT_ID         — Telegram chat id (Secret)
 *   ALLOWED_ORIGIN  — exact origin (e.g. https://nacekepa.work) (Text). REQUIRED.
 *
 * Optional (email mirror):
 *   RESEND_API_KEY  — Resend API key (Secret)
 *   MAIL_FROM       — verified sender (Text)
 *   MAIL_TO         — destination inbox (Text)
 *
 * Optional (rate limit overrides — defaults shown):
 *   RATE_LIMIT_MAX     — requests per window per IP (default "5")
 *   RATE_LIMIT_WINDOW  — seconds (default "300" = 5 min)
 */

const MAX_BODY_BYTES   = 16_000;
const MAX_SUMMARY      = 6000;
const MAX_SUBJECT      = 200;
const MAX_CONTACT      = 200;
const MAX_CODE         = 16;
const MIN_SUMMARY      = 10;
const ALLOWED_LANGS    = new Set(['en', 'sl']);
const EMAIL_RE         = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CONTROL_CHARS_RE = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

export default {
  async fetch(request, env) {
    const cors = corsHeaders(env.ALLOWED_ORIGIN);
    const sec  = securityHeaders();
    const headers = { ...cors, ...sec };

    // Hard requirement: ALLOWED_ORIGIN must be configured.
    if (!env.ALLOWED_ORIGIN) {
      return json({ ok: false, error: 'worker_misconfigured' }, 500, sec);
    }

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers });
    }
    if (request.method !== 'POST') {
      return json({ ok: false, error: 'method_not_allowed' }, 405, headers);
    }

    // Strict origin check (not just CORS — block server-to-server too).
    const origin  = request.headers.get('Origin')  || '';
    const referer = request.headers.get('Referer') || '';
    if (origin !== env.ALLOWED_ORIGIN && !referer.startsWith(env.ALLOWED_ORIGIN + '/')) {
      return json({ ok: false, error: 'forbidden_origin' }, 403, headers);
    }

    // Content-Type guard — block form-encoded CSRF probes.
    const ct = request.headers.get('Content-Type') || '';
    if (!ct.toLowerCase().includes('application/json')) {
      return json({ ok: false, error: 'unsupported_media_type' }, 415, headers);
    }

    // Per-IP rate limit using the Cache API (no KV setup required).
    const ip = request.headers.get('CF-Connecting-IP') || '0.0.0.0';
    const rl = await checkRateLimit(ip, env);
    if (!rl.ok) {
      return json({ ok: false, error: 'rate_limited', retry_after: rl.retryAfter }, 429, {
        ...headers,
        'Retry-After': String(rl.retryAfter)
      });
    }

    let raw;
    try {
      raw = await request.text();
    } catch {
      return json({ ok: false, error: 'read_failed' }, 400, headers);
    }
    if (raw.length > MAX_BODY_BYTES) {
      return json({ ok: false, error: 'payload_too_large' }, 413, headers);
    }

    let payload;
    try {
      payload = JSON.parse(raw);
    } catch {
      return json({ ok: false, error: 'invalid_json' }, 400, headers);
    }
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      return json({ ok: false, error: 'invalid_payload' }, 400, headers);
    }

    // Honeypot — silent success for bots.
    if (payload.website) {
      return json({ ok: true, code: 'NK-XXXXXX' }, 200, headers);
    }

    // Validate + sanitize.
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

    if (!env.BOT_TOKEN || !env.CHAT_ID) {
      return json({ ok: false, error: 'worker_misconfigured' }, 500, headers);
    }

    const tasks = [sendTelegram(env, { code, subject, summary, contact, lang })];
    if (env.RESEND_API_KEY && env.MAIL_FROM && env.MAIL_TO) {
      tasks.push(sendEmail(env, { code, subject, summary, contact, lang }));
    }

    const results = await Promise.allSettled(tasks);
    const tg = results[0];

    if (tg.status === 'rejected' || (tg.value && tg.value.ok === false)) {
      // Don't leak upstream details to the caller — log only.
      console.warn('telegram_failed',
        tg.status === 'rejected' ? String(tg.reason) : tg.value.detail);
      return json({ ok: false, error: 'upstream_failed' }, 502, headers);
    }

    const em = results[1];
    let mail = 'skipped';
    if (em) {
      if (em.status === 'fulfilled' && em.value.ok) mail = 'sent';
      else {
        mail = 'failed';
        console.warn('email_failed',
          em.status === 'rejected' ? String(em.reason) : em.value.detail);
      }
    }

    return json({ ok: true, code, mail }, 200, headers);
  }
};

// ---------- Rate limit (Cache-API based, per-IP rolling window) ----------

async function checkRateLimit(ip, env) {
  const max    = clampInt(env.RATE_LIMIT_MAX,    1, 100, 5);
  const window = clampInt(env.RATE_LIMIT_WINDOW, 10, 3600, 300);

  const cache  = caches.default;
  const key    = new Request(`https://rl.invalid/${encodeURIComponent(ip)}`);
  const hit    = await cache.match(key);

  let count = 0;
  let firstSeen = Date.now();
  if (hit) {
    try {
      const data = await hit.json();
      count = data.count;
      firstSeen = data.firstSeen;
    } catch { /* ignore */ }
  }

  const elapsed = (Date.now() - firstSeen) / 1000;
  if (elapsed > window) { count = 0; firstSeen = Date.now(); }

  count += 1;
  const remaining = Math.max(0, Math.ceil(window - (Date.now() - firstSeen) / 1000));

  // Persist with a TTL covering the full window.
  const body = JSON.stringify({ count, firstSeen });
  await cache.put(key, new Response(body, {
    headers: {
      'content-type': 'application/json',
      'cache-control': `public, max-age=${window}`
    }
  }));

  if (count > max) return { ok: false, retryAfter: remaining };
  return { ok: true };
}

function clampInt(s, min, max, def) {
  const n = parseInt(s, 10);
  if (!Number.isFinite(n)) return def;
  return Math.max(min, Math.min(max, n));
}

// ---------- Upstream calls ----------

async function sendTelegram(env, { code, subject, summary, contact, lang }) {
  const text =
    `🧾 *${escapeMd(subject)}*\n` +
    `\`${escapeMd(code)}\` · ${lang.toUpperCase()}\n` +
    (contact ? `📧 ${escapeMd(contact)}\n` : '') +
    `\n${escapeMd(summary)}`;

  const r = await fetch(
    `https://api.telegram.org/bot${env.BOT_TOKEN}/sendMessage`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        chat_id: env.CHAT_ID,
        text: text.slice(0, 4000),
        parse_mode: 'MarkdownV2',
        disable_web_page_preview: true
      })
    }
  );
  if (!r.ok) return { ok: false, detail: await safeText(r) };
  return { ok: true };
}

async function sendEmail(env, { code, subject, summary, contact, lang }) {
  const html = `<!doctype html>
<html><body style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;background:#f5f4ef;margin:0;padding:24px;color:#242527">
  <table cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #d4d2c8">
    <tr><td style="background:linear-gradient(135deg,#5f8396,#2f4a61);padding:20px 24px;color:#fff">
      <div style="font-size:11px;letter-spacing:.18em;text-transform:uppercase;opacity:.85">${lang === 'sl' ? 'Novo povpraševanje' : 'New project brief'}</div>
      <div style="font-size:20px;font-weight:700;margin-top:4px">${escapeHtml(subject)}</div>
      <div style="font-size:13px;opacity:.85;margin-top:6px">${escapeHtml(code)}</div>
    </td></tr>
    <tr><td style="padding:24px">
      ${contact ? `<p style="margin:0 0 16px"><strong>${lang === 'sl' ? 'Kontakt:' : 'Contact:'}</strong> <a href="mailto:${escapeHtml(contact)}" style="color:#2f4a61">${escapeHtml(contact)}</a></p>` : ''}
      <pre style="white-space:pre-wrap;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:13px;line-height:1.55;background:#f5f4ef;padding:16px;border-radius:8px;border:1px solid #e8e7e0;margin:0">${escapeHtml(summary)}</pre>
    </td></tr>
    <tr><td style="padding:14px 24px;background:#f5f4ef;border-top:1px solid #e8e7e0;font-size:11px;color:#6f6558;letter-spacing:.12em;text-transform:uppercase">
      nacekepa.work · order relay
    </td></tr>
  </table>
</body></html>`;

  const body = {
    from: env.MAIL_FROM,
    to: [env.MAIL_TO],
    subject: `[${code}] ${subject}`,
    html,
    text: `${subject}\n${code} · ${lang.toUpperCase()}\n${contact ? 'Contact: ' + contact + '\n' : ''}\n${summary}`
  };
  if (contact && EMAIL_RE.test(contact)) {
    body.reply_to = contact;
  }

  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'authorization': `Bearer ${env.RESEND_API_KEY}`,
      'content-type': 'application/json'
    },
    body: JSON.stringify(body)
  });
  if (!r.ok) return { ok: false, detail: await safeText(r) };
  return { ok: true };
}

async function safeText(r) {
  try { return (await r.text()).slice(0, 300); } catch { return ''; }
}

// ---------- Helpers ----------

function clean(v, max) {
  if (typeof v !== 'string') return '';
  return v.replace(CONTROL_CHARS_RE, '').trim().slice(0, max);
}

function corsHeaders(allowed) {
  return {
    'Access-Control-Allow-Origin': allowed || 'null',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
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
