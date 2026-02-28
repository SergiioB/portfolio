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

<!-- portfolio:expanded-v1 -->

## Architecture Diagram
![Expanding an LVM Partition and Filesystem Online supporting diagram](/images/diagrams/post-framework/infrastructure-flow.svg)

This visual summarizes the implementation flow and control points for **Expanding an LVM Partition and Filesystem Online**.

## Deep Dive
This case is strongest when explained as an execution narrative instead of only a command sequence. The core focus here is **platform reliability, lifecycle controls, and repeatable Linux delivery**, with decisions made to keep implementation repeatable under production constraints.

### Design choices
- Preferred deterministic configuration over one-off remediation to reduce variance between environments.
- Treated **lvm** and **fdisk** as the main risk vectors during implementation.
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

