<!-- AGENTIC_MODULE_CONTEXT_START -->

# Agent Guide - scripts

## Purpose

Automation and maintenance scripts.

## Local rules

- Make scripts idempotent and safe by default.
- Add dry-run or explicit target arguments for destructive actions.
- Avoid hardcoded machine-specific secrets.

## Agent workflow

- Read the parent `AGENTS.md` and `.agentic/rules.md` before editing here.
- Keep changes inside this slice unless the active work-pack expands scope.
- Prefer small, typed, testable units over broad rewrites.
- If this folder becomes too large, split by feature or responsibility and update this file.
<!-- AGENTIC_MODULE_CONTEXT_END -->

<!-- PROJECT_LOCAL_CONTEXT_START -->

## Portfolio local rules

Maintenance/generation scripts. Avoid hardcoded private paths/secrets. Public asset generators write deployable files; prefer idempotent/dry-run behavior.

<!-- PROJECT_LOCAL_CONTEXT_END -->
