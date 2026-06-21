# Portfolio Feature Map

## Astro shell / SEO / security

- `astro.config.mjs`: static output, site URL, build output.
- `src/layouts/BaseLayout.astro`: global shell, SEO, canonical URLs, CSP meta, OG/Twitter, i18n dictionary injection.
- `src/config/site.ts`: public metadata/profile/CV links.
- `src/config/i18n.ts`: EN/ES dictionary and language constants.

## Routes and UI

- `src/pages/`: homepage, about, archive, category routes, CV/cover letter redirects, post pages.
- `src/components/`: Sidebar, PostCard, PostSearch, CategoryAnimation, AudienceMode, EngineerLab, NetworkTopology, OpsDeck.
- `src/styles/global.css`: central dark terminal-inspired design system.

## Content

- `src/content/config.ts`: frontmatter schema and allowed categories.
- `src/content/categories.ts`: category order/metadata and grouping.
- `src/content/posts/*.md`: flat post model.
- `agent/POST_TEMPLATE.md`, `agent/PORTFOLIO_GUIDE.md`: local content templates/guides; keep aligned with schema.

## Public/deploy

- `public/`: deployed as-is. `public/docs`, `robots.txt`, `.well-known/security.txt`, CNAME, images/scripts are public.
- `.github/workflows/deploy.yml`: deploys `./build` to GitHub Pages.

## Commands

- Doctor: `python C:\Users\sergi\.codex\agentic-coding\scripts\agentic_doctor.py C:\Users\sergi\Syncthing\portfolio`
- Standard: `npm run build`, `npm run lint`, `npm run format:check`, `npm test`
- UI/integration: `npm run preview`, `npm run test:integration`
