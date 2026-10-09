"""
Diagnoses Route Module — Phase 1
--------------------------------
Handles plant disease diagnosis workflow and history in the 'diagnoses' table.
Prepares honest 'pending' diagnosis records without fake AI predictions,
ready for Local LLaVA model integration in Phase 2.
"""

import os
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, Query
from supabase import Client

try:
    from backend.database import get_supabase
    from backend.schemas.diagnoses import (
        DiagnosisRequest,
        DiagnosisCreate,
        DiagnosisResponse,
    )
except ImportError:
    from database import get_supabase
    from schemas.diagnoses import (
        DiagnosisRequest,
        DiagnosisCreate,
        DiagnosisResponse,
    )

router = APIRouter(tags=["Diagnosis"])

DEFAULT_DEV_USER = "27865d2c-302e-4a2d-83aa-c1c9ea7338a4"


def get_current_user_id() -> str:
    return os.getenv("DEV_USER_ID", DEFAULT_DEV_USER).strip() or DEFAULT_DEV_USER


def verify_plant_ownership(plant: Dict[str, Any], user_id: str) -> None:
    plant_user = str(plant.get("user_id") or "")
    if plant_user and user_id and plant_user != user_id and user_id != DEFAULT_DEV_USER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Unauthorized: You do not have permission to diagnose this plant."
        )


def normalize_diagnosis(row: Dict[str, Any]) -> Dict[str, Any]:
    created_at = str(row.get("created_at") or row.get("diagnosed_at") or "")
    conf = float(row["confidence_score"]) if row.get("confidence_score") is not None else (
        float(row["confidence"]) if row.get("confidence") is not None else 0.0
    )
    return {
        "id": row["id"],
        "plant_id": row["plant_id"],
        "user_id": str(row.get("user_id")) if row.get("user_id") else None,
        "image_id": row.get("image_id"),
        "status": row.get("status") or "pending",
        "disease_name": row.get("disease_name") or "Pending AI Analysis",
        "symptoms": row.get("symptoms"),
        "confidence": conf,
        "confidence_score": conf,
        "severity": row.get("severity"),
        "model_name": row.get("model_name") or "Local LLaVA Plant Disease 7B",
        "raw_result": row.get("raw_result"),
        "diagnosis_details": row.get("diagnosis_details") or "Queued in pending state. Local LLaVA disease detection scheduled for Phase 2.",
        "created_at": created_at,
        "updated_at": str(row.get("updated_at") or created_at or ""),
        "diagnosed_at": str(row.get("diagnosed_at") or created_at or ""),
        "message": "Diagnosis created in pending state. Model processing will be connected in Phase 2."
    }


# ====================================================================
# Create Pending Diagnosis Endpoint
# ====================================================================

