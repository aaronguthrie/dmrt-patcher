# Data Security and Training Policy
## Google Gemini API Usage - Donegal Mountain Rescue Team

**Document Type:** Official Policy Statement  
**Organisation:** Donegal Mountain Rescue Team (DMRT)  
**Service:** Google AI Studio / Gemini API (gemini-2.0-flash)  
**Service Status:** Active Paid Billing Account  
**Organisation Location:** Ireland (European Economic Area)  
**Document Version:** 1.0  
**Effective Date:** 30 November 2024  
**Last Reviewed:** 30 November 2024  
**Next Review Date:** 30 November 2025

---

## Executive Summary

This document provides definitive information regarding data security, privacy, and training policies for data submitted to Google's Gemini API by Donegal Mountain Rescue Team. This policy is based exclusively on official Google documentation and ensures compliance with GDPR and Irish data protection regulations.

### Key Guarantees

✅ **Data is NOT used for training or fine-tuning AI models**  
✅ **Data is NOT used to improve Google products**  
✅ **Data retained for 55 days (abuse monitoring only)**  
✅ **GDPR-compliant processing via Data Processing Addendum**  
✅ **Automated PII sanitisation implemented**

### Protection Overview

| Protection Layer | Status | Key Points |
|-----------------|--------|------------|
| **Active Billing Account** | ✅ Active | All usage classified as Paid Services |
| **EEA Location** | ✅ Automatic | Paid Services terms apply automatically |
| **Data Processing Addendum** | ✅ Applied | GDPR-compliant processing |
| **PII Sanitisation** | ✅ Implemented | Automated detection and redaction |
| **Training Use** | ❌ **NOT used** | Confirmed by Paid Services terms |

---

## 1. Introduction

This document serves as the official statement of Donegal Mountain Rescue Team's data security and training policies regarding the use of Google's Gemini API. It addresses data usage, training policies, retention, PII handling, and GDPR compliance.

**Scope:** All data submitted through the DMRT Patcher application, including incident notes, training notes, system prompts, user feedback, and generated outputs.

**Official Sources:**
- [1] Gemini API Additional Terms of Service: https://ai.google.dev/terms
- [2] Additional Usage Policies: https://ai.google.dev/gemini-api/docs/usage-policies
- [3] Data Processing Addendum: https://cloud.google.com/terms/data-processing-addendum
- [4] Service Terms: https://cloud.google.com/terms/service-terms

---

## 2. Service Status and Protection

**✅ Donegal Mountain Rescue Team operates with an active Google Cloud Billing account.**

All usage is classified as "Paid Services" under Google's terms. Additionally, as an Ireland-based organisation (EEA), Paid Services terms apply automatically to ALL usage regardless of billing status per Google's terms:

> "If you're in the European Economic Area, Switzerland, or the United Kingdom, the terms under 'How Google uses Your Data' in 'Paid Services' apply to all Services, including Google AI Studio and unpaid quota in the Gemini API, even though they are offered free of charge." [1]

**Result:** Data protection is guaranteed by both active billing account AND EEA geographic location.

---

## 3. Data Usage for Training

**Official Statement:** [1]

> "When you use Paid Services, including, for example, the paid quota of the Gemini API, Google doesn't use your prompts (including associated system instructions, cached content, and files such as images, videos, or documents) or responses to improve our products, and will process your prompts and responses in accordance with the Data Processing Addendum for Products Where Google is a Data Processor."

**Guarantee for Donegal Mountain Rescue Team:**
- ✅ Data is NOT used for training or fine-tuning AI models
- ✅ Data is NOT used to improve Google products
- ✅ Data processing complies with GDPR via Data Processing Addendum [3]
- ✅ Prompts and responses logged only for policy violation detection and legal disclosures

---

## 4. Data Retention

**Official Statement:** [2]

> "To monitor for misuse, Google retains prompts, contextual information, and outputs for fifty-five (55) days. When data is logged for abuse monitoring, it is used solely for the purpose of policy enforcement and is not used to train or fine-tune any AI/ML models."

**Application:** Data retained for 55 days for abuse monitoring and policy enforcement only. NOT used for training or fine-tuning.

---

## 5. GDPR Compliance

Data is processed in accordance with Google's Data Processing Addendum [3], which outlines GDPR obligations, data security measures, data subject rights, and breach notification procedures.

**Compliance Status:**
- ✅ Data Processing Addendum applies (Paid Services)
- ✅ GDPR-compliant processing (EEA location)
- ✅ Data subject rights protected
- ✅ Data security measures in place
- ✅ Breach notification procedures defined

**Note:** The Irish Data Protection Commission has initiated inquiries into Google's AI data processing practices. This policy is based on Google's current official terms and should be reviewed if regulatory guidance changes.

---

## 6. PII Protection

Even with Paid Services, Google recommends avoiding PII submission to AI services. Donegal Mountain Rescue Team has implemented automated PII detection and sanitisation.

**Protected PII Types:** Email addresses, phone numbers, GPS coordinates, Irish postcodes (Eircode), vehicle registration numbers, dates of birth, medical record numbers, PPS numbers, names with titles.

**Implementation:** All user input is automatically scanned and PII is redacted before submission to Gemini API. System prompts explicitly prohibit inclusion of casualty names and identifying details.

This aligns with GDPR data minimisation principles and defence-in-depth security.

---

## 7. Data Types and Human Review

**Data Types Processed:**
- User-submitted notes (incident/training notes) - sanitised for PII and prompt injection
- System prompts (predefined instructions)
- Previous outputs (for regeneration)
- User feedback (for regeneration)

**Human Review:** [1] Human reviewers may process API input/output for quality assurance. Data is anonymised before review (disconnected from identifiers). Review does NOT result in training use (Paid Services terms apply).

---

## 8. Verification

All statements can be verified at the official URLs listed in Section 1. To verify independently: navigate to URLs, search for quoted text (Ctrl+F / Cmd+F), verify section headings, and check document dates.

**Review Schedule:** Annually (next: 30 November 2025), or when Google updates terms, regulatory guidance changes, service configuration changes, or new data types are introduced.

---

## 9. References

**[1] Gemini API Additional Terms of Service**  
https://ai.google.dev/terms  
Key Sections: "How Google Uses Your Data" (Paid Services, EEA Exception)

**[2] Additional Usage Policies**  
https://ai.google.dev/gemini-api/docs/usage-policies  
Key Sections: Data Retention and Abuse Monitoring

**[3] Data Processing Addendum**  
https://cloud.google.com/terms/data-processing-addendum  
Key Sections: GDPR compliance, data processor obligations

**[4] Service Terms**  
https://cloud.google.com/terms/service-terms

**Additional:** Irish Data Protection Commission Inquiry: https://www.euronews.com/next/2024/09/12/googles-ai-model-subject-to-irish-privacy-inquiry

---

## Document Control

**Document Owner:** Donegal Mountain Rescue Team  
**Version:** 1.0  
**Effective Date:** 30 November 2024  
**Next Review:** 30 November 2025

**Change Log:**
- 2024-11-30: Initial document creation

---

**Document End**

*This document is based exclusively on official Google documentation as of 30 November 2024. Always refer to official sources (Section 9) for the most current information.*
