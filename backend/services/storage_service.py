"""
Storage Service Module
----------------------
Handles image uploads and signed URL generation for the EXISTING Supabase Storage bucket: 'plant-images'.

Rules:
- Validates allowed image MIME types and extensions (jpg, jpeg, png, webp).
- Limits maximum file size to 10 MB, returning HTTP 400 if validation fails.
- Generates unique storage paths (plants/{plant_id}/{uuid}{ext}) without accidental overwriting.
- Generates temporary signed URLs (3600 seconds) for private bucket viewing.
- Provides cleanup utilities to remove orphaned files if database operations fail.
"""

import os
import uuid
from typing import Tuple, Optional
from fastapi import UploadFile, HTTPException, status
from supabase import Client

# Constants
BUCKET_NAME = "plant-images"
MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024  # 10 MB
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
ALLOWED_MIME_TYPES = {"image/jpeg", "image/png", "image/webp", "image/jpg"}


def validate_image_format(file: UploadFile) -> Tuple[str, str]:
    """
    Validates file extension and MIME type.
    Returns (extension, content_type).
    Raises HTTP 400 for unsupported or non-image types.
    """
    filename = file.filename or "image.jpg"
    ext = os.path.splitext(filename)[1].lower()

    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid image extension '{ext or 'unknown'}'. Allowed types: JPEG, JPG, PNG, WEBP."
        )

    content_type = (file.content_type or "image/jpeg").lower()
    if content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid image MIME type '{content_type}'. Allowed types: image/jpeg, image/png, image/webp."
        )

    return ext, content_type


async def upload_plant_image(
    supabase: Client,
    plant_id: int,
    file: UploadFile
) -> Tuple[str, str]:
    """
    Validates file and size, uploads image to the 'plant-images' bucket, and returns (storage_path, content_type).

    Parameters:
    - supabase: Active Supabase Client
    - plant_id: ID of the plant
    - file: UploadFile from multipart/form-data

    Returns:
    - (storage_path, content_type)
    """
    # 1. Validate file format & mime type
    ext, content_type = validate_image_format(file)

    # 2. Read file content and validate file size
    try:
        content = await file.read()
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to read uploaded file: {str(exc)}"
        )

    file_size = len(content)
    if file_size == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The uploaded file is empty."
        )

    if file_size > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Image too large. Maximum size is 10 MB (received {file_size / (1024 * 1024):.2f} MB)."
        )

    # 3. Generate unique storage path: plants/{plant_id}/{unique_filename}
    unique_filename = f"{uuid.uuid4()}{ext}"
    storage_path = f"plants/{plant_id}/{unique_filename}"

    # 4. Upload to existing Supabase Storage bucket without overwriting
    try:
        supabase.storage.from_(BUCKET_NAME).upload(
            path=storage_path,
            file=content,
            file_options={"content-type": content_type, "upsert": "false"}
        )
    except Exception as exc:
        err_str = str(exc)
        if "Bucket not found" in err_str:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Supabase Storage bucket '{BUCKET_NAME}' was not found. Please verify bucket exists in Supabase."
            )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to upload image to Supabase Storage: {err_str}"
        )

    return storage_path, content_type


def create_image_signed_url(
    supabase: Client,
    storage_path: str,
    expires_in: int = 3600
) -> str:
    """
    Generates a temporary signed URL for an image in the private 'plant-images' bucket.
    Valid for approximately expires_in seconds (default: 3600 / 1 hour).
    """
    if not storage_path:
        return ""
    if storage_path.startswith("http://") or storage_path.startswith("https://"):
        return storage_path

    try:
        res = supabase.storage.from_(BUCKET_NAME).create_signed_url(storage_path, expires_in)
        signed_url: Optional[str] = None
        if isinstance(res, dict):
            signed_url = res.get("signedURL") or res.get("signedUrl") or res.get("signed_url")
        elif hasattr(res, "signed_url"):
            signed_url = res.signed_url
        elif hasattr(res, "signedURL"):
            signed_url = res.signedURL
        elif hasattr(res, "signedUrl"):
            signed_url = res.signedUrl
        else:
            signed_url = str(res)

        if not signed_url:
            raise Exception("No signed URL found in Supabase Storage response.")
        return signed_url
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate signed URL for image '{storage_path}': {str(exc)}"
        )


def delete_storage_file(supabase: Client, storage_path: str) -> bool:
    """
    Attempts to remove an uploaded file from Supabase Storage.
    Safe best-effort cleanup function to avoid orphaned files.
    """
    try:
        supabase.storage.from_(BUCKET_NAME).remove([storage_path])
        return True
    except Exception:
        return False