@router.post(
    "/api/plants/{plant_id}/diagnoses",
    response_model=DiagnosisResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Prepare diagnosis in pending state",
)
@router.post(
    "/api/diagnosis/{plant_id}",
    response_model=DiagnosisResponse,
    status_code=status.HTTP_201_CREATED,
    include_in_schema=False,
)
def create_pending_diagnosis(
    plant_id: int,
    payload: DiagnosisRequest,
    user_id: Optional[str] = Query(None),
    supabase: Client = Depends(get_supabase)
):
    """
    Creates a pending diagnosis record for a plant leaf photo.
    Validates that:
    1. Plant exists and belongs to the user.
    2. Image exists and belongs to the plant.
    Records status as 'pending' with 0.0 confidence and an honest message.
    """
    effective_user = user_id or get_current_user_id()

    # 1. Verify plant exists and user has ownership
    try:
        plant_res = supabase.table("plants").select("id, user_id, plant_name").eq("id", plant_id).execute()
        if not plant_res.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Plant with ID {plant_id} does not exist."
            )
        plant_data = plant_res.data[0]
        verify_plant_ownership(plant_data, effective_user)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error validating plant: {str(exc)}"
        )

    # 2. Verify image exists and matches plant
    try:
        img_res = supabase.table("plant_images").select("*").eq("id", payload.image_id).execute()
        if not img_res.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Image with ID {payload.image_id} not found."
            )
        image_record = img_res.data[0]
        if image_record["plant_id"] != plant_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Image ID {payload.image_id} does not belong to plant {plant_id}."
            )
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error validating image: {str(exc)}"
        )

    # 3. Create diagnosis record in 'pending' status
    diagnosis_details = (
        "Image validated and queued for diagnosis in pending state. "
        "Local LLaVA plant disease detection model is scheduled for Phase 2."
    )
    extended_insert = {
        "plant_id": plant_id,
        "user_id": effective_user,
        "image_id": payload.image_id,
        "status": "pending",
        "disease_name": "Pending AI Analysis",
        "confidence": 0.0,
        "confidence_score": 0.0,
        "model_name": "Local LLaVA Plant Disease 7B",
        "diagnosis_details": diagnosis_details,
    }
    base_insert = {
        "plant_id": plant_id,
        "image_id": payload.image_id,
        "disease_name": "Pending AI Analysis",
        "confidence": 0.0,
        "diagnosis_details": diagnosis_details,
    }

    try:
        try:
            ins_res = supabase.table("diagnoses").insert(extended_insert).execute()
        except Exception as exc:
            err_msg = str(exc)
            if "column" in err_msg.lower() or "42703" in err_msg:
                ins_res = supabase.table("diagnoses").insert(base_insert).execute()
            else:
                raise

        if not ins_res.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to record diagnosis result in database."
            )
        created_diagnosis = normalize_diagnosis(ins_res.data[0])

        # 4. Best-effort activity log
        try:
            supabase.table("activity_logs").insert({
                "user_id": effective_user,
                "plant_id": plant_id,
                "activity_type": "diagnosis_queued",
                "description": f"Queued pending disease diagnosis for image #{payload.image_id}."
            }).execute()
        except Exception:
            pass

        return created_diagnosis
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error creating diagnosis: {str(exc)}"
        )


# ====================================================================
# List Diagnoses For Plant Endpoint
# ====================================================================

@router.get(
    "/api/plants/{plant_id}/diagnoses",
    response_model=List[DiagnosisResponse],
    summary="Get all diagnoses for a plant",
)
@router.get(
    "/api/diagnosis/plant/{plant_id}",
    response_model=List[DiagnosisResponse],
    include_in_schema=False,
)
def get_plant_diagnoses(
    plant_id: int,
    user_id: Optional[str] = Query(None),
    supabase: Client = Depends(get_supabase)
):
    """
    Get diagnosis history for a plant, newest first.
    """
    # 1. Verify plant exists and ownership
    try:
        plant_check = supabase.table("plants").select("id, user_id").eq("id", plant_id).execute()
        if not plant_check.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Plant with ID {plant_id} does not exist."
            )
        verify_plant_ownership(plant_check.data[0], user_id or get_current_user_id())
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error verifying plant: {str(exc)}"
        )

    # 2. Query diagnoses
    try:
        res = (
            supabase.table("diagnoses")
            .select("*")
            .eq("plant_id", plant_id)
            .order("id", desc=True)
            .execute()
        )
        return [normalize_diagnosis(d) for d in (res.data or [])]
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error fetching diagnoses: {str(exc)}"
        )


# ====================================================================
# Get Single Diagnosis Endpoint
# ====================================================================

@router.get(
    "/api/diagnoses/{diagnosis_id}",
    response_model=DiagnosisResponse,
    summary="Get single diagnosis record",
)
def get_diagnosis_by_id(
    diagnosis_id: int,
    supabase: Client = Depends(get_supabase)
):
    """
    Get a single diagnosis record by its ID.
    """
    try:
        res = supabase.table("diagnoses").select("*").eq("id", diagnosis_id).execute()
        if not res.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Diagnosis with ID {diagnosis_id} not found."
            )
        return normalize_diagnosis(res.data[0])
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error retrieving diagnosis: {str(exc)}"
        )
