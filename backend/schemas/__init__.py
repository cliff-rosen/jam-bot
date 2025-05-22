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
    Message,
    MessageRole,
    ChatResponse,
    AgentResponse,
    ChatRequest,
    AssetReference
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
    WorkflowStatus,
    Workflow,
    Mission
)

__all__ = [
    # Auth schemas
    'UserBase',
    'UserCreate',
    'UserResponse',
    'Token',
    'TokenData',
    
    # Chat schemas
    'Message',
    'MessageRole',
    'ChatRequest',
    'ChatResponse',
    'AgentResponse',
    'AssetReference',

    # Newsletter schemas
    'Newsletter',
    'NewsletterExtractionRange',
    'NewsletterSummary',
    'TimePeriodType',

    # Asset schemas
    'Asset',

    # Workflow schemas
    'WorkflowStatus',
    'Workflow',
    'Mission'
]  