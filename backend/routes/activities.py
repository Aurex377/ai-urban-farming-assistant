"""
Activity Logs Route Module
--------------------------
Handles audit and timeline activity tracking in the 'activity_logs' table.
"""

from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from supabase import Client

try:
    from backend.database import get_supabase
    from backend.schemas.weather import ActivityLogCreate, ActivityLogResponse
except ImportError:
    from database import get_supabase
    from schemas.weather import ActivityLogCreate, ActivityLogResponse

router = APIRouter(prefix="/api/activities", tags=["Activity Logs"])


@router.post("", response_model=ActivityLogResponse, status_code=status.HTTP_201_CREATED)
def create_activity_log(
    payload: ActivityLogCreate,
    supabase: Client = Depends(get_supabase)
):
    """
    Store an activity log.
    Common activity_types:
    - plant_created
    - image_uploaded
    - diagnosis_created
    - plant_watered
    - care_viewed
    """
    activity_data = {
        "user_id": payload.user_id,
        "plant_id": payload.plant_id,
        "activity_type": payload.activity_type,
        "description": payload.description
    }

    try:
        res = supabase.table("activity_logs").insert(activity_data).execute()
        if not res.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to record activity log."
            )
        return res.data[0]
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error inserting activity log: {str(exc)}"
        )


@router.get("/{user_id}", response_model=List[ActivityLogResponse])
def get_user_activities(
    user_id: str,
    supabase: Client = Depends(get_supabase)
):
    """
    Return recent activity history for a user.
    """
    try:
        res = supabase.table("activity_logs").select("*").eq("user_id", user_id).order("id", desc=True).execute()
        return res.data or []
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error querying activity logs: {str(exc)}"
        )
