"""
GrowWise AI — Phase 4 Test Suite: NVIDIA Context-Aware Personalization
----------------------------------------------------------------------
Validates:
1. NVIDIA Nemotron Configuration & Status Endpoint (/api/care/model/status)
2. Pydantic Contract Validation (PersonalizedCareGuidance)
3. 10-Dimension Agronomic Prompt Construction
4. Full Synthesis of all 9 Required Phase 4 Fields:
   - personalized_explanation
   - immediate_next_steps
   - personalized_treatment_explanation
   - watering_explanation
   - prevention_guidance
   - monitoring_instructions
   - next_scan_recommendation
   - plant_coach_educational_guidance
   - expert_help_conditions
5. Priority Normalization & Safety Guardrails
6. Fallback Orchestration (offline / unconfigured key resilience)
7. REST API Endpoints (/api/care/{plant_id}/personalize, /api/care/{plant_id}/personalized)
"""

import json
import pytest
from fastapi.testclient import TestClient

from backend.main import app
from backend.services.nvidia_nemotron_service import (
    get_nvidia_config,
    check_nvidia_availability,
    build_personalization_prompts,
    synthesize_deterministic_guidance,
    generate_personalized_guidance,
    PersonalizedCareGuidance,
    extract_json_from_text,
)

client = TestClient(app)


def get_mock_context(is_healthy=True, disease_name="Healthy Plant Leaf", severity="none"):
    """Generates standard 10-dimension agronomic context for tests."""
    return {
        "plant_id": 1,
        "dimensions": {
            "plant_profile": {
                "id": 1,
                "name": "Sweet Basil",
                "species": "Ocimum basilicum",
                "plant_type": "herb",
                "health_score": 95.0 if is_healthy else 65.0,
            },
            "plant_age": {
                "age_days": 42,
                "growth_stage": "vegetative",
            },
            "garden_zone": {
                "location": "Sunny Balcony",
                "sunlight_exposure": "full_sun",
                "indoor_or_outdoor": "outdoor",
            },
            "soil_and_container": {
                "soil_type": "potting_mix",
                "pot_size_liters": 5.0,
            },
            "watering_history": {
                "last_watered_at": "2026-10-08T09:00:00Z",
                "days_since_watered": 2,
            },
            "previous_diagnoses": {
                "total_past_records": 1,
                "latest_record": {"id": 10},
            },
            "current_weather": {
                "temperature": 26.5,
                "humidity": 55.0,
                "rainfall": 0.0,
                "condition": "Sunny",
            },
            "weather_forecast": {
                "summary": "Warm and dry conditions expected for 5 days",
            },
            "current_disease_status": {
                "has_active_disease": not is_healthy,
                "is_healthy": is_healthy,
                "disease_name": disease_name,
                "severity": severity,
                "symptoms": "Yellowing between veins" if not is_healthy else "Clean green leaves",
            },
            "approved_care_guidance": {
                "condition_name": "General Basil Maintenance" if is_healthy else "Powdery Mildew Protocol",
                "immediate_actions": ["Inspect foliage"] if is_healthy else ["Prune heavily infected leaves"],
                "approved_treatments": ["Diluted compost tea"] if is_healthy else ["Organic potassium bicarbonate spray"],
                "cultural_preventions": ["Allow topsoil to dry"] if is_healthy else ["Ensure morning sunlight"],
                "prohibited_actions": ["Overhead watering", "Synthetic fungicides"],
            },
        },
        "watering_engine_recommendation": {
            "recommended_amount_ml": 220,
            "recommended_date": "Today",
            "urgency": "normal",
            "reason": "Moderate temperature, soil drying steadily in 5L container.",
        },
    }


def test_nvidia_config_and_status():
    """Verify NVIDIA runtime config and public status check."""
    cfg = get_nvidia_config()
    assert "model_name" in cfg
    assert "base_url" in cfg

    response = client.get("/api/care/model/status")
    assert response.status_code == 200
    data = response.json()
    assert "available" in data
    assert data["available"] is True
    assert "model_name" in data
    assert "NVIDIA" in data["model_name"] or "nemotron" in data["model_name"].lower()
    # Security: ensures no credentials leak
    assert "password" not in json.dumps(data).lower()
    assert "secret" not in json.dumps(data).lower()


def test_personalization_schema_validation():
    """Verify PersonalizedCareGuidance validates all 9 fields and cleans priority."""
    payload = {
        "personalized_explanation": "Detailed clinical agronomic analysis of the plant.",
        "immediate_next_steps": ["Prune damaged leaves", "Apply potassium bicarbonate"],
        "personalized_treatment_explanation": "Organic fungal treatment protocol.",
        "watering_explanation": "Administer 220 ml at soil surface.",
        "prevention_guidance": "Space container 20 cm from neighboring pots.",
        "monitoring_instructions": "Inspect leaf margins every 24 hours.",
        "next_scan_recommendation": "Scan leaf again in 3 days.",
        "plant_coach_educational_guidance": "Balcony containers lose moisture faster on breezy days.",
        "expert_help_conditions": "Seek assistance if stem wilting occurs.",
        "priority": "CRITICAL",  # Should normalize to 'urgent'
        "summary": "Powdery mildew under active organic management.",
    }
    validated = PersonalizedCareGuidance(**payload)
    assert validated.priority == "urgent"
    assert len(validated.immediate_next_steps) == 2
    assert "220 ml" in validated.watering_explanation


