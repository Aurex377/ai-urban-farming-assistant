"""
Diagnoses Route Module
----------------------
Handles plant disease diagnosis workflows and history in the 'diagnoses' table.
Connects with backend/services/ai_service.py.
"""

from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from supabase import Client

try:
    from backend.database import get_supabase
    from backend.services.ai_service import run_plant_disease_diagnosis
    from backend.schemas.diagnoses import DiagnosisRequest, DiagnosisResponse
except ImportError:
    from database import get_supabase
    from services.ai_service import run_plant_disease_diagnosis
    from schemas.diagnoses import DiagnosisRequest, DiagnosisResponse

router = APIRouter(prefix="/api/diagnosis", tags=["Diagnosis"])


@router.post("/{plant_id}", response_model=DiagnosisResponse, status_code=status.HTTP_201_CREATED)
async def create_diagnosis_for_plant(
    plant_id: int,
    payload: DiagnosisRequest,
    supabase: Client = Depends(get_supabase)
):
    """
    Run plant disease diagnosis for a given uploaded image.
    Uses placeholder AI service until the actual machine learning model is connected.
    """
    # 1. Verify plant exists
    try:
        plant_res = supabase.table("plants").select("id, user_id, plant_name, species").eq("id", plant_id).execute()
        if not plant_res.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Plant with ID {plant_id} does not exist."
            )
        plant_data = plant_res.data[0]
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

    # 3. Call AI service placeholder
    ai_result = await run_plant_disease_diagnosis(
        image_url=image_record["image_url"],
        plant_info=plant_data
    )

    # 4. Insert into diagnoses table
    try:
        diagnosis_payload = {
            "plant_id": plant_id,
            "image_id": payload.image_id,
            "disease_name": ai_result["disease_name"],
            "confidence": ai_result["confidence"],
            "diagnosis_details": ai_result["diagnosis_details"]
        }
        ins_res = supabase.table("diagnoses").insert(diagnosis_payload).execute()
        if not ins_res.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to record diagnosis result in database."
            )
        created_diagnosis = ins_res.data[0]

        # 5. Best-effort activity log
        try:
            supabase.table("activity_logs").insert({
                "user_id": plant_data.get("user_id"),
                "plant_id": plant_id,
                "activity_type": "diagnosis_created",
                "description": f"Diagnosis queued for {plant_data.get('plant_name')} (Image #{payload.image_id})."
            }).execute()
        except Exception:
            pass

        return created_diagnosis
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error saving diagnosis: {str(exc)}"
        )


@router.get("/plant/{plant_id}", response_model=List[DiagnosisResponse])
def get_plant_diagnoses(
    plant_id: int,
    supabase: Client = Depends(get_supabase)
):
    """
    Return diagnosis history for a plant.
    """
    try:
        # Check plant exists
        plant_check = supabase.table("plants").select("id").eq("id", plant_id).execute()
        if not plant_check.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Plant with ID {plant_id} does not exist."
            )

        res = supabase.table("diagnoses").select("*").eq("plant_id", plant_id).order("id", desc=True).execute()
        return res.data or []
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error querying diagnoses: {str(exc)}"
        )
