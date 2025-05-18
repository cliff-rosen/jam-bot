from typing import Dict, Any, List
from pydantic import BaseModel, Field
from langchain_core.prompts import ChatPromptTemplate
from .base_prompt import BasePrompt

class SupervisorResponse(BaseModel):
    """Structure for supervisor's response"""
    response_type: str = Field(description="Type of response: FINAL_ANSWER, MISSION_SPECIALIST, or WORKFLOW_SPECIALIST")
    response_content: str = Field(description="Content of the response - either direct answer or specialist request summary")

class SupervisorPrompt(BasePrompt):
    """Prompt template for supervisor"""
    
    def __init__(self):
        super().__init__(SupervisorResponse)
        
        self.system_message = """You are a helpful assistant. Always answer with a helpful response_content and response_type: FINAL_ANSWER for now."""

        self.user_message_template = """Previous conversation:
{message_history}

User request: {user_input}

{format_instructions}"""

    def get_prompt_template(self) -> ChatPromptTemplate:
        """Return a ChatPromptTemplate for supervisor"""
        return ChatPromptTemplate.from_messages([
            ("system", self.system_message),
            ("human", self.user_message_template)
        ]) 