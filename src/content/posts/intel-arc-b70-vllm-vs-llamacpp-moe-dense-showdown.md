---
title: "Intel Arc Pro B70: vLLM vs llama.cpp — Corrected MoE + Dense Showdown"
description: "A matched vLLM XPU study on the Intel Arc Pro B70: no-spec, MTP1, MTP2, and MTP4 with prefix caching on and off at exact 128K. Cache cut resident-session TTFC by 31–66×; MTP2 + cache on had the best 120K-session end-to-end median."
situation: "Every B70 owner hits the same fork: vLLM or llama.cpp? The useful answer requires separating engine, checkpoint, quantization, prompt length, output length, concurrency, cache state, and the statistic being reported. This post preserves the historical engine comparison and adds a matched real-world vLLM matrix."
issue: "The old public surface mixed short-generation peaks, cold prefill, exact-128K completion, resident-session latency, and historical engine grids. It also lacked a matched cache-on/cache-off comparison, even though normal Pi sessions reuse long prefixes."
solution: "The current public recipe pins a pullable vLLM XPU nightly by digest, applies the BF16 MTP patch and exact-128K boundary patch in order, then runs the same six calibrated prompts across no-spec, MTP1, MTP2, and MTP4 with caching explicitly enabled or disabled."
usedIn: "Intel Arc Pro B70 32GB (Ubuntu 26.04), pinned public vLLM XPU nightly v0.26.1rc1.dev457 with vllm-xpu-kernels 0.1.12, llama.cpp SYCL b10255+, Qwen3.6-35B-A3B GPTQ-Int4/GGUF variants, and ThinkingCap-Qwen3.6-27B dense."
impact: "At a resident ~120K prompt, prefix caching cut median TTFC from 36.770–39.508 seconds to 0.554–1.256 seconds. MTP2 + cache on had the best end-to-end median at 2.504 seconds; no-spec + cache on showed the first visible token in 0.554 seconds. For cold exact p130944/g128, no-spec completed fastest at 43.793 seconds, while MTP4 + cache on reached 102.30 client-observed post-first tok/s. All cells are C1 medians of five measured requests and remain E2 self-reported evidence."
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

> **Correction — August 8, 2026:** The original article below documents the historical vLLM 0.21/MTP1 campaign. A newer pinned-nightly MTP4 path reached **up to 204.6 t/s** in one short-prompt, 32-output-token cell. A later four-prompt g64 sweep measured **198.5 t/s median** at a configured 165W cap. Longer generations are slower: the grid measured roughly **160–176 t/s at g128**, and a separate 256-token LocalMaxxing CLI run measured **136.2 t/s**.
>
> The corrected cold-prefix prefill figures are **8,153 t/s at p4k** and **8,393 t/s at p8k**, measured with a unique random prefix for every request. The older 8,715–8,718 t/s result used a constant-prefix harness later shown to be cache-prone, so it is retained only as a historical observation. A paired 150W/230W test found no meaningful prefill difference (within ±0.2%); 230W was not the source of the gain.
>
> The LocalMaxxing records are approved public **self-reported submissions**, not independent reproduction or correctness certification. The current path is single-stream smoke-tested; a published token/logit/KL differential against the no-spec reference remains pending. MTP mixed prefill/decode concurrency also remains incorrect on the XPU GDN causal-convolution path.
>
> The public reproduction now pins `vllm/vllm-openai-xpu@sha256:2c427ef477da092eb6f2cdbbbd24950b5fa171565b916db69d4c7bb10e68ca97`. The old `intel/vllm:0.21.0-xpu-int4moe` name referred to a local derived image and was never published. The current patch order is `patch_mtp_nightly.py`, then `patch_mtp_boundary.py`.
>
> The boundary-patched MTP4 path completed an exact **p130944/g128 = 131,072-token** request. TTFT was 48.601 seconds, client post-first rate was 96.87 tok/s, MTP acceptance was 72.31%, and cache-hit delta was zero. These are E2 provisional self-reported measurements.

## New matched real-world matrix: cache on/off × no-spec/MTP1/MTP2/MTP4

