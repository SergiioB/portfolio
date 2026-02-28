---
title: "Expanding an LVM Partition and Filesystem Online"
description: "A guide on how to resize a partition using fdisk, expand the LVM, and resize the filesystem without needing a reboot."
situation: "During enterprise Linux and virtualization operations across multi-team environments, this case came from work related to \"Expanding an LVM Partition and Filesystem Online.\""
issue: "Needed a repeatable way to resize a partition using fdisk, expand the LVM, and resize the filesystem without needing a reboot."
solution: "Implemented a practical runbook/automation pattern with clear safety checks, execution steps, and verification points."
usedIn: "Used in Linux platform engineering, middleware operations, and datacenter modernization projects in regulated environments."
impact: "Improved repeatability, reduced incident risk, and made operational handoffs clearer across teams."
pubDate: 2026-02-20
category: "infrastructure"
tags: ["lvm", "fdisk", "storage", "sysadmin"]
draft: false
---

## Situation
Often, you might find yourself in a situation where a disk has been expanded at the hypervisor level, but you don't have utilities like `growpart` available to easily resize the partition. You need to expand the partition, the physical volume, the logical volume, and the filesystem safely without downtime.

## Task 1 – Resizing the partition with fdisk

If `growpart` is not an option, the standard method in RHEL-based systems is using `fdisk`. This is a safe procedure as long as you **do not remove the LVM signature** when prompted.

Assuming we want to resize `/dev/sda3` on disk `/dev/sda`:

```bash
fdisk /dev/sda
```

Inside the interactive `fdisk` prompt, follow this sequence:

1. `p`: (Optional) Print the partition table to confirm the starting sector of `sda3`.
2. `d`: Delete a partition.
3. `3`: Select partition 3. *(Don't worry, the data is safe in the disk blocks).*
4. `n`: Create a new partition.
5. `p`: Primary.
6. `3`: Keep it as partition 3.
7. **First sector**: Press **ENTER** to use the default value (it must be exactly the same start sector it had before).
8. **Last sector**: Press **ENTER** to use the new end of the disk (incorporating the extra space).
9. **IMPORTANT**: If prompted with a message like:
   `Partition #3 contains a LVM2_member signature. Do you want to remove the signature? [Y]es/[N]o:`
   Type **N** (No). If you answer yes, you will lose access to the LVM data.
10. `t`: Change partition type.
11. `3`: Select partition 3.
12. `8e` (or search for Linux LVM in the hex codes): Mark the partition as LVM.
13. `w`: Write changes and exit.

## Task 2 – Updating the partition table in the Kernel

To ensure the operating system sees the new partition size without rebooting, use `partprobe`:

```bash
partprobe /dev/sda
```

## Task 3 – Expanding LVM and the Filesystem

Now that the physical partition is larger, we need to expand the software layers.

1. **Expand the Physical Volume (PV):**

```bash
pvresize /dev/sda3
```

2. **Verify the new free space:**

```bash
vgs
```
You should now see the additional capacity listed under `VFree`.

3. **Expand the Logical Volume (LV) and the Filesystem simultaneously:**

You can use the `-r` (resizefs) flag with `lvextend` to automatically resize the underlying filesystem (ext4, xfs, etc.) as part of the LV expansion.

```bash
# Example expanding the root logical volume to use 100% of the new free space
lvextend -r -l +100%FREE /dev/mapper/vg_system-root
```

The filesystem is now expanded online, and the new space is immediately available.

<!-- portfolio:expanded-v2 -->

## Architecture Diagram
![Expanding an LVM Partition and Filesystem Online execution diagram](/images/diagrams/post-framework/infrastructure-flow.svg)

This diagram supports **Expanding an LVM Partition and Filesystem Online** and highlights where controls, validation, and ownership boundaries sit in the workflow.

## Post-Specific Engineering Lens
For this post, the primary objective is: **Change storage allocation safely with reversible checkpoints.**

### Implementation decisions for this case
- Chose a staged approach centered on **lvm** to avoid high-blast-radius rollouts.
- Used **fdisk** checkpoints to make regressions observable before full rollout.
- Treated **storage** documentation as part of delivery, not a post-task artifact.

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

