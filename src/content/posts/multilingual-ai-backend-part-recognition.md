---
title: "Building a Multilingual AI Backend for Part Recognition"
description: "How to handle multi-language AI queries to provide accurate predictions and generate tailored localized search queries in a serverless environment."
situation: "During the development of an automotive maintenance application, a need arose to support users entering data in multiple languages (Spanish, English, French) while keeping backend logic unified."
issue: "The backend AI needed to recognize user intent and categorize vehicle parts accurately regardless of the input language, and subsequently generate both localized predictive maintenance responses and tailored affiliate search queries."
solution: "Implemented comprehensive multi-language keyword dictionaries, extracted user language context directly from client requests, and used mapping dictionaries to serve localized response templates."
usedIn: "Used in a serverless Node.js backend to manage AI-driven logic for a mobile application."
impact: "Allowed seamless scaling to new markets without duplicating the core predictive algorithms, maintaining a single source of truth for part categorization."
pubDate: 2026-02-14
category: "ai"
tags: ["nodejs", "multilingual", "llm", "architecture"]
draft: false
---

## Situation
When building AI features that analyze user-provided text, supporting multiple languages often introduces immense complexity. For an automotive maintenance application, users could enter service records in Spanish, English, or French. 

The backend needed to parse these records, identify exactly which parts were serviced (e.g., "spark plugs", "bujías", "bougies"), and provide predictive maintenance advice. It also needed to generate precise product search queries for an affiliate program—all matched perfectly to the user's native language.

## The Challenge
Directly translating user input on the fly is slow, expensive, and often inaccurate for technical automotive terms. Conversely, maintaining entirely separate backend logic branches for each language becomes a maintenance nightmare.

The core algorithm needed to be language-agnostic while the inputs and outputs remained language-specific.

## Implementation Patterns

### 1. Unified Multilingual Keyword Dictionaries
Instead of translating on the fly, the solution involved creating a comprehensive dictionary mapping specific entities to their translations across all supported languages.

```javascript
const PART_KEYWORDS = {
  SPARK_PLUGS: {
    es: ["bujía", "bujias", "encendido"],
    en: ["spark plug", "spark plugs", "ignition"],
    fr: ["bougie", "bougies", "allumage"]
  },
  // ... other parts
};
```
This allows the backend to cross-match any incoming text against all known variations, identifying the *canonical* part ID (`SPARK_PLUGS`) regardless of the input language.

### 2. Parameter Extraction and Defaulting
The client application was updated to include the user's locale in every request payload. The serverless functions extract this parameter, falling back to a default if missing.

```javascript
// Extract language from request with 'es' as default
const { question, vehicleContext, previousMessages, records, language = 'es' } = request.data;
```

### 3. Localized Response Mapping
Once the AI logic completes its assessment using the canonical part IDs, the final step is formatting the output. A response dictionary uses the canonical ID and the extracted `language` parameter to return the correct string.

| Service | Spanish | English | French |
|---------|---------|---------|--------|
| Spark Plugs (due) | "Cambiadas hace X km..." | "Changed X km ago..." | "Changées il y a X km..." |
| Timing Belt (critical) | "⚠️ CRÍTICO: Último cambio..." | "⚠️ CRITICAL: Last change..." | "⚠️ CRITIQUE: Dernier changement..." |

### 4. Dynamic Affiliate Queries
For monetization, the app dynamically generates search queries for automotive parts. Using the same localized dictionaries, the backend constructs highly targeted queries:

*   **ES:** `"Bujías Ford Focus 2018"`
*   **EN:** `"Spark plugs Ford Focus 2018"`
*   **FR:** `"Bougies Ford Focus 2018"`

This approach kept the core predictive logic clean and language-agnostic while delivering a fully localized experience to the end user.