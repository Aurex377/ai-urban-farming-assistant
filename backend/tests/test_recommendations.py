"""
GrowWise AI — Plant Recommendation Test Suite
----------------------------------------------
Validates Personalized Plant Discovery, Deterministic Matching,
Climate Telemetry, Plant Comparison, and Favorites Persistence.
"""

import pytest
from fastapi.testclient import TestClient

from backend.main import app
from backend.data.botanical_catalog import BOTANICAL_CATALOG, get_catalog_plant_by_id
from backend.services.plant_recommendation_engine import (
    evaluate_plant_compatibility,
    discover_best_plants,
    compare_plants_detailed,
)
from backend.schemas.recommendations import PlantDiscoveryPreferences

client = TestClient(app)


# =====================================================================
# 1. BOTANICAL CATALOG DATA INTEGRITY
# =====================================================================

def test_botanical_catalog_structure_and_completeness():
    """Verify that all plants in the catalog have required horticultural attributes."""
    assert len(BOTANICAL_CATALOG) >= 15

    for plant in BOTANICAL_CATALOG:
        assert "id" in plant and plant["id"]
        assert "name" in plant and plant["name"]
        assert "scientific_name" in plant and plant["scientific_name"]
        assert "category" in plant and plant["category"]
        assert "sunlight" in plant and len(plant["sunlight"]) > 0
        assert "environment" in plant and len(plant["environment"]) > 0
        assert "min_temp_c" in plant and "max_temp_c" in plant
        assert plant["min_temp_c"] < plant["max_temp_c"]
        assert "watering_frequency" in plant
        assert "maintenance_level" in plant
        assert "space_required" in plant
        assert "mature_size" in plant
        assert "pet_safe" in plant and isinstance(plant["pet_safe"], bool)
        assert "verified_source" in plant
        assert "regional_notes" in plant
        assert "overview" in plant
        assert "beginner_care_instructions" in plant


# =====================================================================
# 2. DETERMINISTIC HORTICULTURAL SCORING TESTS
# =====================================================================

def test_low_light_penalizes_full_sun_plants():
    """Verify that selecting low_light heavily penalizes full-sun agricultural plants."""
    prefs = PlantDiscoveryPreferences(
        sunlight="low_light",
        environment="bedroom",
        space="small_desk",
        experience="beginner",
        maintenance="low"
    )

    chili = get_catalog_plant_by_id("chili_pepper")
    snake = get_catalog_plant_by_id("snake_plant")

    score_chili, _, warnings_chili = evaluate_plant_compatibility(chili, prefs)
    score_snake, reasons_snake, _ = evaluate_plant_compatibility(snake, prefs)

    assert score_snake > score_chili
    assert any("Severe Light Mismatch" in w or "decline" in w for w in warnings_chili)
    assert any("Ideal light match" in r for r in reasons_snake)


def test_pet_conscious_strictly_penalizes_toxic_plants():
    """Verify pet-conscious mode ranks pet-safe plants far above toxic plants."""
    prefs_pet_safe = PlantDiscoveryPreferences(
        environment="living_room",
        sunlight="indirect_sunlight",
        pet_conscious=True
    )

    spider = get_catalog_plant_by_id("spider_plant")  # ASPCA Non-toxic
    zz = get_catalog_plant_by_id("zz_plant")          # Toxic

    score_spider, reasons_spider, _ = evaluate_plant_compatibility(spider, prefs_pet_safe)
    score_zz, _, warnings_zz = evaluate_plant_compatibility(zz, prefs_pet_safe)

    assert score_spider > score_zz
    assert any("Pet-Safe" in r for r in reasons_spider)
    assert any("Pet Warning" in w for w in warnings_zz)


def test_gujarat_summer_heat_resilience_bonus():
    """Verify that 42°C summer heat rewards heat-tolerant Indian plants."""
    prefs = PlantDiscoveryPreferences(
        location="Ahmedabad, Gujarat",
        environment="balcony",
        sunlight="direct_sunlight"
    )

    tulsi = get_catalog_plant_by_id("tulsi_holy_basil")  # Max temp 46°C
    fern = get_catalog_plant_by_id("boston_fern")        # Max temp 35°C

    score_tulsi, reasons_tulsi, _ = evaluate_plant_compatibility(tulsi, prefs, current_temp=42.0)
    score_fern, _, warnings_fern = evaluate_plant_compatibility(fern, prefs, current_temp=42.0)

    assert score_tulsi > score_fern
    assert any("heat" in r.lower() for r in reasons_tulsi)
    assert any("High Temperature Stress" in w for w in warnings_fern)


def test_space_constraints_penalize_large_plants():
    """Verify small desk penalizes spacious floor plants."""
    prefs = PlantDiscoveryPreferences(
        space="small_desk",
        environment="bedroom",
        sunlight="bright_indirect"
    )

    jade = get_catalog_plant_by_id("jade_plant")
    lemon = get_catalog_plant_by_id("lemon_tree_nimbu")

    score_jade, _, _ = evaluate_plant_compatibility(jade, prefs)
    score_lemon, _, warnings_lemon = evaluate_plant_compatibility(lemon, prefs)

    assert score_jade > score_lemon
    assert any("Size Constraint" in w for w in warnings_lemon)


