# Work-Pack Rules

## Goal

<one concrete outcome>

## Non-negotiables

- Read root and nested `AGENTS.md` before edits.
- Keep edits scoped to the files listed in `scope.md` unless the task file is updated.
- Preserve user data, secrets, billing/security flows, and existing behavior.
- Run the checks listed in `scope.md` before handoff or explain why not.

## Architecture guardrails

- Centralize configuration in the config slice.
- Put external services behind interfaces/adapters.
- Prefer local JSON/in-memory/dev fallback for risky external systems.
- Refactor oversized files/directories instead of extending them.

## Time budget

- 50% feature implementation.
- 50% refactor, tests, diagnostics, docs, and cleanup.
