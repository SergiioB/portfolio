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