---
title: "Intel Arc Pro B70: The vLLM Question, Actually Tested"
description: "Community threads claim vLLM XPU gives 10x the speed of llama.cpp on the B70 (11,000 t/s prefill, 150 t/s decode on Qwen3.6-35B-A3B). I tested the full path — image, FP8, MXFP4, self-built native checkpoints, seven engine patches — and the model did run. The measured truth: prefill parity, decode 7x slower than llama.cpp."
situation: "Every Intel Arc B70 thread has the same refrain: 'B70 is made for vLLM, llama.cpp is diesel in a Formula 1.' The claims are specific: 11,000 t/s prefill and 150 t/s decode on Qwen3.6-35B-A3B at MXFP4, one GPU. We run llama.cpp SYCL in production at 72.6 t/s decode / 2128 t/s prefill — so the question was worth testing directly rather than taking either side on faith."
issue: "The vLLM path has three gates, and each one turned out to be real: (1) the FP8 checkpoint for this model is 37.5 GB — it does not fit 32 GB of VRAM, so FP8 is off the table for 35B; (2) the MXFP4 (Intel 4-bit) checkpoints that exist publicly are in the compressed-tensors layout, which vLLM's XPU build rejects; (3) the prebuilt Intel images have an MXFP4 MoE path written for gpt-oss — the Qwen loader is broken in seven separate places, from tensor shapes to activation gating to hybrid-model page sizes."
solution: "I built the native-format MXFP4 checkpoint myself (fused 256 experts per layer into the w13/w2 layout, verified to 8.8e-5 MSE against BF16 ground truth), moved to the newer intel/vllm:0.17.0-xpu image, and patched the seven engine bugs in-container — 2D per-expert loader support, missing scale-key mapping, the silu-vs-swiglu_oai activation gate (the XPU kernel supports silu; the Python gate doesn't), CUDA-only device contexts in the linear-attention path, a contiguity check, and the hybrid block-size alignment that produced a page size the XPU flash-attention kernel rejects. The model then served and generated correct output."
usedIn: "Intel Arc Pro B70 32GB test rig (Ubuntu 26.04), intel/vllm:0.17.0-xpu (vllm-xpu-kernels v0.1.4), self-built Qwen3.6-35B-A3B MXFP4 checkpoint (22.4 GB), llama.cpp SYCL b10255+ production."
impact: "The model ran — and the benchmark is decisive: vLLM XPU MXFP4 reaches ~1,740 t/s prefill (within 20% of llama.cpp) but only 10.4 t/s decode — 7x slower than llama.cpp SYCL's 72.6 t/s. The 150 t/s claim is not achievable on this hardware with the hybrid Qwen3.6-35B-A3B-UD: its linear-attention layers run generic triton kernels on XPU. llama.cpp remains the production engine. Full evidence trail in the repo (benchmark-history Run 14)."
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

| Metric              | vLLM 0.17 XPU MXFP4     | llama.cpp b10255 Q4_K_XL | Δ vs llama.cpp  |
| ------------------- | ----------------------- | ------------------------ | --------------- |
| Decode              | 10.4 t/s                | 72.6 t/s                 | **7.0× slower** |
| Prefill (4K prompt) | ~1,738 t/s              | 2,128 t/s                | −18%            |
| VRAM                | 32.7 GB (95% pre-alloc) | ~21 GB                   | —               |
| Power / temp        | 165W / 62°C             | 150W / ~66°C             | —               |
| First-call latency  | ~4 min (triton JIT)     | ~30s (SYCL JIT)          | —               |

- Decode is per-step kernel-bound: the hybrid Qwen3.6-35B-A3B-**UD** model's
  linear-attention layers run **generic triton chunk kernels** on XPU — no hand-tuned
  SYCL — capping decode at ~96 ms/step regardless of how fast the MXFP4 MoE itself is.
- Prefill is batched, which is where triton shines: within 20% of llama.cpp.
- Steady-state requests: ~49 s per 1.5K-prompt + 512-gen completion.

**Bottom line:** the Reddit number (150 t/s) is not reproducible on this hardware with
this model. Even with a fully working MXFP4 path, the hybrid model's attention
stack on XPU is the wall — not the MoE.

## Conclusion

The vLLM XPU path on the B70 is no longer a mystery:

- **It works** — after a self-built checkpoint and seven engine patches, the model
  serves with correct output.
- **Its prefill is genuinely competitive** (~1,740 t/s vs llama.cpp's 2,128 t/s).
- **Its decode is 7× slower** than llama.cpp SYCL (10.4 vs 72.6 t/s) — the opposite
  of the claim.

llama.cpp SYCL stays the production engine, and the B70's real headline stays what we
measured: 72.6 t/s decode, 2128 t/s prefill at 4K, 1211 t/s at 128K context, MTP-4
speculative decoding on dense. For prefill-heavy batch workloads, vLLM MXFP4 is worth
another look once Intel ships a native linear-attention kernel for XPU.

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
- Repo evidence: `benchmark-history.md` Run 14, `results/vllm-mxfp4-summary-20260805.md`,
  patch set `scripts/tmp/vllm017-full-patch.py`
