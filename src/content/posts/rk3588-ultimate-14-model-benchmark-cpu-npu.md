---
title: "14 Models Benchmarked on RK3588: The Definitive CPU vs NPU Ranking"
description: "Benchmarked every viable local LLM (350M to 26B, CPU and NPU) through a live Discord agent pipeline on RK3588. Found NPU beats CPU at same quality, code is solved at any size, and 4B+ models are slower AND worse than 2B on this board."
situation: "Running a local-first Discord engineering agent on Radxa ROCK 5B+ (RK3588, 24 GB RAM) and needed hard numbers for model routing — not just synthetic throughput, but actual quality scores through the full Discord → Bot → Inference → Discord pipeline."
issue: "Previous benchmarks measured raw llama.cpp throughput but not real quality through the agent pipeline. Models that looked fast synthetically failed at reasoning, refused tool calls, or got intercepted by workspace routing before reaching the model."
solution: "Built a 14-test, 6-dimension benchmark harness that tests every model through the live Discord pipeline with quality validation: reasoning, factual accuracy, code generation, instruction following, tool calling, and math. Tested 14 models (9 CPU GGUF + 3 NPU RKLLM + 2 large MoE) with BENCHMARK_MODE to isolate pure model performance."
usedIn: "Production model routing for IntelliAuto Discord agent on Radxa ROCK 5B+ / RK3588 — replacing synthetic benchmark data with real pipeline measurements."
impact: "Discovered NPU models match CPU quality at 2× lower latency, all models from 350M to 26B generate correct code, Claude distillation breaks tool calling, and the best model for this board is Qwen2.5-3B on NPU (score 29.5, 11/14 quality, 45s response)."
pubDate: 2026-04-11
updatedDate: 2026-04-11
category: "local-ai"
tags:
  [
    "rk3588",
    "radxa",
    "rock-5b-plus",
    "llama.cpp",
    "rkllm",
    "npu",
    "benchmarks",
    "qwen",
    "gemma",
    "local-ai",
    "discord",
  ]
draft: false
slug: "rk3588-ultimate-14-model-benchmark-cpu-npu"
---

## Situation

I had one question:

> What is the actual best local LLM for RK3588 when you measure through the real agent pipeline, not just llama.cpp's API?

Previous benchmarks (including [my own Qwen3.5 sweep](/posts/rk3588-qwen35-llama-cpp-rock5b-plus-benchmarks)) measured synthetic throughput: prefill t/s, decode t/s, context stability. Those numbers are necessary but not sufficient. The real question is: **which model gives the best answers, fastest, through the full Discord chat pipeline?**

The target: a **Radxa ROCK 5B+** with **RK3588** (4× A55 @ 1.8 GHz + 4× A76 @ 2.3 GHz), **24 GB RAM**, **6 TOPS NPU**, running a local Discord engineering agent.

Two inference backends:

- **CPU**: GGUF models via `rk-llama.cpp` on A76 cores
- **NPU**: `.rkllm` models via Rockchip RKLLM SDK

One important finding upfront: **you cannot offload GGUF layers to the NPU**. The RKNPU backend in rk-llama.cpp crashes with `RESHAPE` operations on GGUF tensors. NPU only works with dedicated `.rkllm` models through the RKLLM SDK. These are completely separate pipelines.

## The Test Suite

I designed 14 tests across 6 dimensions, each with clear pass/fail criteria:

| Category        | Tests | What it measures                                  |
| --------------- | ----: | ------------------------------------------------- |
| **Reasoning**   |     3 | Bat-ball puzzle, syllogism validity, rate scaling |
| **Factual**     |     3 | Geography, programming history, chemistry         |
| **Code**        |     2 | Python list comprehension, palindrome function    |
| **Instruction** |     3 | CSV formatting, sentence counting, JSON output    |
| **Tool Call**   |     2 | web_search JSON, calculator JSON                  |
| **Math**        |     1 | Speed/distance calculation                        |

Tests are weighted — reasoning (3.0×) and tool calling (2.5×) matter more than math (1.0×) because they reflect real agent workloads.

**Critical pipeline fix**: I had to add `BENCHMARK_MODE=true` to disable workspace routing, web research interception, and auto-thread creation. Without it, prompts containing words like "write", "list", or "tool" were hijacked before reaching the model.

