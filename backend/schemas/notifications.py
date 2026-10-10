"""
Notification Schemas Module — Phase 5
-------------------------------------
Pydantic contracts for in-app notifications and early warnings.
"""

from typing import Optional, Dict, Any, List
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict


class NotificationBase(BaseModel):
    user_id: Optional[str] = None
    plant_id: Optional[int] = None
    type: str = Field(..., description="watering_due, disease_warning, extreme_weather, care_action, system")
    severity: str = Field(default="info", description="info, warning, urgent, success")
    title: str
    message: str
    action_url: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict)


class NotificationCreate(NotificationBase):
    pass


class NotificationResponse(NotificationBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    is_read: bool = False
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class NotificationBadgeCount(BaseModel):
    user_id: str
    unread_count: int
    has_urgent: bool = False


class EarlyWarning(BaseModel):
    id: str
    plant_id: int
    plant_name: str
    species: Optional[str] = None
    warning_type: str = Field(..., description="disease_outbreak, dehydration, heatwave, fungal_humidity, cold_shock")
    severity: str = Field(..., description="urgent, high, medium, advisory")
    title: str
    summary: str
    recommended_action: str
    metrics: Dict[str, Any] = Field(default_factory=dict)
    created_at: datetime
