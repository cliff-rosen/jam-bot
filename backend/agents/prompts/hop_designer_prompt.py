from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from schemas.chat import Message, MessageRole
from schemas.workflow import Mission, Asset, Hop
from schemas.tools import format_tool_descriptions_for_hop_design
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
    
    # Maps logical input names to asset IDs/names
    input_mapping: Dict[str, str] = Field(
        description="Maps logical input parameter names to existing asset IDs or names"
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

4. **Input/Output Focus**: Clearly define the input assets the hop consumes and the specific output asset it produces. The output of this hop becomes a potential input for the next.

5. **Tool Awareness**: Consider the available tools. Can the proposed transformation be realistically achieved by a sequence of tool steps?

6. **Summarization Pre-processing**: If the ultimate goal involves summarization of large data (e.g., many emails, long documents), and the input to *this hop* is that raw large data, this hop should focus on **extracting and condensing** that information into a smaller, focused dataset. The `summarize` tool has prompt size limitations; it cannot directly summarize thousands of raw emails. An `extract` or `map_reduce_rollup` step is often needed first to create a concise input for a *subsequent* summarization hop.

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
```
HOP_PROPOSAL:
Next Hop: [Name of the hop]
Purpose: [What this hop accomplishes]

Tool Approach: [Which tool(s) this hop will likely use]

Input Mapping:
- [logical_name]: [asset_id or asset_name]
  Example:
  - search_criteria: mission_input_asset_1  # From mission inputs
  - previous_results: hop_output_asset_2    # From previous hop

Output:
- Name: [Output asset name]
- Type: [Asset type - MUST be one of: 'file', 'primitive', 'object', 'database_entity', 'markdown']
- Description: [What this asset contains]
- Schema: [Expected structure/format]

Output Mission Asset: [mission_output_asset_id if final, or None]
Is Final: [Yes/No - whether this produces the final deliverable]

Rationale: [Why this is the right next step given available tools]
```

## Asset Creation Guidelines

### Collection Assets
When creating assets that contain multiple items (arrays, lists, collections):

**CORRECT WAY**:
```json
{{
  "name": "Weekly Email Activity Summary",
  "type": "object",           // Use a valid AssetType, NOT "array"
  "subtype": "json",
  "is_collection": true,      // This makes it a collection
  "collection_type": "array", // Specifies it's an array collection
  "description": "Summary of email activity by day of the week",
  "schema_description": "[{{ 'day_of_week': 'Monday', 'sent': 123, 'received': 150 }}, ...]"
}}
```

**WRONG WAY** ❌:
```json
{{
  "type": "array"  // "array" is NOT a valid AssetType
}}
```

### Valid Asset Types
- **file**: For document files, images, exports
- **primitive**: For simple values (strings, numbers, booleans)
- **object**: For structured data, JSON objects, complex data structures
- **database_entity**: For database records or entities
- **markdown**: For markdown-formatted text content

### Collection Examples
1. **Array of objects**: `type: "object", is_collection: true, collection_type: "array"`
2. **List of emails**: `type: "object", is_collection: true, collection_type: "array"`
3. **Set of keywords**: `type: "primitive", is_collection: true, collection_type: "set"`
4. **Map of categories**: `type: "object", is_collection: true, collection_type: "map"`

**INTERVIEW_QUESTION**: Use when you need clarification
```
INTERVIEW_QUESTION:
To design the most effective next step, I need to understand [specific aspect].

[Targeted question]

This will help me [explain how the answer improves the hop design].
```

## Hop Design Process
1. Review the mission goal and success criteria
2. Inventory available assets (what we have so far)
3. Identify the gap between current state and goal
4. Consider which tools can bridge that gap effectively
5. Design a hop that leverages appropriate tools
6. Ensure the hop output is clearly defined and useful for next steps

## Guidelines
- Make hops atomic and focused on a single objective
- Ensure each hop has clear, measurable outputs
- Consider tool capabilities when designing hop logic
- Design hops that can be fully implemented with available tools
- Prefer hops that leverage tool strengths (LLM analysis, aggregation, filtering)
- Think about data flow between tools
- Consider error cases and data quality validation

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
        mission_str = format_mission(mission)
        
        # Format completed hops
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