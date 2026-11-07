// Astro 7 no longer exports this type from `astro`.
import type { AstroComponentFactory } from 'astro/runtime/server/index.js';

type GlobModule = { default: AstroComponentFactory };

const modules = import.meta.glob('../blocks/**/*.astro', {
  eager: true,
}) as Record<string, GlobModule>;

const RENDER_BLOCKS_KEY = '../blocks/RenderBlocks.astro';

function sanitizeVariant(
  value: string | null | undefined,
): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }
  const trimmed = value.trim();
  if (!trimmed || !/^[a-zA-Z0-9-]+$/.test(trimmed)) {
    return undefined;
  }
  return trimmed;
}

function resolveFromCandidates(keys: string[]): AstroComponentFactory | undefined {
  for (const key of keys) {
    if (key === RENDER_BLOCKS_KEY) {
      continue;
    }
    if (!(key in modules)) {
      continue;
    }
    const component = modules[key]?.default;
    if (component) {
      return component;
    }
  }
  return undefined;
}

export function pickTemplate(
  blockType: string,
  customVariant?: string | null,
): AstroComponentFactory | undefined {
  const variant = sanitizeVariant(customVariant);

  if (blockType === 'formBlock') {
    return resolveFromCandidates(['../blocks/form.astro']);
  }

  if (blockType === 'html') {
    const keys: string[] = [];
    if (variant) {
      keys.push(`../blocks/html/${variant}.astro`);
    }
    keys.push('../blocks/html.astro');
    return resolveFromCandidates(keys);
  }

  if (
    blockType === 'hero' ||
    blockType === 'section' ||
    blockType === 'items' ||
    blockType === 'listing'
  ) {
    const keys: string[] = [];
    if (variant) {
      keys.push(`../blocks/${blockType}/${variant}.astro`);
    }
    keys.push(`../blocks/${blockType}/default.astro`);
    return resolveFromCandidates(keys);
  }

  return undefined;
}
