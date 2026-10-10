"""
AI Service Module — Phase 2
---------------------------
Connects the local LLaVA plant disease vision model to the diagnosis workflow.
"""

from typing import Dict, Any, Optional
import httpx

try:
    from backend.services.nvidia_nemotron_service import (
        analyze_leaf_with_nvidia,
        check_nvidia_availability,
    )
    from backend.services.llava_service import (
        analyze_leaf_with_llava,
        check_llava_availability,
    )
except ImportError:
    from services.nvidia_nemotron_service import (
        analyze_leaf_with_nvidia,
        check_nvidia_availability,
    )
    from services.llava_service import (
        analyze_leaf_with_llava,
        check_llava_availability,
    )


async def run_plant_disease_diagnosis(
    image_url: str,
    plant_info: Optional[Dict[str, Any]] = None,
    image_bytes: Optional[bytes] = None
) -> Dict[str, Any]:
    """
    Executes plant disease diagnosis via NVIDIA Nemotron Multimodal Vision Model.
    If image_bytes is not provided directly, attempts to download from image_url.
    """
    plant_info = plant_info or {}
    plant_name = plant_info.get("name") or plant_info.get("plant_name")
    species = plant_info.get("species")

    # If image bytes were not provided, fetch them from the signed/direct URL
    if not image_bytes and image_url:
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.get(image_url)
                if res.status_code == 200:
                    image_bytes = res.content
        except Exception:
            pass

    if not image_bytes:
        return {
            "status": "failed",
            "disease_name": "Image Fetch Error",
            "confidence": 0.0,
            "confidence_score": 0.0,
            "severity": None,
            "symptoms": None,
            "diagnosis_details": "Unable to retrieve image bytes for analysis.",
            "model_name": "NVIDIA Nemotron",
            "raw_result": {"error": "missing_image_bytes"},
            "is_healthy": None,
        }

    return await analyze_leaf_with_nvidia(
        image_bytes=image_bytes,
        plant_name=plant_name,
        species=species
    )

