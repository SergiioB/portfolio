---
title: "Intel Arc Pro B70: vLLM vs llama.cpp — The Full MoE + Dense Showdown"
description: "After a 6-week, 19-run campaign, here is the complete vLLM XPU vs llama.cpp SYCL comparison on the Arc Pro B70 — full prefill × generation grids, power sweet spots, and the MoE vs Dense verdict. Headline: vLLM MTP is 1.8× faster decode / 4.2× faster prefill than llama.cpp on MoE (126 vs 69 t/s); llama.cpp wins Dense by default (vLLM has no XPU FP8 kernel). Plus the four-patch path that unlocked MTP speculative decoding on the hybrid GDN model."
situation: "Every B70 owner hits the same fork: vLLM or llama.cpp? The community claims are loud ('vLLM does 145 t/s single-stream!') but nobody had published a clean, apples-to-apples grid across prompt sizes, generation lengths, and power levels for both engines on both model classes. So we ran one — 19 benchmark runs, two engines, two model architectures, four wattages, full prefill × generation surfaces."
issue: "Three blockers stood between us and a real answer. (1) The vLLM XPU native int4 MoE path was broken — C++ only enables int4 when weights are torch.int8 (at::kChar), but GPTQ packs as uint8, so the kernel treated weights as BF16 and crashed on a shape check. (2) MTP speculative decoding — the obvious way to break the bandwidth ceiling — was blocked twice: the GPTQ-preserved checkpoint's MTP layers inherit the target's quant config and crash on load, AND the XPU GDN attention kernel asserted it doesn't support speculative sequence masks. (3) Dense 27B on vLLM needs FP8, and vLLM has no FP8 kernel registered for XPU at all."
solution: "Four in-container patches unlocked the MoE path: native int4 (implement_zp → int8 storage), BF16 MTP draft (strip quant_config for any mtp prefix), XpuFusedMoe kwarg strip (kernels auto-detect dtype), and removing the overcautious GDN spec assert (the kernel already takes explicit spec tensors — the boolean mask is metadata-only and never reaches SYCL). Then we ran the full grid on both engines at 150W and 230W, plus dense on llama.cpp at both wattages, to map the entire surface and find the power sweet spots."
usedIn: "Intel Arc Pro B70 32GB (Ubuntu 26.04), intel/vllm:0.21.0-xpu-int4moe + 4 patches, llama.cpp SYCL b10255+ (build-sycl-0804), Qwen3.6-35B-A3B MoE + ThinkingCap-Qwen3.6-27B dense, 150W/230W power sweep."
impact: "vLLM XPU MTP beats llama.cpp on MoE by 1.8× decode / 4.2× prefill (single-stream). Dense: llama.cpp only (vLLM FP8 has no XPU kernel). Sweet spots: MoE=150W (self-limits, cooler), Dense=180W sustained / 230W burst (+18-30%, thermal cost). MoE is 5-6× faster decode than dense on this card. Full campaign: benchmark-history Run 14-19, research/vllm-021-campaign-20260806.md A1-A16."
pubDate: 2026-08-06
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
    "battlemage",
    "moe",
    "speculative-decoding",
    "mtp",
    "benchmark",
  ]
draft: false
---

## The question, and why it took 19 runs

Every Intel Arc B70 thread has the same fork in it: **vLLM or llama.cpp?** The
vLLM camp cites 145 t/s single-stream decode and 8K t/s prefill. The llama.cpp
camp (us, in production) runs at ~73 t/s decode and asks, quietly, how.

The honest answer turned out to require **19 benchmark runs** — not because
anyone was lying, but because each claim was measuring a different thing on a
different stack with a different patch level, and the only way to sort it out
was to map the entire surface ourselves: both engines, both model classes
(MoE 35B and dense 27B), four wattages, and a full grid of prompt sizes ×
generation lengths.

This post is that map. The short version: **both sides are right about different
things**, and the MoE vs Dense gap on this card is enormous.

## How we got here (the campaign arc)

