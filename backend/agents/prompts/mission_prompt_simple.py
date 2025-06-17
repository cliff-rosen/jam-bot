from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field
from schemas.chat import Message
from schemas.workflow import Mission
from schemas.lite_models import AssetLite, MissionLite, create_mission_from_lite
from tools.tool_registry import format_tool_descriptions_for_mission_design
from utils.message_formatter import format_assets, format_mission
from .base_prompt_caller import BasePromptCaller
from datetime import datetime

class MissionDefinitionResponse(BaseModel):
    """Structure for mission definition response"""
    response_type: str = Field(description="Type of response: MISSION_DEFINITION or INTERVIEW_QUESTION")
    response_content: str = Field(description="The main response text added to the conversation")
    mission_proposal: Optional[MissionLite] = Field(default=None, description="Proposed mission details")

class MissionDefinitionPromptCaller(BasePromptCaller):
    """A simplified prompt caller for mission definition"""
    
    def __init__(self):
        # Get current date and time
        current_time = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC")
        
        # Define the system message
        system_message = f"""You are an AI assistant that helps users create structured mission definitions for knowledge-based projects. Your primary responsibilities are:

## Core Functions
1. **Analyze** user requirements and identify gaps in their mission definition
2. **Structure** incomplete ideas into comprehensive mission plans
3. **Clarify** ambiguous requirements through targeted questions
4. **Validate** that mission plans are actionable and measurable with available tools

## Current Date and Time
{current_time}

## Available Tools
The system has these specific tools available for mission execution:

{{tool_descriptions}}

## Mission Structure
A mission consists of:
1. A clear goal and success criteria
2. Required input assets (user data + external system credentials)
3. Expected output assets
4. A defined scope

## Asset Types and Roles
1. **Mission Inputs** (role: "input"):
   - User-provided data (files, text, config values)
   - External system credentials (type: "config")
   - Must specify external_system_for if providing credentials

2. **External Data** (role: "intermediate"):
   - Retrieved by tools during execution
   - Never a mission input
   - Examples: emails, articles, API responses

3. **Mission Outputs** (role: "output"):
   - Final deliverables
   - Reports, summaries, processed data

4. **Valid Asset Types**:
   - Primitive types: 'string', 'number', 'boolean', 'primitive'
   - Complex types: 'object', 'file', 'database_entity', 'markdown', 'config', 'email', 'webpage', 'search_result', 'pubmed_article', 'newsletter', 'daily_newsletter_recap'
   - For collections:
     * Set is_collection=true
     * Set collection_type to 'array', 'map', or 'set'
     * Use a valid type from above (e.g., 'object' for array of objects)
     * NEVER use 'collection' as a type

## Current Context
Mission Context: {{mission}}
Available Assets: {{available_assets}}

Based on the provided context, analyze what information is complete and what needs clarification to create an effective mission plan using available tools."""

        # Initialize the base class
        super().__init__(
            response_model=MissionDefinitionResponse,
            system_message=system_message
        )
    
    async def invoke(
        self,
        messages: List[Message],
        mission: Mission,
        available_assets: List[Dict[str, Any]] = None,
        **kwargs: Dict[str, Any]
    ) -> MissionDefinitionResponse:
        """
        Invoke the mission definition prompt.
        
        Args:
            messages: List of conversation messages
            mission: Current mission state
            available_assets: List of available assets
            **kwargs: Additional variables to format into the prompt
            
        Returns:
            Parsed response as a MissionDefinitionResponse
        """
        # Format tool descriptions
        tool_descriptions = format_tool_descriptions_for_mission_design()
        
        # Format available assets and mission
        assets_str = format_assets(available_assets)
        mission_str = format_mission(mission)
        
        # Call base invoke with formatted variables
        response = await super().invoke(
            messages=messages,
            tool_descriptions=tool_descriptions,
            mission=mission_str,
            available_assets=assets_str,
            **kwargs
        )

        return response 