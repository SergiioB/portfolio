---
title: "Safely Resolving Git Merge Conflicts"
description: "A methodical approach to resolving git merge conflicts using git stash to protect your local work."
situation: "During day-to-day incident handling and collaborative delivery workflows, this case came from work related to \"Safely Resolving Git Merge Conflicts.\""
issue: "Needed a repeatable way to resolve git merge conflicts using git stash to protect your local work."
solution: "Implemented a practical runbook/automation pattern with clear safety checks, execution steps, and verification points."
usedIn: "Used in daily engineering operations to reduce mistakes and speed up safe execution."
impact: "Reduced failure rate in recurring engineering tasks and improved recovery speed."
pubDate: 2026-01-27
category: "snippets"
tags: ["git", "workflow", "development", "version-control"]
draft: false
---

## Situation
Encountering a merge conflict is a very common situation in collaborative software development. A safe and systematic approach involves using `git stash` to protect your uncommitted local changes before attempting to pull in updates from the main branch.

## Task 1 – Protect your current work

Before switching branches or merging, you should put your uncommitted changes into a temporary safe. This leaves your working directory clean.

```bash
git stash
```
This takes all your uncommitted modifications and stores them in a temporary stack. Your code returns to the state of the last commit, but no work is lost.

## Task 2 – Update your reference of the main branch

Now that your working tree is clean, fetch the latest changes that your colleagues have pushed to the main branch.

```bash
git checkout main
git pull origin main
```

## Task 3 – Bring the changes into your feature branch

Switch back to your feature branch and merge the updated main branch into it.

```bash
git checkout my-feature-branch
git merge main
```
At this point, Git might output `CONFLICT (content): Merge conflict in...`. This is normal; Git is just asking you to decide which lines to keep.

## Task 4 – Resolve the conflict

Open your code editor. You will see the files with conflicts marked with special indicators:

```text
<<<<<<< HEAD
My current code in the feature branch
=======
The code from my colleague that came from main
>>>>>>> main
```

**Your task:**
1. Decide which code stays (yours, theirs, or a mix of both).
2. Delete the conflict markers (`<<<<<<<`, `=======`, `>>>>>>>`).
3. Save the file.

Once edited and saved, tell Git the conflict is resolved by staging and committing the file:

```bash
git add .
git commit -m "Resolved merge conflict with main"
```

## Task 5 – Push the resolved branch

Now your branch contains both your colleague's work and your conflict resolution. Push it to the remote repository.

```bash
git push origin my-feature-branch
```

## Task 6 – Recover your stashed work

Remember the uncommitted changes we stored in the "safe" in Task 1? It's time to bring them back to continue working.

```bash
git stash pop
```
If the changes you were working on touch the same lines you just resolved, you might get another small conflict here. If so, simply resolve it using the same method in Task 4.

### Why not just use `git pull origin main` directly?
Running `git pull origin main` directly while you have a dirty working tree can lead to Git blocking the pull to protect your files, or worse, attempting a messy merge that is hard to untangle. The `stash` method acts as a safety belt for your uncommitted code.

<!-- portfolio:expanded-v2 -->

## Architecture Diagram
![Safely Resolving Git Merge Conflicts execution diagram](/portfolio/images/diagrams/post-framework/snippets-runbook.svg)

This diagram supports **Safely Resolving Git Merge Conflicts** and highlights where controls, validation, and ownership boundaries sit in the workflow.

## Post-Specific Engineering Lens
For this post, the primary objective is: **Apply snippets practices with measurable validation and clear rollback ownership.**

### Implementation decisions for this case
- Chose a staged approach centered on **git** to avoid high-blast-radius rollouts.
- Used **workflow** checkpoints to make regressions observable before full rollout.
- Treated **development** documentation as part of delivery, not a post-task artifact.

### Practical command path
These are representative execution checkpoints relevant to this post:

```bash
echo "define baseline"
echo "apply change with controls"
echo "validate result and handoff"
```

## Validation Matrix
| Validation goal | What to baseline | What confirms success |
|---|---|---|
| Functional stability | incident frequency and mean time to mitigation | commands are safe against common edge cases |
| Operational safety | rollback ownership + change window | runbook version includes pre-check and post-check gates |
| Production readiness | monitoring visibility and handoff notes | handoff notes specify ownership and escalation path |

## Failure Modes and Mitigations
| Failure mode | Why it appears in this type of work | Mitigation used in this post pattern |
|---|---|---|
| Scope ambiguity | Teams execute different interpretations | Write explicit pre-check and success criteria |
| Weak rollback plan | Incident recovery slows down | Define rollback trigger + owner before rollout |
| Insufficient telemetry | Failures surface too late | Require post-change monitoring checkpoints |

## Recruiter-Readable Impact Summary
- **Scope:** turn tactical snippets into repeatable operational patterns.
- **Execution quality:** guarded by staged checks and explicit rollback triggers.
- **Outcome signal:** repeatable implementation that can be handed over without hidden steps.

