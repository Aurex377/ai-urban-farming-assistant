"""
GrowWise AI — Plant Coach & Knowledge Transfer Test Suite
---------------------------------------------------------
Validates:
1. Plant Coach Conversational Agent with 10-dimension agronomic grounding
2. Topic-aware response synthesis (Watering, Pruning, Pathology, Nutrition)
3. 5 Botanical Knowledge Transfer Modules (Edaphic, Photobiology, Nutrition, SAR, Companions)
4. REST API Endpoints:
   - POST /api/care/{plant_id}/coach/chat
   - GET /api/care/{plant_id}/knowledge-transfer
5. Error handling and 404 validation for missing plants
"""

import pytest
from unittest.mock import MagicMock, AsyncMock, patch
from fastapi.testclient import TestClient

from backend.main import app
from backend.services.plant_coach_service import (
    ask_plant_coach,
    get_plant_knowledge_transfer,
    _generate_deterministic_coach_reply,
)

client = TestClient(app)


def get_mock_context(is_healthy=True, disease_name="Healthy Plant Leaf", plant_name="Lemon Tree", species="Citrus limon"):
    return {
        "plant_id": 10,
        "dimensions": {
            "plant_profile": {
                "id": 10,
                "name": plant_name,
                "species": species,
                "plant_type": "fruit_tree",
                "health_score": 90.0 if is_healthy else 65.0,
            },
            "plant_age": {
                "age_days": 120,
                "growth_stage": "vegetative",
            },
            "soil_and_moisture": {
                "pot_size_liters": 15.0,
                "soil_type": "well_draining_citrus_mix",
            },
            "garden_zone": {
                "location": "Patio Container",
                "sunlight_exposure": "full_sun",
                "indoor_or_outdoor": "outdoor",
            },
            "environmental_weather": {
                "temperature": 27.5,
                "humidity": 48.0,
                "condition": "Sunny",
            },
            "pathology_and_disease": {
                "disease_name": disease_name,
                "is_healthy": is_healthy,
                "severity": "none" if is_healthy else "medium",
                "symptoms": "Yellowing leaf veins" if not is_healthy else "Vigorous green foliage",
            },
        },
        "watering_engine_recommendation": {
            "recommended_amount_ml": 530.0,
            "recommended_date": "Today",
            "urgency": "normal",
            "reason": "Citrus baseline scaled for 15L container and warm ambient conditions",
        },
    }


def test_deterministic_coach_watering_query():
    """Verify coach correctly embeds calibrated 530 ml watering amount in reply."""
    mock_ctx = get_mock_context()
    res = _generate_deterministic_coach_reply(mock_ctx, "How much should I water today?")
    
    assert "530.0 ml" in res["reply"]
    assert "Today" in res["reply"]
    assert res["knowledge_takeaway"]
    assert res["actionable_step"]
    assert len(res["suggested_follow_ups"]) >= 2


def test_deterministic_coach_pruning_query():
    """Verify coach gives sterile pruning guidance."""
    mock_ctx = get_mock_context(plant_name="Basil", species="Ocimum basilicum")
    res = _generate_deterministic_coach_reply(mock_ctx, "Can I prune or cut back stems?")
    
    assert "prun" in res["reply"].lower()
    assert "alcohol" in res["reply"].lower() or "steril" in res["reply"].lower()
    assert res["knowledge_takeaway"]
    assert res["actionable_step"]


def test_deterministic_coach_disease_query():
    """Verify coach provides organic intervention for active disease."""
    mock_ctx = get_mock_context(is_healthy=False, disease_name="Citrus Greening", plant_name="Lemon Tree")
    res = _generate_deterministic_coach_reply(mock_ctx, "What spray or treatment should I use?")
    
    assert "Citrus Greening" in res["reply"]
    assert "organic" in res["reply"].lower()
    assert res["knowledge_takeaway"]
    assert res["actionable_step"]


@pytest.mark.asyncio
async def test_ask_plant_coach_pipeline():
    """Verify full ask_plant_coach pipeline works cleanly."""
    mock_ctx = get_mock_context()
    with patch("backend.services.plant_coach_service.aggregate_plant_context", new_callable=AsyncMock, return_value=mock_ctx):
        res = await ask_plant_coach(plant_id=10, message="How is my plant doing?", history=[])
        assert "Lemon Tree" in res["reply"]
        assert res["knowledge_takeaway"]
        assert res["actionable_step"]
        assert len(res["suggested_follow_ups"]) >= 2


@pytest.mark.asyncio
async def test_get_plant_knowledge_transfer():
    """Verify all 5 knowledge transfer modules are synthesized with principles and science notes."""
    mock_ctx = get_mock_context()
    with patch("backend.services.plant_coach_service.aggregate_plant_context", new_callable=AsyncMock, return_value=mock_ctx):
        res = await get_plant_knowledge_transfer(plant_id=10)
        assert res["plant_id"] == 10
        assert res["plant_name"] == "Lemon Tree"
        assert len(res["modules"]) == 5
        
        module_ids = [m["id"] for m in res["modules"]]
        assert "root_zone_dynamics" in module_ids
        assert "photobiology_and_vpd" in module_ids
        assert "organic_nutrition" in module_ids
        assert "pathogen_defense_sar" in module_ids
        assert "companion_ecology" in module_ids

        for mod in res["modules"]:
            assert mod["title"]
            assert len(mod["key_principles"]) >= 2
            assert mod["practical_action"]
            assert mod["botanical_science_note"]


def test_coach_chat_api_endpoint_not_found():
    """Verify POST /api/care/99999999/coach/chat returns 404 for non-existent plant."""
    response = client.post(
        "/api/care/99999999/coach/chat",
        json={"message": "Help with watering"}
    )
    assert response.status_code == 404


def test_knowledge_transfer_api_endpoint_not_found():
    """Verify GET /api/care/99999999/knowledge-transfer returns 404 for non-existent plant."""
    response = client.get("/api/care/99999999/knowledge-transfer")
    assert response.status_code == 404
