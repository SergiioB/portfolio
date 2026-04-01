---
title: "RK3588 NPU Router Architecture: What Actually Runs, What Wins, and Why"
description: "A benchmark-backed deep dive into the real RK3588 inference stack: llama.cpp CPU winners, NPU roles, KV cache choices, quantization tradeoffs, and how to think about 27B with GPU+CPU offload."
situation: "A local-first Discord AI runtime needed verified, practical inference on RK3588 rather than aspirational model support. The job was to identify what really works interactively, what should be reserved for batch use, and how to explain the system honestly."
usedIn: "Engram AI, a local collaborative engineering runtime designed for private on-device development workflows."
impact: "Established Qwen3.5-4B-Q4_K_M as the practical interactive default, Qwen3.5-9B-Q4_K_M as the quality step-up, proved 27B is not practical on RK3588 CPU, and documented exact commands and deployment tradeoffs for real operators."
pubDate: 2026-03-22
category: "local-ai"
tags: ["rk3588", "npu", "llama.cpp", "rkllm", "gguf", "benchmarks", "local-ai"]
draft: false
---

## Situation

The original question was not "can RK3588 run LLMs?" It was:

> What is the fastest, most honest, operationally useful inference stack on RK3588 for a local engineering assistant?

That forced a stricter standard than hobby demos. I only kept results that were measurable and repeatable.

The main conclusion changed the product direction:

- `llama.cpp` is the real primary path for text inference
- RKLLM/NPU is valuable, but mostly for smaller fast models
- Ollama was installed, but the tested 27B path was not practical on this board

So this is no longer a "many runtimes are equal" story. It is a benchmark-backed architecture decision.

## Architecture Overview

### The Actual Inference Tiering Problem

On RK3588, model size and runtime role diverge quickly:

- small NPU models are good for routing and low-latency background work
- mid-size CPU GGUF models are the best practical path for useful chat/coding
- very large models may technically run but stop being operationally sensible

The architecture that survived benchmarking is:

1. **Route and background work:** RKLLM / NPU when model size fits the validated path
2. **Interactive main inference:** `llama.cpp`
3. **Quality step-up:** larger CPU GGUF only when the latency budget allows it
4. **Batch / overnight only:** very large models like 27B

![RK3588 Inference Stack](/images/diagrams/rk3588-inference-stack.svg)

### NPU CMA Memory Constraints

The Rockchip NPU uses CMA-backed memory and is useful, but it is not a magic replacement for the CPU path. In practice:

- `qwen3-1.7b-w8a8` was the best speed-oriented NPU result
- `qwen2.5-3b-w8a8-g256` was the best quality/speed NPU result
- there was no validated local NPU path here that displaced the winning Qwen 3.5 `4B` / `9B` llama.cpp CPU setups

![RK3588 NPU Memory Map](/images/diagrams/rk3588-npu-memory-map.svg)

## How We Actually Run Inference

### Winning RK3588 CPU command

This was the most useful real-world CPU server setup:

```bash
taskset -c 0-7 /home/radxa/projects/intelliauto-discord-bot/third_party/llama.cpp/build-rk-opt/bin/llama-server \
  -m /home/radxa/projects/intelliauto-discord-bot/models/cpu_gguf/Qwen3.5-4B-Q4_K_M.gguf \
  --host 127.0.0.1 --port 8081 \
  -c 2048 -t 6 --parallel 1 --jinja \
  --reasoning-budget 0 \
  -ctk f16 -ctv f16 -fa on --no-webui
```

For the 9B path, the same winning configuration applied:

```bash
taskset -c 0-7 /home/radxa/projects/intelliauto-discord-bot/third_party/llama.cpp/build-rk-opt/bin/llama-server \
  -m /home/radxa/projects/intelliauto-discord-bot/models/cpu_gguf/Qwen3.5-9B-Q4_K_M.gguf \
  --host 127.0.0.1 --port 8081 \
  -c 2048 -t 6 --parallel 1 --jinja \
  --reasoning-budget 0 \
  -ctk f16 -ctv f16 -fa on --no-webui
```

### Winning raw benchmark command

```bash
taskset -c 0-7 /home/radxa/projects/intelliauto-discord-bot/third_party/llama.cpp/build-rk-opt/bin/llama-bench \
  -m /home/radxa/projects/intelliauto-discord-bot/models/cpu_gguf/Qwen3.5-9B-Q4_K_M.gguf \
  -ngl 0 -t 6 -p 256 -n 16 -r 1 \
  -b 2048 -ub 512 -ctk f16 -ctv f16 -fa 1 -mmp 1 --no-warmup -o json
```

### Actual runtime launcher

The project runtime itself is launched through `scripts/run_engram.sh`, which:

- starts the hardware daemon if needed
- sets node memory flags
- runs either `src` or `dist` mode
- avoids duplicate runtime start via a lock file

That means the actual application runtime is not just "start llama.cpp." It is:

