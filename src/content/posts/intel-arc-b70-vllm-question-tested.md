---
title: "Intel Arc Pro B70: The vLLM Question, Actually Tested"
description: "Community threads claim vLLM XPU hits 145–150 t/s single-stream on Qwen3.6-35B-A3B GPTQ-Int4 on one B70. After fixing the XPU native int4 MoE path (torch.int8/kChar), single-stream hits ~73 t/s decode and beats the 8K prefill claim (9.1K @230W). 145 remains multi-user aggregate (native C16≈694 tok/s). llama.cpp stays the single-user latency winner."
situation: "Every Intel Arc B70 thread has the same refrain: 'B70 is made for vLLM, llama.cpp is diesel in a Formula 1.' The claims are specific: 11,000 t/s prefill and 150 t/s decode on Qwen3.6-35B-A3B at MXFP4, one GPU. We run llama.cpp SYCL in production at 72.6 t/s decode / 2128 t/s prefill — so the question was worth testing directly rather than taking either side on faith."
issue: "The vLLM path has three gates, and each one turned out to be real: (1) the FP8 checkpoint for this model is 37.5 GB — it does not fit 32 GB of VRAM, so FP8 is off the table for 35B; (2) the MXFP4 (Intel 4-bit) checkpoints that exist publicly are in the compressed-tensors layout, which vLLM's XPU build rejects; (3) the prebuilt Intel images have an MXFP4 MoE path written for gpt-oss — the Qwen loader is broken in seven separate places, from tensor shapes to activation gating to hybrid-model page sizes."
solution: "I built the native-format MXFP4 checkpoint myself (fused 256 experts per layer into the w13/w2 layout, verified to 8.8e-5 MSE against BF16 ground truth), moved to the newer intel/vllm:0.17.0-xpu image, and patched the seven engine bugs in-container — 2D per-expert loader support, missing scale-key mapping, the silu-vs-swiglu_oai activation gate (the XPU kernel supports silu; the Python gate doesn't), CUDA-only device contexts in the linear-attention path, a contiguity check, and the hybrid block-size alignment that produced a page size the XPU flash-attention kernel rejects. The model then served and generated correct output."
usedIn: "Intel Arc Pro B70 32GB test rig (Ubuntu 26.04), intel/vllm:0.17.0-xpu (vllm-xpu-kernels v0.1.4), self-built Qwen3.6-35B-A3B MXFP4 checkpoint (22.4 GB), llama.cpp SYCL b10255+ production."
impact: "Run 17: native XpuFusedMoe int4 v4 unlocked — root cause was uint8 vs int8 (C++ is_B_int4=kChar). Single-stream tg32 72.6 / pp2048 9,094 @230W (prefill beats Reddit 7,975; decode = MoE bandwidth ceiling, not 145). Concurrency C16 wall-agg 694 tok/s. Triton path was 58/5.3K. Dense block-FP8 still dequant-only ~0.75 t/s. Evidence: benchmark-history Run 16–17."
pubDate: 2026-08-05
category: ["b70", "local-ai", "infrastructure"]
amazonUrl: https://go.sergiiob.dev/arc-pro
tags:
  [
    "local-ai",
    "vllm",
    "llama.cpp",
    "sycl",
    "intel-arc",
    "arc-pro-b70",
    "mxfp4",
    "xpu",
    "benchmark",
    "qwen",
  ]
draft: false
---

> **Context:** this post is the honest follow-up to the B70 build-upgrade work in
> [the prefill post](/posts/intel-arc-b70-sycl-xmx-quantized-kv-prefill). It documents a
> full test of the vLLM XPU path — including a negative headline result.

## Situation

The B70 threads keep saying the same thing:

> "Buying a B70 and using it with llama.cpp is the same as buying a Formula 1 and
> putting diesel inside. B70 is made for vLLM — 11,000 pp and 150 tg on
> Qwen3.6-35B-A3B on one GPU."

Our production numbers with llama.cpp SYCL (b10255+, q8_0/q4_1 KV, 150W): **72.6 t/s
decode, 2128 t/s prefill, 512K context** on the same model family. If vLLM really gives
150 t/s and 11K prefill on one B70, that's a 2× decode and 5× prefill — worth checking,
not dismissing.

## The three gates

### Gate 1 — FP8 doesn't fit

