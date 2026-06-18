---
title: "Optimizing DeepSeek KV Cache for Serverless AI Pipelines"
description: "How splitting a monolithic system prompt into static and per-session layers improved KV cache hit rates from 63% to 82% and reduced input costs by 33% on a production Firebase Functions app."
pubDate: "2026-06-18"
category: ["ai", "kotlin"]
tags: ["LLM", "DeepSeek", "Firebase", "Optimization", "Architecture"]
heroImage: "/images/diagrams/post-framework/architecture-placeholder.png"
---

<div style="margin: 1.5rem 0; padding: 1rem 1.25rem; background: linear-gradient(135deg, rgba(59,130,246,0.08), rgba(99,102,241,0.06)); border: 1px solid rgba(99,102,241,0.2); border-radius: 0.5rem; display: flex; align-items: center; justify-content: space-between; gap: 1rem; flex-wrap: wrap;">
  <span style="font-size: 0.85rem; color: var(--accent); font-weight: 600; letter-spacing: 0.01em;">Get IntelliAuto</span>
  <a href="https://play.google.com/store/apps/details?id=com.barrysoft.IntelliAuto" target="_blank" rel="noopener noreferrer" style="display: inline-block; transition: transform 0.15s ease, opacity 0.15s ease;" onmouseover="this.style.transform='scale(1.06)'" onmouseout="this.style.transform='scale(1)'">
    <img src="https://play.google.com/intl/en_us/badges/static/images/badges/en_badge_web_generic.png" alt="Get it on Google Play" style="height: 80px; object-fit: contain; display: block;" />
  </a>
</div>

When running LLMs in production via serverless pipelines (like Firebase Cloud Functions calling the DeepSeek API), input context window sizes can quickly escalate. For [IntelliAuto](/projects/intelliauto), our AI Mechanic Assistant, a typical query sends ~2,800 tokens consisting of system rules, vehicle context, maintenance history, and the user's question.

DeepSeek's API provides automatic disk-based KV caching, which is **50x cheaper** for cache hits ($0.0028/1M tokens) than misses ($0.14/1M tokens).

However, I noticed our cache hit rates were stuck around **63%**, which is good, but far from optimal for a highly structured app. This post details how a simple architectural change—splitting the system prompt into static and session-specific layers—boosted our cache hit rate to **82%** and reduced input costs by **33%** without changing any model behavior.

## The Problem: The Monolithic System Prompt

Previously, the Firebase backend constructed a single `systemPrompt` string that concatenated everything:

1. **Static Rules:** The AI's persona, formatting rules, JSON schema, and constraints.
2. **Vehicle Data:** The car's make/model, VIN, purchase history, and maintenance records.
3. **Dynamic Context:** The exact current date/timestamp, active reminders, and precise resolver output for the current question.

This created a massive ~2,315-token block that was sent as a single `system` message before the conversation history and user question.

### Why this breaks the cache

DeepSeek's KV cache works via **prefix matching**. If a subsequent request's prefix fully matches a previously cached "cache prefix unit", it hits the cache.

But because **vehicle-specific data** was interleaved with **static rules** inside a single message, the prefix was unique per user.
Furthermore, even the examples inside the static rules contained interpolated data (e.g., _"A tus 85.000 km, yo revisaría..."_ instead of just _"A tus km..."_).

Because of this, the cache could only hit within the exact same conversation, and even then, only partially. The static rules could never be shared across different users.

## The Solution: Layered Context Splitting

The fix involved dissecting the monolithic system prompt into distinct layers to maximize byte-identical prefix sharing.

Here is the revised architecture:

1. **Static System Prompt (~1,791 tokens):** Contains _only_ the role, rules, style, and output format. Every interpolated vehicle variable was replaced with generic placeholders. **This is now 100% identical for all users of the same language.**
2. **Session Context (~523 tokens):** Contains the vehicle info and history overview. **This is unique per vehicle, but stable across a single conversation.**
3. **Conversation History (~200 tokens):** The past turns.
4. **Dynamic Context (~280 tokens):** Time-sensitive data, appended as a new `system` message _after_ history.
5. **User Question (~15 tokens).**

### Code Example (Conceptual)

Instead of one giant block, the API message array is structured to allow the cache to persist the static prefix cross-user, and the session prefix cross-turn:

```javascript
const apiMessages = [
  { role: "system", content: staticSystemPrompt }, // Layer 1: STATIC (cross-user cache hit)
  { role: "system", content: sessionContextPrompt }, // Layer 2: SESSION (per-session cache hit)
  ...conversationHistory, // Layer 3: HISTORY (miss)
  { role: "system", content: dynamicContextPrompt }, // Layer 4: DYNAMIC (miss)
  { role: "user", content: userQuestion }, // Layer 5: QUESTION (miss)
];
```

## The Results

By simply reordering how the context is provided to the API and generalizing a few example strings:

- **Cache Hit Rate:** Increased from ~63% to **82%** per request (at a 4-turn depth).
- **Cross-User Caching:** The 1,791-token static prompt is now shared across _all_ users, drastically reducing cold-start costs for new sessions.
- **Input Cost Reduction:** Reduced by **33%** (from ~$0.22 to ~$0.15 per 1,000 requests).

### Token Breakdown Analysis

| Cache Layer         | Behavior    | Tokens | Why it works                                              |
| :------------------ | :---------- | -----: | :-------------------------------------------------------- |
| **Static rules**    | ✅ Full Hit | ~1,791 | Separate prefix unit, identical across all users.         |
| **Session context** | ✅ Full Hit |   ~523 | Separate prefix unit, stable per conversation.            |
| **History**         | ❌ Miss     |   ~198 | Dynamic context injected after history breaks the prefix. |
| **Dynamic context** | ❌ Miss     |   ~279 | Changes every single question.                            |
| **User question**   | ❌ Miss     |    ~15 | Unique per request.                                       |

### Why History Misses

You might wonder why the conversation history itself doesn't cache. It's because the **Dynamic Context** (current date, specific API resolver data) must be injected _after_ the history so the model has the most up-to-date context for the immediate question. Because this dynamic block changes every turn, the prefix sequence at the end of the history is never the same twice.

While it might be possible to optimize this further (e.g., placing dynamic context as a suffix in the user message), the current 82% hit rate represents the optimal balance of massive cost savings without altering the application's logic or behavior.

## Conclusion

When building serverless LLM pipelines, don't just dump all context into a single template literal. Treat your prompt like a compiled binary: **put the static, unchanging data first**, group the session-stable data next, and keep the highly dynamic data at the very end.

With APIs like DeepSeek providing massive discounts for cache hits, structuring your prompt for prefix-matching is one of the highest ROI optimizations you can make.
