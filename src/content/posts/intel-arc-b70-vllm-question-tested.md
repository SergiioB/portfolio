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

### Community numbers, re-measured (plain GPTQ-Int4, Run 16–17)

After this post's first publication, a community user (Dolboyob77) posted vLLM XPU
llama-bench-style numbers on the same card, claimed Concurrent 1:

| Model (claimed C=1)           | Prefill             | Decode (tg32)              |
| ----------------------------- | ------------------- | -------------------------- |
| Ornith-1.0-35B-MXFP4          | 10,304 t/s (pp4086) | 71.1 t/s (peak 73.4)       |
| Qwen3.6-35B-A3B-**GPTQ-Int4** | 7,975 t/s (pp2048)  | **145.5 t/s (peak 150.2)** |

**Run 16 (Triton GPTQ MoE):** graphs ON, FLASH_ATTN PIECEWISE on
`intel/vllm:0.21.0-xpu-full` — single-stream tg32 **57.9**, pp2048 **~5.3K**. Concurrency
gen t/s C1=49 / C8=133 / C16=182. Native path crashed.

**Run 17 (native `XpuFusedMoe` int4 unlocked):** root cause of the native crash was
dtype, not layout. C++ only enables int4 when `B_dtype == at::kChar` (`torch.int8`);
leaving GPTQ packs as `uint8` made the kernel treat B as BF16 and fail
`ptr_A.size(1) must match ptr_B.size(1)`. After `implement_zp` → int8 + route WNA16 →
`XpuFusedMoe` on `intel/vllm:0.21.0-xpu-int4moe`:

| Our measurement (plain GPTQ-Int4) | Value                                  |
| --------------------------------- | -------------------------------------- |
| Native single-stream tg32 @230W   | **72.6 t/s** (not 145)                 |
| Native single-stream pp2048 @230W | **9,094 t/s** (**beats** Reddit 7,975) |
| Native @150–180W                  | tg32 65–68 / pp2048 7.1–8.4K           |
| Native C=16 wall-agg (180W)       | **694 tok/s**                          |
| Triton path (Run 16 ceiling)      | tg32 57.9 / pp2048 ~5.3K               |

**What this actually teaches us:**

1. **Ornith ~71–73 t/s remains real bandwidth-bound parity** with llama.cpp (~73.7). Our
   native GPTQ MoE decode lands in the same band — the bus is the limit.
2. **Prefill target is real and beatable** on the native int4 path (9.1K > 7.975K). The
   Triton GPTQ path was leaving ~40% prefill on the table.
3. **145 t/s Concurrent-1 is still not single-stream decode on this card.** Native
   single-stream tops ~73 t/s. 145 appears only as multi-user aggregate (native C16≈694
   wall-agg; Triton C≈10 gen≈145). Hybrid GDN is present on this checkpoint too.
4. **Dense 27B block-FP8** still has no XPU block kernel — dequant fallback ~0.75 t/s.
   llama.cpp dense+MTP stays ~24–30 t/s.

So the corrected scorecard: **vLLM wins prefill (native int4) and multi-user aggregate;
single-stream MoE decode is bandwidth-parity with llama.cpp (~70–73 t/s); llama.cpp wins
single-user interactive latency, GGUF efficiency, and hybrid/UD coverage.**

## Conclusion — why people say vLLM is better

Because they're measuring different things, and both are real:

- **llama.cpp is a personal engine.** One user, quantized GGUF, 65 t/s, 15 ms per token.
  It's what you want for a single interactive chat — which is exactly our production use.
- **vLLM is a serving engine.** Continuous batching + paged KV cache means the GPU is
  busy with many requests at once. Aggregate throughput scales with concurrency —
  measured 153.4 gen t/s at 16 users on MXFP4 (Run 15) and **694 wall-agg tok/s at C=16**
  on native GPTQ-Int4 (Run 17). Community dual-B70 runs hit
  [912 tok/s output at 50 concurrent users](https://github.com/PMZFX/intel-arc-pro-b70-benchmarks).
  Prefill on native int4 **beats** the Reddit headline (9.1K pp2048). Single-stream MoE
  decode is ~73 t/s — bandwidth parity with llama.cpp, **not** 145.
- The "mystery" of llama.cpp users on a B70 has a simple answer: most B70 owners run
  single interactive users or want GGUF efficiency. On decode, MoE is bandwidth-bound
  either way. vLLM's wins are real: **prefill + concurrency** — not a magic 145 t/s
  single-stream decode on this card.
- The Reddit "150 t/s on one B70" claim isn't fiction — it's multi-user aggregate.
  Single-stream Concurrent-1 on the best native path is **~65–73 t/s**.

So the honest guidance for a B70: **one interactive user → llama.cpp.
A multi-user API or batch/RAG workload → vLLM XPU native int4 MoE (prefill win +
aggregate scales past 145 easily).** For us, the pi-telegram-bridge is single-user —
llama.cpp stays production. Full campaign notes: B70-DOCS
`research/vllm-021-campaign-20260806.md` A13, benchmark-history Run 16–17.

## Methodology

- **Run 13–15 (MXFP4 path):** `intel/vllm:0.17.0-xpu` (vllm-xpu-kernels v0.1.4),
  self-built native MXFP4 checkpoint (22.4 GB), 7 engine patches. Concurrency
  head-to-head vs llama.cpp SYCL at 165W.
- **Run 16–17 (GPTQ-Int4 path):** `intel/vllm:0.21.0-xpu-full` (Triton MoE) and
  `intel/vllm:0.21.0-xpu-int4moe` (native `XpuFusedMoe`). Checkpoint: plain
  `Qwen3.6-35B-A3B-GPTQ-Int4`. Flags: `--quantization gptq --dtype float16
--language-model-only`, FLASH_ATTN PIECEWISE graphs, power 150–230W. Native path
  requires int8 storage after `implement_zp` (C++ `is_B_int4 = B_dtype == at::kChar`).
- Benchmark (Reddit mirror): streaming `/v1/chat/completions`, TTFT split for
  prefill vs decode, exact `usage.prompt_tokens`, tg32 / pp2048 / tg128, 3 reps
  after warmup discard. Concurrency: threaded clients C=1/4/8/16 with
  `--max-num-seqs ≥ C` (max-num-seqs=1 serializes and fakes flat aggregate).
- Production restored after every run: `llama-profile.service` + 150W power cap.
- Repo evidence: `benchmark-history.md` Runs 14–17,
  `results/vllm-021-native-int4-v4-*.json`, `results/vllm-021-gptq-*.json`,
  `research/vllm-021-campaign-20260806.md` A13, patch
  `scripts/tmp/vllm-xpu-int4-patch/patch_xpu_int4_moe_v4.py`.
