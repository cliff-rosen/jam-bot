from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional, Union
from datetime import datetime
from enum import Enum
from .asset import Asset

class HopStatus(str, Enum):
    """Status of a hop in the workflow"""
    PLANNING = "planning"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    ERROR = "error"

class HopStep(BaseModel):
    """A single step within a hop"""
    id: str
    title: str
    description: Optional[str] = None
    action: str  # The action to perform
    parameters: Dict[str, Any] = Field(default_factory=dict)
    status: HopStatus = HopStatus.PLANNING
    error: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class Hop(BaseModel):
    """A mini-workflow that transforms inputs into outputs"""
    id: str
    title: str
    description: Optional[str] = None
    input_assets: List[str] = Field(default_factory=list)  # List of asset IDs
    output_assets: List[str] = Field(default_factory=list)  # List of asset IDs
    steps: List[HopStep] = Field(default_factory=list)
    status: HopStatus = HopStatus.PLANNING
    error: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class WorkflowStatus(str, Enum):
    """Status of the overall workflow"""
    DRAFT = "draft"
    ACTIVE = "active"
    COMPLETED = "completed"
    ERROR = "error"
    ARCHIVED = "archived"

class Workflow(BaseModel):
    """A workflow consisting of multiple hops"""
    id: str
    title: str
    description: Optional[str] = None
    hops: List[Hop] = Field(default_factory=list)
    status: WorkflowStatus = WorkflowStatus.DRAFT
    error: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    workflow_metadata: Dict[str, Any] = Field(default_factory=dict)

    class Config:
        from_attributes = True 