"""
Plants Route Module
-------------------
Handles CRUD operations for the existing 'plants' table in Supabase.
"""

import os
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from supabase import Client

try:
    from backend.database import get_supabase
    from backend.schemas.plants import PlantCreate, PlantUpdate, PlantResponse, PlantDeleteResponse
except ImportError:
    from database import get_supabase
    from schemas.plants import PlantCreate, PlantUpdate, PlantResponse, PlantDeleteResponse

router = APIRouter(prefix="/api/plants", tags=["Plants"])


@router.post("", response_model=PlantResponse, status_code=status.HTTP_201_CREATED)
def create_plant(
    payload: PlantCreate,
    supabase: Client = Depends(get_supabase)
):
    """
    Create a new plant under a user.
    Uses payload.user_id if provided; otherwise falls back to DEV_USER_ID from environment.
    """
    effective_user_id = payload.user_id or os.getenv("DEV_USER_ID", "").strip() or None
    if not effective_user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="user_id is required. For development mode, please set DEV_USER_ID in backend/.env."
        )

    plant_data = {
        "user_id": effective_user_id,
        "plant_name": payload.plant_name,
        "species": payload.species,
        "plant_type": payload.plant_type,
        "planted_date": payload.planted_date
    }

    try:
        response = supabase.table("plants").insert(plant_data).execute()
        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to create plant record in database."
            )
        created_plant = response.data[0]

        # Best-effort activity logging
        try:
            supabase.table("activity_logs").insert({
                "user_id": effective_user_id,
                "plant_id": created_plant["id"],
                "activity_type": "plant_created",
                "description": f"Added new plant '{payload.plant_name}'."
            }).execute()
        except Exception:
            pass

        return created_plant
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error creating plant: {str(exc)}"
        )


@router.get("/detail/{plant_id}", response_model=PlantResponse)
def get_plant_detail(
    plant_id: int,
    supabase: Client = Depends(get_supabase)
):
    """
    Get one specific plant by plant_id.
    """
    try:
        response = supabase.table("plants").select("*").eq("id", plant_id).execute()
        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Plant with ID {plant_id} not found."
            )
        return response.data[0]
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error querying plant: {str(exc)}"
        )


@router.get("", response_model=List[PlantResponse])
@router.get("/{user_id}", response_model=List[PlantResponse])
def get_user_plants(
    user_id: Optional[str] = None,
    supabase: Client = Depends(get_supabase)
):
    """
    Get all plants belonging to a user by user_id UUID, or all plants if user_id is omitted.
    """
    try:
        if user_id:
            response = supabase.table("plants").select("*").eq("user_id", user_id).execute()
        else:
            response = supabase.table("plants").select("*").execute()
        return response.data or []
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error fetching user plants: {str(exc)}"
        )


@router.put("/{plant_id}", response_model=PlantResponse)
def update_plant(
    plant_id: int,
    payload: PlantUpdate,
    supabase: Client = Depends(get_supabase)
):
    """
    Update plant information by plant_id.
    """
    update_data = {k: v for k, v in payload.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No update fields provided."
        )

    try:
        # Check plant exists
        check = supabase.table("plants").select("id").eq("id", plant_id).execute()
        if not check.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Plant with ID {plant_id} not found."
            )

        response = supabase.table("plants").update(update_data).eq("id", plant_id).execute()
        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Plant with ID {plant_id} not found."
            )
        return response.data[0]
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error updating plant: {str(exc)}"
        )


@router.delete("/{plant_id}", response_model=PlantDeleteResponse)
def delete_plant(
    plant_id: int,
    supabase: Client = Depends(get_supabase)
):
    """
    Delete a plant by plant_id.
    """
    try:
        # Check plant exists
        check = supabase.table("plants").select("id").eq("id", plant_id).execute()
        if not check.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Plant with ID {plant_id} not found."
            )

        supabase.table("plants").delete().eq("id", plant_id).execute()
        return {"success": True, "message": f"Plant {plant_id} deleted successfully."}
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error deleting plant: {str(exc)}"
        )
