"""
Care Recommendations Route Module — Phase 4: NVIDIA Context-Aware Personalization
---------------------------------------------------------------------------------
Handles clinical botanical care guidance, approved treatment protocols,
and NVIDIA Nemotron AI context-aware personalization for plant care.
"""

from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, Query
from supabase import Client

try:
    from backend.database import get_supabase
    from backend.services.care_guidance_service import get_approved_care_guidance, CARE_PROTOCOLS
    from backend.services.context_aggregator import aggregate_plant_context
    from backend.services.nvidia_nemotron_service import (
        generate_personalized_guidance,
        check_nvidia_availability,
    )
    from backend.schemas.diagnoses import (
        CareRecommendationCreate,
        CareRecommendationResponse,
        PersonalizedCareGuidanceResponse,
        NVIDIAStatusResponse,
    )
except ImportError:
    from database import get_supabase
    from services.care_guidance_service import get_approved_care_guidance, CARE_PROTOCOLS
    from services.context_aggregator import aggregate_plant_context
    from services.nvidia_nemotron_service import (
        generate_personalized_guidance,
        check_nvidia_availability,
    )
    from schemas.diagnoses import (
        CareRecommendationCreate,
        CareRecommendationResponse,
        PersonalizedCareGuidanceResponse,
        NVIDIAStatusResponse,
    )

router = APIRouter(prefix="/api/care", tags=["Care Recommendations"])


@router.get("/protocols", summary="List all approved botanical care and treatment protocols")
def list_approved_protocols():
    """
    Returns curated knowledge base of approved organic and botanical treatment protocols.
    """
    return list(CARE_PROTOCOLS.values())


@router.get("/model/status", response_model=NVIDIAStatusResponse, summary="Check NVIDIA Nemotron model availability")
async def get_nemotron_model_status():
    """
    Returns the runtime status and configuration of the NVIDIA Nemotron AI orchestrator.
    """
    status_info = await check_nvidia_availability()
    return status_info


@router.get("/{plant_id}/guidance", summary="Get approved care & treatment guidance tailored for a plant")
def get_tailored_care_guidance(
    plant_id: int,
    supabase: Client = Depends(get_supabase)
):
    """
    Matches the plant's active diagnosis to the scientifically approved treatment and
    preventive care protocol.
    """
    try:
        plant_check = supabase.table("plants").select("*").eq("id", plant_id).execute()
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

    # Fetch latest completed diagnosis
    latest_diagnosis = None
    try:
        diag_res = supabase.table("diagnoses").select("*").eq("plant_id", plant_id).order("id", desc=True).limit(1).execute()
        if diag_res.data:
            latest_diagnosis = diag_res.data[0]
    except Exception:
        pass

    disease_name = latest_diagnosis.get("disease_name") if latest_diagnosis else None
    is_healthy = False
    if not disease_name or "healthy" in disease_name.lower():
        is_healthy = True

    guidance = get_approved_care_guidance(
        disease_name=disease_name,
        is_healthy=is_healthy,
        plant_type=plant_data.get("plant_type")
    )

    return {
        "plant_id": plant_id,
        "plant_name": plant_data.get("name") or plant_data.get("plant_name"),
        "species": plant_data.get("species"),
        "active_diagnosis": disease_name or "Healthy Plant",
        "guidance": guidance
    }


# ====================================================================
# Phase 4: NVIDIA Nemotron Context-Aware Personalization Endpoints
# ====================================================================

@router.post(
    "/{plant_id}/personalize",
    response_model=PersonalizedCareGuidanceResponse,
    status_code=status.HTTP_200_OK,
    summary="Generate NVIDIA Nemotron personalized plant-care guidance"
)
async def generate_plant_personalized_care(
    plant_id: int,
    supabase: Client = Depends(get_supabase)
):
    """
    Phase 4 Architecture Execution:
    1. Loads latest NVIDIA diagnosis
    2. Loads plant profile, age, stage, and garden zone
    3. Loads hyperlocal weather & multi-day forecast
    4. Computes deterministic watering engine decision
    5. Loads approved clinical care guidance
    6. Synthesizes structured 10-dimension personalization context
    7. Calls NVIDIA Nemotron AI API (with local orchestrator fallback)
    8. Validates strict agronomic Pydantic contract
    9. Saves care recommendation in Supabase 'care_recommendations'
    10. Returns rich personalized response for React frontend
    """
    try:
        # 1. Verify plant existence
        plant_check = supabase.table("plants").select("id").eq("id", plant_id).execute()
        if not plant_check.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Plant with ID {plant_id} does not exist."
            )
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error validating plant: {str(exc)}"
        )

    # 2. Assemble 10-dimension agronomic context
    try:
        context_data = await aggregate_plant_context(plant_id, supabase)
    except Exception as agg_err:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Context aggregation error: {str(agg_err)}"
        )

    # 3. Generate NVIDIA Nemotron personalized guidance
    try:
        personalized_result = await generate_personalized_guidance(
            context_data=context_data,
            plant_id=plant_id,
            supabase=supabase
        )
        return personalized_result
    except Exception as nvd_err:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"NVIDIA Nemotron personalization error: {str(nvd_err)}"
        )


@router.get(
    "/{plant_id}/personalized",
    response_model=PersonalizedCareGuidanceResponse,
    summary="Retrieve latest personalized care guidance for a plant"
)
async def get_latest_personalized_care(
    plant_id: int,
    auto_generate: bool = Query(True, description="Generate new guidance if no previous record found"),
    supabase: Client = Depends(get_supabase)
):
    """
    Retrieves the most recent personalized care guidance from Supabase,
    or generates fresh guidance on-demand if none is saved.
    """
    # 1. Verify plant exists
    try:
        plant_check = supabase.table("plants").select("id").eq("id", plant_id).execute()
        if not plant_check.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Plant with ID {plant_id} does not exist."
            )
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error validating plant: {str(exc)}"
        )

    # 2. Check for existing structured record in care_recommendations
    try:
        recs = (
            supabase.table("care_recommendations")
            .select("*")
            .eq("plant_id", plant_id)
            .order("id", desc=True)
            .limit(1)
            .execute()
        )
        if recs.data and len(recs.data) > 0:
            latest = recs.data[0]
            structured = latest.get("structured_guidance")
            if isinstance(structured, dict) and "personalized_explanation" in structured:
                structured["care_recommendation_id"] = latest["id"]
                return structured
    except Exception:
        pass

    # 3. If no structured record exists and auto_generate is true, generate now
    if auto_generate:
        return await generate_plant_personalized_care(plant_id=plant_id, supabase=supabase)

    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail=f"No personalized care recommendations found for plant {plant_id}."
    )


# ====================================================================
# Standard Care Recommendation CRUD Endpoints
# ====================================================================

@router.post("/{plant_id}", response_model=CareRecommendationResponse, status_code=status.HTTP_201_CREATED)
def create_care_recommendation(
    plant_id: int,
    payload: CareRecommendationCreate,
    supabase: Client = Depends(get_supabase)
):
    """
    Store a care recommendation for a plant.
    """
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
        return res.data[0]
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
    Return all stored care recommendations for a plant.
    """
    try:
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
