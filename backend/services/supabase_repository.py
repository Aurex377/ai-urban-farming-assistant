"""
Supabase Repository Module — Phase 1
------------------------------------
Handles all data access for Plants, Plant Images, and Diagnoses.
Provides adaptive schema mapping to seamlessly work with both baseline
and extended Supabase PostgreSQL schemas without runtime crashes.
"""

import os
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
from fastapi import HTTPException, status
from supabase import Client

from backend.schemas.plants import PlantCreate, PlantUpdate, PlantResponse, PlantImageResponse
from backend.schemas.diagnoses import DiagnosisResponse
from backend.services.storage_service import create_image_signed_url, delete_storage_file


def _get_dev_user_id() -> str:
    return os.getenv("DEV_USER_ID", "27865d2c-302e-4a2d-83aa-c1c9ea7338a4").strip()


def _normalize_plant_record(raw: Dict[str, Any]) -> Dict[str, Any]:
    """Ensures plant object conforms to PlantResponse schema regardless of table columns."""
    name = raw.get("name") or raw.get("plant_name") or "Unnamed Plant"
    return {
        "id": raw["id"],
        "user_id": str(raw.get("user_id") or _get_dev_user_id()),
        "name": name,
        "plant_name": name,
        "species": raw.get("species"),
        "plant_type": raw.get("plant_type"),
        "variety": raw.get("variety"),
        "planted_date": str(raw["planted_date"]) if raw.get("planted_date") else None,
        "location": raw.get("location"),
        "health_status": raw.get("health_status") or "healthy",
        "health_score": float(raw["health_score"]) if raw.get("health_score") is not None else 100.0,
        "last_watered_at": str(raw["last_watered_at"]) if raw.get("last_watered_at") else None,
        "next_watering_at": str(raw["next_watering_at"]) if raw.get("next_watering_at") else None,
        "notes": raw.get("notes"),
        "garden_zone_id": raw.get("garden_zone_id"),
        "created_at": str(raw["created_at"]) if raw.get("created_at") else None,
        "updated_at": str(raw.get("updated_at") or raw.get("created_at") or "") or None,
    }


def _normalize_image_record(raw: Dict[str, Any], signed_url: Optional[str] = None) -> Dict[str, Any]:
    """Ensures plant image object conforms to PlantImageResponse schema."""
    storage_path = raw.get("storage_path") or raw.get("image_url") or ""
    return {
        "id": raw["id"],
        "plant_id": raw["plant_id"],
        "user_id": str(raw.get("user_id")) if raw.get("user_id") else None,
        "storage_path": storage_path,
        "image_url": storage_path,
        "public_url_or_signed_url": signed_url or raw.get("public_url_or_signed_url") or signed_url,
        "signed_url": signed_url,
        "image_type": raw.get("image_type") or "leaf",
        "captured_at": str(raw.get("captured_at") or raw.get("uploaded_at") or ""),
        "upload_status": raw.get("upload_status") or "uploaded",
        "created_at": str(raw.get("created_at") or raw.get("uploaded_at") or ""),
        "uploaded_at": str(raw.get("uploaded_at") or raw.get("created_at") or ""),
    }


def _normalize_diagnosis_record(raw: Dict[str, Any]) -> Dict[str, Any]:
    """Ensures diagnosis object conforms to DiagnosisResponse schema."""
    return {
        "id": raw["id"],
        "plant_id": raw["plant_id"],
        "user_id": str(raw.get("user_id")) if raw.get("user_id") else None,
        "image_id": raw.get("image_id"),
        "status": raw.get("status") or "pending",
        "disease_name": raw.get("disease_name") or "Pending AI Analysis",
        "symptoms": raw.get("symptoms"),
        "confidence_score": float(raw["confidence_score"]) if raw.get("confidence_score") is not None else (
            float(raw["confidence"]) if raw.get("confidence") is not None else 0.0
        ),
        "severity": raw.get("severity"),
        "model_name": raw.get("model_name") or "Local LLaVA Plant Disease 7B",
        "raw_result": raw.get("raw_result"),
        "diagnosis_details": raw.get("diagnosis_details") or "Queued in pending state. Local LLaVA processing scheduled for Phase 2.",
        "created_at": str(raw.get("created_at") or raw.get("diagnosed_at") or ""),
        "updated_at": str(raw.get("updated_at") or raw.get("diagnosed_at") or ""),
        "diagnosed_at": str(raw.get("diagnosed_at") or raw.get("created_at") or ""),
        "message": raw.get("message") or "Diagnosis created in pending state. Model processing will be connected in the next phase."
    }


# ====================================================================
# Plant Operations
# ====================================================================

def list_plants(supabase: Client, user_id: Optional[str] = None) -> List[Dict[str, Any]]:
    try:
        query = supabase.table("plants").select("*")
        if user_id:
            query = query.eq("user_id", user_id)
        res = query.order("id", desc=True).execute()
        return [_normalize_plant_record(p) for p in (res.data or [])]
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error querying plants: {str(exc)}"
        )


