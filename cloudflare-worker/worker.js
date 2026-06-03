/**
 * Cloudflare Worker — order relay for nace-kepa-site.
 *
 * Receives JSON order payloads from the static site and forwards them to a
 * Telegram chat using a bot token. The bot token never leaves the Worker;
 * the site only knows the public Worker URL.
 *
 * Required Worker environment variables (set as encrypted secrets):
 *   BOT_TOKEN  — Telegram bot token from @BotFather
 *   CHAT_ID    — your numeric chat id (get from https://api.telegram.org/bot<token>/getUpdates)
 *
 * Optional:
 *   ALLOWED_ORIGIN — exact origin allowed to POST (e.g. https://nacek1314.github.io).
 *                    If unset, all origins allowed (less safe but works for custom domains).
 */

const MAX_BODY_BYTES = 32_000; // Telegram message limit is ~4096 chars; we chunk if needed.

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const cors = corsHeaders(origin, env.ALLOWED_ORIGIN);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors });
    }
    if (request.method !== 'POST') {
      return json({ ok: false, error: 'method_not_allowed' }, 405, cors);
    }
    if (env.ALLOWED_ORIGIN && origin && origin !== env.ALLOWED_ORIGIN) {
      return json({ ok: false, error: 'forbidden_origin' }, 403, cors);
    }

    let payload;
    try {
      const raw = await request.text();
      if (raw.length > MAX_BODY_BYTES) {
        return json({ ok: false, error: 'payload_too_large' }, 413, cors);
      }
      payload = JSON.parse(raw);
    } catch {
      return json({ ok: false, error: 'invalid_json' }, 400, cors);
    }

    // Honeypot: if the hidden field is filled, silently succeed (it's a bot).
    if (payload.website) return json({ ok: true, code: payload.code || 'NK-XXXXXX' }, 200, cors);

    const code = String(payload.code || 'NK-UNKNOWN').slice(0, 16);
    const subject = String(payload.subject || 'New order').slice(0, 200);
    const summary = String(payload.summary || '').slice(0, 6000);
    const contact = String(payload.contact || '').slice(0, 200);
    const lang = payload.lang === 'sl' ? 'sl' : 'en';

    const text =
      `🧾 *${escapeMd(subject)}*\n` +
      `\`${escapeMd(code)}\` · ${lang.toUpperCase()}\n` +
      (contact ? `📧 ${escapeMd(contact)}\n` : '') +
      `\n${escapeMd(summary)}`;

    if (!env.BOT_TOKEN || !env.CHAT_ID) {
      return json({ ok: false, error: 'worker_not_configured' }, 500, cors);
    }

    try {
      const tg = await fetch(
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
      if (!tg.ok) {
        const errText = await tg.text();
        return json({ ok: false, error: 'telegram_failed', detail: errText.slice(0, 300) }, 502, cors);
      }
      return json({ ok: true, code }, 200, cors);
    } catch (e) {
      return json({ ok: false, error: 'fetch_failed', detail: String(e).slice(0, 200) }, 502, cors);
    }
  }
};

function corsHeaders(origin, allowed) {
  const allow = allowed || origin || '*';
  return {
    'access-control-allow-origin': allow,
    'access-control-allow-methods': 'POST, OPTIONS',
    'access-control-allow-headers': 'content-type',
    'access-control-max-age': '86400',
    'vary': 'Origin'
  };
}

function json(obj, status, extra) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', ...extra }
  });
}

// MarkdownV2 requires escaping these characters.
function escapeMd(s) {
  return String(s).replace(/[_*\[\]()~`>#+\-=|{}.!\\]/g, (c) => '\\' + c);
}