## The Complete Results

### Composite Ranking (quality × speed)

| #   | Model                  | Backend | Size | Quality            | Wall   | t/s  | Score    |
| --- | ---------------------- | ------- | ---- | ------------------ | ------ | ---- | -------- |
| 1   | **Qwen2.5-3B-NPU**     | npu     | 3.6G | 11/14 (w=22.0)     | 44.8s  | 1.5  | **29.5** |
| 2   | **Qwen3-1.7B-NPU**     | npu     | 2.2G | 11/14 (w=20.5)     | 42.3s  | 2.2  | **29.1** |
| 3   | LFM2.5-350M            | cpu     | 255M | 8/14 (w=13.5)      | 33.5s  | 15.6 | 24.2     |
| 4   | LFM2.5-1.2B-Instruct   | cpu     | 698M | 10/14 (w=18.0)     | 46.2s  | 9.6  | 23.4     |
| 5   | Qwen3.5-0.8B-Claude    | cpu     | 504M | 10/14 (w=18.5)     | 49.9s  | 6.6  | 22.2     |
| 6   | Qwen2.5-Coder-3B-NPU   | npu     | 3.9G | 9/14 (w=17.0)      | 52.4s  | 1.0  | 19.5     |
| 7   | Qwen3.5-2B             | cpu     | 1.2G | **12/14** (w=23.5) | 74.0s  | 5.8  | 19.1     |
| 8   | GLM-4.7-REAP-23B       | cpu     | 11G  | 10/14 (w=19.5)     | 62.1s  | 5.7  | 18.8     |
| 9   | Qwen3.5-2B-Claude-Opus | cpu     | 1.2G | 10/14 (w=18.5)     | 62.0s  | 4.7  | 17.9     |
| 10  | Qwen2.5-3B-Instruct    | cpu     | 2.0G | 11/14 (w=22.0)     | 87.0s  | 2.7  | 15.2     |
| 11  | LFM2.5-1.2B-Thinking   | cpu     | 698M | 8/14 (w=14.5)      | 64.1s  | 8.0  | 13.6     |
| 12  | Qwen3-4B               | cpu     | 2.3G | 10/14 (w=19.0)     | 101.4s | 2.0  | 11.2     |
| 13  | Qwen3.5-4B             | cpu     | 2.5G | 11/14 (w=20.5)     | 126.5s | —    | 9.7      |
| 14  | Gemma-4-26B-A4B        | cpu     | 12G  | **13/14** (w=25.0) | 179.2s | —    | 8.4      |

**Score formula**: `weighted_quality × max(0.1, 60 / avg_wall_seconds)` — balances quality against speed.

### Full Parameters

| Model                  | Backend | Size | RAM  | Load | Reasoning | Factual | Code | Instruction | Tool Call | Math |
| ---------------------- | ------- | ---- | ---- | ---- | --------- | ------- | ---- | ----------- | --------- | ---- |
| Qwen2.5-3B-NPU         | npu     | 3.6G | 265M | 8s   | 2/3       | **3/3** | 2/2  | 2/3         | 2/2       | 0/1  |
| Qwen3-1.7B-NPU         | npu     | 2.2G | 281M | 8s   | 2/3       | 2/3     | 2/2  | 2/3         | 2/2       | 1/1  |
| LFM2.5-350M            | cpu     | 255M | 276M | 8s   | 1/3       | 2/3     | 2/2  | 1/3         | 1/2       | 1/1  |
| LFM2.5-1.2B-Instruct   | cpu     | 698M | 290M | 8s   | 1/3       | 2/3     | 2/2  | 2/3         | 2/2       | 1/1  |
| Qwen3.5-0.8B-Claude    | cpu     | 504M | 280M | 8s   | 2/3       | 1/3     | 2/2  | 2/3         | 2/2       | 1/1  |
| Qwen2.5-Coder-3B-NPU   | npu     | 3.9G | 267M | 8s   | 0/3       | 2/3     | 2/2  | 2/3         | 2/2       | 1/1  |
| Qwen3.5-2B             | cpu     | 1.2G | 350M | 10s  | **3/3**   | 2/3     | 2/2  | 2/3         | 2/2       | 1/1  |
| GLM-4.7-REAP-23B       | cpu     | 11G  | 270M | 8s   | 2/3       | 1/3     | 2/2  | 2/3         | 2/2       | 1/1  |
| Qwen3.5-2B-Claude-Opus | cpu     | 1.2G | 340M | 8s   | **3/3**   | 2/3     | 2/2  | 2/3         | **0/2**   | 1/1  |
| Qwen2.5-3B-Instruct    | cpu     | 2.0G | 420M | 8s   | 2/3       | **3/3** | 2/2  | 2/3         | 2/2       | 0/1  |
| LFM2.5-1.2B-Thinking   | cpu     | 698M | 285M | 8s   | 1/3       | 1/3     | 2/2  | 1/3         | 2/2       | 1/1  |
| Qwen3-4B               | cpu     | 2.3G | 550M | 8s   | 2/3       | 2/3     | 2/2  | 2/3         | 2/2       | 0/1  |
| Qwen3.5-4B             | cpu     | 2.5G | 620M | 8s   | 2/3       | 2/3     | 2/2  | 2/3         | 2/2       | 1/1  |
| Gemma-4-26B-A4B        | cpu     | 12G  | 264M | 8s   | **3/3**   | **3/3** | 2/2  | 2/3         | 2/2       | 1/1  |

