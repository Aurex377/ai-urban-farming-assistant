# GrowWise AI — Phase 4: NVIDIA Context-Aware Personalization Architecture

## 1. Overview & Objective

Phase 4 completes the core intelligence loop for **GrowWise AI (AI Urban Farming Assistant)** by leveraging the **NVIDIA Nemotron** model (`nvidia/llama-3.1-nemotron-70b-instruct` / NIM) to synthesize all structured inputs from Phases 1, 2, and 3 into deeply personalized, actionable agronomic plant-care guidance.

> **Model Constraint:** NVIDIA Nemotron is the sole AI model powering the GrowWise AI platform. Local LLaVA is strictly excluded and deprecated.

---

## 2. End-to-End System Architecture

```text
React Frontend
      ↓ (User opens plant details or requests on-demand care synthesis)
FastAPI Backend (/api/care/{plant_id}/personalize)
      ↓
Load Latest NVIDIA Diagnosis (from Supabase 'diagnoses' table)
      ↓
Load Plant Profile & Garden Microclimate (age, phenological stage, zone, soil volume)
      ↓
Load Weather Telemetry & 5-Day Forecast (via weather_service)
      ↓
Load Deterministic Watering-Engine Result (target ml intake, urgency, schedule)
      ↓
Load Approved Care Guidance (scientifically verified organic protocol)
      ↓
Build Structured Personalization Context (10 agronomic dimensions)
      ↓
Call Existing NVIDIA Nemotron API (NVIDIA NIM Cloud API or local orchestrator)
      ↓
Validate NVIDIA Response (Pydantic 'PersonalizedCareGuidance' contract)
      ↓
Save Care Recommendation in Supabase ('care_recommendations' table)
      ↓
Display Personalized Guidance in React (PlantDetails.jsx & Care.jsx)
```

---

## 3. The 9 Required Personalized Agronomic Outputs

Every personalization execution validates and produces all 9 required clinical outputs:

| Output Field | Agronomic Purpose |
| :--- | :--- |
| **`personalized_explanation`** | Detailed clinical botanical explanation accounting for species, age, phenological stage, soil volume, and current microclimate. |
| **`immediate_next_steps`** | Prioritized list of concrete, practical actions the grower must perform today. |
| **`personalized_treatment_explanation`** | Tailored application instructions for approved organic botanical treatments (dosage, frequency, twilight application to prevent phototoxicity). |
| **`watering_explanation`** | Direct rationale reinforcing the deterministic watering engine's target volume (e.g., 220 ml) and schedule based on ambient humidity and disease state. |
| **`prevention_guidance`** | Cultural practices, canopy spacing, foliage drying, and container drainage to prevent pathogen recurrence. |
| **`monitoring_instructions`** | Specific visual cues to inspect on leaf margins and shoot tips over the next 48–72 hours. |
| **`next_scan_recommendation`** | Recommended interval and lighting conditions for taking the next diagnostic leaf photograph. |
| **`plant_coach_educational_guidance`** | Actionable coaching tips explaining container dynamics and long-term plant resilience in urban environments. |
| **`expert_help_conditions`** | Critical warning signs indicating when home organic treatment is insufficient and professional extension intervention or specimen culling is required. |

---

## 4. API Endpoints Reference

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/care/{plant_id}/personalize` | Generates NVIDIA Nemotron guidance, validates output, saves record in Supabase, and returns structured result. |
| `GET` | `/api/care/{plant_id}/personalized` | Retrieves the latest stored personalized recommendation (or synthesizes on demand if none exists). |
| `GET` | `/api/plants/{plant_id}/personalized` | Convenience alias mapping to the latest personalized care plan. |
| `GET` | `/api/care/model/status` | Safe ping verifying NVIDIA Nemotron orchestrator configuration and NIM availability. |

---

## 5. Security and Guardrails

1. **No Credentials Leaked:** Model status checks return runtime capability without disclosing API keys or server endpoints.
2. **Prohibited Practice Enforcement:** The system prompt explicitly forbids synthetic chemical suggestions or practices flagged as prohibited in the botanical protocol.
3. **Resilient Fallback Orchestrator:** If the NVIDIA NIM Cloud API is offline or unconfigured, the deterministic agronomic synthesizer produces valid, clinically accurate guidance adhering strictly to the Pydantic schema so the user interface never breaks.
