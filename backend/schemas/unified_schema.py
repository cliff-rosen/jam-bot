"""
Unified Schema System for Assets, Tool Parameters, and Tool Outputs
Backend Python equivalent of frontend/src/types/schema.ts
"""

from pydantic import BaseModel, Field, validator
from typing import List, Dict, Any, Optional, Union, Literal
from datetime import datetime
from enum import Enum

# Type definitions matching frontend and backend compatibility
PrimitiveType = Literal['string', 'number', 'boolean', 'primitive']  # Added 'primitive' for backend compatibility
CustomType = Literal['email', 'webpage', 'search_result', 'pubmed_article', 'newsletter', 'daily_newsletter_recap']
ComplexType = Literal['object', 'file', 'database_entity', 'markdown', 'config', 'email', 'webpage', 'search_result', 'pubmed_article', 'newsletter', 'daily_newsletter_recap']  # Added 'markdown', 'config' for backend compatibility
ValueType = Union[PrimitiveType, ComplexType]

class SchemaType(BaseModel):
    """Schema definition that works for both assets and tool parameters/outputs"""
    type: ValueType
    description: Optional[str] = None
    is_array: bool = False
    fields: Optional[Dict[str, 'SchemaType']] = None  # for nested objects

class SchemaEntity(BaseModel):
    """Base schema entity - shared by assets and tool params/outputs"""
    id: str
    name: str
    description: str
    schema: SchemaType

class AssetMetadata(BaseModel):
    """Asset-specific metadata"""
    created_at: datetime = Field(default_factory=datetime.utcnow, alias='createdAt')
    updated_at: datetime = Field(default_factory=datetime.utcnow, alias='updatedAt')
    creator: Optional[str] = None
    tags: List[str] = Field(default_factory=list)
    agent_associations: List[str] = Field(default_factory=list)
    version: int = Field(default=1)
    token_count: int = Field(default=0)

    class Config:
        allow_population_by_field_name = True

class Asset(SchemaEntity):
    """Assets extend SchemaEntity with actual value"""
    value: Optional[Any] = None  # the actual data content
    # Asset-specific metadata
    subtype: Optional[str] = None  # Allow any string for flexibility like the old schema
    is_collection: bool = False
    collection_type: Optional[Literal['array', 'map', 'set', 'null']] = None
    asset_metadata: AssetMetadata = Field(default_factory=AssetMetadata)

class ToolParameter(SchemaEntity):
    """Tool parameters - schema definition only"""
    required: bool = True
    default: Optional[Any] = None
    examples: Optional[List[Any]] = None

class ToolOutput(SchemaEntity):
    """Tool outputs - schema definition only"""
    examples: Optional[List[Any]] = None

class ToolExample(BaseModel):
    """Example for tool usage"""
    description: str
    input: Dict[str, Any]
    output: Dict[str, Any]

class ToolDefinition(BaseModel):
    """Tool definition using unified schema"""
    id: str
    name: str
    description: str
    category: str
    parameters: List[ToolParameter]
    outputs: List[ToolOutput]
    examples: Optional[List[ToolExample]] = None

# Utility functions for schema operations
def is_compatible_schema(source_schema: SchemaType, target_schema: SchemaType) -> bool:
    """Check if source schema is compatible with target schema"""
    # Basic type compatibility check
    if source_schema.type == target_schema.type:
        return True
    
    # Allow string -> any custom type conversion
    if source_schema.type == 'string' and is_custom_type(target_schema.type):
        return True
    
    # Allow object -> any custom type conversion
    if source_schema.type == 'object' and is_custom_type(target_schema.type):
        return True
    
    return False

def is_custom_type(type_value: ValueType) -> bool:
    """Check if type is a custom type"""
    custom_types = ['email', 'webpage', 'search_result', 'pubmed_article', 'newsletter', 'daily_newsletter_recap']
    return type_value in custom_types

def is_primitive_type(type_value: ValueType) -> bool:
    """Check if type is a primitive type"""
    primitive_types = ['string', 'number', 'boolean']
    return type_value in primitive_types

# Update forward references
SchemaType.model_rebuild() 