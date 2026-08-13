---
title: "Nemotron 3.5 Lightning + DFlash on the Arc Pro B70: 186.6 t/s C1"
description: "Isolated n=5 on one Intel Arc Pro B70: NVIDIA Nemotron-3.5-Lightning with DFlash (BF16 draft from official NVFP4) hits 186.6 t/s C1 median at p2048/g128 (cache off, 150 W). Native MTP is still 0% on this stack. The old 10k 'prefill' was a different n=3 TTFT cell."
situation: "NVIDIA shipped Nemotron-3.5-Lightning-30B-A3B (hybrid Mamba2 + LatentMoE, 3B active) with MTP and DFlash. Official serve paths assume Hopper/Blackwell or GGUF on 5090/Spark. Intel XPU had the model class, but eager decode was 21.8 t/s and native MTP accepted nothing."
issue: "Eager vLLM spent 32 ms/token in CPU enqueue (~950 launches). Compiled grouped_topk crashed. Official DFlash is NVFP4. The first DFlash screen (214/185 t/s) was n=3 and production respawned mid-load."
solution: "XPU graphs (at::zeros grouped-GEMM + native grouped-topk) for the 93 t/s no-spec floor; NVFP4→BF16 DFlash draft; isolated n=5 with production pinned off. Publish the artifacts on Hugging Face under SergiioB."
usedIn: "vLLM 0.26.1rc1.dev668+g3ee2df303 XPU, local GPTQ INT4 G64 + local DFlash BF16, benchmark-history Run 36, LocalMaxxing cmsr9po4w000ams01e4fc5qhj (self-report)."
impact: "Representative C1 decode 186.6 t/s at p2048/g128 n=5; 1.81× vs matched no-spec 87.25 at p8192/g128. Not a 5090/H100 bake-off — NVIDIA publishes no matched C1 number for those SKUs."
amazonUrl: https://go.sergiiob.dev/arc-pro
pubDate: 2026-08-13
category: ["b70", "local-ai", "infrastructure"]
tags: ["local-ai", "vllm", "intel-arc", "arc-pro-b70", "nemotron", "dflash", "gptq", "benchmark"]
draft: false
---

# Nemotron 3.5 Lightning + DFlash on the Arc Pro B70

A field note from **2026-08-13**. Every speed number below is a measured
single-stream (**C1**) result from one isolated campaign on one Intel Arc Pro
B70 32 GB. Decode is **client post-first** from monotonic SSE — not
llama-bench `tg`. Input is **prompt tokens / client TTFT** — not isolated
engine prefill.

**E2 self-report with raw evidence. Not independently reproduced.**
LocalMaxxing `APPROVED` means the self-report was accepted, not that the
platform reran the bench.

