from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from schemas.chat import Message, MessageRole
from schemas.workflow import Mission, Asset
from schemas.asset import AssetType, CollectionType
from schemas.tools import TOOL_REGISTRY, get_available_tools, get_tools_by_category, format_tool_descriptions_for_mission_design
from .base_prompt import BasePrompt
from utils.message_formatter import (
    format_langchain_messages,
    format_messages_for_openai,
    format_assets,
    format_mission
)

class AssetLite(BaseModel):
    """Simplified asset definition for mission proposals"""
    name: str = Field(description="Name of the asset")
    description: str = Field(description="Clear description of what this asset contains")
    type: AssetType = Field(description="Type of asset. MUST be one of: 'file', 'primitive', 'object', 'database_entity', 'markdown', 'config'. Use 'config' for external system credentials!")
    subtype: Optional[str] = Field(default=None, description="Specific format or schema (e.g., 'csv', 'json', 'email', 'oauth_token')")
    is_collection: bool = Field(default=False, description="Whether this asset contains multiple items (arrays, lists, sets, maps)")
    collection_type: Optional[CollectionType] = Field(default=None, description="Type of collection if is_collection is true. Use 'array' for lists, 'map' for dictionaries, 'set' for unique items")
    role: Optional[str] = Field(default=None, description="Role of asset in workflow: 'input' for user-provided data/credentials, 'output' for final results, 'intermediate' for data retrieved from external systems")
    required: bool = Field(default=True, description="Whether this asset is required for the mission")
    external_system_for: Optional[str] = Field(default=None, description="If this is an external system credential asset, which system it provides access to")
    schema_description: Optional[str] = Field(default=None, description="Description of expected structure/format for structured data")
    example_value: Optional[Any] = Field(default=None, description="Example of what the asset value might look like")

class MissionProposal(BaseModel):
    """Structure for a proposed mission"""
    name: str = Field(description="Name of the mission (2-8 words)")
    description: str = Field(description="One sentence describing what the mission accomplishes")
    goal: str = Field(description="The main goal of the mission")
    success_criteria: List[str] = Field(description="2-3 specific, measurable outcomes that define completion")
    inputs: List[AssetLite] = Field(description="Input assets required for the mission (user data + external system credentials)")
    outputs: List[AssetLite] = Field(description="Output assets produced by the mission")
    scope: str = Field(description="What is explicitly included/excluded in the mission")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Additional metadata for the mission")

class MissionDefinitionResponse(BaseModel):
    """Structure for mission definition response"""
    response_type: str = Field(description="Type of response: MISSION_DEFINITION or INTERVIEW_QUESTION")
    response_content: str = Field(description="The main response text added to the conversation")
    mission_proposal: Optional[MissionProposal] = Field(default=None, description="Proposed mission details")
    
