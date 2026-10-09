# GrowWise AI — AI Urban Farming Assistant

Welcome to **GrowWise AI**, an intelligent urban farming assistant engineered for balcony and indoor gardeners.

---

## 1. Project Overview & Architecture

GrowWise AI bridges modern React UI design with a high-performance FastAPI backend, backed by Supabase PostgreSQL and private Supabase Object Storage.

### Fixed Architectural Topology:
```text
React Frontend (Vite + Tailwind CSS + React Router)
                ↓  HTTP (REST API)
        FastAPI Backend (Port 8000)
                ↓  Python Client (supabase-py)
    Supabase PostgreSQL Database + Supabase Storage ('plant-images' bucket)
```

### Full AI Pipeline Roadmap:
1. **React Frontend** — Responsive Stitch UI with live telemetry & plant management.
2. **FastAPI Backend** — Secure API gateway protecting database & storage credentials.
3. **Local LLaVA Plant Disease 7B** — Local vision-language model for leaf disease detection (*Scheduled for Phase 2*).
4. **FastAPI Context Aggregator** — Synthesizes diagnosis, plant telemetry, and weather data (*Scheduled for Phase 2*).
5. **Weather API** — Local micro-climate telemetry (*Scheduled for Phase 2*).
6. **Supabase PostgreSQL & Storage** — Relational database and private image storage.
7. **Deterministic Watering Engine** — Algorithmic soil hydration & volume calculation (*Scheduled for Phase 2*).
8. **Approved Treatment Guidance Database** — Curated agricultural intervention protocols (*Scheduled for Phase 2*).
9. **NVIDIA Nemotron** — Expert synthesis & treatment validation (*Scheduled for Phase 2*).
10. **Response Validation** — Guardrails ensuring safe recommendations (*Scheduled for Phase 2*).
11. **Save Results** — Persistent audit trail in PostgreSQL.
12. **React Dashboard** — Unified gardener overview.

---

## 2. Phase 1 Scope & Features Delivered

- **Supabase Database Integration:** Resilient schema mapping supporting both baseline and additive schemas (`plants`, `plant_images`, `diagnoses`, `profiles`, `garden_zones`).
- **Plant CRUD APIs:** Full lifecycle management (`GET /api/plants`, `POST /api/plants`, `GET /api/plants/{id}`, `PATCH /api/plants/{id}`, `DELETE /api/plants/{id}`).
- **Plant Management UI:** Live garden dashboard metrics, plant registration, detailed plant view, editing, and deletion.
- **Secure Image Upload:** Multipart upload to private Supabase Storage bucket `plant-images` with MIME validation (`JPEG`, `PNG`, `WEBP`), 10MB size limit, signed URL generation, and image deletion.
- **Diagnosis Pipeline Hook:** Honest pending diagnosis preparation (`POST /api/plants/{plant_id}/diagnoses`) without simulated fake disease results, queued for Local LLaVA in Phase 2.
- **Centralized Frontend Services:** Organized into `apiClient`, `plantService`, `imageService`, `diagnosisService`, and `healthService`.

---

## 3. Database & Storage Configuration

### Database Tables (Supabase PostgreSQL):
1. `profiles` — User profile details linked to auth.users.
2. `garden_zones` — Micro-locations (balcony, windowsill, indoor) and sunlight exposure.
3. `plants` — Core plant registry (species, type, variety, location, health status, watering dates).
4. `plant_images` — Image metadata tracking photos stored in Supabase Storage.
5. `diagnoses` — Plant health diagnosis records with status tracking (`pending`, `processing`, `completed`).
6. `care_recommendations` — Prescribed treatment protocols and priority.
7. `watering_logs` — Gardener watering event history.
8. `watering_recommendations` — Algorithmic watering volume suggestions.
9. `weather_records` — Environmental telemetry records.
10. `activity_logs` — Comprehensive user audit trail.

### Storage Bucket:
- **Bucket Name:** `plant-images`
- **Visibility:** Private (`public=False`)
- **Access Protocol:** Authenticated upload via FastAPI backend; temporary signed URLs (3600 seconds) for frontend viewing.

