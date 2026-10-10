from typing import Optional, Dict, Any, List
from pydantic import BaseModel, ConfigDict


class DiagnosisRequest(BaseModel):
    image_id: int
    notes: Optional[str] = None


class DiagnosisCreate(BaseModel):
    image_id: int
    notes: Optional[str] = None


class DiagnosisResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

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
    model_name: Optional[str] = "NVIDIA Nemotron"
    raw_result: Optional[Dict[str, Any]] = None
    diagnosis_details: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    diagnosed_at: Optional[str] = None
    message: Optional[str] = None


class LLaVAModelStatusResponse(BaseModel):
    available: bool
    status: str  # 'online' | 'offline'
    model_name: str
    model_loaded: Optional[bool] = False
    engine: Optional[str] = "NVIDIA Nemotron"
    message: str


class NVIDIAStatusResponse(BaseModel):
    available: bool
    status: str
    model_name: str
    engine: str
    cloud_api_configured: bool
    message: str


class CareRecommendationCreate(BaseModel):
    diagnosis_id: Optional[int] = None
    recommendation: str
    priority: Optional[str] = "medium"


class CareRecommendationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    plant_id: int
    diagnosis_id: Optional[int] = None
    recommendation: str
    priority: Optional[str] = "medium"
    created_at: Optional[str] = None


class PersonalizedCareGuidanceResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    plant_id: int
    plant_name: str
    species: Optional[str] = None
    active_diagnosis: str
    is_healthy: bool
    severity: str
    priority: str
    summary: Optional[str] = None
    personalized_explanation: str
    immediate_next_steps: List[str]
    personalized_treatment_explanation: str
    watering_explanation: str
    prevention_guidance: str
    monitoring_instructions: str
    next_scan_recommendation: str
    plant_coach_educational_guidance: str
    expert_help_conditions: str
    deterministic_watering: Optional[Dict[str, Any]] = None
    model_name: str = "NVIDIA Nemotron"
    engine: Optional[str] = None
    generated_at: Optional[str] = None
    care_recommendation_id: Optional[int] = None


class PlantCoachChatRequest(BaseModel):
    message: str
    history: Optional[List[Dict[str, str]]] = None


class PlantCoachChatResponse(BaseModel):
    reply: str
    knowledge_takeaway: str
    actionable_step: str
    suggested_follow_ups: List[str]
    engine_used: str
    timestamp: str


class KnowledgeTransferModule(BaseModel):
    id: str
    title: str
    category: str
    icon: str
    summary: str
    key_principles: List[str]
    practical_action: str
    botanical_science_note: str


class PlantKnowledgeTransferResponse(BaseModel):
    plant_id: int
    plant_name: str
    species: str
    active_diagnosis: str
    is_healthy: bool
    severity: str
    modules: List[KnowledgeTransferModule]
    generated_at: str

