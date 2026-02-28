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

<!-- portfolio:expanded-v1 -->

## Architecture Diagram
![Building Custom Ansible Execution Environments supporting diagram](/images/diagrams/post-framework/infrastructure-flow.svg)

This visual summarizes the implementation flow and control points for **Building Custom Ansible Execution Environments**.

## Deep Dive
This case is strongest when explained as an execution narrative instead of only a command sequence. The core focus here is **platform reliability, lifecycle controls, and repeatable Linux delivery**, with decisions made to keep implementation repeatable under production constraints.

### Design choices
- Preferred deterministic configuration over one-off remediation to reduce variance between environments.
- Treated **ansible** and **containers** as the main risk vectors during implementation.
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

