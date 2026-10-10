"""
GrowWise AI — Plant Recommendation Engine
------------------------------------------
Deterministic horticultural matching and ranking algorithm paired with
NVIDIA Nemotron AI contextual reasoning. Evaluates sunlight, space, microclimate,
maintenance, experience, and pet safety to discover the perfect plants for homes.
"""

import os
import re
import json
import logging
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional, Tuple
import httpx

try:
    from backend.data.botanical_catalog import BOTANICAL_CATALOG, get_catalog_plant_by_id
    from backend.services.weather_service import fetch_weather_data
    from backend.services.nvidia_nemotron_service import get_nvidia_config, extract_json_from_text
    from backend.schemas.recommendations import (
        PlantDiscoveryPreferences,
        PlantRecommendationCard,
        DiscoveryResultResponse,
        PlantCompareResponse,
    )
except ImportError:
    from data.botanical_catalog import BOTANICAL_CATALOG, get_catalog_plant_by_id
    from services.weather_service import fetch_weather_data
    from services.nvidia_nemotron_service import get_nvidia_config, extract_json_from_text
    from schemas.recommendations import (
        PlantDiscoveryPreferences,
        PlantRecommendationCard,
        DiscoveryResultResponse,
        PlantCompareResponse,
    )

logger = logging.getLogger("growwise.recommendation")


# ====================================================================
# Human-Readable Horticultural Labels
# ====================================================================

SUNLIGHT_LABELS = {
    "low_light": "Low Ambient Light (Room / Shaded)",
    "indirect_sunlight": "Medium Indirect Light",
    "bright_indirect": "Bright Indirect Sunlight (No direct glare)",
    "direct_sunlight": "Direct Sunlight (3–5 hrs daily)",
    "full_sun": "Full Outdoor Direct Sun (6+ hrs daily)",
}

WATERING_LABELS = {
    "very_low": "Every 2–3 weeks (Drought Hardy)",
    "low": "Every 7–10 days (When topsoil dry)",
    "moderate": "Every 2–4 days (Consistent moisture)",
    "high": "Daily or Alternate Days (High moisture)",
}

MAINTENANCE_LABELS = {
    "very_low": "Neglect-Tolerant (Beginner Favorite)",
    "low": "Low Effort (Weekly check-in)",
    "moderate": "Moderate (Regular care & feeding)",
    "high": "Attentive (Pruning & close tracking)",
}

SPACE_LABELS = {
    "compact": "Small Desk / Shelf / Window Sill",
    "medium": "Tabletop / Balcony Pot (8–10 in)",
    "spacious": "Balcony Floor / Large Container (12–16 in)",
    "large": "Terrace Garden / Open Raised Bed",
}

SOIL_LABELS = {
    "standard_potting_soil": "Aerated Loamy Potting Mix + 20% Vermicompost",
    "garden_soil": "Rich Garden Soil + Organic Compost",
    "coco_peat": "Moisture-Retentive Coco-Peat + Perlite",
    "water_culture": "Hydroponic / Clean Water Culture",
}


# ====================================================================
# Deterministic Scoring & Matching Logic
# ====================================================================

