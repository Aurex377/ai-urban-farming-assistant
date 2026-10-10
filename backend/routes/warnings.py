"""
Early Warnings Route Module — Phase 5
-------------------------------------
Endpoints for querying deterministic agricultural warnings and risks.
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from supabase import Client

try:
    from backend.database import get_supabase
    from backend.services.early_warning_service import (
        evaluate_plant_early_warnings,
        evaluate_all_early_warnings,
    )
    from backend.schemas.notifications import EarlyWarning
except ImportError:
    from database import get_supabase
    from services.early_warning_service import (
        evaluate_plant_early_warnings,
        evaluate_all_early_warnings,
    )
    from schemas.notifications import EarlyWarning

router = APIRouter(prefix="/api/warnings", tags=["Early Warnings"])


@router.get("", response_model=List[EarlyWarning], summary="Get all active early warnings")
async def list_all_warnings(
    user_id: Optional[str] = Query(None, description="Filter by user UUID"),
    supabase: Client = Depends(get_supabase)
):
    """
    Evaluates and returns all active early warning signals across all plants.
    """
    try:
        warnings = await evaluate_all_early_warnings(supabase, user_id=user_id)
        return warnings
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error evaluating early warnings: {str(exc)}"
        )


@router.get("/{plant_id}", response_model=List[EarlyWarning], summary="Get early warnings for a specific plant")
async def get_plant_warnings(
    plant_id: int,
    supabase: Client = Depends(get_supabase)
):
    """
    Evaluates and returns active early warnings for a single plant.
    """
    try:
        warnings = await evaluate_plant_early_warnings(plant_id, supabase)
        return warnings
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error evaluating plant early warnings: {str(exc)}"
        )
