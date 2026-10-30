# payload-astro-starter

Public Astro starter for Payload-backed sites. Created with:

```sh
pnpm create astro@latest -- --template minimal
```

New sites clone this repo and keep the default templates. Migrated sites clone it, then overlay the old site's CSS/JS and section templates.

**Docs catalog:** [`docs/progress.md`](docs/progress.md). **Task list:** [`docs/frontend-migration.md`](docs/frontend-migration.md) (tasks 1–19 complete).

Payload pieces are added one task at a time. This is still the minimal create-astro tree until those tasks land.

Copy `.env.example` to `.env` and set `PAYLOAD_URL` (local Payload, default `http://localhost:3000`) and `SITE_SLUG` (published tenant slug from Payload). The dev server reads them via Astro’s typed env schema and fetches site data from Payload’s public API.

> Official Astro template readme follows.

## Clones and upstream

Clones made by `pnpm astro` (payload-scrapper) keep this repo as their `upstream` remote. Shared code changes here, and clones pick it up with:

```sh
git fetch upstream && git merge upstream/main
```

- **Shared (do not edit in a clone):** `src/lib/`, `src/pages/`, `src/blocks/RenderBlocks.astro`, `html.astro`, `form.astro`, `blocks/*/default.astro`, `src/components/Hero.astro`, `PreviewBar.astro`, `package.json`.
- **Clone-owned:** `src/layouts/Base.astro`, `src/components/Header.astro`, `Footer.astro`, site templates under `src/blocks/<type>/`, `public/`, docs. `.gitattributes` marks the clone-owned files that also exist here as `merge=ours`. This needs `git config merge.ours.driver true` in the clone (`pnpm astro` sets it).
- Templates import their helpers from `src/lib/content.ts` (`textField`, `lexicalParagraphs`, `lexicalToHtml`, `hrefFromLink`, `mediaUrl`) instead of copying them.

## 🚀 Project Structure

Inside of your Astro project, you'll see the following folders and files:

```text
/
├── public/
├── src/
│   └── pages/
│       └── index.astro
└── package.json
```

Astro looks for `.astro` or `.md` files in the `src/pages/` directory. Each page is exposed as a route based on its file name.

There's nothing special about `src/components/`, but that's where we like to put any Astro/React/Vue/Svelte/Preact components.

Any static assets, like images, can be placed in the `public/` directory.

## 🧞 Commands

All commands are run from the root of the project, from a terminal:

| Command                   | Action                                           |
| :------------------------ | :----------------------------------------------- |
| `pnpm install`             | Installs dependencies                            |
| `pnpm dev`             | Starts local dev server at `localhost:4321`      |
| `pnpm build`           | Build your production site to `./dist/`          |
| `pnpm preview`         | Preview your build locally, before deploying     |
| `pnpm astro ...`       | Run CLI commands like `astro add`, `astro check` |
| `pnpm astro -- --help` | Get help using the Astro CLI                     |

## 👀 Want to learn more?

Feel free to check [our documentation](https://docs.astro.build) or jump into our [Discord server](https://astro.build/chat).
