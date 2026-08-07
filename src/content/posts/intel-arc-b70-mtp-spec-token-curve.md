---
title: "MTP Spec-Token Curve on Intel Arc Pro B70 — 204.6 t/s Decode at N=4 (and Why 97% Acceptance Isn't the Goal)"
description: "The MTP draft head is recurrent, so a single-layer MTP checkpoint emits N speculative tokens per step. The spec-N curve (N=1/2/4) is the real story: N=4 wins throughput at 204.6 t/s single-stream decode (+41% vs the community 145 claim) even though per-token acceptance falls with N (92.6% → 84.2% → 72.7% → 68.9% by draft position). N=1 reaches 97.1% acceptance — but costs 30% throughput. The right objective for a single-layer draft head is throughput, not acceptance %. A paired, alternating power A/B also killed the 'boost prefill to 230W' hypothesis: 150W vs 230W prefill is flat at ±0.2%."
situation: "MTP speculative decoding was unlocked at ~123 t/s single-stream, but the community's 145-150 t/s target was still out of reach. Benchmark history assumed num_speculative_tokens was clamped to the single MTP layer count. Two open questions: does raising N help, and is prefill a power lever?"
issue: "Two assumptions blocked progress: (1) 'num_speculative_tokens=2 clamps to 1' — false, the MTP module is recurrent (spec_step_idx % num_mtp_layers), so a single layer emits N draft tokens per step. (2) 'prefill scales with power' — a claim from unpaired runs that turned out to be prefix-cache contamination, not a real power effect."
solution: "Ran a clean spec-token sweep (MTP1/2/4) with an honest cold-prefill harness (unique random prefix per call so prefix caching never fires), read acceptance directly from the vllm:spec_decode_* counters, then ran a paired alternating 150W-vs-230W power A/B to settle the power question rigorously."
usedIn: "Intel Arc Pro B70 32GB, intel/vllm-openai-xpu:nightly (v0.26.1rc1.dev457) + patch_mtp_nightly.py (BF16 draft env-gate), Qwen3.6-35B-A3B-MTP-Preserved-GPTQ-Int4. 165W. Honest prefill probe + paired power A/B harness."
impact: "MTP4 decode 204.6 t/s (short/32) — first single-stream result past the 145 t/s claim (+41%). The spec-N curve is the decision tool: N=4 is the throughput optimum on a single-layer draft head. N=1 gives 97.1% acceptance but only 141.8 t/s (−30%). And the paired A/B shows raising the cap above 150W is pure waste heat on MoE+MTP — prefill is bandwidth-gated, not power-gated. Evidence: benchmark-history Run 24, campaign A19-A20."
pubDate: 2026-08-07
category: ["b70", "local-ai", "infrastructure"]
amazonUrl: https://go.sergiiob.dev/arc-pro
tags:
  [
    "local-ai",
    "vllm",
    "xpu",
    "intel-arc",
    "arc-pro-b70",
    "mtp",
    "speculative-decoding",
    "spec-acceptance",
    "power-scaling",
    "benchmark",
    "qwen",
  ]
draft: false
---

> **Context:** this is the follow-up to the vLLM MTP unlock work. It adds the
> MTP spec-token sweep, the spec-acceptance curve, and the paired power A/B that
> killed the earlier "prefill power boost" hypothesis.

## Situation

MTP speculative decoding was unlocked at ~123 t/s single-stream — a real win, but
the community's 145-150 t/s target stayed just out of reach. Two things looked
worth questioning:

1. **The "clamped to 1" assumption.** The benchmark log claimed
   `num_speculative_tokens=2` clamps to 1 because the checkpoint has a single MTP
   layer. If true, MTP is stuck at one draft token per step.
2. **Prefill throughput.** It sat at ~7.5K t/s. The no-spec path had hit ~9K —
   so there was a gap, but nobody knew what lever closed it, and an earlier
   unpaired run hinted power was it.

