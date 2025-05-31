from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field
from langchain_core.prompts import ChatPromptTemplate
from schemas.chat import Message, MessageRole
from schemas.workflow import Mission
from .base_prompt import BasePrompt
from utils.message_formatter import (
    format_langchain_messages,
    format_messages_for_openai,
    format_assets,
    format_mission
)

class MissionProposal(BaseModel):
    """Structure for a proposed mission"""
    title: str = Field(description="Title of the mission")
    goal: str = Field(description="Main goal of the mission")
    success_criteria: List[str] = Field(description="List of criteria that define mission success")
    inputs: List[str] = Field(description="Required inputs for the mission")
    outputs: List[str] = Field(description="Expected outputs from the mission")
    possible_stage_sequence: List[str] = Field(description="Suggested sequence of stages to complete the mission")

class MissionDefinitionResponse(BaseModel):
    """Structure for mission definition response"""
    response_type: str = Field(description="Type of response: MISSION_DEFINITION or INTERVIEW_QUESTION")
    response_content: str = Field(description="The main response text")
    mission_proposal: Optional[MissionProposal] = Field(default=None, description="Proposed mission structure if response_type is MISSION_DEFINITION")
    information_gaps: Optional[List[str]] = Field(default=None, description="List of information gaps that need to be filled")
    confidence_level: Optional[str] = Field(default=None, description="Confidence level in the mission proposal")

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
- A clear, concise title
- A specific, measurable goal
- Concrete success criteria
- Required inputs
- Expected outputs
- A logical sequence of stages

If information is missing or unclear, use the INTERVIEW_QUESTION response type to ask for clarification.

Current Mission Context:
{mission}

Available Assets:
{available_assets}

Request from User:
{request_for_delegating_agent}"""

        self.user_message_template = """Please help me plan this mission based on the following request:
{request_for_delegating_agent}

Current mission context:
{mission}

Available assets:
{available_assets}"""

    def get_prompt_template(self) -> ChatPromptTemplate:
        """Return a ChatPromptTemplate for mission definition"""
        return ChatPromptTemplate.from_messages([
            ("system", self.system_message),
            ("human", self.user_message_template)
        ])
    
    def get_formatted_messages(
        self,
        message_history: List[Message],
        mission: Mission,
        available_assets: List[Dict[str, Any]] = None,
        request_for_delegating_agent: str = None
    ) -> List[Dict[str, str]]:
        """Get formatted messages for the prompt"""
        # Format available assets and mission using utility functions
        assets_str = format_assets(available_assets)
        mission_str = format_mission(mission)

        # Convert messages to langchain message format
        langchain_messages = format_langchain_messages(message_history)

        # Get the format instructions from the base class
        format_instructions = self.parser.get_format_instructions()

        # Format the messages using the prompt template
        prompt = self.get_prompt_template()
        formatted_messages = prompt.format_messages(
            mission=mission_str,
            messages=langchain_messages,
            available_assets=assets_str,
            request_for_delegating_agent=request_for_delegating_agent,
            format_instructions=format_instructions
        )

        # Convert langchain messages to OpenAI format
        return format_messages_for_openai(formatted_messages) 
    