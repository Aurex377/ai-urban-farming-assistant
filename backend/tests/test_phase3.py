"""
GrowWise AI — Phase 3 Test Suite
--------------------------------
Validates Deterministic Decision Support Layer:
1. Deterministic Watering Engine:
   - Species baseline calculations
   - Growth stage multipliers (seedling, flowering, mature)
   - Weather evapotranspiration adjustments (temperature & humidity)
   - Rainfall suppression & postponement logic
   - Pathogen throttling (root rot volume suppression)
2. Approved Care Guidance:
   - Disease protocol matching (Early Blight, Late Blight, Root Rot, Powdery Mildew, etc.)
   - Healthy maintenance fallback
   - Protocol schema integrity (immediate actions, approved treatments, preventions, prohibitions)
3. Weather Telemetry & Fallback:
   - Deterministic offline telemetry generation
   - Agricultural impact narrative
4. 10-Dimension Context Aggregator:
   - Full 10-dimension assembly
   - Formatted string for Phase 4 NVIDIA Nemotron consumption
5. FastAPI Endpoints:
   - GET /api/weather/current
   - GET /api/weather/forecast
   - GET /api/care/protocols
   - GET /api/watering/schedule/all
"""

import math
import asyncio
from datetime import datetime, timezone, timedelta
from fastapi.testclient import TestClient

from backend.main import app
from backend.services.watering_engine import (
    calculate_watering_recommendation,
    STAGE_MULTIPLIERS,
    SPECIES_BASELINES,
)
from backend.services.care_guidance_service import (
    get_approved_care_guidance,
    CARE_PROTOCOLS,
)
from backend.services.weather_service import (
    fetch_weather_data,
    _generate_fallback_weather,
)
from backend.services.context_aggregator import (
    assemble_plant_recommendation_context,
    _format_nemotron_prompt_context,
)

client = TestClient(app)


# =====================================================================
# 1. WATERING ENGINE TESTS
# =====================================================================

def test_watering_baseline_and_stage_multipliers():
    """Verify that stage multipliers scale baseline volume deterministically."""
    now = datetime.now(timezone.utc)
    seedling_planted = (now - timedelta(days=5)).strftime("%Y-%m-%d")
    flowering_planted = (now - timedelta(days=60)).strftime("%Y-%m-%d")
    last_watered = (now - timedelta(days=3)).strftime("%Y-%m-%d")

    plant_seedling = {
        "id": 1,
        "name": "Cherry Tomato",
        "species": "Solanum lycopersicum",
        "plant_type": "vegetable",
        "planted_date": seedling_planted,
        "soil_type": "potting_mix",
        "location": "South Balcony (full sun)",
        "pot_size_liters": 5.0
    }
    plant_flowering = {
        **plant_seedling,
        "planted_date": flowering_planted
    }

    neutral_weather = {
        "current": {"temperature": 22.0, "humidity": 50.0, "rainfall": 0.0},
        "forecast": [{"rainfall": 0.0, "temp_max": 22.0}]
    }

    rec_seedling = calculate_watering_recommendation(
        plant=plant_seedling,
        weather_data=neutral_weather,
        last_watered_at_str=last_watered
    )

    rec_flowering = calculate_watering_recommendation(
        plant=plant_flowering,
        weather_data=neutral_weather,
        last_watered_at_str=last_watered
    )

    assert rec_seedling["recommended_amount_ml"] < rec_flowering["recommended_amount_ml"]
    expected_ratio = STAGE_MULTIPLIERS["seedling"] / STAGE_MULTIPLIERS["flowering_fruiting"]
    actual_ratio = rec_seedling["recommended_amount_ml"] / rec_flowering["recommended_amount_ml"]
    assert math.isclose(actual_ratio, expected_ratio, rel_tol=0.2)


def test_watering_weather_evapotranspiration_adjustment():
    """Verify hot and dry weather increases recommended water volume."""
    now = datetime.now(timezone.utc)
    last_watered = (now - timedelta(days=2)).strftime("%Y-%m-%d")

    plant = {
        "id": 2,
        "name": "Sweet Basil",
        "species": "Ocimum basilicum",
        "plant_type": "herb",
        "location": "Balcony partial shade",
        "pot_size_liters": 3.0
    }

    mild_weather = {
        "current": {"temperature": 20.0, "humidity": 65.0, "rainfall": 0.0},
        "forecast": [{"rainfall": 0.0}]
    }

    hot_dry_weather = {
        "current": {"temperature": 34.0, "humidity": 30.0, "rainfall": 0.0},
        "forecast": [{"rainfall": 0.0}]
    }

    rec_mild = calculate_watering_recommendation(plant, mild_weather, last_watered_at_str=last_watered)
    rec_hot = calculate_watering_recommendation(plant, hot_dry_weather, last_watered_at_str=last_watered)

    assert rec_hot["recommended_amount_ml"] > rec_mild["recommended_amount_ml"]
    assert "heat" in rec_hot["reason"].lower() or "temperature" in rec_hot["reason"].lower()