### Database Migration:
To apply the additive Phase 1 schema extensions, run the non-destructive SQL script:
```sql
docs/supabase-phase1-migration.sql
```
*(The backend adapts automatically whether or not this script has already been run in your Supabase SQL editor).*

---

## 4. Environment Variables

### Backend (`backend/.env`):
```env
# Supabase Project Credentials
SUPABASE_URL=https://<your-project-ref>.supabase.co
SUPABASE_KEY=<your-supabase-key>

# Development User UUID
DEV_USER_ID=27865d2c-302e-4a2d-83aa-c1c9ea7338a4

# Allowed Frontend Origin
FRONTEND_URL=http://localhost:5173
```

### Frontend (`frontend/.env`):
```env
VITE_API_BASE_URL=http://127.0.0.1:8000
```

---

## 5. API Endpoints Reference

### Health Checks:
- `GET /health` — Service health status.
- `GET /health/database` — Verified connectivity check to Supabase `plants` table.

### Plants Management:
- `GET /api/plants` — List all plants (optionally filtered by `?user_id=`).
- `POST /api/plants` — Create a new plant.
- `GET /api/plants/{plant_id}` — Get single plant detail.
- `PATCH /api/plants/{plant_id}` — Update plant fields (name, variety, health status, notes).
- `DELETE /api/plants/{plant_id}` — Delete plant and associated records.

### Plant Images:
- `POST /api/plants/{plant_id}/images` — Upload image file (JPEG, PNG, WEBP, max 10MB) to Supabase Storage.
- `GET /api/plants/{plant_id}/images` — List images with temporary signed URLs.
- `DELETE /api/plants/{plant_id}/images/{image_id}` — Delete image from Storage and database.

### Diagnosis Pipeline:
- `POST /api/plants/{plant_id}/diagnoses` — Queue image for diagnosis in `pending` state.
- `GET /api/plants/{plant_id}/diagnoses` — List diagnosis history for a plant.
- `GET /api/diagnoses/{diagnosis_id}` — Retrieve specific diagnosis details.

---

## 6. How to Run the Application

### Running the Backend (FastAPI):
```powershell
cd "backend"
.\venv\Scripts\Activate.ps1
uvicorn backend.main:app --reload --port 8000
```
Swagger UI will be available at: `http://127.0.0.1:8000/docs`

### Running the Frontend (React + Vite):
```powershell
cd "frontend"
npm install
npm run dev
```
Application interface will be available at: `http://localhost:5173`

### Running Backend Tests:
```powershell
& "backend\venv\Scripts\python.exe" -c "
from backend.tests.test_phase1 import (
    test_health_endpoint,
    test_database_health_endpoint,
    test_create_plant_invalid_payload,
    test_plant_crud_lifecycle,
    test_reject_unauthorized_plant_access
)
test_health_endpoint()
test_database_health_endpoint()
test_create_plant_invalid_payload()
test_plant_crud_lifecycle()
test_reject_unauthorized_plant_access()
print('All Phase 1 tests passed!')
"
```

---

## 7. Current Limitations & Next Phase (Phase 2)

### Current Limitations (By Design for Phase 1):
- Disease diagnoses remain in `pending` status with `0.0` confidence and honest explanation until the Local LLaVA vision model is plugged in.
- Weather observations and watering calculations currently operate on schema-ready data without live third-party sensors.

### Phase 2 Implementation Plan:
1. **Local LLaVA Plant Disease 7B Integration:** Connect PyTorch/HuggingFace or local GGUF/Ollama inference server to process leaf image tensors.
2. **Deterministic Watering Engine:** Implement soil volume hydration math adjusted by temperature and humidity.
3. **External Weather API Integration:** Hook real OpenWeatherMap / Open-Meteo telemetry into `weather_records`.
4. **NVIDIA Nemotron & Guardrails:** Connect treatment guidance synthesis with strict agricultural safety validation.
