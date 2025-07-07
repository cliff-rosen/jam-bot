"""
Workflow Schema Definitions

This module contains all Pydantic models and related utilities for defining
and managing workflows, including Missions, Hops, and ToolSteps.
"""

from __future__ import annotations
from pydantic import BaseModel, Field, validator
from typing import Dict, Any, Optional, List, Union, Literal, TYPE_CHECKING
from datetime import datetime
from enum import Enum

from .asset import Asset
from .resource import Resource

if TYPE_CHECKING:
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
    hop_state: Dict[str, Asset] = Field(default_factory=dict)
    tool_steps: List[ToolStep] = Field(default_factory=list)
    status: HopStatus = Field(default=HopStatus.HOP_PROPOSED)
    is_final: bool = Field(default=False)
    is_resolved: bool = Field(default=False)
    rationale: Optional[str] = Field(default=None, description="Explanation of why this hop is needed and how it contributes to the mission")
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
    goal: str = Field(default="", description="The main goal of the mission")
    success_criteria: List[str] = Field(default_factory=list, description="List of criteria that define mission success")
    mission_status: MissionStatus = Field(default=MissionStatus.PENDING, description="Status of the mission")

    current_hop: Optional[Hop] = Field(default=None, description="Current hop being designed or executed")
    hop_history: List[Hop] = Field(default_factory=list, description="List of completed hops")
    inputs: List[Asset]
    outputs: List[Asset]
    mission_state: Dict[str, Asset] = Field(default_factory=dict)
    
    # Metadata
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

    async def execute(self, hop_state: Dict[str, Asset], user_id: Optional[int] = None, db: Optional[Any] = None) -> Dict[str, Any]:
        """
        Execute this tool step and return the results.
        
        Args:
            hop_state: Current state of the hop containing all assets
            user_id: User ID for asset persistence (optional)
            db: Database session for asset persistence (optional)
            
        Returns:
            Dict containing the execution results
            
        Raises:
            ToolExecutionError: If tool execution fails
        """
        # Import here to avoid circular imports
        from tools.tool_execution import execute_tool_step, ToolExecutionError
        
        try:
            self.status = ExecutionStatus.RUNNING
            result = await execute_tool_step(self, hop_state, user_id=user_id, db=db)
            self.status = ExecutionStatus.COMPLETED
            return result
        except Exception as e:
            self.status = ExecutionStatus.FAILED
            self.error = str(e)
            raise ToolExecutionError(str(e), self.tool_id)


def validate_tool_chain(steps: List[ToolStep], hop_state: Dict[str, Asset]) -> List[str]:
    """Validate the tool chain returned by the Hop-Implementer.

    Ensures that every tool step references existing assets (or creates them first)
    and that schemas are compatible according to each tool's own validation logic.
    Also validates that the steps form a proper chain where all inputs are satisfied.
    Returns a flat list of validation-error strings (empty list means no errors).
    """
    from tools.tool_registry import TOOL_REGISTRY
    
    errors: List[str] = []
    
    # Track which assets are available at each step based on their roles
    # Start with only INPUT assets - outputs and intermediates are not available until produced!
    available_assets = set()
    input_assets = set()
    output_assets = set()
    intermediate_assets = set()
    
    # Categorize assets by role
    for asset_name, asset in hop_state.items():
        if asset.role == 'input':
            available_assets.add(asset_name)  # Input assets are immediately available
            input_assets.add(asset_name)
        elif asset.role == 'output':
            output_assets.add(asset_name)  # Output assets only available after production
        elif asset.role == 'intermediate':
            intermediate_assets.add(asset_name)  # Intermediate assets only available after creation
        else:
            # Handle assets without explicit roles - treat as intermediate for safety
            intermediate_assets.add(asset_name)
    
    for step_index, step in enumerate(steps):
        tool_def = TOOL_REGISTRY.get(step.tool_id)
        if not tool_def:
            errors.append(f"Tool definition not found for tool_id '{step.tool_id}'")
            continue

        # Track assets that will be created by this step
        step_outputs = set()

        # Validate parameter mapping
        for param_name, mapping in step.parameter_mapping.items():
            # get the tool parameter for the current parameter mapping
            tool_param = next((p for p in tool_def.parameters if p.name == param_name), None)
            if not tool_param:
                errors.append(
                    f"Step '{step.id}': Parameter '{param_name}' not found in tool '{tool_def.id}' definition. "
                    f"Available parameters: {', '.join(p.name for p in tool_def.parameters)}"
                )
                continue
                
            # if the tool parameter is an asset field, we need to check if the asset is available
            if isinstance(mapping, dict) and mapping.get('type') == 'asset_field':
                state_asset_id = mapping.get('state_asset')
                if not state_asset_id:
                    errors.append(f"Step '{step.id}': Missing state_asset in parameter mapping for '{param_name}'")
                    continue
                    
                # Check if asset is available (either in initial state or created by previous steps)
                if state_asset_id not in available_assets:
                    errors.append(
                        f"Step '{step.id}' (step {step_index + 1}): Asset '{state_asset_id}' for parameter '{param_name}' is not available. "
                        f"Available assets at this step: {', '.join(sorted(available_assets))}"
                    )
                    continue

                # Check if asset exists in hop state (for schema validation)
                if state_asset_id not in hop_state:
                    errors.append(
                        f"Step '{step.id}': Asset '{state_asset_id}' for parameter '{param_name}' not found in hop state. "
                        f"Available assets: {', '.join(hop_state.keys())}"
                    )
                    continue
                
                # TODO: Add schema compatibility check here
                # For now, we just check for existence

        # Validate result mapping and track outputs
        for result_name, mapping in step.result_mapping.items():
            # get the tool output for the current result mapping
            tool_output = next((o for o in tool_def.outputs if o.name == result_name), None)
            if not tool_output:
                errors.append(
                    f"Step '{step.id}': Result '{result_name}' not found in tool '{tool_def.id}' definition. "
                    f"Available outputs: {', '.join(o.name for o in tool_def.outputs)}"
                )
                continue
                
            # if the tool output is an asset field, track it as available for subsequent steps
            if isinstance(mapping, dict) and mapping.get('type') == 'asset_field':
                state_asset = mapping.get('state_asset')
                if not state_asset:
                    errors.append(f"Step '{step.id}': Missing state_asset in result mapping for '{result_name}'")
                    continue
                    
                # Add to outputs that will be created by this step
                step_outputs.add(state_asset)
                
                # Check if asset exists in hop state (should exist or be created)
                if state_asset not in hop_state:
                    errors.append(
                        f"Step '{step.id}': Asset '{state_asset}' for result '{result_name}' not found in hop state. "
                        f"Available assets: {', '.join(hop_state.keys())}"
                    )
                    continue

                # TODO: Add schema compatibility check here
                # For now, we just check for existence
        
        # Add this step's outputs to available assets for subsequent steps
        available_assets.update(step_outputs)

    return errors 