def test_watering_rain_suppression():
    """Verify forecasted heavy rain postpones or reduces watering recommendation."""
    now = datetime.now(timezone.utc)
    last_watered = (now - timedelta(days=2)).strftime("%Y-%m-%d")

    plant = {
        "id": 3,
        "name": "Mint",
        "plant_type": "herb",
        "location": "Outdoor Balcony",
    }

    rainy_weather = {
        "current": {"temperature": 18.0, "humidity": 85.0, "rainfall": 8.0},
        "forecast": [{"rainfall": 12.0, "temp_max": 18.0}]
    }

    rec_rain = calculate_watering_recommendation(plant, rainy_weather, last_watered_at_str=last_watered)

    assert rec_rain["recommended_amount_ml"] == 0 or "Rain" in rec_rain["recommended_date"]
    assert "Rain" in rec_rain["reason"] or "rainfall" in rec_rain["reason"]


def test_watering_pathogen_throttle_root_rot():
    """Verify active root rot diagnosis severely throttles watering volume."""
    now = datetime.now(timezone.utc)
    last_watered = (now - timedelta(days=3)).strftime("%Y-%m-%d")

    plant = {
        "id": 4,
        "name": "Tomato",
        "plant_type": "vegetable",
        "location": "Outdoor Garden",
    }

    normal_weather = {
        "current": {"temperature": 24.0, "humidity": 50.0, "rainfall": 0.0},
        "forecast": [{"rainfall": 0.0}]
    }

    root_rot_diag = {
        "disease_name": "Root Rot (Pythium)",
        "is_healthy": False,
        "status": "completed"
    }

    rec_normal = calculate_watering_recommendation(plant, normal_weather, last_watered_at_str=last_watered)
    rec_throttled = calculate_watering_recommendation(
        plant, normal_weather, latest_diagnosis=root_rot_diag, last_watered_at_str=last_watered
    )

    # Root rot multiplier is 0.20
    assert rec_throttled["recommended_amount_ml"] < rec_normal["recommended_amount_ml"] * 0.35
    assert "root rot" in rec_throttled["reason"].lower()


# =====================================================================
# 2. APPROVED CARE GUIDANCE TESTS
# =====================================================================

def test_care_guidance_for_known_diseases():
    """Verify exact clinical guidance matching for known botanical diseases."""
    diseases = ["Early Blight", "Late Blight", "Powdery Mildew", "Leaf Spot", "Root Rot", "Aphids"]

    for d in diseases:
        guidance = get_approved_care_guidance(disease_name=d, is_healthy=False)
        assert guidance["condition_name"] is not None
        assert len(guidance["immediate_actions"]) > 0
        assert len(guidance["approved_treatments"]) > 0
        assert len(guidance["cultural_preventions"]) > 0
        assert len(guidance["prohibited_actions"]) > 0


def test_care_guidance_healthy_fallback():
    """Verify healthy maintenance guidance is returned for healthy plant."""
    guidance = get_approved_care_guidance(disease_name="Healthy Plant Leaf", is_healthy=True)
    assert "Healthy" in guidance["condition_name"]
    assert guidance["urgency"] in ("routine", "preventative")
    assert len(guidance["approved_treatments"]) > 0


def test_care_protocols_knowledge_base():
    """Verify CARE_PROTOCOLS knowledge base contains all required keys."""
    assert "early blight" in CARE_PROTOCOLS
    assert "late blight" in CARE_PROTOCOLS
    assert "powdery mildew" in CARE_PROTOCOLS
    assert "healthy" in CARE_PROTOCOLS

    for key, protocol in CARE_PROTOCOLS.items():
        assert "immediate_actions" in protocol
        assert "approved_treatments" in protocol
        assert "cultural_preventions" in protocol
        assert "prohibited_actions" in protocol


# =====================================================================
# 3. WEATHER SERVICE & RESILIENCE TESTS
# =====================================================================

def test_weather_fallback_generation():
    """Verify fallback weather generation returns valid meteorological numbers."""
    fallback = _generate_fallback_weather("Urban Balcony Zone")
    assert fallback["city"] == "Urban Balcony Zone"
    assert 15.0 <= fallback["current"]["temperature"] <= 35.0
    assert 30.0 <= fallback["current"]["humidity"] <= 90.0
    assert len(fallback["forecast"]) == 5
    impact_str = str(fallback["garden_impact"])
    assert len(impact_str) > 10


def test_fetch_weather_data_sync():
    """Verify fetch_weather_data completes and returns structured payload."""
    data = asyncio.run(fetch_weather_data(location_name="Berlin"))
    assert "city" in data
    assert "current" in data
    assert "forecast" in data
    assert "garden_impact" in data


# =====================================================================
# 4. CONTEXT AGGREGATOR & 10 DIMENSIONS TESTS
# =====================================================================

