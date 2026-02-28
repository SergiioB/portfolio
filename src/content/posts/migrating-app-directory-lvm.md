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

<!-- portfolio:expanded-v1 -->

## Architecture Diagram
![Migrating an Application Directory to a New LVM Volume supporting diagram](/images/diagrams/post-framework/infrastructure-flow.svg)

This visual summarizes the implementation flow and control points for **Migrating an Application Directory to a New LVM Volume**.

## Deep Dive
This case is strongest when explained as an execution narrative instead of only a command sequence. The core focus here is **platform reliability, lifecycle controls, and repeatable Linux delivery**, with decisions made to keep implementation repeatable under production constraints.

### Design choices
- Preferred deterministic configuration over one-off remediation to reduce variance between environments.
- Treated **lvm** and **rsync** as the main risk vectors during implementation.
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

