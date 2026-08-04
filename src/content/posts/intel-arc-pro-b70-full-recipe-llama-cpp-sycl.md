---
title: "Intel Arc Pro B70: The Complete Local LLM Recipe"
description: "Everything you need to run production LLM inference on Intel Arc Pro B70 with llama.cpp SYCL — the build, runtime flags, all 5 model configs with measured VRAM boundaries, power tiers, KV cache KL-divergence analysis, and the b9853→b10222→master 0804 improvement data. 72.6 t/s MoE decode, 2128 t/s prefill, 512K context."
situation: "The B70 documentation was scattered across 28 files with conflicting KV configs, stale build versions, and unverified claims. I needed one definitive guide that a newcomer could follow end-to-end."
issue: "Running LLMs on Intel Arc requires SYCL-specific knowledge that doesn't exist in one place: which cmake flags, which env vars, which KV cache config, which power cap, which context length per model. Getting any of these wrong means either crashes, bad quality, or leaving performance on the table."
solution: "Fact-checked every claim against llama.cpp PRs and external benchmarks, ran a full boundary sweep measuring VRAM at every quant/context combo, A/B tested two SYCL builds, and consolidated everything into one recipe with the exact commands and measured numbers."
usedIn: "Production daily-driver inference server on Intel Arc Pro B70 32GB. Serves ThinkingCap-Qwen3.6-27B and Qwen3.6-35B-A3B MoE via OpenAI-compatible API, bridged to Telegram through Radxa ROCK 5B+."
impact: "MoE 35B at 512K context on master 0804: 72.6 t/s decode, 2128 t/s prefill (+26-29% over b10222, +140% at 32K via #25874). Dense 27B with MTP-4: 24-29 t/s. Every VRAM boundary measured, not estimated."
pubDate: 2026-08-04
category: ["local-ai", "infrastructure", "b70"]
amazonUrl: https://go.sergiiob.dev/arc-pro
tags:
  [
    "local-ai",
    "llama.cpp",
    "sycl",
    "intel-arc",
    "arc-pro-b70",
    "battlemage",
    "xe2",
    "xmx",
    "oneapi",
    "level-zero",
    "qwen",
    "moe",
    "mtp",
    "kv-cache",
    "kv-cache-quantization",
    "power-scaling",
    "benchmark",
    "gguf",
  ]
draft: false
---

> **Update (2026-08-04):** Production has since been promoted to a master build
> (`build-sycl-0804`, b10255+) with #25874 (quantized-KV XMX flash attention) and #25880.
> Measured results: MoE prefill **2128 t/s @ pp4096** (was 1691), **1871 t/s @ pp32K**
> (was ~780, +140%), decode **72.6 t/s**. Dense prefill 936 t/s @ pp4096. See
> [Intel Arc Pro B70: +140% Long-Context Prefill from a llama.cpp Master Build](/posts/intel-arc-b70-sycl-xmx-quantized-kv-prefill).
> Everything else in this recipe (KV config, power tiers, VRAM boundaries) is unchanged.

## Situation

The Intel Arc Pro B70 is a 32 GB GDDR6 discrete GPU based on the Xe2 (Battlemage) architecture. It has 32 Xe-Cores, 256 XMX engines, 608 GB/s bandwidth, and 367 INT8 TOPS. At its price point, it's the cheapest 32 GB VRAM card you can buy for local LLM inference.

