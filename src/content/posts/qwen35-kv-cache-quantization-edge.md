---
title: "KV Cache Quantization on Qwen 3.5 (27B): Cutting Memory Without Breaking Latency"
description: "A small, practical benchmark showing how quantizing the attention KV cache can materially reduce RAM usage on edge hardware."
situation: "A local Discord agent needed to run larger CPU GGUF models (Qwen 3.5 27B) while staying within a realistic RAM budget on an ARM64 host."
issue: "Large models can be loadable, but the KV cache can still consume meaningful memory as context grows, limiting concurrency and increasing OOM risk."
solution: "Benchmarked KV cache quantization modes (default vs q8 vs q4) at a fixed context window and compared startup time, request latency, RSS, and KV cache footprint."
usedIn: "Used in Engram AI benchmark runs for CPU GGUF inference (llama.cpp) on ARM64."
impact: "Identified `q4` as the best current tradeoff in the measured run, reducing KV cache from 64 MiB to 18 MiB while keeping request latency roughly flat."
pubDate: 2026-02-28
category: "local-ai"
tags: ["llama.cpp", "gguf", "qwen", "kv-cache", "quantization", "arm64"]
draft: false
---

## Situation
On edge devices, memory headroom is what keeps systems stable under load. Even when a model loads successfully, the attention KV cache is a second budget you have to manage, especially as you increase context length or concurrency.

This benchmark focused on a single question:
How much memory can KV cache quantization save on a large CPU GGUF model, and does it distort latency in a way that matters?

## Benchmark Setup
* Model: `Qwen_Qwen3.5-27B-Q4_K_M.gguf`
* Context: `1024`
* `max_tokens`: `8`
* `no_warmup`: `true`

## Results (Default vs q8 vs q4)
In the captured run:

* Default KV cache:
  * Startup: `90272ms`
  * Request: `28100ms`
  * RSS: `17080.8MB`
  * KV: `64MiB`

* `q8` (K=q8_0, V=q8_0):
  * Startup: `83879ms`
  * Request: `28127ms`
  * RSS: `17562MB`
  * KV: `34MiB`

* `q4` (K=q4_0, V=q4_0):
  * Startup: `95805ms`
  * Request: `28061ms`
  * RSS: `17571.6MB`
  * KV: `18MiB`

## Recommendation
For this host and context size, `q4` was the best current tradeoff:
* KV cache footprint dropped from `64MiB` to `18MiB`.
* Request latency stayed essentially unchanged (~28s for the same short decode).

## Why This Matters
KV cache savings compound when:
* You increase context length.
* You run parallel sessions.
* You want predictable memory behavior across "burst" usage.

Even small per-request KV reductions can be the difference between stable multi-session inference and intermittent OOM failures.

