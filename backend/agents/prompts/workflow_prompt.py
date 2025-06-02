from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from schemas.chat import Message, MessageRole
from schemas.workflow import Mission, Asset, Workflow, WorkflowStep, StateVariable, StateVariableType, ToolUse
from schemas.asset import AssetType, CollectionType
from .base_prompt import BasePrompt
from utils.message_formatter import (
    format_langchain_messages,
    format_messages_for_openai,
    format_assets,
    format_mission
)

class StateVariableDefinition(BaseModel):
    """Definition for a state variable in a workflow"""
    name: str = Field(description="Name of the state variable")
    description: str = Field(description="Description of what this variable holds")
    type: StateVariableType = Field(description="Type of the state variable (asset, primitive, object, collection)")
    is_input: bool = Field(default=False, description="Whether this is an input to the workflow")
    is_output: bool = Field(default=False, description="Whether this is an output from the workflow")
    asset_id: Optional[str] = Field(default=None, description="ID of linked mission asset if type is ASSET")
    initial_value: Optional[Any] = Field(default=None, description="Initial value if not an input")
    
class ToolCall(BaseModel):
    """Simplified tool call definition for workflow steps"""
    name: str = Field(description="Name of the tool to call")
    description: str = Field(description="What this tool call accomplishes")
    parameter_mapping: Dict[str, str] = Field(description="Maps tool parameters to state variable names")
    result_mapping: Dict[str, str] = Field(description="Maps tool results to state variable names")
    
class WorkflowStepDefinition(BaseModel):
    """Definition for a workflow step"""
    name: str = Field(description="Name of the step")
    description: str = Field(description="What this step accomplishes")
    tool_calls: List[ToolCall] = Field(description="Tools to call in this step")
    input_variables: List[str] = Field(description="Names of state variables used as input")
    output_variables: List[str] = Field(description="Names of state variables produced as output")
    
class WorkflowProposal(BaseModel):
    """Structure for a proposed workflow"""
    name: str = Field(description="Name of the workflow")
    description: str = Field(description="One sentence describing what the workflow accomplishes")
    state_variables: List[StateVariableDefinition] = Field(description="All state variables used in the workflow")
    steps: List[WorkflowStepDefinition] = Field(description="Ordered list of workflow steps")
    input_mapping: Dict[str, str] = Field(description="Maps mission input asset IDs to state variable names")
    output_mapping: Dict[str, str] = Field(description="Maps state variable names to mission output asset IDs")
    
class WorkflowDefinitionResponse(BaseModel):
    """Structure for workflow definition response"""
    response_type: str = Field(description="Type of response: WORKFLOW_DEFINITION or INTERVIEW_QUESTION")
    response_content: str = Field(description="The main response text added to the conversation")
    workflow_proposal: Optional[WorkflowProposal] = Field(default=None, description="Proposed workflow details")
    
class WorkflowDefinitionPrompt(BasePrompt):
    """Prompt template for workflow definition"""
    
    def __init__(self):
        super().__init__(WorkflowDefinitionResponse)
        
        self.system_message = """You are an AI assistant that designs workflows to accomplish defined missions. Your role is to transform a mission's goals into concrete, executable workflow steps.

## Core Functions
1. **Analyze** the mission requirements and decompose them into workflow steps
2. **Design** state variables to track data flow through the workflow
3. **Map** inputs and outputs between mission assets and workflow variables
4. **Validate** that the workflow will achieve the mission's success criteria

## Available Tools
When designing workflows, you can use these tool categories:

### Research & Information Gathering
- `web_search`: Search the internet for current information
- `knowledge_search`: Search internal knowledge bases
- `file_search`: Search through uploaded documents

### Data Processing & Analysis
- `extract_data`: Extract structured data from documents
- `analyze_data`: Perform statistical or analytical operations
- `transform_data`: Convert data between formats
- `aggregate_data`: Combine multiple data sources

### Communication & Output
- `send_email`: Send email notifications
- `generate_report`: Create formatted reports
- `export_data`: Export data in various formats
- `store_asset`: Save data as a reusable asset

### Integration & External Services
- `api_call`: Make calls to external APIs
- `database_query`: Query databases
- `file_operations`: Read/write files

## State Variable Design Principles
1. **Input Variables**: Create one for each mission input asset
2. **Intermediate Variables**: Track data transformations between steps
3. **Output Variables**: Create one for each mission output asset
4. **Control Variables**: Track workflow state and decisions

## Workflow Step Design
Each step should:
- Have a clear, single purpose
- Use explicit input variables
- Produce explicit output variables
- Include error handling considerations
- Be independently testable

## Response Formats

**WORKFLOW_DEFINITION**: Use when you can design a complete workflow
```
WORKFLOW_DEFINITION:
Workflow: [Name]
Description: [What the workflow accomplishes]

State Variables:
- [var_name]: [type] - [description] (input/output/intermediate)

Steps:
1. [Step Name]
   - Purpose: [What this step does]
   - Tools: [tool_name(params) -> results]
   - Inputs: [variables used]
   - Outputs: [variables produced]

Input Mapping: [mission inputs -> workflow variables]
Output Mapping: [workflow variables -> mission outputs]
```

**INTERVIEW_QUESTION**: Use when you need clarification
```
INTERVIEW_QUESTION:
To design an effective workflow, I need to clarify [specific aspect].

[Targeted question]

This will help me [explain how the answer improves the workflow].
```

## Guidelines
- Break complex operations into simple, testable steps
- Ensure data flows logically through state variables
- Validate that all mission inputs are used
- Confirm all mission outputs are produced
- Consider error cases and fallback strategies
- Keep steps atomic and focused
- Map variables clearly to avoid confusion

## Current Context
Mission: {mission}
Available Assets: {available_assets}

Based on this mission, design a workflow that will achieve its goals and produce the required outputs."""

    def get_prompt_template(self) -> ChatPromptTemplate:
        """Return a ChatPromptTemplate for workflow definition"""
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
            mission=mission_str,
            messages=langchain_messages,
            available_assets=assets_str,
            format_instructions=format_instructions
        )

        # Convert langchain messages to OpenAI format
        return format_messages_for_openai(formatted_messages) 