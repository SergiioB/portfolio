---
title: "Fine-Tuning LLMs for Complex Data Normalization"
description: "When regex and rules fail: How to use fine-tuned Large Language Models to normalize messy OCR data into canonical JSON."
situation: "During document intelligence and Generative AI implementation work, this case came from work related to \"Fine-Tuning LLMs for Complex Data Normalization.\""
issue: "Needed a repeatable way to use fine-tuned Large Language Models to normalize messy OCR data into canonical JSON."
solution: "Implemented a practical runbook/automation pattern with clear safety checks, execution steps, and verification points."
usedIn: "Used in enterprise AI initiatives where extracted data must be production-ready and governable."
impact: "Increased reliability of AI outputs and made downstream integration easier for business systems."
pubDate: 2026-02-19
category: "ai"
tags: ["llm", "fine-tuning", "data-engineering", "json"]
draft: false
---

## Situation
In document processing pipelines (like extracting data from insurance policies using OCR), you eventually hit a wall with deterministic normalization rules. 

Regex works great for standard dates, but what happens when the OCR outputs `"Premium payable: vierteljährlich"` (German for quarterly), or `"Sum insured: 1.200.000,50 EUR"`, or `"Coverage starts at 00:00 on 12 de agosto de 2024"`? 

Building lookup tables and parsers for every possible language, typo, and formatting quirk becomes unmaintainable. This is where fine-tuning a Large Language Model (LLM) becomes the most efficient solution for data normalization.

## Task 1 – When to Choose Fine-Tuning

You should consider fine-tuning an LLM when:
1.  You need consistent, human-quality normalization across many unpredictable edge cases.
2.  Your deterministic rules (regex, parsers) have become too brittle and are constantly failing on new document variations.
3.  You need to convert raw, messy extraction JSON into a strict, canonical JSON schema.

## Task 2 – Preparing the Training Data (.jsonl)

To fine-tune an LLM, you don't write code; you provide examples. You create a `.jsonl` (JSON Lines) file where each line represents a single training example formatted as a chat conversation.

The format typically includes a `system` prompt defining the task, a `user` prompt containing the raw input, and the `assistant` response containing the perfect, normalized JSON output.

Here are real examples of how to train the model to handle complex normalization:

**1. Normalizing noisy numeric formats (European decimals):**
```json
{"messages":[{"role":"system","content":"Normalize OCR noisy monetary formats to numeric values."},{"role":"user","content":"Sum insured: 1.200.000,50 EUR"},{"role":"assistant","content":"{"buildings_sum_insured":1200000.50,"currency":"EUR"}"}]}
```

**2. Translating and standardizing dates to ISO format:**
```json
{"messages":[{"role":"system","content":"Normalize dates with month names in Spanish to ISO format."},{"role":"user","content":"Fecha inicio: 12 de agosto de 2024"},{"role":"assistant","content":"{"period_start":"2024-08-12"}"}]}
```

**3. Mapping natural language to controlled enumerations (Enums):**
```json
{"messages":[{"role":"system","content":"Extract and normalize 'premium cadence' values."},{"role":"user","content":"Premium cadence: vierteljährlich"},{"role":"assistant","content":"{"premium_cadence":"QUARTERLY"}"}]}
```

## Task 3 – The Fine-Tuning Process

1.  **Supervised Fine-Tuning:** You upload your `train.jsonl` (containing hundreds of these examples) to your AI platform (like Azure AI Foundry).
2.  **Validation:** You also provide a `validation.jsonl` file containing different examples the model hasn't seen. The platform uses this to ensure the model is learning the *concept* of normalization, not just memorizing the training data (overfitting).
3.  **Evaluation:** Once trained, you evaluate the model against strict domain metrics: Does the output JSON perfectly match your schema? Are the numeric values mathematically correct?

## The Result

By putting the fine-tuned LLM at the end of your extraction pipeline, you replace hundreds of lines of brittle parsing code with a single, intelligent API call. The LLM receives the raw OCR text and reliably outputs structured, validated data ready for your database.

<!-- portfolio:expanded-v2 -->

## Architecture Diagram
![Fine-Tuning LLMs for Complex Data Normalization execution diagram](/portfolio/images/diagrams/post-framework/ai-pipeline.svg)

This diagram supports **Fine-Tuning LLMs for Complex Data Normalization** and highlights where controls, validation, and ownership boundaries sit in the workflow.

## Post-Specific Engineering Lens
For this post, the primary objective is: **Balance model quality with deterministic runtime constraints.**

### Implementation decisions for this case
- Chose a staged approach centered on **llm** to avoid high-blast-radius rollouts.
- Used **fine-tuning** checkpoints to make regressions observable before full rollout.
- Treated **data-engineering** documentation as part of delivery, not a post-task artifact.

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

