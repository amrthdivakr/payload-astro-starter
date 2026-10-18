import { PAYLOAD_URL, SITE_SLUG } from 'astro:env/server';

export type PublicSite = {
  id: number;
  name: string;
  slug: string;
  businessSummary?: string | null;
};

export type PublicPage = {
  id: number;
  slug: string;
  title: string;
  hero?: unknown;
  layout?: unknown[];
  meta?: Record<string, unknown>;
  [key: string]: unknown;
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