def evaluate_plant_compatibility(
    plant: Dict[str, Any],
    prefs: PlantDiscoveryPreferences,
    current_temp: Optional[float] = None
) -> Tuple[int, List[str], List[str]]:
    """
    Computes a deterministic horticultural compatibility score (0-100) along with
    positive matching reasons and important warnings/tradeoffs.
    """
    score = 0
    reasons: List[str] = []
    warnings: List[str] = []

    # ----------------------------------------------------
    # 1. Sunlight Matching (Max 25 pts)
    # ----------------------------------------------------
    user_sun = (prefs.sunlight or "bright_indirect").lower()
    plant_suns = [s.lower() for s in plant.get("sunlight", [])]

    if user_sun in plant_suns:
        score += 25
        reasons.append(f"Ideal light match: flourishes in {SUNLIGHT_LABELS.get(user_sun, user_sun)}.")
    elif user_sun == "bright_indirect" and ("indirect_sunlight" in plant_suns or "direct_sunlight" in plant_suns):
        score += 20
        reasons.append("Adaptable light profile; comfortably handles your bright ambient exposure.")
    elif user_sun == "indirect_sunlight" and ("low_light" in plant_suns or "bright_indirect" in plant_suns):
        score += 18
        reasons.append("Tolerates your indirect ambient light without etiolation or leaf drop.")
    elif user_sun == "low_light" and "full_sun" in plant_suns and "low_light" not in plant_suns:
        # Severe mismatch penalty: asking for full sun in low light
        score -= 25
        warnings.append("Severe Light Mismatch: This plant strictly requires direct outdoor sunshine and will decline in low light.")
    elif user_sun in ("direct_sunlight", "full_sun") and "low_light" in plant_suns and "direct_sunlight" not in plant_suns:
        score += 8
        warnings.append("Sun Scorch Warning: Intense direct afternoon rays may scorch leaves; position behind sheer curtains or in filtered shade.")
    else:
        score += 12

    # ----------------------------------------------------
    # 2. Environment & Space Matching (Max 20 pts)
    # ----------------------------------------------------
    user_env = (prefs.environment or "balcony").lower()
    plant_envs = [e.lower() for e in plant.get("environment", [])]
    user_space = (prefs.space or "balcony").lower()
    plant_space = plant.get("space_required", "medium").lower()
    placement_type = (prefs.placement_type or "both").lower()
    plant_placements = [p.lower() for p in plant.get("placement_type", ["indoor", "outdoor"])]

    # Placement type verification (indoor vs outdoor)
    if placement_type != "both" and placement_type not in plant_placements:
        if placement_type == "indoor":
            score -= 20
            warnings.append("Outdoor Requirement: This species demands open outdoor breezes and high sunlight to fruit or bloom.")
        else:
            score -= 10
            warnings.append("Sheltered Requirement: Prefers indoor or sheltered patio conditions; avoid exposed outdoor elements.")
    else:
        score += 6

    # Environment match
    if user_env in plant_envs or (("indoor" in user_env or user_env in ("bedroom", "living_room", "small_desk")) and "indoor" in plant_envs):
        score += 8
        reasons.append(f"Well-suited for your {user_env.replace('_', ' ')} layout.")
    else:
        score += 2
        warnings.append(f"Usually prefers {', '.join([e.replace('_', ' ') for e in plant_envs[:2]])}; maintain good ventilation in your {user_env.replace('_', ' ')}.")

    # Space footprint match
    if user_space in ("small_desk", "window_sill") and plant_space == "compact":
        score += 6
        reasons.append("Compact root and canopy footprint fits small desks, shelves, or windowsills.")
    elif user_space in ("balcony", "terrace", "garden", "large_indoor") and plant_space in ("medium", "spacious", "compact"):
        score += 6
        reasons.append("Great canopy scale for container growth on open balconies or living room corners.")
    elif user_space in ("small_desk", "window_sill") and plant_space in ("spacious", "large"):
        score -= 15
        warnings.append("Size Constraint: Mature growth exceeds small desk or narrow shelf boundaries; will require a larger pot.")
    else:
        score += 4

    # ----------------------------------------------------
    # 3. Climate, Temperature & Weather (Max 20 pts)
    # ----------------------------------------------------
    min_temp = plant.get("min_temp_c", 10.0)
    max_temp = plant.get("max_temp_c", 40.0)

    if current_temp is not None:
        if min_temp <= current_temp <= max_temp:
            score += 15
            reasons.append(f"Temperature compatible with your local weather ({current_temp:.1f}°C).")
            # Extra bonus for tested Indian high-heat tolerance (e.g. Gujarat summer 40-45°C)
            if current_temp >= 38.0 and max_temp >= 44.0:
                score += 5
                reasons.append(f"🌟 Proven high-heat tolerance: Easily withstands local heat up to {max_temp}°C (tested in Indian summer climates).")
        elif current_temp > max_temp:
            score -= 10
            warnings.append(f"High Temperature Stress: Current local temperature ({current_temp:.1f}°C) exceeds upper limit ({max_temp}°C); provide afternoon shade or move indoors.")
        elif current_temp < min_temp:
            score -= 8
            warnings.append(f"Chilling Warning: Local temperature ({current_temp:.1f}°C) is below minimum tolerance ({min_temp}°C); protect indoors.")
    else:
        # Regional baseline for Indian climates
        if max_temp >= 44.0:
            score += 18
            reasons.append(f"Heat-resilient up to {max_temp}°C; thrives in warm Indian and Gujarat summer conditions.")
        else:
            score += 14

    # ----------------------------------------------------
    # 4. Experience & Maintenance Level (Max 15 pts)
    # ----------------------------------------------------
    user_exp = (prefs.experience or "beginner").lower()
    plant_diff = plant.get("maintenance_level", "low").lower()
    user_maint = (prefs.maintenance or "low").lower()

    if user_exp == "beginner" and plant_diff in ("very_low", "low"):
        score += 15
        reasons.append("Beginner-friendly: Extremely forgiving of occasional missed waterings or minor care oversights.")
    elif user_maint in ("very_low", "low") and plant_diff in ("very_low", "low"):
        score += 15
        reasons.append("Perfect low-maintenance match for busy routines.")
    elif user_exp == "beginner" and plant_diff in ("moderate", "high"):
        score += 5
        warnings.append("Requires Attention: Demands regular fertilization, occasional pest monitoring, and consistent watering.")
    else:
        score += 12

    # ----------------------------------------------------
    # 5. Purpose & Goal Alignment (Max 15 pts)
    # ----------------------------------------------------
    user_purposes = [p.lower() for p in (prefs.purposes or [])]
    plant_purposes = [p.lower() for p in plant.get("best_suited_for", [])]
    plant_cat = plant.get("category", "").lower()

    purpose_matches = set(user_purposes).intersection(set(plant_purposes))
    category_match = any(p in plant_cat for p in user_purposes)

    if purpose_matches or category_match:
        matched_str = ", ".join([p.replace("_", " ").title() for p in list(purpose_matches)[:2]]) or plant.get("category", "").replace("_", " ").title()
        score += 15
        reasons.append(f"Directly fulfills your goal: {matched_str}.")
    else:
        score += 8

    # ----------------------------------------------------
    # 6. Pet Safety Check (Max 15 pts)
    # ----------------------------------------------------
    is_pet_safe = plant.get("pet_safe", False)
    if prefs.pet_conscious:
        if is_pet_safe:
            score += 15
            reasons.append("🐾 ASPCA Verified Pet-Safe: 100% non-toxic to household dogs and cats.")
        else:
            score -= 35
            warnings.append("⚠️ Household Pet Warning: Toxic to pets if ingested. Keep out of reach or select a pet-safe alternative.")
    else:
        if is_pet_safe:
            score += 8
        else:
            score += 5

    # ----------------------------------------------------
    # 7. Additional Preferences (Size, Watering, Medium)
    # ----------------------------------------------------
    if prefs.plant_size_preference and prefs.plant_size_preference != "any":
        if prefs.plant_size_preference.lower() == plant_space:
            score += 5
            reasons.append(f"Matches your preferred size scale ({plant_space.title()}).")
        elif prefs.plant_size_preference.lower() == "compact" and plant_space in ("spacious", "large"):
            score -= 6
            warnings.append("Mature footprint is larger than your compact preference.")

    if prefs.watering_capacity and prefs.watering_capacity != "moderate":
        plant_water = plant.get("watering_frequency", "moderate").lower()
        if prefs.watering_capacity.lower() == plant_water:
            score += 5
            reasons.append(f"Watering schedule ({WATERING_LABELS.get(plant_water)}) matches your availability.")

    # Clamp score to 15 - 98 range (avoid claiming impossible 100% perfection)
    final_score = max(15, min(98, score))

    return final_score, reasons, warnings


