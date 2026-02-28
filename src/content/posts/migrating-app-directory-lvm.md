---
title: "Migrating an Application Directory to a New LVM Volume"
description: "Step-by-step procedure to migrate an application directory to a new, larger logical volume with minimal downtime."
situation: "During enterprise Linux and virtualization operations across multi-team environments, this case came from work related to \"Migrating an Application Directory to a New LVM Volume.\""
issue: "Needed a repeatable way to migrate an application directory to a new, larger logical volume with minimal downtime."
solution: "Implemented a practical runbook/automation pattern with clear safety checks, execution steps, and verification points."
usedIn: "Used in Linux platform engineering, middleware operations, and datacenter modernization projects in regulated environments."
impact: "Improved repeatability, reduced incident risk, and made operational handoffs clearer across teams."
pubDate: 2026-02-10
category: "infrastructure"
tags: ["lvm", "rsync", "selinux", "migration"]
draft: false
---

## Situation
When an application's data directory (for example, `/opt`) is running out of space and resides on the root filesystem, the best approach is to migrate it to a newly provisioned Logical Volume. This process requires careful planning to minimize the application's downtime.

## Task 1 – Preparation (Before the maintenance window)

First, we create the new logical volume and sync the initial data. This allows the bulk of the data transfer to happen in the background while the application is still running.

**1. Create the Logical Volume (LV)**

```bash
# Create a 10GB LV named 'opt_vol' in the 'vg_app' volume group
lvcreate -n opt_vol -L 10G vg_app
```

**2. Format and Mount Temporarily**

```bash
mkfs.ext4 /dev/mapper/vg_app-opt_vol
mkdir /mnt/new_opt
mount /dev/mapper/vg_app-opt_vol /mnt/new_opt
```

**3. Perform the Initial Rsync**

```bash
# Copy the contents preserving permissions, ownership, and links
rsync -avz /opt/ /mnt/new_opt/
```

## Task 2 – Execution (During the maintenance window)

**1. Stop the Application Services**

Ensure all processes that write to `/opt` are stopped to prevent data inconsistency.

```bash
systemctl stop myapp-agent.service
systemctl status myapp-agent.service
```

**2. Final Synchronization**

Run `rsync` one last time to catch any changes that occurred since the initial sync. This will be very fast.

```bash
rsync -avz /opt/ /mnt/new_opt/
```

**3. The Switchover**

Unmount the temporary volume, rename the old directory as a backup, create the new mount point, and mount the new volume in its final location.

```bash
umount /mnt/new_opt
mv /opt /opt_old
mkdir /opt
mount /dev/mapper/vg_app-opt_vol /opt
```

**4. Correct Security Contexts (SELinux)**

If SELinux is enforcing, it's critical to restore the security contexts on the new volume to prevent permission denied errors.

```bash
restorecon -Rv /opt
```

**5. Make the Mount Permanent**

Add the entry to `/etc/fstab` so it persists across reboots.

```bash
# Backup fstab first
cp /etc/fstab /etc/fstab.bak

# Append the new mount
echo '/dev/mapper/vg_app-opt_vol  /opt  ext4  defaults,nodev  1 2' >> /etc/fstab
```

## Task 3 – Verification and Cleanup

**1. Start the Services**

```bash
systemctl start myapp-agent.service
systemctl status myapp-agent.service
```

**2. Cleanup (Days Later)**

After confirming everything is stable and functioning correctly for a few days, you can safely remove the old backup directory to free up space on the root filesystem.

```bash
rm -rf /opt_old
```

<!-- portfolio:expanded-v2 -->

## Architecture Diagram
![Migrating an Application Directory to a New LVM Volume execution diagram](/portfolio/images/diagrams/post-framework/lvm-migration-flow.svg)

This diagram visualizes the **Zero-Downtime LVM Migration Flow**, moving from a high-risk state where application data shares fate with `rootfs` via a shared partition, to an isolated state using a dedicated Logical Volume mounted logically to the same `/opt` path, allowing transparent application startup.

## Post-Specific Engineering Lens
For this post, the primary objective is: **Change storage allocation safely with reversible checkpoints.**

### Implementation decisions for this case
- Chose a staged approach centered on **lvm** to avoid high-blast-radius rollouts.
- Used **rsync** checkpoints to make regressions observable before full rollout.
- Treated **selinux** documentation as part of delivery, not a post-task artifact.

### Practical command path
These are representative execution checkpoints relevant to this post:

```bash
lsblk -f
lvdisplay; vgdisplay; pvdisplay
resize2fs /dev/mapper/<lv>
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
| Incorrect device target | Data loss risk increases immediately | Require device mapping verification and maintenance window gate |
| Insufficient free extents | Resize fails mid-operation | Pre-calculate growth/shrink plan before execution |
| Rollback ambiguity | Recovery time extends during incident | Create snapshot/backup and rollback notes ahead of change |

## Recruiter-Readable Impact Summary
- **Scope:** deliver Linux platform changes with controlled blast radius.
- **Execution quality:** guarded by staged checks and explicit rollback triggers.
- **Outcome signal:** repeatable implementation that can be handed over without hidden steps.

