"""
GrowWise AI — Phase 5 Test Suite: Health Timeline, Early Warnings & Notifications
--------------------------------------------------------------------------------
Validates:
1. Deterministic Early Warning Rules Engine
2. Plant Health Timeline Aggregation & Trajectory Analytics
3. In-App Notification Lifecycle (Creation, Deduplication, Read State)
4. Phase 5 FastAPI REST Endpoints & Status Codes
"""

import pytest
from datetime import datetime, timezone, timedelta
from unittest.mock import MagicMock, AsyncMock
from fastapi.testclient import TestClient

from backend.main import app
from backend.services.early_warning_service import (
    evaluate_plant_early_warnings,
    evaluate_all_early_warnings,
)
from backend.services.timeline_service import get_plant_timeline
from backend.services.notification_service import (
    create_notification,
    get_user_notifications,
    mark_notification_read,
    mark_all_notifications_read,
    get_unread_count,
    _IN_MEMORY_NOTIFICATIONS,
)


@pytest.fixture
def mock_supabase():
    """Mocked Supabase client providing controlled agronomic telemetry."""
    client = MagicMock()

    # Mock plants table
    plants_data = [{
        "id": 1,
        "name": "Cherry Tomato",
        "plant_name": "Cherry Tomato",
        "species": "Solanum lycopersicum",
        "plant_type": "Vegetable",
        "health_score": 90,
        "health_status": "healthy",
        "planted_date": "2026-09-01",
        "created_at": "2026-09-01T10:00:00Z",
        "user_id": "27865d2c-302e-4a2d-83aa-c1c9ea7338a4",
    }]

    # Mock diagnoses
    diagnoses_data = [{
        "id": 101,
        "plant_id": 1,
        "disease_name": "Early Blight",
        "is_healthy": False,
        "severity": "high",
        "confidence_score": 0.88,
        "diagnosed_at": "2026-10-09T14:30:00Z",
        "model_name": "NVIDIA Nemotron",
    }]

    # Mock watering logs (last watered 5 days ago to trigger dehydration warning)
    five_days_ago = (datetime.now(timezone.utc) - timedelta(days=5)).isoformat()
    watering_logs = [{
        "id": 201,
        "plant_id": 1,
        "amount_ml": 400,
        "watered_at": five_days_ago,
    }]

    # Mock weather records (high temp & humidity to test rules)
    weather_records = [{
        "id": 301,
        "temperature": 33.5,
        "humidity": 80.0,
        "rainfall": 0.0,
        "condition": "Sunny",
    }]

    def mock_table(table_name):
        table_mock = MagicMock()
        select_mock = MagicMock()
        table_mock.select.return_value = select_mock
        select_mock.eq.return_value = select_mock
        select_mock.order.return_value = select_mock
        select_mock.limit.return_value = select_mock

        if table_name == "plants":
            select_mock.execute.return_value = MagicMock(data=plants_data)
        elif table_name == "diagnoses":
            select_mock.execute.return_value = MagicMock(data=diagnoses_data)
        elif table_name == "watering_logs":
            select_mock.execute.return_value = MagicMock(data=watering_logs)
        elif table_name == "weather_records":
            select_mock.execute.return_value = MagicMock(data=weather_records)
        elif table_name == "plant_images":
            select_mock.execute.return_value = MagicMock(data=[])
        elif table_name == "care_recommendations":
            select_mock.execute.return_value = MagicMock(data=[])
        elif table_name == "notifications":
            select_mock.execute.return_value = MagicMock(data=[])
            table_mock.insert.return_value.execute.return_value = MagicMock(data=[{"id": 999, "is_read": False}])
            table_mock.update.return_value.eq.return_value.execute.return_value = MagicMock(data=[{"id": 999, "is_read": True}])
        elif table_name == "activity_logs":
            table_mock.insert.return_value.execute.return_value = MagicMock(data=[{"id": 501}])
        else:
            select_mock.execute.return_value = MagicMock(data=[])

        return table_mock

    client.table.side_effect = mock_table
    return client


