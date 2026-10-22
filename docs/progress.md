# Frontend migration

**This is the current task list.** Payload experiment and page-path (`payload-test/docs/page-path.md`) are done.

Tracks the Astro frontend in two phases:

1. **Starter** — add Payload reading to this repo (created with `pnpm create astro@latest -- --template minimal`).
2. **Migrated site** — clone this starter, then overlay the old site's CSS/JS and section templates (demo: grouplfb).

Spec: `payload-test/docs/site-migration.md`. Product: `payload-test/docs/product-plan.md`. Scraper pipeline (snapshot → import) is already done; see `payload-scrapper/docs/progress.md`.

This list **replaces** the old single site-migration task 6 (“generate the Astro repo”). That task was too large: it mixed starter work with grouplfb overlay, and the build started scaffolding Astro by hand instead of using the official create command.

## Status

| | |
|---|---|
| Current task | — |
| Completed | 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 12b, 13, 14, 15, 16 |
| Next | 16b |

Update this table when a task is finished.

**Starter repo:** [github.com/amrthdivakr/payload-astro-starter](https://github.com/amrthdivakr/payload-astro-starter) (public). Local: `E:\dev\sandbox\payload-astro-starter`.

## How we work

- This is the current priority list. Say **start task N**. We plan that task, then build it. One task at a time. Do not start the next until you say the current one is done.
- Do **not** scaffold a new Astro app. This repo is the starter. Prefer official commands (`astro add node`, and so on) over hand-rolled config.
- Push starter changes to origin after a starter task is done, so the later clone step can use GitHub.
- GitHub App / Vercel APIs stay out. Local Payload (`payload-test`) + local Astro only.
- Do not run Payload `generate:types` or `generate:importmap` (the Payload dev server generates those).

## Two phases

```text
payload-astro-starter   ← Phase A done (tasks 1–6)
  Payload client, catch-all pages, default Header/Footer/blocks
        |
        | git clone  (task 7 done)
        v
E:\dev\sandbox\grouplfb   ← overlay 14 done
  overlay snapshot CSS/JS, chrome, per-template .astro files
        |
        v
GET /api/public/grouplfb
```

New sites later clone the same starter and keep the default templates (AI customizes on `staging`). Migrated sites clone it and overlay the old site. Do not generate `package.json`, the Payload client, or default blocks from scratch for every site.

## Locked decisions

- Starter is this public GitHub repo. Migration **clones it**, then overlays. It does not generate an Astro tree from empty files.
- Site output: sibling `E:\dev\sandbox\grouplfb`.
- Page **paths** are unique per tenant and live in Payload (`payload-test/docs/page-path.md`, **done**). Astro matches `page.path` (`/`, `/regulations/ecodesign`). Slug is one segment, not the public URL. Do not hyphenate nested URLs and do not add a `routes.json`.
- Content comes from `GET /api/public/:slug` only. That endpoint returns **published** pages. Import still creates drafts, so `pages: []` until you publish. Draft preview is task 16b, not earlier.
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

#### 2. ~~Public API client~~ **done**

`src/lib/payload.ts`: server-side `GET ${PAYLOAD_URL}/api/public/${SITE_SLUG}`. Clear error if env is missing.

Types for what that endpoint already returns: `site`, `pages` (include `path`, `parent`, `isHomepage`, `slug`, `title`), `nav`, `contact`, `footer`, `media`, `redirects`. Do not treat `slug` as the public URL.

Done when: with Payload running and `SITE_SLUG` set to a published tenant, the client returns that site’s name and page list with `path` values (a temporary log or title on `/` is enough).

#### 3. ~~Pages from Payload~~ **done**

Replace the placeholder `src/pages/index.astro` with a catch-all that reads the public API. Match `page.path` (`/` and `/contact`). Generic markup: title, maybe a heading. 404 if the path is missing. If `pages` is empty, show a short “unpublished” message. Do not map `home` → `/` via slug.

If the public payload has a same-origin redirect whose `from` matches the request, follow it (`to` page `path` or custom URL). Grouplfb’s eight URLs are verified in task 9 after those pages are published.

Done when: `/` and one other published **path** show that page’s title from Payload. Changing the title in admin and refreshing updates the Astro page.

#### 4. ~~Link, media, and rich-text helpers~~ **done**

- `hrefFromLink`: custom URL, or page reference → that page’s `path` (import already stores same-site links as page refs; `defaultPopulate` includes `path`).
- `mediaUrl`: prefix `PAYLOAD_URL` when the media path is root-relative (`/api/media/file/...`).
- Lexical JSON → HTML (`p` / text is enough; seed only emits paragraphs).

Done when: helpers are unit-testable or obviously used on a page (for example a heading `content` field renders as HTML, not `[object Object]`).

#### 5. ~~Default Header and Footer~~ **done**

Generic markup (not grouplfb CSS). Fed by Payload `nav` and `footer`: logo, items + one level of children, optional CTA, footer columns, legal links, certs.

Done when: the published tenant’s nav labels and footer columns appear on `/`.

#### 6. ~~Default blocks~~ **done**

`RenderBlocks` picks a template by `blockType` + `customVariant`, else the default. Add only defaults: `hero/default`, `section/default`, `items/default`, `html`, `form` stub. Unknown variants use the default. No grouplfb-specific templates.

Done when: a published page with `section` / `items` / `html` layout renders those fields with generic markup.

Phase A is the reusable starter. Push to origin before Phase B.

### Phase B — Clone and overlay (`payload-scrapper` → `grouplfb`)

Generator lives in `payload-scrapper`. It must **clone this starter**, then write site-specific files into the clone. It must not mutate this starter with grouplfb CSS or templates.

#### 7. ~~Clone starter to the site repo~~ **done**

`pnpm astro` in `payload-scrapper`: `git clone` this origin into `ASTRO_OUT_DIR` (default `../grouplfb`). Set `SITE_SLUG` in the clone’s `.env.example`. Optional `ASTRO_STARTER_DIR` for a local copy if origin is behind. Do not overlay snapshot files yet.

Done when: the cloned repo `pnpm install && pnpm dev` behaves like the starter against Payload.

#### 8. Snapshot assets and original `<head>`

Copy snapshot non-HTML files into the clone’s `public/` (theme CSS/JS, images, fonts, vendor pack, same-origin PDFs) with the **same root-relative paths** as the mirror. Point `Base.astro` at the snapshot home `<head>` order. `<script is:inline>`. Live services (cookie consent, analytics) stay remote.

Done when: `/` loads original stylesheets and scripts; view source shows `/application/...` and `/vendor/...`, not a bundled jQuery.

#### 9. ~~Original-path routing~~ **done**

**Superseded by Payload `path` + Redirects** (page-path list done). Do not write `routes.json`.

Catch-all already matches `page.path`. Same-origin aliases come from the public `redirects` list (e.g. `/en/` → `/`). Leave `external` / `file` as link targets, not Astro routes.

Done when: the eight grouplfb URLs (`/`, `/contact`, `/legal`, `/regulations`, `/regulations/ecodesign`, `/regulations/f-gas`, `/careers`, `/our-history`) resolve to the matching published Payload page, using `path` and CMS redirects only.

#### 10. ~~Migrated Header and Footer~~ **done**

Overlay Header/Footer in the **clone** from `out/grouplfb/outlines/chrome.json`. Keep wrappers and classes. Replace nav lists and footer columns with loops over Payload. Home only: `nbx-transparent-fixed`. Strip old-CMS leftovers (`/api/vtl/…`, locale redirects). English only.

Done when: header and footer look like the snapshot chrome, and labels/hrefs come from Payload.

#### 11. ~~One template conversion~~ **done**

Prove HTML → Astro on **one** `customVariant` (suggested: `brand-promo`). Cheerio substitution: keep classes/wrappers, replace copy/media/links with props, item rows become a loop. No hardcoded source-site text.

Done when: that block on a published page matches the snapshot section, and changing the heading in admin updates it.

#### 12. ~~Remaining hero templates~~ **done**

Generate the other hero variants into the clone (`nbx-global-banner`, `nbx-contact-hero`, `nbx-prod-cat-banner`, `fallback-hero`). Hero is `pages.hero`, not a layout block.

Done when: each of the 8 pages shows the correct hero from Payload.

#### 12b. ~~Seed hero and section parse (`payload-scrapper`)~~ **done**

Imported CMS data is wrong on several grouplfb pages. Fix the seed parser, then `pnpm seed` + `pnpm run import`. Do **not** start Clef-flash (seed task 4 stays skipped: these are selector/segment bugs, not “code is unsure”). Do not start items templates (13) until this is done.

Work in `payload-scrapper` (`seedClassify.ts`, `seedParse.ts`, `seedPage.ts`, `segmentSections.ts` as needed). Re-import into `payload-test`. Astro templates stay; they already bind whatever Payload sends.

- **Hero vs first section:** do not invent `fallback-hero` from the document `<title>` when the first visible body section is the visual intro (`/legal`, `/regulations`, `/regulations/ecodesign`, `/regulations/f-gas`, `/our-history`). Promote that intro to `pages.hero`. `/` and `/contact` already match `HERO_RE` — leave them.
- **Careers hero fields:** parse sibling `.nbx-heading` blocks; treat `h4.nbx-title` as heading; walk body copy in DOM order; skip text already used as eyebrow/heading. Eyebrow stays “Careers”; heading and body land in their fields, not a scrambled rich-text blob.
- **Legal blob:** a wrapping `<section>` must not flatten the whole TOS into one Lexical paragraph list. Split on inner `h1`/`h2`, or map TOS-like pages to `html`. Headings must remain headings.
- **`/our-history`:** do not use `<title>` when it is `index`. Visual title is `p.nbx-subtitle-large` (“Our History”).

Done when: after re-seed + re-import, admin (and `GET /api/public/grouplfb`) shows: those five pages’ heroes are the visual intro (not SEO titles / `index`); careers hero is eyebrow + heading + body in that order; legal is not one unformatted rich-text dump. Home and contact heroes unchanged. Still drafts unless you republish.

#### 13. ~~Remaining items templates~~ **done**

`select-a-brand-to-visit`, `our-markets-applications`, `nbx-we-care-sec`, `brand-promo` (if not done in 11), `nbx-contact-card`, `we-section`, `ecodesign-and-our-products-families`.

Done when: repeating rows on those pages come from Payload `items`, not duplicated static HTML.

#### 14. ~~Remaining section and html templates~~ **done**

The rest of the section `customVariant` ids plus html (`why-ce`, `the-aim-if-the-f-gas-regulation-is-to`). Defaults from the starter cover unknown variants.

Done when: local `astro dev` on `grouplfb` renders all 8 pages from `GET /api/public/grouplfb` with the original CSS/JS. That is the old site-migration task 6 “done when”.

### Phase C — After the pages render

Same as site-migration tasks 7–8. Do not start these until 14 is done.

#### 15. QA

Screenshot each old page vs the new page (same viewport). Dummy-data check: templates must not contain source-site copy.

Done when: differences are explained or fixed; no hardcoded live copy.

#### 16. ~~Review and revalidation~~ **done**

Editors review drafts, then publish. Payload `afterChange` revalidates published pages.

Done when: editing a published heading in admin changes the Astro page without a redeploy.

#### 16b. Draft preview

Admin Preview opens the tenant Astro site with unpublished pages. Do not use Payload `/next/preview` (that is the leftover Next frontend).

- `admin.preview` returns an absolute URL on `tenant.productionUrl` (`/api/preview?path=&previewSecret=&token=`). Local grouplfb: `http://localhost:4321`.
- Astro `GET /api/preview` checks `PREVIEW_SECRET` and the editor JWT (`GET ${PAYLOAD_URL}/api/users/me`), sets httpOnly cookies, redirects to `page.path`. `GET /api/exit-preview` clears them.
- `GET /api/public/:slug?draft=true` returns drafts only when the request is authenticated (`draft: true`, still `overrideAccess: false`). Anonymous calls stay published-only. Do not unlock drafts with the secret alone.
- Preview requests skip ISR cache (`Astro.cache.set(false)`). Copy starter files into the clone.

Done when: Preview on an unpublished grouplfb page (e.g. `/our-history`) renders it on local Astro; anonymous `GET /api/public/grouplfb` still omits it. Exit preview returns to published-only.

Live preview (admin iframe, as-you-type) is out of this task.

### Phase D — SEO and files (payload-scrapper + payload-test)

Can start without waiting for Astro 14. Re-import is expected. Still drafts; nothing auto-publishes. Do not copy grouplfb snapshot files into the starter repo.

#### 17. SEO seed and import

Parse per-page SEO from snapshot HTML (`<title>`, meta description, og:title, og:description, og:image, canonical) into mapped `pages.meta` (title, description, image). Import into Payload SEO fields. Do not use document title as `pages.title` (that is path-derived). Done when: a grouplfb page has meta.description (or documented skip if the source page has none) in admin SEO tab after re-seed + re-import.

#### 18. Same-origin files audit

Investigate whether snapshot/seed captures every same-origin file request: images, video, documents, PDFs (e.g. `https://www.grouplfb.com/dA/e1b630c696/fileAsset/LFB%20FRANCE_0094-PED-MAD-2024.pdf`). Compare crawl `redirects[]` kind file, snapshot `www/` files, and live/nav hrefs. Write findings in the task notes / changelog — gaps listed. Done when: a written answer exists for grouplfb: which same-origin files are mirrored, which are URL-only, which are missed.

#### 19. Import files as media and serve from CMS

Seed + import those same-origin files into Payload `media` (or equivalent) and serve them from the CMS public URL, not only as snapshot copies in Astro `public/`. Update mapped media registry and import. Done when: the PED PDF (or one other same-origin PDF) is a media document for tenant grouplfb and its Payload file URL is what links use.

#### 20. Nav (and similar) file links from Payload

Some PDFs are nav items (custom URLs today). Figure out how editors attach a file from Payload (media relationship vs custom URL to `/api/media/file/…`) so nav/footer/block links stay internal. Implement the chosen approach in seed/import (and note what Astro `hrefFromLink` must do later). Done when: a grouplfb nav PDF item is not a live grouplfb.com URL; it points at CMS media. External brand sites stay custom URLs.

## Explicitly out of scope until listed

- Scaffolding a second Astro app from empty files
- Pushing grouplfb to GitHub, Vercel, create-site job
- Model cleanup / restyling of templates
- ~~`sourcePath` / slash slugs in Payload~~ — now the Payload `path` field; page-path list is done (`payload-test/docs/page-path.md`)
- Same-origin PDFs and file links in Payload — Phase D tasks 18–20 (task 8 still copies mirror files into Astro `public/` for styling)
- Form builder pages (grouplfb has no `formBlock`; starter stub is enough)
- Live preview (admin iframe that refreshes while editing). Draft preview is 16b.

## Changelog

### 2026-10-23 — frontend task 16

- Starter + clone: `memoryCache`, catch-all `Astro.cache.set({ maxAge: 3600, tags: ['payload'] })`, `POST /api/revalidate` with `REVALIDATE_SECRET`. Overlay files untouched.
- `payload-test`: `revalidateFrontend` POSTs to `tenant.productionUrl/api/revalidate` from pages, redirects, nav, footer, contact. Next `revalidatePath` kept. Import still uses `disableRevalidate`.
- Verified on `astro preview` (dev cache is a no-op): heading change stayed stale until revalidate, then showed without rebuild. Preview does not load `.env` secrets — `node --env-file=.env`.
- grouplfb Production URL set to `http://localhost:4321`. Restart Payload if it was already running so it picks up `REVALIDATE_SECRET`.
- Next: start task **16b** (draft preview).

### 2026-10-23 — split draft preview to 16b

- Task 16 is published revalidation only. Draft preview is **16b** (Astro `/api/preview`, public API `?draft=true` with editor JWT). Live preview stays out of scope.
- Next: start task **16** (review and revalidation). Do not start 16b until 16 is done.

### 2026-10-23 — frontend task 15

- `payload-scrapper`: `pnpm qa:copy` scans `out/<site>/mapped/site.json` phrases against clone `src/**/*.astro` markup (no snapshot copy in templates). `pnpm qa:screens` — Playwright 1440×900, snapshot `:4173` vs Astro `:4321`, PNGs + `report.json` under `out/grouplfb/qa/`. Overlay hide runs after `goto` (plus `addInitScript` + DOM removal) so Cookie-Script/GTM do not dominate diffs. Optional `pnpm qa:publish-history` (Local API; failed: publish rejected empty `layout` on id 18 — publish `/our-history` in admin before re-screens).
- Clone: `nbx-prod-cat-banner.astro` binds `hero.backgroundMedia` / `hero.media` via `mediaUrl` (section background + optional `career-right` figure). **Careers hero still has no CMS media** (`GET /api/public/grouplfb` → empty `media` / `backgroundMedia`); snapshot `#nbx-prod-cat-banner` HTML has no image either — the yellow-vest band on old careers is the following `make-an-impact` inline `make-impact-bg.jpg`, which seed did not map into Payload (grey band until seed/import adds section background media).
- `qa:copy` exit 0 (110 phrases, 38 templates).
- Screenshot diff ratios (informational): `/` 0.26, `/contact` 0.07, `/legal` 0.10, `/regulations` 0.38, `/regulations/ecodesign` 0.08, `/regulations/f-gas` 0.51, `/careers` 0.61, `/our-history` **new HTTP 404** (unpublished).
- Explained visual gaps (no restyle): `brand-promo` Redge chrome; brand logos / `brand-promo-*` ids; we-care globe; careers stats; ecodesign `productList`; omitted html/section fields; `maximum-efficiency-performance` one chrome; CMS media URLs vs `/dA/…`; spacing/alignment deferred.
- Next: start task **16** (review and revalidation).

### 2026-10-23 — frontend task 14

- Clone only: `src/blocks/html/` for `why-ce`, `the-aim-if-the-f-gas-regulation-is-to`, `2020`, `our-longterm-sustainable-journey`; `src/blocks/section/` for the 12 remaining section variants. `pickTemplate` unchanged.
- Payload `html` has no `customVariant`; `RenderBlocks` uses `label`. Default `html.astro` is a Fragment pass-through (no extra `<section>`). One chrome for `maximum-efficiency-performance`. Fields not in Payload omitted (iframe, privacy PDF, banner bg).
- Verified GET `/`, `/contact`, `/legal`, `/regulations`, `/regulations/ecodesign`, `/regulations/f-gas`, `/careers` 200 with `/application/` + `/vendor/`. `/our-history` 404 (not in live public API after 12b drafts). User moved on with remaining visual issues.
- Next: start task **15** (QA).

### 2026-10-23 — frontend task 13

- Clone only: `src/blocks/items/` for `select-a-brand-to-visit`, `our-markets-applications`, `nbx-we-care-sec`, `nbx-contact-card`, `we-section`, `ecodesign-and-our-products-families`. `brand-promo` already from task 11. `pickTemplate` unchanged.
- One chrome when schema lacks brand classes/ids. Globe only if `backgroundMedia[0]`; careers stats and ecodesign `productList` omitted (not in Payload). Spacing/alignment left for later.
- Verified GET `/` 3 brand boxes + 14 tiles + we-care + 2 brand-promo; `/contact` 2 cards; `/careers` media files; `/regulations/ecodesign` 2 tab rows. User checks successful (spacing later).
- Next: start task **14** (remaining section and html templates).

### 2026-10-22 — frontend task 12b

- `payload-scrapper`: split legal TOS only when a page has a single `body > section` with 2+ inner `h1`/`h2`; first visible section promotes to `pages.hero` when `HERO_RE` misses; careers sibling `.nbx-heading` + `h4.nbx-title`; `/our-history` heading from `p.nbx-subtitle-large`. Re-seed + re-import (drafts).
- Kept `pages.hero`. Do not start 13 until this was done.
- Next: start task **13** (remaining items templates).

### 2026-10-22 — frontend task 12

- Clone only: `src/blocks/hero/nbx-global-banner.astro`, `nbx-contact-hero.astro`, `nbx-prod-cat-banner.astro`, `fallback-hero.astro`. `pickTemplate` already maps `hero` + `customVariant`; no starter glob change.
- Catch-all starter `<h1>` hidden on published pages; unpublished/404 still show it.
- Verified via `GET` on the eight paths: `/` `nbx-global-banner` + CMS image; `/contact` contact hero; `/careers` `#nbx-prod-cat-banner`; five pages `fallback-hero` from Payload (SEO titles / `index` are seed bugs, not template bugs).
- Next: start task **12b** (seed parse). Do not start 13.

### 2026-10-22 — seed parse before items (task 12b)

- Priority insert: **12b** (seed hero/section parse in `payload-scrapper`) before frontend **13**. Clef-flash stays skipped; parser/segment bugs only.
- Admin issues this covers: title-only `fallback-hero` with the real intro in layout[0] (`/legal`, `/regulations`, `/regulations/ecodesign`, `/regulations/f-gas`, `/our-history`); careers heading/body mashed into rich text in the wrong order; legal TOS as one unformatted rich-text field.
- Next: start task 12b. Do not start 13.

### 2026-10-22 — frontend task 11

- Clone only: `src/blocks/items/brand-promo.astro`. `pickTemplate` already maps `items` + `brand-promo`; no starter glob change.
- Cheerio substitution from snapshot `brand-promo-redge`: wrappers/classes kept; eyebrow/heading/subheading, Visit CTA (`block.links[0]`), and product cards from `block.items`. No hardcoded live copy.
- One template for both home bands. Friga-Bohn chrome (`nbx-bg-blue`, column order, `btn-blue`) is not in Payload, so both bands use Redge layout. Brand logos and `brand-promo-*` section ids are also not in the items schema.
- Verified: `GET /` two `nbx-brand-prod-sec` bands, four product cards, CMS `/api/media/file/…` images. User checks successful.
- Next: start task 12.

### 2026-10-22 — frontend task 10

- Clone only: overlay Header/Footer from snapshot chrome. Payload loops for nav (one child level) and footer columns/legal. Home-only `nbx-transparent-fixed` via `isHomepage`. English `/`; no `/api/vtl/` or locale dropdowns.
- Code was already in the clone when task 11 started; progress was still “Next: 10”. Recorded done with task 11.
- Next was task 11.

### 2026-10-22 — frontend task 9

- No Astro routing code. Catch-all already matches `page.path`; CMS `redirects` cover aliases. No `routes.json`.
- Published the seven remaining grouplfb drafts (Home was already live). Public API lists all eight paths. Added Redirect `/en` → Home (import had skipped it after stripping the locale prefix).
- Verified on the grouplfb clone: eight URLs 200 with Payload titles; `/en`, `/en/`, `/products` 302 to `/`; unknown path 404. User checks successful.
- Next: start task 10.

### 2026-10-22 — frontend task 8

- `payload-scrapper`: `pnpm overlay` (`src/overlay.ts`) copies snapshot non-HTML `www/` plus sibling `vendor/` into the existing clone `public/` (same root-relative paths). Rewrites clone `Base.astro` from snapshot home HTML: original CSS/JS order, `<script is:inline>`, Payload `{title}`, live cookie-script/GTM. Starter, Header/Footer, and routing unchanged.
- Verified: `GET /` view source shows `/application/...` and `/vendor/...` (jquery not bundled); those assets return 200. User checks successful.
- Next: start task 9.

### 2026-10-21 — frontend task 7

- `payload-scrapper`: `pnpm astro` (`src/astro.ts`) clones the starter into `ASTRO_OUT_DIR` (default `../grouplfb`). `ASTRO_STARTER_DIR` for a local copy when origin is behind; otherwise `ASTRO_STARTER_REPO`. Sets `SITE_SLUG` in the clone’s `.env.example` (and `.env` if missing). Refuses to overwrite an existing destination. No snapshot overlay.
- Verified: clone from local starter; `GET /` matches starter (Home, hero, items, section); `public/` favicons only; second `pnpm astro` exits 1. User checks successful.
- Next: start task 8.

### 2026-10-21 — starter task 6

- `src/lib/templates.ts`: `import.meta.glob` picker (`blockType` + `customVariant`, else default). `src/components/Hero.astro` + `src/blocks/RenderBlocks.astro`. Defaults: `hero/default`, `section/default`, `items/default`, `html.astro`, `form.astro` stub. Catch-all keeps page-title `<h1>`; unpublished and 404 still chrome only.
- `src/lib/payload.ts`: typed `PublicHero` and preferred layout blocks (`section` / `items` / `html` / `formBlock`).
- Verified: grouplfb `/` hero heading + lexical paragraphs, items rows, section “Do you want to make an impact?”; unknown `customVariant` uses default; 404 still chrome. HTML templates exist on draft `/regulations/ecodesign` and `/regulations/f-gas` (not published). User checks successful.
- Next: start task 7.

### 2026-10-21 — starter task 5

- `src/layouts/Base.astro` wraps Header, `<main>` slot, Footer. `src/components/Header.astro` / `Footer.astro`: generic markup from Payload `nav` / `footer` (logo, items + one child level, CTA, columns, legal, social, certs). `hrefFromLink` / `linkLabel` / `mediaUrl` / `linkOpensNewTab`. Catch-all still fetches once; chrome also on unpublished and 404.
- `src/lib/payload.ts`: `PublicNav` / `PublicFooter` field types (not `Record`).
- Verified: grouplfb `/` nav labels (Home, Our Brands, …) and footer column “Our brands”; logo `src` on Payload; nested children; 404 still shows chrome. Unpublished page refs render as labels without href until those pages are published.
- Next: start task 6.

### 2026-10-20 — starter task 4

- `src/lib/content.ts`: `hrefFromLink` (custom URL or page `path`, unwraps `{ link }`), `mediaUrl` (prefix `PAYLOAD_URL` on `/api/media/file/...`), `lexicalToHtml` (seed paragraphs → escaped `<p>`). Catch-all uses them on `hero.content`, first `hero.media`, first `hero.links`.
- Verified: published Acme `/` hero paragraph as HTML (not `[object Object]`) and image `src` on Payload; published grouplfb `/` works the same. Other grouplfb pages still drafts.
- Next: start task 5.

### 2026-10-20 — starter task 3

- Deleted `src/pages/index.astro`. Catch-all `src/pages/[...slug].astro` matches `Astro.url.pathname` to `page.path` (not slug). `src/lib/match.ts`: normalize trailing slashes, page lookup, CMS redirects (`reference` → page `path`, `custom` → URL).
- Empty `pages` → unpublished message (200) on every URL. Unknown path → HTTP 404 (not a 302 to `/404`).
- Verified: published Acme `/` Home and `/parent-two/child-two` child two; title change in admin refreshes. grouplfb still drafts so `/` is unpublished.
- Next: start task 4.

### 2026-10-20 — starter task 2

- `src/lib/payload.ts`: server `GET ${PAYLOAD_URL}/api/public/${SITE_SLUG}`; types include `path`, `parent`, `isHomepage`, `slug`, `title`, and `redirects`. Empty `SITE_SLUG` throws.
- `/` shows site name and `page.path` (not slug). Verified with published Acme (`/` Home, nested `/parent-two/child-two`). grouplfb still drafts so `pages: []`.
- Next: start task 3.

### 2026-10-20 — this is the current list

- Page-path CMS/import (tasks 1–4) is done. Former page-path task 5 is this list: types in 2, catch-all + redirects in 3, `hrefFromLink` in 4, grouplfb URLs in 9. No `routes.json`.
- Public API already returns `path`, `parent`, `isHomepage`, and `redirects`. Task 2 types should include them.
- Next: start task 2.

### 2026-10-20 — Phase D (SEO and files)

- Tasks 17–20: SEO from snapshot HTML, same-origin file audit, import files as Payload media, nav PDF links from CMS. Not Astro overlay work; can start before task 14 finishes.
- CMS `pages.title` is path-derived in seed (not document `<title>`); SEO title stays in meta/SEO fields (task 17).

### 2026-10-19 — public URL is Payload `path`

- Nested URLs are a CMS field, not `routes.json`. Spec: payload-test `docs/page-path.md`.
- Task 3 blocked on page-path task 1. Task 9 uses `path` + CMS redirects. `hrefFromLink` uses `path`.
- Do not start the catch-all on `slug`. Next starter task is still **2** (API client); add `path` to types after Payload exposes it.

### 2026-10-19 — starter task 1

- Official `pnpm astro add node --yes`: `@astrojs/node` in **standalone** mode. CLI did not set `output`; added `output: 'server'` by hand.
- `.env.example`: `PAYLOAD_URL=http://localhost:3000`, `SITE_SLUG=`. README notes copy to `.env`.
- Verified: `GET /` still the default Astro placeholder. No Payload client yet (task 2).
- Next: start task 2.

### 2026-10-18 — split frontend tasks

- Starter already exists from `pnpm create astro@latest -- --template minimal` and is on origin.
- Former site-migration task 6 is replaced by tasks 1–14 here. QA and revalidation stay 15–16.
- Tenant-scoped page slugs are already in `payload-test` (`home` per site; nested slugs still hyphenated).
