---
title: "Autumn 2026 Field Report: XeCores, b70-launcher, Dual-B70 TensorFold, and 140K+ Monthly HF Downloads"
description: "Why this blog went quiet for two months while the Intel Arc Pro B70 lab accelerated — launching XeCores, shipping b70-launcher, contributing upstream fixes, and crossing 140K monthly Hugging Face downloads."
situation: "After publishing the Cascadia multi-GPU study in September 2026, most day-to-day benchmarking moved out of individual blog posts and into a dedicated public catalog and launcher."
issue: "Standalone markdown articles age quickly when vLLM XPU, exl3xpu, TensorFold, and llama.cpp SYCL ship weekly fixes and drivers change behavior across prompt depths."
solution: "Consolidated live recipes, verified benchmark evidence, and reproducible launch scripts into XeCores (xecores.com), b70-launcher, and the Intel Arc Pro B70 inference cookbook while pushing fixes upstream."
usedIn: "Dual Intel Arc Pro B70 32GB workstation (PCIe 4.0 x8/x8) running vLLM XPU, exl3xpu, TensorFold, OpenVINO/Cascadia, and llama.cpp SYCL."
impact: "Over 200 stars on the B70 cookbook, 140K+ monthly downloads on quantized Hugging Face checkpoints, and merged upstream contributions across intel/auto-round, TensorFold, vllm-xpu-kernels, and Cascadia."
pubDate: 2026-11-23
category: ["local-ai", "b70"]
tags: ["intel-arc", "b70", "xecores", "vllm", "tensorfold", "llama-cpp", "huggingface"]
---

If you looked at the dates on this blog and assumed the Intel Arc Pro B70 lab slowed down after September, the opposite happened: the work outgrew single articles and turned into a dedicated platform, a launcher, and a steady stream of upstream pull requests.

This field report bridges the gap and points to where every live recipe, benchmark record, and checkpoint now lives.

## 1. XeCores (`xecores.com`) is now the live home for B70 recipes

Blog posts are great for deep-dive narratives, but terrible for answering _"what exact command and sampling settings should I run tonight on one or two B70s?"_

That now lives on **[xecores.com](https://xecores.com/)**, backed directly by versioned JSON feeds in the **[Intel Arc Pro B70 Inference Cookbook](https://github.com/SergiioB/intel-arc-pro-b70-inference-cookbook)** (now past 200 stars):

- **Tested routes with exact conditions** — prompt depth, output length, concurrency, power cap, sampling preset, and proof link attached to every number.
- **Closed and research arms documented openly** — keeping failed stacks and regressions visible so nobody burns a weekend repeating them.
- **Built-in `b70-launcher` integration** — pairing the catalog with **[`b70-launcher`](https://github.com/SergiioB/b70-launcher)** so verified single-card and dual-card configurations can be started without hand-assembling flags.

## 2. Quantized checkpoints crossed 140K+ monthly downloads

Alongside the cookbook, our quantized checkpoints on **[Hugging Face (`huggingface.co/SergiioB`)](https://huggingface.co/SergiioB)** — led by `Qwen3.8-27B-GPTQ-Int4-sym-G128-MTP-BF16` — crossed **140,000+ downloads in the last 30 days**.

More importantly than the download counter itself, those checkpoints are being referenced as reproducible control baselines in upstream engineering threads across `intel/llm-scaler` and `vllm-project/vllm` when diagnosing XPU kernels, MTP speculation behavior, and accuracy regressions.

## 3. Upstream first: merged XPU fixes and reproducible bug reports

Whenever a B70 run exposes a bug or a bottleneck, the goal is to land the fix or minimal reproducer upstream rather than hiding it in a private fork:

- **Intel repositories**: merged PRs and targeted reproducers across `intel/auto-round` (e.g. `#2512`), `intel/compute-runtime` (minimal Level Zero reproducers for multi-GPU profiling hangs), `openvino`, and `vllm-xpu-kernels`.
- **Inference runtimes & community labs**: merged contributions across `TensorFold`, `labscommunity/cascadia`, and `labscommunity/intelinside` (tracking reproducible B70 results on `intelinside.ai`).
- **Dual-B70 deep-dives**: November brought full two-card TensorFold (`--tp 2`) characterization up to 250K context, warm prompt-cache sizing, and a local SYCL peer-store allreduce prototype (`GGML_SYCL_TP_P2P=2`) for two-card `llama.cpp`.

## What stays on `sergiiob.dev` vs `xecores.com`

Going forward, the split is intentional:

- **[`xecores.com`](https://xecores.com/)** holds the live B70 route catalog, interactive die architecture walkthrough, full benchmark tables, and launcher releases.
- **[`sergiiob.dev`](https://sergiiob.dev/)** holds long-form architecture notes, enterprise Linux & Ansible case studies, the LLM Infrastructure Handbook, and periodic lab summaries like this one.

If you want to collaborate on hardware evaluation, reproducible benchmarking, or developer tooling around Intel GPUs and local AI, reach out via **[hello@xecores.com](mailto:hello@xecores.com)** or follow daily updates on **[X (@SergiiioBS)](https://x.com/SergiiioBS)**.
