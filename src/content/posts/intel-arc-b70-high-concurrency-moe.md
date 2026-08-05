---
title: "Breaking the 67 tok/s Barrier: Optimizing Intel Arc Pro B70 for High-Concurrency MoE Inference"
description: "How to tune llama.cpp on Intel Arc Pro B70 SYCL to double aggregate throughput under massive parallel loads with Mixture of Experts (MoE) models — and the 2026-08 head-to-head that settles the vLLM debate: continuous batching makes vLLM win at 16+ concurrent users (153 t/s) while llama.cpp wins every single-stream test (6.3x)."
situation: "I needed to deploy a high-concurrency LLM inference server capable of handling multiple autonomous AI agents simultaneously, using an Intel Arc Pro B70 (32GB VRAM) and a 35B Mixture of Experts (MoE) model."
issue: "Baseline sequential generation hard-capped at ~67 tokens/second due to memory bandwidth starvation. Furthermore, naive scaling with large contexts (131K) and unoptimized batching caused immediate VRAM exhaustion (OOM) and server timeouts under load. Later (2026-08): the community insisted vLLM was strictly better — a claim that needed a head-to-head on the same card."
solution: "Diagnosed hardware bottlenecks and optimized the llama.cpp SYCL stack. Disabled heavy DNN operations (`GGML_SYCL_DISABLE_DNN=1`), quantized the KV Cache (`Q5_0`/`Q4_1`), and saturated the GPU using deep micro-batching (`-b 8192 -ub 4096`) under a 32-parallel request load. In 2026-08, stood up the full vLLM XPU path (self-built native MXFP4 checkpoint + 7 engine patches) and benchmarked both engines at 1/4/8/16 concurrent users on the same hardware."
usedIn: "Live fleet-level inference for autonomous agent workflows and concurrent LLM benchmarking."
impact: "Achieved a 128% increase in aggregate throughput (153 tok/s) under sustained heavy load. Maintained exceptional thermal stability (GPU 69°C / VRAM 70°C at 149.5 Watts), proving the B70's viability for high-density enterprise inference. The 2026-08 vLLM head-to-head adds the missing half: at 16 concurrent users vLLM MXFP4 reaches 153.4 gen t/s aggregate (the famous '150 t/s' claim, reproduced) while llama.cpp saturates at ~85-92 gen t/s — but at 1 user llama.cpp is 6.3x faster."
pubDate: 2026-07-05
updatedDate: 2026-08-05
category: ["local-ai", "b70"]
tags:
  [
    "sycl",
    "llama-cpp",
    "intel-arc",
    "hardware-tuning",
    "machine-learning",
    "ai",
    "local-ai",
    "vllm",
    "mxfp4",
    "xpu",
  ]
draft: false
amazonUrl: https://go.sergiiob.dev/arc-pro
---

> **Update (2026-08-05):** this post now includes the vLLM XPU MXFP4 head-to-head —
> the multi-user answer to "is vLLM better?". See [the vLLM post](/posts/intel-arc-b70-vllm-question-tested)
> for the full seven-patch engineering story; the results chapter below is self-contained.

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

> **Note (2026-08):** `GGML_SYCL_DISABLE_DNN` no longer exists in current builds
> (b10255+). Modern guidance per our ops documentation: never disable SYCL
> optimization — the current flag is `GGML_SYCL_ENABLE_OPT` (default 1), and
> disabling it causes a large decode regression. This section documents the
> July 2026 finding; it is historical.

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
- **Aggregate Prefill Throughput:** **~383.4 tok/s**

_(Note on Prefill Degradation: Why does prefill drop so sharply under load? In single-stream, the GPU digests a contiguous block of tokens via a single massive matrix multiplication, writing linearly to one KV cache. In batch=32 concurrency, the GPU's memory controller is forced to perform scattered "random writes" across 32 separate KV caches located in different segments of VRAM. This destroys sequential memory bandwidth efficiency, causing the aggregate prefill speed to plummet compared to its peak capability)._

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

## The vLLM Challenge — Head-to-Head on the Same Card (2026-08-05)

The community answer to "how do you serve many users on a B70" is always _vLLM_. The
claims are specific — 150 tok/s on one B70 — so I stood up the full path and measured
both engines under identical load: same HTTP API, same prompt mix, 512 output tokens
per request, same 165W cap, one card.

### Why the claims exist

vLLM implements **continuous (in-flight) batching** and paged KV caching: concurrent
requests are packed into a single GPU pass, finished ones leave mid-batch, new ones
join instantly. The GPU stays saturated instead of idling between sequential requests.
llama.cpp's parallel slots, by contrast, serialize slot decode — aggregate throughput
saturates quickly, and per-user latency degrades linearly with load.

### Decode — aggregate throughput under concurrency (Δ vs llama.cpp)

| Users | vLLM MXFP4 gen t/s | llama.cpp Q4_K_XL gen t/s | Δ                   |
| ----- | ------------------ | ------------------------- | ------------------- |
| 1     | 10.4               | 65.3                      | llama.cpp **+528%** |
| 4     | 39.7               | 77.9                      | llama.cpp +96%      |
| 8     | 77.8               | 92.4                      | llama.cpp +19%      |
| 16    | **153.4**          | 85.0                      | **vLLM +80%**       |

The crossover is somewhere between 8 and 16 concurrent users. The famous "150 t/s"
number is vLLM at ~16 users — reproduced on our card, aggregate, not single-stream.

Per-user latency tells the same story: vLLM's TPOT stays flat (96 → 104 ms from 1 to
16 users); llama.cpp's degrades linearly (15 → 51 → 87 → 188 ms).

### Prefill — where vLLM's XMX kernels shine

