---
title: "Phase 1: The vLLM Question on Intel Arc Pro B70 (MXFP4 Native Test)"
description: "Community threads claim vLLM XPU gives 10x the speed of llama.cpp on the B70 (11,000 t/s prefill, 150 t/s decode). I tested the full path — image, FP8, MXFP4, self-built native checkpoints, seven engine patches. The measured truth before MTP speculative decoding: llama.cpp wins single-stream by 6x, and the '150 t/s' claim turns out to be vLLM at 16 concurrent users. (See Phase 2 for the speculative decoding breakthrough)."
situation: "Every Intel Arc B70 thread has the same refrain: 'B70 is made for vLLM, llama.cpp is diesel in a Formula 1.' The claims are specific: 11,000 t/s prefill and 150 t/s decode on Qwen3.6-35B-A3B at MXFP4, one GPU. We run llama.cpp SYCL in production at 72.6 t/s decode / 2128 t/s prefill — so the question was worth testing directly rather than taking either side on faith."
issue: "The vLLM path has three gates, and each one turned out to be real: (1) the FP8 checkpoint for this model is 37.5 GB — it does not fit 32 GB of VRAM, so FP8 is off the table for 35B; (2) the MXFP4 (Intel 4-bit) checkpoints that exist publicly are in the compressed-tensors layout, which vLLM's XPU build rejects; (3) the prebuilt Intel images have an MXFP4 MoE path written for gpt-oss — the Qwen loader is broken in seven separate places, from tensor shapes to activation gating to hybrid-model page sizes."
solution: "I built the native-format MXFP4 checkpoint myself (fused 256 experts per layer into the w13/w2 layout, verified to 8.8e-5 MSE against BF16 ground truth), moved to the newer intel/vllm:0.17.0-xpu image, and patched the seven engine bugs in-container — 2D per-expert loader support, missing scale-key mapping, the silu-vs-swiglu_oai activation gate (the XPU kernel supports silu; the Python gate doesn't), CUDA-only device contexts in the linear-attention path, a contiguity check, and the hybrid block-size alignment that produced a page size the XPU flash-attention kernel rejects. The model then served and generated correct output."
usedIn: "Intel Arc Pro B70 32GB test rig (Ubuntu 26.04), intel/vllm:0.17.0-xpu (vllm-xpu-kernels v0.1.4), self-built Qwen3.6-35B-A3B MXFP4 checkpoint (22.4 GB), llama.cpp SYCL b10255+ production."
impact: "Run 18: vLLM XPU MTP speculative decoding UNLOCKED on the hybrid GDN model — single-stream tg32 123 t/s (85% of Reddit 145) / pp2048 7.3K (91% of 8K) @230W, +70% over the no-spec baseline (Run 17: 72.6 / 9.1K). The A14 verdict 'XPU GDN incompatible with speculative decoding' was an overcautious assert; removing it lets MTP through. 145 itself is the single-layer MTP ceiling on this checkpoint (num_spec=2 clamps to 1). First vLLM XPU result to beat llama.cpp MoE single-stream parity. KL/acceptance audit vs eager still required before production. Evidence: benchmark-history Run 16–18."
pubDate: 2026-08-05
category: ["b70", "local-ai", "infrastructure"]
amazonUrl: https://go.sergiiob.dev/arc-pro
tags: ["local-ai", "vllm", "llama.cpp", "sycl", "intel-arc", "arc-pro-b70", "mxfp4", "xpu"]
draft: false
---

> **Context:** this post is Phase 1 (the initial architecture testing) of the B70 build-upgrade work. It documents the initial negative headline result before MTP speculative decoding was unlocked. For the final showdown and the 133 t/s MTP fix, read **[Phase 2: vLLM vs llama.cpp — The Full MoE + Dense Showdown](/posts/intel-arc-b70-vllm-vs-llamacpp-moe-dense-showdown)**.

## Situation

The B70 threads keep saying the same thing:

> "Buying a B70 and using it with llama.cpp is the same as buying a Formula 1 and
> putting diesel inside. B70 is made for vLLM — 11,000 pp and 150 tg on
> Qwen3.6-35B-A3B on one GPU."

Our production numbers with llama.cpp SYCL (b10255+, q8_0/q4_1 KV, 150W): **72.6 t/s
decode, 2128 t/s prefill, 512K context allocation (VRAM fit)** on the same model family. If vLLM really gives
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

### Update — Run 18 (MTP speculative unlocked)

