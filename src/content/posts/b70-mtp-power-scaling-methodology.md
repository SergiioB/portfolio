---
title: "MTP-4 Speculative Decoding Power Scaling and Benchmark Methodology Fix on Intel Arc B70"
description: "Corrected power scaling data for Qwen 27B MTP-4 speculative decoding after discovering single-prompt caching was inflating baselines by 4-5%. True MTP-4 gain at 180W is +35%, not +41%. Includes vision benchmark results after ffmpeg dependency fix."
situation: "Benchmarking MTP-4 speculative decoding for Qwen 27B dense model across a 150W to 230W power sweep on Intel Arc Pro B70. Initial results showed +41% throughput gain over base model."
issue: "The initial power sweep data was inflated. Single-prompt prefix caching was active during testing, which inflated the baseline measurements by approximately 4-5%. This made the speculative decoding gains appear larger than they actually were."
solution: "Rewrote the benchmark script to enforce warmup discards, isolate engine decode rate from wall-clock time, and maintain strict thermal cooldowns between test rounds. Re-ran the entire power sweep with the corrected methodology."
usedIn: "Production benchmark suite for Intel Arc Pro B70 32GB. The corrected script (b70-verified-bench.sh) is now the canonical benchmark for all B70 model evaluations."
impact: "Corrected MTP-4 gain at 180W is +35% over base (down from the initially reported +41%). 180W identified as the power sweet spot: same throughput as 230W with significantly lower thermals. Vision models tested with 4-6% image decode overhead."
pubDate: 2026-07-02
category: ["local-ai", "infrastructure"]
tags:
  [
    "local-ai",
    "llama.cpp",
    "mtp",
    "speculative-decoding",
    "intel-arc",
    "arc-pro-b70",
    "qwen",
    "power-scaling",
    "benchmark",
    "methodology",
  ]
draft: false
---

## Situation

I was running a power scaling sweep for MTP-4 speculative decoding on Qwen 27B. The goal was to map the throughput curve from 150W to 230W and find the optimal power cap for sustained inference.