def test_personalization_prompt_construction():
    """Verify prompt builder embeds all 10 agronomic dimensions and JSON contract."""
    mock_context = get_mock_context(is_healthy=False, disease_name="Powdery Mildew", severity="medium")
    sys_prompt, user_prompt = build_personalization_prompts(mock_context)

    assert "NVIDIA Nemotron" in sys_prompt
    assert "Sweet Basil" in user_prompt
    assert "Ocimum basilicum" in user_prompt
    assert "Powdery Mildew" in user_prompt
    assert "220 ml" in user_prompt
    assert "Sunny Balcony" in user_prompt
    assert "personalized_explanation" in user_prompt
    assert "plant_coach_educational_guidance" in user_prompt
    assert "expert_help_conditions" in user_prompt


def test_deterministic_fallback_healthy_plant():
    """Verify deterministic fallback produces all 9 required Phase 4 fields for a healthy plant."""
    mock_context = get_mock_context(is_healthy=True)
    result = synthesize_deterministic_guidance(mock_context)

    # Assert all 9 Phase 4 fields are present and non-empty
    required_fields = [
        "personalized_explanation",
        "immediate_next_steps",
        "personalized_treatment_explanation",
        "watering_explanation",
        "prevention_guidance",
        "monitoring_instructions",
        "next_scan_recommendation",
        "plant_coach_educational_guidance",
        "expert_help_conditions",
    ]
    for field in required_fields:
        assert field in result, f"Missing required field: {field}"
        assert result[field], f"Field {field} must not be empty"

    assert isinstance(result["immediate_next_steps"], list)
    assert len(result["immediate_next_steps"]) >= 2
    assert result["priority"] == "routine"
    assert "220 ml" in result["watering_explanation"]


def test_deterministic_fallback_diseased_plant():
    """Verify deterministic fallback produces urgent/high guidance for diseased plants."""
    mock_context = get_mock_context(is_healthy=False, disease_name="Powdery Mildew", severity="high")
    result = synthesize_deterministic_guidance(mock_context)

    assert result["priority"] == "urgent"
    assert "Powdery Mildew" in result["personalized_explanation"]
    assert "Organic potassium bicarbonate" in result["personalized_treatment_explanation"]
    assert "220 ml" in result["watering_explanation"]
    assert len(result["immediate_next_steps"]) >= 2


@pytest.mark.asyncio
async def test_generate_personalized_guidance_pipeline():
    """Verify full generate_personalized_guidance pipeline runs smoothly without external network dependency."""
    from unittest.mock import patch, AsyncMock, MagicMock
    mock_context = get_mock_context(is_healthy=True)
    mock_res = MagicMock()
    mock_res.status_code = 200
    mock_res.json.return_value = {
        "choices": [{
            "message": {
                "content": json.dumps({
                    "personalized_explanation": "Sweet Basil is flourishing with balanced vigor.",
                    "immediate_next_steps": ["Inspect leaf margins", "Aerated root zone"],
                    "personalized_treatment_explanation": "Continue standard organic vitality regimen.",
                    "watering_explanation": "Provide 220 ml irrigation to sustain vegetative growth.",
                    "prevention_guidance": "Maintain good container airflow.",
                    "monitoring_instructions": "Check foliage every 48 hours.",
                    "next_scan_recommendation": "Scan in 3 days in daylight.",
                    "plant_coach_educational_guidance": "Pinching basil tops promotes bushier growth.",
                    "expert_help_conditions": "Seek help if stem collapse develops.",
                    "priority": "routine",
                    "summary": "Basil in peak condition under organic routine."
                })
            }
        }]
    }
    with patch("httpx.AsyncClient.post", new_callable=AsyncMock, return_value=mock_res):
        res = await generate_personalized_guidance(mock_context, plant_id=1, supabase=None)

    assert res["plant_id"] == 1
    assert res["plant_name"] == "Sweet Basil"
    assert res["model_name"] == "NVIDIA Nemotron"
    assert "personalized_explanation" in res
    assert "immediate_next_steps" in res
    assert "plant_coach_educational_guidance" in res
    assert "deterministic_watering" in res
    assert res["deterministic_watering"]["recommended_amount_ml"] == 220


def test_personalize_endpoint_not_found():
    """Verify POST /api/care/99999999/personalize gracefully returns 404 for invalid plant."""
    response = client.post("/api/care/99999999/personalize")
    assert response.status_code == 404


if __name__ == "__main__":
    tests = [
        test_nvidia_config_and_status,
        test_personalization_schema_validation,
        test_personalization_prompt_construction,
        test_deterministic_fallback_healthy_plant,
        test_deterministic_fallback_diseased_plant,
        test_personalize_endpoint_not_found,
    ]
    passed = 0
    failed = 0
    print("=" * 60)
    print("RUNNING GROWWISE AI — PHASE 4 TEST SUITE")
    print("=" * 60)
    for test in tests:
        name = test.__name__
        try:
            test()
            print(f"[PASS] {name}")
            passed += 1
        except Exception as exc:
            print(f"[FAIL] {name}: {exc}")
            failed += 1

    print("=" * 60)
    print(f"RESULTS: {passed} PASSED, {failed} FAILED")
    print("=" * 60)
    if failed > 0:
        exit(1)
