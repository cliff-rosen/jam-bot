from pydantic import BaseModel, EmailStr, Field, ConfigDict
from datetime import datetime
from typing import Optional, List, Dict, Any, Union, Literal
from enum import Enum
import base64
import json
from pydantic import field_validator

# Import schemas from modules
from .schemas.auth import (
    UserBase,
    UserCreate,
    UserResponse,
    Token,
    TokenData
)
from .schemas.asset import (
    FileType,
    DataType,
    Asset,
    AssetType,
    CollectionType,
)
from .schemas.email import (
    EmailLabelType,
    EmailLabel,
    EmailAttachment,
    EmailMessage,
    EmailThread,
    DateRange,
    EmailSearchParams,
    EmailAgentResponse
)
from .schemas.chat import (
    Message,
    MessageRole,
    ChatResponse
)
from .schemas.newsletter import (
    Newsletter,
    NewsletterExtractionRange,
    NewsletterSummary,
    TimePeriodType
)

# # Re-export all schemas
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
    
     # Asset schemas
    'FileType',
    'DataType',
    'AssetType',
    'CollectionType',
    'Asset',

    # Email schemas
    'EmailLabelType',
    'EmailLabel',
    'EmailAttachment',
    'EmailMessage',
    'EmailThread',
    'DateRange',
    'EmailSearchParams',
    'EmailAgentResponse',

    # Newsletter schemas
    'Newsletter',
    'NewsletterExtractionRange',
    'NewsletterSummary',
    'TimePeriodType',

    
    # # Prompt template schemas
    # 'PromptTemplateToken',
    # 'PromptTemplateBase',
    # 'PromptTemplateCreate',
    # 'PromptTemplateUpdate',
    # 'PromptTemplateResponse',
    # 'PromptTemplateTest',
    # 'LLMExecuteRequest',
    # 'LLMExecuteResponse',

    # # Tool schemas
    # 'SchemaValue',
    # 'ToolParameter',
    # 'ToolOutput',
    # 'ToolSignature',
    # 'ToolBase',
    # 'ToolCreate',
    # 'ToolUpdate',
    # 'ToolResponse',
    # 'ParameterSchema',
    # 'OutputSchema',
    
    # # Workflow schemas
    # 'WorkflowCreate',
    # 'WorkflowUpdate',
    # 'WorkflowStepCreate',
    # 'WorkflowVariableCreate',
    # 'WorkflowExecuteRequest',
    # 'WorkflowResponse',
    # 'WorkflowStepResponse',
    # 'WorkflowVariableResponse',
    # 'WorkflowExecuteResponse',
    # 'WorkflowSimpleResponse',
    # 'WorkflowStepSimpleResponse',
    # 'EvaluationConfig',
    # 'EvaluationCondition',
    # 'VariableType',
    # 'Variable',

    # # File schemas
    # 'FileBase',
    # 'FileCreate',
    # 'FileUpdate',
    # 'FileResponse',
    # 'FileContentResponse',
    # 'FileImageResponse',

] 