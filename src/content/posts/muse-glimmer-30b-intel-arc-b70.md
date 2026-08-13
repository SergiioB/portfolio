---
title: "Muse Glimmer-30B on the Intel Arc Pro B70: 128K context, DFlash, and a 3.4× build-flag fix"
description: "First B70 run of Meta's Muse Glimmer-30B on llama.cpp SYCL: DFlash n_max=2 wins the sweep (p512 26.8, p8192 22.9, p32768 21.1 t/s at 128K ctx / 230 W), the 3.4× 'slow prefill' was a missing GGML_SYCL_F16=ON flag (pp4096 293 → 1,301 t/s), and vLLM stays blocked (FP8 won't fit 32 GB)."
situation: "Meta dropped Muse-Glimmer-30B (Apache-2.0, dense 27.85B text + ViT-G/14 vision, 128K context) with llama.cpp arch support landing the same week."
issue: "Prefill looked 3-4× slower than the dense-27B baseline, decode was called 'very slow', and the obvious vLLM quant (FP8-block) looked like the fix."
solution: "Rebuild with GGML_SYCL_F16=ON (the missing flag was the whole prefill gap), screen DFlash draft depth 1-8 at 128K ctx / 230 W, confirm the winner with n=5, and push the long-context curve to 32K."
usedIn: "llama.cpp master d2f83055d (F16 SYCL build), unsloth Q4_K_XL + mmproj-kquant + dflash-kquant, benchmark-history Run 33-35."
impact: "DFlash n_max=2 beats no-spec by +19% p512 / +33% p8192 / +52% p32768; prefill pp4096 1,301 t/s after the flag fix; 128K ctx fits with --parallel 1; n8 draft depth crashes the server."
amazonUrl: https://go.sergiiob.dev/arc-pro
pubDate: 2026-08-10
category: ["b70", "local-ai", "infrastructure"]
tags:
  [
    "local-ai",
    "llama.cpp",
    "sycl",
    "intel-arc",
    "arc-pro-b70",
    "muse-glimmer",
    "dflash",
    "benchmark",
    "128k",
  ]
draft: false
---

# Muse Glimmer-30B on the Intel Arc Pro B70

A field note from **2026-08-10**. Every number below is a measured single-stream
(C1) result from one campaign on the B70 (`results/muse-dflash-sweep-manual-20260810T164735/`,
`docs/benchmark-history.md` Run 33-35). Decode is the **llama.cpp engine rate**
(`timings.predicted_per_second`, HTTP); prefill is **llama-bench pp**. **E2
provisional · self-reported, not independently reproduced.**

## The plot twist first

Muse prefill looked 3-4× slower than the dense-27B baseline (pp4096 ≈ 293 t/s vs
~936). The "optimization" was a **build flag**, not a kernel:
`GGML_SYCL_F16=ON`. Without it, the SYCL kernels drop to fp32 paths and prefill
loses 3.4×. With it: **pp4096 = 1,301 t/s** (+344%), and decode also gains ~16%.
The lesson: verify your cmake flags against the production build before blaming
the architecture.

## The model and why it fits

|              |                                                                                                                          |
| ------------ | ------------------------------------------------------------------------------------------------------------------------ |
| Text decoder | 27.85B dense, 52 layers, GQA 32/2, sliding-window-2048 (iRoPE)                                                           |
| Vision       | ViT-G/14 (~1.8B), dynamic resolution                                                                                     |
| Context      | 131,072 trained                                                                                                          |
| Quirk        | Reasoning model — generations carry a `reasoning_content` channel; short `max_tokens` returns empty `content` (use 512+) |
| Spec decode  | DFlash block-diffusion draft (block 16, 5 layers)                                                                        |

**VRAM math (32,656 MiB):** Q4_K_XL 14.78 GiB + mmproj 1.40 GB + dflash draft
1.63 GB + q8_0/q4_1 KV. **128K ctx fits with `--parallel 1`** (≈2-4 GiB free);
with 4 slots the KV pool (≈5.6 GiB/slot at 128K) does not. 64K runs with 4 slots.

## Results (128K ctx, 230 W cap, `-ub 8192`, C1 cold, exact unique prompts)

**DFlash draft-depth screen** (n=3 median, engine decode t/s):

| draft depth |                  p512/g128 | p8192/g128 | acceptance |
| ----------- | -------------------------: | ---------: | ---------: |
| no-spec     |                       22.5 |       17.2 |          — |
| n_max=1     |                       24.8 |       20.0 |       0.91 |
| **n_max=2** |                   **27.6** |   **21.4** |       0.86 |
| n_max=3     |                       26.3 |       21.3 |       0.74 |
| n_max=4     |                       27.5 |       18.2 |       0.74 |
| n_max=5-7   |                      21-23 |      13-15 |  0.30-0.56 |
| n_max=8     | — (server crash at launch) |            |            |

