"""
Diagnoses Route Module — Phase 2
--------------------------------
Handles plant disease diagnosis workflow, Local LLaVA vision inference execution,
and historical records in the 'diagnoses' table.

Phase 2 Additions:
- Connects Local LLaVA Vision Model pipeline for automated leaf disease analysis.
- Background asynchronous processing with status lifecycle:
  pending -> processing -> completed / model_unavailable / inconclusive / failed.
- Safe on-demand inference trigger (/api/diagnoses/{id}/analyze).
- Model status verification (/api/diagnoses/model/status).
- Resilient schema fallback preserving backward compatibility.
"""

import os
import logging
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, Query, BackgroundTasks
from supabase import Client

try:
    from backend.database import get_supabase
    from backend.services.nvidia_nemotron_service import (
        analyze_leaf_with_nvidia,
        check_nvidia_availability,
    )
    from backend.services.llava_service import (
        analyze_leaf_with_llava,
        check_llava_availability,
        get_llava_config,
    )
    from backend.schemas.diagnoses import (
        DiagnosisRequest,
        DiagnosisCreate,
        DiagnosisResponse,
        LLaVAModelStatusResponse,
    )
except ImportError:
    from database import get_supabase
    from services.nvidia_nemotron_service import (
        analyze_leaf_with_nvidia,
        check_nvidia_availability,
    )
    from services.llava_service import (
        analyze_leaf_with_llava,
        check_llava_availability,
        get_llava_config,
    )
    from schemas.diagnoses import (
        DiagnosisRequest,
        DiagnosisCreate,
        DiagnosisResponse,
        LLaVAModelStatusResponse,
    )

logger = logging.getLogger("growwise.diagnoses")
router = APIRouter(tags=["Diagnosis"])

DEFAULT_DEV_USER = "27865d2c-302e-4a2d-83aa-c1c9ea7338a4"
_DIAGNOSIS_CACHE: Dict[int, Dict[str, Any]] = {}


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
    diag_id = row.get("id")
    cached = _DIAGNOSIS_CACHE.get(diag_id) if diag_id else None

    # Merge cached rich multimodal inference data if database table lacks additive columns
    row_copy = dict(row)
    if cached:
        for k in ("status", "severity", "symptoms", "model_name", "raw_result"):
            if not row_copy.get(k) and cached.get(k):
                row_copy[k] = cached[k]

    created_at = str(row_copy.get("created_at") or row_copy.get("diagnosed_at") or "")
    conf = float(row_copy["confidence_score"]) if row_copy.get("confidence_score") is not None else (
        float(row_copy["confidence"]) if row_copy.get("confidence") is not None else 0.0
    )

    disease = row_copy.get("disease_name") or ""
    current_status = row_copy.get("status")

    # Resilient status resolution for baseline Supabase schemas without status column
    if not current_status:
        if disease and disease not in ("Pending AI Analysis", "Processing..."):
            d_lower = disease.lower()
            if any(term in d_lower for term in ("offline", "unavailable", "timeout", "not found")):
                current_status = "model_unavailable"
            elif any(term in d_lower for term in ("error", "invalid", "failed")):
                current_status = "failed"
            elif "inconclusive" in d_lower:
                current_status = "inconclusive"
            else:
                current_status = "completed"
        else:
            current_status = "pending"

    # Resilient severity resolution if missing from baseline schema
    severity = row_copy.get("severity")
    if not severity and current_status == "completed":
        details_lower = (row_copy.get("diagnosis_details") or "").lower()
        if "severe" in details_lower or "high severity" in details_lower:
            severity = "high"
        elif "medium" in details_lower or "moderate" in details_lower:
            severity = "medium"
        elif "low" in details_lower or "mild" in details_lower:
            severity = "low"
        elif conf >= 0.8:
            severity = "medium"
        elif conf >= 0.5:
            severity = "low"
        else:
            severity = "none"

    # Resilient symptoms resolution if missing from baseline schema
    symptoms = row_copy.get("symptoms")
    if not symptoms and current_status == "completed":
        details = row_copy.get("diagnosis_details") or ""
        import re
        symptom_match = re.search(r"symptoms? (?:include |are |were )?([^.]+)", details, re.IGNORECASE)
        if symptom_match:
            symptoms = symptom_match.group(1).strip()
        elif "spots" in details.lower() or "lesions" in details.lower():
            symptoms = "Leaf spots, lesions, and chlorotic discoloration observed"
        else:
            symptoms = "Visual foliar examination completed"

    status_messages = {
        "pending": "Diagnosis queued in pending state. NVIDIA Nemotron analysis awaiting execution.",
        "processing": "NVIDIA Nemotron Vision Model is analyzing the leaf image...",
        "completed": "NVIDIA Nemotron disease analysis complete.",
        "model_unavailable": "NVIDIA Nemotron model service is currently unreachable. Record saved as pending.",
        "inconclusive": "Vision model output was inconclusive. Clearer photo recommended.",
        "failed": "Diagnosis execution failed. Please verify image and retry."
    }

    return {
        "id": row_copy["id"],
        "plant_id": row_copy["plant_id"],
        "user_id": str(row_copy.get("user_id")) if row_copy.get("user_id") else None,
        "image_id": row_copy.get("image_id"),
        "status": current_status,
        "disease_name": disease or ("Processing..." if current_status == "processing" else "Pending AI Analysis"),
        "symptoms": symptoms,
        "confidence": conf,
        "confidence_score": conf,
        "severity": severity,
        "model_name": row_copy.get("model_name") or "NVIDIA Nemotron",
        "raw_result": row_copy.get("raw_result"),
        "diagnosis_details": row_copy.get("diagnosis_details") or "Queued in pending state.",
        "created_at": created_at,
        "updated_at": str(row_copy.get("updated_at") or created_at or ""),
        "diagnosed_at": str(row_copy.get("diagnosed_at") or created_at or ""),
        "message": status_messages.get(current_status, "Diagnosis record retrieved.")
    }


