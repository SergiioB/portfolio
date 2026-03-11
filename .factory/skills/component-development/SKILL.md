---
name: component-development
description: Develop and maintain Astro components for the portfolio
---

# Component Development Skill

You are developing Astro components for a portfolio website.

## Component Structure

```astro
---
// Server-side logic (runs at build time)
import type { Props } from './types';

const { prop1, prop2 } = Astro.props;
---

<!-- HTML template -->
<div class="component">
  {/* Content */}
</div>

<style>
  /* Scoped styles */
  .component { }
</style>

<script>
  // Client-side JavaScript (optional)
</script>
```

## Best Practices

1. **Use TypeScript**: Define Props interface for type safety
2. **Keep it static**: Minimize client-side JavaScript
3. **Scoped styles**: Use `<style>` tag for component-specific CSS
4. **Reusability**: Design components to be configurable via props

## Naming Conventions

- Component files: PascalCase (e.g., `PostCard.astro`)
- CSS classes: kebab-case (e.g., `.post-card`)
- Props: camelCase

## Common Patterns

- Use `slot` for content projection
- Use `Astro.props` for type-safe props
- Use `is:inline` only when client-side JS is necessary
