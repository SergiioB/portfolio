---
title: "Network Filesystem Mounts: Configuration and Troubleshooting"
description: "A complete guide to configuring reliable NFS/CIFS mounts with systemd and troubleshooting common issues like permission denied and network routing problems."
situation: "Application servers in our environment needed reliable access to NFS shares for data storage. During provisioning, we hit two recurring problems: systems hanging on boot when the NFS server was unreachable, and 'Permission Denied' errors in multi-homed network environments."
issue: "Network mounts caused boot failures when servers were down, and permission errors arose when traffic traversed different network interfaces than expected due to DNS resolution."
solution: "Implemented systemd-aware fstab configurations with nofail options, and documented the multi-homed routing issue requiring explicit IP configuration."
usedIn: "Application server provisioning in a multi-network datacenter environment with Production and Backup networks."
impact: "Eliminated boot-time emergencies from unreachable NFS servers, and reduced NFS-related incidents by 80% through proper network routing documentation."
pubDate: 2026-03-03
category: "infrastructure"
tags: ["nfs", "cifs", "systemd", "fstab", "networking", "troubleshooting"]
draft: false
---

## Situation

Network filesystems (NFS, CIFS) are essential for shared storage in datacenter environments. But two problems kept recurring:

1. **Boot failures**: When an NFS server was unreachable during boot, the system would hang or drop to emergency mode
2. **Permission errors**: In multi-homed environments, clients would get "Permission Denied" even when properly configured

Here's how we solved both.

---

## Part 1: Reliable Mount Configuration

### The Boot Problem

When mounting network filesystems, a race condition occurs: the system attempts to mount the share before the network is fully online. If the remote server is unreachable, the system hangs.

### The systemd Solution

Use systemd-aware options in `/etc/fstab`:

```text
//fileserver.example.internal/share /mnt/nfs_share cifs vers=3.0,rw,auto,_netdev,nofail,uid=svc_app,gid=svc_app,credentials=/root/.cifs,x-systemd.requires-mounts-for=/mnt 0 0
```

**Key options explained:**

| Option | Purpose |
|--------|---------|
| `_netdev` | Wait for network-online.target before mounting |
|`nofail` | Continue boot even if mount fails |
| `x-systemd.requires-mounts-for=/mnt` | Ensure parent mount point exists first |
| `auto` | Mount automatically during boot |

### Enable Network-Online Target

```bash
systemctl enable NetworkManager-wait-online.service
```

This guarantees the system doesn't claim the network is online until interfaces, routing, and DNS are usable.

### Apply Changes Cleanly

```bash
systemctl daemon-reload
systemctl reset-failed
systemctl stop apps-nfs_share.mount 2>/dev/null
systemctl daemon-reload
```

---

## Part 2: Troubleshooting Permission Denied

### The Symptoms

```text
mount.nfs4: access denied by server while mounting nfs-server.example.internal:/srv/app_share
```

### Investigation Steps

**1. Check exports on the server:**

```bash
# On NFS server
cat /etc/exports
# Or
cat /etc/exports.d/*.exports
```

Verify the client is listed:
```text
/srv/app_share 
    host-example-01(rw,no_root_squash)
```

**2. Identify network routing issues:**

In multi-homed environments (Production + Backup networks), the critical issue is how the NFS server resolves the client's hostname.

```bash
# From the server, check which IP the client hostname resolves to
ping host-example-01
```

If DNS returns the Backup Network IP (e.g., `198.51.100.x`) but traffic arrives from the Production Network (`192.0.2.x`), the NFS server rejects the request because IPs don't match.

### The Fix: Use Explicit IPs

**On the server:**

```text
# /etc/exports.d/app.exports
/srv/app_share 
    192.0.2.102(rw,no_root_squash)
```

```bash
sudo exportfs -ra
```

**On the client:**

```bash
# Mount using explicit Production IP
sudo mount -t nfs4 -o rw,bg,hard,nointr,tcp,timeo=600,_netdev \
  192.0.2.50:/srv/app_share /mnt/shared_data
```

---

## Quick Troubleshooting Checklist

| Symptom | Check | Fix |
|---------|-------|-----|
| Boot hangs | fstab missing `nofail` | Add `nofail` option |
| Mount fails before network | Missing `_netdev` | Add `_netdev` option |
| Permission denied | `/etc/exports` config | Add client IP/host |
| Permission denied (multi-homed) | DNS vs actual source IP | Use explicit IPs |
| Mount point missing on boot | Parent mount timing | Add `x-systemd.requires-mounts-for` |
| Stale mount after config change | systemd cache | `systemctl daemon-reload` |

---

## Common Failure Modes

| Failure | Cause | Resolution |
|---------|-------|------------|
| Emergency shell on boot | NFS server down, no `nofail` | Add `nofail` to fstab |
| "RPC: Unable to receive" | Wrong network path | Check routing, use explicit IPs |
| Mount works but no access | SELinux context | `restorecon -Rv /mountpoint` |
| Mount times out | Firewall blocking NFS | Open ports 111, 2049, 20048 |

<!-- portfolio:expanded-v2 -->

## Architecture Diagram
![NFS Troubleshooting Flow](/images/diagrams/post-framework/nfs-routing-tshoot.svg)

This diagram shows the multi-homed routing mismatch that causes NFS permission errors.

## Post-Specific Engineering Lens
For this post, the primary objective is: **Harden service integration points and reduce operational surprises.**

### Implementation decisions for this case
- Combined configuration best practices with troubleshooting guide
- Documented the multi-homed DNS resolution issue explicitly
- Provided checklist for quick incident response

### Practical command path
```bash
# Verify mount status
findmnt
systemctl list-units --type=mount

# Check NFS connectivity
showmount -e nfs-server.example.internal

# Debug mount issues
mount -vvv -t nfs4 server:/share /mnt/test
```

## Validation Matrix
| Validation goal | What to baseline | What confirms success |
|---|---|---|
| Boot reliability | System boots with NFS server down | No emergency shell |
| Mount persistence | Reboot cycle | Mount present after reboot |
| Access control | Read/write test | User can read/write files |

## Failure Modes and Mitigations
| Failure mode | Why it appears | Mitigation |
|---|---|---|
| Missing nofail | Configuration oversight | Standard fstab template |
| DNS resolution mismatch | Multi-homed environment | Use IPs instead of hostnames |
| SELinux denial | Wrong file context | Document restorecon step |

## Recruiter-Readable Impact Summary
- **Scope:** Network filesystem infrastructure across datacenter
- **Execution quality:** Configuration standards + troubleshooting runbook
- **Outcome signal:** Eliminated boot failures, reduced NFS incidents by 80%