# Technical Portfolio (Astro + GitHub Pages)

Static portfolio and technical notes site built with Astro and deployed to GitHub Pages.

This repository is intentionally kept public-safe:

- No secrets or `.env` files
- No private contact details in source/docs
- No employer-internal details in posts
- Static hosting only (no backend, no database)

## Project Intent

This project is designed to serve two purposes:

1. A professional portfolio surface (focus areas, experience summary, engineering approach)
2. A technical knowledge base (short posts and implementation notes)

The architecture optimizes for low maintenance and low attack surface, not for dynamic features.

## Stack (and why it fits)

- `Astro 5`: static-first rendering, Markdown-native content, minimal client JavaScript
- `GitHub Pages`: simple hosting for a static site
- `GitHub Actions`: automated build/deploy on push
- `Vanilla CSS`: easy to audit, no styling framework lock-in
- `Astro Content Collections`: typed frontmatter and predictable content structure

This is a strong choice for a writing-first portfolio/blog where speed, simplicity, and public safety matter more than dynamic interactivity.

## Local Development

```bash
npm install
npm run dev
npm run build
npm run preview
```

Note: Astro 5 requires a supported Node.js version (see `package.json`/Astro requirements).

## Content Structure

```text
src/content/posts/
  infrastructure/
  ai/
  cloud/
  local-ai/
  kotlin/
  snippets/
  career/
```

Posts are Markdown files with frontmatter validated by `src/content/config.ts`.

## Writing a New Post

1. Copy `POST_TEMPLATE.md`
2. Save it under `src/content/posts/<category>/<slug>.md`
3. Fill the frontmatter
4. Write the post body in Markdown
5. Commit and push

## Security Notes for GitHub Pages

- The site is static (`output: 'static'`) and has no server-side runtime.
- Sensitive response headers cannot be fully controlled on GitHub Pages.
- This repo uses a strict, client-safe design (no third-party scripts, no external fonts).
- A CSP is set in HTML via meta tag for defense-in-depth, but header-based CSP would be stronger on hosts that support custom headers.

## Personalization

Public profile text and optional links are centralized in `src/config/site.ts`.
