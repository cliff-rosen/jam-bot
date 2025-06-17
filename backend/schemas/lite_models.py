from typing import Dict, Any, List, Optional, Union
from datetime import datetime
from pydantic import BaseModel, Field, validator
import uuid

from schemas.asset import Asset, AssetStatus, AssetMetadata, CollectionType
from schemas.workflow import ToolStep, Hop, HopStatus, ExecutionStatus, Mission, MissionStatus, AssetFieldMapping, LiteralMapping, DiscardMapping, ParameterMappingValue, ResultMappingValue
from schemas.base import SchemaType, ValueType
from utils.string_utils import canonical_key

class AssetLite(BaseModel):
    """Simplified asset definition for mission proposals"""
    name: str = Field(description="Name of the asset")
    description: str = Field(description="Clear description of what this asset contains")
    type: ValueType = Field(description="Type of asset. Must be one of: 'string', 'number', 'boolean', 'primitive', 'object', 'file', 'database_entity', 'markdown', 'config', 'email', 'webpage', 'search_result', 'pubmed_article', 'newsletter', 'daily_newsletter_recap'")
    subtype: Optional[str] = Field(default=None, description="Specific format or schema (e.g., 'csv', 'json', 'email', 'oauth_token')")
    is_collection: bool = Field(default=False, description="Whether this asset contains multiple items (arrays, lists, sets, maps)")
    collection_type: Optional[CollectionType] = Field(default=None, description="Type of collection if is_collection is true. Use 'array' for lists, 'map' for dictionaries, 'set' for unique items")
    role: Optional[str] = Field(default=None, description="Role of asset in workflow: 'input' for user-provided data/credentials, 'output' for final results, 'intermediate' for data retrieved from external systems")
    required: bool = Field(default=True, description="Whether this asset is required for the mission")
    external_system_for: Optional[str] = Field(default=None, description="If this is an external system credential asset, which system it provides access to")
    schema_description: Optional[str] = Field(default=None, description="Description of expected structure/format for structured data")
    example_value: Optional[Any] = Field(default=None, description="Example of what the asset value might look like")

class MissionLite(BaseModel):
    """Simplified mission definition for proposals"""
    name: str = Field(description="Name of the mission (2-8 words)")
    description: str = Field(description="One sentence describing what the mission accomplishes")
    goal: str = Field(description="The main goal of the mission")
    success_criteria: List[str] = Field(description="2-3 specific, measurable outcomes that define completion")
    inputs: List[AssetLite] = Field(description="Input assets required for the mission (user data + external system credentials)")
    outputs: List[AssetLite] = Field(description="Output assets produced by the mission")
    scope: str = Field(description="What is explicitly included/excluded in the mission")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Additional metadata for the mission")

class ToolStepLite(BaseModel):
    """Simplified tool step definition"""
    id: str = Field(description="Unique identifier for the tool step")
    tool_id: str = Field(description="ID of the tool to use")
    description: str = Field(description="Description of what this step accomplishes")
    resource_configs: Dict[str, Any] = Field(default_factory=dict, description="Configuration for external resources needed by the tool")
    parameter_mapping: Dict[str, ParameterMappingValue] = Field(default_factory=dict, description="Mapping of tool parameters to values or asset fields")
    result_mapping: Dict[str, ResultMappingValue] = Field(default_factory=dict, description="Mapping of tool results to asset fields")

class OutputAssetSpec(BaseModel):
    """Specification for an output asset in a hop"""
    asset: AssetLite = Field(description="Definition of the output asset")
    use_existing: bool = Field(default=False, description="Whether to use an existing mission asset")
    mission_asset_id: Optional[str] = Field(
        default=None,
        description="ID of existing mission asset to use. Required if use_existing is True."
    )

class HopLite(BaseModel):
    """Simplified hop definition focusing on inputs and outputs"""
    name: str = Field(description="Name of the hop (2-8 words)")
    description: str = Field(description="One sentence describing what the hop accomplishes")
    inputs: List[AssetLite] = Field(description="Input assets required for this hop")
    output: OutputAssetSpec = Field(description="Output asset specification for this hop")
    is_final: bool = Field(default=False, description="Whether this is the final hop in the mission")
    rationale: str = Field(description="Explanation of why this hop is needed and how it contributes to the mission")
    alternative_approaches: List[str] = Field(
        default_factory=list, 
        description="Alternative approaches that were considered but not chosen"
    )

    @validator('output')
    def validate_output_spec(cls, v):
        """Validate that output specification is complete"""
        if v.use_existing and not v.mission_asset_id:
            raise ValueError("mission_asset_id is required when use_existing is True")
        return v

