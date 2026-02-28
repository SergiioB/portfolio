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

<!-- portfolio:expanded-v1 -->

## Architecture Diagram
![Automating AD Computer Object Deletion on Linux Decommission supporting diagram](/images/diagrams/post-framework/automation-loop.svg)

This visual summarizes the implementation flow and control points for **Automating AD Computer Object Deletion on Linux Decommission**.

## Deep Dive
This case is strongest when explained as an execution narrative instead of only a command sequence. The core focus here is **repeatability, failure isolation, and lower manual intervention**, with decisions made to keep implementation repeatable under production constraints.

### Design choices
- Preferred deterministic configuration over one-off remediation to reduce variance between environments.
- Treated **ansible** and **active-directory** as the main risk vectors during implementation.
- Kept rollback behavior explicit so operational ownership can be transferred safely across teams.

### Operational sequence
1. Define deterministic inputs.
2. Execute automation with guardrails.
3. Collect outputs and drift signals.
4. Iterate runbook from telemetry.

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

