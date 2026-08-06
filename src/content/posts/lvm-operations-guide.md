---
title: "LVM Operations: Expand, Shrink, and Migrate Volumes"
description: "A complete guide to Logical Volume Manager operations—expanding partitions online, shrinking safely, and migrating directories with minimal downtime."
situation: "While managing a fleet of RHEL servers, storage operations were a recurring pain point. Applications would outgrow their allocated space, migrations required careful coordination, and shrink operations were dreaded due to data loss risks."
issue: "Storage operations were handled inconsistently across the team. Some admins would reboot servers for partition changes, others would attempt risky online operations without proper checkpoints, and migrations often resulted in extended downtime windows."
solution: "Documented a standardized LVM playbook covering the three core operations—expansion, shrinking, and migration—with clear pre-flight checks, execution steps, and rollback procedures."
usedIn: "Used in Linux platform engineering for SAP deployments, PostgreSQL database servers, and application server fleets managed via Ansible."
impact: "Reduced storage-related incidents by establishing consistent procedures. Expansion operations now happen without reboots, migrations complete within predictable maintenance windows, and shrink operations have clear safety gates."
pubDate: 2026-03-03
category: "infrastructure"
tags: ["lvm", "storage", "sysadmin", "rhel"]
draft: false
---

## Situation

During server provisioning and lifecycle management, storage operations are inevitable. Applications grow beyond their allocated space, new directories need dedicated volumes, and sometimes space needs to be reclaimed from over-provisioned filesystems.

I've handled three distinct LVM scenarios repeatedly across our server fleet:

1. **Expansion**: A VM's disk is extended at the hypervisor, but the Linux partition and LVM need to catch up—ideally without a reboot.
2. **Shrinking**: An application was decommissioned and its volume can be reduced, but shrinking ext4 is risky if done wrong.
3. **Migration**: An application directory like `/opt` is consuming root filesystem space and needs to move to a dedicated volume with minimal downtime.

---

## Operation 1: Expanding LVM Online (No Reboot)

When a disk is expanded at the hypervisor level but you don't have `growpart` available, you can resize the partition manually using `fdisk`. This works without a reboot as long as you preserve the LVM signature.

### The fdisk Procedure

Assuming we're expanding `/dev/sda3`:

```bash
fdisk /dev/sda
```

Inside the interactive prompt:

1. `p` — Print the partition table, note the starting sector of `sda3`
2. `d` → `3` — Delete partition 3 (data remains in disk blocks)
3. `n` → `p` → `3` — Create new primary partition 3
4. **First sector**: Press ENTER (must match the original start sector)
5. **Last sector**: Press ENTER (uses the new disk end)
6. When prompted about removing the LVM signature: **Type N**
7. `t` → `3` → `8e` — Mark as Linux LVM
8. `w` — Write changes

### Update the Kernel and Expand

```bash
# Reread partition table without reboot
partprobe /dev/sda

# Expand the physical volume
pvresize /dev/sda3

# Verify new free space
vgs

# Expand the LV and filesystem in one command
lvextend -r -l +100%FREE /dev/mapper/vg_system-root
```

**Key insight**: The `-r` flag to `lvextend` handles the filesystem resize automatically. No separate `resize2fs` needed.

---

## Operation 2: Shrinking an ext4 Filesystem

Unlike expansion, shrinking ext4 requires unmounting—the filesystem must be offline. This is a destructive operation if done incorrectly.

### Pre-flight Checklist

- [ ] Full backup exists
- [ ] Maintenance window confirmed
- [ ] Application services stopped
- [ ] Filesystem unmounted

### The Shrink Procedure

Target: Shrink `/data` (mapped to `/dev/mapper/vg_data-lv_data`) to 10G.

