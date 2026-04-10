---
title: "Local LLM Benchmark Hygiene on RK3588: Catching Hidden Thinking-Mode Regressions"
description: 'A practical methodology post on benchmarking local llama.cpp stacks on constrained hardware: cooldown control, mixed-workload discipline, and verifying that "no thinking" is actually off.'
situation: "After publishing multiple RK3588 local-AI benchmark and runtime posts, I hit a more subtle problem: some benchmark conclusions looked clean until I checked the real server logs and output artifacts closely."
issue: "On constrained hardware, it is easy to publish misleading local LLM results without realizing it. Mixed benchmark shapes get flattened into one headline, thermal drift contaminates comparisons, and 'reasoning disabled' may still leak visible think tags or hidden scratchpad behavior."
solution: "I tightened the benchmark process around three checks: enforce cooldown gates, only compare like-for-like mixed workloads, and verify no-thinking mode from the actual server process and visible outputs instead of trusting config alone."
usedIn: "RK3588 local inference work across Engram and my llama.cpp web workbench, especially Qwen3.5 and GLM-based CPU serving on a Radxa ROCK 5B+."
impact: "Converted a directionally useful benchmark pass into a defensible routing and runtime decision set: adopt the faster RK-tuned llama.cpp fork where it matters, keep a 2B fast tier, reserve 4B as the slower quality tier, and treat reasoning-mode hygiene as part of production readiness."
pubDate: 2026-04-10
category: "local-ai"
tags:
  [
    "rk3588",
    "radxa",
    "rock-5b-plus",
    "llama.cpp",
    "rk-llama.cpp",
    "benchmarks",
    "local-ai",
    "qwen3.5",
    "methodology",
  ]
draft: false
slug: "local-llm-benchmark-hygiene-rk3588-thinking-regressions"
---

## Context

I already had earlier posts covering:

- which Qwen3.5 models were actually practical on RK3588
- how the `llama.cpp` workbench was built and tuned
- why KV cache and context policy matter on edge hardware

This post is about a different question:

> how do you stop local LLM benchmarks from quietly lying to you?

That sounds dramatic, but it is a real problem on small boards.

On a `Radxa ROCK 5B+` with `RK3588`, tiny methodological mistakes easily become false product decisions:

- a benchmark row mixes prompt-only and decode-only numbers into one headline
- the board is still heat-soaked from the previous run
- a config says "reasoning disabled" but the server still starts with thinking enabled
- the UI looks clean, but the raw outputs still leak `<think>` blocks

When the target system is an actual local product rather than a one-off benchmark chart, those mistakes matter.

## What Went Wrong

The first benchmark pass was still useful, but it had three weaknesses.

### 1. Mixed benchmark shapes were treated like the same thing

Some rows combined:

- isolated prompt-processing measurements
- isolated token-generation measurements

and then compared them as if they came from one consistent mixed workload.

That is the kind of shortcut that produces attractive summary tables and weak engineering decisions.

If a user-facing chat request does both prefill and decode, the benchmark row should come from a single invocation that also does both.

### 2. Thermal state was part of the result

On RK3588, you cannot pretend thermal state is background noise.

If one run starts on a cooler board and the next starts on a heat-soaked board, the comparison is already contaminated. That is especially true when:

- the CPU is pinned to the big cores
- the fan curve is ramping aggressively
- long prompt-prefill phases keep the board hot between runs

I ended up treating cooldown as part of the benchmark definition, not as a nice-to-have.

### 3. "No thinking" was assumed, not verified

This was the most interesting failure mode.

A local stack can look correct at the configuration layer while still being wrong at runtime.

Examples:

- server starts with unrestricted reasoning budget by default
- chat templates still behave as thinking-enabled
- visible outputs include empty `<think>` wrappers even after reasoning was supposedly disabled

That means you need to verify no-thinking mode from:

1. the actual server startup flags
2. the server log behavior
3. the visible response artifacts

If you only check one layer, you can miss the real regression.

## The Corrected Process

I tightened the process into something much more defensible.

### Cooldown gates

Before each benchmark run:

- wait for the board to cool to a defined threshold
- insert a fixed post-run rest period
- avoid back-to-back measurements with no thermal reset

This is not overkill on ARM boards. It is basic control of the test environment.

### Like-for-like mixed workload rows

I only trusted rows where prompt processing and generation came from the same invocation.

That eliminated the temptation to assemble a "best of both worlds" row from incompatible measurements.

### Verified no-thinking mode

For CPU serving on the corrected runs, the stack was started explicitly with:

```bash
--reasoning off --reasoning-budget 0 --reasoning-format none
```

Then I verified that:

- the server process really launched with those flags
- the server log reported thinking disabled
- the completion outputs did not contain `<think>` markers

That last check still mattered because some stacks can leak empty wrappers even after server-side reasoning is off.

## What The Cleaned Results Changed

The corrected rerun did not magically reverse the broad direction of the earlier work. It did something more valuable:

- it narrowed the claims to the ones that were actually defensible

The practical result on this RK3588 setup was:

- `rk-llama.cpp` was worth adopting over a stock CPU-serving build for small Qwen3.5 models
- `Qwen3.5-2B` remained the fast interactive CPU tier
- `Qwen3.5-4B` remained slower, but structurally better enough to treat as a quality tier
- `4B` on NPU was not the breakthrough path some earlier summaries implied
- no-thinking mode had to be treated as a production requirement, not just a benchmark flag

That is a much better output than a louder but less reliable claim like "this backend wins everywhere" or "this single model is universally best."

## Why This Matters Outside RK3588

The exact board-specific numbers do not generalize. The benchmarking discipline does.

This same pattern applies on any local inference stack where you care about real behavior:

- desktops with GPU offload
- laptops with shared memory pressure
- SBCs doing CPU-only inference
- production-ish local tooling where visible UX matters more than synthetic tokens/second screenshots

The lesson is simple:

> benchmark methodology is part of the runtime, not a separate reporting task.

If the benchmark process is sloppy, the routing logic, defaults, and product claims built from it will also be sloppy.

## Result

The most interesting outcome was not a single speed number.

It was that a better benchmark process exposed a better implementation strategy:

- use the RK-tuned backend where it clearly helps
- split fast-tier and quality-tier models instead of pretending one model should do everything
- keep no-thinking mode explicit
- sanitize visible output even when server-side reasoning is disabled

That is the kind of finding worth carrying forward into real projects, because it improves both the measurements and the product built on top of them.
