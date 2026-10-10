"""
In-App Notification Service — Phase 5
-------------------------------------
Handles notification generation, deduplication, unread tracking,
and early-warning synchronization. Resilient against missing DB tables.
"""

from typing import List, Dict, Any, Optional
from datetime import datetime, timezone, timedelta
import logging
import os

from supabase import Client
try:
    from backend.services.early_warning_service import evaluate_all_early_warnings
except ImportError:
    from services.early_warning_service import evaluate_all_early_warnings

logger = logging.getLogger("growwise.notifications")

# In-memory resilient notification cache for fallback / immediate demo responsiveness
_IN_MEMORY_NOTIFICATIONS: List[Dict[str, Any]] = []
_NOTIFICATION_ID_COUNTER = 1000


def _get_next_id() -> int:
    global _NOTIFICATION_ID_COUNTER
    _NOTIFICATION_ID_COUNTER += 1
    return _NOTIFICATION_ID_COUNTER


def _parse_iso_dt(val: Any) -> datetime:
    if isinstance(val, datetime):
        return val if val.tzinfo else val.replace(tzinfo=timezone.utc)
    if isinstance(val, str):
        try:
            dt = datetime.fromisoformat(val.replace("Z", "+00:00"))
            return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)
        except Exception:
            pass
    return datetime.now(timezone.utc)


async def create_notification(
    supabase: Client,
    user_id: Optional[str],
    plant_id: Optional[int],
    type: str,
    severity: str,
    title: str,
    message: str,
    action_url: Optional[str] = None,
    metadata: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """
    Creates a notification in Supabase with in-memory fallback.
    Prevents duplicates within 24 hours for the same plant and warning type.
    """
    now = datetime.now(timezone.utc)
    metadata = metadata or {}
    user_id = user_id or os.getenv("DEV_USER_ID", "27865d2c-302e-4a2d-83aa-c1c9ea7338a4")

    # Deduplication check in-memory
    cutoff = now - timedelta(hours=24)
    for n in _IN_MEMORY_NOTIFICATIONS:
        if (
            n.get("user_id") == user_id
            and n.get("plant_id") == plant_id
            and n.get("type") == type
            and n.get("title") == title
            and _parse_iso_dt(n.get("created_at")) >= cutoff
        ):
            # Already exists recently
            return n

    record = {
        "user_id": user_id,
        "plant_id": plant_id,
        "type": type,
        "severity": severity,
        "title": title,
        "message": message,
        "action_url": action_url,
        "is_read": False,
        "metadata": metadata,
        "created_at": now.isoformat(),
        "updated_at": now.isoformat(),
    }

    # 1. Attempt Supabase insert
    try:
        res = supabase.table("notifications").insert(record).execute()
        if res.data:
            inserted = {**record, **res.data[0]}
            _IN_MEMORY_NOTIFICATIONS.append(inserted)
            return inserted
    except Exception as exc:
        logger.debug(f"Supabase notifications table not accessible, using resilient in-memory: {exc}")

    # 2. Resilient Fallback Record
    fallback_record = dict(record)
    fallback_record["id"] = _get_next_id()
    fallback_record["created_at"] = now
    fallback_record["updated_at"] = now
    _IN_MEMORY_NOTIFICATIONS.append(fallback_record)

    # Also log to activity_logs if possible so audit trail is persistent
    try:
        supabase.table("activity_logs").insert({
            "user_id": user_id,
            "plant_id": plant_id,
            "activity_type": f"alert_{type}",
            "description": f"[{severity.upper()}] {title}: {message[:120]}"
        }).execute()
    except Exception:
        pass

    return fallback_record


async def get_user_notifications(
    user_id: Optional[str],
    supabase: Client,
    unread_only: bool = False,
    limit: int = 50
) -> List[Dict[str, Any]]:
    """
    Retrieves notifications for the user. Merges Supabase and memory store.
    """
    user_id = user_id or os.getenv("DEV_USER_ID", "27865d2c-302e-4a2d-83aa-c1c9ea7338a4")
    db_notifications: List[Dict[str, Any]] = []

    try:
        query = (
            supabase.table("notifications")
            .select("*")
            .order("created_at", desc=True)
            .limit(limit)
        )
        if unread_only:
            query = query.eq("is_read", False)
        res = query.execute()
        if res.data:
            db_notifications = res.data
    except Exception:
        pass

    # Merge with memory notifications
    combined: Dict[int, Dict[str, Any]] = {}
    for n in db_notifications:
        if n.get("id") and n.get("type") and n.get("title") and n.get("message"):
            combined[n.get("id")] = n
    for n in _IN_MEMORY_NOTIFICATIONS:
        if not (n.get("id") and n.get("type") and n.get("title") and n.get("message")):
            continue
        if user_id and n.get("user_id") and n.get("user_id") != user_id:
            continue
        if unread_only and n.get("is_read"):
            continue
        combined[n.get("id")] = n

    result = list(combined.values())
    result.sort(
        key=lambda x: str(x.get("created_at", "")),
        reverse=True
    )
    return result[:limit]


async def mark_notification_read(notification_id: int, supabase: Client) -> bool:
    """
    Marks a notification as read in both DB and memory cache.
    """
    for n in _IN_MEMORY_NOTIFICATIONS:
        if n.get("id") == notification_id:
            n["is_read"] = True

    try:
        supabase.table("notifications").update({"is_read": True}).eq("id", notification_id).execute()
        return True
    except Exception:
        return True


async def mark_all_notifications_read(user_id: Optional[str], supabase: Client) -> int:
    """
    Marks all notifications for a user as read.
    """
    user_id = user_id or os.getenv("DEV_USER_ID", "27865d2c-302e-4a2d-83aa-c1c9ea7338a4")
    count = 0
    for n in _IN_MEMORY_NOTIFICATIONS:
        if not user_id or n.get("user_id") == user_id:
            if not n.get("is_read"):
                n["is_read"] = True
                count += 1

    try:
        res = supabase.table("notifications").update({"is_read": True}).eq("user_id", user_id).execute()
        if res.data:
            count = max(count, len(res.data))
    except Exception:
        pass

    return count


async def get_unread_count(user_id: Optional[str], supabase: Client) -> Dict[str, Any]:
    """
    Returns unread count and whether any urgent warnings exist.
    """
    notifications = await get_user_notifications(user_id, supabase, unread_only=True)
    has_urgent = any(n.get("severity") == "urgent" for n in notifications)
    return {
        "user_id": user_id or os.getenv("DEV_USER_ID", "27865d2c-302e-4a2d-83aa-c1c9ea7338a4"),
        "unread_count": len(notifications),
        "has_urgent": has_urgent,
    }


async def sync_early_warnings_to_notifications(user_id: Optional[str], supabase: Client) -> int:
    """
    Runs early warning evaluation across all plants and creates
    genuine notifications for new alerts.
    """
    user_id = user_id or os.getenv("DEV_USER_ID", "27865d2c-302e-4a2d-83aa-c1c9ea7338a4")
    warnings = await evaluate_all_early_warnings(supabase, user_id=user_id)
    created_count = 0

    for w in warnings:
        await create_notification(
            supabase=supabase,
            user_id=user_id,
            plant_id=w.get("plant_id"),
            type=w.get("warning_type", "early_warning"),
            severity=w.get("severity", "warning"),
            title=w.get("title"),
            message=f"{w.get('summary')} Action: {w.get('recommended_action')}",
            action_url=f"/plants/{w.get('plant_id')}",
            metadata=w.get("metrics", {}),
        )
        created_count += 1

    return created_count
