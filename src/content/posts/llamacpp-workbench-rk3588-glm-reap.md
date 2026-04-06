---
title: "llamacpp-workbench: Remote llama.cpp Control and REAP Model Serving on RK3588"
description: "Publishing a practical local-AI control plane for llama.cpp: remote model loading, runtime tuning, streaming chat, and real REAP model serving on a Radxa ROCK 5B+."
situation: "I wanted a serious remote control surface for local GGUF inference on a Radxa ROCK 5B+ instead of one-off shell commands or generic UIs that hide the important llama.cpp knobs."
usedIn: "Local-first AI serving on a Radxa ROCK 5B+ / RK3588 using source-built llama.cpp and GGUF models, including GLM-4.7-Flash-REAP-23B-A3B."
impact: "Turned a board-class ARM64 deployment into a usable remote LLM workstation: one-click model switching, stable high-context serving, and documented RK3588 tuning guidance backed by real measurements rather than generic local-AI advice."
pubDate: 2026-03-30
category: "local-ai"
tags:
  [
    "llama.cpp",
    "rk3588",
    "radxa",
    "rock-5b-plus",
    "gguf",
    "reap",
    "glm",
    "qwen3.5",
    "local-ai",
    "arm64",
  ]
draft: false
slug: "llamacpp-workbench-rk3588-glm-reap"
---

## Situation

I wanted something very specific:

> a remote UI for `llama.cpp` that keeps the runtime visible instead of hiding it.

The target hardware was not a workstation GPU box. It was a **Radxa ROCK 5B+** with **RK3588** and **24 GB RAM**, running source-built `llama.cpp` on CPU inference with explicitly tuned settings.

That changes the design constraints immediately.

On a board like RK3588, the important questions are not just "can the model load?" but:

- what context is actually stable?
- how much KV cache memory does that consume?
- what happens if reasoning is enabled?
- which models are practical for chat versus coding?
- how do you switch models remotely without losing control of the runtime?

I did not want a generic "local AI" panel that collapses those details behind defaults aimed at desktop GPUs.

## What I Built

The published repository is:

- [llamacpp-workbench on GitHub](https://github.com/SergiioB/llamacpp-workbench)

It is a remote workbench for `llama.cpp` and GGUF models with:

- model discovery and switching
- runtime parameter control
- context and KV cache tuning
- start / stop server control
- persistent chats
- markdown-rendered responses
- streaming output in the chat window
- model presets for daily vs slower/stronger modes

This was built specifically around **compiled `llama.cpp`**, not Ollama, because the point was to preserve low-level control:

- `--ctx-size`
- `--batch-size`
- `--ubatch-size`
- `--threads`
- `--cache-type-k`
- `--cache-type-v`
- explicit reasoning controls where supported

That made it possible to keep the UI honest. The controls exposed are the controls the runtime actually obeys.

## Why RK3588 Made This Interesting

The most surprising part of the project was not that the board could run local models. It was that it could run a **REAP-pruned 23B A3B model** in a way that still felt usable.

The strongest live result in this setup was:

- `GLM-4.7-Flash-REAP-23B-A3B-Q3_K_M.gguf`

With the tuned `llama.cpp` profile, the board could:

- load the model successfully
- serve it remotely through the web UI
- sustain large-context inference
- answer with clearly stronger quality than the smaller dense baselines

The key runtime profile was:

- CPU pinned to RK3588 big cores `4-7`
- KV cache: `q8_0` for K and `q4_0` for V
- full model context enabled where practical
- reasoning disabled for interactive use

That last point mattered a lot. On this hardware, "thinking mode" was not a free quality boost. It was a latency explosion.

## Real Lessons From Serving REAP Models on ARM

The practical takeaway was not "larger always wins."

It was:

- smaller dense Qwen models are still better defaults for some coding and agent-loop workloads
- REAP models can be extremely compelling on ARM when the pruning is good and the runtime is tuned carefully
- the right split is often **fast default model + slow strong model**, not a single universal default

That is why the workbench ended up with multiple presets rather than one hardcoded recommendation.

On this board, the useful split became:

- **daily / lighter work**: smaller Qwen GGUFs
- **slower but stronger chat / reasoning**: GLM REAP

## Why Publish It

I published the workbench because it had stopped being a one-off experiment.

By the time the UI had:

- stable remote access
- real runtime controls
- persistent chat state
- markdown rendering
- streaming token output
- model presets
- hardware notes for RK3588 and more general machines

it had become a reusable project rather than just a local tuning scratchpad.

That also meant removing the machine-specific assumptions:

- no hardcoded `/home/...` paths in the app logic
- configurable model roots
- configurable `llama-server` path
- repo-ready documentation for both ARM boards and desktop hardware

## Where This Fits In My Portfolio

This project sits at the intersection of:

- Linux systems work
- performance tuning on constrained hardware
- practical AI infrastructure
- source-level inference runtime control

That combination is exactly what I care about in local AI engineering: not just model choice, but the whole delivery path from binary build to real user interaction.

If you want the broader context around the rest of the engineering work, the portfolio homepage is here:

- [sergiiob.dev](https://sergiiob.dev/)
