# Portfolio Agentic Rules

## Identity

Static Astro 5 technical portfolio and case-study blog for `sergiiob.dev`, focused on Linux, virtualization, automation, systems architecture, local AI, and applied engineering case studies.

## Workflow

- Read root `AGENTS.md`, nearest nested `AGENTS.md`, `.agentic/PROJECT_STRUCTURE.md`, `.agentic/SECURITY_RULES.md`, and active work-pack before broad edits.
- This is presentation-sensitive: meaningful UI/content changes require build plus visual preview/checks when practical.
- Extend existing topic clusters before creating near-duplicate posts.

## Architecture

- Static site only; do not introduce backend/runtime secrets unless explicitly requested.
- Keep route logic in `src/pages`, reusable UI in `src/components`, shell/SEO/CSP in `src/layouts`, metadata/i18n in `src/config`, content schema/taxonomy in `src/content`, and global tokens/styles in `src/styles`.
- Use `withBase()` for internal links/assets that must respect Astro base path.
- No new explicit TypeScript `any`.

## Content

- Posts live under the current flat model: `src/content/posts/*.md`.
- Allowed categories: `infrastructure`, `automation`, `ai`, `cloud`, `local-ai`, `kotlin`, `snippets`, `career`.
- Case studies should use situation -> issue -> solution -> usage context -> impact where possible.
- Mark unfinished content `draft: true`; update `updatedDate` for material changes.
- Avoid confidential employer/customer details, internal hostnames/IPs, tickets, usernames, credentials, and non-public deployment details.

## Required handoff

- Doctor: `python C:\Users\sergi\.codex\agentic-coding\scripts\agentic_doctor.py C:\Users\sergi\Syncthing\portfolio`
- Most changes: `npm run build`, `npm run lint`, `npm run format:check`, `npm test`.
- UI/navigation/responsive changes: also run preview/integration checks where practical.
