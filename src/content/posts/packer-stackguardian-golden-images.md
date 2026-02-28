---
title: "Automating Golden Images with Packer and StackGuardian"
description: "A workflow for building CIS-hardened RHEL images using HashiCorp Packer and orchestrating the builds via StackGuardian."
situation: "During enterprise Linux and virtualization operations across multi-team environments, this case came from work related to \"Automating Golden Images with Packer and StackGuardian.\""
issue: "Needed a repeatable way to build CIS-hardened RHEL images using HashiCorp Packer and orchestrate the builds via StackGuardian."
solution: "Implemented a practical runbook/automation pattern with clear safety checks, execution steps, and verification points."
usedIn: "Used in Linux platform engineering, middleware operations, and datacenter modernization projects in regulated environments."
impact: "Improved repeatability, reduced incident risk, and made operational handoffs clearer across teams."
pubDate: 2026-02-06
category: "infrastructure"
tags: ["packer", "stackguardian", "devops", "rhel", "automation"]
draft: false
---

## Situation
Maintaining a consistent "Golden Image" is the cornerstone of a stable infrastructure. A Golden Image is a pre-configured template that includes security hardening (like CIS benchmarks), standard monitoring agents, and corporate configurations. 

Instead of building these manually, we use **HashiCorp Packer** for the build logic and **StackGuardian** for the orchestration and lifecycle management.

## The Build Hierarchy: Base vs. Common

We split our image builds into two distinct phases to optimize build times and maintainability.

### 1. The Base Image
The Base Image is built from the raw ISO using the `vsphere-iso` Packer plugin. It handles:
*   The **Kickstart** automated installation.
*   Basic disk partitioning (LVM).
*   Initial package updates.
*   We rarely deploy this image directly; it serves as the parent for all others.

### 2. The Common Image
The Common Image is built by cloning the Base Image using the `vsphere-clone` plugin. This is the image used for 90% of our server fleet. It includes:
*   **CIS Hardening**: Applying security policies to the OS.
*   **Agents**: Installing Nessus, Checkmk, and UC4 agents.
*   **Corporate Config**: SSSD, realmd, and internal certificates.

## Orchestration with StackGuardian

StackGuardian acts as our CI/CD runner for these images. It provides a UI for triggering builds and manages the sensitive environment variables (like vCenter credentials) in a secure vault.

### The Workflow:
1.  **Code Check-in**: Packer HCL code and Ansible hardening roles are stored in Azure DevOps.
2.  **StackGuardian Deployment**: A workflow is defined in StackGuardian that points to the repository.
3.  **Provisioning**: StackGuardian spins up a containerized runner, initializes Packer, and executes the build.
4.  **Verification**: After the build, the runner can execute a test playbook to ensure the image meets all requirements before marking it as "Stable" in the vCenter gallery.

## Key Packer Snippet (HCL)

Here is a simplified look at how we define the `vsphere-clone` source:

```hcl
source "vsphere-clone" "rhel-common" {
  template             = "rhel9-base-template-YYYY-MM"
  vm_name              = "rhel9-common-${local.timestamp}"
  cluster              = "CLUSTER_EXAMPLE_A"
  datacenter           = "DC_EXAMPLE_A"
  folder               = "templates/"
  
  # Connect to vCenter using credentials from the StackGuardian Vault
  username             = var.vcenter_user
  password             = var.vcenter_pass
  
  # Resource allocation
  cpus                 = 2
  ram                  = 4096
  disk_size            = 51200
}
```

## Benefits of this Approach

*   **Reproducibility**: If a server is compromised or misconfigured, we can simply redeploy from the latest verified Golden Image.
*   **Security**: By embedding CIS hardening into the template, every new server is secure by default from the moment it boots.
*   **Automation**: New images are automatically rebuilt monthly after the release of new Red Hat Security Advisories (RHSAs), ensuring our templates are never more than 30 days out of date.

<!-- portfolio:expanded-v2 -->

## Architecture Diagram
![Automating Golden Images with Packer and StackGuardian execution diagram](/images/diagrams/post-framework/infrastructure-flow.svg)

This diagram supports **Automating Golden Images with Packer and StackGuardian** and highlights where controls, validation, and ownership boundaries sit in the workflow.

## Post-Specific Engineering Lens
For this post, the primary objective is: **Apply infrastructure practices with measurable validation and clear rollback ownership.**

### Implementation decisions for this case
- Chose a staged approach centered on **packer** to avoid high-blast-radius rollouts.
- Used **stackguardian** checkpoints to make regressions observable before full rollout.
- Treated **devops** documentation as part of delivery, not a post-task artifact.

### Practical command path
These are representative execution checkpoints relevant to this post:

```bash
echo "define baseline"
echo "apply change with controls"
echo "validate result and handoff"
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
| Scope ambiguity | Teams execute different interpretations | Write explicit pre-check and success criteria |
| Weak rollback plan | Incident recovery slows down | Define rollback trigger + owner before rollout |
| Insufficient telemetry | Failures surface too late | Require post-change monitoring checkpoints |

## Recruiter-Readable Impact Summary
- **Scope:** deliver Linux platform changes with controlled blast radius.
- **Execution quality:** guarded by staged checks and explicit rollback triggers.
- **Outcome signal:** repeatable implementation that can be handed over without hidden steps.

