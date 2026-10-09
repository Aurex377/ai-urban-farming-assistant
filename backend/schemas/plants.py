from typing import Optional
from pydantic import BaseModel, model_validator


class PlantCreate(BaseModel):
    user_id: Optional[str] = None
    name: Optional[str] = None
    plant_name: Optional[str] = None
    species: Optional[str] = None
    plant_type: Optional[str] = None
    variety: Optional[str] = None
    planted_date: Optional[str] = None
    location: Optional[str] = None
    notes: Optional[str] = None
    garden_zone_id: Optional[int] = None

    @model_validator(mode="after")
    def validate_name(self):
        effective_name = (self.name or self.plant_name or "").strip()
        if not effective_name:
            raise ValueError("Plant name is required.")
        self.name = effective_name
        self.plant_name = effective_name
        return self


class PlantUpdate(BaseModel):
    name: Optional[str] = None
    plant_name: Optional[str] = None
    species: Optional[str] = None
    plant_type: Optional[str] = None
    variety: Optional[str] = None
    planted_date: Optional[str] = None
    location: Optional[str] = None
    health_status: Optional[str] = None
    health_score: Optional[float] = None
    last_watered_at: Optional[str] = None
    next_watering_at: Optional[str] = None
    notes: Optional[str] = None
    garden_zone_id: Optional[int] = None

    @model_validator(mode="after")
    def sync_name(self):
        if self.name and not self.plant_name:
            self.plant_name = self.name
        elif self.plant_name and not self.name:
            self.name = self.plant_name
        return self


class PlantResponse(BaseModel):
    id: int
    user_id: str
    name: str
    plant_name: str
    species: Optional[str] = None
    plant_type: Optional[str] = None
    variety: Optional[str] = None
    planted_date: Optional[str] = None
    location: Optional[str] = None
    health_status: str = "healthy"
    health_score: float = 100.0
    last_watered_at: Optional[str] = None
    next_watering_at: Optional[str] = None
    notes: Optional[str] = None
    garden_zone_id: Optional[int] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

    class Config:
        from_attributes = True


class PlantImageResponse(BaseModel):
    id: int
    plant_id: int
    user_id: Optional[str] = None
    storage_path: str
    image_url: str
    public_url_or_signed_url: Optional[str] = None
    signed_url: Optional[str] = None
    image_type: Optional[str] = "leaf"
    captured_at: Optional[str] = None
    upload_status: str = "uploaded"
    created_at: Optional[str] = None
    uploaded_at: Optional[str] = None

    class Config:
        from_attributes = True


class PlantImageUploadResponse(BaseModel):
    id: int
    image_id: int
    plant_id: int
    storage_path: str
    image_url: str
    image_type: Optional[str] = "leaf"
    upload_status: str = "uploaded"
    signed_url: Optional[str] = None
    public_url_or_signed_url: Optional[str] = None
    uploaded_at: Optional[str] = None
    success: bool = True
    message: str = "Image uploaded successfully"

    class Config:
        from_attributes = True


class ImageUploadSuccessResponse(BaseModel):
    success: bool = True
    image_id: int
    image_url: str
    message: Optional[str] = "Image uploaded successfully"


class PlantDeleteResponse(BaseModel):
    success: bool = True
    message: str
