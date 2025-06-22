from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field
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

## Asset Categories and Usage

### Desired Assets (Mission Outputs)
These are the **final deliverables** that the mission aims to produce. They represent what the user wants to achieve:
- These are the **target outputs** that the mission should eventually produce
- Each hop should work toward creating or contributing to these desired assets
- You can reference these to understand what the hop should ultimately help achieve

### Available Assets (Mission State)
These are the **current assets** in the mission state that can be used as inputs:
- These are **inputs you can use** for the hop you're designing
- Only assets listed here can be referenced as inputs for your hop
- These include both mission inputs (user-provided data) and intermediate assets (created by previous hops)

## Hop Design Guidelines
1. **Inputs**: List ONLY assets from the "Available Assets" section as inputs for this hop. DO NOT create new input assets.
2. **Output**: Define the output asset for this hop. You have two options:
   a. **Create a new asset**: Define its complete schema and properties using the AssetLite format
   b. **Use an existing mission asset**: If your output matches one of the "Desired Assets", reference it by its mission asset ID
3. **Progress Toward Goals**: Your hop should make progress toward the "Desired Assets" using the "Available Assets"
4. **Asset Naming**: Use descriptive names that reflect the asset's purpose and content
5. **Asset Availability**: Only reference assets that are currently available. If you need an asset that doesn't exist, either:
   - Choose a different approach that uses available assets, or
   - Respond with CLARIFICATION_NEEDED and explain what additional assets are required

## Output Specification Examples

### Creating a New Asset
When you need to create a new asset that doesn't exist yet:
```json
{
  "output": {
    "asset": {
      "name": "processed_data",
      "description": "Cleaned and processed data from the input source",
      "type": "object",
      "subtype": "json",
      "is_collection": false,
      "role": "intermediate"
    }
  }
}
```

### Using an Existing Mission Asset
When your hop produces one of the desired mission outputs:
```json
{
  "output": {
    "mission_asset_id": "existing-asset-id-here"
  }
}
```

## Current Context
Mission Goal: {{mission_goal}}

**Desired Assets (Mission Outputs - What the mission aims to produce):**
{{desired_assets}}

**Available Assets (Mission State - What you can use as inputs):**
{{available_assets}}

Based on the provided context, design the next hop in the mission workflow. Use the available assets to make progress toward the desired assets."""

        # Initialize the base class with messages_placeholder=False since we don't need conversation history
        super().__init__(
            response_model=HopDesignResponse,
            system_message=system_message,
            messages_placeholder=False
        )
    
    async def invoke(
        self,
        mission: Mission,
        **kwargs: Dict[str, Any]
    ) -> HopDesignResponse:
        """
        Invoke the hop designer prompt.
        
        Args:
            mission: Current mission state (contains goal, outputs, and available assets)
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
                f"- {asset.name} (ID: {asset.id}, Type: {asset.schema_definition.type}): {asset.description}"
                for asset in mission.outputs
            ])
        else:
            desired_assets = "No specific outputs defined yet"
        
        # Format available assets from mission state (excluding mission outputs)
        if mission.mission_state:
            # Filter out mission outputs from available assets (only include input and intermediate assets)
            available_assets = [
                asset for asset in mission.mission_state.values()
                if asset.role != 'output'
            ]
            
            if available_assets:
                available_assets_str = "\n".join([
                    f"- {asset.name} (ID: {asset.id}, Type: {asset.schema_definition.type}): {asset.description}"
                    for asset in available_assets
                ])
            else:
                available_assets_str = "No assets available"
        else:
            available_assets_str = "No assets available"
        
        # Call base invoke with simplified variables
        response = await super().invoke(
            messages=[],  # Empty list since we don't need conversation history
            tool_descriptions=tool_descriptions,
            mission_goal=mission_goal,
            desired_assets=desired_assets,
            available_assets=available_assets_str,
            **kwargs
        )

        return response 