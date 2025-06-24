from typing import Dict, Any, List, Optional
from datetime import datetime
from pydantic import BaseModel, Field

from schemas.chat import Message
from schemas.workflow import Mission, Hop
from schemas.lite_models import ToolStepLite

from utils.message_formatter import format_tool_descriptions_for_implementation

from .base_prompt_caller import BasePromptCaller

class HopImplementationResponse(BaseModel):
    """Structure for hop implementation response"""
    response_type: str = Field(description="Type of response: IMPLEMENTATION_PLAN or CLARIFICATION_NEEDED")
    response_content: str = Field(description="The main response text to add to the conversation")
    tool_steps: List[ToolStepLite] = Field(default_factory=list, description="List of tool steps to implement the hop")
    hop_state: Dict[str, Any] = Field(default_factory=dict, description="Updated hop state including any intermediate assets created")
    missing_information: List[str] = Field(default_factory=list, description="List of missing information if clarification is needed")
    reasoning: str = Field(description="Explanation of the implementation decisions made")

class HopImplementerPromptCaller(BasePromptCaller):
    """A simplified prompt caller for hop implementation"""
    
    def __init__(self):
        # Get current date and time
        current_time = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC")
        
        # Define the system message
        system_message = f"""You are an AI assistant that helps users implement "hops" for knowledge missions.

## About Missions and Hops

- A knowledge mission is a user defined project to generate a desired information asset from available inputs, tools and resources.

- A knowledge mission begins as a stated goal along with specifications for an output asset that would achieve that goal and a list of available inputs, tools and resources available for the achievement.

- A knowledge mission gets completed through a series of one or more hops. Each hop has access to the mission's inputs as well as any intermediate asset produced from a prior hop and uses the available tools to create a new asset in service of achieving the mission. If the new asset is the desired output asset, the mission is complete. Otherwise, the mission continues with the next hop.

- A hop begins as a proposal with a prescribed output asset along with a list of the available assets, tools and resources to create it.

You will be presented with a hop that has been proposed by the hop designer. Your job is to implement the hop by designing a sequence of tool steps that transform the available inputs into the desired outputs.

## Detailed Instructions

Given the mission context provided below, design 1-4 tool steps that will:
1. Take the available assets as inputs
2. Use the available tools to process them
3. Produce the desired output assets for the hop

NOTE: Unless this is the final hop, the output assets for the hop will be intermediate assets that will be used as inputs for the next hop. Be sure to focus specifically on the output asset for the hop rather than the mission's desired output asset in case they are different.

Each tool step will consist of the following:
- unique identifier
- the tool it will use
- a map from hop state to the required parameters and resources it will pass to that tool
- a map from the tool's outputs to the hop state

Tool steps must be designed in coordination with the hop state. The hop state is the set of all available assets that can be used as inputs and outputs for tool steps. Initially, this state includes:
- All input assets (mission inputs + intermediate assets from previous hops)
- All output assets (target assets to be produced)

When you design multiple tool steps, the intermediate assets are created and stored in this state so that subsequent steps can use them as inputs.


The input and output mappings in your tool steps always refer to assets in this hop state.

## Available Tools
{{tools_list}}

## Parameter Mapping
Map tool parameters to assets using:
```python
{{{{  # Double curly braces to escape them
    "parameter_name": {{{{
        "type": "asset_field",
        "state_asset": "asset_name_in_hop_state"
    }}}}
}}}}
```

## Result Mapping
Map tool outputs to assets using:
```python
{{{{  # Double curly braces to escape them
    "result_name": {{{{
        "type": "asset_field", 
        "state_asset": "target_asset_name"
    }}}}
}}}}
```

## Mission Context

### Current Date and Time
{current_time}

### Mission
{{mission_description}}

### Hop
{{hop_description}}

### Desired Outputs
{{desired_assets}}

### Available Inputs
{{available_assets}}

Implement this hop by designing the tool steps."""

        # Initialize the base class with messages_placeholder=False since we don't need conversation history
        super().__init__(
            response_model=HopImplementationResponse,
            system_message=system_message,
            messages_placeholder=False
        )
    
    async def invoke(
        self,
        mission: Mission,
        **kwargs: Dict[str, Any]
    ) -> HopImplementationResponse:
        """
        Invoke the hop implementer prompt.
        
        Args:
            mission: Current mission state (contains current_hop and hop_state)
            **kwargs: Additional variables to format into the prompt
            
        Returns:
            Parsed response as a HopImplementationResponse
        """
        # Get current hop from mission
        current_hop = mission.current_hop
        if not current_hop:
            raise ValueError("No current hop found in mission")
        
        # Extract and format the essential inputs
        mission_description = self._format_mission_description(mission)
        hop_description = self._format_hop_description(current_hop)
        desired_assets = self._format_desired_assets(current_hop)
        available_assets = self._format_available_assets(current_hop)
        tools_list = format_tool_descriptions_for_implementation()
        
        # Call base invoke with individual variables
        response = await super().invoke(
            messages=[],  # Empty list since we don't need conversation history
            mission_description=mission_description,
            hop_description=hop_description,
            desired_assets=desired_assets,
            available_assets=available_assets,
            tools_list=tools_list,
            **kwargs
        )

        return response
    
    def _format_mission_description(self, mission: Mission) -> str:
        """Format mission description for the prompt"""
        return f"""Name: {mission.name}
Description: {mission.description}
Goal: {mission.goal}
Success Criteria: {', '.join(mission.success_criteria)}"""

    def _format_hop_description(self, hop: Hop) -> str:
        """Format hop description for the prompt"""
        return f"""Name: {hop.name}
Description: {hop.description}
Rationale: {hop.rationale if hop.rationale else 'No rationale provided'}
Is Final: {hop.is_final}"""

    def _format_desired_assets(self, hop: Hop) -> str:
        """Format desired (output) assets for the prompt"""
        if not hop.output_mapping:
            return "No output assets defined"
        
        output_assets = []
        for local_key, asset_id in hop.output_mapping.items():
            # Get the asset from hop state if available
            if local_key in hop.hop_state:
                asset = hop.hop_state[local_key]
                asset_type = asset.schema_definition.type if asset.schema_definition else 'unknown'
                output_assets.append(f"- {local_key} ({asset_type}): {asset.description}")
            else:
                output_assets.append(f"- {local_key}: Asset ID {asset_id} (not in hop state)")
        
        return "\n".join(output_assets)

    def _format_available_assets(self, hop: Hop) -> str:
        """Format available (input) assets for the prompt"""
        if not hop.hop_state:
            return "No assets available in hop state"
        
        # Categorize assets by their role in the hop
        input_assets = []
        output_assets = []
        intermediate_assets = []
        
        for asset_name, asset in hop.hop_state.items():
            asset_type = asset.schema_definition.type if asset.schema_definition else 'unknown'
            asset_description = asset.description
            
            # Determine category based on hop mappings
            if asset_name in hop.input_mapping:
                input_assets.append(f"- {asset_name} ({asset_type}): {asset_description}")
            elif asset_name in hop.output_mapping:
                output_assets.append(f"- {asset_name} ({asset_type}): {asset_description}")
            else:
                intermediate_assets.append(f"- {asset_name} ({asset_type}): {asset_description}")
        
        # Build formatted string
        sections = []
        
        if input_assets:
            sections.append("**Input Assets (Available for tool parameters):**")
            sections.extend(input_assets)
            sections.append("")
        
        if output_assets:
            sections.append("**Output Assets (Target outputs to produce):**")
            sections.extend(output_assets)
            sections.append("")
        
        if intermediate_assets:
            sections.append("**Intermediate Assets (Available for processing):**")
            sections.extend(intermediate_assets)
            sections.append("")
        
        return "\n".join(sections) 