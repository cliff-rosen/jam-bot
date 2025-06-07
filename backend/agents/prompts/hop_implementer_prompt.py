from typing import Dict, Any, List, Optional, Union
from pydantic import BaseModel, Field, validator
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from schemas.chat import Message
from schemas.workflow import Mission, Asset, Hop, ToolStep
from schemas.tools import TOOL_REGISTRY, get_tool_definition, get_available_tools, format_tool_descriptions_for_implementation
from .base_prompt import BasePrompt
from utils.message_formatter import format_mission, format_assets, format_langchain_messages, format_messages_for_openai
import json


class HopImplementationResponse(BaseModel):
    """Structure for hop implementation response"""
    response_type: str = Field(
        description="Type of response: IMPLEMENTATION_PLAN, CLARIFICATION_NEEDED, or RESOLUTION_FAILED"
    )
    response_content: str = Field(description="The main response text to add to the conversation")
    hop: Optional[Hop] = Field(default=None, description="Updated hop with populated tool steps")
    missing_information: Optional[List[str]] = Field(default=None, description="Information needed to complete implementation")
    resolution_failure: Optional[Dict[str, Any]] = Field(
        default=None,
        description="Details about why resolution failed, including failure_type and specific issues"
    )

    @validator('response_type')
    def validate_response_type(cls, v):
        valid_types = ['IMPLEMENTATION_PLAN', 'CLARIFICATION_NEEDED', 'RESOLUTION_FAILED']
        if v not in valid_types:
            raise ValueError(f'response_type must be one of {valid_types}')
        return v

    @validator('hop')
    def validate_hop_for_implementation(cls, v, values):
        if values.get('response_type') == 'IMPLEMENTATION_PLAN' and not v:
            raise ValueError('hop must be provided for IMPLEMENTATION_PLAN response type')
        if values.get('response_type') == 'IMPLEMENTATION_PLAN' and not v.steps:
            raise ValueError('hop must have populated steps for IMPLEMENTATION_PLAN response type')
        return v

    @validator('missing_information')
    def validate_missing_information(cls, v, values):
        if values.get('response_type') == 'CLARIFICATION_NEEDED' and not v:
            raise ValueError('missing_information must be provided for CLARIFICATION_NEEDED response type')
        return v

    @validator('resolution_failure')
    def validate_resolution_failure(cls, v, values):
        if values.get('response_type') == 'RESOLUTION_FAILED' and not v:
            raise ValueError('resolution_failure must be provided for RESOLUTION_FAILED response type')
        if v and not v.get('failure_type'):
            raise ValueError('resolution_failure must include failure_type')
        return v