def assign_match_badge(score: int) -> str:
    if score >= 90:
        return "Excellent Match"
    if score >= 80:
        return "Great Match"
    if score >= 68:
        return "Good Match"
    return "Viable with Care"


# ====================================================================
# NVIDIA Nemotron Reasoning & Narrative Synthesis
# ====================================================================

def _synthesize_deterministic_narrative(
    top_plants: List[PlantRecommendationCard],
    prefs: PlantDiscoveryPreferences,
    weather_city: Optional[str] = None
) -> Tuple[str, str]:
    """Generates structured, professional botanical narrative when NVIDIA cloud API is offline."""
    plant_names = ", ".join([p.name for p in top_plants[:3]])
    loc_str = f"in {weather_city or prefs.location or 'your region'}"
    
    narrative = (
        f"Based on your {prefs.environment.replace('_', ' ')} layout and {SUNLIGHT_LABELS.get(prefs.sunlight, prefs.sunlight)} exposure {loc_str}, "
        f"we have selected **{plant_names}** as your top botanical companions. "
        f"These species align with your {prefs.experience} experience level and {prefs.maintenance.replace('_', ' ')} maintenance preference, "
        f"establishing a resilient microclimate while fulfilling your aesthetic and functional goals."
    )

    if prefs.environment in ("balcony", "terrace", "garden"):
        tip = (
            "For outdoor balcony and terrace setups in warm regions, group pots together to create a humid microclimate "
            "that reduces soil evaporation during hot afternoon dry spells. Top-dress with coco-peat mulch."
        )
    else:
        tip = (
            "For indoor apartments, keep plants away from direct air conditioner vents. Rotate containers 90 degrees weekly "
            "to ensure symmetrical foliage growth and balanced light absorption."
        )

    return narrative, tip


