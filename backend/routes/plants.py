"""
Plants Route Module — Phase 1
-----------------------------
Handles CRUD operations for the 'plants' table in Supabase.
Features resilient schema mapping ensuring zero runtime errors across
both baseline and post-migration database states.
"""

import os
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, Query
from supabase import Client

try:
    from backend.database import get_supabase
    from backend.schemas.plants import (
        PlantCreate,
        PlantUpdate,
        PlantResponse,
        PlantDeleteResponse,
    )
except ImportError:
    from database import get_supabase
    from schemas.plants import (
        PlantCreate,
        PlantUpdate,
        PlantResponse,
        PlantDeleteResponse,
    )

router = APIRouter(prefix="/api/plants", tags=["Plants"])

DEFAULT_DEV_USER = "27865d2c-302e-4a2d-83aa-c1c9ea7338a4"


def get_current_user_id() -> str:
    """Returns effective user UUID from environment."""
    return os.getenv("DEV_USER_ID", DEFAULT_DEV_USER).strip() or DEFAULT_DEV_USER


def normalize_plant(row: Dict[str, Any]) -> Dict[str, Any]:
    """Ensures plant dictionary conforms to PlantResponse."""
    name = row.get("name") or row.get("plant_name") or "Unnamed Plant"
    return {
        "id": row["id"],
        "user_id": str(row.get("user_id") or get_current_user_id()),
        "name": name,
        "plant_name": name,
        "species": row.get("species"),
        "plant_type": row.get("plant_type"),
        "variety": row.get("variety"),
        "planted_date": str(row["planted_date"]) if row.get("planted_date") else None,
        "location": row.get("location"),
        "health_status": row.get("health_status") or "healthy",
        "health_score": float(row["health_score"]) if row.get("health_score") is not None else 100.0,
        "last_watered_at": str(row["last_watered_at"]) if row.get("last_watered_at") else None,
        "next_watering_at": str(row["next_watering_at"]) if row.get("next_watering_at") else None,
        "notes": row.get("notes"),
        "garden_zone_id": row.get("garden_zone_id"),
        "created_at": str(row.get("created_at") or ""),
        "updated_at": str(row.get("updated_at") or row.get("created_at") or "") or None,
    }


def verify_plant_ownership(plant: Dict[str, Any], user_id: str) -> None:
    """Checks that plant belongs to user if specific user isolation is configured."""
    plant_user = str(plant.get("user_id") or "")
    # In development mode, allow access if plant has dev user id or no user id
    if plant_user and user_id and plant_user != user_id and user_id != DEFAULT_DEV_USER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Unauthorized: You do not have permission to access this plant."
        )


