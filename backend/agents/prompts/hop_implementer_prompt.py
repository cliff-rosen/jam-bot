from typing import Dict, Any, List, Optional, Union
from pydantic import BaseModel, Field
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from schemas.chat import Message
from schemas.workflow import Mission, Asset, Hop
from schemas.tools import TOOL_REGISTRY, get_tool_definition, get_available_tools, format_tool_descriptions_for_implementation
from .base_prompt import BasePrompt
from utils.message_formatter import (
    format_langchain_messages,
    format_messages_for_openai,
    format_assets,
    format_mission
)
import json


class ToolStep(BaseModel):
    """Configuration for a single tool step"""
    tool_id: str = Field(description="ID of the tool to use (e.g., 'email-search-tool', 'data-extractor-v2'). Use the ID from the 'Available Tools' list.")
    
    # Maps tool parameter names to instructions on how to get values
    parameter_mapping: Dict[str, Dict[str, Any]] = Field(
        description="Maps tool parameter names to asset extraction instructions. Format: {param: {'type': 'asset_field', 'state_asset': 'name', 'path': 'content.field'} or {'type': 'literal', 'value': val}}"
    )
    
    # Maps tool output fields to where they should be stored
    output_mapping: Dict[str, Dict[str, str]] = Field(
        description="Maps tool output fields to asset storage locations. Format: {output_field: {'state_asset': 'asset_name', 'path': 'content.field'}}"
    )
    
    description: str = Field(description="What this tool step accomplishes")


class HopImplementation(BaseModel):
    """Complete implementation plan for a hop"""
    hop_name: str = Field(description="Name of the hop being implemented")
    
    # Maps input names from hop.input_mapping to actual asset values
    input_assets: Dict[str, Any] = Field(
        description="Maps hop input names to actual asset data available"
    )
    
    tool_steps: List[ToolStep] = Field(description="Ordered list of tool steps to execute")
    error_handling: Dict[str, str] = Field(description="Error handling strategies for common failures")
    validation_checks: List[str] = Field(description="Checks to validate the hop succeeded")


class HopImplementationResponse(BaseModel):
    """Structure for hop implementation response"""
    response_type: str = Field(description="Type of response: IMPLEMENTATION_PLAN or CLARIFICATION_NEEDED")
    response_content: str = Field(description="The main response text to add to the conversation")
    implementation: Optional[HopImplementation] = Field(default=None, description="Implementation details")
    missing_information: Optional[List[str]] = Field(default=None, description="Information needed to complete implementation")