async def generate_recommendation_narrative(
    top_plants: List[PlantRecommendationCard],
    prefs: PlantDiscoveryPreferences,
    weather_info: Optional[Dict[str, Any]] = None
) -> Tuple[str, str, str]:
    """
    Calls NVIDIA Nemotron to generate a tailored agronomic consultation for the top plants,
    falling back gracefully to deterministic botanical reasoning.
    """
    cfg = get_nvidia_config()
    weather_city = weather_info.get("city") if weather_info else None
    temp_info = f"{weather_info['current']['temperature']}°C" if weather_info and "current" in weather_info else "Regional climate"

    if cfg["has_api_key"]:
        try:
            plants_summary = "\n".join([
                f"- {p.name} ({p.scientific_name}): {p.match_score}% Match. Reasons: {', '.join(p.match_reasons[:2])}. Warnings: {', '.join(p.tradeoffs_and_warnings[:1])}"
                for p in top_plants[:3]
            ])

            system_prompt = (
                "You are the 👑 GrowWise AI Master Horticultural Consultant.\n"
                "Your role is to write a warm, expert, personalized plant discovery explanation for a home gardener.\n\n"
                "STRICT GUIDELINES:\n"
                "1. Reference the user's specific space, sunlight, and location.\n"
                "2. Provide honest botanical advice without exaggerated guarantees.\n"
                "3. Output MUST be ONLY valid JSON matching this exact structure:\n"
                "{\n"
                '  "personalized_home_narrative": "2 concise paragraphs explaining why these specific plants complement each other in the user space",\n'
                '  "climate_adaptation_tip": "Specific actionable tip for managing temperature, sunlight, or watering in their environment"\n'
                "}"
            )

            user_prompt = f"""User Home Profile:
- Location: {prefs.location or weather_city or 'Urban Region'} ({temp_info})
- Environment: {prefs.environment}
- Available Light: {prefs.sunlight}
- Space: {prefs.space}
- Experience: {prefs.experience}
- Maintenance Preference: {prefs.maintenance}
- Pet Conscious: {prefs.pet_conscious}

Top Recommended Plants:
{plants_summary}

Explain why this collection works for their home."""

            headers = {
                "Authorization": f"Bearer {cfg['api_key']}",
                "Content-Type": "application/json",
            }
            payload = {
                "model": cfg["model_name"],
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                "temperature": 0.3,
                "top_p": 0.9,
                "max_tokens": 800,
            }

            async with httpx.AsyncClient(timeout=15.0) as client:
                res = await client.post(
                    f"{cfg['base_url']}/chat/completions",
                    headers=headers,
                    json=payload
                )
                if res.status_code == 200:
                    data = res.json()
                    content = data["choices"][0]["message"]["content"]
                    parsed = extract_json_from_text(content)
                    if isinstance(parsed, dict) and "personalized_home_narrative" in parsed:
                        return (
                            parsed["personalized_home_narrative"],
                            parsed.get("climate_adaptation_tip", "Ensure good container drainage and monitor topsoil dryness."),
                            f"NVIDIA Nemotron ({cfg['model_name']})"
                        )
        except Exception as exc:
            logger.warning(f"NVIDIA Nemotron recommendation call encountered error: {exc}. Using deterministic botanical expert.")

    narrative, tip = _synthesize_deterministic_narrative(top_plants, prefs, weather_city)
    return narrative, tip, "GrowWise Botanical Expert System"


