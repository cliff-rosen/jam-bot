from typing import Dict, Any, List, Optional
from datetime import datetime
from pydantic import BaseModel, Field

from schemas.chat import Message
from schemas.workflow import Mission, Hop
from schemas.lite_models import ToolStepLite

from utils.message_formatter import format_assets, format_mission, format_tool_descriptions_for_implementation

from .base_prompt_caller import BasePromptCaller

class HopImplementationResponse(BaseModel):
    """Structure for hop implementation response"""
    response_type: str = Field(description="Type of response: IMPLEMENTATION_PLAN or CLARIFICATION_NEEDED")
    response_content: str = Field(description="The main response text to add to the conversation")
    tool_steps: List[ToolStepLite] = Field(default_factory=list, description="List of tool steps to implement the hop")
    missing_information: List[str] = Field(default_factory=list, description="List of missing information if clarification is needed")
    reasoning: str = Field(description="Explanation of the implementation decisions made")

class HopImplementerPromptCaller(BasePromptCaller):
    """A simplified prompt caller for hop implementation"""
    
    def __init__(self):
        # Get current date and time
        current_time = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC")
        
        # Define the system message
        system_message = f"""You are an AI assistant that helps implement hops in a mission workflow. Your primary responsibilities are:

## Core Functions
1. **Analyze** the hop's input and output requirements
2. **Design** a sequence of tool steps to transform inputs to outputs
3. **Validate** that the tool chain is complete and correct

## Current Date and Time
{current_time}

## Available Tools
The system has these specific tools available for hop implementation:

{{tool_descriptions}}

## Implementation Guidelines
1. **Asset Management**:
   - Each tool step must map its parameters to existing assets in hop.state
   - Each tool step must map its results to assets in hop.state
   - Create new assets in hop.state for intermediate results
   - Use descriptive names for assets that reflect their content

## Asset Categories and Usage

### Input Assets (Hop State)
These are the **available inputs** for this hop that you can use as tool parameters:
- These assets are already in the hop state and ready to use
- Use the exact asset names from the hop state when mapping parameters
- These include both mission inputs and intermediate assets from previous hops

### Output Assets (Hop State)
These are the **target outputs** that this hop must produce:
- These assets define what the hop should ultimately create
- Your tool chain must map results to these output assets
- These may be final mission outputs or intermediate processing results

### Intermediate Assets (To Be Created)
These are **new assets** that will be created during tool execution:
- Create descriptive names that reflect the asset's content and purpose
- Use these for intermediate processing results between tool steps
- Each intermediate asset should contribute to the final outputs

## Tool Step Structure Guidelines
1. **Unique IDs**: Each step must have a unique identifier
2. **Tool Selection**: Choose the most appropriate tool for each step's purpose
3. **Parameter Mapping**: Map tool parameters to hop state assets or literal values
4. **Result Mapping**: Map tool outputs to hop state assets or discard unused outputs

## Parameter Mapping Format
For asset field mappings:
```python
{{{{  # Double curly braces to escape them
    "parameter_name": {{{{
        "type": "asset_field",
        "state_asset": "asset_name_in_hop_state",
        "path": "optional.path.to.field"  # Optional path for nested fields
    }}}}
}}}}
```

For literal value mappings:
```python
{{{{  # Double curly braces to escape them
    "parameter_name": {{{{
        "type": "literal",
        "value": "actual_value_here"
    }}}}
}}}}
```

## Result Mapping Format
For asset field mappings:
```python
{{{{  # Double curly braces to escape them
    "result_name": {{{{
        "type": "asset_field",
        "state_asset": "asset_name_in_hop_state",
        "path": "optional.path.to.field"  # Optional path for nested fields
    }}}}
}}}}
```

For discarded results:
```python
{{{{  # Double curly braces to escape them
    "result_name": {{{{
        "type": "discard"
    }}}}
}}}}
```

## Implementation Strategy
1. **Analyze Requirements**: Understand what inputs you have and what outputs you need
2. **Plan Tool Sequence**: Design a logical sequence of 1-4 tool steps
3. **Map Parameters**: Ensure each tool parameter maps to an available asset
4. **Map Results**: Ensure each tool output maps to a target asset or intermediate result
5. **Validate Completeness**: Verify that all inputs are used and all outputs are produced

## Current Context
Mission Context: {{mission}}

Based on the provided context, implement the hop by designing a sequence of tool steps that transform the inputs into the desired outputs."""

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
        
        # Get available assets from hop state
        available_assets = [asset.model_dump(mode='json') for asset in current_hop.hop_state.values()]
        
        # Format tool descriptions
        tool_descriptions = format_tool_descriptions_for_implementation()
        
        # Format mission context (concise version for hop implementation)
        mission_str = format_mission(mission, context_for_hop=True)
        
        # Format current hop with detailed information
        hop_str = f"""
Name: {current_hop.name}
Description: {current_hop.description}
Rationale: {current_hop.rationale if current_hop.rationale else 'No rationale provided'}

Input Mapping (Local Key → Mission Asset ID):
{self._format_mapping(current_hop.input_mapping)}

Output Mapping (Local Key → Mission Asset ID):
{self._format_mapping(current_hop.output_mapping)}

Status: {current_hop.status}
Is Final: {current_hop.is_final}
"""
        
        # Format available assets with categorization
        assets_str = self._format_available_assets(available_assets, current_hop)
        
        # Call base invoke with formatted variables
        response = await super().invoke(
            messages=[],  # Empty list since we don't need conversation history
            tool_descriptions=tool_descriptions,
            mission=f"{mission_str}\n\n{hop_str}\n\nAvailable Assets:\n{assets_str}",
            **kwargs
        )

        return response
    
    def _format_mapping(self, mapping: Dict[str, str]) -> str:
        """Format input/output mapping for display"""
        if not mapping:
            return "  No mappings defined"
        
        formatted = []
        for local_key, asset_id in mapping.items():
            formatted.append(f"  {local_key} → {asset_id}")
        return "\n".join(formatted)
    
    def _format_available_assets(self, available_assets: List[Dict[str, Any]], current_hop: Hop) -> str:
        """Format available assets with categorization"""
        if not available_assets:
            return "No assets available in hop state"
        
        # Categorize assets by their role in the hop
        input_assets = []
        output_assets = []
        intermediate_assets = []
        
        for asset in available_assets:
            asset_name = asset.get('name', 'Unnamed')
            asset_type = asset.get('schema_definition', {}).get('type', 'unknown')
            asset_description = asset.get('description', 'No description')
            
            # Determine category based on hop mappings
            if asset_name in current_hop.input_mapping:
                input_assets.append(f"- {asset_name} ({asset_type}): {asset_description}")
            elif asset_name in current_hop.output_mapping:
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