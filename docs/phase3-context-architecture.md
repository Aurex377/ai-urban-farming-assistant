# GrowWise AI — Phase 3 Context Architecture & Decision Support Layer

**Document Version:** 1.0.0  
**Status:** Approved & Verified  
**Scope:** Phase 3 — Context Aggregator, Weather Service, Watering Engine, and Approved Care Guidance  

---

## 1. Architectural Topology

```text
React Frontend
      ↓ HTTP / REST
FastAPI API Gateway
      ↓
Context Aggregator (10 Agronomic Dimensions)
   ↙                     ↓                          ↘
Supabase Database     Weather Service             Diagnosis History
(Profile, Edaphic)   (Open-Meteo + Fallback)      (Local LLaVA Pathology)
      ↓
Deterministic Watering Engine
(Species Baseline × Stage × Zone × Temp × Humidity × Rain Reduction × Pathology Throttle)
      ↓
Approved Care Guidance Knowledge Base
(Curated Organic Interventions, Treatments, Cultural Preventions, Prohibitions)
      ↓
Structured Recommendation Context Payload
(nemotron_ready_prompt_context formatted for Phase 4 NVIDIA Nemotron Integration)
```

---

## 2. The 10 Agronomic Context Dimensions

The Context Aggregator synthesizes ten distinct environmental, biological, and historical dimensions into a single standardized payload (`GET /api/plants/{plant_id}/context`):

| # | Dimension | Source | Key Attributes |
|---|---|---|---|
| **1** | **Plant Profile** | Supabase `plants` | Species, category (vegetable, herb, fruit, flower), name, variety, health status, health score |
| **2** | **Plant Age & Phenology** | Computed from `planted_date` | Age in days, growth stage (`seedling`, `vegetative`, `flowering_fruiting`, `mature`) |
| **3** | **Garden Zone & Microclimate** | Plant profile `location` | Indoor vs outdoor, sunlight exposure (`full_sun`, `partial_sun`, `shade`), urban container setting |
| **4** | **Edaphic & Container Conditions** | Plant profile | Soil type (`potting_mix`, `loam`, etc.), container volume (liters), aerated drainage dynamics |
| **5** | **Watering History** | Supabase `watering_logs` | Timestamp of last irrigation, days elapsed since last watered, recent hydration volume |
| **6** | **Historical Diagnoses** | Supabase `diagnoses` | Count of prior clinical health checks, previous pathologies, resolution timestamps |
| **7** | **Current Weather Telemetry** | Open-Meteo REST API | Ambient temperature (°C), relative humidity (%), precipitation (mm), wind speed (km/h) |
| **8** | **5-Day Weather Forecast** | Open-Meteo REST API | Multi-day precipitation probability, temperature trends, agricultural garden impact analysis |
| **9** | **Active Pathology Status** | Latest completed diagnosis | Disease name, is_healthy, confidence score (0-1.0), severity, visual symptom descriptions |
| **10** | **Approved Care Guidance** | Botanical knowledge base | Condition matched, immediate actions, approved treatments, cultural preventions, prohibited practices |

---

## 3. Deterministic Watering Engine Formula

The hydration volume calculation is strictly deterministic, scientific, and reproducible:

$$\text{Target Volume (ml)} = \text{Base Volume} \times M_{\text{stage}} \times M_{\text{sunlight}} \times M_{\text{weather}} \times M_{\text{pathology}}$$

### Baseline Multipliers:
1. **Species Baseline:** Vegetable: 450 ml/day, Fruit: 500 ml/day, Herb: 250 ml/day, Indoor: 180 ml/day, Succulent: 80 ml/day.
2. **Growth Stage Multipliers ($M_{\text{stage}}$):**
   - `seedling` (0-14 days): **0.50x** (small root system requires frequent small sips)
   - `vegetative` (15-45 days): **1.00x** (standard vegetative uptake)
   - `flowering_fruiting` (46-90 days): **1.25x** (high transpiration and fruit cell expansion)
   - `mature` (>90 days): **1.10x**
3. **Sunlight Multipliers ($M_{\text{sunlight}}$):**
   - `full_sun`: **1.25x**
   - `partial_sun`: **1.00x**
   - `shade`: **0.75x**
4. **Weather Telemetry Multiplier ($M_{\text{weather}}$):**
   - Heat stress ($T \ge 32^\circ\text{C}$): **1.35x**
   - Warm conditions ($T \ge 28^\circ\text{C}$): **1.15x**
   - Cool weather ($T \le 16^\circ\text{C}$): **0.75x**
   - Dry air ($\text{RH} \le 35\%$): **1.15x**
   - High humidity ($\text{RH} \ge 80\%$): **0.85x**
5. **Pathogen Throttling Multiplier ($M_{\text{pathology}}$):**
   - `Root Rot / Pythium`: **0.20x** (severe 80% volume reduction to prevent root suffocation)
   - Foliar pathogens (`Early Blight`, `Powdery Mildew`, `Leaf Spot`): **0.85x** (bottom-watering only)
6. **Rainfall Suppression Logic:**
   - If natural rainfall in past 24 hours $\ge 5.0\text{ mm}$: Volume set to **0 ml**, scheduled for +2 days with reason: *"Recent natural rainfall thoroughly hydrated root zone."*
   - If forecast precipitation tomorrow $\ge 3.0\text{ mm}$ or rain chance $\ge 65\%$: Irrigation postponed to *"Tomorrow (Rain Anticipated)"*.

---

## 4. Curated Botanical Care Guidance Knowledge Base

The care guidance service matches the plant's disease state against scientifically approved organic protocols:

- **Early Blight (*Alternaria solani*):** Immediate leaf pruning of target spot lesions; 70% alcohol shear sterilization; copper octanoate or *Bacillus subtilis* biofungicide; organic straw mulch barrier; zero overhead watering.
- **Late Blight (*Phytophthora infestans*):** Immediate isolation from nightshade family; bagged disposal; copper fungicide; zero composting of infected debris.
- **Powdery Mildew (*Erysiphaceae*):** Removal of white mycelium leaves; potassium bicarbonate spray; sulfur fungicide (<30°C); canopy thinning for airflow; avoid sulfur within 30 days of oil.
- **Septoria Leaf Spot (*Septoria lycopersici*):** Prune spotted lower leaves; sanitize equipment; liquid copper fungicide; soil mulch barrier.
- **Root Rot (*Pythium / Phytophthora*):** Discontinue irrigation immediately; inspect for foul odors; drench with *Bacillus amyloliquefaciens*; inspect drainage holes.
- **Aphids (*Aphidoidea*):** High-pressure water jet spray to dislodge clusters; insecticidal soap / cold-pressed neem oil; release *Hippodamia convergens* (lady beetles); zero broad-spectrum synthetic sprays.
- **Spider Mites (*Tetranychidae*):** Wipe leaf undersides with damp cloth; apply sulfur or insecticidal soap; mist surrounding air to raise humidity; avoid dry stagnant pockets.
- **Healthy Maintenance Protocol:** Balanced organic liquid fertilizer (5-5-5 / seaweed extract) at half-strength every 2-3 weeks; top-dress with compost; weekly 90-degree container rotation.

---

## 5. Phase 4 Nemotron Ready Prompt Contract

The context aggregator generates a multi-line, structured prompt context string ready for input to NVIDIA Nemotron in Phase 4:

```text
==================================================
GROWWISE AI — DETERMINISTIC AGRONOMIC CONTEXT
==================================================

DIMENSION 1: PLANT PROFILE
- Name: Beefsteak Tomato
- Species: Solanum lycopersicum
- Category: vegetable
- Health Score: 85.0/100

DIMENSION 2: PLANT AGE & PHENOLOGY
- Age (Days): 52
- Growth Stage: FLOWERING_FRUITING

DIMENSION 3: GARDEN ZONE & MICROCLIMATE
- Location: South Balcony (full sun)
- Sunlight Exposure: full_sun
- Setting: outdoor

DIMENSION 4: EDAPHIC & CONTAINER SPECIFICATIONS
- Soil Medium: Organic potting mix with perlite and compost
- Container Volume: 15.0 Liters

DIMENSION 5: WATERING TELEMETRY
- Last Watered: 2026-10-07T12:00:00Z
- Days Since Irrigated: 2

DIMENSION 6: HISTORICAL PATHOLOGY
- Total Past Diagnoses: 1

DIMENSION 7: CURRENT AMBIENT WEATHER
- Temperature: 27.5°C
- Humidity: 48.0%
- Precipitation: 0.0 mm
- Condition: Partly Cloudy

DIMENSION 8: 5-DAY METEOROLOGICAL FORECAST
- Multi-Day Summary: Stable temperate conditions ideal for urban vegetable and herb growth.

DIMENSION 9: ACTIVE PATHOLOGY STATUS
- Disease Diagnosis: Early Blight
- Is Healthy: False
- Diagnostic Confidence: 88.0%
- Severity: medium
- Symptoms: Concentric ring lesions on lower foliage

DIMENSION 10: APPROVED BOTANICAL CARE GUIDANCE
- Protocol Name: Early Blight (Alternaria solani)
- Immediate Action: Prune and discard all lower infected leaves with target spot lesions.
- Approved Treatment: Apply approved copper octanoate or copper sulfate fungicide.
- Prevention: Apply a 2-3 inch organic straw or bark mulch layer around base.
- Prohibited Actions: Do not water foliage in late afternoon or evening.

--------------------------------------------------
DETERMINISTIC WATERING ENGINE DECISION
- Recommended Target Volume: 450 ml
- Recommended Date: Today
- Urgency Level: URGENT
- Calculation Rationale: Outdoor Vegetable (flowering fruiting stage, full sun). Ambient weather: 27.5°C, 48% humidity. Foliar pathogen active (Early Blight): reduce canopy moisture; bottom-water only.
==================================================
```

---

## 6. Endpoints Catalog (Phase 3)

| Method | Path | Summary |
|---|---|---|
| `GET` | `/api/weather/current` | Returns live temperature, humidity, rainfall, wind, condition, and garden impact. |
| `GET` | `/api/weather/forecast` | Returns 5-day forecast, daily precipitation, and agricultural impact. |
| `GET` | `/api/weather/plant/{plant_id}` | Historical weather observations linked to a plant. |
| `GET` | `/api/care/protocols` | Complete catalog of approved clinical botanical care protocols. |
| `GET` | `/api/care/{plant_id}/guidance` | Tailored care guidance matching active plant pathology. |
| `POST`| `/api/watering/{plant_id}/calculate` | Executes deterministic watering engine, persists recommendation, and updates `next_watering_at`. |
| `GET` | `/api/watering/schedule/all` | Batch watering schedule across all garden plants grouped into today, tomorrow, upcoming. |
| `POST`| `/api/watering/{plant_id}/log` | Records watering log in Supabase and updates `plants.last_watered_at`. |
| `GET` | `/api/plants/{plant_id}/context` | Comprehensive 10-dimension recommendation context + Nemotron prompt context. |