```bash
# 1. Unmount
umount /data

# 2. Force filesystem check (mandatory)
e2fsck -f /dev/mapper/vg_data-lv_data

# 3. Shrink filesystem SMALLER than target LV (safety margin)
resize2fs /dev/mapper/vg_data-lv_data 9.5G

# 4. Shrink the logical volume to final size
lvreduce -L 10G /dev/mapper/vg_data-lv_data
# Confirm when prompted

# 5. Expand filesystem to fill the LV exactly
resize2fs /dev/mapper/vg_data-lv_data

# 6. Remount and verify
mount /data
df -h /data
```

**Why shrink the filesystem smaller first?** If you shrink the LV below the filesystem size, you corrupt data. The two-step shrink (filesystem to 9.5G, then LV to 10G, then filesystem back to fill) guarantees safety.

---

## Operation 3: Migrating a Directory to a New Volume

When `/opt` or another application directory is consuming root filesystem space, migrate it to a dedicated LVM volume. The key is using `rsync` for an initial sync before the maintenance window.

### Preparation (Before Maintenance Window)

```bash
# Create the new LV
lvcreate -n opt_vol -L 10G vg_app
mkfs.ext4 /dev/mapper/vg_app-opt_vol

# Mount temporarily
mkdir /mnt/new_opt
mount /dev/mapper/vg_app-opt_vol /mnt/new_opt

# Initial sync (application still running)
rsync -avz /opt/ /mnt/new_opt/
```

### Execution (During Maintenance Window)

```bash
# Stop application services
systemctl stop myapp-agent.service

# Final sync (catches changes since initial)
rsync -avz /opt/ /mnt/new_opt/

# Switchover
umount /mnt/new_opt
mv /opt /opt_old
mkdir /opt
mount /dev/mapper/vg_app-opt_vol /opt

# Restore SELinux contexts (critical!)
restorecon -Rv /opt

# Make permanent
echo '/dev/mapper/vg_app-opt_vol  /opt  ext4  defaults,nodev  1 2' >> /etc/fstab

# Start services
systemctl start myapp-agent.service
```

### Cleanup (Days Later)

After confirming stability:

```bash
rm -rf /opt_old
```

---

## Operation 4: Live Hypervisor Disk Shrink (VMware vSphere + LVM)

Shrinking a VMDK directly in vSphere is not supported while attached to a running VM. The safe enterprise pattern combines online block migration (`pvmove`) to a new, smaller VMDK with kernel device deletion and vSphere SCSI node re-alignment.

### Phase 1: Live Block Migration & Disk Ejection (Online)

Target: Reclaim space from an over-provisioned 2TB VMDK (`/dev/sdc`) down to 1.3TB (`/dev/sdd`) while `/apps` remains fully accessible.

1. **Attach new VMDK**: Add a new 1.3TB VMDK in vSphere (enumerates as `/dev/sdd`).
2. **Initialize & Extend Volume Group**:
   ```bash
   pvcreate /dev/sdd
   vgextend vgapp /dev/sdd
   ```
3. **Migrate Blocks Live** (takes ~30-60 mins depending on storage array throughput; application runs uninterrupted):
   ```bash
   pvmove /dev/sdc /dev/sdd
   ```
4. **Eject Old Physical Volume**:
   ```bash
   vgreduce vgapp /dev/sdc
   pvremove /dev/sdc
   ```
5. **Drop Device from Kernel Bus** (critical to prevent I/O errors prior to hypervisor removal):
   ```bash
   echo 1 > /sys/block/sdc/device/delete
   ```
6. **Remove from vSphere**:
   - Right-click VM → Edit Settings.
   - Click **X** on the 2TB Hard Disk.
   - **CRITICAL**: Check **"Delete files from datastore"**. _If skipped, the VM drops the disk but the 2TB VMDK remains orphaned on storage array storage indefinitely._

### Phase 2: SCSI Slot Re-alignment (SCSI 0:2 Remap)

vSphere disallows editing Virtual Device Node assignments on actively connected disks. To reassign the 1.3TB disk back to `SCSI 0:2`:

