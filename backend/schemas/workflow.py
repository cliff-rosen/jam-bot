from pydantic import BaseModel, Field, validator
from typing import Dict, Any, Optional, List, Union, Literal
from datetime import datetime
from enum import Enum
from .asset import Asset
from .tools import ToolDefinition, TOOL_REGISTRY


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


class ExecutionStatus(str, Enum):
    """Status of tool execution"""
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"


class AssetFieldMapping(BaseModel):
    type: Literal["asset_field"] = "asset_field"
    state_asset: str
    path: Optional[str] = None


class LiteralMapping(BaseModel):
    type: Literal["literal"] = "literal"
    value: Any


ParameterMappingValue = Union[AssetFieldMapping, LiteralMapping]


class ToolStep(BaseModel):
    """Represents an atomic unit of work - a single tool execution within a hop"""
    id: str = Field(description="Unique identifier for the tool step")
    tool_id: str = Field(description="Identifier of the tool to execute")
    description: str = Field(description="Description of what this tool step accomplishes")
    
    # Asset mappings within hop state
    parameter_mapping: Dict[str, ParameterMappingValue] = Field(
        description="Maps tool parameters to hop state assets or literals."
    )
    result_mapping: Dict[str, str] = Field(
        description="Maps tool outputs to hop state assets."
    )
    
    status: ExecutionStatus = Field(default=ExecutionStatus.PENDING)
    error: Optional[str] = Field(default=None, description="Error message if the tool execution failed")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    validation_errors: Optional[List[str]] = Field(default=None, description="Schema validation errors")

    @validator('created_at', 'updated_at', pre=True)
    def handle_empty_datetime(cls, v):
        """Handle empty datetime strings from LLM responses"""
        if v == "" or v is None:
            return datetime.utcnow()
        return v

    def validate_schema_compatibility(self, tool: ToolDefinition, hop_state: Dict[str, Asset]) -> List[str]:
        """Validate schema compatibility between tool and assets"""
        errors = []
        
        # Validate input parameters
        for param_name, mapping in self.parameter_mapping.items():
            if isinstance(mapping, AssetFieldMapping):
                asset = hop_state.get(mapping.state_asset)
                if not asset:
                    errors.append(f"Asset {mapping.state_asset} not found in hop state")
                    continue
                
                if not asset.schema:
                    errors.append(f"Asset {mapping.state_asset} has no schema defined")
                    continue
                
                param_schema = next((p for p in tool.parameters if p.name == param_name), None)
                if not param_schema:
                    errors.append(f"Parameter {param_name} not found in tool definition")
                    continue
                
                # Validate asset schema against parameter requirements
                param_errors = tool.validate_input_asset(asset.schema)
                if param_errors:
                    errors.extend([f"Parameter {param_name}: {e}" for e in param_errors])
        
        # Validate output mappings
        for output_name, asset_name in self.result_mapping.items():
            output_schema = next((o for o in tool.outputs if o.name == output_name), None)
            if not output_schema:
                errors.append(f"Output {output_name} not found in tool definition")
                continue
            
            asset = hop_state.get(asset_name)
            if not asset:
                errors.append(f"Asset {asset_name} not found in hop state")
                continue
            
            if not asset.schema:
                errors.append(f"Asset {asset_name} has no schema defined")
                continue
            
            # Validate tool output schema against asset requirements
            output_errors = tool.validate_output_asset(asset.schema)
            if output_errors:
                errors.extend([f"Output {output_name}: {e}" for e in output_errors])
        
        return errors

    def execute(self, hop_state: Dict[str, Asset]) -> List[str]:
        """Execute the tool step and validate results"""
        errors = []
        
        # Get tool definition
        tool = TOOL_REGISTRY.get(self.tool_id)
        if not tool:
            errors.append(f"Tool {self.tool_id} not found in registry")
            return errors
        
        # Validate schema compatibility before execution
        validation_errors = self.validate_schema_compatibility(tool, hop_state)
        if validation_errors:
            errors.extend(validation_errors)
            return errors
        
        # TODO: Implement actual tool execution
        # This would:
        # 1. Map input parameters from hop state
        # 2. Execute the tool
        # 3. Map outputs back to hop state
        # 4. Validate output schemas
        
        return errors


class Hop(BaseModel):
    """Represents a coherent unit of work that transforms input assets into output assets.
    
    A hop may be atomic (single tool) or composite (multiple tools).
    
    Asset Flow:
    1. Input Mapping: External assets → Hop local state
       - Example: {"search_criteria": "mission_asset_123"}
       - Copies/references external assets into hop's state
    
    2. Tool Execution: Tools operate on hop's local state
       - Each tool step reads from and writes to the local state
       - Intermediate results stay within the hop
    
    3. Output Mapping: Hop local state → External assets
       - Example: {"results": "mission_output_asset_456"}
       - Maps local assets back to mission state or output assets
    """
    id: str = Field(description="Unique identifier for the hop")
    name: str = Field(description="Name of the hop")
    description: str = Field(description="Description of what this hop accomplishes")
    
    # Asset mappings
    input_mapping: Dict[str, str] = Field(
        description="Maps local state keys to external asset IDs. Format: {local_key: external_asset_id}"
    )
    state: Dict[str, Asset] = Field(
        default_factory=dict,
        description="Local asset workspace for this hop"
    )
    output_mapping: Dict[str, str] = Field(
        default_factory=dict,
        description="Maps local state keys to external asset IDs. Format: {local_key: external_asset_id}"
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
    current_step_index: int = Field(default=0, description="Index of the currently executing step")
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    @validator('created_at', 'updated_at', pre=True)
    def handle_empty_datetime(cls, v):
        """Handle empty datetime strings from LLM responses"""
        if v == "" or v is None:
            return datetime.utcnow()
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