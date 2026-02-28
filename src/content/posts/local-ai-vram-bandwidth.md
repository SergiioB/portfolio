---
title: "Local AI: Stop Optimizing for VRAM Capacity. Start Optimizing for Bandwidth."
description: "Why moving layers into system RAM kills token generation speed, and how the Roofline Model explains it."
situation: "During local LLM architecture and performance experiments on constrained hardware, this case came from work related to \"Local AI: Stop Optimizing for VRAM Capacity. Start Optimizing for Bandwidth..\""
issue: "Needed a repeatable way to understand why moving layers into system RAM kills token generation speed, and how the Roofline Model explains it."
solution: "Implemented a practical runbook/automation pattern with clear safety checks, execution steps, and verification points."
usedIn: "Used in local model testing to validate architecture decisions before broader rollout."
impact: "Improved throughput and decision accuracy by aligning runtime design with hardware constraints."
pubDate: 2026-02-15
category: "local-ai"
tags: ["Hardware", "Performance", "Python"]
draft: false
---

## Situation
For a long time, I was focused on one thing when running local models: making them fit. More parameters, heavier quantization, more layers pushed out of VRAM. If the model loaded, I considered it a win. 

But that changed after reading Google's paper “Challenges in Inference Hardware” and their explanation of the Roofline Model (https://arxiv.org/abs/2601.05047).

What I realized is that my GPU wasn't underpowered... it was idle. Most of the time it was waiting on system memory.

## Solution
In local AI, there's a widespread assumption that capacity is the main bottleneck. We celebrate when a model runs, even if a significant part of it lives in RAM. In practice, that decision destroys performance.

The numbers make it obvious: VRAM bandwidth sits around 1,800 GB/s on modern GPUs, while System RAM is closer to 80 GB/s. When layers spill into RAM, you slow things down, you hit a **hard bandwidth wall**, and token generation drops significantly—even though the model technically fits and runs.

Learning from my mistaken assumptions, I wrote a small Python tool (`HardwareOracle`) that enforces a simple rule: if the model can't stay in high-bandwidth memory, it doesn't load.

## Outcome
That single idea took my inference from ~4 t/s to ~55 t/s. Stop optimizing for capacity, and start optimizing for bandwidth.

*(This is part of a series of lessons learned while optimizing local LLM execution.)*

<!-- portfolio:expanded-v1 -->

## Architecture Diagram
![Local AI: Stop Optimizing for VRAM Capacity. Start Optimizing for Bandwidth. supporting diagram](/images/diagrams/post-framework/local-ai-memory.svg)

This visual summarizes the implementation flow and control points for **Local AI: Stop Optimizing for VRAM Capacity. Start Optimizing for Bandwidth.**.

## Deep Dive
This case is strongest when explained as an execution narrative instead of only a command sequence. The core focus here is **memory budgeting, latency behavior, and stable edge inference**, with decisions made to keep implementation repeatable under production constraints.

### Design choices
- Preferred deterministic configuration over one-off remediation to reduce variance between environments.
- Treated **hardware** and **performance** as the main risk vectors during implementation.
- Kept rollback behavior explicit so operational ownership can be transferred safely across teams.

### Operational sequence
1. Measure baseline runtime footprint.
2. Tune quantization/context/runtime flags.
3. Benchmark latency and memory impact.
4. Select production-safe profile.

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