def get_plant(supabase: Client, plant_id: int) -> Dict[str, Any]:
    try:
        res = supabase.table("plants").select("*").eq("id", plant_id).execute()
        if not res.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Plant with ID {plant_id} not found."
            )
        return _normalize_plant_record(res.data[0])
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error fetching plant: {str(exc)}"
        )


def create_plant_record(supabase: Client, payload: PlantCreate) -> Dict[str, Any]:
    user_id = payload.user_id or _get_dev_user_id()
    name = (payload.name or payload.plant_name or "").strip()
    if not name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Plant name is required."
        )

    # 1. Try full schema insert
    full_data = {
        "user_id": user_id,
        "name": name,
        "plant_name": name,
        "species": payload.species,
        "plant_type": payload.plant_type,
        "variety": payload.variety,
        "planted_date": payload.planted_date,
        "location": payload.location,
        "health_status": payload.health_status or "healthy",
        "health_score": payload.health_score if payload.health_score is not None else 100.0,
        "notes": payload.notes,
        "garden_zone_id": payload.garden_zone_id,
    }
    # Clean out None values to respect defaults
    insert_data = {k: v for k, v in full_data.items() if v is not None}

    try:
        res = supabase.table("plants").insert(insert_data).execute()
        created = res.data[0]
    except Exception as exc:
        err_str = str(exc)
        if "PGRST204" in err_str:
            # Fall back to base columns
            base_data = {
                "user_id": user_id,
                "plant_name": name,
                "species": payload.species,
                "plant_type": payload.plant_type,
                "planted_date": payload.planted_date,
            }
            base_clean = {k: v for k, v in base_data.items() if v is not None}
            res = supabase.table("plants").insert(base_clean).execute()
            created = res.data[0]
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Database error creating plant: {err_str}"
            )

    # Activity log
    try:
        supabase.table("activity_logs").insert({
            "user_id": user_id,
            "plant_id": created["id"],
            "activity_type": "plant_created",
            "description": f"Added new plant '{name}'."
        }).execute()
    except Exception:
        pass

    return _normalize_plant_record(created)


def update_plant_record(supabase: Client, plant_id: int, payload: PlantUpdate) -> Dict[str, Any]:
    # Check plant exists
    get_plant(supabase, plant_id)

    raw_dict = payload.model_dump(exclude_unset=True)
    if not raw_dict:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No update fields provided."
        )

    # If name is updated, also update plant_name
    if "name" in raw_dict and raw_dict["name"] is not None:
        raw_dict["plant_name"] = raw_dict["name"]
    elif "plant_name" in raw_dict and raw_dict["plant_name"] is not None:
        raw_dict["name"] = raw_dict["plant_name"]

    try:
        res = supabase.table("plants").update(raw_dict).eq("id", plant_id).execute()
        updated = res.data[0]
    except Exception as exc:
        err_str = str(exc)
        if "PGRST204" in err_str:
            # Fall back to base columns only
            allowed = {"plant_name", "species", "plant_type", "planted_date"}
            base_data = {k: v for k, v in raw_dict.items() if k in allowed}
            if not base_data:
                # Return current plant if only extended fields were passed without migration
                return get_plant(supabase, plant_id)
            res = supabase.table("plants").update(base_data).eq("id", plant_id).execute()
            updated = res.data[0]
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Database error updating plant: {err_str}"
            )

    return _normalize_plant_record(updated)


def delete_plant_record(supabase: Client, plant_id: int) -> Dict[str, Any]:
    get_plant(supabase, plant_id)

    # Clean up associated images from storage
    try:
        img_res = supabase.table("plant_images").select("image_url").eq("plant_id", plant_id).execute()
        for img in (img_res.data or []):
            if img.get("image_url"):
                delete_storage_file(supabase, img["image_url"])
    except Exception:
        pass

    try:
        supabase.table("plants").delete().eq("id", plant_id).execute()
        return {"success": True, "message": f"Plant {plant_id} deleted successfully."}
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error deleting plant: {str(exc)}"
        )


# ====================================================================
# Plant Image Operations
# ====================================================================

def list_plant_images(supabase: Client, plant_id: int) -> List[Dict[str, Any]]:
    # Validate plant exists
    get_plant(supabase, plant_id)

    try:
        res = (
            supabase.table("plant_images")
            .select("*")
            .eq("plant_id", plant_id)
            .order("id", desc=True)
            .execute()
        )
        images = res.data or []
        enriched = []
        for img in images:
            storage_path = img.get("storage_path") or img.get("image_url") or ""
            signed_url = None
            if storage_path:
                try:
                    signed_url = create_image_signed_url(supabase, storage_path, expires_in=3600)
                except Exception:
                    signed_url = storage_path if storage_path.startswith("http") else None
            enriched.append(_normalize_image_record(img, signed_url))
        return enriched
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error fetching plant images: {str(exc)}"
        )


