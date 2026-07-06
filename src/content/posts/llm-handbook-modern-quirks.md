---
title: "LLM Handbook Part 2: Dissecting Modern Architectures (MoE, MTP, GLM)"
description: "Exploring the cutting-edge architectural quirks that power modern LLMs: Mixture of Experts (MoE), Multi-Token Prediction (MTP), and GLM's bidirectional attention."
situation: "Standard dense Transformer architectures hit a scaling wall. Training and inferencing a 1-Trillion parameter dense model requires absurd amounts of compute and memory bandwidth."
issue: "Engineers deploying local AI must navigate an increasingly fractured landscape of model architectures, each requiring different optimization strategies and hardware considerations."
solution: "A breakdown of the three most impactful architectural shifts in modern LLMs: Mixture of Experts (DeepSeek, Mixtral), Multi-Token Prediction (Qwen, LLaMA), and General Language Model topologies (GLM)."
usedIn: "Hardware selection and inference parameter tuning for advanced local AI deployments."
impact: "Enables infrastructure engineers to select the right backend flags (e.g., disabling DNN for MoE, configuring speculative draft layers for MTP) to maximize throughput."
pubDate: 2026-07-06
category: "ai"
tags: ["llm-handbook", "moe", "architecture", "deepseek", "qwen", "glm"]
draft: false
---

## The Death of Dense Scaling

For years, improving an LLM meant making it "denser"—just adding more layers and wider hidden dimensions. But doing a full forward-pass on a 500B parameter dense model for every single token is economically unviable. The industry had to evolve.

## Mixture of Experts (MoE)

Models like **DeepSeek-V3**, **Mixtral**, and **Ornith** use the Mixture of Experts architecture. Instead of one massive Feed-Forward Network (FFN), the layer is split into multiple smaller FFNs called "Experts."

A Router network looks at the current token and decides which experts are best suited to handle it. For example, a 35B MoE model might only activate 8B parameters per token.

**Infrastructure Impact:**

- **VRAM:** You still need enough VRAM to hold all 35B parameters (the model is huge on disk).
- **Speed:** Inference is incredibly fast, running at the speed of an 8B model.
- **Quirks:** SYCL and some CUDA kernels often struggle with the branching logic of MoE routers. Disabling heavy DNN optimization libraries (`GGML_SYCL_DISABLE_DNN=1`) often ironically speeds up MoE models by falling back to simpler matrix ops.

## Multi-Token Prediction (MTP)

Introduced heavily in recent **Qwen** and **LLaMA** architectures, MTP tackles the inefficiency of generating text one word at a time.

Instead of a single prediction head at the end of the model, MTP models have multiple heads stacked on top of each other. While the main model predicts Token N, the MTP heads simultaneously predict Tokens N+1, N+2, and N+3 in the background.

**Infrastructure Impact:**

- MTP models contain built-in "draft models" within their own weights.
- You can use these extra heads for **Speculative Decoding** without loading a separate, secondary draft model into VRAM.
- In `llama.cpp`, passing `--spec-type draft-mtp` instructs the engine to use these internal heads to guess ahead, potentially doubling your `tok/s` output if the guesses are correct, at almost zero extra VRAM cost.

## GLM (General Language Model) and Bidirectional Attention

While LLaMA and Qwen use strict causal attention (you can only look backward, never forward), models like **GLM (ChatGLM 4, GLM 5.2)** use a hybrid approach.

They mix bidirectional attention (like BERT, which reads the whole sentence at once to understand context) with autoregressive decoding (generating text left-to-right).

**Infrastructure Impact:**

- GLM architectures often require specific backend support. A standard LLaMA KV-cache mechanism assumes strict causal masking.
- When running GLM models locally, the prefill phase is uniquely structured and often highly efficient at parsing massive documents, but requires updated quantization formats that support its 2D positional encoding.
