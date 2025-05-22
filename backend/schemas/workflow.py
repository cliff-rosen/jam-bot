from pydantic import BaseModel, Field
from typing import Dict, Any, Optional, List, Union
from datetime import datetime
from enum import Enum
from .asset import Asset


class WorkflowStatus(str, Enum):
    """Status of a workflow or its components"""
    PENDING = "pending"
    READY = "ready"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class StateVariableType(str, Enum):
    """Type of state variable"""
    ASSET = "asset"  # References an asset
    PRIMITIVE = "primitive"  # Basic type (string, number, boolean)
    OBJECT = "object"  # Complex object
    COLLECTION = "collection"  # Array or map of other types


class StateVariable(BaseModel):
    """Represents a state variable in a workflow"""
    id: str = Field(description="Unique identifier for the state variable")
    name: str = Field(description="Name of the state variable")
    description: str = Field(description="Description of the state variable")
    type: StateVariableType = Field(description="Type of the state variable")
    value: Any = Field(description="Current value of the state variable")
    asset_id: Optional[str] = Field(default=None, description="ID of the associated asset if type is ASSET")
    is_input: bool = Field(default=False, description="Whether this is an input to the workflow")
    is_output: bool = Field(default=False, description="Whether this is an output from the workflow")
    metadata: Dict[str, Any] = Field(default_factory=dict)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class ToolUse(BaseModel):
    """Represents a tool use in a workflow step"""
    id: str = Field(description="Unique identifier for the tool use")
    name: str = Field(description="Name of the tool")
    
    # Maps tool parameter names to state variable IDs
    parameter_mapping: Dict[str, str] = Field(
        description="Maps tool parameter names to state variable IDs that provide their values"
    )
    
    # Maps tool result paths to state variable IDs
    result_mapping: Dict[str, str] = Field(
        description="Maps tool result paths (dot notation) to state variable IDs that will store the results"
    )
    
    # The actual parameters and results after state variable substitution
    parameters: Dict[str, Any] = Field(description="Parameters passed to the tool after state variable substitution")
    results: Any = Field(description="Results from the tool use")
    
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    status: WorkflowStatus = Field(default=WorkflowStatus.PENDING)
    error: Optional[str] = Field(default=None, description="Error message if the tool use failed")


class WorkflowStep(BaseModel):
    """Represents a step in a workflow"""
    id: str = Field(description="Unique identifier for the step")
    name: str = Field(description="Name of the step")
    description: str = Field(description="Description of what the step does")
    status: WorkflowStatus = Field(default=WorkflowStatus.PENDING)
    tool_uses: List[ToolUse] = Field(default_factory=list)
    input_variables: List[str] = Field(description="IDs of state variables used as input")
    output_variables: List[str] = Field(description="IDs of state variables produced as output")
    metadata: Dict[str, Any] = Field(default_factory=dict)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class Workflow(BaseModel):
    """Represents a workflow"""
    id: str = Field(description="Unique identifier for the workflow")
    name: str = Field(description="Name of the workflow")
    description: str = Field(description="Description of the workflow")
    status: WorkflowStatus = Field(default=WorkflowStatus.PENDING)
    steps: List[WorkflowStep] = Field(default_factory=list)
    state_variables: Dict[str, StateVariable] = Field(
        default_factory=dict,
        description="Map of state variable IDs to their definitions"
    )
    input_mapping: Dict[str, str] = Field(
        default_factory=dict,
        description="Maps mission input asset IDs to workflow state variable IDs"
    )
    output_mapping: Dict[str, str] = Field(
        default_factory=dict,
        description="Maps workflow state variable IDs to mission output asset IDs"
    )
    metadata: Dict[str, Any] = Field(default_factory=dict)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class Mission(BaseModel):
    """Represents a mission that can contain multiple workflows"""
    id: str = Field(description="Unique identifier for the mission")
    name: str = Field(description="Name of the mission")
    description: str = Field(description="Description of the mission")
    goal: str = Field(description="The main goal of the mission")
    success_criteria: List[str] = Field(description="List of criteria that define mission success")
    inputs: List[Asset] = Field(description="Input assets required for the mission")
    outputs: List[Asset] = Field(description="Output assets produced by the mission")
    status: WorkflowStatus = Field(default=WorkflowStatus.PENDING)
    workflows: List[Workflow] = Field(default_factory=list)
    metadata: Dict[str, Any] = Field(default_factory=dict)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow) 