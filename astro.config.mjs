// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

// Deployed at https://nacekepa.work/ via GitHub Pages with a custom domain.
// (CNAME file in public/ tells GitHub which domain to serve.)
export default defineConfig({
  site: 'https://nacekepa.work',
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
