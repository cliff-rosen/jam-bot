from pydantic import BaseModel, Field
from typing import Dict, Any, Optional, List
from datetime import datetime
from enum import Enum


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

class BotRequest(BaseModel):
    message: str
    history: List[Message]

class ChatResponse(BaseModel):
    message: Message = Field(description="The bot's response message")
    sideEffects: Optional[Dict[str, Any]] = Field(
        default_factory=dict,
        description="Optional side effects from the bot's response"
    )
