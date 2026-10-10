"""
Plant Health Timeline Schemas Module — Phase 5
----------------------------------------------
Pydantic contracts for chronological health events and trajectory analytics.
"""

from typing import Optional, Dict, Any, List
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict


class TimelineEvent(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    event_type: str = Field(
        ...,
        description="plant_planted, image_captured, diagnosis_completed, care_synthesized, watering_completed, warning_flagged"
    )
    title: str
    description: str
    timestamp: datetime
    severity: str = Field(default="info", description="info, success, warning, urgent")
    plant_id: int
    plant_name: str
    details: Dict[str, Any] = Field(default_factory=dict)
    icon_type: Optional[str] = None


class PlantHealthTrajectory(BaseModel):
    plant_id: int
    plant_name: str
    health_score: float = Field(default=100.0, ge=0.0, le=100.0)
    health_status: str = Field(default="healthy")
    total_events: int = 0
    scans_count: int = 0
    waterings_count: int = 0
    diagnoses_count: int = 0
    active_warnings_count: int = 0
    latest_event_timestamp: Optional[datetime] = None
    trajectory_trend: str = Field(default="stable", description="improving, stable, declining, recovering")
    summary: str


class PlantTimelineResponse(BaseModel):
    plant_id: int
    plant_name: str
    trajectory: PlantHealthTrajectory
    events: List[TimelineEvent] = Field(default_factory=list)
