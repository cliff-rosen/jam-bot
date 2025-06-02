from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from schemas.chat import Message
from schemas.workflow import Mission, Asset, Hop
from schemas.tools import ToolType, TOOL_REGISTRY
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
    tool_name: ToolType = Field(description="Name of the tool to use")
    parameters: Dict[str, Any] = Field(description="Parameters to pass to the tool")
    output_mapping: Dict[str, str] = Field(description="Maps tool output fields to asset properties")
    description: str = Field(description="What this tool step accomplishes")


class HopImplementation(BaseModel):
    """Complete implementation plan for a hop"""
    hop_name: str = Field(description="Name of the hop being implemented")
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

## Available Tools
{tool_descriptions}

## Implementation Principles
1. **Exact Configuration**: Provide exact parameter values, not placeholders
2. **Data Flow**: Ensure data flows correctly from inputs through tools to outputs
3. **Error Handling**: Consider what could go wrong and how to handle it
4. **Validation**: Include checks to ensure the hop succeeded
5. **Efficiency**: Use the minimum number of tool steps needed

## Response Formats

**IMPLEMENTATION_PLAN**: Use when you can create a complete implementation
```
IMPLEMENTATION_PLAN:
Implementing: [Hop Name]

Tool Steps:
1. [Tool Name]
   - Purpose: [What this step does]
   - Parameters:
     * param1: [exact value]
     * param2: [exact value]
   - Output Mapping:
     * tool_output_field -> asset_property

2. [Next Tool]
   ...

Error Handling:
- [Potential Error]: [How to handle]

Validation:
- [Check 1]: [What to verify]
```

**CLARIFICATION_NEEDED**: Use when you need more information
```
CLARIFICATION_NEEDED:
To implement this hop, I need clarification on:

1. [Missing information]
2. [Another missing piece]

Please provide these details so I can create a complete implementation.
```

## Implementation Process
1. Review the hop design and requirements
2. Identify which tools can accomplish the goal
3. Map input assets to tool parameters
4. Configure each tool with exact values
5. Define how outputs map to the target asset
6. Add error handling and validation

## Guidelines
- Use exact values from input assets, not generic placeholders
- Chain tools when needed for complex transformations
- Consider rate limits and performance
- Handle missing or invalid data gracefully
- Ensure outputs match the expected asset structure
- Think about idempotency and retries

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
        tool_descriptions = self._format_tool_descriptions()
        
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
    
    def _format_tool_descriptions(self) -> str:
        """Format tool descriptions for the prompt"""
        descriptions = []
        for tool_type, tool_def in TOOL_REGISTRY.items():
            desc = f"### {tool_def.name.value}\n"
            desc += f"Description: {tool_def.description}\n"
            desc += "Parameters:\n"
            for param in tool_def.parameters:
                desc += f"  - {param.name} ({param.type}): {param.description}"
                if not param.required:
                    desc += f" [Optional, default: {param.default}]"
                desc += "\n"
            desc += "Outputs:\n"
            for output in tool_def.outputs:
                desc += f"  - {output.name} ({output.type}): {output.description}\n"
            descriptions.append(desc)
        return "\n".join(descriptions)
    
    def _format_hop(self, hop: Hop) -> str:
        """Format hop information for the prompt"""
        return f"""Name: {hop.name}
Description: {hop.description}
Input Assets: {', '.join(hop.input_assets)}
Output Asset: {hop.output_asset.name} ({hop.output_asset.type})
Is Final: {'Yes' if hop.is_final else 'No'}""" 