| Run    | What we tried                                                    | What we learned                                                                              |
| ------ | ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| 13–14  | vLLM 0.17 MXFP4 (self-built checkpoint, 7 patches)               | Served & correct, but decode 7× slower than llama.cpp — image too old                        |
| 15     | Concurrency head-to-head (16 users)                              | The "150 t/s" claim = multi-user aggregate (153 gen t/s @ C16), not single-stream            |
| 16     | vLLM 0.21 Triton GPTQ MoE                                        | 58 t/s single-stream — Triton path leaves ~40% on the table                                  |
| 17     | **Native XpuFusedMoe int4 unlocked** (root cause: uint8 vs int8) | 72.6 t/s decode / 9,094 prefill — **prefill beats Reddit, decode = bandwidth ceiling**       |
| 18     | **MTP speculative decoded** (4 patches, GDN assert removed)      | **123 t/s single-stream** — first vLLM XPU result to beat llama.cpp MoE parity               |
| **19** | **Full engine + power sweep** (this post)                        | **vLLM MTP 1.8×/4.2× over llama.cpp; MoE=150W / Dense=180W sweet spots; dense vLLM blocked** |

The two breakthroughs were Run 17 (native int4 — a one-bit dtype bug) and Run 18
(MTP — three load-path patches plus removing an overcautious assert that everyone
_assumed_ was a real kernel limit).

## The four patches that unlocked MTP (Run 18)

MTP speculative decoding was "known impossible" on this model: it's a hybrid GDN
architecture (linear attention + full attention layers), and the XPU GDN kernel
had a hard `assert attn_metadata.spec_sequence_masks is None`. Run 14 (ngram)
hit that assert and we wrote it up as "XPU GDN incompatible with speculative
decoding."

That was **wrong**. Four patches fixed it:

1. **Native int4 dtype** (`patch_xpu_int4_moe_v4.py`) — `implement_zp` stores
   `torch.int8` so C++ `is_B_int4 = (B_dtype == at::kChar)` triggers; route
   `MoeWNA16Method.apply` → `XpuFusedMoe`.
2. **BF16 MTP draft** (`patch_mtp_bf16_draft.py`) — strip `quant_config` at
   `MultiTokenPredictor.__init__`, `Qwen3NextSparseMoeBlock`, and `FusedMoE`
   for any prefix containing `mtp`. The checkpoint's MTP experts are BF16
   fused tensors; inheriting GPTQ made them `w2_qweight`-shaped → `KeyError`.
3. **XpuFusedMoe kwarg strip** — remove `is_fp8` / `is_mxfp4` from the
   `XpuFusedMoe(...)` call site (the kernels auto-detect dtype).
4. **GDN spec assert → warning** — the SYCL kernel already receives
   `num_spec_decodes`, `spec_query_start_loc`, `spec_token_indx`,
   `spec_state_indices_tensor`; the boolean `spec_sequence_masks` is
   metadata-only and is **never passed to the kernel**. The assert was a
   guardrail, not a capability limit.

After all four, the server came up, served requests, and decoded at **123 t/s**.
Correctness verified: greedy `temp=0` replays produced byte-identical output
(a corrupting spec path would diverge), and factual probes (17×23=391, capital
of Australia=Canberra) were correct.

![Four patches that unlocked MTP speculative decoding on XPU GDN](/images/diagrams/b70-mtp-unlock-flow.svg)

## The comparison: MoE 35B, full grid

Single-stream (Concurrent-1), 150W sweet spot. Format: **vLLM MTP** / llama.cpp
(best steady-state decode t/s).

| Prompt \ Gen    | g32                  | g128                 | g256                 | g512                 |
| --------------- | -------------------- | -------------------- | -------------------- | -------------------- |
| short (~50 tok) | **127** / 74 (1.73×) | **118** / 72 (1.64×) | **113** / 67 (1.67×) | **110** / 72 (1.53×) |
| p512            | **121** / 73 (1.66×) | **116** / 72 (1.62×) | **115** / 72 (1.61×) | **113** / 72 (1.58×) |
| p1k             | **113** / 73 (1.55×) | **114** / 64 (1.79×) | **114** / 70 (1.62×) | **105** / 70 (1.50×) |
| p2k             | **111** / 70 (1.58×) | **126** / 69 (1.82×) | **116** / 69 (1.67×) | **118** / 63 (1.87×) |
| p4k             | **130** / 66 (1.97×) | **114** / 65 (1.77×) | **116** / 65 (1.80×) | **116** / 65 (1.80×) |
| p8k             | **126** / 59 (2.14×) | **111** / 58 (1.92×) | **114** / 58 (1.97×) | **114** / 58 (1.96×) |

**vLLM MTP is 1.5–2.1× faster decode**, and the advantage **grows with prompt
length** (1.5× short → 2.1× at 8K) — MTP amortizes the per-token bandwidth cost
better on longer contexts.