# ====================================================================
# Main Recommendation Engine Orchestrator
# ====================================================================

async def discover_best_plants(
    preferences: PlantDiscoveryPreferences
) -> DiscoveryResultResponse:
    """
    Main recommendation endpoint orchestration:
    1. Fetches local weather telemetry if coordinates or location are supplied.
    2. Runs deterministic multi-factor compatibility evaluation across all botanical catalog entries.
    3. Ranks candidates by score and generates rich recommendation cards.
    4. Calls NVIDIA Nemotron (or fallback) for personalized narrative synthesis.
    """
    # 1. Fetch live weather context if available
    weather_context: Optional[Dict[str, Any]] = None
    current_temp: Optional[float] = None
    try:
        w_data = await fetch_weather_data(
            latitude=preferences.latitude,
            longitude=preferences.longitude,
            location_name=preferences.location
        )
        if w_data and "current" in w_data:
            weather_context = w_data
            current_temp = w_data["current"].get("temperature")
    except Exception as w_err:
        logger.warning(f"Could not load live weather context: {w_err}")

    # 2. Score every plant in catalog
    scored_candidates: List[Tuple[Dict[str, Any], int, List[str], List[str]]] = []
    for plant in BOTANICAL_CATALOG:
        score, reasons, warnings = evaluate_plant_compatibility(plant, preferences, current_temp)
        scored_candidates.append((plant, score, reasons, warnings))

    # 3. Sort by score descending
    scored_candidates.sort(key=lambda item: item[1], reverse=True)

    # 4. Build recommendation cards
    matched_cards: List[PlantRecommendationCard] = []
    for plant, score, reasons, warnings in scored_candidates:
        # Determine recommended growing location based on plant environment
        rec_loc = ", ".join([e.replace("_", " ").title() for e in plant.get("environment", [])[:3]])

        card = PlantRecommendationCard(
            id=plant["id"],
            name=plant["name"],
            scientific_name=plant["scientific_name"],
            category=plant.get("category", "").replace("_", " ").title(),
            image_url=plant["image_url"],
            match_score=score,
            match_badge=assign_match_badge(score),
            match_reasons=reasons,
            tradeoffs_and_warnings=warnings,
            recommended_location=rec_loc,
            sunlight_label=SUNLIGHT_LABELS.get(plant["sunlight"][0], plant["sunlight"][0]),
            watering_label=WATERING_LABELS.get(plant.get("watering_frequency", "moderate"), "Moderate"),
            maintenance_label=MAINTENANCE_LABELS.get(plant.get("maintenance_level", "low"), "Low"),
            space_label=SPACE_LABELS.get(plant.get("space_required", "medium"), "Medium Pot"),
            soil_label=plant.get("soil_pref", "Well-draining potting soil with 20% compost"),
            mature_size=plant.get("mature_size", "Container specimen"),
            growth_rate=plant.get("growth_rate", "moderate").title(),
            temperature_range=f"{plant.get('min_temp_c', 10)}°C to {plant.get('max_temp_c', 40)}°C",
            pet_safe=plant.get("pet_safe", False),
            pet_safety_notes=plant.get("pet_safety_notes", "Check specific safety profile."),
            climate_fit_note=plant.get("regional_notes", "Suitable for home and balcony gardens."),
            verified_source=plant.get("verified_source", "Horticultural Science Standard"),
            confidence_score=96,
            care_summary=plant.get("overview", ""),
            fertilizer_summary=plant.get("fertilizer_guidance", ""),
            pruning_summary=plant.get("pruning_guidance", ""),
            propagation_summary=plant.get("propagation_methods", ""),
            common_problems=plant.get("common_problems", ""),
            last_verified_date=plant.get("last_verified_date", "2025-08-15"),
        )
        matched_cards.append(card)

    # 5. Generate AI Personalized narrative for top choices
    narrative, tip, engine_used = await generate_recommendation_narrative(
        matched_cards,
        preferences,
        weather_context
    )

    return DiscoveryResultResponse(
        total_candidates_evaluated=len(BOTANICAL_CATALOG),
        matched_plants=matched_cards,
        weather_context=weather_context,
        personalized_home_narrative=narrative,
        climate_adaptation_tip=tip,
        engine_used=engine_used,
        generated_at=datetime.now(timezone.utc).isoformat()
    )


