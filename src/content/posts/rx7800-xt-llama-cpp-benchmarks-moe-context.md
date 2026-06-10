---
title: "RX 7800 XT 16GB: Running 35B MoE at 128K Context with llama.cpp + ROCm"
description: "Full benchmark data on running MoE and dense LLMs on AMD consumer hardware — quantization comparison, power cap analysis, KV cache tuning, and context limits on 16GB VRAM."
situation: "Built a dedicated AI inference node to run local models 24/7 via Tailscale, keeping the desktop free for coding and gaming. The constraint: a single RX 7800 XT 16GB with ROCm as the only viable backend (vLLM and SGLang have no ROCm wheels for gfx1101)."
issue: "Consumer GPUs have hard VRAM ceilings. Running 23-35B parameter models on 16GB requires aggressive quantization, KV cache compression, and precise build flags. The noise-to-signal ratio in online benchmarking is high — most people test on NVIDIA, not AMD RDNA3, and few test MoE architectures with context windows above 32K."
solution: "Systematically benchmarked 8+ models across 5 quantization levels, swept GPU power caps from 30W to 190W, tested 3 KV cache configurations, and pushed context limits to 256K. Documented the exact llama.cpp build flags and runtime parameters that make 128K inference on 16GB VRAM stable and fast."
usedIn: "Dedicated AI inference node (Ryzen 7 3800X + RX 7800 XT) running llama.cpp with HIPBLAS + rocWMMA FlashAttention. Models served via systemd services, accessed remotely through Tailscale."
impact: "IQ quants outperform K-quants by 3x on RDNA3. Power cap can be reduced by >50% with no throughput loss on MoE models. 256K context proven on 16GB with MoE + IQ2_M. Established a repeatable configuration for 128K always-on inference."
pubDate: 2026-06-10
category: ["local-ai", "infrastructure"]
tags:
  [
    "local-ai",
    "llama.cpp",
    "rocm",
    "amd",
    "rdna3",
    "moe",
    "quantization",
    "benchmark",
    "rx7800xt",
    "gguf",
    "kv-cache",
  ]
draft: false
---

## Hardware

- CPU: AMD Ryzen 7 3800X (8C/16T, 2.8 GHz powersave)
- GPU: Sapphire RX 7800 XT 16GB (gfx1101, RDNA3, 60 CUs, 623 GiB/s GDDR6)
- RAM: 16GB DDR4
- Storage: 1TB NVMe (LVM: 500G models, 100G inference, 100G root, 16G swap)
- PSU: 850W Gold
- OS: Ubuntu 24.04.4 LTS, kernel 6.17.0-35-generic
- Network: Ethernet, Tailscale (100.123.29.5)

## Why ROCm and not CUDA

vLLM has no ROCm wheels for gfx1101 on PyPI. SGLang only publishes Docker images for MI300X/MI350. Building vLLM from source with ROCm takes 4+ hours and fails frequently. llama.cpp with HIPBLAS is the only production-viable backend for consumer AMD GPUs. This decision was made after trying and failing with both alternatives.

## llama.cpp Build Configuration

Compiled from source targeting gfx1101 only:

```bash
cmake -B build -DGGML_HIP=ON \
  -DGPU_TARGETS=gfx1101 \
  -DGGML_HIPBLAS=ON \
  -DGGML_HIP_ROCWMMA_FATTN=ON \
  -DGGML_HIP_GRAPHS=ON \
  -DGGML_HIP_MMQ_MFMA=ON \
  -DGGML_HIP_NO_VMM=ON \
  -DGGML_HIP_EXPORT_METRICS=OFF \
  -DCMAKE_BUILD_TYPE=Release
```

Each flag:

