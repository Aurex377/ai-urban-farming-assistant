"""
Weather Route Module — Phase 3
------------------------------
Handles current weather telemetry, multi-day forecasting, and historical
weather observations in the 'weather_records' table.
"""

from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status, Query
from supabase import Client

try:
    from backend.database import get_supabase
    from backend.services.weather_service import fetch_weather_data
    from backend.schemas.weather import WeatherRecordCreate, WeatherRecordResponse
except ImportError:
    from database import get_supabase
    from services.weather_service import fetch_weather_data
    from schemas.weather import WeatherRecordCreate, WeatherRecordResponse

router = APIRouter(prefix="/api/weather", tags=["Weather"])


@router.get("/current", summary="Get live current weather conditions")
async def get_current_weather(
    lat: Optional[float] = Query(None, description="Optional latitude"),
    lon: Optional[float] = Query(None, description="Optional longitude"),
    location: Optional[str] = Query(None, description="Optional city or zone name")
):
    """
    Returns live current ambient weather telemetry (temperature, humidity, precipitation, wind, condition).
    """
    data = await fetch_weather_data(latitude=lat, longitude=lon, location_name=location)
    return {
        "city": data["city"],
        **data["current"],
        "garden_impact": data["garden_impact"]
    }


@router.get("/forecast", summary="Get 5-day hyperlocal weather forecast & garden impact")
async def get_weather_forecast(
    lat: Optional[float] = Query(None),
    lon: Optional[float] = Query(None),
    location: Optional[str] = Query(None)
):
    """
    Returns 5-day daily weather forecast and agricultural impact analysis.
    """
    data = await fetch_weather_data(latitude=lat, longitude=lon, location_name=location)
    return {
        "city": data["city"],
        "current": data["current"],
        "forecast": data["forecast"],
        "garden_impact": data["garden_impact"]
    }


@router.post("", response_model=WeatherRecordResponse, status_code=status.HTTP_201_CREATED)
def record_weather(
    payload: WeatherRecordCreate,
    supabase: Client = Depends(get_supabase)
):
    """
    Store a weather record in the database.
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


@router.get("/plant/{plant_id}", summary="Get weather context tailored for a specific plant")
@router.get("/{plant_id}", response_model=List[WeatherRecordResponse])
def get_plant_weather_records(
    plant_id: int,
    supabase: Client = Depends(get_supabase)
):
    """
    Return historical weather observations associated with a plant.
    """
    try:
        res = supabase.table("weather_records").select("*").eq("plant_id", plant_id).order("id", desc=True).execute()
        return res.data or []
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error querying weather records: {str(exc)}"
        )
