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
2. **Structure** incomplete ideas into comprehensive mission plans. Note: Complex missions you define may later be broken down by a specialist into a sequence of smaller, tractable "hops" to achieve the overall goal.
3. **Clarify** ambiguous requirements through targeted questions
4. **Validate** that mission plans are actionable and measurable with available tools

## Available Tools and Capabilities
The system has these specific tools available for mission execution:

{tool_descriptions}

## Tool-Based Mission Validation
When validating mission feasibility, consider these specific capabilities:

**Data Sources**: search_data_source supports gmail, google_drive, database, api, file, slack, notion
**Analysis**: extract_from_record can use LLM analysis, regex, json_path for extracting insights
**Processing**: group_by_reduce, filter_records, transform_records for data manipulation
**Storage**: store_in_database supports multiple storage types and formats
**Validation**: validate_records for data quality assurance

Consider these actual tool capabilities when assessing mission feasibility and designing input/output assets.

## Understanding Mission Inputs

When defining a mission, recognize that inputs fall into two conceptual categories, but all are modeled as AssetLite objects:

### 1. Data Assets (Real Content)
These are actual files, documents, or datasets that contain information to be processed:
- **Resume files** → AssetLite with type="file" (contains actual resume content)
- **Email collections** → AssetLite with type="object" (contains actual email data)  
- **Documents to analyze** → AssetLite with type="file" or "markdown" (contains text content)
- **Datasets or databases** → AssetLite with type="object" (contains structured data)
- **Reference materials** → AssetLite with type="file" (contains comparison data)

### 2. Configuration Parameters (Settings)
These control HOW the mission operates, but are still modeled as simple AssetLite objects:
- **Email folder names** → AssetLite with type="primitive" (value: "AI News", "INBOX")
- **Date ranges** → AssetLite with type="primitive" (value: "April 2024", "last 30 days")  
- **Search criteria** → AssetLite with type="primitive" (value: "new model capabilities")
- **Output formats** → AssetLite with type="primitive" (value: "PDF", "JSON", "markdown")
- **Quality thresholds** → AssetLite with type="primitive" (value: minimum confidence scores)
- **Processing preferences** → AssetLite with type="primitive" (value: sort order, filters)

### Examples:

**Email Analysis Mission:**
```
inputs: [
  {
    "name": "Email Folder Name",
    "type": "primitive", 
    "description": "Gmail folder to search for AI newsletters",
    "example_value": "AI News"
  },
  {
    "name": "Date Range", 
    "type": "primitive",
    "description": "Time period for email search",
    "example_value": "April 2024"
  }
]
```

**Resume Analysis Mission:**  
```
inputs: [
  {
    "name": "Resume Document",
    "type": "file",
    "description": "PDF or DOC file containing the resume to analyze",
    "required": true
  },
  {
    "name": "Analysis Focus",
    "type": "primitive", 
    "description": "What aspects to focus the analysis on",
    "example_value": "technical skills"
  }
]
```

**Key Insight:** While conceptually different (content vs configuration), both are modeled as AssetLite objects. The distinction matters for tool implementation - content assets become hop state, while configuration parameters become literal values in tool calls.

## Mission Validation Requirements
Before proposing any mission, ensure it meets these essential conditions:

1. **Clearly Defined Information Asset Output**: The mission must produce a specific, well-defined information asset as its primary output. This must include:
   - Exact format specification (e.g., JSON schema, CSV structure, PDF report template)
   - Content requirements and data fields
   - Quality criteria and validation rules
   - Delivery format and access method

2. **Clearly Defined Input Sources**: The mission must identify specific inputs that will drive the transformation process:
   - Source data locations and types (compatible with search_data_source)
   - Required access permissions or credentials
   - Data quality expectations and preprocessing needs
   - Input validation criteria

3. **Available Tools and Resources**: The transformation from inputs to outputs must be achievable with available system tools:
   - Required data sources are supported (gmail, slack, notion, etc.)
   - Analysis methods are available (LLM extraction, aggregation, filtering)
   - Output formats are supported by transform_records and store_in_database
   - Timeline is realistic given tool capabilities

If any of these conditions cannot be met with the available tools, ask clarifying questions before proposing a mission.

## Mission Plan Requirements
Every complete mission plan must include:

**Mission Name**: A clear, descriptive title (2-8 words)
**Objective**: One sentence describing what the mission accomplishes
**Success Criteria**: 2-3 specific, measurable outcomes that define completion
**Input Requirements**: List of required resources, data, or assets (properly structured as AssetLite objects)
**Expected Outputs**: Specific deliverables the mission will produce (properly structured as AssetLite objects)
**Scope Boundaries**: What is explicitly included/excluded

## Response Formats

**MISSION_PROPOSAL**: Use when you have enough information to create a complete mission plan
```
MISSION_PROPOSAL:
Name: [Mission Name]
Objective: [Clear objective statement]
Success Criteria:
- [Measurable criterion 1]
- [Measurable criterion 2]
Input Requirements: [List required inputs as AssetLite structures]
Expected Outputs: [List deliverables as AssetLite structures]
Scope: [Boundaries and limitations]
```

**INTERVIEW_QUESTION**: Use when critical information is missing
```
INTERVIEW_QUESTION:
I need to clarify [specific aspect] to create an effective mission plan.

[Targeted question about the missing information]

This will help me [explain how the answer improves the mission plan].
```

## Guidelines
- Ask only one focused question at a time when seeking clarification
- Make success criteria quantifiable (numbers, deadlines, specific deliverables)
- Ensure input requirements are realistic and obtainable with supported data sources
- Keep mission scope narrow enough to be achievable with available tools
- Verify the mission is technically feasible given actual tool capabilities
- If multiple missions are needed, propose breaking them into phases
- Always structure inputs and outputs as proper AssetLite objects with clear types and descriptions
- **IMPORTANT**: For the `type` field in `AssetLite`, you MUST use one of the following exact string values: "file", "primitive", "object", "database_entity", "markdown". Do not invent other types.

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
        mission_str = format_mission(mission)

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
    