# Mapping functions to convert between Lite and full models

def create_asset_from_lite(asset_lite: AssetLite) -> Asset:
    """Convert an AssetLite object to a full Asset object with unified schema"""
    current_time = datetime.utcnow()
    
    # Create the unified schema
    unified_schema = SchemaType(
        type=asset_lite.type,  # type is already a ValueType string
        description=asset_lite.schema_description or asset_lite.description,
        is_array=asset_lite.is_collection,
        fields=None  # TODO: Could extract fields from schema_description or example_value if structured
    )

    # Create metadata for the asset
    custom_metadata = {}
    if asset_lite.external_system_for:
        custom_metadata['external_system_for'] = asset_lite.external_system_for

    asset_metadata = AssetMetadata(
        created_at=current_time,
        updated_at=current_time,
        creator='mission_specialist',
        custom_metadata=custom_metadata,
    )
    
    # Determine initial status based on type and subtype
    initial_status = AssetStatus.PENDING
    if asset_lite.role == 'input':
        # Config values and system credentials are ready by default
        if (asset_lite.type in ['config', 'object'] or 
            asset_lite.subtype in ['oauth_token', 'email'] or
            asset_lite.external_system_for is not None):
            initial_status = AssetStatus.READY
    
    # Create the full Asset object
    return Asset(
        id=str(uuid.uuid4()),
        name=asset_lite.name,
        description=asset_lite.description,
        schema_definition=unified_schema,
        value=asset_lite.example_value,
        status=initial_status,
        subtype=asset_lite.subtype,
        is_collection=asset_lite.is_collection,
        collection_type=asset_lite.collection_type.value if asset_lite.collection_type else None,
        role=asset_lite.role or 'intermediate',
        asset_metadata=asset_metadata,
    )

def create_mission_from_lite(mission_lite: MissionLite) -> Mission:
    """Convert a MissionLite object to a full Mission object"""
    current_time = datetime.utcnow()
    
    # Convert input and output assets
    inputs = [create_asset_from_lite(asset) for asset in mission_lite.inputs]
    outputs = [create_asset_from_lite(asset) for asset in mission_lite.outputs]
    
    # Create the full Mission object
    mission = Mission(
        id=str(uuid.uuid4()),
        name=mission_lite.name,
        description=mission_lite.description,
        goal=mission_lite.goal,
        success_criteria=mission_lite.success_criteria,
        inputs=inputs,
        outputs=outputs,
        current_hop=None,
        hop_history=[],
        mission_state={},
        status=ExecutionStatus.PENDING,
        mission_status=MissionStatus.PENDING,
        created_at=current_time,
        updated_at=current_time,
        metadata=mission_lite.metadata
    )
    
    # Initialize mission state with input and output assets
    for asset in inputs + outputs:
        mission.mission_state[asset.id] = asset
    
    return mission

def create_tool_step_from_lite(step_lite: ToolStepLite) -> ToolStep:
    """Convert a ToolStepLite object to a full ToolStep object"""
    current_time = datetime.utcnow()
    
    return ToolStep(
        id=step_lite.id,
        tool_id=step_lite.tool_id,
        description=step_lite.description,
        resource_configs=step_lite.resource_configs,
        parameter_mapping=step_lite.parameter_mapping,
        result_mapping=step_lite.result_mapping,
        status=ExecutionStatus.PENDING,
        created_at=current_time,
        updated_at=current_time
    )

def create_hop_from_lite(hop_lite: HopLite) -> Hop:
    """Convert a HopLite object to a full Hop object"""
    current_time = datetime.utcnow()
    
    # Create full Asset objects from input assets
    input_assets = [create_asset_from_lite(asset) for asset in hop_lite.inputs]
    
    # Create input mapping from the full Asset objects
    input_mapping = {
        canonical_key(asset.name): asset.id
        for asset in input_assets
    }
    
    # Create output asset from lite version
    output_asset = create_asset_from_lite(hop_lite.output.asset)
    
    # Create output mapping
    output_mapping = {
        canonical_key(hop_lite.output.asset.name): (
            hop_lite.output.mission_asset_id or output_asset.id
        )
    }
    
    # Create the full Hop object
    return Hop(
        id=str(uuid.uuid4()),
        name=hop_lite.name,
        description=hop_lite.description,
        input_mapping=input_mapping,
        output_mapping=output_mapping,
        tool_steps=[],  # Tool steps will be added by the implementer
        hop_state={},   # State will be populated when the hop is implemented
        status=HopStatus.READY_TO_DESIGN,
        is_final=hop_lite.is_final,
        is_resolved=False,
        created_at=current_time,
        updated_at=current_time
    ) 