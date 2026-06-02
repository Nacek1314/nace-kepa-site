import en from './en.json';
import sl from './sl.json';

export const dicts = { en, sl } as const;
export type Lang = keyof typeof dicts;
export const LANGS: Lang[] = ['en', 'sl'];
export const DEFAULT_LANG: Lang = 'en';

export function isLang(x: string | undefined): x is Lang {
  return x === 'en' || x === 'sl';
}

export function detectLang(pathname: string): Lang {
  const seg = pathname.replace(/^\/+/, '').split('/')[0];
  return isLang(seg) ? seg : DEFAULT_LANG;
}

export function t(lang: Lang) {
  return dicts[lang];
}

/** Build a URL prefixed with the lang (default lang has no prefix) and the Astro base. */
export function localePath(lang: Lang, path: string, base = import.meta.env.BASE_URL ?? '/'): string {
  const clean = path.startsWith('/') ? path : '/' + path;
  const langPart = lang === DEFAULT_LANG ? '' : '/' + lang;
  const baseClean = base.replace(/\/+$/, '');
  return baseClean + langPart + clean;
}

export function altLang(lang: Lang): Lang {
  return lang === 'en' ? 'sl' : 'en';
}
