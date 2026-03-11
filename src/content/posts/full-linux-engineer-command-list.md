---
title: "The Comprehensive Linux Engineer Command List"
description: "A master reference merging daily Linux operations, Ansible Vault secrets, Python environments, Molecule testing, and Git recovery commands into a single, massive cheatsheet."
situation: "I had multiple separate snippets and reference sheets across different posts for Linux sysadmin tasks and automation workflows. It became tedious to jump between pages when solving complex incidents."
issue: "Scattered knowledge means slower response times during critical operations. Having Linux commands on one page and Ansible/Python commands on another breaks the operational flow."
solution: "Compiled every sanitized, production-tested command snippet from my daily workflow into a single, massive reference guide with a unified architecture diagram."
usedIn: "Daily operations across RHEL-like systems, automation repositories, and general troubleshooting."
impact: "Created the ultimate single-pane-of-glass reference for system and automation engineers, reducing search time and typos during live deployments."
pubDate: 2026-03-11
category: ["snippets", "infrastructure", "automation"]
tags: ["linux", "ansible", "python", "git", "vim", "cheatsheet", "devops"]
draft: false
---

## Situation

This document is the ultimate compilation of my daily operational commands. It merges the traditional Linux sysadmin tasks (like LVM resizing, user management, package checking, and PostgreSQL filesystem fixes) with the modern infrastructure-as-code tasks (like Ansible Vault, Python environments, Molecule testing, and repeated Ansible playbook execution patterns).

I also reviewed a separate notebook export of daily notes and folded in the command patterns that actually show up in live work: repeated `ansible-playbook` runs, PostgreSQL archive settings, SELinux relabeling, `getent passwd` verification, and silent installer execution patterns, all rewritten with fictional paths and data.

Every command listed here is sanitized using generic placeholders (`target-host`, `svc_user`, `vg_main`, etc.) so it is safe to publish and share publicly.

## Visual poster set

Instead of forcing everything into one unreadable image, I split the command set into three large posters that work better for previews, carousels, and sharing.

### 1. Storage and access

![Linux Engineer Command List — Storage and Access](/images/diagrams/new/full-linux-engineer-storage.svg)

[Open the storage and access SVG poster](/images/diagrams/new/full-linux-engineer-storage.svg)

### 2. Python and Ansible automation

![Linux Engineer Command List — Python and Ansible](/images/diagrams/new/full-linux-engineer-automation.svg)

[Open the Python and Ansible SVG poster](/images/diagrams/new/full-linux-engineer-automation.svg)

### 3. Testing, Git, and utilities

![Linux Engineer Command List — Testing, Git, and Utilities](/images/diagrams/new/full-linux-engineer-delivery.svg)

[Open the testing, Git, and utilities SVG poster](/images/diagrams/new/full-linux-engineer-delivery.svg)

## 1. Storage & Filesystem Management

Before touching partitions, get visibility into where the space is going.

```bash
# Check space usage sorted by size
du -sh /srv/app/* | sort -h

# Check mounted filesystems, sorted by usage
(df -h | head -n1 && df -h | tail -n +2 | sort -hr -k5)

# Inspect block devices
lsblk -o NAME,SIZE,FSTYPE,TYPE,MOUNTPOINTS
```

### Expanding LVM (No Reboot)

When the underlying hypervisor disk is expanded, use this sequence to grow the filesystem.

```bash
echo 1 > /sys/class/block/sdb/device/rescan
fdisk /dev/sda  # OR cfdisk /dev/sda
partprobe /dev/sda
pvresize /dev/sda3
vgs vg_main
lvextend -r -l +100%FREE /dev/vg_main/lv_root
```

### Shrinking ext4 LVM (Carefully)

Shrinking requires strict ordering: filesystem first, logical volume second.

```bash
umount /apps
e2fsck -f /dev/vg_app/lv_apps
resize2fs /dev/vg_app/lv_apps 9.5G
lvreduce -L 10G /dev/vg_app/lv_apps
mount /dev/vg_app/lv_apps /apps
resize2fs /dev/vg_app/lv_apps
df -h /apps
```

## 2. Accounts, Permissions & Audit

Managing service accounts, tracking expirations, and checking privileges.

