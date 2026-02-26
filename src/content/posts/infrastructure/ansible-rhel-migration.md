---
title: "Automating RHEL 9 Migrations with Ansible"
description: "Public-safe lessons from a large enterprise Linux migration program"
pubDate: 2025-01-15
category: infrastructure
tags: ["rhel", "ansible", "automation", "linux", "lifecycle"]
draft: false
---

# The challenge

Migrating a large fleet from RHEL 7/8 to RHEL 9 is mostly an operations design problem, not a single playbook problem. The hard part is building a repeatable process with clear gates, rollback decisions, and auditable execution.

## What mattered most

- Standardized pre-checks before touching any host
- Clear host eligibility criteria
- Idempotent automation with safe re-runs
- Observable progress and failure reasons
- Small pilot batches before broad rollout

## Pre-migration checks (example approach)

Typical checks included:

- Current OS and kernel state
- Package/repository compatibility
- Disk space and filesystem health
- Service dependencies and startup validation
- Application-specific prerequisites defined by the owning team

## Ansible pattern that worked well

Use roles for each stage and keep decision points explicit:

1. `precheck`
2. `remediation`
3. `migration`
4. `postcheck`
5. `reporting`

That structure keeps the workflow readable and makes it easier to rerun only the failed stage.

## Operational lessons

- Treat migration readiness as data, not intuition
- Build reports early (teams will ask for evidence)
- Start with conservative batch sizes
- Keep exceptions documented outside the playbook logic
- Publish rollback criteria before the first production wave

## Result

A disciplined automation workflow reduced manual effort, improved consistency across hosts, and made progress tracking easier for both engineering and stakeholders.