| Config                          | pp4K       | pp32K     | pp128K    |
| ------------------------------- | ---------- | --------- | --------- |
| llama.cpp b10255 SYCL (Q4_K_XL) | 2,128 t/s  | 1,871 t/s | 1,211 t/s |
| vLLM 0.17 XPU MXFP4             | ~1,738 t/s | —         | —         |

vLLM is within 20% of llama.cpp here; community head-to-heads on non-hybrid models
show vLLM winning prefill by [2.4-15×](https://github.com/PMZFX/intel-arc-pro-b70-benchmarks/blob/master/engine-comparison.md)
thanks to XMX/DPAS flash-attention kernels in vllm-xpu-kernels. (pp32K/pp128K for vLLM
were not measured in this run.)

### Cross-hardware context

| Setup  | Engine            | Model                   | Users | Aggregate out tok/s | Source                                                                      |
| ------ | ----------------- | ----------------------- | ----- | ------------------- | --------------------------------------------------------------------------- |
| 1× B70 | llama.cpp SYCL    | Qwen3.6-35B-A3B Q4_K_XL | 16    | 146.8 (85 gen)      | this post                                                                   |
| 1× B70 | vLLM XPU MXFP4    | Qwen3.6-35B-A3B MXFP4   | 16    | 264.9 (153.4 gen)   | this post                                                                   |
| 1× B70 | vLLM (claimed)    | Qwen3.6-35B-A3B MXFP4   | ~16   | ~150 gen            | community threads                                                           |
| 2× B70 | vLLM XPU FP8 TP2  | Qwen3-30B-A3B           | 50    | 912                 | [Level1Techs](https://github.com/PMZFX/intel-arc-pro-b70-benchmarks)        |
| 4× B70 | vLLM XPU INT4 TP4 | MiniMax M2.7            | —     | 89                  | [b70-optimization-lab](https://github.com/steveseguin/b70-optimization-lab) |

### How the vLLM setup works

The path has three parts — and each one was a real project:

**1. The checkpoint.** Public MXFP4 checkpoints use the compressed-tensors layout
vLLM's XPU kernel rejects. I built a native-format checkpoint myself: BF16 dense
projections (5.9 GB) + fused packed MXFP4 experts (16.5 GB), dequant verified against
BF16 ground truth (MSE 8.8e-5). 22.4 GB total — fits 32 GB.

**2. The engine patches.** `intel/vllm:0.17.0-xpu`'s MXFP4 MoE path is written for
gpt-oss. Seven in-container patches were needed (full list in
[the vLLM post](/posts/intel-arc-b70-vllm-question-tested)): 2D per-expert loader
support with w1/w3 half-offsets, missing scale-key mapping entries, the
silu-vs-swiglu_oai activation gate (the XPU kernel supports silu; the Python gate
doesn't), XPU device contexts in the linear-attention path, a flash-attention
contiguity check, and hybrid block-size alignment (the XPU FA kernel only supports
block sizes 64/128).

**3. The launch:**

```bash
docker run --rm -p 8001:8000 --device /dev/dri \
  -v /mnt/models2/Qwen3.6-35B-A3B-MXFP4-native:/model:ro \
  -v ./vllm017-full-patch.py:/patch.py:ro \
  -e VLLM_TARGET_DEVICE=xpu -e ZE_FLAT_DEVICE_HIERARCHY=COMPOSITE \
  -e ZE_AFFINITY_MASK=0 -e PYTORCH_ALLOC_CONF="expandable_segments:True" \
  --entrypoint bash intel/vllm:0.17.0-xpu \
  -c "python3 /patch.py && exec vllm serve /model --quantization mxfp4 \
      --enforce-eager --max-model-len 32768 --gpu-memory-utilization 0.95 \
      --block-size 64 --port 8000 --served-model-name Qwen3.6-35B-A3B-MXFP4"
```

`--block-size 64` is mandatory (XPU FA kernel constraint). `--enforce-eager` avoids a
torch.compile error on this stack. Output was verified correct (math, knowledge,
prose) before benchmarking.

### Which engine, when

- **1-4 concurrent users** (interactive chat, agent backends): **llama.cpp** — 2-6×
  faster per request, 6× better latency, quantized GGUF memory efficiency.
- **8+ concurrent users** (multi-user API, batch/RAG, agent fleets): **vLLM XPU** —
  continuous batching wins, aggregate scales with users, latency stays flat. The
  patched container + native MXFP4 checkpoint are the proven recipe.
- Multi-GPU (2-4× B70): vLLM's tensor parallelism is the only serious option
  (llama.cpp layer-splitting doesn't speed up decode).

Caveat on our numbers: the Qwen3.6-35B-A3B-**UD** model's hybrid linear-attention
layers run generic triton kernels on XPU, which caps vLLM decode. A non-hybrid model
would widen vLLM's concurrency advantage further.

## Official Benchmark Runs

The optimizations were successfully verified and submitted to the public Localmaxxing Hardware Leaderboard. You can view the full telemetry and official run cards below:

### High Concurrency (Fleet Simulation)

This run demonstrates the sustained 164.5 tok/s decode performance under heavy parallel load.
[![LocalMaxxing High Concurrency Card](https://www.localmaxxing.com/api/og?run=cmr90watg00jaqr01jx0foi3r)](https://www.localmaxxing.com/en/runs/cmr90watg00jaqr01jx0foi3r)

### Single-Stream (Peak Prefill)

This run demonstrates the raw 1,242 tok/s prefill capability of the B70 when unhindered by context-switching overhead.
[![LocalMaxxing Single-Stream Card](https://www.localmaxxing.com/api/og?run=cmr916in500jkqr01hfsj5m38)](https://www.localmaxxing.com/en/runs/cmr916in500jkqr01hfsj5m38)
