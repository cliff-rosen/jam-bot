"""
Workflow Schema Definitions

This module contains all Pydantic models and related utilities for defining
and managing workflows, including Missions, Hops, and ToolSteps.
"""

from __future__ import annotations
from pydantic import BaseModel, Field, validator
from typing import Dict, Any, Optional, List, Union, Literal
from datetime import datetime
from enum import Enum
from .asset import Asset
from .resource import Resource
from .tool import ToolDefinition
from tools.tool_execution import execute_tool_step, ToolExecutionError


class ExecutionStatus(str, Enum):
    """Status of tool step execution"""
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"


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
    """
    Represents one step in a mission, containing a sequence of tool steps
    to be executed.
    """
    id: str
    name: str
    description: str
    input_mapping: Dict[str, str] = Field(description="Maps local hop state keys to mission asset IDs for input.")
    output_mapping: Dict[str, str] = Field(description="Maps local hop state keys to mission asset IDs for output.")
    tool_steps: List[ToolStep] = Field(default_factory=list)
    hop_state: Dict[str, Asset] = Field(default_factory=dict)
    status: HopStatus = Field(default=HopStatus.HOP_PROPOSED)
    is_final: bool = Field(default=False)
    is_resolved: bool = Field(default=False)
    error: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    @validator('input_mapping')
    def validate_input_mapping_asset_ids(cls, v, values, **kwargs):
        """Validate that input mapping values are valid asset IDs in mission state"""
        if not v:
            return v
            
        # Check if we have access to mission state
        mission_state = values.get('mission_state')
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
        hop_state = values.get('hop_state', {})
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
    """
    Represents the overall goal or workflow, composed of a series of hops.
    """
    id: str
    name: str
    description: str
    current_hop: Optional[Hop] = Field(default=None, description="Current hop being designed or executed")
    hop_history: List[Hop] = Field(default_factory=list, description="List of completed hops")
    inputs: List[Asset]
    outputs: List[Asset]
    mission_state: Dict[str, Asset] = Field(default_factory=dict)
    status: str = Field(default="pending", description="Status of the mission")
    goal: str = Field(default="", description="The main goal of the mission")
    success_criteria: List[str] = Field(default_factory=list, description="List of criteria that define mission success")
    
    # Status tracking
    mission_status: MissionStatus = Field(default=MissionStatus.PENDING)
    metadata: Dict[str, Any] = Field(default_factory=dict)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    @validator('created_at', 'updated_at', pre=True)
    def handle_empty_datetime(cls, v):
        """Handle empty datetime strings from LLM responses"""
        if v == "" or v is None:
            return datetime.utcnow()
        return v


class AssetFieldMapping(BaseModel):
    """Maps a tool parameter to a specific asset in the hop state."""
    type: Literal["asset_field"] = "asset_field"
    state_asset: str
    path: Optional[str] = None


class LiteralMapping(BaseModel):
    """Provides a literal value directly to a tool parameter."""
    type: Literal["literal"] = "literal"
    value: Any


class DiscardMapping(BaseModel):
    """Indicates that a tool output should be discarded."""
    type: Literal["discard"] = "discard"


ParameterMappingValue = Union[AssetFieldMapping, LiteralMapping]
ResultMappingValue = Union[AssetFieldMapping, DiscardMapping]


class ToolStep(BaseModel):
    """
    Represents an atomic unit of work: a single tool execution within a hop.
    """
    id: str
    tool_id: str
    description: str
    resource_configs: Dict[str, Resource] = Field(default_factory=dict)
    parameter_mapping: Dict[str, ParameterMappingValue]
    result_mapping: Dict[str, ResultMappingValue]
    status: ExecutionStatus = Field(default=ExecutionStatus.PENDING, description="Status of the tool step")
    error: Optional[str] = None
    validation_errors: Optional[List[str]] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    @validator('created_at', 'updated_at', pre=True)
    def handle_empty_datetime(cls, v):
        """Handle empty datetime strings from LLM responses"""
        if v == "" or v is None:
            return datetime.utcnow()
        return v

    async def execute(self, hop_state: Dict[str, Asset]) -> Dict[str, Any]:
        """
        Execute this tool step and return the results.
        
        Args:
            hop_state: Current state of the hop containing all assets
            
        Returns:
            Dict containing the execution results
            
        Raises:
            ToolExecutionError: If tool execution fails
        """
        try:
            self.status = ExecutionStatus.RUNNING
            result = await execute_tool_step(self, hop_state)
            self.status = ExecutionStatus.COMPLETED
            return result
        except Exception as e:
            self.status = ExecutionStatus.FAILED
            self.error = str(e)
            raise ToolExecutionError(str(e), self.tool_id) 