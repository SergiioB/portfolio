---
title: "Training Custom AI Models for Insurance Document Processing"
description: "How to build, train, and deploy custom document intelligence models for extracting structured data from multilingual insurance policies using Azure AI Foundry."
situation: "Insurance policy processing required manual data extraction from PDFs in multiple languages (Spanish, German, English). Each policy had different formats, fields varied by insurer, and manual processing was slow and error-prone."
usedIn: "Document processing pipeline for insurance policies, claims processing, and compliance verification in a regulated financial environment."
impact: "Reduced manual processing time by 90%, achieved 95%+ field extraction accuracy, and enabled automated policy validation against business rules."
pubDate: 2026-03-03
category: "ai"
tags: ["azure-ai", "document-intelligence", "machine-learning", "automation", "multilingual"]
draft: false
---

## Document Intelligence Pipeline Architecture

```svg
<svg viewBox="0 0 900 700" xmlns="http://www.w3.org/2000/svg">
  <!-- Background -->
  <rect width="900" height="700" fill="#f8fafc"/>

  <!-- Title -->
  <text x="450" y="35" text-anchor="middle" font-family="Arial" font-size="18" font-weight="bold" fill="#1e293b">
    AI Document Intelligence Pipeline for Insurance Policies
  </text>

  <!-- Input Documents -->
  <g transform="translate(30, 60)">
    <rect x="0" y="0" width="180" height="120" rx="8" fill="#fee2e2" stroke="#dc2626" stroke-width="2"/>
    <text x="90" y="25" text-anchor="middle" font-family="Arial" font-size="13" font-weight="bold" fill="#991b1b">Input Documents</text>

    <rect x="15" y="40" width="150" height="20" rx="3" fill="#ffffff" stroke="#94a3b8"/>
    <text x="90" y="54" text-anchor="middle" font-family="Arial" font-size="9" fill="#334155">Spanish Policies</text>

    <rect x="15" y="65" width="150" height="20" rx="3" fill="#ffffff" stroke="#94a3b8"/>
    <text x="90" y="79" text-anchor="middle" font-family="Arial" font-size="9" fill="#334155">German Policies</text>

    <rect x="15" y="90" width="150" height="20" rx="3" fill="#ffffff" stroke="#94a3b8"/>
    <text x="90" y="104" text-anchor="middle" font-family="Arial" font-size="9" fill="#334155">English Policies</text>
  </g>

  <!-- Arrow -->
  <path d="M 220 120 L 260 120" stroke="#64748b" stroke-width="2" marker-end="url(#arrow)"/>

  <!-- Azure Document Intelligence -->
  <g transform="translate(270, 60)">
    <rect x="0" y="0" width="200" height="120" rx="8" fill="#dbeafe" stroke="#2563eb" stroke-width="2"/>
    <text x="100" y="25" text-anchor="middle" font-family="Arial" font-size="13" font-weight="bold" fill="#1e40af">Azure AI</text>
    <text x="100" y="45" text-anchor="middle" font-family="Arial" font-size="13" font-weight="bold" fill="#1e40af">Document Intelligence</text>

    <text x="100" y="70" text-anchor="middle" font-family="Arial" font-size="10" fill="#647489">Custom Neural Model</text>
    <text x="100" y="85" text-anchor="middle" font-family="Arial" font-size="10" fill="#647489">OCR + Layout Analysis</text>
    <text x="100" y="100" text-anchor="middle" font-family="Arial" font-size="10" fill="#647489">Multi-language Support</text>
  </g>

  <!-- Arrow -->
  <path d="M 480 120 L 520 120" stroke="#64748b" stroke-width="2" marker-end="url(#arrow)"/>

  <!-- Raw Extraction -->
  <g transform="translate(530, 60)">
    <rect x="0" y="0" width="180" height="120" rx="8" fill="#fef3c7" stroke="#d97706" stroke-width="2"/>
    <text x="90" y="25" text-anchor="middle" font-family="Arial" font-size="13" font-weight="bold" fill="#92400e">Raw Extraction</text>

    <text x="90" y="50" text-anchor="middle" font-family="Courier" font-size="9" fill="#334155">"74 004447-0016"</text>
    <text x="90" y="65" text-anchor="middle" font-family="Courier" font-size="9" fill="#334155">"12 de agosto de 2024"</text>
    <text x="90" y="80" text-anchor="middle" font-family="Courier" font-size="9" fill="#334155">"EUR 720,738.74"</text>
    <text x="90" y="95" text-anchor="middle" font-family="Courier" font-size="9" fill="#334155">"HDI Global SE"</text>
    <text x="90" y="110" text-anchor="middle" font-family="Arial" font-size="9" fill="#dc2626" font-style="italic">Needs normalization</text>
  </g>

  <!-- Arrow down -->
  <path d="M 620 190 L 620 240" stroke="#64748b" stroke-width="2" marker-end="url(#arrow)"/>

  <!-- Normalization Layer -->
  <g transform="translate(270, 250)">
    <rect x="0" y="0" width="340" height="140" rx="8" fill="#e0e7ff" stroke="#4f46e5" stroke-width="2"/>
    <text x="170" y="25" text-anchor="middle" font-family="Arial" font-size="14" font-weight="bold" fill="#3730a3">Normalization Layer</text>

    <!-- Normalization rules -->
    <g transform="translate(15, 40)">
      <text x="0" y="0" font-family="Courier" font-size="9" fill="#1e1b4b">normalize_currency(): "720,738.74" → 720738.74</text>
      <text x="0" y="20" font-family="Courier" font-size="9" fill="#1e1b4b">normalize_date(): "12 agosto 2024" → "2024-08-12"</text>
      <text x="0" y="40" font-family="Courier" font-size="9" fill="#1e1b4b">normalize_insurer(): "HDI Global SE" → "HDI GLOBAL SE"</text>
      <text x="0" y="60" font-family="Courier" font-size="9" fill="#1e1b4b">normalize_entity(): Uppercase canonical form</text>
      <text x="0" y="80" font-family="Courier" font-size="9" fill="#1e1b4b">normalize_addresses(): "Street, ZIP City, Country"</text>
      <text x="0" y="100" font-family="Courier" font-size="9" fill="#1e1b4b">normalize_arrays(): ["FIRE", "FLOOD", "THEFT"]</text>
      <text x="0" y="120" font-family="Courier" font-size="9" fill="#1e1b4b">normalize_objects(): {subsidence: 1240, ...}</text>
    </g>
  </g>

  <!-- Arrow down -->
  <path d="M 440 400 L 440 450" stroke="#64748b" stroke-width="2" marker-end="url(#arrow)"/>

  <!-- Canonical JSON Output -->
  <g transform="translate(120, 460)">
    <rect x="0" y="0" width="420" height="140" rx="8" fill="#d1fae5" stroke="#059669" stroke-width="2"/>
    <text x="210" y="25" text-anchor="middle" font-family="Arial" font-size="14" font-weight="bold" fill="#065f46">Canonical JSON Schema</text>

    <text x="20" y="50" text-anchor="left" font-family="Courier" font-size="9" fill="#064e3b">{</text>
    <text x="30" y="65" text-anchor="left" font-family="Courier" font-size="9" fill="#064e3b">"policy_id": "74-004447-0016",</text>
    <text x="30" y="80" text-anchor="left" font-family="Courier" font-size="9" fill="#064e3b">"policy_holder": "PANDION REAL ESTATE GMBH",</text>
    <text x="30" y="95" text-anchor="left" font-family="Courier" font-size="9" fill="#064e3b">"period_start": "2024-08-12",</text>
    <text x="30" y="110" text-anchor="left" font-family="Courier" font-size="9" fill="#064e3b">"period_end": "2025-05-31",</text>
    <text x="30" y="125" text-anchor="left" font-family="Courier" font-size="9" fill="#064e3b">"buildings_sum_insured": 720738.74,</text>
    <text x="30" y="140" text-anchor="left" font-family="Courier" font-size="9" fill="#064e3b">"currency": "EUR",</text>
    <text x="30" y="155" text-anchor="left" font-family="Courier" font-size="9" fill="#064e3b">"insurer": "HDI GLOBAL SE",</text>
    <text x="30" y="170" text-anchor="left" font-family="Courier" font-size="9" fill="#064e3b">"risks_insured": ["ALL_RISKS", "PROPERTY_OWNERS_LIABILITY"]</text>
    <text x="20" y="185" text-anchor="left" font-family="Courier" font-size="9" fill="#064e3b">}</text>
  </g>

  <!-- Arrow right -->
  <path d="M 550 530 L 590 530" stroke="#64748b" stroke-width="2" marker-end="url(#arrow)"/>

  <!-- Business Rules Validation -->
  <g transform="translate(600, 460)">
    <rect x="0" y="0" width="260" height="140" rx="8" fill="#fce7f3" stroke="#db2777" stroke-width="2"/>
    <text x="130" y="25" text-anchor="middle" font-family="Arial" font-size="13" font-weight="bold" fill="#9d174d">Business Rules</text>

    <text x="15" y="50" font-family="Arial" font-size="10" fill="#831843">✓ Policy ID format validation</text>
    <text x="15" y="70" font-family="Arial" font-size="10" fill="#831843">✓ Date logic (start &lt; end)</text>
    <text x="15" y="90" font-family="Arial" font-size="10" fill="#831843">✓ Sum insured &gt; 0</text>
    <text x="15" y="110" font-family="Arial" font-size="10" fill="#831843">✓ Premium calculation check</text>
    <text x="15" y="130" font-family="Arial" font-size="10" fill="#16a34a" font-weight="bold">→ Import to DB or Flag for Review</text>
  </g>

  <!-- Training Loop (dashed) -->
  <path d="M 470 120 C 470 20, 750 20, 750 120" stroke="#64748b" stroke-width="2" fill="none" stroke-dasharray="5,5" marker-end="url(#arrow)"/>
  <text x="610" y="35" text-anchor="middle" font-family="Arial" font-size="10" fill="#64748b" font-style="italic">Model Training</text>

  <g transform="translate(680, 60)">
    <rect x="0" y="0" width="180" height="60" rx="8" fill="#f3e8ff" stroke="#9333ea" stroke-width="2"/>
    <text x="90" y="20" text-anchor="middle" font-family="Arial" font-size="11" font-weight="bold" fill="#6b21a8">Labeling Studio</text>
    <text x="90" y="40" text-anchor="middle" font-family="Arial" font-size="9" fill="#6b21a8">15-20 labeled documents</text>
    <text x="90" y="55" text-anchor="middle" font-family="Arial" font-size="9" fill="#6b21a8">Multi-language support</text>
  </g>

  <!-- Arrow marker -->
  <defs>
    <marker id="arrow" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
      <polygon points="0 0, 10 3.5, 0 7" fill="#64748b"/>
    </marker>
  </defs>

  <!-- Key Metrics -->
  <g transform="translate(30, 650)">
    <rect x="0" y="0" width="840" height="35" rx="4" fill="#1e293b"/>
    <text x="120" y="22" text-anchor="middle" font-family="Arial" font-size="11" fill="#ffffff">90% time reduction</text>
    <text x="300" y="22" text-anchor="middle" font-family="Arial" font-size="11" fill="#ffffff">95%+ extraction accuracy</text>
    <text x="480" y="22" text-anchor="middle" font-family="Arial" font-size="11" fill="#ffffff">6x capacity increase</text>
    <text x="660" y="22" text-anchor="middle" font-family="Arial" font-size="11" fill="#ffffff">4-month payback</text>
    <text x="800" y="22" text-anchor="middle" font-family="Arial" font-size="11" fill="#ffffff">24/7 processing</text>
  </g>
</svg>
```