def insert_plant_image(
    supabase: Client,
    plant_id: int,
    user_id: str,
    storage_path: str,
    image_type: str,
    signed_url: str
) -> Dict[str, Any]:
    full_payload = {
        "plant_id": plant_id,
        "user_id": user_id,
        "storage_path": storage_path,
        "image_url": storage_path,
        "public_url_or_signed_url": signed_url,
        "image_type": image_type,
        "upload_status": "uploaded",
    }
    try:
        res = supabase.table("plant_images").insert(full_payload).execute()
        created = res.data[0]
    except Exception as exc:
        err_str = str(exc)
        if "PGRST204" in err_str:
            base_payload = {
                "plant_id": plant_id,
                "image_url": storage_path,
                "image_type": image_type,
            }
            res = supabase.table("plant_images").insert(base_payload).execute()
            created = res.data[0]
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Database error saving image metadata: {err_str}"
            )

    return _normalize_image_record(created, signed_url)


def delete_plant_image(supabase: Client, plant_id: int, image_id: int) -> Dict[str, Any]:
    get_plant(supabase, plant_id)

    try:
        res = supabase.table("plant_images").select("*").eq("id", image_id).execute()
        if not res.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Image with ID {image_id} not found."
            )
        img = res.data[0]
        if img["plant_id"] != plant_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Image {image_id} does not belong to plant {plant_id}."
            )

        storage_path = img.get("storage_path") or img.get("image_url")
        if storage_path:
            delete_storage_file(supabase, storage_path)

        supabase.table("plant_images").delete().eq("id", image_id).execute()
        return {"success": True, "message": f"Image {image_id} deleted successfully."}
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error deleting image: {str(exc)}"
        )


# ====================================================================
# Diagnosis Pipeline Operations (Phase 1 — Pending State)
# ====================================================================

def create_pending_diagnosis(
    supabase: Client,
    plant_id: int,
    image_id: int,
    user_id: Optional[str] = None
) -> Dict[str, Any]:
    # 1. Validate plant exists
    plant = get_plant(supabase, plant_id)
    effective_user_id = user_id or plant.get("user_id") or _get_dev_user_id()

    # 2. Validate image exists and belongs to plant
    try:
        img_res = supabase.table("plant_images").select("*").eq("id", image_id).execute()
        if not img_res.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Image with ID {image_id} not found."
            )
        img = img_res.data[0]
        if img["plant_id"] != plant_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Image ID {image_id} does not belong to plant {plant_id}."
            )
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error validating image: {str(exc)}"
        )

    # 3. Create diagnosis record in 'pending' status
    full_payload = {
        "plant_id": plant_id,
        "user_id": effective_user_id,
        "image_id": image_id,
        "status": "pending",
        "disease_name": "Pending AI Analysis",
        "symptoms": None,
        "confidence_score": 0.0,
        "severity": None,
        "model_name": "Local LLaVA Plant Disease 7B",
        "raw_result": {"status": "pending", "queue": "phase_1_foundation"},
        "diagnosis_details": "Image successfully validated and queued in pending state. Local LLaVA 7B model inference will be integrated in Phase 2.",
    }

    try:
        res = supabase.table("diagnoses").insert(full_payload).execute()
        created = res.data[0]
    except Exception as exc:
        err_str = str(exc)
        if "PGRST204" in err_str:
            base_payload = {
                "plant_id": plant_id,
                "image_id": image_id,
                "disease_name": "Pending AI Analysis",
                "confidence": 0.0,
                "diagnosis_details": "Queued in pending state. Local LLaVA inference will run in Phase 2.",
            }
            res = supabase.table("diagnoses").insert(base_payload).execute()
            created = res.data[0]
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Database error creating diagnosis record: {err_str}"
            )

    # Activity log
    try:
        supabase.table("activity_logs").insert({
            "user_id": effective_user_id,
            "plant_id": plant_id,
            "activity_type": "diagnosis_created",
            "description": f"Diagnosis queued for {plant['name']} (Image #{image_id})."
        }).execute()
    except Exception:
        pass

    result = _normalize_diagnosis_record(created)
    result["message"] = "Diagnosis created in pending state. Model processing will be added in the next phase."
    return result


def list_plant_diagnoses(supabase: Client, plant_id: int) -> List[Dict[str, Any]]:
    get_plant(supabase, plant_id)
    try:
        res = (
            supabase.table("diagnoses")
            .select("*")
            .eq("plant_id", plant_id)
            .order("id", desc=True)
            .execute()
        )
        return [_normalize_diagnosis_record(d) for d in (res.data or [])]
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error querying diagnoses: {str(exc)}"
        )


def get_diagnosis(supabase: Client, diagnosis_id: int) -> Dict[str, Any]:
    try:
        res = supabase.table("diagnoses").select("*").eq("id", diagnosis_id).execute()
        if not res.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Diagnosis with ID {diagnosis_id} not found."
            )
        return _normalize_diagnosis_record(res.data[0])
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error fetching diagnosis: {str(exc)}"
        )
