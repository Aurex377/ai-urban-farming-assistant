"""
Context Aggregator Service Module — Phase 3
--------------------------------------------
The central deterministic intelligence aggregator for GrowWise AI.
Gathers and synthesizes all 10 environmental, biological, and historical dimensions:
1. Plant Profile
2. Plant Age & Growth Stage
3. Garden Zone Environment
4. Soil & Container Conditions
5. Watering History & Volume Audit
6. Historical Diagnoses
7. Current Hyperlocal Weather
8. Multi-Day Weather Forecast
9. Active Pathology & Disease Status
10. Approved Clinical Treatment & Care Protocols

Generates a unified, structured context payload optimized for:
- Live display in the React frontend.
- Direct prompt synthesis / context handoff to NVIDIA Nemotron in Phase 4.
"""

from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from supabase import Client

try:
    from backend.services.weather_service import fetch_weather_data
    from backend.services.care_guidance_service import get_approved_care_guidance
    from backend.services.watering_engine import (
        calculate_plant_age_and_stage,
        calculate_watering_recommendation,
    )
except ImportError:
    from services.weather_service import fetch_weather_data
    from services.care_guidance_service import get_approved_care_guidance
    from services.watering_engine import (
        calculate_plant_age_and_stage,
        calculate_watering_recommendation,
    )


def _format_nemotron_prompt_context(dimensions: Dict[str, Any], watering_rec: Dict[str, Any]) -> str:
    """
    Assembles a deterministic, structured system context string
    ready for NVIDIA Nemotron consumption in Phase 4.
    """
    profile = dimensions.get("plant_profile", {})
    age = dimensions.get("plant_age", {})
    zone = dimensions.get("garden_zone", {})
    soil = dimensions.get("soil_and_container", {})
    water_hist = dimensions.get("watering_history", {})
    path_hist = dimensions.get("previous_diagnoses", {})
    curr_weather = dimensions.get("current_weather", {})
    forecast = dimensions.get("weather_forecast", {})
    disease = dimensions.get("current_disease_status", {})
    care = dimensions.get("approved_care_guidance", {})

    lines = [
        "==================================================",
        "GROWWISE AI — DETERMINISTIC AGRONOMIC CONTEXT",
        "==================================================",
        "",
        "DIMENSION 1: PLANT PROFILE",
        f"- Name: {profile.get('name', 'Unknown')}",
        f"- Species: {profile.get('species', 'Unspecified')}",
        f"- Category: {profile.get('plant_type', 'Vegetable')}",
        f"- Health Score: {profile.get('health_score', 100)}/100",
        "",
        "DIMENSION 2: PLANT AGE & PHENOLOGY",
        f"- Age (Days): {age.get('age_days', 30)}",
        f"- Growth Stage: {age.get('growth_stage', 'vegetative').upper()}",
        "",
        "DIMENSION 3: GARDEN ZONE & MICROCLIMATE",
        f"- Location: {zone.get('location', 'Balcony')}",
        f"- Sunlight Exposure: {zone.get('sunlight_exposure') or zone.get('sunlight_level', 'partial_sun')}",
        f"- Setting: {zone.get('indoor_or_outdoor', 'outdoor')}",
        "",
        "DIMENSION 4: EDAPHIC & CONTAINER SPECIFICATIONS",
        f"- Soil Medium: {soil.get('soil_type') or soil.get('soil_medium', 'Potting mix')}",
        f"- Container Volume: {soil.get('pot_size_liters', 7.5)} Liters",
        "",
        "DIMENSION 5: WATERING TELEMETRY",
        f"- Last Watered: {water_hist.get('last_watered_at', 'None recorded')}",
        f"- Days Since Irrigated: {water_hist.get('days_since_watered', 1)}",
        "",
        "DIMENSION 6: HISTORICAL PATHOLOGY",
        f"- Total Past Diagnoses: {path_hist.get('total_past_records', 0)}",
        "",
        "DIMENSION 7: CURRENT AMBIENT WEATHER",
        f"- Temperature: {curr_weather.get('temperature', 22.0)}°C",
        f"- Humidity: {curr_weather.get('humidity', 60.0)}%",
        f"- Precipitation: {curr_weather.get('rainfall', curr_weather.get('rainfall_mm', 0.0))} mm",
        f"- Condition: {curr_weather.get('condition') or curr_weather.get('weather_condition', 'Clear')}",
        "",
        "DIMENSION 8: 5-DAY METEOROLOGICAL FORECAST",
        f"- Multi-Day Summary: {forecast.get('summary', 'Standard seasonal weather')}",
        "",
        "DIMENSION 9: ACTIVE PATHOLOGY STATUS",
        f"- Disease Diagnosis: {disease.get('disease_name', 'Healthy Plant Leaf')}",
        f"- Is Healthy: {disease.get('is_healthy', True)}",
        f"- Diagnostic Confidence: {disease.get('confidence', 1.0)*100:.1f}%",
        f"- Severity: {disease.get('severity', 'none')}",
        f"- Symptoms: {disease.get('symptoms', 'None')}",
        "",
        "DIMENSION 10: APPROVED BOTANICAL CARE GUIDANCE",
        f"- Protocol Name: {care.get('condition_name', 'General Plant Maintenance')}",
        f"- Immediate Action: {care.get('immediate_actions', ['Inspect foliage'])[0] if care.get('immediate_actions') else 'None'}",
        f"- Approved Treatment: {care.get('approved_treatments', ['Routine organic care'])[0] if care.get('approved_treatments') else 'None'}",
        f"- Prevention: {care.get('cultural_preventions', ['Ensure proper drainage'])[0] if care.get('cultural_preventions') else 'None'}",
        f"- Prohibited Actions: {', '.join(care.get('prohibited_actions', [])) or 'None'}",
        "",
        "--------------------------------------------------",
        "DETERMINISTIC WATERING ENGINE DECISION",
        f"- Recommended Target Volume: {watering_rec.get('recommended_amount_ml', 250)} ml",
        f"- Recommended Date: {watering_rec.get('recommended_date', 'Today')}",
        f"- Urgency Level: {watering_rec.get('urgency', 'normal').upper()}",
        f"- Calculation Rationale: {watering_rec.get('reason', 'Routine maintenance')}",
        "=================================================="
    ]
    return "\n".join(lines)