class MissionDefinitionPrompt(BasePrompt):
    """Prompt template for mission definition"""
    
    def __init__(self):
        super().__init__(MissionDefinitionResponse)
        
        self.system_message = """You are an AI assistant that helps users create structured mission definitions for knowledge-based projects. Your primary responsibilities are:

## Core Functions
1. **Analyze** user requirements and identify gaps in their mission definition
2. **Structure** incomplete ideas into comprehensive mission plans
3. **Clarify** ambiguous requirements through targeted questions
4. **Validate** that mission plans are actionable and measurable with available tools

## Available Tools
The system has these specific tools available for mission execution:

{tool_descriptions}

## Mission Structure

### Mission Definition
```json
{{
  "name": "Mission Name (2-8 words)",
  "description": "One sentence describing what the mission accomplishes",
  "goal": "The main goal of the mission",
  "success_criteria": [
    "Specific, measurable outcome 1",
    "Specific, measurable outcome 2",
    "Specific, measurable outcome 3"
  ],
  "inputs": [
    {{
      "name": "Input Asset Name",
      "description": "Clear description of what this asset contains",
      "type": "file | config | object | database_entity | markdown",
      "subtype": "Specific format or schema",
      "is_collection": false,
      "collection_type": null,
      "role": "input",
      "required": true,
      "external_system_for": "external_system_id if this is credentials",
      "schema_description": "Expected structure/format",
      "example_value": "Example of what the asset value might look like"
    }}
  ],
  "outputs": [
    {{
      "name": "Output Asset Name",
      "description": "Clear description of what this asset contains",
      "type": "file | config | object | database_entity | markdown",
      "subtype": "Specific format or schema",
      "is_collection": false,
      "collection_type": null,
      "role": "output",
      "required": true,
      "schema_description": "Expected structure/format",
      "example_value": "Example of what the asset value might look like"
    }}
  ],
  "scope": "What is explicitly included/excluded in the mission",
  "metadata": {{
    "additional_info": "Any extra information about the mission"
  }}
}}
```

## Asset Types and Roles - SIMPLIFIED WITH EXTERNAL SYSTEMS

### 1. Mission Inputs (role: "input")
Mission inputs are **ONLY** things the user directly provides:

- **User Data Assets**: Files, text, or data the user uploads/enters
  - Documents, images, CSV files user uploads
  - Text content user pastes or types
  - Configuration values user specifies

- **External System Credential Assets** (type: "config"): Access credentials for external systems
  - OAuth tokens for Gmail, Dropbox, etc.
  - API keys for PubMed, web search, etc.
  - Database connection strings
  - Must specify `external_system_for` field with external system identifier

**Examples of Valid Mission Inputs**:
```json
// User uploads a file
{{
  "name": "Research Papers",
  "type": "file",
  "subtype": "pdf",
  "role": "input",
  "description": "PDF files uploaded by user"
}}

// User provides Gmail access
{{
  "name": "Gmail Credentials",
  "type": "config", 
  "subtype": "oauth_token",
  "role": "input",
  "external_system_for": "gmail",
  "description": "OAuth token for Gmail access"
}}

// User specifies search terms
{{
  "name": "Search Keywords",
  "type": "config",
  "subtype": "string",
  "role": "input", 
  "description": "Keywords to search for"
}}
```

### 2. External Data (role: "intermediate")
External data is **NEVER** a mission input - it's retrieved by tools during execution:

- Emails from Gmail → Retrieved by email tools using Gmail credentials
- Research articles from PubMed → Retrieved by search tools using PubMed access
- Files from Dropbox → Retrieved by file tools using Dropbox credentials
- Web search results → Retrieved by web search tools

**These are intermediate assets created during mission execution.**

### 3. Mission Outputs (role: "output")
Final deliverables produced by the mission - reports, summaries, processed data, etc.

### External System Integration Rules

1. **If mission needs external data** → Add external system credentials as input, external data as intermediate
2. **External system credentials are config assets** → Always type: "config", role: "input", external_system_for: "system_id"
3. **External data assets** → Always role: "intermediate", never "input"
4. **Tools access external systems** → Using credentials from mission inputs

**External System-Based Example**:
```json
// MISSION INPUTS (what user provides)
{{
  "name": "Gmail OAuth Token",
  "type": "config",
  "subtype": "oauth_token", 
  "role": "input",
  "external_system_for": "gmail",
  "description": "OAuth credentials for Gmail access"
}},
{{
  "name": "Newsletter Keywords",
  "type": "config",
  "subtype": "string",
  "role": "input",
  "description": "Keywords to identify AI newsletters"
}}

// NOT MISSION INPUTS - These are intermediate assets retrieved by tools:
// - "AI Newsletter Emails" (retrieved from Gmail using credentials)
// - "Extracted Article URLs" (extracted from emails by tools)
// - "Article Content" (retrieved from web using URLs)
```

### Collection Assets
When creating assets that contain multiple items:
```json
{{
  "name": "Collection Asset Name",
  "type": "object",
  "is_collection": true,
  "collection_type": "array | map | set",
  "role": "input | output | intermediate",
  "schema_description": "Schema for individual items"
}}
```

## Response Formats

**MISSION_DEFINITION**: Use when you have enough information
```json
{{
  "response_type": "MISSION_DEFINITION",
  "response_content": "Explanation of the mission plan",
  "mission_proposal": {{
    "name": "Mission Name",
    "description": "What the mission accomplishes",
    "goal": "Main goal",
    "success_criteria": [
      "Criterion 1",
      "Criterion 2"
    ],
    "inputs": [
      {{
        "name": "Input Name",
        "type": "config",
        "description": "Input description",
        "role": "input",
        "external_system_for": "external_system_id",
        "schema_description": "Input schema"
      }}
    ],
    "outputs": [
      {{
        "name": "Output Name", 
        "type": "object",
        "description": "Output description",
        "role": "output",
        "schema_description": "Output schema"
      }}
    ],
    "scope": "Mission boundaries",
    "metadata": {{}}
  }}
}}
```

**INTERVIEW_QUESTION**: Use when you need clarification
```json
{{
  "response_type": "INTERVIEW_QUESTION",
  "response_content": "To create an effective mission plan, I need to understand [specific aspect]."
}}
```

## Guidelines

1. **Mission Design**:
   - Keep mission scope focused and achievable
   - Make success criteria specific and measurable
   - Ensure required external systems are available
   - Define clear output formats and schemas

2. **Input Asset Rules** (SIMPLIFIED):
   - ✅ User uploads/provides data → mission input
   - ✅ User provides external system credentials → mission input (type: "config", external_system_for: "system_id")
   - ❌ External data (emails, articles, social posts) → NOT mission input (intermediate asset)
   - ❌ API responses → NOT mission input (intermediate asset)

3. **External System Integration**:
   - Look at tool descriptions to see which external systems are available
   - Identify which external systems mission needs based on required tools
   - Add credential assets for each required external system
   - External data becomes intermediate assets retrieved by tools
   - Tools use external systems with provided credentials

4. **Tool Compatibility**:
   - Verify tools can handle input formats
   - Ensure tools can access required external systems
   - Consider data flow between tools
   - Plan for error handling

## Current Context
Mission Context: {mission}
Available Assets: {available_assets}

Based on the provided context, analyze what information is complete and what needs clarification to create an effective mission plan using available tools."""

    def get_prompt_template(self) -> ChatPromptTemplate:
        """Return a ChatPromptTemplate for mission definition"""
        return ChatPromptTemplate.from_messages([
            ("system", self.system_message),
            MessagesPlaceholder(variable_name="messages")
        ])
    
    def get_formatted_messages(
        self,
        messages: List[Message],
        mission: Mission,
        available_assets: List[Dict[str, Any]] = None
    ) -> List[Dict[str, str]]:
        """Get formatted messages for the prompt"""
        # Format tool descriptions with integrated external system information
        tool_descriptions = self._format_tool_descriptions_with_external_systems()
        
        # Format available assets and mission using utility functions
        assets_str = format_assets(available_assets)
        
        # Convert mission to dict and handle datetime serialization
        mission_dict = mission.dict()
        for field in ['created_at', 'updated_at']:
            if field in mission_dict and mission_dict[field]:
                mission_dict[field] = mission_dict[field].isoformat()
        
        # Format mission string with serialized dates
        mission_str = format_mission(mission_dict)

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
            format_instructions=format_instructions
        )

        # Convert langchain messages to OpenAI format
        return format_messages_for_openai(formatted_messages)
    
    def _format_tool_descriptions_with_external_systems(self) -> str:
        """Format tool descriptions with integrated external system information"""
        if not TOOL_REGISTRY:
            return "No tools available - tool registry not loaded. Call refresh_tool_registry() first."
        
        descriptions = []
        for tool_id, tool_def in TOOL_REGISTRY.items():
            desc = f"### {tool_def.name} (ID: {tool_def.id})\n"
            desc += f"**Purpose**: {tool_def.description}\n"
            desc += f"**Category**: {tool_def.category}\n"
            
            # Show external system requirements if any
            if hasattr(tool_def, 'required_resources') and tool_def.required_resources:
                # Legacy format support
                systems = ', '.join(tool_def.required_resources)
                desc += f"**Requires External System**: {systems} (needs credentials)\n"
            elif hasattr(tool_def, 'external_system') and tool_def.external_system:
                # New format support
                desc += f"**Requires External System**: {tool_def.external_system.name} (needs credentials)\n"
            else:
                desc += f"**External System**: None (processes data directly)\n"
            
            # Format key capabilities from parameters
            key_inputs = []
            for param in tool_def.parameters:
                if param.required and param.name != 'resource_connection':
                    key_inputs.append(param.name)
            if key_inputs:
                desc += f"**Key Parameters**: {', '.join(key_inputs)}\n"
            
            # Format outputs
            outputs = [output.name for output in tool_def.outputs]
            if outputs:
                desc += f"**Produces**: {', '.join(outputs)}\n"
            
            desc += "\n"
            descriptions.append(desc)
        
        return "\n".join(descriptions)
    