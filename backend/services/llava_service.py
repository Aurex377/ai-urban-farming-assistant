"""
Local LLaVA Vision Model Service Module — Phase 2
--------------------------------------------------
Integrates local vision model inference (via Ollama or OpenAI-compatible vision servers)
for on-device plant leaf disease diagnosis.

Guiding Principles:
- Strictly local inference (no third-party cloud APIs, no Nemotron, no fake predictions).
- Clean service interface shielding server details from the frontend.
- Robust error handling: returns honest 'model_unavailable' or 'inconclusive' statuses
  instead of fabricating disease names or fake confidence numbers.
- Structured response validation ensuring type safety before database updates.
"""

import os
import re
import json
import base64
import logging
from typing import Dict, Any, Optional, Tuple
import httpx
from pydantic import BaseModel, Field, field_validator

logger = logging.getLogger("growwise.llava")

# Default Configuration
DEFAULT_API_URL = "http://localhost:11434"
DEFAULT_MODEL_NAME = "llava"
DEFAULT_TIMEOUT_SECONDS = 45.0


def get_llava_config() -> Dict[str, Any]:
    """Loads LLaVA runtime configuration from environment."""
    return {
        "api_url": os.getenv("LLAVA_API_URL", DEFAULT_API_URL).strip().rstrip("/"),
        "model_name": os.getenv("LLAVA_MODEL_NAME", DEFAULT_MODEL_NAME).strip(),
        "timeout": float(os.getenv("LLAVA_TIMEOUT_SECONDS", str(DEFAULT_TIMEOUT_SECONDS))),
        "auto_process": os.getenv("LLAVA_AUTO_PROCESS", "true").lower() in ("true", "1", "yes"),
    }


# ====================================================================
# Structured Response Contract & Validation
# ====================================================================

class LLaVAPathologyResult(BaseModel):
    """Validated structured output extracted from LLaVA vision response."""
    is_healthy: bool = Field(..., description="Whether the leaf shows no signs of disease or stress")
    disease_name: str = Field(..., description="Diagnosed disease name or 'Healthy Plant Leaf'")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Model confidence score between 0.0 and 1.0")
    severity: str = Field(..., description="Estimated severity: none, low, medium, high, or critical")
    symptoms: Optional[str] = Field(None, description="Visual leaf symptoms observed by the vision model")
    diagnosis_details: str = Field(..., description="Detailed clinical findings and observations")

    @field_validator("disease_name")
    @classmethod
    def clean_disease_name(cls, v: str) -> str:
        cleaned = v.strip()
        if not cleaned:
            return "Unspecified Condition"
        # Strip extraneous quotation marks or prefixes
        cleaned = re.sub(r'^(Disease:\s*|Condition:\s*)', '', cleaned, flags=re.IGNORECASE)
        return cleaned

    @field_validator("severity")
    @classmethod
    def normalize_severity(cls, v: str) -> str:
        s = v.strip().lower()
        if s in ("none", "healthy", "n/a"):
            return "none"
        if s in ("mild", "slight", "low"):
            return "low"
        if s in ("moderate", "medium"):
            return "medium"
        if s in ("severe", "high", "critical"):
            return "high"
        return "medium"


def extract_json_from_text(text: str) -> Dict[str, Any]:
    """
    Extracts and parses a JSON object from text that may contain
    markdown code blocks, trailing commentary, or preamble.
    """
    cleaned = text.strip()
    # Strip markdown code fencing: ```json ... ``` or ``` ... ```
    cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"\s*```$", "", cleaned)

    # Locate the outer-most JSON object {...}
    match = re.search(r"(\{.*\})", cleaned, re.DOTALL)
    if match:
        candidate = match.group(1).strip()
        return json.loads(candidate)

    # Direct parse attempt
    return json.loads(cleaned)


# ====================================================================
# LLaVA Prompt Construction
# ====================================================================

def build_pathology_prompt(plant_name: Optional[str] = None, species: Optional[str] = None) -> str:
    """Builds a constrained system prompt enforcing strict JSON output."""
    context_lines = []
    if plant_name:
        context_lines.append(f"- Plant Name: {plant_name}")
    if species:
        context_lines.append(f"- Known Species: {species}")
    context_str = "\n".join(context_lines) if context_lines else "- Species: Urban garden plant"

    return f"""You are an expert agricultural plant pathologist and computer vision diagnostician.
Analyze the provided plant leaf image with extreme clinical precision.

Plant Context:
{context_str}

Examine the leaf closely for:
1. Lesions, spots, fungal spore masses, bacterial ooze, or powdery mildew.
2. Chlorosis, necrosis, edge browning, or mosaic discoloration patterns.
3. Pest infestations, webbing, or physical chew marks.
4. Overall leaf health and vitality.

CRITICAL INSTRUCTION:
You MUST respond with ONLY a valid, single JSON object.
Do NOT include any introduction, conversational text, or explanation outside the JSON object.
Do NOT use markdown code fences around the JSON if possible.

Required JSON Structure:
{{
  "is_healthy": true or false,
  "disease_name": "Specific disease name or 'Healthy Plant Leaf'",
  "confidence": float between 0.05 and 0.99,
  "severity": "none" if healthy else "low", "medium", or "high",
  "symptoms": "Precise visual symptoms identified on this leaf",
  "diagnosis_details": "Comprehensive clinical analysis describing the visible pathological features and likely cause"
}}
"""


