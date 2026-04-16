---
title: "Git Branch Splitting: Untangling Mixed Feature Branches"
description: "A practical guide to splitting an oversized Git PR into clean, topic-focused branches using path-based checkout from a fresh branch off main."
situation: "During infrastructure-as-code delivery, a feature branch grew to contain both role logic changes and inventory data changes. The PR became too large and mixed too many concerns for a safe review."
issue: "Mixed branches make PRs unreviewable, increase blast radius, and risk dragging unrelated changes into production. When one branch contains role code, host variables, certificate files, and inventory updates together, reviewers cannot isolate what changed or why."
solution: "Split the oversized branch into multiple clean, topic-focused branches by checking out only the relevant paths from the mixed branch into new branches created fresh off main."
usedIn: "Enterprise Ansible repositories managing 200+ servers where PR hygiene directly affects production safety and review speed."
impact: "Reduced PR review time from days to hours, eliminated cross-concern regressions, and made rollback granular enough to revert one topic without reverting all of them."
pubDate: 2026-04-16
category: ["automation", "infrastructure"]
tags: ["git", "devops", "ansible", "workflow", "version-control"]
draft: false
---

## Situation

In infrastructure repositories, a feature branch often starts small: update a role, add a new vhost template, fix a default variable. Then the work grows. You add host variables for the new feature, then you add inventory entries, then someone asks you to include certificate provisioning in the same branch. Before long, one branch contains:

- Role code changes (templates, tasks, defaults)
- Host-specific variable files across multiple environments
- Static assets like certificates, keytabs, and service unit files
- Inventory host list updates

When that branch becomes a PR, reviewers see a wall of unrelated files. If one concern needs changes, the entire PR is blocked. If you force-push to fix one thing, reviewers lose track of everything else.

The solution is not to untangle the history. The solution is to **split by topic, not by history**.

## Task 1 – Understand why history rewriting is the wrong approach

The instinct when a branch is messy is to try interactive rebase, cherry-pick, or amend to clean up the commits. In practice, this causes problems:

- Force-pushes confuse reviewers who already left comments
- Cherry-picking from a mixed branch risks dropping file changes
- Amending commits that touched multiple concerns creates confusing diffs

The safer approach is to leave the mixed branch untouched and create new clean branches from `main`, checking out only the paths that belong to each topic.

## Task 2 – Split branch 1: inventory host lists only

Start from a clean `main` and create a branch that contains only the inventory host file updates.

```bash
git switch main
git pull
git switch -c inventory/update-host-lists

# Check out only the host files from the mixed branch
git checkout feature/mixed-platform-update -- \
  inventory/dev/hosts.yml \
  inventory/stage/hosts.yml \
  inventory/prod/hosts.yml

git add inventory/dev/hosts.yml \
  inventory/stage/hosts.yml \
  inventory/prod/hosts.yml
git commit -m "inventory: update dev, stage, and prod host lists"
git push -u origin inventory/update-host-lists
```

This branch now contains exactly one concern: host list updates. Reviewers can verify it in minutes.

## Task 3 – Split branch 2: host variables without application assets

Host variables often contain subdirectories with application-specific files like web server configs, keytabs, or certificates. You may want to separate the host metadata (YAML files, service units) from the application-layer assets.

```bash
git switch main
git pull
git switch -c inventory/update-host-vars

# Check out all host_vars from the mixed branch
git checkout feature/mixed-platform-update -- \
  inventory/dev/host_vars \
  inventory/stage/host_vars \
  inventory/prod/host_vars

# Remove application-specific subdirectories that belong in the role branch
find inventory/dev/host_vars inventory/stage/host_vars inventory/prod/host_vars \
  -type d -path '*/.files/web' -exec rm -rf {} +

git add inventory/
git status
```

Verify the exclusion worked:

```bash
git diff --cached --name-only | grep '/.files/web/'
```

