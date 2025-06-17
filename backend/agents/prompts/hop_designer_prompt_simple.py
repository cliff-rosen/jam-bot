from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field
from schemas.chat import Message
from schemas.workflow import Mission, Hop, HopStatus
from schemas.asset import Asset
from schemas.lite_models import HopLite, AssetLite, create_hop_from_lite
from tools.tool_registry import format_tool_descriptions_for_hop_design
from utils.message_formatter import format_assets, format_mission
from .base_prompt_caller import BasePromptCaller
from datetime import datetime

class HopDesignResponse(BaseModel):
    """Structure for hop design response"""
    response_type: str = Field(description="Type of response: HOP_PROPOSAL or CLARIFICATION_NEEDED")
    response_content: str = Field(description="The main response text to add to the conversation")
    hop_proposal: Optional[HopLite] = Field(default=None, description="Proposed hop details")
    reasoning: str = Field(description="Explanation of the design decisions made")

class HopDesignerPromptCaller(BasePromptCaller):
    """A simplified prompt caller for hop design"""
    
    def __init__(self):
        # Get current date and time
        current_time = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC")
        
        # Define the system message
        system_message = f"""You are an AI assistant that helps design hops in a mission workflow. Your primary responsibilities are:

## Core Functions
1. **Analyze** the mission goal and current state
2. **Identify** available assets and tools
3. **Design** the next hop in the workflow
4. **Validate** that the hop is implementable

## Current Date and Time
{current_time}

## Available Tools
The system has these specific tools available for hop implementation:

{{tool_descriptions}}

## Design Principles
1. **Incremental Progress**: Each hop should make clear progress toward the mission goal
2. **Tractability**: Each hop should be implementable with available tools
3. **Cohesive Goals**: Each hop should have a clear, focused purpose
4. **Input/Output Focus**: Each hop should clearly map inputs to outputs

## Asset Type Guidelines
1. Valid primitive types: 'string', 'number', 'boolean', 'primitive'
2. Valid complex types: 'object', 'file', 'database_entity', 'markdown', 'config', 'email', 'webpage', 'search_result', 'pubmed_article', 'newsletter', 'daily_newsletter_recap'
3. For collections:
   - Set is_collection=true
   - Set collection_type to 'array', 'map', or 'set'
   - Use a valid type from above (e.g., 'object' for array of objects)
   - NEVER use 'collection' as a type

## Hop Design Guidelines
1. **Inputs**: List the specific assets needed as inputs for this hop
2. **Output**: Define the output asset for this hop. You have two options:
   a. Create a new asset: Define its schema and properties
   b. Use an existing mission asset: Specify its ID and ensure it matches your needs
3. **Mission Output**: If this hop produces a mission output, use option (b) above to specify the mission output asset ID
4. **Asset Naming**: Use descriptive names that reflect the asset's purpose and content

## Current Context
Mission Context: {{mission}}
Available Assets: {{available_assets}}
Completed Hops: {{completed_hops}}

Based on the provided context, design the next hop in the mission workflow."""

        # Initialize the base class
        super().__init__(
            response_model=HopDesignResponse,
            system_message=system_message
        )
    
    async def invoke(
        self,
        messages: List[Message],
        mission: Mission,
        available_assets: List[Dict[str, Any]] = None,
        completed_hops: List[Hop] = None,
        **kwargs: Dict[str, Any]
    ) -> HopDesignResponse:
        """
        Invoke the hop designer prompt.
        
        Args:
            messages: List of conversation messages
            mission: Current mission state
            available_assets: List of available assets
            completed_hops: List of completed hops
            **kwargs: Additional variables to format into the prompt
            
        Returns:
            Parsed response as a HopDesignResponse
        """
        # Format tool descriptions
        tool_descriptions = format_tool_descriptions_for_hop_design()
        
        # Format available assets and mission
        assets_str = format_assets(available_assets)
        mission_str = format_mission(mission)
        
        # Format completed hops
        completed_hops_str = "\n".join([
            f"- {hop.name}: {hop.description}"
            for hop in (completed_hops or [])
        ]) if completed_hops else "No hops completed yet"
        
        # Call base invoke with formatted variables
        response = await super().invoke(
            messages=messages,
            tool_descriptions=tool_descriptions,
            mission=mission_str,
            available_assets=assets_str,
            completed_hops=completed_hops_str,
            **kwargs
        )

        return response 