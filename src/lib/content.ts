import type { PublicPage } from './payload';
import { normalizePath } from './match';

type LinkPayload = {
  type?: string;
  url?: string | null;
  reference?: {
    relationTo?: string;
    value?: number | { id?: number; path?: string };
  } | null;
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

function resolveReferencePath(
  value: number | { path?: string },
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

export function hrefFromLink(
  link: unknown,
  pages: PublicPage[],
): string | undefined {
  const raw = unwrapLink(link);
  if (!raw || typeof raw !== 'object') {
    return undefined;
  }

  const l = raw as LinkPayload;
  if (l.type === 'custom') {
    const url = l.url?.trim();
    return url || undefined;
  }

  if (l.type === 'reference') {
    const ref = l.reference?.value;
    if (ref == null) {
      return undefined;
    }
    return resolveReferencePath(ref, pages);
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

export function lexicalToHtml(value: unknown): string {
  if (!value || typeof value !== 'object') {
    return '';
  }

  const root = (value as { root?: { children?: unknown[] } }).root;
  if (!root || !Array.isArray(root.children)) {
    return '';
  }

  const parts: string[] = [];

  for (const node of root.children) {
    if (!node || typeof node !== 'object') {
      continue;
    }

    const n = node as { type?: string; children?: unknown[] };
    if (n.type !== 'paragraph' || !Array.isArray(n.children)) {
      continue;
    }

    let text = '';
    for (const child of n.children) {
      if (!child || typeof child !== 'object') {
        continue;
      }
      const c = child as { type?: string; text?: unknown };
      if (c.type === 'text' && typeof c.text === 'string') {
        text += c.text;
      }
    }

    if (text) {
      parts.push(`<p>${escapeHtml(text)}</p>`);
    }
  }

  return parts.join('');
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