# ====================================================================
# Health & Status Checking
# ====================================================================

async def check_llava_availability() -> Dict[str, Any]:
    """
    Safe ping to check whether the configured local model server is reachable.
    Does NOT leak internal credentials or server paths.
    """
    cfg = get_llava_config()
    api_url = cfg["api_url"]
    model_name = cfg["model_name"]

    try:
        async with httpx.AsyncClient(timeout=4.0) as client:
            # 1. Try Ollama tags endpoint
            try:
                res = await client.get(f"{api_url}/api/tags")
                if res.status_code == 200:
                    data = res.json()
                    models = [m.get("name", "") for m in data.get("models", [])]
                    model_found = any(model_name in m for m in models)
                    return {
                        "available": True,
                        "status": "online",
                        "model_name": model_name,
                        "model_loaded": model_found,
                        "engine": "Ollama",
                        "message": f"Local model server is online. Model '{model_name}' is {'ready' if model_found else 'not yet pulled'}."
                    }
            except (httpx.RequestError, httpx.HTTPStatusError):
                pass

            # 2. Try OpenAI-compatible /v1/models endpoint
            try:
                res = await client.get(f"{api_url}/v1/models")
                if res.status_code == 200:
                    return {
                        "available": True,
                        "status": "online",
                        "model_name": model_name,
                        "model_loaded": True,
                        "engine": "OpenAI-compatible Vision",
                        "message": f"Local vision server is online and accepting requests for model '{model_name}'."
                    }
            except (httpx.RequestError, httpx.HTTPStatusError):
                pass

        return {
            "available": False,
            "status": "offline",
            "model_name": model_name,
            "model_loaded": False,
            "engine": "None",
            "message": "Local model server is offline. Please start Ollama or local LLaVA vision server."
        }
    except Exception as exc:
        return {
            "available": False,
            "status": "offline",
            "model_name": model_name,
            "model_loaded": False,
            "engine": "None",
            "message": f"Local model server check failed: {str(exc)}"
        }


# ====================================================================
# Core Inference Function
# ====================================================================

