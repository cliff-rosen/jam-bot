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
    type: AssetType = Field(description="Type of asset. MUST be one of: 'file', 'primitive', 'object', 'database_entity', 'markdown'. Do NOT use 'array' - use is_collection instead!")
    subtype: Optional[str] = Field(default=None, description="Specific format or schema (e.g., 'csv', 'json', 'email')")
    is_collection: bool = Field(default=False, description="Whether this asset contains multiple items (arrays, lists, sets, maps)")
    collection_type: Optional[CollectionType] = Field(default=None, description="Type of collection if is_collection is true. Use 'array' for lists, 'map' for dictionaries, 'set' for unique items")
    required: bool = Field(default=True, description="Whether this asset is required for the mission")
    schema_description: Optional[str] = Field(default=None, description="Description of expected structure/format for structured data")
    example_value: Optional[Any] = Field(default=None, description="Example of what the asset value might look like")

class MissionProposal(BaseModel):
    """Structure for a proposed mission"""
    name: str = Field(description="Name of the mission (2-8 words)")
    description: str = Field(description="One sentence describing what the mission accomplishes")
    goal: str = Field(description="The main goal of the mission")
    success_criteria: List[str] = Field(description="2-3 specific, measurable outcomes that define completion")
    inputs: List[AssetLite] = Field(description="Input assets required for the mission (both data assets and configuration parameters)")
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
      "type": "file | primitive | object | database_entity | markdown",
      "subtype": "Specific format or schema",
      "is_collection": false,
      "collection_type": null,
      "required": true,
      "schema_description": "Expected structure/format",
      "example_value": "Example of what the asset value might look like"
    }}
  ],
  "outputs": [
    {{
      "name": "Output Asset Name",
      "description": "Clear description of what this asset contains",
      "type": "file | primitive | object | database_entity | markdown",
      "subtype": "Specific format or schema",
      "is_collection": false,
      "collection_type": null,
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

## Asset Types and Schemas

### 1. Data Assets (Content)
- **File Assets** (type: "file")
  - Use for documents, images, exports
  - Must specify valid file subtype (pdf, doc, txt, etc.)
  - Example: {{"type": "file", "subtype": "pdf", "description": "Resume document"}}

- **Object Assets** (type: "object")
  - Use for structured data, JSON objects
  - Must include schema_description
  - Example: {{"type": "object", "subtype": "json", "schema_description": "{{\"field1\": \"string\", \"field2\": \"number\"}}"}}

- **Database Entity Assets** (type: "database_entity")
  - Use for database records
  - Include table name and query parameters
  - Example: {{"type": "database_entity", "subtype": "user_record"}}

- **Markdown Assets** (type: "markdown")
  - Use for formatted text content
  - Example: {{"type": "markdown", "subtype": "report"}}

### 2. Configuration Assets (Settings)
- **Primitive Assets** (type: "primitive")
  - Use for simple values (strings, numbers, booleans)
  - Must specify subtype for validation
  - Example: {{"type": "primitive", "subtype": "string", "example_value": "AI News"}}

### Collection Assets
When creating assets that contain multiple items:
```json
{{
  "name": "Collection Asset Name",
  "type": "object",  // Base type for the items
  "is_collection": true,
  "collection_type": "array | map | set",
  "schema_description": "Schema for individual items"
}}
```

## Schema Validation Rules

1. **Required Fields**:
   - name: Descriptive name
   - type: Valid asset type
   - description: Clear purpose
   - schema_description: Expected structure

2. **Type-Specific Rules**:
   - File types must be valid file extensions
   - Objects need property definitions
   - Primitives need subtype specification
   - Collections need item schema

3. **Collection Rules**:
   - If is_collection: true, must specify collection_type
   - Collection items must have defined schema
   - Array items must be homogeneous

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
        "type": "object",
        "description": "Input description",
        "schema_description": "Input schema"
      }}
    ],
    "outputs": [
      {{
        "name": "Output Name",
        "type": "object",
        "description": "Output description",
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
  "response_content": "To create an effective mission plan, I need to understand [specific aspect].",
  "reasoning": "This will help me [explain how the answer improves the mission plan]"
}}
```

## Guidelines
1. **Mission Design**:
   - Keep mission scope focused and achievable
   - Make success criteria specific and measurable
   - Ensure all required inputs are available
   - Define clear output formats and schemas

2. **Asset Design**:
   - Use appropriate asset types for each purpose
   - Provide clear schema descriptions
   - Include example values where helpful
   - Validate schema compatibility

3. **Tool Compatibility**:
   - Verify tools can handle input formats
   - Ensure tools can produce required outputs
   - Consider data flow between tools
   - Plan for error handling

## Current Context
Mission Context: {mission}
Available Assets: {available_assets}

Based on the provided context, analyze what information is complete and what needs clarification to create an effective mission plan."""

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
        # Format tool descriptions
        tool_descriptions = format_tool_descriptions_for_mission_design()
        
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
    