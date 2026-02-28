---
title: "Essential Red Hat Linux Administrator Commands"
description: "A practical cheatsheet covering the most essential commands for managing RHEL systems on a daily basis."
situation: "During enterprise Linux and virtualization operations across multi-team environments, this case came from work related to \"Essential Red Hat Linux Administrator Commands.\""
issue: "Needed a repeatable way to compile a practical cheatsheet covering the most essential commands for managing RHEL systems on a daily basis."
solution: "Implemented a practical runbook/automation pattern with clear safety checks, execution steps, and verification points."
usedIn: "Used in Linux platform engineering, middleware operations, and datacenter modernization projects in regulated environments."
impact: "Improved repeatability, reduced incident risk, and made operational handoffs clearer across teams."
pubDate: 2026-01-30
category: "infrastructure"
tags: ["Linux", "RHEL", "SystemAdmin", "CLI"]
draft: false
---

## Situation
As a Certified Red Hat Linux Administrator, I rely on a core set of commands to manage, troubleshoot, and monitor RHEL systems efficiently. I've compiled this comprehensive cheatsheet to help system administrators and Linux enthusiasts identify and resolve issues encountered on a day-to-day basis.

This guide covers everything from system monitoring to Ansible automation.

## The Cheatsheet

### 1. System Monitoring and Troubleshooting
- `top`, `htop`: Real-time process monitoring.
- `ps -aux --forest`: View processes in a tree-like format.
- `systemctl status <service>`: Check status of a service.
- `journalctl -xe`: View detailed logs for troubleshooting.
- `journalctl --since "2 hours ago"`: Filter logs from the last 2 hours.
- `sar -u 1 5`: CPU usage every 5 seconds.
- `dstat -cdngy`: Live stats for CPU, disk, network, and memory.
- `iotop`: Monitor I/O usage by process.
- `strace -p <pid>`: Debug issues by tracing system calls for a process.
- `vmstat 1`: Real-time system performance metrics.

### 2. Package Management and Repositories
- `dnf update`: Update all packages.
- `dnf install <package>`: Install a package.
- `dnf list installed`: List all installed packages.
- `dnf check-update`: Check for available updates.
- `dnf remove <package>`: Remove a package.
- `rpm -qa`: Search for installed packages.
- `rpm -V <package>`: Verify package integrity.
- `rpm -U <package>`: Upgrade a package.
- `rpm -e <package>`: Remove a package.
- `yum repolist --disabled`: List disabled repositories.
- `yum-config-manager --enable <repo>`: Enable a specific repository.
- `yum repolist all`: List all repositories.

### 3. User and Permissions
- `id <user>`: Display user ID and group ID.
- `usermod -aG <group> <user>`: Add a user to a group.
- `chage -l <user>`: List account expiration details.
- `getfacl <file>`: Get file ACL permissions.
- `setfacl -m u:<username>:rw <file>`: Modify file ACL permissions.
- `useradd -m -d /home/<user> -s /bin/bash <user>`: Create a new user.
- `groupadd <group>`: Create a new group.
- `usermod -s /sbin/nologin <user>`: Change a user's shell to nologin.
- `passwd -e <user>`: Expire a user's password.
- `chage -E YYYY-MM-DD <user>`: Set expiration date for a user.
- `chage -m 7 -M 90 -W 14 <user>`: Set password policy (min 7 days, max 90 days, 14-day warning).
- `gpasswd -a <user> <group>`: Add a user to a group.
- `gpasswd -d <user> <group>`: Remove a user from a group.
- `groups <user>`: Show groups for a user.
- `chown <user>:<group> <file>`: Change file ownership.
- `visudo`: Edit the sudoers file.

### 4. SUID vs SGID vs STICKY BIT
- `chmod 4xxx <file>`: Set SUID on a file.
- `chmod 2xxx <file>`: Set SGID on a file.
- `chmod 1xxx <file>`: Set Sticky Bit on a file.

### 5. Networking Commands
- `nmcli connection show`: Show network connections.
- `nmcli connection modify "xxxx" ipv4.addresses "192.0.2.100/24" ipv4.gateway "192.0.2.1" ipv4.dns "8.8.8.8 8.8.4.4" ipv4.method manual`: Configure a static IP.
- `nmcli connection up <connection>`: Bring up a network connection.
- `nmtui`: Text-based network manager.
- `ip link`: Show network interfaces.
- `ping -c 5 <host>`: Send 5 ICMP packets to a host.
- `traceroute <host>`: Trace the route to a host.
- `firewall-cmd --list-all`: Show all firewall rules.
- `firewall-cmd --add-port=<port>/tcp --permanent`: Add a port to the firewall.
- `firewall-cmd --reload`: Reload firewall rules.
- `ss -tulpn`: List open network connections and listening ports.
- `tcpdump -i eth0`: Capture packets on eth0.
- `nc -zv 192.0.2.10 443`: Test if a port is open.
- `wget <url>`: Download a file using HTTP/HTTPS.
- `curl <url>`: Fetch content from a URL.

