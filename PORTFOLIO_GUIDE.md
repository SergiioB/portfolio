# Portfolio Workflow & Deployment Guide

This guide explains how to manage, write for, and deploy your Astro-based portfolio.

**Live Site:** https://sergiob.github.io/portfolio

## 1. Local Development & Syncing

Your project is synchronized between your **Radxa** and your **Laptop** using Syncthing.

- **Radxa Path:** `/home/radxa/projects/portfolio`
- **Laptop Path:** (The path you configured in Syncthing, e.g., `C:\Users\Sergio\Documents\portfolio`)
- **Note:** `node_modules` and build artifacts are ignored by Syncthing to keep the sync fast and lightweight.

## 2. Writing a New Post

The site uses Astro Content Collections. To add a new post:

1. Create a `.md` file in `src/content/posts/`.
2. Organize them into subfolders if you like (e.g., `src/content/posts/infrastructure/rhel9-migration.md`).
3. Include the required **frontmatter** at the top of the file:

```yaml
---
title: "Title of Your Post"
description: "A short summary for the preview card"
pubDate: 2026-02-26
category: "infrastructure" # Must be: infrastructure, ai, cloud, local-ai, kotlin, snippets, or career
tags: ["linux", "ansible"] # Optional
draft: false # Set to true to hide from the live site
---
```

**That's it.** No config changes needed. The post will automatically appear on the site after you deploy.

## 3. Available Categories

To keep the UI professional, use these categories in your post frontmatter:

- `infrastructure`: RHEL, Virtualization, Ansible, Satellite.
- `ai`: Azure AI Foundry, OpenAI, LLM integration.
- `local-ai`: Ollama, local model performance, hardware setup.
- `cloud`: Azure architecture, Cloud infrastructure.
- `kotlin`: Android development or Kotlin scripting.
- `snippets`: Useful bash scripts, one-liners, and config snippets.
- `career`: Professional updates, retrospectives, and growth notes.

## 4. Deployment to GitHub Pages

The site is set up to be hosted for free on GitHub Pages using GitHub Actions.

### Initial Setup (One-time)

1. Create a repository on GitHub named `portfolio` under your account.
2. Push your code:
   ```bash
   git init
   git remote add origin https://github.com/sergiob/portfolio.git
   git add .
   git commit -m "Initial commit"
   git push -u origin main
   ```
3. In GitHub, go to **Settings > Pages**.
4. Set **Source** to **GitHub Actions**.

### Automated Updates

Every time you `git push` to the `main` branch, a GitHub Action will:

1. Install dependencies.
2. Build the static site.
3. Deploy it to https://sergiob.github.io/portfolio

## 5. Custom Domain (Optional)

To add a custom domain later:

1. Add a CNAME file to the `public/` folder with your domain (e.g., `blog.sergiob.dev`).
2. Configure DNS with your domain provider:
   - Create a CNAME record pointing your subdomain to `sergiob.github.io`
3. No code changes needed beyond the CNAME file.

## 6. Helpful Commands

In the project root:

- `npm install`: Install dependencies (run this if you clone to a new machine).
- `npm run dev`: Start a local preview server at `http://localhost:4321`.
- `npm run build`: Manually check if the site compiles without errors.

## 7. Site Structure

- **Home**: Shows all recent posts
- **Categories**: `/infrastructure/`, `/ai/`, `/cloud/`, etc.
- **Archive**: `/archive/` - browse posts by year
- **About**: `/about/` - your experience and skills
- **Posts**: `/posts/slug/` - individual post pages
