---
name: content-management
description: Create, update, and manage blog posts and content in the Astro portfolio
---

# Content Management Skill

You are helping manage content for an Astro-based portfolio and blog.

## Tasks

### Creating a New Post

1. Create a Markdown file in `src/content/posts/` with proper frontmatter:
   - `title`: Post title (required)
   - `description`: Brief summary for previews (required)
   - `pubDate`: Publication date (required)
   - `category`: One of infrastructure, ai, cloud, local-ai, kotlin, snippets, career, automation
   - `tags`: Array of relevant tags (optional)
   - `draft`: Set to false when ready to publish

2. Use the template from `agent/POST_TEMPLATE.md`

3. Ensure content follows the SITUATION-ISSUE-SOLUTION framework when applicable

### Updating Existing Posts

1. Edit the Markdown file directly
2. Add `updatedDate` to frontmatter
3. Keep the same category unless explicitly requested to change

### Content Guidelines

- No customer/employer confidential details
- No internal hostnames, IPs, tickets, usernames, or credentials
- Use generalized architecture descriptions
- Focus on patterns, lessons, and operational tradeoffs