# ====================================================================
# Background LLaVA Inference Worker
# ====================================================================

async def execute_diagnosis_inference(diagnosis_id: int, supabase: Client) -> None:
    """
    Background worker that retrieves the uploaded plant image, executes
    on-device LLaVA vision diagnosis, validates structured findings,
    and updates the database record.
    """
    try:
        # 1. Fetch diagnosis record
        diag_res = supabase.table("diagnoses").select("*").eq("id", diagnosis_id).execute()
        if not diag_res.data:
            logger.error(f"Diagnosis #{diagnosis_id} not found for inference.")
            return
        diagnosis_row = diag_res.data[0]
        plant_id = diagnosis_row["plant_id"]
        image_id = diagnosis_row.get("image_id")

        # Mark status as 'processing'
        try:
            supabase.table("diagnoses").update({
                "status": "processing",
                "updated_at": datetime.now(timezone.utc).isoformat()
            }).eq("id", diagnosis_id).execute()
        except Exception:
            pass

        # 2. Retrieve plant information
        plant_name = None
        species = None
        try:
            plant_res = supabase.table("plants").select("name, plant_name, species").eq("id", plant_id).execute()
            if plant_res.data:
                p_data = plant_res.data[0]
                plant_name = p_data.get("name") or p_data.get("plant_name")
                species = p_data.get("species")
        except Exception:
            pass

        # 3. Retrieve image record and storage path
        if not image_id:
            raise Exception("Diagnosis record has no associated image_id.")

        img_res = supabase.table("plant_images").select("*").eq("id", image_id).execute()
        if not img_res.data:
            raise Exception(f"Image record #{image_id} not found.")

        img_row = img_res.data[0]
        storage_path = img_row.get("storage_path") or img_row.get("image_url")
        if not storage_path:
            raise Exception(f"Image record #{image_id} has no storage path.")

        # 4. Download image bytes from Supabase Storage
        image_bytes: Optional[bytes] = None
        try:
            image_bytes = supabase.storage.from_("plant-images").download(storage_path)
        except Exception as storage_err:
            logger.warning(f"Direct storage download failed for {storage_path}: {storage_err}")

        if not image_bytes:
            # Fallback: create signed URL and download via httpx
            import httpx
            from backend.services.storage_service import create_image_signed_url
            signed_url = create_image_signed_url(supabase, storage_path, expires_in=300)
            async with httpx.AsyncClient(timeout=10.0) as client:
                download_res = await client.get(signed_url)
                if download_res.status_code == 200:
                    image_bytes = download_res.content

        analysis_result = None
        # Model 1: Try Local LLaVA (YuchengShi/LLaVA-v1.5-7B-Plant-Leaf-Diseases-Detection) if online
        try:
            llava_status = await check_llava_availability()
            if llava_status.get("available") and llava_status.get("model_loaded"):
                llava_res = await analyze_leaf_with_llava(
                    image_bytes=image_bytes,
                    plant_name=plant_name,
                    species=species
                )
                if llava_res.get("status") in ("completed", "inconclusive", "uncertain"):
                    analysis_result = llava_res
        except Exception as llava_err:
            logger.info(f"Local LLaVA inference check skipped: {llava_err}")

        # Model 2 / Multimodal fallback: NVIDIA NIM Multimodal Vision API
        if not analysis_result:
            analysis_result = await analyze_leaf_with_nvidia(
                image_bytes=image_bytes,
                plant_name=plant_name,
                species=species
            )

        # Cache rich multimodal result for immediate frontend rendering
        _DIAGNOSIS_CACHE[diagnosis_id] = analysis_result

        now_iso = datetime.now(timezone.utc).isoformat()
        final_status = analysis_result["status"]

        # 6. Update diagnoses table
        extended_update = {
            "status": final_status,
            "disease_name": analysis_result["disease_name"],
            "confidence": analysis_result["confidence"],
            "confidence_score": analysis_result["confidence_score"],
            "severity": analysis_result.get("severity"),
            "symptoms": analysis_result.get("symptoms"),
            "diagnosis_details": analysis_result["diagnosis_details"],
            "model_name": analysis_result["model_name"],
            "raw_result": analysis_result.get("raw_result"),
            "diagnosed_at": now_iso,
            "updated_at": now_iso,
        }
        # Filter None
        extended_update = {k: v for k, v in extended_update.items() if v is not None}

        base_update = {
            "disease_name": analysis_result["disease_name"],
            "confidence": analysis_result["confidence"],
            "diagnosis_details": analysis_result["diagnosis_details"],
        }

        try:
            try:
                supabase.table("diagnoses").update(extended_update).eq("id", diagnosis_id).execute()
            except Exception as exc:
                err_str = str(exc)
                if "column" in err_str.lower() or "42703" in err_str:
                    supabase.table("diagnoses").update(base_update).eq("id", diagnosis_id).execute()
                else:
                    raise
        except Exception as db_err:
            logger.error(f"Failed to save diagnosis result to DB: {db_err}")
            return

        # 7. If diagnosis completed successfully, update plant health status
        if final_status == "completed":
            is_healthy = analysis_result.get("is_healthy", False)
            new_health_status = "healthy" if is_healthy else "needs_attention"
            # Deterministic health score: 95-100 if healthy, or scaled down by confidence
            new_health_score = 98.0 if is_healthy else round(max(10.0, 100.0 - (analysis_result["confidence"] * 60.0)), 1)

            try:
                supabase.table("plants").update({
                    "health_status": new_health_status,
                    "health_score": new_health_score,
                    "updated_at": now_iso
                }).eq("id", plant_id).execute()
            except Exception:
                pass

            # Best-effort activity log
            try:
                supabase.table("activity_logs").insert({
                    "user_id": diagnosis_row.get("user_id"),
                    "plant_id": plant_id,
                    "activity_type": "diagnosis_completed",
                    "description": f"AI Diagnosis completed for {plant_name or 'plant'}: {analysis_result['disease_name']} ({analysis_result['confidence']*100:.1f}% confidence)."
                }).execute()
            except Exception:
                pass

        elif final_status in ("model_unavailable", "failed", "inconclusive"):
            # Best-effort activity log
            try:
                supabase.table("activity_logs").insert({
                    "user_id": diagnosis_row.get("user_id"),
                    "plant_id": plant_id,
                    "activity_type": "diagnosis_incomplete",
                    "description": f"Diagnosis #{diagnosis_id} ended with status '{final_status}': {analysis_result['disease_name']}."
                }).execute()
            except Exception:
                pass

    except Exception as exc:
        logger.exception(f"Unexpected error in execute_diagnosis_inference for diagnosis #{diagnosis_id}")
        try:
            supabase.table("diagnoses").update({
                "status": "failed",
                "disease_name": "Pipeline Execution Error",
                "diagnosis_details": f"An error occurred while executing the diagnosis pipeline: {str(exc)}",
                "updated_at": datetime.now(timezone.utc).isoformat()
            }).eq("id", diagnosis_id).execute()
        except Exception:
            pass


