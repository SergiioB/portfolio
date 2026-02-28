---
title: "Tracking Required Reboots in RHEL with Tracer"
description: "How to use katello-host-tools-tracer to reliably determine if a Linux server requires a reboot or daemon reload after patching."
situation: "During enterprise Linux and virtualization operations across multi-team environments, this case came from work related to \"Tracking Required Reboots in RHEL with Tracer.\""
issue: "Needed a repeatable way to use katello-host-tools-tracer to reliably determine if a Linux server requires a reboot or daemon reload after patching."
solution: "Implemented a practical runbook/automation pattern with clear safety checks, execution steps, and verification points."
usedIn: "Used in Linux platform engineering, middleware operations, and datacenter modernization projects in regulated environments."
impact: "Improved repeatability, reduced incident risk, and made operational handoffs clearer across teams."
pubDate: 2026-01-28
category: "infrastructure"
tags: ["rhel", "patching", "sysadmin", "satellite"]
draft: false
---

## Situation
After running a `dnf update` on a fleet of Linux servers, one of the most common questions is: *"Does this server actually need a reboot?"* While kernel updates obviously require a reboot, sometimes updates to core libraries (like `glibc` or `openssl`) mean that running services are using outdated, deleted files in memory. 

Instead of guessing or rebooting blindly, we use **Tracer**.

## What is Tracer?

Tracer is a utility that identifies which running applications are using outdated files and need to be restarted, or if the entire system requires a reboot to apply kernel or core library updates.

## Task 1 – Installation

In a Red Hat environment (especially when managed by Red Hat Satellite), you can install the `katello-host-tools-tracer` package.

```bash
sudo dnf install katello-host-tools-tracer
```
*Tip: Add this package to your standard server provisioning Ansible role to ensure it's present on all new builds.*

## Task 2 – Using Tracer Locally

Once installed, you can simply run `tracer` on the command line.

```bash
sudo tracer
```

It will output a list of applications that need to be restarted. For example, it might tell you that `sshd` and `httpd` need a restart because `openssl` was updated. 

If the kernel, `systemd`, or `dbus` was updated, Tracer will explicitly tell you that a full system reboot is required.

## Task 3 – Integration with Satellite

The true power of Tracer shines when integrated with Red Hat Satellite. The `katello-host-tools-tracer` package automatically reports the server's state back to the Satellite server.

In the Satellite Web UI, you can now easily filter your host inventory using the search query:

```text
trace_status = reboot_needed
```

This allows you to quickly generate a list of exactly which servers in your environment need a reboot window, taking the guesswork out of your patching cycles.