import type { PublicDocRef, PublicRedirect } from './payload';
import { withPrefix } from './locale';

/** Strip trailing slashes except for root `/`. */
export function normalizePath(path: string): string {
  if (path === '/' || path === '') {
    return '/';
  }
  return path.replace(/\/+$/, '') || '/';
}

/**
 * Path of a populated reference, with the locale prefix.
 * A bare id means Payload didn't populate it: no link.
 */
function resolveReferencePath(
  value: number | PublicDocRef,
  prefix: string,
): string | undefined {
  if (typeof value === 'number') {
    return undefined;
  }
  return value.path ? withPrefix(normalizePath(value.path), prefix) : undefined;
}

/**
 * Destination path or URL for a redirect, or undefined if unusable.
 * A reference gets `prefix` (the locale's); a custom URL stays as typed.
 */
export function resolveRedirectDestination(
  redirect: PublicRedirect,
  prefix: string,
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
    return resolveReferencePath(ref, prefix);
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

/**
 * Skip redirect when destination is missing or same as the current request
 * path (`currentPathname` is the full path, prefix included).
 */
export function redirectDestinationIfValid(
  redirect: PublicRedirect,
  currentPathname: string,
  prefix: string,
): string | undefined {
  const destination = resolveRedirectDestination(redirect, prefix);
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
