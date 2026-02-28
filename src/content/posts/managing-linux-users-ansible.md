---
title: "Managing Linux Technical Users: UIDs, GIDs, and Ansible"
description: "A practical guide to standardize technical user creation, assigning static UIDs/GIDs, and avoiding conflicts in a large server fleet using Ansible."
situation: "During enterprise Linux and virtualization operations across multi-team environments, this case came from work related to \"Managing Linux Technical Users: UIDs, GIDs, and Ansible.\""
issue: "Needed a repeatable way to standardize technical user creation, assigning static UIDs/GIDs, and avoiding conflicts in a large server fleet using Ansible."
solution: "Implemented a practical runbook/automation pattern with clear safety checks, execution steps, and verification points."
usedIn: "Used in Linux platform engineering, middleware operations, and datacenter modernization projects in regulated environments."
impact: "Improved repeatability, reduced incident risk, and made operational handoffs clearer across teams."
pubDate: 2026-02-13
category: "infrastructure"
tags: ["ansible", "linux", "users", "sysadmin"]
draft: false
---

## Situation
When deploying new applications, you frequently need to provision technical users (service accounts) on Linux servers. In an enterprise environment, especially when dealing with clustered applications or shared storage (like NFS), it is critical that these users have **identical UIDs and GIDs across all servers**. 

If a user has `UID 1001` on Server A and `UID 1005` on Server B, file permissions on a shared NFS mount will break. Here is how we manage this using Ansible to ensure consistency.

## Task 1 – Defining the Source of Truth

We don't hardcode user creation into individual application playbooks. Instead, we use a central `common_usersetup` role and a single source of truth for all local technical users: `unix_local_users.yml`.

Every technical user gets a dedicated block defining its properties.

```yaml
# vars/unix_local_users.yml
local_users_app:
  myapp:
    uid: 45004
    gid: 45004
    is_ad_user: false
    is_external_group: false
    home: /opt/myapp/home
    comment: 'Technical user for MyApp Service'
    
  legacyapp:
    uid: 41002
    gid: 41002
    is_ad_user: false
    is_external_group: false
    home: /opt/legacy/home
```

## Task 2 – The Importance of Static IDs

Notice that we explicitly assign `uid: 45004` and `gid: 45004`. 

We maintain a registry of allocated ID ranges. When a new application needs a user, we pick the next available ID from the `45xxx` block. This prevents Ansible from simply running `useradd` and letting the OS assign the next available ID, which guarantees mismatch across servers built at different times.

## Task 3 – Handling Deprecated Users

A common issue occurs when an old application is decommissioned, or a user needs to be replaced. You can't just delete the user from your `unix_local_users.yml` file, because then Ansible won't know it needs to remove that user from existing servers.

If you try to reuse the UID for a *new* user while the old user still exists, Ansible will throw a duplicate key/UID error.

To solve this, we move the old user to a `deprecated_users` list:

```yaml
# vars/deprecated_users.yml
deprecated_users:
  - name: oldapp
    state: absent
    remove: yes # also removes the home directory
```

Our Ansible role first iterates through `deprecated_users`, ensuring they are removed, before it provisions the users in `local_users_app`. This prevents UID conflicts and keeps the servers clean.

## Task 4 – Creating the User with Ansible

The actual Ansible task within our `common_usersetup` role looks like this:

```yaml
- name: "Ensure local groups exist"
  ansible.builtin.group:
    name: "{{ item.key }}"
    gid: "{{ item.value.gid }}"
    state: present
  loop: "{{ local_users_app | dict2items }}"
  when: not item.value.is_external_group

- name: "Ensure local users exist"
  ansible.builtin.user:
    name: "{{ item.key }}"
    uid: "{{ item.value.uid }}"
    group: "{{ item.value.gid }}"
    home: "{{ item.value.home }}"
    comment: "{{ item.value.comment | default('') }}"
    shell: "/bin/bash"
    state: present
  loop: "{{ local_users_app | dict2items }}"
```

By separating the data (`unix_local_users.yml`) from the logic (the Ansible tasks), any systems engineer can request a new technical user via a simple Pull Request adding a few lines of YAML, without needing to understand the underlying automation code.

<!-- portfolio:expanded-v2 -->

## Architecture Diagram
![Managing Linux Technical Users: UIDs, GIDs, and Ansible execution diagram](/images/diagrams/post-framework/infrastructure-flow.svg)

This diagram supports **Managing Linux Technical Users: UIDs, GIDs, and Ansible** and highlights where controls, validation, and ownership boundaries sit in the workflow.

## Post-Specific Engineering Lens
For this post, the primary objective is: **Increase automation reliability and reduce human variance.**

### Implementation decisions for this case
- Chose a staged approach centered on **ansible** to avoid high-blast-radius rollouts.
- Used **linux** checkpoints to make regressions observable before full rollout.
- Treated **users** documentation as part of delivery, not a post-task artifact.

### Practical command path
These are representative execution checkpoints relevant to this post:

```bash
ansible-playbook site.yml --limit target --check --diff
ansible-playbook site.yml --limit target
ansible all -m ping -o
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
| Inventory scope error | Wrong hosts receive a valid but unintended change | Use explicit host limits and pre-flight host list confirmation |
| Role variable drift | Different environments behave inconsistently | Pin defaults and validate required vars in CI |
| Undocumented manual step | Automation appears successful but remains incomplete | Move manual steps into pre/post tasks with assertions |

## Recruiter-Readable Impact Summary
- **Scope:** deliver Linux platform changes with controlled blast radius.
- **Execution quality:** guarded by staged checks and explicit rollback triggers.
- **Outcome signal:** repeatable implementation that can be handed over without hidden steps.

