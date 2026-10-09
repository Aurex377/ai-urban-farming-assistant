"""
Plant Images Route Module
-------------------------
Handles image uploads and retrieval with signed URLs for Supabase Storage
and records in the 'plant_images' table.
"""

from typing import List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from supabase import Client

try:
    from backend.database import get_supabase
    from backend.services.storage_service import (
        upload_plant_image,
        validate_image_format,
        delete_storage_file,
        create_image_signed_url
    )
    from backend.schemas.plants import PlantImageResponse, PlantImageUploadResponse
except ImportError:
    from database import get_supabase
    from services.storage_service import (
        upload_plant_image,
        validate_image_format,
        delete_storage_file,
        create_image_signed_url
    )
    from schemas.plants import PlantImageResponse, PlantImageUploadResponse

router = APIRouter(prefix="/api/plants", tags=["Plant Images"])


@router.post(
    "/{plant_id}/images",
    response_model=PlantImageUploadResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload an image for a plant",
    description=(
        "Uploads a plant image (JPEG, JPG, PNG, WEBP up to 10MB) to Supabase Storage "
        "bucket 'plant-images' and records metadata into the 'plant_images' table."
    ),
    responses={
        201: {
            "description": "Image successfully uploaded and metadata recorded.",
            "model": PlantImageUploadResponse
        },
        400: {
            "description": "Validation failed: invalid file format or file exceeds 10MB."
        },
        404: {
            "description": "Plant with specified plant_id not found."
        },
        500: {
            "description": "Storage or database error occurred during upload."
        }
    }
)
async def upload_image_for_plant(
    plant_id: int,
    file: UploadFile = File(..., description="Image file to upload (JPEG, JPG, PNG, WEBP, max 10MB)"),
    supabase: Client = Depends(get_supabase)
):
    """
    Upload a plant image (jpg, jpeg, png, webp) to Supabase Storage bucket 'plant-images'
    and record the reference in the 'plant_images' table.
    """
    # 1. Verify plant exists in the database before proceeding
    try:
        plant_check = supabase.table("plants").select("id, user_id").eq("id", plant_id).execute()
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

    # 2. Validate file format and upload image to Supabase Storage bucket 'plant-images'
    storage_path, content_type = await upload_plant_image(supabase, plant_id, file)

    # 3. Insert record into existing 'plant_images' table
    insert_payload = {
        "plant_id": plant_id,
        "image_url": storage_path,
        "image_type": file.content_type or content_type
    }

    try:
        res = supabase.table("plant_images").insert(insert_payload).execute()
        if not res.data:
            raise Exception("Failed to insert plant image record: no data returned from database.")
        new_image = res.data[0]
        image_id = new_image["id"]
    except HTTPException:
        delete_storage_file(supabase, storage_path)
        raise
    except Exception as exc:
        # Cleanup uploaded file from Storage to prevent orphaned files
        delete_storage_file(supabase, storage_path)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error storing image record: {str(exc)}"
        )

    # 4. Best-effort activity log
    try:
        supabase.table("activity_logs").insert({
            "user_id": plant_data.get("user_id"),
            "plant_id": plant_id,
            "activity_type": "image_uploaded",
            "description": f"Uploaded new {new_image.get('image_type', 'image')} for plant {plant_id}."
        }).execute()
    except Exception:
        pass

    # 5. Return JSON response containing image database id, plant_id, image_url, image_type, uploaded_at
    return {
        "id": image_id,
        "image_id": image_id,
        "plant_id": new_image["plant_id"],
        "image_url": new_image["image_url"],
        "image_type": new_image.get("image_type"),
        "uploaded_at": str(new_image["uploaded_at"]) if new_image.get("uploaded_at") else None,
        "success": True,
        "message": "Image uploaded successfully."
    }


@router.get(
    "/{plant_id}/images",
    response_model=List[PlantImageResponse],
    summary="Get all images for a plant with temporary signed URLs",
    description=(
        "Verifies that the plant exists, retrieves all images for that plant from 'plant_images' "
        "ordered newest first (uploaded_at DESC), and generates temporary signed URLs (valid for 1 hour) "
        "from the private Supabase Storage bucket 'plant-images'."
    ),
    responses={
        200: {
            "description": "List of images with temporary signed URLs for browser display.",
            "model": List[PlantImageResponse]
        },
        404: {
            "description": "Plant with specified plant_id not found."
        },
        500: {
            "description": "Database query or signed URL generation error."
        }
    }
)
def get_plant_images(
    plant_id: int,
    supabase: Client = Depends(get_supabase)
):
    """
    Get all uploaded images for a plant, including temporary signed URLs.
    """
    # 1. Verify plant exists in the database
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
            detail=f"Database error verifying plant: {str(exc)}"
        )

    # 2. Query plant_images table ordered by uploaded_at DESC
    try:
        res = (
            supabase.table("plant_images")
            .select("*")
            .eq("plant_id", plant_id)
            .order("uploaded_at", desc=True)
            .execute()
        )
        images = res.data or []
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error fetching plant images: {str(exc)}"
        )

    # 3. If there are no images, return [] with HTTP 200
    if not images:
        return []

    # 4. Generate temporary signed URL for each image from private bucket
    enriched_images = []
    for img in images:
        storage_path = img.get("image_url")
        signed_url = None
        if storage_path:
            try:
                signed_url = create_image_signed_url(supabase, storage_path, expires_in=3600)
            except Exception as exc:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Failed to generate signed URL for image {img.get('id')}: {str(exc)}"
                )

        enriched_images.append({
            "id": img["id"],
            "plant_id": img["plant_id"],
            "image_url": storage_path,
            "image_type": img.get("image_type"),
            "uploaded_at": str(img["uploaded_at"]) if img.get("uploaded_at") else None,
            "signed_url": signed_url
        })

    return enriched_images
