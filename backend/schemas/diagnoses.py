from typing import Optional, Dict, Any
from pydantic import BaseModel


class DiagnosisRequest(BaseModel):
    image_id: int
    notes: Optional[str] = None


class DiagnosisCreate(BaseModel):
    image_id: int
    notes: Optional[str] = None


class DiagnosisResponse(BaseModel):
    id: int
    plant_id: int
    user_id: Optional[str] = None
    image_id: Optional[int] = None
    status: str = "pending"
    disease_name: str = "Pending AI Analysis"
    symptoms: Optional[str] = None
    confidence: Optional[float] = 0.0
    confidence_score: Optional[float] = 0.0
    severity: Optional[str] = None
    model_name: Optional[str] = "Local LLaVA Plant Disease 7B"
    raw_result: Optional[Dict[str, Any]] = None
    diagnosis_details: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    diagnosed_at: Optional[str] = None
    message: Optional[str] = None

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
