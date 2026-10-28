# AGENTS.md — portfolio

Astro portfolio at `sergiiob.dev`. Content is career evidence, not marketing copy.

Read `REVIEW.md` before reviewing or opening a pull request.

## Code review

Review contract: `REVIEW.md`. PR template: `.github/pull_request_template.md`.

1. Before opening a PR, run the check that covers the change and paste the real output. A
   fresh-context reviewer looks at the diff; the author never reviews their own diff.
2. Every PR gets a review against `REVIEW.md`, and every thread is resolved before merge.
3. Risk tier is a property of the change. High-risk changes need a human who is not the author; an
   agent approval is never a human approval and covers one commit only.
4. Three review rounds maximum. After that, re-evaluate the approach. From round two, review the new
   diff only.
5. Every PR states how to revert it.
6. When the same finding appears twice, fix the source: `REVIEW.md`, a lint rule, or a skill. Not the
   comment.

## Working tree <!-- clean-tree:v1 -->

A session is not finished while `git status` shows anything it created.

1. Output that a build, a test, a benchmark or a screenshot produces goes into `.gitignore` in the
   **same commit that produces it**.
2. Real work is committed before the session ends, on the branch it belongs to.
3. Junk is deleted, not left for someone to interpret: crash dumps, `replay_pid*.log`,
   `*.sync-conflict-*`, scratch scripts.
4. Heavy payloads (raw logs, multi-MB binaries, SQLite databases, downloaded models, promo video)
   never enter git. Keep the summary, ignore the payload.
5. Files that must stay uncommitted are named in the handoff with the reason.
6. Verify before you stop:

```bash
git status --porcelain           # empty
git rev-list --count @{u}..HEAD  # 0
```

Rationale: `~/projects/engineering-practices/practices/05-clean-tree.md`.
