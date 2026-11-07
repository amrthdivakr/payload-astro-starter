import { PAYLOAD_URL } from 'astro:env/server';
import { normalizePath } from './match';

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

/** Path of a populated reference. A bare id means Payload didn't populate it: no link. */
function resolveReferencePath(
  value: number | { path?: string | null },
): string | undefined {
  if (typeof value === 'number') {
    return undefined;
  }
  return value.path ? normalizePath(value.path) : undefined;
}

export function hrefFromLink(link: unknown): string | undefined {
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
    return resolveReferencePath(ref);
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

function lexicalLinkHref(node: LexicalNode): string | undefined {
  const fields = node.fields;
  if (!fields) {
    return undefined;
  }
  if (fields.linkType === 'internal') {
    return hrefFromLink({ type: 'reference', reference: fields.doc });
  }
  return hrefFromLink({ type: 'custom', url: fields.url });
}

function renderChildren(node: LexicalNode): string {
  if (!Array.isArray(node.children)) {
    return '';
  }
  return node.children
    .filter((child): child is LexicalNode => !!child && typeof child === 'object')
    .map((child) => renderNode(child))
    .join('');
}

function renderNode(node: LexicalNode): string {
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
      const inner = renderChildren(node);
      return inner ? `<p>${inner}</p>` : '';
    }
    case 'heading': {
      const tag = node.tag && HEADING_TAGS.has(node.tag) ? node.tag : 'h2';
      const inner = renderChildren(node);
      return inner ? `<${tag}>${inner}</${tag}>` : '';
    }
    case 'quote': {
      const inner = renderChildren(node);
      return inner ? `<blockquote>${inner}</blockquote>` : '';
    }
    case 'list': {
      const tag = node.listType === 'number' || node.tag === 'ol' ? 'ol' : 'ul';
      return `<${tag}>${renderChildren(node)}</${tag}>`;
    }
    case 'listitem':
      return `<li>${renderChildren(node)}</li>`;
    case 'link':
    case 'autolink': {
      const inner = renderChildren(node);
      const href = lexicalLinkHref(node);
      if (!href) return inner;
      const target = node.fields?.newTab
        ? ' target="_blank" rel="noopener noreferrer"'
        : '';
      return `<a href="${escapeHtml(href)}"${target}>${inner}</a>`;
    }
    default:
      return renderChildren(node);
  }
}

/**
 * Lexical rich text → HTML: paragraphs, headings, quotes, lists, links,
 * bold / italic / underline / strikethrough / code, line breaks.
 * Internal links use the populated doc's `path`.
 */
export function lexicalToHtml(value: unknown): string {
  return lexicalRootChildren(value)
    .map((node) => renderNode(node))
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

export function linkOpensNewTab(link: unknown): boolean {
  const raw = unwrapLink(link);
  if (!raw || typeof raw !== 'object') return false;
  return (raw as LinkPayload).newTab === true;
}
