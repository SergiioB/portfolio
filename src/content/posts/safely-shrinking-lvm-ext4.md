---
title: "Safely Shrinking an LVM ext4 Filesystem"
description: "A careful, step-by-step guide on how to shrink an ext4 filesystem and its underlying Logical Volume (LV) to reclaim space."
situation: "During enterprise Linux and virtualization operations across multi-team environments, this case came from work related to \"Safely Shrinking an LVM ext4 Filesystem.\""
issue: "Needed a repeatable way to shrink an ext4 filesystem and its underlying Logical Volume (LV) to reclaim space."
solution: "Implemented a practical runbook/automation pattern with clear safety checks, execution steps, and verification points."
usedIn: "Used in Linux platform engineering, middleware operations, and datacenter modernization projects in regulated environments."
impact: "Improved repeatability, reduced incident risk, and made operational handoffs clearer across teams."
pubDate: 2026-01-25
category: "infrastructure"
tags: ["lvm", "storage", "ext4", "sysadmin"]
draft: false
---

## Situation
While expanding a Logical Volume (LVM) and its filesystem can usually be done "online" without unmounting, **shrinking** is a different story. Shrinking an ext4 filesystem and its LV requires unmounting the volume, making it an offline operation. If done incorrectly, you risk severe data loss. 

Always ensure you have a **full backup** before proceeding with a shrink operation.

In this scenario, we want to shrink the volume mounted at `/data` (which is mapped to `/dev/mapper/vg_data-lv_data`) down to exactly **10G**.

## Task 1 – Unmount the Filesystem

You must unmount the filesystem before you can resize it. If the filesystem is in use, you'll need to stop the services accessing it first.

```bash
# Unmount the directory
sudo umount /data
```

*(If you get a "target is busy" error, use `lsof +D /data` or `fuser -m /data` to find and terminate the processes holding the filesystem open).*

## Task 2 – Check the Filesystem for Errors

Before resizing, it is mandatory to force a filesystem check to ensure data integrity.

```bash
# Check the ext4 filesystem 
sudo e2fsck -f /dev/mapper/vg_data-lv_data
```

## Task 3 – Shrink the Filesystem

We first shrink the filesystem. It is highly recommended to shrink the filesystem to a size *slightly smaller* than your final target for the Logical Volume. This provides a safety margin. Since our target LV size is 10G, we will shrink the filesystem to 9.5G.

```bash
# Shrink the filesystem to 9.5G
sudo resize2fs /dev/mapper/vg_data-lv_data 9.5G
```

## Task 4 – Shrink the Logical Volume (LV)

Now that the filesystem is safely small enough, we can reduce the size of the Logical Volume container to our final target of 10G.

```bash
# Reduce the LV to the final 10G size
sudo lvreduce -L 10G /dev/mapper/vg_data-lv_data
```
*Note: The system will ask for confirmation and warn you that this operation can destroy data. Type `y` to proceed.*

## Task 5 – Extend the Filesystem to Fill the LV

We shrank the filesystem a bit too much (9.5G) to be safe. Now, we expand it so it perfectly fits the newly resized 10G Logical Volume. Running `resize2fs` without a size parameter automatically fills the available space.

```bash
# Extend the filesystem to perfectly match the LV size
sudo resize2fs /dev/mapper/vg_data-lv_data
```

## Task 6 – Remount and Verify

Finally, mount the filesystem back to its original location and verify the new size.

```bash
# Mount the filesystem again
sudo mount /data

# Verify the final size
df -h /data
lsblk
```