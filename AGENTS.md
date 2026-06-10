# AGENTS.md

> Instructions for autonomous AI agents working on this codebase.

## Project Overview

This is a personal portfolio and technical blog built with **Astro 5** and deployed on GitHub Pages. It features a dark terminal-inspired theme with interactive elements and i18n support (English/Spanish).

## Stack

- **Framework:** Astro 5.x (static site generation)
- **Language:** TypeScript (strict mode enabled)
- **Styling:** Vanilla CSS with custom properties
- **Deployment:** GitHub Pages via GitHub Actions
- **Content:** Markdown posts in `src/content/posts/`

## Prerequisites

- Node.js >= 18.20.8
- npm >= 9.x

## Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Available Scripts

| Script                        | Description                              |
| ----------------------------- | ---------------------------------------- |
| `npm run dev`                 | Start local dev server at localhost:4321 |
| `npm run build`               | Build production site to `dist/`         |
| `npm run preview`             | Preview production build locally         |
| `npm run lint`                | Run ESLint on all files                  |
| `npm run lint:fix`            | Auto-fix ESLint issues                   |
| `npm run format`              | Format all files with Prettier           |
| `npm run format:check`        | Check formatting without modifying       |
| `npm run jscpd`               | Detect duplicate code                    |
| `npm run test`                | Run unit tests with Vitest               |
| `npm run test:watch`          | Run unit tests in watch mode             |
| `npm run test:coverage`       | Run unit tests with coverage report      |
| `npm run test:integration`    | Run Playwright integration tests         |
| `npm run test:integration:ui` | Run integration tests with UI mode       |

## Project Structure

```
/
├── src/
│   ├── components/     # Astro components (reusable UI)
│   ├── config/         # Site configuration (site.ts, i18n.ts)
│   ├── content/        # Markdown posts and content collections
│   │   ├── posts/      # Blog posts in Markdown
│   │   └── config.ts   # Content collection schema
│   ├── layouts/        # Page layouts
│   ├── pages/          # File-based routes
│   ├── styles/         # Global CSS
│   └── utils/          # Helper functions
├── tests/
│   └── integration/    # Playwright E2E tests
├── public/             # Static assets (images, scripts)
├── .github/
│   └── workflows/      # GitHub Actions (deploy.yml)
├── agent/              # Post templates and guides
└── docs/               # Documentation
```

## Code Conventions

### Naming

- **Variables/Functions:** camelCase
- **Components:** PascalCase (e.g., `PostCard.astro`)
- **Files:** kebab-case for content, PascalCase for components
- **CSS classes:** kebab-case (e.g., `.post-card`)

### TypeScript

- Strict mode is enabled via `tsconfig.json`
- Use explicit types for function parameters
- Avoid `any` - use `unknown` when type is uncertain

### Imports

Order imports as follows (enforced by ESLint):

1. Built-in modules
2. External packages
3. Internal modules
4. Parent imports
5. Sibling imports
6. Index imports

### Components

- Use Astro's component syntax (`.astro` files)
- Keep client-side JS minimal (use `is:inline` sparingly)
- Extract reusable logic to utility functions

## Content Management

### Adding a New Post

1. Create a Markdown file in `src/content/posts/`
2. Use the template from `agent/POST_TEMPLATE.md`
3. Include required frontmatter:

```yaml
---
title: "Post Title"
description: "Brief summary for previews"
pubDate: 2026-03-07
category: "infrastructure" # infrastructure | ai | cloud | local-ai | kotlin | snippets | career | automation
tags: ["tag1", "tag2"]
draft: false
---
```

### Categories

- `infrastructure` - DevOps, infrastructure, automation
- `ai` - AI/ML topics
- `cloud` - Cloud platforms and services
- `local-ai` - Running AI locally
- `kotlin` - Kotlin development
- `snippets` - Code snippets and tips
- `career` - Career-related content
- `automation` - Automation tools and workflows

## Configuration

### Site Metadata

Edit `src/config/site.ts` to update:

- Site title and description
- Author information
- Social links
- Profile summary

### Internationalization

- Translations in `src/config/i18n.ts`
- Supports English (en) and Spanish (es)
- Use `data-i18n` attributes for dynamic text

## Deployment

- **Platform:** GitHub Pages
- **Domain:** https://sergiiob.dev
- **Workflow:** `.github/workflows/deploy.yml`
- **Trigger:** Push to `main` branch

Deployment is automatic on push to main. No manual deployment needed.

## Quality Checks

Before committing, ensure:

1. `npm run lint` passes
2. `npm run format:check` passes
3. `npm run build` succeeds
4. No secrets, tokens, or private URLs in content

## Common Tasks

### Update a Post

1. Edit the Markdown file in `src/content/posts/`
2. Add `updatedDate` to frontmatter
3. Test with `npm run dev`
4. Commit changes

### Add a New Page

1. Create `.astro` file in `src/pages/`
2. Use `BaseLayout` for consistent structure
3. Add to navigation in `src/components/Sidebar.astro` if needed

### Modify Styles

1. Global styles: `src/styles/global.css`
2. Component styles: Use `<style>` tag in `.astro` files
3. CSS custom properties defined in `:root`

## Pre-commit Hooks

Husky runs lint-staged before each commit:

- ESLint --fix on JS/TS/Astro files
- Prettier on all supported files

To bypass (not recommended): `git commit --no-verify`

## Security Guidelines

- Never commit `.env` files
- Remove sensitive data before committing
- Use relative URLs for internal links
- Validate user input in any interactive components

