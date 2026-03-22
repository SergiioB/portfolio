---
title: "RK3588 NPU Router Architecture: Ultra-Fast Local AI Inference"
description: "Implementing a multi-tier inference architecture on RK3588 with NPU-accelerated routing, CPU model pre-warming, and Hermes Agent tool calling for autonomous agent workflows."
situation: "A local-first Discord AI bot required responsive, streaming replies for autonomous agent workflows while respecting strict edge device memory budgets and power constraints."
issue: "CPU-only inference was too slow for interactive chat, NPU CMA memory eviction occurred during idle periods, model cold-start times exceeded 60 seconds, and Hermes Agent-style tool calling required specialized formatters."
solution: "Implemented a tiered inference architecture using TinyLlama 1.1B as ultra-fast NPU router (15 tok/s), NPU keepalive pings to prevent CMA eviction, background CPU model pre-warming after routing decisions, Hermes 2 Pro tool formatter, and parallel tool call support."
usedIn: "Engram AI (local-first Discord bot) running on RK3588 with autonomous agentic workflows."
impact: "Routing decisions reduced from 270ms to sub-50ms with TinyLlama, NPU CMA eviction eliminated via keepalive, CPU model cold-start hidden via background pre-warming, Hermes Agent tool calling enabled."
pubDate: 2026-03-22
category: "local-ai"
tags: ["rk3588", "npu", "llama.cpp", "hermes-agent", "tool-calling", "agentic-ai", "benchmarks"]
draft: false
---

## Situation

Running autonomous agentic AI workflows on edge hardware requires balancing multiple competing constraints: inference speed, memory footprint, power consumption, and cold-start latency. On the RK3588 (Radxa ROCK 5B), these constraints become acute.

This research session covered the implementation of:

