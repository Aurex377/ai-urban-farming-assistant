"""
Weather Route Module
--------------------
Handles storing and fetching weather observations in the 'weather_records' table.
Designed to allow future external Weather API integration (e.g. OpenWeatherMap).
"""

from typing import List
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from supabase import Client

try:
    from backend.database import get_supabase
    from backend.schemas.weather import WeatherRecordCreate, WeatherRecordResponse
except ImportError:
    from database import get_supabase
    from schemas.weather import WeatherRecordCreate, WeatherRecordResponse

router = APIRouter(prefix="/api/weather", tags=["Weather"])


@router.post("", response_model=WeatherRecordResponse, status_code=status.HTTP_201_CREATED)
def record_weather(
    payload: WeatherRecordCreate,
    supabase: Client = Depends(get_supabase)
):
    """
    Store a weather record.
    External weather fetching services can call this endpoint to persist conditions.
    """
    recorded_at_value = payload.recorded_at or datetime.now(timezone.utc).isoformat()
    record_data = {
        "user_id": payload.user_id,
        "plant_id": payload.plant_id,
        "location": payload.location,
        "temperature": payload.temperature,
        "humidity": payload.humidity,
        "rainfall_mm": payload.rainfall_mm,
        "wind_speed": payload.wind_speed,
        "weather_condition": payload.weather_condition,
        "recorded_at": recorded_at_value
    }

    try:
        res = supabase.table("weather_records").insert(record_data).execute()
        if not res.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to record weather observation."
            )
        return res.data[0]
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error inserting weather record: {str(exc)}"
        )


@router.get("/{plant_id}", response_model=List[WeatherRecordResponse])
def get_plant_weather_records(
    plant_id: int,
    supabase: Client = Depends(get_supabase)
):
    """
    Return weather records associated with a plant.
    """
    try:
        res = supabase.table("weather_records").select("*").eq("plant_id", plant_id).order("id", desc=True).execute()
        return res.data or []
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error querying weather records: {str(exc)}"
        )
