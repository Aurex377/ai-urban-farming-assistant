from typing import Optional
from pydantic import BaseModel


class WateringLogCreate(BaseModel):
    amount_ml: float
    notes: Optional[str] = None
    watered_at: Optional[str] = None


class WateringLogResponse(BaseModel):
    id: int
    plant_id: int
    watered_at: Optional[str] = None
    amount_ml: float
    notes: Optional[str] = None

    class Config:
        from_attributes = True


class WateringRecommendationCreate(BaseModel):
    recommended_date: Optional[str] = None
    recommended_amount_ml: float
    reason: Optional[str] = None
    weather_based: Optional[bool] = False


class WateringRecommendationResponse(BaseModel):
    id: int
    plant_id: int
    recommended_date: Optional[str] = None
    recommended_amount_ml: float
    reason: Optional[str] = None
    weather_based: Optional[bool] = False
    created_at: Optional[str] = None

    class Config:
        from_attributes = True
