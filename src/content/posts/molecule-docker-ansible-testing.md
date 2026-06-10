---
title: "Testing Ansible Roles with Molecule and Docker"
description: "How to set up automated testing for Ansible roles using Molecule with Docker drivers, ensuring playbooks work before production deployment."
situation: "Ansible role changes were tested directly in production, causing outages when syntax errors or logic bugs slipped through. We had no automated testing pipeline."
issue: "No automated testing for Ansible roles, production deployments were the first test, and role regressions were discovered only after incidents."
solution: "Implemented Molecule with Docker for local role testing, integrated into CI pipeline to catch issues before merge."
usedIn: "Ansible automation at a German bank, testing 50+ roles across development and production environments."
impact: "Eliminated role-related production incidents, reduced development cycle time, and enabled confident refactoring of legacy roles."
pubDate: 2026-02-14
category: ["infrastructure", "automation"]
tags: ["ansible", "molecule", "docker", "testing", "ci"]
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

_(Note: Using `ubi-init` with cgroups and privileged mode allows systemd services to run inside the container, which is often necessary for Ansible role testing)._

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

<!-- portfolio:expanded-v2 -->

## Architecture Diagram

![Testing Ansible Roles Locally with Molecule and Docker execution diagram](/images/diagrams/post-framework/infrastructure-flow.svg)

This diagram supports **Testing Ansible Roles Locally with Molecule and Docker** and highlights where controls, validation, and ownership boundaries sit in the workflow.

## Post-Specific Engineering Lens

For this post, the primary objective is: **Increase automation reliability and reduce human variance.**

### Implementation decisions for this case

- Chose a staged approach centered on **ansible** to avoid high-blast-radius rollouts.
- Used **molecule** checkpoints to make regressions observable before full rollout.
- Treated **testing** documentation as part of delivery, not a post-task artifact.

### Practical command path

These are representative execution checkpoints relevant to this post:

```bash
ansible-playbook site.yml --limit target --check --diff
ansible-playbook site.yml --limit target
ansible all -m ping -o
```

## Validation Matrix

| Validation goal      | What to baseline                                              | What confirms success                                         |
| -------------------- | ------------------------------------------------------------- | ------------------------------------------------------------- |
| Functional stability | service availability, package state, SELinux/firewall posture | `systemctl --failed` stays empty                              |
| Operational safety   | rollback ownership + change window                            | `journalctl -p err -b` has no new regressions                 |
| Production readiness | monitoring visibility and handoff notes                       | critical endpoint checks pass from at least two network zones |

## Failure Modes and Mitigations

| Failure mode             | Why it appears in this type of work                  | Mitigation used in this post pattern                           |
| ------------------------ | ---------------------------------------------------- | -------------------------------------------------------------- |
| Inventory scope error    | Wrong hosts receive a valid but unintended change    | Use explicit host limits and pre-flight host list confirmation |
| Role variable drift      | Different environments behave inconsistently         | Pin defaults and validate required vars in CI                  |
| Undocumented manual step | Automation appears successful but remains incomplete | Move manual steps into pre/post tasks with assertions          |

## Recruiter-Readable Impact Summary

- **Scope:** deliver Linux platform changes with controlled blast radius.
- **Execution quality:** guarded by staged checks and explicit rollback triggers.
- **Outcome signal:** repeatable implementation that can be handed over without hidden steps.