The newest campaign stops mixing short peaks with long-session behavior. It runs eight clean servers with the same public image, checkpoint, two-patch order, exact prompts, 131,072-token context, scheduler budget 8,192, and five measured requests per cell.

![Matched exact-128K cache and MTP benchmark matrix](/images/posts/b70-128k-cache-spec-matrix.svg)

### Cold exact p130944/g128

| Mode    | Cache | TTFC median (s) | End-to-end median (s) | Client post-first median (tok/s) | MTP acceptance |
| ------- | ----- | --------------: | --------------------: | -------------------------------: | -------------: |
| No spec | On    |      **41.589** |            **43.793** |                            57.57 |            n/a |
| No spec | Off   |          42.192 |                44.413 |                            57.19 |            n/a |
| MTP1    | On    |          48.865 |                50.358 |                            85.10 |         90.36% |
| MTP1    | Off   |          45.262 |                46.749 |                            86.21 |         90.69% |
| MTP2    | On    |          48.564 |                49.946 |                            98.81 |         80.54% |
| MTP2    | Off   |          45.347 |                46.653 |                       **101.68** |         82.77% |
| MTP4    | On    |          48.761 |                50.011 |                       **102.30** |         61.22% |
| MTP4    | Off   |          45.473 |                46.865 |                            93.60 |         62.31% |

Cold prompts carried a unique entropy-first prefix and recorded zero cache-hit tokens. `Client post-first` uses `(127 tokens) / (request end - first generated token)`. It is not an engine-native vLLM timing field.

### Five changed follow-ups over one prepared 120K session

| Mode    | Cache | Reused / recomputed tokens median | TTFC median (s) | End-to-end median (s) | Client post-first median (tok/s) |
| ------- | ----- | --------------------------------: | --------------: | --------------------: | -------------------------------: |
| No spec | On    |                     119,680 / 468 |       **0.554** |                 2.671 |                            59.90 |
| No spec | Off   |                       0 / 120,148 |          36.770 |                38.921 |                            59.04 |
| MTP1    | On    |                   118,592 / 1,556 |           1.222 |                 2.666 |                            88.57 |
| MTP1    | Off   |                       0 / 120,148 |          39.342 |                40.808 |                            86.64 |
| MTP2    | On    |                   118,592 / 1,556 |           1.251 |             **2.504** |                           101.39 |
| MTP2    | Off   |                       0 / 120,148 |          39.408 |                40.634 |                           104.62 |
| MTP4    | On    |                   118,592 / 1,556 |           1.256 |                 2.517 |                           104.37 |
| MTP4    | Off   |                       0 / 120,148 |          39.508 |                40.657 |                       **110.48** |

The cache benefit is the practical result: **31.46–66.32× faster TTFC** and **14.57–16.23× faster end-to-end completion** on a resident long session. MTP2 + cache on was the best balanced mode for these 128-token follow-ups. No-spec + cache on won first-visible-token latency.

One attempted cache-off cell was rejected before this matrix was accepted. vLLM V1 in the pinned image defaults prefix caching to on, so omitting the flag did not disable it. Every accepted cache-off row uses `--no-enable-prefix-caching`, logs `enable_prefix_caching: False`, and records zero cache hits.

