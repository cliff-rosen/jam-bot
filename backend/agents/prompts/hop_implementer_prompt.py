from typing import Dict, Any, List, Optional, Union
from pydantic import BaseModel, Field, validator
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from schemas.chat import Message
from schemas.workflow import Mission, Asset, Hop, ToolStep
from tools.tool_registry import TOOL_REGISTRY, get_tool_definition, get_available_tools, format_tool_descriptions_for_implementation
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
        if values.get('response_type') == 'IMPLEMENTATION_PLAN' and not v.tool_steps:
            raise ValueError('hop must have populated tool_steps for IMPLEMENTATION_PLAN response type')
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

## CRITICAL REQUIREMENT
When providing an IMPLEMENTATION_PLAN response, you MUST:
1. Set response_type to "IMPLEMENTATION_PLAN"
2. Include a complete hop object with:
   - All existing fields (id, name, description, mappings)
   - A populated tool_steps array containing the tool steps to execute
   - Any necessary intermediate assets in the state object
3. Each step in the tool_steps array must include:
   - id: Unique identifier for the step
   - tool_id: ID of the tool to use
   - description: What this step accomplishes
   - parameter_mapping: Maps tool parameters to data sources
   - result_mapping: Maps tool outputs to destinations

## CRITICAL VALIDATION RULES

### 1. Resource Configs (auth_config)
For each resource_config in tool_steps:
```json
{{
  "resource_configs": {{
    "gmail": {{
      "id": "gmail",
      "name": "Gmail",
      "type": "messaging",
      "description": "Google Gmail email service for searching and retrieving emails",
      "auth_config": {{
        "type": "oauth2",
        "required_fields": [
          {{
            "field_name": "access_token",
            "field_type": "secret",
            "required": true,
            "description": "OAuth access token"
          }},
          {{
            "field_name": "refresh_token",
            "field_type": "secret",
            "required": true,
            "description": "OAuth refresh token"
          }},
          {{
            "field_name": "token_expires_at",
            "field_type": "string",
            "required": true,
            "description": "Token expiration timestamp"
          }}
        ]
      }},
      "connection_schema": {{
        "type": "object",
        "description": "Gmail OAuth credentials",
        "is_array": false,
        "fields": {{
          "access_token": {{"type": "string", "description": "OAuth access token", "is_array": false}},
          "refresh_token": {{"type": "string", "description": "OAuth refresh token", "is_array": false}},
          "token_expires_at": {{"type": "string", "description": "Token expiration timestamp", "is_array": false}}
        }}
      }}
    }}
  }}
}}
```

### 2. Parameter Mapping
Each parameter_mapping must follow these exact schemas:

For asset field references:
```json
{{
  "parameter_mapping": {{
    "query": {{
      "type": "asset_field",
      "state_asset": "search_criteria",
      "path": "content.query"
    }}
  }}
}}
```

For literal values:
```json
{{
  "parameter_mapping": {{
    "limit": {{
      "type": "literal",
      "value": 50
    }}
  }}
}}
```

### 3. Result Mapping
Each result_mapping must follow these exact schemas:

For asset field references:
```json
{{
  "result_mapping": {{
    "emails": {{
      "type": "asset_field",
      "state_asset": "step1_emails_list"
    }}
  }}
}}
```

For discarded outputs:
```json
{{
  "result_mapping": {{
    "count": {{
      "type": "discard"
    }}
  }}
}}
```

