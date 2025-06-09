from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from schemas.chat import Message, MessageRole
from schemas.workflow import Mission, Hop
from schemas.asset import Asset, AssetType, CollectionType
from tools.tool_registry import format_tool_descriptions_for_hop_design
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
    
    # Maps logical input names to mission state asset IDs
    input_mapping: Dict[str, str] = Field(
        description="Maps local hop state keys to mission state asset IDs. Format: {local_key: mission_asset_id}. Values MUST be valid asset IDs from mission.state. The local_key becomes the key in hop.state where the asset will be copied."
    )
    
    output_asset: AssetLite = Field(description="The asset that will be produced by this hop")
    
    # If this is a final hop producing a mission output
    output_mission_asset_id: Optional[str] = Field(
        default=None,
        description="ID of the mission output asset this hop produces (if final hop)"
    )
    
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

## Available Tools
The system has these specific tools available for hop implementation:

{tool_descriptions}

## Hop Design Principles

1. **Incremental Progress**: Each hop should make meaningful progress toward the mission goal. **A hop is NOT necessarily intended to complete the entire mission in one go** (unless the mission is simple enough for a single, verifiable step).

2. **Tractability and Verifiability**: Design hops that are **"right-sized"** – complex enough to be useful, but simple enough to be implemented and verified reliably. Avoid overly complex hops with too many moving parts.

3. **Cohesive Goal**: Each hop should have a single, clear, and cohesive goal. What one specific outcome does this hop achieve?

4. **Input/Output Focus**: 
   - Input mapping MUST use EXACT asset IDs from mission.state
   - NEVER use asset names or values in input_mapping
   - Example: `"input_mapping": {{"email_credentials": "ed4dff20-269e-403b-a203-72e251a51dc1"}}`
   - The output of this hop becomes a potential input for the next

5. **Tool Awareness**: Consider the available tools. Can the proposed transformation be realistically achieved by a sequence of tool steps?

6. **Schema Compatibility**: Ensure that:
   - Input assets match tool parameter requirements
   - Tool outputs match asset schema requirements
   - Intermediate assets have proper schemas defined

## CRITICAL: Asset ID Rules

### Mission State vs Hop State
1. **Mission State Assets**:
   - Live in `mission.state`
   - Have unique IDs (e.g., "ed4dff20-269e-403b-a203-72e251a51dc1")
   - Referenced in input_mapping VALUES
   - Example: `"input_mapping": {{"local_key": "mission_asset_id"}}`

2. **Hop State Assets**:
   - Live in `hop.state`
   - Keys are defined by input_mapping and tool steps
   - Referenced in input_mapping KEYS
   - Example: `"input_mapping": {{"local_key": "mission_asset_id"}}`

### Input Mapping Rules
1. **ALWAYS use mission state asset IDs**: The input_mapping values must be EXACT asset IDs from mission.state
2. **NEVER use asset names**: Do not use asset names or values in the mapping
3. **Verify existence**: Only map to assets that exist in mission.state
4. **Example correct mapping**:
   ```json
   "input_mapping": {{
     "email_credentials": "ed4dff20-269e-403b-a203-72e251a51dc1",  // mission state asset ID
     "search_criteria": "fb787172-4958-4c42-90d1-a01951338cec"     // mission state asset ID
   }}
   ```
5. **Example incorrect mapping** (DO NOT DO THIS):
   ```json
   "input_mapping": {{
     "email_folder": "AI News",  // WRONG: Using asset name/value
     "oauth_token": "Gmail OAuth Token"  // WRONG: Using asset name/value
   }}
   ```

## Tool-Specific Design Patterns

### Common Hop Patterns:
1. **Data Retrieval Hop**: Use search_data_source to gather emails, documents, or data
2. **Data Analysis Hop**: Use extract_from_record with LLM prompts to analyze content
3. **Data Processing Hop**: Use group_by_reduce, filter_records, or transform_records for manipulation
4. **Storage Hop**: Use store_in_database to persist intermediate or final results
5. **Report Generation Hop**: Use transform_records to format final deliverables

### Example Gmail Analysis Workflow:
- Hop 1: search_data_source(gmail) → raw email collection
- Hop 2: extract_from_record(llm_prompt) → structured email analysis
- Hop 3: group_by_reduce(by date) → daily/weekly summaries
- Hop 4: transform_records → formatted report

## Response Formats

**HOP_PROPOSAL**: Use when you can design a clear next step
```json
{{
  "response_type": "HOP_PROPOSAL",
  "response_content": "Explanation of the proposed hop",
  "hop_proposal": {{
    "name": "Hop Name",
    "description": "What this hop accomplishes",
    "input_mapping": {{
      "logical_name": "asset_id_or_name"
    }},
    "output_asset": {{
      "name": "Output asset name",
      "description": "What this asset contains",
      "type": "object | config | file | database_entity | markdown",
      "subtype": "Specific format or schema",
      "is_collection": false,
      "collection_type": null,
      "schema_description": "Expected structure/format"
    }},
    "output_mission_asset_id": "mission_output_id_if_final",
    "is_final": false,
    "rationale": "Why this is the right next step",
    "alternative_approaches": [
      "Other approaches considered"
    ]
  }},
  "reasoning": "Detailed explanation of the design decisions"
}}
```

**INTERVIEW_QUESTION**: Use when you need clarification
```json
{{
  "response_type": "INTERVIEW_QUESTION",
  "response_content": "To design the most effective next step, I need to understand [specific aspect].",
  "reasoning": "This will help me [explain how the answer improves the hop design]"
}}
```

## Asset Creation Guidelines

