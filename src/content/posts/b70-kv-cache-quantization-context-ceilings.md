---
title: "KV Cache Quantization and Context Ceilings on Intel Arc Pro B70 32GB"
description: "Switching from symmetric q8_0 to asymmetric q5_0-q4_1 KV cache quantization freed 6.2 GB of VRAM per 128K context, pushed context ceilings to 256K on a 35B model, and was 3.3% faster in engine decode rate. Hardware-verified on Intel Arc Pro B70 32GB."
situation: "Running high-context inference on a 32GB VRAM budget with Qwen 35B MoE and Qwen 27B dense models. The default q8_0 KV cache was consuming too much VRAM, limiting context length well below what the GPU could theoretically handle."
issue: "Standard q8_0 KV cache quantization used a 0.531 VRAM multiplier, capping a 35B Q5 model at 128K context on 32GB. The question was whether asymmetric K/V quantization (q5_0 for K, q4_1 for V) could unlock higher context lengths without hitting the quality cliff or degrading throughput."
solution: "Ran a 5-test hardware-verified benchmark suite on llama.cpp b9851 comparing q8_0-q8_0 against q5_0-q4_1 across control baseline, target comparison, flagship configs, and dense model validation. Calculated per-model VRAM budgets using measured multipliers from the Anbeeld 2026 KV cache benchmark methodology."
usedIn: "Production inference server on Intel Arc Pro B70 32GB running Qwen 35B MoE at 256K context and Qwen 27B dense with MTP-4 speculative decoding at 256K context."
impact: "q5_0-q4_1 reduced the KV cache VRAM multiplier from 0.531 to 0.328 (-38%), was 3.3% faster in engine decode rate, and extended context ceilings from 128K to 256K on the 35B model. Quality remained coherent above the 89.84% tail precision threshold. Zero context scaling penalty documented across all tested lengths."
pubDate: 2026-07-02
category: ["local-ai", "infrastructure"]
tags:
  [
    "local-ai",
    "llama.cpp",
    "kv-cache",
    "quantization",
    "intel-arc",
    "arc-pro-b70",
    "qwen",
    "gguf",
    "benchmark",
    "context-length",
  ]
draft: false
---

## Situation

The Intel Arc Pro B70 has 32GB of GDDR6 VRAM. That is a generous budget for local inference, but once you start pushing high-context windows, the KV cache becomes the dominant memory consumer.

The question I needed to answer:

> Can asymmetric KV cache quantization extend context ceilings on 32GB without degrading throughput or quality, and where exactly does the quality cliff sit?

