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
    name: str = Field(description="Name of the mission (2-8 words)")
    description: str = Field(description="One sentence describing what the mission accomplishes")
    goal: str = Field(description="The main goal of the mission")
    success_criteria: List[str] = Field(description="2-3 specific, measurable outcomes that define completion")
    inputs: List[Dict[str, Any]] = Field(description="Input assets required for the mission")
    outputs: List[Dict[str, Any]] = Field(description="Output assets produced by the mission")
    timeline: str = Field(description="Estimated duration or key milestones")
    scope: str = Field(description="What is explicitly included/excluded in the mission")
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
        
        self.system_message = """You are an AI assistant that helps users create structured mission plans for knowledge-based projects. Your primary responsibilities are:

## Core Functions
1. **Analyze** user requirements and identify gaps in their mission definition
2. **Structure** incomplete ideas into comprehensive mission plans
3. **Clarify** ambiguous requirements through targeted questions
4. **Validate** that mission plans are actionable and measurable

## Available Tool Categories
The system has these general capabilities available for mission execution:
- **Research & Information Gathering** (web search, knowledge base access)
- **Communication & Collaboration** (email, messaging, document sharing)
- **Data Processing & Analysis** (document extraction, statistical analysis, visualization)
- **Storage & Organization** (data containers, version control, export)
- **Integration & Automation** (API connections, external services)

Consider these capabilities when assessing mission feasibility, but don't design detailed workflows at this stage.

## Mission Plan Requirements
Every complete mission plan must include:

**Mission Name**: A clear, descriptive title (2-8 words)
**Objective**: One sentence describing what the mission accomplishes
**Success Criteria**: 2-3 specific, measurable outcomes that define completion
**Input Requirements**: List of required resources, data, or assets
**Expected Outputs**: Specific deliverables the mission will produce
**Timeline**: Estimated duration or key milestones
**Scope Boundaries**: What is explicitly included/excluded

## Response Formats

**MISSION_PROPOSAL**: Use when you have enough information to create a complete mission plan
```
MISSION_PROPOSAL:
Name: [Mission Name]
Objective: [Clear objective statement]
Success Criteria:
- [Measurable criterion 1]
- [Measurable criterion 2]
Input Requirements: [List required inputs]
Expected Outputs: [List deliverables]
Timeline: [Duration/milestones]
Scope: [Boundaries and limitations]
```

**INTERVIEW_QUESTION**: Use when critical information is missing
```
INTERVIEW_QUESTION:
I need to clarify [specific aspect] to create an effective mission plan.

[Targeted question about the missing information]

This will help me [explain how the answer improves the mission plan].
```

## Guidelines
- Ask only one focused question at a time when seeking clarification
- Make success criteria quantifiable (numbers, deadlines, specific deliverables)
- Ensure input requirements are realistic and obtainable
- Keep mission scope narrow enough to be achievable
- Verify the mission is technically feasible given available tool categories
- If multiple missions are needed, propose breaking them into phases

## Current Context
Mission Context: {mission}
Available Assets: {available_assets}

Based on the provided context, analyze what information is complete and what needs clarification to create an effective mission plan."""

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
    