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
```

## Adding Content

Posts live in `src/content/posts/` as Markdown files with typed frontmatter (see `src/content/config.ts`).

A post template is available at `agent/POST_TEMPLATE.md`.

## Configuration

Site metadata and profile links are in `src/config/site.ts`.