Acceptance decays with draft depth (0.91 → 0.30); n_max=8 is unsupported at
128K. Small draft windows win — the same lesson as vLLM spec-N (§15.8).

**Winner confirmed (DFlash n_max=2, fresh n=5):**

| prompt      | t/s median |  max |   TTFT | acceptance |
| ----------- | ---------: | ---: | -----: | ---------: |
| p512/g128   |       26.8 | 28.9 |  1.1 s |       0.85 |
| p8192/g128  |       22.9 | 23.1 | 12.3 s |       0.75 |
| p32768/g128 |       21.1 | 21.1 | 48.1 s | 0.75 (n=3) |

**Long-context: DFlash gain grows with context** (winner vs no-spec):

| prompt | DFlash n2 | no-spec |        Δ |
| ------ | --------: | ------: | -------: |
| p512   |      26.8 |    22.5 |     +19% |
| p8192  |      22.9 |    17.2 |     +33% |
| p32768 |      21.1 |    13.9 | **+52%** |

**Prefill** (llama-bench pp, no-spec — DFlash does not change prefill):
pp512 **858** · pp2048 **1,278** · pp4096 **1,301** · pp8192 **1,172** ·
pp32768 **865** t/s. Long-prompt prefill degrades as memory access grows.

**Power:** 230 W cap; measured draw (energy counter) ~83-138 W during decode
windows; peak 73-74 °C.

![Muse Glimmer-30B B70 dashboard](/images/b70-muse-glimmer-dashboard.svg)

## Config

```bash
llama-server -m Muse-Glimmer-30B-UD-Q4_K_XL.gguf \
  --mmproj mmproj-kquant.gguf \
  -c 131072 --parallel 1 -ngl 99 -ncmoe 0 -fa on -ctk q8_0 -ctv q4_1 -t 8 \
  --no-mmap -b 8192 -ub 8192 --host 0.0.0.0 --port 8765 \
  --spec-type draft-dflash --spec-draft-model dflash-kquant.gguf \
  --spec-draft-n-max 2
```

Vision works via the OpenAI-compatible multipart endpoint (image → correct
description, verified). `GGML_SYCL_F16=ON` is mandatory in the build.

## Methodology and honesty

- **Decode** = engine `timings.predicted_per_second` (C1, cold, unique
  entropy-first prompts at 512/8192/32768 targets, +~50 chat-template tokens
  verified per request). **Prefill** = llama-bench pp. Never merged.
- 1 warmup (SYCL JIT, discarded) + n=3 per screen cell; n=5 for the top two
  depths. Cap 230 W; draw measured via `energy1_input`; temp via hwmon4.
- **Quality caveat:** decode includes reasoning tokens, and speed does not
  establish output/task-quality parity — a reference-quality check against BF16
  is a separate, not-yet-done step.
- 128K **loads and serves**; the benchmark cells ran to 32K per scope. The 128K
  full-context cell and a vision-throughput cell remain future work.

## Why not vLLM (yet)

> **Correction — 2026-08-13.** The 2026-08-10 note below is still true for
> **FP8**. It is no longer true that “no INT4 exists.” A compressed-tensors
> W4A16 artifact plus a local PR #51655 overlay loaded on XPU. That path is
> experimental (n=3 text-only screen, not a public image). llama.cpp GGUF +
> DFlash n2 remains the recommended recipe. Details:
> cookbook `docs/muse-glimmer/MUSE-GLIMMER-B70.md`.

- `RedHatAI/Muse-Glimmer-30B-FP8-block` = **34.4 GB** — does not fit 32 GB VRAM.
- vLLM XPU has **no FP8 linear kernel** (`KeyError: PlatformEnum.XPU`).
- NVFP4/MXFP4 are Blackwell-class; the public llama.cpp path is still GGUF.
- A later compressed-tensors INT4 smoke exists; it is **not** this post's
  measured stack and is **not** faster than the 26.8 t/s llama.cpp DFlash cell.

## References

- Evidence: `results/muse-dflash-sweep-manual-20260810T164735/`
- Runs: `docs/benchmark-history.md` Run 33 (first run), Run 34 (flag fix), Run 35 (sweep)
- Model: `unsloth/Muse-Glimmer-30B-GGUF` · base `meta-models/Muse-Glimmer-30B`
- Adoption runbook: `.agents/skills/muse-glimmer-adoption/`
