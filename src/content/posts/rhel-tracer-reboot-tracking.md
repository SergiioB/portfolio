---
title: "Tracking Required Reboots with RHEL Tracer"
description: "How to use the tracer utility to identify which services need restart after package updates, and plan reboots strategically across server tiers."
situation: "After monthly patching, we never knew which servers actually needed reboots. We either rebooted everything unnecessarily or missed critical restarts, causing application issues later."
issue: "No visibility into which services had pending restarts, leading to either unnecessary reboots or missed restarts that caused instability."
solution: "Implemented tracer integration to identify pending restarts, combined with a tiered reboot strategy based on application criticality."
usedIn: "Monthly patching cycle for 200+ RHEL servers at a German bank, reducing unnecessary reboots by 60%."
impact: "Reduced unplanned reboots by 60%, improved application stability post-patch, and enabled informed reboot scheduling."
pubDate: 2026-02-01
category: "infrastructure"
tags: ["rhel", "tracer", "patching", "lifecycle"]
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

<!-- portfolio:expanded-v2 -->

## Architecture Diagram
![Tracking Required Reboots in RHEL with Tracer execution diagram](/images/diagrams/post-framework/infrastructure-flow.svg)

This diagram supports **Tracking Required Reboots in RHEL with Tracer** and highlights where controls, validation, and ownership boundaries sit in the workflow.

## Post-Specific Engineering Lens
For this post, the primary objective is: **Harden service integration points and reduce operational surprises.**

### Implementation decisions for this case
- Chose a staged approach centered on **rhel** to avoid high-blast-radius rollouts.
- Used **patching** checkpoints to make regressions observable before full rollout.
- Treated **sysadmin** documentation as part of delivery, not a post-task artifact.

### Practical command path
These are representative execution checkpoints relevant to this post:

```bash
systemctl status <service>
ss -tulpn
journalctl -u <service> -n 200 --no-pager
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
| Auth or trust mismatch | Service looks up but rejects real traffic | Validate identity chain and clock/DNS assumptions |
| Policy-control conflict | SELinux/firewall blocks valid paths | Capture allow-list requirements before rollout |
| Partial restart strategy | Config is applied but not activated safely | Use staged restart with health gates |

## Recruiter-Readable Impact Summary
- **Scope:** deliver Linux platform changes with controlled blast radius.
- **Execution quality:** guarded by staged checks and explicit rollback triggers.
- **Outcome signal:** repeatable implementation that can be handed over without hidden steps.

