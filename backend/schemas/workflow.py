from pydantic import BaseModel, Field, validator
from typing import Dict, Any, Optional, List, Union, Literal
from datetime import datetime
from enum import Enum
from .unified_schema import Asset
from .tools import ToolStep, ExecutionStatus


class MissionStatus(str, Enum):
    """Status of a mission"""
    PENDING = "pending"  # Mission proposed but not yet approved by user
    ACTIVE = "active"    # Mission approved and in progress
    COMPLETE = "complete"  # Mission completed


class HopStatus(str, Enum):
    """Status of hops (only applies when mission is active)"""
    READY_TO_DESIGN = "ready_to_design"      # Ready to design next hop
    HOP_PROPOSED = "hop_proposed"            # Hop designer has proposed a hop
    HOP_READY_TO_RESOLVE = "hop_ready_to_resolve"  # User accepted hop, ready to resolve with tools
    HOP_READY_TO_EXECUTE = "hop_ready_to_execute"  # Hop resolved with tools, ready to run
    HOP_RUNNING = "hop_running"              # Hop is executing
    ALL_HOPS_COMPLETE = "all_hops_complete"  # No more hops needed


class Hop(BaseModel):
    """Represents a coherent unit of work that transforms input assets into output assets.
    
    A hop may be atomic (single tool) or composite (multiple tools).
    
    Asset Flow:
    1. Input Mapping: Mission State → Hop State
       - Maps mission state asset IDs to local hop state keys
       - Example: {"search_criteria": "mission_asset_123"} means:
         * "mission_asset_123" is the ID in mission.state
         * "search_criteria" is the key in hop.state where the asset will be copied
       - Values MUST be valid asset IDs from mission.state
       - Keys become the local state keys in hop.state
    
    2. Tool Execution: Tools operate on hop's local state
       - Each tool step reads from and writes to the local state
       - Intermediate results stay within the hop
       - Tools reference assets by their local state keys (e.g., "search_criteria")
    
    3. Output Mapping: Hop State → Mission State
       - Maps local hop state keys to mission state asset IDs
       - Example: {"results": "mission_output_456"} means:
         * "results" is the key in hop.state containing the output
         * "mission_output_456" is the ID in mission.state where it will be stored
    """
    id: str = Field(description="Unique identifier for the hop")
    name: str = Field(description="Name of the hop")
    description: str = Field(description="Description of what this hop accomplishes")
    
    # Asset mappings
    input_mapping: Dict[str, str] = Field(
        description="Maps local hop state keys to mission state asset IDs. Format: {local_key: mission_asset_id}. Values MUST be valid asset IDs from mission.state. The local_key becomes the key in hop.state."
    )
    state: Dict[str, Asset] = Field(
        default_factory=dict,
        description="Local asset workspace for this hop. Keys are defined by input_mapping and tool steps."
    )
    output_mapping: Dict[str, str] = Field(
        default_factory=dict,
        description="Maps local hop state keys to mission state asset IDs. Format: {local_key: mission_asset_id}. The local_key must exist in hop.state."
    )
    
    # Tool chain (populated during resolution)
    steps: List[ToolStep] = Field(
        default_factory=list,
        description="Ordered list of tool executions that implement this hop"
    )
    
    # Status tracking
    status: ExecutionStatus = Field(default=ExecutionStatus.PENDING)
    is_resolved: bool = Field(default=False, description="Whether the hop has been configured with tools")
    is_final: bool = Field(default=False, description="Whether this hop produces the final deliverable")
    error: Optional[str] = Field(default=None, description="Error message if the hop execution failed")
    current_step_index: int = Field(default=0, description="Index of the currently executing step")
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    @validator('created_at', 'updated_at', pre=True)
    def handle_empty_datetime(cls, v):
        """Handle empty datetime strings from LLM responses"""
        if v == "" or v is None:
            return datetime.utcnow()
        return v

    @validator('input_mapping')
    def validate_input_mapping_asset_ids(cls, v, values, **kwargs):
        """Validate that input mapping values are valid asset IDs in mission state"""
        if not v:
            return v
            
        # Check if we have access to mission state
        mission_state = kwargs.get('mission_state')
        if not mission_state:
            return v
            
        # Validate each asset ID exists in mission state
        invalid_ids = []
        for local_key, mission_asset_id in v.items():
            if mission_asset_id not in mission_state:
                invalid_ids.append(f"{local_key}: {mission_asset_id}")
                
        if invalid_ids:
            raise ValueError(
                f"Input mapping contains invalid mission state asset IDs: {', '.join(invalid_ids)}"
            )
            
        return v

    @validator('output_mapping')
    def validate_output_mapping_local_keys(cls, v, values, **kwargs):
        """Validate that output mapping keys exist in hop state"""
        if not v:
            return v
            
        # Get the hop state
        hop_state = values.get('state', {})
        if not hop_state:
            return v
            
        # Validate each local key exists in hop state
        invalid_keys = []
        for local_key, mission_asset_id in v.items():
            if local_key not in hop_state:
                invalid_keys.append(f"{local_key} (maps to mission asset {mission_asset_id})")
                
        if invalid_keys:
            raise ValueError(
                f"Output mapping references local keys that don't exist in hop state: {', '.join(invalid_keys)}"
            )
            
        return v


class Mission(BaseModel):
    """Represents a high-level goal that transforms input assets into output assets"""
    id: str = Field(description="Unique identifier for the mission")
    name: str = Field(description="Name of the mission")
    description: str = Field(description="Description of the mission")
    goal: str = Field(description="The main goal of the mission")
    success_criteria: List[str] = Field(description="List of criteria that define mission success")
    
    # Assets
    inputs: List[Asset] = Field(description="Input assets required for the mission")
    outputs: List[Asset] = Field(description="Output assets produced by the mission")
    state: Dict[str, Asset] = Field(
        default_factory=dict,
        description="All assets available to the mission (inputs + hop outputs)"
    )
    
    # Execution
    hops: List[Hop] = Field(default_factory=list, description="Sequence of hops to execute")
    current_hop: Optional[Hop] = Field(default=None, description="Current hop being designed or executed")
    current_hop_index: int = Field(default=0, description="Index of the current hop")
    
    # Status tracking
    mission_status: MissionStatus = Field(default=MissionStatus.PENDING)
    hop_status: Optional[HopStatus] = Field(default=None, description="Hop status (only when mission is active)")
    metadata: Dict[str, Any] = Field(default_factory=dict)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow) 