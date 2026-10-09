from typing import Optional
from pydantic import BaseModel


class DiagnosisRequest(BaseModel):
    image_id: int


class DiagnosisResponse(BaseModel):
    id: int
    plant_id: int
    image_id: Optional[int] = None
    disease_name: str
    confidence: Optional[float] = None
    diagnosis_details: Optional[str] = None
    diagnosed_at: Optional[str] = None

    class Config:
        from_attributes = True


class CareRecommendationCreate(BaseModel):
    diagnosis_id: Optional[int] = None
    recommendation: str
    priority: Optional[str] = "medium"


class CareRecommendationResponse(BaseModel):
    id: int
    plant_id: int
    diagnosis_id: Optional[int] = None
    recommendation: str
    priority: Optional[str] = "medium"
    created_at: Optional[str] = None

    class Config:
        from_attributes = True