Hardware reference: [Intel Arc Pro B70 on Amazon](https://go.sergiiob.dev/arc-pro).

But "32 GB VRAM" alone doesn't tell you what you can run. The real questions are:

- **Which models fit, and at what context?**
- **What KV cache config gives near-lossless quality?**
- **How much does power capping matter?**
- **Which SYCL build flags and env vars are required?**
- **What decode/prefill speed can you expect?**

This post answers all of them with measured data, not estimates.

## The hardware

| Spec            | Value                                       |
| --------------- | ------------------------------------------- |
| GPU             | Intel Arc Pro B70 (Battlemage / Xe2)        |
| VRAM            | 32,656 MiB visible GDDR6                    |
| Bandwidth       | 608 GB/s, 256-bit bus                       |
| Compute         | 32 Xe-Cores, 256 XMX engines, 367 INT8 TOPS |
| Power           | 1× 8-pin, TDP ~300W (stock cap 230W)        |
| CPU (test host) | AMD Ryzen 7 5700X3D, 32 GB RAM              |
| OS              | Ubuntu 26.04                                |

## The software stack

```bash
# oneAPI activation (required before every session)
source /opt/intel/oneapi/setvars.sh --force > /dev/null 2>&1

# Environment variables (set before launching server)
export SYCL_PI_LEVEL_ZERO_USE_IMMEDIATE_COMMANDLISTS=0
export SYCL_CACHE_PERSISTENT=0
export SYCL_DEVICE_FILTER=level_zero
export ZE_FLAT_DEVICE_HIERARCHY=COMPOSITE
export ONEAPI_DEVICE_SELECTOR=level_zero:0
export ZE_AFFINITY_MASK=0
```

⚠️ **Do NOT set `GGML_SYCL_ENABLE_OPT=0`** (historically `GGML_SYCL_DISABLE_OPT=1`). Disabling SYCL optimization causes a large decode regression. Default is ON — leave it.

### Build flags (llama.cpp SYCL)

```bash
cmake .. \
  -DGGML_SYCL=ON \
  -DGGML_SYCL_TARGET=INTEL \
  -DGGML_SYCL_DNN=ON \
  -DGGML_SYCL_F16=ON \
  -DCMAKE_C_COMPILER=icx \
  -DCMAKE_CXX_COMPILER=icpx \
  -DCMAKE_BUILD_TYPE=Release
```

Current production build: **master 0804** (`071327508`, b10255+, `build-sycl-0804`), compiled with IntelLLVM 2026.0.0. Prior production: b10222 (`a7a6d0d26`).

### b9853 → b10222 improvement (measured A/B)

The upstream SYCL commits between the old and new builds are real and measurable:

#### Prefill throughput at multiple prompt sizes (Qwen 35B Q4 MoE, 128K)

| Prompt size | b9853    | b10222   | Δ          |
| ----------- | -------- | -------- | ---------- |
| pp512       | 963 t/s  | 1041 t/s | **+8.1%**  |
| pp4096      | 1525 t/s | 1621 t/s | **+6.3%**  |
| pp8192      | 1375 t/s | 1551 t/s | **+12.8%** |

#### Token generation (decode)

| Test           | b9853    | b10222   | Δ          |
| -------------- | -------- | -------- | ---------- |
| tg128 (decode) | 61.8 t/s | 69.5 t/s | **+12.5%** |

_Qwen3.6-35B-A3B Q4_K_XL, q8_0-q4_1 KV, FA on, 150W, llama-bench 5 reps._

The gains come from: oneDNN XMX flash attention (#25222, up to 4.26× prefill at long context), oneMKL GEMM FA (#25025), fused top-k MoE (#25217), RMS_NORM fusion (#26015), and contiguous elementwise fast path (#25946). The improvement scales with prompt length — longer prompts benefit more from the fused attention kernels.

### b10222 → master 0804 improvement (measured A/B, 2026-08-04)

The next step: #25874 extends oneDNN SDPA to **quantized KV** (Q4_0-Q8_0), so XMX flash
attention finally runs on our q8_0/q4_1 cache, and #25880 fixes a multi-turn corruption
bug. Same-day A/B, same machine, 150W, q8_0-q4_1 KV, llama-bench.

#### Prefill throughput at multiple prompt sizes (Qwen 35B Q4 MoE)

| Prompt size | b10222   | master 0804  | Δ         |
| ----------- | -------- | ------------ | --------- |
| pp512       | 1061 t/s | 1134 t/s     | +6.9%     |
| pp4096      | 1691 t/s | **2128 t/s** | **+26%**  |
| pp8192      | 1620 t/s | **2085 t/s** | **+29%**  |
| pp32768     | ~780 t/s | **1871 t/s** | **+140%** |
| pp65536     | 986 t/s  | **1504 t/s** | **+52%**  |
| pp131072    | 673 t/s  | **1211 t/s** | **+80%**  |

_Dense 27B Q4: pp4096 795 → **936 t/s** (+18%), pp8192 758 → 921 t/s (+21%),
pp65536 417 → **651 t/s** (+56%), pp131072 288 → **546 t/s** (+90%)._
_The TILE→XMX win grows with context: +140% at 32K, +80-90% at 128K. Rows ≤32K from
Run 9 (r3); ≥64K from Run 11 (r2, same config). b10222 collapses at long context
(1620 → 673 t/s) while 0804 declines gracefully (2085 → 1211 t/s)._

#### Token generation (decode)

| Test                         | b10222    | master 0804  | Δ     |
| ---------------------------- | --------- | ------------ | ----- |
| tg128 — MoE 35B Q4           | 70.1 t/s  | **72.6 t/s** | +3.6% |
| tg128 — Dense 27B Q4 (base)  | 20.8 t/s  | **21.3 t/s** | +2.4% |
| tg128 — Dense 27B Q4 (MTP-4) | 24-29 t/s | 24-29 t/s    | ~tie  |

_Qwen3.6-35B-A3B Q4_K_XL + ThinkingCap-Qwen3.6-27B Q4_K_M, q8_0-q4_1 KV, FA on, 150W,
llama-bench 3 reps. Decode stays bandwidth-bound (608 GB/s) — the win is prefill, and it
grows with context (+140% at 32K). Full details: [the upgrade post](/posts/intel-arc-b70-sycl-xmx-quantized-kv-prefill)._

### Cross-hardware comparison: 35B MoE class

| Hardware             | VRAM  | Model                | Decode       | Prefill (pp4K) | Max ctx  | Source                                                        |
| -------------------- | ----- | -------------------- | ------------ | -------------- | -------- | ------------------------------------------------------------- |
| **Arc Pro B70 32GB** | 32 GB | Qwen 35B Q4 MoE      | **72.6 t/s** | **2128 t/s**   | **512K** | this post (master 0804)                                       |
| **Arc Pro B70 32GB** | 32 GB | Qwen 35B Q5 MoE      | ~68 t/s      | ~1621 t/s      | 256K     | b10222-era, not re-run                                        |
| RX 7800 XT 16GB      | 16 GB | Gemma-4-21B Q4 MoE   | 33 t/s       | 106 t/s        | 32K      | [my bench](/posts/rx7800-xt-llama-cpp-benchmarks-moe-context) |
| RX 7800 XT 16GB      | 16 GB | GLM-4.7-REAP-23B IQ4 | 59.8 t/s     | 81.7 t/s       | 32K      | [my bench](/posts/rx7800-xt-llama-cpp-benchmarks-moe-context) |

_The B70's XMX engines give a massive prefill advantage (2128 t/s vs 82-106 t/s on
RDNA3). The 7800 XT wins on decode for small models (fewer bytes/token) but caps at
32K context with 16 GB VRAM. The B70 reaches 512K — 16× more context._

## KV cache: q8_0 K + q4_1 V

The fleet standard, validated against [llama.cpp #23470](https://github.com/ggml-org/llama.cpp/discussions/23470):

```bash
-fa on -ctk q8_0 -ctv q4_1
```

**Why asymmetric?** K determines attention routing (which tokens to attend to); V is averaged. K is sensitive to quantization (KL ~5.5 at q4_0 — catastrophic); V tolerates it. Result: ~50% VRAM savings vs FP16 with near-lossless quality (KL ~0.003).

| K        | V        | KL-div       | Verdict                  |
| -------- | -------- | ------------ | ------------------------ |
| **q8_0** | **q4_1** | **~0.003**   | **Fleet standard**       |
| q5_0     | q4_1     | ~0.006-0.008 | Acceptable               |
| q4_0     | any      | ~5.5         | **Never — catastrophic** |

## All model configs with measured VRAM boundaries

### Dense: ThinkingCap-Qwen3.6-27B (with MTP-4)

| Quant  | Weights | Max ctx  | VRAM free | Decode (base) | w/MTP-4 | Prefill (pp4096) |
| ------ | ------- | -------- | --------- | ------------- | ------- | ---------------- |
| Q4_K_M | 16 GB   | **256K** | 0.9 GB    | **21.3 t/s**  | ~29 t/s | **936 t/s**      |
| Q5_K_M | 19 GB   | **200K** | 2.7 GB    | 16.2 t/s      | ~24 t/s | 706 t/s          |
| Q6_K   | 21 GB   | **128K** | 0.7 GB    | 16.0 t/s      | ~24 t/s | —                |

_Q4_K_M row = master 0804 (Run 9, llama-bench). Q5_K_M / Q6_K rows = b10222-era
(boundary sweep, listed context); not re-run on 0804._

### MoE: Qwen3.6-35B-A3B

| Quant   | Weights | Max ctx  | VRAM free | Decode       | Prefill      |
| ------- | ------- | -------- | --------- | ------------ | ------------ |
| Q4_K_XL | 21 GB   | **512K** | 1.6 GB    | **72.6 t/s** | **2128 t/s** |
| Q5_K_M  | 25 GB   | **256K** | 2.2 GB    | ~68 t/s      | ~1621 t/s    |

_Q4_K_XL row = master 0804 (Run 9, llama-bench, pp4096). Q5_K_M row = b10222-era;
not re-run on 0804._

**The key insight:** MoE uses 3.8× less KV cache than dense (1,847 MiB vs 6,960 MiB per 128K) because KV scales with attention size, not total params. A 25 GB MoE reaches 512K while a 16 GB dense can't pass 256K.

## Power tiers

| Tier      | Watts | Use case                                        | Temp    |
| --------- | ----- | ----------------------------------------------- | ------- |
| eco       | 150   | **Daily default.** All MoE models.              | 63-67°C |
| efficient | 165   | Dense 27B MTP-4 — peak efficiency (0.148 t/s/W) | 68°C    |
| balanced  | 180   | Sustained dense inference                       | 71°C    |
| burst     | 230   | Short bursts only. +9°C over 165W               | 77°C    |

```bash
# Set power cap (microwatts)
echo 150000000 | sudo tee /sys/class/hwmon/hwmon4/power1_cap
# Values: 150000000=150W  165000000=165W  180000000=180W  230000000=230W
```

Both dense and MoE are **bandwidth-bound** at 608 GB/s. Dense benefits from power scaling (frequency → bandwidth); MoE self-limits to ~130-140W regardless of cap.

## Production server launch (MoE, the throughput champion)

```bash
source /opt/intel/oneapi/setvars.sh --force > /dev/null 2>&1
export SYCL_PI_LEVEL_ZERO_USE_IMMEDIATE_COMMANDLISTS=0
export SYCL_CACHE_PERSISTENT=0
export SYCL_DEVICE_FILTER=level_zero
export ZE_FLAT_DEVICE_HIERARCHY=COMPOSITE
export ONEAPI_DEVICE_SELECTOR=level_zero:0
export ZE_AFFINITY_MASK=0

echo 150000000 | sudo tee /sys/class/hwmon/hwmon4/power1_cap

~/llama.cpp/build-sycl-0804/bin/llama-server \
  -m ~/models-cache/Qwen3.6-35B-A3B-UD-Q4_K_XL.gguf \
  --host 0.0.0.0 --port 8765 \
  -ngl 99 -ncmoe 0 \
  -fa on -ctk q8_0 -ctv q4_1 \
  -c 524288 -b 8192 -ub 4096 \
  -t 8 --no-mmap
```

**Expected (master 0804):** 72.6 t/s decode, 2128 t/s prefill (pp4096), 512K context, 1.6 GB VRAM free.

## Runtime flags handbook

| Flag        | Value                  | Why                                             |
| ----------- | ---------------------- | ----------------------------------------------- |
| `-ngl 99`   | All layers on GPU      | Full GPU offload                                |
| `-ncmoe 0`  | All MoE experts on GPU | Critical for MoE — don't offload experts to CPU |
| `-fa on`    | Flash attention        | Required for quantized KV cache                 |
| `-ctk q8_0` | K cache = 8-bit        | Near-lossless (KL ~0.003)                       |
| `-ctv q4_1` | V cache = 4-bit        | V tolerates aggressive quantization             |
| `-b 8192`   | Batch size             | Optimal for SYCL prefill                        |
| `-ub 4096`  | Micro-batch            | Do NOT reduce — smaller values hurt prefill     |
| `-t 8`      | CPU threads            | For prompt processing                           |
| `--no-mmap` | Keep in VRAM           | Don't page model to disk                        |

For MTP-4 speculative decoding (dense only):

```bash
--spec-type draft-mtp --spec-draft-n-max 4 --spec-draft-p-min 0.75
```

## Benchmarking correctly

**Use `llama-bench`, not the HTTP API.** The HTTP API has a shell-quoting bug that silently truncates prompts to 4 tokens, producing fake ~75 t/s prefill. `llama-bench` generates synthetic prompts at exact lengths:

```bash
llama-bench \
  -m MODEL.gguf -ngl 99 -ncmoe 0 \
  -fa 1 -ctk q8_0 -ctv q4_1 \
  -p 512,4096,8192 -n 128 -r 5 -d 0 \
  -b 8192 -ub 4096 -t 8 -dev SYCL0
```

This is the same method used for [localmaxxing.com](https://www.localmaxxing.com) submissions (validated at 1601 t/s prefill on Qwen 35B Q5).

**Never load a single GGUF larger than 30 GB** with `-ngl 99`. The B70 has 32,656 MiB VRAM; a 34 GB model (like Laguna-S-2.1 IQ2_XXS) overflows and causes a **hard system crash** — not a cleanable OOM. Use `-ngl <N` for partial CPU offload if needed.

## VRAM and power monitoring

```bash
# VRAM (debugfs)
sudo cat /sys/kernel/debug/dri/0000:0b:00.0/tile0/vram_mm
# Look for: visible_avail (free MiB), usage (bytes used)

# Power cap (microwatts)
cat /sys/class/hwmon/hwmon4/power1_cap

# Temperature (millidegrees — use temp2_input, NOT temp1_input)
cat /sys/class/hwmon/hwmon4/temp2_input
```

## What this replaces

This post supersedes the earlier B70 posts which used the old q5_0-q4_1 KV config and build b9851/b9853. The key changes:

1. **KV cache upgraded** to q8_0 K + q4_1 V (KL ~0.003 vs ~0.008)
2. **Build advanced** to master 0804 (b10222 was +6-13%; 0804 adds +26-29% prefill, +140% at 32K via #25874)
3. **VRAM boundaries measured** (not estimated) for every quant/context combo
4. **All claims fact-checked** against llama.cpp PRs, community benchmarks, and KL-divergence data
