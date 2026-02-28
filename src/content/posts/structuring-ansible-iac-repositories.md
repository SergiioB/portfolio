---
title: "Infrastructure as Code: Structuring Ansible Repositories"
description: "Best practices for organizing your Ansible inventory, group_vars, and host_vars to cleanly separate development and production environments."
situation: "During enterprise Linux and virtualization operations across multi-team environments, this case came from work related to \"Infrastructure as Code: Structuring Ansible Repositories.\""
issue: "Needed a repeatable way to apply best practices for organizing your Ansible inventory, group_vars, and host_vars to cleanly separate development and production environments."
solution: "Implemented a practical runbook/automation pattern with clear safety checks, execution steps, and verification points."
usedIn: "Used in Linux platform engineering, middleware operations, and datacenter modernization projects in regulated environments."
impact: "Improved repeatability, reduced incident risk, and made operational handoffs clearer across teams."
pubDate: 2026-01-20
category: "infrastructure"
tags: ["ansible", "iac", "devops", "architecture"]
draft: false
---

## Situation
As your Ansible automation scales from a few scripts to manage hundreds of servers, a flat repository structure quickly becomes unmanageable. Hardcoded variables leak between environments, and it becomes difficult to determine exactly what configuration applies to a specific server.

To solve this, you need a strict directory structure that isolates environments (Development vs. Production) and hierarchical variable definitions.

## Task 1 – The Ideal Directory Structure

Here is a mature `refactor-ansible-structure` designed for clarity and safety:

```text
├── ansible.cfg                 # Main Ansible configuration
├── inventory/                  # Root directory for all inventories
│   ├── production/             # PRODUCTION ENVIRONMENT
│   │   ├── group_vars/         # Variables for prod groups
│   │   ├── host_vars/          # Variables for specific prod hosts
│   │   ├── hosts.yml           # Prod data file (Hosts & attributes)
│   │   └── inventory.config    # Rule file (How groups are created)
│   └── development/            # DEVELOPMENT ENVIRONMENT
│       ├── group_vars/         # Variables for dev groups
│       ├── host_vars/          # Variables for specific dev hosts
│       ├── hosts.yml           # Dev data file (Hosts & attributes)
│       └── inventory.config    # Rule file (How groups are created)
├── playbooks/                  # Operational tasks (patching, reboots)
├── roles/                      # Reusable logic (software installation)
├── files/                      # Static files copied as-is (certs, scripts)
├── templates/                  # Dynamic Jinja2 templates (configs)
└── site.yml                    # Master playbook orchestrating roles
```

## Task 2 – The Benefits of Separation

### 1. Environment Isolation
By completely separating `inventory/production/` and `inventory/development/`, a development variable cannot accidentally bleed into a production deployment. 

If you run `ansible-playbook -i inventory/development/ ...`, Ansible **only** loads variables from the `development/group_vars` and `development/host_vars` directories. This is critical for Secret Distribution—your dev database password is never loaded into memory during a prod run.

### 2. The constructed plugin (Dynamic Grouping)
Notice the `inventory.config` file. Instead of manually maintaining complex group lists, we use Ansible's native `constructed` inventory plugin.

The `hosts.yml` file acts as the single source of truth, simply listing servers and their attributes:
```yaml
host-example-01:
  env: dev
  role: app_tomcat
  zone: dmz
```

The `inventory.config` file contains rules that automatically generate groups based on those attributes. For example, it looks for the key `role` and creates a group named `app_tomcat`. 

### 3. Variable Precedence
Ansible merges variables in a specific order of precedence. We structure our variables to take advantage of this:

1.  **`roles/defaults/main.yml`**: The absolute baseline. Sane defaults that apply if nothing else is defined.
2.  **`inventory/<env>/group_vars/all.yml`**: Base variables for the entire environment (e.g., the corporate DNS servers).
3.  **`inventory/<env>/group_vars/<group_name>.yml`**: Variables specific to a group of servers (e.g., `app_tomcat.yml` defines the JVM heap size for all tomcat servers). These override `all.yml`.
4.  **`inventory/<env>/host_vars/<hostname>.yml`**: Variables specific to a *single* machine. **These win against all group variables.**

This architecture reduces human error, makes the repository easier to navigate, and ensures that your infrastructure is truly defined by data (`hosts.yml`) rather than complex manual groupings.

<!-- portfolio:expanded-v1 -->

## Architecture Diagram
![Infrastructure as Code: Structuring Ansible Repositories supporting diagram](/images/diagrams/post-framework/infrastructure-flow.svg)

This visual summarizes the implementation flow and control points for **Infrastructure as Code: Structuring Ansible Repositories**.

## Deep Dive
This case is strongest when explained as an execution narrative instead of only a command sequence. The core focus here is **platform reliability, lifecycle controls, and repeatable Linux delivery**, with decisions made to keep implementation repeatable under production constraints.

### Design choices
- Preferred deterministic configuration over one-off remediation to reduce variance between environments.
- Treated **ansible** and **iac** as the main risk vectors during implementation.
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

