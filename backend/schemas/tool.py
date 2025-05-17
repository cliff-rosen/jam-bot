from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from datetime import datetime

class SchemaValue(BaseModel):
    type: str = Field(description="Base type (string, number, boolean, object)")
    description: Optional[str] = None
    is_array: bool = Field(default=False, description="Whether this is an array of the base type")
    fields: Optional[Dict[str, Any]] = Field(None, description="Fields for object type")
    format: Optional[str] = Field(None, description="Format specification")
    content_types: Optional[List[str]] = Field(None, description="Allowed content types")

class ParameterSchema(BaseModel):
    name: str = Field(description="Name of the parameter")
    description: str = Field(description="Description of the parameter")
    value_schema: SchemaValue = Field(description="Schema defining the parameter type and structure")

class OutputSchema(BaseModel):
    name: str = Field(description="Name of the output")
    description: str = Field(description="Description of the output")
    value_schema: SchemaValue = Field(description="Schema defining the output type and structure")

class ToolParameter(BaseModel):
    name: str = Field(description="Name of the parameter")
    description: str = Field(description="Description of the parameter")
    value_schema: SchemaValue = Field(description="Schema defining the parameter type and structure")
    required: bool = Field(default=True, description="Whether the parameter is required")
    default: Optional[Any] = Field(None, description="Default value for the parameter")

class ToolOutput(BaseModel):
    name: str = Field(description="Name of the output")
    description: str = Field(description="Description of the output")
    value_schema: SchemaValue = Field(description="Schema defining the output type and structure")

class ToolSignature(BaseModel):
    parameters: List[ToolParameter]
    outputs: List[ToolOutput]

class ToolBase(BaseModel):
    name: str = Field(description="Name of the tool")
    description: str = Field(description="Description of the tool")
    tool_type: str = Field(description="Type of tool")
    signature: Dict[str, Any] = Field(description="Tool's parameter and output signature")

class ToolCreate(ToolBase):
    pass

class ToolUpdate(BaseModel):
    name: Optional[str] = Field(None, description="New name for the tool")
    description: Optional[str] = Field(None, description="New description for the tool")
    signature: Optional[Dict[str, Any]] = Field(None, description="New signature for the tool")

class ToolResponse(BaseModel):
    tool_id: str = Field(description="Unique identifier for the tool")
    name: str = Field(description="Name of the tool")
    description: str = Field(description="Description of the tool")
    tool_type: str = Field(description="Type of tool")
    signature: Dict[str, Any] = Field(description="Tool's parameter and output signature")
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True 