**IMPORTANT**: When designing hops, understand the difference between data assets:

- **User-Provided Data Assets** (Available as INPUTS)
  - Files uploaded by the user (documents, images, etc.)
  - Data manually entered or pasted by the user
  - Any content the user directly provides to the system
  - These are available as inputs and can be referenced directly

- **External Data Assets** (Must be RETRIEVED by hops)
  - Data from Gmail, Outlook, or other email services
  - Social media posts, tweets, LinkedIn data  
  - Database records from external systems
  - API responses from third-party services
  - Web scraping results
  - These require hops to retrieve them using CONFIG assets for access

**Design Implications**:
- If mission needs Gmail data, first hop should retrieve it using Gmail credentials (config input)
- If mission needs web data, first hop should scrape/fetch it using URL/API keys (config input)
- Don't assume external data is magically available - design retrieval hops first

### Asset Types and Schemas
1. **Object Assets** (type: "object")
   - Use for structured data, JSON objects, complex data structures
   - Must include schema_description for validation
   - Example schema: `{{"field1": "string", "field2": "number"}}`

2. **Collection Assets**
   - Set `is_collection: true`
   - Specify `collection_type: "array" | "map" | "set"`
   - Include schema for collection items
   - Example: `{{"type": "object", "is_collection": true, "collection_type": "array"}}`

3. **Config Assets** (type: "config")
   - Use for configuration values, settings, credentials
   - Specify subtype for validation (string, number, boolean, oauth_token, etc.)
   - Example: {{"type": "config", "subtype": "oauth_token"}}

4. **File Assets** (type: "file")
   - Use for document files, images, exports
   - Must specify valid file subtype
   - Example: `{{"type": "file", "subtype": "pdf"}}`

5. **Database Entity Assets** (type: "database_entity")
   - Use for database records or entities
   - Include table name and query parameters
   - Example: `{{"type": "database_entity", "subtype": "user_record"}}`

6. **Markdown Assets** (type: "markdown")
   - Use for markdown-formatted text content
   - Example: `{{"type": "markdown", "subtype": "report"}}`

### Schema Validation Rules
1. **Required Fields**:
   - name: Descriptive name
   - type: Valid asset type
   - description: Clear purpose
   - schema_description: Expected structure

2. **Collection Rules**:
   - If is_collection: true, must specify collection_type
   - Collection items must have defined schema
   - Array items must be homogeneous

3. **Type-Specific Rules**:
   - File types must be valid file extensions
   - Database entities need table specifications
   - Objects need property definitions

## Hop Design Process
1. Review the mission goal and success criteria
2. Inventory available assets (what we have so far)
3. Identify the gap between current state and goal
4. Consider which tools can bridge that gap effectively
5. Design a hop that leverages appropriate tools
6. Ensure the hop output is clearly defined and useful for next steps
7. Validate schema compatibility between:
   - Input assets and tool parameters
   - Tool outputs and asset schemas
   - Intermediate assets and next tool inputs

## Guidelines
- Make hops atomic and focused on a single objective
- Ensure each hop has clear, measurable outputs
- Consider tool capabilities when designing hop logic
- Design hops that can be fully implemented with available tools
- Prefer hops that leverage tool strengths (LLM analysis, aggregation, filtering)
- Think about data flow between tools
- Consider error cases and data quality validation
- Validate schema compatibility at each step

## Current Context
Mission: {mission}
Available Assets: {available_assets}
Completed Hops: {completed_hops}

Based on this context and the available tools, design the next hop that will move us closer to completing the mission."""

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
        # Format tool descriptions
        tool_descriptions = format_tool_descriptions_for_hop_design()
        
        # Format available assets and mission using utility functions
        assets_str = format_assets(available_assets)
        
        # Convert mission to dict and handle datetime serialization
        mission_dict = mission.model_dump(mode='json')
        
        # Ensure inputs and outputs are properly serialized with required fields
        mission_dict['inputs'] = [
            {
                'name': asset.name,
                'id': asset.id,
                'description': asset.description,
                'type': asset.schema.type,
                'subtype': asset.subtype,
                'is_collection': asset.is_collection,
                'collection_type': asset.collection_type,
                'content': asset.value,
                'metadata': asset.asset_metadata.model_dump(mode='json') if asset.asset_metadata else {}
            }
            for asset in mission.inputs
        ]
        
        mission_dict['outputs'] = [
            {
                'name': asset.name,
                'id': asset.id,
                'description': asset.description,
                'type': asset.schema.type,
                'subtype': asset.subtype,
                'is_collection': asset.is_collection,
                'collection_type': asset.collection_type,
                'content': asset.value,
                'metadata': asset.asset_metadata.model_dump(mode='json') if asset.asset_metadata else {}
            }
            for asset in mission.outputs
        ]
        
        # Format mission string with serialized dates
        mission_str = format_mission(mission_dict)
        
        # Format completed hops with datetime serialization
        hops_str = "None" if not completed_hops else "\n".join([
            f"- {hop.name}: {hop.description}"
            for hop in completed_hops
        ])

        # Convert messages to langchain message format
        langchain_messages = format_langchain_messages(messages)

        # Get the format instructions from the base class
        format_instructions = self.parser.get_format_instructions()

        # Format the messages using the prompt template
        prompt = self.get_prompt_template()
        formatted_messages = prompt.format_messages(
            tool_descriptions=tool_descriptions,
            mission=mission_str,
            messages=langchain_messages,
            available_assets=assets_str,
            completed_hops=hops_str,
            format_instructions=format_instructions
        )

        # Convert langchain messages to OpenAI format
        return format_messages_for_openai(formatted_messages) 