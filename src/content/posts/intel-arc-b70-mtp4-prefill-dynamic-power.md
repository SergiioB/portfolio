---
title: "MTP4, Prefill Power, and Dynamic Boost on Intel Arc Pro B70 — 204.6 t/s Decode"
description: "The MTP draft head is recurrent, so a single-layer MTP checkpoint emits N speculative tokens per step. num_speculative_tokens is NOT clamped to layer count: MTP4 hits 204.6 t/s single-stream decode (short ctx, +49% vs MTP1, beats the community 145 t/s claim by 41%). Prefill turns out to be a POWER lever (compute-bound; 230W = +16-22%) while decode is a bandwidth lever (self-limits ~140W). A reactive dynamic-power manager raises the cap to 230W during prefill bursts and drops to 165W for decode — identical 230W prefill at only 5% high-power duty cycle."
situation: "The MTP speculative-decode path was unlocked (123 t/s single-stream), but the community's 145-150 t/s target remained out of reach. Benchmark history assumed num_speculative_tokens was clamped to the single MTP layer. Prefill was ~7.5K t/s and unknown whether it could be pushed further."
issue: "Two wrong assumptions blocked progress: (1) 'num_speculative_tokens=2 clamps to 1' — the MTP module is recurrent (spec_step_idx % num_mtp_layers), so a single layer emits N draft tokens per step; no code path clamps it. (2) 'MoE never benefits from power' — true for decode (bandwidth-bound, self-limits ~140W) but WRONG for prefill (compute-bound, scales to 230W)."
solution: "Ran a spec-token sweep (MTP1/2/4) with a prompt×output grid harness (honest cold prefill, prefix caching off), plus power/thermal telemetry via hwmon energy-delta. Then built a reactive dynamic-power manager that samples card watts every 0.5s: boost cap to 230W on a prefill burst, relax to 165W when the card settles into decode."
usedIn: "Intel Arc Pro B70 32GB, intel/vllm:0.21.0-xpu-int4moe, Qwen3.6-35B-A3B-MTP-Preserved-GPTQ-Int4, native int4 v4 + BF16 MTP draft patches. 165W/230W power sweeps, hwmon energy-delta telemetry."
impact: "MTP4 decode 204.6 t/s (short/32) — first single-stream result past the 145 t/s claim (+41%). MTP2 142.4 t/s. Prefill: MTP1@230W = 9.0K t/s (beats 7,975 by 13%, matches the no-spec record). max-num-batched-tokens past 8192 does nothing; power is the lever. Dynamic power manager delivers identical 230W prefill at only 5% duty cycle. Evidence: benchmark-history Run 24-25, campaign A20-A23."
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
    "prefill",
    "power-scaling",
    "dynamic-power",
    "benchmark",
    "qwen",
  ]
draft: false
---

> **Context:** this is the follow-up to the vLLM MTP unlock work documented in
> [the vLLM question post](/posts/intel-arc-b70-vllm-question-tested). It adds the
> MTP spec-token sweep, the prefill-power finding, and the dynamic boost manager.

## Situation

MTP speculative decoding was unlocked at 123 t/s single-stream — a real win,
but the community's 145-150 t/s target stayed just out of reach. Two things looked
worth questioning:

1. **The "clamped to 1" assumption.** The benchmark log claimed
   `num_speculative_tokens=2` clamps to 1 because the checkpoint has a single MTP
   layer. If that's true, MTP is stuck at one draft token per step.
2. **Prefill throughput.** It sat at ~7.5K t/s. The no-spec path had hit 9,094 —
   so there was a gap, but nobody knew what lever closed it.

## Finding 1 — the MTP draft head is recurrent

The "clamp" was a myth. Look at the MTP model's forward:

```python
current_step_idx = spec_step_idx % self.num_mtp_layers
```

With `mtp_num_hidden_layers: 1`, `% 1 == 0` always — the SAME layer is reused to
emit N draft tokens per step. The earlier "clamped to 1" note was just because that
launch hardcoded `num_speculative_tokens: 1`. No code path clamps it to layer count
(verified in `llm_base_proposer.py` and `config/speculative.py`).

vLLM does warn: _"Enabling num_speculative_tokens > 1 will run multiple times of
forward on same MTP layer, which may result in lower acceptance rate."_ But on short
and medium generates, acceptance holds.

### The MTP spec-token sweep (230W, single-stream)

