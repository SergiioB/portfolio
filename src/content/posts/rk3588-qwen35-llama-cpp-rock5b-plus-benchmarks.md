---
title: "Qwen3.5 on RK3588 with llama.cpp: Real Benchmarks from a Radxa ROCK 5B+"
description: "An advanced benchmark report for running Qwen3.5 locally on RK3588 with source-built llama.cpp: prefill speed, decode speed, stable context, tool-calling behavior, and the practical model choices that actually work on a Radxa ROCK 5B+."
situation: "I was tuning a local-first Discord engineering agent on a Radxa ROCK 5B+ (RK3588, 24 GB RAM) and needed hard data for which Qwen3.5 models were actually practical on CPU inference with llama.cpp."
issue: "The usual local-AI advice overemphasizes parameter count and underexplains bandwidth, context budget, KV cache policy, and interactive latency. On RK3588, that leads to bad defaults: models that technically load but feel broken in real chat and tool-calling workloads."
solution: "I ran a corrected Qwen3.5 sweep on RK3588 using source-built llama.cpp, quantized KV cache, and task-pass validation. Then I compared prefill, decode, stable context, average latency, and tool-calling behavior to determine the right model for each workload."
usedIn: "Local-first Discord agent runtime on Radxa ROCK 5B+ / RK3588, built around raw llama.cpp rather than Ollama or LM Studio."
impact: "Showed that Qwen3.5-2B is the best overall default on RK3588, Qwen3.5-9B is the best practical quality tier, and Qwen3.5-27B is not viable interactively on this board. Also established a benchmark-backed way to talk about context fit and KV cache tradeoffs credibly."
pubDate: 2026-03-28
category: "local-ai"
tags:
  [
    "rk3588",
    "radxa",
    "rock-5b-plus",
    "llama.cpp",
    "qwen3.5",
    "benchmarks",
    "gguf",
    "kv-cache",
    "local-ai",
  ]
draft: false
slug: "rk3588-qwen35-llama-cpp-rock5b-plus-benchmarks"
---

## Situation

I wanted one clean answer to a very specific question:

> What is the best Qwen3.5 model stack for a Radxa ROCK 5B+ if you care about real interactive local inference, not just whether a model can technically load?

This was not a cloud benchmark and not a GPU benchmark. The target was a **Radxa ROCK 5B+** with **RK3588**, **24 GB RAM**, and a Discord-native engineering agent running locally.

The runtime path was also intentional:

- source-built `llama.cpp`
- CPU inference
- quantized KV cache
- explicit context sizing
- no Ollama
- no LM Studio

That matters because on a board like RK3588, control over KV cache type, context window, thread count, and startup behavior is the difference between a usable system and a frustrating one.

## Test Setup

The corrected Qwen3.5 sweep was run with these principles:

- **Board**: Radxa ROCK 5B+ / RK3588
- **Memory**: 24 GB RAM
- **Runtime**: `llama.cpp` built from source
- **Inference path**: CPU-only
- **KV cache**: `q4_0 / q4_0`
- **Thread sweeps**: mostly `2`, `4`, and `6`
- **Validation**: raw speed plus task-pass and tool-call behavior

The two benchmark layers I cared about were:

1. **Raw throughput**
   - prefill tokens/second
   - decode tokens/second
   - best thread count
   - stable context window

2. **Practical agent behavior**
   - tool-call success
   - average response latency
   - simple intelligence/task score

That second layer matters. A model can post a decent synthetic throughput number and still be the wrong model for an interactive Discord agent.

## How I Built llama.cpp on RK3588

For RK3588, I used the board-tuned source build rather than a generic package install:

```bash
git clone --recursive https://github.com/ggml-org/llama.cpp
cd llama.cpp

cmake -B build \
  -DCMAKE_BUILD_TYPE=Release \
  -DGGML_NATIVE=OFF \
  -DGGML_CPU_ARM_ARCH=armv8.2-a \
  -DGGML_INTERNAL_DOTPROD=ON \
  -DGGML_INTERNAL_FP16_VECTOR_ARITHMETIC=ON \
  -DGGML_OPENMP=ON \
  -DGGML_LLAMAFILE=OFF \
  -DCMAKE_C_FLAGS="-mcpu=cortex-a76+crc+crypto+dotprod" \
  -DCMAKE_CXX_FLAGS="-mcpu=cortex-a76+crc+crypto+dotprod"

cmake --build build --config Release -j8
```

That build matters because RK3588 is not a device where you want to leave ARM tuning to chance.

## The Benchmark Results

### Best measured configuration per model

