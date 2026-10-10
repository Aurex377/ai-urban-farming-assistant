"""
Early Warning System Service — Phase 5
---------------------------------------
Deterministic agricultural risk evaluation based on live pathology,
weather telemetry, soil conditions, and watering records.
Completely deterministic; does NOT make uncontrolled LLM calls.
"""

from typing import List, Dict, Any, Optional
from datetime import datetime, timezone, timedelta
import logging

from supabase import Client

logger = logging.getLogger("growwise.early_warning")


async def evaluate_plant_early_warnings(
    plant_id: int,
    supabase: Client
) -> List[Dict[str, Any]]:
    """
    Evaluates a specific plant against deterministic agronomic danger rules.
    Returns list of active EarlyWarning dictionaries.
    """
    warnings: List[Dict[str, Any]] = []
    now = datetime.now(timezone.utc)

    # 1. Fetch plant profile
    try:
        p_res = supabase.table("plants").select("*").eq("id", plant_id).execute()
        if not p_res.data:
            return []
        plant = p_res.data[0]
    except Exception as e:
        logger.warning(f"Error fetching plant {plant_id} for warnings: {e}")
        return []

    plant_name = plant.get("name") or plant.get("plant_name") or f"Plant #{plant_id}"
    species = plant.get("species") or "Urban Plant"
    category = (plant.get("plant_type") or "vegetable").lower()

    # 2. Fetch latest diagnosis
    latest_diag = None
    try:
        d_res = (
            supabase.table("diagnoses")
            .select("*")
            .eq("plant_id", plant_id)
            .order("id", desc=True)
            .limit(1)
            .execute()
        )
        if d_res.data:
            latest_diag = d_res.data[0]
    except Exception as e:
        logger.warning(f"Error checking diagnoses for plant {plant_id}: {e}")

    # 3. Fetch latest watering log
    last_watered_at = None
    try:
        w_res = (
            supabase.table("watering_logs")
            .select("*")
            .eq("plant_id", plant_id)
            .order("id", desc=True)
            .limit(1)
            .execute()
        )
        if w_res.data and w_res.data[0].get("watered_at"):
            raw_dt = w_res.data[0]["watered_at"]
            last_watered_at = datetime.fromisoformat(raw_dt.replace("Z", "+00:00"))
    except Exception:
        pass

    if not last_watered_at and plant.get("last_watered_at"):
        try:
            last_watered_at = datetime.fromisoformat(plant["last_watered_at"].replace("Z", "+00:00"))
        except Exception:
            pass

    # 4. Fetch latest weather record or fallback default
    weather_data = {"temperature": 23.0, "humidity": 55.0, "rainfall": 0.0, "condition": "Clear"}
    try:
        wt_res = (
            supabase.table("weather_records")
            .select("*")
            .order("id", desc=True)
            .limit(1)
            .execute()
        )
        if wt_res.data:
            rec = wt_res.data[0]
            weather_data = {
                "temperature": float(rec.get("temperature", 23.0)),
                "humidity": float(rec.get("humidity", 55.0)),
                "rainfall": float(rec.get("rainfall", 0.0)),
                "condition": rec.get("condition", "Clear"),
            }
    except Exception:
        pass

    # ----------------------------------------------------
    # RULE 1: Active High-Severity Disease Outbreak
    # ----------------------------------------------------
    if latest_diag:
        d_name = latest_diag.get("disease_name") or ""
        is_healthy = latest_diag.get("is_healthy", True)
        severity = (latest_diag.get("severity") or "none").lower()
        confidence = float(latest_diag.get("confidence_score") or latest_diag.get("confidence") or 0.0)

        if not is_healthy and ("healthy" not in d_name.lower()) and d_name:
            if severity in ("high", "urgent") or confidence >= 0.75:
                warnings.append({
                    "id": f"warn_disease_{plant_id}_{latest_diag.get('id')}",
                    "plant_id": plant_id,
                    "plant_name": plant_name,
                    "species": species,
                    "warning_type": "disease_outbreak",
                    "severity": "urgent" if severity == "urgent" else "high",
                    "title": f"Active Pathogen Alert: {d_name}",
                    "summary": f"{plant_name} is infected with {d_name} ({severity.capitalize()} severity, {int(confidence*100)}% confidence).",
                    "recommended_action": "Sterilize shears, prune diseased foliage immediately, and apply prescribed organic treatment. Isolate from neighboring plants.",
                    "metrics": {
                        "pathogen": d_name,
                        "confidence": confidence,
                        "severity": severity,
                    },
                    "created_at": now,
                })

    # ----------------------------------------------------
    # RULE 2: Severe Dehydration / Overdue Watering
    # ----------------------------------------------------
    days_since_water = 999
    if last_watered_at:
        days_since_water = (now - last_watered_at).total_seconds() / 86400.0

    if days_since_water >= 3.5:
        warnings.append({
            "id": f"warn_dehydration_{plant_id}",
            "plant_id": plant_id,
            "plant_name": plant_name,
            "species": species,
            "warning_type": "dehydration",
            "severity": "urgent" if days_since_water >= 5.0 else "high",
            "title": f"Dehydration Risk: Overdue Hydration ({int(days_since_water)} days)",
            "summary": f"{plant_name} has not received recorded irrigation for {int(days_since_water)} days. Container root zone risks permanent wilting.",
            "recommended_action": "Check soil tension 3 cm deep and apply bottom-watering to thoroughly saturate the root ball without splashing leaves.",
            "metrics": {
                "days_since_water": round(days_since_water, 1),
                "last_watered": last_watered_at.isoformat() if last_watered_at else None,
            },
            "created_at": now,
        })

    # ----------------------------------------------------
    # RULE 3: Extreme Heatwave & High Transpiration Stress
    # ----------------------------------------------------
    temp = weather_data["temperature"]
    if temp >= 32.0:
        warnings.append({
            "id": f"warn_heatwave_{plant_id}",
            "plant_id": plant_id,
            "plant_name": plant_name,
            "species": species,
            "warning_type": "heatwave",
            "severity": "high" if temp >= 35.0 else "medium",
            "title": f"Heatwave Stress Warning ({temp}°C)",
            "summary": f"Ambient temperature has reached {temp}°C. Accelerated transpiration puts container plants at rapid moisture loss.",
            "recommended_action": "Shield container from direct midday sunlight, top-dress with organic mulch to conserve moisture, and check hydration evening.",
            "metrics": {
                "temperature_c": temp,
                "humidity": weather_data["humidity"],
            },
            "created_at": now,
        })

    # ----------------------------------------------------
    # RULE 4: High Foliar Humidity & Spore Germination Window
    # ----------------------------------------------------
    humidity = weather_data["humidity"]
    if humidity >= 78.0 and 18.0 <= temp <= 29.0:
        warnings.append({
            "id": f"warn_humidity_{plant_id}",
            "plant_id": plant_id,
            "plant_name": plant_name,
            "species": species,
            "warning_type": "fungal_humidity",
            "severity": "medium",
            "title": f"Fungal Microclimate Alert ({humidity}% Humidity)",
            "summary": f"High humidity ({humidity}%) at {temp}°C creates an optimal germination envelope for fungal blights and mildew spores.",
            "recommended_action": "Cease overhead watering. Increase container spacing by at least 15 cm to promote laminar air movement.",
            "metrics": {
                "humidity": humidity,
                "temperature_c": temp,
            },
            "created_at": now,
        })

    # ----------------------------------------------------
    # RULE 5: Cold Shock for Sensitive Species
    # ----------------------------------------------------
    if temp <= 10.0 and any(s in species.lower() for s in ["tomato", "basil", "pepper", "cucumber", "eggplant"]):
        warnings.append({
            "id": f"warn_cold_{plant_id}",
            "plant_id": plant_id,
            "plant_name": plant_name,
            "species": species,
            "warning_type": "cold_shock",
            "severity": "medium",
            "title": f"Low Temperature Alert ({temp}°C)",
            "summary": f"{species} is sensitive to temperatures below 12°C. Cold soil slows nutrient uptake and stunts root vigor.",
            "recommended_action": "Move containers indoors or against a thermal exterior wall overnight. Avoid cold water irrigation.",
            "metrics": {
                "temperature_c": temp,
                "species": species,
            },
            "created_at": now,
        })

    return warnings


async def evaluate_all_early_warnings(supabase: Client, user_id: Optional[str] = None) -> List[Dict[str, Any]]:
    """
    Evaluates early warnings across all plants accessible to the user.
    """
    all_warnings: List[Dict[str, Any]] = []
    try:
        query = supabase.table("plants").select("id")
        if user_id:
            query = query.eq("user_id", user_id)
        plants_res = query.execute()
        for p in (plants_res.data or []):
            p_warns = await evaluate_plant_early_warnings(p["id"], supabase)
            all_warnings.extend(p_warns)
    except Exception as exc:
        logger.error(f"Error evaluating all early warnings: {exc}")

    # Sort urgent first, then high, medium
    severity_order = {"urgent": 0, "high": 1, "medium": 2, "advisory": 3}
    all_warnings.sort(key=lambda w: severity_order.get(w.get("severity", "medium"), 99))
    return all_warnings
