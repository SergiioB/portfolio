---
title: "Infrastructure as Code: Structuring Ansible Repositories"
description: "Best practices for organizing your Ansible inventory, group_vars, and host_vars to cleanly separate development and production environments."
situation: "Our Ansible repository had grown to 200+ playbooks with inconsistent variable naming, making it unclear which variables applied to which environments. A developer accidentally ran a production playbook against dev hosts."
usedIn: "Enterprise Linux platform at a German bank, supporting 200+ servers across dev, test, and prod environments."
impact: "Eliminated cross-environment accidents, reduced onboarding time for new engineers, and made variable debugging straightforward."
pubDate: 2026-01-20
category: ["infrastructure", "automation"]
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
4.  **`inventory/<env>/host_vars/<hostname>.yml`**: Variables specific to a _single_ machine. **These win against all group variables.**

This architecture reduces human error, makes the repository easier to navigate, and ensures that your infrastructure is truly defined by data (`hosts.yml`) rather than complex manual groupings.