def assemble_plant_recommendation_context(
    plant: Dict[str, Any],
    weather_data: Dict[str, Any],
    latest_diagnosis: Optional[Dict[str, Any]] = None,
    watering_logs: Optional[List[Dict[str, Any]]] = None,
    diagnoses_history: Optional[List[Dict[str, Any]]] = None,
) -> Dict[str, Any]:
    """
    Pure synthesizer combining all 10 agronomic dimensions into a standardized context payload.
    """
    logs = watering_logs or []
    history = diagnoses_history or []

    # 1. Age and Growth Stage
    planted_date = plant.get("planted_date")
    age_days, growth_stage = calculate_plant_age_and_stage(planted_date)

    # 2. Garden Zone & Environment
    location_str = plant.get("location") or "Balcony Garden"
    garden_zone = {
        "location": location_str,
        "sunlight_exposure": plant.get("sunlight_exposure") or ("full_sun" if "sun" in location_str.lower() else "partial_sun"),
        "sunlight_level": "full_sun" if "sun" in location_str.lower() else "partial_sun",
        "indoor_or_outdoor": "indoor" if "indoor" in location_str.lower() or (plant.get("plant_type") or "").lower() == "indoor" else "outdoor",
        "microclimate": "Urban Balcony / Container Microclimate"
    }

    # 3. Soil & Container
    soil_and_container = {
        "soil_type": plant.get("soil_type") or "potting_mix",
        "soil_medium": "Organic potting mix with perlite and compost",
        "pot_size_liters": float(plant.get("pot_size_liters") or 7.5),
        "drainage_quality": "High (unobstructed base drainage)",
        "estimated_moisture_level": "Moderate"
    }

    # 4. Watering History
    last_watered_at = plant.get("last_watered_at")
    if logs and not last_watered_at:
        last_watered_at = logs[0].get("watered_at")

    # 5. Disease Status
    disease_status = {
        "has_active_disease": False,
        "is_healthy": True,
        "disease_name": "Healthy Plant Leaf",
        "confidence": 1.0,
        "severity": "none",
        "symptoms": "No visual pathogen symptoms detected.",
        "diagnosed_at": None,
        "model_used": "NVIDIA Nemotron"
    }

    if latest_diagnosis and latest_diagnosis.get("status") == "completed":
        d_name = latest_diagnosis.get("disease_name", "")
        conf = float(latest_diagnosis.get("confidence") or latest_diagnosis.get("confidence_score") or 0.0)
        is_healthy = "healthy" in d_name.lower() or conf < 0.2

        disease_status = {
            "has_active_disease": not is_healthy,
            "is_healthy": is_healthy,
            "disease_name": d_name if not is_healthy else "Healthy Plant Leaf",
            "confidence": conf,
            "severity": latest_diagnosis.get("severity") or ("none" if is_healthy else "medium"),
            "symptoms": latest_diagnosis.get("symptoms") or ("Clear healthy leaf surface" if is_healthy else "Visible lesions"),
            "diagnosed_at": latest_diagnosis.get("diagnosed_at") or latest_diagnosis.get("created_at"),
            "model_used": latest_diagnosis.get("model_name") or "NVIDIA Nemotron"
        }

    # 6. Deterministic Watering Calculation
    watering_rec = calculate_watering_recommendation(
        plant=plant,
        weather_data=weather_data,
        latest_diagnosis=latest_diagnosis,
        last_watered_at_str=last_watered_at
    )

    # 7. Approved Botanical Care Guidance
    care_guidance = get_approved_care_guidance(
        disease_name=disease_status["disease_name"],
        is_healthy=disease_status["is_healthy"],
        plant_type=plant.get("plant_type")
    )

    # 8. All 10 Dimensions Structured
    dimensions = {
        "plant_profile": {
            "id": plant.get("id"),
            "name": plant.get("name") or plant.get("plant_name"),
            "species": plant.get("species") or "Species unspecified",
            "plant_type": plant.get("plant_type") or "vegetable",
            "variety": plant.get("variety"),
            "planted_date": planted_date,
            "health_score": float(plant.get("health_score") or 100.0),
        },
        "plant_age": {
            "age_days": age_days,
            "growth_stage": growth_stage,
        },
        "garden_zone": garden_zone,
        "soil_and_container": soil_and_container,
        "watering_history": {
            "last_watered_at": last_watered_at,
            "days_since_watered": watering_rec.get("days_since_watered", 1),
            "recent_logs_count": len(logs),
        },
        "previous_diagnoses": {
            "total_past_records": len(history),
            "latest_record": latest_diagnosis,
        },
        "current_weather": weather_data.get("current", {}),
        "weather_forecast": {
            "forecast_days": len(weather_data.get("forecast", [])),
            "summary": weather_data.get("garden_impact", {}).get("summary", "Temperate conditions"),
            "daily": weather_data.get("forecast", []),
        },
        "current_disease_status": disease_status,
        "approved_care_guidance": care_guidance,
    }

    # Formatted Prompt for Nemotron
    prompt_str = _format_nemotron_prompt_context(dimensions, watering_rec)

    return {
        "plant_id": plant.get("id"),
        "assembled_at": datetime.now(timezone.utc).isoformat(),
        "dimensions": dimensions,
        "watering_engine_recommendation": watering_rec,
        "watering_engine_decision": watering_rec,
        "nemotron_ready_prompt_context": prompt_str,
    }


