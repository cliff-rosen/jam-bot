from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field
from langchain_core.prompts import ChatPromptTemplate
from .base_prompt import BasePrompt

class MissionProposal(BaseModel):
    """Structure for a proposed mission"""
    title: str = Field(description="Title of the proposed mission")
    goal: str = Field(description="Clear statement of what the mission aims to achieve")
    success_criteria: List[str] = Field(description="List of measurable criteria that define mission success")
    required_inputs: List[str] = Field(description="List of inputs needed to complete the mission")
    expected_outputs: List[str] = Field(description="List of expected outputs from the mission")
    estimated_complexity: str = Field(description="Estimated complexity level (Low/Medium/High)")
    estimated_duration: str = Field(description="Estimated time to complete the mission")

class MissionDefinitionResponse(BaseModel):
    """Structure for mission definition response"""
    response_type: str = Field(description="Type of response: MISSION_DEFINITION or INTERVIEW_QUESTION")
    response_content: str = Field(description="Content of the response - either mission definition or interview question")
    mission_proposal: Optional[MissionProposal] = Field(description="Optional mission proposal if enough information is gathered")
    information_gaps: Optional[List[str]] = Field(description="List of information gaps that need to be filled")
    confidence_level: Optional[str] = Field(description="Confidence level in the mission proposal (Low/Medium/High)")

class MissionDefinitionPrompt(BasePrompt):
    """Prompt template for mission definition"""
    
    def __init__(self):
        super().__init__(MissionDefinitionResponse)
        
        self.system_message = """You are an expert mission planner and interviewer. Your role is to help users define clear, actionable missions by:

1. Understanding the significance of missions:
   - Missions are structured objectives that guide AI agents and users toward specific goals
   - They provide clear success criteria and expected outcomes
   - They help organize complex tasks into manageable steps

2. Conducting a thorough interview process:
   - Ask targeted questions to gather essential information
   - Identify gaps in understanding and information
   - Build context gradually through conversation
   - Ensure all critical aspects of the mission are defined

3. Creating comprehensive mission proposals:
   - Only propose a mission when you have sufficient information
   - Include clear goals, success criteria, and expected outputs
   - Specify required inputs and resources
   - Estimate complexity and duration

Your responses should either:
1. Ask clarifying questions to gather more information
2. Propose a complete mission when you have enough details

Always maintain a professional, curious, and methodical approach to gathering information."""

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