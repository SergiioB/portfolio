---
title: "RK3588 LLM Performance: The Early NPU vs CPU Gap"
description: "An early bring-up benchmark on RK3588 showing how wide the gap was between CPU-only inference and the first usable NPU paths in a Discord-native agent."
situation: "A Discord-native autonomous agent was deployed on an RK3588 (Radxa ROCK 5B) and needed responsive, streaming replies for simple chat and routing decisions."
usedIn: "Early Engram bring-up on RK3588 while validating whether the board needed the NPU path for chat at all."
impact: "Established the first hard proof that NPU acceleration was not an optimization on RK3588, but the thing that made interactive chat viable at all."
pubDate: 2026-02-28
category: "local-ai"
tags: ["rk3588", "npu", "rkllm", "ollama", "benchmarks", "discord"]
draft: false
---

## Situation

On an edge device, latency is the product. A Discord bot that streams tokens back to users can feel instant or completely broken depending on the tokens/second the hardware can sustain.

On an RK3588 host (Radxa ROCK 5B), I ran a direct comparison between:

- CPU-only inference via Ollama
- NPU-accelerated inference via RKLLM

This post is best read as an early baseline, not as a description of the current routing stack. The current model split changed later as the benchmark harness and runtime matured.

## What The Benchmarks Showed

The same trivial prompt (`"What is 2+2?"`) produced dramatically different throughput:

### CPU (Ollama)

- Model: Qwen2.5 1.5B (CPU-only)
- Throughput: ~0.21 tokens/second
- End-to-end: ~37.7s for ~10 tokens

### NPU (RKLLM)

- Model: Qwen3 4B (NPU)
- Throughput: ~5.5 tokens/second

- Model: DeepSeek-R1 1.5B W8A8 (NPU)
- Throughput: ~11.2 tokens/second

In the measured comparison table, that landed at roughly:

- 26x speedup (Qwen3 4B NPU vs Qwen2.5 1.5B CPU)
- 53x speedup (DeepSeek-R1 1.5B NPU vs Qwen2.5 1.5B CPU)

## Separating "NPU Problems" from Model File Problems

Two early failures were not NPU/runtime regressions:

1. A Llama 3.1 8B W8A8 RKLLM file was `0 bytes` (corrupted/incomplete download).
2. A Llama2 13B conversion failed due to `target_platform` mismatch (converted for the wrong device, not RK3588).

The practical lesson: when RKLLM says "invalid model" or "platform mismatch", treat it as an artifact problem first.

## System + Inference Optimizations That Matter

To make measurements stable and repeatable, the benchmark run documented these baseline controls:

- CPU governor set to `performance`
- system caches cleared (`drop_caches`) before loading large models
- sanity checks on available RAM and thermals during runs
- inference bounds tuned for the benchmark (`max_new_tokens`, `max_context_len`, generous timeouts)

## Takeaway

On RK3588, CPU-only inference can be too slow even on small models for interactive chat. NPU acceleration is the enabling constraint: without it, the Discord UX degrades into 30+ second response times for trivial questions; with it, you can sustain streaming replies at multi-token-per-second throughput.