async def aggregate_plant_context(
    plant_id: int,
    supabase: Client,
    user_id: Optional[str] = None
) -> Dict[str, Any]:
    """
    Builds the complete structured context for a specific plant by querying Supabase
    and delegating to assemble_plant_recommendation_context.
    """
    # 1. Fetch Plant Profile
    plant_res = supabase.table("plants").select("*").eq("id", plant_id).execute()
    if not plant_res.data:
        raise ValueError(f"Plant with ID {plant_id} not found.")
    plant = plant_res.data[0]

    # 2. Fetch Watering History
    try:
        watering_logs_res = (
            supabase.table("watering_logs")
            .select("*")
            .eq("plant_id", plant_id)
            .order("watered_at", desc=True)
            .limit(5)
            .execute()
        )
        watering_logs = watering_logs_res.data or []
    except Exception:
        watering_logs = []

    # 3. Fetch Diagnoses History
    try:
        diagnoses_res = (
            supabase.table("diagnoses")
            .select("*")
            .eq("plant_id", plant_id)
            .order("id", desc=True)
            .limit(5)
            .execute()
        )
        diagnoses_history = diagnoses_res.data or []
    except Exception:
        diagnoses_history = []

    latest_diagnosis = diagnoses_history[0] if diagnoses_history else None

    # 4. Fetch Weather Data
    location_name = plant.get("location") or "Balcony Garden"
    weather_data = await fetch_weather_data(location_name=location_name)

    # 5. Assemble Context
    return assemble_plant_recommendation_context(
        plant=plant,
        weather_data=weather_data,
        latest_diagnosis=latest_diagnosis,
        watering_logs=watering_logs,
        diagnoses_history=diagnoses_history,
    )
