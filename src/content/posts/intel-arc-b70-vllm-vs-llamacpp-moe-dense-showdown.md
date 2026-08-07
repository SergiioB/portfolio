---
title: "Intel Arc Pro B70: vLLM vs llama.cpp — The Full MoE + Dense Showdown"
description: "After a 6-week, 21-run campaign, here is the complete vLLM XPU vs llama.cpp SYCL comparison on the Arc Pro B70 — full prefill × generation grids, power sweet spots, 128K context scaling, and the MoE vs Dense verdict. Headline: vLLM MTP hits 133 t/s decode / 8.7K t/s prefill (1.9× / 5.2× over llama.cpp on MoE); llama.cpp wins Dense by default (vLLM has no XPU FP8 kernel). Plus the four-patch path that unlocked MTP speculative decoding on the hybrid GDN model, and a batched-tokens fix that recovered 28% long-prompt prefill."
situation: "Every B70 owner hits the same fork: vLLM or llama.cpp? The community claims are loud ('vLLM does 145 t/s single-stream!') but nobody had published a clean, apples-to-apples grid across prompt sizes, generation lengths, and power levels for both engines on both model classes. So we ran one — 19 benchmark runs, two engines, two model architectures, four wattages, full prefill × generation surfaces."
issue: "Three blockers stood between us and a real answer. (1) The vLLM XPU native int4 MoE path was broken — C++ only enables int4 when weights are torch.int8 (at::kChar), but GPTQ packs as uint8, so the kernel treated weights as BF16 and crashed on a shape check. (2) MTP speculative decoding — the obvious way to break the bandwidth ceiling — was blocked twice: the GPTQ-preserved checkpoint's MTP layers inherit the target's quant config and crash on load, AND the XPU GDN attention kernel asserted it doesn't support speculative sequence masks. (3) Dense 27B on vLLM needs FP8, and vLLM has no FP8 kernel registered for XPU at all."
solution: "Four in-container patches unlocked the MoE path: native int4 (implement_zp → int8 storage), BF16 MTP draft (strip quant_config for any mtp prefix), XpuFusedMoe kwarg strip (kernels auto-detect dtype), and removing the overcautious GDN spec assert (the kernel already takes explicit spec tensors — the boolean mask is metadata-only and never reaches SYCL). Then we ran the full grid on both engines at 150W and 230W, plus dense on llama.cpp at both wattages, to map the entire surface and find the power sweet spots."
usedIn: "Intel Arc Pro B70 32GB (Ubuntu 26.04), intel/vllm:0.21.0-xpu-int4moe + 4 patches, llama.cpp SYCL b10255+ (build-sycl-0804), Qwen3.6-35B-A3B-GPTQ-Int4 MoE + ThinkingCap-Qwen3.6-27B dense, 150W/230W power sweep."
impact: "vLLM XPU MTP beats llama.cpp on MoE by 1.9× decode / 5.2× prefill (single-stream, post-fix: 133 t/s / 8.7K). The --max-num-batched-tokens 8192 fix recovered 21-28% long-prompt prefill (MTP silently caps prefill to 2048 tokens otherwise). 128K context mapped: decode degrades mildly (-24%, still 92 t/s at full context), prefill hits O(n²) past 20K (3,064 t/s @128K), 341K tokens KV headroom. 3 localmaxxing submissions APPROVED. Dense: llama.cpp only (vLLM FP8 has no XPU kernel). Sweet spots: MoE=150W, Dense=180W sustained / 230W burst. Full campaign: benchmark-history Run 14-21, research/vllm-021-campaign-20260806.md A1-A17."
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
  ]
draft: false
---

> **Context:** This is the final showdown results. For the original technical deep-dive into how we built the MXFP4 checkpoints and solved the seven vLLM loader bugs to get here, read **[Phase 1: The vLLM Question on Intel Arc Pro B70 (MXFP4 Native Test)](/posts/intel-arc-b70-vllm-initial-mxfp4-test)** first.

## Live on localmaxxing

