---
title: "Stretched Networks and Leaf-Spine Architecture"
description: "Understanding stretched Layer 2 networks across data centers, leaf-spine fabric design, and the trade-offs for enterprise applications."
situation: "A disaster recovery project required stretching Layer 2 networks between primary and DR data centers. The network team proposed a leaf-spine architecture, but application teams were concerned about latency and complexity."
issue: "Lack of understanding about stretched networks, leaf-spine trade-offs, and how application traffic patterns would be affected."
solution: "Documented the stretched network architecture, analyzed application traffic flows, and provided clear guidance on which applications were suitable for stretched L2 vs. Layer 3 approaches."
usedIn: "Disaster recovery architecture at a German bank, supporting SAP and critical middleware across two data centers."
impact: "Enabled informed architecture decisions, reduced project risk by clarifying trade-offs, and provided a reference for future DR projects."
pubDate: 2026-02-28
category: "infrastructure"
tags: ["networking", "leaf-spine", "disaster-recovery", "architecture"]
draft: false
---

## Situation

In modern enterprise data centers, the traditional three-tier architecture (Core, Distribution, Access) is increasingly being replaced by **Leaf-Spine** topologies. This shift is driven by the need for high-bandwidth, low-latency "east-west" traffic (server-to-server) and the requirement for "stretched networks" that allow virtual machines to migrate between physical locations without changing their IP addresses.

## The Leaf-Spine Topology

In a Leaf-Spine architecture, every "Leaf" switch (top-of-rack) is connected to every "Spine" switch in the network core.

- **Leaf Layer**: These switches connect to servers, storage arrays (via Fiber Channel or Ethernet), and other edge devices.
- **Spine Layer**: This acts as the high-speed backbone. Because every leaf is only one hop away from any other leaf, the latency is highly predictable.

### Why use this for Stretched Networks?

A "stretched network" (or Layer 2 extension) allows a VLAN to span multiple physical data centers or zones (e.g., migrating a machine from `ZONE-A` to `ZONE-B`).

In our environment, we use a **DWDM** (Dense Wavelength Division Multiplexing) layer to connect leaf switches over long distances. If a machine moves from one zone to another, the traffic traverses the spine, goes through the core, and then onto the DWDM link.

## Verification: The Gateway Test

The ultimate test of a correctly configured stretched network is seamless connectivity after a migration.

1.  **Migrate**: Move a Virtual Machine from `Site-01` to `Site-02` (using tools like vMotion).
2.  **Ping**: Immediately ping the default gateway.
3.  **Validate**: If the ping succeeds without dropping more than a single packet, the L2 extension is functioning correctly, and the ARP tables have updated across the leaf-spine fabric.

## IP Address Management (IPAM)

With stretched networks, keeping track of where IPs are "active" vs "reserved" is critical. We use **Netbox** as our source of truth.

- **Prefixes**: We filter by "Active" prefixes to see current utilization.
- **Exports**: Exporting prefix lists to CSV allows us to audit stretched VLANs and ensure that our leaf-spine routing rules match the reality of our IP allocations.

By combining Leaf-Spine stability with DWDM connectivity, we achieve a highly resilient infrastructure that supports the dynamic movement of workloads required by modern cloud-native applications.

<!-- portfolio:expanded-v2 -->

## Architecture Diagram

![Understanding Stretched Networks and Leaf-Spine Architecture execution diagram](/images/diagrams/post-framework/leaf-spine-stretched.svg)

This diagram visualizes the **Leaf-Spine Stretched Network Architecture** bridging two geographical data center zones (`SITE-A` and `SITE-B`). The high-bandwidth DWDM link extends the Layer 2 domain (VLAN 200), allowing seamless workloads migration (like `vMotion`) while retaining the exact same internal IP mappings.

## Post-Specific Engineering Lens

For this post, the primary objective is: **Harden service integration points and reduce operational surprises.**

### Implementation decisions for this case

- Chose a staged approach centered on **networking** to avoid high-blast-radius rollouts.
- Used **architecture** checkpoints to make regressions observable before full rollout.
- Treated **leaf-spine** documentation as part of delivery, not a post-task artifact.

### Practical command path

These are representative execution checkpoints relevant to this post:

```bash
systemctl status <service>
ss -tulpn
journalctl -u <service> -n 200 --no-pager
```

## Validation Matrix

| Validation goal      | What to baseline                                              | What confirms success                                         |
| -------------------- | ------------------------------------------------------------- | ------------------------------------------------------------- |
| Functional stability | service availability, package state, SELinux/firewall posture | `systemctl --failed` stays empty                              |
| Operational safety   | rollback ownership + change window                            | `journalctl -p err -b` has no new regressions                 |
| Production readiness | monitoring visibility and handoff notes                       | critical endpoint checks pass from at least two network zones |

## Failure Modes and Mitigations

| Failure mode             | Why it appears in this type of work        | Mitigation used in this post pattern              |
| ------------------------ | ------------------------------------------ | ------------------------------------------------- |
| Auth or trust mismatch   | Service looks up but rejects real traffic  | Validate identity chain and clock/DNS assumptions |
| Policy-control conflict  | SELinux/firewall blocks valid paths        | Capture allow-list requirements before rollout    |
| Partial restart strategy | Config is applied but not activated safely | Use staged restart with health gates              |

## Recruiter-Readable Impact Summary

- **Scope:** deliver Linux platform changes with controlled blast radius.
- **Execution quality:** guarded by staged checks and explicit rollback triggers.
- **Outcome signal:** repeatable implementation that can be handed over without hidden steps.
