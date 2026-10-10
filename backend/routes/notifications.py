"""
Notifications Route Module — Phase 5
-------------------------------------
Endpoints for fetching, reading, counting, and syncing in-app notifications.
"""

from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, Query
from supabase import Client

try:
    from backend.database import get_supabase
    from backend.services.notification_service import (
        get_user_notifications,
        get_unread_count,
        mark_notification_read,
        mark_all_notifications_read,
        sync_early_warnings_to_notifications,
        create_notification,
    )
    from backend.schemas.notifications import (
        NotificationResponse,
        NotificationCreate,
        NotificationBadgeCount,
    )
except ImportError:
    from database import get_supabase
    from services.notification_service import (
        get_user_notifications,
        get_unread_count,
        mark_notification_read,
        mark_all_notifications_read,
        sync_early_warnings_to_notifications,
        create_notification,
    )
    from schemas.notifications import (
        NotificationResponse,
        NotificationCreate,
        NotificationBadgeCount,
    )

router = APIRouter(prefix="/api/notifications", tags=["Notifications"])


@router.get("", response_model=List[NotificationResponse], summary="Get recent in-app notifications")
async def list_notifications(
    user_id: Optional[str] = Query(None, description="User UUID"),
    unread_only: bool = Query(False, description="Filter for unread notifications only"),
    limit: int = Query(50, ge=1, le=100),
    supabase: Client = Depends(get_supabase)
):
    """
    Fetches the notification feed for the current gardener.
    """
    try:
        # First ensure warnings are synced
        await sync_early_warnings_to_notifications(user_id, supabase)
        items = await get_user_notifications(user_id, supabase, unread_only=unread_only, limit=limit)
        return items
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error listing notifications: {str(exc)}"
        )


@router.get("/badge", response_model=NotificationBadgeCount, summary="Get unread badge count")
async def get_badge(
    user_id: Optional[str] = Query(None, description="User UUID"),
    supabase: Client = Depends(get_supabase)
):
    """
    Returns unread notification count and urgent flag for UI badge.
    """
    try:
        await sync_early_warnings_to_notifications(user_id, supabase)
        return await get_unread_count(user_id, supabase)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error checking badge count: {str(exc)}"
        )


@router.post("/{notification_id}/read", summary="Mark single notification as read")
async def mark_single_read(
    notification_id: int,
    supabase: Client = Depends(get_supabase)
):
    """
    Marks a specific notification as read.
    """
    try:
        success = await mark_notification_read(notification_id, supabase)
        return {"id": notification_id, "is_read": True, "success": success}
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error marking notification read: {str(exc)}"
        )


@router.post("/read-all", summary="Mark all notifications as read")
async def mark_all_read(
    user_id: Optional[str] = Query(None, description="User UUID"),
    supabase: Client = Depends(get_supabase)
):
    """
    Marks all notifications for user as read.
    """
    try:
        count = await mark_all_notifications_read(user_id, supabase)
        return {"marked_read_count": count, "success": True}
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error marking all notifications read: {str(exc)}"
        )


@router.post("/sync", summary="Sync early warnings into notifications")
async def sync_notifications(
    user_id: Optional[str] = Query(None, description="User UUID"),
    supabase: Client = Depends(get_supabase)
):
    """
    Triggers early warning assessment and creates any new alerts.
    """
    try:
        count = await sync_early_warnings_to_notifications(user_id, supabase)
        return {"synced_count": count, "success": True}
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error syncing notifications: {str(exc)}"
        )