| Model                 | Threads | Stable context | Prefill t/s | Decode t/s | Intelligence | Tool calling | Avg latency |
| --------------------- | ------: | -------------: | ----------: | ---------: | -----------: | ------------ | ----------: |
| Qwen3.5-0.8B Q4_K_M   |       4 |          16384 |     54.5799 |    12.0653 |          0.5 | yes          |     4851 ms |
| Qwen3.5-2B Q4_K_M     |       4 |          32768 |     32.4422 |     8.6784 |         0.75 | yes          |   6094.2 ms |
| Qwen3.5-4B Q4_K_M     |       4 |          16384 |     13.0137 |     3.6214 |         0.75 | yes          |  17354.6 ms |
| Qwen3.5-4B-UD Q4_K_XL |       4 |          16384 |     12.8833 |     3.5868 |         0.75 | yes          |  15355.2 ms |
| Qwen3.5-9B Q4_K_M     |       4 |           8192 |      7.6092 |     2.4810 |          1.0 | yes          |  18219.6 ms |
| Qwen3.5-9B-UD Q4_K_XL |       4 |           8192 |      7.4280 |     2.0694 |          1.0 | yes          |  19708.4 ms |
| Qwen3.5-27B Q4_K_M    |       2 |    4096 tested |      1.3652 |     0.6198 |            0 | no           | impractical |

## The Most Important Result: 2B Beat 4B

This was the real finding.

On this board, **Qwen3.5-2B Q4_K_M** beat **Qwen3.5-4B Q4_K_M** so clearly that keeping `4B` as the automatic default stopped making engineering sense.

### 2B vs 4B

| Metric         | 2B Q4_K_M |  4B Q4_K_M | 4B-UD Q4_K_XL |
| -------------- | --------: | ---------: | ------------: |
| Prefill t/s    |   32.4422 |    13.0137 |       12.8833 |
| Decode t/s     |    8.6784 |     3.6214 |        3.5868 |
| Stable context |     32768 |      16384 |         16384 |
| Intelligence   |      0.75 |       0.75 |          0.75 |
| Tool calling   |       yes |        yes |           yes |
| Avg latency    | 6094.2 ms | 17354.6 ms |    15355.2 ms |

The practical translation:

- `2B` was roughly **2.5x faster** than `4B` on prefill
- `2B` was roughly **2.4x faster** than `4B` on decode
- `2B` preserved the same measured tool-call success
- `2B` preserved the same measured task score in the corrected pass
- `2B` also held a larger stable context window

On a workstation, that might be a minor tuning preference. On RK3588, it changes the entire user experience.

## Which Model Is Best For What

### Qwen3.5-0.8B

This was the speed king.

- fastest prefill
- fastest decode
- fast enough to feel instant compared to the larger models

But it is still a small model. I would not use it as the main engineering model unless the priority is routing, ultra-fast ambient replies, or lightweight tool dispatch.

### Qwen3.5-2B

This was the best overall model on the board.

It is the one I would actually deploy as the default interactive model because it balanced:

- speed
- context fit
- tool calling
- acceptable reasoning quality

This is the model that makes RK3588 feel credible instead of “cute but compromised.”

### Qwen3.5-4B and 4B-UD

These were not bad. They were just not worth the latency penalty for the measured gain.

They can still make sense as manual quality overrides, but not as the default CPU routing target on this board.

### Qwen3.5-9B and 9B-UD

These were the best practical quality tier.

If I want stronger reasoning and I am willing to pay the latency cost, `9B` is the right answer. But it is clearly a slower “quality mode,” not the default chat profile.

### Qwen3.5-27B

This one is important to discuss honestly.

Yes, it loaded.

No, it was not interactively usable on RK3588 CPU inference.

That is exactly the kind of misleading half-truth that shows up in local-AI threads all the time. “It fits” is not the same as “it works well.”

## Context Windows: What Actually Held

Successful context windows in the saved sweep:

- `0.8B`: `4096`, `8192`, `16384`
- `2B`: `4096`, `8192`, `16384`, `32768`
- `4B`: `4096`, `8192`, `16384`
- `4B-UD`: `4096`, `8192`, `16384`
- `9B`: `4096`, `8192`
- `9B-UD`: `4096`, `8192`
- `27B`: `2048`, `4096` tested

This is another reason `2B` won. On RK3588, the bigger value was not just raw speed. It was **speed plus a materially better stable context budget**.

## Why Raw llama.cpp Matters On Boards Like This

I specifically did not want this hidden under another local serving layer.

Using raw `llama.cpp` directly gave me control over:

- context allocation
- KV cache quantization
- thread count
- flash attention
- port and startup behavior
- task-specific model routing

Representative launch pattern for the winning default:

```bash
taskset -c 0-7 ./build/bin/llama-server \
  -m Qwen3.5-2B-Q4_K_M.gguf \
  -c 32768 \
  -t 4 \
  -ngl 0 \
  -fa on \
  --cache-type-k q4_0 \
  --cache-type-v q4_0
```