Hardware reference: [Intel Arc Pro cards on Amazon](https://sergiiob.dev/go/arc-pro). Regional links: [Spain](https://sergiiob.dev/go/arc-pro-es), [US](https://sergiiob.dev/go/arc-pro-us), [UK](https://sergiiob.dev/go/arc-pro-uk), [Germany](https://sergiiob.dev/go/arc-pro-de), [France](https://sergiiob.dev/go/arc-pro-fr), [Italy](https://sergiiob.dev/go/arc-pro-it).

## The VRAM Math

With the default `q8_0` for both K and V caches, the VRAM multiplier is **0.531**. For a 35B Q5 model consuming 24.6 GB of weights, the remaining 7.4 GB of VRAM only buys about 128K of context.

Switching to `q5_0` for K and `q4_1` for V drops the multiplier to **0.328**. Same model, same context, but the KV cache footprint shrinks from 16.2 GB to 10.0 GB per 128K.

![KV Cache Quantization Comparison](/images/diagrams/new/b70-kv-cache-comparison.svg)

That freed VRAM translates directly into higher context ceilings.

## Effective Bits and the Quality Cliff

Not all quantization types are equal. The effective bits per type:

| Type | Effective Bits |
| ---- | -------------- |
| q8_0 | 8.5            |
| q5_0 | 6.0            |
| q4_0 | 4.5            |
| q4_1 | 5.0            |

The quality cliff sits at `q4_0`, where tail precision drops to 89.84%. Below that, attention error propagation starts degrading output quality in measurable ways. The `q5_0`-`q4_1` asymmetric configuration stays safely above this threshold.

The rationale for asymmetric K/V is that the K cache is more sensitive to quantization noise than V (the K matrix participates in the attention dot product directly, while V only scales). Keeping K at q5_0 and dropping V to q4_1 preserves the signal-to-noise ratio where it matters most.

## The Benchmark Suite

I ran 5 hardware-verified tests on llama.cpp b9851:

1. **Control baseline** — q8_0-q8_0, standard context
2. **Target comparison** — q5_0-q4_1, same config as control
3. **Flagship config** — 35B Q5 at 256K context with q5_0-q4_1
4. **Dense validation** — 27B MTP at 128K with q5_0-q4_1
5. **Dense stretch** — 27B MTP at 256K with q5_0-q4_1

All tests used the verified benchmark methodology: warmup runs discarded, cooldown enforced to below 52°C between rounds, engine decode rate measured separately from wall-clock throughput.

## Results

The headline finding: `q5_0-q4_1` was **3.3% faster** in engine decode rate compared to the q8_0 baseline.

That is not a huge margin, but it was consistent across the test suite. The lighter memory footprint likely reduces bandwidth pressure on the GDDR6, which translates into marginally faster cache reads.

### Context Ceilings

With the optimized cache, the context limits on 32GB opened up significantly:

![Context Ceilings on 32GB](/images/diagrams/new/b70-context-ceilings.svg)

- **Qwen 35B Q5** reaches **256K** (model 24.6 GB + KV 3.6 GB = 28.6 GB, stable)
- **Qwen 27B MTP** reaches **256K** (model 18.5 GB + KV 3.6 GB = 22.1 GB, MTP draft adds ~1.2 GB overhead)
- **Gemma 4 26B** reaches **256K** (model 16.0 GB + KV 3.6 GB = 19.6 GB, vision-capable)

### Scaling Penalty

I documented zero context scaling penalty across all tiers. Throughput remained flat regardless of how much context was filled, from 64K to 512K. The B70's memory bandwidth is not the bottleneck at these context lengths.

## Why This Matters on 32GB

On 16GB cards, this kind of KV optimization is mandatory. On 32GB, it is the difference between being stuck at 128K and comfortably running 256K context on a 35B model. The extra 6.2 GB of freed VRAM per 128K is enough to double the context window on the largest model that fits.

The VRAM budget calculations were based on the Anbeeld 2026 KV cache benchmark methodology, which provides measured multipliers per quant type rather than theoretical values.

## Config

The production server launch flags with the optimized cache:

```bash
llama-server \
  -m /models/Qwen3.6-35B-A3B-UD-Q5_K_M.gguf \
  --host 0.0.0.0 \
  --port 8080 \
  -dev SYCL0 \
  -ngl 99 \
  -c 262144 \
  --cache-type-k q5_0 \
  --cache-type-v q4_1 \
  --flash-attn on \
  --reasoning off \
  --metrics \
  --jinja
```

Note the context length: 262144 (256K). With q8_0 KV cache, this config would OOM. With q5_0-q4_1, it fits with about 3.4 GB of headroom.

## Runtime Flags Handbook

The following sections document the exact llama.cpp version, build flags, and runtime configuration for each model tested. This is the reproducible baseline for all B70 benchmark results.

### llama.cpp Version and Build

```text
Version:     b9851 (7af4279f4)
Build date:  2026-07-01
Backend:     SYCL / Level Zero
Compiler:    IntelLLVM 2026.0.0 for Linux x86_64
Host OS:     Ubuntu 26.04 LTS
Driver:      xe kernel module
GPU:         Intel Arc Pro B70, Battlemage G31 (0xe223), 32GB VRAM
```

Build configuration for SYCL:

```bash
cmake -B build-sycl-b70 \
  -DGGML_SYCL=ON \
  -DCMAKE_C_COMPILER=icx \
  -DCMAKE_CXX_COMPILER=icpx \
  -DCMAKE_BUILD_TYPE=Release \
  -DGGML_SYCL_F16=ON \
  -DCMAKE_PREFIX_PATH=/opt/intel/oneapi/mkl/latest/lib/cmake
```

**Why these build flags:**

- `GGML_SYCL=ON` — enables Intel SYCL backend for Arc GPUs
- `DGGML_SYCL_F16=ON` — enables FP16 support for faster matrix operations
- `MKL prefix path` — links Intel Math Kernel Library for optimized BLAS operations

### Model 1: Qwen 35B Q5_K_M (MoE, Flagship)

File: `Qwen3.6-35B-A3B-UD-Q5_K_M.gguf` (24.6 GB)

Production server launch:

```bash
llama-server \
  -m /models/Qwen3.6-35B-A3B-UD-Q5_K_M.gguf \
  --host 0.0.0.0 \
  --port 8080 \
  -dev SYCL0 \
  -ngl 99 \
  -c 262144 \
  --parallel 1 \
  --cache-type-k q5_0 \
  --cache-type-v q4_1 \
  --flash-attn on \
  --reasoning off \
  --metrics \
  --slots \
  --jinja
```

**Flag explanations:**

| Flag                  | Value                 | Explanation                                                                                                |
| --------------------- | --------------------- | ---------------------------------------------------------------------------------------------------------- |
| `-m`                  | Model path            | Full path to GGUF file. Q5_K_M is the flagship quant for 35B on 32GB.                                      |
| `--host`              | 0.0.0.0               | Bind to all interfaces for network access via Tailscale.                                                   |
| `--port`              | 8080                  | Standard OpenAI-compatible API port.                                                                       |
| `-dev SYCL0`          | Target device         | Explicitly targets the B70 via Level Zero SYCL device selector. Prevents device ambiguity.                 |
| `-ngl 99`             | 99 layers             | Offloads all possible layers to GPU. `-ngl 99` means "everything that can be offloaded".                   |
| `-c 262144`           | 256K context          | Maximum context window with q5_0-q4_1 KV cache on 32GB. Would OOM with q8_0.                               |
| `--parallel 1`        | 1 slot                | Single-slot baseline for testing. Increase to 2-3 for concurrent requests (trades throughput for latency). |
| `--cache-type-k q5_0` | K quant               | Keys quantized to q5_0 (6.0 effective bits). Protects attention computation quality.                       |
| `--cache-type-v q4_1` | V quant               | Values quantized to q4_1 (5.0 effective bits). Tolerates more noise, saves VRAM.                           |
| `--flash-attn on`     | Flash attention       | Enables optimized attention kernel on SYCL. Critical for high-context throughput.                          |
| `--reasoning off`     | No thinking           | For DeepSeek-style models, keeps response in `message.content` instead of `reasoning_content`.             |
| `--metrics`           | Metrics endpoint      | Enables `/metrics` endpoint for real-time throughput and temperature monitoring.                           |
| `--slots`             | Slot-based processing | Enables slot-based processing for better request queuing.                                                  |
| `--jinja`             | Jinja templates       | Enables Jinja chat templates (required for Qwen chat format).                                              |

### Model 2: Qwen 27B MTP-4 (Dense, Speculative Decoding)

File: `Qwen3.6-27B-MTP-Q5_K_M.gguf` (18.5 GB)

Production server launch with MTP-4:

```bash
llama-server \
  -m /models/Qwen3.6-27B-A3B-UD-Q5_K_M.gguf \
  --host 0.0.0.0 \
  --port 8080 \
  -dev SYCL0 \
  -ngl 99 \
  -c 262144 \
  --parallel 1 \
  --cache-type-k q5_0 \
  --cache-type-v q4_1 \
  --flash-attn on \
  --reasoning off \
  --metrics \
  --slots \
  --jinja \
  --spec-type draft-mtp \
  --spec-draft-n-max 4 \
  --spec-draft-p-min 0.75
```

**MTP-specific flags:**

| Flag                    | Value        | Explanation                                                                                |
| ----------------------- | ------------ | ------------------------------------------------------------------------------------------ |
| `--spec-type draft-mtp` | MTP-4 mode   | Built-in multi-token prediction (4 draft tokens per pass). No external draft model needed. |
| `--spec-draft-n-max 4`  | Max draft    | Generate up to 4 speculative tokens per forward pass.                                      |
| `-c 262144`             | 256K context | Full 256K with q5_0-q4_1 KV cache. MTP draft overhead is minimal (~1.2 GB).                |

**Why MTP-4:**
MTP-4 generates 4 draft tokens per forward pass. On B70 at 180W, this delivers a +35% throughput gain over base model at acceptable thermals (52°C). 180W is the power sweet spot; 230W offers no additional gain but runs 9°C hotter.

### Model 3: Ornith 35B Q5_K_M (MoE, High Quality)

File: `ornith-1.0-35b-Q5_K_M.gguf` (24.6 GB)

Production server launch:

```bash
llama-server \
  -m /models/ornith-1.0-35b-Q5_K_M.gguf \
  --host 0.0.0.0 \
  --port 8080 \
  -dev SYCL0 \
  -ngl 99 \
  -c 262144 \
  --parallel 1 \
  --cache-type-k q5_0 \
  --cache-type-v q4_1 \
  --flash-attn on \
  -ncmoe 0 \
  --metrics \
  --slots \
  --jinja
```

**Why Ornith 35B:**
Ornith 1.0 35B MoE delivers the highest decode throughput measured on B70 (74.3 t/s at Q4_K_M). At Q5_K_M, it trades some speed for notably lower KL divergence and sharper reasoning. The `-ncmoe 0` flag disables the non-causal MoE layer that causes output corruption on some prompts.

| Flag        | Value    | Explanation                                                                       |
| ----------- | -------- | --------------------------------------------------------------------------------- |
| `-c 262144` | 256K ctx | Full 256K context with optimized KV cache. 24.6 GB weights + 3.6 GB KV = 28.6 GB. |
| `-ncmoe 0`  | MoE fix  | Disables non-causal MoE layer. Critical for coherent output on this model.        |

### Model 4: Gemma 4 26B (Vision Testing)

File: `gemma-4-26B-A4B-it-UD-Q4_K_M.gguf` (16.0 GB)

Vision benchmark launch (after ffmpeg fix):

```bash
llama-cli \
  -m /models/gemma-4-26B-A4B-it-UD-Q4_K_M.gguf \
  -dev SYCL0 \
  -ngl 99 \
  -c 262144 \
  -n 512 \
  --image /path/to/image.jpg \
  --temp 0.7
```

**Vision-specific flags:**

| Flag        | Value        | Explanation                                                                               |
| ----------- | ------------ | ----------------------------------------------------------------------------------------- |
| `--image`   | Image path   | Path to input image for vision processing. Requires ffmpeg installed on host.             |
| `-c 262144` | 256K context | Full 256K context with optimized KV cache. Vision overhead is ~4%.                        |
| `-n 512`    | Max tokens   | Increased from 128 (initial vision test) to 512 to accommodate longer image descriptions. |

### Benchmark Methodology (b70-verified-bench.sh)

The corrected benchmark script enforces the following methodology:

```bash
# For each config tested:
1. Run warmup round (discarded, never counted)
2. Verify GPU temp < 52°C before measured round
3. Run 4 diverse prompts (prevents cache bias)
4. Record wall-clock time AND engine decode rate separately
5. Enforce cooldown to < 52°C between rounds
6. Repeat for each power cap (150W, 165W, 180W, 230W)
```

**Key metrics tracked:**

| Metric                              | Source               | Why it matters                               |
| ----------------------------------- | -------------------- | -------------------------------------------- |
| `llamacpp:prompt_tokens_seconds`    | `/metrics` endpoint  | Prefill speed                                |
| `llamacpp:predicted_tokens_seconds` | `/metrics` endpoint  | Engine decode rate (cleaner than wall-clock) |
| Wall-clock throughput               | Start/end timestamps | Real-world API latency (includes overhead)   |
| GPU temperature                     | `sensors` or hwmon   | Thermals, power cap verification             |
| Draft acceptance rate               | Log output           | MTP speculative decoding efficiency          |

**Deprecated scripts:**

- `b70-mtp-bench.sh` — single-prompt methodology, cache inflation
- `b70-mtp-power-sweep.sh` — lacked warmup discard
- `b70-intermediate-sweep.sh` — intermediate checkpoints with same issues

These inflated baseline performance by 4-5% due to prefix caching. Always use `b70-verified-bench.sh` for future B70 benchmarking.

## References

The VRAM multiplier calculations and quality cliff threshold are based on the **Anbeeld 2026 KV cache benchmark methodology**, which provides measured multipliers per quant type rather than theoretical values. That benchmark documents:

- Effective bits per quant type (q8_0=8.5, q5_0=6.0, q4_0=4.5, q4_1=5.0)
- SNR calculations for each quantization level
- Error propagation through attention mechanisms
- The 89.84% tail precision quality cliff at q4_0

Primary sources:

- Anbeeld 2026 KV cache benchmarks (Reddit r/LocalLLaMA, methodology post)
- NVIDIA DGX Spark KV benchmarks (reference for KV cache scaling patterns)
- llama.cpp PR #21295 (KV cache quantization discussion)

This post validates those multipliers on Intel Arc hardware specifically, confirming the same behavior applies outside the original CUDA context.