@pytest.mark.asyncio
async def test_early_warning_rules_engine(mock_supabase):
    """Verify that deterministic agricultural rules trigger for disease, dehydration, and heatwave."""
    warnings = await evaluate_plant_early_warnings(1, mock_supabase)
    assert len(warnings) >= 3

    warning_types = [w["warning_type"] for w in warnings]
    assert "disease_outbreak" in warning_types
    assert "dehydration" in warning_types
    assert "heatwave" in warning_types

    disease_warn = next(w for w in warnings if w["warning_type"] == "disease_outbreak")
    assert disease_warn["severity"] in ("high", "urgent")
    assert "Early Blight" in disease_warn["title"]
    assert len(disease_warn["recommended_action"]) > 10


@pytest.mark.asyncio
async def test_plant_health_timeline_compilation(mock_supabase):
    """Verify chronological timeline aggregation, event normalization, and trajectory analytics."""
    timeline = await get_plant_timeline(1, mock_supabase)
    assert timeline["plant_id"] == 1
    assert "trajectory" in timeline
    assert "events" in timeline

    traj = timeline["trajectory"]
    assert traj["health_score"] <= 70.0  # Dropped due to active warnings
    assert traj["trajectory_trend"] in ("declining", "recovering", "stable")

    events = timeline["events"]
    assert len(events) >= 3

    # Ensure chronological order (newest first)
    timestamps = [e["timestamp"] for e in events]
    for i in range(len(timestamps) - 1):
        assert timestamps[i] >= timestamps[i + 1]


@pytest.mark.asyncio
async def test_notification_lifecycle(mock_supabase):
    """Verify notification creation, deduplication, badge counting, and read state marking."""
    _IN_MEMORY_NOTIFICATIONS.clear()
    uid = "27865d2c-302e-4a2d-83aa-c1c9ea7338a4"

    # 1. Create notification
    notif = await create_notification(
        supabase=mock_supabase,
        user_id=uid,
        plant_id=1,
        type="watering_due",
        severity="urgent",
        title="Irrigation Overdue",
        message="Please water Tomato",
    )
    assert notif["id"] is not None
    assert notif["is_read"] is False

    # 2. Duplicate within 24h should return existing
    duplicate = await create_notification(
        supabase=mock_supabase,
        user_id=uid,
        plant_id=1,
        type="watering_due",
        severity="urgent",
        title="Irrigation Overdue",
        message="Please water Tomato",
    )
    assert duplicate["id"] == notif["id"]

    # 3. Check badge count
    badge = await get_unread_count(uid, mock_supabase)
    assert badge["unread_count"] >= 1

    # 4. Mark read
    await mark_notification_read(notif["id"], mock_supabase)
    assert notif["is_read"] is True


def test_phase5_api_endpoints():
    """Verify Phase 5 FastAPI REST endpoints via TestClient."""
    _IN_MEMORY_NOTIFICATIONS.clear()
    client = TestClient(app)

    # 1. Early warnings endpoint
    res_warnings = client.get("/api/warnings")
    assert res_warnings.status_code == 200
    assert isinstance(res_warnings.json(), list)

    # 2. Notifications endpoint
    res_notif = client.get("/api/notifications")
    assert res_notif.status_code == 200
    assert isinstance(res_notif.json(), list)

    # 3. Notification badge endpoint
    res_badge = client.get("/api/notifications/badge")
    assert res_badge.status_code == 200
    assert "unread_count" in res_badge.json()

    # 4. Plant health timeline endpoint
    plants_res = client.get("/api/plants")
    if plants_res.status_code == 200 and len(plants_res.json()) > 0:
        plant_id = plants_res.json()[0]["id"]
    else:
        created = client.post("/api/plants", json={
            "name": "Test Timeline Tomato",
            "species": "Solanum lycopersicum",
            "growth_stage": "vegetative",
            "sunlight_exposure": "full_sun",
            "soil_type": "loamy",
            "pot_size_gallons": 5.0,
            "location": "Balcony"
        }).json()
        plant_id = created["id"]

    res_timeline = client.get(f"/api/timeline/{plant_id}")
    assert res_timeline.status_code == 200
    data = res_timeline.json()
    assert "trajectory" in data
    assert "events" in data
