from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field
from schemas.chat import Message
from schemas.workflow import Mission, Hop, HopStatus
from schemas.asset import Asset
from schemas.lite_models import HopLite, AssetLite
from tools.tool_registry import format_tool_descriptions_for_implementation
from utils.message_formatter import format_assets, format_mission
from .base_prompt_caller import BasePromptCaller

class HopImplementationResponse(BaseModel):
    """Structure for hop implementation response"""
    response_type: str = Field(description="Type of response: IMPLEMENTATION_PLAN or CLARIFICATION_NEEDED")
    response_content: str = Field(description="The main response text to add to the conversation")
    tool_steps: List[Dict[str, Any]] = Field(default_factory=list, description="List of tool steps to implement the hop")
    missing_information: List[str] = Field(default_factory=list, description="List of missing information if clarification is needed")

class HopImplementerPromptCaller(BasePromptCaller):
    """A simplified prompt caller for hop implementation"""
    
    def __init__(self):
        # Define the system message
        system_message = """You are an AI assistant that helps implement hops in a mission workflow. Your primary responsibilities are:

## Core Functions
1. **Analyze** the hop's input and output requirements
2. **Design** a sequence of tool steps to transform inputs to outputs
3. **Validate** that the tool chain is complete and correct

## Available Tools
The system has these specific tools available for hop implementation:

{tool_descriptions}

## Implementation Guidelines
1. **Asset Management**:
   - Each tool step must map its parameters to existing assets in hop.state
   - Each tool step must map its results to assets in hop.state
   - Create new assets in hop.state for intermediate results
   - Use descriptive names for assets that reflect their content

2. **Tool Step Structure**:
   - Each step must have a unique ID
   - Each step must specify the tool_id to use
   - Each step must map its parameters to hop.state assets
   - Each step must map its results to hop.state assets

3. **Parameter Mapping Format**:
   ```python
   {{
       "parameter_name": {{
           "type": "asset_field",
           "state_asset": "asset_name_in_hop_state"
       }}
   }}
   ```

4. **Result Mapping Format**:
   ```python
   {{
       "result_name": {{
           "type": "asset_field",
           "state_asset": "asset_name_in_hop_state"
       }}
   }}
   ```

## Current Context
Mission Context: {mission}
Current Hop: {current_hop}
Available Assets: {available_assets}

Based on the provided context, implement the hop by designing a sequence of tool steps that transform the inputs into the desired outputs."""

        # Initialize the base class
        super().__init__(
            response_model=HopImplementationResponse,
            system_message=system_message
        )
    
    async def invoke(
        self,
        messages: List[Message],
        mission: Mission,
        current_hop: Hop,
        available_assets: List[Dict[str, Any]] = None,
        **kwargs: Dict[str, Any]
    ) -> HopImplementationResponse:
        """
        Invoke the hop implementer prompt.
        
        Args:
            messages: List of conversation messages
            mission: Current mission state
            current_hop: The hop to implement
            available_assets: List of available assets in hop state
            **kwargs: Additional variables to format into the prompt
            
        Returns:
            Parsed response as a HopImplementationResponse
        """
        # Format tool descriptions
        tool_descriptions = format_tool_descriptions_for_implementation()
        
        # Format available assets and mission
        assets_str = format_assets(available_assets)
        mission_str = format_mission(mission)
        
        # Format current hop
        hop_str = f"""
Name: {current_hop.name}
Description: {current_hop.description}
Input Mapping: {current_hop.input_mapping}
Output Mapping: {current_hop.output_mapping}
Status: {current_hop.status}
"""
        
        # Call base invoke with formatted variables
        response = await super().invoke(
            messages=messages,
            tool_descriptions=tool_descriptions,
            mission=mission_str,
            current_hop=hop_str,
            available_assets=assets_str,
            **kwargs
        )

        return response 