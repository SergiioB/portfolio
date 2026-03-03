---
title: "Building an AI Document Processing Pipeline: Extraction, Normalization, and Fine-Tuning"
description: "A complete guide to processing unstructured documents—from Azure Document Intelligence extraction to LLM fine-tuning for complex normalization tasks."
situation: "Our team was building an insurance policy processing system that needed to extract structured data from PDFs in multiple languages (Spanish, German, English). The raw OCR output was messy: dates in various formats, European decimal notation, multilingual field labels, and inconsistent entity names."
issue: "Extracting data was only half the problem. The raw JSON from Azure Document Intelligence contained OCR noise, varied date formats (\"12 de agosto de 2024\", \"01/01/2025\", \"1st January 2025\"), European number formats (\"1.200.000,50 EUR\"), and entity names that needed canonical mapping. Building regex rules for every edge case became unmaintainable."
solution: "Implemented a three-stage pipeline: (1) Azure Document Intelligence for extraction, (2) deterministic rules for predictable normalization, and (3) fine-tuned LLM for complex edge cases. Created a comprehensive .jsonl training dataset with 50+ normalization examples."
usedIn: "Insurance policy processing for a document intelligence project handling Spanish, German, and English documents."
impact: "Achieved consistent, schema-compliant JSON output across all document languages. Reduced manual review time by 80% through automated normalization."
pubDate: 2026-03-03
category: "ai"
tags: ["azure", "document-intelligence", "llm", "fine-tuning", "data-normalization"]
draft: false
---

## Situation

When building an insurance policy processing system, I learned that extraction is only half the battle. Azure Document Intelligence could identify where the data was on the page, but the raw JSON output needed significant cleanup before it was useful.

The challenges were multifold:
- **Multilingual dates**: "12 de agosto de 2024", "15th September 2024", "01.01.2017"
- **European number formats**: "1.200.000,50 EUR" (periods as thousand separators, comma as decimal)
- **Entity name variations**: "HDI Global SE", "Aviva Insurance Ireland Designated Activity Company"
- **OCR noise**: Common character swaps, malformed tokens

This post documents the complete pipeline architecture—from extraction through fine-tuning.

---

## Stage 1: Azure Document Intelligence Extraction

### How Training Actually Works

The first misconception I had to unlearn: the TRAIN button is **global**, not per-document. Azure doesn't support incremental training.

When you press TRAIN, Azure trains on:
- Every document marked `LABELED` in your project
- Every field definition you've created
- Every annotation across the entire project

**The baking analogy**: Think of TRAIN as baking bread. You gather all ingredients (labeled docs), mix them (create dataset), and bake a new loaf (new model). You can't add ingredients to an already-baked loaf.

### Best Practices

1. **Batch labeling**: Label 50-100 documents before training
2. **Document status matters**: Only `LABELED` documents are included
3. **New model every time**: Each train creates a new model version
4. **Test before deploying**: Validate on held-out documents

---

## Stage 2: Deterministic Normalization

For predictable data types, use deterministic rules before reaching for ML.

### Common Normalization Tasks

| Input Type | Example Input | Normalized Output |
|------------|---------------|-------------------|
| European date | "12 de agosto de 2024" | `2024-08-12` |
| ISO date | "01/01/2025" | `2025-01-01` |
| European currency | "1.200.000,50 EUR" | `1200000.50, "EUR"` |
| Entity name | "HDI Global SE" | `HDI_GLOBAL_SE` |
| Property type | "Cold storage warehouse" | `WAREHOUSE_COLD_STORAGE` |

### Implementation Patterns

```javascript
// Example: Currency normalization
function normalizeCurrency(input) {
  // Remove thousand separators (periods in European format)
  // Convert decimal separator (comma to period)
  const cleaned = input
    .replace(/\./g, '')
    .replace(',', '.')
    .replace(/[^\d.]/g, '');
  
  const match = input.match(/EUR|USD|GBP/);
  return {
    amount: parseFloat(cleaned),
    currency: match ? match[0] : null
  };
}
```

---

## Stage 3: Fine-Tuning LLMs for Complex Normalization

When deterministic rules become brittle (too many edge cases, too many languages), fine-tuning an LLM becomes the maintainable solution.

### When to Choose Fine-Tuning

- Regex/rules fail on new document variations
- Multilingual content with unpredictable formats
- Need consistent, human-quality output across edge cases
- Converting messy JSON to strict canonical schema

### The .jsonl Training Format

Each line is a chat example with system/user/assistant messages:

