# Technical Portfolio

Personal portfolio and technical blog built with [Astro](https://astro.build/) and deployed on GitHub Pages.

## Stack

- **Astro 5** — static-first rendering with Markdown-native content
- **GitHub Pages** — automated deployment via GitHub Actions
- **Vanilla CSS** — custom dark terminal-inspired theme
- **Content Collections** — typed frontmatter for all posts

## Getting Started

```bash
npm install
npm run dev       # local dev server
npm run build     # production build
npm run preview   # preview the build
npm run generate:og  # regenerate the OG preview image
npm run lint      # run ESLint
npm run lint:fix  # fix linting issues
npm run format    # format code with Prettier
npm run format:check  # check code formatting
```

## Adding Content

Posts live in `src/content/posts/` as Markdown files with typed frontmatter (see `src/content/config.ts`).

A post template is available at `agent/POST_TEMPLATE.md`.

## Repository Layout

- `src/` contains the Astro app source.
- `public/` contains static files that are copied to the deployed site as-is.
- `scripts/` contains internal content and asset generation utilities.
- `docs/` contains repository documentation and maintenance notes.

Only files inside `public/` are exposed directly on the final site. Generator scripts, working HTML, and maintenance notes should stay outside `public/`.

## Configuration

Site metadata and profile links are in `src/config/site.ts`.
