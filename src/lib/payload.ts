import { PAYLOAD_URL, SITE_SLUG } from 'astro:env/server';

export type PublicSite = {
  id: number;
  name: string;
  slug: string;
  locales: string[];
  defaultLocale: string;
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
  hide?: boolean | null;
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

/** A populated reference to any routable doc (page, post, product, …). */
export type PublicDocRef = {
  id: number;
  title?: string | null;
  slug?: string | null;
  path?: string | null;
};

export type PublicRedirect = {
  id: number;
  from: string;
  to?: {
    type?: ('reference' | 'custom') | null;
    reference?: {
      relationTo: string;
      value: number | PublicDocRef;
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
    value?: number | PublicDocRef;
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
export type PublicSiteResponse = {
  site: PublicSite;
  locale: string;
  nav: PublicNav;
  contact: PublicContact;
  footer: PublicFooter;
  redirects: PublicRedirect[];
};

/** Collections `/doc` can return. Pages render here; the rest are templates elsewhere. */
export type PublicDocCollection =
  | 'pages'
  | 'posts'
  | 'products'
  | 'product-categories';

export type PublicDocResponse =
  | {
      collection: 'pages';
      locale: string;
      availableLocales: string[];
      doc: PublicPage;
    }
  | {
      collection: Exclude<PublicDocCollection, 'pages'>;
      locale: string;
      availableLocales: string[];
      doc: PublicDocRef & { title: string | null; path: string };
    };

type PublicApiErrorBody = {
  error?: string;
};

export type PublicFetchOptions = {
  draft?: boolean;
  token?: string;
  /** Sent as `?locale=`; Payload uses the site's default locale without it. */
  locale?: string;
};

function siteSlug(): string {
  const slug = SITE_SLUG.trim();
  if (!slug) {
    throw new Error(
      'SITE_SLUG is empty. Set SITE_SLUG in .env to a published tenant slug from Payload.',
    );
  }
  return slug;
}

/**
 * GET `/api/public/:slug<suffix>`. Adds `draft=true` and the JWT header only
 * when both a draft flag and a token are given, and `locale` when set. Returns the raw response
 * so callers can treat 404 themselves; throws on network errors.
 */
async function fetchPublic(
  suffix: string,
  params: URLSearchParams,
  options?: PublicFetchOptions,
): Promise<Response> {
  const useDraft =
    options?.draft === true &&
    typeof options.token === 'string' &&
    options.token.length > 0;

  if (useDraft) {
    params.set('draft', 'true');
  }

  if (options?.locale) {
    params.set('locale', options.locale);
  }

  const origin = PAYLOAD_URL.replace(/\/+$/, '');
  const query = params.toString();
  const url = `${origin}/api/public/${encodeURIComponent(siteSlug())}${suffix}${
    query ? `?${query}` : ''
  }`;

  const headers: HeadersInit = {};
  if (useDraft) {
    headers.Authorization = `JWT ${options!.token}`;
  }

  return fetch(url, { headers });
}

async function failure(response: Response): Promise<Error> {
  let message = `Payload public API failed (${response.status})`;
  try {
    const body = (await response.json()) as PublicApiErrorBody;
    if (typeof body.error === 'string' && body.error) {
      message = `${message}: ${body.error}`;
    }
  } catch {
    // ignore non-JSON error bodies
  }
  return new Error(message);
}

/** Site-wide parts: site, nav, footer, contact, redirects. */
export async function getPublicSite(
  options?: PublicFetchOptions,
): Promise<PublicSiteResponse> {
  const response = await fetchPublic('', new URLSearchParams(), options);
  if (!response.ok) {
    throw await failure(response);
  }
  return (await response.json()) as PublicSiteResponse;
}

/**
 * The one document at `path`, or `null` when Payload answers 404.
 * Any other failure throws, so an outage is never rendered (or cached)
 * as "Not found".
 */
export async function getPublicDoc(
  path: string,
  options?: PublicFetchOptions,
): Promise<PublicDocResponse | null> {
  const response = await fetchPublic(
    '/doc',
    new URLSearchParams({ path }),
    options,
  );
  if (response.status === 404) {
    // Unknown site is a 404 too; that must fail loudly, not look like a missing page.
    const body = (await response
      .clone()
      .json()
      .catch(() => ({}))) as PublicApiErrorBody;
    if (body.error === 'Document not found') {
      return null;
    }
    throw await failure(response);
  }
  if (!response.ok) {
    throw await failure(response);
  }
  return (await response.json()) as PublicDocResponse;
}
