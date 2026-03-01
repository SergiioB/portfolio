# Technical Portfolio

Portfolio and technical notes site built with Astro, deployed to GitHub Pages.

## Local Development

```bash
npm install
npm run dev
npm run build
npm run preview
```

Note: Astro 5 requires a supported Node.js version (see `package.json`/Astro requirements).

## Content Structure

Posts are Markdown files in `src/content/posts/` with frontmatter validated by `src/content/config.ts`.

## Writing a New Post

1. Copy `POST_TEMPLATE.md`
2. Save it under `src/content/posts/<slug>.md`
3. Fill the frontmatter
4. Write the post body in Markdown
5. Commit and push

## Security Notes for GitHub Pages

- The site is static (`output: 'static'`) and has no server-side runtime.
- Sensitive response headers cannot be fully controlled on GitHub Pages.
- This repo uses a strict, client-safe design (no third-party scripts and no third-party analytics).
- A CSP is set in HTML via meta tag for defense-in-depth, but header-based CSP would be stronger on hosts that support custom headers.

## Public Repo Hygiene

- Keep local-only artifacts ignored (`.env*`, IDE settings, caches, notebooks, temp files).
- Use placeholder infrastructure examples (`example.internal`, non-routable IP ranges).
- Never include real credentials or private host inventory in content.
- Verify staged files before each push.

## Personalization

Public profile text and optional links are centralized in `src/config/site.ts`.
