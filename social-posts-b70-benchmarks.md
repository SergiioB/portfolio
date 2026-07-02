# Social Media Posts — B70 Benchmark Findings

Content derived from hardware-verified benchmark data on Intel Arc Pro B70 32GB.
Portfolio posts: `b70-kv-cache-quantization-context-ceilings` and `b70-mtp-power-scaling-methodology`.

---

## X (Twitter)

### Thread 1: KV Cache & Context Ceilings (2 tweets)

**Tweet 1:**
Spent yesterday mapping context ceilings on the Intel Arc B70 (32GB). Switched KV cache from symmetric q8_0 to asymmetric q5_0 K / q4_1 V.

VRAM multiplier dropped from 0.531 to 0.328. That freed 6.2 GB per 128K context, and the engine decode rate actually went up 3.3%.

**Tweet 2:**
New context ceilings on 32GB with the optimized cache:

- 35B Q5: fits 256K (was 128K)
- 27B MTP: fits 200K
- Ornith 9B: fits 1024K+

Zero scaling penalty across all lengths. Quality stays above the 89.84% tail precision cliff.

Full writeup: https://sergiiob.dev

---

### Thread 2: Benchmark Methodology Fix (2 tweets)

**Tweet 1:**
Had to bin my initial MTP-4 power sweep data for Qwen 27B. Single-prompt prefix caching was inflating the baseline by ~5%, which made speculative decoding gains look larger than reality.

**Tweet 2:**
Rewrote the benchmark script: warmup discard, engine rate isolated from wall-clock, strict cooldown to under 52C between rounds.

Corrected MTP-4 gain at 180W: +35% (not the +41% initially measured). 180W is the sweet spot, same throughput as 230W but 9C cooler.

---

### Thread 3: Vision Benchmarks (1 tweet)

**Tweet 1:**
Ran vision benchmarks on the B70 for Qwen 27B (180W) and Gemma 4 26B (150W). First two rounds crashed because ffmpeg was missing on the host.

After the fix: image decode overhead sits at 4-6% over pure text inference. Practically negligible for multimodal workloads.

---

## LinkedIn

### Post 1: KV Cache Quantization (Technical Deep-Dive)

Been mapping context ceilings on the Intel Arc Pro B70 32GB over the last few days. The default q8_0 KV cache was eating too much VRAM, capping a 35B model at 128K context.

Switched to asymmetric quantization: q5_0 for K, q4_1 for V.

- VRAM multiplier: 0.531 -> 0.328 (38% reduction)
- Freed 6.2 GB of VRAM per 128K context
- Context ceiling on 35B Q5: 128K -> 256K
- Engine decode rate: 3.3% faster (not slower)
- Quality: above the 89.84% tail precision cliff

The asymmetric approach makes sense. K cache participates directly in the attention dot product, so it is more sensitive to quantization noise. V only scales, so it tolerates the heavier q4_1 quantization without degrading output quality.

Zero context scaling penalty across all tested lengths (64K to 512K). Throughput stays flat regardless of how much context is filled.

5 API-ready configs documented and submitted. Full VRAM math and methodology on the portfolio.

[link to sergiiob.dev]

#LocalAI #llamaCpp #IntelArc #KVCache #Quantization #LocalInference

---

### Post 2: MTP Power Scaling & Methodology (Applied/Methodology)

Ran a power scaling sweep for MTP-4 speculative decoding on Qwen 27B across 150W-230W on the Intel Arc B70. Had to throw out the initial data and rewrite my benchmark script halfway through.

Single-prompt prefix caching was inflating the baseline by about 5%, which made the speculative decoding gains look larger than they were. Initially measured +41% gain.

After fixing the methodology (warmup discard, engine rate vs wall-clock isolation, strict thermal cooldowns):

- Corrected MTP-4 gain at 180W: +35%
- 180W is the sweet spot: same throughput as 230W, but 52C instead of 61C
- Above 180W: diminishing returns, just more heat

Also ran vision benchmarks (Qwen 27B at 180W, Gemma 4 26B at 150W). First rounds crashed because ffmpeg was missing on the host. After the fix, image decode overhead is 4-6% over pure text. Negligible for practical multimodal use.

Full corrected data and benchmark methodology on the portfolio.

[link to sergiiob.dev]

#LocalAI #Benchmarking #SpeculativeDecoding #IntelArc #MachineLearning

---

### Post 3: Combined Overview (shorter, for broader reach)

Spent a day running 13 hardware-verified benchmark tests on the Intel Arc Pro B70 32GB. Two findings worth sharing:

1. Asymmetric KV cache quantization (q5_0 K / q4_1 V) freed enough VRAM to push 35B model context from 128K to 256K. It was also 3.3% faster than the q8_0 baseline.

2. My initial MTP-4 speculative decoding benchmarks were inflated by prefix caching. Corrected methodology shows a real +35% throughput gain at 180W (not the +41% initially reported). 180W is the power sweet spot.

Both findings are now documented with full VRAM budgets, power scaling curves, and corrected benchmark scripts.

[link to sergiiob.dev]

#LocalAI #IntelArc #llamaCpp #Benchmarking #EdgeAI
