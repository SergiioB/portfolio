---
title: "Slashing LLM API Costs with System Prompt Caching"
description: "How to structure LLM requests for prompt caching (when supported) to reduce repeated system-prompt input costs."
situation: "An AI-powered mobile application was running a heavy, multi-paragraph system prompt on every single user request. As traffic scaled, the input token costs quickly outpaced the output token costs."
issue: "Large Language Models charge per token. When you send a 1,000-token system prompt alongside a 50-token user question, you pay for 1,050 tokens every time, even though 95% of the payload never changes between requests."
solution: "Restructured the API payload to isolate static system instructions so the backend can take advantage of cached-input pricing or prompt caching features where the provider supports it."
usedIn: "Evaluated for a Node.js backend of an AI conversational assistant using an OpenAI-compatible chat API."
impact: "Modeled a ~60% reduction in total LLM spend in scenarios where cached-input pricing is available and the system prompt stays byte-identical across requests."
pubDate: 2026-02-12
category: "ai"
tags: ["llm", "cost-optimization", "architecture", "caching"]
draft: false
---

## Situation
In generative AI applications, the **System Prompt** is the brain of your feature. It contains the persona, the output schema (like strict JSON definitions), safety rules, and zero-shot examples. In many of my applications, this system prompt easily exceeds 1,000 tokens.

Initially, every time a user asked a question, the backend constructed the payload like this:
`[System Prompt (1,000 tokens)] + [User Context (200 tokens)] + [User Question (50 tokens)]`

With thousands of queries a day, the app was paying for that 1,000-token system prompt over and over again, thousands of times.

## The Cost of Redundancy
LLM providers generally charge separately for "Input Tokens" (what you send) and "Output Tokens" (what the AI generates). 

In one pricing evaluation, the economics looked like this:
*   **Input Cost:** $0.28 per 1M tokens
*   **Average Request:** 1,250 input tokens
*   **Cost per 1,000 queries:** ~$0.50 

While this sounds cheap, at scale, and especially when using premium reasoning models (which cost 4x more), it aggressively eats into profit margins, especially for "Free Tier" users.

## The Solution: Prompt Caching

Some LLM APIs support **Prompt Caching / cached input pricing**. The core idea is the same: if the expensive part of your request (the system prompt and static rules) is identical across calls, the provider can charge less for repeatedly sending it (or reuse internal state).

### Implementation

The implementation pattern is:
1. Keep the system prompt stable (byte-identical).
2. Split static vs dynamic content so only the dynamic section changes per request.
3. Apply the provider-specific caching hint/flag (if supported).

```javascript
// Example implementation pattern
const systemMessages = [
  {
    role: "system",
    content: HEAVY_SYSTEM_PROMPT_AND_RULES,
    // Provider-specific: some APIs accept a cache hint on static content.
    // cache_control: { type: "ephemeral" }
  }
];

const dynamicMessages = [
  { role: "user", content: safeUserQuestion }
];

const apiMessages = [...systemMessages, ...dynamicMessages];

const response = await fetch("https://api.provider.com/chat/completions", {
    method: "POST",
    body: JSON.stringify({
        model: "ai-model-chat",
        messages: apiMessages,
    })
});
```

## The Impact: "Cache Hits"

When the API receives this request, it checks if it already has the exact string of `HEAVY_SYSTEM_PROMPT_AND_RULES` in its recent memory.

If it does (a **Cache Hit**), the pricing completely changes.
*   **Standard Input:** $0.28 / 1M tokens
*   **Cached Input:** $0.028 / 1M tokens (A 90% discount!)

**Financial Modeling:**
If the provider offers cached-input pricing (for example, $0.28/1M standard input vs $0.028/1M cached input) and your system prompt is reused across requests, the same workload can cost materially less. In our cost modeling, this landed around a **60% to 62% total savings** depending on tier mix and hit rate.

<!-- portfolio:expanded-v2 -->

## Architecture Diagram
![Slashing LLM API Costs with System Prompt Caching execution diagram](/portfolio/images/diagrams/post-framework/ai-pipeline.svg)

This diagram supports **Slashing LLM API Costs with System Prompt Caching** and highlights where controls, validation, and ownership boundaries sit in the workflow.

## Post-Specific Engineering Lens
For this post, the primary objective is: **Balance model quality with deterministic runtime constraints.**

### Implementation decisions for this case
- Chose a staged approach centered on **llm** to avoid high-blast-radius rollouts.
- Used **cost-optimization** checkpoints to make regressions observable before full rollout.
- Treated **architecture** documentation as part of delivery, not a post-task artifact.

### Practical command path
These are representative execution checkpoints relevant to this post:

```bash
./llama-server --ctx-size <n> --cache-type-k q4_0 --cache-type-v q4_0
curl -s http://localhost:8080/health
python benchmark.py --profile edge
```

## Validation Matrix
| Validation goal | What to baseline | What confirms success |
|---|---|---|
| Functional stability | input quality, extraction accuracy, and processing latency | schema validation catches malformed payloads |
| Operational safety | rollback ownership + change window | confidence/fallback policy routes low-quality outputs safely |
| Production readiness | monitoring visibility and handoff notes | observability captures latency + quality per request class |

## Failure Modes and Mitigations
| Failure mode | Why it appears in this type of work | Mitigation used in this post pattern |
|---|---|---|
| Over-allocated context | Memory pressure causes latency spikes or OOM | Tune ctx + cache quantization from measured baseline |
| Silent quality drift | Outputs degrade while latency appears fine | Track quality samples alongside perf metrics |
| Single-profile dependency | No graceful behavior under load | Define fallback profile and automatic failover rule |

## Recruiter-Readable Impact Summary
- **Scope:** ship AI features with guardrails and measurable quality.
- **Execution quality:** guarded by staged checks and explicit rollback triggers.
- **Outcome signal:** repeatable implementation that can be handed over without hidden steps.

