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
        
        self.system_message = """You are a helpful assistant that coordinates between different specialists to help users achieve their goals and answers questions about their knowledge missions. You have access to the current mission context and can either:
1. Provide a FINAL_ANSWER if you can directly help the user
2. Route to MISSION_SPECIALIST if the request requires mission planning or modification

Always consider the mission's goal and success criteria when determining how to respond."""

        self.user_message_template = """Current Mission Context:
Goal: {mission.goal}
Success Criteria:
{mission.success_criteria}

Inputs Required:
{mission.inputs}

Expected Outputs:
{mission.outputs}

Previous conversation:
{message_history}

User request: {user_input}

{format_instructions}"""

    def get_prompt_template(self) -> ChatPromptTemplate:
        """Return a ChatPromptTemplate for supervisor"""
        return ChatPromptTemplate.from_messages([
            ("system", self.system_message),
            ("human", self.user_message_template)
        ]) 