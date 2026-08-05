---
title: "Intel Arc Pro B70: The vLLM Question, Actually Tested"
description: "Community threads claim vLLM XPU gives 10x the speed of llama.cpp on the B70 (11,000 t/s prefill, 150 t/s decode on Qwen3.6-35B-A3B). I tested the full path — image, FP8, MXFP4, self-built native checkpoints — and found what's real, what's missing, and why the claims need a toolchain this stack doesn't have."
situation: "Every Intel Arc B70 thread has the same refrain: 'B70 is made for vLLM, llama.cpp is diesel in a Formula 1.' The claims are specific: 11,000 t/s prefill and 150 t/s decode on Qwen3.6-35B-A3B at MXFP4, one GPU. We run llama.cpp SYCL in production at 72.6 t/s decode / 2128 t/s prefill — so the question was worth testing directly rather than taking either side on faith."
issue: "The vLLM path has three gates, and each one turned out to be real: (1) the FP8 checkpoint for this model is 37.5 GB — it does not fit 32 GB of VRAM, so FP8 is off the table for 35B; (2) the MXFP4 (Intel 4-bit) checkpoints that exist publicly are in the compressed-tensors layout, which vLLM's XPU build rejects; (3) the only prebuilt Intel vLLM image available (llm-scaler 0.14.0) has its MXFP4 MoE path written for gpt-oss — the Qwen loader path is broken in ways a checkpoint cannot work around."
solution: "I built the native-format MXFP4 checkpoint myself: fused the 256 experts per layer from the community checkpoint into the w13/w2 layout vLLM's Intel kernel expects, dequantized the dense projections to BF16 against ground truth (verified to 8.8e-5 MSE), and produced a 22.4 GB model that fits the card. Then the engine itself failed: the 0.14.0 build's fused-MoE loader crashes on per-expert slices (its own source carries a gpt-oss FIXME), and its Qwen fused-expert mapping has no scale-key entries at all — two engine bugs no checkpoint can satisfy."
usedIn: "Intel Arc Pro B70 32GB test rig (Ubuntu 26.04), intel/llm-scaler-vllm:0.14.0-b8.3.2, Qwen3.6-35B-A3B MXFP4 checkpoints, llama.cpp SYCL b10255+ production."
impact: "The vLLM superiority claims are real for a toolchain we don't have: a source-built vLLM XPU with the 2026 MXFP4 MoE integration plus Intel's llm-compressor. On the available stack, the path is a dead end — and llama.cpp SYCL remains the right production choice at 72.6 t/s MoE decode, 2128 t/s prefill, 512K context. Full evidence trail in the repo (benchmark-history Run 13)."
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
> negative result — which is also a result.

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

The available prebuilt image (`intel/llm-scaler-vllm:0.14.0-b8.3.2`) boots fine on the
B70 with `/dev/dri` passthrough. Its MXFP4 MoE loader, however, carries this in the
source:

```python
# (FIXME) for gpt-oss all experts are combined
```

The loader expects a full 3D fused tensor per call; the Qwen model loader slices per
expert (2D) — a crash on load. After patching that, the next failure: the Qwen
fused-expert key mapping has **no scale-key entries at all**, so no checkpoint key
naming can load the scales. Two engine bugs, no checkpoint can satisfy either.

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
16.5 GB packed experts). The engine bugs, not the checkpoint, are the blocker.

## Results

| Path                                 | Status                         | Why                                            |
| ------------------------------------ | ------------------------------ | ---------------------------------------------- |
| vLLM XPU image boots on B70          | ✅ works                       | /dev/dri + VLLM_TARGET_DEVICE=xpu              |
| FP8 35B                              | ❌ impossible                  | 37.5 GB > 32 GB                                |
| Public MXFP4 checkpoint              | ❌ layout mismatch             | per-expert unfused vs fused w13/w2             |
| Native MXFP4 checkpoint (self-built) | ✅ built + verified            | 22.4 GB, MSE 8.8e-5                            |
| vLLM load, this image                | ❌ engine bugs                 | gpt-oss-only MoE loader; missing scale mapping |
| **llama.cpp SYCL (our production)**  | **72.6 t/s · 2128 t/s · 512K** | working today                                  |

## Conclusion — and what the 150 t/s claims actually require

The Reddit numbers are not fiction — they're just built on a toolchain this stack
doesn't have:

1. **A newer vLLM XPU build** (source-built, with the Qwen3.5/3.6 + MXFP4 MoE
   integration that landed after llm-scaler 0.14.0)
2. **Intel's llm-compressor** MXFP4 quantization toolchain (the claimed checkpoints are
   self-quantized, not public)
3. **A machine with enough RAM** to load the 70 GB BF16 source (we have 30 GB)

That's a multi-hour source-build project, not a configuration change. Until then:
llama.cpp SYCL stays the production engine, and the B70's real headline stays what we
measured — 72.6 t/s decode, 2128 t/s prefill at 4K, 1211 t/s at 128K context, MTP-4
speculative decoding on dense.

## Methodology

- Image: `intel/llm-scaler-vllm:0.14.0-b8.3.2` (Intel's prebuilt vLLM XPU), run with
  `/dev/dri` passthrough, `VLLM_TARGET_DEVICE=xpu`, oneAPI env
- Checkpoints: `Qwen/Qwen3.6-35B-A3B-FP8` (37.5 GB), community MXFP4
  (`pahajokiconsulting/...-MXFP4`, compressed-tensors), self-built native MXFP4
  (BF16 dense + fused experts)
- Dequant verification: MSE against `Qwen/Qwen3.6-35B-A3B` BF16 weights, layer 10
  fused gate+up, all 256 experts
- Repo evidence: `benchmark-history.md` Run 13, scripts in `scripts/tmp/`, artifacts
  on the test host