Then we went one layer deeper. The A14 verdict ("XPU GDN kernel rejects
speculative sequence masks → no speculative decoding on this hybrid model")
turned out to be an **overcautious assert, not a real kernel limit**. The XPU
GDN SYCL kernel already receives explicit spec-decode tensors
(`num_spec_decodes`, `spec_query_start_loc`, `spec_token_indx`,
`spec_state_indices_tensor`); the boolean `spec_sequence_masks` it asserts on
is metadata-only and is never passed to the kernel. Removing the assert lets
speculative decoding through.

We also needed the MTP draft head to actually load. The
`Qwen3.6-35B-A3B-MTP-Preserved-GPTQ-Int4` checkpoint stores the MTP layers as
BF16 fused experts, but the draft inherits the target's GPTQ quant_config — so
the draft experts come up GPTQ-shaped (`w2_qweight`) and crash on load
(`KeyError: w2_weight`). Patching the three construction sites
(`Qwen3_5MultiTokenPredictor.__init__`, `Qwen3NextSparseMoeBlock`, `FusedMoE`)
to strip `quant_config` whenever the prefix contains `mtp` builds the draft
unquantized, and a one-line `XpuFusedMoe` kwarg strip (the kernels auto-detect
dtype) closes the load path.

| Config (single-stream, 230W)      |    tg32 |    pp2048 | vs Reddit 145 / 7975 |
| --------------------------------- | ------: | --------: | -------------------- |
| Native int4 v4, no spec (Run 17)  |    72.6 |     9,094 | baseline             |
| **Native int4 v4 + MTP (Run 18)** | **123** | **7,261** | **85% / 91%**        |
| Reddit claim                      |     145 |     7,975 | —                    |

- **Decode +70%** over no-spec (72.6 → 123 t/s). This is the **first vLLM XPU
  result to beat llama.cpp MoE single-stream parity** — llama.cpp Q4_K_XL does
  ~72-73 t/s with no usable MTP on MoE.
- 1.69× effective speedup ⇒ ~69% implied draft-token acceptance on hybrid GDN.
- `num_speculative_tokens=2` requested, clamped to 1 (checkpoint has 1 MTP
  layer) → 123 t/s is the **single-layer MTP ceiling** on this card.
- **Caveat:** the GDN assert was removed without a KL-divergence / acceptance
  audit vs the eager path. Output is coherent on spot checks, but treat the
  XPU spec path as research-grade until that audit lands.

So the corrected scorecard after Run 18: **vLLM XPU native int4 + MTP wins
single-stream decode (123 vs llama.cpp ~73), wins prefill (7.3K vs ~2.1K), and
wins aggregate (694 wall-agg at C16). llama.cpp wins single-user interactive
latency (lower TTFT at small batch), GGUF efficiency, and the safety of an
unmodified attention path.** For a single-user chat front-end, llama.cpp
still stays production — but the gap closed hard.

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
aggregate scales past 145 easily).** For a single-user chat front-end,
llama.cpp stays production. Full campaign notes: B70-DOCS
`research/vllm-021-campaign-20260806.md` A13, benchmark-history Run 16–17.

### Update — Run 19 (full engine + power sweep)

After unlocking MTP (Run 18), we mapped the full prefill × generation surface for
both engines on MoE, swept power to find the sweet spots, and tested dense 27B on
both. The picture is now complete.

**MoE 35B — vLLM MTP vs llama.cpp, full grid (single-stream, 150W sweet spot):**

| Prompt \ Gen | g32        | g128       | g256       | g512       |
| ------------ | ---------- | ---------- | ---------- | ---------- |
| short        | **127**/74 | **118**/72 | **113**/67 | **110**/72 |
| p512         | **121**/73 | **116**/72 | **115**/72 | **113**/72 |
| p1k          | **113**/73 | **114**/64 | **114**/70 | **105**/70 |
| p2k          | **111**/70 | **126**/69 | **116**/69 | **118**/63 |
| p4k          | **130**/66 | **114**/65 | **116**/65 | **116**/65 |
| p8k          | **126**/59 | **111**/58 | **114**/58 | **114**/58 |

Format: **vLLM MTP** / llama.cpp. vLLM is **1.5–2.1× faster decode**, and the
advantage _grows with prompt length_ (1.5× short → 2.1× at 8K). Prefill: vLLM
**3.8–8.5× faster** (5.6–7.5K vs 104–1,728 t/s).

**Power sweet spots:**

| Model     | Sweet spot                          | Why                                                       |
| --------- | ----------------------------------- | --------------------------------------------------------- |
| MoE 35B   | **150W**                            | Self-limits to ~140W; 230W gives -8% (noise) at +80W heat |
| Dense 27B | **180W** (sustained) / 230W (burst) | Scales +18–30% 150→230W, but thermal cost (79°C)          |

**Dense 27B verdict:** vLLM has **no FP8 XPU kernel at all** —
`KeyError: PlatformEnum.XPU` in `choose_scaled_mm_linear_kernel`. Not slow,
_absent_. llama.cpp is the only working dense engine (Q4_K_M @230W = 23 t/s).
llama.cpp dense+MTP (the GGUF `nextn` layer) pushes ~24–30 t/s — the only path
past the Q4 baseline.

**Final scorecard (single-stream, sweet-spot power):**

| Model     | Engine       | Decode (p2k/g128) | Prefill (p2k) | Power | Temp |
| --------- | ------------ | ----------------: | ------------: | ----: | ---: |
| MoE 35B   | **vLLM MTP** |       **126 t/s** | **6,217 t/s** |  150W | 58°C |
| MoE 35B   | llama.cpp    |            69 t/s |     1,498 t/s |  150W | 58°C |
| Dense 27B | llama.cpp    |            23 t/s |     1,007 t/s |  230W | 79°C |
| Dense 27B | vLLM FP8     |      ❌ no kernel |             — |     — |    — |

The honest bottom line: **on the B70, MoE is 5–6× faster than dense** (bandwidth:
MoE reads ~3 GB/token, dense ~19 GB). vLLM MTP wins MoE on both decode and
prefill. llama.cpp wins dense by default (vLLM has no dense XPU kernel). Power:
**run MoE at 150W, dense at 180W**. Full grid + raw JSON:
`results/engine-comparison-full-20260806.md`, benchmark-history Run 19.

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