### 6. SELinux and Security
- `sestatus`: Display SELinux status.
- `getenforce`: Get SELinux enforcement mode.
- `setenforce 1`: Enable SELinux.
- `setenforce 0`: Disable SELinux (Permissive mode).
- `chcon -t <type> <file>`: Change SELinux context of a file.
- `restorecon -Rv <dir>`: Restore SELinux context recursively.
- `chcon --reference=/path/ref /path/to/dest`: Copy SELinux context from one file to another.
- `openssl req -new -x509 -keyout server.key -out server.crt -days 365`: Generate a self-signed SSL certificate.
- `ssh-keygen -t ed25519`: Generate an SSH key with ed25519.
- `ssh-copy-id user@host`: Copy an SSH key to a remote host.
- `openssl passwd -6`: Generate a hashed password.

### 7. Useful Commands
- `rsync -avz /source/ /destination/`: Synchronize files between source and destination.
- `scp file.txt user@host:/destination/`: Securely copy a file to a remote host.
- `tar -czvf backup.tar.gz /dir/`: Compress a directory into a tarball.

### 8. Subscription Management (Red Hat)
- `subscription-manager register --org=<org_id> --activationkey=<ak>`: Register the system with Red Hat.
- `subscription-manager release --show`: Show the current release version.
- `subscription-manager release --set=8.10`: Set the release version to 8.10.
- `subscription-manager unregister`: Unregister the system.
- `subscription-manager repos --list`: List available repositories.
- `subscription-manager repos --enable=<repo>`: Enable a specific repository.

### 9. Storage Management
- `lsblk`: List block devices.
- `mkfs.ext4 /dev/sdx1`: Format a partition as ext4.
- `mount /dev/sdx1 /mnt`: Mount a partition.
- `mount -a`: Mount all filesystems from `/etc/fstab`.
- `umount /mnt`: Unmount a partition.
- `pvcreate /dev/sdx1`: Create a physical volume for LVM.
- `vgcreate my_vg /dev/sdx1`: Create a volume group.
- `lvcreate -L 10G -n my_lv my_vg`: Create a logical volume of 10GB.
- `vgextend my_vg /dev/sdx1`: Add a physical volume to a volume group.
- `lvextend -r -L +2G /dev/mapper/my_vg-my_lv`: Extend a logical volume by 2GB.
- `lvextend -r -l +100%FREE /dev/mapper/my_vg-my_lv`: Extend a logical volume to use all available free space.

### 10. Scheduled Tasks
- `crontab -e`: Edit the crontab for the current user.
- `crontab -l`: List the current user's crontab.
- `crontab -l -u <user>`: List the crontab for a specific user.
- `cat /etc/crontab`: View the system-wide crontab and check syntax.

### 11. Ansible Commands
- `ansible-playbook -i inventory_file playbook_file --limit='host1, host2, !host3'`: Run an Ansible playbook against an inventory, limiting execution and excluding specific hosts.
- `ansible-playbook -i inventory_file playbook_file --check`: Run a playbook in check mode (dry run; no changes performed).
- `ansible-playbook -i 'host1, host2,' playbook_file`: Run a playbook against specified hosts without a separate inventory file.
- `ansible-vault create file.yml`: Create a new file encrypted with Ansible Vault.
- `ansible-vault encrypt file.yml`: Encrypt an existing file.
- `ansible-vault decrypt file.yml`: Decrypt an encrypted file.
- `ansible all -i inventory -b -m shell -a 'reboot' --limit='server1'`: Execute a shell command with root permissions via ad-hoc command.

## Outcome
This cheatsheet serves as a quick reference for day-to-day operations and a foundation for managing RHEL systems confidently. 

Let's share knowledge and grow together! If you'd like a more detailed guide or want to discuss Linux administration, feel free to connect via LinkedIn.

<!-- portfolio:expanded-v1 -->

## Architecture Diagram
![Essential Red Hat Linux Administrator Commands supporting diagram](/images/diagrams/post-framework/infrastructure-flow.svg)

This visual summarizes the implementation flow and control points for **Essential Red Hat Linux Administrator Commands**.

## Deep Dive
This case is strongest when explained as an execution narrative instead of only a command sequence. The core focus here is **platform reliability, lifecycle controls, and repeatable Linux delivery**, with decisions made to keep implementation repeatable under production constraints.

### Design choices
- Preferred deterministic configuration over one-off remediation to reduce variance between environments.
- Treated **linux** and **rhel** as the main risk vectors during implementation.
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

