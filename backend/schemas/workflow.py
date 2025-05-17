from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum

class VariableType(str, Enum):
    STRING = "string"
    NUMBER = "number"
    BOOLEAN = "boolean"
    FILE = "file"
    OBJECT = "object"

class SchemaValue(BaseModel):
    type: str = Field(description="Base type (string, number, boolean, object)")
    description: Optional[str] = None
    is_array: bool = Field(default=False, description="Whether this is an array of the base type")
    fields: Optional[Dict[str, Any]] = Field(None, description="Fields for object type")
    format: Optional[str] = Field(None, description="Format specification")
    content_types: Optional[List[str]] = Field(None, description="Allowed content types")

class Variable(BaseModel):
    name: str = Field(description="Name of the variable")
    type: VariableType = Field(description="Type of the variable")
    description: Optional[str] = Field(None, description="Description of the variable")
    required: bool = Field(default=True, description="Whether the variable is required")
    value_schema: SchemaValue = Field(description="Schema defining the variable type and structure")

class EvaluationCondition(BaseModel):
    condition_id: str = Field(description="Unique identifier for the condition")
    variable: str = Field(description="Name of the variable to evaluate")
    operator: str = Field(description="Comparison operator")
    value: Any = Field(description="Value to compare against")
    target_step_index: Optional[int] = Field(None, description="Step to jump to if condition is met")

class EvaluationConfig(BaseModel):
    conditions: List[EvaluationCondition] = Field(description="List of conditions to evaluate")
    default_action: str = Field(description="What to do if no conditions match")
    maximum_jumps: int = Field(default=1, ge=0, description="Maximum number of times conditions will be checked before forcing continue")

class WorkflowStepCreate(BaseModel):
    label: str
    description: Optional[str] = None
    step_type: str
    tool_id: Optional[str] = None
    prompt_template_id: Optional[str] = None
    parameter_mappings: Optional[dict] = None
    output_mappings: Optional[dict] = None
    evaluation_config: Optional[EvaluationConfig] = None
    sequence_number: int

class WorkflowVariableCreate(BaseModel):
    variable_id: str
    name: str
    value_schema: SchemaValue
    io_type: str

class WorkflowCreate(BaseModel):
    name: str
    description: Optional[str] = None
    status: str
    steps: Optional[List[WorkflowStepCreate]] = None
    state: Optional[List[WorkflowVariableCreate]] = None

    class Config:
        from_attributes = True

class WorkflowUpdate(BaseModel):
    name: Optional[str] = Field(None, description="New name for the workflow")
    description: Optional[str] = Field(None, description="New description for the workflow")
    status: Optional[str] = Field(None, description="New status for the workflow")
    steps: Optional[List[WorkflowStepCreate]] = Field(None, description="Updated steps for the workflow")
    state: Optional[List[WorkflowVariableCreate]] = Field(None, description="Updated state variables for the workflow")

class WorkflowStepResponse(WorkflowStepCreate):
    step_id: str
    workflow_id: str
    created_at: datetime
    updated_at: datetime
    tool: Optional[Any] = None

    class Config:
        from_attributes = True

class WorkflowVariableResponse(BaseModel):
    variable_id: str
    workflow_id: str
    name: str
    description: Optional[str] = None
    value_schema: SchemaValue
    io_type: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class WorkflowResponse(BaseModel):
    workflow_id: str
    user_id: int
    name: str
    description: Optional[str] = None
    status: str
    error: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    steps: List[WorkflowStepResponse] = Field(default_factory=list)
    state: List[WorkflowVariableResponse] = Field(default_factory=list)

    class Config:
        from_attributes = True

class WorkflowStepSimpleResponse(BaseModel):
    step_id: str
    workflow_id: str
    label: str
    description: str
    step_type: str
    sequence_number: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class WorkflowSimpleResponse(BaseModel):
    workflow_id: str
    user_id: int
    name: str
    description: Optional[str] = None
    status: str
    error: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    steps: List[WorkflowStepSimpleResponse] = Field(default_factory=list)

    class Config:
        from_attributes = True

class WorkflowExecuteRequest(BaseModel):
    input_data: Dict[str, Any] = Field(description="Input data for the workflow")

class WorkflowExecuteResponse(BaseModel):
    workflow_id: str = Field(description="ID of the executed workflow")
    status: str = Field(description="Execution status")
    output: Dict[str, Any] = Field(description="Output data from the workflow")
    error: Optional[str] = Field(None, description="Error message if execution failed")
    execution_time: float = Field(description="Time taken to execute the workflow in seconds")

    class Config:
        from_attributes = True 