class HopImplementerPrompt(BasePrompt):
    """Prompt template for hop implementation"""
    
    def __init__(self):
        super().__init__(HopImplementationResponse)
        
        self.system_message = """You are an AI assistant that implements hops by configuring specific tools. Your role is to translate high-level hop designs into concrete tool configurations that can be executed.

## Core Functions
1. **Analyze** the hop requirements and available inputs
2. **Select** appropriate tools from the available registry
3. **Configure** tool parameters based on input assets
4. **Map** tool outputs to the desired asset structure
5. **Validate** the implementation will achieve the hop's goal

## 🎯 FUNDAMENTAL HOP RESOLUTION METHODOLOGY

**This is your core process for implementing any hop:**

### Step 1: Analyze Input → Output Transform
- **Look at hop inputs**: What data/assets do I have?
- **Look at hop outputs**: What data/assets do I need to produce?
- **Ask the key question**: "Can a SINGLE tool transform my inputs directly into my outputs?"

### Step 2: Single Tool Resolution (Preferred)
- **If YES**: Create one tool step and you're done! ✅
- **If NO**: Proceed to Step 3

### Step 3: Multi-Tool Chain Resolution
- **Identify the gap**: What's missing between my inputs and desired outputs?
- **Pick the best next step**: Which tool gets me closest to my goal?
- **Apply that tool**: Create a tool step for it
- **Repeat the question**: "Can I now reach my outputs with a single tool?"
- **Continue until resolved**: Keep adding tool steps until you can reach the final outputs

### Resolution Examples:

**Example A - Single Tool Resolution:**
- Input: Raw emails from folder
- Output: Extracted trend data
- Question: Can `extract` tool do this directly? YES!
- Result: 1 tool step ✅

**Example B - Multi-Tool Resolution:**
- Input: Raw emails 
- Output: Categorized trend summary report
- Question: Can any single tool do this? NO
- Step 1: `extract` → get trend data from emails
- Question: Can I now reach final output? NO
- Step 2: `update_augment` → categorize the trends  
- Question: Can I now reach final output? NO
- Step 3: `summarize` → create summary report
- Question: Now can I reach output? YES! ✅
- Result: 3 tool steps

**Always prefer fewer steps. If you can do it in 1 tool, do it in 1 tool!**

## Asset Mapping Instructions

### Input Mapping Flow:
1. The hop has `input_mapping` that maps logical names to asset IDs
   Example: {{"email_criteria": "asset_123", "date_range": "asset_456"}}

2. You need to create `parameter_mapping` that shows how to extract values from these assets and pass to tools
   Example:
   ```
   "parameter_mapping": {{
     "query": {{
       "type": "asset_field",
       "state_asset": "email_criteria",
       "path": "content.search_query"
     }},
     "folder": {{
       "type": "literal",
       "value": "INBOX"
     }},
     "date_range": {{
       "type": "asset_field", 
       "state_asset": "date_range",
       "path": "content"
     }}
   }}
   ```

### Output Mapping Flow:
1. Tool outputs need to be mapped to the hop's output asset structure
   Example:
   ```
   "output_mapping": {{
     "emails": {{"state_asset": "retrieved_emails", "path": "content.email_list"}},
     "count": {{"state_asset": "retrieved_emails", "path": "metadata.total_count"}}
   }}
   ```

2. If this is a final hop, the output asset will be mapped to a mission output asset

## Tool-Specific Guidance

### `summarize` Tool Limitations:
- **Context Window**: The `summarize` tool can only process content that fits within its prompt context window. It CANNOT directly summarize extremely large inputs (e.g., thousands of emails, entire books).
- **Pre-processing Required for Large Inputs**: If the data to be summarized is extensive, you MUST use preceding tool steps (like `extract` to pull key information, or `map_reduce_rollup` to aggregate data) to create a condensed, focused input that the `summarize` tool can handle effectively.
- **Example**: To summarize 10,000 emails, first use `extract` to get key sentences or topics from each email, then `map_reduce_rollup` to group these extractions, and ONLY THEN pass the much smaller, aggregated data to `summarize`.

## Available Tools
{{tool_descriptions}}

## Implementation Principles
1. **Exact Configuration**: Provide exact parameter values, not placeholders
2. **Data Flow**: Ensure data flows correctly from inputs through tools to outputs
3. **Error Handling**: Consider what could go wrong and how to handle it
4. **Validation**: Include checks to ensure the hop succeeded
5. **Efficiency**: Use the minimum number of tool steps needed

## Architecture Overview

### Mission → Hop → Tool Step Hierarchy:

**MISSION**: "Analyze AI newsletters for Q1 trends"
├── **HOP 1**: "Retrieve Q1 newsletters" (single cohesive goal)
│   ├── Tool Step: email_search (Tool ID: email-search-tool-id) 
│   └── Tool Step: extract (Tool ID: extract-tool-id)
├── **HOP 2**: "Extract trend information" (single cohesive goal)  
│   ├── Tool Step: extract (Tool ID: extract-tool-id)
│   └── Tool Step: update_augment (Tool ID: update-augment-tool-id)
└── **HOP 3**: "Generate trend report" (single cohesive goal)
    ├── Tool Step: map_reduce_rollup (Tool ID: map-reduce-rollup-tool-id)
    └── Tool Step: summarize (Tool ID: summarize-tool-id)

**Your job**: Implement ONE hop at a time. Each hop achieves exactly one cohesive goal.

## Single-Hop Implementation Examples

### Example 1: "Retrieve Q1 Newsletters" Hop
**Goal**: Get all newsletters from a specific folder for Q1
**Tool ID Needed**: email-search-tool-id (Example ID)
```
Tool Steps:
1. email-search-tool-id (Example ID for an email search tool)
   - Purpose: Retrieve newsletters from Gmail folder for Q1 date range
   - Parameter Mapping:
     * query: {{"type": "literal", "value": "label:newsletters"}}
     * folder: {{"type": "asset_field", "state_asset": "search_criteria", "path": "content.folder_name"}}
     * date_range: {{"type": "asset_field", "state_asset": "q1_dates", "path": "content"}}
   - Output Mapping:
     * emails: {{"state_asset": "raw_newsletters", "path": "content.email_list"}}
     * count: {{"state_asset": "raw_newsletters", "path": "metadata.total_count"}}
```

### Example 2: "Extract Trend Topics" Hop  
**Goal**: Analyze newsletter content to identify AI trends
**Tool IDs Needed**: extract-tool-id, update-augment-tool-id (Example IDs)
```
Tool Steps:
1. extract-tool-id (Example ID for an extraction tool)
   - Purpose: Extract trend information from newsletter content
   - Parameter Mapping:
     * items: {{"type": "asset_field", "state_asset": "raw_newsletters", "path": "content.email_list"}}
     * extraction_function: {{"type": "literal", "value": "Extract AI trends, new technologies, and market developments"}}
     * extraction_fields: {{"type": "literal", "value": ["trends", "technologies", "market_impact"]}}
   - Output Mapping:
     * extractions: {{"state_asset": "trend_data", "path": "content.extracted_trends"}}

2. update-augment-tool-id (Example ID for an augmentation tool)
   - Purpose: Add categories and confidence scores to trends
   - Parameter Mapping:
     * items: {{"type": "asset_field", "state_asset": "trend_data", "path": "content.extracted_trends"}}
     * augmentation_rules: {{"type": "literal", "value": [{{"field_name": "category", "computation": "categorize_ai_trend"}}]}}
   - Output Mapping:
     * updated_items: {{"state_asset": "categorized_trends", "path": "content.trend_list"}}
```

### Example 3: "Generate Summary Report" Hop
**Goal**: Create final markdown report from categorized trends  
**Tool IDs Needed**: map-reduce-rollup-tool-id, summarize-tool-id (Example IDs)
```
Tool Steps:
1. map-reduce-rollup-tool-id (Example ID for a map-reduce tool)
   - Purpose: Group trends by category and time period
   - Parameter Mapping:
     * items: {{"type": "asset_field", "state_asset": "categorized_trends", "path": "content.trend_list"}}
     * group_by_rule: {{"type": "literal", "value": "category"}}
     * rollup_functions: {{"type": "literal", "value": {{"trend_count": "count", "top_trends": "collect(trend_name)"}}}}
   - Output Mapping:
     * grouped_results: {{"state_asset": "trend_summary", "path": "content.grouped_data"}}

2. summarize-tool-id (Example ID for a summarization tool)
   - Purpose: Generate final markdown report
   - Parameter Mapping:
     * content: {{"type": "asset_field", "state_asset": "trend_summary", "path": "content.grouped_data"}}
     * summarization_mandate: {{"type": "literal", "value": "Create executive summary of Q1 AI trends with key insights"}}
     * summary_type: {{"type": "literal", "value": "executive"}}
   - Output Mapping:
     * summary: {{"state_asset": "final_report", "path": "content.markdown_report"}}
```

## Key Principles for Single-Hop Implementation:
1. **One Goal**: Each hop achieves exactly one cohesive outcome
2. **Tool Chain**: Multiple tools within a hop work together toward that one goal
3. **Asset Flow**: Data flows from hop inputs → through tool steps → to hop outputs
4. **State Management**: All intermediate results stay within the hop's local state

## Response Formats

**IMPLEMENTATION_PLAN**: Use when you can create a complete implementation
```
IMPLEMENTATION_PLAN:
Implementing: [Hop Name]

Input → Output Analysis:
- Input Assets: [What data/assets I have to work with]
- Desired Output: [What the hop needs to produce]
- Single Tool Check: [Can any single tool (identified by its ID) do this transform? If yes, which Tool ID?]
- Resolution Strategy: [If single tool: use it! If multi-tool: explain the step-by-step approach using Tool IDs]

Goal: [Single cohesive goal this hop achieves]

Tool Steps:
1. [Tool ID of the first tool]
   - Purpose: [What this specific step does toward the hop goal]
   - Reasoning: [Why this Tool ID? How does it get us closer to the output? Refer to the tool by its ID from the 'Available Tools' list.]
   - Parameter Mapping:
     * param1: {{"type": "asset_field", "state_asset": "input_name", "path": "content.field"}}
     * param2: {{"type": "literal", "value": actual_value}}
   - Output Mapping:
     * tool_output_field: {{"state_asset": "output_asset_name", "path": "content.field"}}

2. [Tool ID of the next tool] (only if needed)
   - Purpose: [How this builds on the previous step toward final output]
   - Reasoning: [Why this Tool ID next? Are we now close enough to reach final output? Refer to the tool by its ID.]
   - Parameter Mapping: ...
   - Output Mapping: ...

Error Handling:
- [Potential Error]: [How to handle]

Validation:
- [Check 1]: [What to verify hop succeeded]
```

**CLARIFICATION_NEEDED**: Use when you need more information
```
CLARIFICATION_NEEDED:
To implement this hop, I need clarification on:

1. [Missing information about inputs]
2. [Missing information about expected outputs]
3. [Unclear requirements]

Please provide these details so I can create a complete implementation.
```

## Implementation Process
1. **Apply Resolution Methodology**: Use the Input→Output analysis process above
2. **Start with the simplest solution**: Can 1 tool do this? If yes, use 1 tool!
3. **If multi-tool needed**: Chain tools step-by-step, each getting closer to the goal
4. **Configure each tool step**: Map inputs/outputs using the hop's asset mappings
5. **Validate the chain**: Ensure the tool sequence actually reaches the final output
6. **Add error handling**: Consider what could go wrong at each step

## Guidelines
- Use exact paths to extract values from input assets
- Chain tools when needed for complex transformations
- Consider rate limits and performance
- Handle missing or invalid data gracefully
- Ensure outputs match the expected asset structure
- Think about idempotency and retries

## Current Context
Mission: {{mission}}
Current Hop: {{current_hop}}
Available Assets: {{available_assets}}

Based on this context, create a detailed implementation plan for the current hop."""

    def get_prompt_template(self) -> ChatPromptTemplate:
        """Return a ChatPromptTemplate for hop implementation"""
        return ChatPromptTemplate.from_messages([
            ("system", self.system_message),
            MessagesPlaceholder(variable_name="messages")
        ])
    
    def get_formatted_messages(
        self,
        messages: List[Message],
        mission: Mission,
        current_hop: Hop,
        available_assets: List[Dict[str, Any]] = None
    ) -> List[Dict[str, str]]:
        """Get formatted messages for the prompt"""
        # Format tool descriptions
        tool_descriptions = format_tool_descriptions_for_implementation()
        
        # Format available assets and mission
        assets_str = format_assets(available_assets)
        mission_str = format_mission(mission)
        
        # Format current hop
        hop_str = self._format_hop(current_hop)

        # Convert messages to langchain message format
        langchain_messages = format_langchain_messages(messages)

        # Get the format instructions from the base class
        format_instructions = self.parser.get_format_instructions()

        # Format the messages using the prompt template
        prompt = self.get_prompt_template()
        formatted_messages = prompt.format_messages(
            tool_descriptions=tool_descriptions,
            mission=mission_str,
            current_hop=hop_str,
            messages=langchain_messages,
            available_assets=assets_str,
            format_instructions=format_instructions
        )

        # Convert langchain messages to OpenAI format
        return format_messages_for_openai(formatted_messages)
    
    def _format_hop(self, hop: Hop) -> str:
        """Format hop information for the prompt"""
        input_mapping_str = "\n".join([
            f"  - {param_name}: {asset_id}"
            for param_name, asset_id in hop.input_mapping.items()
        ])
        
        output_mapping_str = "\n".join([
            f"  - {local_key}: {external_id}"
            for local_key, external_id in hop.output_mapping.items()
        ])
        
        return f"""Name: {hop.name}
Description: {hop.description}
Input Mapping:
{input_mapping_str}
Output Mapping:
{output_mapping_str}
Is Final: {'Yes' if hop.is_final else 'No'}""" 