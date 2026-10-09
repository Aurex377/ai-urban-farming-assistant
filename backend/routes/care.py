"""
Care Recommendations Route Module
---------------------------------
Handles storing and fetching care recommendations for plants from the 'care_recommendations' table.
"""

from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from supabase import Client

try:
    from backend.database import get_supabase
    from backend.schemas.diagnoses import CareRecommendationCreate, CareRecommendationResponse
except ImportError:
    from database import get_supabase
    from schemas.diagnoses import CareRecommendationCreate, CareRecommendationResponse

router = APIRouter(prefix="/api/care", tags=["Care Recommendations"])


@router.post("/{plant_id}", response_model=CareRecommendationResponse, status_code=status.HTTP_201_CREATED)
def create_care_recommendation(
    plant_id: int,
    payload: CareRecommendationCreate,
    supabase: Client = Depends(get_supabase)
):
    """
    Store a care recommendation for a plant.
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

    # 2. If diagnosis_id provided, verify it belongs to this plant
    if payload.diagnosis_id:
        try:
            diag_check = supabase.table("diagnoses").select("id, plant_id").eq("id", payload.diagnosis_id).execute()
            if not diag_check.data:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Diagnosis with ID {payload.diagnosis_id} not found."
                )
            if diag_check.data[0]["plant_id"] != plant_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Diagnosis ID {payload.diagnosis_id} does not belong to plant {plant_id}."
                )
        except HTTPException:
            raise
        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Database error validating diagnosis: {str(exc)}"
            )

    # 3. Insert record
    try:
        care_payload = {
            "plant_id": plant_id,
            "diagnosis_id": payload.diagnosis_id,
            "recommendation": payload.recommendation,
            "priority": payload.priority or "medium"
        }
        res = supabase.table("care_recommendations").insert(care_payload).execute()
        if not res.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to record care recommendation."
            )
        created_care = res.data[0]

        # 4. Best-effort activity log
        try:
            supabase.table("activity_logs").insert({
                "user_id": plant_data.get("user_id"),
                "plant_id": plant_id,
                "activity_type": "care_viewed",
                "description": f"Care recommendation recorded for {plant_data.get('plant_name')}."
            }).execute()
        except Exception:
            pass

        return created_care
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error inserting care recommendation: {str(exc)}"
        )


@router.get("/{plant_id}", response_model=List[CareRecommendationResponse])
def get_care_recommendations(
    plant_id: int,
    supabase: Client = Depends(get_supabase)
):
    """
    Return all care recommendations for a plant.
    """
    try:
        # Check plant exists
        plant_check = supabase.table("plants").select("id").eq("id", plant_id).execute()
        if not plant_check.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Plant with ID {plant_id} does not exist."
            )

        res = supabase.table("care_recommendations").select("*").eq("plant_id", plant_id).order("id", desc=True).execute()
        return res.data or []
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error querying care recommendations: {str(exc)}"
        )
