---
title: "Server Provisioning Playbook: From VM Request to Production"
description: "A practical guide to the Linux server provisioning workflow—from creating AD groups and technical users to Ansible role deployment and application-specific configurations."
situation: "As part of the Linux infrastructure team, I handle server provisioning requests end-to-end. A typical request involves creating Active Directory groups, setting up technical users, deploying base configurations via Ansible, and handing off to application teams."
usedIn: "Linux platform engineering for SAP, PostgreSQL, and custom application servers in a regulated enterprise environment."
impact: "Reduced provisioning time from days to hours, eliminated missing configuration steps, and created clear handoff documentation for application teams."
pubDate: 2026-03-03
category: "infrastructure"
tags: ["provisioning", "ansible", "rhel", "active-directory", "sysadmin"]
draft: false
---

## Situation

Server provisioning in an enterprise environment involves multiple systems and stakeholders:

1. **VM Team**: Deploys the virtual machine from template
2. **Linux Team**: Configures the OS, joins AD, creates users
3. **Application Team**: Deploys their software
4. **Security Team**: Validates compliance

When I started, the process was fragmented. Requests came via ServiceNow tickets, steps were tracked in notepads, and handoffs happened via email with inconsistent information.

---

## The Provisioning Checklist

### Phase 1: Pre-Provisioning

**Active Directory Groups** (via PowerShell on management server):

```powershell
# Create server groups
.\createServerGroups_v2.ps1 -ServerName dldc0app001 -Owner SKESSEL -OwnerProxy jdoe -Env DEV -OsType LINUX

# Create DA (Delegated Admin) groups for technical users
.\createServerGroups_v2.ps1 -ServerName dldc0app001 -Owner SKESSEL -OwnerProxy jdoe -Env DEV -OsType LINUX -DAUser t_t_app
```

This creates:

- `LA_GEDEDC_DLDC0APP001` (Login Access)
- `RA_GEDEDC_DLDC0APP001` (Root Access)
- `DA_GEDEDC_DLDC0APP001_SUDO_t_t_app` (Delegated Admin for technical user)

**Record in host_vars**:

```yaml
# inventory/dev/host_vars/dldc0app001.yml
---
hostname: dldc0app001
environment: dev
required_roles:
  - common_usersetup
  - common_filesystems
  - common_rh9
  - common_customization

unix_local_users:
  t_t_app:
    uid: 45004
    gid: 45004
    groups: [t_t_app]
    shell: /bin/bash
```

---

### Phase 2: Base Configuration

**Run common roles via Ansible**:

```bash
ansible-playbook -i inventory/dev/ playbooks/rh9-install.yml \
  --limit='dldc0app001' \
  -t common_usersetup,common_filesystems,common_rh9,common_customization
```

This applies:

- User/group creation with consistent UIDs/GIDs
- Filesystem mounts (LVM, NFS, CIFS as needed)
- RHEL 9 base configuration
- Custom organization settings

**Key configuration points**:

- `/app` partition for application data
- SELinux enforcing with proper contexts
- Systemd mount units for network filesystems
- Technical users with never-expire passwords

---

### Phase 3: Application-Specific Setup

**PostgreSQL Example**:

```bash
# Deploy PostgreSQL requirements
ansible-playbook -i inventory/dev/ playbooks/app_postgresql_requirements.yml \
  --limit='dldc0dbps001d'
```

Post-deployment configuration:

```bash
# Configure WAL archiving
vim /pgdata/data/postgresql.conf
# archive_mode = on
# archive_command = 'test -f /pgdata/data/archive/%f || cp %p /pgdata/data/archive/%f'

# SELinux context for archive directory
semanage fcontext -a -t postgresql_db_t "/pg_archive(/.*)?"
restorecon -Rv /pg_archive
```

**SAS Example** (requires silent installation):

1. Generate response file from SAS Deployment Wizard
2. Run silent install via Ansible:

```bash
/path/to/sas_depot/setup.sh -silent -responsefile /path/to/response.properties -skiposlevelcheck
```

**Oracle Client Example**:

```yaml
# Add to host_vars
required_roles:
  - app_ora_client
```

```bash
ansible-playbook -i inventory/dev/ playbooks/rh9-install.yml \
  --limit='dldc0app001' \
  -t app_ora_client
```

---

### Phase 4: Handoff Documentation

**Email template**:

```
Subject: Server DLDC0APP001 Ready for Application Deployment

Hi [Application Team],

The server has been deployed. You will find it in Omada under UNIX [DEV] System.

Access:
- LA_GEDEDC_DLDC0APP001 (Login Access)
- RA_GEDEDC_DLDC0APP001 (Root Access)
- DA_GEDEDC_DLDC0APP001_SUDO_t_t_app (Switch to technical user)

Technical Users:
- t_t_app (UID: 45004)

Filesystems:
- /app (100GB, LVM)
- /mnt/nfs_share (NFS mount to storage)

Next Steps:
1. Request access via Omada
2. Deploy application to /app
3. Contact Linux team for any additional configuration

Best Regards,
[Your Name]
IT Infrastructure Linux
```