1. boot supporting hardware/runtime services
2. start the Engram node runtime
3. let Engram route requests to the preferred local inference path

## Benchmark Results That Actually Matter

### Whole-library CPU pass

| Model                   | Prompt t/s | Decode t/s | Peak RSS MB | Practicality         |
| ----------------------- | ---------: | ---------: | ----------: | -------------------- |
| Qwen3.5-0.8B-Q4_K_M     |      25.11 |       8.07 |      1120.6 | Excellent raw speed  |
| Qwen3.5-2B-Q4_K_M       |      16.18 |       5.54 |      2548.6 | Strong fast fallback |
| Qwen3.5-4B-Q4_K_M       |       9.73 |       2.48 |      5382.2 | Best balance         |
| Qwen3.5-9B-Q4_K_M       |       6.48 |       1.62 |     10222.3 | Slow but practical   |
| Qwen_Qwen3.5-27B-Q4_K_M |       1.91 |       0.54 |     20808.7 | Not practical        |

### CPU tuning sweep winners

For both `4B` and `9B`, the best configuration was:

- `6` threads
- CPU affinity `0-7`
- flash attention enabled

For 4B (`256 prompt / 16 gen`):

| Threads | Affinity | Flash Attn | Prompt t/s | Decode t/s | Wall s |
| ------: | -------- | ---------- | ---------: | ---------: | -----: |
|       6 | 0-7      | on         |       6.83 |       2.12 |   54.9 |

For 9B (`256 prompt / 16 gen`):

| Threads | Affinity | Flash Attn | Prompt t/s | Decode t/s | Wall s |
| ------: | -------- | ---------- | ---------: | ---------: | -----: |
|       6 | 0-7      | on         |       4.20 |       1.42 |   92.3 |

### NPU results

| Model                 |  Ctx | TTFT ms | Stream t/s | Notes                          |
| --------------------- | ---: | ------: | ---------: | ------------------------------ |
| qwen3-1.7b-w8a8       |  512 |  294.43 |       8.95 | Best NPU speed                 |
| qwen3-1.7b-w8a8       | 2048 |  363.07 |       8.32 | Stable                         |
| qwen3-1.7b-w8a8       | 4096 | 1146.40 |       7.65 | Stable to 4K                   |
| qwen2.5-3b-w8a8-g256  | 2048 |  900.40 |       5.91 | Best quality/speed NPU balance |
| qwen2.5-coder-3b-w8a8 | 2048 | 1181.98 |       4.42 | Slower coding specialist       |

### Practical conclusion

- `Qwen3.5-4B-Q4_K_M` is the best interactive default
- `Qwen3.5-9B-Q4_K_M` is the quality step-up when latency is acceptable
- `27B` on RK3588 CPU is technically possible but operationally poor
- NPU is best used for smaller fast models, not as the replacement for the winning 4B/9B llama.cpp path
- `Q4`-class weights are the practical middle ground here: they cut memory sharply while usually preserving enough quality to stay useful, which matters more than chasing a heavier quant that pushes the system into a slower memory tier

In this benchmark set, `Q4_K_M` was the right middle ground: memory use stayed practical while quality remained good enough that moving to heavier variants did not justify the cost for this hardware class.

## KV Cache, Context, and Quantization

### Why KV cache matters

Model quantization is only half the memory story. Long-context inference also pays for KV cache growth. On constrained hardware, KV cache decisions directly affect:

- memory headroom
- concurrency
- maximum practical context
- whether a larger model remains usable

### The practical knobs in llama.cpp

These are the relevant server flags:

```bash
-ctk f16
-ctv f16
```

or more aggressively:

```bash
-ctk q8_0
-ctv q8_0
```

or:

```bash
-ctk q4_0
-ctv q4_0
```

### Practical guidance

- `f16` KV cache is the safest baseline for response quality and predictability
- `q8_0` KV cache is a reasonable middle ground
- `q4_0` KV cache is the aggressive option when context length or memory pressure matters more than preserving every bit of headroom for quality

TurboQuant-style research reinforces this direction conceptually, but the actual usable implementation path in this stack remains standard llama.cpp KV cache controls.

## RAM and model sizing on RK3588

Measured peak RSS on this host:

| Model                   | Peak RSS MB | Recommendation             |
| ----------------------- | ----------: | -------------------------- |
| Qwen3.5-0.8B-Q4_K_M     |      1120.6 | Easy fit                   |
| Qwen3.5-2B-Q4_K_M       |      2548.6 | Comfortable                |
| Qwen3.5-4B-Q4_K_M       |      5382.2 | Best default               |
| Qwen3.5-9B-Q4_K_M       |     10222.3 | Usable but deliberate      |
| Qwen_Qwen3.5-27B-Q4_K_M |     20808.7 | Barely fits, not practical |

### A practical math check

To understand why `4B Q4_K_M` takes ~5.3 GB on this device:

```text
Weights: (4B params * 4.5 bits) / 8 ≈ 2.25 GB
KV Cache: ~1-2 GB (varies by precision and context size)
Runtime overhead: ~1 GB (llama.cpp buffers, allocator margins)
```

By the time you add all components up, a model that theoretically takes "2.25 GB" actually reserves over 5 GB of system RAM under load.

On a `24 GB` RK3588 system:

- `4B Q4_K_M` is comfortable
- `9B Q4_K_M` is viable but meaningfully slower
- `27B Q4_K_M` is not a sane interactive default even if it technically runs

## What about 27B on an RTX 3060 with CPU offload?

This is where many local-AI setups get misleading.

An RTX 3060 with `12 GB` VRAM can run a quantized `27B` model only by spilling a meaningful portion of the model into system RAM. That means:

- it can be made to load
- it can be useful for batch or low-concurrency work
- it will take a major throughput hit versus fitting fully in VRAM

### Example shape

For a `Q4_K_M` 27B-class model, a reasonable hybrid setup is:

- GPU offload as many layers as fit in `12 GB`
- remaining layers stay in system RAM
- keep concurrency low
- keep expectations realistic

Representative llama.cpp style command:

```bash
./llama-server \
  -m /models/Qwen3.5-27B-Q4_K_M.gguf \
  --host 127.0.0.1 --port 8080 \
  -c 4096 -t 8 --parallel 1 --jinja \
  -ngl 28 \
  -ctk q8_0 -ctv q8_0 \
  -fa on
```

The exact `-ngl` depends on the quant, build, KV cache choice, and what else occupies VRAM.

For a full workstation-focused explanation of compiled CUDA builds, Windows/WSL setup, and hybrid offload tradeoffs, see the companion post:

- `/posts/gpu-vram-cpu-offload-llama-cpp-deep-dive/`

### The tradeoff

When a 27B model is only partially on GPU and the rest lives in RAM:

- prompt processing slows down sharply
- decode speed drops materially
- TTFT rises
- throughput can fall by several times compared with a model that fits mostly or fully in VRAM

So the honest advice is:

- if you want strong interactive performance on a 3060, prefer a smaller model that fits better
- use 27B hybrid offload only when quality matters more than speed
- expect a noticeable tokens/s penalty once RAM traffic becomes part of the hot path

## The product direction this supports

After testing, the architecture story is clearer:

- the product should be `llama.cpp`-first
- hardware-specific control is valuable, but optional
- NPU remains a useful accelerator for small fast models
- remote runtimes should not be the default story when the verified local path is stronger

## Takeaway

The RK3588 lesson is not "edge hardware can run huge models." The real lesson is more useful:

> benchmarked `4B` and `9B` llama.cpp CPU paths beat aspirational multi-runtime complexity.

For this hardware and this product:

- `4B Q4_K_M` is the practical interactive default
- `9B Q4_K_M` is the step-up
- NPU helps most for smaller fast models
- `27B` belongs to batch workflows or stronger GPU systems, not to the default RK3588 chat path

<!-- portfolio:expanded-v2 -->

## RK3588 Inference Architecture Diagram

![RK3588 NPU Router Architecture](/images/diagrams/rk3588-npu-router-architecture.svg)

This diagram is still useful as a topology view, but the benchmark-backed interpretation is now sharper:

- NPU is best for smaller low-latency work
- llama.cpp CPU is the main path for useful 4B/9B text inference
- the winning outcome is not "all runtimes at once"
- the winning outcome is a simpler, benchmark-driven local routing model

## Validation Matrix

| Validation goal      | What to baseline                       | What confirms success                                     |
| -------------------- | -------------------------------------- | --------------------------------------------------------- |
| Interactive quality  | short coding or chat task              | `4B` stays responsive enough to use                       |
| Quality step-up path | same task on `9B`                      | quality improves enough to justify latency                |
| Practicality ceiling | larger `27B` run                       | confirms "possible" is not equal to "usable"              |
| NPU usefulness       | low-latency routing/background prompts | TTFT and stream t/s beat comparable CPU-small-model paths |

## Failure Modes and Mitigations

| Failure mode                   | Why it appears here                | Mitigation                                   |
| ------------------------------ | ---------------------------------- | -------------------------------------------- |
| Choosing by model size only    | larger model looks better on paper | route by measured latency and practicality   |
| Overcommitting context         | KV cache pressure grows silently   | reduce ctx or quantize KV cache              |
| Treating Ollama as equivalent  | installed runtime seems convenient | prefer the verified llama.cpp path           |
| Assuming NPU replaces CPU path | small NPU models look fast         | use NPU selectively, not as a blanket answer |

## Recruiter-Readable Impact Summary

- **Scope:** turned a multi-runtime local AI prototype into a benchmark-backed inference strategy.
- **Execution quality:** grounded product decisions in measured throughput, TTFT, and memory use.
- **Outcome signal:** identified the exact practical default (`4B`), quality step-up (`9B`), and non-default large-model path (`27B`).