- `GGML_HIPBLAS=ON` — HIPBLAS backend (AMD's equivalent of cuBLAS)
- `GPU_TARGETS=gfx1101` — compile only for RX 7800 XT architecture
- `GGML_HIP_ROCWMMA_FATTN=ON` — FlashAttention via AMD rocWMMA matrix cores
- `GGML_HIP_GRAPHS=ON` — HIP graph capture to reduce kernel launch overhead
- `GGML_HIP_MMQ_MFMA=ON` — MFMA-based matrix-matrix multiplication for RDNA3
- `GGML_HIP_NO_VMM=ON` — disables virtual memory management (avoids overhead on RDNA3)

ROCm version: 6.4.4 (HIP 6.4.43484, AMD clang 19.0.0)

## ROCm Environment

The systemd service sets these environment variables:

```ini
Environment=ROCM_PATH=/opt/rocm-6.4.4
Environment=HSA_ENABLE_GFX_VERSION=gfx1101
Environment=PATH=/opt/rocm-6.4.4/bin:/usr/local/bin:/usr/bin:/bin
Environment=LD_LIBRARY_PATH=/opt/rocm-6.4.4/lib:/opt/rocm-6.4.4/lib/llvm/lib
```

## Benchmark Server Flags (constant across all runs)

```
--cache-type-k q8_0 --cache-type-v q4_0 --flash-attn on \
--parallel 1 -b 512 -ub 128 --mlock
```

This is the discovered sweet spot for 23-28B MoE on this card. The default KV cache flags (`q8_0` / `q4_0`) were used for benchmarking; the daily running service uses `q8_0` / `q8_0` to maximize quality at the cost of some headroom.

## Phase 1 — Model and Quantization Comparison (190W cap)

| Model            | Quant      |    Size | ctx | VRAM idle | Prefill t/s |  Gen t/s | Long prefill (180 tok) |
| ---------------- | ---------- | ------: | --: | --------: | ----------: | -------: | ---------------------: |
| GLM-4.7-REAP-23B | IQ4_XS     | 12.6 GB | 32K |  13.93 GB |        81.7 | **59.8** |                  691.7 |
| GLM-4.7-REAP-23B | IQ4_NL     | 13.3 GB | 32K |  14.60 GB |        77.6 |     54.0 |                  692.1 |
| GLM-4.7-REAP-23B | UD-IQ3_XXS |  9.4 GB | 65K |  12.32 GB |        47.8 |     52.6 |                  614.4 |
| Qwen3.6-REAP-28B | IQ3_XXS    |   11 GB | 32K |  11.90 GB |        70.8 |     48.7 |                  435.3 |
| qwen3.6-27b      | 4bpw       |   13 GB | 16K |  14.25 GB |        35.7 |     19.4 |                  202.1 |
| qwopus-27b       | Q3_K_L     |   14 GB | 32K |  15.68 GB |        43.7 |     16.8 |                  205.0 |
| gemma-4-21B      | Q4_K_M     | 13.8 GB | 32K |  14.85 GB |       105.9 |     33.3 |                  320.6 |
| gemma-4-26B-A4B  | IQ2_M      |  9.4 GB | 65K |  11.30 GB |       103.2 |     35.9 |                  326.7 |

### Key findings

**IQ quants dominate K-quants on RDNA3.** Every K-quant tested is slower and uses more VRAM than a smaller IQ variant. Q3_K_L at 14 GB delivers 16.8 t/s generation; UD-IQ3_XXS at 9.4 GB delivers 52.6 t/s. Same GPU, 35% less VRAM, 3x the speed. The IQ decompression kernels for gfx1101 are better optimized in llama.cpp than the K-quant codepaths.

**Sweet spot: GLM-4.7-REAP-23B in IQ4_XS.** Best generation speed (59.8 t/s), strong prefill (81.7 t/s), 32K context, 14 GB VRAM with 2.4 GB headroom.

**Gemma-4-21B Q4_K_M has the fastest prefill** (105.9 t/s) — the 4B active parameter count in the MoE pays off for prompt-heavy workloads, but generation drops to 33 t/s.

**GLM-4.7 in UD-IQ3_XXS unlocks 65K context** at 12.32 GB VRAM (3.7 GB headroom). Best long-context option in the benchmark.

## Phase 2 — GPU Power Cap Sweep (GLM-4.7 IQ4_XS)

| Power cap | Prefill t/s | Gen t/s | Long prefill | Watts (load) |
| --------: | ----------: | ------: | -----------: | -----------: |
|     190 W |        81.7 |    59.8 |        691.7 |         80 W |
|     160 W |        79.1 |    59.8 |        680.4 |         80 W |
|     130 W |        85.0 |    59.8 |        680.8 |         81 W |
|     100 W |        84.2 |    59.6 |        681.2 |         81 W |

The GPU never exceeds ~81W actual draw during MoE inference. The 190W power cap is far above what MoE workloads demand.

## Phase 2b — Ultra-Fine Power Cap Sweep

| Power cap | Prefill t/s |  Gen t/s |  TTFT | Watts (load) | T_junc (load) |
| --------: | ----------: | -------: | ----: | -----------: | ------------: |
|     130 W |        77.8 |     57.9 | 0.50s |         56 W |          53°C |
|     100 W |        85.9 |     57.8 | 0.48s |         58 W |          54°C |
|  **80 W** |    **83.9** | **57.8** | 0.49s |         56 W |          55°C |
|  **60 W** |    **85.8** | **58.0** | 0.48s |         59 W |          56°C |
|      45 W |        85.9 |     57.8 | 0.48s |         60 W |          57°C |
|      30 W |        85.1 |     57.8 | 0.48s |         57 W |          57°C |

Below 60W, the GPU never enters a throttling regime — actual load hovers at 56-60W regardless of cap. The realistic safe floor is 60-80W: below that, there is no power savings (the GPU draws 56W minimum during inference) and no performance gain.

For daily operation, 80W is the recommended cap — identical throughput with thermal headroom for transient spikes. The earlier 190W default was wasteful for this workload class.

## Phase 2c — Thinking Mode ON vs OFF

Qwen3.6 and GLM-4.7 ship with thinking mode enabled in the chat template. The impact:

| Model              | Mode              |  TTFT | Gen t/s | Think words | Content words | Watts (load) |
| ------------------ | ----------------- | ----: | ------: | ----------: | ------------: | -----------: |
| GLM-4.7 IQ4_XS     | `--reasoning off` | 0.48s |    58.2 |           0 |        **14** |         57 W |
| GLM-4.7 IQ4_XS     | thinking ON       | 1.25s |    59.7 |          31 |         **0** |         85 W |
| GLM-4.7 UD-IQ3_XXS | `--reasoning off` | 0.65s |    51.0 |           0 |        **14** |         57 W |
| GLM-4.7 UD-IQ3_XXS | thinking ON       | 1.49s |    52.6 |          37 |         **0** |         93 W |

With thinking ON, the model burns the entire `max_tokens` budget on `<think/>` blocks. The visible `content` field is empty. A 64-token generation for "write a haiku" produced 31-37 reasoning tokens and 0 actual haiku.

**`--reasoning off`** is the correct fix. The `-rb 0` / `--reasoning-budget 0` flag does NOT work — Qwen3.6 still emits `reasoning_content` and produces 0 `content` even with budget 0.

## Phase 3 — KV Cache Type Combinations

| K type   | V type   |    VRAM idle |  Prefill |      Gen | Long prefill |
| -------- | -------- | -----------: | -------: | -------: | -----------: |
| f16      | f16      |     14.76 GB |     78.2 |     60.8 |        678.8 |
| q8_0     | f16      |     13.93 GB |     85.1 |     59.7 |        679.5 |
| **q8_0** | **q4_0** | **13.93 GB** | **81.7** | **59.8** |    **691.7** |
| q8_0     | q8_0     |     13.93 GB |     79.2 |     59.5 |        670.3 |
| q4_0     | q4_0     |     13.93 GB |     68.9 |     56.3 |        549.5 |
| q4_0     | f16      |     13.93 GB |     60.1 |     55.8 |        473.6 |

q8_0 for K with q4_0 for V is the best throughput/compression tradeoff. FP16 KV uses 0.83 GB more VRAM for no speed benefit. q4_0/q4_0 saves the same VRAM but loses 8-10 t/s.

For daily operation with 128K context and maximum quality, `q8_0/q8_0` is used (only 8.6 t/s loss vs the benchmark sweet spot, but full precision on V).

## Context Limits on 16GB VRAM

All tests used `--flash-attn on --cache-type-k q4_0 --cache-type-v q4_0 --mlock`.

| Model                 | File size | Params active | 128K (4 slots) | 160K (1 slot) | 192K (1 slot) | 256K (1 slot) |
| --------------------- | --------- | ------------- | -------------: | ------------: | ------------: | ------------: |
| Gemma-4-26B-A4B IQ2_M | ~9.3 GB   | 4B (MoE)      |             ✅ |            ✅ |            ✅ |        **✅** |
| Qwen3.6-27B 4bpw      | ~13 GB    | 27B dense     |             ✅ |            ✅ |        ❌ OOM |        ❌ OOM |
| Qwen3-14B-128K Q4_K_S | ~8 GB     | 14B dense     |             ✅ |            ✅ |            ✅ |     likely ✅ |
| Qwopus-27B Q3_K_L     | ~14 GB    | 27B + MTP     |         ❌ OOM |             — |             — |             — |
| Qwopus-27B Q4_K_S     | ~15 GB    | 27B + MTP     |         ❌ OOM |             — |             — |             — |

### How 256K works on 16GB

256K context is only achievable with:

1. MoE architecture (Gemma-4: 26B total, 4B active per token) — small per-token KV footprint
2. Aggressive weight quantization (IQ2_M ≈ 2-bit) — ~9.3GB model file
3. Q4_0 KV cache — ~6GB KV at 256K
4. Single slot (`--parallel 1`) — no duplicated KV
5. Flash Attention — O(N) memory access

Total: ~9.3GB (weights) + ~6GB (KV) = ~15.3GB / 16GB. Extremely tight.

### Why dense 27B fails at 192K

Qwen3.6-27B at 192K failed by only ~505 MiB. The OOM comes from compute buffer allocation, not just KV — llama.cpp reserves additional buffers for attention computation that scale with context length. No workaround except smaller model or lower KV cache bits.

## Daily Running Configuration

The always-on model is Qwen3.6-35B-A3B UD-IQ3_XXS:

```
llama-server \
  --model /srv/models/gguf/Qwen3.6-35B-A3B-UD-IQ3_XXS.gguf \
  --host 0.0.0.0 --port 8080 \
  --parallel 1 --n-gpu-layers 99 \
  --batch-size 512 --ubatch-size 128 \
  --flash-attn on \
  --cache-type-k q8_0 --cache-type-v q8_0 \
  --ctx-size 131072 \
  --reasoning off \
  --api-key <key>
```

### Why this model

- 35B MoE with only 3B active params — 35B weights must fit in VRAM (any expert can activate), but per-token compute is light
- IQ3_XXS is the most aggressive quant that stays coherent for code tasks
- Q4_K_M and IQ4_XS are too large — not enough KV headroom for 128K context
- IQ2_XXS degrades noticeably on code generation

### Why each flag matters

- `--n-gpu-layers 99` — offloads everything to GPU, CPU handles orchestration only
- `--flash-attn on` — O(N) attention, mandatory at 128K context
- `--cache-type-k/v q8_0` — quantized KV cache uses half the VRAM of FP16
- `--ctx-size 131072` — 128K context (model natively supports it)
- `--reasoning off` — disables Qwen3.6 thinking mode (see Phase 2c)
- `--batch-size 512 --ubatch-size 128` — microbatch size tuned for RDNA3

### Node automation

- systemd service with `Restart=on-failure`, `RestartSec=5`
- RGB monitor script: RAM sticks + motherboard LED show inference state (red=loaded, blue breathing=active, green=idle, dim gray=offline)
- Sleep schedule: 01:00 Madrid, RTC wake at 07:30 Madrid (S3 deep sleep via systemd timer)
- Tailscale recovery timer: checks daemon every 2 minutes, auto-restarts on failure
- CPU: 2.8 GHz powersave governor
- GPU: 190W cap via LACT (can be reduced to 80W per benchmark findings)

## Speculative Decoding

Tested `--spec-type ngram-simple` on Qwen3.6 IQ3_XXS:

| Mode         | Prefill (req1 / req2) | Gen (req1 / req2) |
| ------------ | --------------------- | ----------------- |
| ngram-simple | 72.7 / 114.5          | 55.7 / 57.8       |
| baseline     | 60.2 / 121.4          | 56.6 / 57.7       |

No meaningful speedup. ngram finds too few repetitions in the model's outputs. For real speculative gains, `--md <draft-model>` with a model from the same family is needed (e.g. Qwen2.5-3B as draft for Qwen3.6-27B), at the cost of additional VRAM and KV overhead.

## Model Catalog

31 GGUF files on the node (423 GB total in `/srv/models/gguf/`):

| Model                  | Quant           | Size       | Type                         |
| ---------------------- | --------------- | ---------- | ---------------------------- |
| Qwen3.6-35B-A3B        | UD-IQ3_XXS      | 13G        | MoE 35B/3B active            |
| Qwen3.6-35B-A3B        | UD-IQ2_XXS      | 11G        | MoE 35B/3B active            |
| Qwen3.6-35B-A3B-MTP    | UD-IQ2_XXS      | 12G        | MoE + multi-token prediction |
| Qwen3.6-27B            | 4bpw            | 13G        | Dense 27B                    |
| Qwen3.6-27B            | IQ4_XS          | 15G        | Dense 27B                    |
| Qwen3.6-27B            | UD-IQ3_XXS      | 12G        | Dense 27B                    |
| Qwen3.6-28B-REAP20-A3B | IQ3_XXS         | 11G        | MoE 28B/3B active            |
| Qwen3-Coder-30B-A3B    | IQ4_XS          | 16G        | MoE 30B/3B active            |
| Qwen3-Coder-Next       | IQ4_XS          | 40G        | Too large for 16GB           |
| Gemma-4-26B-A4B        | QAT-UD-Q4_K_XL  | 14G        | MoE 26B/4B active            |
| Gemma-4-26B-A4B        | IQ2_M           | 9.4G       | MoE 26B/4B active            |
| Gemma-4-21B-A4B        | REAP-IQ4_XS     | 11G        | MoE 21B/4B active            |
| Gemma-4-21B-A4B        | REAP-Q4_K_M     | 13G        | MoE 21B/4B active            |
| Gemma-4-12B            | Various         | 4.4-12G    | Dense 12B                    |
| Gemma-4-12B            | QAT-UD-Q4_K_XL  | 6.3G       | Dense 12B                    |
| Gemma-4 E2B/E4B        | Various         | 2.5-4.4G   | Embedding/small              |
| GLM-4.7-Flash-REAP-23B | IQ4_XS          | 13G        | MoE 23B/3B active            |
| GLM-4.7-Flash-REAP-23B | IQ4_NL          | 12G        | MoE 23B/3B active            |
| GLM-4.7-Flash-REAP-23B | UD-IQ3_XXS      | 9.4G       | MoE 23B/3B active            |
| Qwopus-27B             | Q3_K_L / Q4_K_S | 14-15G     | Finetune 27B                 |
| Qwopus3.6-27B-v2       | Q3_K_S / mmproj | 12G + 601M | Finetune + vision            |

## Lessons

1. **Build for your exact GPU architecture.** `GPU_TARGETS=gfx1101` produces faster code than a generic ROCm build. Every flag in the cmake config matters.

2. **IQ quants are better than K-quants on RDNA3.** If you're on AMD, test IQ variants first. The speed difference is not marginal — it's 3x in some cases.

3. **Power caps are mostly irrelevant for MoE.** MoE inference is bandwidth-bound, not compute-bound. The GPU idles at 56-60W during generation regardless of cap.

4. **Thinking mode is not free.** On Qwen3.6 and GLM-4.7, it doubles power consumption, increases TTFT 2.5x, and produces empty output for short requests. Always benchmark with `--reasoning off` unless you specifically need chain-of-thought.

5. **256K on 16GB is possible but painful.** It requires a specific combination of MoE + IQ2_M + Q4_0 KV + single slot + Flash Attention. Useful as a ceiling test, not a daily config.

6. **Dense models hit a hard wall around 160K on 16GB.** Qwen3.6-27B OOMs at 192K by only 505 MiB. No amount of tuning will change this — the compute buffer allocation scales with context length.

7. **llama.cpp is the only option for consumer AMD GPUs.** Don't waste time trying vLLM or SGLang on gfx1101. They don't support it.
