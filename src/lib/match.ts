import type { PublicPage, PublicRedirect } from './payload';

/** Strip trailing slashes except for root `/`. */
export function normalizePath(path: string): string {
  if (path === '/' || path === '') {
    return '/';
  }
  return path.replace(/\/+$/, '') || '/';
}

export function findPageByPath(
  pages: PublicPage[],
  pathname: string,
): PublicPage | undefined {
  const normalized = normalizePath(pathname);
  return pages.find((page) => normalizePath(page.path) === normalized);
}

function resolveReferencePath(
  value: number | { id: number; path: string },
  pages: PublicPage[],
): string | undefined {
  if (typeof value === 'number') {
    const page = pages.find((p) => p.id === value);
    return page ? normalizePath(page.path) : undefined;
  }
  if (value.path) {
    return normalizePath(value.path);
  }
  return undefined;
}

/** Destination path or URL for a redirect, or undefined if unusable. */
export function resolveRedirectDestination(
  redirect: PublicRedirect,
  pages: PublicPage[],
): string | undefined {
  const to = redirect.to;
  if (!to?.type) {
    return undefined;
  }

  if (to.type === 'custom') {
    const url = to.url?.trim();
    return url || undefined;
  }

  if (to.type === 'reference') {
    const ref = to.reference?.value;
    if (ref == null) {
      return undefined;
    }
    return resolveReferencePath(ref, pages);
  }

  return undefined;
}

export function findRedirectByFrom(
  redirects: PublicRedirect[],
  pathname: string,
): PublicRedirect | undefined {
  const normalized = normalizePath(pathname);
  return redirects.find((r) => normalizePath(r.from) === normalized);
}

/** Skip redirect when destination is missing or same as current path. */
export function redirectDestinationIfValid(
  redirect: PublicRedirect,
  pages: PublicPage[],
  currentPathname: string,
): string | undefined {
  const destination = resolveRedirectDestination(redirect, pages);
  if (!destination) {
    return undefined;
  }
  const current = normalizePath(currentPathname);
  const destNormalized =
    destination.startsWith('http://') || destination.startsWith('https://')
      ? destination
      : normalizePath(destination);
  if (destNormalized === current) {
    return undefined;
  }
  return destination;
}