---

## Situation

Insurance companies process thousands of policies daily. Each policy is a PDF document containing critical information:

- Policy numbers and effective dates
- Insured parties and property details
- Coverage limits and deductibles
- Premium amounts and payment terms
- Exclusions and endorsements

The challenge: These documents come from dozens of insurers, each with their own format. Some are in Spanish, others in German or English. Fields appear in different locations, use different terminology, and follow different conventions for dates, currencies, and numbers.

Manual data entry was slow (15-20 minutes per policy), error-prone, and expensive. Off-the-shelf OCR could read text but couldn't understand the semantic meaning or normalize it to a consistent schema.

I led the implementation of a custom AI solution using Azure AI Document Intelligence that automatically extracts and normalizes policy data across multiple languages and formats.

---

## The Document Intelligence Workflow

### Phase 1: Project Setup in Azure AI Foundry

**Create a Document Intelligence Project**:

1. Navigate to Azure AI Document Intelligence Studio
2. Create a new project: `proj_insurance_policies`
3. Select "Custom Neural Model" (for complex layouts)
4. Choose API version: `2024-11-30` (latest stable)

**Upload Training Documents**:

Gather a diverse set of insurance policies:

- Multiple insurers (HDI Global, Allianz, Aviva, etc.)
- Multiple languages (Spanish, German, English)
- Multiple formats (digital PDFs, scanned documents)
- Multiple policy types (property, liability, business interruption)