Hardware reference: [Intel Arc Pro cards on Amazon](https://sergiiob.dev/go/arc-pro). Regional links: [Spain](https://sergiiob.dev/go/arc-pro-es), [US](https://sergiiob.dev/go/arc-pro-us), [UK](https://sergiiob.dev/go/arc-pro-uk), [Germany](https://sergiiob.dev/go/arc-pro-de), [France](https://sergiiob.dev/go/arc-pro-fr), [Italy](https://sergiiob.dev/go/arc-pro-it).

The initial results looked good. Too good, actually.

## The Problem

The first sweep showed a +41% throughput gain from MTP-4 at 180W. When I reviewed the raw logs, the numbers did not add up. The baseline (non-MTP) runs were suspiciously fast compared to earlier tests on the same model.

The root cause was single-prompt prefix caching. When you run the same prompt multiple times in a session, llama.cpp caches the prefilled tokens. On the second and subsequent runs, prefill is nearly free, which inflates the baseline decode rate.

The inflation was approximately 4-5% on this specific test set. That is enough to make a +35% real gain look like +41%.

![MTP Power Scaling and Methodology Fix](/images/diagrams/new/b70-mtp-power-scaling.svg)

## The Fix

I threw out the first sweep and rewrote the benchmark script.

The corrected methodology (`b70-verified-bench.sh`, 220 lines) enforces:

- **Warmup discard** — first run of each config is discarded, never counted
- **Engine rate isolation** — engine decode rate (`predicted_per_second`) measured separately from wall-clock throughput
- **Thermal cooldown** — GPU must drop below 52°C between rounds
- **4 diverse prompts** — different prompt lengths and content to prevent any single prompt from skewing the cache
- **Cooldown verification** — temperature logged before each round starts

The key distinction is engine rate vs wall-clock. Wall-clock includes HTTP overhead, chat template processing, and server scheduling. Engine rate is the raw decoding speed reported by llama.cpp's metrics endpoint. For comparing model configurations, engine rate is the cleaner metric.

## Corrected Results

### Power Scaling Curve (Qwen 27B MTP-4)

| Power Cap | Wall t/s | Engine t/s | MTP-4 Gain | Temp |
| --------- | -------- | ---------- | ---------- | ---- |
| 150W      | 18.4     | 21.2       | +28%       | 48°C |
| 165W      | 22.1     | 25.3       | +31%       | 50°C |
| 180W      | 25.8     | 29.1       | +35%       | 52°C |
| 230W      | 26.9     | 30.0       | +35%       | 61°C |

The sweet spot is **180W**. Above that, throughput plateaus but thermals keep climbing. 230W delivers the same +35% gain as 180W but at 61°C instead of 52°C.

180W gives you the full MTP-4 benefit while keeping the card comfortably below thermal limits for sustained sessions.

### Why MTP-4 Works Here

MTP (Multi-Token Prediction) speculative decoding generates draft tokens in parallel with the main model. The draft model proposes tokens that the main model verifies. When the draft acceptance rate is high, effective throughput increases because the main model processes multiple tokens per forward pass.

On the 27B dense model, MTP-4 (4 draft tokens per step) consistently delivered a +35% throughput improvement at the 180W sweet spot. This is a real, measurable gain after correcting for caching effects.

## Vision Benchmarks

The vision tests had their own issue. The first two rounds of vision testing crashed with image decoding errors. The root cause was a missing `ffmpeg` dependency on the host system.

After installing ffmpeg and bumping `max_tokens` from 128 to 512, vision benchmarks stabilized.

| Model          | Power | Engine t/s | Image Decode Overhead |
| -------------- | ----- | ---------- | --------------------- |
| Qwen 27B MTP-4 | 180W  | 29.1       | 4-6%                  |
| Gemma 4 26B    | 150W  | 59.2       | 4-6%                  |

The image decode overhead is the percentage of inference time spent on processing the image versus pure text generation. 4-6% is negligible for practical use. Vision-capable models on the B70 are fully usable for multimodal workloads without a significant throughput penalty.

## Lessons

Two things went wrong with the initial benchmarking:

1. **Prefix caching inflated the baseline.** This is the most common benchmarking pitfall in llama.cpp. If your test harness runs the same prompt more than once, the cache is warm and your baseline is fake. Always discard the first run or use distinct prompts.

2. **Missing ffmpeg broke vision silently.** The error messages pointed at model loading, not at a missing system dependency. If vision tests fail with decode errors, check for ffmpeg before debugging model configs.

The corrected benchmark script is now the canonical tool for all B70 evaluations. Old scripts that used the single-prompt methodology are deprecated.

## Runtime Flags Handbook

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

### Model 1: Qwen 27B MTP-4 (Speculative Decoding, 180W Sweet Spot)

File: `Qwen3.6-27B-A3B-UD-Q5_K_M.gguf` (16.1 GB)

Production server launch with power cap:

```bash
# Set power cap before launch
echo 180 | sudo tee /sys/class/hwmon/hwmon4/power1_cap

llama-server \
  -m /models/Qwen3.6-27B-A3B-UD-Q5_K_M.gguf \
  --host 0.0.0.0 \
  --port 8080 \
  -dev SYCL0 \
  -ngl 99 \
  -c 196608 \
  --parallel 1 \
  --cache-type-k q5_0 \
  --cache-type-v q4_1 \
  --flash-attn on \
  --reasoning off \
  --metrics \
  --slots \
  --jinja \
  --draft-model /models/Qwen2.5-1.5B-Q5_K_M.gguf \
  --n-predict 512
```

**MTP-4 specific configuration:**

| Flag            | Value        | Explanation                                                                      |
| --------------- | ------------ | -------------------------------------------------------------------------------- |
| `--draft-model` | 1.5B model   | Draft model for speculative decoding. Proposes 4 tokens per forward pass.        |
| `-c 196608`     | 192K context | Slightly lower than max 200K to account for MTP draft model overhead (~1.2 GB).  |
| `--parallel 1`  | 1 slot       | MTP increases slot memory usage. Start with 1, test 2-3 for concurrent requests. |

**Power cap rationale:**

| Power | Engine t/s | Temp | Verdict                                                |
| ----- | ---------- | ---- | ------------------------------------------------------ |
| 150W  | 21.2       | 48°C | Baseline, but -14% throughput vs sweet spot            |
| 165W  | 25.3       | 50°C | Good throughput, thermals safe                         |
| 180W  | 29.1       | 52°C | **Sweet spot**. +35% MTP gain, thermals comfortable.   |
| 230W  | 30.0       | 61°C | Diminishing returns. Same gain as 180W but 9°C hotter. |

**How to set power cap:**

```bash
# Find hwmon device (usually hwmon4 on B70)
ls /sys/class/hwmon/hwmon*/power1_cap

# Set power cap in microwatts (180W = 180000000)
echo 180000000 | sudo tee /sys/class/hwmon/hwmon4/power1_cap
```

### Model 2: Qwen 27B Base (No MTP, Baseline Comparison)

File: `Qwen3.6-27B-A3B-UD-Q5_K_M.gguf` (16.1 GB)

Baseline benchmark launch:

```bash
llama-server \
  -m /models/Qwen3.6-27B-A3B-UD-Q5_K_M.gguf \
  --host 0.0.0.0 \
  --port 8081 \
  -dev SYCL0 \
  -ngl 99 \
  -c 196608 \
  --parallel 1 \
  --cache-type-k q5_0 \
  --cache-type-v q4_1 \
  --flash-attn on \
  --reasoning off \
  --metrics \
  --jinja
```

**Omitted flag:** `--draft-model` — no speculative decoding, pure base model.

### Model 3: Qwen 27B MTP-4 Vision Testing

File: `Qwen3.6-27B-A3B-UD-Q5_K_M.gguf` (16.1 GB)

Vision benchmark launch (after ffmpeg fix):

```bash
llama-cli \
  -m /models/Qwen3.6-27B-A3B-UD-Q5_K_M.gguf \
  --draft-model /models/Qwen2.5-1.5B-Q5_K_M.gguf \
  -dev SYCL0 \
  -ngl 99 \
  -c 131072 \
  -n 512 \
  --image /path/to/image.jpg \
  --temp 0.7 \
  --top-p 0.9
```

**Vision-specific notes:**

- Requires `ffmpeg` installed on host (`sudo apt install ffmpeg`)
- Image tokens consume context budget. Lower `-c` for longer image sequences.
- `--n-predict` in vision mode defaults to 256; bumped to 512 for detailed descriptions.

### Model 4: Gemma 4 26B Vision (Alternative Vision Model)

File: `gemma-3-27b-it-Q5_K_M.gguf` (16.0 GB)

Vision benchmark at 150W power cap:

```bash
echo 150000000 | sudo tee /sys/class/hwmon/hwmon4/power1_cap

llama-cli \
  -m /models/gemma-3-27b-it-Q5_K_M.gguf \
  -dev SYCL0 \
  -ngl 99 \
  -c 131072 \
  -n 512 \
  --image /path/to/image.jpg \
  --temp 0.7
```

**Gemma vs Qwen vision:**

- Gemma 26B at 150W: 59.2 tok/s engine, 4-6% overhead
- Qwen 27B MTP-4 at 180W: 29.1 tok/s engine, 4-6% overhead
- Gemma is faster for pure vision workloads, Qwen MTP-4 wins for mixed text/vision at 180W sweet spot.

## References

Key upstream issues that informed the methodology fix:

- Prefix caching behavior in llama.cpp (Reddit r/LocalLLaMA, multiple threads on cache inflation)
- Benchmark methodology for speculative decoding (HuggingFace community discussions on warmup discard)
- Engine rate vs wall-clock measurement best practices (llama.cpp metrics documentation)

The prefix caching inflation pattern is a known pitfall in llama.cpp benchmarking. When the same prompt runs multiple times, the prefilled tokens hit the cache, making baseline runs artificially fast. This article documents one concrete instance on Intel Arc hardware, but the pattern applies across all backends.

For the power scaling curve itself, the findings are consistent with:

- Intel Arc Battlemage power efficiency curves (Intel documentation)
- GPU diminishing returns studies (NVIDIA DGX Spark, translated conceptually to Arc)

## Next Steps

The corrected benchmark methodology is now in `b70-verified-bench.sh`. Future benchmark work on B70 will use this as the baseline:

- Always discard warmup
- Isolate engine rate from wall-clock
- Enforce thermal cooldowns
- Use diverse prompts to prevent cache bias
