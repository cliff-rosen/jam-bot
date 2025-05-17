"""
Schemas package for Fractal Bot API
"""

from .search import SearchResult, URLContent, FetchURLsRequest
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
    Asset,
    Step,
    Stage,
    Workflow,
    Mission,
    BotRequest,
    Tool
)

from .file import (
    FileBase,
    FileCreate,
    FileUpdate,
    FileResponse,
    FileContentResponse,
    FileImageResponse
)

from .tool import (
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

from .workflow import (
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
    SchemaValue as WorkflowSchemaValue,
    EvaluationConfig,
    EvaluationCondition,
    VariableType,
    Variable
)

from .prompt import (
    PromptTemplateToken,
    PromptTemplateBase,
    PromptTemplateCreate,
    PromptTemplateUpdate,
    PromptTemplateResponse,
    PromptTemplateTest,
    LLMExecuteRequest,
    LLMExecuteResponse
)

from .asset import (
    FileType,
    AgentType,
    AgentStatus,
    ActionType,
    ActionButton,
    Asset,
    Agent
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
    'WorkflowSchemaValue',
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
    'AgentType',
    'AgentStatus',
    'ActionType',
    'ActionButton',
    'Asset',
    'Agent'

    #Bot schemas
    'Mission',
    'Workflow',
    'Step',
    'Stage',
    'Asset',
    'BotRequest',
    'Tool'
]  