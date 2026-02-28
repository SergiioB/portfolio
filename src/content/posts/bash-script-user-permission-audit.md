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

<!-- portfolio:expanded-v1 -->

## Architecture Diagram
![Automating Linux User Permission Audits with Bash supporting diagram](/images/diagrams/post-framework/infrastructure-flow.svg)

This visual summarizes the implementation flow and control points for **Automating Linux User Permission Audits with Bash**.

## Deep Dive
This case is strongest when explained as an execution narrative instead of only a command sequence. The core focus here is **platform reliability, lifecycle controls, and repeatable Linux delivery**, with decisions made to keep implementation repeatable under production constraints.

### Design choices
- Preferred deterministic configuration over one-off remediation to reduce variance between environments.
- Treated **bash** and **scripting** as the main risk vectors during implementation.
- Kept rollback behavior explicit so operational ownership can be transferred safely across teams.

### Operational sequence
1. Baseline current state.
2. Apply change in controlled stage.
3. Run post-change validation.
4. Document handoff and rollback point.

## Validation and Evidence
Use this checklist to prove the change is production-ready:
- Baseline metrics captured before execution (latency, error rate, resource footprint, or service health).
- Post-change checks executed from at least two viewpoints (service-level and system-level).
- Failure scenario tested with a known rollback path.
- Runbook updated with final command set and ownership boundaries.

## Risks and Mitigations
| Risk | Why it matters | Mitigation |
|---|---|---|
| Configuration drift | Reduces reproducibility across environments | Enforce declarative config and drift checks |
| Hidden dependency | Causes fragile deployments | Validate dependencies during pre-check stage |
| Observability gap | Delays incident triage | Require telemetry and post-change verification points |

## Reusable Takeaways
- Convert one successful fix into a reusable delivery pattern with clear pre-check and post-check gates.
- Attach measurable outcomes to each implementation step so stakeholders can validate impact quickly.
- Keep documentation concise, operational, and versioned with the same lifecycle as code.

