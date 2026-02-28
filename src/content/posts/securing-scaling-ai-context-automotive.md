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

<!-- portfolio:expanded-v1 -->

## Architecture Diagram
![Securing and Scaling AI Context in an Automotive Assistant supporting diagram](/images/diagrams/post-framework/ai-pipeline.svg)

This visual summarizes the implementation flow and control points for **Securing and Scaling AI Context in an Automotive Assistant**.

## Deep Dive
This case is strongest when explained as an execution narrative instead of only a command sequence. The core focus here is **quality thresholds, data normalization, and safe model integration**, with decisions made to keep implementation repeatable under production constraints.

### Design choices
- Preferred deterministic configuration over one-off remediation to reduce variance between environments.
- Treated **llm** and **security** as the main risk vectors during implementation.
- Kept rollback behavior explicit so operational ownership can be transferred safely across teams.

### Operational sequence
1. Capture representative data.
2. Normalize and validate schema.
3. Run model task with constraints.
4. Review output quality and fallback behavior.

## Validation and Evidence
Use this checklist to prove the change is production-ready:
- Baseline metrics captured before execution (latency, error rate, resource footprint, or service health).
- Post-change checks executed from at least two viewpoints (service-level and system-level).
- Failure scenario tested with a known rollback path.
- Runbook updated with final command set and ownership boundaries.

## Risks and Mitigations
| Risk | Why it matters | Mitigation |
|---|---|---|
| Configuration drift | Reduces reproducibility across environments | Enforce declarative config and drift checks |
| Hidden dependency | Causes fragile deployments | Validate dependencies during pre-check stage |
| Observability gap | Delays incident triage | Require telemetry and post-change verification points |

## Reusable Takeaways
- Convert one successful fix into a reusable delivery pattern with clear pre-check and post-check gates.
- Attach measurable outcomes to each implementation step so stakeholders can validate impact quickly.
- Keep documentation concise, operational, and versioned with the same lifecycle as code.

