from pydantic import BaseModel, Field, validator
from typing import Dict, Any, List, Optional, Union, Callable, Awaitable
from enum import Enum
import json
import os
from .tools import ToolDefinition, ToolParameter, ToolOutput, TOOL_REGISTRY, ToolStep


class ToolParameterSchema(BaseModel):
    """Defines the input parameter schema for a tool"""
    name: str = Field(description="Parameter name")
    type: str = Field(description="Data type (string, number, boolean, object, array)")
    description: str = Field(description="Description of what this parameter is for")
    required: bool = Field(default=True, description="Whether this parameter is required")
    default: Optional[Any] = Field(default=None, description="Default value if not provided")
    enum: Optional[List[Any]] = Field(default=None, description="Allowed values for this parameter")
    schema: Optional[Dict[str, Any]] = Field(default=None, description="JSON schema for complex types")
    example: Optional[Any] = Field(default=None, description="Example value")


class ToolOutputSchema(BaseModel):
    """Defines the output schema for a tool"""
    name: str = Field(description="Output field name")
    type: str = Field(description="Data type (string, number, boolean, object, array)")
    description: str = Field(description="Description of what this output contains")
    schema: Optional[Dict[str, Any]] = Field(default=None, description="JSON schema for complex types")
    required: bool = Field(default=True, description="Whether this output is always present")
    example: Optional[Any] = Field(default=None, description="Example value")


class ToolCategory(str, Enum):
    """Categories of tools"""
    DATA_RETRIEVAL = "data_retrieval"
    DATA_PROCESSING = "data_processing"
    DATA_ANALYSIS = "data_analysis"
    DATA_TRANSFORMATION = "data_transformation"
    DATA_STORAGE = "data_storage"
    DATA_VALIDATION = "data_validation"
    OTHER = "other"


class ToolExecutionHandler(BaseModel):
    """Handler for executing a tool"""
    handler: Callable[[ToolStep, Dict[str, Any]], Awaitable[Dict[str, Any]]]
    description: str


def load_tools_from_file() -> Dict[str, ToolDefinition]:
    """Load tool definitions from tools.json in schemas folder"""
    file_path = os.path.join(os.path.dirname(__file__), "tools.json")
    
    try:
        print(f"Loading tools from {file_path}")
        with open(file_path, 'r') as f:
            tools_data = json.load(f)
        # print(f"Successfully loaded tools.json with {len(tools_data.get('tools', []))} tools")
        return _parse_tools_response(tools_data)
    except FileNotFoundError:
        print(f"Tool definitions file not found: {file_path}")
        return {}
    except json.JSONDecodeError as e:
        print(f"Error parsing tools.json: {e}")
        return {}
    except Exception as e:
        print(f"Error loading tool definitions: {e}")
        import traceback
        print(f"Traceback: {traceback.format_exc()}")
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

            # Parse parameters
            parameters = []
            if "parameters" in tool_def_json:
                for param_def in tool_def_json["parameters"]:
                    # Convert ToolParameterSchema to ToolParameter
                    param_schema = ToolParameterSchema(**param_def)
                    parameters.append(ToolParameter(
                        name=param_schema.name,
                        description=param_schema.description,
                        required=param_schema.required,
                        schema=param_schema.schema
                    ))
            elif "input_schema" in tool_def_json:
                # Convert old format to new format
                input_schema = tool_def_json["input_schema"]
                if "properties" in input_schema:
                    for param_name, param_schema in input_schema["properties"].items():
                        parameters.append(ToolParameter(
                            name=param_name,
                            description=param_schema.get("description", ""),
                            required=param_name in input_schema.get("required", []),
                            schema=param_schema
                        ))
            
            # Parse outputs
            outputs = []
            if "outputs" in tool_def_json:
                for output_def in tool_def_json["outputs"]:
                    # Convert ToolOutputSchema to ToolOutput
                    output_schema = ToolOutputSchema(**output_def)
                    outputs.append(ToolOutput(
                        name=output_schema.name,
                        description=output_schema.description,
                        schema=output_schema.schema
                    ))
            elif "output_schema" in tool_def_json:
                # Convert old format to new format
                for output_def in tool_def_json["output_schema"]:
                    outputs.append(ToolOutput(
                        name=output_def.get("name", ""),
                        description=output_def.get("description", ""),
                        schema=output_def.get("schema")
                    ))
            
            # Create tool definition
            tool_definition = ToolDefinition(
                id=tool_def_json["id"],
                name=tool_def_json["name"],
                description=tool_def_json["description"],
                parameters=parameters,
                outputs=outputs,
                category=tool_def_json.get("category", ToolCategory.OTHER),
                examples=tool_def_json.get("examples"),
                error_schema=tool_def_json.get("error_schema"),
                version=tool_def_json.get("version", "1.0.0"),
                deprecated=tool_def_json.get("deprecated", False),
                replacement_tool=tool_def_json.get("replacement_tool")
            )
            
            if tool_definition.id in tool_registry:
                print(f"Warning: Duplicate tool ID '{tool_definition.id}' found in tools.json. Overwriting previous definition for tool named '{tool_registry[tool_definition.id].name}' with tool named '{tool_definition.name}'.")
            tool_registry[tool_definition.id] = tool_definition
            
        except Exception as e:
            tool_name_for_error = tool_def_json.get('name', tool_def_json.get('id', 'unknown tool'))
            print(f"Error parsing tool definition for '{tool_name_for_error}': {e}")
            import traceback
            print(f"Traceback: {traceback.format_exc()}")
    
    return tool_registry