def test_context_aggregator_nemotron_prompt_structure():
    """Verify _format_nemotron_prompt_context outputs all 10 agronomic dimensions."""
    mock_dimensions = {
        "plant_profile": {"name": "Beefsteak Tomato", "species": "Solanum lycopersicum", "plant_type": "vegetable"},
        "plant_age": {"age_days": 45, "growth_stage": "flowering"},
        "garden_zone": {"location": "South Balcony", "sunlight_exposure": "full_sun"},
        "soil_and_container": {"soil_type": "potting_mix", "pot_size_liters": 15.0},
        "watering_history": {"last_watered_at": "2026-10-08T00:00:00Z", "days_since_watered": 2},
        "previous_diagnoses": {"total_past_records": 1, "history": []},
        "current_weather": {"temperature": 26.0, "humidity": 45.0, "rainfall": 0.0, "condition": "Sunny"},
        "weather_forecast": {"forecast_days": 5, "summary": "Clear conditions"},
        "current_disease_status": {"disease_name": "Early Blight", "is_healthy": False, "confidence": 0.89},
        "approved_care_guidance": {
            "condition_name": "Early Blight",
            "immediate_actions": ["Prune lower leaves."],
            "approved_treatments": ["Apply copper fungicide."],
            "cultural_preventions": ["Mulch soil."],
            "prohibited_actions": ["No overhead watering."]
        }
    }

    mock_rec = {
        "recommended_amount_ml": 450,
        "recommended_date": "Today",
        "urgency": "high",
        "reason": "Flowering stage and high ambient temperature."
    }

    formatted = _format_nemotron_prompt_context(mock_dimensions, mock_rec)

    assert "GROWWISE AI — DETERMINISTIC AGRONOMIC CONTEXT" in formatted
    assert "DIMENSION 1: PLANT PROFILE" in formatted
    assert "DIMENSION 2: PLANT AGE & PHENOLOGY" in formatted
    assert "DIMENSION 3: GARDEN ZONE & MICROCLIMATE" in formatted
    assert "DIMENSION 4: EDAPHIC & CONTAINER SPECIFICATIONS" in formatted
    assert "DIMENSION 5: WATERING TELEMETRY" in formatted
    assert "DIMENSION 6: HISTORICAL PATHOLOGY" in formatted
    assert "DIMENSION 7: CURRENT AMBIENT WEATHER" in formatted
    assert "DIMENSION 8: 5-DAY METEOROLOGICAL FORECAST" in formatted
    assert "DIMENSION 9: ACTIVE PATHOLOGY STATUS" in formatted
    assert "DIMENSION 10: APPROVED BOTANICAL CARE GUIDANCE" in formatted
    assert "DETERMINISTIC WATERING ENGINE DECISION" in formatted
    assert "Beefsteak Tomato" in formatted
    assert "Early Blight" in formatted


# =====================================================================
# 5. FASTAPI ROUTE ENDPOINTS INTEGRATION
# =====================================================================

def test_api_weather_current():
    """Verify GET /api/weather/current returns 200 with ambient metrics."""
    response = client.get("/api/weather/current")
    assert response.status_code == 200
    data = response.json()
    assert "temperature" in data
    assert "humidity" in data
    assert "condition" in data


def test_api_weather_forecast():
    """Verify GET /api/weather/forecast returns 200 with multi-day forecast."""
    response = client.get("/api/weather/forecast")
    assert response.status_code == 200
    data = response.json()
    assert "current" in data
    assert "forecast" in data
    assert len(data["forecast"]) >= 1


def test_api_care_protocols():
    """Verify GET /api/care/protocols returns 200 with approved protocols."""
    response = client.get("/api/care/protocols")
    assert response.status_code == 200
    protocols = response.json()
    assert isinstance(protocols, list)
    assert len(protocols) >= 5
    first = protocols[0]
    assert "condition_name" in first
    assert "immediate_actions" in first
    assert "approved_treatments" in first


def test_api_watering_schedule_all():
    """Verify GET /api/watering/schedule/all returns structured schedule."""
    response = client.get("/api/watering/schedule/all")
    assert response.status_code == 200
    data = response.json()
    assert "today" in data
    assert "tomorrow" in data
    assert "upcoming" in data
    assert "today_volume_ml" in data


if __name__ == "__main__":
    tests = [
        test_watering_baseline_and_stage_multipliers,
        test_watering_weather_evapotranspiration_adjustment,
        test_watering_rain_suppression,
        test_watering_pathogen_throttle_root_rot,
        test_care_guidance_for_known_diseases,
        test_care_guidance_healthy_fallback,
        test_care_protocols_knowledge_base,
        test_weather_fallback_generation,
        test_fetch_weather_data_sync,
        test_context_aggregator_nemotron_prompt_structure,
        test_api_weather_current,
        test_api_weather_forecast,
        test_api_care_protocols,
        test_api_watering_schedule_all,
    ]

    passed = 0
    failed = 0
    print("=" * 60)
    print("RUNNING GROWWISE AI — PHASE 3 TEST SUITE")
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
