from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime

class UserBase(BaseModel):
    email: EmailStr = Field(description="User's email address")

class UserCreate(UserBase):
    password: str = Field(
        min_length=5,
        description="User's password",
        example="securepassword123"
    )

class UserResponse(UserBase):
    user_id: int = Field(description="Unique identifier for the user")
    registration_date: datetime = Field(description="When the user registered")

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str = Field(description="JWT access token")
    token_type: str = Field(default="bearer", description="Type of token")
    username: str = Field(description="User's username")

class TokenData(BaseModel):
    email: Optional[str] = Field(None, description="User's email from token")
    user_id: Optional[int] = Field(None, description="User's ID from token")
    username: Optional[str] = Field(None, description="User's username") 