```json
{"messages":[{"role":"system","content":"Normalize OCR noisy monetary formats to numeric values."},{"role":"user","content":"Sum insured: 1.200.000,50 EUR"},{"role":"assistant","content":"{\"buildings_sum_insured\":1200000.50,\"currency\":\"EUR\"}"}]}

{"messages":[{"role":"system","content":"Normalize dates with month names in Spanish to ISO format."},{"role":"user","content":"Fecha inicio: 12 de agosto de 2024"},{"role":"assistant","content":"{\"period_start\":\"2024-08-12\"}"}]}

{"messages":[{"role":"system","content":"Map property types to controlled vocabulary."},{"role":"user","content":"Property: Cold storage warehouse"},{"role":"assistant","content":"{\"property_type\":\"WAREHOUSE_COLD_STORAGE\"}"}]}
```

### Training Data Categories

From the insurance document processing project, we created training examples for:

1. **Monetary normalization**: European decimals, currency symbols, OCR noise
2. **Date parsing**: Spanish/German/English formats, word-based dates
3. **Entity mapping**: Insurer names, policy holders, addresses
4. **Categorical mapping**: Property types, risk categories, coverage types
5. **Address normalization**: Street, postal code, city, country extraction
6. **Premium breakdown**: Fire, liability, terrorism, tax, total

### The Fine-Tuning Process

1. **Create train.jsonl**: 200+ diverse examples
2. **Create validation.jsonl**: 50+ held-out examples
3. **Upload to Azure AI Foundry** (or OpenAI)
4. **Run supervised fine-tuning**
5. **Evaluate**: Exact match rate on validation set

---

## Stage 4: Deterministic Output Enforcement

Even fine-tuned models can produce malformed JSON. For production reliability:

### Pre-Computed Hints Pattern

Never ask LLMs to do math. Pre-compute and inject:

```javascript
const computedHints = `
FACTS YOU MUST USE:
- Total premium: €15,506.00
- Tax: €2,448.74
- Buildings sum insured: €720,738.74
`;

const messages = [
  { role: "system", content: `You are a policy normalization assistant. ${computedHints}` },
  { role: "user", content: rawExtraction }
];
```

### JSON Response Enforcement

```javascript
const response = await openai.chat.completions.create({
  model: "fine-tuned-model-id",
  messages,
  response_format: { type: "json_object" }
});

// Scrub markdown if present
const json = response.choices[0].message.content
  .replace(/```json\n?/g, '')
  .replace(/```\n?/g, '');
```

---

## Pipeline Architecture Summary

```
┌─────────────────────┐
│  PDF Document       │
│  (ES/DE/EN)         │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Azure Document      │
│ Intelligence        │ ──► Extraction model
│ (LABELED docs)      │     (batch training)
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Raw JSON            │
│ (OCR noise,         │
│  varied formats)    │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Deterministic       │
│ Rules Layer         │ ──► Dates, currencies, lookup tables
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Fine-Tuned LLM      │
│ Normalization       │ ──► Edge cases, multilingual
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Canonical JSON      │
│ (schema-validated)  │
└─────────────────────┘
```

---

## Quick Reference

| Stage | Tool | When to Use |
|-------|------|-------------|
| Extraction | Azure Document Intelligence | Structured forms, tables, mixed layouts |
| Simple normalization | Regex, lookup tables | Predictable formats, single language |
| Complex normalization | Fine-tuned LLM | Multilingual, edge cases, schema conversion |
| Math/premium | Pre-computed hints | Never trust LLM math |

<!-- portfolio:expanded-v2 -->

## Architecture Diagram
![AI Document Processing Pipeline](/images/diagrams/post-framework/ai-pipeline.svg)

This diagram shows the end-to-end document processing pipeline from raw PDF to canonical JSON.

## Post-Specific Engineering Lens
For this post, the primary objective is: **Transform unstructured documents into reliable, schema-compliant data.**

### Implementation decisions for this case
- Separated extraction from normalization for maintainability
- Used deterministic rules for predictable cases, LLM for edge cases
- Pre-computed all mathematical values to prevent hallucinations

### Practical command path
```bash
# Validate extraction
az storage blob upload --file sample.pdf --container docs

# Check training status
az cognitiveservices account show --name doc-intelligence

# Validate JSON output
jq '.' normalized_output.json
```

## Validation Matrix
| Validation goal | What to baseline | What confirms success |
|---|---|---|
| Extraction quality | Field recall on test set | F1 > 0.95 on key fields |
| Normalization accuracy | Exact match rate | > 98% on validation set |
| Schema compliance | JSON validation | All outputs pass schema validator |

## Failure Modes and Mitigations
| Failure mode | Why it appears | Mitigation |
|---|---|---|
| OCR noise propagation | Dirty input data | Add OCR correction examples to training |
| Model overfitting | Too few training examples | Maintain 200+ diverse examples |
| JSON parse failures | LLM adds markdown | Server-side scrubbing layer |
| Math hallucinations | LLM guessing numbers | Pre-compute all numeric values |

## Recruiter-Readable Impact Summary
- **Scope:** Insurance document processing, multilingual (ES/DE/EN)
- **Execution quality:** Three-stage pipeline with clear boundaries
- **Outcome signal:** 80% reduction in manual review, schema-compliant outputs