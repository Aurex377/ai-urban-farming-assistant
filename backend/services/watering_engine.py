"""
Deterministic Watering Engine — Phase 3
----------------------------------------
Calculates scientific, plant-specific watering recommendations combining:
- Species and plant category evapotranspiration baseline
- Plant age and phenological stage
- Garden zone microclimate (indoor vs outdoor, sunlight levels)
- Container soil drainage dynamics
- Historical irrigation intervals (days since last watered)
- Ambient weather telemetry (temperature, relative humidity, recent rainfall)
- Weather forecast (upcoming precipitation probability)
- Active disease status (throttles moisture for root rot or fungal foliage pathogens)
"""

from datetime import datetime, timezone, timedelta
from typing import Dict, Any, Optional, Tuple


# Baseline species water volume in milliliters per day for a typical 5-10 liter container
SPECIES_WATER_BASELINE_ML: Dict[str, float] = {
    "vegetable": 450.0,
    "fruit": 500.0,
    "herb": 250.0,
    "flower": 300.0,
    "indoor": 180.0,
    "succulent": 80.0,
    "other": 300.0,
}
SPECIES_BASELINES = SPECIES_WATER_BASELINE_ML

# Granular species-specific baselines (base_ml, ideal_interval_days, display_name)
SPECIES_SPECIFIC_BASELINES: Dict[str, Tuple[float, int, str]] = {
    "tomato": (480.0, 1, "Tomato"),
    "solanum lycopersicum": (480.0, 1, "Tomato"),
    "citrus": (560.0, 2, "Citrus"),
    "lemon": (540.0, 2, "Lemon"),
    "citrus limon": (540.0, 2, "Lemon"),
    "orange": (560.0, 2, "Orange"),
    "pepper": (420.0, 1, "Pepper"),
    "capsicum": (420.0, 1, "Pepper"),
    "chili": (390.0, 1, "Chili"),
    "basil": (240.0, 2, "Basil"),
    "ocimum basilicum": (240.0, 2, "Basil"),
    "mint": (280.0, 1, "Mint"),
    "rosemary": (160.0, 3, "Rosemary"),
    "thyme": (140.0, 3, "Thyme"),
    "lettuce": (350.0, 1, "Lettuce"),
    "spinach": (320.0, 1, "Spinach"),
    "strawberry": (380.0, 1, "Strawberry"),
    "cucumber": (500.0, 1, "Cucumber"),
    "monstera": (320.0, 4, "Monstera"),
    "pothos": (200.0, 4, "Pothos"),
    "snake plant": (100.0, 10, "Snake Plant"),
    "sansevieria": (100.0, 10, "Snake Plant"),
    "succulent": (80.0, 10, "Succulent"),
    "cactus": (60.0, 14, "Cactus"),
    "orchid": (150.0, 7, "Orchid"),
    "rose": (420.0, 2, "Rose"),
}

# Watering Interval (days between watering) under moderate baseline conditions
SPECIES_INTERVAL_DAYS: Dict[str, int] = {
    "vegetable": 1,
    "fruit": 1,
    "herb": 2,
    "flower": 2,
    "indoor": 4,
    "succulent": 10,
    "other": 2,
}

# Growth stage multipliers
STAGE_MULTIPLIERS: Dict[str, float] = {
    "seedling": 0.5,
    "vegetative": 1.0,
    "flowering_fruiting": 1.25,
    "mature": 1.1,
}


def calculate_plant_age_and_stage(planted_date_str: Optional[str]) -> Tuple[int, str]:
    """
    Computes plant age in days and growth stage from planted_date.
    Stages: 'seedling' (0-14d), 'vegetative' (15-45d), 'flowering_fruiting' (46-90d), 'mature' (90d+)
    """
    if not planted_date_str:
        return 30, "vegetative"

    try:
        # Support YYYY-MM-DD or ISO timestamp
        clean_date = planted_date_str.split("T")[0]
        planted_dt = datetime.strptime(clean_date, "%Y-%m-%d").replace(tzinfo=timezone.utc)
        now = datetime.now(timezone.utc)
        age_days = max(1, (now - planted_dt).days)

        if age_days <= 14:
            stage = "seedling"
        elif age_days <= 45:
            stage = "vegetative"
        elif age_days <= 90:
            stage = "flowering_fruiting"
        else:
            stage = "mature"

        return age_days, stage
    except Exception:
        return 30, "vegetative"


