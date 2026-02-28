---
title: "Troubleshooting NFS Mounts: Permission Denied and Network Routing"
description: "How to resolve 'Permission Denied' and 'RPC: Unable to receive' errors when mounting NFS shares, focusing on network routing issues."
situation: "During enterprise Linux and virtualization operations across multi-team environments, this case came from work related to \"Troubleshooting NFS Mounts: Permission Denied and Network Routing.\""
issue: "Needed a repeatable way to resolve 'Permission Denied' and 'RPC: Unable to receive' errors when mounting NFS shares, focusing on network routing issues."
solution: "Implemented a practical runbook/automation pattern with clear safety checks, execution steps, and verification points."
usedIn: "Used in Linux platform engineering, middleware operations, and datacenter modernization projects in regulated environments."
impact: "Improved repeatability, reduced incident risk, and made operational handoffs clearer across teams."
pubDate: 2026-01-18
category: "infrastructure"
tags: ["nfs", "troubleshooting", "networking", "sysadmin"]
draft: false
---

## Situation
Mounting an NFS share usually works flawlessly, but when it fails, the error messages can sometimes be vague. Recently, I encountered an issue where a client application server could not mount an NFS share from our storage server, returning errors like `Permission Denied` or `RPC: Unable to receive`. 

Here is how I traced the root cause to a network routing issue and resolved it.

## The Symptoms

Attempting to mount the NFS path failed with:

```text
mount.nfs4: access denied by server while mounting nfs-server.example.internal:/srv/app_share
```

This immediately indicated a server-side rejection rather than a client-side configuration error.

## Task 1 – Investigating the Server Side

The first step is to check the export configuration on the NFS server.

1.  Log into the NFS storage server.
2.  Check the `/etc/exports` or `/etc/exports.d/*.exports` files.

I verified that the export existed:
```text
/srv/app_share 
    host-example-01(rw,no_root_squash)
```

The client hostname (`host-example-01`) was explicitly listed. So why was it being denied?

## Task 2 – Identifying the Network Routing Issue

The critical issue lay in how the NFS server was resolving the client's hostname, and conversely, how the client was reaching the server.

In environments with multiple networks (e.g., a Production Network and a Backup/Management Network), traffic might take an unexpected route.

By pinging the client from the server, I noticed that `host-example-01` was resolving to its **Backup Network IP** (e.g., `198.51.100.x`), whereas the infrastructure rules required NFS traffic to traverse the high-bandwidth **Production Network** (e.g., `192.0.2.x`). 

The NFS server was receiving the connection request from the `192.0.2.x` interface, but its internal DNS resolution for `host-example-01` pointed to the `198.51.100.x` interface. Because the IPs didn't match, the NFS server denied the request.

## Task 3 – The Resolution

To fix this, we need to explicitly use the IP addresses bound to the correct network interfaces.

### On the Server Side

Modify the exports file to authorize the specific Production Network IP of the client, rather than relying on hostname resolution which might return the wrong interface.

```text
# /etc/exports.d/app.exports
/srv/app_share 
    192.0.2.102(rw,no_root_squash)
```

Apply the changes immediately without restarting the NFS service:
```bash
sudo exportfs -ra
```

### On the Client Side

Instead of using the storage server's generic hostname (which might also resolve to a management IP), explicitly use the storage server's Production IP in the mount command or `/etc/fstab`.

```bash
# Ensure the mount point exists
mkdir -p /mnt/shared_data

# Mount using the explicit Production IP of the storage server
sudo mount -t nfs4 -o rw,bg,hard,nointr,tcp,timeo=600,_netdev 
  192.0.2.50:/srv/app_share /mnt/shared_data
```

## Summary

When dealing with `Permission Denied` on NFS mounts, always verify:
1. Is the client explicitly allowed in `/etc/exports`?
2. Did you run `exportfs -ra` after updating the exports file?
3. **Crucially:** Is the traffic traversing the intended network interface? Use IP addresses instead of hostnames in your configurations if you have a complex multi-homed network setup.

<!-- portfolio:expanded-v1 -->

## Architecture Diagram
![Troubleshooting NFS Mounts: Permission Denied and Network Routing supporting diagram](/images/diagrams/post-framework/infrastructure-flow.svg)

This visual summarizes the implementation flow and control points for **Troubleshooting NFS Mounts: Permission Denied and Network Routing**.

## Deep Dive
This case is strongest when explained as an execution narrative instead of only a command sequence. The core focus here is **platform reliability, lifecycle controls, and repeatable Linux delivery**, with decisions made to keep implementation repeatable under production constraints.

### Design choices
- Preferred deterministic configuration over one-off remediation to reduce variance between environments.
- Treated **nfs** and **troubleshooting** as the main risk vectors during implementation.
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

