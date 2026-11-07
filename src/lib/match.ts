import type { PublicDocRef, PublicRedirect } from './payload';

/** Strip trailing slashes except for root `/`. */
export function normalizePath(path: string): string {
  if (path === '/' || path === '') {
    return '/';
  }
  return path.replace(/\/+$/, '') || '/';
}

/** Path of a populated reference. A bare id means Payload didn't populate it: no link. */
function resolveReferencePath(
  value: number | PublicDocRef,
): string | undefined {
  if (typeof value === 'number') {
    return undefined;
  }
  return value.path ? normalizePath(value.path) : undefined;
}

/** Destination path or URL for a redirect, or undefined if unusable. */
export function resolveRedirectDestination(
  redirect: PublicRedirect,
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
    return resolveReferencePath(ref);
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
  currentPathname: string,
): string | undefined {
  const destination = resolveRedirectDestination(redirect);
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
