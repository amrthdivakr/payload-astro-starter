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

export type PublicLexicalContent = {
  root?: { children?: unknown[] };
  [key: string]: unknown;
};

export type PublicSectionChrome = {
  eyebrow?: string | null;
  heading?: string | null;
  subheading?: string | null;
  content?: PublicLexicalContent | null;
  media?: Array<PublicMediaRef | number> | null;
  backgroundMedia?: Array<PublicMediaRef | number> | null;
  links?: PublicLinkRow[] | null;
  variant?: string | null;
  customVariant?: string | null;
};

export type PublicHero = PublicSectionChrome & {
  type?: string | null;
};

export type PublicSectionBlock = PublicSectionChrome & {
  blockType: 'section';
  id?: string | null;
};

export type PublicItemsRow = {
  eyebrow?: string | null;
  title?: string | null;
  subtitle?: string | null;
  text?: string | null;
  media?: PublicMediaRef | number | null;
  enableLink?: boolean | null;
  link?: PublicLink | null;
  id?: string | null;
};

export type PublicItemsBlock = PublicSectionChrome & {
  blockType: 'items';
  items?: PublicItemsRow[] | null;
  id?: string | null;
};

export type PublicHtmlBlock = {
  blockType: 'html';
  label?: string | null;
  html?: string | null;
  id?: string | null;
  customVariant?: string | null;
};

export type PublicFormBlock = {
  blockType: 'formBlock';
  form?: { title?: string | null } | number | null;
  id?: string | null;
};

export type PublicLayoutBlock =
  | PublicSectionBlock
  | PublicItemsBlock
  | PublicHtmlBlock
  | PublicFormBlock
  | { blockType?: string; customVariant?: string | null; id?: string | null };

export type PublicPage = {
  id: number;
  slug: string;
  title: string;
  path: string;
  parent?: PublicPageParent | number | null;
  isHomepage?: boolean | null;
  hero?: PublicHero | null;
  layout?: PublicLayoutBlock[] | null;
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

export type PublicMediaRef = {
  id?: number;
  url?: string | null;
  alt?: string | null;
};

export type PublicLink = {
  type?: 'reference' | 'custom' | string;
  label?: string | null;
  url?: string | null;
  newTab?: boolean | null;
  reference?: {
    relationTo?: string;
    value?: number | { id?: number; path?: string; title?: string; slug?: string };
  } | null;
};

export type PublicLinkRow = { link?: PublicLink };

export type PublicNavItem = {
  link?: PublicLink;
  children?: PublicLinkRow[];
};

export type PublicNav = {
  id?: number;
  title?: string;
  logo?: PublicMediaRef | number | null;
  cta?: PublicLink | null;
  items?: PublicNavItem[];
} | null;

export type PublicContact = Record<string, unknown> | null;

export type PublicFooterColumn = {
  heading?: string | null;
  links?: PublicLinkRow[];
};

export type PublicFooter = {
  id?: number;
  title?: string;
  logo?: PublicMediaRef | number | null;
  tagline?: string | null;
  columns?: PublicFooterColumn[];
  legalLinks?: PublicLinkRow[];
  social?: PublicLinkRow[];
  certs?: Array<PublicMediaRef | number> | null;
} | null;
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
