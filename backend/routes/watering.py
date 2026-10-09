"""
Watering Route Module
---------------------
Handles watering logs and watering recommendations in Supabase.
"""

from typing import List
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from supabase import Client

try:
    from backend.database import get_supabase
    from backend.schemas.watering import (
        WateringLogCreate,
        WateringLogResponse,
        WateringRecommendationCreate,
        WateringRecommendationResponse
    )
except ImportError:
    from database import get_supabase
    from schemas.watering import (
        WateringLogCreate,
        WateringLogResponse,
        WateringRecommendationCreate,
        WateringRecommendationResponse
    )

router = APIRouter(prefix="/api/watering", tags=["Watering"])


@router.post("/{plant_id}/log", response_model=WateringLogResponse, status_code=status.HTTP_201_CREATED)
def create_watering_log(
    plant_id: int,
    payload: WateringLogCreate,
    supabase: Client = Depends(get_supabase)
):
    """
    Store a watering log for a plant.
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

        # 3. Best-effort activity log
        try:
            supabase.table("activity_logs").insert({
                "user_id": plant_data.get("user_id"),
                "plant_id": plant_id,
                "activity_type": "plant_watered",
                "description": f"Watered {plant_data.get('plant_name')} with {payload.amount_ml} ml."
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
        # Check plant exists
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


@router.post("/{plant_id}/recommendation", response_model=WateringRecommendationResponse, status_code=status.HTTP_201_CREATED)
def create_watering_recommendation(
    plant_id: int,
    payload: WateringRecommendationCreate,
    supabase: Client = Depends(get_supabase)
):
    """
    Store a watering recommendation for a plant.
    """
    # 1. Verify plant exists
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

    # 2. Insert watering recommendation
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
        # Check plant exists
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
