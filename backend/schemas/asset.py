"""
Asset Schema Definitions

This module contains all Pydantic models and related utilities for defining
and managing Assets within the system. Assets are the data containers that
flow between hops in a mission.
"""

from __future__ import annotations
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional, Union, Literal
from datetime import datetime
from enum import Enum

from .base import SchemaEntity, AssetRole, ValueType, is_custom_type, SchemaType

# --- Asset-Specific Enums and Models ---

class AssetStatus(str, Enum):
    """Defines the lifecycle status of an Asset during execution."""
    PROPOSED = "proposed"  # Asset exists only on frontend, not yet accepted
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    READY = "ready"
    ERROR = "error"
    EXPIRED = "expired"

class AssetMetadata(BaseModel):
    """Contains metadata about an asset, such as creation and update times."""
    created_at: datetime = Field(default_factory=datetime.utcnow, alias='createdAt')
    updated_at: datetime = Field(default_factory=datetime.utcnow, alias='updatedAt')
    creator: Optional[str] = None
    custom_metadata: Dict[str, Any] = Field(default_factory=dict)

class Asset(SchemaEntity):
    """
    Represents a data asset in the system. It extends the base SchemaEntity
    with a value, execution status, and detailed metadata.
    """
    value: Optional[Any] = None
    status: AssetStatus = Field(default=AssetStatus.PENDING)
    subtype: Optional[str] = None
    role: Optional[AssetRole] = None
    agent_specification: Optional[str] = Field(default=None, description="Detailed technical specification for agents including data structure, format requirements, validation criteria, and tool integration details")
    error_message: Optional[str] = None
    last_updated_by: Optional[str] = None
    ready_at: Optional[datetime] = None
    asset_metadata: AssetMetadata = Field(default_factory=AssetMetadata)

    # --- Lifecycle Methods ---

    def mark_ready(self, updated_by: Optional[str] = None):
        """Marks the asset as ready and updates its timestamps."""
        self.status = AssetStatus.READY
        self.ready_at = datetime.utcnow()
        self.last_updated_by = updated_by
        self.error_message = None
        self.asset_metadata.updated_at = datetime.utcnow()

    def mark_error(self, error_message: str, updated_by: Optional[str] = None):
        """Marks the asset as having an error."""
        self.status = AssetStatus.ERROR
        self.error_message = error_message
        self.last_updated_by = updated_by
        self.asset_metadata.updated_at = datetime.utcnow()

    def mark_in_progress(self, updated_by: Optional[str] = None):
        """Marks the asset as currently being processed."""
        self.status = AssetStatus.IN_PROGRESS
        self.last_updated_by = updated_by
        self.error_message = None
        self.asset_metadata.updated_at = datetime.utcnow()

    def is_available(self) -> bool:
        """Checks if the asset is in a READY state."""
        return self.status == AssetStatus.READY

    def needs_attention(self) -> bool:
        """Checks if the asset is in a state that requires attention."""
        return self.status in [AssetStatus.ERROR, AssetStatus.EXPIRED]

    # --- Convenience Properties ---
    
    @property
    def is_collection(self) -> bool:
        """Backward compatibility property - returns schema_definition.is_array"""
        return self.schema_definition.is_array if self.schema_definition else False

# --- Asset-Specific Utility Functions ---

def get_pending_assets(assets: List[Asset]) -> List[Asset]:
    """Filters a list of assets to find those in a PENDING state."""
    return [asset for asset in assets if asset.status == AssetStatus.PENDING]

def get_ready_assets(assets: List[Asset]) -> List[Asset]:
    """Filters a list of assets to find those in a READY state."""
    return [asset for asset in assets if asset.status == AssetStatus.READY]

def get_failed_assets(assets: List[Asset]) -> List[Asset]:
    """Filters a list of assets to find those in an ERROR state."""
    return [asset for asset in assets if asset.status == AssetStatus.ERROR]

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
    role: Optional[AssetRole] = None  # Role of asset in workflow
    content: Optional[Any] = None
    asset_metadata: Optional[Dict[str, Any]] = None

# Pre-defined asset instances using unified Asset
DAILY_NEWSLETTER_RECAP_ASSET = Asset(
    id="daily_newsletter_recap",
    name="Daily Newsletter Recap",
    description="A collection of daily newsletter summaries",
    schema_definition=SchemaType(
        type="database_entity",
        description="A collection of daily newsletter summaries",
        is_array=True
    ),
    value=None,
    subtype="daily_newsletter_recap",
    asset_metadata=AssetMetadata(
        creator="system",
        tags=["newsletter", "summary", "daily"],
        version=1,
        token_count=0
    )
)
    