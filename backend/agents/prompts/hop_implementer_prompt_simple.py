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
        system_message = f"""You are an AI assistant that implements "hops" - discrete processing steps within knowledge missions.

## Core Concepts

**Knowledge Mission**: A project to generate a desired information asset from available inputs using tools and resources.

**Hop**: A single processing step that:
- Takes available assets as inputs
- Applies 1-4 tool steps
- Produces output assets (either intermediate or final)

## Your Task

Design a sequence of 1-4 tool steps that transform the available input assets into the desired output assets for this specific hop.

**Important**: Focus on THIS hop's output assets, not the mission's final deliverable (unless this is the final hop).

## CRITICAL: Asset Description Analysis

Before implementing, carefully analyze the asset descriptions provided:

### What to Look For in Asset Descriptions:
1. **Data Structure**: Exact fields, hierarchy, and organization
2. **Format Requirements**: File formats, encoding, validation rules  
3. **Content Specifications**: Required information, constraints, patterns
4. **Quality Criteria**: How to validate completeness and correctness
5. **Tool Integration**: How other tools should interpret this asset

### When Asset Descriptions Are Insufficient:
If asset descriptions lack critical details needed for tool configuration, respond with `CLARIFICATION_NEEDED` and specify:
- What specific information is missing
- Why this information is needed for tool configuration
- What assumptions you would make if forced to proceed

### Examples of Missing Information That Requires Clarification:
- ❌ Vague descriptions like "processed data" or "clean content"
- ❌ No schema/structure information for structured data assets
- ❌ Missing format specifications for files or documents
- ❌ No validation criteria for determining success
- ❌ Unclear data types or field requirements

## Tool Step Structure

Each tool step requires:
- **Unique identifier** - Clear, descriptive name
- **Tool selection** - Which tool to use from available options
- **Parameter mapping** - How to map hop state assets to tool parameters
- **Result mapping** - How to map tool outputs back to hop state

## Available Tools
{{tools_list}}

## Current Context

**Date/Time**: {current_time}

**Mission**: {{mission_description}}

**This Hop**: {{hop_description}}

**Available Input Assets**: {{available_assets}}

**Required Output Assets**: {{desired_assets}}

## Implementation Guidelines

1. **Analyze Asset Descriptions** - Verify output asset descriptions contain sufficient detail for tool configuration
2. **Analyze the transformation** - What processing is needed to go from inputs to outputs?
3. **Select appropriate tools** - Choose tools that match the required operations and can produce the specified output format
4. **Design the sequence** - Order steps logically, ensuring each step's outputs are available for subsequent steps
5. **Map assets carefully** - Ensure all mappings reference assets that exist in the hop state
6. **Validate completeness** - Confirm all required output assets will be produced according to their detailed specifications
7. **Consider tool capabilities** - Ensure selected tools can actually produce outputs matching the asset descriptions

## Asset Mapping Syntax

### Parameter Mapping (Input to Tool)
```python
{{{{
    "parameter_name": {{{{
        "type": "asset_field",
        "state_asset": "asset_name_in_hop_state",
        "path": "optional.nested.field.path"
    }}}}
}}}}
```

### Result Mapping (Tool Output to State)
```python
{{{{
    "result_name": {{{{
        "type": "asset_field", 
        "state_asset": "target_asset_name"
    }}}}
}}}}
```

## Implementation Quality Checks

Before finalizing your implementation, verify:
1. ✅ All output assets can be produced with the selected tools
2. ✅ Tool parameters are correctly mapped to available input assets
3. ✅ Output format matches the detailed asset description requirements
4. ✅ Validation criteria from asset descriptions can be satisfied
5. ✅ Tool sequence is logical and dependencies are resolved
6. ✅ All required fields/properties specified in asset descriptions will be populated

## Response Guidelines

### For IMPLEMENTATION_PLAN:
- Include detailed reasoning for tool selection
- Explain how each tool step contributes to the output asset requirements
- Describe how the implementation satisfies the asset description specifications

### For CLARIFICATION_NEEDED:
- Specify exactly what asset description details are missing
- Explain why this information is critical for tool configuration
- Suggest what the asset description should include

Now implement this hop by designing the tool steps."""

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
        """Format desired (output) assets for the prompt with enhanced detail"""
        if not hop.output_mapping:
            return "No output assets defined"
        
        output_assets = []
        for local_key, asset_id in hop.output_mapping.items():
            # Get the asset from hop state if available
            if local_key in hop.hop_state:
                asset = hop.hop_state[local_key]
                asset_type = asset.schema_definition.type if asset.schema_definition else 'unknown'
                
                # Enhanced formatting with schema information
                asset_info = f"- **{local_key}** ({asset_type}): {asset.description}"
                
                # Add schema description if available
                if asset.schema_definition and asset.schema_definition.description:
                    asset_info += f"\n  Schema: {asset.schema_definition.description}"
                
                # Add subtype if available
                if asset.subtype:
                    asset_info += f"\n  Subtype: {asset.subtype}"
                
                # Add collection info if applicable
                if asset.is_collection and asset.collection_type:
                    asset_info += f"\n  Collection: {asset.collection_type}"
                
                output_assets.append(asset_info)
            else:
                output_assets.append(f"- {local_key}: Asset ID {asset_id} (not in hop state)")
        
        return "\n\n".join(output_assets)

    def _format_available_assets(self, hop: Hop) -> str:
        """Format available (input) assets for the prompt with enhanced detail"""
        if not hop.hop_state:
            return "No assets available in hop state"
        
        # Categorize assets by their role in the hop
        input_assets = []
        output_assets = []
        intermediate_assets = []
        
        for asset_name, asset in hop.hop_state.items():
            asset_type = asset.schema_definition.type if asset.schema_definition else 'unknown'
            
            # Enhanced asset information formatting
            asset_info = f"- **{asset_name}** ({asset_type}): {asset.description}"
            
            # Add additional details if available
            details = []
            if asset.subtype:
                details.append(f"Subtype: {asset.subtype}")
            if asset.is_collection and asset.collection_type:
                details.append(f"Collection: {asset.collection_type}")
            if asset.schema_definition and asset.schema_definition.description:
                details.append(f"Schema: {asset.schema_definition.description}")
            
            if details:
                asset_info += f"\n  {' | '.join(details)}"
            
            # Determine category based on hop mappings
            if asset_name in hop.input_mapping:
                input_assets.append(asset_info)
            elif asset_name in hop.output_mapping:
                output_assets.append(asset_info)
            else:
                intermediate_assets.append(asset_info)
        
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