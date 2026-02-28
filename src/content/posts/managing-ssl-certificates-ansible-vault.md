---
title: "Securely Managing SSL Certificates in Ansible Repositories"
description: "Best practices for handling sensitive TLS/SSL certificates (.cer and .key files) using Ansible Vault to prevent accidental exposure."
situation: "During enterprise Linux and virtualization operations across multi-team environments, this case came from work related to \"Securely Managing SSL Certificates in Ansible Repositories.\""
issue: "Needed a repeatable way to apply best practices for handling sensitive TLS/SSL certificates (.cer and .key files) using Ansible Vault to prevent accidental exposure."
solution: "Implemented a practical runbook/automation pattern with clear safety checks, execution steps, and verification points."
usedIn: "Used in Linux platform engineering, middleware operations, and datacenter modernization projects in regulated environments."
impact: "Improved repeatability, reduced incident risk, and made operational handoffs clearer across teams."
pubDate: 2026-02-12
category: "infrastructure"
tags: ["ansible", "security", "ssl", "encryption"]
draft: false
---

## Situation
When automating the deployment of web servers (like Apache or Nginx), you must deploy TLS/SSL certificates to enable HTTPS. A common mistake is committing plain text private keys (`.key` files) or even the public certificates (`.cer` or `.crt`) directly into the Git repository. 

Even if the repository is private, storing unencrypted secrets is a severe security violation. Anyone with read access to the code can impersonate your servers. Here is how we securely manage certificates using **Ansible Vault**.

## Task 1 – Generating the Certificate

Usually, you generate a Certificate Signing Request (CSR) and a private key on a secure management server. 

```bash
# Generate the private key and CSR
openssl req -new -newkey rsa:2048 -nodes 
  -keyout host-example-01.key 
  -out host-example-01.csr 
  -subj "/C=XX/ST=ExampleState/L=ExampleCity/O=ExampleOrg/CN=app.example.internal" 
  -addext "subjectAltName = DNS:app.example.internal, DNS:host-example-01.example.internal"
```

You send the `.csr` to your Certificate Authority (CA) and receive the signed `.cer` file back.

## Task 2 – Encrypting with Ansible Vault

Before moving `host-example-01.key` (and optionally the `.cer` file) into your Ansible `files/` directory, you must encrypt them. Ansible Vault allows you to encrypt arbitrary files, not just YAML variables.

```bash
# Encrypt the private key file
ansible-vault encrypt files/host-example-01/host-example-01.key 
  --vault-password-file ~/.secrets/ansible-vault/infrastructure-password
```

The file is now AES-256 encrypted. If you run `cat files/host-example-01/host-example-01.key`, you will only see the cipher text starting with `$ANSIBLE_VAULT;1.1;AES256`. 

It is now perfectly safe to run `git add` and `git commit` on this file.

## Task 3 – Deploying the Encrypted Files

The beauty of Ansible Vault is that it is completely transparent to standard Ansible modules. You do not need to decrypt the file locally before deploying it.

You write a standard `copy` task in your playbook:

```yaml
- name: Deploy SSL Private Key
  ansible.builtin.copy:
    src: "files/{{ inventory_hostname }}/{{ inventory_hostname }}.key"
    dest: "/etc/pki/tls/private/{{ inventory_hostname }}.key"
    owner: root
    group: root
    mode: '0400'
```

When you execute the playbook, you provide the vault password:

```bash
ansible-playbook -i inventory/prod deploy_web.yml --vault-password-file ~/.secrets/ansible-vault/infrastructure-password
```

Ansible seamlessly decrypts the file in memory during execution, transfers the plain text over the secure SSH connection, and writes the decrypted key to the destination server. 

## Best Practices

*   **Encrypt both .key and .cer:** While only the private key is strictly secret, encrypting the certificate prevents malicious actors from analyzing your SANs (Subject Alternative Names) or knowing exactly which CA you use.
*   **Vault IDs:** Use multiple vault passwords (e.g., one for Dev, one for Prod) using the `--encrypt-vault-id` flag, so developers can't decrypt production certificates.
*   **Never track passwords in Git:** Your `--vault-password-file` should reside outside the repository (e.g., in `~/.secrets/`) or be provided by a CI/CD secrets manager at runtime.

<!-- portfolio:expanded-v2 -->

## Architecture Diagram
![Securely Managing SSL Certificates in Ansible Repositories execution diagram](/portfolio/images/diagrams/post-framework/infrastructure-flow.svg)

This diagram supports **Securely Managing SSL Certificates in Ansible Repositories** and highlights where controls, validation, and ownership boundaries sit in the workflow.

## Post-Specific Engineering Lens
For this post, the primary objective is: **Increase automation reliability and reduce human variance.**

### Implementation decisions for this case
- Chose a staged approach centered on **ansible** to avoid high-blast-radius rollouts.
- Used **security** checkpoints to make regressions observable before full rollout.
- Treated **ssl** documentation as part of delivery, not a post-task artifact.

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