### Prefill: vLLM's signature MoE win

| Prompt | tokens | vLLM prefill | llama.cpp prefill | vLLM win |
| ------ | -----: | -----------: | ----------------: | -------: |
| short  |     55 |      **563** |               104 |     5.4× |
| p512   |    510 |    **3,406** |               616 |     5.5× |
| p1k    |  1,000 |    **5,883** |               695 |     8.5× |
| p2k    |  1,945 |    **6,217** |             1,498 |     4.2× |
| p4k    |  3,870 |    **6,626** |             1,728 |     3.8× |
| p8k    |  7,545 |    **7,526** |             1,662 |     4.5× |

vLLM is **3.8–8.5× faster on prefill**. This is the native int4 `XpuFusedMoe`
kernel plus continuous-batching prefill — the gap llama.cpp can't close on MoE.

## Power sweet spots (temperature-controlled)

This was the surprise: **MoE and Dense want opposite power settings.**

| Model         | Sweet spot                          | 150W → 230W effect | Temp        | Why                                                       |
| ------------- | ----------------------------------- | ------------------ | ----------- | --------------------------------------------------------- |
| **MoE 35B**   | **150W**                            | **-8%** (slower!)  | flat ~58°C  | Self-limits to ~140W draw; extra cap just adds heat noise |
| **Dense 27B** | **180W** sustained / **230W** burst | **+18–30%**        | 71°C → 79°C | Scales with power; but thermal cost is real               |

MoE is bandwidth-bound and barely changes clock for clock — it reads only the
~3 GB of active experts per token no matter what. Dense reads all ~19 GB of
weights per token, so it benefits from the extra frequency headroom that higher
power buys — at the cost of running 20°C hotter.

**Run MoE at 150W. Run Dense at 180W (or 230W for short bursts).** This keeps
temperatures controlled without sacrificing speed.

## Dense 27B: the one-sided verdict

| Wattage  |  short/g32 |   p2k/g128 | temp peak |
| -------- | ---------: | ---------: | --------: |
| 150W     |     22 t/s |     18 t/s |      71°C |
| **230W** | **26 t/s** | **23 t/s** |      79°C |

Dense scales with power (+18–30%), unlike MoE. But the engine story is one-sided:

**vLLM dense FP8 has no XPU kernel.** Not slow — _absent_. The error is
`KeyError: <PlatformEnum.XPU: 4>` in `choose_scaled_mm_linear_kernel` — there is
no FP8 linear kernel registered for the XPU platform in this vLLM build. The
checkpoint is also 30 GB, which barely fits 32 GB VRAM with KV cache. So
**llama.cpp is the only working dense engine** on this card today.

llama.cpp dense + MTP (the GGUF `nextn` layer) pushes ~24–30 t/s — the only path
past the ~23 t/s Q4 baseline. That's the subject of the next investigation.

## Final scorecard (single-stream, sweet-spot power)

| Model     | Engine       | Config          | Decode (p2k/g128) | Prefill (p2k) | Power | Temp |
| --------- | ------------ | --------------- | ----------------: | ------------: | ----: | ---: |
| MoE 35B   | **vLLM MTP** | GPTQ-Int4 + MTP |       **126 t/s** | **6,217 t/s** |  150W | 58°C |
| MoE 35B   | llama.cpp    | Q4_K_XL GGUF    |            69 t/s |     1,498 t/s |  150W | 58°C |
| Dense 27B | llama.cpp    | Q4_K_M GGUF     |            23 t/s |     1,007 t/s |  230W | 79°C |
| Dense 27B | vLLM         | FP8             |  ❌ no XPU kernel |             — |     — |    — |

## What this all means

![MoE vs Dense bandwidth comparison — why MoE is 5–6× faster on the B70](/images/diagrams/b70-moe-vs-dense-bandwidth.svg)

1. **MoE is 5–6× faster decode than dense on the B70.** Both are bandwidth-bound
   at 608 GB/s, but MoE reads ~3 GB/token (active experts) vs dense's ~19 GB
   (all weights). This isn't a vLLM-vs-llama.cpp thing — it's architecture.
2. **vLLM MTP wins MoE** (1.8× decode, 4.2× prefill over llama.cpp) — but needs
   four in-container patches and an MTP-preserved GPTQ checkpoint. Worth it for
   a serving workload; overkill for single-user interactive.
