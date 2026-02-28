---
title: "Troubleshooting 'su' Authentication: The PAM system-auth Pitfall"
description: "How to resolve 'Permission Denied' errors during 'su' attempts by identifying conflicts between Active Directory and PAM modules."
situation: "During enterprise Linux and virtualization operations across multi-team environments, this case came from work related to \"Troubleshooting 'su' Authentication: The PAM system-auth Pitfall.\""
issue: "Needed a repeatable way to resolve 'Permission Denied' errors during 'su' attempts by identifying conflicts between Active Directory and PAM modules."
solution: "Implemented a practical runbook/automation pattern with clear safety checks, execution steps, and verification points."
usedIn: "Used in Linux platform engineering, middleware operations, and datacenter modernization projects in regulated environments."
impact: "Improved repeatability, reduced incident risk, and made operational handoffs clearer across teams."
pubDate: 2026-01-17
category: "infrastructure"
tags: ["linux", "pam", "security", "sssd", "troubleshooting"]
draft: false
---

## Situation
A common issue when integrating Linux servers with Active Directory (AD) is that users may find themselves unable to use the `su` command to switch to another account, even if they provide the correct password. They are often met with a generic `Permission Denied` error.

This usually isn't a password issue, but a configuration conflict in the **Pluggable Authentication Modules (PAM)** stack.

## The Problem: Broken system-auth

On many RHEL-based systems, the `/etc/pam.d/su` configuration references a global `system-auth` file. 

The issue often arises when `system-auth` includes modules that are not appropriate for a server environment, such as `pam_fprintd.so` (fingerprint authentication). If the fingerprint service is "broken" or the hardware is missing, the entire authentication chain can fail before it even checks the user's password.

## The Fix: Switching to password-auth

The most reliable fix is to point the `su` service to the `password-auth` stack, which is the same stack used by SSH. Since you know SSH logins are working, using this stack ensures consistency.

### Step 1: Modify PAM configuration

Edit `/etc/pam.d/su` and replace the references to `system-auth` with `password-auth`.

```text
# /etc/pam.d/su
auth        substack      password-auth
account     substack      password-auth
session     substack      password-auth
```

### Step 2: Restrict 'su' to the Wheel Group

If you want to ensure only authorized administrators can use `su`, ensure the `pam_wheel.so` module is correctly configured to check the local `wheel` group.

```text
auth           required        pam_wheel.so use_uid
```

## SSSD Access Provider Issues

Sometimes, the password is correct and PAM is clean, but the **SSSD** (System Security Services Daemon) is still blocking the switch because of AD-specific rules.

If the user is valid but AD is blocking the service locally, check your `/etc/sssd/sssd.conf`. If you have a complex GPO or access control setup that is causing issues, you can temporarily change the access provider to `simple` to isolate the problem:

```ini
# /etc/sssd/sssd.conf
[domain/yourdomain]
# Change from 'ad' to 'simple' for testing
access_provider = simple
simple_allow_groups = wheel, linux_admins_ad
```

## Summary

When `su` fails on an AD-joined Linux server:
1.  Check the logs: `journalctl -u sssd` and `/var/log/secure`.
2.  Look for "broken" modules in `system-auth` (like fingerprints).
3.  Align your `su` configuration with the working `password-auth` stack.
4.  Verify that SSSD isn't over-filtering access via its `access_provider`.