The headline result is on the [localmaxxing leaderboard](https://www.localmaxxing.com),
submitted with full patch disclosure and reproducible command flags:

[![Qwen3.6-35B-A3B — 132.9 tok/s on Intel Arc Pro B70 · 32 GB (localmaxxing run)](/images/posts/localmaxxing-vllm-mtp-133tps.png)](https://www.localmaxxing.com/runs/cmshndoyu01i3pp01zgvwr3il)

**→ [Qwen3.6-35B-A3B — 132.9 tok/s on Intel Arc Pro B70 · 32 GB](https://www.localmaxxing.com/runs/cmshndoyu01i3pp01zgvwr3il)**
vLLM · GPTQ-Int4 · XPU. Three B70 submissions approved: vLLM MTP (this run),
llama.cpp MoE Q4_K_XL, and llama.cpp dense 27B Q4_K_M.

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

_Note: this grid is the Run 19 measurement, before the Run 20
`--max-num-batched-tokens 8192` fix. After the fix, vLLM decode improved ~5%
(short/g32 127 → 133 t/s) and long-prompt prefill recovered 21-28% (p4k
6,626 → 8,484 t/s). The grid below is the conservative, pre-fix baseline —
run the harness yourself for post-fix numbers._

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

_Updated for Run 20 (the `--max-num-batched-tokens 8192` prefill fix): decode
133 t/s, prefill 8.7K. The original scorecard (126/6,217) was measured before
the fix — see the update section below._

| Model     | Engine       | Config          |    Decode (best) | Prefill (best) | Power | Temp |
| --------- | ------------ | --------------- | ---------------: | -------------: | ----: | ---: |
| MoE 35B   | **vLLM MTP** | GPTQ-Int4 + MTP |      **133 t/s** |  **8,718 t/s** |  150W | 58°C |
| MoE 35B   | llama.cpp    | Q4_K_XL GGUF    |           69 t/s |      1,498 t/s |  150W | 58°C |
| Dense 27B | llama.cpp    | Q4_K_M GGUF     |           23 t/s |      1,007 t/s |  230W | 79°C |
| Dense 27B | vLLM         | FP8             | ❌ no XPU kernel |              — |     — |    — |

_Decode best = short/g32 (Run 20, warmup discarded). Prefill best = p8k
(7,545-token prompt) — prefill scales with prompt length; the p2k value is
7,535 t/s. Context-scaling data in the Run 21 section below._

## Concurrency — multi-user throughput

Single-stream is one thing; serving many users at once is where vLLM's
continuous batching shines. Native int4 v4 (no MTP), @180W, max-num-seqs=64:

| Concurrent users | Wall-agg tok/s | Avg per-user decode |
| ---------------: | -------------: | ------------------: |
|                1 |             64 |            64.9 t/s |
|                4 |            225 |            58.2 t/s |
|                8 |            424 |            54.7 t/s |
|           **16** |        **694** |            45.9 t/s |

**694 tokens/sec aggregate across 16 concurrent users** — each still getting
~46 t/s. A single user gets 64-73 t/s; 16 users get ~11× more total throughput
with graceful per-user degradation. The "145 t/s" community claim sits
comfortably in this multi-user band (~C10 aggregate). Community dual-B70 runs
hit [912 tok/s at 50 concurrent users](https://github.com/PMZFX/intel-arc-pro-b70-benchmarks).

_Note: this is the no-MTP path (Run 17/19). **MTP + concurrency is blocked
on the XPU GDN kernel** (Run 23): the `causal_conv1d` state machine cannot mix
speculative and non-speculative tokens in a single batch — C2+ with MTP crashes
EngineCore. Choose one: MTP (single-user, 133 t/s) OR concurrency (no MTP,
C16=694 aggregate). Can't have both until the XPU GDN kernel supports mixed
spec/non-spec batches._

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
(dense).** For a single-user chat front-end, llama.cpp stays production — but
the gap closed hard, and the dense vLLM kernel is the obvious next thing to
chase.

## Update — 128K context: how it scales (Run 21)

The natural question after the MTP unlock: **does it hold up as context fills?**
We ran a context-scaling sweep — 4K → 128K prompts, single-stream, MTP on, 150W.

**VRAM first:** the server allocated **349,869 tokens of KV cache headroom**
(model 19.79 GiB + 7.75 GiB KV available). The MoE's tiny 3B-active attention
makes KV nearly free — 128K context fits with 213K tokens to spare. No OOM.

![Context scaling to 128K: prefill hits the O(n²) wall, decode degrades mildly](/images/diagrams/b70-context-scaling-128k.svg)

|  Context | Prefill t/s | Decode t/s |    TTFT |  Wall |
| -------: | ----------: | ---------: | ------: | ----: |
|       4K |       5,423 |  **120.9** |   714ms |  1.2s |
|      10K |       7,098 |      107.5 |    1.4s |  2.0s |
|      20K |   **7,325** |      116.0 |    2.6s |  3.2s |
|      40K |       5,877 |      100.0 |    6.6s |  7.2s |
|      65K |       4,418 |      104.7 |   14.3s | 14.9s |
| **128K** |   **3,064** |   **92.5** | **40s** | 40.7s |

**What this tells you:**

1. **Decode degrades mildly.** 121 → 92 t/s (4K → 128K, **-24%**). Even at a
   full 128K context, MTP delivers ~92 t/s — still above the 73 t/s no-spec
   bandwidth ceiling. Attention grows with KV length, but the MoE's small
   attention keeps it manageable.
2. **Prefill hits the O(n²) wall past 20K.** Peaks at ~7.3K t/s (20K context),
   then falls to 3,064 t/s at 128K (**-58% from peak**). Building KV cache for
   122K tokens is inherently O(n²). Still — 3K t/s at 128K beats llama.cpp's
   peak prefill of 1.7K. vLLM wins even at extreme context.
3. **The 40s cold load is a one-time cost — follow-ups are 28× faster.** With
   `--enable-prefix-caching`, the KV cache of conversation history is reused
   across turns. Measured multi-turn at full 122K resident context:

   | Turn          | Context |      TTFT |   Decode |
   | ------------- | ------: | --------: | -------: |
   | 1 (cold load) | 122,531 |     39.6s | 75.3 t/s |
   | 2 (warm)      | 122,561 | **1.42s** | 78.2 t/s |
   | 3 (warm)      | 122,587 |     1.43s | 82.4 t/s |
   | 4 (warm)      | 122,611 |     1.40s | 82.4 t/s |
   | 5 (warm)      | 122,636 |     1.42s | 81.9 t/s |

   **Warm follow-up TTFT at full 122K context = 1.4 seconds.** Load the
   document/codebase once (40s), then chat with the entire thing at interactive
   latency. That's a genuinely usable long-context assistant pattern — not
   batch-only. (`--enable-prefix-caching` is mandatory; without it every turn
   re-prefills from scratch.)

**Launcher guidance:** vLLM MTP @128K + prefix caching = interactive multi-turn
long-context sessions. Cold single-turn stays slow (40s); warm sessions are
snappy. For cold-start single-turn interactive use, llama.cpp dense @128K stays
the lower-latency choice with no patched-engine correctness risk.
Launch at 128K: `benchmarks/launch-mtp-128k.sh`.

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
