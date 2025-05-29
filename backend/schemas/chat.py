from pydantic import BaseModel, Field
from typing import Dict, Any, Optional, List
from datetime import datetime
from enum import Enum
from .workflow import WorkflowStatus, Workflow, Mission


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

    @classmethod
    def create(cls, **data):
        if 'timestamp' not in data:
            data['timestamp'] = datetime.utcnow().isoformat()
        elif isinstance(data['timestamp'], datetime):
            data['timestamp'] = data['timestamp'].isoformat()
        return cls(**data)

class AssetReference(BaseModel):
    """Lightweight asset reference for chat requests"""
    id: str = Field(description="Unique identifier for the asset")
    name: str = Field(description="Name of the asset")
    description: str = Field(description="Description of the asset")
    type: str = Field(description="Type of the asset")
    metadata: Optional[Dict[str, Any]] = Field(
        default_factory=dict,
        description="Optional metadata for the asset"
    )

class ChatRequest(BaseModel):
    message: str = Field(description="The message content")
    history: List[Message] = Field(description="Previous messages in the conversation")
    payload: Optional[Dict[str, Any]] = Field(
        default_factory=dict,
        description="Optional payload including assets, workflow info, and context"
    )

class ChatResponse(BaseModel):
    message: Message = Field(description="The bot's response message")
    payload: Optional[Dict[str, Any]] = Field(
        default_factory=dict,
        description="Optional payload including assets, workflow info, and context"
    )

class AgentResponse(BaseModel):
    token: str | None = Field(description="The token for the agent")
    message: str | None = Field(description="The message from the agent")
    status: str | None = Field(description="The status of the agent")
    payload: str | object | None = Field(description="The payload from the agent")
    error: str | None = Field(description="The error from the agent")
    debug: str | object | None = Field(description="The debug information from the agent")

class StatusResponse(BaseModel):
    status: str = Field(description="The status of the agent")
    payload: str | object | None = Field(description="The payload from the agent")
    error: str | None = Field(description="The error from the agent")
    debug: str | object | None = Field(description="The debug information from the agent")

