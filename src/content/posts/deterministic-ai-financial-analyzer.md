---
title: "Engineering a Deterministic AI Financial Analyzer"
description: "Techniques for forcing LLMs to output reliable JSON, offloading math to the client, and performing zero-shot categorization in a personal finance app."
situation: "A personal finance application required an AI feature to categorize transactions globally and generate personalized financial summaries."
issue: "LLMs are notoriously bad at math and often fail to return strictly formatted JSON, breaking client-side parsing. Furthermore, passing thousands of raw transactions to an LLM is slow and expensive."
solution: "Offloaded mathematical computations to the client, injected pre-computed hints into the system prompt, and utilized strict JSON-object response formats with zero-shot categorization definitions."
usedIn: "Used in the serverless backend of an AI-driven personal finance and budgeting application."
impact: "Improved JSON parse reliability, reduced token usage by minimizing raw data transfer, and eliminated LLM math hallucinations by treating calculations as deterministic inputs."
pubDate: 2026-02-21
category: "ai"
tags: ["llm", "fintech", "prompt-engineering", "nodejs"]
draft: false
---

## Situation
Building an AI assistant for personal finance requires absolute precision. If an LLM miscalculates a user's savings rate or formats its response improperly, the application crashes or displays dangerous misinformation. 

In this scenario, the AI needed to act as an "Expert Personal Financial Advisor," categorizing bulk transactions and providing strategic insights without hallucinating numbers.

## The Problem with LLM Math
Large Language Models generate text based on probabilities; they do not inherently "calculate" math. If you give an LLM a list of 50 transactions and ask it for the total spend, it will likely guess a number that *looks* plausible but is entirely wrong.

## 1. The Pre-Computed Hint Pattern
To solve the math hallucination issue, the architecture was flipped. The LLM is never asked to do math. 

Instead, the client application (or a deterministic backend script) calculates the exact financial metrics—such as "Spending Velocity", "Total Income", and "Savings Rate"—*before* the AI is called. 

These exact numbers are injected into the system prompt as `computed_hints`. 

```javascript
// Example of injected computed hints
let computedHintsContext = "";
if (data.computed_hints) {
    computedHintsContext = `
    FACTS YOU MUST USE:
    - User has spent $1,200 out of $2,000 budget.
    - Savings rate is exactly 15%.
    `;
}
```
The LLM is instructed to use these exact figures to generate its narrative, completely eliminating mathematical errors.

## 2. Enforcing Strict JSON Outputs
To ensure the client application can parse the AI's response, the prompt engineering must be ruthless. 

1.  **JSON Structure Definition:** The exact expected JSON schema is baked directly into the system prompt.
2.  **API Enforcements:** The API call enforces `response_format: { type: "json_object" }` on OpenAI-compatible chat APIs that support it.
3.  **Server-Side Scrubbing:** Even with strict prompting, models sometimes wrap their output in markdown (e.g., ` ```json `). A robust backend scrubber removes these markdown blocks and extracts the string from the first `{` to the last `}` before returning it to the client.

## 3. Zero-Shot Bulk Categorization
Categorizing transactions (e.g., "Uber Eats", "Tesco", "Steam") globally requires broad context. 

Instead of training a custom classification model, a zero-shot prompt approach was used. The prompt dynamically injects the user's available categories alongside explicit rules:

*   **International Awareness:** Explicit instructions to recognize global brands.
*   **Context Inference:** Rules for guessing (e.g., if it contains "Bistro", default to "Restaurant").
*   **Hard Overrides:** Specific keywords ("Vanguard", "BlackRock") are strictly hardcoded to route to "Investments" regardless of other context.

By combining pre-computed mathematics, aggressive JSON scrubbing, and highly structured zero-shot prompting, the backend transforms a probabilistic LLM into a highly deterministic financial engine.

<!-- portfolio:expanded-v2 -->

## Architecture Diagram
![Engineering a Deterministic AI Financial Analyzer execution diagram](/images/diagrams/post-framework/ai-pipeline.svg)

This diagram supports **Engineering a Deterministic AI Financial Analyzer** and highlights where controls, validation, and ownership boundaries sit in the workflow.

## Post-Specific Engineering Lens
For this post, the primary objective is: **Balance model quality with deterministic runtime constraints.**

### Implementation decisions for this case
- Chose a staged approach centered on **llm** to avoid high-blast-radius rollouts.
- Used **fintech** checkpoints to make regressions observable before full rollout.
- Treated **prompt-engineering** documentation as part of delivery, not a post-task artifact.

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

