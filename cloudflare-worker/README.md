# Order relay — Cloudflare Worker setup

Forwards order submissions from the static site to your Telegram chat.
The bot token is stored as a Worker secret; it never appears in the repo
or in browser HTML.

---

## 1. Create the Telegram bot

1. Open Telegram, message **@BotFather**, send `/newbot`.
2. Follow the prompts. Save the **bot token** that BotFather gives you
   (looks like `1234567890:AAH...`).
3. Open a chat with your new bot and send it any message (e.g. `/start`).
4. In a browser, visit:
   ```
   https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates
   ```
   In the JSON response, find `"chat":{"id":...}`. That number is your
   **chat id** (may be negative for groups).

## 2. Create the Cloudflare Worker

1. Sign up at <https://dash.cloudflare.com/sign-up> (free, no card).
2. Workers & Pages → **Create** → **Create Worker** → name it
   `nace-kepa-order` → **Deploy** (the default hello-world is fine for now).
3. Open the new Worker → **Edit code** (top-right).
4. Replace the entire file with the contents of [`worker.js`](./worker.js)
   and click **Deploy**.

## 3. Add the secrets

Worker page → **Settings** → **Variables and Secrets** → **Add variable**:

| Name             | Type   | Value                                       |
| ---------------- | ------ | ------------------------------------------- |
| `BOT_TOKEN`      | Secret | the bot token from BotFather                |
| `CHAT_ID`        | Secret | your numeric chat id                        |
| `ALLOWED_ORIGIN` | Text   | `https://nacekepa.work` (no trailing slash) |

Click **Deploy** after adding them.

## 3b. (Optional) Email mirror via Resend

Adds an HTML email copy of every order to your inbox, with `Reply-To` set
to the customer so you can answer with one click.

1. Sign up at <https://resend.com> (free, 100 emails/day, no card).
2. **API Keys → Create API Key** → copy it.
3. **Domains → Add Domain** → enter `nacekepa.work` → add the 3 DNS records
   Resend shows (SPF + DKIM + return-path) at your DNS host. Wait for
   "Verified" (usually a few minutes).
4. Back in the Worker → **Settings → Variables and Secrets** → add:

   | Name             | Type   | Value                                          |
   | ---------------- | ------ | ---------------------------------------------- |
   | `RESEND_API_KEY` | Secret | the API key from step 2                        |
   | `MAIL_FROM`      | Text   | `Nace Kepa <orders@nacekepa.work>`             |
   | `MAIL_TO`        | Text   | `kepanace@gmail.com`                           |

5. Click **Deploy**.

Without these three vars the Worker still works — it just skips email and
sends Telegram only. The site response now includes `mail: "sent"`,
`"failed"`, or `"skipped"` so you can confirm.

> Quick test before DNS is verified: use `MAIL_FROM=onboarding@resend.dev`
> (Resend's shared sandbox sender) — only delivers to the address you
> signed up with, but proves the wiring works.

## 4. Copy the Worker URL

Top of the Worker page, something like
`https://nace-kepa-order.<your-subdomain>.workers.dev`.

## 5. Wire it into the site

In the project root, edit `.env` (create if missing):

```
PUBLIC_ORDER_ENDPOINT=https://nace-kepa-order.<your-subdomain>.workers.dev
```

For GitHub Actions deploy, add the same value as a **repository variable**
(not a secret — it's a public URL):

`https://github.com/Nacek1314/nace-kepa-site/settings/variables/actions`
→ **New repository variable** → name `PUBLIC_ORDER_ENDPOINT`, value = the
worker URL.

Then update `.github/workflows/deploy.yml` build step (already done in
this repo) to expose it during build:

```yaml
      - name: Build
        env:
          PUBLIC_ORDER_ENDPOINT: ${{ vars.PUBLIC_ORDER_ENDPOINT }}
        run: npm run build
```

Push, wait for the green deploy, submit a test order — you should get a
Telegram DM within a second.

## 6. Test locally

```powershell
$env:PUBLIC_ORDER_ENDPOINT = "https://nace-kepa-order.<your-subdomain>.workers.dev"
npm run dev
```

## Failure mode

If `PUBLIC_ORDER_ENDPOINT` is missing or the worker is unreachable, the
order wizard automatically falls back to the original mailto + file
download flow. Nothing is lost.