## Finding 1: NPU Beats CPU at the Same Quality

The most important result:

| Metric          | Qwen2.5-3B on NPU | Qwen2.5-3B on CPU |
| --------------- | ----------------- | ----------------- |
| Quality         | 11/14 (w=22.0)    | 11/14 (w=22.0)    |
| Wall time       | **44.8s**         | 87.0s             |
| Generation time | 20.5s             | 44.4s             |
| Reasoning       | 2/3               | 2/3               |
| Factual         | **3/3**           | **3/3**           |
| Tool Call       | 2/2               | 2/2               |
| Score           | **29.5**          | 15.2              |

**Identical quality. Half the latency.** The RKLLM W8A8 quantization does not degrade quality — it just runs faster on the dedicated NPU.

This means: if a model exists in both GGUF and RKLLM format, always prefer the NPU version.

## Finding 2: Code Generation Is Solved at Any Size

**Every single model — from 350M to 26B — passes both code tests.** Even the tiny LFM2.5-350M correctly generates:

```python
evens = [x for x in numbers if x % 2 == 0]
```

and:

```python
def is_palindrome(s: str) -> bool:
    return s == s[::-1]
```

For code tasks, use the fastest available model. Size does not matter.

## Finding 3: The Bat-Ball Puzzle Remains the Hardest Test

Only 5 of 14 models correctly answer "the ball costs $0.05":

- ✅ Qwen3.5-2B, Qwen3.5-2B-Claude-Opus, Gemma-4-26B, Qwen2.5-3B-NPU, GLM-4.7-REAP-23B
- ❌ All 350M-1.2B models (answer $0.90 — intuitive but wrong)
- ❌ Qwen3-4B, Qwen3.5-4B (surprising failures for 4B models)

The 350M-1.2B models consistently fail with the intuitive answer ($0.90). Only at 1.7B+ do models start getting it right, and only at 2B+ is it reliable.

## Finding 4: Claude Distillation Broke Tool Calling

Qwen3.5-2B-Claude-Opus-Distilled is the **only model that refuses tool calls**:

```
"I cannot execute any tool to call web_search. I only provide information."
"I cannot execute any tool to call calculator. I only provide information."
```

This model gets **3/3 reasoning** (best in class!) but **0/2 tool calling**. The Claude distillation process trained out the tool-calling capability. It's actively harmful for agentic workflows.

## Finding 5: 4B+ Models Are Not Worth It

The most surprising result — **4B models are slower AND worse than 2B**:

| Model      | Quality   | Wall time | Reasoning |
| ---------- | --------- | --------- | --------- |
| Qwen3.5-2B | **12/14** | **74s**   | **3/3**   |
| Qwen3-4B   | 10/14     | 101s      | 2/3       |
| Qwen3.5-4B | 11/14     | 127s      | 2/3       |

On RK3588, extra parameters beyond 2B don't help — they just add latency without improving quality. The board's memory bandwidth becomes the bottleneck.

