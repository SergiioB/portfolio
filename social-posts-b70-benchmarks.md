# Social Media Drafts: B70 Benchmark Series — Round 2

**Status:** Ready for approval
**Portfolio posts referenced:**

- https://sergiiob.dev/posts/b70-kv-cache-quantization-context-ceilings
- https://sergiiob.dev/posts/b70-mtp-power-scaling-methodology
- https://sergiiob.dev/posts/intel-arc-pro-b70-sycl-llama-cpp-qwen35
  **Affiliate link:** sergiiob.dev/go/b70 (Cloudflare redirect → Amazon, tag hidden from repo)

---

## X (Twitter)

### Thread 1: Main thread (2 tweets)

**Tweet 1:**
Benchmarked a 35B model at 256K context on a single Intel Arc Pro B70 (32GB). Found that asymmetric KV cache quantization (q5_0 K / q4_1 V) freed enough VRAM to double the context window and was 3.3% faster than the q8_0 baseline.

Full build flags, VRAM math, and corrected benchmarks here:
https://sergiiob.dev/posts/b70-kv-cache-quantization-context-ceilings

**Tweet 2:**
Also had to throw out my initial MTP-4 speculative decoding data. Prefix caching was inflating the baseline by ~5%.

Corrected methodology shows +35% throughput at 180W (not the +41% initially measured). 180W is the sweet spot, same throughput as 230W but 9°C cooler.

Details: https://sergiiob.dev/posts/b70-mtp-power-scaling-methodology

---

### Tweet 2: Standalone (for a different day, shorter)

Running a 35B MoE model with 256K context on a 32GB Intel Arc Pro B70 for local inference. The key was switching KV cache to asymmetric q5_0/q4_1, which freed 6.2 GB of VRAM per 128K and was faster than q8_0.

Hardware and GPU (non-affiliate):
https://sergiiob.dev/go/b70

Full benchmark writeup:
https://sergiiob.dev/posts/b70-kv-cache-quantization-context-ceilings

---

## LinkedIn

### Post 1: Technical Deep-Dive (main post)

Been running benchmarks on the Intel Arc Pro B70 (32GB) to map out exactly where the VRAM, context, and power limits sit for local inference.

Three findings worth sharing:

1. Switching KV cache from symmetric q8_0 to asymmetric q5_0 K / q4_1 V freed 6.2 GB of VRAM per 128K context. That pushed the 35B model from 128K to 256K context. The asymmetric config was also 3.3% faster in engine decode rate, not slower. The rationale: K cache is more sensitive to quantization noise (participates in the attention dot product directly), V only scales, so it tolerates heavier quantization.

2. Had to bin my initial MTP-4 speculative decoding data. Single-prompt prefix caching was inflating the baseline by ~5%, making the gains look larger. Rewrote the benchmark script with warmup discard and engine-rate isolation. Corrected MTP-4 gain at 180W: +35% (not the +41% initially measured). 180W is the power sweet spot.

3. Vision benchmarks (Qwen 27B at 180W, Gemma 4 26B at 150W) run with only 4-6% image decode overhead after a missing ffmpeg dependency crashed the first two rounds.

All three posts are now live on the portfolio with full flag-by-flag explanations, VRAM budget tables, and reproducible benchmark methodology:

KV Cache Quantization and Context Ceilings:
https://sergiiob.dev/posts/b70-kv-cache-quantization-context-ceilings

MTP-4 Power Scaling and Methodology Fix:
https://sergiiob.dev/posts/b70-mtp-power-scaling-methodology

SYCL Setup and Root Cause (persistent cache crash fix):
https://sergiiob.dev/posts/intel-arc-pro-b70-sycl-llama-cpp-qwen35

#LocalAI #IntelArc #llamaCpp #Benchmarking #LocalInference #EdgeAI

---

### Post 2: Shorter combined post (alternative, for wider reach)

Spent the last few days running 13 hardware-verified benchmark tests on the Intel Arc Pro B70 (32GB). Two findings that changed how I configure this card:

Asymmetric KV cache (q5_0 K / q4_1 V) freed enough VRAM to push 256K context on a 35B model. It was also 3.3% faster than the q8_0 baseline.

My MTP-4 speculative decoding benchmarks were inflated by prefix caching. Corrected methodology shows a real +35% throughput gain at 180W. 180W is the sweet spot: same throughput as 230W, but 52°C instead of 61°C.

Full VRAM budgets, power scaling curves, and the complete runtime flags handbook (with every flag explained) now on the portfolio:

https://sergiiob.dev/posts/b70-kv-cache-quantization-context-ceilings
https://sergiiob.dev/posts/b70-mtp-power-scaling-methodology

#LocalAI #IntelArc #llamaCpp #Benchmarking

---

## Notes

- **Affiliate setup:** The sergiiob.dev/go/b70 redirect needs to be created in Cloudflare dashboard → Rules → Redirect Rules. Pattern: `/go/b70`, target: Amazon ES product page with tag=intelliauto-21. This keeps the affiliate tag out of the public GitHub repo entirely.

- **Posting schedule:** Don't post LinkedIn Post 1 and Post 2 on the same day. Space them 3-4 days apart. The X thread can go same day as LinkedIn Post 1.

- **X Article option:** The LinkedIn Post 1 content is also suitable as an X Article if you want to use Premium+ article publishing.
