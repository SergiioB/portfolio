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

<!-- portfolio:expanded-v1 -->

## Architecture Diagram
![Securely Managing SSL Certificates in Ansible Repositories supporting diagram](/images/diagrams/post-framework/infrastructure-flow.svg)

This visual summarizes the implementation flow and control points for **Securely Managing SSL Certificates in Ansible Repositories**.

## Deep Dive
This case is strongest when explained as an execution narrative instead of only a command sequence. The core focus here is **platform reliability, lifecycle controls, and repeatable Linux delivery**, with decisions made to keep implementation repeatable under production constraints.

### Design choices
- Preferred deterministic configuration over one-off remediation to reduce variance between environments.
- Treated **ansible** and **security** as the main risk vectors during implementation.
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

