---
title: "The Comprehensive Linux Engineer Command List"
description: "A master reference merging daily Linux operations, Ansible Vault secrets, Python environments, Molecule testing, networking diagnostics, and Git recovery commands into a single, massive cheatsheet."
situation: "I had multiple separate snippets and reference sheets across different posts for Linux sysadmin tasks and automation workflows. It became tedious to jump between pages when solving complex incidents."
issue: "Scattered knowledge means slower response times during critical operations. Having Linux commands on one page and Ansible/Python commands on another breaks the operational flow."
solution: "Compiled every sanitized, production-tested command snippet from my daily workflow into a single, massive reference guide with a coordinated SVG poster set."
usedIn: "Daily operations across RHEL-like systems, automation repositories, incident response, and general troubleshooting."
impact: "Created a single-pane-of-glass reference for system and automation engineers, reducing search time and typos during live deployments."
pubDate: 2026-03-11
updatedDate: 2026-03-13
category: ["snippets", "infrastructure", "automation"]
tags: ["linux", "ansible", "python", "git", "vim", "networking", "cheatsheet", "devops"]
draft: false
---

## Situation

This document is the ultimate compilation of my daily operational commands. It merges traditional Linux sysadmin tasks like LVM resizing, user management, package checking, PostgreSQL fixes, and certificate generation with infrastructure-as-code tasks like Ansible Vault, Python environments, Molecule testing, and repeated playbook execution patterns.

I also reviewed a separate notebook export of daily notes and folded in the command patterns that actually show up in live work: repeated `ansible-playbook` runs, PostgreSQL archive settings, SELinux relabeling, `getent passwd` verification, silent installer execution, firewall inspection, traffic capture, and basic performance triage, all rewritten with fictional paths and data.

Every command listed here is sanitized using generic placeholders like `target-host`, `svc_user`, `vg_main`, and `app.example.internal`, so it is safe to publish and share publicly.

## Visual poster set

Instead of forcing everything into one unreadable image, I split the command set into four large posters that work better for previews, carousels, and sharing.

### 1. Storage and access

![Linux Engineer Command List — Storage and Access](/images/diagrams/new/full-linux-engineer-storage.svg)

[Open the storage and access SVG poster](/images/diagrams/new/full-linux-engineer-storage.svg)

### 2. Python, Ansible, and database operations

![Linux Engineer Command List — Python, Ansible, and DB](/images/diagrams/new/full-linux-engineer-automation.svg)

[Open the Python, Ansible, and DB SVG poster](/images/diagrams/new/full-linux-engineer-automation.svg)

### 3. Testing, Git, and utilities

![Linux Engineer Command List — Testing, Git, and Utilities](/images/diagrams/new/full-linux-engineer-delivery.svg)

[Open the testing, Git, and utilities SVG poster](/images/diagrams/new/full-linux-engineer-delivery.svg)

### 4. Networking and performance

![Linux Engineer Command List — Networking and Perf](/images/diagrams/new/full-linux-engineer-networking.svg)

[Open the networking and performance SVG poster](/images/diagrams/new/full-linux-engineer-networking.svg)

## 1. Storage and filesystem management

Before touching partitions, start with visibility. The commands below help identify large directories, crowded filesystems, deleted-but-open files, and current block device layout.

```bash
# Directory usage sorted by size
du -sh /srv/app/* | sort -h

# Filesystem usage sorted by percentage used
(df -h | head -n1 && df -h | tail -n +2 | sort -hr -k5)

# Block devices and mountpoints
lsblk -o NAME,SIZE,FSTYPE,TYPE,MOUNTPOINTS

# Interactive disk usage view
ncdu /srv/app

# Large log files
find /var/log -type f -name "*.log" -size +1G -exec ls -lh {} +

# Deleted files still held open by a process
lsof +L1
```

### Expanding LVM without reboot

When the underlying hypervisor disk is already expanded, this is a practical rescan and growth sequence.

```bash
echo 1 > /sys/class/block/sdb/device/rescan
blockdev --getsize64 /dev/sda
fdisk /dev/sda   # or cfdisk /dev/sda
partprobe /dev/sda
pvresize /dev/sda3
vgs vg_main
lvextend -r -l +100%FREE /dev/vg_main/lv_root
xfs_growfs /dev/vg_main/lv_root
```

### Shrinking ext4 carefully

Shrinking needs a stricter order than growth. Backup first, resize the filesystem, then reduce the logical volume.

```bash
tar -czvf /backup/apps_backup.tar.gz /apps
umount /apps
e2fsck -f /dev/vg_app/lv_apps
resize2fs /dev/vg_app/lv_apps 9.5G
lvreduce -L 10G /dev/vg_app/lv_apps
mount /dev/vg_app/lv_apps /apps
resize2fs /dev/vg_app/lv_apps
lvs /dev/vg_app/lv_apps
df -h /apps
```

## 2. Accounts, permissions, and audit

Managing service accounts is not just about existence. In practice, it also means checking password aging, sudo exposure, group membership, root-equivalent accounts, and owned directories.

```bash
id svc_user && chage -l svc_user
chage -d "$(date +%F)" svc_user
chage -m 7 -M 99999 -I -1 -E -1 svc_user
usermod -aG wheel ops_user
ssh-copy-id ops_user@target-host
awk -F: '($3 == "0") {print}' /etc/passwd
visudo -c
groups svc_user
find / -maxdepth 2 -type d \( -user svc_user -o -group svc_user \) -ls 2>/dev/null
sudo -l -U svc_user | grep -v "not allowed"
getent passwd svc_user
```

