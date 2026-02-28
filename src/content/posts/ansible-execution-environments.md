---
title: "Building Custom Ansible Execution Environments"
description: "How to package Ansible dependencies into a portable, containerized Execution Environment (EE) for consistent automation across runners."
situation: "During enterprise Linux and virtualization operations across multi-team environments, this case came from work related to \"Building Custom Ansible Execution Environments.\""
issue: "Needed a repeatable way to package Ansible dependencies into a portable, containerized Execution Environment (EE) for consistent automation across runners."
solution: "Implemented a practical runbook/automation pattern with clear safety checks, execution steps, and verification points."
usedIn: "Used in Linux platform engineering, middleware operations, and datacenter modernization projects in regulated environments."
impact: "Improved repeatability, reduced incident risk, and made operational handoffs clearer across teams."
pubDate: 2026-02-24
category: "infrastructure"
tags: ["ansible", "containers", "devops", "automation"]
draft: false
---

## Situation
As Ansible projects grow, managing dependencies (Python libraries, Ansible collections, system binaries) on every developer's machine and every CI/CD runner becomes a nightmare. "It works on my machine" is a common phrase when a playbook fails because a specific version of the `community.general` collection is missing.

The solution is **Ansible Execution Environments (EE)**: container images that bundle everything needed to run your playbooks.

## Task 1 – The Anatomy of an EE

An Execution Environment is a standard Docker/Podman image that contains:
1.  **RHEL/UBI Base**: A stable base OS.
2.  **Ansible Core**: The engine itself.
3.  **Python Dependencies**: Libraries like `netaddr`, `requests`, or `pyvmomi`.
4.  **Ansible Collections**: Modules for specific platforms (e.g., `community.vmware`, `ansible.posix`).

## Task 2 – The Build Process

We automate our EE builds using a simple `build.sh` script that wraps the `ansible-builder` tool.

### 1. Define your requirements

We maintain a `requirements.txt` for Python and a `requirements.yml` for Ansible collections.

```yaml
# requirements.yml
collections:
  - name: community.vmware
  - name: ansible.posix
  - name: community.general
```

### 2. The Build Script

The build script ensures we are using the correct tags and handling the container registry login.

```bash
#!/bin/bash

IMAGE_NAME="ansible-ee-custom"
TAG=$(date +%Y-%m-%d)

echo "Building Ansible Execution Environment: ${IMAGE_NAME}:${TAG}"

# Run the build using ansible-builder or podman/docker directly
podman build -t "${IMAGE_NAME}:${TAG}" .

# Tag as latest for local development
podman tag "${IMAGE_NAME}:${TAG}" "${IMAGE_NAME}:latest"
```

## Task 3 – Using the EE in StackGuardian

Once the image is built and pushed to our private registry, we configure our automation platforms (like **StackGuardian**) to use it.

In StackGuardian, you define the "Runner Image" for your workflow. Instead of using a generic image, you point it to:
`registry.example.internal/automation/ansible-ee-custom:latest`

Now, whenever a workflow runs, it spins up a container that has the **exact** same environment as the one you tested locally.

## Why This Matters

*   **Consistency**: Every run is identical, regardless of which physical node StackGuardian chooses to run the container on.
*   **Portability**: New team members don't need to spend hours installing Python libraries. They just need Podman and the image.
*   **Speed**: By using caching layers in our container build, we can add a single new collection and rebuild the image in seconds.

Execution Environments represent the shift of Ansible from a "scripting tool" to a true **Infrastructure as Code** platform that follows modern software engineering principles.

<!-- portfolio:expanded-v2 -->

## Architecture Diagram
![Building Custom Ansible Execution Environments execution diagram](/portfolio/images/diagrams/post-framework/infrastructure-flow.svg)

This diagram supports **Building Custom Ansible Execution Environments** and highlights where controls, validation, and ownership boundaries sit in the workflow.

## Post-Specific Engineering Lens
For this post, the primary objective is: **Increase automation reliability and reduce human variance.**

### Implementation decisions for this case
- Chose a staged approach centered on **ansible** to avoid high-blast-radius rollouts.
- Used **containers** checkpoints to make regressions observable before full rollout.
- Treated **devops** documentation as part of delivery, not a post-task artifact.

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

