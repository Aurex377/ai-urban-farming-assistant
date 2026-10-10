# Local LLaVA Vision Model Integration Guide — Phase 2

**Project:** GrowWise AI — AI Urban Farming Assistant  
**Component:** Local Vision Model Inference Engine  
**Model Architecture:** LLaVA (Large Language and Vision Assistant)  
**Status:** Integrated, Tested, and Operational  

---

## 1. Overview & Architectural Topology

Phase 2 connects on-device visual plant pathology to the existing FastAPI diagnosis pipeline. Leaf photographs uploaded to Supabase Storage are analyzed locally by a vision-language model, ensuring user data privacy without transmitting private photographs to third-party cloud AI vendors.

```text
React Frontend (Vite + Tailwind CSS)
        │
        ▼ (Multipart Upload)
FastAPI Backend (/api/plants/{id}/images)
        │
        ├──► Supabase Storage ('plant-images' bucket)
        │
        ├──► Supabase Database ('plant_images' & 'diagnoses' tables: status='pending')
        │
        ▼ (Background Worker / Synchronous Trigger)
Local LLaVA Vision Server (Ollama / OpenAI-Compatible Vision API)
        │
        ▼ (Strict JSON Structured Pathology Prompt)
Clinical Response Extraction & Pydantic Validation (LLaVAPathologyResult)
        │
        ├──► Supabase Database ('diagnoses': status='completed', confidence, severity, symptoms)
        ├──► Supabase Database ('plants': updates health_status and health_score)
        │
        ▼ (REST Query / Polling)
React Diagnosis UI (Completed / Model Offline / Inconclusive States)
```

---

## 2. Hardware & System Requirements

| Specification | Minimum (CPU-Only) | Recommended (GPU-Accelerated) |
| :--- | :--- | :--- |
| **Model Size** | LLaVA 7B (Q4_K_M quantized) | LLaVA 7B / 13B (FP16 or Q8) |
| **System RAM** | 16 GB | 16 GB – 32 GB |
| **VRAM (GPU)** | N/A (runs on CPU via AVX2) | 8 GB+ VRAM (NVIDIA RTX 3060/4060 or higher) |
| **Disk Space** | ~4.7 GB for model weights | ~8 GB |
| **Inference Time** | 15 – 35 seconds per image | 2 – 5 seconds per image |

---

## 3. Quickstart: Running Local LLaVA with Ollama

The primary and recommended runtime engine is [Ollama](https://ollama.ai).

### Step 1: Install Ollama
- **Windows:** Download and run the official installer from [ollama.ai/download](https://ollama.ai/download).
- Verify installation in PowerShell or Command Prompt:
  ```bash
  ollama --version
  ```

### Step 2: Pull the LLaVA Vision Weights
Download the quantized LLaVA 7B vision weights:
```bash
ollama pull llava
```

### Step 3: Start the Ollama Service
By default, the Ollama service starts automatically as a background daemon on port `11434`. To verify:
```bash
curl http://localhost:11434/api/tags
```
If online, the API returns a JSON list of installed models including `llava:latest`.

---

## 4. Alternative: OpenAI-Compatible Vision Servers

GrowWise AI also supports any local vision engine exposing an OpenAI-compatible `/v1/chat/completions` endpoint (such as `vLLM`, `llama.cpp` server, or `LocalAI`).

Example with `llama.cpp`:
```bash
llama-server -m llava-v1.6-7b-Q4_K.gguf --mmproj mmproj-model-f16.gguf --port 8080 --host 0.0.0.0
```
Update your `backend/.env`:
```env
LLAVA_API_URL=http://localhost:8080
LLAVA_MODEL_NAME=llava
```

---

## 5. Backend Configuration (`backend/.env`)

Configure the vision pipeline via environment variables in `backend/.env`:

```env
# Local LLaVA Vision Model Configuration (Phase 2)
# URL to local vision inference engine
LLAVA_API_URL=http://localhost:11434

# Model tag to invoke (e.g. llava, llava:7b, llava:13b)
LLAVA_MODEL_NAME=llava

# Timeout in seconds for image inference (vision models require adequate compute time)
LLAVA_TIMEOUT_SECONDS=45

# Enable/disable automatic background inference upon image upload
LLAVA_AUTO_PROCESS=true
```

---

## 6. API Endpoints & Request/Response Contracts

### 6.1 Check Model Status
**`GET /api/diagnoses/model/status`**
- Pings the local vision server without exposing internal filesystem paths or tokens.
- **Sample Response (Online):**
  ```json
  {
    "available": true,
    "status": "online",
    "model_name": "llava",
    "model_loaded": true,
    "engine": "Ollama",
    "message": "Local model server is online. Model 'llava' is ready."
  }
  ```
- **Sample Response (Offline):**
  ```json
  {
    "available": false,
    "status": "offline",
    "model_name": "llava",
    "model_loaded": false,
    "engine": "None",
    "message": "Local model server is offline. Please start Ollama or local LLaVA vision server."
  }
  ```

### 6.2 Trigger / Retry Inference
**`POST /api/diagnoses/{diagnosis_id}/analyze?background=false`**
- Manually triggers on-device inference for a pending or failed diagnosis record.
- **Sample Response (Completed):**
  ```json
  {
    "id": 14,
    "plant_id": 6,
    "user_id": "27865d2c-302e-4a2d-83aa-c1c9ea7338a4",
    "image_id": 8,
    "status": "completed",
    "disease_name": "Powdery Mildew",
    "confidence": 0.88,
    "confidence_score": 0.88,
    "severity": "medium",
    "symptoms": "White fungal patches covering upper leaf surfaces with slight curling.",
    "diagnosis_details": "Observed localized mycelial growth indicative of powdery mildew fungus.",
    "model_name": "Local LLaVA (llava)",
    "message": "Local LLaVA disease analysis complete."
  }
  ```

---

## 7. Failure Handling & Honest UI States

In adherence to strict project guidelines, the system **never manufactures simulated fake diseases or fake confidence numbers**:

1. **`model_unavailable` (Offline Server / Timeout):**
   - Triggered when the local LLaVA server is unreachable.
   - Database record is set to `status: "model_unavailable"`, `confidence: 0.0`.
   - Frontend renders a helpful notification instructing the user how to launch Ollama with a "Retry Analysis" button.
2. **`inconclusive` (Malformed or Ambiguous Model Output):**
   - Triggered if model output cannot be reliably parsed into the structured pathology schema.
   - Database record is set to `status: "inconclusive"`, `confidence: 0.0`.
   - Frontend suggests uploading a clearer, properly lit photograph.
3. **`completed` (Verified Clinical Result):**
   - Model findings validated against `LLaVAPathologyResult`.
   - Plant's `health_status` and `health_score` updated deterministically in Supabase.

---

## 8. Boundaries Maintained for Phase 3

- **NVIDIA Nemotron:** Not called in Phase 2; scheduled for treatment safety guardrailing in Phase 3.
- **Smart Watering Engine:** Algorithmic calculation deferred to scheduled roadmap phase.
- **Plant Coach:** Contextual chatbot deferred to Phase 3.
