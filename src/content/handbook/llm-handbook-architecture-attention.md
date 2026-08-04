---
title: "LLM Handbook Part 1: Architecture, Attention Heads & Flash Attention"
description: "An engineer's guide to the core mechanics of Large Language Models. Demystifying the Transformer architecture, KV Cache, and how Flash Attention changed the game."
chapter: 1
part: "Fundamentals"
pubDate: 2026-07-06
---

## The Transformer Foundation

To optimize an LLM in production, you must understand what it is actually doing. At its core, an LLM (based on the Transformer architecture introduced in 2017) is an autoregressive engine: it predicts the next token based on all previous tokens.

It does this through stacked **Layers**, primarily composed of two operations:

1. **Self-Attention:** Understanding context (how words relate to each other).
2. **Feed-Forward Networks (FFN):** Recalling knowledge and facts.

In standard architectures (like LLaMA), a 70B model simply has more layers, wider hidden dimensions, and more attention heads than an 8B model.

Crucially, generation is **autoregressive**: the model produces one token at a time, and each new token is appended to the input for the next step. This loop is the single most important fact for understanding inference performance.

![Animated autoregressive loop: the predicted token is appended to the context and fed back in, one forward pass per token](/images/diagrams/handbook/autoregressive-loop.svg)

## Unpacking Attention Heads

When you read a sentence, you subconsciously link verbs to their subjects and pronouns to their nouns. "Attention" is how the model does this mathematically.

Instead of one monolithic attention mechanism, models use **Multi-Head Attention (MHA)**. The model splits its focus into multiple "heads." For example, a 70B model might have 64 attention heads per layer.

- Head 1 might focus on grammar.
- Head 2 might focus on subject-verb agreement.
- Head 64 might focus on emotional tone.

During inference, these heads generate three vectors for every token: **Query (Q), Key (K), and Value (V)**.

- **Query:** What am I looking for?
- **Key:** What do I contain?
- **Value:** What is my actual semantic meaning?

### The dot product, intuitively

Before the formula, the intuition: the **dot product** of two vectors is a single number that tells you whether they "point the same way." If two vectors are parallel the dot product is large and positive; if they're perpendicular (orthogonal) it is zero; if opposite, negative. So $Q \cdot K$ is a cheap similarity score between "what I'm looking for" and "what a past token contains."

$$Q \cdot K = \sum_i Q_i K_i = |Q|\,|K| \cos\theta$$

![Animated dot product: a Key vector aligned with the Query scores high, while a Key that rotates toward orthogonal scores near zero](/images/diagrams/handbook/dot-product-similarity.svg)

### Putting it together

The model takes the current token's Query and does a dot-product multiplication against every previous token's Key. High scores mean high relevance. The model then uses those scores to sum up the Values.

![Animated self-attention flow: Query and Key produce scores, softmax, then a weighted sum of Values](/images/diagrams/handbook/attention-qkv-flow.svg)

### Softmax, from the ground up

The raw dot-product scores can be any number — negative, huge, tiny. We need to turn them into **attention weights**: non-negative numbers that add up to 1, so the output is a proper weighted average of the Values. That's exactly what **softmax** does, in two steps:

1. **Exponentiate** each score ($e^x$). This makes everything positive and _amplifies_ larger scores, so the most relevant token grabs most of the weight.
2. **Normalize** by the sum, so the weights add to 1.

$$\text{softmax}(x_i) = \frac{e^{x_i}}{\sum_j e^{x_j}}$$

![Animated softmax: raw scores are exponentiated (amplifying the max) then normalized so the weights sum to one](/images/diagrams/handbook/softmax-steps.svg)

### Why we divide by $\sqrt{d_k}$

When the head dimension $d_k$ is large, the dot products $Q\cdot K$ grow large in magnitude, pushing softmax into regions where one token gets almost all the weight (gradients vanish). Scaling by $\sqrt{d_k}$ keeps the scores in a healthy range:

$$\text{Attention}(Q,K,V) = \text{softmax}\!\left(\frac{Q K^{\top}}{\sqrt{d_k}}\right) V$$

This is the full "scaled dot-product attention" — the single operation at the heart of every Transformer.

## The Infrastructure Nightmare: The KV Cache

If the model had to recalculate the Keys and Values for every single word in a 10,000-word prompt just to generate the 10,001st word, inference would be unusably slow.

To solve this, engines like `llama.cpp` or `vLLM` use a **KV Cache**. Once a token's Key and Value are calculated, they are saved in VRAM. When generating the next token, the model only calculates the Q, K, V for the _new_ token, and pulls the past K and V from the cache.

**The catch:** The KV Cache grows linearly with context size. For a 256K context window, the KV cache can easily consume 10GB+ of VRAM. This is why aggressive quantization of the V-cache (to Q4) is critical for high-context local deployment.

![Animated KV cache: one K·V slot added per generated token, VRAM bar growing linearly](/images/diagrams/handbook/kv-cache-growth.svg)

## Flash Attention: The Savior of Context

As context grows, the matrix multiplication required for attention (Q \* K) grows quadratically ($O(N^2)$). For a 128K context, the math becomes paralyzing.

**Flash Attention** (and Flash Attention 2/3) solved this. It is a hardware-aware algorithm (originally designed for CUDA, now ported to SYCL/Metal) that radically minimizes memory reads/writes.

Instead of computing the massive Q\*K matrix and writing it to High Bandwidth Memory (HBM), Flash Attention computes it in small "tiles" directly inside the GPU's ultra-fast SRAM (L1 cache), calculates the Softmax, and only writes the final result back to HBM.

This turns a memory-bandwidth-bound operation into a compute-bound operation, enabling the massive 128K and 256K context windows we see today without slowing inference to a crawl.

![Animated Flash Attention: tiles read from slow HBM into fast SRAM, computed, and only the result written back](/images/diagrams/handbook/flash-attention-tiling.svg)
