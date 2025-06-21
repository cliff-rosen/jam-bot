from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field
from schemas.chat import Message
from schemas.workflow import Mission
from schemas.lite_models import HopLite
from utils.message_formatter import format_tool_descriptions_for_hop_design
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
1. **Inputs**: List ONLY assets that already exist in the mission state as inputs for this hop. DO NOT create new input assets.
2. **Output**: Define the output asset for this hop. You have two options:
   a. Create a new asset: Define its schema and properties
   b. Use an existing mission asset: Specify its ID and ensure it matches your needs
3. **Mission Output**: If this hop produces a mission output, use option (b) above to specify the mission output asset ID
4. **Asset Naming**: Use descriptive names that reflect the asset's purpose and content
5. **Asset Availability**: Only reference assets that are currently available in the mission state. If you need an asset that doesn't exist, either:
   - Choose a different approach that uses available assets, or
   - Respond with CLARIFICATION_NEEDED and explain what additional assets are required

## Current Context
Mission Goal: {{mission_goal}}
Desired Assets: {{desired_assets}}
Available Assets: {{available_assets}}

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
        **kwargs: Dict[str, Any]
    ) -> HopDesignResponse:
        """
        Invoke the hop designer prompt.
        
        Args:
            messages: List of conversation messages
            mission: Current mission state (only goal and outputs are used)
            available_assets: List of available assets in mission state
            **kwargs: Additional variables to format into the prompt
            
        Returns:
            Parsed response as a HopDesignResponse
        """
        # Format tool descriptions
        tool_descriptions = format_tool_descriptions_for_hop_design()
        
        # Extract mission goal
        mission_goal = mission.goal if mission.goal else "No goal specified"
        
        # Format desired assets (mission outputs)
        if mission.outputs:
            desired_assets = "\n".join([
                f"- {asset.name} ({asset.schema_definition.type}): {asset.description}"
                for asset in mission.outputs
            ])
        else:
            desired_assets = "No specific outputs defined yet"
        
        # Format available assets
        if available_assets:
            available_assets_str = "\n".join([
                f"- {asset.get('name', 'Unknown')} ({asset.get('type', 'unknown')}): {asset.get('description', 'No description')}"
                for asset in available_assets
            ])
        else:
            available_assets_str = "No assets available"
        
        # Call base invoke with simplified variables
        response = await super().invoke(
            messages=messages,
            tool_descriptions=tool_descriptions,
            mission_goal=mission_goal,
            desired_assets=desired_assets,
            available_assets=available_assets_str,
            **kwargs
        )

        return response 