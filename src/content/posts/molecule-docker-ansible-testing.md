---
title: "Testing Ansible Roles Locally with Molecule and Docker"
description: "A quick start guide to initialize and use Molecule with the Docker driver to test your Ansible roles before deploying."
situation: "During enterprise Linux and virtualization operations across multi-team environments, this case came from work related to \"Testing Ansible Roles Locally with Molecule and Docker.\""
issue: "Needed a repeatable way to initialize and use Molecule with the Docker driver to test your Ansible roles before deploying."
solution: "Implemented a practical runbook/automation pattern with clear safety checks, execution steps, and verification points."
usedIn: "Used in Linux platform engineering, middleware operations, and datacenter modernization projects in regulated environments."
impact: "Improved repeatability, reduced incident risk, and made operational handoffs clearer across teams."
pubDate: 2026-02-08
category: "infrastructure"
tags: ["ansible", "molecule", "testing", "docker"]
draft: false
---

## Situation
Pushing Ansible role changes directly to a development environment can be slow and risky. Molecule provides a framework for testing Ansible roles locally, spinning up temporary instances (like Docker containers), running your role, and verifying the state.

## Task 1 – Installation and Initialization

First, ensure you have Ansible and Molecule installed in your Python virtual environment.

```bash
# Set up a virtual environment
python3 -m venv .venv
source .venv/bin/activate

# Install requirements
pip install ansible-core molecule molecule-docker
```

Navigate to your role's directory and initialize a new Molecule scenario using the Docker driver:

```bash
cd my_custom_role/
molecule init scenario --driver-name docker
```
This creates a `molecule/default/` directory containing `molecule.yml` and `converge.yml`.

## Task 2 – Configuring the Scenario

Edit `molecule/default/molecule.yml` to define your testing platforms. For example, testing against a RHEL 9 container:

```yaml
---
dependency:
  name: galaxy
driver:
  name: docker
platforms:
  - name: rhel9-test
    image: registry.access.redhat.com/ubi9/ubi-init
    command: /sbin/init
    tmpfs:
      - /run
      - /tmp
    volumes:
      - /sys/fs/cgroup:/sys/fs/cgroup:rw
    cgroupns_mode: host
    privileged: true
    pre_build_image: true
provisioner:
  name: ansible
verifier:
  name: ansible
```
*(Note: Using `ubi-init` with cgroups and privileged mode allows systemd services to run inside the container, which is often necessary for Ansible role testing).*

## Task 3 – The Molecule Workflow

Molecule provides several commands to manage the lifecycle of your test instances:

**1. Create the instance:**
Spins up the Docker container based on your `molecule.yml`.
```bash
molecule create
```

**2. List running instances:**
Check the status of your test environments.
```bash
molecule list
```

**3. Run the role (Converge):**
Executes `converge.yml` against the running container, applying your Ansible role.
```bash
molecule converge
```

**4. Debugging:**
If something fails, you can drop into a shell inside the test container.
```bash
molecule login --host rhel9-test
```

**5. Clean up:**
Destroys the Docker container and cleans up temporary files.
```bash
molecule destroy
```

Alternatively, you can run the entire test suite (linting, creating, converging, verifying, destroying) with a single command:
```bash
molecule test
```

<!-- portfolio:expanded-v1 -->

## Architecture Diagram
![Testing Ansible Roles Locally with Molecule and Docker supporting diagram](/images/diagrams/post-framework/infrastructure-flow.svg)

This visual summarizes the implementation flow and control points for **Testing Ansible Roles Locally with Molecule and Docker**.

## Deep Dive
This case is strongest when explained as an execution narrative instead of only a command sequence. The core focus here is **platform reliability, lifecycle controls, and repeatable Linux delivery**, with decisions made to keep implementation repeatable under production constraints.

### Design choices
- Preferred deterministic configuration over one-off remediation to reduce variance between environments.
- Treated **ansible** and **molecule** as the main risk vectors during implementation.
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

