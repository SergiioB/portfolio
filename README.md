# Personal Portfolio & Blog

Built with Astro + GitHub Pages. Optimized for a posts-first personal portfolio covering Infrastructure, AI, Cloud, Local AI, Kotlin, and snippets.

## Why this stack

- Astro static output: fast, low maintenance, SEO-friendly.
- GitHub Pages + Actions: free hosting, automatic deployments on push.
- Markdown content collections: simple authoring and category structure.

## Writing a new post

1. Copy `POST_TEMPLATE.md`.
2. Create a file in `src/content/posts/<category>/<slug>.md`.
3. Fill frontmatter and content.
4. Push to `main` to deploy.

## Quick Start

1. npm install
2. npm run dev
3. Write posts in `src/content/posts/`

## Deploy to GitHub Pages

1. git init && git add . && git commit -m "init"
2. git remote add origin https://github.com/YOUR_USERNAME/portfolio.git
3. git push -u origin main
4. Go to GitHub Settings → Pages → Enable GitHub Actions

Site will be at: https://yourusername.github.io/portfolio