# ====================================================================
# Model Status Endpoint
# ====================================================================

@router.get(
    "/api/diagnoses/model/status",
    response_model=LLaVAModelStatusResponse,
    summary="Check NVIDIA Nemotron vision model server availability",
)
async def get_model_status():
    """
    Pings the configured NVIDIA Nemotron API to verify model availability.
    Provides clear status without exposing credentials or internal paths.
    """
    status_info = await check_nvidia_availability()
    return {
        "available": status_info["available"],
        "status": status_info["status"],
        "model_name": status_info["model_name"],
        "model_loaded": status_info.get("cloud_api_configured", True),
        "engine": status_info.get("engine", "NVIDIA NIM Cloud API"),
        "message": status_info["message"],
    }


# ====================================================================
# Create Diagnosis Endpoint (with Background Processing)
# ====================================================================

@router.post(
    "/api/plants/{plant_id}/diagnoses",
    response_model=DiagnosisResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Prepare and trigger plant leaf disease diagnosis",
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
    background_tasks: BackgroundTasks,
    user_id: Optional[str] = Query(None),
    supabase: Client = Depends(get_supabase)
):
    """
    Creates a diagnosis record for a plant leaf photo and initiates
    on-device LLaVA vision processing in the background.
    """
    effective_user = user_id or get_current_user_id()

    # 1. Verify plant exists and ownership
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

    # 2. Verify image exists and belongs to plant
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

    # 3. Create initial diagnosis record in 'pending' status
    cfg = get_llava_config()
    model_tag = "NVIDIA Nemotron"
    diagnosis_details = (
        "Leaf image registered and submitted for NVIDIA Nemotron vision diagnosis. "
        "AI diagnostic pipeline initialized."
    )
    extended_insert = {
        "plant_id": plant_id,
        "user_id": effective_user,
        "image_id": payload.image_id,
        "status": "pending",
        "disease_name": "Pending AI Analysis",
        "confidence": 0.0,
        "confidence_score": 0.0,
        "model_name": model_tag,
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
        diagnosis_id = created_diagnosis["id"]

        # 4. Best-effort activity log
        try:
            supabase.table("activity_logs").insert({
                "user_id": effective_user,
                "plant_id": plant_id,
                "activity_type": "diagnosis_queued",
                "description": f"Queued disease diagnosis for image #{payload.image_id}."
            }).execute()
        except Exception:
            pass

        # 5. Enqueue background LLaVA inference if auto_process is active
        if cfg.get("auto_process", True):
            background_tasks.add_task(execute_diagnosis_inference, diagnosis_id, supabase)

        return created_diagnosis
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error creating diagnosis: {str(exc)}"
        )


