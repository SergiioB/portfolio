# Sergio's Portfolio & Blog

Personal site and technical blog for a Linux & Virtualization Engineer based in Madrid.

Live at: **[https://SergiioB.github.io/portfolio](https://SergiioB.github.io/portfolio)**

---

## The Idea

I wanted a place to document what I actually work on day-to-day — homelab experiments, self-hosted infrastructure, local AI setups, cloud comparisons, and random code snippets that I keep having to look up.

Most developer blogs are either over-engineered (heavy JS frameworks, CMSs, databases) or too bland (generic Jekyll themes with no personality). I wanted something in between: fast, minimal, opinionated, and easy to maintain long-term.

The design intentionally leans into a **terminal-editorial aesthetic** — dark background, monospace fonts, amber accents. It should feel like something a sysadmin would actually build for themselves, not a marketing site.

---

## Tech Stack

| Layer | Choice | Reason |
|---|---|---|
| Framework | [Astro 5](https://astro.build) | Zero JS by default, Markdown-native, static output |
| Hosting | GitHub Pages | Free, reliable, deploys on every push |
| CI/CD | GitHub Actions | Automatic build + deploy on `git push` |
| Fonts | JetBrains Mono + Lora | Code readability + readable body text |
| Syntax Highlighting | Shiki (`github-dark`) | Server-side, zero runtime cost |
| Styling | Vanilla CSS | No frameworks, no dependencies, full control |

No CMS. No database. No JavaScript framework. Just Markdown files and a build step.

---

## Content Categories

| Category | What goes here |
|---|---|
| `infrastructure` | Linux, networking, homelab, Proxmox, VMs |
| `ai` | AI tools, models, APIs, practical usage |
| `cloud` | AWS, GCP, Azure — comparisons and use cases |
| `local-ai` | Running LLMs and AI locally, Ollama, hardware notes |
| `kotlin` | Kotlin dev, Android, JVM ecosystem |
| `snippets` | Short code references, one-liners, things I keep forgetting |
| `career` | Engineering career, lessons learned, opinions |

---

## Project Structure

```
portfolio/
├── src/
│   ├── content/
│   │   ├── posts/          # All blog posts as .md files
│   │   │   ├── infrastructure/
│   │   │   ├── ai/
│   │   │   ├── cloud/
│   │   │   ├── local-ai/
│   │   │   ├── kotlin/
│   │   │   ├── snippets/
│   │   │   └── career/
│   │   ├── categories.ts   # Category definitions and order
│   │   └── config.ts       # Content collection schema
│   ├── components/
│   │   ├── Sidebar.astro   # Left nav with categories + social links
│   │   └── PostCard.astro  # Post list item
│   ├── layouts/
│   │   └── BaseLayout.astro
│   ├── pages/
│   │   ├── index.astro          # Homepage — recent posts feed
│   │   ├── [category].astro     # Category pages (auto-generated)
│   │   ├── archive.astro        # All posts grouped by year
│   │   ├── about.astro          # About page
│   │   └── posts/[...slug].astro # Individual post pages
│   └── styles/
│       └── global.css      # All styles — single file, no build step
├── .github/workflows/
│   └── deploy.yml          # GitHub Actions: build + deploy to Pages
├── POST_TEMPLATE.md        # Template for new posts
└── PORTFOLIO_GUIDE.md      # Authoring guide
```

---

## Writing a New Post

1. Copy `POST_TEMPLATE.md`
2. Drop it in `src/content/posts/<category>/<slug>.md`
3. Fill in the frontmatter:

```yaml
---
title: "Your Post Title"
description: "One sentence summary."
pubDate: 2026-02-26
category: infrastructure
tags: ["linux", "proxmox"]
readTime: 5
---
```

4. Write the post in Markdown below the frontmatter
5. `git add . && git commit -m "post: your title" && git push`

GitHub Actions deploys automatically. Live in ~2 minutes.

---

## Local Development

```bash
npm install
npm run dev       # http://localhost:4321
npm run build     # build to dist/
npm run preview   # preview the build locally
```

---

## Design Decisions

**No JavaScript on the client.** Astro renders everything at build time. The only JS is the mobile sidebar toggle (a few lines, inline).

**Single CSS file.** All styles live in `src/styles/global.css`. No CSS modules, no Tailwind, no preprocessor. Easy to audit, easy to change.

**No pagination (for now).** The archive page lists everything. Once the post count gets unwieldy, pagination can be added — Astro's static paths support it natively.

**Sidebar-first layout.** Most content sites use top navigation. A fixed left sidebar feels more like a tool you use than a page you visit — appropriate for a technical audience.

**Category pages always exist.** All 7 category pages are generated at build time even if they have zero posts. Avoids broken links when linking to a category before writing the first post in it.
