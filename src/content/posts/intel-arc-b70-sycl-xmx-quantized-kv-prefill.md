---
title: "Intel Arc Pro B70: +140% Long-Context Prefill from a llama.cpp Master Build"
description: "A single llama.cpp upgrade — oneDNN SDPA extended to quantized KV (#25874) — takes the B70's long-context prefill from ~780 to 1871 t/s at 32K, +26-29% at 4-8K, and fixes a multi-turn corruption bug (#25880). Measured A/B on Qwen3.6-35B MoE and dense 27B, then promoted to production."
situation: "The B70's production build (b10222) already ran oneDNN XMX flash attention via #25222 — but only on FP16 KV caches. Our fleet standard is q8_0 K + q4_1 V quantized KV (50% VRAM savings, KL ~0.003), which silently fell back to the slow TILE attention path. Prefill was the bottleneck: at 32K tokens it collapsed to ~780 t/s while the card is capable of 2000+."
issue: "Long-context prefill was 2.4× slower than it should have been, and b10222 carried a multi-turn corruption bug (SDPA scale use-after-return, #25880). Two upstream PRs that fix exactly this — #25874 (quantized-KV XMX FA) and #25880 — shipped after our pinned release, so the fixes were not in the production build."
solution: "Rebuilt llama.cpp SYCL from upstream master (commit 071327508, b10255+) into build-sycl-0804 with the same config (-O3 -DNDEBUG, DNN=ON, F16=ON, GRAPH=ON, oneAPI 2026.0). Ran a same-day A/B against b10222 on both MoE 35B and dense 27B, then promoted the strictly-better build to production via a single config value (profiles.json runtime.binary), backed up and health-verified."
usedIn: "Production llama-server on Intel Arc Pro B70 32GB (Ubuntu 26.04, llama.cpp SYCL), serving ThinkingCap-Qwen3.6-27B (MTP-4) and Qwen3.6-35B-A3B MoE via OpenAI-compatible API to the Radxa ROCK 5B+ bridge."
impact: "+140% prefill at 32K context (780 → 1871 t/s), +26-29% at 4K-8K on MoE, +18-21% on dense 27B, decode +2.4-3.6%. Long-context prefill is now ~2.4× faster — the single biggest free speedup available on this card — plus the multi-turn corruption fix. Decode stays bandwidth-bound at the 608 GB/s ceiling."
pubDate: 2026-08-04
category: ["b70", "local-ai", "infrastructure"]
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
    "flash-attention",
    "prefill",
    "kv-cache",
    "kv-cache-quantization",
    "oneapi",
    "level-zero",
    "qwen",
    "moe",
    "benchmark",
  ]
draft: false
---

> **Upgrade path:** the previous baseline (b10222, +6-13% over b9853) is documented in
> [Intel Arc Pro B70: The Complete Local LLM Recipe](/posts/intel-arc-pro-b70-full-recipe-llama-cpp-sycl).
> This post measures the next step: a master build that finally runs XMX flash attention
> on quantized KV caches.

## Situation

