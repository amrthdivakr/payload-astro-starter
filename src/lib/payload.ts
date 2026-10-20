import { PAYLOAD_URL, SITE_SLUG } from 'astro:env/server';

export type PublicSite = {
  id: number;
  name: string;
  slug: string;
  businessSummary?: string | null;
};

export type PublicPageParent = {
  id: number;
  title: string;
  slug: string;
  path: string;
};

export type PublicPage = {
  id: number;
  slug: string;
  title: string;
  path: string;
  parent?: PublicPageParent | number | null;
  isHomepage?: boolean | null;
  hero?: unknown;
  layout?: unknown[];
  meta?: Record<string, unknown>;
};

export type PublicRedirectPageRef = {
  id: number;
  title: string;
  slug: string;
  path: string;
};

export type PublicRedirect = {
  id: number;
  from: string;
  to?: {
    type?: ('reference' | 'custom') | null;
    reference?: {
      relationTo: 'pages';
      value: number | PublicRedirectPageRef;
    } | null;
    url?: string | null;
  };
};

export type PublicNav = Record<string, unknown> | null;
export type PublicContact = Record<string, unknown> | null;
export type PublicFooter = Record<string, unknown> | null;
export type PublicMedia = Record<string, unknown>;

export type PublicSiteResponse = {
  site: PublicSite;
  pages: PublicPage[];
  nav: PublicNav;
  contact: PublicContact;
  footer: PublicFooter;
  media: PublicMedia[];
  redirects: PublicRedirect[];
};

type PublicApiErrorBody = {
  error?: string;
};

export async function getPublicSite(): Promise<PublicSiteResponse> {
  const slug = SITE_SLUG.trim();

  if (!slug) {
    throw new Error(
      'SITE_SLUG is empty. Set SITE_SLUG in .env to a published tenant slug from Payload.',
    );
  }

  const origin = PAYLOAD_URL.replace(/\/+$/, '');
  const url = `${origin}/api/public/${encodeURIComponent(slug)}`;
  const response = await fetch(url);

  if (!response.ok) {
    let message = `Payload public API failed (${response.status})`;
    try {
      const body = (await response.json()) as PublicApiErrorBody;
      if (typeof body.error === 'string' && body.error) {
        message = `${message}: ${body.error}`;
      }
    } catch {
      // ignore non-JSON error bodies
    }
    throw new Error(message);
  }

  return (await response.json()) as PublicSiteResponse;
}
