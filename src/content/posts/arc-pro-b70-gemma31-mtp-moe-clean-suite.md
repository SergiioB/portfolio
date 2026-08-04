---
title: "Arc Pro B70 clean suite: Gemma 4 31B MTP, MoE prefill, and Grok tools"
description: "Real single-stream timings from a 2026-07-16 B70 suite: long-prompt prefill near 1.7k t/s on MoE, dense Gemma 31B +51% decode with MTP-4, and Grok Build CLI with tools enabled."
pubDate: 2026-07-16
category:
  - local-ai
  - infrastructure
  - b70
tags:
  - intel-arc
  - b70
  - llama.cpp
  - sycl
  - gemma-4
  - mtp
  - moe
  - grok-build
situation: "Daily local agent stack on a single Intel Arc Pro B70 32GB workstation."
issue: "Short-prompt prefill looked terrible, dense Gemma needed a path that was not stuck at ~16 t/s, and agent CLI numbers were being confused with engine throughput."
solution: "Re-measure with engine timings at long prompt sizes, replace Gemma 26B with Gemma 4 31B + Unsloth MTP draft + vision mmproj, keep MoE profiles for speed, and run Grok Build with tools on."
usedIn: "B70 profiles.json, llama-profile.service, Grok Build local models, LocalMaxxing submissions."
impact: "MoE long prefill ~1.7k t/s and decode ~61-69 t/s; Gemma31 MTP-4 decode 16.4→24.8 t/s at 165W (+51%); agent wall times documented separately."
amazonUrl: https://go.sergiiob.dev/arc-pro
draft: false
---

# Arc Pro B70 clean suite: Gemma 4 31B MTP, MoE prefill, and Grok tools

This is a field note from **2026-07-16**, not a marketing roundup. Every number below comes from a single clean suite on the workstation (`clean_gemma31_bench_20260716_110137`). Decode and prefill are **llama.cpp engine timings** (`timings.predicted_per_second` / `timings.prompt_per_second`) unless a section explicitly says **wall clock**.

**Hardware / stack**

