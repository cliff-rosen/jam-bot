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

# --- Asset-Specific Enums and Models ---

class AssetStatus(str, Enum):
    """Status of an asset"""
    PROPOSED = "proposed"
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    READY = "ready"
    ERROR = "error"
    EXPIRED = "expired"

class AssetRole(str, Enum):
    """Role of an asset in workflow"""
    INPUT = "input"
    OUTPUT = "output"
    INTERMEDIATE = "intermediate"

class AssetScopeType(str, Enum):
    """Scope type for asset"""
    MISSION = "mission"
    HOP = "hop"

class Asset(BaseModel):
    """Asset with metadata and value representation (no full content)"""
    # Core fields
    id: str
    name: str
    description: Optional[str] = None
    type: str
    subtype: Optional[str] = None
    
    # Scope information
    scope_type: AssetScopeType
    scope_id: str
    
    # Asset lifecycle
    status: AssetStatus = AssetStatus.PENDING
    role: AssetRole
    
    # Value representation (generated from content_summary)
    value_representation: str
    
    # Metadata
    asset_metadata: Dict[str, Any] = Field(default_factory=dict)
    
    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class AssetWithContent(Asset):
    """Asset with full content for tool execution"""
    content: Any  # Full content included

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

# Pre-defined asset instances can be added here if needed
# Example:
# DAILY_NEWSLETTER_RECAP_ASSET = Asset(
#     id="daily_newsletter_recap",
#     user_id=0,
#     name="Daily Newsletter Recap", 
#     description="A collection of daily newsletter summaries",
#     type="database_entity",
#     subtype="daily_newsletter_recap",
#     scope_type=AssetScopeType.MISSION,
#     scope_id="system",
#     role=AssetRole.OUTPUT,
#     value_representation="Daily newsletter summaries collection",
#     asset_metadata={"creator": "system"}
# )
    