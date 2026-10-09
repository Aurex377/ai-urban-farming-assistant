from typing import Optional
from pydantic import BaseModel

try:
    import email_validator
    from pydantic import EmailStr
except ImportError:
    # Safe fallback if email-validator package is not installed
    EmailStr = str  # type: ignore


class UserCreate(BaseModel):
    name: str
    email: EmailStr
    location: Optional[str] = None


class UserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    location: Optional[str] = None


class UserResponse(BaseModel):
    id: str
    name: str
    email: str
    location: Optional[str] = None
    created_at: Optional[str] = None

    class Config:
        from_attributes = True