- GPU: Intel Arc Pro B70, 32 GB — [Amazon buy link](https://go.sergiiob.dev/arc-pro)
- Backend: llama.cpp SYCL (`build-sycl-latest-l0`, b9853-class control)
- API: `llama-server` on `:8765`, alias `active`
- Batch: **1** (single-stream). Do not read these as concurrent fleet aggregates.
- Public benchmarks: [LocalMaxxing @ SergiioB](https://www.localmaxxing.com/en/user/SergiioB)
- Companion setup guide: [Grok Build with local models](/posts/grok-build-local-models-llama-server/)

Hardware reference: [Intel Arc Pro B70 on Amazon](https://go.sergiiob.dev/arc-pro).

![B70 inference stack](/images/diagrams/new/b70-jul16-inference-stack.svg)

## Master TG / PP table (engine, single-stream)

**TG** = decode t/s · **PP** = prefill t/s · shared flags: `-b 8192 -ub 4096`, FA on, `ctk q8_0` / `ctv q4_1`, `-ngl 99`, `-ncmoe 0`, `--parallel 1`.

| Profile                            | Arch        |   W |    **TG** | PP short | PP ~2k | **PP ~4k** | PP Grok-sys | p_n GS |
| ---------------------------------- | ----------- | --: | --------: | -------: | -----: | ---------: | ----------: | -----: |
| ornith35-q5-256k                   | MoE         | 150 | **69.27** |     23.2 |   1282 |   **1726** |        1300 |   1943 |
| qwen35-q5-256k                     | MoE         | 150 | **61.54** |     58.7 |   1236 |   **1690** |        1264 |   1943 |
| qwen35-q4-256k                     | MoE         | 150 | **62.76** |     20.9 |   1224 |   **1682** |        1246 |   1943 |
| qwen27-mtp-q5-256k-165w            | Dense+MTP   | 165 | **25.07** |     14.5 |    646 |    **613** |         599 |   1943 |
| gemma4-31b-mtp-q4-128k-165w        | Dense+MTP   | 165 | **24.08** |     15.6 |    466 |    **363** |         420 |   2003 |
| gemma4-31b-mtp-q4-128k-vision-165w | Dense+MTP+V | 165 | **24.56** |     16.2 |    465 |    **362** |         419 |   2003 |

Grok-sys uses the same ~8k-char system string; tokenizers differ (1943 vs 2003 tokens). Prefer **PP ~4k** for peak claims. LocalMaxxing `tokSPrefill` rows use the ~4k column.

## What changed on disk

- Removed **Gemma 4 26B MoE** weights and mmproj from the model disk.
- Added:
  - `gemma-4-31B-it-Q4_K_M.gguf` (Unsloth)
  - `mtp-gemma-4-31B-it.gguf` (Unsloth MTP draft)
  - `mmproj-F16.gguf` (vision projector)
- Profiles:
  - `gemma4-31b-mtp-q4-128k-165w`
  - `gemma4-31b-mtp-q4-128k-vision-165w`
- Kept MoE daily drivers: Ornith 35B Q5, Qwen 35B Q4/Q5, Qwen 27B MTP dense.

## Prefill: stop reading short prompts as the card limit

Short prompts (~15–40 tokens) on this stack often land in the **tens of t/s**. That is fixed overhead, not the long-context peak.

Long prompts tell a different story:

| Profile              | short pp | ~2k pp |   ~4k pp | Grok-sys-sized pp |
| -------------------- | -------: | -----: | -------: | ----------------: |
| Ornith 35B MoE Q5    |       23 |   1282 | **1726** |              1300 |
| Qwen35 Q5 MoE        |       59 |   1236 | **1690** |              1264 |
| Qwen35 Q4 MoE        |       21 |   1224 | **1682** |              1246 |
| Qwen27 MTP dense     |       15 |    646 |      613 |               599 |
| Gemma31 MTP dense    |       16 |    466 |      363 |               420 |
| Gemma31 MTP + vision |       16 |    465 |      362 |               419 |

![Prefill bars](/images/diagrams/new/b70-jul16-prefill-bars.svg)

**Takeaway:** on B70 SYCL, **MoE is the prefill card**. Dense 31B is not going to print RTX 3090 CUDA “2k prefill” headlines, but MoE already sits in the **~1.2–1.7k t/s** band on multi-kilo-token prompts.

Multi-turn KV reuse was real: after a system-sized prefix, turn 2 reported `cache_n` around **470–489**.

## Decode: MoE still wins raw speed; dense needs MTP

| Profile / config            | Decode t/s |
| --------------------------- | ---------: |
| Ornith 35B MoE Q5           |   **69.3** |
| Qwen35 Q4 MoE               |       62.8 |
| Qwen35 Q5 MoE               |       61.5 |
| Gemma31 MTP @180W           |       26.6 |
| Qwen27 MTP                  |       25.1 |
| Gemma31 MTP @165W           |       24.8 |
| Gemma31 base @150W (no MTP) |       16.4 |

![Decode bars](/images/diagrams/new/b70-jul16-decode-bars.svg)

### Gemma 4 31B flag sweep (same weights)

| Config            |  ~2k pp |  ~4k pp |          Decode |
| ----------------- | ------: | ------: | --------------: |
| base 150W, no MTP |     425 |     333 |        **16.4** |
| MTP-4 165W        |     465 |     361 | **24.8** (+51%) |
| MTP-4 ubatch=256  |     304 |     287 |            25.1 |
| MTP-4 DNN off     |     448 |     355 |            24.4 |
| MTP-4 + vision    |     464 |     361 |            24.6 |
| MTP-4 180W        | **496** | **385** |        **26.6** |
| MTP-4 q8/q8 KV    |     463 |     361 |            26.1 |

![Gemma MTP gain](/images/diagrams/new/b70-jul16-gemma31-mtp-gain.svg)

**What actually helped dense**

1. **MTP-4** (Unsloth draft + `--spec-type draft-mtp --spec-draft-n-max 4`) — largest decode win.
2. Keep **`-b 8192 -ub 4096`**. Dropping ubatch to 256 hurt prefill hard.
3. **180W** edged 165W on dense; still within the workstation sustained envelope for short characterization.
4. Vision mmproj on the text path was basically free.
5. `GGML_SYCL_DISABLE_DNN=1` did not help Gemma31 here.

Live server log on first Gemma31 load also showed draft acceptance around **0.71** (`draft_n` / `draft_n_accepted` in timings).

## Grok Build CLI: tools on, measured honestly

Earlier pure-generation runs with tools stripped were the wrong product test. This suite ran Grok with **tools enabled** (`--always-approve`) against local `base_url`.

| Model via Grok | quicksort wall | notes                   |
| -------------- | -------------: | ----------------------- |
| Ornith         |          42.4s | score 9, wrote/ran file |
| Qwen35-Q5      |          52.6s | score 9, wrote/ran file |
| Qwen27 MTP     |          53.4s | score 9, wrote/ran file |
| Gemma31        |          83.2s | slower agent wall       |

Direct engine coding walls for similar tasks were roughly **11–12s** on Qwen35. The gap is agent overhead (tool rounds, re-prefills, process start), not “prefill collapsed to 20 t/s”.

![Agent overhead](/images/diagrams/new/b70-jul16-agent-overhead.svg)

## Ops changes that came with the suite

- `run-profile` / `switch-profile` now apply **`powerWatts`** from `profiles.json` when starting a model (so power does not sit at 0W by accident).
- Default daily profile remains **`qwen35-q5-256k`** after the suite.
- Gemma26 profile removed; Gemma31 text + vision profiles registered for systemd user unit `llama-profile.service`.

## How I would choose a profile tomorrow

| Goal                         | Pick                                                                   |
| ---------------------------- | ---------------------------------------------------------------------- |
| Fast chat / agents           | Ornith 35B Q5 or Qwen35 Q5                                             |
| Best coding quality vs speed | Qwen35 Q5                                                              |
| Dense Gemma 4 31B            | `gemma4-31b-mtp-q4-128k-165w` (180W only if you want the last few t/s) |
| Vision on Gemma              | sister vision profile                                                  |
| Max long prefill             | MoE, not dense 31B                                                     |

## Caveats

- Single-stream only. Concurrent `batch=32` fleet numbers are a different experiment.
- Coding quality scores are heuristic (static checks + optional file exec), not SWE-bench.
- Grok “system prompt” prefill used an ~8k-character extracted instruction sample as a stand-in for agent system bulk; real tool schemas can be larger.
- Dense 31B still pays a bandwidth tax versus MoE active-parameter paths.

## Source files on the workstation

- `~/benchmarks/grok-build/results/clean_gemma31_bench_20260716_110137.json`
- `~/benchmarks/grok-build/results/clean_gemma31_bench_20260716_110137_report.md`
- `/home/sergio/inference/profiles.json`

If you only remember three things: **measure long prefill**, **use MTP on dense Gemma31**, and **never mix agent wall time with engine tok/s**.