Expected: no output. If files from the excluded path still appear, the `find` command did not match. Check the exact directory name and retry.

```bash
git commit -m "inventory: add and update host variables across environments"
git push -u origin inventory/update-host-vars
```

## Task 4 – Split branch 3: role code only

This branch should contain only the role logic, templates, defaults, and any role-specific documentation.

```bash
git switch main
git pull
git switch -c feat/update-proxy-role

# Check out the role from the original feature branch
git checkout feature/add-web-proxy -- roles/web_proxy
git checkout feature/add-web-proxy -- CHANGELOG.md

git add roles/web_proxy CHANGELOG.md
git commit -m "roles/web_proxy: add multi-vhost support and proxy header controls"
git push -u origin feat/update-proxy-role
```

If the role branch also needs the application-layer inventory assets (like web server config fragments stored under `host_vars`), you can check out host variables and then strip everything except the relevant subdirectory:

```bash
git checkout feature/add-web-proxy -- inventory/dev/host_vars \
  inventory/stage/host_vars inventory/prod/host_vars

# Keep only the web config assets, remove everything else
find inventory/dev/host_vars inventory/stage/host_vars inventory/prod/host_vars \
  -type f ! -path '*/.files/web/*' -delete
find inventory/dev/host_vars inventory/stage/host_vars inventory/prod/host_vars \
  -type d -empty -delete

git add inventory/
git status
```

This gives you a branch where only the role code and its associated inventory assets are present.

## Task 5 – Move a single file between branches

Sometimes you notice one file in the wrong branch. Instead of reopening the branch or dragging the whole thing along:

```bash
git switch inventory/update-host-vars
git checkout feature/mixed-platform-update -- roles/common_usersetup/vars/local_accounts.yml
git add roles/common_usersetup/vars/local_accounts.yml
git commit -m "common_usersetup: fix account home directory path"
```

One file, one commit, one branch. This is cleaner than cherry-picking a commit that touched five other files.

## Task 6 – Handle common Git friction points

When splitting branches, you will hit these situations regularly.

### `git stash` says "nothing to save" but you see files

This happens when the files are untracked. `git stash` only saves tracked modifications by default.

```bash
# Include untracked files in the stash
git stash -u
# Or the long form
git stash --include-untracked
```

### Branch switch fails with "untracked files would be overwritten"

Git refuses to switch branches when untracked files in your working tree conflict with tracked files on the target branch.

Safe approach — stash them:

```bash
git stash -u
git switch target-branch
```

Destructive approach — delete them (only if disposable):

```bash
# Preview what will be deleted
git clean -nd
# Delete
git clean -fd
```

### `git stash pop` fails with "already exists, no checkout"

This means the stash contained untracked files and those paths already exist in the working tree. Git refuses to overwrite them.

```bash
# Check current state
git status
# Inspect the stash
git stash list
# If the stash content is no longer needed, drop it
git stash drop stash@{0}
```

Only drop the stash when you are certain you no longer need its contents.

### Unstaging vs discarding working tree changes

These are different operations:

```bash
# Unstage: remove from index, keep in working tree
git restore --staged .

# Discard: reset working tree to match main
git restore --source=main --worktree .

# Full clean slate: unstage AND discard
git restore --staged .
git restore --source=main --worktree .
```

## Task 7 – Verify each branch before opening PRs

Before pushing each split branch, run these checks:

```bash
# What changed relative to main
git diff --name-only main

# What is currently staged
git diff --cached --name-only

# Verify excluded paths are truly absent
git diff --cached --name-only | grep '/.files/web/'
# Expected: no output
```

If the output shows files that do not belong, do not open the PR yet. Go back, unstage, remove, and recommit.

## Task 8 – Decide: clean the existing branch or create a replacement

If the mixed PR is already open, you have two options:

**Option A: Clean the existing branch in place**

- Keeps the same PR number
- Requires force-push
- Reviewers may see confusing history

**Option B: Create replacement branches from main** (recommended)

