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

<!-- portfolio:expanded-v1 -->

## Architecture Diagram
![Managing Linux Technical Users: UIDs, GIDs, and Ansible supporting diagram](/images/diagrams/post-framework/infrastructure-flow.svg)

This visual summarizes the implementation flow and control points for **Managing Linux Technical Users: UIDs, GIDs, and Ansible**.

## Deep Dive
This case is strongest when explained as an execution narrative instead of only a command sequence. The core focus here is **platform reliability, lifecycle controls, and repeatable Linux delivery**, with decisions made to keep implementation repeatable under production constraints.

### Design choices
- Preferred deterministic configuration over one-off remediation to reduce variance between environments.
- Treated **ansible** and **linux** as the main risk vectors during implementation.
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