---

## Common Patterns

### Technical User with AD Group Mapping

For applications requiring both local users and AD group membership:

1. Create local user with specific UID/GID
2. Create local group matching AD group GID
3. Add AD group members to local group via `group_mapping`

```yaml
# host_vars
unix_local_groups:
  app_admins:
    gid: 40061

group_mapping:
  app_admins:
    ad_group: DA_GEDEDC_DLDC0APP001_SUDO_t_t_app
```

### Adding Backup Interface

For database servers requiring backup network:

```yaml
# host_vars
backup_interface:
  enabled: true
  ip: 10.0.1.100
  netmask: 255.255.255.0
```

### SSL Certificate Deployment

For web-facing applications:

```bash
# Encrypt certificate files
ansible-vault encrypt files/certs/dldc0app001.key

# Deploy via playbook
ansible-playbook -i inventory/dev/ playbooks/ssl-deploy.yml \
  --limit='dldc0app001'
```

---

## Troubleshooting Common Issues

### User Can't `su` to Technical User

**Symptom**: `su - t_t_app` fails with "Permission denied"

**Cause**: PAM configuration conflict, often with fingerprint service

**Fix**:

```bash
# Check PAM config
grep -r pam_fprintd /etc/pam.d/

# Modify su to use password-auth instead of system-auth
sed -i 's|substack system-auth|substack password-auth|' /etc/pam.d/su
```

### NFS Mount Permission Denied

**Symptom**: Mount succeeds but access denied

**Cause**: Firewall blocking NFS ports or SELinux context

**Fix**:

```bash
# Check firewall
firewall-cmd --list-all

# Check SELinux context
ls -laZ /mnt/nfs_share

# If needed, set proper context
semanage fcontext -a -t nfs_t "/mnt/nfs_share(/.*)?"
restorecon -Rv /mnt/nfs_share
```

### AD Group Not Resolving

**Symptom**: `getent group DA_xxx` returns nothing

**Cause**: Group not yet synchronized to local cache

**Fix**:

```bash
# Force AD lookup
id username@domain

# Check SSSD status
sssctl domain-status DOMAIN.LOCAL

# Clear cache if needed
sss_cache -E
systemctl restart sssd
```

---

## Quick Reference

| Task                 | Command/Location                               |
| -------------------- | ---------------------------------------------- |
| Create AD groups     | PowerShell `createServerGroups_v2.ps1`         |
| Deploy base config   | `ansible-playbook rh9-install.yml -t common_*` |
| Add technical user   | Edit `host_vars`, run `common_usersetup`       |
| Deploy PostgreSQL    | `app_postgresql_requirements.yml`              |
| Deploy Oracle client | Add `app_ora_client` to `required_roles`       |
| SSL certificates     | `ansible-vault encrypt` → deploy playbook      |

<!-- portfolio:expanded-v2 -->

## Architecture Diagram

![Server Provisioning Flow](/images/diagrams/post-framework/infrastructure-flow.svg)

This diagram shows the provisioning flow from VM deployment through configuration to handoff.

## Post-Specific Engineering Lens

For this post, the primary objective is: **Standardize server provisioning for consistency and speed.**

### Implementation decisions for this case

- Separated provisioning into distinct phases with clear owners
- Used Ansible roles for reproducible configuration
- Created handoff templates for consistent communication

### Practical command path

```bash
# Provisioning sequence
ansible-playbook -i inventory/dev/ playbooks/rh9-install.yml --limit='hostname' -t common_usersetup
ansible-playbook -i inventory/dev/ playbooks/rh9-install.yml --limit='hostname' -t common_rh9
ansible-playbook -i inventory/dev/ playbooks/rh9-install.yml --limit='hostname' -t common_filesystems

# Verification
systemctl --failed
journalctl -p err -b
```

## Validation Matrix

| Validation goal   | What to baseline        | What confirms success                 |
| ----------------- | ----------------------- | ------------------------------------- |
| User access       | AD group membership     | `getent group DA_xxx` returns members |
| Filesystem mounts | Mount points configured | `findmnt` shows all expected mounts   |
| SELinux           | Enforcing mode          | `getenforce` returns Enforcing        |
| Services          | No failed units         | `systemctl --failed` empty            |

## Failure Modes and Mitigations

| Failure mode       | Why it appears            | Mitigation                             |
| ------------------ | ------------------------- | -------------------------------------- |
| Missing AD groups  | PowerShell script not run | Pre-flight checklist verification      |
| UID/GID conflicts  | Manual user creation      | Central user registry in Ansible       |
| SELinux denials    | Wrong file contexts       | Run `restorecon` after file operations |
| Incomplete handoff | Missing documentation     | Use standardized email template        |

## Recruiter-Readable Impact Summary

- **Scope:** End-to-end server provisioning in enterprise environment
- **Execution quality:** Phased approach with clear ownership
- **Outcome signal:** Reduced provisioning time, consistent configurations
