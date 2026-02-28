---
title: "Automating Linux User Permission Audits with Bash"
description: "A practical bash script to quickly map out group memberships, owned directories, and sudo privileges for specific service accounts."
situation: "During enterprise Linux and virtualization operations across multi-team environments, this case came from work related to \"Automating Linux User Permission Audits with Bash.\""
issue: "Needed a repeatable way to quickly map out group memberships, owned directories, and sudo privileges for specific service accounts."
solution: "Implemented a practical runbook/automation pattern with clear safety checks, execution steps, and verification points."
usedIn: "Used in Linux platform engineering, middleware operations, and datacenter modernization projects in regulated environments."
impact: "Improved repeatability, reduced incident risk, and made operational handoffs clearer across teams."
pubDate: 2026-02-21
category: "infrastructure"
tags: ["bash", "scripting", "security", "permissions"]
draft: false
---

## Situation
During infrastructure migrations, system harding, or security audits, you often need to figure out exactly what a specific technical user or service account has access to. Manually checking `id`, `sudo -l`, and running `find` commands for multiple users is tedious. 

I wrote a quick Bash script that automates this. It iterates through a defined array of users and generates a report detailing their group memberships, any directories they own within a specific path, and their sudo privileges.

## The Script

Create a file named `user_permissions_mapping.sh` and make it executable (`chmod +x user_permissions_mapping.sh`).

```bash
#!/bin/bash

# Define the users you want to audit
USERS=("svc_scheduler" "svc_ci" "svc_worker")

# Define the search path for directory ownership (e.g., "/opt/applications" or "/")
SEARCH_PATH="/opt/applications"

echo "================================================================"
echo "ADVANCED FOLDER PERMISSIONS AUDIT - $(date)"
echo "HOST: $(hostname) | SEARCH PATH: $SEARCH_PATH"
echo "================================================================"

for user in "${USERS[@]}"; do
    echo -e "
>>> ANALYZING USER: $user"
    
    # Check if the user exists
    if ! id "$user" &>/dev/null; then
        echo "[ERROR] User does not exist."
        continue
    fi
    
    # 1. Group Membership
    echo "[Groups]"
    groups "$user"
    
    # 2. Owned Directories Only
    echo "[Owned Directories in $SEARCH_PATH]"
    # -type d ensures ONLY directories are returned
    # -maxdepth 2 limits the search depth for performance
    find "$SEARCH_PATH" -maxdepth 2 -type d \( -user "$user" -o -group "$user" \) -ls 2>/dev/null | awk '{print $3, $5, $6, $11}'
    
    # 3. Sudo Access
    echo "[Sudo Access]"
    if [ "$EUID" -ne 0 ]; then
        echo "Run script as root to see sudo rules for other users."
    else
        # Suppress the "not allowed" standard output to keep the report clean
        sudo -l -U "$user" | grep -v "not allowed" || echo "No sudo privileges."
    fi
    
    # 4. Account Info
    echo "[Account Details]"
    getent passwd "$user" | awk -F: '{print "Home: "$6" | Shell: "$7}'
    
    echo "----------------------------------------------------------------"
done
```

## How It Works

1.  **Users Array**: You simply add the usernames you want to check into the `USERS` array.
2.  **Groups**: It uses the standard `groups` command to list all groups the user belongs to.
3.  **Directory Search**: It uses `find` to look for directories (`-type d`) owned by the user or the user's primary group. I added `-maxdepth 2` to prevent the script from taking forever by crawling the entire filesystem recursively. It formats the output nicely using `awk`.
4.  **Sudo Rules**: It utilizes `sudo -l -U <user>` to list the sudo rules. Note that the script must be run as `root` for this specific check to work across different users.
5.  **Basic Info**: It grabs the home directory and default shell from `/etc/passwd`.

This script provides a clean, readable audit trail that you can easily pipe into a text file for documentation.

<!-- portfolio:expanded-v2 -->

## Architecture Diagram
![Automating Linux User Permission Audits with Bash execution diagram](/images/diagrams/post-framework/infrastructure-flow.svg)

This diagram supports **Automating Linux User Permission Audits with Bash** and highlights where controls, validation, and ownership boundaries sit in the workflow.

## Post-Specific Engineering Lens
For this post, the primary objective is: **Apply infrastructure practices with measurable validation and clear rollback ownership.**

### Implementation decisions for this case
- Chose a staged approach centered on **bash** to avoid high-blast-radius rollouts.
- Used **scripting** checkpoints to make regressions observable before full rollout.
- Treated **security** documentation as part of delivery, not a post-task artifact.

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
| Functional stability | service availability, package state, SELinux/firewall posture | `systemctl --failed` stays empty |
| Operational safety | rollback ownership + change window | `journalctl -p err -b` has no new regressions |
| Production readiness | monitoring visibility and handoff notes | critical endpoint checks pass from at least two network zones |

## Failure Modes and Mitigations
| Failure mode | Why it appears in this type of work | Mitigation used in this post pattern |
|---|---|---|
| Scope ambiguity | Teams execute different interpretations | Write explicit pre-check and success criteria |
| Weak rollback plan | Incident recovery slows down | Define rollback trigger + owner before rollout |
| Insufficient telemetry | Failures surface too late | Require post-change monitoring checkpoints |

## Recruiter-Readable Impact Summary
- **Scope:** deliver Linux platform changes with controlled blast radius.
- **Execution quality:** guarded by staged checks and explicit rollback triggers.
- **Outcome signal:** repeatable implementation that can be handed over without hidden steps.