## Finding 6: Gemma-4-26B-A4B Gets Best Quality at 3× Latency

Gemma-4-26B-A4B achieved **13/14** — the highest quality of any model — but at 179s average response time. It's a MoE model with ~4B active parameters out of 26B total, so it fits in RAM, but the active computation is still heavy.

One pipeline issue: every response leaks `<|channel>thought` markers that need stripping.

## Finding 7: Instruction Following Is the Hardest Category

**Zero models achieved 3/3 on instruction following.** The `role_json` test (output raw JSON with no markdown) timed out for ALL 14 models at 300 seconds. This is a pipeline bug, not a model limitation — the Discord agent gets stuck when models try to generate JSON.

## Recommended Model Routing

Based on these results, here's the production routing table:

| Use Case          | Primary           | Backup                 | Why                          |
| ----------------- | ----------------- | ---------------------- | ---------------------------- |
| **Fast chat**     | Qwen3-1.7B-NPU    | LFM2.5-1.2B-Instruct   | 11/14 at 42s, NPU speed      |
| **Reasoning**     | Qwen3.5-2B        | Qwen3.5-2B-Claude-Opus | Only 3/3 reasoning under 90s |
| **Code**          | Fastest available | Any model              | ALL pass code tests          |
| **Tool calling**  | Qwen3-1.7B-NPU    | Qwen2.5-3B-NPU         | 2/2 tools at 42-45s          |
| **Factual**       | Qwen2.5-3B-NPU    | Qwen2.5-3B-Instruct    | 3/3 factual accuracy         |
| **Deep analysis** | Gemma-4-26B-A4B   | Qwen3.5-2B             | 13/14 quality, 179s          |

**Do not use:**

- Qwen3.5-2B-Claude-Opus — refuses tool calls
- LFM2.5-1.2B-Thinking — thinking mode loops, worse than Instruct variant
- Qwen3-4B / Qwen3.5-4B — slower than 2B with no quality gain

## Pipeline Bugs Found

The benchmark itself revealed several bot pipeline issues:

1. **Workspace routing hijacks prompts** — words "write", "list", "show" trigger file routing before the model sees the prompt. Fixed with `BENCHMARK_MODE` kill-switch.

2. **NPU bridge missing execute permission** — the Rust binary was built without `+x`, causing all NPU inference to silently fail. Fixed with `chmod +x`.

3. **NPU context overflow** — model registry had `contextLength: 8192` but RKLLM models max out at 4096. The orchestrator passed 8192 directly to RKLLM init, which crashed. Fixed in registry.

4. **Gemma marker leak** — `<|channel>thought` markers appear in every Gemma response. Bot's sanitizer only strips `<think/>` tags, not Gemma's proprietary format.

## Hardware Context

```
RK3588 — 4×A55 @1.8GHz (cores 0-3) + 4×A76 @2.3GHz (cores 4-7)
RAM: 23.2 GB usable
NPU: 6 TOPS @ 1GHz
CMA: 2GB (1.96GB free)

CPU inference: rk-llama.cpp, A76 cores, flash attention ON, q8_0 KV cache
NPU inference: RKLLM SDK via Rust bridge, W8A8 quantization
```

## The Real Takeaway

> On RK3588, the best model is not the biggest model that fits. It's the model that preserves quality while staying inside a usable latency envelope — and NPU versions of the same model run at 2× the speed with zero quality loss.

The previous benchmark conclusion ("Qwen3.5-2B is the best CPU default") was correct for CPU-only. But the full pipeline benchmark reveals that **NPU models with identical quality at half the latency** should be the new default.

If I had to pick one model for everything on this board: **Qwen3-1.7B on NPU**. 42 seconds average, 11/14 quality, 2/2 tool calling, 2/2 code — and it leaves the CPU free for other work.

## Recruiter-Readable Impact

- **Scope**: benchmarked 14 local LLM models (350M–26B parameters) across CPU and NPU inference on ARM64 edge hardware
- **Execution**: built a 14-test automated harness testing 6 quality dimensions through a live Discord agent pipeline, discovering pipeline bugs that invalidated previous synthetic benchmarks
- **Outcome**: replaced synthetic throughput data with real quality measurements, identified NPU as the primary inference backend (2× faster at same quality), and established production model routing based on reproducible evidence
