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

<!-- portfolio:expanded-v1 -->

## Architecture Diagram
![Fine-Tuning LLMs for Complex Data Normalization supporting diagram](/images/diagrams/post-framework/ai-pipeline.svg)

This visual summarizes the implementation flow and control points for **Fine-Tuning LLMs for Complex Data Normalization**.

## Deep Dive
This case is strongest when explained as an execution narrative instead of only a command sequence. The core focus here is **quality thresholds, data normalization, and safe model integration**, with decisions made to keep implementation repeatable under production constraints.

### Design choices
- Preferred deterministic configuration over one-off remediation to reduce variance between environments.
- Treated **llm** and **fine-tuning** as the main risk vectors during implementation.
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

