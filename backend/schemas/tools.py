from pydantic import BaseModel, Field
from typing import Dict, Any, List, Optional
from enum import Enum
import json
import os


class ToolOutputSchema(BaseModel):
    """Defines the output schema for a tool"""
    name: str = Field(description="Output field name")
    type: str = Field(description="Data type (string, number, boolean, object, array)")
    description: str = Field(description="Description of what this output contains")
    schema: Optional[Dict[str, Any]] = Field(default=None, description="JSON schema for complex types")
    required: bool = Field(default=True, description="Whether this output is always present")
    example: Optional[Any] = Field(default=None, description="Example value")


class ToolDefinition(BaseModel):
    """Complete definition of a pure function tool loaded from tools.json"""
    name: str = Field(description="Name of the tool")
    description: str = Field(description="Description of what the tool does")
    input_schema: Dict[str, Any] = Field(description="JSON schema for tool input parameters")
    output_schema: List[ToolOutputSchema] = Field(description="Structured output schema definition")
    category: str = Field(description="Category of tool (data_retrieval, processing, analysis, etc.)")
    examples: Optional[List[Dict[str, Any]]] = Field(default=None, description="Usage examples")


# Tool registry - populated from tools.json
TOOL_REGISTRY: Dict[str, ToolDefinition] = {}


def load_tools_from_file() -> Dict[str, ToolDefinition]:
    """Load tool definitions from tools.json in schemas folder"""
    file_path = os.path.join(os.path.dirname(__file__), "tools.json")
    
    try:
        with open(file_path, 'r') as f:
            tools_data = json.load(f)
        return _parse_tools_response(tools_data)
    except FileNotFoundError:
        print(f"Tool definitions file not found: {file_path}")
        return {}
    except Exception as e:
        print(f"Error loading tool definitions: {e}")
        return {}


def _parse_tools_response(tools_data: Dict[str, Any]) -> Dict[str, ToolDefinition]:
    """Parse tools response from file into ToolDefinition objects"""
    tool_registry = {}
    
    for tool_def in tools_data.get("tools", []):
        try:
            # Parse output schema
            output_schema = []
            for output_def in tool_def.get("output_schema", []):
                output_schema.append(ToolOutputSchema(**output_def))
            
            # Create tool definition
            tool_definition = ToolDefinition(
                name=tool_def["name"],
                description=tool_def["description"],
                input_schema=tool_def["input_schema"],
                output_schema=output_schema,
                category=tool_def.get("category", "unknown"),
                examples=tool_def.get("examples", None)
            )
            
            tool_registry[tool_def["name"]] = tool_definition
            
        except Exception as e:
            print(f"Error parsing tool definition for {tool_def.get('name', 'unknown')}: {e}")
    
    return tool_registry


def refresh_tool_registry():
    """Refresh the global tool registry from tools.json"""
    global TOOL_REGISTRY
    TOOL_REGISTRY = load_tools_from_file()
    print(f"Loaded {len(TOOL_REGISTRY)} tool definitions")


def get_tool_definition(tool_name: str) -> Optional[ToolDefinition]:
    """Get the definition for a specific tool"""
    return TOOL_REGISTRY.get(tool_name)


def get_available_tools() -> List[str]:
    """Get list of all available tool names"""
    return list(TOOL_REGISTRY.keys())


def get_tools_by_category() -> Dict[str, List[str]]:
    """Categorize tools by their primary function"""
    categories = {}
    for tool_name, tool_def in TOOL_REGISTRY.items():
        category = tool_def.category
        if category not in categories:
            categories[category] = []
        categories[category].append(tool_name)
    return categories


