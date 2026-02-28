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

<!-- portfolio:expanded-v2 -->

## Architecture Diagram
![Local AI: Stop Optimizing for VRAM Capacity. Start Optimizing for Bandwidth. execution diagram](/images/diagrams/post-framework/local-ai-memory.svg)

This diagram visualizes the *Bandwidth Wall*, a critical concept in local AI inference based on the Roofline model.

- **GPU VRAM (The Green Zone)**: Highlights the high-performance region where all model layers reside entirely in VRAM. Taking advantage of the ~1,800 GB/s bandwidth yields a stable generation speed around ~55 tokens per second.
- **System RAM (The Red Zone)**: Illustrates the steep performance cliff that occurs the moment *any* layers spill over into system memory. Constrained by the PCIe bottleneck and ~80 GB/s bandwidth, generation speed plummets to a mere ~4 tokens per second.
- **The Core Lesson**: The visual demonstrates why optimizing for capacity (making the model fit partially in RAM) is a false economy compared to optimizing strictly for bandwidth.

## Post-Specific Engineering Lens
For this post, the primary objective is: **Balance model quality with deterministic runtime constraints.**

### Implementation decisions for this case
- Chose a staged approach centered on **Hardware** to avoid high-blast-radius rollouts.
- Used **Performance** checkpoints to make regressions observable before full rollout.
- Treated **Python** documentation as part of delivery, not a post-task artifact.

### Practical command path
These are representative execution checkpoints relevant to this post:

```bash
./llama-server --ctx-size <n> --cache-type-k q4_0 --cache-type-v q4_0
curl -s http://localhost:8080/health
python benchmark.py --profile edge
```

## Validation Matrix
| Validation goal | What to baseline | What confirms success |
|---|---|---|
| Functional stability | RSS usage, token latency, and context utilization | runtime memory stays under planned ceiling during peak context |
| Operational safety | rollback ownership + change window | decode latency remains stable across repeated runs |
| Production readiness | monitoring visibility and handoff notes | fallback model/profile activates cleanly when pressure increases |

## Failure Modes and Mitigations
| Failure mode | Why it appears in this type of work | Mitigation used in this post pattern |
|---|---|---|
| Over-allocated context | Memory pressure causes latency spikes or OOM | Tune ctx + cache quantization from measured baseline |
| Silent quality drift | Outputs degrade while latency appears fine | Track quality samples alongside perf metrics |
| Single-profile dependency | No graceful behavior under load | Define fallback profile and automatic failover rule |

## Recruiter-Readable Impact Summary
- **Scope:** optimize local inference under strict memory budgets.
- **Execution quality:** guarded by staged checks and explicit rollback triggers.
- **Outcome signal:** repeatable implementation that can be handed over without hidden steps.

