# Portfolio Project Structure

## Site

- Static Astro 5 site for `https://sergiiob.dev`.
- Config: `astro.config.mjs` (`output: "static"`, `outDir: "build"`).
- Deploy: GitHub Pages workflow uploads `./build`.

## Source slices

- `src/pages`: routes (`/`, `/about`, `/archive`, `/cv`, `/cover-letter`, category routes, post routes).
- `src/layouts`: `BaseLayout.astro` global shell, SEO, canonical URLs, CSP meta, OG/Twitter, sidebar, dictionary injection.
- `src/components`: reusable Astro UI and interactive components (`Sidebar`, `PostCard`, `PostSearch`, `CategoryAnimation`, `EngineerLab`, `NetworkTopology`, `OpsDeck`).
- `src/config`: `site.ts` public identity/profile metadata; `i18n.ts` EN/ES UI dictionary.
- `src/content`: content collection schema, categories, flat posts under `src/content/posts/*.md`.
- `src/styles`: large global CSS/design system; prefer scoped component CSS unless changing tokens/layout.
- `src/utils`: pure helpers such as base-path links and reading time.
- `public`: deployed as-is; no private notes or drafts.
- `scripts`: maintenance/generation scripts such as OG image generation.
- `tests`: Playwright integration tests and source-level Vitest tests.

## Documentation alignment

- `docs/agents/feature-map.md`, `docs/agents/token-strategy.md`, `.agentic/*`, and root/nested `AGENTS.md` should stay aligned.
- `agent/PORTFOLIO_GUIDE.md` currently implies category subfolders while current posts are flat; keep docs aligned if touched.
