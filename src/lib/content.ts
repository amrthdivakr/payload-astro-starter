import { PAYLOAD_URL } from 'astro:env/server';
import { normalizePath } from './match';
import { withPrefix } from './locale';

type LinkPayload = {
  type?: string;
  url?: string | null;
  newTab?: boolean | null;
  reference?: {
    relationTo?: string;
    value?: number | { id?: number; path?: string };
  } | null;
  file?: number | { url?: string | null } | null;
  label?: string | null;
};

function unwrapLink(link: unknown): unknown {
  if (link && typeof link === 'object' && 'link' in link) {
    const wrapped = link as { link?: unknown };
    if (wrapped.link && typeof wrapped.link === 'object') {
      return wrapped.link;
    }
  }
  return link;
}

/**
 * Path of a populated reference, with the current locale's prefix.
 * A bare id means Payload didn't populate it: no link.
 */
function resolveReferencePath(
  value: number | { path?: string | null },
  prefix: string,
): string | undefined {
  if (typeof value === 'number') {
    return undefined;
  }
  return value.path ? withPrefix(normalizePath(value.path), prefix) : undefined;
}

/**
 * href for a link field. `prefix` is the current locale's (`Astro.locals.prefix`):
 * only references get it; custom URLs stay as typed, files are media URLs.
 */
export function hrefFromLink(link: unknown, prefix: string): string | undefined {
  const raw = unwrapLink(link);
  if (!raw || typeof raw !== 'object') {
    return undefined;
  }

  const l = raw as LinkPayload;
  if (l.type === 'custom') {
    const url = l.url?.trim();
    return url || undefined;
  }

  if (l.type === 'file') {
    return typeof l.file === 'object' ? mediaUrl(l.file, PAYLOAD_URL) : undefined;
  }

  if (l.type === 'reference') {
    const ref = l.reference?.value;
    if (ref == null) {
      return undefined;
    }
    return resolveReferencePath(ref, prefix);
  }

  return undefined;
}

export function mediaUrl(
  media: string | { url?: string | null } | null | undefined,
  origin: string,
): string | undefined {
  let raw: string | null | undefined;
  if (typeof media === 'string') {
    raw = media;
  } else if (media && typeof media === 'object') {
    raw = media.url;
  } else {
    return undefined;
  }

  const url = raw?.trim();
  if (!url) {
    return undefined;
  }

  if (url.startsWith('/')) {
    const base = origin.replace(/\/+$/, '');
    return `${base}${url}`;
  }

  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }

  return url;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Trimmed string, or undefined when empty or not a string. */
export function textField(
  value: string | null | undefined,
): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
}

type LexicalNode = {
  type?: string;
  tag?: string;
  listType?: string;
  text?: unknown;
  format?: unknown;
  fields?: {
    linkType?: string;
    url?: string | null;
    newTab?: boolean | null;
    doc?: LinkPayload['reference'];
  } | null;
  children?: unknown[];
  /** Upload node: the media doc (populated) or its id. */
  value?: unknown;
};

function lexicalRootChildren(value: unknown): LexicalNode[] {
  if (!value || typeof value !== 'object') {
    return [];
  }
  const root = (value as { root?: { children?: unknown[] } }).root;
  if (!root || !Array.isArray(root.children)) {
    return [];
  }
  return root.children.filter(
    (node): node is LexicalNode => !!node && typeof node === 'object',
  );
}

function plainText(node: LexicalNode): string {
  if (node.type === 'text' && typeof node.text === 'string') {
    return node.text;
  }
  if (node.type === 'linebreak') {
    return '\n';
  }
  if (!Array.isArray(node.children)) {
    return '';
  }
  return node.children
    .filter((child): child is LexicalNode => !!child && typeof child === 'object')
    .map(plainText)
    .join('');
}

/** Plain text of each top-level paragraph, trimmed; empty paragraphs are dropped. */
export function lexicalParagraphs(value: unknown): string[] {
  return lexicalRootChildren(value)
    .filter((node) => node.type === 'paragraph')
    .map((node) => plainText(node).trim())
    .filter(Boolean);
}

// Lexical text format bit flags.
const FORMAT_TAGS: Array<[number, string]> = [
  [1, 'strong'],
  [2, 'em'],
  [4, 's'],
  [8, 'u'],
  [16, 'code'],
  [32, 'sub'],
  [64, 'sup'],
];

const HEADING_TAGS = new Set(['h1', 'h2', 'h3', 'h4', 'h5', 'h6']);

function lexicalLinkHref(node: LexicalNode, prefix: string): string | undefined {
  const fields = node.fields;
  if (!fields) {
    return undefined;
  }
  if (fields.linkType === 'internal') {
    return hrefFromLink({ type: 'reference', reference: fields.doc }, prefix);
  }
  return hrefFromLink({ type: 'custom', url: fields.url }, prefix);
}

function renderChildren(node: LexicalNode, prefix: string, origin: string): string {
  if (!Array.isArray(node.children)) {
    return '';
  }
  return node.children
    .filter((child): child is LexicalNode => !!child && typeof child === 'object')
    .map((child) => renderNode(child, prefix, origin))
    .join('');
}

const ALIGN = new Set(['left', 'center', 'right', 'justify', 'start', 'end']);

/** ` style="text-align: …"` for a block node's alignment (Lexical `format` string), or ''. */
function alignAttr(node: LexicalNode): string {
  return typeof node.format === 'string' && ALIGN.has(node.format)
    ? ` style="text-align: ${node.format}"`
    : '';
}