# ====================================================================
# On-Demand Inference Trigger Endpoint
# ====================================================================

@router.post(
    "/api/diagnoses/{diagnosis_id}/analyze",
    response_model=DiagnosisResponse,
    summary="Trigger or retry Local LLaVA inference on a diagnosis record",
)
async def analyze_diagnosis_record(
    diagnosis_id: int,
    background: bool = Query(False, description="Whether to execute in background or await completion"),
    background_tasks: BackgroundTasks = None,
    supabase: Client = Depends(get_supabase)
):
    """
    Triggers Local LLaVA analysis on an existing diagnosis record.
    If background=False (default), runs synchronously and returns the updated result.
    """
    # 1. Fetch diagnosis record
    try:
        res = supabase.table("diagnoses").select("*").eq("id", diagnosis_id).execute()
        if not res.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Diagnosis with ID {diagnosis_id} not found."
            )
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error loading diagnosis: {str(exc)}"
        )

    if background:
        if background_tasks:
            background_tasks.add_task(execute_diagnosis_inference, diagnosis_id, supabase)
        # Return current state marked as processing
        return normalize_diagnosis(res.data[0])

    # Synchronous execution: await completion and return updated row
    await execute_diagnosis_inference(diagnosis_id, supabase)

    updated_res = supabase.table("diagnoses").select("*").eq("id", diagnosis_id).execute()
    if updated_res.data:
        return normalize_diagnosis(updated_res.data[0])
    return normalize_diagnosis(res.data[0])


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
