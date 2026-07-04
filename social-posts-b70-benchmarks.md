# Social Media Drafts: B70 Benchmark Series — Round 2

**Status:** Ready for approval
**Portfolio posts referenced:**

- https://sergiiob.dev/posts/b70-kv-cache-quantization-context-ceilings
- https://sergiiob.dev/posts/b70-mtp-power-scaling-methodology
- https://sergiiob.dev/posts/intel-arc-pro-b70-sycl-llama-cpp-qwen35
  **Affiliate link:** go.sergiiob.dev/arc-pro (Cloudflare redirect → Amazon, tag hidden from repo)

---

## X (Twitter)

### Thread 1: Main thread (3 tweets)

**Tweet 1:**
Just managed to squeeze a 35B model at Q5_K_M quantization AND a massive 256K context window onto a single 32GB Intel Arc Pro B70. Total VRAM usage? 28.6 GB.
The secret is heavily optimizing the KV Cache. Full build flags & VRAM math:
https://sergiiob.dev/posts/b70-kv-cache-quantization-context-ceilings

**Tweet 2:**
Also solved a massive mystery: why my 32GB System RAM kept crashing with Out-Of-Memory (OOM) errors.
Turns out, using `--no-mmap` to force models entirely into RAM before moving to the GPU means booting TWO 25GB models concurrently spiked system memory to 50GB+. Built an automated `systemctl` guard to fix it.

**Tweet 3:**
Finally, had to throw out my initial MTP-4 speculative decoding data. Prefix caching was inflating the baseline by ~5%.
Corrected methodology shows +35% throughput at 180W. 180W is the sweet spot. Details: https://sergiiob.dev/posts/b70-mtp-power-scaling-methodology

---

### Tweet 2: Standalone (for a different day, shorter)

Running a 35B MoE model at Q5_K_M with 256K context on a 32GB Intel Arc Pro B70 for local inference. The key was switching KV cache from symmetric q8_0 to asymmetric q5_0 K / q4_1 V, which dropped cache size to just 3.6GB!
Hardware and GPU (non-affiliate):
https://go.sergiiob.dev/arc-pro
Full benchmark writeup:
https://sergiiob.dev/posts/b70-kv-cache-quantization-context-ceilings

---

## LinkedIn

### Post 1: Technical Deep-Dive (main post)

Been running deep technical benchmarks on the Intel Arc Pro B70 (32GB) to map out exactly where the VRAM, context, and power limits sit for 30B+ local AI models.

Four major findings worth sharing today:

1. **Maxing out IQ:** I successfully upgraded my 35B models to Q5_K_M quantization while maintaining a 256K context window. Weights take ~25GB, but by using asymmetric KV cache (q5_0 K / q4_1 V), the 256K cache only takes 3.6GB. Total footprint is 28.6GB, safely fitting in the 32GB card.
2. **The `--no-mmap` OOM Trap:** Found out why my 32GB system kept crashing. Passing `--no-mmap` forces the entire model into system RAM before passing to the GPU. Overlapping two 25GB models instantly demanded 50GB of RAM. I had to build a custom `switch-any` bash script that kills overlapping `systemd` instances to prevent system crashes.
3. **Speculative Decoding Flaws:** Had to bin my initial MTP-4 speculative decoding data. Single-prompt prefix caching was inflating the baseline by ~5%.
4. **Vision Overhead:** Vision benchmarks (Qwen 27B at 180W, Gemma 4 26B at 150W) run with only 4-6% image decode overhead.

All posts are now live on my portfolio with full flag-by-flag explanations, VRAM budget tables, and reproducible tests.

KV Cache Quantization and Context Ceilings:
https://sergiiob.dev/posts/b70-kv-cache-quantization-context-ceilings
MTP-4 Power Scaling and Methodology Fix:
https://sergiiob.dev/posts/b70-mtp-power-scaling-methodology
SYCL Setup and Root Cause:
https://sergiiob.dev/posts/intel-arc-pro-b70-sycl-llama-cpp-qwen35

#LocalAI #IntelArc #llamaCpp #Benchmarking #LocalInference #EdgeAI

---

### Post 2: Shorter combined post (alternative, for wider reach)

Spent the last few days running hardware-verified benchmark tests on the Intel Arc Pro B70 (32GB VRAM). Two findings that completely changed my inference architecture:

1. Asymmetric KV cache (q5_0 K / q4_1 V) freed enough VRAM to push 256K context on a 35B model, even at a high Q5_K_M quantization! It freed up over 6GB vs standard cache.
2. If you use the `--no-mmap` flag in llama.cpp to prevent disk thrashing, be incredibly careful with concurrent model loading. It will spike your system RAM equal to the model's weight file and crash your entire machine via OOM.

Full VRAM budgets, power scaling curves, and the complete runtime flags handbook now on the portfolio:
https://sergiiob.dev/posts/b70-kv-cache-quantization-context-ceilings
https://sergiiob.dev/posts/b70-mtp-power-scaling-methodology

#LocalAI #IntelArc #llamaCpp #Benchmarking
