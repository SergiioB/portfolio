---
title: "Tracking Required Reboots with RHEL Tracer"
description: "How to use the tracer utility to identify which services need restart after package updates, and plan reboots strategically across server tiers."
situation: "After monthly patching, we never knew which servers actually needed reboots. We either rebooted everything unnecessarily or missed critical restarts, causing application issues later."
usedIn: "Monthly patching cycle for 200+ RHEL servers at a German bank, reducing unnecessary reboots by 60%."
impact: "Reduced unplanned reboots by 60%, improved application stability post-patch, and enabled informed reboot scheduling."
pubDate: 2026-02-01
category: "infrastructure"
tags: ["rhel", "tracer", "patching", "lifecycle"]
draft: false
---

## Situation

After running a `dnf update` on a fleet of Linux servers, one of the most common questions is: _"Does this server actually need a reboot?"_ While kernel updates obviously require a reboot, sometimes updates to core libraries (like `glibc` or `openssl`) mean that running services are using outdated, deleted files in memory.

Instead of guessing or rebooting blindly, we use **Tracer**.

## What is Tracer?

Tracer is a utility that identifies which running applications are using outdated files and need to be restarted, or if the entire system requires a reboot to apply kernel or core library updates.

## Task 1 – Installation

In a Red Hat environment (especially when managed by Red Hat Satellite), you can install the `katello-host-tools-tracer` package.

```bash
sudo dnf install katello-host-tools-tracer
```

_Tip: Add this package to your standard server provisioning Ansible role to ensure it's present on all new builds._

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