**Target**: At least 15-20 labeled documents for initial training.

---

### Phase 2: Labeling and Schema Definition

**Define the Canonical Schema**:

Before labeling, define the target schema—what fields should be extracted and how should they be normalized?

Example schema fields:

- `policy_id`: Standardized policy number format
- `policy_holder`: Normalized company/person name
- `insurer`: Short canonical insurer name
- `period_start`, `period_end`: ISO 8601 dates
- `buildings_sum_insured`: Numeric value in EUR
- `premium_total`: Total premium as number
- `currency`: ISO currency code (EUR, USD, etc.)
- `risks_insured`: Array of normalized risk tags

**Label Documents**:

In the Document Intelligence Studio labeling interface:

1. **Select a document** from the uploaded set
2. **Highlight text** for each field (e.g., highlight "74 004447-0016" and label as `policy_id`)
3. **Define field types**:
   - String (names, addresses)
   - Number (amounts, percentages)
   - Date (periods, effective dates)
   - Array (lists of risks, endorsements)
   - Object (nested structures like deductibles by risk type)

**Example Labeling Session**:

Document: HDI Global property insurance policy (German)

| Field                   | Extracted Text                                                         | Normalized Value                               |
| ----------------------- | ---------------------------------------------------------------------- | ---------------------------------------------- |
| `policy_id`             | "74 004447-0016"                                                       | "74-004447-0016"                               |
| `policy_holder`         | "Pandion Real Estate GmbH bzw. Projektgesellschaft der Pandion Gruppe" | "PANDION REAL ESTATE GMBH"                     |
| `insurer`               | "HDI Global SE"                                                        | "HDI GLOBAL SE"                                |
| `insurer_address`       | "Am Schönenkamp 45 40599 Düsseldorf"                                   | "Am Schönenkamp 45, 40599 Düsseldorf, Germany" |
| `period_start`          | "12 August 2024"                                                       | "2024-08-12"                                   |
| `period_end`            | "31 May 2025"                                                          | "2025-05-31"                                   |
| `buildings_sum_insured` | "EUR 720,738.74"                                                       | 720738.74                                      |
| `currency`              | "EUR"                                                                  | "EUR"                                          |

