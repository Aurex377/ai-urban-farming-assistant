"""
Users Route Module
------------------
Handles CRUD operations for the existing 'users' table in Supabase.
"""

from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from supabase import Client
import uuid

try:
    from backend.database import get_supabase
    from backend.schemas.users import UserCreate, UserUpdate, UserResponse
except ImportError:
    from database import get_supabase
    from schemas.users import UserCreate, UserUpdate, UserResponse

router = APIRouter(prefix="/api/users", tags=["Users"])


@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_user(
    payload: UserCreate,
    supabase: Client = Depends(get_supabase)
):
    """
    Create a new user profile in the 'users' table.
    """
    user_data = {
        "id": str(uuid.uuid4()),
        "name": payload.name,
        "email": payload.email,
        "location": payload.location
    }

    try:
        response = supabase.table("users").insert(user_data).execute()
        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to create user record."
            )
        return response.data[0]
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error inserting user: {str(exc)}"
        )


@router.get("/{user_id}", response_model=UserResponse)
def get_user(
    user_id: str,
    supabase: Client = Depends(get_supabase)
):
    """
    Retrieve user by UUID.
    """
    try:
        response = supabase.table("users").select("*").eq("id", user_id).execute()
        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"User with ID '{user_id}' not found."
            )
        return response.data[0]
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error querying user: {str(exc)}"
        )


@router.put("/{user_id}", response_model=UserResponse)
def update_user(
    user_id: str,
    payload: UserUpdate,
    supabase: Client = Depends(get_supabase)
):
    """
    Update user profile by UUID.
    """
    update_data = {k: v for k, v in payload.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No fields provided to update."
        )

    try:
        response = supabase.table("users").update(update_data).eq("id", user_id).execute()
        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"User with ID '{user_id}' not found."
            )
        return response.data[0]
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating user: {str(exc)}"
        )


@router.get("", response_model=List[UserResponse])
def list_users(
    supabase: Client = Depends(get_supabase)
):
    """
    List all users.
    """
    try:
        response = supabase.table("users").select("*").execute()
        return response.data or []
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error querying users: {str(exc)}"
        )
