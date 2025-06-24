from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field
from datetime import datetime

from schemas.workflow import Mission
from schemas.lite_models import HopLite

from utils.message_formatter import format_tool_descriptions_for_hop_design
from .base_prompt_caller import BasePromptCaller

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

## IMPORTANT: Asset ID Usage
When specifying inputs for a hop, you MUST use the exact asset IDs shown in the "Available Assets" section. 
Do NOT create new asset definitions for inputs - only reference existing asset IDs.

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

## CRITICAL: Asset Description Requirements

Asset descriptions must be **sufficiently detailed** for downstream tools to understand:

### For Output Assets - Include ALL of these details:
1. **Data Structure**: Describe the exact structure, fields, and hierarchy
2. **Format Specifications**: File formats, data formats, encoding, etc.
3. **Content Requirements**: What specific information must be included
4. **Validation Criteria**: How to determine if the asset is complete and correct
5. **Tool Integration**: How downstream tools should interpret and use this asset
6. **Schema Definition**: For structured data, describe the expected schema

### Examples of GOOD Asset Descriptions:

**Example 1 - Structured Data Asset:**
```
"A comprehensive JSON object containing cleaned and standardized contact information extracted from the source data. Structure: {{'contacts': [{{ 'name': string, 'email': string (validated email format), 'phone': string (E.164 format), 'company': string, 'role': string, 'source_confidence': float (0-1) }}], 'metadata': {{ 'total_contacts': int, 'extraction_date': ISO datetime, 'data_quality_score': float }}}}. Each contact record must include at least name and one valid contact method. Phone numbers normalized to international format. Email addresses validated for syntax and deliverability where possible."
```

**Example 2 - Document Asset:**
```
"A clean, well-formatted markdown document containing the final research report. Must include: executive summary (2-3 paragraphs), methodology section, findings organized by theme with supporting evidence, conclusions with actionable recommendations, and bibliography with properly formatted citations. Document should be 2000-4000 words, use consistent heading hierarchy (# ## ###), include data visualizations as markdown tables where appropriate, and maintain professional academic tone suitable for stakeholder presentation."
```

**Example 3 - Configuration Asset:**
```
"OAuth 2.0 configuration object for Gmail API access containing: {{'client_id': string, 'client_secret': string, 'redirect_uri': string (must match registered OAuth app), 'scope': array of strings (minimum: ['https://www.googleapis.com/auth/gmail.readonly']), 'access_token': string (JWT format), 'refresh_token': string, 'expires_in': int (seconds), 'token_type': 'Bearer'}}. All tokens must be valid and not expired. Configuration enables read access to Gmail messages and attachments for the authenticated user account."
```

### Bad Examples (Insufficient Detail):
- ❌ "Processed data from the input"
- ❌ "Clean email content"  
- ❌ "Configuration for API access"
- ❌ "Extracted information"

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
- **IMPORTANT**: Use the exact asset ID (e.g., "asset_123") from the list below as input references
- These include both mission inputs (user-provided data) and intermediate assets (created by previous hops)

## Hop Design Guidelines
1. **Inputs**: List ONLY asset IDs from the "Available Assets" section as inputs for this hop. Use the exact asset ID (e.g., "asset_123") from the available assets list.
2. **Output**: Define the output asset for this hop. You have two options:
   a. **Create a new asset**: Define its complete schema and properties using the AssetLite format with DETAILED description
   b. **Use an existing mission asset**: If your output matches one of the "Desired Assets", reference it by its mission asset ID
   *** Always choose an existing asset if you feel that can be reasonably produced in a single remaining hop.
3. **Progress Toward Goals**: Your hop should make progress toward the "Desired Assets" using the "Available Assets"
4. **Asset Naming**: Use descriptive names that reflect the asset's purpose and content
5. **Asset Availability**: Only reference assets that are currently available. If you need an asset that doesn't exist, either:
   - Choose a different approach that uses available assets, or
   - Respond with CLARIFICATION_NEEDED and explain what additional assets are required

## Input Specification Examples

### Using Available Assets as Inputs
When specifying inputs, use the exact asset IDs from the available assets list:
```json
{{{{
  "inputs": ["asset_123", "asset_456"]
}}}}
```

## Output Specification Examples

### Creating a New Asset
When you need to create a new asset that doesn't exist yet:
```json
{{{{
  "output": {{{{
    "asset": {{{{
      "name": "processed_contacts_data",
      "description": "A comprehensive JSON object containing cleaned and standardized contact information extracted from the source data. Structure: {{'contacts': [{{ 'name': string, 'email': string (validated email format), 'phone': string (E.164 format), 'company': string, 'role': string, 'source_confidence': float (0-1) }}], 'metadata': {{ 'total_contacts': int, 'extraction_date': ISO datetime, 'data_quality_score': float }}}}. Each contact record must include at least name and one valid contact method. Phone numbers normalized to international format. Email addresses validated for syntax and deliverability where possible.",
      "type": "object",
      "subtype": "json",
      "is_collection": false,
      "role": "intermediate",
      "schema_description": "JSON object with 'contacts' array and 'metadata' object. Each contact has required 'name' field and at least one of 'email' or 'phone'. All fields validated and normalized."
    }}}}
  }}}}
}}}}
```

### Using an Existing Mission Asset
When your hop produces one of the desired mission outputs:
```json
{{{{
  "output": {{{{
    "mission_asset_id": "existing-asset-id-here"
  }}}}
}}}}
```

## Current Context
Mission Goal: {{mission_goal}}

**Desired Assets (Mission Outputs - What the mission aims to produce):**
{{desired_assets}}

**Available Assets (Mission State - What you can use as inputs):**
{{available_assets}}

Based on the provided context, design the next hop in the mission workflow. Use the available assets to make progress toward the desired assets. Remember: Asset descriptions must be detailed enough for the hop implementer to correctly configure tools and validate outputs."""

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