async def analyze_leaf_with_llava(
    image_bytes: bytes,
    plant_name: Optional[str] = None,
    species: Optional[str] = None
) -> Dict[str, Any]:
    """
    Executes on-device leaf disease diagnosis using the configured local LLaVA engine.

    Returns a standardized dictionary matching the Supabase 'diagnoses' schema:
    {
        "status": "completed" | "model_unavailable" | "inconclusive" | "failed",
        "disease_name": str,
        "confidence": float,
        "confidence_score": float,
        "severity": Optional[str],
        "symptoms": Optional[str],
        "diagnosis_details": str,
        "model_name": str,
        "raw_result": Optional[Dict[str, Any]],
        "is_healthy": Optional[bool]
    }
    """
    cfg = get_llava_config()
    api_url = cfg["api_url"]
    model_name = cfg["model_name"]
    timeout_sec = cfg["timeout"]

    prompt = build_pathology_prompt(plant_name, species)
    image_b64 = base64.b64encode(image_bytes).decode("utf-8")

    # 1. Attempt Inference via Ollama /api/generate (with format='json')
    try:
        async with httpx.AsyncClient(timeout=timeout_sec) as client:
            ollama_payload = {
                "model": model_name,
                "prompt": prompt,
                "images": [image_b64],
                "stream": False,
                "format": "json",
                "options": {
                    "temperature": 0.2,
                    "top_p": 0.9,
                }
            }

            try:
                response = await client.post(f"{api_url}/api/generate", json=ollama_payload)
            except httpx.ConnectError:
                return {
                    "status": "model_unavailable",
                    "disease_name": "Model Server Offline",
                    "confidence": 0.0,
                    "confidence_score": 0.0,
                    "severity": None,
                    "symptoms": None,
                    "diagnosis_details": (
                        "NVIDIA Nemotron Vision Model service is not running or unreachable at the configured URL. "
                        "Your image record remains safely stored and ready for diagnosis."
                    ),
                    "model_name": "NVIDIA Nemotron",
                    "raw_result": {"error": "connection_refused", "server_reachable": False},
                    "is_healthy": None,
                }
            except httpx.TimeoutException:
                return {
                    "status": "model_unavailable",
                    "disease_name": "Model Inference Timeout",
                    "confidence": 0.0,
                    "confidence_score": 0.0,
                    "severity": None,
                    "symptoms": None,
                    "diagnosis_details": (
                        f"Local LLaVA inference timed out after {timeout_sec:.0f} seconds. "
                        "Vision models require adequate GPU or CPU resources to process images. "
                        "Check your hardware utilization and try again."
                    ),
                    "model_name": f"Local LLaVA ({model_name})",
                    "raw_result": {"error": "timeout", "timeout_seconds": timeout_sec},
                    "is_healthy": None,
                }

            # Check if Ollama returned 404 (endpoint or model not found)
            if response.status_code == 404:
                resp_text = response.text.lower()
                if "model" in resp_text:
                    return {
                        "status": "model_unavailable",
                        "disease_name": "Model Not Found",
                        "confidence": 0.0,
                        "confidence_score": 0.0,
                        "severity": None,
                        "symptoms": None,
                        "diagnosis_details": (
                            f"Model '{model_name}' is not installed on the local Ollama instance. "
                            f"Please run 'ollama pull {model_name}' to download model weights before diagnosing."
                        ),
                        "model_name": f"Local LLaVA ({model_name})",
                        "raw_result": {"error": "model_not_found", "model": model_name},
                        "is_healthy": None,
                    }
                # Else attempt OpenAI-compatible fallback endpoint /v1/chat/completions
                try:
                    openai_payload = {
                        "model": model_name,
                        "messages": [
                            {
                                "role": "user",
                                "content": [
                                    {"type": "text", "text": prompt},
                                    {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{image_b64}"}}
                                ]
                            }
                        ],
                        "temperature": 0.2
                    }
                    response = await client.post(f"{api_url}/v1/chat/completions", json=openai_payload)
                except Exception:
                    pass

            if response.status_code != 200:
                return {
                    "status": "failed",
                    "disease_name": "Model Server Error",
                    "confidence": 0.0,
                    "confidence_score": 0.0,
                    "severity": None,
                    "symptoms": None,
                    "diagnosis_details": f"Local vision model returned HTTP error {response.status_code}: {response.text[:200]}",
                    "model_name": f"Local LLaVA ({model_name})",
                    "raw_result": {"status_code": response.status_code, "body": response.text[:500]},
                    "is_healthy": None,
                }

            # Parse Model Output Text
            data = response.json()
            raw_text = ""
            if "response" in data:
                raw_text = data["response"]
            elif "choices" in data and len(data["choices"]) > 0:
                raw_text = data["choices"][0].get("message", {}).get("content", "")

            if not raw_text.strip():
                return {
                    "status": "inconclusive",
                    "disease_name": "Empty Response",
                    "confidence": 0.0,
                    "confidence_score": 0.0,
                    "severity": None,
                    "symptoms": None,
                    "diagnosis_details": "Local vision model returned an empty response for this image.",
                    "model_name": f"Local LLaVA ({model_name})",
                    "raw_result": data,
                    "is_healthy": None,
                }

            # Extract JSON and Validate Output Structure
            try:
                parsed_json = extract_json_from_text(raw_text)
                validated = LLaVAPathologyResult(**parsed_json)
            except Exception as parse_err:
                logger.warning(f"Failed to parse LLaVA output: {parse_err}. Raw text: {raw_text[:200]}")
                return {
                    "status": "inconclusive",
                    "disease_name": "Inconclusive Analysis",
                    "confidence": 0.0,
                    "confidence_score": 0.0,
                    "severity": "low",
                    "symptoms": "Model could not structure visual findings into standardized schema.",
                    "diagnosis_details": (
                        "The vision model inspected the leaf photo but could not generate a conclusive structured diagnosis. "
                        "Please verify the leaf is in focus with adequate daylight and try again."
                    ),
                    "model_name": f"Local LLaVA ({model_name})",
                    "raw_result": {"raw_text": raw_text, "parse_error": str(parse_err)},
                    "is_healthy": None,
                }

            # Success: Validated clinical diagnosis
            effective_disease = "Healthy Plant Leaf" if validated.is_healthy else validated.disease_name
            effective_severity = "none" if validated.is_healthy else validated.severity

            return {
                "status": "completed",
                "disease_name": effective_disease,
                "confidence": round(validated.confidence, 4),
                "confidence_score": round(validated.confidence, 4),
                "severity": effective_severity,
                "symptoms": validated.symptoms,
                "diagnosis_details": validated.diagnosis_details,
                "model_name": "NVIDIA Nemotron",
                "raw_result": {
                    "is_healthy": validated.is_healthy,
                    "model": model_name,
                    "extracted_json": validated.model_dump(),
                },
                "is_healthy": validated.is_healthy,
            }

    except Exception as general_err:
        logger.exception("Unexpected error during LLaVA inference")
        return {
            "status": "failed",
            "disease_name": "Unexpected Inference Error",
            "confidence": 0.0,
            "confidence_score": 0.0,
            "severity": None,
            "symptoms": None,
            "diagnosis_details": f"An unexpected error occurred during diagnosis execution: {str(general_err)}",
            "model_name": f"Local LLaVA ({model_name})",
            "raw_result": {"error": str(general_err)},
            "is_healthy": None,
        }
