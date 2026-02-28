---
title: "Context Folding on Edge LLMs: Fatigue Thresholds and Hierarchical Compression"
description: "A practical context-management design for long conversations on constrained hardware: estimate tokens, detect fatigue, and fold history through a 4-level hierarchy."
situation: "A local-first inference platform on RK3588 needed long-running chats and agent workflows without blowing context windows or degrading answer quality mid-thread."
issue: "As conversations grow, irrelevant middle context accumulates, token budgets get exceeded, and edge devices pay extra latency for input processing."
solution: "Implemented a context folding hierarchy (RAW → DETAILED → SUMMARY → CONCEPTS) with fatigue detection thresholds (85%/95%/98%) and fast character-based token estimation."
usedIn: "Used in RADXA AI Suite (edge inference + RAG + multi-agent orchestration)."
impact: "Made long sessions predictable by compressing older context aggressively only when needed, while keeping fresh context at full fidelity for response quality."
pubDate: 2026-02-28
category: "local-ai"
tags: ["context-window", "summarization", "edge-ai", "rag", "agents"]
draft: false
---

## Situation
On an edge device, you have two constraints at the same time:
* The model has a hard context window.
* The system has a hard RAM/latency budget.

If you stream-chat for long enough, you'll eventually hit one of them unless you treat context as a managed resource.

## The Core Idea: Fold, Don't Just Slide
Instead of a simple sliding window, RADXA AI Suite documents a 4-level context hierarchy:

```python
class ContextLevel(Enum):
    RAW = 0          # 100% - Recent messages, full fidelity
    DETAILED = 1     # 50%  - Older messages with key details
    SUMMARY = 2      # 25%  - Summarized content
    CONCEPTS = 3     # 10%  - Core concepts only
```

This gives you a structured way to keep what matters:
* New messages stay verbatim (`RAW`).
* Older history collapses to summaries and concepts when budgets tighten.

## Fatigue Detection (When To Fold)
The suite uses explicit thresholds to decide when to compress or prune:

* `0.85`: warning zone
* `0.95`: force compression
* `0.98`: emergency prune

This avoids "hard crash" behavior at 100% context usage by acting early and predictably.

## Token Estimation Without Tokenizers
To keep streaming UX responsive, the documented approach uses a character heuristic instead of running a tokenizer on every request:
* English: ~4 chars/token
* CJK: ~2 chars/token
* Code: ~3.5 chars/token

It’s fast enough to run on every request and accurate enough to drive the folding decisions.

## Why This Works
This design is explicitly aimed at the "lost in the middle" failure mode of long contexts:
* Preserve the beginning/end of context where models tend to use information best.
* Compress the middle first, rather than discarding it blindly.
* Make the folding actions testable and observable (levels + thresholds) instead of ad-hoc.

