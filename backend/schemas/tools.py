from pydantic import BaseModel, Field, validator
from typing import Dict, Any, Optional, List, Union, Literal, Callable, Awaitable
from datetime import datetime
from enum import Enum
import json
import os
from .asset import Asset

class ExecutionStatus(str, Enum):
    """Status of tool execution"""
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"

class AssetFieldMapping(BaseModel):
    type: Literal["asset_field"] = "asset_field"
    state_asset: str
    path: Optional[str] = None

class LiteralMapping(BaseModel):
    type: Literal["literal"] = "literal"
    value: Any

ParameterMappingValue = Union[AssetFieldMapping, LiteralMapping]

class ToolParameter(BaseModel):
    """Parameter definition for a tool"""
    name: str
    description: str
    required: bool = True
    schema: Optional[Dict[str, Any]] = None

class ToolOutput(BaseModel):
    """Output definition for a tool"""
    name: str
    description: str
    schema: Optional[Dict[str, Any]] = None

class ToolDefinition(BaseModel):
    """Definition of a tool that can be used in a hop"""
    id: str
    name: str
    description: str
    category: str
    parameters: List[ToolParameter]
    outputs: List[ToolOutput]
    execution_handler: Optional[Callable[[Any, Dict[str, Any]], Awaitable[Dict[str, Any]]]] = None

    def validate_input_asset(self, asset_schema: Dict[str, Any]) -> List[str]:
        """Validate that an asset schema is compatible with this tool's input requirements"""
        # TODO: Implement schema validation
        return []

    def validate_output_asset(self, asset_schema: Dict[str, Any]) -> List[str]:
        """Validate that an asset schema is compatible with this tool's output requirements"""
        # TODO: Implement schema validation
        return []

# Global registry of available tools
TOOL_REGISTRY: Dict[str, ToolDefinition] = {}

# Tool loading functionality
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

class ToolExecutionHandler(BaseModel):
    """Handler for executing a tool"""
    handler: Callable[[Any, Dict[str, Any]], Awaitable[Dict[str, Any]]]
    description: str

def load_tools_from_file() -> Dict[str, ToolDefinition]:
    """Load tool definitions from tools.json in schemas folder"""
    file_path = os.path.join(os.path.dirname(__file__), "tools.json")
    
    try:
        print(f"Loading tools from {file_path}")
        with open(file_path, 'r') as f:
            tools_data = json.load(f)
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
                category=tool_def_json.get("category", "other"),
                examples=tool_def_json.get("examples")
            )
            
            if tool_definition.id in tool_registry:
                print(f"Warning: Duplicate tool ID '{tool_definition.id}' found in tools.json. Overwriting previous definition.")
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
        categories[category].append(tool_id)
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

def get_tool_definition(tool_id: str) -> Optional[ToolDefinition]:
    """Get the definition for a specific tool by its ID."""
    return TOOL_REGISTRY.get(tool_id)

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
    print(f"Registering tool handler for {tool_id}")
    if tool_id not in TOOL_REGISTRY:
        raise ValueError(f"No tool definition found for {tool_id}")
    TOOL_REGISTRY[tool_id].execution_handler = handler

class ToolStep(BaseModel):
    """Represents an atomic unit of work - a single tool execution within a hop"""
    id: str = Field(description="Unique identifier for the tool step")
    tool_id: str = Field(description="Identifier of the tool to execute")
    description: str = Field(description="Description of what this tool step accomplishes")
    
    # Asset mappings within hop state
    parameter_mapping: Dict[str, ParameterMappingValue] = Field(
        description="Maps tool parameters to hop state assets or literals."
    )
    result_mapping: Dict[str, str] = Field(
        description="Maps tool outputs to hop state assets."
    )
    
    status: ExecutionStatus = Field(default=ExecutionStatus.PENDING)
    error: Optional[str] = Field(default=None, description="Error message if the tool execution failed")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    validation_errors: Optional[List[str]] = Field(default=None, description="Schema validation errors")

    @validator('created_at', 'updated_at', pre=True)
    def handle_empty_datetime(cls, v):
        """Handle empty datetime strings from LLM responses"""
        if v == "" or v is None:
            return datetime.utcnow()
        return v

    def validate_schema_compatibility(self, tool: ToolDefinition, hop_state: Dict[str, 'Asset']) -> List[str]:
        """Validate schema compatibility between tool and assets"""
        errors = []
        
        # Validate input parameters
        for param_name, mapping in self.parameter_mapping.items():
            if isinstance(mapping, AssetFieldMapping):
                asset = hop_state.get(mapping.state_asset)
                if not asset:
                    errors.append(f"Asset {mapping.state_asset} not found in hop state")
                    continue
                
                if not asset.schema:
                    errors.append(f"Asset {mapping.state_asset} has no schema defined")
                    continue
                
                param_schema = next((p for p in tool.parameters if p.name == param_name), None)
                if not param_schema:
                    errors.append(f"Parameter {param_name} not found in tool definition")
                    continue
                
                # Validate asset schema against parameter requirements
                param_errors = tool.validate_input_asset(asset.schema)
                if param_errors:
                    errors.extend([f"Parameter {param_name}: {e}" for e in param_errors])
        
        # Validate output mappings
        for output_name, asset_name in self.result_mapping.items():
            output_schema = next((o for o in tool.outputs if o.name == output_name), None)
            if not output_schema:
                errors.append(f"Output {output_name} not found in tool definition")
                continue
            
            asset = hop_state.get(asset_name)
            if not asset:
                errors.append(f"Asset {asset_name} not found in hop state")
                continue
            
            if not asset.schema:
                errors.append(f"Asset {asset_name} has no schema defined")
                continue
            
            # Validate tool output schema against asset requirements
            output_errors = tool.validate_output_asset(asset.schema)
            if output_errors:
                errors.extend([f"Output {output_name}: {e}" for e in output_errors])
        
        return errors

    async def execute(self, hop_state: Dict[str, 'Asset']) -> List[str]:
        """Execute the tool step and validate results"""
        print(f"execute running for tool {self.tool_id}")
        errors = []
        
        # Get tool from the local registry
        tool = TOOL_REGISTRY.get(self.tool_id)
        if not tool:
            print(f"Tool {self.tool_id} not found")
            print(f"Tool registry: {TOOL_REGISTRY}")
            errors.append(f"Tool {self.tool_id} not found")
            return errors
        
        if not tool.execution_handler:
            errors.append(f"No execution handler registered for tool {self.tool_id}")
            return errors
        
        # Validate schema compatibility before execution
        validation_errors = self.validate_schema_compatibility(tool, hop_state)
        if validation_errors:
            print(f"Validation errors: {validation_errors}")
            errors.extend(validation_errors)
            return errors
        
        try:
            # Execute tool
            results = await tool.execution_handler.handler(self, hop_state)
            
            # Map results back to hop state
            for output_name, asset_name in self.result_mapping.items():
                if output_name in results:
                    hop_state[asset_name] = Asset(
                        content=results[output_name],
                        schema=tool.outputs[0].schema
                    )
            
            return errors
            
        except Exception as e:
            errors.append(f"Tool execution failed: {str(e)}")
            return errors 

# Load tools when module is imported
try:
    refresh_tool_registry()
except Exception as e:
    print(f"Failed to load tools on import: {e}")
    TOOL_REGISTRY = {} 