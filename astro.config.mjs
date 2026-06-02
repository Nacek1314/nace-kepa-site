// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

// GitHub Pages deploy at https://nacek1314.github.io/nace-kepa-site/
// To switch to a custom domain later: set `site` to https://yourdomain.com,
// remove `base`, add public/CNAME with your domain, and update the Pages settings.
export default defineConfig({
  site: 'https://nacek1314.github.io',
  base: '/nace-kepa-site',
  trailingSlash: 'ignore',
  integrations: [react(), mdx(), sitemap({ i18n: { defaultLocale: 'en', locales: { en: 'en', sl: 'sl' } } })],
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'sl'],
    routing: { prefixDefaultLocale: false }
  },
  vite: {
    plugins: [tailwindcss()],
    ssr: { noExternal: ['three'] }
  }
});
