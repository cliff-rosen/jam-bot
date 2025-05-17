from pydantic import BaseModel, Field, ConfigDict
from typing import List, Dict, Any, Optional, Literal
from datetime import datetime

class PromptTemplateToken(BaseModel):
    """Schema for a prompt template token"""
    name: str = Field(description="Name of the token")
    type: Literal["string", "file"] = Field(description="Type of the token")

class PromptTemplateBase(BaseModel):
    """Base schema for prompt templates"""
    name: str = Field(description="Name of the template")
    description: Optional[str] = Field(None, description="Description of the template")
    user_message_template: str = Field(description="The user message template text")
    system_message_template: Optional[str] = Field(None, description="Optional system message template")
    tokens: List[PromptTemplateToken] = Field(description="List of tokens in the template", default_factory=list)
    output_schema: Dict[str, Any] = Field(description="Schema for the expected output")

class PromptTemplateCreate(PromptTemplateBase):
    """Schema for creating a new prompt template"""
    pass

class PromptTemplateUpdate(PromptTemplateBase):
    """Schema for updating an existing prompt template"""
    pass

class PromptTemplateResponse(PromptTemplateBase):
    """Schema for prompt template responses"""
    template_id: str = Field(description="Unique identifier for the template")
    created_at: datetime = Field(description="When the template was created")
    updated_at: datetime = Field(description="When the template was last updated")

    model_config = ConfigDict(from_attributes=True)

class PromptTemplateTest(BaseModel):
    """Schema for testing a prompt template"""
    user_message_template: str = Field(description="The user message template to test")
    system_message_template: Optional[str] = Field(None, description="Optional system message template to test")
    tokens: List[Dict[str, str]] = Field(description="List of tokens in the template")
    parameters: Dict[str, Any] = Field(description="Values for the template tokens")
    output_schema: Dict[str, Any] = Field(description="Expected output schema")

class LLMExecuteRequest(BaseModel):
    """Schema for executing an LLM with a prompt template"""
    prompt_template_id: str = Field(description="ID of the prompt template to use")
    regular_variables: Dict[str, Any] = Field(description="Values for regular variables")
    file_variables: Dict[str, str] = Field(description="File IDs for file variables")
    model: Optional[str] = Field(None, description="Optional model override")
    max_tokens: Optional[int] = Field(None, description="Optional max tokens override")

class LLMExecuteResponse(BaseModel):
    """Schema for LLM execution response"""
    template_id: Optional[str] = Field(None, description="ID of the template used, if any")
    messages: List[Dict[str, Any]]
    response: Any 