The B70 fleet standard is **q8_0 K + q4_1 V** quantized KV cache: ~50% VRAM savings at KL ~0.003 (near-lossless, validated against [llama.cpp #23470](https://github.com/ggml-org/llama.cpp/discussions/23470)). It's what makes a 512K context allocation fit in VRAM on 32 GB.

But there was a hidden cost. b10222's oneDNN XMX flash attention ([#25222](https://github.com/ggml-org/llama.cpp/pull/25222)) only fired on **FP16** KV caches. Our quantized cache fell back to the generic TILE attention path — which degrades as O(n²) with context length. The symptom: prefill was fast at 4K-8K but collapsed at long context. At 32K tokens, prefill dropped to ~780 t/s on MoE while the same card does 2000+ t/s with the XMX path active.

The card wasn't the bottleneck. The software path was.

## The fix: oneDNN SDPA for quantized KV

Two upstream PRs changed the picture:

- **[#25874](https://github.com/ggml-org/llama.cpp/pull/25874) — oneDNN SDPA extended to quantized KV (Q4_0–Q8_0, FP32).** XMX flash attention now runs on our q8_0/q4_1 cache. This is the prefill win.
- **[#25880](https://github.com/ggml-org/llama.cpp/pull/25880) — SDPA scale use-after-return fix.** Multi-turn corruption bug that b10222 had, plus restored no-sync fast path for single-GPU.

I rebuilt from upstream master (commit `071327508`, b10255+) into `build-sycl-0804` — same cmake config as before (`-O3 -DNDEBUG`, `DNN=ON`, `F16=ON`, `GRAPH=ON`, oneAPI 2026.0) — and A/B tested against b10222 the same day, same machine, same 150W cap, same KV config.

## Results — prefill (the big win)

Prefill scales with prompt length (longer prompts amortize kernel overhead), and the XMX path now works on our KV cache. All values t/s, `llama-bench`, 150W, q8_0 K + q4_1 V.

| Config                         | pp512 | pp4096   | pp8192   | pp32768   | pp65536  | pp131072 |
| ------------------------------ | ----- | -------- | -------- | --------- | -------- | -------- |
| MoE 35B Q4 — b10222            | 1061  | 1691     | 1620     | ~780      | 986      | 673      |
| MoE 35B Q4 — **master 0804**   | 1134  | **2128** | **2085** | **1871**  | **1504** | **1211** |
| Δ                              | +6.9% | **+26%** | **+29%** | **+140%** | **+52%** | **+80%** |
| Dense 27B Q4 — b10222          | 640   | 795      | 758      | —         | 417      | 288      |
| Dense 27B Q4 — **master 0804** | 685   | **936**  | **921**  | —         | **651**  | **546**  |
| Δ                              | +7%   | **+18%** | **+21%** | —         | **+56%** | **+90%** |

_Build: b10222 (build-sycl-0801) vs master 071327508 (build-sycl-0804, #25874 + #25880), llama-bench `-p 512,4096,8192,32768 -n 128 -r 3 -fa 1 -ctk q8_0 -ctv q4_1 -b 8192 -ub 4096 -t 8 -dev SYCL0`, KV q8_0/q4_1._

The +140% at 32K is the headline: the TILE path's O(n²) collapse is gone, and long-context prefill is now ~2.4× faster. The win keeps growing with context — at 128K, dense prefill nearly doubles (288 → 546 t/s, +90%) and MoE gains +80% (673 → 1211 t/s). For agent workloads with 100K+ token prompts, that's the difference between waiting minutes and waiting tens of seconds. (Rows ≤32K: Run 9, r3; ≥64K: Run 11, r2, same config.)

## Results — decode (bandwidth-bound, near ceiling)

Decode is bandwidth-bound at the 608 GB/s ceiling; both models read a fixed number of bytes per token, so a build change moves little here. The improvement is small but real.

| Config                     | Decode b10222 | Decode master 0804 | Δ         |
| -------------------------- | ------------- | ------------------ | --------- |
| MoE 35B Q4 (tg128)         | 70.1 t/s      | **72.6 t/s**       | **+3.6%** |
| Dense 27B Q4 (tg128, base) | 20.8 t/s      | **21.3 t/s**       | +2.4%     |
| Dense 27B Q4 (MTP-4)       | 24-29 t/s     | 24-29 t/s          | ~tie      |

_Same conditions as the prefill table. MTP-4 speculative decoding (dense only) unchanged — it was already at its acceptance ceiling (93-94%)._

## Cross-hardware comparison

The B70's value proposition is 32 GB VRAM + a 512K context allocation at this price point. On prefill, the XMX engines were already dominant; the master build widens it.

| Hardware             | Model                         | Decode       | Prefill (long)                       | Context | Source                                                        |
| -------------------- | ----------------------------- | ------------ | ------------------------------------ | ------- | ------------------------------------------------------------- |
| **Arc Pro B70 32GB** | Qwen 35B Q4 MoE (master 0804) | **72.6 t/s** | **2128 t/s pp4096 / 1871 t/s pp32K** | 512K\*  | this post                                                     |
| Arc Pro B70 32GB     | Qwen 35B Q4 MoE (b10222)      | 70.1 t/s     | 1691 t/s pp4096                      | 512K\*  | this post                                                     |
| RX 7800 XT 16GB      | Gemma-4-21B Q4 MoE            | 33 t/s       | 106 t/s                              | 32K     | [my bench](/posts/rx7800-xt-llama-cpp-benchmarks-moe-context) |
| RX 7800 XT 16GB      | GLM-4.7-REAP-23B IQ4          | 59.8 t/s     | 81.7 t/s                             | 32K     | [my bench](/posts/rx7800-xt-llama-cpp-benchmarks-moe-context) |
| RTX 4090 24GB        | Qwen 27B Q4 (est.)            | ~35 t/s      | ~1000 t/s                            | 128K    | community                                                     |

_The 7800 XT wins decode on small dense models (fewer bytes/token) but caps at 32K context with 16 GB VRAM. The B70 fits a 512K context allocation — 16× the headroom — and now out-prefills at every length._

_\*512K = context allocation fits in VRAM (llama-bench boundary sweep, Run 6); not a served-context completion._

## Honest counterpoint: OVMS still wins dense decode

Cross-engine check, same day: OpenVINO Model Server (INT4 dense) decodes at **27.5 t/s** vs llama.cpp master's 21.3 t/s base (24-29 with MTP-4). INT4 dense reads fewer bytes/token on a bandwidth-bound model, so OVMS keeps the dense-decode crown (+29%). The master build does close the dense **prefill** gap: 936 t/s @ pp4096 vs OVMS ~915 t/s @ 1.6K — llama.cpp now wins or ties both MoE and dense prefill.

## Config

The benchmark invocation:

```bash
llama-bench -m MODEL.gguf -ngl 99 -ncmoe 0 -fa 1 -ctk q8_0 -ctv q4_1 \
  -p 512,4096,8192,32768 -n 128 -r 3 -b 8192 -ub 4096 -t 8 -dev SYCL0
```

Production server (unchanged across the upgrade):

```bash
llama-server -m MODEL.gguf -ngl 99 -ncmoe 0 -fa on -ctk q8_0 -ctv q4_1 \
  -c 131072 -b 8192 -ub 4096 -t 8 --no-mmap -dev SYCL0
# dense only — MTP speculative decoding:
#   --spec-type draft-mtp --spec-draft-n-max 4 --spec-draft-p-min 0.75
```

Promoting the build was a one-line config change: `profiles.json` → `runtime.binary` → `build-sycl-0804/bin/llama-server` (backup saved, `/health` verified after restart).

## Runtime flags handbook

| Flag / env                                        | Value            | Why                                                |
| ------------------------------------------------- | ---------------- | -------------------------------------------------- |
| `-ctk q8_0 -ctv q4_1`                             | K 8-bit, V 4-bit | fleet standard, ~50% KV VRAM savings, KL ~0.003    |
| `-fa on`                                          | flash attention  | **required** for the XMX oneDNN SDPA path (#25874) |
| `-ncmoe 0`                                        | all experts GPU  | MoE experts on CPU = catastrophic slowdown         |
| `-ngl 99 --no-mmap`                               | full offload     | model pinned to VRAM                               |
| `-t 8`                                            | CPU threads      | matches 8-core Ryzen 5700X3D                       |
| `SYCL_PI_LEVEL_ZERO_USE_IMMEDIATE_COMMANDLISTS=0` | dispatch         | stable on this stack                               |
| `SYCL_CACHE_PERSISTENT=0`                         | JIT cache        | required for stability on this driver              |
| `ONEAPI_DEVICE_SELECTOR=level_zero:0`             | device pin       | explicit GPU selection                             |

Tested and **not** adopted: `UR_L0_ENABLE_RELAXED_ALLOCATION_LIMITS=1` and immediate commandlists showed no measurable change at bench level — the XMX FA does the work, and the extra env noise wasn't worth it.

## Methodology

- Same machine, same day, 150W cap (cooldown to ≤52°C between runs, sequential only).
- `llama-bench` synthetic prompts at exact lengths (pp512/4096/8192/32768), 3 reps, warmup handled internally — immune to HTTP-API quoting bugs.
- Decode = tg128 engine rate; prefill = per-length throughput.
- KV q8_0 K + q4_1 V, FA on, `-ngl 99 -ncmoe 0`, `-t 8`, SYCL0 — identical for both builds.
- Community tuning flags A/B tested at bench level before being discarded.