def calculate_watering_recommendation(
    plant: Dict[str, Any],
    weather_data: Optional[Dict[str, Any]] = None,
    latest_diagnosis: Optional[Dict[str, Any]] = None,
    last_watered_at_str: Optional[str] = None
) -> Dict[str, Any]:
    """
    Executes the deterministic watering calculation.
    Returns structured recommendation context for display and future Nemotron handoff.
    """
    plant_type = (plant.get("plant_type") or "vegetable").lower()
    species_input = f"{plant.get('species') or ''} {plant.get('name') or ''} {plant.get('variety') or ''}".lower()

    # Search for specific species baseline
    matched_species_key = None
    matched_species_name = None
    for k, v in SPECIES_SPECIFIC_BASELINES.items():
        if k in species_input:
            matched_species_key = k
            base_volume = v[0]
            ideal_interval = v[1]
            matched_species_name = v[2]
            break

    if not matched_species_key:
        base_volume = SPECIES_WATER_BASELINE_ML.get(plant_type, 300.0)
        ideal_interval = SPECIES_INTERVAL_DAYS.get(plant_type, 2)

    # 1. Container / Pot Size Scaling
    pot_size = float(plant.get("pot_size_liters") or plant.get("container_volume_liters") or 0.0)
    if pot_size > 0.0:
        # Standard baseline is 7.5L container. Small pots dry quickly; large containers hold more.
        pot_multiplier = min(2.5, max(0.4, (pot_size / 7.5) ** 0.55))
    else:
        pot_multiplier = 1.0

    # 2. Growth Stage Multiplier
    planted_date = plant.get("planted_date")
    age_days, stage = calculate_plant_age_and_stage(planted_date)
    stage_multiplier = {
        "seedling": 0.5,           # Small root system needs small frequent sips
        "vegetative": 1.0,         # Standard vegetative uptake
        "flowering_fruiting": 1.25, # High transpiration and water demand during fruiting
        "mature": 1.1,
    }.get(stage, 1.0)

    # 2. Garden Zone Multiplier
    location_str = (plant.get("location") or "").lower()
    is_indoor = "indoor" in location_str or plant_type == "indoor"
    sunlight = "full_sun"
    if "shade" in location_str:
        sunlight = "shade"
    elif "partial" in location_str:
        sunlight = "partial_sun"

    sunlight_multiplier = {
        "full_sun": 1.25,
        "partial_sun": 1.0,
        "shade": 0.75,
    }.get(sunlight, 1.0)

    # 3. Weather Adjustments (Applicable to outdoor plants or open balconies)
    weather_multiplier = 1.0
    weather_notes = []
    weather_based = False

    current_weather = (weather_data or {}).get("current", {})
    weather_available = (weather_data or {}).get("available", True) and (weather_data or {}).get("is_available", True) and current_weather.get("source") != "unavailable"
    temp = float(current_weather.get("temperature", 24.0)) if current_weather.get("temperature") is not None else 24.0
    humidity = float(current_weather.get("humidity", 60.0)) if current_weather.get("humidity") is not None else 60.0
    recent_rainfall = float(current_weather.get("rainfall_mm") if current_weather.get("rainfall_mm") is not None else current_weather.get("rainfall", 0.0))

    forecast_days = (weather_data or {}).get("forecast", [])
    rain_tomorrow = False
    if len(forecast_days) > 1:
        next_day_rain = float(forecast_days[1].get("rainfall_mm") if forecast_days[1].get("rainfall_mm") is not None else forecast_days[1].get("rainfall", 0.0))
        rain_tomorrow = next_day_rain >= 3.0 or int(forecast_days[1].get("rain_chance", 0)) >= 65

    if not is_indoor:
        if weather_available:
            weather_based = True
            # Temperature effect
            if temp >= 32.0:
                weather_multiplier *= 1.35
                weather_notes.append(f"High heat ({temp}°C) accelerates soil evapotranspiration (+35%).")
            elif temp >= 28.0:
                weather_multiplier *= 1.15
                weather_notes.append(f"Warm conditions ({temp}°C) increase plant water demand (+15%).")
            elif temp <= 16.0:
                weather_multiplier *= 0.75
                weather_notes.append(f"Cool temperature ({temp}°C) lowers plant uptake (-25%).")

            # Humidity effect
            if humidity <= 35.0:
                weather_multiplier *= 1.15
                weather_notes.append(f"Dry ambient air ({humidity}% RH) increases leaf transpiration (+15%).")
            elif humidity >= 80.0:
                weather_multiplier *= 0.85
                weather_notes.append(f"High atmospheric humidity ({humidity}% RH) slows evaporation (-15%).")
        else:
            weather_based = False
            weather_notes.append("Hyperlocal weather telemetry is currently unavailable; calculated using calibrated species baseline without microclimate multiplier.")

    # 4. Disease / Pathology Throttle
    disease_multiplier = 1.0
    disease_name = ""
    is_disease_active = False

    if latest_diagnosis and latest_diagnosis.get("status") == "completed":
        disease_name = latest_diagnosis.get("disease_name", "")
        if "healthy" not in disease_name.lower():
            is_disease_active = True
            d_lower = disease_name.lower()
            if "rot" in d_lower or "pythium" in d_lower:
                disease_multiplier = 0.2
                weather_notes.append(f"Root rot detected ({disease_name}): watering severely restricted (-80%) to allow root aeration.")
            elif "blight" in d_lower or "mildew" in d_lower or "spot" in d_lower:
                disease_multiplier = 0.85
                weather_notes.append(f"Foliar pathogen active ({disease_name}): reduce canopy moisture; bottom-water only.")
    elif latest_diagnosis and latest_diagnosis.get("status") in ("uncertain", "inconclusive"):
        weather_notes.append("Diagnosis is unconfirmed/inconclusive: maintaining standard watering without pathogen volume suppression.")

    # 5. Elapsed Time Since Last Watered
    last_watered = last_watered_at_str or plant.get("last_watered_at")
    days_since_watered = 1
    clean_last = None
    if last_watered:
        try:
            clean_last = str(last_watered).split("T")[0]
            last_dt = datetime.strptime(clean_last, "%Y-%m-%d").replace(tzinfo=timezone.utc)
            days_since_watered = max(0, (datetime.now(timezone.utc) - last_dt).days)
        except Exception:
            days_since_watered = 1

    # 6. Calculate Final Volume
    calculated_volume = base_volume * stage_multiplier * sunlight_multiplier * weather_multiplier * disease_multiplier * pot_multiplier
    # Round to nearest 10 ml
    recommended_ml = max(50.0, round(calculated_volume / 10.0) * 10.0)

    # 7. Determine Scheduling & Urgency
    now_iso = datetime.now(timezone.utc).date()
    needs_water_today = False
    skip_reason = None

    if clean_last and days_since_watered == 0:
        # Already watered today!
        needs_water_today = False
        urgency = "satisfied"
        days_until = max(1, ideal_interval)
        recommended_date = str(now_iso + timedelta(days=days_until))
        skip_reason = f"Hydration intake satisfied today ({clean_last}). Next scheduled watering on {recommended_date}."
    elif not is_indoor and recent_rainfall >= 5.0 and weather_available:
        recommended_ml = 0.0
        needs_water_today = False
        skip_reason = f"Recent natural rainfall ({recent_rainfall} mm) thoroughly hydrated the root zone."
        recommended_date = str(now_iso + timedelta(days=2))
        urgency = "skip"
    elif not is_indoor and rain_tomorrow and plant_type != "seedling" and weather_available:
        recommended_ml = round(recommended_ml * 0.4 / 10.0) * 10.0
        needs_water_today = False
        skip_reason = "Substantial rainfall forecasted within 24 hours. Pre-watering reduced to prevent waterlogging."
        recommended_date = "Tomorrow (Rain Anticipated)"
        urgency = "optional"
    elif days_since_watered >= ideal_interval:
        needs_water_today = True
        recommended_date = "Today"
        urgency = "urgent" if days_since_watered > ideal_interval else "recommended"
    else:
        needs_water_today = False
        days_until = max(1, ideal_interval - days_since_watered)
        recommended_date = str(now_iso + timedelta(days=days_until))
        urgency = "upcoming"

    # Construct Clear Reason Summary
    reasons = []
    species_tag = matched_species_name or plant_type.capitalize()
    if is_indoor:
        reasons.append(f"Indoor {species_tag} in {stage} stage with {sunlight.replace('_', ' ')} exposure.")
    else:
        reasons.append(f"Outdoor {species_tag} ({stage} stage, {sunlight.replace('_', ' ')}).")
        if weather_available:
            reasons.append(f"Ambient weather: {temp}°C, {humidity}% humidity.")
        else:
            reasons.append("Ambient weather: Telemetry unavailable (baseline applied).")

    if pot_size > 0.0:
        reasons.append(f"Container scale: {pot_size}L volume ({pot_multiplier:.2f}x).")
    else:
        reasons.append("Container scale: Standard 7.5L container assumed.")

    if weather_notes:
        reasons.extend(weather_notes)

    if skip_reason:
        reasons.append(skip_reason)

    return {
        "needs_water_today": needs_water_today,
        "recommended_amount_ml": recommended_ml,
        "recommended_date": recommended_date,
        "urgency": urgency,
        "weather_based": weather_based,
        "reason": " ".join(reasons),
        "days_since_watered": days_since_watered,
        "plant_age_days": age_days,
        "growth_stage": stage,
        "base_volume_ml": base_volume,
        "matched_species": matched_species_name,
        "multipliers": {
            "stage": stage_multiplier,
            "sunlight": sunlight_multiplier,
            "weather": weather_multiplier,
            "disease": disease_multiplier,
            "container": round(pot_multiplier, 2),
        },
        "skip_reason": skip_reason,
    }