- Safer and easier to reason about
- Each branch gets its own clean PR
- Old PR can be closed after replacements are opened

In most cases, creating clean replacement branches is the right choice. The only downside is managing the PR lifecycle (closing the old one, opening the new ones), but that is a small cost compared to the risk of force-pushing a mixed branch.

## Task 9 – Clean up old branches

After all replacement PRs are open and the original mixed PR is closed:

```bash
# Switch away first
git switch main

# Delete the local branch
git branch -D feature/mixed-platform-update

# Delete the remote branch
git push origin --delete feature/mixed-platform-update
```

Be careful: if a PR is still open from that remote branch, deleting it may close or break the PR.

## Recommended branch split strategy for infrastructure repos

Use separate branches for separate concerns:

| Branch topic                  | Contains                                       | Does not contain           |
| ----------------------------- | ---------------------------------------------- | -------------------------- |
| `inventory/update-host-lists` | `inventory/*/hosts.yml`                        | Host variables, role code  |
| `inventory/update-host-vars`  | Host YAML files, service units, certs, keys    | Role code, host list files |
| `feat/update-proxy-role`      | Role templates, tasks, defaults, changelog     | Host variables, host lists |
| `feat/update-proxy-assets`    | Role-specific inventory assets under `.files/` | Everything else            |

This split keeps PRs small, reviewable, and independently revertable.

## Why this matters

The rule of thumb is simple:

1. Start from `main`
2. Create a new clean branch
3. Check out only the paths you want
4. Verify with `git status` and `git diff --cached --name-only`
5. Commit only that narrow scope

This approach is safer than trying to untangle a mixed feature branch after the fact. It produces cleaner PRs, faster reviews, and smaller blast radius when something needs to be reverted.

In infrastructure work, where a single bad PR can affect hundreds of servers, keeping branches focused on one concern is not just a Git best practice. It is a production safety measure.

<!-- portfolio:expanded-v2 -->

## Post-Specific Engineering Lens

For this post, the primary objective is: **Increase automation reliability and reduce human variance in code review.**

### Implementation decisions for this case

- Chose a path-based checkout approach centered on **git** to avoid history rewriting risks.
- Used **topic-based branch splitting** to make regressions observable and isolated before full rollout.
- Treated **version control** documentation as part of delivery, not a post-task artifact.

### Practical command path

These are representative execution checkpoints relevant to this post:

```bash
git switch main && git pull
git switch -c clean-branch
git checkout mixed-branch -- specific/path/
git diff --cached --name-only
git commit -m "scope: narrow change description"
```

## Validation Matrix

| Validation goal          | What to baseline            | What confirms success                                               |
| ------------------------ | --------------------------- | ------------------------------------------------------------------- |
| Branch scope isolation   | mixed branch file count     | `git diff --name-only main` shows only expected paths               |
| No cross-concern leakage | expected exclusion patterns | `git diff --cached --name-only \| grep excluded-path` returns empty |
| Review readiness         | PR diff size and focus      | each PR touches one concern area only                               |

## Failure Modes and Mitigations

| Failure mode                 | Why it appears in this type of work         | Mitigation used in this post pattern                                 |
| ---------------------------- | ------------------------------------------- | -------------------------------------------------------------------- |
| Checking out too many paths  | Mixed branches have interdependent files    | Always verify with `git diff --cached --name-only` before committing |
| Stash losing untracked files | Default `git stash` ignores untracked files | Use `git stash -u` consistently                                      |
| Force-push confusion         | Cleaning an existing branch in place        | Create replacement branches from main instead                        |

## Recruiter-Readable Impact Summary

- **Scope:** established a repeatable branch splitting workflow for infrastructure repositories with mixed-concern branches.
- **Execution quality:** guarded by path verification checks and explicit exclusion patterns before every commit.
- **Outcome signal:** reduced PR review time from days to hours and made rollback granular by topic instead of by branch.