Canonical evidence: `results/nemotron-dflash-bf16-n7-n5-20260813T082203Z-1407994/`
(B70-DOCS, Run 36). Recipe:
[cookbook NEMOTRON-DFLASH-B70](https://github.com/SergiioB/intel-arc-pro-b70-inference-cookbook/blob/main/docs/nemotron35-30a3/NEMOTRON-DFLASH-B70.md).

## The plot first

Three things had to be true at once:

1. **Graphs**, or this 3B-active MoE stays at 21.8 t/s (launch-bound, not
   math-bound).
2. **DFlash**, because native MTP on this XPU stack still accepts **0%**.
3. **Isolation**, because the exciting n=3 screen (214 / 185 t/s) ran after
   production `b70dense` came back during Mamba warmup.

Isolated n=5 is slower, tighter, and honest: **186.6 t/s** representative
decode. That is still a different class of number than last week's 93 t/s
no-spec floor on the same card.

![Nemotron-3.5-Lightning DFlash advanced card: 186.61 decode, 7160 cold input, 1.81×, 119904 capacity](/images/posts/b70-nemotron-dflash-advanced-dashboard.svg)

![Compact Lane 1 n=5 dashboard](/images/posts/b70-nemotron-dflash-dashboard.svg)

## VRAM math

Target GPTQ INT4 G64 ≈ 18 GB. DFlash BF16 draft ≈ 1.67 GB. After load on
32,656 MiB visible: **5,826 MiB free** at `max_model_len=16384`,
`gpu-memory-utilization=0.90`, `max_num_seqs=1`. The isolated n=5 **speed**
card is still that 16K matrix.

A later isolated capacity ladder (Run 38) loaded `max_model_len=120000`
(5,328 MiB free, logged KV 295,000 tokens) and completed staged C1 requests
through **p119872+g32 = 119,904** tokens. That is a capacity result, not a
new decode headline. **128K was not run.**

## Isolated n=5 results (C1, cache off, 150 W cap)

Prefix cache explicitly off (`--no-enable-prefix-caching`; 0 hits / 0
queries). One same-shape warmup discarded per cell. `ignore_eos` on g128.
Configured cap 150 W; measured cell-window averages ~149–160 W; peak
interval-average 179.3 W; package max 68.0 °C.

| Cell           | Metric               |   n |    median |   min |   max |
| -------------- | -------------------- | --: | --------: | ----: | ----: |
| p2048/g1       | cold input (tok/s)   |   5 |      6456 |  6263 |  7353 |
| p8192/g1       | cold input (tok/s)   |   5 |  **7160** |  7117 |  7226 |
| p512/g128      | C1 client post-first |   5 |     194.6 | 140.2 | 220.0 |
| **p2048/g128** | C1 client post-first |   5 | **186.6** | 174.6 | 201.8 |
| p8192/g128     | C1 client post-first |   5 |     157.9 | 143.5 | 170.3 |

Window DFlash acceptance **1830 / 3521 = 52.0%** at `n_spec=7`.
Deterministic raw-completion replay smoke matched (scope: smoke, not
logit/KL or task quality).

**Representative scalar: 186.6 t/s** at p2048/g128. The p512 194.6 median
has a 140–220 family spread (tool/document vs assistant). Do not headline it.

**`n` is not concurrency.** Every row below is **C1** (one active request).
`n=5` means five measured repeats after a discarded same-shape warmup.
`n=1` is a single capacity observation.

### Speed card (Run 36, `max_model_len=16384`)

Client post-first decode and cold input are different metrics. Do not put them
on one unlabeled axis.

| Prompt / gen   | Metric                   |   n |    median |   min |   max |
| -------------- | ------------------------ | --: | --------: | ----: | ----: |
| p2048/g1       | cold input (prompt/TTFT) |   5 |      6456 |  6263 |  7353 |
| **p8192/g1**   | cold input (prompt/TTFT) |   5 |  **7160** |  7117 |  7226 |
| p512/g128      | C1 client post-first     |   5 |     194.6 | 140.2 | 220.0 |
| **p2048/g128** | C1 client post-first     |   5 | **186.6** | 174.6 | 201.8 |
| p8192/g128     | C1 client post-first     |   5 |     157.9 | 143.5 | 170.3 |

### Capacity ladder (Run 38, `max_model_len=120000`)

These completed. The t/s columns are **diagnostic n=1 g32** rates on a
different output length than the speed card. **Not 128K. Not a decode headline.**

| Prompt + gen    |  Completed | finish | cold input (diag.) | post-first (diag.) |
| --------------- | ---------: | ------ | -----------------: | -----------------: |
| 32768 + 32      |      32800 | length |               8220 |              103.8 |
| 65536 + 32      |      65568 | length |               7032 |               75.6 |
| 98304 + 32      |      98336 | length |               5923 |               52.1 |
| **119872 + 32** | **119904** | length |               5356 |               37.1 |

### About the “10k prefill”

An earlier **no-spec n=3** screen showed ~10,349 tok/s from p8192/**g128**
TTFT. That interval includes scheduling and first-token work. It is not
this DFlash campaign, not n=5, and not isolated engine prefill. The Lane 1
input number here is **7160** at p8192/**g1**.

## Matched comparison (same card, same target)

At **p8192/g128, C1, 150 W configured, cache off**, no-spec graphs measured
**87.25 t/s** median (n=5) and DFlash n=7 measured **157.92 t/s** median
(n=5): **1.81× on this cell**.

Comparison: `matched_except_speculation`.
Differences: DFlash draft + `num_speculative_tokens=7`.
This ratio does not generalize to p512 or to llama.cpp.

No-spec graphs themselves are the 21.8 → 93.00 t/s (p512/g128 n=5) story:
~950 kernel launches per token collapsed by PIECEWISE+FULL XPU graphs.

## What this is not

NVIDIA’s cards name RTX 5090, DGX Spark, H100, and GB200 as supported
platforms. They do **not** publish a matched C1 p2048/g128 number for those
SKUs on this model. The only official throughput-like phrase on the NVFP4
card is **“40+ TPS/user” on 1× H100** at concurrency ≤128 with **DSpark** —
a batched per-user serving claim, not our C1 post-first metric.

So the honest sentence is: a workstation B70 at ~150 W now runs NVIDIA’s
newest hybrid plus a **local BF16 DFlash draft** (reconstructed from official
NVFP4) at **186.6 t/s C1** p2048/g128 n=5. That is a local-AI result. It is
**not** “faster than a 5090.”

## Artifacts

| Piece                        | Where                                                                                                                                         |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Target (local GPTQ INT4 G64) | [SergiioB/Nemotron-3.5-Lightning-30B-A3B-GPTQ-INT4-G64-sym](https://huggingface.co/SergiioB/Nemotron-3.5-Lightning-30B-A3B-GPTQ-INT4-G64-sym) |
| Draft (local NVFP4→BF16)     | [SergiioB/Nemotron-3.5-Lightning-30B-A3B-DFlash-BF16](https://huggingface.co/SergiioB/Nemotron-3.5-Lightning-30B-A3B-DFlash-BF16)             |
| Source BF16 / DFlash         | `nvidia/NVIDIA-Nemotron-3.5-Lightning-30B-A3B-BF16` / `...-NVFP4-DFlash`                                                                      |
| Image digest                 | `vllm/vllm-openai-xpu@sha256:1da0a95485455f08588c11080b9718992fd7d434c6a965d74654903a9d999c57`                                                |
| Runtime patches              | native grouped-topk v2 + SSU B8/W4                                                                                                            |

There is no official GPTQ. The draft is a reconstruction, not a published
NVIDIA BF16 DFlash.

## Config

```bash
export TARGET=$HOME/models/Nemotron-3.5-Lightning-30B-A3B-GPTQ-INT4-G64-sym
export DRAFT=$HOME/models/Nemotron-3.5-Lightning-30B-A3B-DFlash-BF16
bash benchmarks/nemotron35-30a3/launch-nemotron-dflash.sh "$TARGET" "$DRAFT" 8001
```

Flags that matter: `VLLM_XPU_ENABLE_XPU_GRAPH=1`, `--async-scheduling`,
`--no-enable-prefix-caching`, `--max-num-seqs 1`,
`--speculative-config '{"method":"dflash","num_speculative_tokens":7}'`.
Rename any leftover `hf_quant_config.json` on the draft or vLLM will treat
it as NVFP4.

## Lessons (for the next architecture)

1. **Screen speculation.** MTP vs DFlash vs n-gram is an evidence question.
   Nemotron vLLM MTP is still dead; DFlash is not.
2. **Read the tensors.** Official DFlash is NVFP4. A leftover ModelOpt json
   on a BF16 folder is a load failure, not a warning.
3. **n=3 plus a respawned extra engine is not a headline.** Isolate the GPU
   for the whole load. Isolated n=5 p8192 was 158, not 185.
4. **Cold input ≠ prefill.** The 10k number was TTFT on a decode cell.
5. **Graphs are the no-spec floor** (`at::zeros` atomic + native
   `grouped_topk`). Opened 2026-08-13:
   [vllm#52159](https://github.com/vllm-project/vllm/pull/52159) and
   [vllm-xpu-kernels#524](https://github.com/vllm-project/vllm-xpu-kernels/pull/524).
   The converters stay out of those PRs.

Reproduce from the public cookbook (digest + runtime patches; no local image
tag): [NEMOTRON-DFLASH-B70](https://github.com/SergiioB/intel-arc-pro-b70-inference-cookbook/blob/master/docs/nemotron35-30a3/NEMOTRON-DFLASH-B70.md).

## Methodology

- C1, exact rendered chat-template tokens, entropy-first unique prefixes
- cache-off proven with counter deltas
- n=5 after same-shape warmup; all samples retained
- power from `energy1_input` over the cell window; hwmon discovered by PCI
- speed is not quality parity with the BF16 teacher