On RK3588, this level of control is not “enthusiast tweaking.” It is how you get a system that feels deliberate.

## About TurboQuant and Hybrid Layer Quantization

There is a second, related story here around KV cache compression.

I also explored **TurboQuant-inspired hybrid per-layer KV cache quantization** for this project. But it is important to separate that work from the Qwen3.5 sweep above.

### What is measured in this post

The Qwen3.5 model sweep in this article was run with:

- `q4_0 / q4_0` KV cache

### What belongs to the separate TurboQuant experiment

The TurboQuant-inspired work is a different experiment and should be described separately:

- prototype TurboQuant-style results on synthetic KV data
- hybrid per-layer idea
- compression and MSE analysis

That distinction matters because it keeps the benchmark story honest.

The interesting practical result from the TurboQuant side was not “I replaced llama.cpp overnight with magic 3-bit KV cache.” It was more nuanced:

- standard `Q4_0` is already very strong in practice
- prototype `TurboQuant 4-bit` matched `Q4_0` MSE with better compression on synthetic KV data
- the production recommendation remained conservative: **keep standard `Q4_0` for now**

That is a more credible engineering story than forcing a hype narrative.

## The Real Takeaway

If I had to explain this benchmark campaign in one line, it would be:

> On RK3588, the winning model is not the largest model that fits. It is the model that preserves tool-calling and enough reasoning quality while staying inside a usable latency envelope.

For this board, that winner was **Qwen3.5-2B Q4_K_M**.

My practical model map after the sweep:

- **Fastest micro-model**: `Qwen3.5-0.8B`
- **Best overall default**: `Qwen3.5-2B`
- **Best quality tier**: `Qwen3.5-9B`
- **Not practical interactively**: `Qwen3.5-27B`

That is the version of local AI benchmarking I trust: measured, board-specific, and willing to say when a popular bigger model is simply the wrong choice.

<!-- portfolio:expanded-v2 -->

## Post-Specific Engineering Lens

For this post, the primary objective is: **Turn model selection on constrained hardware into a benchmark-backed engineering decision instead of a guess.**

### Implementation decisions for this case

- Used source-built `llama.cpp` to keep context and KV cache choices explicit
- Compared throughput and task behavior instead of throughput alone
- Treated stable context as a first-class metric, not an afterthought
- Kept the TurboQuant story separate from the Qwen3.5 runtime sweep to avoid overstating results

### Practical command path

```bash
# Build llama.cpp on RK3588
cmake -B build \
  -DCMAKE_BUILD_TYPE=Release \
  -DGGML_CPU_ARM_ARCH=armv8.2-a \
  -DGGML_INTERNAL_DOTPROD=ON \
  -DGGML_INTERNAL_FP16_VECTOR_ARITHMETIC=ON \
  -DGGML_OPENMP=ON

cmake --build build --config Release -j8

# Launch the best overall model
taskset -c 0-7 ./build/bin/llama-server \
  -m Qwen3.5-2B-Q4_K_M.gguf \
  -c 32768 -t 4 -ngl 0 -fa on \
  --cache-type-k q4_0 \
  --cache-type-v q4_0
```

## Validation Matrix

| Validation goal       | What to baseline                     | What confirms success                                                                |
| --------------------- | ------------------------------------ | ------------------------------------------------------------------------------------ |
| Interactive viability | average latency + decode speed       | responses stay in a usable latency range for real chat                               |
| Context fit           | highest successful context per model | model can hold the target context without failing or degrading into a broken default |
| Agent readiness       | tool-call success and task score     | model performs tool-backed tasks instead of just chatting about them                 |
| Runtime honesty       | model size vs observed usability     | larger models that load but fail interactively are not promoted as defaults          |

## Failure Modes and Mitigations

| Failure mode                       | Why it appears                                               | Mitigation                                                                |
| ---------------------------------- | ------------------------------------------------------------ | ------------------------------------------------------------------------- |
| Bigger-is-better bias              | model size gets mistaken for practical quality               | benchmark the actual board and rank by latency, tool use, and context fit |
| False-positive “it fits” decisions | weights fit in RAM but latency collapses                     | treat throughput and response time as the real gate                       |
| Context overclaiming               | theoretical window exceeds practical stable window           | record only successful tested contexts                                    |
| Quantization hype                  | prototype compression work gets mixed into production claims | separate runtime benchmarks from research experiments                     |

## Recruiter-Readable Impact Summary

- **Scope:** benchmark and tune local LLM inference on ARM64 edge hardware
- **Execution quality:** measured throughput, context stability, tool-calling behavior, and practical deployment tradeoffs
- **Outcome signal:** converted a vague “run Qwen locally on RK3588” idea into a concrete model strategy with reproducible evidence and deployable defaults