## 3. Python virtual environments

Always isolate Python dependencies when bootstrapping a repository, then verify drift and expose a quick file share when needed.

```bash
python3.12 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
pip install -r requirements.txt
pip freeze > requirements.txt
pip list --outdated
python3.12 -m http.server 8080
```

## 4. Ansible automation and secrets

These are the commands that tend to reappear during delivery windows, break/fix sessions, and repo maintenance.

### Common execution patterns

```bash
ansible-playbook --check --diff playbook.yml
ansible-playbook playbook.yml --step
ansible-inventory -i inventory/stage/ --graph
ansible-playbook -i inventory/lab/ playbooks/platform-bootstrap.yml --limit='target-host' -t app_db_client
ansible-playbook -i inventory/stage/ playbooks/platform-bootstrap.yml --limit='target-host' -t common_usersetup,common_filesystems,common_rhel,common_security
ansible-playbook -i inventory/stage/ playbooks/app_postgresql_prereqs.yml --limit='target-host'
```

### Dependencies, Vault, and ad-hoc checks

```bash
ansible-galaxy install -r requirements.yml
ansible-galaxy install -r roles/platform_role/collections/requirements.yml
pip install -r collections/ansible_collections/community/general/requirements.yml
ansible-vault encrypt_string --stdin-name 'service_secret'
ansible-vault encrypt files/target-host/tls.key --vault-password-file ~/.secure/vault/platform.pass --encrypt-vault-id default
ansible-vault rekey files/target-host/tls.key
ansible-vault decrypt files/target-host/tls.crt --vault-password-file ~/.secure/vault/platform.pass
ansible localhost -m debug -a "var=vault_secret_name" -e "@inventory/lab/group_vars/all/secret_vars.yml" --ask-vault-pass
ansible all -m ping -i inventory/lab/
ansible all -m setup | grep ansible_os_family
```

## 5. PostgreSQL and SELinux operational fixes

These are the smaller but critical commands that appear during archive failures, policy denials, and config reload troubleshooting.

```bash
vim /data/postgres/main/pg_hba.conf
sudo vi /data/postgres/main/postgresql.conf
sudo -u postgres psql -c "SELECT pg_reload_conf();"
tail -f /var/log/postgresql/postgresql-14-main.log
archive_command = 'test -f /data/postgres/archive/%f || cp %p /data/postgres/archive/%f'
sestatus
audit2allow -a
semanage fcontext -a -t postgresql_db_t "/data/postgres/archive(/.*)?"
restorecon -Rv /data/postgres/archive
getent passwd svc_user
```

## 6. Molecule testing loop

A fuller local role-testing cycle resets state, rebuilds the scenario, verifies behavior, and then drops into the instance when deeper inspection is needed.

```bash
molecule list
molecule destroy -s default
molecule create -s default
molecule converge -s default
molecule test -s default
molecule verify -s default
molecule login -s default
```

## 7. Git recovery and branch refresh

This is a safe refresh path when local work is in flight and `main` has moved.

```bash
git fetch --all --prune
git stash
git checkout main
git pull
git checkout feature-branch
git merge main
git stash pop
git add
git rebase -i HEAD~3
git log --graph --oneline --all
```

## 8. Certificates, installers, editor, and service fixes

These are the utility commands that are easy to forget until the exact moment they are needed.

```bash
/opt/software-depot/setup.sh -silent -responsefile /opt/software-depot/response.properties -skiposlevelcheck
openssl req -new -newkey rsa:2048 -nodes \
  -keyout files/target-host/tls.key \
  -out files/target-host/tls.csr \
  -subj "/C=DE/ST=State/L=City/O=Example Corp/OU=Platform/CN=app.example.internal" \
  -addext "subjectAltName = DNS:app.example.internal,DNS:target-host.example.internal"
openssl x509 -in tls.crt -text -noout
openssl s_client -connect target-host:443 -showcerts
certbot certificates
```

```vim
:%s/\s\+$//e
:%s/old-token/new-token/g
```

```bash
ln -s /etc/opt/vendor/app /apps/app
readlink -f /apps/app
unlink /apps/app
crontab -u svc_user -e
crontab -u svc_user -l
watch -n 1 'systemctl status example-service'
journalctl -u example-service --since "1 hour ago"
grep CRON /var/log/syslog
```

## 9. Networking and performance diagnostics

This is the set I reach for when the issue might be connectivity, DNS, firewalling, saturation, or load.

### Ports and connections

```bash
ss -tulnp | grep LISTEN
netstat -anp | grep :80
lsof -i :443
nc -zv target-host 22
telnet target-host 443
curl -vI https://target-host
```

### Routes and packet capture

```bash
ip addr show
ip route show
ping -c 4 8.8.8.8
traceroute target-host
mtr target-host
tcpdump -i eth0 port 53
tcpdump -i any -nn -s0 -v port 80
dig +short target-host A
```

### Load, memory, and I/O checks

```bash
uptime
top -b -n 1 | head -n 20
htop
free -m
vmstat 1 5
iostat -x 1 5
sar -u 1 3
dmesg -T | tail -n 50
```

### Firewalld and iptables

```bash
firewall-cmd --state
firewall-cmd --list-all
firewall-cmd --add-port=8080/tcp --permanent
firewall-cmd --reload
iptables -L -n -v
iptables -t nat -L -n -v
iptables-save > /etc/iptables/rules.v4
ufw status verbose
```

## Summary

This page is meant to be a unified operational index. By keeping identifiers generic, these patterns can be copied, adapted with the real values, and used quickly under pressure.