function renderNode(node: LexicalNode, prefix: string, origin: string): string {
  switch (node.type) {
    case 'text': {
      if (typeof node.text !== 'string' || !node.text) return '';
      const format = typeof node.format === 'number' ? node.format : 0;
      let html = escapeHtml(node.text);
      for (const [flag, tag] of FORMAT_TAGS) {
        if (format & flag) html = `<${tag}>${html}</${tag}>`;
      }
      return html;
    }
    case 'linebreak':
      return '<br>';
    case 'tab':
      return '\t';
    case 'paragraph': {
      const inner = renderChildren(node, prefix, origin);
      return inner ? `<p${alignAttr(node)}>${inner}</p>` : '';
    }
    case 'heading': {
      const tag = node.tag && HEADING_TAGS.has(node.tag) ? node.tag : 'h2';
      const inner = renderChildren(node, prefix, origin);
      return inner ? `<${tag}${alignAttr(node)}>${inner}</${tag}>` : '';
    }
    case 'quote': {
      const inner = renderChildren(node, prefix, origin);
      return inner ? `<blockquote${alignAttr(node)}>${inner}</blockquote>` : '';
    }
    case 'list': {
      const tag = node.listType === 'number' || node.tag === 'ol' ? 'ol' : 'ul';
      return `<${tag}${alignAttr(node)}>${renderChildren(node, prefix, origin)}</${tag}>`;
    }
    case 'listitem':
      return `<li>${renderChildren(node, prefix, origin)}</li>`;
    case 'horizontalrule':
      return '<hr>';
    case 'upload': {
      // Needs the media doc (depth ≥ 1); an id alone has no URL.
      const media = node.value as { url?: string | null; alt?: string | null; mimeType?: string | null } | null;
      if (!media || typeof media !== 'object') return '';
      const src = mediaUrl(media, origin);
      if (!src) return '';
      if (media.mimeType && !media.mimeType.startsWith('image/')) {
        return `<p><a href="${escapeHtml(src)}">${escapeHtml(media.alt || src)}</a></p>`;
      }
      const align = typeof node.format === 'string' && ALIGN.has(node.format) ? ` style="text-align: ${node.format}"` : '';
      return `<figure${align}><img src="${escapeHtml(src)}" alt="${escapeHtml(media.alt ?? '')}" loading="lazy"></figure>`;
    }
    case 'link':
    case 'autolink': {
      const inner = renderChildren(node, prefix, origin);
      const href = lexicalLinkHref(node, prefix);
      if (!href) return inner;
      const target = node.fields?.newTab
        ? ' target="_blank" rel="noopener noreferrer"'
        : '';
      return `<a href="${escapeHtml(href)}"${target}>${inner}</a>`;
    }
    default:
      return renderChildren(node, prefix, origin);
  }
}

/**
 * Lexical rich text → HTML: paragraphs, headings, quotes, lists, links,
 * bold / italic / underline / strikethrough / code, line breaks, horizontal
 * rules, images (upload nodes; `origin` resolves root-relative media URLs) and
 * text alignment.
 * Internal links use the populated doc's `path` with `prefix` (the current locale's).
 */
export function lexicalToHtml(value: unknown, prefix: string, origin = ''): string {
  return lexicalRootChildren(value)
    .map((node) => renderNode(node, prefix, origin))
    .join('');
}

export type HeroShape = {
  content?: unknown;
  media?: Array<number | { url?: string | null; alt?: string | null }>;
  links?: Array<{ link?: LinkPayload } | LinkPayload>;
};

export function parseHero(hero: unknown): HeroShape | undefined {
  if (!hero || typeof hero !== 'object') {
    return undefined;
  }
  return hero as HeroShape;
}

export function linkLabel(link: unknown): string | undefined {
  const raw = unwrapLink(link);
  if (!raw || typeof raw !== 'object') {
    return undefined;
  }
  const label = (raw as LinkPayload).label;
  if (typeof label === 'string') {
    const trimmed = label.trim();
    return trimmed || undefined;
  }
  return undefined;
}

/** `2026-11-06T…` → "6 November 2026" in `locale`; undefined when missing or invalid. */
export function formatDate(
  value: string | null | undefined,
  locale: string,
): string | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return new Intl.DateTimeFormat(locale, { dateStyle: 'long' }).format(date);
}

/** ISO 3166-1 alpha-2 code → country name in `locale` ("FR" → "France" / "France"). */
export function countryName(
  code: string | null | undefined,
  locale: string,
): string | undefined {
  if (!code) return undefined;
  try {
    return new Intl.DisplayNames([locale], { type: 'region' }).of(code) ?? code;
  } catch {
    return code;
  }
}

/** Titles of populated categories (slug when a title is missing); bare ids are skipped. */
export function categoryTitles(
  categories: Array<{ title?: string | null; slug?: string | null } | number> | null | undefined,
): string[] {
  return (categories ?? [])
    .map((category) =>
      typeof category === 'object'
        ? textField(category.title) ?? textField(category.slug)
        : undefined,
    )
    .filter((title): title is string => Boolean(title));
}

export function linkOpensNewTab(link: unknown): boolean {
  const raw = unwrapLink(link);
  if (!raw || typeof raw !== 'object') return false;
  return (raw as LinkPayload).newTab === true;
}
