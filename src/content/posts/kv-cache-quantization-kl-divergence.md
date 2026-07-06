---
title: "The Math Behind KV Cache Quantization: Why I Stopped Using Q5_0 for Keys"
description: "An analysis of KL divergence when quantizing the Key/Value cache in llama.cpp, and why the K-cache requires significantly higher precision than the V-cache."
situation: "To fit a 35B Mixture of Experts model inside a 32GB VRAM buffer with a 256K context window, heavy quantization of the KV cache was necessary."
issue: "I was using an aggressive `Q5_0` quantization for the Key (K) cache and `Q4_1` for the Value (V) cache. Over long contexts, the model's reasoning capabilities began to degrade, showing signs of hallucination and logic loops."
solution: "Researched the Kullback-Leibler (KL) divergence of various KV cache quantization formats in llama.cpp. Discovered that the Key cache is highly sensitive to precision loss due to dot-product attention mechanics. Shifted to a hybrid `K=Q8_0 / V=Q4_1` profile."
usedIn: "Production inference configuration for massive context lengths on 32GB GPUs."
impact: "Restored near-FP16 reasoning quality (KL divergence of ~0.004) while maintaining a small enough memory footprint to keep the 256K context window viable."
pubDate: 2026-07-06
category: "local-ai"
tags: ["llama-cpp", "hardware-tuning", "machine-learning", "ai", "local-ai", "quantization"]
draft: false
amazonUrl: https://go.sergiiob.dev/arc-pro
---

## The 32GB VRAM Squeeze

Running massive models locally requires ruthless VRAM management. A 35B parameter Mixture of Experts (MoE) model quantized to `Q5_K_M` takes up about 25GB of VRAM just for its weights.

If you want to run that model with a huge context window (e.g., 256,000 tokens for RAG or code base analysis), the Key/Value (KV) cache becomes the enemy. Uncompressed (FP16), a 256K context cache for a 35B model will easily consume over 12GB of VRAM, immediately causing an Out-Of-Memory (OOM) crash on a 32GB GPU like the Intel Arc Pro B70.

The solution in `llama.cpp` is **KV Cache Quantization**. By compressing the memory of past tokens, we can fit massive contexts into small VRAM buffers. But not all compression is created equal.

## The Mistake: Aggressive Symmetric Quantization

In an effort to maximize VRAM overhead, my server profiles were initially configured to heavily squash both the Keys and the Values:

```bash
--cache-type-k q5_0 --cache-type-v q4_1
```

This worked mathematically—the server didn't crash. But over long, sustained conversations, the AI's reasoning degraded. It would lose the thread of complex instructions or loop its logic.

## Understanding Asymmetric Sensitivity (KL Divergence)

The degradation was caused by **KL divergence** (Kullback-Leibler divergence)—a statistical measure of how much the probability distribution of the compressed model's output deviates from the uncompressed (FP16) baseline.

Researching the internal metrics from the `llama.cpp` development team revealed a fascinating architectural quirk in transformer models: **The Key cache and the Value cache do not share the same sensitivity to precision loss.**

### The Key (K) Cache: Fragile

The Key cache is used in the attention mechanism via a **dot-product** against the current query token. Small rounding errors in `K` get exponentially magnified during the Softmax step, drastically altering which past tokens the model decides to pay attention to. Compressing `K` to `Q5_0` introduces a measurable KL divergence of `~0.008`. Compressing it further to `Q4_0` destroys the model entirely (KL divergence `>0.03`).

### The Value (V) Cache: Robust

The Value cache is much more forgiving. Once the attention weights are calculated, the `V` vectors are simply multiplied and summed up. A loss of precision here slightly blurs the _exact_ semantic representation, but the model still understands the core concept. You can crush the `V` cache down to `Q4_1` or even `Q4_0` with almost zero penalty to the model's logic.

## The Hybrid "Sweet Spot"

You cannot use intermediate formats like `Q6_K` for the KV cache; `llama.cpp` only supports block-level quantizations like `Q8_0`, `Q5`, and `Q4`.

To achieve the best of both worlds—FP16-like reasoning quality with Q4-like VRAM savings—you must use an asymmetric cache configuration:

```bash
--cache-type-k q8_0 --cache-type-v q4_1
```

By keeping the Keys at high precision (`Q8_0`), the KL divergence drops back down to a negligible `~0.0044`. The model retains perfect logical tracking of its context. By squashing the Values to `Q4_1`, the total memory footprint of the context window is still roughly halved compared to FP16, allowing a 256K context to squeeze comfortably into the remaining 7GB of VRAM alongside a 35B model.

If you are running large contexts on constrained VRAM, never quantize your K-cache below 8 bits. Save your memory on the V-cache instead.