## Finding 1 — the MTP draft head is recurrent

The "clamp" was a myth. Look at the MTP model's forward:

```python
current_step_idx = spec_step_idx % self.num_mtp_layers
```

With `mtp_num_hidden_layers: 1`, `% 1 == 0` always — the SAME layer is reused to
emit N draft tokens per step. The earlier "clamped to 1" note was just because
that launch hardcoded `num_speculative_tokens: 1`. No code path clamps it to
layer count (verified in `llm_base_proposer.py` and `config/speculative.py`).

vLLM does warn: _"Enabling num_speculative_tokens > 1 will run multiple times of
forward on same MTP layer, which may result in lower acceptance rate."_ That
warning turns out to be the whole story.

## Finding 2 — the spec-N curve, and why N=4 wins (230W, single-stream)

Reading acceptance directly from the `vllm:spec_decode_*` counters (drafts,
draft tokens, accepted tokens, accepted-per-position) gives the per-position
acceptance — the thing the speedup ratio only implies:

| N   | tg32 decode | overall accept | pos0 | pos1 | pos2 | pos3 | vs no-spec 72.6 |
| --- | ----------: | -------------: | ---: | ---: | ---: | ---: | --------------: |
| 1   |       141.8 |      **97.1%** | 97.1 |    — |    — |    — |           1.95× |
| 2   |       174.5 |          92.1% | 95.2 | 89.0 |    — |    — |           2.40× |
| 4   |   **198.2** |          80.1% | 92.6 | 84.2 | 72.7 | 68.9 |       **2.73×** |

The acceptance falloff by draft position is **fundamental to single-layer MTP
drafting**: each draft token is an autoregressive guess off the previous guess,
so errors compound down the chain. pos0 is always the best (the draft head sees
the real target token); each subsequent position drifts further.

So: **97-99% acceptance is reachable (N=1), but it costs 30% throughput.** N=4's
compounding yield — even at 68.9% on the 4th token — wins because 3.2 accepted
tokens per step beats N=1's ~1.97. The right objective for a single-layer draft
head is **throughput, not acceptance %**. The only way to combine high-N _and_
high acceptance is a multi-layer draft model (DeepSeek-V3-style 3-layer MTP),
which this GPTQ checkpoint does not have.

### Full grid (decode t/s, steady-state, 165W)

| prompt/out |  MTP1 |  MTP2 |      MTP4 |
| ---------- | ----: | ----: | --------: |
| short/32   | 137.4 | 152.3 | **204.6** |
| short/64   | 134.8 | 155.2 |     190.6 |
| short/128  | 130.9 | 145.6 |     175.7 |
| p1k/64     | 127.7 | 151.8 |     179.8 |
| p8k/64     | 118.5 | 137.1 |     165.9 |

**Rule of thumb:** short-interactive → MTP4 (peak decode); mixed/medium → MTP2
(balanced); long-context or prefill-bound → MTP1. The decode edge narrows at
long context (short 204.6 → p8k 159.6) because the fixed 4-draft window
amortizes less when verifying long contexts.

## Finding 3 — power is NOT a prefill lever (paired A/B killed the hypothesis)

An earlier unpaired run suggested raising the cap 150W→230W gave +16-22% prefill.
**That was prefix-cache contamination, not a power effect** — the harness used a
constant filler string, so reps 2-3 hit the cache and reported prefill that rose
from ~8.6K to ~42K t/s (a 5× lie the "steady-state = reps 2-3" averaging hid).

The correct test is a **paired, alternating A/B on the same warm server** —
cool to <52°C, set 150W, measure honest cold prefill, set 230W, measure, repeat
for 3 rounds with a unique random prefix per call so the cache can never match:

| prompt | 150W mean | 230W mean | delta |
| ------ | --------- | --------- | ----- |
| p2k    | 7,216     | 7,207     | −0.1% |
| p4k    | 8,140     | 8,135     | −0.1% |
| p8k    | 8,384     | 8,403     | +0.2% |

