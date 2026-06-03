/**
 * Local Resend smoke test — verifies the API key works before wiring it
 * into the Cloudflare Worker.
 *
 * Usage (PowerShell):
 *   $env:RESEND_API_KEY = "re_xxxxxxxxxxxx"
 *   node scripts/test-resend.mjs
 *
 * The key is read from the env var so it never lands in git.
 * Uses the bundled fetch (Node 18+) — no npm install needed.
 */

const KEY  = process.env.RESEND_API_KEY;
const TO   = process.env.MAIL_TO   || 'kepanace@gmail.com';
const FROM = process.env.MAIL_FROM || 'Nace Kepa <onboarding@resend.dev>';

if (!KEY) {
  console.error('❌ RESEND_API_KEY not set.');
  console.error('   PowerShell: $env:RESEND_API_KEY = "re_..."');
  process.exit(1);
}

const html = `<!doctype html>
<html><body style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;background:#f5f4ef;margin:0;padding:24px;color:#242527">
  <table cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #d4d2c8">
    <tr><td style="background:linear-gradient(135deg,#5f8396,#2f4a61);padding:20px 24px;color:#fff">
      <div style="font-size:11px;letter-spacing:.18em;text-transform:uppercase;opacity:.85">Smoke test</div>
      <div style="font-size:20px;font-weight:700;margin-top:4px">Resend works ✓</div>
    </td></tr>
    <tr><td style="padding:24px;font-size:14px;line-height:1.55">
      Če to vidiš v Gmailu, je API key veljaven. Zdaj ga lahko prilepiš v
      Cloudflare Worker secret <code>RESEND_API_KEY</code> in vse povpraševanja
      preko <strong>nacekepa.work/order</strong> bodo dostavljena tudi po e-pošti.
    </td></tr>
    <tr><td style="padding:14px 24px;background:#f5f4ef;border-top:1px solid #e8e7e0;font-size:11px;color:#6f6558;letter-spacing:.12em;text-transform:uppercase">
      nacekepa.work · resend smoke test
    </td></tr>
  </table>
</body></html>`;

const res = await fetch('https://api.resend.com/emails', {
  method: 'POST',
  headers: {
    'authorization': `Bearer ${KEY}`,
    'content-type': 'application/json'
  },
  body: JSON.stringify({
    from: FROM,
    to: [TO],
    subject: 'Resend smoke test — nacekepa.work',
    html,
    text: 'Resend works. API key is valid. Add it to the Cloudflare Worker now.'
  })
});

const body = await res.text();
if (!res.ok) {
  console.error(`❌ Resend rejected the request (HTTP ${res.status})`);
  console.error(body);
  process.exit(1);
}

console.log(`✅ Sent. Check ${TO} in a few seconds.`);
console.log(body);
