"""
Schemas package for Fractal Bot API
"""

from .asset import Asset
from .auth import (
    UserBase,
    UserCreate,
    UserResponse,
    Token,
    TokenData
)

from .chat import (
    MessageRole,
    ChatResponse,
    AgentResponse,
    ChatRequest,
    AssetReference,
    Chat,
    ChatMessage,
    CreateChatMessageRequest,
    CreateChatMessageResponse
 )

from .user_session import (
    UserSession,
    CreateUserSessionRequest,
    UserSessionStatus,
    CreateUserSessionResponse,
    UpdateUserSessionRequest
)

from .asset import (
    Asset,
)

from .newsletter import (
    Newsletter,
    NewsletterExtractionRange,
    NewsletterSummary,
    TimePeriodType
)

from .workflow import (
    Mission,
    MissionStatus,
    HopStatus,
    ToolExecutionStatus,
    Hop,
    ToolStep
)

# Tool handler schema (kept in schemas package to avoid circular deps)
from .tool_handler_schema import (
    ToolExecutionInput,
    ToolExecutionResult,
    ToolExecutionHandler,
)

__all__ = [
    # Auth schemas
    'UserBase',
    'UserCreate',
    'UserResponse',
    'Token',
    'TokenData',
    
    # Chat schemas
    'MessageRole',
    'ChatRequest',
    'ChatResponse',
    'AgentResponse',
    'AssetReference',
    'Chat',
    'ChatMessage',
    'CreateChatMessageRequest',
    'CreateChatMessageResponse',

    # User Session schemas
    'UserSession',
    'CreateUserSessionRequest',
    'UserSessionStatus',
    'CreateUserSessionResponse',
    'UpdateUserSessionRequest',

    # Newsletter schemas
    'Newsletter',
    'NewsletterExtractionRange',
    'NewsletterSummary',
    'TimePeriodType',

    # Asset schemas
    'Asset',

    # Workflow schemas
    'Mission',
    'MissionStatus',
    'HopStatus',
    'ToolExecutionStatus',
    'Hop',
    'ToolStep',

    # Tool handler schemas
    'ToolExecutionInput',
    'ToolExecutionResult',
    'ToolExecutionHandler',
]  