## Confidential Data Policy — READ BEFORE WRITING CONTENT

This is a **public repository** on GitHub. Everything committed here (including history) is visible to anyone. The following categories of information are **NEVER** allowed in posts, pages, i18n strings, code comments, or commit messages:

### ❌ NEVER publish

- **Exact LLM provider names or model identifiers** used in production apps (e.g. "DeepSeek V3.2", "KIMI K2.5"). Use generic labels like "primary model", "reasoning model", "budget fallback"
- **Pricing details** — cost per 1K calls, token pricing, exact budget allocations. "Cost-effective" or "budget fallback" is fine
- **Affiliate tags or partner IDs** — never expose `tag=` values, affiliate program names, or commission structures
- **Exact implementation constants** — character limits, cooldown durations, message retention counts, rate limit thresholds. Say "strict limit", "recent messages", "cooldown period" instead
- **Function/variable names from backend code** — `sanitizeInput`, `safeTextSnippet`, `JAILBREAK_PATTERNS`, `lastQueryTimestamp`. Use descriptions instead: "sanitization function", "injection pattern array"
- **Exact regex patterns** used for security filtering. Say "regex-based detection" without showing the patterns
- **Exact error codes/flags** — `JAILBREAK_DETECTED`, `resource-exhausted`. Use generic terms
- **Specific cloud service names** that reveal the exact stack — use generic equivalents: "Cloud secret manager" not "Google Secret Manager", "Server-side atomic counters" not "Firestore atomic counters", "Local encrypted database" not "Room database", "Cloud Functions" is fine since Firebase is already mentioned
- **Commission rates, cookie durations, or partner names** from affiliate networks
- **Internal URLs, staging endpoints, or admin paths**

### ✅ What IS fine to publish

- Architecture patterns and design decisions (backend proxy, input sanitization layers, output validation)
- Technology categories (Kotlin, Jetpack Compose, Firebase, LLM integration)
- General approach descriptions (multi-tier routing, truncation pipeline, injection prevention)
- Code snippets showing the pattern/structure with generic placeholders
- UX design decisions and reasoning
- Benchmark data from personal hardware (that's your own data)
- Lessons learned and tradeoff discussions

### Git history note

If confidential data is accidentally committed, it must be purged from **all git history** using `git filter-repo --replace-text` followed by a force push. Simply adding a new commit that removes the data is NOT sufficient — the old commits remain readable.

## Apps in this Portfolio

### IntelliAuto

- **What it is:** AI-powered car maintenance app, live on Google Play Store
- **Stack:** Kotlin + Jetpack Compose, Firebase backend
- **Key features (safe to mention):** OCR receipt scanning, AutoMind AI diagnostics, maintenance tracking, affiliate commerce, offline-first, i18n ES/EN/FR
- **Play Store:** `https://play.google.com/store/apps/details?id=com.barrysoft.IntelliAuto`
- **Website:** `https://intelliauto.app/` (placeholder)
- **Source:** `~/AndroidStudioProjects/IntelliAuto` (private, not in this repo)

### IntelliFlow

- **What it is:** AI-powered personal finance app, live on Google Play Store
- **Stack:** Kotlin + Jetpack Compose, Firebase backend
- **Key features (safe to mention):** AI financial coach, expense categorization, offline-first, cross-platform sync
- **Play Store:** `https://play.google.com/store/apps/details?id=com.intelliflow.finances`
- **Website:** `https://intelliflow-finance.web.app/`

### AI Node (homelab inference)

- **What it is:** Headless inference node running llama.cpp on AMD ROCm
- **Hardware:** Ryzen 7 3800X, RX 7800 XT 16GB, Ubuntu 24.04
- **Key details (safe to mention):** All benchmark data, build flags, model configurations, power measurements, quant comparisons
- **Access:** Tailscale, sleeps 01:00-07:30 Madrid, lives at solar-powered house

## Issue Labeling System

This project uses the following label conventions for issue tracking:

### By Type

- `type: bug` - Something isn't working
- `type: feature` - New feature request
- `type: chore` - Maintenance task
- `type: docs` - Documentation improvements

### By Priority

- `priority: high` - High urgency, needs attention soon
- `priority: medium` - Normal priority
- `priority: low` - Can be addressed later

### By Area

- `area: content` - Blog posts or content
- `area: infrastructure` - DevOps/infrastructure
- `area: frontend` - UI/components
- `area: testing` - Test-related

When creating issues, use the appropriate labels to help prioritize work.

## Troubleshooting

### Build Errors

1. Check TypeScript errors: `npx tsc --noEmit`
2. Clear cache: `rm -rf node_modules/.astro`
3. Reinstall: `rm -rf node_modules && npm install`

### Content Not Showing

1. Check `draft: false` in frontmatter
2. Verify category matches allowed values
3. Ensure file is in correct directory

### Test Failures

1. Unit tests: `npm run test` - check specific test output
2. Integration tests: Ensure preview server isn't running on port 4321
3. Clear test cache: `rm -rf test-results/ playwright-report/`

## Resources

- [Astro Documentation](https://docs.astro.build)
- [Content Collections](https://docs.astro.build/en/guides/content-collections/)
- [GitHub Pages Deployment](https://docs.github.com/en/pages)
- [Vitest Documentation](https://vitest.dev/)
- [Playwright Documentation](https://playwright.dev/)

---

For questions or issues, check the README.md or existing documentation in the `docs/` directory.
