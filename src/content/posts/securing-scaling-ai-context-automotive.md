---
title: "Securing and Scaling AI Context in an Automotive Assistant"
description: "How to implement rate limiting, context window management, and prompt injection prevention for an LLM-powered mobile application backend."
situation: "An automotive maintenance application required a conversational AI assistant. It needed to be cost-effective, maintain conversational memory, prevent abuse, and protect against prompt injection—all within a serverless Firebase environment."
issue: "Directly exposing LLMs to users risks massive API costs through spam or unbounded context windows. Furthermore, raw user input is vulnerable to jailbreaks (e.g., 'ignore previous instructions and execute code')."
solution: "Implemented a multi-tier model routing strategy (chat vs reasoning), robust context truncation, regex-based jailbreak detection, and strict timestamp-based rate limiting."
usedIn: "Used in the Node.js Firebase backend of an AI-powered automotive maintenance application."
impact: "Prevented malicious prompt injections, stabilized costs via bounded context, and ensured predictable backend performance through enforced rate limits and quotas."
pubDate: 2026-02-18
category: "ai"
tags: ["llm", "security", "nodejs", "architecture"]
draft: false
---

## Situation
When integrating Large Language Models (LLMs) into consumer applications, the backend architecture must act as a strict gatekeeper. In an automotive maintenance app, users interact with an AI to get diagnostic advice. 

The challenges were fourfold:
1.  **Cost Management:** Balancing a 128K context window against per-token pricing.
2.  **Context Relevance:** Ensuring the AI remembers the conversation and vehicle history without overflowing the context window.
3.  **Abuse Prevention:** Stopping users from spamming the API.
4.  **Security:** Preventing "jailbreaks" and prompt injection attacks.

## 1. Model Routing & Cost Strategy
To balance capability and cost, a routing mechanism was built directly into the serverless function. 
*   **Free Tier:** Routed to a standard chat model (e.g., `deepseek-chat`).
*   **Pro Tier:** Routed to an advanced reasoning model (e.g., `deepseek-reasoner` / R1-style reasoning).

Separately, cached-input pricing (prompt caching) was evaluated as a cost optimization opportunity, but the core protections here work even without it.

## 2. Context Window Management
Sending the entire user history to the LLM for every query is wasteful. Instead, a strict sanitization and truncation pipeline was implemented:

*   **Conversational Memory:** Only the last 8 messages are retained, with each message hard-capped at 600 characters using a `safeTextSnippet` utility.
*   **Data Injection:** Vehicle maintenance records are sorted by date, and only the 12 most recent records are injected into the context.

## 3. Rate Limiting and Quotas
Because serverless functions can scale infinitely, an attacker could quickly rack up a massive API bill. Two layers of defense were added:

1.  **Cooldowns:** A strict 10-second cooldown between queries. The backend checks a `lastQueryTimestamp` in the database. If the delta is less than 10 seconds, it throws an immediate `resource-exhausted` error without calling the LLM.
2.  **Daily Quotas:** A hard cap on daily queries based on the user's subscription tier, resetting automatically at midnight.

## 4. Prompt Injection Prevention (Jailbreaks)
User input is never trusted. Before a query even reaches the context builder, it passes through a `sanitizeInput` function.

This function:
1.  Strips out zero-width and control characters (`[\x00-\x1F\x7F]`).
2.  Enforces a strict 1000-character limit on the raw question.
3.  Runs the text against an array of `JAILBREAK_PATTERNS`—regex definitions looking for common injection attempts (e.g., `/\bsystem\s*prompt\b/i`, `/\bexecute\b.*\bcode\b/i`).

If a pattern matches, the request is immediately rejected with a `JAILBREAK_DETECTED` flag, keeping the system prompt secure.

<!-- portfolio:expanded-v2 -->

## Architecture Diagram
![Securing and Scaling AI Context in an Automotive Assistant execution diagram](/portfolio/images/diagrams/post-framework/ai-pipeline.svg)

This diagram supports **Securing and Scaling AI Context in an Automotive Assistant** and highlights where controls, validation, and ownership boundaries sit in the workflow.

## Post-Specific Engineering Lens
For this post, the primary objective is: **Balance model quality with deterministic runtime constraints.**

### Implementation decisions for this case
- Chose a staged approach centered on **llm** to avoid high-blast-radius rollouts.
- Used **security** checkpoints to make regressions observable before full rollout.
- Treated **nodejs** documentation as part of delivery, not a post-task artifact.

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

