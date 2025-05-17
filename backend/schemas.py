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
from .schemas.search import (
    SearchResult,
    URLContent,
    FetchURLsRequest
)
from .schemas.bot import (
    Message,
    MessageRole,
    ChatResponse
)
from .schemas.file import (
    FileBase,
    FileCreate,
    FileUpdate,
    FileResponse,
    FileContentResponse,
    FileImageResponse
)
from .schemas.tool import (
    SchemaValue,
    ToolParameter,
    ToolOutput,
    ToolSignature,
    ToolBase,
    ToolCreate,
    ToolUpdate,
    ToolResponse,
    ParameterSchema,
    OutputSchema
)
from .schemas.workflow import (
    WorkflowCreate,
    WorkflowUpdate,
    WorkflowStepCreate,
    WorkflowVariableCreate,
    WorkflowExecuteRequest,
    WorkflowResponse,
    WorkflowStepResponse,
    WorkflowVariableResponse,
    WorkflowExecuteResponse,
    WorkflowSimpleResponse,
    WorkflowStepSimpleResponse,
    EvaluationConfig,
    EvaluationCondition,
    VariableType,
    Variable
)
from .schemas.prompt import (
    PromptTemplateToken,
    PromptTemplateBase,
    PromptTemplateCreate,
    PromptTemplateUpdate,
    PromptTemplateResponse,
    PromptTemplateTest,
    LLMExecuteRequest,
    LLMExecuteResponse
)
from .schemas.asset import (
    FileType,
    DataType,
    AgentType,
    AgentStatus,
    ActionType,
    ActionButton,
    Asset,
    Agent
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

# Re-export all schemas
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
    
    # File schemas
    'FileBase',
    'FileCreate',
    'FileUpdate',
    'FileResponse',
    'FileContentResponse',
    'FileImageResponse',
    
    # Tool schemas
    'SchemaValue',
    'ToolParameter',
    'ToolOutput',
    'ToolSignature',
    'ToolBase',
    'ToolCreate',
    'ToolUpdate',
    'ToolResponse',
    'ParameterSchema',
    'OutputSchema',
    
    # Workflow schemas
    'WorkflowCreate',
    'WorkflowUpdate',
    'WorkflowStepCreate',
    'WorkflowVariableCreate',
    'WorkflowExecuteRequest',
    'WorkflowResponse',
    'WorkflowStepResponse',
    'WorkflowVariableResponse',
    'WorkflowExecuteResponse',
    'WorkflowSimpleResponse',
    'WorkflowStepSimpleResponse',
    'EvaluationConfig',
    'EvaluationCondition',
    'VariableType',
    'Variable',

    # Prompt template schemas
    'PromptTemplateToken',
    'PromptTemplateBase',
    'PromptTemplateCreate',
    'PromptTemplateUpdate',
    'PromptTemplateResponse',
    'PromptTemplateTest',
    'LLMExecuteRequest',
    'LLMExecuteResponse',

    # Asset schemas
    'FileType',
    'DataType',
    'AgentType',
    'AgentStatus',
    'ActionType',
    'ActionButton',
    'Asset',
    'Agent',

    # Email schemas
    'EmailLabelType',
    'EmailLabel',
    'EmailAttachment',
    'EmailMessage',
    'EmailThread',
    'DateRange',
    'EmailSearchParams',
    'EmailAgentResponse'
] 