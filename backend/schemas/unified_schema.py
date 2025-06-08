"""
Unified Schema System for Assets, Tool Parameters, and Tool Outputs
Backend Python equivalent of frontend/src/types/schema.ts
"""

from pydantic import BaseModel, Field, validator, ConfigDict
from typing import List, Dict, Any, Optional, Union, Literal
from datetime import datetime
from enum import Enum
from utils.string_utils import canonical_key

# Type definitions matching frontend and backend compatibility
PrimitiveType = Literal['string', 'number', 'boolean', 'primitive']  # Added 'primitive' for backend compatibility
CustomType = Literal['email', 'webpage', 'search_result', 'pubmed_article', 'newsletter', 'daily_newsletter_recap']
ComplexType = Literal['object', 'file', 'database_entity', 'markdown', 'config', 'email', 'webpage', 'search_result', 'pubmed_article', 'newsletter', 'daily_newsletter_recap']  # Added 'markdown', 'config' for backend compatibility
ValueType = Union[PrimitiveType, ComplexType]

# Asset role in the workflow/mission context
AssetRole = Literal['input', 'output', 'intermediate']

# Asset status in the execution lifecycle
class AssetStatus(str, Enum):
    """Status of an asset in the execution lifecycle"""
    PENDING = "pending"           # Asset defined but not yet available/provided
    IN_PROGRESS = "in_progress"   # Asset is currently being created/processed
    READY = "ready"               # Asset is available and ready to use
    ERROR = "error"               # Asset creation/provision failed
    EXPIRED = "expired"           # Asset (like credentials) has expired

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

    # Pydantic v2 configuration: allow population using field aliases
    model_config = ConfigDict(populate_by_name=True)

class Asset(SchemaEntity):
    """Assets extend SchemaEntity with actual value and status tracking"""
    value: Optional[Any] = None  # the actual data content
    status: AssetStatus = Field(default=AssetStatus.PENDING, description="Current status of the asset")
    
    # Asset-specific metadata
    subtype: Optional[str] = None  # Allow any string for flexibility like the old schema
    is_collection: bool = False
    collection_type: Optional[Literal['array', 'map', 'set', 'null']] = None
    role: Optional[AssetRole] = None  # Role of this asset in the workflow (input, output, or intermediate/WIP)
    
    # Status-related fields
    error_message: Optional[str] = Field(default=None, description="Error message if status is ERROR")
    last_updated_by: Optional[str] = Field(default=None, description="Who/what last updated this asset")
    ready_at: Optional[datetime] = Field(default=None, description="When the asset became ready")
    
    asset_metadata: AssetMetadata = Field(default_factory=AssetMetadata)

    def mark_ready(self, updated_by: Optional[str] = None) -> None:
        """Mark asset as ready and set timestamp"""
        self.status = AssetStatus.READY
        self.ready_at = datetime.utcnow()
        self.last_updated_by = updated_by
        self.error_message = None
        self.asset_metadata.updated_at = datetime.utcnow()

    def mark_error(self, error_message: str, updated_by: Optional[str] = None) -> None:
        """Mark asset as error with message"""
        self.status = AssetStatus.ERROR
        self.error_message = error_message
        self.last_updated_by = updated_by
        self.asset_metadata.updated_at = datetime.utcnow()

    def mark_in_progress(self, updated_by: Optional[str] = None) -> None:
        """Mark asset as being worked on"""
        self.status = AssetStatus.IN_PROGRESS
        self.last_updated_by = updated_by
        self.error_message = None
        self.asset_metadata.updated_at = datetime.utcnow()

    def is_available(self) -> bool:
        """Check if asset is ready to use"""
        return self.status == AssetStatus.READY

    def needs_attention(self) -> bool:
        """Check if asset needs user attention (error or expired)"""
        return self.status in [AssetStatus.ERROR, AssetStatus.EXPIRED]

# Import tool definitions from the canonical source to avoid duplication
# This eliminates the need for multiple ToolDefinition classes
try:
    from .tools import (
        ToolDefinition, 
        ToolParameter, 
        ToolOutput, 
        ExternalSystemInfo
    )
except ImportError:
    # Fallback for when tools.py is not available
    print("Warning: Could not import tool definitions from tools.py")
    
    class ToolExample(BaseModel):
        """Example for tool usage"""
        description: str
        input: Dict[str, Any]
        output: Dict[str, Any]

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

# Asset status utility functions
def get_pending_assets(assets: List[Asset]) -> List[Asset]:
    """Get all assets that are still pending"""
    return [asset for asset in assets if asset.status == AssetStatus.PENDING]

def get_ready_assets(assets: List[Asset]) -> List[Asset]:
    """Get all assets that are ready"""
    return [asset for asset in assets if asset.status == AssetStatus.READY]

def get_failed_assets(assets: List[Asset]) -> List[Asset]:
    """Get all assets that have errors"""
    return [asset for asset in assets if asset.status == AssetStatus.ERROR]

def check_mission_ready(input_assets: List[Asset]) -> tuple[bool, List[str]]:
    """Check if all input assets are ready for mission execution"""
    pending_inputs = [asset.name for asset in input_assets if asset.status != AssetStatus.READY]
    failed_inputs = [asset.name for asset in input_assets if asset.status == AssetStatus.ERROR]
    
    if failed_inputs:
        return False, [f"Failed inputs that need attention: {', '.join(failed_inputs)}"]
    elif pending_inputs:
        return False, [f"Pending inputs from user: {', '.join(pending_inputs)}"]
    else:
        return True, []

def mark_hop_outputs_ready(hop_state: Dict[str, Asset], output_mapping: Dict[str, str], mission_state: Dict[str, Asset], updated_by: str = "hop_execution") -> List[str]:
    """Mark hop output assets as ready when hop completes successfully
    
    Args:
        hop_state: The hop's local asset state
        output_mapping: Maps hop local asset names to mission asset IDs
        mission_state: The mission's global asset state to update
        updated_by: Who is marking the assets as ready
        
    Returns:
        List of asset names that were marked as ready
    """
    marked_ready = []
    
    for hop_local_name, mission_asset_id in output_mapping.items():
        # Ensure consistent key format (canonical)
        canonical_local_name = canonical_key(hop_local_name)
        
        # Get the asset from hop's local state
        hop_asset = hop_state.get(canonical_local_name)
        if hop_asset and hop_asset.status == AssetStatus.READY:
            # Find the corresponding asset in mission state
            mission_asset = mission_state.get(mission_asset_id)
            if mission_asset:
                # Mark the mission asset as ready
                mission_asset.mark_ready(updated_by=updated_by)
                # Copy the value from hop asset to mission asset
                mission_asset.value = hop_asset.value
                marked_ready.append(mission_asset.name)
                print(f"Marked mission asset '{mission_asset.name}' as ready from hop output")
    
    return marked_ready

# Update forward references
SchemaType.model_rebuild() 