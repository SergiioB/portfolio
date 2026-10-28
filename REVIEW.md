<!-- review-contract v1 — generated, edit in place and it stays -->

# REVIEW.md — portfolio

Astro portfolio at `sergiiob.dev`. Content is career evidence, not marketing copy.

Rationale and references: `~/projects/engineering-practices/practices/00-code-review.md`.

## What "broken" means here

1. **Invented experience, metrics or dates.** Every claim maps to something real.
2. **A broken build or a broken link** shipped to production.
3. **Secrets or private paths** in the bundle or in a post.
4. **Copy that reads like AI slop** — banned-words list applies, no filler openers.

## How to report a finding

- Severity: `important` (one of the rules above, or a real bug), `nit` (taste, small),
  `pre-existing` (already on the default branch — label it so the author is not blamed).
- Always `path/to/file:LINE` plus the symbol. Never guess a filename.
- One finding per issue. No "and also".
- Open with a count: `2 important, 1 nit` or `no issues`.

## Do not touch

- `dist/`, `node_modules/`, `public/images/` generated assets.

## Convergence

- Three review rounds maximum. After the third, question the approach instead of producing a fourth batch.
- From round two, review the new diff only.
- Report the class of bug, not one instance at a time.
- Never re-report a finding already resolved in this PR.
- An agent author and an agent reviewer must never loop unattended; escalate to Sergio.

## Human-only decisions

- Deploying to `sergiiob.dev`.
- Anything naming a current employer in a way that needs review.

## Recurring issues

Append when a review catches the same thing twice: date, pattern, and the fix that came out of it
(a lint rule, a line here, or a skill update).

- _(empty)_
