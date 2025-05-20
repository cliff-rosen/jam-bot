from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional, Union, Literal
from datetime import datetime
from enum import Enum

class FileType(str, Enum):
    """File type representing the file format"""
    # Common file types
    PDF = "pdf"
    DOC = "doc"
    DOCX = "docx"
    TXT = "txt"
    CSV = "csv"
    JSON = "json"
    # Image types
    PNG = "png"
    JPG = "jpg"
    JPEG = "jpeg"
    GIF = "gif"
    # Audio/Video types
    MP3 = "mp3"
    MP4 = "mp4"
    WAV = "wav"
    # Other
    UNKNOWN = "unknown"

    @classmethod
    def _missing_(cls, value):
        if value is None:
            return None
        # Try exact match first
        try:
            return cls(value)
        except ValueError:
            # Try case-insensitive match
            try:
                return cls(value.lower())
            except ValueError:
                return None

class DataType(str, Enum):
    """Data type for structured content"""
    UNSTRUCTURED = "unstructured"
    EMAIL_LIST = "email_list"
    GENERIC_LIST = "generic_list"
    GENERIC_TABLE = "generic_table"
    EMAIL_MESSAGE = "email_message"
    EMAIL_SUMMARIES_LIST = "email_summaries_list"

    @classmethod
    def _missing_(cls, value):
        if value is None:
            return None
        # Try exact match first
        try:
            return cls(value)
        except ValueError:
            # Try case-insensitive match
            try:
                return cls(value.lower())
            except ValueError:
                return None

class AssetType(str, Enum):
    """Type of asset"""
    FILE = "file"
    PRIMITIVE = "primitive"
    OBJECT = "object"

class CollectionType(str, Enum):
    """Type of collection if asset is a collection"""
    ARRAY = "array"
    MAP = "map"
    SET = "set"
    NONE = "null"

class Asset(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    type: AssetType
    subtype: Optional[str] = None  # specific_format_or_schema
    is_collection: bool = False
    collection_type: Optional[CollectionType] = None
    content: Optional[Any] = None
    asset_metadata: Dict[str, Any] = Field(default_factory=dict)

    class Config:
        from_attributes = True

class CreateAssetRequest(BaseModel):
    name: str
    description: Optional[str] = None
    type: str
    subtype: Optional[str] = None
    is_collection: bool = False
    collection_type: Optional[CollectionType] = None
    content: Optional[Any] = None
    asset_metadata: Optional[Dict[str, Any]] = None
    