### 4. Asset Schema Rules
For any new assets created in hop.state:
```json
{{
  "state": {{
    "step1_emails_list": {{
      "id": "step1_emails_list",
      "name": "Emails List",
      "description": "List of retrieved emails",
      "schema": {{
        "type": "object",
        "is_array": true,
        "fields": {{
          "id": {{"type": "string"}},
          "subject": {{"type": "string"}},
          "labels": {{"type": "string", "is_array": true}}
        }}
      }},
      "is_collection": true,
      "collection_type": "array",
      "role": "intermediate",
      "asset_metadata": {{
        "creator": "hop_implementer",
        "version": 1
      }}
    }}
  }}
}}
```

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
  - Format: `{{tool_output_name: destination_mapping}}`
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
    "tool_steps": [
      {{
        "id": "step1_search",
        "tool_id": "email_search",
        "description": "Search emails using criteria",
        "resource_configs": {{
          "gmail": {{
            "id": "gmail",
            "name": "Gmail",
            "type": "messaging",
            "description": "Google Gmail email service for searching and retrieving emails",
            "auth_config": {{
              "type": "oauth2",
              "required_fields": [
                {{
                  "field_name": "access_token",
                  "field_type": "secret",
                  "required": true,
                  "description": "OAuth access token"
                }},
                {{
                  "field_name": "refresh_token",
                  "field_type": "secret",
                  "required": true,
                  "description": "OAuth refresh token"
                }},
                {{
                  "field_name": "token_expires_at",
                  "field_type": "string",
                  "required": true,
                  "description": "Token expiration timestamp"
                }}
              ]
            }},
            "connection_schema": {{
              "type": "object",
              "description": "Gmail OAuth credentials",
              "is_array": false,
              "fields": {{
                "access_token": {{"type": "string", "description": "OAuth access token", "is_array": false}},
                "refresh_token": {{"type": "string", "description": "OAuth refresh token", "is_array": false}},
                "token_expires_at": {{"type": "string", "description": "Token expiration timestamp", "is_array": false}}
              }}
            }},
            "capabilities": ["search", "retrieve", "send", "list_folders"],
            "base_url": "https://gmail.googleapis.com",
            "documentation_url": "https://developers.google.com/gmail/api",
            "rate_limits": {{
              "requests_per_minute": 250,
              "requests_per_day": 1000000,
              "concurrent_requests": 10
            }}
          }}
        }},
        "parameter_mapping": {{
          "query": {{"type": "asset_field", "state_asset": "search_criteria", "path": "content.query"}},
          "limit": {{"type": "literal", "value": 50}}
        }},
        "result_mapping": {{
          "emails": {{"type": "asset_field", "state_asset": "step1_emails_list"}},
          "count": {{"type": "discard"}}
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
      }}
    }}
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
      "gmail_credentials": "mission_gmail_creds"
    }},
    "output_mapping": {{
      "analysis_results": "mission_analysis_output"
    }},
    "tool_steps": [
      {{
        "id": "step1_email_search",
        "tool_id": "email_search",
        "description": "Search emails using criteria",
        "resource_configs": {{
          "gmail": {{
            "id": "gmail",
            "name": "Gmail",
            "type": "messaging",
            "description": "Google Gmail email service for searching and retrieving emails",
            "auth_config": {{
              "type": "oauth2",
              "required_fields": [
                {{
                  "field_name": "access_token",
                  "field_type": "secret",
                  "required": true,
                  "description": "OAuth access token"
                }},
                {{
                  "field_name": "refresh_token",
                  "field_type": "secret",
                  "required": true,
                  "description": "OAuth refresh token"
                }},
                {{
                  "field_name": "token_expires_at",
                  "field_type": "string",
                  "required": true,
                  "description": "Token expiration timestamp"
                }}
              ]
            }},
            "connection_schema": {{
              "type": "object",
              "description": "Gmail OAuth credentials",
              "is_array": false,
              "fields": {{
                "access_token": {{"type": "string", "description": "OAuth access token", "is_array": false}},
                "refresh_token": {{"type": "string", "description": "OAuth refresh token", "is_array": false}},
                "token_expires_at": {{"type": "string", "description": "Token expiration timestamp", "is_array": false}}
              }}
            }},
            "capabilities": ["search", "retrieve", "send", "list_folders"],
            "base_url": "https://gmail.googleapis.com",
            "documentation_url": "https://developers.google.com/gmail/api",
            "rate_limits": {{
              "requests_per_minute": 250,
              "requests_per_day": 1000000,
              "concurrent_requests": 10
            }}
          }}
        }},
        "parameter_mapping": {{
          "query": {{"type": "asset_field", "state_asset": "search_criteria", "path": "content.query"}},
          "folder": {{"type": "literal", "value": "AI News"}},
          "date_range": {{"type": "literal", "value": {{"start_date": "2024-04-01", "end_date": "2024-04-30"}}}},
          "limit": {{"type": "literal", "value": 50}},
          "include_attachments": {{"type": "literal", "value": false}},
          "include_metadata": {{"type": "literal", "value": true}}
        }},
        "result_mapping": {{
          "emails": {{"type": "asset_field", "state_asset": "step1_emails_list"}},
          "count": {{"type": "asset_field", "state_asset": "step1_emails_list", "path": "metadata.count"}}
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
            "query": {{"type": "string"}}
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
      "gmail_credentials": {{
        "id": "gmail_credentials",
        "name": "Gmail Credentials",
        "description": "OAuth credentials for Gmail access",
        "schema": {{
          "type": "object",
          "is_array": false,
          "fields": {{
            "access_token": {{"type": "string"}},
            "refresh_token": {{"type": "string"}},
            "token_expires_at": {{"type": "string", "format": "date-time"}}
          }}
        }},
        "value": {{
          "access_token": "ya29.a0AfB_byC...",
          "refresh_token": "1//04dX...",
          "token_expires_at": "2024-04-11T03:46:47.190990Z"
        }},
        "is_collection": false,
        "role": "input",
        "asset_metadata": {{
          "creator": "hop_implementer",
          "tags": [],
          "agent_associations": [],
          "version": 1,
          "token_count": 0,
          "created_at": "2024-04-11T03:46:47.190990Z",
          "updated_at": "2024-04-11T03:46:47.190990Z"
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
            "id": {{"type": "string"}},
            "thread_id": {{"type": "string"}},
            "subject": {{"type": "string"}},
            "from": {{"type": "string"}},
            "to": {{"type": "string", "is_array": true}},
            "date": {{"type": "string", "format": "date-time"}},
            "snippet": {{"type": "string"}},
            "labels": {{"type": "string", "is_array": true}}
          }}
        }},
        "value": [
          {{
            "id": "msg_123",
            "thread_id": "thread_456",
            "subject": "Test Email",
            "from": "test@example.com",
            "to": ["recipient@example.com"],
            "date": "2024-04-11T03:46:47.190990Z",
            "snippet": "This is a test email",
            "labels": ["INBOX", "IMPORTANT"]
          }}
        ],
        "subtype": null,
        "is_collection": true,
        "collection_type": "array",
        "role": "intermediate",
        "asset_metadata": {{
          "creator": "hop_implementer",
          "tags": [],
          "agent_associations": [],
          "version": 1,
          "token_count": 0,
          "created_at": "2024-04-11T03:46:47.190990Z",
          "updated_at": "2024-04-11T03:46:47.190990Z"
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
Available Assets in Hop State: {available_assets}

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
        """Formats the full prompt for the OpenAI API"""
        
        # Format existing messages
        formatted_messages = format_messages_for_openai(messages)

        # Format available assets for the prompt
        available_assets_str = "No assets available in the mission state."
        if mission and mission.mission_state:
            available_assets_list = []
            for asset_id, asset in mission.mission_state.items():
                asset_info = {
                    "id": asset_id,
                    "name": asset.name,
                    "description": asset.description,
                    "schema": asset.schema_definition.model_dump(by_alias=True) if asset.schema_definition else None,
                    "status": asset.status.value if hasattr(asset.status, 'value') else asset.status,
                    "is_collection": asset.is_collection,
                    "collection_type": asset.collection_type
                }
                available_assets_list.append(asset_info)
            
            if available_assets_list:
                available_assets_str = json.dumps(available_assets_list, indent=2)

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
            for asset_id, asset in mission.mission_state.items()
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