```bash
# Check account existence and password aging
id svc_user && chage -l svc_user

# Force immediate password expiry
chage -d "$(date +%F)" svc_user

# Configure strict password policy
chage -m 7 -M 99999 -I -1 -E -1 svc_user

# Distribute SSH keys
ssh-copy-id ops_user@target-host

# Check user directories and sudo access
find / -maxdepth 2 -type d \( -user svc_user -o -group svc_user \) -ls 2>/dev/null
sudo -l -U svc_user | grep -v "not allowed"
```

## 3. Python Virtual Environments

Always isolate Python dependencies when bootstrapping a repository.

```bash
python3.12 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
pip install -r requirements.txt
```

### Quick Local Web Server

Share files locally on a trusted network segment.

```bash
python3.12 -m http.server 8080
```

## 4. Ansible Automation & Secrets

Managing collections, roles, encrypting sensitive data securely, and repeatedly running standard provisioning playbooks.

### Common playbook execution patterns

These came up repeatedly in the notebook because they are the commands that get reused during delivery windows and follow-up fixes.

```bash
ansible-playbook -i inventory/lab/ playbooks/platform-bootstrap.yml --limit='target-host' -t app_db_client

ansible-playbook -i inventory/stage/ playbooks/platform-bootstrap.yml --limit='target-host' -t common_usersetup,common_filesystems,common_rhel,common_security,common_customization

ansible-playbook -i inventory/stage/ playbooks/app_postgresql_prereqs.yml --limit='target-host'
```

### Installing Dependencies

```bash
ansible-galaxy install -r requirements.yml
ansible-galaxy install -r roles/platform_role/collections/requirements.yml
pip install -r collections/ansible_collections/community/general/requirements.yml
```

### Ansible Vault Workflows

```bash
# Encrypt from stdin
ansible-vault encrypt_string --stdin-name 'service_secret'

# Encrypt / Decrypt files
ansible-vault encrypt files/target-host/tls.key --vault-password-file ~/.secure/vault/platform.pass
ansible-vault decrypt files/target-host/tls.crt --vault-password-file ~/.secure/vault/platform.pass

# Ad-hoc variable debug
ansible localhost -m debug -a "var=vault_secret_name" -e "@inventory/lab/group_vars/all/secret_vars.yml" --ask-vault-pass
```

### Delta-Based Linting

Lint only the YAML files that have changed in your current branch.

```bash
git diff --name-only main HEAD | grep -E '\.(yml|yaml)$' | xargs -r ansible-lint
```

## 5. PostgreSQL and SELinux operational fixes

These notebook commands are exactly the kind of small but critical fixes that appear during storage, archive, or policy troubleshooting.

```bash
vim /data/postgres/main/pg_hba.conf
sudo vi /data/postgres/main/postgresql.conf

archive_command = 'test -f /data/postgres/archive/%f || cp %p /data/postgres/archive/%f'

semanage fcontext -a -t postgresql_db_t "/data/postgres/archive(/.*)?"
restorecon -Rv /data/postgres/archive
```

Useful validation follow-up:

```bash
getent passwd svc_user
```

## 6. Molecule Testing Loop

The standard cycle for testing Ansible roles locally.

```bash
molecule list
molecule destroy -s default
molecule create -s default
molecule converge -s default && molecule login -s default
```

## 7. Git Recovery Sequence

A safe, controlled way to pull upstream changes while protecting in-flight local work.

```bash
git stash
git checkout main && git pull
git checkout feature-branch
git merge main
git stash pop
```

## 8. Certificates, installers, and quick editor fixes

Generating an unencrypted key and a Certificate Signing Request with SANs is still a daily pattern, but the notebook also surfaced silent installer execution as another recurring operational task.

```bash
/opt/software-depot/setup.sh -silent -responsefile /opt/software-depot/response.properties -skiposlevelcheck
```

Generating an unencrypted key and a Certificate Signing Request with SANs.

```bash
openssl req -new -newkey rsa:2048 -nodes \
  -keyout files/target-host/service.key \
  -out files/target-host/service.csr \
  -subj "/C=DE/ST=State/L=City/O=Example Platform/OU=Operations/CN=app.example.internal" \
  -addext "subjectAltName = DNS:app.example.internal,DNS:admin.example.internal,DNS:target-host"
```

Useful Vim regex patterns for rapid cleanup.

```vim
:%s/\s\+$//e        " Remove trailing whitespace
:%s/old-token/new/g " Global replace
```

## Summary

This page serves as a unified index. By keeping identifiers generic, these patterns can be blindly copy-pasted, edited with the real hostnames/variables, and executed with confidence.