# =====================================================================
# 3. RECOMMENDATION ENGINE END-TO-END DISCOVERY
# =====================================================================

@pytest.mark.asyncio
async def test_discover_best_plants_orchestration():
    """Verify full discovery pipeline returns ranked cards and narrative."""
    prefs = PlantDiscoveryPreferences(
        location="Surat, Gujarat",
        environment="balcony",
        sunlight="direct_sunlight",
        space="balcony",
        experience="beginner",
        maintenance="low",
        purposes=["traditional", "medicinal"]
    )

    result = await discover_best_plants(prefs)
    assert result.total_candidates_evaluated == len(BOTANICAL_CATALOG)
    assert len(result.matched_plants) > 0
    assert result.personalized_home_narrative
    assert result.climate_adaptation_tip

    # First matched plant should have highest score
    scores = [p.match_score for p in result.matched_plants]
    assert scores == sorted(scores, reverse=True)


# =====================================================================
# 4. PLANT COMPARISON SERVICE
# =====================================================================

@pytest.mark.asyncio
async def test_compare_plants_detailed():
    """Verify side-by-side comparison matrix and best-fit verdict."""
    plant_ids = ["tulsi_holy_basil", "snake_plant", "spider_plant"]
    res = await compare_plants_detailed(plant_ids)

    assert len(res.plants) == 3
    assert "sunlight" in res.comparison_matrix
    assert "watering" in res.comparison_matrix
    assert "maintenance" in res.comparison_matrix
    assert "pet_safe" in res.comparison_matrix
    assert res.best_fit_plant_id in plant_ids
    assert res.ai_verdict


# =====================================================================
# 5. FASTAPI RECOMMENDATIONS ENDPOINTS
# =====================================================================

def test_api_discover_plants_endpoint():
    """Test POST /api/recommendations/discover"""
    payload = {
        "location": "Ahmedabad",
        "environment": "balcony",
        "sunlight": "direct_sunlight",
        "space": "balcony",
        "experience": "beginner",
        "maintenance": "low",
        "purposes": ["medicinal", "hot_climates"],
        "pet_conscious": False
    }

    res = client.post("/api/recommendations/discover", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert "matched_plants" in data
    assert len(data["matched_plants"]) > 0
    assert "personalized_home_narrative" in data


def test_api_catalog_filtering():
    """Test GET /api/recommendations/catalog with filters"""
    res = client.get("/api/recommendations/catalog?pet_friendly=true")
    assert res.status_code == 200
    plants = res.json()
    assert len(plants) > 0
    for p in plants:
        assert p["pet_safe"] is True


def test_api_plant_detail():
    """Test GET /api/recommendations/plants/{plant_id}"""
    res = client.get("/api/recommendations/plants/tulsi_holy_basil")
    assert res.status_code == 200
    data = res.json()
    assert data["name"] == "Tulsi (Holy Basil)"
    assert data["scientific_name"] == "Ocimum tenuiflorum"

    # Test not found
    res_404 = client.get("/api/recommendations/plants/unknown_plant_xyz")
    assert res_404.status_code == 404


def test_api_compare_plants():
    """Test POST /api/recommendations/compare"""
    payload = {
        "plant_ids": ["tulsi_holy_basil", "curry_leaf_plant"],
        "preferences": {
            "environment": "balcony",
            "sunlight": "full_sun"
        }
    }
    res = client.post("/api/recommendations/compare", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert "comparison_matrix" in data
    assert data["best_fit_plant_id"] in ["tulsi_holy_basil", "curry_leaf_plant"]


def test_api_favorites_crud():
    """Test adding, retrieving, and removing plant favorites"""
    test_user = "test_user_rec_123"

    # 1. Add favorite
    add_res = client.post(f"/api/recommendations/favorites/tulsi_holy_basil?user_id={test_user}")
    assert add_res.status_code == 200
    assert "tulsi_holy_basil" in add_res.json()["favorites"]

    # 2. Get favorites
    get_res = client.get(f"/api/recommendations/favorites?user_id={test_user}")
    assert get_res.status_code == 200
    assert "tulsi_holy_basil" in get_res.json()["favorites"]
    assert len(get_res.json()["plants"]) >= 1

    # 3. Remove favorite
    del_res = client.delete(f"/api/recommendations/favorites/tulsi_holy_basil?user_id={test_user}")
    assert del_res.status_code == 200
    assert "tulsi_holy_basil" not in del_res.json()["favorites"]


def test_api_preferences_persistence():
    """Test saving and retrieving discovery preferences"""
    test_user = "test_user_pref_456"
    pref_payload = {
        "user_id": test_user,
        "preferences": {
            "location": "Vadodara",
            "environment": "window_sill",
            "sunlight": "bright_indirect",
            "space": "window_sill",
            "experience": "beginner",
            "maintenance": "very_low"
        }
    }

    save_res = client.post("/api/recommendations/preferences", json=pref_payload)
    assert save_res.status_code == 200

    get_res = client.get(f"/api/recommendations/preferences?user_id={test_user}")
    assert get_res.status_code == 200
    saved = get_res.json().get("preferences")
    assert saved is not None
    assert saved["location"] == "Vadodara"
    assert saved["environment"] == "window_sill"