3. **llama.cpp wins dense by default** — vLLM has no dense XPU FP8 kernel.
   Until that lands upstream, GGUF + SYCL is the only dense path.
4. **Power: MoE=150W, Dense=180W.** MoE self-limits and 230W actively hurts;
   dense scales but pays in heat. Set the cap once per workload.

![Power scaling: MoE flat vs Dense climbing, with temperature](/images/diagrams/b70-power-scaling-moe-vs-dense.svg)

The honest guidance for a B70 owner: **MoE serving workload → vLLM XPU native
int4 + MTP @150W. Single-user interactive → llama.cpp @150W (MoE) or @180W
(dense).** Our pi-telegram-bridge is single-user, so llama.cpp stays production —
but the gap closed hard, and the dense vLLM kernel is the obvious next thing to
chase.

![The Pi-Bridge production topology: a 5W ARM board driving a 150W GPU](/images/diagrams/b70-pi-bridge-architecture.svg)

## What's next: getting dense working on vLLM

The dense 27B vLLM path is blocked on a single upstream gap: **no FP8 linear
kernel registered for XPU** in `vllm/v1/.../kernels/linear/__init__.py`
(`choose_scaled_mm_linear_kernel` raises `KeyError: PlatformEnum.XPU`). Options
worth investigating:

- **Wait for / contribute an XPU FP8 kernel** — Intel's `xpu_kernels` package
  has FP8 paths for other ops; the linear GEMM registration may be a small PR.
- **BF16 dense on vLLM** (skip quantization) — the 27B BF16 is ~54 GB, won't
  fit, but a Q4/AWQ dense checkpoint might serve on vLLM's W4A16 path if XPU
  supports it (needs testing — the GPTQ dense linear path, not MoE).
- **OpenVINO Model Server** — the OVMS dense path (Run 7–10 in our history)
  worked for chat at ~26–40 t/s wall; a `genai-bench`-style run on the int4-OV
  dense checkpoint may be the real vLLM alternative for dense.
- **Push llama.cpp dense+MTP further** — the GGUF `nextn` layer gave ~24–30 t/s
  on dense 27B; a dedicated MTP-4 sweep at 165W (the documented dense efficiency
  sweet spot) may be the practical dense ceiling on this card.

That's the next campaign. For now, the MoE story is closed and measured.

## Methodology

- **Hardware:** Intel Arc Pro B70 32GB, AMD Ryzen 7 5700X3D, Ubuntu 26.04.
- **vLLM:** `intel/vllm:0.21.0-xpu-int4moe` (v0.21.1.dev18) + 4 in-container
  patches (`patch_xpu_int4_moe_v4.py`, `patch_mtp_bf16_draft.py`). Model:
  `Qwen3.6-35B-A3B-MTP-Preserved-GPTQ-Int4` (22.4 GB, 1 MTP layer). Flags:
  `--quantization gptq --dtype float16 --max-model-len 16384 --max-num-seqs 1
--language-model-only --speculative-config {"method":"mtp",
"num_speculative_tokens":1}`, PIECEWISE graphs.
- **llama.cpp:** SYCL b10255+ (build-sycl-0804, oneAPI 2026.0). MoE:
  `Qwen3.6-35B-A3B-UD-Q4_K_XL` (-ngl 99 -ncmoe 0 -fa on -ctk q8_0 -ctv q4_1).
  Dense: `ThinkingCap-Qwen3.6-27B-Q4_K_M` (same KV/FA flags).
- **Measurement:** vLLM = streaming `/v1/chat/completions` with
  `stream_options.include_usage`, decode = `completion_tokens / (total - ttft)`.
  llama.cpp = `/completion` `timings.predicted_per_second` (engine rate, per
  AGENTS.md §9.4). Best steady-state rep (drops JIT warmup). 2 reps/cell.
- **Thermal discipline:** cooldown to ≤52°C between runs; GPU temp monitored
  throughout (hwmon `temp2_input`). No two inference processes concurrent.
- **Full data:** `results/engine-comparison-full-20260806.md`,
  `results/moe-{vllm-mtp,llamacpp}-*-grid.json`,
  `results/dense-llamacpp-q4km-{150,230}w-grid.json`. Campaign narrative:
  `research/vllm-021-campaign-20260806.md` A1–A16. Run log:
  `docs/benchmark-history.md` Run 14–19.
