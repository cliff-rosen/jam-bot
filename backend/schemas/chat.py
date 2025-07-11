from typing import List, Optional, Any, Dict
from pydantic import BaseModel, Field
from datetime import datetime
from enum import Enum
from .workflow import Mission


### BOT REQUEST ###
### CHAT ###


class MessageRole(str, Enum):
    USER = "user"
    ASSISTANT = "assistant"
    SYSTEM = "system"
    TOOL = "tool"
    STATUS = "status"

# Chat persistence models
class Chat(BaseModel):
    """Chat conversation within a user session"""
    id: str = Field(description="Unique identifier for the chat")
    user_session_id: str = Field(description="ID of the parent user session")
    title: Optional[str] = Field(default=None, description="Optional title for the chat")
    chat_metadata: Dict[str, Any] = Field(default_factory=dict, description="Additional chat metadata")
    created_at: datetime = Field(description="When the chat was created")
    updated_at: datetime = Field(description="When the chat was last updated")
    
    # Relationships (populated by services)
    messages: List['ChatMessage'] = Field(default_factory=list, description="Messages in this chat")

class ChatMessage(BaseModel):
    """Individual message within a chat"""
    id: str = Field(description="Unique identifier for the message")
    chat_id: str = Field(description="ID of the parent chat")
    role: MessageRole = Field(description="Role of the message sender")
    content: str = Field(description="Content of the message")
    message_metadata: Dict[str, Any] = Field(default_factory=dict, description="Additional message metadata")
    created_at: datetime = Field(description="When the message was created")
    updated_at: datetime = Field(description="When the message was last updated")

# Chat API Request/Response models
class CreateChatMessageRequest(BaseModel):
    """Request to create a new chat message"""
    role: MessageRole = Field(description="Role of the message sender")
    content: str = Field(description="Content of the message")
    message_metadata: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Optional metadata")

class CreateChatMessageResponse(BaseModel):
    """Response when creating a new chat message"""
    message: ChatMessage = Field(description="Created chat message")

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
    messages: List[ChatMessage] = Field(description="All messages in the conversation")
    payload: Optional[Dict[str, Any]] = Field(
        default_factory=dict,
        description="Optional payload including additional context data"
    )

# class ChatResponse(BaseModel):
# Chat ressponse is either AgentResponse or StatusResponse

class AgentResponse(BaseModel):
    token: str | None = Field(description="The token for the agent")
    response_text: str | None = Field(description="The message from the agent")
    payload: str | object | None = Field(description="The payload from the agent")
    status: str | None = Field(description="The status of the agent")
    error: str | None = Field(description="The error from the agent")
    debug: str | object | None = Field(description="The debug information from the agent")

class StatusResponse(BaseModel):
    status: str = Field(description="The status of the agent")
    payload: str | object | None = Field(description="The payload from the agent")
    error: str | None = Field(description="The error from the agent")
    debug: str | object | None = Field(description="The debug information from the agent")

# Stream response union type for documentation
ChatStreamResponse = AgentResponse | StatusResponse

