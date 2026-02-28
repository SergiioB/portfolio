---
title: "PostgreSQL WAL Archiving and SELinux Conflicts"
description: "How to configure WAL archiving in PostgreSQL and resolve the 'Permission denied' SELinux errors when writing to a dedicated archive directory."
situation: "During enterprise Linux and virtualization operations across multi-team environments, this case came from work related to \"PostgreSQL WAL Archiving and SELinux Conflicts.\""
issue: "Needed a repeatable way to configure WAL archiving in PostgreSQL and resolve the 'Permission denied' SELinux errors when writing to a dedicated archive directory."
solution: "Implemented a practical runbook/automation pattern with clear safety checks, execution steps, and verification points."
usedIn: "Used in Linux platform engineering, middleware operations, and datacenter modernization projects in regulated environments."
impact: "Improved repeatability, reduced incident risk, and made operational handoffs clearer across teams."
pubDate: 2026-02-04
category: "infrastructure"
tags: ["postgresql", "selinux", "database", "backup"]
draft: false
---

## Situation
Setting up point-in-time recovery (PITR) in PostgreSQL requires configuring Write-Ahead Log (WAL) archiving. You tell PostgreSQL to copy closed WAL files to a safe backup location. 

However, when you mount a dedicated partition for these archives (e.g., `/pg_archive`), PostgreSQL often fails to write the files, logging `Permission denied` errors, even if you set the directory ownership to the `postgres` user. In Red Hat Enterprise Linux (RHEL) systems, this is almost always an SELinux issue.

## Task 1 – Configuring PostgreSQL for Archiving

First, you edit the `/pgdata/data/postgresql.conf` file to enable archiving and define the copy command.

```ini
# postgresql.conf
archive_mode = on
archive_command = 'test -f /pg_archive/%f || cp %p /pg_archive/%f'
```
*Note: The `test -f` command ensures we don't accidentally overwrite an existing archive file.*

After reloading the database configuration, PostgreSQL attempts to execute the `cp` command.

## Task 2 – The SELinux Block

If `/pg_archive` is a newly mounted Logical Volume, its default SELinux context is usually `default_t` or `unlabeled_t`. 

SELinux strictly confines the PostgreSQL process (running as `postgresql_t`). It is only allowed to read and write to directories that are explicitly labeled as database data directories. Therefore, the kernel silently blocks the `cp` command, resulting in a frustrating `Permission denied` error.

## Task 3 – Fixing the SELinux Context

You must teach SELinux that your custom `/pg_archive` directory is a legitimate PostgreSQL data location.

**1. Define the Context Rule**

Use `semanage fcontext` to map the directory and all its future contents (`(/.*)?`) to the `postgresql_db_t` context type.

```bash
sudo semanage fcontext -a -t postgresql_db_t "/pg_archive(/.*)?"
```
*Note: This command only updates the SELinux policy database; it does not change the files on disk yet.*

**2. Apply the Context**

Use `restorecon` to recursively apply the newly defined rules to the actual filesystem.

```bash
sudo restorecon -Rv /pg_archive
```

You should see output indicating the context has changed from something like `default_t` to `postgresql_db_t`.

## Conclusion

Once the SELinux context matches what the PostgreSQL process is allowed to access, the `archive_command` will succeed, and your WAL files will begin safely populating the `/pg_archive` directory. Always remember: `chown` is not enough on an SELinux-enforcing system!