The official FP8 checkpoint (`Qwen/Qwen3.6-35B-A3B-FP8`) is **37.5 GB**. The B70 has
32,656 MiB visible VRAM. FP8 for 35B-class models is off the table on a single B70 —
the 150 t/s claims were never about FP8.

### Gate 2 — public MXFP4 checkpoints are in the wrong layout

MXFP4 is Intel's 4-bit format (E3M0 values, E8M0 group scales, group 32) — the format
the high-speed claims are built on. The public MXFP4 checkpoints (23 GB, compressed-
tensors format) store experts per-expert and unfused. vLLM's XPU MoE kernel expects a
fused `w13`/`w2` layout (gate+up concatenated across all 256 experts per layer).

### Gate 3 — the engine's MXFP4 MoE path is written for gpt-oss

The newer `intel/vllm:0.17.0-xpu` image (vllm-xpu-kernels v0.1.4) boots fine on the
B70 with `/dev/dri` passthrough. Its MXFP4 MoE loader, however, carries this in the
source:

```python
# (FIXME) for gpt-oss all experts are combined
```

That FIXME is seven bugs deep. Getting the model to load and run required:

| #   | Engine bug                                                                                                                    | Fix                                                                                |
| --- | ----------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| 1   | mxfp4 loader assumes combined 3D tensor; Qwen loader slices per-expert 2D → `IndexError`                                      | 2D per-expert copy with w1/w3 half-offset                                          |
| 2   | Qwen fused-expert mapping has **no scale-key entries** → scales hit a broken 2-arg loader → `TypeError`                       | add `w13/w2_weight_scale` mapping entries                                          |
| 3   | `assert activation == swiglu_oai` blocks all silu models (PR #22700) — though the kernel itself supports silu                 | allow `SILU`                                                                       |
| 4   | `_can_support_mxfp4()` same swiglu_oai-only gate                                                                              | allow `SILU`                                                                       |
| 5   | linear-attention (FLA) op enters `torch.cuda.device()` → XPU build has no CUDA → crash                                        | use `torch.xpu.device` for XPU tensors                                             |
| 6   | flash-attention wrapper checks only the last stride → "k must be contiguous"                                                  | full `is_contiguous()` check                                                       |
| 7   | hybrid-model alignment sets FA block size 1056; the XPU FA kernel supports **64/128 only** → "Unsupported page size for fmha" | force `--block-size 64`, pad mamba page up to a multiple (vLLM PR #37467 behavior) |

Plus a mandatory launch flag: `--block-size 64` (see bug 7 — the kernel constraint
comes from vllm-xpu-kernels, which supports only 64/128-token pages).

## What I built anyway (and verified)

To isolate checkpoint-format issues from engine bugs, I built the native-format
checkpoint myself:

- **Fused** the 256 per-expert `gate_proj`/`up_proj` tensors per layer into
  `w13_weight_packed` (and `down_proj` → `w2`), scales fused to match
- **Dequantized** the dense projections (attention, norms) to BF16 — vLLM's MXFP4 path
  leaves dense linears unquantized
- **Verified** the MXFP4 decode empirically against the BF16 ground truth: MSE 8.8e-5
  (quantization noise level), nibble order low-first, E8M0 scale bias 127

Result: a 22.4 GB native-MXFP4 checkpoint that fits the card (5.9 GB BF16 dense +
16.5 GB packed experts). After the seven patches, it loaded — all 40 layers, 51,200
expert/scale tensors — and generated **correct output**: coherent reasoning traces,
math (17×23), knowledge (Tokyo), long-form prose. Weights, scales and activation
layout all verified right.

## Results

### Single stream (what llama.cpp users measure)

| Metric              | vLLM 0.17 XPU MXFP4     | llama.cpp b10255 Q4_K_XL | Δ vs llama.cpp  |
| ------------------- | ----------------------- | ------------------------ | --------------- |
| Decode              | 10.4 t/s                | 65.3 t/s                 | **6.3× slower** |
| Prefill (4K prompt) | ~1,738 t/s              | 2,128 t/s                | −18%            |
| Per-token latency   | 96 ms                   | 15 ms                    | 6× worse        |
| VRAM                | 32.7 GB (95% pre-alloc) | ~21 GB                   | —               |
| Power / temp        | 165W / 62°C             | 165W / ~66°C             | —               |
| First-call latency  | ~4 min (triton JIT)     | ~30s (SYCL JIT)          | —               |

### Concurrent users (what the "150 t/s" claim measures)

Same HTTP API, same prompt mix, 512 output tokens each, one B70, 165W:

| Users | vLLM aggregate | vLLM gen t/s | vLLM TPOT | llama.cpp aggregate | llama.cpp gen t/s | llama.cpp TPOT |
| ----- | -------------- | ------------ | --------- | ------------------- | ----------------- | -------------- |
| 1     | 18.0 tok/s     | 10.4         | 96 ms     | 112.9 tok/s         | 65.3              | 15 ms          |
| 4     | 68.6 tok/s     | 39.7         | 101 ms    | 134.7 tok/s         | 77.9              | 51 ms          |
| 8     | 134.4 tok/s    | 77.8         | 103 ms    | 159.5 tok/s         | 92.4              | 87 ms          |
| 16    | 264.9 tok/s    | **153.4**    | 104 ms    | 146.8 tok/s         | 85.0              | 188 ms         |

**There it is: the "150 t/s" figure.** vLLM's continuous batching keeps the GPU
saturated — aggregate throughput scales ~linearly with users (10 → 153 gen t/s) while
per-user latency stays flat (96 → 104 ms). llama.cpp's parallel slots serialize decode:
aggregate saturates at ~85-92 gen t/s and per-user latency degrades linearly
(15 → 188 ms). At 8+ users, vLLM wins; at 1 user, llama.cpp wins by 6.3×.

### Community numbers, re-measured (plain GPTQ-Int4, Run 16)

After this post's first publication, a community user (Dolboyob77) posted vLLM XPU
llama-bench-style numbers on the same card, claimed Concurrent 1:

| Model (claimed C=1)           | Prefill             | Decode (tg32)              |
| ----------------------------- | ------------------- | -------------------------- |
| Ornith-1.0-35B-MXFP4          | 10,304 t/s (pp4086) | 71.1 t/s (peak 73.4)       |
| Qwen3.6-35B-A3B-**GPTQ-Int4** | 7,975 t/s (pp2048)  | **145.5 t/s (peak 150.2)** |

We downloaded the **plain** `Qwen3.6-35B-A3B-GPTQ-Int4` checkpoint and re-ran it on
`intel/vllm:0.21.0-xpu-full` (torch 2.13+xpu, kernels 0.1.12.2) with graphs ON, tuned
Triton MoE, FLASH_ATTN PIECEWISE — the best working MoE path on this stack:

| Our measurement (plain GPTQ-Int4) | Value                                                      |
| --------------------------------- | ---------------------------------------------------------- |
| Single-stream tg32 (best)         | **57.9 t/s** (not 145)                                     |
| Single-stream pp2048 (best)       | **~5,122–5,349 t/s** (not 7,975)                           |
| C=1 aggregate gen                 | 49.4 t/s                                                   |
| C=8 aggregate gen                 | 133.0 t/s                                                  |
| C=16 aggregate gen                | **182.5 t/s** (engine peak 190)                            |
| 230W single-stream                | ~52–53 t/s (no help; MoE self-limits)                      |
| Native `XpuFusedMoe` int4         | OOM, then shape mismatch (`ptr_A.size(1)`) after lean prep |

**What this actually teaches us:**

1. **Ornith ~71–73 t/s remains real bandwidth-bound parity** with llama.cpp (~73.7). That
   part of the community report still stands.
2. **Plain GPTQ-Int4 does _not_ deliver 145 t/s single-stream on our B70 + 0.21 XPU image.**
   Our ceiling is ~58 t/s. The 145 figure lands cleanly between C=8 (133) and C=16 (182)
   aggregate gen t/s — same class of multi-user number as the MXFP4 "150 at 16 users"
   we already measured. Hybrid GDN is present on this Qwen3.6-35B-A3B checkpoint too;
   the earlier "plain A3B has no GDN" explanation was wrong for this weight set.
3. **Prefill edge is real but smaller than the Reddit headline on this path:** ~5.3K
   pp2048 on GPTQ-Int4 vs llama.cpp ~2.1K on Q4 MoE — still a win for vLLM, not 8K.
4. **Dense 27B block-FP8** (`ThinkingCap-Qwen3.6-27B-FP8`): stock vLLM has no XPU entry
   in `_POSSIBLE_FP8_BLOCK_KERNELS`. A dequant fallback serves at **~0.75 t/s** — proof
   the gap is kernels, not "we didn't try." llama.cpp dense+MTP stays ~24–30 t/s.

So the corrected scorecard: **vLLM wins multi-user aggregate and often prefill;
single-stream MoE decode on this stack tops ~58 t/s GPTQ (or ~10 t/s broken MXFP4 UD);
llama.cpp wins single-user interactive decode, GGUF efficiency, and hybrid-model
coverage.** The Reddit 145 is multi-user throughput misread as Concurrent-1 decode.

## Conclusion — why people say vLLM is better

Because they're measuring different things, and both are real:

- **llama.cpp is a personal engine.** One user, quantized GGUF, 65 t/s, 15 ms per token.
  It's what you want for a single interactive chat — which is exactly our production use.
- **vLLM is a serving engine.** Continuous batching + paged KV cache means the GPU is
  busy with many requests at once. Aggregate throughput scales with concurrency —
  measured 153.4 gen t/s at 16 users on a single B70, and community dual-B70 runs hit
  [912 tok/s output at 50 concurrent users](https://github.com/PMZFX/intel-arc-pro-b70-benchmarks).
  Its prefill edge is real on some paths (community Ornith ~10K pp; our GPTQ ~5.3K
  pp2048 vs llama.cpp ~2.1K). Single-stream MoE decode on our measured GPTQ path is
  ~58 t/s — not 145.
- The "mystery" of llama.cpp users on a B70 has a simple answer: most B70 owners run
  single interactive users or want GGUF efficiency. On decode, MoE is bandwidth-bound
  either way. vLLM's wins are real, but they're **concurrency / aggregate throughput
  and often prefill** — not a magic 145 t/s single-stream decode on this card.
- The Reddit "150 t/s on one B70" claim isn't fiction — it's multi-user aggregate.
  We hit 153.4 gen t/s at 16 users on MXFP4 (Run 15) and 133–182 gen t/s at C=8–16 on
  plain GPTQ-Int4 (Run 16). Single-stream Concurrent-1 is ~50–58 t/s on the working path.

So the honest guidance for a B70: **one interactive user → llama.cpp.
A multi-user API or batch/RAG workload → vLLM XPU (accept ~58 t/s/user single-stream
ceiling; harvest aggregate at C≥8).** For us, the pi-telegram-bridge is single-user —
llama.cpp stays production. Full campaign notes: B70-DOCS `research/vllm-021-campaign-20260806.md`,
benchmark-history Run 16.

## Methodology

- Image: `intel/vllm:0.17.0-xpu` (vllm-xpu-kernels v0.1.4), run with `/dev/dri`
  passthrough, `VLLM_TARGET_DEVICE=xpu`, oneAPI env
- Flags: `--quantization mxfp4 --enforce-eager --max-model-len 32768
--gpu-memory-utilization 0.95 --block-size 64`
- Checkpoints: `Qwen/Qwen3.6-35B-A3B-FP8` (37.5 GB, rejected), community MXFP4
  (compressed-tensors, rejected), self-built native MXFP4 (22.4 GB, served)
- Dequant verification: MSE against `Qwen/Qwen3.6-35B-A3B` BF16 weights, layer 10
  fused gate+up, all 256 experts
- Benchmark: wall-clock `/v1/chat/completions`, 4 diverse prompts × 3 reps, warmup
  discarded, 512 output tokens; isolated prefill (4,219-token prompt) and decode
  (400-token generation) tests
- Concurrency test: 16 threaded clients, rounds at 1/4/8/16 users, same API on both
  engines (llama.cpp run with `--parallel 16 -c 32768`, 2K ctx/slot, same Q4_K_XL
  model family, same 165W cap)
- Repo evidence: `benchmark-history.md` Runs 14–16, `results/vllm-mxfp4-summary-20260805.md`,
  `results/vllm-021-gptq-*.json`, `results/vllm-021-dense-fp8-bench.json`,
  `research/vllm-021-campaign-20260806.md`, patches under `scripts/tmp/vllm-xpu-*`
- Follow-up stack (Run 16): `intel/vllm:0.21.0-xpu-full`, plain
  `Qwen3.6-35B-A3B-GPTQ-Int4`, streaming tg32/pp2048 + concurrency sweep; dense
  `ThinkingCap-Qwen3.6-27B-FP8` with block-FP8 dequant registry patch