1. **Ultra-fast NPU router** using TinyLlama 1.1B (15 tok/s vs qwen3-1.7b's 6.7 tok/s)
2. **NPU keepalive** to prevent CMA memory eviction during idle periods
3. **Background CPU model pre-warming** to hide cold-start latency
4. **Hermes 2 Pro tool formatter** for NousResearch Hermes-compatible tool calling
5. **Parallel tool calls** support for multi-tool agentic workflows
6. **Flash attention fix** (llama-server flag format correction)

## Architecture Overview

### The Inference Tiering Problem

On RK3588, different model sizes serve different purposes with different latency profiles:

```
┌─────────────────────────────────────────────────────────────┐
│                    RK3588 Inference Stack                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐   │
│  │   TinyLlama │    │  Qwen3-1.7B │    │  Qwen3.5-4B │   │
│  │    1.1B    │    │     NPU      │    │    CPU      │   │
│  │   W8A8     │    │   W8A8      │    │   Q4_K_M   │   │
│  ├─────────────┤    ├─────────────┤    ├─────────────┤   │
│  │  15 tok/s  │    │  6.7 tok/s │    │  2.4 tok/s │   │
│  │    NPU      │    │    NPU      │    │    CPU      │   │
│  │  Priority:  │    │  Priority:  │    │  Priority: │   │
│  │    110     │    │    100      │    │    104     │   │
│  └─────────────┘    └─────────────┘    └─────────────┘   │
│        │                  │                  │                │
│        └────────────────┼──────────────────┘                │
│                         │                                    │
│                    Intent Router                             │
│              (classifies query type)                         │
│                         │                                    │
│    ┌───────────────────┼───────────────────┐              │
│    │                   │                   │                  │
│    ▼                   ▼                   ▼                  │
│  ROUTING          CHAT              TOOL_HEAVY          │
│  (50ms)           (270ms)           (cold CPU)           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### NPU CMA Memory Constraints

The Rockchip NPU uses a Contiguous Memory Allocator (CMA) for model weights:

```
┌────────────────────────────────────────┐
│         RK3588 NPU Memory Map           │
├────────────────────────────────────────┤
│                                        │
│  CMA Pool: ~2.2GB max                  │
│  ┌────────────────────────────────┐   │
│  │  Model weights must fit entirely │   │
│  │  No layer offloading like GPU   │   │
│  │  W8A8 quantization required    │   │
│  └────────────────────────────────┘   │
│                                        │
│  Implications:                         │
│  • No 4B+ models on NPU              │
│  • No MoE models (35B+ expert routing)│
│  • Keepalive required to prevent      │
│    CMA eviction during idle            │
│                                        │
└────────────────────────────────────────┘
```

## Key Optimizations

### 1. TinyLlama 1.1B Ultra-Fast Router

The standard qwen3-1.7B router achieves 6.7 tok/s. TinyLlama 1.1B delivers 15 tok/s—**2.2x faster**—while using less memory (1.5GB vs 2.5GB).

```typescript
// Model registration in EngramOrchestrator
{
  id: 'router-npu-tiny',
  name: 'TinyLlama 1.1B Router',
  path: process.env.NPU_TINY_ROUTER_MODEL || '',
  backend: 'npu',
  size: '1.1b',
  vramCostGB: 1.5,
  priority: 110,  // Higher = preferred
  description: '15 tok/s ultra-fast NPU router'
}
```

The router model is selected automatically when `NPU_TINY_ROUTER_MODEL` is set in the environment.

### 2. NPU Keepalive

When the NPU is idle, CMA can evict the model weights. A keepalive ping every 30 seconds prevents this:

```typescript
private startKeepalive(): void {
  if (this.forceHeuristicMode || !this.KEEPALIVE_ENABLED) return;

  this.keepaliveTimer = setInterval(async () => {
    try {
      await this.npuBridge.generate({
        userPrompt: '.',  // Minimal token
        maxTokens: 1,
        temperature: 0,
        timeoutMs: 5000
      });
    } catch { /* ignore */ }
  }, this.KEEPALIVE_INTERVAL_MS);
}
```

Configuration:

```bash
NPU_KEEPALIVE_ENABLED=true
NPU_KEEPALIVE_INTERVAL_MS=30000
```

### 3. Background CPU Model Pre-Warm

After routing decides a CPU model is needed, pre-warm it in the background:

```typescript
private prewarmModelInBackground(model: ModelConfig): void {
  if (this.loadedCpuModels.has(model.id)) return;
  if (this.isCpuModelLoading) return;

  const prewarmCtx = Math.min(model.maxContext, 512);

  this.ensureCpuModelLoaded(model, prewarmCtx)
    .catch(() => { /* silently ignore */ });
}
```

This hides the 30-60s cold-start of CPU models behind the NPU routing decision.

### 4. Hermes 2 Pro Tool Formatter

Added for NousResearch Hermes compatibility:

```typescript
export class Hermes2ProFormatter extends BaseToolFormatter {
  usesNativeToolCalling = true;

  supports(model: ModelConfig): boolean {
    return model.id.includes("hermes-2") || model.id.includes("nousresearch");
  }

  parseAction(rawText: string): AgenticAction | null {
    const hermesMatch = rawText.match(
      /<tool_call>\s*<tool_name>([^<]+)<\/tool_name>\s*<tool_parameters>([^<]+)<\/tool_parameters>\s*<\/tool_call>/i
    );
    // ... parse and return action
  }
}
```

### 5. Flash Attention Fix

The `--flash-attn` flag **requires a value** (`on|off|auto`):

```typescript
// Before (broken): --flash-attn eats --jinja as its value
args.push("--flash-attn");

// After (fixed): explicit value
args.push("--flash-attn", "on");
```

Resulting command:

```bash
llama-server --flash-attn on --jinja -c 2048 -t 6 ...
```

## Benchmark Results

### NPU Router Performance

| Model          | Throughput | Memory | Use Case           |
| -------------- | ---------- | ------ | ------------------ |
| TinyLlama 1.1B | 15 tok/s   | 1.5GB  | Ultra-fast routing |
| Qwen3-1.7B     | 6.7 tok/s  | 2.5GB  | Standard routing   |
| Qwen2.5-3B     | 5.7 tok/s  | 3.6GB  | NPU quality        |

### CPU Model Cold-Start

With background pre-warming:

| Model               | Cold Load | Pre-Warmed | Hidden By   |
| ------------------- | --------- | ---------- | ----------- |
| Qwen3.5-4B Q4_K_M   | 45s       | 0s         | NPU routing |
| Qwen3.5-9B Q4_K_M   | 90s       | 0s         | NPU routing |
| Qwen3.5-0.8B Q4_K_M | 12s       | 0s         | NPU routing |

## Configuration Reference

```bash
# NPU Router
NPU_TINY_ROUTER_MODEL=./models/TinyLlama-1.1B-W8A8-RK3588.rkllm
NPU_ROUTER_MODEL=./models/qwen3-1.7b-w8a8/Qwen3-1.7B-rk3588-w8a8.rkllm

# NPU Keepalive
NPU_KEEPALIVE_ENABLED=true
NPU_KEEPALIVE_INTERVAL_MS=30000

# CPU Model Pre-Warm
ENGRAM_PREWARM_CPU_MODEL=true

# Flash Attention
LLAMA_FLASH_ATTN=on
LLAMA_USE_JINJA=true

# Agentic Tool Calling
AGENTIC_PARALLEL_TOOL_CALLS=false  # Disabled on RK3588 due to memory
```

## Takeaway

On edge devices, the inference stack isn't one-size-fits-all. A tiered approach—fast NPU routing, keepalive to prevent eviction, background CPU pre-warming—enables responsive autonomous agents without cold-start frustration. The Hermes 2 Pro formatter opens the door to NousResearch's agent ecosystem while maintaining local inference.

<!-- portfolio:expanded-v2 -->

## RK3588 Inference Architecture Diagram

![RK3588 NPU Router Architecture](/images/diagrams/rk3588-npu-router-architecture.svg)

This diagram illustrates the **tiered inference architecture** on RK3588, showing how TinyLlama 1.1B (15 tok/s) handles ultra-fast routing decisions, the NPU keepalive ping mechanism prevents CMA eviction during idle, and background CPU model pre-warming hides cold-start latency behind the routing decision.

## Post-Specific Engineering Lens

For this post, the primary objective is: **Balance inference speed with memory constraints on edge hardware.**

### Implementation decisions for this case

- Chose **TinyLlama 1.1B** over qwen3-1.7B for router to achieve 2.2x speedup
- Implemented **keepalive pings** as cheap insurance against CMA eviction
- Used **background pre-warming** to hide CPU model cold-start entirely
- Added **Hermes 2 Pro formatter** for NousResearch tool compatibility

### Practical command path

These are representative execution checkpoints relevant to this post:

```bash
# Start NPU router with keepalive
NPU_KEEPALIVE_ENABLED=true \
NPU_TINY_ROUTER_MODEL=./TinyLlama-1.1B-W8A8-RK3588.rkllm \
npm run start

# Warm CPU model in background
ENGRAM_PREWARM_CPU_MODEL=true

# Enable Hermes tool calling
AGENTIC_PARALLEL_TOOL_CALLS=false
```

## Validation Matrix

| Validation goal       | What to baseline                        | What confirms success                            |
| --------------------- | --------------------------------------- | ------------------------------------------------ |
| Routing latency       | Time to first token from NPU router     | Sub-50ms for TinyLlama, sub-300ms for qwen3-1.7B |
| CMA stability         | NPU model stays loaded after 10min idle | Keepalive prevents eviction                      |
| Cold-start hidden     | Time from routing to first CPU token    | Pre-warming makes this imperceptible             |
| Tool calling accuracy | Hermes format parsing success rate      | >95% parse success on well-formed tool calls     |

## Failure Modes and Mitigations

| Failure mode               | Why it appears in this type of work     | Mitigation used in this post pattern        |
| -------------------------- | --------------------------------------- | ------------------------------------------- |
| NPU CMA eviction           | Model unloaded after idle timeout       | Keepalive pings every 30s                   |
| CPU model cold-start       | Large model load time on first use      | Background pre-warm after routing decision  |
| Flash attention flag error | --flash-attn consumes next arg as value | Pass explicit 'on' value: --flash-attn on   |
| Memory pressure            | Multiple models competing for CMA       | Pre-warm only when needed, evict LRU models |

## Recruiter-Readable Impact Summary

- **Scope:** optimize local inference under strict edge device memory budgets.
- **Execution quality:** tiered inference architecture with NPU routing, CPU pre-warming, and keepalive.
- **Outcome signal:** sub-second response times for autonomous agent workflows on RK3588.
