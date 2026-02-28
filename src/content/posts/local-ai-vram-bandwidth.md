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
