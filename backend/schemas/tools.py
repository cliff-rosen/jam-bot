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
    details_schema: Optional[Dict[str, Any]] = Field(default=None, description="JSON schema for complex types if type is object or array")
    required: bool = Field(default=True, description="Whether this output is always present")
    example: Optional[Any] = Field(default=None, description="Example value")


class ToolDefinition(BaseModel):
    """Complete definition of a pure function tool loaded from tools.json"""
    id: str = Field(description="Unique identifier for the tool, MUST be present in tools.json")
    name: str = Field(description="Name of the tool")
    description: str = Field(description="Description of what the tool does")
    input_schema: Dict[str, Any] = Field(description="JSON schema for tool input parameters")
    output_schema: List[ToolOutputSchema] = Field(description="Structured output schema definition")
    category: str = Field(description="Category of tool (data_retrieval, processing, analysis, etc.)")
    examples: Optional[List[Dict[str, Any]]] = Field(default=None, description="Usage examples")


# Tool registry - populated from tools.json, keyed by tool_id
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
    """Parse tools response from file into ToolDefinition objects, keyed by tool_id"""
    tool_registry = {}
    
    for tool_def_json in tools_data.get("tools", []):
        try:
            if "id" not in tool_def_json:
                tool_name_for_error = tool_def_json.get('name', 'Unknown tool without ID')
                print(f"Warning: Tool definition for '{tool_name_for_error}' is missing the required 'id' field in tools.json. Skipping this tool.")
                continue

            # Parse output schema
            parsed_output_schema = []
            for output_def in tool_def_json.get("output_schema", []):
                parsed_output_schema.append(ToolOutputSchema(**output_def))
            
            # Create tool definition using id from JSON
            tool_definition = ToolDefinition(
                id=tool_def_json["id"],
                name=tool_def_json["name"],
                description=tool_def_json["description"],
                input_schema=tool_def_json["input_schema"],
                output_schema=parsed_output_schema,
                category=tool_def_json.get("category", "unknown"),
                examples=tool_def_json.get("examples", None)
            )
            
            if tool_definition.id in tool_registry:
                print(f"Warning: Duplicate tool ID '{tool_definition.id}' found in tools.json. Overwriting previous definition for tool named '{tool_registry[tool_definition.id].name}' with tool named '{tool_definition.name}'.")
            tool_registry[tool_definition.id] = tool_definition
            
        except Exception as e:
            tool_name_for_error = tool_def_json.get('name', tool_def_json.get('id', 'unknown tool'))
            print(f"Error parsing tool definition for '{tool_name_for_error}': {e}")
    
    return tool_registry


def refresh_tool_registry():
    """Refresh the global tool registry from tools.json"""
    global TOOL_REGISTRY
    TOOL_REGISTRY = load_tools_from_file()
    print(f"Loaded {len(TOOL_REGISTRY)} tool definitions, keyed by tool_id.")


def get_tool_definition(tool_id: str) -> Optional[ToolDefinition]:
    """Get the definition for a specific tool by its ID."""
    return TOOL_REGISTRY.get(tool_id)


def get_tool_by_name(tool_name: str) -> Optional[ToolDefinition]:
    """Get the definition for a specific tool by its name."""
    for tool_def in TOOL_REGISTRY.values():
        if tool_def.name == tool_name:
            return tool_def
    return None


def get_available_tools() -> List[str]:
    """Get list of all available tool IDs."""
    return list(TOOL_REGISTRY.keys())


def get_tools_by_category() -> Dict[str, List[str]]:
    """Categorize tools by their primary function, returning lists of tool IDs."""
    categories = {}
    for tool_id, tool_def in TOOL_REGISTRY.items():
        category = tool_def.category
        if category not in categories:
            categories[category] = []
        categories[category].append(tool_id) # Store tool_id
    return categories


def format_tool_descriptions_for_mission_design() -> str:
    """Format tool descriptions optimized for mission design context"""
    if not TOOL_REGISTRY:
        return "No tools available - tool registry not loaded. Call refresh_tool_registry() first."
    
    descriptions = []
    for tool_id, tool_def in TOOL_REGISTRY.items(): # Iterate by tool_id
        desc = f"### {tool_def.name} (ID: {tool_def.id})\n" # Display name and ID
        desc += f"**Purpose**: {tool_def.description}\n"
        desc += f"**Category**: {tool_def.category}\n"
        
        if "properties" in tool_def.input_schema:
            key_inputs = []
            for param_name, param_schema in tool_def.input_schema["properties"].items():
                if param_name in tool_def.input_schema.get("required", []):
                    if "enum" in param_schema:
                        key_inputs.append(f"{param_name} (options: {', '.join(param_schema['enum'])})")
            if key_inputs:
                desc += f"**Key Capabilities**: {', '.join(key_inputs)}\n"
        
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
    for tool_id, tool_def in TOOL_REGISTRY.items(): # Iterate by tool_id
        desc = f"### {tool_def.name} (ID: {tool_def.id})\n" # Display name and ID
        desc += f"**Purpose**: {tool_def.description}\n"
        desc += f"**Category**: {tool_def.category}\n"
        
        if tool_def.output_schema:
            outputs = [f"{out.name} ({out.type})" for out in tool_def.output_schema if out.required]
            if outputs:
                desc += f"**Outputs**: {', '.join(outputs)}\n"
        
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
    for tool_id, tool_def in TOOL_REGISTRY.items(): # Iterate by tool_id
        desc = f"### Tool Name: {tool_def.name} (ID: {tool_def.id})\n" # Display name and ID
        desc += f"Description: {tool_def.description}\n"
        
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