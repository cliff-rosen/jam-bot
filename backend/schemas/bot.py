from pydantic import BaseModel, Field
from typing import Dict, Any, Optional, List
from datetime import datetime
from enum import Enum

### ASSETS ###
class Asset(BaseModel):
    id: str
    name: str
    type: str
    status: str
    content: Any
    createdAt: str
    updatedAt: str
    version: int

### TOOLS ###

class Schema(BaseModel):
    type: str
    is_array: bool
    description: str
    fields: Optional[Dict[str, Any]] = None
    format: Optional[str] = None
    content_types: Optional[List[str]] = None

class WorkflowVariable(BaseModel):
    variable_id: str
    name: str
    schema: Schema
    value: Optional[Any] = None
    description: Optional[str] = None
    io_type: str
    required: Optional[bool] = None

class ToolIO(BaseModel):
    name: str
    description: str = ""
    schema: Schema
    required: bool = False

class Tool(BaseModel):
    id: str
    name: str
    description: str
    category: str
    inputs: List[ToolIO]
    outputs: List[ToolIO]
    steps: Optional[List[Any]] = None

class ToolStep(BaseModel):
    name: str
    description: str
    tool_id: str
    # ToolStep IOs should use ToolIO or be omitted if not needed

### WORKFLOW ###

class Step(BaseModel):
    id: str
    name: str
    description: str
    status: str
    assets: Dict[str, List[str]] = Field(default_factory=dict)
    inputs: List[WorkflowVariable]
    outputs: List[WorkflowVariable]
    tool: Optional[Tool] = None
    substeps: Optional[List['Step']] = None
    createdAt: str
    updatedAt: str
    type: Optional[str] = None
    tool_id: Optional[str] = None
    isSubstep: Optional[bool] = None
    state: List[WorkflowVariable]

class Stage(BaseModel):
    id: str
    name: str
    description: str
    status: str
    steps: List[Step]
    state: List[WorkflowVariable]
    success_criteria: List[str] = Field(default_factory=list, description="Measurable conditions that verify stage completion")
    createdAt: str
    updatedAt: str

class Workflow(BaseModel):
    id: str
    name: str
    description: str
    status: str
    stages: List[Stage]
    state: List[WorkflowVariable]
    inputMappings: List[Any] = []
    outputMappings: List[Any] = []
    createdAt: str
    updatedAt: str

class Mission(BaseModel):
    id: str
    title: str
    goal: str
    status: str
    workflow: Workflow
    state: List[WorkflowVariable]
    inputMappings: List[Any] = []
    outputMappings: List[Any] = []
    resources: List[str]
    success_criteria: List[str] = Field(default_factory=list, description="Measurable conditions that verify mission completion")
    selectedTools: List[Tool] = Field(default_factory=list, description="Tools selected for this mission")
    createdAt: str
    updatedAt: str

class MissionProposal(BaseModel):
    title: str
    goal: str
    state: List[WorkflowVariable]
    inputMappings: List[Any] = []
    outputMappings: List[Any] = []
    resources: List[str] = Field(default_factory=list)
    success_criteria: List[str]
    selectedTools: List[Tool] = Field(default_factory=list)
    has_sufficient_info: bool
    missing_info_explanation: str

class StageProposal(BaseModel):
    id: str
    name: str
    description: str
    state: List[WorkflowVariable]
    success_criteria: List[str] = Field(default_factory=list, description="Measurable conditions that verify stage completion")

### BOT REQUEST ###
### CHAT ###

class MessageRole(str, Enum):
    USER = "user"
    ASSISTANT = "assistant"
    SYSTEM = "system"

class Message(BaseModel):
    id: str = Field(description="Unique identifier for the message")
    role: MessageRole = Field(description="Role of the message sender (user/assistant/system)")
    content: str = Field(description="Content of the message")
    timestamp: str = Field(description="When the message was sent in ISO format")
    metadata: Optional[Dict[str, Any]] = Field(
        default_factory=dict,
        description="Optional metadata for the message including missionId, stageId, stepId, or assetId"
    )

    @classmethod
    def create(cls, **data):
        if 'timestamp' not in data:
            data['timestamp'] = datetime.utcnow().isoformat()
        elif isinstance(data['timestamp'], datetime):
            data['timestamp'] = data['timestamp'].isoformat()
        return cls(**data)

class ChatResponse(BaseModel):
    message: Message = Field(description="The bot's response message")
    sideEffects: Optional[Dict[str, Any]] = Field(
        default_factory=dict,
        description="Optional side effects from the bot's response"
    )

class MessageHistory(BaseModel):
    role: str
    content: str
    timestamp: datetime

class BaseMessage(BaseModel):
    role: str
    content: str
    timestamp: datetime

class BotRequest(BaseModel):
    message: str
    history: List[MessageHistory]
