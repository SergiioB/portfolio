---
title: "RK3588 NPU Router Architecture: What Actually Runs Now"
description: "An updated deep dive into the real RK3588 routing stack in Engram: where the NPU is the fast chat path, where CPU GGUF still wins, and which April 2026 benchmark corrections changed the architecture story."
situation: "The original RK3588 architecture write-up reflected a March 2026 benchmark picture. By early April, the live routing stack, measured winners, and benchmark harnesses had shifted enough that the old article was no longer accurate."
usedIn: "Engram AI, a local-first engineering runtime for Discord and private on-device development workflows."
impact: "Reframed the architecture around current measured winners: Qwen3 1.7B on NPU for fast chat, Qwen2.5 3B on NPU for quality reasoning, LFM2.5 1.2B on CPU for tool-heavy work, and Qwen3.5 4B as the balanced CPU fallback rather than the universal default."
pubDate: 2026-04-06
category: "local-ai"
tags: ["rk3588", "npu", "rkllm", "llama.cpp", "routing", "benchmarks", "local-ai"]
draft: false
---

## Situation

The March version of this write-up said the practical RK3588 story was:

- NPU for smaller side work
- `llama.cpp` CPU for the main interactive path
- `qwen35-4b-cpu` as the best default

That was true for the benchmark set I had then. It is not the cleanest description of the stack now.

After another routing sweep in early April 2026, three things changed:

1. the measured winners shifted by workload, not just by average throughput
2. the runtime itself was updated to use benchmark-aware routing instead of older heuristic defaults
3. two benchmark harness issues were fixed, which changed what counted as a trustworthy result

So this post is the corrected architecture, not the sentimental one.

## The Current Architecture

The real RK3588 routing split now looks like this:

1. **Fast chat and low-latency interaction:** `qwen3-1.7b-w8a8` on RKLLM / NPU
2. **Reasoning-quality NPU path:** `qwen2.5-3b-w8a8-g256`
3. **Tool-heavy and coding planner path:** `lfm25-1.2b-instruct-cpu`
4. **Balanced CPU fallback:** `qwen35-4b-cpu`
5. **Tiny emergency/cheap fallback:** `qwen35-0p8b-cpu`

That means the NPU is not just a background helper anymore. It is the preferred fast chat path when the request fits the validated route.

The CPU path is still essential, but now it has a narrower and clearer role:

- structured tool calling
- coding-oriented planner work
- fallback when the NPU route is not the right fit
- heavier CPU-only interactive work where quality matters more than first-token speed

## What Changed Since March

The biggest change was not a new model. It was better measurement and better runtime alignment.

### 1. `qwen35-2b-cpu` stopped being the de facto default

That model had become a sticky fallback in several places because of older heuristics. Once the runtime was forced to follow measured results instead of RAM-tier instincts, it lost that role.

Measured CPU tool-path comparison:

| Model | Tool score | Tokens/s | Load time | Result |
| --- | ---: | ---: | ---: | --- |
| `lfm25-1.2b-instruct-cpu` | 0.95 | 2.67 to 2.82 | 2.69s | best tool/coding CPU path |
| `qwen35-4b-cpu` | 1.00 | 0.61 | 9.23s | slower but stronger balanced CPU fallback |
| `qwen35-2b-cpu` | 0.75 | 1.29 | 4.92s | no longer the right planner default |

So the old "2B is the practical default" framing is too blunt now.

### 2. The NPU path is more important than the article gave it credit for

Current measured NPU routing winners:

| Role | Model | Why it wins |
| --- | --- | --- |
| fast chat | `qwen3-1.7b-w8a8` | strongest TTFT profile for low-latency interaction |
| reasoning / quality | `qwen2.5-3b-w8a8-g256` | best quality-speed balance on the NPU tier |
| code specialist | `qwen2.5-coder-3b-w8a8` | still strong, but no longer the general winner |

The corrected live registry now advertises exactly that split.

### 3. Two benchmark problems were fixed

This matters because architecture decisions are only as good as the harness behind them.

The fixes:

- the Discord runtime sweep now boots with the same dynamic registry as the live service
- `qwen3-1.7b-w8a8` was corrected from an invalid `8192` context claim to the real validated `4096`

Before that fix, some "forced NPU" runs were silently falling back to CPU. That is not a benchmark result, that is a routing bug pretending to be evidence.

## The Current Measured Winners

### Fastest practical tool/coding CPU route

`lfm25-1.2b-instruct-cpu`

Why:

- fastest validated tool-oriented CPU throughput in the maintained suite
- best load time among useful planner-grade CPU models
- better JSON and tool-call behavior than the old `qwen35-2b-cpu` default path

Direct gain over the old 2B CPU planner path:

- tokens/s: `1.292` -> `2.674` to `2.824`
- load time: `4.92s` -> `2.687s`
- TTFT: `1826ms` -> `1661ms`
- TTLT: `9601ms` -> `5232ms`

That is about:

- `2.1x` better throughput
- `45%` faster load
- `45%` lower total completion latency

### Best balanced CPU model

`qwen35-4b-cpu`

This is the right CPU fallback when I want a broader interactive model and can afford more latency than the tiny/focused tool path.

It is not the universal default anymore, but it is still the best balanced CPU choice in the current stack.

### Best fast chat path

`qwen3-1.7b-w8a8`

That is now the speed route the registry exposes on this board. In the current measured report, it is the winner for the `CHAT` intent.

### Best quality NPU route

`qwen2.5-3b-w8a8-g256`

That is the quality recommendation the live service now advertises at startup.

## What the Live Service Says Now

After the April 6 routing and benchmark cleanup, the service boots with benchmark-aware recommendations like this:

- `speed`: `qwen3-1.7b-w8a8`
- `quality`: `qwen2.5-3b-w8a8-g256`
- `coding`: `lfm25-1.2b-instruct-cpu`
- `chat`: `qwen3-1.7b-w8a8`
- `overall`: `qwen35-4b-cpu`

That is a better description of the real architecture than "CPU is the main path, NPU is secondary."

The cleaner phrasing now is:

- NPU owns fast interaction
- CPU owns structured tool work and broad fallback coverage
- larger CPU models are deliberate, not default

## What I No Longer Claim

I would not publish these claims anymore:

- "`qwen35-4b-cpu` is the practical interactive default for everything"
- "NPU is mostly background work"
- "the old benchmark winners are enough to describe the current system"

Those claims were anchored to an earlier measurement set and older runtime behavior.

## Benchmark Standard

The architecture only makes sense if the benchmark standard is honest.

The maintained benchmark stack now tries to enforce that:

- single-request baselines for load time, TTFT, TTLT, tool accuracy, JSON accuracy
- sustained concurrent load for tail latency and failure rate
- dated normalized artifacts in `reports/model-routing-benchmarks.json`
- blocked model families recorded explicitly instead of hidden

That is the part that changed the routing story. Once I stopped trusting single-prompt success and forced the runtime to follow measured artifacts, the architecture became sharper.

## Practical Conclusion

The current RK3588 story is:

- the NPU is the fast path, not a decorative extra
- CPU GGUF is still critical, but for the right jobs
- `lfm25-1.2b-instruct-cpu` is the best current CPU planner/tool model
- `qwen35-4b-cpu` is the best broad CPU fallback, not the one-model answer to everything
- the architecture is now benchmark-shaped, not preference-shaped

That is the version I would defend now.