| N   |      tg32 | pp2048 |     tg128 |
| --- | --------: | -----: | --------: |
| 1   |     125.8 |  112.1 |     114.4 |
| 2   |     142.4 |  133.4 |     133.0 |
| 4   | **172.1** |  124.4 | **149.4** |

**MTP4 tg32 = 172.1 t/s** — beats the 145 claim. And with the fuller grid
(honest cold prefill, prefix caching off), short/32 decode reaches **204.6 t/s**.

### Full grid (decode, rep 2-3 steady-state)

| prompt/out |  MTP1 |  MTP2 |      MTP4 |
| ---------- | ----: | ----: | --------: |
| short/32   | 137.4 | 152.3 | **204.6** |
| p1k/64     | 127.7 | 151.8 | **179.8** |
| p8k/64     | 118.5 | 137.1 | **165.9** |

**The downside of MTP4:** prefill pays for the decode win. Each prefill step runs
the draft forward N times, so MTP4 prefill is ~11% slower than MTP1. And the decode
edge narrows at long context (short 204.6 → p8k 159.6, -22%) because the fixed
4-draft window amortizes less when verifying long contexts.

| prompt |     MTP1 | MTP2 | MTP4 |
| ------ | -------: | ---: | ---: |
| p2k    | **8290** | 7962 | 7409 |
| p8k    | **7454** | 7337 | 7179 |

**Rule of thumb:** short-interactive → MTP4 (peak decode); mixed/medium → MTP2
(balanced); heavy long-context or prefill-bound → MTP1.

## Finding 2 — prefill is a POWER lever, decode is a bandwidth lever

This is the counterintuitive result. Decode is memory-bandwidth-bound (MoE reads
~3 GB/token) and self-limits to ~140W regardless of the power cap. Prefill is
**compute-bound** and scales with power:

| prompt | MTP1@165W | MTP1@230W | gain |
| ------ | --------- | --------- | ---- |
| p2k    | 7358      | **8537**  | +16% |
| p4k    | 7589      | **9005**  | +19% |
| p8k    | 7204      | **8824**  | +22% |

**MTP1@230W prefill = 9.0K t/s (p4k)** — matches the no-spec record (9,094) and
beats the community 7,975 by 13%. The MTP draft's prefill overhead is now <1%.

I also tested `max-num-batched-tokens` (8192 → 16384): **zero change**. Prefill is
not chunk-bound at 8K; the only lever is power.

## The dynamic boost manager (the 5%-duty trick)

Since prefill wants 230W and decode wants 165W, why pick one? Run a reactive
manager that watches the card's actual power draw:

- Sample card watts (hwmon energy-delta) every 0.5s
- Power > 170W → set cap to 230W (prefill burst)
- Power ≤ 155W for 4 consecutive samples → set cap to 165W (decode/idle)

| metric       | static 165W | static 230W | **dynamic**  |
| ------------ | ----------- | ----------- | ------------ |
| p4k prefill  | 7589 t/s    | 9005 t/s    | **8989 t/s** |
| time at 230W | 0%          | 100%        | **5%**       |
| time at 165W | 100%        | 0%          | **95%**      |

The dynamic manager delivers **identical 230W prefill performance** while the card
sits at 230W only 5% of the time. Prefill power peaks at 237W; decode settles to
~140W (self-limited). This is the classic "boost for the compute burst, relax for
the bandwidth-bound phase" pattern.

> **On clocks:** the power cap is the effective clock-boost control. Direct GPU
> frequency is not readable on the Xe/Level-Zero driver (no i915 sysfs, and
> `xpu-smi` is broken on this stack), so the cap is the lever that lets the GPU
> clock up during prefill.

```bash
# Serve with dynamic power management (runs alongside the vLLM server)
bash benchmarks/b70-dynamic-power.sh 0.5 /tmp/dyn-power.log &
# watch it boost to 230W during prefill, relax to 165W during decode
```

## Power/thermal telemetry

| Config               | card avg | card peak | pkg temp avg/peak |
| -------------------- | -------: | --------: | ----------------- |
| MTP1 @165W           |   153.4W |    181.8W | 66/73°C           |
| MTP2 @165W           |   157.5W |    188.5W | 67/72°C           |
| MTP4 @165W           |   159.8W |    190.5W | 66/72°C           |
| MTP1 @230W (prefill) |    ~180W |    236.8W | 70°C              |

Card avg 154-160W at 165W cap (MoE self-limits below cap); the 190-237W peaks are
prefill bursts. Temperatures stay well within safe limits even at 230W.

## The bottom line

