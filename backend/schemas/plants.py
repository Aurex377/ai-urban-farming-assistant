from typing import Optional
from pydantic import BaseModel


class PlantCreate(BaseModel):
    user_id: Optional[str] = None
    plant_name: str
    species: Optional[str] = None
    plant_type: Optional[str] = None
    planted_date: Optional[str] = None


class PlantUpdate(BaseModel):
    plant_name: Optional[str] = None
    species: Optional[str] = None
    plant_type: Optional[str] = None
    planted_date: Optional[str] = None


class PlantResponse(BaseModel):
    id: int
    user_id: str
    plant_name: str
    species: Optional[str] = None
    plant_type: Optional[str] = None
    planted_date: Optional[str] = None
    created_at: Optional[str] = None

    class Config:
        from_attributes = True


class PlantImageResponse(BaseModel):
    id: int
    plant_id: int
    image_url: str
    image_type: Optional[str] = None
    uploaded_at: Optional[str] = None
    signed_url: Optional[str] = None

    class Config:
        from_attributes = True


class PlantImageUploadResponse(BaseModel):
    id: int
    plant_id: int
    image_url: str
    image_type: Optional[str] = None
    uploaded_at: Optional[str] = None
    signed_url: Optional[str] = None
    image_id: Optional[int] = None
    success: Optional[bool] = True
    message: Optional[str] = "Image uploaded successfully"

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

