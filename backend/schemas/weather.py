from typing import Optional
from pydantic import BaseModel


class WeatherRecordCreate(BaseModel):
    user_id: Optional[str] = None
    plant_id: Optional[int] = None
    location: Optional[str] = None
    temperature: Optional[float] = None
    humidity: Optional[float] = None
    rainfall_mm: Optional[float] = None
    wind_speed: Optional[float] = None
    weather_condition: Optional[str] = None
    recorded_at: Optional[str] = None


class WeatherRecordResponse(BaseModel):
    id: int
    user_id: Optional[str] = None
    plant_id: Optional[int] = None
    location: Optional[str] = None
    temperature: Optional[float] = None
    humidity: Optional[float] = None
    rainfall_mm: Optional[float] = None
    wind_speed: Optional[float] = None
    weather_condition: Optional[str] = None
    recorded_at: Optional[str] = None

    class Config:
        from_attributes = True


class ActivityLogCreate(BaseModel):
    user_id: Optional[str] = None
    plant_id: Optional[int] = None
    activity_type: str
    description: Optional[str] = None


class ActivityLogResponse(BaseModel):
    id: int
    user_id: Optional[str] = None
    plant_id: Optional[int] = None
    activity_type: str
    description: Optional[str] = None
    created_at: Optional[str] = None

    class Config:
        from_attributes = True