1. **Power Off VM** cleanly during scheduled maintenance.
2. **Detach Disk in vSphere**:
   - Edit Settings → Click **X** on the 1.3TB Hard Disk.
   - **CRITICAL**: **DO NOT** check _"Delete files from datastore"_. Only unbind the device registration.
3. **Re-attach on Target Slot**:
   - Add New Device → **Existing Hard Disk** → Browse to the 1.3TB `.vmdk`.
   - Expand disk options → Set **Virtual Device Node** to `SCSI 0:2`.
4. **Power On & Verify**:
   ```bash
   lsblk -f
   pvs; vgs; lvs
   df -h /apps
   ```

---

## Quick Reference Table

| Operation            | Online/Offline         | Risk Level | Key Command                                  |
| -------------------- | ---------------------- | ---------- | -------------------------------------------- |
| Expand LV            | Online                 | Low        | `lvextend -r -l +100%FREE /dev/mapper/vg-lv` |
| Shrink LV            | Offline                | High       | `resize2fs` → `lvreduce` → `resize2fs`       |
| Migrate Directory    | Online + brief offline | Medium     | `rsync` → stop → `rsync` → switchover        |
| Shrink VMDK (VMware) | Online + brief reboot  | Medium     | `pvmove` → `sysfs delete` → SCSI remap       |

---

## Common Failure Modes

| Failure                         | Cause                                         | Prevention                                            |
| ------------------------------- | --------------------------------------------- | ----------------------------------------------------- |
| Data loss during shrink         | LV shrunk below filesystem size               | Always shrink filesystem first, with margin           |
| LVM signature lost              | Answered Y to "remove signature" in fdisk     | Always answer N                                       |
| SELinux denials after migration | Security contexts not restored                | Run `restorecon -Rv` on mount point                   |
| "Target is busy" during unmount | Process holding filesystem open               | Use `lsof +D /mount` to identify                      |
| Orphaned 2TB VMDK on datastore  | Omitted "Delete files" checkbox in vSphere    | Always verify datastore file removal on retirement    |
| Kernel I/O errors on disk drop  | Disk removed in vSphere before sysfs deletion | Execute `echo 1 > /sys/block/sdX/device/delete` first |

<!-- portfolio:expanded-v2 -->

## Architecture Diagram

![LVM Migration Flow](/images/diagrams/post-framework/lvm-migration-flow.svg)

This diagram shows the migration flow from a high-risk state (application data on rootfs) to an isolated state using a dedicated Logical Volume.

## Post-Specific Engineering Lens

For this post, the primary objective is: **Change storage allocation safely with reversible checkpoints.**

### Implementation decisions for this case

- Documented three distinct operations based on real production scenarios
- Established clear pre-flight checklists for high-risk operations
- Used `rsync` incremental sync to minimize maintenance windows

### Practical command path

```bash
# Pre-change baseline
lsblk -f
lvdisplay; vgdisplay; pvdisplay

# Post-change verification
df -h
systemctl status <affected-service>
```

## Validation Matrix

| Validation goal      | What to baseline                        | What confirms success                                    |
| -------------------- | --------------------------------------- | -------------------------------------------------------- |
| Functional stability | Service status, mount points            | `systemctl --failed` empty, `df -h` shows expected sizes |
| Operational safety   | Backup exists, rollback plan documented | Backup verified restorable                               |
| Production readiness | Application starts, data accessible     | Application health check passes                          |

## Failure Modes and Mitigations

| Failure mode              | Why it appears              | Mitigation                                       |
| ------------------------- | --------------------------- | ------------------------------------------------ |
| Incorrect device target   | Similar device names        | Verify with `lsblk` before each command          |
| Insufficient free extents | Math error in size planning | Pre-calculate with `vgs` and `lvs`               |
| Rollback ambiguity        | No clear recovery path      | Document exact rollback commands before starting |

## Recruiter-Readable Impact Summary

- **Scope:** Storage operations for enterprise Linux fleet
- **Execution quality:** Clear procedures reduce incident risk
- **Outcome signal:** Reproducible runbooks for LVM operations
