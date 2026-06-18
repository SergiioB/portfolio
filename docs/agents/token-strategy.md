# portfolio Token Strategy

## Load order

1. Root `AGENTS.md`.
2. Nearest nested `AGENTS.md` for the target folder.
3. `.agentic/rules.md`, `.agentic/PROJECT_STRUCTURE.md`, and `.agentic/SECURITY_RULES.md`.
4. The active work-pack under `.agentic/work-packs/`.
5. Only then inspect implementation files.

## First files to inspect

- `AGENTS.md`
- `.agentic/PROJECT_STRUCTURE.md`
- `.agentic/SECURITY_RULES.md`
- `docs/agents/feature-map.md`
- `astro.config.mjs`
- `src/layouts/BaseLayout.astro`
- `src/content/config.ts`
- `src/content/categories.ts`

## Keep out of context unless directly relevant

- `.git`
- `.gradle`
- `.kotlin`
- `.idea`
- `.firebase`
- `.stfolder`
- `.stfolder.removed-*`
- `node_modules`
- `build`
- `dist`
- `coverage`
- `playwright-report`
- `test-results`
- `.ruff_cache`
- `.pytest_cache`
- `.mypy_cache`
- `.cache`
- `.codex-tmp`
- `logs`
- `reports`
- `sessions`
- `backup`
- `models`
- `temp_sqlcipher`
- `cmdline-tools`
- `public/images bulk assets unless image work`
- `public/docs unless public CV/cover-letter work`
- `package-lock.json unless dependency changes`

## Search strategy

- Start from `docs/agents/feature-map.md` or `documentation/agents/feature-map.md`.
- Use targeted `rg` from the listed files instead of broad repository scans.
- Do not scan generated outputs, dependency folders, large logs, or binary assets for general context.
- Summarize old generated plans instead of loading them wholesale.
