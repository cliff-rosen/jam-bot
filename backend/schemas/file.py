from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
import base64

class FileBase(BaseModel):
    name: str = Field(description="Name of the file")
    description: Optional[str] = Field(None, description="Description of the file")
    mime_type: str = Field(description="MIME type of the file")

class FileCreate(FileBase):
    content: bytes = Field(description="File contents as binary")

class FileUpdate(BaseModel):
    name: Optional[str] = Field(None, description="New name for the file")
    description: Optional[str] = Field(None, description="New description for the file")
    content: Optional[bytes] = Field(None, description="New file contents")

class FileResponse(BaseModel):
    file_id: str = Field(description="Unique identifier for the file")
    user_id: int = Field(description="ID of the user who owns this file")
    name: str = Field(description="Name of the file")
    description: Optional[str] = Field(None, description="Description of the file")
    mime_type: str = Field(description="MIME type of the file")
    size: int = Field(description="Size of the file in bytes")
    created_at: datetime = Field(description="When the file was created")
    updated_at: datetime = Field(description="When the file was last updated")
    extracted_text: Optional[str] = Field(None, description="Extracted text from the file")

class FileContentResponse(BaseModel):
    content: str = Field(description="File contents (text or base64 encoded)")
    encoding: Optional[str] = Field(None, description="Encoding used for binary content (e.g., 'base64')")

    class Config:
        json_encoders = {
            bytes: lambda v: base64.b64encode(v).decode('utf-8')
        }

class FileImageResponse(BaseModel):
    image_id: str = Field(description="Unique identifier for the image")
    file_id: str = Field(description="ID of the file this image belongs to")
    mime_type: str = Field(description="MIME type of the image")
    image_data: str = Field(description="Base64 encoded image data") 