class HopImplementerPrompt(BasePrompt):
    """Prompt template for hop implementation"""
    
    def __init__(self):
        super().__init__(HopImplementationResponse)
        
        self.system_message = """You are an expert system designer tasked with resolving a hop by creating an optimal chain of tool steps. Your goal is to transform the hop's input assets into the desired output assets using the available tools.

## Asset Flow Architecture

There are **two distinct mapping layers**:

### 1. HOP MAPPINGS (Mission ↔ Hop State)
- **Input mapping**: `{{local_key: external_asset_id}}` - Brings mission assets into hop's local workspace
- **Output mapping**: `{{local_key: external_asset_id}}` - Exports hop results back to mission assets

### 2. TOOL MAPPINGS (Hop State ↔ Tool I/O)
- **Parameter mapping**: Maps tool parameter names to their data sources
  - Format: `{{tool_param_name: data_source}}`
  - Direction: **tool_param ← asset** (tool gets value FROM asset)
  - Asset channel: {{"type": "asset_field", "state_asset": "asset_name", "path": "content.field"}}
  - Literal channel: {{"type": "literal", "value": "configuration_value"}}
- **Result mapping**: Maps tool output names to their destinations  
  - Format: `{{tool_output_name: destination}}`
  - Direction: **tool_output → destination** (tool puts value TO destination)
  - Asset channel: {{"type": "asset_field", "state_asset": "asset_name"}}
  - Discard channel: {{"type": "discard"}} (output ignored/discarded)
  - **REQUIREMENT**: At least one tool output must be mapped (can mix asset and discard)

Visual Flow:
```
Mission Assets → [Hop Input Mapping] → Hop State → [Tool Parameter Mapping] → Tool Inputs
                                                        ↓ literal values      ↓
Mission Assets ← [Hop Output Mapping] ← Hop State ← [Tool Result Mapping] ← Tool Outputs
                                           ↑ discarded outputs             ↑
```

## Asset Management

### Creating Intermediate Assets
When creating new assets in hop state:
1. **Asset Types** (from unified_schema):
   - **Primitive**: `string`, `number`, `boolean`, `primitive`
   - **Complex**: `object`, `file`, `database_entity`, `markdown`, `config`
   - **Custom**: `email`, `webpage`, `search_result`, `pubmed_article`, `newsletter`, `daily_newsletter_recap`

2. **Collection Assets Structure**:
   - **Schema level**: Use `"is_array": true` in the schema for array collections
   - **Asset level**: Use `"is_collection": true` and `"collection_type": "array"` on the asset
   - **Example collection asset**:
     ```json
     {{
       "schema": {{
         "type": "object",
         "is_array": true,
         "fields": {{
           "sender": {{"type": "string"}},
           "subject": {{"type": "string"}}
         }}
       }},
       "is_collection": true,
       "collection_type": "array"
     }}
     ```

3. **Asset Naming**:
   - Use descriptive names that reflect the content
   - Prefix with step name for clarity (e.g., `step1_extracted_text`)
   - Include data type hint (e.g., `_list`, `_array`, `_text`)

4. **Asset Metadata**:
   - Set `creator` to "hop_implementer"
   - Add `source_step` to track which step created it
   - Include `content_type` to specify data format

### Asset Path Specification
The `path` field in asset references specifies where to find data:
- Use `"content"` for the entire asset content
- Use `"content.field"` for specific fields
- Use `"content.array[0]"` for array elements
- Use `"content.nested.field"` for deep paths
- Maximum depth: 3 levels (e.g., `content.data.items[0].field`)

## Parameter Mapping Rules for Tools

**Direction**: Tool parameters get their values FROM assets or literals.
Format: `{{tool_param_name: data_source}}`

Use these three types for tool parameter mapping:

1. **LITERAL VALUES** - Tool-specific configuration
   - Format: {{"type": "literal", "value": "actual_value"}}
   - Use for: search queries, sort orders, limits, format options, boolean flags
   - Examples: 
     - "query": {{"type": "literal", "value": "search for AI research"}}
     - "limit": {{"type": "literal", "value": 50}}
     - "sort_order": {{"type": "literal", "value": "ascending"}}

2. **ASSET REFERENCES** - Data from hop state
   - Format: {{"type": "asset_field", "state_asset": "asset_name", "path": "content.field"}}
   - Use for: email collections, extracted data, computed results from previous steps
   - Examples:
     - "emails": {{"type": "asset_field", "state_asset": "step1_emails_list"}}
     - "search_criteria": {{"type": "asset_field", "state_asset": "search_params", "path": "content.query"}}

3. **CONFIG ASSETS** - Configuration stored as assets
   - Format: {{"type": "asset_field", "state_asset": "config_asset_name"}}
   - Use when referencing CONFIG type assets that contain configuration values
   - Example: "credentials": {{"type": "asset_field", "state_asset": "gmail_credentials"}}

## Tool Chain Design Priorities
1. **Success likelihood** - Choose reliable tool combinations
2. **Simplicity** - Minimize steps (target 1-5, max ~12)
3. **Efficiency** - Avoid unnecessary data transformations

### 🔴 CRITICAL CONSISTENCY RULES (must be satisfied)
1. Every `state_asset` reference used in `parameter_mapping` **and** `result_mapping` **MUST** already exist as a key in `hop.state` **unless** your plan also includes creating a new `Asset` object in `hop.state` with that exact key *before* it is referenced.
2. If you create a brand-new asset, its `id` **must exactly match** the key you use in mappings.
3. Validation will reject an implementation plan that references unknown `state_asset` keys.

## Task Instructions

1. **Analyze the hop requirements**
   - Review existing hop input/output mappings
   - Understand what transformation is needed between mapped assets
   - Identify required intermediate assets

2. **Design the tool chain**
   - Create tool steps that operate on hop's local state
   - Use appropriate parameter mappings (asset_field vs literal)
   - Ensure tool outputs populate hop state correctly
   - Validate tool input/output schema compatibility
   - Handle multiple outputs appropriately

3. **Validate the design**
   - Verify hop input mapping provides necessary data to tool chain
   - Ensure tool chain produces data that hop output mapping can export
   - Check for potential failure points
   - Verify schema compatibility between steps

## Response Format

```json
{{
  "response_type": "IMPLEMENTATION_PLAN | CLARIFICATION_NEEDED | RESOLUTION_FAILED",
  "response_content": "Explanation of the implementation or why it failed",
  "hop": {{
    "id": "unique_hop_id",
    "name": "Hop Name",
    "description": "Hop description",
    "input_mapping": {{"local_key": "external_asset_id"}},
    "output_mapping": {{"local_key": "external_asset_id"}},
    "steps": [
      {{
        "id": "step_id",
        "tool_id": "tool_name",
        "description": "Step description",
        "parameter_mapping": {{
          "param_name": {{"type": "asset_field", "state_asset": "asset_name"}}
        }},
        "result_mapping": {{
          "tool_output": "local_asset_name"
        }}
      }}
    ]
  }},
  "missing_information": [
    // List of information needed to complete implementation
    // Required for CLARIFICATION_NEEDED
  ],
  "resolution_failure": {{
    // Required for RESOLUTION_FAILED
    "failure_type": "INSUFFICIENT_TOOLS | INVALID_ASSETS | UNREACHABLE_OUTPUT | INCOMPATIBLE_SCHEMAS | MISSING_DEPENDENCIES | OTHER",
    "specific_issues": ["Detailed list of why resolution failed"],
    "suggested_alternatives": ["Possible alternative approaches"]
  }}
}}
```

## Complete Example

Here's a complete example of a hop implementation:

```json
{{
  "response_type": "IMPLEMENTATION_PLAN",
  "response_content": "Implementing email search and content extraction hop",
  "hop": {{
    "id": "email_analysis_hop",
    "name": "Email Content Analysis",
    "description": "Search emails and extract key content",
    "input_mapping": {{
      "search_criteria": "mission_search_criteria",
      "email_credentials": "mission_email_creds"
    }},
    "output_mapping": {{
      "analysis_results": "mission_analysis_output"
    }},
    "steps": [
      {{
        "id": "step1_email_search",
        "tool_id": "email_search",
        "description": "Search emails using criteria",
        "parameter_mapping": {{
          "query": {{"type": "asset_field", "state_asset": "search_criteria", "path": "content.query"}},
          "resource_connection": {{"type": "asset_field", "state_asset": "email_credentials"}},
          "limit": {{"type": "literal", "value": 50}}
        }},
        "result_mapping": {{
          "emails": {{"type": "asset_field", "state_asset": "step1_emails_list"}},
          "count": {{"type": "discard"}}
        }}
      }},
      {{
        "id": "step2_content_extract",
        "tool_id": "content_extractor",
        "description": "Extract key content from emails",
        "parameter_mapping": {{
          "emails": {{"type": "asset_field", "state_asset": "step1_emails_list"}},
          "extract_fields": {{"type": "literal", "value": ["subject", "body", "date"]}}
        }},
        "result_mapping": {{
          "extracted_content": {{"type": "asset_field", "state_asset": "analysis_results"}}
        }}
      }}
    ],
    "state": {{
      "search_criteria": {{
        "id": "search_criteria",
        "name": "Search Criteria",
        "description": "Email search parameters",
        "schema": {{
          "type": "object",
          "is_array": false,
          "fields": {{
            "query": {{"type": "string"}},
            "date_range": {{"type": "object"}}
          }}
        }},
        "value": null,
        "is_collection": false,
        "role": "input",
        "asset_metadata": {{
          "creator": "hop_implementer",
          "tags": [],
          "agent_associations": [],
          "version": 1,
          "token_count": 0
        }}
      }},
      "email_credentials": {{
        "id": "email_credentials",
        "name": "Email Credentials",
        "description": "OAuth credentials for email access",
        "schema": {{
          "type": "config",
          "is_array": false
        }},
        "value": null,
        "subtype": "oauth_token",
        "is_collection": false,
        "role": "input",
        "asset_metadata": {{
          "creator": "hop_implementer",
          "tags": [],
          "agent_associations": [],
          "version": 1,
          "token_count": 0
        }}
      }},
      "step1_emails_list": {{
        "id": "step1_emails_list",
        "name": "EmailsList",
        "description": "List of emails from search",
        "schema": {{
          "type": "object",
          "is_array": true,
          "fields": {{
            "sender": {{"type": "string"}},
            "subject": {{"type": "string"}},
            "body": {{"type": "string"}},
            "date": {{"type": "string"}}
          }}
        }},
        "value": null,
        "subtype": null,
        "is_collection": true,
        "collection_type": "array",
        "role": "intermediate",
        "asset_metadata": {{
          "creator": "hop_implementer",
          "tags": [],
          "agent_associations": [],
          "version": 1,
          "token_count": 0
        }}
      }},
      "analysis_results": {{
        "id": "analysis_results", 
        "name": "Analysis Results",
        "description": "Extracted and analyzed email content",
        "schema": {{
          "type": "object",
          "is_array": true,
          "fields": {{
            "sender": {{"type": "string"}},
            "subject": {{"type": "string"}},
            "body": {{"type": "string"}},
            "date": {{"type": "string"}}
          }}
        }},
        "value": null,
        "subtype": null,
        "is_collection": true,
        "collection_type": "array",
        "role": "output",
        "asset_metadata": {{
          "creator": "hop_implementer",
          "tags": [],
          "agent_associations": [],
          "version": 1,
          "token_count": 0
        }}
      }}
    }}
  }}
}}
```

## CRITICAL ASSET TYPE RULES (from unified_schema):
- ✅ **Valid schema types**: `string`, `number`, `boolean`, `primitive`, `object`, `file`, `database_entity`, `markdown`, `config`, `email`, `webpage`, `search_result`, `pubmed_article`, `newsletter`, `daily_newsletter_recap`
- ❌ **INVALID**: `collection`, `array`, `list` - these are NOT valid schema types!
- ✅ **For collections**: Use valid base type + `"is_array": true` in schema + `"is_collection": true` in asset
- ✅ **Schema structure**: `schema.type` = base type, `schema.is_array` = true for arrays
- ✅ **Asset structure**: `is_collection` = true, `collection_type` = "array"/"map"/"set"

Remember: Your job is to design the tool steps that transform the hop's local state. The hop's input/output mappings handle the mission asset flow.

If you cannot produce a valid resolution, you MUST:
1. Set response_type to "RESOLUTION_FAILED"
2. Provide detailed failure information
3. Suggest alternative approaches if possible

## Available Tools
{tool_descriptions}

## Current Context
Mission: {mission}
Current Hop: {current_hop}
Available Assets: {available_assets}

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
        
        # Convert mission to dict and handle datetime serialization
        mission_dict = mission.model_dump(mode='json')
        mission_dict['inputs'] = [asset.model_dump(mode='json') for asset in mission.inputs]
        mission_dict['outputs'] = [asset.model_dump(mode='json') for asset in mission.outputs]
        mission_dict['state'] = {
            asset_id: asset.model_dump(mode='json')
            for asset_id, asset in mission.state.items()
        }
        
        # Format mission string with serialized dates
        mission_str = format_mission(mission_dict, context_for_hop=True)
        
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