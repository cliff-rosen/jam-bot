from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from schemas.chat import Message, MessageRole
from schemas.workflow import Mission, Asset, Hop
from .base_prompt import BasePrompt
from .mission_prompt import AssetLite
from utils.message_formatter import (
    format_langchain_messages,
    format_messages_for_openai,
    format_assets,
    format_mission
)


class HopProposal(BaseModel):
    """Structure for a proposed hop"""
    name: str = Field(description="Name of the hop (e.g., 'Extract Email Data', 'Generate Summary Report')")
    description: str = Field(description="Clear description of what this hop accomplishes")
    input_assets: List[str] = Field(description="Names of existing assets that will be used as input")
    output_asset: AssetLite = Field(description="The asset that will be produced by this hop")
    is_final: bool = Field(description="Whether this hop produces the final deliverable")
    rationale: str = Field(description="Explanation of why this is the right next step")
    alternative_approaches: Optional[List[str]] = Field(default=None, description="Other approaches considered")


class HopDesignResponse(BaseModel):
    """Structure for hop design response"""
    response_type: str = Field(description="Type of response: HOP_PROPOSAL or INTERVIEW_QUESTION")
    response_content: str = Field(description="The main response text to add to the conversation")
    hop_proposal: Optional[HopProposal] = Field(default=None, description="Proposed hop details")
    reasoning: Optional[str] = Field(default=None, description="Detailed reasoning about the hop design")


class HopDesignerPrompt(BasePrompt):
    """Prompt template for hop design"""
    
    def __init__(self):
        super().__init__(HopDesignResponse)
        
        self.system_message = """You are an AI assistant that designs incremental steps (hops) to accomplish missions. Your role is to analyze the current state and propose the next logical step toward completing the mission.

## Core Functions
1. **Analyze** the mission goal and current progress
2. **Identify** what assets are available and what's still needed
3. **Design** the next hop that moves closer to the goal
4. **Validate** that the hop is achievable with available tools

## Hop Design Principles
1. **Incremental Progress**: Each hop should make meaningful progress toward the goal
2. **Clear Inputs/Outputs**: Specify exactly what assets are needed and what will be produced
3. **Tool Availability**: Consider what tools are available (search, extraction, storage, summarization)
4. **Logical Sequencing**: Each hop should build on previous results
5. **Final Deliverable**: Identify when a hop will produce the final mission output

## Available Tool Categories
- **Search & Discovery**: Find emails, documents, or information
- **Data Extraction**: Extract structured data from unstructured sources
- **Data Storage**: Store extracted information for later use
- **Analysis & Summarization**: Analyze and summarize collected data
- **Report Generation**: Create formatted reports or outputs

## Response Formats

**HOP_PROPOSAL**: Use when you can design a clear next step
```
HOP_PROPOSAL:
Next Hop: [Name of the hop]
Purpose: [What this hop accomplishes]

Inputs:
- [Asset 1]: [How it will be used]
- [Asset 2]: [How it will be used]

Output:
- Name: [Output asset name]
- Type: [Asset type]
- Description: [What this asset contains]

Is Final: [Yes/No - whether this produces the final deliverable]

Rationale: [Why this is the right next step]
```

**INTERVIEW_QUESTION**: Use when you need clarification
```
INTERVIEW_QUESTION:
To design the most effective next step, I need to understand [specific aspect].

[Targeted question]

This will help me [explain how the answer improves the hop design].
```

## Hop Design Process
1. Review the mission goal and success criteria
2. Inventory available assets (what we have so far)
3. Identify the gap between current state and goal
4. Design a hop that addresses the most logical next piece
5. Ensure the hop output is clearly defined and useful

## Guidelines
- Make hops atomic and focused on a single objective
- Ensure each hop has clear, measurable outputs
- Consider dependencies between hops
- Prefer hops that can be fully automated
- Design for reusability when possible
- Think about error cases and data quality

## Current Context
Mission: {mission}
Available Assets: {available_assets}
Completed Hops: {completed_hops}

Based on this context, design the next hop that will move us closer to completing the mission."""

    def get_prompt_template(self) -> ChatPromptTemplate:
        """Return a ChatPromptTemplate for hop design"""
        return ChatPromptTemplate.from_messages([
            ("system", self.system_message),
            MessagesPlaceholder(variable_name="messages")
        ])
    
    def get_formatted_messages(
        self,
        messages: List[Message],
        mission: Mission,
        available_assets: List[Dict[str, Any]] = None,
        completed_hops: List[Hop] = None
    ) -> List[Dict[str, str]]:
        """Get formatted messages for the prompt"""
        # Format available assets and mission using utility functions
        assets_str = format_assets(available_assets)
        mission_str = format_mission(mission)
        
        # Format completed hops
        hops_str = "None" if not completed_hops else "\n".join([
            f"- {hop.name}: {hop.description} (Output: {hop.output_asset.name})"
            for hop in completed_hops
        ])

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
            completed_hops=hops_str,
            format_instructions=format_instructions
        )

        # Convert langchain messages to OpenAI format
        return format_messages_for_openai(formatted_messages) 