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

from .bot import (
    Message,
    MessageRole,
    ChatResponse,
    BotRequest
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

__all__ = [
    # Auth schemas
    'UserBase',
    'UserCreate',
    'UserResponse',
    'Token',
    'TokenData',
    
    # Bot schemas
    'Message',
    'MessageRole',
    'ChatResponse',
    'BotRequest',

    # Newsletter schemas
    'Newsletter',
    'NewsletterExtractionRange',
    'NewsletterSummary',
    'TimePeriodType',

    # Asset schemas
    'Asset',
]  