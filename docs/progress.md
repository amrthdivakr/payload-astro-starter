# Frontend migration

Tracks the Astro frontend in two phases:

1. **Starter** — add Payload reading to this repo (created with `pnpm create astro@latest -- --template minimal`).
2. **Migrated site** — clone this starter, then overlay the old site's CSS/JS and section templates (demo: grouplfb).

Spec: `payload-test/docs/site-migration.md`. Product: `payload-test/docs/product-plan.md`. Scraper pipeline (snapshot → import) is already done; see `payload-scrapper/docs/progress.md`.

This list **replaces** the old single site-migration task 6 (“generate the Astro repo”). That task was too large: it mixed starter work with grouplfb overlay, and the build started scaffolding Astro by hand instead of using the official create command.

## Status

| | |
|---|---|
| Current task | — |
| Completed | 1 |

Update this table when a task is finished.

**Starter repo:** [github.com/amrthdivakr/payload-astro-starter](https://github.com/amrthdivakr/payload-astro-starter) (public). Local: `E:\dev\sandbox\payload-astro-starter`.

## How we work

- One task at a time. Say **start task N**. We plan that task, then build it. Do not start the next until you say the current one is done.
- Do **not** scaffold a new Astro app. This repo is the starter. Prefer official commands (`astro add node`, and so on) over hand-rolled config.
- Push starter changes to origin after a starter task is done, so the later clone step can use GitHub.
- GitHub App / Vercel APIs stay out. Local Payload (`payload-test`) + local Astro only.
- Do not run Payload `generate:types` or `generate:importmap` (the Payload dev server generates those).

## Two phases

```text
payload-astro-starter   ← you are here for tasks 1–6
  Payload client, catch-all pages, default Header/Footer/blocks
        |
        | git clone origin  (task 7)
        v
E:\dev\sandbox\grouplfb
  overlay snapshot CSS/JS, chrome, per-template .astro files
        |
        v
GET /api/public/grouplfb
```

New sites later clone the same starter and keep the default templates (AI customizes on `staging`). Migrated sites clone it and overlay the old site. Do not generate `package.json`, the Payload client, or default blocks from scratch for every site.

## Locked decisions

- Starter is this public GitHub repo. Migration **clones it**, then overlays. It does not generate an Astro tree from empty files.
- Site output: sibling `E:\dev\sandbox\grouplfb`.
- Page slugs are **unique per tenant**. After re-import, grouplfb home is `home` (Acme can also have `home`). Nested mapped paths still hyphenate because Payload `slugField` disallows `/` (`regulations/ecodesign` → `regulations-ecodesign`).
- Content comes from `GET /api/public/:slug` only. That endpoint returns **published** pages. Import still creates drafts, so `pages: []` until you publish. Draft preview is task 16, not earlier.
- Starter tasks can verify against any published tenant (Acme is enough). Migration verify uses grouplfb after those pages are published.
- No view transitions. Old scripts expect a full page load.
- Scripts from the snapshot load with `<script is:inline src="...">` so Astro does not bundle jQuery.

## Tasks

Each task has a “done when”. Stay inside that task.

### Phase A — Starter (`payload-astro-starter`)

Work only in this repo. No snapshot overlay. No `payload-scrapper` generator yet.

#### 1. ~~Server output and env~~ **done**

Add the Node adapter with the official Astro add command. Server output so each request can fetch Payload. `.env.example`: `PAYLOAD_URL=http://localhost:3000`, `SITE_SLUG=`.

Done when: `pnpm dev` still serves `/`; adapter is in config; env vars are documented. The create-astro tree is unchanged except for these additions.

#### 2. Public API client

`src/lib/payload.ts`: server-side `GET ${PAYLOAD_URL}/api/public/${SITE_SLUG}`. Clear error if env is missing. Types for `site`, `pages`, `nav`, `contact`, `footer`, `media`.

Done when: with Payload running and `SITE_SLUG` set to a published tenant, the client returns that site’s name and page list (a temporary log or title on `/` is enough).

#### 3. Pages from Payload

Replace the placeholder `src/pages/index.astro` with a catch-all that reads the public API. `home` → `/`. Other slugs → `/{slug}`. Generic markup: title, maybe a heading. 404 if the slug is missing. If `pages` is empty, show a short “unpublished” message.

Done when: `/` and one other published slug show that page’s title from Payload. Changing the title in admin and refreshing updates the Astro page.

#### 4. Link, media, and rich-text helpers

- `hrefFromLink`: custom URL, or page reference → `/` when slug is `home`, else `/{slug}`.
- `mediaUrl`: prefix `PAYLOAD_URL` when the media path is root-relative (`/api/media/file/...`).
- Lexical JSON → HTML (`p` / text is enough; seed only emits paragraphs).

Done when: helpers are unit-testable or obviously used on a page (for example a heading `content` field renders as HTML, not `[object Object]`).

#### 5. Default Header and Footer

Generic markup (not grouplfb CSS). Fed by Payload `nav` and `footer`: logo, items + one level of children, optional CTA, footer columns, legal links, certs.

Done when: the published tenant’s nav labels and footer columns appear on `/`.

#### 6. Default blocks

`RenderBlocks` picks a template by `blockType` + `customVariant`, else the default. Add only defaults: `hero/default`, `section/default`, `items/default`, `html`, `form` stub. Unknown variants use the default. No grouplfb-specific templates.

Done when: a published page with `section` / `items` / `html` layout renders those fields with generic markup.

Phase A is the reusable starter. Push to origin before Phase B.

### Phase B — Clone and overlay (`payload-scrapper` → `grouplfb`)

Generator lives in `payload-scrapper`. It must **clone this starter**, then write site-specific files into the clone. It must not mutate this starter with grouplfb CSS or templates.

#### 7. Clone starter to the site repo

`pnpm astro` in `payload-scrapper`: `git clone` this origin into `ASTRO_OUT_DIR` (default `../grouplfb`). Set `SITE_SLUG` in the clone’s `.env.example`. Optional `ASTRO_STARTER_DIR` for a local copy if origin is behind. Do not overlay snapshot files yet.

Done when: the cloned repo `pnpm install && pnpm dev` behaves like the starter against Payload.

#### 8. Snapshot assets and original `<head>`

Copy snapshot non-HTML files into the clone’s `public/` (theme CSS/JS, images, fonts, vendor pack, same-origin PDFs) with the **same root-relative paths** as the mirror. Point `Base.astro` at the snapshot home `<head>` order. `<script is:inline>`. Live services (cookie consent, analytics) stay remote.

Done when: `/` loads original stylesheets and scripts; view source shows `/application/...` and `/vendor/...`, not a bundled jQuery.

#### 9. Original-path routing

Nav uses old paths (`/`, `/regulations/ecodesign`). Payload stores hyphenated nested slugs. Write `routes.json` (or equivalent) from mapped `sourceUrl` + slug:

| Public path | Payload slug |
|---|---|
| `/`, `/en`, `/en/` | `home` |
| `/contact` | `contact` |
| `/legal` | `legal` |
| `/regulations` | `regulations` |
| `/regulations/ecodesign` | `regulations-ecodesign` |
| `/regulations/f-gas` | `regulations-f-gas` |
| `/careers` | `careers` |
| `/our-history` | `our-history` |

Implement same-origin aliases that point at these pages. Leave `external` / `file` as link targets, not Astro routes.

Done when: those eight URLs resolve to the matching published Payload page (not `pages: []`).

#### 10. Migrated Header and Footer

Overlay Header/Footer in the **clone** from `out/grouplfb/outlines/chrome.json`. Keep wrappers and classes. Replace nav lists and footer columns with loops over Payload. Home only: `nbx-transparent-fixed`. Strip old-CMS leftovers (`/api/vtl/…`, locale redirects). English only.

Done when: header and footer look like the snapshot chrome, and labels/hrefs come from Payload.

#### 11. One template conversion

Prove HTML → Astro on **one** `customVariant` (suggested: `brand-promo`). Cheerio substitution: keep classes/wrappers, replace copy/media/links with props, item rows become a loop. No hardcoded source-site text.

Done when: that block on a published page matches the snapshot section, and changing the heading in admin updates it.

#### 12. Remaining hero templates

Generate the other hero variants into the clone (`nbx-global-banner`, `nbx-contact-hero`, `nbx-prod-cat-banner`, `fallback-hero`). Hero is `pages.hero`, not a layout block.

Done when: each of the 8 pages shows the correct hero from Payload.

#### 13. Remaining items templates

`select-a-brand-to-visit`, `our-markets-applications`, `nbx-we-care-sec`, `brand-promo` (if not done in 11), `nbx-contact-card`, `we-section`, `ecodesign-and-our-products-families`.

Done when: repeating rows on those pages come from Payload `items`, not duplicated static HTML.

#### 14. Remaining section and html templates

The rest of the section `customVariant` ids plus html (`why-ce`, `the-aim-if-the-f-gas-regulation-is-to`). Defaults from the starter cover unknown variants.

Done when: local `astro dev` on `grouplfb` renders all 8 pages from `GET /api/public/grouplfb` with the original CSS/JS. That is the old site-migration task 6 “done when”.

### Phase C — After the pages render

Same as site-migration tasks 7–8. Do not start these until 14 is done.

#### 15. QA

Screenshot each old page vs the new page (same viewport). Dummy-data check: templates must not contain source-site copy.

Done when: differences are explained or fixed; no hardcoded live copy.

#### 16. Review and revalidation

Editors review drafts, then publish. Payload `afterChange` revalidates published pages. Optional draft preview.

Done when: editing a published heading in admin changes the Astro page without a redeploy.

## Explicitly out of scope until listed

- Scaffolding a second Astro app from empty files
- Pushing grouplfb to GitHub, Vercel, create-site job
- Model cleanup / restyling of templates
- `sourcePath` / slash slugs in Payload (routing table handles original paths)
- Serving PDFs through Payload media (copy snapshot files into `public/` in task 8)
- Form builder pages (grouplfb has no `formBlock`; starter stub is enough)

## Changelog

### 2026-10-19 — starter task 1

- Official `pnpm astro add node --yes`: `@astrojs/node` in **standalone** mode. CLI did not set `output`; added `output: 'server'` by hand.
- `.env.example`: `PAYLOAD_URL=http://localhost:3000`, `SITE_SLUG=`. README notes copy to `.env`.
- Verified: `GET /` still the default Astro placeholder. No Payload client yet (task 2).
- Next: start task 2.

### 2026-10-18 — split frontend tasks

- Starter already exists from `pnpm create astro@latest -- --template minimal` and is on origin.
- Former site-migration task 6 is replaced by tasks 1–14 here. QA and revalidation stay 15–16.
- Tenant-scoped page slugs are already in `payload-test` (`home` per site; nested slugs still hyphenated).
