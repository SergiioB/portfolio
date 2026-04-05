---
title: "Why Most Local AI Benchmarks Lie"
description: "Single-prompt demos prove almost nothing. A serious local-AI benchmark has to measure TTFT, concurrency, tail latency, KV-cache pressure, and failure boundaries."
situation: "I kept seeing local-model claims framed around one successful prompt or one screenshot. That is not enough to decide whether a stack can serve real users, agent loops, or long-running sessions."
usedIn: "Engram AI routing decisions, RK3588 local-model evaluation, and practical capacity planning for private local inference."
impact: "Shifted benchmarking from 'it runs' theater to workload-based evaluation: measured TTFT, realistic context pressure, concurrency, tail latency, and blocked model families before changing routing or hardware recommendations."
pubDate: 2026-04-05
category: "local-ai"
tags:
  [
    "benchmarks",
    "local-ai",
    "llama.cpp",
    "kv-cache",
    "ttft",
    "latency",
    "rk3588",
    "capacity-planning",
  ]
draft: false
---

## The Problem

Most local-AI benchmarks are not really benchmarks. They are demos wearing benchmark clothing.

They usually show:

- one prompt
- one response
- one average throughput number

What they skip is the part that decides whether the stack is usable outside a screenshot:

- time to first token
- concurrency
- long-context pressure
- KV-cache growth
- scheduler behavior
- tail latency
- failure analysis

That is how you end up with a setup that looks great on X and falls apart the moment two users hit it or one prompt gets longer than expected.

## The Minimum Honest Benchmark

For me, an honest local-model benchmark has two phases.

### 1. Single-request baseline

Capture:

- load time
- TTFT
- prompt throughput
- decode throughput

This tells you whether the stack is sane at all.

### 2. Sustained concurrent load

Then run the same stack under stress:

- multiple parallel requests
- realistic context length
- repeated runs, not one-off luck

Capture:

- p50 latency
- p95 latency
- p99 latency
- timeout count
- OOMs or scheduler stalls

If phase two collapses, phase one did not prove anything useful operationally.

## The Memory Mistake Everyone Makes

The other mistake shows up before the benchmark even starts. People reduce planning to:

```text
model size -> VRAM
```

That shortcut falls apart as soon as the workload stops being toy-sized.

The more honest formula is:

```text
required memory ~= weights + KV cache + activations + runtime buffers + fragmentation + headroom
```

That is why a model that “should fit” often stops fitting once prompts get longer or multiple sessions show up.

For MoE models, the confusion gets worse:

- active parameters shape compute cost
- total stored parameters still matter for memory

So "it behaves like a 4B model" is never the whole deployment story for a 26B A4B model.

## What I Use Instead

When I evaluate a local stack now, I keep the framing deliberately strict:

- same prompt class
- same context budget
- same slot count
- dated report artifact
- explicit failure boundary

If a model family is blocked by the runtime, I record that too.

A measured load failure is still a benchmark result. It is not something to hide in the footnotes.

## The Operational Standard

The only benchmark question I really care about is:

> can this stack handle the workload I actually intend to run?

Not:

> did it answer once?

Those are very different standards, and only one of them is useful for routing, hardware planning, or product decisions.

## Practical Takeaway

If you run local AI seriously, stop publishing single-prompt victory laps.

Publish:

- TTFT
- concurrency
- tail latency
- context budget
- memory assumptions
- failure modes

That is the difference between benchmark theater and engineering evidence.
