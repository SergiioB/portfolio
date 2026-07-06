---
title: "Breaking the 67 tok/s Barrier: Optimizing Intel Arc Pro B70 for High-Concurrency MoE Inference"
description: "How to tune llama.cpp on Intel Arc Pro B70 SYCL to double aggregate throughput under massive parallel loads with Mixture of Experts (MoE) models."
situation: "I needed to deploy a high-concurrency LLM inference server capable of handling multiple autonomous AI agents simultaneously, using an Intel Arc Pro B70 (32GB VRAM) and a 35B Mixture of Experts (MoE) model."
issue: "Baseline sequential generation hard-capped at ~67 tokens/second due to memory bandwidth starvation. Furthermore, naive scaling with large contexts (131K) and unoptimized batching caused immediate VRAM exhaustion (OOM) and server timeouts under load."
solution: "Diagnosed hardware bottlenecks and optimized the llama.cpp SYCL stack. Disabled heavy DNN operations (`GGML_SYCL_DISABLE_DNN=1`), quantized the KV Cache (`Q5_0`/`Q4_1`), and saturated the GPU using deep micro-batching (`-b 8192 -ub 4096`) under a 32-parallel request load."
usedIn: "Live fleet-level inference for autonomous agent workflows and concurrent LLM benchmarking."
impact: "Achieved a 128% increase in aggregate throughput (153 tok/s) under sustained heavy load. Maintained exceptional thermal stability (GPU 69°C / VRAM 70°C at 149.5 Watts), proving the B70's viability for high-density enterprise inference."
pubDate: 2026-07-06
category: "infrastructure"
tags: ["sycl", "llama-cpp", "intel-arc", "hardware-tuning", "machine-learning"]
draft: false
amazonUrl: https://go.sergiiob.dev/arc-pro
---

## The Concurrency Challenge

When building infrastructure for autonomous AI agents, single-user latency is less critical than aggregate throughput. A system fielding requests from dozens of background workers needs to maximize the total number of tokens generated per second.

The **Intel Arc Pro B70 (32GB VRAM)** is a beast of a card, but testing it out-of-the-box with a large Mixture of Experts model (`Ornith-1.0-35B-Q5_K_M`) using upstream `llama.cpp` on the SYCL backend revealed a hard ceiling. No matter how the prompt was structured, single-stream generation capped at **~67 tokens/second**. The bottleneck wasn't compute (TeraFLOPS); it was the memory bandwidth required to ferry 24GB of model weights to the compute units for every single token generated.

Attempting to naively increase concurrency (`--parallel 32`) with large context windows (131K) immediately crashed the server due to VRAM exhaustion.

## Identifying the Bottlenecks

A systematic benchmark suite was developed to profile the hardware under load. Three core issues were identified:

1. **Memory Bandwidth Starvation:** Generating tokens sequentially wastes compute. The GPU waits for memory.
2. **MoE SYCL Regressions:** The Intel DNN operations (Deep Neural Network library) were causing performance regressions specifically on Mixture of Experts architectures.
3. **KV Cache Pressure:** 32 concurrent clients with 131K context using standard FP16 caching consumed massive amounts of VRAM and memory bandwidth, causing timeouts.

## The Optimization Stack

To break the 67 tok/s barrier, the execution environment was heavily modified:

### 1. Bypassing DNN Overhead

By disabling Intel's DNN library operations, the model fell back to optimized standard matrix multiplications which performed better for this specific MoE architecture on the SYCL backend:

```bash
export GGML_SYCL_DISABLE_DNN=1
export ONEAPI_DEVICE_SELECTOR=level_zero:0
```

### 2. Forcing Deep Micro-Batching

To ensure the hardware was actually computing tokens in parallel rather than serializing them, aggressive batch sizes were forced onto the execution graph:

```bash
-b 8192 -ub 4096 --parallel 32
```

This forces the GPU to process up to 4096 tokens simultaneously in a single physical pass.

### 3. KV Cache Compression

To relieve the memory bandwidth pressure of 32 concurrent requests, the KV cache was quantized:

```bash
-ctk q5_0 -ctv q4_1
```

## Benchmark Results: A Fair Comparison

It is crucial to distinguish between high-concurrency throughput and single-stream burst speeds. Mixing the two paints an inaccurate picture of hardware capability. Context switching between 32 parallel requests naturally throttles prefill efficiency.

### Scenario A: High Concurrency (Fleet Simulation)

Under a sustained attack of 32 concurrent clients generating text simultaneously (capped at 165W, 2400MHz):

- **Aggregate Decode Throughput:** **152.9 tok/s** (+128% over single-stream)
- **Aggregate Prefill Throughput:** **~500.1 tok/s** (Constrained by context switching between 32 different KV caches)
- **Hardware Telemetry:** 149.5 Watts, GPU 69°C, VRAM 70°C

### Scenario B: Single-Stream Peak Prefill

To measure the raw memory bandwidth capacity for prompt ingestion, a continuous 3,000-token prompt block was fed to the GPU without concurrency (`batch=1`):

- **Peak Prefill Speed:** **1,242.3 tok/s**
- **Single-Stream Decode:** **~67.6 tok/s** (The hard ceiling for sequential generation)

![B70 Bottleneck Analysis](/images/diagrams/new/b70-bottleneck-analysis.svg)

## The Frequency & Power Fallacy

We tested unlocking the B70's factory frequency limits:

- `max_freq` increased from 2400 MHz to 2800 MHz.
- `power1_cap` increased from 165W to 230W.

Under the same 32-concurrent-client load, telemetry showed the GPU instantly consumed the extra headroom, jumping to **196W** sustained draw and hitting **73°C**.

However, the aggregate generation throughput only increased from **152.9 tok/s to 164.5 tok/s (+8%)**.

![Power Scaling Graph](/images/diagrams/new/b70-power-scaling.svg)

This proves definitively that the hardware is bound by **Memory Bandwidth**, not compute cycles. Spending 33% more electrical power for an 8% gain in throughput is a terrible trade-off for a 24/7 inference server. The original configuration (2400 MHz capped at 165W) remains the absolute 'sweet spot' for this card.

**Hardware recommended in this build:** [Intel Arc Pro B70](https://go.sergiiob.dev/arc-pro)

## Official Benchmark Runs

The optimizations were successfully verified and submitted to the public Localmaxxing Hardware Leaderboard. You can view the full telemetry and official run cards below:

### High Concurrency (Fleet Simulation)

This run demonstrates the sustained 164.5 tok/s decode performance under heavy parallel load.
[![LocalMaxxing High Concurrency Card](https://www.localmaxxing.com/api/og?run=cmr90watg00jaqr01jx0foi3r)](https://www.localmaxxing.com/en/runs/cmr90watg00jaqr01jx0foi3r)

### Single-Stream (Peak Prefill)

This run demonstrates the raw 1,242 tok/s prefill capability of the B70 when unhindered by context-switching overhead.
[![LocalMaxxing Single-Stream Card](https://www.localmaxxing.com/api/og?run=cmr916in500jkqr01hfsj5m38)](https://www.localmaxxing.com/en/runs/cmr916in500jkqr01hfsj5m38)