Full patch order, image digest, model download, eight launch commands, and the complete campaign command are in the [public cookbook](https://github.com/SergiioB/intel-arc-pro-b70-inference-cookbook/blob/master/docs/FULL-SETUP-COMMANDS.md). Machine-readable results are in [`results/cache-spec-matrix-20260808-summary.json`](https://github.com/SergiioB/intel-arc-pro-b70-inference-cookbook/blob/master/results/cache-spec-matrix-20260808-summary.json).

> **Context:** For the original technical deep-dive into how we built the MXFP4 checkpoints and solved the seven vLLM loader bugs, read **[Phase 1: The vLLM Question on Intel Arc Pro B70 (MXFP4 Native Test)](/posts/intel-arc-b70-vllm-initial-mxfp4-test)** first.

## Published on LocalMaxxing

The historical MTP1 result is published as an approved self-reported entry on the [LocalMaxxing leaderboard](https://www.localmaxxing.com), with patch notes and command flags. LocalMaxxing admission does not independently rerun the benchmark or attest its prompts, output, correctness, hardware, or raw timings:

[![Qwen3.6-35B-A3B — 132.9 tok/s on Intel Arc Pro B70 · 32 GB (localmaxxing run)](/images/posts/localmaxxing-vllm-mtp-133tps.png)](https://www.localmaxxing.com/runs/cmshndoyu01i3pp01zgvwr3il)

**→ [Qwen3.6-35B-A3B — 132.9 tok/s on Intel Arc Pro B70 · 32 GB](https://www.localmaxxing.com/runs/cmshndoyu01i3pp01zgvwr3il)**
vLLM · GPTQ-Int4 · XPU. Three historical B70 submissions were approved for publication: vLLM MTP (this run), llama.cpp MoE Q4_K_XL, and llama.cpp dense 27B Q4_K_M. “Approved” means accepted into LocalMaxxing's self-reported dataset; it does not mean independently reproduced.

The newer submissions are [204.6 t/s single-stream MTP4](https://www.localmaxxing.com/en/runs/cmsiwwpzf00a4qm01z18izmad) and [1,139.8 t/s aggregate generation at C64](https://www.localmaxxing.com/en/runs/cmsiwwqmt00a9qm010iekvi3u). The second number is server-wide throughput across 64 concurrent requests, **not** per-user decode.

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

| Run    | What we tried                                                       | What we learned                                                                           |
| ------ | ------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| 13–14  | vLLM 0.17 MXFP4 (self-built checkpoint, 7 patches)                  | Served & correct, but decode 7× slower than llama.cpp — image too old                     |
| 15     | Concurrency head-to-head (16 users)                                 | The "150 t/s" claim = multi-user aggregate (153 gen t/s @ C16), not single-stream         |
| 16     | vLLM 0.21 Triton GPTQ MoE                                           | 58 t/s single-stream — Triton path leaves ~40% on the table                               |
| 17     | **Packed W4A16 `XpuFusedMoe` unlocked** (root cause: uint8 vs int8) | 72.6 t/s decode / 9,094 reported prefill — target expert path reached the no-spec ceiling |
| 18     | **MTP speculative decoded** (four historical logical changes)       | **123 t/s single-stream** — first vLLM XPU result to beat llama.cpp MoE parity            |
| **19** | **Historical matched engine + power sweep** (this post)             | **At p2k/g128: 1.82× decode / 4.2× prefill; MoE=150W / Dense=180W; dense vLLM blocked**   |

The two historical breakthroughs were Run 17 (routing packed W4A16 experts through the intended XPU kernel after a dtype mismatch) and Run 18 (bringing up the single-stream MTP path through three load/call-path changes plus removal of the old assertion). Later mixed-batch testing showed that the assertion was overbroad for single-stream MTP but had hidden a real recurrent-state correctness limitation under concurrency.

## The historical four logical fixes that unlocked MTP (Run 18)

This section describes the historical vLLM 0.21 path. Its four logical changes were delivered in two patch scripts. On the newer pinned nightly used for MTP4, upstream has absorbed the native target W4A16 path and the old GDN assertion; only the checkpoint-specific higher-precision MTP-draft adaptation remains locally necessary.

MTP speculative decoding had appeared impossible on this model: it is a hybrid GDN architecture (linear attention + full attention layers), and the XPU GDN kernel had a hard `assert attn_metadata.spec_sequence_masks is None`. Run 14 hit that assertion and we initially described XPU GDN as incompatible with speculative decoding.

Four historical changes brought up the single-stream path:

1. **Native packed W4A16 target experts** (`patch_xpu_int4_moe_v4.py`) — `implement_zp` stores `torch.int8` so C++ `is_B_int4 = (B_dtype == at::kChar)` triggers; route `MoeWNA16Method.apply` → `XpuFusedMoe`. The expert weights are packed INT4, while activations are FP16 and scales/accumulation remain higher precision.
2. **BF16 MTP draft** (`patch_mtp_bf16_draft.py`) — strip `quant_config` at
   `MultiTokenPredictor.__init__`, `Qwen3NextSparseMoeBlock`, and `FusedMoE`
   for any prefix containing `mtp`. The checkpoint's MTP experts are BF16
   fused tensors; inheriting GPTQ made them `w2_qweight`-shaped → `KeyError`.
3. **XpuFusedMoe kwarg strip** — remove `is_fp8` / `is_mxfp4` from the
   `XpuFusedMoe(...)` call site (the kernels auto-detect dtype).
4. **GDN spec assert → warning** — the boolean `spec_sequence_masks` was not passed directly to the SYCL kernel, and removing the assertion allowed the single-stream path to run. Later mixed-batch tests showed that the guard had also been masking a real recurrent-state ordering limitation under concurrency; assertion removal alone is not a general GDN speculative-decoding fix.

After all four, the server came up, served requests, and decoded at **123 t/s**. The single-stream path passed deterministic greedy and factual smoke checks. Those checks are useful but are not a full correctness proof: the raw patched-vs-reference token transcript and a broader logit/KL differential have not yet been published. Treat this path as experimental until that audit is complete.

![Four patches that unlocked MTP speculative decoding on XPU GDN](/images/diagrams/b70-mtp-unlock-flow.svg)

## The comparison: MoE 35B, full grid

Single-stream (Concurrent-1), 150W sweet spot. Format: **vLLM MTP** / llama.cpp
(best steady-state decode t/s).

_Note: this is the historical Run 19 matched grid, before raising `--max-num-batched-tokens` to 8192. The server had logged a 2048-token speculative scheduling ceiling, and the old follow-up grid observed a 21–28% p2k–p4k recovery after raising it. Because that follow-up used the older constant-prefix prefill harness, the exact percentage now needs a clean random-prefix 2048-vs-8192 replication. The qualitative scheduling-ceiling finding remains valid; this table is retained as the controlled historical comparison._

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

Within this historical matched 150W grid, vLLM is **3.8–8.5× faster on prefill**. The exact ratio is workload-specific rather than one universal “4×” number: at p2k/g128, the matched comparison is **4.2× prefill and 1.82× decode**. The stacks also use different checkpoint and quantization formats, so this is a best-tuned-engine comparison, not an engine-only A/B. The target experts run through the packed W4A16 `XpuFusedMoe` path.

## Power sweet spots (temperature-controlled)

This was the surprise: **MoE and Dense want opposite power settings.**

| Model         | Sweet spot                          | 150W → 230W effect       | Temp               | Why                                                             |
| ------------- | ----------------------------------- | ------------------------ | ------------------ | --------------------------------------------------------------- |
| **MoE 35B**   | **150–165W**                        | **Prefill within ±0.2%** | workload-dependent | Paired testing found no useful prefill gain from the higher cap |
| **Dense 27B** | **180W** sustained / **230W** burst | **+18–30% decode**       | 71°C → 79°C        | Scales with power, but the thermal cost is real                 |

The original campaign associated a slower 230W MoE run with the power cap. A later alternating A/B on the same warm server isolated that variable and found p2k, p4k, and p8k prefill effectively flat within ±0.2%. The earlier difference was run-state variance, not a useful power response. Separate monitoring observed approximately 171W during prefill, 113W during decode, and 47W idle even when the configured ceiling was higher.

**Run this MoE path at 150–165W. Run Dense at 180W (or 230W for short bursts).** The lower MoE cap preserves performance while avoiding unnecessary heat budget.

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

## Current scorecard and historical comparator

The current nightly/MTP4 results and the historical matched engine grid answer different questions, so they are separated here rather than collapsed into one multiplier.

| Model / generation               | Engine and config              |     Decode (t/s) |             Prefill (t/s) |    Configured cap | Interpretation                                                  |
| -------------------------------- | ------------------------------ | ---------------: | ------------------------: | ----------------: | --------------------------------------------------------------- |
| MoE 35B, current peak            | vLLM nightly, GPTQ-Int4 + MTP4 |        **204.6** |                         — |              165W | Short prompt, g32, maximum observed cell                        |
| MoE 35B, current diverse prompts | vLLM nightly, GPTQ-Int4 + MTP4 | **198.5 median** |                         — |              165W | Four different prompts, g64; mean 198.8                         |
| MoE 35B, current cold prefill    | vLLM nightly, GPTQ-Int4 + MTP4 |                — | **8,153 p4k / 8,393 p8k** | 230W test setting | Unique random prefix per call; paired A/B found no 230W benefit |
| MoE 35B, historical matched grid | vLLM 0.21, GPTQ-Int4 + MTP1    |          111–130 |                 563–7,526 |              150W | Compare cell-by-cell with the historical llama.cpp rows above   |
| MoE 35B, historical matched grid | llama.cpp, Q4_K_XL GGUF        |            58–74 |                 104–1,728 |              150W | Different checkpoint/quant format; best-tuned stack comparison  |
| Dense 27B                        | llama.cpp, Q4_K_M GGUF         |               23 |                     1,007 |              230W | Historical dense result                                         |
| Dense 27B                        | vLLM FP8                       |    no XPU kernel |                         — |                 — | Unsupported in the tested build                                 |

The older **8,718 t/s** value is no longer the canonical prefill headline. It came from a constant-prefix harness later shown to be cache-prone. It remains useful as campaign history, but the random-prefix cold measurements above are the defensible current figures.

For generation length context, the MTP4 grid measured **204.6 t/s at g32**, **190.6 t/s at g64**, and **175.7 t/s at g128** for the short prompt. A separate 256-output-token LocalMaxxing CLI run measured **136.2 t/s median**. “200 t/s” therefore describes short interactive generation, not sustained long-form output.

## Concurrency — multi-user throughput

Single-stream is one thing; serving many users at once is where vLLM's
continuous batching shines. Historical packed W4A16 v4 target path (no MTP), @180W, max-num-seqs=64:

| Concurrent users | Wall-agg tok/s | Avg per-user decode |
| ---------------: | -------------: | ------------------: |
|                1 |             64 |            64.9 t/s |
|                4 |            225 |            58.2 t/s |
|                8 |            424 |            54.7 t/s |
|           **16** |        **694** |            45.9 t/s |

**694 tokens/sec aggregate across 16 concurrent users** — each still getting
~46 t/s. A single user gets 64-73 t/s; 16 users get ~11× more total throughput
with graceful per-user degradation. The previously discussed 145 t/s community result cannot be classified as aggregate throughput without the original permalink, prompt/output metadata, and harness. Later single-stream MTP measurements make a value in that range technically plausible. Community dual-B70 runs report [912 tok/s at 50 concurrent users](https://github.com/PMZFX/intel-arc-pro-b70-benchmarks), which is explicitly an aggregate serving result.

_Note: this is the no-MTP path (Run 17/19). **MTP + mixed prefill/decode concurrency remains incorrect on the XPU GDN path** (Run 23 and later patch attempts): the `causal_conv1d` recurrent-state handling cannot safely mix speculative and non-speculative tokens in one batch. Guard bypasses stopped the immediate failure but produced incorrect output, so they are not fixes. Use MTP for the supported single-stream path or disable MTP for aggregate concurrency until the kernel state-ordering issue is resolved and passes differential correctness tests._

## What this all means

![MoE vs Dense bandwidth comparison — why MoE is 5–6× faster on the B70](/images/diagrams/b70-moe-vs-dense-bandwidth.svg)

1. **MoE is 5–6× faster decode than dense on the B70.** Both are bandwidth-bound
   at 608 GB/s, but MoE reads ~3 GB/token (active experts) vs dense's ~19 GB
   (all weights). This isn't a vLLM-vs-llama.cpp thing — it's architecture.
2. **vLLM MTP wins the historical matched MoE grid** by 1.5–2.1× decode and 3.8–8.5× prefill across cells; p2k/g128 is 1.82×/4.2×. These are best-tuned stack comparisons across different checkpoint/quant formats, not a pure engine-only A/B. The historical 0.21 result needed four logical changes in two scripts; the current nightly has absorbed most of them.
3. **llama.cpp wins dense by default** — vLLM has no dense XPU FP8 kernel.
   Until that lands upstream, GGUF + SYCL is the only dense path.
4. **Power: MoE=150–165W, Dense=180W sustained.** The paired MoE prefill A/B found 150W and 230W indistinguishable within ±0.2%; the higher cap adds no demonstrated benefit. Dense still scales with power but pays in heat.

![Power scaling: MoE flat vs Dense climbing, with temperature](/images/diagrams/b70-power-scaling-moe-vs-dense.svg)

The practical guidance for a B70 owner: **single-stream MoE speed → vLLM XPU packed W4A16 + higher-precision MTP draft at 150–165W; multi-user aggregate MoE serving → native W4A16 without MTP until mixed-batch GDN is fixed; dense → llama.cpp at about 180W sustained.** The patched MTP path remains experimental pending the published differential correctness audit.

## Update: exact 128K and real Pi workload states

The older Run 21 sweep used approximate context labels. The August 8 campaign calibrated exact rendered tokens after the chat template and exercised the Pi system prompt.

### Exact long-context completion

| Spec                  |  Prompt | Output |       Total |   TTFT (s) | Client post-first (tok/s) | MTP accept | Result        |
| --------------------- | ------: | -----: | ----------: | ---------: | ------------------------: | ---------: | ------------- |
| MTP4                  |  16,256 |    128 |      16,384 |      2.403 |                    161.23 |     85.34% | Completed     |
| MTP4                  |  32,640 |    128 |      32,768 |      5.785 |                    139.99 |     71.21% | Completed     |
| MTP4                  |  65,408 |    128 |      65,536 |     15.093 |                    111.17 |     58.55% | Completed     |
| MTP4                  |  98,176 |    128 |      98,304 |     28.078 |                    117.36 |     76.56% | Completed     |
| MTP4                  | 122,880 |    128 |     123,008 |     44.057 |                     95.13 |     62.84% | Completed     |
| MTP4 + boundary patch | 130,944 |    128 | **131,072** | **48.601** |                 **96.87** | **72.31%** | **Completed** |
| MTP2                  | 130,944 |    128 | **131,072** |     48.559 |                    103.63 |     86.96% | Completed     |

The unpatched MTP4 request stopped after 124 output tokens. Four sequence slots remained, but the XPU GDN path expected a complete five-token group: one target plus four drafts. `patch_mtp_boundary.py` sends only that partial final group through stateful non-spec prefill. It does not pad past 131,072 or reduce the requested output.

MTP2 was 6.98% faster than MTP4 by client post-first rate in the single matched exact-128K observations. MTP4 now works at the boundary, but MTP2 may be the better 128K profile.

### Cold and resident Pi flows

| State                                | Endpoint prompt tokens | TTFT (s) | E2E (s) | Cache hits |
| ------------------------------------ | ---------------------: | -------: | ------: | ---------: |
| Cold short chat                      |                    595 |    0.811 |   1.746 |          0 |
| Warm multi-turn                      |                    753 |    0.157 |   1.291 |          0 |
| RAG/tool append                      |                    930 |    0.236 |   1.027 |          0 |
| Cold 32K document                    |                 32,640 |    5.802 |   6.694 |          0 |
| Follow-up over resident 32K document |                 32,795 |    0.676 |   1.726 |     30,464 |

The Pi system prefix is shorter than the model's 1,088-token cache page. Zero token-level cache hits on short warm requests is expected. The resident 32K follow-up reused 30,464 tokens and reached first content in 0.676 seconds.

### Mixed load

MTP4 still crashes when a long prefill and speculative decode share one XPU `causal_conv1d` invocation. The no-spec fallback completed one p65408/g128 document plus 20 concurrent g64 short requests.

Mixed aggregate output was 74.46 tok/s: 1,374 generated tokens divided by the complete 18.452-second campaign interval. This includes the 64K prefill and is not a per-stream rate. Short-request TTFT rose from 0.112 seconds p50 at baseline to 12.855 seconds p50 during the mixed campaign.

The exact public image, patch matrix, prompt generator, request recorder, and commands are in the [Intel Arc Pro B70 inference cookbook](https://github.com/SergiioB/intel-arc-pro-b70-inference-cookbook).

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

That's the next campaign. The MoE path is substantially characterized, but scheduler-budget attribution, full differential correctness, immutable public manifests, and third-party reproduction remain open work.

## Model reference

The vLLM MoE benchmarks use a specific checkpoint worth documenting:

- **Architecture:** Qwen3.6-35B-A3B (MoE: 256 experts, 8 active + 1 shared, 3B active params/token, hybrid GDN/attention)
- **Checkpoint:** [`llmfan46/Qwen3.6-35B-A3B-uncensored-heretic-Native-MTP-Preserved-GPTQ-Int4`](https://huggingface.co/llmfan46/Qwen3.6-35B-A3B-uncensored-heretic-Native-MTP-Preserved-GPTQ-Int4) — a heretic (uncensored/abliterated) variant of the stock Qwen model
- **Why not the official Qwen GPTQ?** The official `Qwen/Qwen3.6-35B-A3B-GPTQ-Int4` declares `mtp_num_hidden_layers: 1` in config but ships **zero MTP weight tensors** in the shards. The tested derivative preserves those tensors, which makes the MTP path possible.
- **Quantization:** The target expert weights use GPTQ INT4 calibration (group_size=128, symmetric, desc_act=false). Runtime execution is more precisely described as **packed W4A16**: four-bit weights, FP16 activations, and higher-precision scales/accumulation. Router gates and the preserved MTP tensors are not all INT4.
- **Format note:** The Xe2 XMX engines provide an optimized packed four-bit grouped-GEMM path. This is not integer-only end-to-end inference and should not be equated directly with NVIDIA NVFP4, which is a different floating-point format. The older MXFP4 experiment used a different execution path and is documented separately.

Quantization quality cannot be inferred from architecture alone, and results from another checkpoint or quantizer are not proof of parity for this derivative. The current path has passed coherent-output and deterministic smoke checks, but a checkpoint-specific perplexity/task-quality study and patched-vs-reference token/logit/KL differential have not yet been published.

## Methodology and evidence generations

### Historical matched grid

- **Hardware:** Intel Arc Pro B70 32GB, AMD Ryzen 7 5700X3D, Ubuntu 26.04.
- **vLLM, current:** public image `vllm/vllm-openai-xpu@sha256:2c427ef477da092eb6f2cdbbbd24950b5fa171565b916db69d4c7bb10e68ca97`, observed vLLM `v0.26.1rc1.dev457+gc810e5ee9` and `vllm-xpu-kernels 0.1.12`, with `patch_mtp_nightly.py` then `patch_mtp_boundary.py`.
- **vLLM, historical:** `intel/vllm:0.21.0-xpu-int4moe` was a local derived image and was never published. Its four logical modifications remain campaign history, not a pullable recipe.
- **llama.cpp:** SYCL b10255+, MoE `Qwen3.6-35B-A3B-UD-Q4_K_XL`, dense `ThinkingCap-Qwen3.6-27B-Q4_K_M`, with the documented GPU-offload, flash-attention, and quantized-KV flags.
- **Measurement:** the historical vLLM grid used streaming client timing and the llama.cpp grid used engine timing. It reported best steady-state cells from a small repetition count. It is useful as campaign history but does not meet the stronger current random-prefix/dispersion standard.
- **Comparison limit:** vLLM GPTQ and llama.cpp GGUF are different checkpoint/quantization stacks. Ratios describe the best tuned configurations tested on the same card, not an isolated engine variable.

### Current nightly/MTP4 evidence

- **Decode peak:** 204.6 t/s, approximately 105 prompt tokens and 32 output tokens.
- **Diverse-prompt decode:** 198.5 t/s median and 198.8 t/s mean across four different 64-output-token prompts at a configured 165W cap.
- **Cold prefill:** 8,153 t/s p4k and 8,393 t/s p8k, using a unique random prefix per request.
- **Power:** alternating 150W/230W prefill rounds on the same warm server were within ±0.2%; the higher cap did not improve this workload.
- **MTP:** direct counters measured 80.1% overall acceptance at N=4, decreasing by draft position. One MTP layer is invoked recurrently four times to propose up to four tokens before target verification.
- **Correctness boundary:** single-stream smoke-tested; full token/logit/KL differential pending. Mixed speculative/non-speculative GDN concurrency is unsupported because later guard-bypass attempts produced incorrect output.

The public cookbook now provides the pullable image digest, compatible patch order, exact-token prompt generator, Pi system prompt, request recorder, exact-128K commands, selected results, and a compact machine-readable campaign summary. Full raw SSE, serve logs, and synchronized host telemetry remain in the private evidence archive.
