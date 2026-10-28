<!-- AGENTIC_MODULE_CONTEXT_START -->

# Agent Guide - src / pages

## Purpose

User interface slice.

## Local rules

- Keep UI state explicit and typed.
- Preserve accessibility, localization, theme, and responsive behavior.
- For visual changes, build/preview and capture evidence when practical.

## Agent workflow

- Read the parent `AGENTS.md` and `.agentic/rules.md` before editing here.
- Keep changes inside this slice unless the active work-pack expands scope.
- Prefer small, typed, testable units over broad rewrites.
- If this folder becomes too large, split by feature or responsibility and update this file.
<!-- AGENTIC_MODULE_CONTEXT_END -->

<!-- PROJECT_LOCAL_CONTEXT_START -->

## Portfolio local rules

Routes. Use `BaseLayout` except intentional standalone redirects. Preserve `getStaticPaths`, draft filtering, unique titles/descriptions, and typed content.

<!-- PROJECT_LOCAL_CONTEXT_END -->
