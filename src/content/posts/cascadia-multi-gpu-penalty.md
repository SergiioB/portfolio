---
title: "The Multi-GPU Penalty: Why Splitting LLMs Kills Performance (and How to Fix It)"
description: "Benchmarking the exact performance penalty of distributing Qwen3.8-27B across consumer hardware, and how Cascadia's pipeline orchestration cuts overhead from 48% to 16%."
situation: "Distributing a large local model across multiple consumer GPUs or edge devices over a network usually destroys inference speed due to severe TCP and memory overhead."
issue: "Standard RPC layer-splitting treats a local network like a high-speed PCIe bus. When a model doesn't fit on one card, splitting it across two GPUs drops performance by almost half, making edge hardware pooling unviable."
solution: "We benchmarked Cascadia's pipeline state handoff and activation relay engine against standard RPC. By caching state intelligently, it cuts network overhead to 0.23ms per frame."
usedIn: "Running 27B+ parameter models across a heterogeneous fleet (desktop Arc Pro B70s and Intel Core Ultra laptops)."
impact: "Proves that consumer edge hardware can be pooled to run massive models without the network destroying the decode rate (only a 16% penalty)."
pubDate: 2026-09-19
category: ["local-ai", "b70"]
tags: ["openvino", "cascadia", "distributed-ai", "intel-arc", "llama-cpp"]
---

If you try to split a local LLM across multiple consumer devices today, the network will destroy your performance.

We know edge hardware is getting cheaper and VRAM is stacking up in disparate places—a desktop GPU here, a high-end laptop NPU there. The dream is to pool all that compute to run massive 70B+ models locally. But the reality is that the moment you push a tensor over a TCP socket, your tok/s falls off a cliff.

We just finished benchmarking exactly how steep that cliff is, and tested a new orchestration engine—Cascadia—designed to fix it.

## The Testbed

We used a heterogeneous hardware fleet:

- **Desktop**: 2× Intel Arc Pro B70 32GB GPUs
- **Laptop**: Intel Core Ultra 9 285H (over WiFi)
- **Model**: Qwen3.8-27B (INT4)

The goal was to measure the "multi-GPU penalty": the speed you lose to network and memory overhead when a model has to be split across devices.

## The Baseline: Naive RPC Layer-Splitting

Most local inference engines distribute models by splitting the transformer layers. Device A computes layers 1-16, then sends the intermediate tensor over the network to Device B for layers 17-32.

It treats your local network like a PCIe bus.

We measured this using `llama.cpp`'s RPC implementation on the dual-GPU desktop:

- Single Arc Pro B70: **76.1 tok/s**
- Two Arc Pro B70s (split): **40.8 tok/s**

That is a **48% performance penalty** just for cutting the model in half on the same machine. Pushing half the model across WiFi to the laptop's CPU made it worse: **24.5 tok/s (−68%)** — and note that config was 1× Arc Pro B70 paired with the laptop CPU, not two GPUs plus a laptop. The CPU overhead and constant TCP round-trips became the bottleneck.

## The Fix: Pipeline State Handoff

To solve this, we tested [Cascadia](https://cascadia.to/), an orchestrator built specifically for heterogeneous edge hardware.

Instead of dumb layer splitting, Cascadia uses a pipeline state handoff and activation relay mechanism. We compiled Cascadia against OpenVINO GenAI 2026.5 beta1 (which required patching the C++ shim to register the tokenizer extension correctly against the new Core API) and split the Qwen 27B model into two stages.

The results running on the exact same dual-B70 desktop:

- Cascadia Single GPU: **22.7 tok/s**
- Cascadia Two GPUs: **18.9 tok/s**

_(Note: Cascadia's base OpenVINO engine is currently slower than llama.cpp's custom SYCL kernels on a single node, but we are looking at the scaling efficiency)._

The multi-GPU penalty dropped to just **16%**.

![Pipeline Overhead Comparison](/blog/multi-gpu-penalty.svg)

## Why it works

Cascadia's architecture drops the network overhead to a measured **0.23ms per frame**. It achieves this because the KV coordinates and state are captured and restored efficiently across the multi-rank pipeline, rather than treating the second device as a dumb remote procedure call.

Pooling edge hardware—desktops, laptops, Macs, and mixed architectures—is the future of local AI. But to make it usable, the inference engine has to handle state transfer intelligently. Standard RPC doesn't.

All the fixes for OpenVINO 2026.5 compatibility and the raw benchmark data are now merged upstream and live on the [intelinside.ai leaderboards](https://intelinside.ai/hardware/intel-arc-pro-b70).