@router.post("", response_model=PlantResponse, status_code=status.HTTP_201_CREATED)
def create_plant(
    payload: PlantCreate,
    supabase: Client = Depends(get_supabase)
):
    """
    Create a new plant under a user.
    Uses payload.user_id if provided; otherwise falls back to DEV_USER_ID.
    """
    effective_user_id = payload.user_id or get_current_user_id()
    name = payload.name or payload.plant_name or "Unnamed Plant"

    # Attempt extended insert first, fall back to base insert if new columns are not yet migrated
    extended_data = {
        "user_id": effective_user_id,
        "name": name,
        "plant_name": name,
        "species": payload.species,
        "plant_type": payload.plant_type,
        "variety": payload.variety,
        "planted_date": payload.planted_date,
        "location": payload.location,
        "notes": payload.notes,
        "health_status": "healthy",
        "health_score": 100.0,
        "garden_zone_id": payload.garden_zone_id,
    }
    # Filter out None values
    extended_data = {k: v for k, v in extended_data.items() if v is not None}

    base_data = {
        "user_id": effective_user_id,
        "plant_name": name,
        "species": payload.species,
        "plant_type": payload.plant_type,
        "planted_date": payload.planted_date,
    }

    try:
        try:
            response = supabase.table("plants").insert(extended_data).execute()
        except Exception as exc:
            err_msg = str(exc)
            if "column" in err_msg.lower() or "42703" in err_msg:
                # Column doesn't exist yet; fall back to base schema
                response = supabase.table("plants").insert(base_data).execute()
            else:
                raise

        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to create plant record in database."
            )
        created_plant = normalize_plant(response.data[0])

        # Best-effort activity logging
        try:
            supabase.table("activity_logs").insert({
                "user_id": effective_user_id,
                "plant_id": created_plant["id"],
                "activity_type": "plant_created",
                "description": f"Added new plant '{name}'."
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


@router.get("", response_model=List[PlantResponse])
def get_plants(
    user_id: Optional[str] = Query(None),
    supabase: Client = Depends(get_supabase)
):
    """
    Get all plants. Optionally filter by user_id.
    """
    try:
        query = supabase.table("plants").select("*")
        if user_id:
            query = query.eq("user_id", user_id)
        response = query.order("id", desc=True).execute()
        rows = response.data or []
        return [normalize_plant(r) for r in rows]
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error fetching plants: {str(exc)}"
        )


@router.get("/detail/{plant_id}", response_model=PlantResponse)
@router.get("/{plant_id}", response_model=PlantResponse)
def get_plant_by_id(
    plant_id: int,
    user_id: Optional[str] = Query(None),
    supabase: Client = Depends(get_supabase)
):
    """
    Get a single plant by plant_id.
    """
    try:
        response = supabase.table("plants").select("*").eq("id", plant_id).execute()
        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Plant with ID {plant_id} not found."
            )
        plant_data = response.data[0]
        verify_plant_ownership(plant_data, user_id or get_current_user_id())
        return normalize_plant(plant_data)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error querying plant: {str(exc)}"
        )


@router.patch("/{plant_id}", response_model=PlantResponse)
@router.put("/{plant_id}", response_model=PlantResponse)
def update_plant(
    plant_id: int,
    payload: PlantUpdate,
    user_id: Optional[str] = Query(None),
    supabase: Client = Depends(get_supabase)
):
    """
    Update plant information by plant_id.
    """
    # Verify plant exists
    try:
        check = supabase.table("plants").select("*").eq("id", plant_id).execute()
        if not check.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Plant with ID {plant_id} not found."
            )
        existing = check.data[0]
        verify_plant_ownership(existing, user_id or get_current_user_id())
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error checking plant: {str(exc)}"
        )

    update_dict = {k: v for k, v in payload.model_dump().items() if v is not None}
    if not update_dict:
        return normalize_plant(existing)

    # Ensure name and plant_name stay aligned
    if "name" in update_dict:
        update_dict["plant_name"] = update_dict["name"]
    elif "plant_name" in update_dict:
        update_dict["name"] = update_dict["plant_name"]

    try:
        try:
            res = supabase.table("plants").update(update_dict).eq("id", plant_id).execute()
        except Exception as exc:
            err_msg = str(exc)
            if "column" in err_msg.lower() or "42703" in err_msg:
                # Filter down to base table columns
                base_keys = {"plant_name", "species", "plant_type", "planted_date"}
                base_update = {k: v for k, v in update_dict.items() if k in base_keys}
                if base_update:
                    res = supabase.table("plants").update(base_update).eq("id", plant_id).execute()
                else:
                    return normalize_plant(existing)
            else:
                raise

        if not res.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Plant with ID {plant_id} not found."
            )
        return normalize_plant(res.data[0])
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
    user_id: Optional[str] = Query(None),
    supabase: Client = Depends(get_supabase)
):
    """
    Delete a plant by plant_id.
    """
    try:
        check = supabase.table("plants").select("*").eq("id", plant_id).execute()
        if not check.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Plant with ID {plant_id} not found."
            )
        verify_plant_ownership(check.data[0], user_id or get_current_user_id())

        # Cleanup related diagnoses and image records
        try:
            supabase.table("diagnoses").delete().eq("plant_id", plant_id).execute()
        except Exception:
            pass
        try:
            supabase.table("plant_images").delete().eq("plant_id", plant_id).execute()
        except Exception:
            pass

        supabase.table("plants").delete().eq("id", plant_id).execute()
        return {"success": True, "message": f"Plant {plant_id} deleted successfully."}
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error deleting plant: {str(exc)}"
        )
