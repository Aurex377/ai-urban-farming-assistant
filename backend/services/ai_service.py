"""
AI Service Module
-----------------
Placeholder service architecture for AI Plant Disease Diagnosis.

IMPORTANT RULES & GUIDELINES:
- DO NOT return simulated fake diseases and present them as genuine AI results.
- This module defines the exact interface and schema ready to be connected
  to your real plant disease detection model (e.g., PyTorch, TensorFlow, or Gemini Vision).
- Once your model is trained or external inference API is ready, plug the logic
  into `run_plant_disease_diagnosis()`.
"""

from typing import Dict, Any, Optional


async def run_plant_disease_diagnosis(
    image_url: str,
    plant_info: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Placeholder AI inference function for plant disease diagnosis.

    ARCHITECTURE HOOK:
    When you are ready to connect your real AI model:
    1. Download image bytes using httpx from `image_url`
    2. Preprocess leaf image (resize to 224x224, normalize RGB)
    3. Run forward pass through your model:
       - model.predict(tensor)
    4. Extract top predicted disease class, confidence score, and symptom details.

    CURRENT BEHAVIOR:
    Returns an honest, pending-status response so that backend flow and DB storage
    are tested cleanly without misleading fake medical/agricultural claims.
    """
    return {
        "disease_name": "Pending AI Model Integration",
        "confidence": 0.0,
        "diagnosis_details": (
            "Image validated and queued for diagnosis. "
            "Real machine learning model is ready to be plugged in via backend/services/ai_service.py."
        ),
        "status": "placeholder",
        "image_url_processed": image_url,
    }
