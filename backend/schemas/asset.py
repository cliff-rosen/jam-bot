"""
Backend Asset Schema - Re-exports unified schema with backend-specific extensions
Following the same pattern as frontend/src/types/asset.ts
"""

from pydantic import BaseModel, Field, validator
from typing import List, Dict, Any, Optional, Union, Literal
from datetime import datetime
from enum import Enum

# Primary exports from unified schema
from .unified_schema import Asset, SchemaType, AssetMetadata, AssetRole

# Re-export the unified types as primary interfaces
__all__ = ['Asset', 'SchemaType', 'AssetMetadata', 'AssetRole', 'DatabaseEntityMetadata', 'CreateAssetRequest', 
           'AssetType', 'CollectionType', 'FileType', 'AssetSubtype', 'DAILY_NEWSLETTER_RECAP_ASSET']

# Backend-specific enums (these are used by database models and API)
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
    """Type of asset - kept for backend API compatibility"""
    FILE = "file"
    PRIMITIVE = "primitive"
    OBJECT = "object"
    DATABASE_ENTITY = "database_entity"
    MARKDOWN = "markdown"
    CONFIG = "config"

class CollectionType(str, Enum):
    """Type of collection if asset is a collection - kept for backend API compatibility"""
    ARRAY = "array"
    MAP = "map"
    SET = "set"
    NONE = "null"

class AssetSubtype(str, Enum):
    """Specific format or schema of the asset - kept for backend API compatibility"""
    EMAIL = "email"
    NEWSLETTER = "newsletter"
    SEARCH_RESULT = "search_result"
    WEB_PAGE = "web_page"
    PUBMED_ARTICLE = "pubmed_article"
    DAILY_NEWSLETTER_RECAP = "daily_newsletter_recap"

# Backend-specific classes not in unified schema
class DatabaseEntityMetadata(BaseModel):
    """Metadata for assets that represent database entities"""
    table_name: Optional[str] = None
    query_type: Literal["list", "single"] = "list"
    query_params: Dict[str, Any] = Field(default_factory=dict)
    columns: Optional[List[str]] = None
    is_direct_content: bool = False

class CreateAssetRequest(BaseModel):
    """API request model for creating assets"""
    name: str
    description: Optional[str] = None
    type: str
    subtype: Optional[str] = None
    is_collection: bool = False
    collection_type: Optional[CollectionType] = None
    role: Optional[AssetRole] = None  # Role of asset in workflow
    content: Optional[Any] = None
    asset_metadata: Optional[Dict[str, Any]] = None

# Pre-defined asset instances using unified Asset
DAILY_NEWSLETTER_RECAP_ASSET = Asset(
    id="daily_newsletter_recap",
    name="Daily Newsletter Recap",
    description="A collection of daily newsletter summaries",
    schema=SchemaType(
        type="database_entity",
        description="A collection of daily newsletter summaries",
        is_array=True
    ),
    value=None,
    subtype="daily_newsletter_recap",
    is_collection=True,
    collection_type="array",
    asset_metadata=AssetMetadata(
        creator="system",
        tags=["newsletter", "summary", "daily"],
        version=1,
        token_count=0
    )
)
    