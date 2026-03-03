---
title: "Automating AD Computer Object Deletion on Linux Decommission"
description: "How to use Ansible and adcli to safely remove a Linux server's computer object from Active Directory during decommissioning."
situation: "During Ansible-driven lifecycle automation and controlled release windows, this case came from work related to \"Automating AD Computer Object Deletion on Linux Decommission.\""
issue: "Needed a repeatable way to use Ansible and adcli to safely remove a Linux server's computer object from Active Directory during decommissioning."
solution: "Implemented a practical runbook/automation pattern with clear safety checks, execution steps, and verification points."
usedIn: "Used in Ansible playbook pipelines for provisioning, patching, and decommissioning with audit requirements."
impact: "Reduced manual steps and change variance while improving deployment consistency."
pubDate: 2026-02-27
category: "automation"
tags: ["ansible", "active-directory", "decommission", "linux"]
draft: false
---

## Situation
When you decommission a Linux server that was integrated into an Active Directory (AD) domain, simply deleting the virtual machine is not enough. You leave behind a "ghost" computer object in AD. Over time, this clutters the directory, consumes licenses in identity management systems, and poses a minor security risk.

To achieve full end-to-end lifecycle automation, your decommissioning playbook should clean up AD. Here is how to do it using `adcli` via Ansible.

## Task 1 – The Concept

The `adcli` command-line tool is excellent for managing AD joins on Linux. While it's usually run on the server being joined, you can also run it from a centralized management node (or Ansible control node) to delete *other* computers from the domain, provided you have the right credentials.

## Task 2 – The Ansible Playbook

We use the `ansible.builtin.command` module to execute `adcli delete-computer`. 

Because we don't want to leave plaintext passwords in logs or process lists, we pass the password via standard input (`stdin`) and use the `--stdin-password` flag.

```yaml
- name: "Delete computer object from AD via management console"
  ansible.builtin.command: >-
    adcli delete-computer
    --domain={{ realmd_default_realm }}
    --login-user={{ realmd_join_user | quote }}
    --stdin-password
    {{ target_computer_name }}
  args:
    stdin: "{{ realmd_join_user_pass }}"
  delegate_to: localhost
  become: false # Run as the Ansible user on the control node
  register: __adcli_delete_output
  failed_when:
    - __adcli_delete_output.rc != 0
    - '"Couldn''t find" not in __adcli_delete_output.stderr' # Ignore if already deleted
  changed_when: __adcli_delete_output.rc == 0
```

## Why This Implementation is Robust

1.  **`delegate_to: localhost`**: You don't run this command on the server being decommissioned (which might already be offline or inaccessible). You run it from the Ansible control node.
2.  **`--stdin-password`**: This is a critical security practice. It prevents the AD join password (`realmd_join_user_pass`) from being captured if someone runs `ps aux` while the command is executing.
3.  **Idempotency / Graceful Failure (`failed_when`)**: If the playbook is run twice, or if a sysadmin already manually deleted the object, `adcli` will return a non-zero exit code because it can't find the computer. We intercept this error: if the `stderr` complains that it `"Couldn't find"` the object, we treat the task as successful, because the desired state (object is gone) is achieved.

<!-- portfolio:expanded-v2 -->

## Architecture Diagram
![Automating AD Computer Object Deletion on Linux Decommission execution diagram](/images/diagrams/post-framework/automation-loop.svg)

This diagram supports **Automating AD Computer Object Deletion on Linux Decommission** and highlights where controls, validation, and ownership boundaries sit in the workflow.

## Post-Specific Engineering Lens
For this post, the primary objective is: **Increase automation reliability and reduce human variance.**

### Implementation decisions for this case
- Chose a staged approach centered on **ansible** to avoid high-blast-radius rollouts.
- Used **active-directory** checkpoints to make regressions observable before full rollout.
- Treated **decommission** documentation as part of delivery, not a post-task artifact.

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
| Functional stability | manual steps, execution time, and failure retry count | `ansible-playbook --check --diff` highlights only intended drift |
| Operational safety | rollback ownership + change window | idempotency run returns `changed=0` for stable hosts |
| Production readiness | monitoring visibility and handoff notes | rollback playbook is executable without ad-hoc edits |

## Failure Modes and Mitigations
| Failure mode | Why it appears in this type of work | Mitigation used in this post pattern |
|---|---|---|
| Inventory scope error | Wrong hosts receive a valid but unintended change | Use explicit host limits and pre-flight host list confirmation |
| Role variable drift | Different environments behave inconsistently | Pin defaults and validate required vars in CI |
| Undocumented manual step | Automation appears successful but remains incomplete | Move manual steps into pre/post tasks with assertions |

## Recruiter-Readable Impact Summary
- **Scope:** convert manual runbooks into deterministic automation.
- **Execution quality:** guarded by staged checks and explicit rollback triggers.
- **Outcome signal:** repeatable implementation that can be handed over without hidden steps.

