---
title: "Orchestrating Complex Patching Waves with Ansible"
description: "How to manage Linux server patching across different tiers (Database, Application, etc.) using Ansible limits and targeted groups."
situation: "During enterprise Linux and virtualization operations across multi-team environments, this case came from work related to \"Orchestrating Complex Patching Waves with Ansible.\""
issue: "Needed a repeatable way to manage Linux server patching across different tiers (Database, Application, etc.) using Ansible limits and targeted groups."
solution: "Implemented a practical runbook/automation pattern with clear safety checks, execution steps, and verification points."
usedIn: "Used in Linux platform engineering, middleware operations, and datacenter modernization projects in regulated environments."
impact: "Improved repeatability, reduced incident risk, and made operational handoffs clearer across teams."
pubDate: 2026-02-23
category: "infrastructure"
tags: ["ansible", "patching", "automation", "sysadmin"]
draft: false
---

## Situation
When you manage a large-scale infrastructure, patching isn't as simple as running `dnf update` on all machines simultaneously. You often have strict dependencies: Database servers must go down last and come up first, while Application servers depend on the DBs being available. Sometimes, specialized environments (like SAP) need to be handled separately.

In our workflow, we use a structured approach with Ansible to patch servers in specific "waves".

## Task 1 – Defining the Waves in Inventory

We organize our inventory into groups representing the different waves. For example, in our `development` environment inventory, we might have:

*   `dev_patch_wave01_db`: Database servers.
*   `dev_patch_wave02_app`: Application servers.
*   `dev_patch_wave03_special`: Specialized or standalone servers.

## Task 2 – Verifying the Target Hosts

Before executing any patching playbook, it's critical to verify exactly which servers will be affected. We use the `--list-hosts` flag combined with the `--limit` parameter targeting the specific wave.

```bash
# Check which DB servers are going to be patched in wave 1
ansible-playbook -i inventory/dev/ playbooks/patching.yml 
  --limit='dev_patch_wave01_db' --list-hosts
```

## Task 3 – Executing the Patching Playbook in Order

Once verified, we execute the patching playbooks in the required sequence. We typically separate the "update" process from the "reboot" process to have more control.

### Wave 1: Databases
We patch the DB servers first and wait for the DB administrators to confirm everything is back up and running.

```bash
# Run the patching playbook for wave 1
ansible-playbook -i inventory/dev/ playbooks/patching.yml 
  --limit='dev_patch_wave01_db'

# Reboot wave 1 servers
ansible-playbook -i inventory/dev/ playbooks/rebooting.yml 
  --limit='dev_patch_wave01_db'
```

### Wave 2: Applications
After confirming the databases are healthy, we move on to the application tier.

```bash
# Run the patching playbook for wave 2
ansible-playbook -i inventory/dev/ playbooks/patching.yml 
  --limit='dev_patch_wave02_app'

# Reboot wave 2 servers
ansible-playbook -i inventory/dev/ playbooks/rebooting.yml 
  --limit='dev_patch_wave02_app'
```

### Wave 3: Specialized Systems
Finally, we handle systems that might require manual intervention or specific shutdown procedures before patching.

```bash
ansible-playbook -i inventory/dev/ playbooks/patching.yml 
  --limit='dev_patch_wave03_special'
```

By strictly using `--limit` and well-defined inventory groups, we prevent accidental updates to dependent systems and ensure a smooth, verifiable patching cycle.

<!-- portfolio:expanded-v1 -->

## Architecture Diagram
![Orchestrating Complex Patching Waves with Ansible supporting diagram](/images/diagrams/post-framework/infrastructure-flow.svg)

This visual summarizes the implementation flow and control points for **Orchestrating Complex Patching Waves with Ansible**.

## Deep Dive
This case is strongest when explained as an execution narrative instead of only a command sequence. The core focus here is **platform reliability, lifecycle controls, and repeatable Linux delivery**, with decisions made to keep implementation repeatable under production constraints.

### Design choices
- Preferred deterministic configuration over one-off remediation to reduce variance between environments.
- Treated **ansible** and **patching** as the main risk vectors during implementation.
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