One Intel Arc Pro B70 (32 GB, ~€1,100 / ~$1,200) on Qwen3.6-35B-A3B (MoE):

| Config             | Decode (short/32) | Prefill (p4k) | Power duty  |
| ------------------ | ----------------: | ------------: | ----------- |
| **MTP4 @230W**     |     **204.6 t/s** |     8,715 t/s | 100% high   |
| **MTP1 @230W**     |         137.4 t/s | **9,005 t/s** | 100% high   |
| **MTP1 + dynamic** |         137.4 t/s | **8,989 t/s** | **5% high** |
| MTP4 @165W         |         175.7 t/s |     7,601 t/s | 100% low    |

**MTP4 + dynamic power** is the full recipe: peak short-context decode (204.6 t/s,
+41% over the community claim) with prefill boosted to ~9K via the dynamic manager
at only 5% high-power duty. Open patches and harnesses in
[the cookbook](https://github.com/SergiioB/intel-arc-pro-b70-inference-cookbook).

## Consolidated results

**Config:** native INT4 v4 + BF16 MTP draft, single-stream, prefix caching OFF
(honest cold prefill). Decode grid @165W, prefill @230W.

### Decode (t/s) — grid @165W, steady-state

| Prompt → Gen |  MTP1 |  MTP2 |      MTP4 |
| ------------ | ----: | ----: | --------: |
| short → 32   | 137.4 | 152.3 | **204.6** |
| short → 64   | 134.8 | 155.2 | **190.6** |
| short → 128  | 130.9 | 145.6 | **175.7** |
| p1k → 64     | 127.7 | 151.8 | **179.8** |
| p2k → 64     | 125.9 | 139.1 | **175.8** |
| p4k → 64     | 121.8 | 141.2 | **173.1** |
| p8k → 64     | 118.5 | 137.1 | **165.9** |
| p8k → 128    | 119.7 | 133.4 | **159.6** |

### Prefill (t/s) — cold, no prefix cache

| Prompt | MTP1@165W | MTP1@230W | MTP4@165W | MTP4@230W |
| ------ | --------: | --------: | --------: | --------: |
| p500   |      5607 |      5289 |      4894 |      4801 |
| p1k    |      7235 |      7235 |      6479 |      6548 |
| p2k    |      8414 |  **8530** |      7653 |      8103 |
| p4k    |      8277 |  **8989** |      7738 |      8715 |
| p8k    |      7518 |  **8836** |      7246 |      8640 |

### Power / thermal @165W cap

| Config | card avg | card peak | prefill peak | temp pkg avg/peak |
| ------ | -------: | --------: | -----------: | ----------------: |
| MTP1   |   153.4W |    181.8W |        ~237W |           66/73°C |
| MTP2   |   157.5W |    188.5W |            — |           67/72°C |
| MTP4   |   159.8W |    190.5W |        ~237W |           66/72°C |

### vs the "custom image + kernel" Reddit claim

| Metric         | Our MTP4 (stock image + 2 patches) | Custom-build claim |
| -------------- | ---------------------------------: | -----------------: |
| tg32 decode    |                      **204.6 t/s** |     174.54 ± 13.05 |
| pp4096 prefill |                      ~8.5-8.7K t/s |      9,268 ± 39.69 |

MTP4 beats his decode by 17%; his custom kernel edges us on prefill (~6%) —
the gap to close with a custom kernel.

## Methodology

- **Checkpoint:** `Qwen3.6-35B-A3B-MTP-Preserved-GPTQ-Int4`, native int4 v4 +
  BF16 MTP draft patches, `intel/vllm:0.21.0-xpu-int4moe`.
- **Spec-token sweep:** `--speculative-config {"method":"mtp","num_speculative_tokens":N}`
  for N=1/2/4, single-stream, 230W.
- **Grid harness:** `b70-mtp-grid-bench.py` — 6 prompt × 3 output lengths × 3 reps,
  unique suffix per rep, **prefix caching OFF** (honest cold prefill).
- **Power telemetry:** `monitor-power.sh` — hwmon energy-delta for card/pkg watts,
  pkg/vram/mctrl temps, 1s samples.
- **Dynamic manager:** `b70-dynamic-power.sh` — 0.5s power sampling, boost/relax
  thresholds, cap transitions.
- Repo evidence: B70-DOCS `research/vllm-021-campaign-20260806.md` A20-A23,
  `research/vllm-mtp-session-20260807.md`, benchmark-history Run 24-25.