**Labeling Best Practices**:

1. **Consistency is critical**: Label the same field the same way across all documents
2. **Handle variations**: If "Policy Number", "Policy No.", and "Police" all mean the same thing, label all as `policy_id`
3. **Multilingual support**: Label fields in all languages (Spanish "Póliza", German "Versicherungsschein", English "Policy")
4. **Complex fields**: For nested structures (e.g., deductibles by risk), create object fields with sub-fields

---

### Phase 3: Training the Model

**Training Process**:

Once you have labeled at least 5 documents (Microsoft's minimum), you can train the model.

**Important**: Training uses ALL labeled documents in the project. It's not incremental—each training run creates a new model from scratch using the complete labeled dataset.

**Training Workflow**:

1. **Review labeled documents**: Ensure all required fields are labeled consistently
2. **Click "Train"**: Initiates training job (takes 5-20 minutes depending on document count)
3. **Monitor training status**: Watch for "Succeeded" status
4. **Review model performance**: Check precision/recall metrics

**Model Versioning**:

Each training run creates a new model version:

- `model_v1`: Trained on 15 documents (initial version)
- `model_v2`: Trained on 25 documents (added more insurers)
- `model_v3`: Trained on 35 documents (improved multilingual coverage)

**Naming Convention**:

Use descriptive names:

- `pash_insurances_di_20250120` (trained on Jan 20, 2025)
- `pash_insurances_di_multilingual_v2` (version 2 with multilingual support)

---

### Phase 4: Normalization Rules and JSONL Training Data

**The Challenge**:

Extracted text is rarely in the format you need. "EUR 720,738.74" needs to become `720738.74`. "12 August 2024" needs to become `"2024-08-12"`.

**Solution: Post-Processing with Normalization Rules**:

Azure Document Intelligence extracts raw text. You need a normalization layer to convert it to your canonical schema.

**Example Normalization Rules**:

```python
# Normalize European number format to standard
def normalize_currency(text):
    # "EUR 720,738.74" or "€5.000,00" → 720738.74
    text = text.replace('EUR', '').replace('€', '').strip()
    text = text.replace('.', '').replace(',', '.')  # European to US format
    return float(text)

# Normalize dates to ISO 8601
def normalize_date(text):
    # "12 August 2024" or "12/08/2024" → "2024-08-12"
    from dateutil import parser
    return parser.parse(text).strftime('%Y-%m-%d')

# Normalize insurer names to canonical form
INSURER_MAPPING = {
    "HDI Global SE": "HDI GLOBAL SE",
    "Allianz Global Corporate & Specialty SE": "ALLIANZ GCS SE",
    "Aviva Insurance Ireland Designated Activity Company": "AVIVA INSURANCE IRELAND"
}

def normalize_insurer(text):
    return INSURER_MAPPING.get(text, text.upper())
```

**Advanced: Fine-Tuning with JSONL**:

For more complex normalization, you can create fine-tuning datasets in JSONL format:

```jsonl
{"messages":[{"role":"system","content":"Normalize monetary amounts to numbers with currency code."},{"role":"user","content":"Buildings Sum Insured: EUR 720,738.74"},{"role":"assistant","content":"{\"buildings_sum_insured\":720738.74,\"currency\":\"EUR\"}"}]}
{"messages":[{"role":"system","content":"Normalize dates to ISO format."},{"role":"user","content":"Coverage: 01/01/2025 to 31/12/2025"},{"role":"assistant","content":"{\"period_start\":\"2025-01-01\",\"period_end\":\"2025-12-31\"}"}]}
{"messages":[{"role":"system","content":"Extract deductible amounts per risk type."},{"role":"user","content":"Subsidence: EUR 1,240; Earthquake: EUR 1,000; Other Risks: EUR 1,000"},{"role":"assistant","content":"{\"deductibles\":{\"subsidence\":1240.00,\"earthquake\":1000.00,\"other\":1000.00}}"}]}
```

This JSONL data can be used to fine-tune a language model that handles normalization as a text-to-JSON task.

---

### Phase 5: Validation and Testing

**Create a Validation Set**:

Set aside 5-10 labeled documents that are NOT used in training. These are your validation set.

**Validation Metrics**:

1. **Field-Level Precision**: Of all extracted fields, what percentage are correct?
2. **Field-Level Recall**: Of all fields that should be extracted, what percentage were found?
3. **Value Accuracy**: Are extracted values correct (not just present)?

**Example Validation Results**:

| Field                   | Precision | Recall | Notes                                             |
| ----------------------- | --------- | ------ | ------------------------------------------------- |
| `policy_id`             | 98%       | 100%   | Very reliable                                     |
| `policy_holder`         | 95%       | 97%    | Occasional truncation on long names               |
| `period_start`          | 99%       | 99%    | Date normalization highly accurate                |
| `buildings_sum_insured` | 92%       | 95%    | Some issues with OCR on scanned docs              |
| `premium_total`         | 90%       | 93%    | Confusion between base premium and total with tax |

**Handle Edge Cases**:

Document issues discovered during validation:

- **Scanned documents with poor quality**: OCR errors on policy numbers
- **Handwritten annotations**: Model tries to extract as fields (filter these out)
- **Multi-page tables**: Some fields span multiple pages (need special handling)
- **Non-standard date formats**: "1st January 2025" vs "01/01/2025" (normalization handles this)

---

### Phase 6: Integration with Downstream Systems

**API Integration**:

Once the model is trained and validated, integrate it into your document processing pipeline:

```python
import requests
from azure.ai.formrecognizer import DocumentAnalysisClient
from azure.core.credentials import AzureKeyCredential

endpoint = "https://your-resource.cognitiveservices.azure.com/"
key = "your-api-key"

client = DocumentAnalysisClient(endpoint=endpoint, credential=AzureKeyCredential(key))

# Submit document for analysis
with open("policy.pdf", "rb") as f:
    poller = client.begin_analyze_document("model_v3", f)

result = poller.result()

# Extract fields
extracted_data = {
    "policy_id": result.documents[0].fields.get("policy_id").value,
    "policy_holder": normalize_insurer(result.documents[0].fields.get("policy_holder").value),
    "period_start": normalize_date(result.documents[0].fields.get("period_start").value),
    "buildings_sum_insured": normalize_currency(result.documents[0].fields.get("buildings_sum_insured").value),
}

# Validate against business rules
validate_policy(extracted_data)
```

**Business Rules Validation**:

After extraction, validate the data:

```python
def validate_policy(data):
    errors = []

    # Policy ID format check
    if not re.match(r'^\d{2}-\d{6}-\d{4}$', data['policy_id']):
        errors.append("Invalid policy ID format")

    # Coverage period logic
    if data['period_start'] >= data['period_end']:
        errors.append("Period start must be before end")

    # Sum insured must be positive
    if data['buildings_sum_insured'] <= 0:
        errors.append("Sum insured must be positive")

    # Premium must match calculation (if formula known)
    expected_premium = calculate_premium(data)
    if abs(data['premium_total'] - expected_premium) > 0.01:
        errors.append(f"Premium mismatch: expected {expected_premium}, got {data['premium_total']}")

    return errors
```

**Flag for Manual Review**:

If validation fails or confidence is low, flag for manual review:

```python
if errors or confidence < 0.90:
    send_to_manual_review(policy_pdf, extracted_data, errors)
else:
    import_to_database(extracted_data)
```

---

## Multilingual Support Strategy

**The Challenge**:

Insurance policies come in multiple languages:

- **Spanish**: "Tomador del seguro", "Suma asegurada", "Prima total"
- **German**: "Versicherungsnehmer", "Versicherungssumme", "Gesamtprämie"
- **English**: "Policy holder", "Sum insured", "Total premium"

**Solution: Unified Labeling**

Label the SAME field across all languages:

| Spanish            | German              | English       | Canonical Field         |
| ------------------ | ------------------- | ------------- | ----------------------- |
| Tomador del seguro | Versicherungsnehmer | Policy holder | `policy_holder`         |
| Suma asegurada     | Versicherungssumme  | Sum insured   | `buildings_sum_insured` |
| Prima total        | Gesamtprämie        | Total premium | `premium_total`         |
| Vigencia desde     | Gültig ab           | Coverage from | `period_start`          |

The model learns that these different terms all map to the same canonical field.

**Normalization Handles Language Variations**:

```python
# Date formats vary by language
DATE_FORMATS = {
    'es': '%d de %B de %Y',  # "12 de agosto de 2024"
    'de': '%d. %B %Y',       # "12. August 2024"
    'en': '%B %d, %Y'        # "August 12, 2024"
}

def normalize_date_multilingual(text, language='es'):
    from dateutil import parser
    # Try language-specific format first, fall back to auto-detect
    try:
        return datetime.strptime(text, DATE_FORMATS[language]).strftime('%Y-%m-%d')
    except ValueError:
        return parser.parse(text).strftime('%Y-%m-%d')
```

---

## Real-World Results

**Project**: Insurance policy processing for real estate portfolio

**Scope**:

- 500+ policies processed monthly
- 12 different insurers
- 3 languages (Spanish, German, English)
- 40+ fields extracted per policy

**Results After 6 Months**:

| Metric                     | Before    | After   | Improvement   |
| -------------------------- | --------- | ------- | ------------- |
| Processing time per policy | 15-20 min | 2-3 min | 85% reduction |
| Manual data entry errors   | 8%        | <1%     | 87% reduction |
| Policies processed per FTE | 25/day    | 150/day | 6x increase   |
| Cost per policy            | €3.50     | €0.60   | 83% reduction |

**Quality Metrics**:

- **Field extraction accuracy**: 95%+ across all fields
- **Date normalization accuracy**: 99%
- **Currency/amount accuracy**: 97%
- **Manual review rate**: 12% (down from 100%)

---

## Lessons Learned

### Lesson 1: Invest Time in Labeling Quality

The model is only as good as your labeled data. Spend time ensuring:

- Consistent labeling across all documents
- Clear field definitions
- Multilingual coverage from the start

### Lesson 2: Start Simple, Iterate

Don't try to extract 50 fields in the first model. Start with 10-15 critical fields:

- Policy ID
- Policy holder
- Insurer
- Coverage period
- Sum insured
- Premium

Once the model works well for these, add more fields in subsequent versions.

### Lesson 3: Human-in-the-Loop is Essential

Even with 95% accuracy, some policies will need manual review:

- Poor quality scans
- Unusual formats
- Edge cases not in training data

Build a workflow for flagging and reviewing these cases.

### Lesson 4: Monitor Model Drift

Over time, new insurers, new formats, or new languages may appear. Monitor:

- Extraction accuracy by insurer
- Fields with high error rates
- New document formats not in training set

Retrain the model periodically with new examples.

---

## Impact and Metrics

**Before AI**:

- 15-20 minutes manual processing per policy
- 8% data entry error rate
- Limited to business hours processing
- Backlog of 200+ policies during peak periods

**After AI**:

- 2-3 minutes (mostly validation) per policy
- <1% error rate
- 24/7 automated processing
- No backlog, even during peak periods

**ROI**:

- Payback period: 4 months
- Annual savings: €180,000 (reduced manual labor + error correction)
- Capacity increase: 6x without hiring

