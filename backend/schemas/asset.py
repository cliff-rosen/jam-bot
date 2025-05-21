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

class AssetType(str, Enum):
    """Type of asset"""
    FILE = "file"
    PRIMITIVE = "primitive"
    OBJECT = "object"
    DATABASE_ENTITY = "database_entity"  # For assets that represent database entities

class CollectionType(str, Enum):
    """Type of collection if asset is a collection"""
    ARRAY = "array"
    MAP = "map"
    SET = "set"
    NONE = "null"

class DatabaseEntityMetadata(BaseModel):
    """Metadata for assets that represent database entities"""
    table_name: str
    query_type: Literal["list", "single"] = "list"
    query_params: Dict[str, Any] = Field(default_factory=dict)  # For WHERE clauses, LIMIT, etc.
    columns: Optional[List[str]] = None  # Specific columns to retrieve, None means all
    is_direct_content: bool = False  # Whether content is stored directly in asset or needs to be fetched

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
    db_entity_metadata: Optional[DatabaseEntityMetadata] = None  # For database entity assets

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
    