"""
Plant Health Timeline Service — Phase 5
---------------------------------------
Compiles unified, non-destructive chronological history of all clinical milestones,
leaf scans, disease diagnoses, watering logs, and care recommendations.
"""

from typing import Dict, Any, List, Optional
from datetime import datetime, timezone
import logging

from supabase import Client
try:
    from backend.services.early_warning_service import evaluate_plant_early_warnings
except ImportError:
    from services.early_warning_service import evaluate_plant_early_warnings

logger = logging.getLogger("growwise.timeline")


def _parse_iso(val: Any) -> datetime:
    if isinstance(val, datetime):
        return val if val.tzinfo else val.replace(tzinfo=timezone.utc)
    if isinstance(val, str):
        try:
            dt = datetime.fromisoformat(val.replace("Z", "+00:00"))
            return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)
        except Exception:
            pass
    return datetime.now(timezone.utc)


async def get_plant_timeline(plant_id: int, supabase: Client) -> Dict[str, Any]:
    """
    Fetches, normalizes, and sorts all chronological milestones for a plant.
    """
    # 1. Fetch plant profile
    plant_res = supabase.table("plants").select("*").eq("id", plant_id).execute()
    if not plant_res.data:
        raise ValueError(f"Plant {plant_id} not found.")
    plant = plant_res.data[0]
    plant_name = plant.get("name") or plant.get("plant_name") or f"Plant #{plant_id}"
    species = plant.get("species") or "Urban plant"

    events: List[Dict[str, Any]] = []

    # A. Milestone: Planted / Created Event
    created_dt = _parse_iso(plant.get("planted_date") or plant.get("created_at"))
    events.append({
        "id": f"event_plant_created_{plant_id}",
        "event_type": "plant_planted",
        "title": f"Added to Garden",
        "description": f"{plant_name} ({species}) was registered and started in the container garden.",
        "timestamp": created_dt,
        "severity": "info",
        "plant_id": plant_id,
        "plant_name": plant_name,
        "details": {
            "variety": plant.get("variety"),
            "category": plant.get("plant_type"),
            "location": plant.get("location"),
        },
        "icon_type": "seedling",
    })

    # B. Leaf Photo Scans
    try:
        imgs = supabase.table("plant_images").select("*").eq("plant_id", plant_id).order("id", desc=False).execute()
        for img in (imgs.data or []):
            img_dt = _parse_iso(img.get("uploaded_at") or img.get("captured_at") or img.get("created_at"))
            events.append({
                "id": f"event_img_{img.get('id')}",
                "event_type": "image_captured",
                "title": "Leaf Photo Captured",
                "description": "High-resolution leaf specimen uploaded for optical analysis.",
                "timestamp": img_dt,
                "severity": "info",
                "plant_id": plant_id,
                "plant_name": plant_name,
                "details": {
                    "image_id": img.get("id"),
                    "image_url": img.get("image_url") or img.get("public_url_or_signed_url"),
                },
                "icon_type": "camera",
            })
    except Exception as e:
        logger.warning(f"Error compiling images for timeline: {e}")

    # C. Diagnoses Records
    diagnoses_count = 0
    latest_diag = None
    try:
        diags = supabase.table("diagnoses").select("*").eq("plant_id", plant_id).order("id", desc=False).execute()
        for d in (diags.data or []):
            diagnoses_count += 1
            latest_diag = d
            d_dt = _parse_iso(d.get("diagnosed_at") or d.get("created_at"))
            d_name = d.get("disease_name") or "Health Check Complete"
            is_healthy = d.get("is_healthy", True)
            severity = (d.get("severity") or "none").lower()
            conf = float(d.get("confidence_score") or d.get("confidence") or 0.0)

            event_sev = "success" if is_healthy else ("urgent" if severity in ("high", "urgent") else "warning")

            events.append({
                "id": f"event_diag_{d.get('id')}",
                "event_type": "diagnosis_completed",
                "title": f"Health Analysis: {d_name}",
                "description": (
                    f"Specimen evaluated as healthy ({int(conf*100)}% confidence)."
                    if is_healthy
                    else f"Detected {d_name} ({severity} severity, {int(conf*100)}% confidence)."
                ),
                "timestamp": d_dt,
                "severity": event_sev,
                "plant_id": plant_id,
                "plant_name": plant_name,
                "details": {
                    "diagnosis_id": d.get("id"),
                    "disease_name": d_name,
                    "is_healthy": is_healthy,
                    "confidence": conf,
                    "severity": severity,
                    "symptoms": d.get("symptoms"),
                    "model_name": d.get("model_name") or "NVIDIA Nemotron",
                },
                "icon_type": "activity",
            })
    except Exception as e:
        logger.warning(f"Error compiling diagnoses for timeline: {e}")

    # D. Care Recommendations
    try:
        recs = supabase.table("care_recommendations").select("*").eq("plant_id", plant_id).order("id", desc=False).execute()
        for r in (recs.data or []):
            r_dt = _parse_iso(r.get("created_at"))
            priority = (r.get("priority") or "medium").lower()
            structured = r.get("structured_guidance") or {}
            summary = (
                structured.get("summary")
                or (r.get("recommendation", "")[:120] + "...")
                or "Clinical botanical care synthesized."
            )

            r_sev = "urgent" if priority in ("urgent", "high") else "info"

            events.append({
                "id": f"event_care_{r.get('id')}",
                "event_type": "care_synthesized",
                "title": "NVIDIA Personalized Care Plan",
                "description": summary,
                "timestamp": r_dt,
                "severity": r_sev,
                "plant_id": plant_id,
                "plant_name": plant_name,
                "details": {
                    "care_recommendation_id": r.get("id"),
                    "priority": priority,
                    "model_name": r.get("model_name") or "NVIDIA Nemotron",
                    "immediate_steps": structured.get("immediate_next_steps", []),
                },
                "icon_type": "heart",
            })
    except Exception as e:
        logger.warning(f"Error compiling care recommendations for timeline: {e}")

    # E. Watering Logs
    waterings_count = 0
    try:
        w_logs = supabase.table("watering_logs").select("*").eq("plant_id", plant_id).order("id", desc=False).execute()
        for w in (w_logs.data or []):
            waterings_count += 1
            w_dt = _parse_iso(w.get("watered_at") or w.get("created_at"))
            amount = w.get("amount_ml") or 250
            events.append({
                "id": f"event_water_{w.get('id')}",
                "event_type": "watering_completed",
                "title": f"Irrigation Administered ({amount} ml)",
                "description": f"Administered calibrated moisture target ({amount} ml). Root zone hydrated.",
                "timestamp": w_dt,
                "severity": "info",
                "plant_id": plant_id,
                "plant_name": plant_name,
                "details": {
                    "watering_id": w.get("id"),
                    "amount_ml": amount,
                    "notes": w.get("notes"),
                },
                "icon_type": "droplet",
            })
    except Exception as e:
        logger.warning(f"Error compiling watering logs for timeline: {e}")

    # F. Active Warnings
    active_warnings = await evaluate_plant_early_warnings(plant_id, supabase)
    for warn in active_warnings:
        events.append({
            "id": f"event_{warn['id']}",
            "event_type": "warning_flagged",
            "title": warn["title"],
            "description": warn["summary"],
            "timestamp": warn["created_at"],
            "severity": warn["severity"],
            "plant_id": plant_id,
            "plant_name": plant_name,
            "details": {
                "warning_type": warn["warning_type"],
                "recommended_action": warn["recommended_action"],
                "metrics": warn.get("metrics", {}),
            },
            "icon_type": "alert-triangle",
        })

    # Sort all events chronologically (newest first for timeline feed)
    events.sort(key=lambda ev: ev["timestamp"], reverse=True)

    # Compute Trajectory Analytics
    raw_score = float(plant.get("health_score") or 100.0)
    health_status = (plant.get("health_status") or "healthy").lower()

    if active_warnings:
        urgent_warns = [w for w in active_warnings if w["severity"] == "urgent"]
        if urgent_warns:
            raw_score = min(raw_score, 45.0)
            health_status = "critical"
            trajectory_trend = "declining"
        else:
            raw_score = min(raw_score, 70.0)
            health_status = "needs_attention"
            trajectory_trend = "declining"
    elif latest_diag and not latest_diag.get("is_healthy", True):
        raw_score = min(raw_score, 65.0)
        health_status = "needs_attention"
        trajectory_trend = "recovering" if waterings_count > 0 else "declining"
    else:
        trajectory_trend = "stable" if raw_score >= 85 else "improving"

    summary = (
        f"{plant_name} has {len(events)} recorded timeline milestones with {waterings_count} watering sessions "
        f"and {diagnoses_count} health evaluations. Current health trajectory is {trajectory_trend} ({int(raw_score)}/100)."
    )

    trajectory = {
        "plant_id": plant_id,
        "plant_name": plant_name,
        "health_score": round(raw_score, 1),
        "health_status": health_status,
        "total_events": len(events),
        "scans_count": len([e for e in events if e["event_type"] == "image_captured"]),
        "waterings_count": waterings_count,
        "diagnoses_count": diagnoses_count,
        "active_warnings_count": len(active_warnings),
        "latest_event_timestamp": events[0]["timestamp"] if events else None,
        "trajectory_trend": trajectory_trend,
        "summary": summary,
    }

    return {
        "plant_id": plant_id,
        "plant_name": plant_name,
        "trajectory": trajectory,
        "events": events,
    }
