from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from datetime import datetime
from enum import Enum

class ToolExecutionStatus(str, Enum):
    """Status of a tool execution"""
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"

class CreateToolExecutionRequest(BaseModel):
    """Request to create a tool execution"""
    tool_step: Dict[str, Any] = Field(description="Tool step configuration")
    hop_state: Dict[str, Any] = Field(description="Current hop state with assets")
    mission_id: Optional[str] = Field(None, description="Optional mission ID")

class CreateToolExecutionResponse(BaseModel):
    """Response from creating a tool execution"""
    execution_id: str = Field(description="Unique tool execution ID")

class ToolExecutionResponse(BaseModel):
    """Response from a tool execution"""
    success: bool = Field(description="Whether the execution was successful")
    errors: list[str] = Field(default=[], description="List of error messages")
    outputs: Dict[str, Any] = Field(default={}, description="Tool execution outputs")
    canonical_outputs: Optional[Dict[str, Any]] = Field(None, description="Canonical typed outputs")
    metadata: Optional[Dict[str, Any]] = Field(None, description="Additional metadata")

class ToolExecutionStatusResponse(BaseModel):
    """Response for tool execution status"""
    id: str = Field(description="Tool execution ID")
    tool_id: str = Field(description="Tool ID")
    step_id: str = Field(description="Step ID")
    status: ToolExecutionStatus = Field(description="Current status")
    error_message: Optional[str] = Field(None, description="Error message if failed")
    execution_result: Optional[ToolExecutionResponse] = Field(None, description="Execution result if completed")
    created_at: datetime = Field(description="Creation timestamp")
    started_at: Optional[datetime] = Field(None, description="Start timestamp")
    completed_at: Optional[datetime] = Field(None, description="Completion timestamp") 