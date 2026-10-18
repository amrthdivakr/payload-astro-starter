# Agents

This repo is the Astro starter for the product in `payload-test/docs/product-plan.md`. The task list is `docs/progress.md`.

It was created with `pnpm create astro@latest -- --template minimal`. Do not scaffold a new Astro app.

Working rules:

- The user implements each task. When they ask to start a task, give instructions for that task only. Do not edit application code unless they explicitly ask.
- One task at a time. Plan that task, then build it. Do not plan or build the whole frontend in one shot.
- Prefer official Astro add commands (`astro add node`, and so on) over hand-rolled adapters.
- Do not add GitHub App or Vercel API calls until the product plan includes them.
- Migrated sites clone this starter and overlay old CSS/JS in a separate repo. Do not copy grouplfb snapshot files into this starter.

## Development

When starting the dev server, use background mode:

```
astro dev --background
```

Manage the background server with `astro dev stop`, `astro dev status`, and `astro dev logs`.

## Documentation

Full documentation: https://docs.astro.build

Consult these guides before working on related tasks:

- [Adding pages, dynamic routes, or middleware](https://docs.astro.build/en/guides/routing/)
- [Working with Astro components](https://docs.astro.build/en/basics/astro-components/)
- [Using React, Vue, Svelte, or other framework components](https://docs.astro.build/en/guides/framework-components/)
- [Adding or managing content](https://docs.astro.build/en/guides/content-collections/)
- [Adding styles or using Tailwind](https://docs.astro.build/en/guides/styling/)
- [Supporting multiple languages](https://docs.astro.build/en/guides/internationalization/)