def refresh_tool_registry():
    """Refresh the global tool registry from tools.json"""
    global TOOL_REGISTRY
    print("Refreshing tool registry...")
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
    for tool_id, tool_def in TOOL_REGISTRY.items():
        desc = f"### {tool_def.name} (ID: {tool_def.id})\n"
        desc += f"**Purpose**: {tool_def.description}\n"
        desc += f"**Category**: {tool_def.category}\n"
        
        # Format key capabilities from parameters
        key_inputs = []
        for param in tool_def.parameters:
            if param.required:
                key_inputs.append(param.name)
        if key_inputs:
            desc += f"**Key Capabilities**: {', '.join(key_inputs)}\n"
        
        # Format outputs - all outputs are considered required in our simplified model
        outputs = [output.name for output in tool_def.outputs]
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
    for tool_id, tool_def in TOOL_REGISTRY.items():
        desc = f"### {tool_def.name} (ID: {tool_def.id})\n"
        desc += f"**Purpose**: {tool_def.description}\n"
        desc += f"**Category**: {tool_def.category}\n"
        
        # Format outputs with types from schema
        outputs = []
        for output in tool_def.outputs:
            output_type = output.schema.get("type", "object") if output.schema else "object"
            outputs.append(f"{output.name} ({output_type})")
        if outputs:
            desc += f"**Outputs**: {', '.join(outputs)}\n"
        
        desc += "\n"
        descriptions.append(desc)
    
    return "\n".join(descriptions)


def format_tool_descriptions_for_implementation() -> str:
    """Format tool descriptions optimized for hop implementation context"""
    if not TOOL_REGISTRY:
        return "No tools available - tool registry not loaded. Call refresh_tool_registry() first."
    
    descriptions = []
    for tool_id, tool_def in TOOL_REGISTRY.items():
        desc = f"### Tool Name: {tool_def.name} (ID: {tool_def.id})\n"
        desc += f"Description: {tool_def.description}\n"
        
        desc += "Input Parameters:\n"
        for param in tool_def.parameters:
            param_type = param.schema.get("type", "object") if param.schema else "object"
            desc += f"  - {param.name} ({param_type}): {param.description}"
            if not param.required:
                desc += " [Optional]"
            desc += "\n"
        
        desc += "Outputs:\n"
        for output in tool_def.outputs:
            output_type = output.schema.get("type", "object") if output.schema else "object"
            desc += f"  - {output.name} ({output_type}): {output.description}\n"
        
        desc += "\n"
        descriptions.append(desc)
    
    return "\n".join(descriptions)


def register_tool_handler(tool_id: str, handler: ToolExecutionHandler):
    """Register a handler for a specific tool"""
    if tool_id not in TOOL_REGISTRY:
        raise ValueError(f"No tool definition found for {tool_id}")
    TOOL_REGISTRY[tool_id].execution_handler = handler


def get_tool(tool_id: str) -> Optional[ToolDefinition]:
    """Get a tool by ID"""
    return TOOL_REGISTRY.get(tool_id)


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