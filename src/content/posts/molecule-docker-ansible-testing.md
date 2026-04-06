---
title: "Testing Ansible Roles with Molecule and Docker"
description: "How to set up automated testing for Ansible roles using Molecule with Docker drivers, ensuring playbooks work before production deployment."
situation: "Ansible role changes were tested directly in production, causing outages when syntax errors or logic bugs slipped through. We had no automated testing pipeline."
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

