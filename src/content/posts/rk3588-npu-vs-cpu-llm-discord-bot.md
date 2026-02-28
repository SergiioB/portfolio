---
title: "RK3588 LLM Performance: NPU vs CPU in a Discord Agent"
description: "Benchmarking local LLM inference on RK3588 and why NPU acceleration (RKLLM) is the difference between real-time chat and unusable latency."
situation: "A Discord-native autonomous agent was deployed on an RK3588 (Radxa ROCK 5B) and needed responsive, streaming replies for simple chat and routing decisions."
issue: "CPU-only inference on small models was too slow for interactive UX, and some NPU model runs initially failed for non-runtime reasons (corrupted downloads or wrong target platform conversions)."
solution: "Benchmarked CPU (Ollama) vs NPU (RKLLM), applied system and inference parameter optimizations, and documented failure modes to distinguish model-file issues from NPU/runtime issues."
usedIn: "Used in Engram AI (local-first Discord bot) running on RK3588."
impact: "Validated that NPU-accelerated models deliver ~26x to ~53x higher throughput than CPU-only runs for comparable prompts, making real-time Discord interaction feasible."
pubDate: 2026-02-28
category: "local-ai"
tags: ["rk3588", "npu", "rkllm", "ollama", "benchmarks", "discord"]
draft: false
---

## Situation
On an edge device, latency is the product. A Discord bot that streams tokens back to users can feel instant or completely broken depending on the tokens/second the hardware can sustain.

On an RK3588 host (Radxa ROCK 5B), I ran a direct comparison between:
* CPU-only inference via Ollama
* NPU-accelerated inference via RKLLM

## What The Benchmarks Showed
The same trivial prompt (`"What is 2+2?"`) produced dramatically different throughput:

### CPU (Ollama)
* Model: Qwen2.5 1.5B (CPU-only)
* Throughput: ~0.21 tokens/second
* End-to-end: ~37.7s for ~10 tokens

### NPU (RKLLM)
* Model: Qwen3 4B (NPU)
* Throughput: ~5.5 tokens/second

* Model: DeepSeek-R1 1.5B W8A8 (NPU)
* Throughput: ~11.2 tokens/second

In the measured comparison table, that landed at roughly:
* 26x speedup (Qwen3 4B NPU vs Qwen2.5 1.5B CPU)
* 53x speedup (DeepSeek-R1 1.5B NPU vs Qwen2.5 1.5B CPU)

## Separating "NPU Problems" from Model File Problems
Two early failures were not NPU/runtime regressions:

1. A Llama 3.1 8B W8A8 RKLLM file was `0 bytes` (corrupted/incomplete download).
2. A Llama2 13B conversion failed due to `target_platform` mismatch (converted for the wrong device, not RK3588).

The practical lesson: when RKLLM says "invalid model" or "platform mismatch", treat it as an artifact problem first.

## System + Inference Optimizations That Matter
To make measurements stable and repeatable, the benchmark run documented these baseline controls:
* CPU governor set to `performance`
* system caches cleared (`drop_caches`) before loading large models
* sanity checks on available RAM and thermals during runs
* inference bounds tuned for the benchmark (`max_new_tokens`, `max_context_len`, generous timeouts)

## Takeaway
On RK3588, CPU-only inference can be too slow even on small models for interactive chat. NPU acceleration is the enabling constraint: without it, the Discord UX degrades into 30+ second response times for trivial questions; with it, you can sustain streaming replies at multi-token-per-second throughput.

<!-- portfolio:expanded-v1 -->

## Architecture Diagram
![RK3588 LLM Performance: NPU vs CPU in a Discord Agent supporting diagram](/images/diagrams/post-framework/local-ai-memory.svg)

This visual summarizes the implementation flow and control points for **RK3588 LLM Performance: NPU vs CPU in a Discord Agent**.

## Deep Dive
This case is strongest when explained as an execution narrative instead of only a command sequence. The core focus here is **memory budgeting, latency behavior, and stable edge inference**, with decisions made to keep implementation repeatable under production constraints.

### Design choices
- Preferred deterministic configuration over one-off remediation to reduce variance between environments.
- Treated **rk3588** and **npu** as the main risk vectors during implementation.
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

