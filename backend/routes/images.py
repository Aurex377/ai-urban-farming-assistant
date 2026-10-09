"""
Plant Images Route Module — Phase 1
-----------------------------------
Handles secure image uploads, signed URL retrieval, and image deletion
for the Supabase Storage bucket 'plant-images' and the 'plant_images' table.
"""

import os
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status, Query
from supabase import Client

try:
    from backend.database import get_supabase
    from backend.services.storage_service import (
        upload_plant_image,
        validate_image_format,
        delete_storage_file,
        create_image_signed_url
    )
    from backend.schemas.plants import (
        PlantImageResponse,
        PlantImageUploadResponse,
        ImageUploadSuccessResponse,
    )
except ImportError:
    from database import get_supabase
    from services.storage_service import (
        upload_plant_image,
        validate_image_format,
        delete_storage_file,
        create_image_signed_url
    )
    from schemas.plants import (
        PlantImageResponse,
        PlantImageUploadResponse,
        ImageUploadSuccessResponse,
    )

router = APIRouter(prefix="/api/plants", tags=["Plant Images"])

DEFAULT_DEV_USER = "27865d2c-302e-4a2d-83aa-c1c9ea7338a4"


def get_current_user_id() -> str:
    return os.getenv("DEV_USER_ID", DEFAULT_DEV_USER).strip() or DEFAULT_DEV_USER


def verify_plant_ownership(plant: Dict[str, Any], user_id: str) -> None:
    plant_user = str(plant.get("user_id") or "")
    if plant_user and user_id and plant_user != user_id and user_id != DEFAULT_DEV_USER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Unauthorized: You do not have permission to access this plant's images."
        )


@router.post(
    "/{plant_id}/images",
    response_model=PlantImageUploadResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload an image for a plant",
)
async def upload_image_for_plant(
    plant_id: int,
    file: UploadFile = File(..., description="Image file (JPEG, PNG, WEBP, max 10MB)"),
    user_id: Optional[str] = Query(None),
    supabase: Client = Depends(get_supabase)
):
    """
    Upload a plant image (JPEG, PNG, WEBP) to Supabase Storage bucket 'plant-images'
    and record metadata in 'plant_images' table.
    """
    effective_user = user_id or get_current_user_id()

    # 1. Verify plant exists and belongs to user
    try:
        plant_check = supabase.table("plants").select("id, user_id").eq("id", plant_id).execute()
        if not plant_check.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Plant with ID {plant_id} does not exist."
            )
        plant_data = plant_check.data[0]
        verify_plant_ownership(plant_data, effective_user)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error validating plant: {str(exc)}"
        )

    # 2. Upload file to Supabase Storage
    storage_path, content_type = await upload_plant_image(supabase, plant_id, file)

    # 3. Create plant_images record (supports both base and extended columns)
    extended_insert = {
        "plant_id": plant_id,
        "user_id": effective_user,
        "storage_path": storage_path,
        "image_url": storage_path,
        "image_type": file.content_type or content_type,
        "upload_status": "uploaded",
    }
    base_insert = {
        "plant_id": plant_id,
        "image_url": storage_path,
        "image_type": file.content_type or content_type,
    }

    try:
        try:
            res = supabase.table("plant_images").insert(extended_insert).execute()
        except Exception as exc:
            err_msg = str(exc)
            if "column" in err_msg.lower() or "42703" in err_msg:
                res = supabase.table("plant_images").insert(base_insert).execute()
            else:
                raise

        if not res.data:
            raise Exception("Failed to insert plant image record.")
        new_image = res.data[0]
        image_id = new_image["id"]
    except HTTPException:
        delete_storage_file(supabase, storage_path)
        raise
    except Exception as exc:
        delete_storage_file(supabase, storage_path)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error storing image record: {str(exc)}"
        )

    # 4. Generate signed URL for immediate browser rendering
    signed_url = None
    try:
        signed_url = create_image_signed_url(supabase, storage_path, expires_in=3600)
    except Exception:
        pass

    # 5. Best-effort activity log
    try:
        supabase.table("activity_logs").insert({
            "user_id": effective_user,
            "plant_id": plant_id,
            "activity_type": "image_uploaded",
            "description": f"Uploaded new image for plant {plant_id}."
        }).execute()
    except Exception:
        pass

    return {
        "id": image_id,
        "image_id": image_id,
        "plant_id": plant_id,
        "storage_path": storage_path,
        "image_url": storage_path,
        "image_type": new_image.get("image_type") or "leaf",
        "upload_status": new_image.get("upload_status") or "uploaded",
        "signed_url": signed_url,
        "public_url_or_signed_url": signed_url,
        "uploaded_at": str(new_image.get("uploaded_at") or new_image.get("created_at") or ""),
        "success": True,
        "message": "Image uploaded successfully."
    }


@router.get(
    "/{plant_id}/images",
    response_model=List[PlantImageResponse],
    summary="Get all images for a plant with temporary signed URLs",
)
def get_plant_images(
    plant_id: int,
    user_id: Optional[str] = Query(None),
    supabase: Client = Depends(get_supabase)
):
    """
    Get all uploaded images for a plant, including temporary signed URLs.
    """
    # 1. Verify plant exists and check ownership
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

    # 2. Query plant_images table
    try:
        res = (
            supabase.table("plant_images")
            .select("*")
            .eq("plant_id", plant_id)
            .order("id", desc=True)
            .execute()
        )
        images = res.data or []
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error fetching plant images: {str(exc)}"
        )

    if not images:
        return []

    # 3. Generate signed URLs
    enriched_images = []
    for img in images:
        storage_path = img.get("storage_path") or img.get("image_url") or ""
        signed_url = None
        if storage_path:
            try:
                signed_url = create_image_signed_url(supabase, storage_path, expires_in=3600)
            except Exception:
                signed_url = None

        uploaded_at = str(img.get("uploaded_at") or img.get("created_at") or "")
        enriched_images.append({
            "id": img["id"],
            "plant_id": img["plant_id"],
            "user_id": str(img.get("user_id")) if img.get("user_id") else None,
            "storage_path": storage_path,
            "image_url": storage_path,
            "public_url_or_signed_url": signed_url,
            "signed_url": signed_url,
            "image_type": img.get("image_type") or "leaf",
            "captured_at": str(img.get("captured_at") or uploaded_at),
            "upload_status": img.get("upload_status") or "uploaded",
            "created_at": uploaded_at,
            "uploaded_at": uploaded_at,
        })

    return enriched_images


@router.delete(
    "/{plant_id}/images/{image_id}",
    summary="Delete a plant image from Storage and Database",
)
def delete_plant_image(
    plant_id: int,
    image_id: int,
    user_id: Optional[str] = Query(None),
    supabase: Client = Depends(get_supabase)
):
    """
    Deletes an image from the plant-images storage bucket and removes its database record.
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

    # 2. Check image exists and belongs to plant
    try:
        img_check = supabase.table("plant_images").select("*").eq("id", image_id).execute()
        if not img_check.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Image with ID {image_id} not found."
            )
        img_record = img_check.data[0]
        if img_record["plant_id"] != plant_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Image {image_id} does not belong to plant {plant_id}."
            )
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error checking image: {str(exc)}"
        )

    # 3. Delete file from Supabase storage
    storage_path = img_record.get("storage_path") or img_record.get("image_url")
    if storage_path:
        delete_storage_file(supabase, storage_path)

    # 4. Delete image record from database
    try:
        supabase.table("plant_images").delete().eq("id", image_id).execute()
        return {"success": True, "message": f"Image {image_id} deleted successfully."}
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error removing image record: {str(exc)}"
        )
