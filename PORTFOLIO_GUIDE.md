# Portfolio Workflow & Deployment Guide

This guide explains how to write content and deploy the Astro-based portfolio safely on GitHub Pages.

## 1. Local Workflow

Typical workflow:

1. Edit content or pages locally
2. Run `npm run dev` for preview
3. Run `npm run build` before pushing
4. Push to `main` to trigger deployment

## 2. Writing a New Post

Create a Markdown file in `src/content/posts/<category>/` and include valid frontmatter.

```yaml
---
title: "Title of Your Post"
description: "Short summary for card previews"
pubDate: 2026-02-26
category: "infrastructure" # infrastructure | ai | cloud | local-ai | kotlin | snippets | career
tags: ["linux", "ansible"] # Optional
draft: false
---
```

Guidelines for public-safe writing:

- Avoid customer/employer confidential details
- Avoid internal hostnames, IPs, tickets, usernames, and credentials
- Prefer generalized architecture descriptions
- Focus on patterns, lessons, and operational tradeoffs

## 3. Deployment (GitHub Pages)

The repository deploys using GitHub Actions (`.github/workflows/deploy.yml`).

One-time setup:

1. Create a GitHub repository
2. Push this project to the `main` branch
3. In GitHub Pages settings, choose `GitHub Actions` as the source

After setup, each push to `main` builds and deploys the static site.

## 4. Public Profile Configuration

Edit `src/config/site.ts` to control:

- Brand/title text
- Public summary text
- Optional public links
- Privacy notes shown in the sidebar

## 5. Pre-Publish Checklist

- `draft: false` only when content is ready
- No secrets, tokens, internal URLs, or private identifiers
- No unnecessary personal contact details
- `npm run build` passes locally
- Metadata (title/description/category/tags) is accurate
