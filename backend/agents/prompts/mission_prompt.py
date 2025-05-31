from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from schemas.chat import Message, MessageRole
from schemas.workflow import Mission, Asset
from .base_prompt import BasePrompt
from utils.message_formatter import (
    format_langchain_messages,
    format_messages_for_openai,
    format_assets,
    format_mission
)

class MissionProposal(BaseModel):
    """Structure for a proposed mission"""
    name: str = Field(description="Name of the mission")
    description: str = Field(description="Description of the mission")
    goal: str = Field(description="The main goal of the mission")
    success_criteria: List[str] = Field(description="List of criteria that define mission success")
    inputs: List[Dict[str, Any]] = Field(description="Input assets required for the mission")
    outputs: List[Dict[str, Any]] = Field(description="Output assets produced by the mission")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Additional metadata for the mission")

class MissionDefinitionResponse(BaseModel):
    """Structure for mission definition response"""
    response_type: str = Field(description="Type of response: MISSION_DEFINITION or INTERVIEW_QUESTION")
    response_content: str = Field(description="The main response text added to the conversation")
    mission_proposal: Optional[MissionProposal] = Field(default=None, description="Proposed mission details")
    
class MissionDefinitionPrompt(BasePrompt):
    """Prompt template for mission definition"""
    
    def __init__(self):
        super().__init__(MissionDefinitionResponse)
        
        self.system_message = """You are a mission planning specialist that helps users define and structure their knowledge missions. Your role is to:

1. Understand the user's goals and requirements
2. Identify any missing information needed to create a complete mission plan
3. Create a structured mission proposal with clear goals, success criteria, and stages
4. Ask clarifying questions when needed

When creating a mission proposal, ensure it includes:
- A clear, concise name
- A detailed description
- A specific, measurable goal
- Concrete success criteria
- Required input assets
- Expected output assets

If information is missing or unclear, use the INTERVIEW_QUESTION response type to ask for clarification.

Current Mission Context:
{mission}

Available Assets:
{available_assets}"""

    def get_prompt_template(self) -> ChatPromptTemplate:
        """Return a ChatPromptTemplate for mission definition"""
        return ChatPromptTemplate.from_messages([
            ("system", self.system_message),
            MessagesPlaceholder(variable_name="messages")
        ])
    
    def get_formatted_messages(
        self,
        messages: List[Message],
        mission: Mission,
        available_assets: List[Dict[str, Any]] = None
    ) -> List[Dict[str, str]]:
        """Get formatted messages for the prompt"""
        # Format available assets and mission using utility functions
        assets_str = format_assets(available_assets)
        mission_str = format_mission(mission)

        # Convert messages to langchain message format
        langchain_messages = format_langchain_messages(messages)

        # Get the format instructions from the base class
        format_instructions = self.parser.get_format_instructions()

        # Format the messages using the prompt template
        prompt = self.get_prompt_template()
        formatted_messages = prompt.format_messages(
            mission=mission_str,
            messages=langchain_messages,
            available_assets=assets_str,
            format_instructions=format_instructions
        )

        # Convert langchain messages to OpenAI format
        return format_messages_for_openai(formatted_messages) 
    