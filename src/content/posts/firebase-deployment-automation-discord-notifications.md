---
title: "Automating Firebase Deployments: Multi-Account Routing and Discord Notifications"
description: "A documented deployment automation pattern for Firebase: scripted CLI operations, account profiles, environment routing, and Discord webhook alerts."
situation: "A multi-environment Firebase setup needed repeatable deployments across accounts/projects without manually reconfiguring the CLI each time."
issue: "Manual Firebase deployments are easy to mis-target (wrong project/hosting target), hard to audit, and slow to coordinate without realtime status notifications."
solution: "Centralized deployment configuration into an `accounts.json` profile, added API endpoints for account switching, and integrated Discord webhooks for start/success/failure notifications with log snippets."
usedIn: "Used in RADXA AI Suite deployment automation documentation and tooling."
impact: "Reduced human error risk during deploys and made deployments observable via structured configuration and Discord notifications."
pubDate: 2026-02-28
category: "cloud"
tags: ["firebase", "devops", "automation", "discord", "deployments"]
draft: false
---

## Situation
When one machine or one backend service deploys to multiple Firebase projects/environments, the biggest risk is targeting the wrong project.

The documented pattern in RADXA AI Suite is to treat deployment as a configuration-driven workflow instead of a set of manual CLI steps.

## The Configuration: `accounts.json`
Instead of relying on whoever last ran `firebase login`, deployments are described via an explicit account profile file:
* account id + email
* Firebase `project_id` and friendly `project_name`
* environment routing (`production`, `staging`, `development`)
* per-environment hosting targets
* optional Discord webhook settings per account

This makes “where does this deploy go?” answerable by reading a single file.

## API-Driven Account Switching
The guide also documents an API endpoint that selects which account/profile to deploy with, so automation can switch contexts deliberately rather than implicitly.

## Discord Webhook Notifications
Deploy status becomes team-visible by emitting Discord webhook messages:
* notify on start/success/failure
* include logs (with a configurable max line count)
* allow distinct channels per project/account

The result is a deployment flow where:
1. the target environment is chosen from config
2. the Firebase CLI runs with the intended context
3. the outcome is broadcast to Discord with enough log context for quick triage

