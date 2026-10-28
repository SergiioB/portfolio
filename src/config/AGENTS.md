<!-- AGENTIC_MODULE_CONTEXT_START -->

# Agent Guide - src / config

## Purpose

Single source of truth for runtime/build configuration.

## Local rules

- Do not scatter config reads across the repo.
- Export typed config objects/constants from here and import them elsewhere.
- Never commit secrets; load them from env/local secret stores.

## Agent workflow

- Read the parent `AGENTS.md` and `.agentic/rules.md` before editing here.
- Keep changes inside this slice unless the active work-pack expands scope.
- Prefer small, typed, testable units over broad rewrites.
- If this folder becomes too large, split by feature or responsibility and update this file.
<!-- AGENTIC_MODULE_CONTEXT_END -->

<!-- PROJECT_LOCAL_CONTEXT_START -->

## Portfolio local rules

`site.ts` and `i18n.ts` are central metadata/copy sources. Add both EN and ES strings for UI copy. Do not add private contact details or secrets.

<!-- PROJECT_LOCAL_CONTEXT_END -->
