import type { PublicSite } from './payload';

/**
 * The one place the URL prefix rule lives (i18n task 4):
 * a site with several locales has `/{locale}` in front of every path,
 * the default locale included; a site with one locale has no prefix.
 * Paths are not translated, so `path` is the same in every locale.
 */

export type LocaleRoute = {
  locale: string;
  /** Payload `path`, without the locale prefix. */
  path: string;
};

export function isMultiLocale(site: PublicSite): boolean {
  return site.locales.length > 1;
}

/**
 * Locale and Payload path for a request path. On a multi-locale site the
 * first segment must be one of the site's locales, else `null`.
 */
export function splitLocale(
  pathname: string,
  site: PublicSite,
): LocaleRoute | null {
  if (!isMultiLocale(site)) {
    return { locale: site.defaultLocale, path: pathname };
  }
  const match = /^\/([^/]+)(\/.*)?$/.exec(pathname);
  if (!match || !site.locales.includes(match[1])) {
    return null;
  }
  const rest = match[2] ?? '/';
  return { locale: match[1], path: rest.replace(/\/+$/, '') || '/' };
}

/** `/{locale}` on a multi-locale site, `''` on a one-locale site. */
export function localePrefix(locale: string, site: PublicSite): string {
  return isMultiLocale(site) ? `/${locale}` : '';
}

/** Payload path with a prefix: `/fr` + `/` → `/fr`, `/fr` + `/a` → `/fr/a`. */
export function withPrefix(path: string, prefix: string): string {
  if (!prefix) {
    return path;
  }
  return path === '/' ? prefix : `${prefix}${path}`;
}