def format_tool_descriptions_for_mission_design() -> str:
    """Format tool descriptions optimized for mission design context"""
    if not TOOL_REGISTRY:
        return "No tools available - tool registry not loaded. Call refresh_tool_registry() first."
    
    descriptions = []
    for tool_name, tool_def in TOOL_REGISTRY.items():
        desc = f"### {tool_name}\n"
        desc += f"**Purpose**: {tool_def.description}\n"
        desc += f"**Category**: {tool_def.category}\n"
        
        # Show key input capabilities
        if "properties" in tool_def.input_schema:
            key_inputs = []
            for param_name, param_schema in tool_def.input_schema["properties"].items():
                if param_name in tool_def.input_schema.get("required", []):
                    if "enum" in param_schema:
                        key_inputs.append(f"{param_name} (options: {', '.join(param_schema['enum'])})")
            if key_inputs:
                desc += f"**Key Capabilities**: {', '.join(key_inputs)}\n"
        
        # Show what it produces
        if tool_def.output_schema:
            outputs = [output.name for output in tool_def.output_schema if output.required]
            if outputs:
                desc += f"**Produces**: {', '.join(outputs)}\n"
        
        desc += "\n"
        descriptions.append(desc)
    
    return "\n".join(descriptions)


def format_tool_descriptions_for_hop_design() -> str:
    """Format tool descriptions optimized for hop design context"""
    if not TOOL_REGISTRY:
        return "No tools available - tool registry not loaded. Call refresh_tool_registry() first."
    
    descriptions = []
    for tool_name, tool_def in TOOL_REGISTRY.items():
        desc = f"### {tool_name}\n"
        desc += f"**Purpose**: {tool_def.description}\n"
        desc += f"**Category**: {tool_def.category}\n"
        
        # Show input/output flow for chaining
        if tool_def.output_schema:
            outputs = [f"{out.name} ({out.type})" for out in tool_def.output_schema if out.required]
            if outputs:
                desc += f"**Outputs**: {', '.join(outputs)}\n"
        
        # Show examples if available
        if tool_def.examples:
            desc += f"**Usage Pattern**: {tool_def.examples[0].get('description', 'See documentation')}\n"
        
        desc += "\n"
        descriptions.append(desc)
    
    return "\n".join(descriptions)


def format_tool_descriptions_for_implementation() -> str:
    """Format tool descriptions optimized for hop implementation context"""
    if not TOOL_REGISTRY:
        return "No tools available - tool registry not loaded. Call refresh_tool_registry() first."
    
    descriptions = []
    for tool_name, tool_def in TOOL_REGISTRY.items():
        desc = f"### {tool_name}\n"
        desc += f"Description: {tool_def.description}\n"
        
        # Detailed input schema
        desc += "Input Parameters:\n"
        if "properties" in tool_def.input_schema:
            for param_name, param_schema in tool_def.input_schema["properties"].items():
                param_type = param_schema.get("type", "unknown")
                param_desc = param_schema.get("description", "No description")
                is_required = param_name in tool_def.input_schema.get("required", [])
                
                desc += f"  - {param_name} ({param_type}): {param_desc}"
                if not is_required:
                    default_val = param_schema.get("default", "None")
                    desc += f" [Optional, default: {default_val}]"
                desc += "\n"
                
                if "enum" in param_schema:
                    desc += f"    Options: {', '.join(param_schema['enum'])}\n"
        
        # Detailed output schema
        desc += "Outputs:\n"
        for output in tool_def.output_schema:
            desc += f"  - {output.name} ({output.type}): {output.description}"
            if not output.required:
                desc += " [Optional]"
            desc += "\n"
            if output.example:
                desc += f"    Example: {output.example}\n"
        
        desc += "\n"
        descriptions.append(desc)
    
    return "\n".join(descriptions)


# Load tools on module import
try:
    refresh_tool_registry()
except Exception as e:
    print(f"Failed to load tools on import: {e}")
    TOOL_REGISTRY = {}


# Example workflows using pure tools
EXAMPLE_WORKFLOWS = {
    "gmail_analysis": {
        "description": "Analyze Gmail emails using pure tool functions",
        "steps": [
            "email_search(query, folder, date_range) → emails list",
            "extract(emails, extraction_function, fields) → analyzed data", 
            "map_reduce_rollup(data, group_by_rule, rollup_functions) → aggregated results",
            "summarize(results, summarization_mandate) → final report"
        ]
    }
} 