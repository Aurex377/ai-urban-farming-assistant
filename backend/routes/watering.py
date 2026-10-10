"""
Watering Route Module — Phase 3
-------------------------------
Handles deterministic watering engine execution, watering telemetry logs,
and automated scheduling in Supabase.
"""

from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status, Query
from supabase import Client

try:
    from backend.database import get_supabase
    from backend.services.weather_service import fetch_weather_data
    from backend.services.watering_engine import calculate_watering_recommendation
    from backend.schemas.watering import (
        WateringLogCreate,
        WateringLogResponse,
        WateringRecommendationCreate,
        WateringRecommendationResponse,
    )
except ImportError:
    from database import get_supabase
    from services.weather_service import fetch_weather_data
    from services.watering_engine import calculate_watering_recommendation
    from schemas.watering import (
        WateringLogCreate,
        WateringLogResponse,
        WateringRecommendationCreate,
        WateringRecommendationResponse,
    )

router = APIRouter(prefix="/api/watering", tags=["Watering"])


@router.post("/{plant_id}/log", response_model=WateringLogResponse, status_code=status.HTTP_201_CREATED)
def create_watering_log(
    plant_id: int,
    payload: WateringLogCreate,
    supabase: Client = Depends(get_supabase)
):
    """
    Store a watering log for a plant and update plants.last_watered_at.
    """
    # 1. Verify plant exists
    try:
        plant_check = supabase.table("plants").select("id, user_id, plant_name").eq("id", plant_id).execute()
        if not plant_check.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Plant with ID {plant_id} does not exist."
            )
        plant_data = plant_check.data[0]
        plant_display_name = plant_data.get("name") or plant_data.get("plant_name") or "Plant"
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error validating plant: {str(exc)}"
        )

    # 2. Insert watering log
    watered_at_value = payload.watered_at or datetime.now(timezone.utc).isoformat()
    log_data = {
        "plant_id": plant_id,
        "watered_at": watered_at_value,
        "amount_ml": payload.amount_ml,
        "notes": payload.notes
    }

    try:
        res = supabase.table("watering_logs").insert(log_data).execute()
        if not res.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to record watering log."
            )
        created_log = res.data[0]

        # 3. Update plants.last_watered_at
        try:
            supabase.table("plants").update({
                "last_watered_at": watered_at_value,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }).eq("id", plant_id).execute()
        except Exception:
            pass

        # 4. Best-effort activity log
        try:
            supabase.table("activity_logs").insert({
                "user_id": plant_data.get("user_id"),
                "plant_id": plant_id,
                "activity_type": "plant_watered",
                "description": f"Watered {plant_display_name} with {payload.amount_ml:.0f} ml."
            }).execute()
        except Exception:
            pass

        return created_log
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error inserting watering log: {str(exc)}"
        )


@router.get("/{plant_id}/logs", response_model=List[WateringLogResponse])
def get_watering_logs(
    plant_id: int,
    supabase: Client = Depends(get_supabase)
):
    """
    Return watering history for a plant.
    """
    try:
        plant_check = supabase.table("plants").select("id").eq("id", plant_id).execute()
        if not plant_check.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Plant with ID {plant_id} does not exist."
            )

        res = supabase.table("watering_logs").select("*").eq("plant_id", plant_id).order("id", desc=True).execute()
        return res.data or []
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error fetching watering logs: {str(exc)}"
        )


@router.post("/{plant_id}/calculate", summary="Calculate and record deterministic watering recommendation")
async def calculate_and_save_watering(
    plant_id: int,
    supabase: Client = Depends(get_supabase)
):
    """
    Executes the deterministic watering engine for a plant using real weather telemetry,
    stores the recommendation, updates plants.next_watering_at, and returns the calculation.
    """
    # 1. Fetch plant details
    try:
        plant_check = supabase.table("plants").select("*").eq("id", plant_id).execute()
        if not plant_check.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Plant with ID {plant_id} does not exist."
            )
        plant_data = plant_check.data[0]
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error loading plant: {str(exc)}"
        )

    # 2. Fetch latest diagnosis
    latest_diagnosis = None
    try:
        diag_res = supabase.table("diagnoses").select("*").eq("plant_id", plant_id).order("id", desc=True).limit(1).execute()
        if diag_res.data:
            latest_diagnosis = diag_res.data[0]
    except Exception:
        pass

    # 3. Fetch weather telemetry
    weather_data = await fetch_weather_data(location_name=plant_data.get("location"))

    # Fetch latest watering log to guarantee recent intake is reflected
    last_watered_at = plant_data.get("last_watered_at")
    try:
        log_res = (
            supabase.table("watering_logs")
            .select("watered_at")
            .eq("plant_id", plant_id)
            .order("watered_at", desc=True)
            .limit(1)
            .execute()
        )
        if log_res.data and log_res.data[0].get("watered_at"):
            log_date = log_res.data[0]["watered_at"]
            if not last_watered_at or str(log_date) > str(last_watered_at):
                last_watered_at = log_date
    except Exception:
        pass

    # 4. Execute deterministic calculation
    rec_result = calculate_watering_recommendation(
        plant=plant_data,
        weather_data=weather_data,
        latest_diagnosis=latest_diagnosis,
        last_watered_at_str=last_watered_at
    )

    # 5. Persist recommendation in Supabase
    rec_record = {
        "plant_id": plant_id,
        "recommended_date": rec_result["recommended_date"],
        "recommended_amount_ml": int(rec_result["recommended_amount_ml"]),
        "reason": rec_result["reason"],
        "weather_based": rec_result["weather_based"]
    }

    try:
        supabase.table("watering_recommendations").insert(rec_record).execute()
    except Exception:
        pass

    # 6. Update plants.next_watering_at
    try:
        supabase.table("plants").update({
            "next_watering_at": rec_result["recommended_date"],
            "updated_at": datetime.now(timezone.utc).isoformat()
        }).eq("id", plant_id).execute()
    except Exception:
        pass

    return {
        "plant_id": plant_id,
        "plant_name": plant_data.get("name") or plant_data.get("plant_name"),
        **rec_result
    }


