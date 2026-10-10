"""
Plant Health Timeline Route Module — Phase 5
--------------------------------------------
Endpoints for retrieving unified chronological plant health events and trajectory analytics.
"""

from typing import Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from supabase import Client

try:
    from backend.database import get_supabase
    from backend.services.timeline_service import get_plant_timeline
    from backend.schemas.timeline import PlantTimelineResponse, PlantHealthTrajectory
except ImportError:
    from database import get_supabase
    from services.timeline_service import get_plant_timeline
    from schemas.timeline import PlantTimelineResponse, PlantHealthTrajectory

router = APIRouter(prefix="/api/timeline", tags=["Health Timeline"])


@router.get(
    "/{plant_id}",
    response_model=PlantTimelineResponse,
    summary="Get unified chronological plant health timeline"
)
async def get_timeline(
    plant_id: int,
    supabase: Client = Depends(get_supabase)
):
    """
    Returns complete chronological history of leaf photos, diagnoses,
    watering logs, care recommendations, and active warnings for a plant.
    """
    try:
        data = await get_plant_timeline(plant_id, supabase)
        return data
    except ValueError as val_err:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(val_err)
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error compiling timeline: {str(exc)}"
        )


@router.get(
    "/{plant_id}/trajectory",
    response_model=PlantHealthTrajectory,
    summary="Get plant health trajectory and score analytics"
)
async def get_trajectory(
    plant_id: int,
    supabase: Client = Depends(get_supabase)
):
    """
    Returns current health score, trend, milestone counts, and trajectory overview.
    """
    try:
        data = await get_plant_timeline(plant_id, supabase)
        return data["trajectory"]
    except ValueError as val_err:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(val_err)
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error calculating trajectory: {str(exc)}"
        )
