/**
 * Cloudflare Worker — order relay for nace-kepa-site.
 *
 * Receives JSON order payloads from the static site and forwards them to:
 *   1. A Telegram chat (instant push notification).
 *   2. An email inbox via Resend (durable archive + reply-to customer).
 *
 * The bot token & API key never leave the Worker; the site only knows the
 * public Worker URL.
 *
 * Required Worker environment variables (set as encrypted secrets):
 *   BOT_TOKEN       — Telegram bot token from @BotFather
 *   CHAT_ID         — your numeric chat id
 *
 * Optional (enable email mirror):
 *   RESEND_API_KEY  — API key from https://resend.com (free tier 100/day)
 *   MAIL_FROM       — verified sender, e.g. "Nace Kepa <orders@nacekepa.work>"
 *   MAIL_TO         — destination inbox, e.g. "kepanace@gmail.com"
 *
 * Optional (security):
 *   ALLOWED_ORIGIN  — exact origin allowed to POST (e.g. https://nacekepa.work).
 */

const MAX_BODY_BYTES = 32_000;

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

    // Honeypot.
    if (payload.website) return json({ ok: true, code: payload.code || 'NK-XXXXXX' }, 200, cors);

    const code = String(payload.code || 'NK-UNKNOWN').slice(0, 16);
    const subject = String(payload.subject || 'New order').slice(0, 200);
    const summary = String(payload.summary || '').slice(0, 6000);
    const contact = String(payload.contact || '').slice(0, 200);
    const lang = payload.lang === 'sl' ? 'sl' : 'en';

    if (!env.BOT_TOKEN || !env.CHAT_ID) {
      return json({ ok: false, error: 'worker_not_configured' }, 500, cors);
    }

    // Fan-out: Telegram + (optional) email in parallel.
    const tasks = [sendTelegram(env, { code, subject, summary, contact, lang })];
    if (env.RESEND_API_KEY && env.MAIL_FROM && env.MAIL_TO) {
      tasks.push(sendEmail(env, { code, subject, summary, contact, lang }));
    }

    const results = await Promise.allSettled(tasks);
    const tgResult = results[0];

    if (tgResult.status === 'rejected' || (tgResult.value && tgResult.value.ok === false)) {
      const detail = tgResult.status === 'rejected'
        ? String(tgResult.reason).slice(0, 300)
        : (tgResult.value.detail || '').slice(0, 300);
      return json({ ok: false, error: 'telegram_failed', detail }, 502, cors);
    }

    const emailResult = results[1];
    const mail = emailResult
      ? (emailResult.status === 'fulfilled' && emailResult.value.ok ? 'sent' : 'failed')
      : 'skipped';

    return json({ ok: true, code, mail }, 200, cors);
  }
};

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
  if (!r.ok) {
    const detail = await r.text();
    return { ok: false, detail };
  }
  return { ok: true };
}

async function sendEmail(env, { code, subject, summary, contact, lang }) {
  const safeSummary = escapeHtml(summary);
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
      <pre style="white-space:pre-wrap;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:13px;line-height:1.55;background:#f5f4ef;padding:16px;border-radius:8px;border:1px solid #e8e7e0;margin:0">${safeSummary}</pre>
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
  // Reply directly to the customer when they provided an email.
  if (contact && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact)) {
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
  if (!r.ok) {
    const detail = await r.text();
    return { ok: false, detail };
  }
  return { ok: true };
}

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

function escapeMd(s) {
  return String(s).replace(/[_*\[\]()~`>#+\-=|{}.!\\]/g, (c) => '\\' + c);
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[c]);
}