@router.get("/schedule/all", summary="Get comprehensive watering schedule across all garden plants")
async def get_all_watering_schedules(
    supabase: Client = Depends(get_supabase)
):
    """
    Synthesizes real watering recommendations across all garden plants,
    grouping them into 'today', 'tomorrow', and upcoming weekly schedule.
    """
    try:
        plants_res = supabase.table("plants").select("*").order("id", desc=True).execute()
        plants = plants_res.data or []
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error querying plants: {str(exc)}"
        )

    if not plants:
        return {
            "today": [],
            "tomorrow": [],
            "upcoming": [],
            "total_plants": 0,
            "today_volume_ml": 0
        }

    weather_data = await fetch_weather_data()
    today_plants: List[Dict[str, Any]] = []
    tomorrow_plants: List[Dict[str, Any]] = []
    upcoming_plants: List[Dict[str, Any]] = []
    total_today_ml = 0.0

    for p in plants:
        # Check latest diagnosis
        latest_diag = None
        try:
            diag_res = supabase.table("diagnoses").select("*").eq("plant_id", p["id"]).order("id", desc=True).limit(1).execute()
            if diag_res.data:
                latest_diag = diag_res.data[0]
        except Exception:
            pass

        rec = calculate_watering_recommendation(
            plant=p,
            weather_data=weather_data,
            latest_diagnosis=latest_diag,
            last_watered_at_str=p.get("last_watered_at")
        )

        item = {
            "id": p["id"],
            "name": p.get("name") or p.get("plant_name"),
            "species": p.get("species"),
            "plant_type": p.get("plant_type"),
            "amount_ml": int(rec["recommended_amount_ml"]),
            "reason": rec["reason"],
            "urgency": rec["urgency"],
            "weather_based": rec["weather_based"],
            "last_watered_at": p.get("last_watered_at"),
            "days_since_watered": rec["days_since_watered"],
            "recommended_date": rec["recommended_date"],
        }

        if rec["needs_water_today"]:
            today_plants.append(item)
            total_today_ml += rec["recommended_amount_ml"]
        elif rec["recommended_date"] in ("Tomorrow", "Tomorrow (Rain Anticipated)"):
            tomorrow_plants.append(item)
        else:
            upcoming_plants.append(item)

    return {
        "today": today_plants,
        "tomorrow": tomorrow_plants,
        "upcoming": upcoming_plants,
        "total_plants": len(plants),
        "today_volume_ml": int(total_today_ml),
        "weather_summary": weather_data.get("current", {})
    }


@router.post("/{plant_id}/recommendation", response_model=WateringRecommendationResponse, status_code=status.HTTP_201_CREATED)
def create_watering_recommendation(
    plant_id: int,
    payload: WateringRecommendationCreate,
    supabase: Client = Depends(get_supabase)
):
    """
    Store a manual watering recommendation for a plant.
    """
    try:
        plant_check = supabase.table("plants").select("id").eq("id", plant_id).execute()
        if not plant_check.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Plant with ID {plant_id} does not exist."
            )
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error validating plant: {str(exc)}"
        )

    rec_data = {
        "plant_id": plant_id,
        "recommended_date": payload.recommended_date,
        "recommended_amount_ml": payload.recommended_amount_ml,
        "reason": payload.reason,
        "weather_based": payload.weather_based or False
    }

    try:
        res = supabase.table("watering_recommendations").insert(rec_data).execute()
        if not res.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to record watering recommendation."
            )
        return res.data[0]
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error saving watering recommendation: {str(exc)}"
        )


@router.get("/{plant_id}/recommendations", response_model=List[WateringRecommendationResponse])
def get_watering_recommendations(
    plant_id: int,
    supabase: Client = Depends(get_supabase)
):
    """
    Return watering recommendations for a plant.
    """
    try:
        plant_check = supabase.table("plants").select("id").eq("id", plant_id).execute()
        if not plant_check.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Plant with ID {plant_id} does not exist."
            )

        res = supabase.table("watering_recommendations").select("*").eq("plant_id", plant_id).order("id", desc=True).execute()
        return res.data or []
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error querying watering recommendations: {str(exc)}"
        )
