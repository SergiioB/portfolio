---
title: "Orchestrating Patching Waves for Enterprise Linux"
description: "How to structure Ansible patching playbooks into controlled waves with health checks, rollback triggers, and clear ownership boundaries."
situation: "Our monthly patching cycle involved 200+ servers patched in a single batch. When a bad patch caused application failures, we had no way to quickly identify which servers were affected or rollback selectively."
usedIn: "Monthly patching cycle for 200+ RHEL servers at a German bank, supporting SAP, PostgreSQL, and middleware workloads."
impact: "Reduced patching incidents by 90%, rollback time from hours to minutes, and enabled selective patching by application tier."
pubDate: 2026-02-15
category: ["infrastructure", "automation"]
tags: ["ansible", "patching", "rhel", "lifecycle"]
draft: false
---

## Situation

When you manage a large-scale infrastructure, patching isn't as simple as running `dnf update` on all machines simultaneously. You often have strict dependencies: Database servers must go down last and come up first, while Application servers depend on the DBs being available. Sometimes, specialized environments (like SAP) need to be handled separately.

In our workflow, we use a structured approach with Ansible to patch servers in specific "waves".

## Task 1 – Defining the Waves in Inventory

We organize our inventory into groups representing the different waves. For example, in our `development` environment inventory, we might have:

- `dev_patch_wave01_db`: Database servers.
- `dev_patch_wave02_app`: Application servers.
- `dev_patch_wave03_special`: Specialized or standalone servers.

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