**Flat at ±0.2% across all prompt lengths.** Raising the cap above 150W is pure
waste heat on MoE+MTP. Live card-draw telemetry explains why: prefill p8k draws
~171W, decode draws ~113W, idle ~47W — so at 165W the prefill is already
uncapped, and the grouped-GEMM is bandwidth-gated, not power-gated.

> **On clocks:** you can't lock GPU frequency either. The B70 runs the `xe`
> driver (not i915), which exposes no clock-control sysfs — only read-only PMU
> counters. `intel_gpu_frequency` and `xpu-smi` both fail on this stack. The
> hwmon power cap is the only tunable, and as the A/B shows, it doesn't move
> prefill on this workload. (Dense llama.cpp decode _does_ scale +18-30% from
> 150→230W per Run 19 — a genuinely different, bandwidth-heavier workload.)

## The bottom line

One Intel Arc Pro B70 (32 GB, ~€1,100 / ~$1,200) on Qwen3.6-35B-A3B (MoE):

| Config   | Decode (short/32) | Prefill (p4k, honest) | Power |
| -------- | ----------------: | --------------------: | ----: |
| **MTP4** |     **204.6 t/s** |                 8,153 |  150W |
| MTP2     |         174.5 t/s |                ~7,500 |  150W |
| MTP1     |         141.8 t/s |                ~7,100 |  150W |

**MTP4 at 150W is the recipe.** Peak short-context decode (204.6 t/s, +41% over
the community claim) with no power premium. Don't chase acceptance % — N=1's
97.1% looks great on paper and loses 30% of your tokens. Open patches and
harnesses in
[the cookbook](https://github.com/SergiioB/intel-arc-pro-b70-inference-cookbook).

## LocalMaxxing — decode submission APPROVED

| Submission                    |         Value | Batch | Link                                                                                             |
| ----------------------------- | ------------: | ----: | ------------------------------------------------------------------------------------------------ |
| **MTP4 single-stream decode** | **204.6 t/s** |     1 | [run](https://www.localmaxxing.com/en/models/Qwen/Qwen3.6-35B-A3B?run=cmsiwwpzf00a4qm01z18izmad) |

Approved instantly on localmaxxing.com. (The concurrency multi-user path is
blocked by the GDN `causal_conv1d` kernel rejecting mixed spec/non-spec batches —
see Run 23 — so the decode number is the citable single-stream result.)

## Methodology

- **Checkpoint:** `Qwen3.6-35B-A3B-MTP-Preserved-GPTQ-Int4`, native int4 + BF16
  MTP draft (env-gated via `patch_mtp_nightly.py`, `B70_MTP_BF16_DRAFT=1`).
- **Engine:** `vllm/vllm-openai-xpu:nightly` (v0.26.1rc1.dev457), graphs on,
  `--max-num-batched-tokens 8192`, `--language-model-only`.
- **Spec-token sweep:** `--speculative-config {"method":"mtp","num_speculative_tokens":N}`
  for N=1/2/4, single-stream, fresh server per N, warmed + cooled between.
- **Acceptance:** read directly from `vllm:spec_decode_num_*` counters
  (`/metrics`), per-position via `..._accepted_tokens_per_pos_total{position="k"}`.
- **Honest prefill:** `b70-prefill-honest.py` — unique random prefix per call so
  `vllm:prefix_cache_hits_total` stays 0. **The old sweep with a constant filler
  inflates prefill 5× — do not use it.**
- **Power A/B:** `b70-power-ab-prefill.py` — paired alternating 150W/230W, 3
  rounds, cooled <52°C between, alternates which cap goes first per round to
  remove order bias.
- Repo evidence: B70-DOCS `docs/benchmark-history.md` Run 24,
  `research/vllm-021-campaign-20260806.md` A19-A20.