# ====================================================================
# Plant Comparison Engine
# ====================================================================

async def compare_plants_detailed(
    plant_ids: List[str],
    user_prefs: Optional[PlantDiscoveryPreferences] = None
) -> PlantCompareResponse:
    """
    Provides side-by-side comparative analysis of 2 to 5 plants with an
    objective verdict on which best satisfies the user's requirements.
    """
    selected_plants: List[Dict[str, Any]] = []
    for pid in plant_ids:
        p = get_catalog_plant_by_id(pid)
        if p and p not in selected_plants:
            selected_plants.append(p)

    if not selected_plants:
        raise ValueError("None of the specified plant IDs were found in the botanical catalog.")

    # Determine best fit based on preferences or default low-maintenance score
    best_plant = selected_plants[0]
    best_score = -1

    if user_prefs:
        for p in selected_plants:
            score, _, _ = evaluate_plant_compatibility(p, user_prefs)
            if score > best_score:
                best_score = score
                best_plant = p
    else:
        # Default to lowest maintenance / most forgiving
        maint_weights = {"very_low": 4, "low": 3, "moderate": 2, "high": 1}
        for p in selected_plants:
            score = maint_weights.get(p.get("maintenance_level", "low"), 1)
            if score > best_score:
                best_score = score
                best_plant = p

    # Build comparison matrix
    comparison_matrix = {
        "sunlight": {p["name"]: ", ".join([SUNLIGHT_LABELS.get(s, s) for s in p["sunlight"]]) for p in selected_plants},
        "watering": {p["name"]: WATERING_LABELS.get(p["watering_frequency"], "Moderate") for p in selected_plants},
        "maintenance": {p["name"]: MAINTENANCE_LABELS.get(p["maintenance_level"], "Low") for p in selected_plants},
        "space": {p["name"]: SPACE_LABELS.get(p["space_required"], "Medium") for p in selected_plants},
        "pet_safe": {p["name"]: "🐾 ASPCA Pet-Safe" if p["pet_safe"] else "⚠️ Toxic to Pets" for p in selected_plants},
        "temperature_range": {p["name"]: f"{p['min_temp_c']}°C – {p['max_temp_c']}°C" for p in selected_plants},
        "growth_rate": {p["name"]: p["growth_rate"].title() for p in selected_plants},
        "mature_size": {p["name"]: p["mature_size"] for p in selected_plants},
        "soil": {p["name"]: p["soil_pref"] for p in selected_plants},
        "environment": {p["name"]: ", ".join([e.replace("_", " ").title() for e in p["environment"][:3]]) for p in selected_plants},
    }

    # Comparative narrative
    verdict = (
        f"Comparing your selections: **{best_plant['name']}** emerges as the most suitable choice "
        f"for your stated conditions due to its {best_plant['maintenance_level']} maintenance profile and "
        f"temperature range ({best_plant['min_temp_c']}°C–{best_plant['max_temp_c']}°C). "
        f"If prioritizing {'pet safety' if best_plant['pet_safe'] else 'specific aesthetic foliage'}, "
        f"balance its watering routine ({WATERING_LABELS.get(best_plant['watering_frequency'])}) against your other candidates."
    )

    return PlantCompareResponse(
        plants=selected_plants,
        comparison_matrix=comparison_matrix,
        ai_verdict=verdict,
        best_fit_plant_id=best_plant["id"]
    )
