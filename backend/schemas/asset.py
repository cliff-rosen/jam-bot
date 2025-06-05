from pydantic import BaseModel, Field, validator
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
    MARKDOWN = "markdown"
    CONFIG = "config"

class CollectionType(str, Enum):
    """Type of collection if asset is a collection"""
    ARRAY = "array"
    MAP = "map"
    SET = "set"
    NONE = "null"

class DatabaseEntityMetadata(BaseModel):
    """Metadata for assets that represent database entities"""
    table_name: Optional[str] = None
    query_type: Literal["list", "single"] = "list"
    query_params: Dict[str, Any] = Field(default_factory=dict)  # For WHERE clauses, LIMIT, etc.
    columns: Optional[List[str]] = None  # Specific columns to retrieve, None means all
    is_direct_content: bool = False  # Whether content is stored directly in asset or needs to be fetched

class AssetSubtype(str, Enum):
    """Specific format or schema of the asset"""
    EMAIL = "email"
    NEWSLETTER = "newsletter"
    SEARCH_RESULT = "search_result"
    WEB_PAGE = "web_page"
    PUBMED_ARTICLE = "pubmed_article"
    DAILY_NEWSLETTER_RECAP = "daily_newsletter_recap"  # For daily newsletter summary recaps

class AssetSchema(BaseModel):
    """Schema definition for asset content validation"""
    type: str = Field(description="JSON Schema type (string, number, boolean, object, array)")
    properties: Optional[Dict[str, Any]] = Field(default=None, description="Properties for object type")
    items: Optional[Dict[str, Any]] = Field(default=None, description="Schema for array items")
    required: Optional[List[str]] = Field(default=None, description="Required fields for object type")
    additional_properties: bool = Field(default=True, description="Whether to allow additional properties")
    description: Optional[str] = Field(default=None, description="Description of the schema")
    examples: Optional[List[Any]] = Field(default=None, description="Example values that match this schema")

class AssetMetadata(BaseModel):
    """Enhanced metadata for assets"""
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    creator: Optional[str] = None
    version: int = Field(default=1)
    tags: List[str] = Field(default_factory=list)
    source_step: Optional[str] = None
    content_type: Optional[str] = None
    validation_status: Optional[str] = None
    validation_errors: Optional[List[str]] = None

class Asset(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    type: AssetType
    subtype: Optional[str] = None  # specific_format_or_schema
    is_collection: bool = False
    collection_type: Optional[CollectionType] = None
    content: Optional[Any] = None
    schema: Optional[AssetSchema] = None
    metadata: AssetMetadata = Field(default_factory=AssetMetadata)
    db_entity_metadata: Optional[DatabaseEntityMetadata] = None  # For database entity assets

    @validator('content')
    def validate_content_against_schema(cls, v, values):
        """Validate content against schema if schema is defined"""
        if 'schema' in values and values['schema'] and v is not None:
            # TODO: Implement schema validation
            # This would use a JSON Schema validator to ensure content matches schema
            pass
        return v

    @validator('type', 'subtype')
    def validate_type_compatibility(cls, v, values):
        """Validate type and subtype compatibility"""
        if 'type' in values and values['type'] == AssetType.FILE:
            if 'subtype' in values and values['subtype']:
                try:
                    FileType(values['subtype'])
                except ValueError:
                    raise ValueError(f"Invalid file type: {values['subtype']}")
        return v

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
    
# Asset Definitions
DAILY_NEWSLETTER_RECAP_ASSET = Asset(
    id="daily_newsletter_recap",
    name="Daily Newsletter Recap",
    description="A collection of daily newsletter summaries",
    type=AssetType.DATABASE_ENTITY,
    subtype=AssetSubtype.DAILY_NEWSLETTER_RECAP,
    is_collection=True,
    collection_type=CollectionType.ARRAY,
    content=None,
    asset_metadata={},
    db_entity_metadata=DatabaseEntityMetadata(
        table_name="newsletter_summaries",
        query_type="list",
        query_params={
            "period_type": "day"
        },
        columns=["id", "period_type", "start_date", "end_date", "summary", "source_count", "source_ids", "created_at", "updated_at", "metadata"],
        is_direct_content=False
    )
)
    