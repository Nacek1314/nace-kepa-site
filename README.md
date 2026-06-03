# Nace Kepa — engineering studio site

Personal portfolio + project order site for Nace Kepa: CAD design, 3D printing,
embedded/IoT, and full custom builds. Built with **Astro + Tailwind + React
islands**, deployed free to **GitHub Pages**.

Live (placeholder): `https://nacek1314.github.io/nace-kepa-site/`

## Local development

```powershell
npm install
npm run dev
```

Open http://localhost:4321/nace-kepa-site/.

## How orders work

When a visitor finishes the wizard, a `NK-XXXXXX-brief.txt` file is **downloaded
to their computer** with the full request, and the request is delivered to the
owner. How it is delivered depends on configuration:

- **Direct delivery (recommended).** Set `PUBLIC_WEB3FORMS_KEY` (see
  `.env.example`). The request is sent straight to your inbox via
  [Web3Forms](https://web3forms.com) — no email client needed, with a honeypot
  field and email validation to keep spam out. The visitor's email is used as
  the reply-to so you can answer directly.
- **mailto: fallback (default when no key is set).** The visitor's **email
  client opens** (`mailto:`) pre-filled with the brief, ready to send to
  `kepanace@gmail.com`. This is also used automatically if Web3Forms is
  unreachable.

The contact email lives in `src/components/pages/Order.astro` — change it there
if you ever move addresses.

## Deploy

Push to `main`. GitHub Actions builds and publishes to GitHub Pages.

In repository settings: **Pages → Source = GitHub Actions**.

## Custom domain (later, in 2 minutes)

1. Buy a domain (e.g. `nacekepa.com`).
2. In Cloudflare/your DNS provider, add an `A` record pointing to GitHub Pages
   IPs (`185.199.108.153`, `185.199.109.153`, `185.199.110.153`,
   `185.199.111.153`) and a `CNAME` for `www` → `nacek1314.github.io`.
3. Create `public/CNAME` containing just your domain (e.g. `nacekepa.com`).
4. In `astro.config.mjs`: change `site` to `https://nacekepa.com` and remove
   the `base` line.
5. In repo Settings → Pages → Custom domain, enter `nacekepa.com` and tick
   "Enforce HTTPS".
6. Push to `main`. Done.

## Project structure

```
src/
  components/         shared Astro + React components
    pages/            page bodies (rendered from /en and /sl route wrappers)
  content/            services, projects, skills, faq (bilingual JSON)
  i18n/               en.json, sl.json, helpers
  layouts/            BaseLayout.astro
  pages/              EN routes (default lang)
  pages/sl/           SL mirrored routes
  styles/             global.css (Tailwind 4)
public/
  CNAME               (commented; uncomment + put your domain when buying)
.github/workflows/
  deploy.yml          GH Pages CI
```

## Adding a new project

1. Create `src/content/projects/my-project.json` (see existing entries for the
   schema).
2. Drop photos into `public/projects/my-project/` and reference them from the
   `photos` array (paths are relative to the site root).
3. Push. The portfolio grid + case-study page rebuild automatically.
