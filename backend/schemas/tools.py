"""
Tool Step Execution Schema

This module defines the ToolStep class and related mappings for executing tools within hops.

## Mapping Directions (IMPORTANT):

### Parameter Mapping: {tool_param_name: data_source}
- **Direction**: tool_param ← asset (tool gets value FROM asset)
- **Purpose**: Maps tool parameter names to their data sources
- **Format**: {"param_name": {"type": "asset_field", "state_asset": "asset_name"}}
- **Example**: {"query": {"type": "asset_field", "state_asset": "search_criteria"}}
- **Meaning**: Tool parameter 'query' gets its value FROM hop asset 'search_criteria'

### Result Mapping: {tool_output_name: hop_asset_name}  
- **Direction**: tool_output → asset (tool puts value TO asset)
- **Purpose**: Maps tool output names to hop asset destinations
- **Format**: {"output_name": "destination_asset_name"}
- **Example**: {"emails": "retrieved_emails", "count": "email_count"}
- **Meaning**: Tool output 'emails' puts its value TO hop asset 'retrieved_emails'

## Validation:
- All assets referenced in parameter_mapping must exist in hop_state
- All assets referenced in result_mapping must exist in hop_state
- Tool parameters and outputs must match tool definition
"""

from pydantic import BaseModel, Field, validator
from typing import Dict, Any, Optional, List, Union, Literal, Callable, Awaitable
from datetime import datetime
from enum import Enum
import json
import os
from .unified_schema import SchemaEntity, Asset, SchemaType
from .tool_handler_schema import ToolExecutionInput, ToolExecutionHandler

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

class DiscardMapping(BaseModel):
    type: Literal["discard"] = "discard"

ParameterMappingValue = Union[AssetFieldMapping, LiteralMapping]
ResultMappingValue = Union[AssetFieldMapping, DiscardMapping]

class ExternalSystemInfo(BaseModel):
    """Information about external system a tool accesses"""
    id: str = Field(description="Unique identifier for the external system")
    name: str = Field(description="Human-readable name")
    description: str = Field(description="What this system provides access to")
    type: Literal['messaging', 'database', 'storage', 'web', 'social', 'file_system'] = Field(description="Category of external system")
    connection_schema: Dict[str, Any] = Field(description="Schema for connection credentials/config")
    capabilities: List[str] = Field(description="What operations are supported")
    base_url: Optional[str] = None
    documentation_url: Optional[str] = None
    rate_limits: Optional[Dict[str, Any]] = None

class ToolParameter(SchemaEntity):
    """Parameter definition for a tool - extends SchemaEntity for unified schema system"""
    required: bool = True
    # id, name, description, schema inherited from SchemaEntity

class ToolOutput(SchemaEntity):
    """Output definition for a tool - extends SchemaEntity for unified schema system"""
    # id, name, description, schema inherited from SchemaEntity
    pass

class ToolDefinition(BaseModel):
    """Definition of a tool that can be used in a hop"""
    id: str
    name: str
    description: str
    category: str
    parameters: List[ToolParameter]
    outputs: List[ToolOutput]
    
    # External system integration (only for tools that access external systems)
    external_system: Optional[ExternalSystemInfo] = Field(default=None, description="External system this tool accesses")
    
    # Updated to hold a ToolExecutionHandler wrapper instead of a raw callable
    execution_handler: Optional[ToolExecutionHandler] = Field(default=None, exclude=True)

    def validate_input_asset(self, asset_schema: SchemaType) -> List[str]:
        """Validate that an asset schema is compatible with this tool's input requirements"""
        # TODO: Implement schema validation using SchemaType
        return []

    def validate_output_asset(self, asset_schema: SchemaType) -> List[str]:
        """Validate that an asset schema is compatible with this tool's output requirements"""
        # TODO: Implement schema validation using SchemaType
        return []
    
    def accesses_external_system(self) -> bool:
        """Check if this tool accesses an external system"""
        return self.external_system is not None
    
    def get_external_system_id(self) -> Optional[str]:
        """Get the external system ID if this tool accesses one"""
        return self.external_system.id if self.external_system else None

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

            tool_id = tool_def_json["id"]

            # Parse parameters
            parameters = []
            if "parameters" in tool_def_json:
                for param_def in tool_def_json["parameters"]:
                    param_schema = ToolParameterSchema(**param_def)
                    # Generate ID for parameter: tool_id.param_name
                    param_id = f"{tool_id}.{param_schema.name}"
                    # Convert schema to SchemaType format
                    schema_type = SchemaType(
                        type=param_schema.schema.get("type", "object") if param_schema.schema else "object",
                        description=param_schema.schema.get("description") if param_schema.schema else None,
                        is_array=param_schema.schema.get("is_array", False) if param_schema.schema else False,
                        fields=param_schema.schema.get("fields") if param_schema.schema else None
                    )
                    parameters.append(ToolParameter(
                        id=param_id,
                        name=param_schema.name,
                        description=param_schema.description,
                        schema=schema_type,
                        required=param_schema.required
                    ))
            elif "input_schema" in tool_def_json:
                # Convert old format to new format
                input_schema = tool_def_json["input_schema"]
                if "properties" in input_schema:
                    for param_name, param_schema in input_schema["properties"].items():
                        # Generate ID for parameter: tool_id.param_name
                        param_id = f"{tool_id}.{param_name}"
                        # Convert schema to SchemaType format
                        schema_type = SchemaType(
                            type=param_schema.get("type", "object"),
                            description=param_schema.get("description"),
                            is_array=param_schema.get("is_array", False),
                            fields=param_schema.get("fields")
                        )
                        parameters.append(ToolParameter(
                            id=param_id,
                            name=param_name,
                            description=param_schema.get("description", ""),
                            schema=schema_type,
                            required=param_name in input_schema.get("required", [])
                        ))
            
            # Parse outputs
            outputs = []
            if "outputs" in tool_def_json:
                for output_def in tool_def_json["outputs"]:
                    output_schema = ToolOutputSchema(**output_def)
                    # Generate ID for output: tool_id.output_name
                    output_id = f"{tool_id}.{output_schema.name}"
                    # Convert schema to SchemaType format
                    schema_type = SchemaType(
                        type=output_schema.schema.get("type", "object") if output_schema.schema else "object",
                        description=output_schema.schema.get("description") if output_schema.schema else None,
                        is_array=output_schema.schema.get("is_array", False) if output_schema.schema else False,
                        fields=output_schema.schema.get("fields") if output_schema.schema else None
                    )
                    outputs.append(ToolOutput(
                        id=output_id,
                        name=output_schema.name,
                        description=output_schema.description,
                        schema=schema_type
                    ))
            elif "output_schema" in tool_def_json:
                # Convert old format to new format
                for output_def in tool_def_json["output_schema"]:
                    output_name = output_def.get("name", "")
                    # Generate ID for output: tool_id.output_name
                    output_id = f"{tool_id}.{output_name}"
                    # Convert schema to SchemaType format
                    output_schema_dict = output_def.get("schema", {})
                    schema_type = SchemaType(
                        type=output_schema_dict.get("type", "object"),
                        description=output_schema_dict.get("description"),
                        is_array=output_schema_dict.get("is_array", False),
                        fields=output_schema_dict.get("fields")
                    )
                    outputs.append(ToolOutput(
                        id=output_id,
                        name=output_name,
                        description=output_def.get("description", ""),
                        schema=schema_type
                    ))
            
            # Create tool definition
            tool_definition = ToolDefinition(
                id=tool_id,
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
            output_type = output.schema.type if output.schema else "object"
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
            param_type = param.schema.type if param.schema else "object"
            desc += f"  - {param.name} ({param_type}): {param.description}"
            if not param.required:
                desc += " [Optional]"
            desc += "\n"
        
        desc += "Outputs:\n"
        for output in tool_def.outputs:
            output_type = output.schema.type if output.schema else "object"
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
    
    # External system integration (only for tools that access external systems)
    external_system_connection_asset: Optional[str] = Field(default=None, description="Asset containing connection credentials for external system")
    
    # Asset mappings within hop state
    parameter_mapping: Dict[str, ParameterMappingValue] = Field(
        description="Maps tool parameter names to their data sources. Format: {tool_param_name: asset_reference}. Direction: tool_param ← asset (tool gets value FROM asset)."
    )
    result_mapping: Dict[str, ResultMappingValue] = Field(
        description="Maps tool output names to hop asset destinations. Format: {tool_output_name: asset_reference}. Direction: tool_output → asset (tool puts value TO asset)."
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
        
        # Validate external system access if tool requires it
        if tool.accesses_external_system() and not self.external_system_connection_asset:
            errors.append(f"Tool {tool.id} requires external system connection but none specified")
        elif self.external_system_connection_asset and not tool.accesses_external_system():
            errors.append(f"Tool {tool.id} does not access external systems but connection specified")
        
        # Validate connection asset if external system specified
        if self.external_system_connection_asset:
            connection_asset = hop_state.get(self.external_system_connection_asset)
            if not connection_asset:
                errors.append(f"External system connection asset {self.external_system_connection_asset} not found in hop state")
        
        # Validate input parameters: tool parameter gets value FROM hop asset
        for tool_param_name, mapping in self.parameter_mapping.items():
            if isinstance(mapping, AssetFieldMapping):
                source_asset = hop_state.get(mapping.state_asset)
                if not source_asset:
                    errors.append(f"Source asset {mapping.state_asset} for tool parameter {tool_param_name} not found in hop state")
                    continue
                
                if not source_asset.schema:
                    errors.append(f"Source asset {mapping.state_asset} for tool parameter {tool_param_name} has no schema defined")
                    continue
                
                param_schema = next((p for p in tool.parameters if p.name == tool_param_name), None)
                if not param_schema:
                    errors.append(f"Tool parameter {tool_param_name} not found in tool definition")
                    continue
                
                # Validate asset schema against parameter requirements
                param_errors = tool.validate_input_asset(source_asset.schema)
                if param_errors:
                    errors.extend([f"Tool parameter {tool_param_name}: {e}" for e in param_errors])
        
        # Validate output mappings: tool output puts value TO hop asset
        # NOTE: Output mapping is OPTIONAL - only validate outputs that are actually mapped
        # At least one output should be mapped, but not necessarily all outputs
        if not self.result_mapping:
            errors.append(f"At least one tool output must be mapped in result_mapping")
        else:
            for tool_output_name, mapping in self.result_mapping.items():
                output_schema = next((o for o in tool.outputs if o.name == tool_output_name), None)
                if not output_schema:
                    errors.append(f"Tool output {tool_output_name} not found in tool definition")
                    continue
                
                if isinstance(mapping, AssetFieldMapping):
                    destination_asset = hop_state.get(mapping.state_asset)
                    if not destination_asset:
                        errors.append(f"Destination asset {mapping.state_asset} for tool output {tool_output_name} not found in hop state")
                        continue
                    
                    if not destination_asset.schema:
                        errors.append(f"Destination asset {mapping.state_asset} for tool output {tool_output_name} has no schema defined")
                        continue
                    
                    # Validate tool output schema against asset requirements
                    output_errors = tool.validate_output_asset(destination_asset.schema)
                    if output_errors:
                        errors.extend([f"Tool output {tool_output_name}: {e}" for e in output_errors])
                elif isinstance(mapping, DiscardMapping):
                    # DiscardMapping requires no validation - output is intentionally discarded
                    pass  # No action needed - output is discarded
        
        return errors

    def _build_tool_inputs(self, tool: ToolDefinition, hop_state: Dict[str, 'Asset']) -> tuple[Dict[str, Any], Optional[Any], List[str]]:
        """Resolve parameter mappings into concrete values to feed into the tool.

        Returns a tuple of (params_dict, connection_value, error_list)."""
        params: Dict[str, Any] = {}
        errors: List[str] = []

        # Resolve each declared parameter in the tool definition
        for param in tool.parameters:
            mapping = self.parameter_mapping.get(param.name)

            # Parameter might be optional and unmapped
            if mapping is None:
                if param.required:
                    errors.append(f"Required parameter '{param.name}' has no mapping defined")
                continue

            # Asset field mapping -> fetch value from hop state asset
            if isinstance(mapping, AssetFieldMapping):
                asset = hop_state.get(mapping.state_asset)
                if not asset:
                    errors.append(f"Asset '{mapping.state_asset}' for parameter '{param.name}' not found in hop state")
                    continue

                # Ensure asset has a value ready
                if asset.value is None:
                    errors.append(f"Asset '{mapping.state_asset}' for parameter '{param.name}' has no value")
                    continue

                params[param.name] = asset.value

            # Literal mapping -> take value directly
            elif isinstance(mapping, LiteralMapping):
                params[param.name] = mapping.value

            else:
                errors.append(f"Unsupported mapping type for parameter '{param.name}'")

        # Resolve external connection if needed
        connection_value = None
        if self.external_system_connection_asset:
            connection_asset = hop_state.get(self.external_system_connection_asset)
            if connection_asset:
                connection_value = connection_asset.value
            else:
                errors.append(f"Connection asset '{self.external_system_connection_asset}' not found in hop state")

        return params, connection_value, errors

    async def execute(self, hop_state: Dict[str, 'Asset']) -> List[str]:
        """Execute the tool step and validate results"""
        print("--------------------------------")
        print(f"step.execute() running for tool {self.tool_id}")

        errors: List[str] = []

        # Retrieve tool definition
        tool = TOOL_REGISTRY.get(self.tool_id)
        if not tool:
            errors.append(f"Tool '{self.tool_id}' not found")
            return errors

        if not tool.execution_handler:
            errors.append(f"No execution handler registered for tool '{self.tool_id}'")
            return errors

        # Validate schema compatibility first (makes sure asset schemas make sense)
        validation_errors = self.validate_schema_compatibility(tool, hop_state)
        if validation_errors:
            errors.extend(validation_errors)
            return errors

        # Build concrete input parameters for the tool
        params, connection_value, param_errors = self._build_tool_inputs(tool, hop_state)
        if param_errors:
            errors.extend(param_errors)
            return errors

        execution_input = ToolExecutionInput(
            params=params,
            connection=connection_value,
            step_id=self.id,
        )

        try:
            # Actually execute the handler
            results = await tool.execution_handler.handler(execution_input)

            # Map handler results back onto hop state according to result_mapping
            for tool_output_name, mapping in self.result_mapping.items():
                if isinstance(mapping, AssetFieldMapping):
                    # Only process if tool produced this output
                    if tool_output_name not in results:
                        continue

                    destination_key = mapping.state_asset

                    # Retrieve or create destination asset in hop state
                    destination_asset = hop_state.get(destination_key)

                    if not destination_asset:
                        # If destination asset missing, fabricate a minimal one so downstream logic works
                        output_schema = next((o.schema for o in tool.outputs if o.name == tool_output_name), None)
                        destination_asset = Asset(
                            id=f"{self.id}.{destination_key}",
                            name=destination_key,
                            description=f"Asset generated by tool '{self.tool_id}' output '{tool_output_name}'",
                            schema=output_schema or SchemaType(type="object", is_array=False),
                            value=None,
                        )

                    # Update asset value and mark ready
                    destination_asset.value = results[tool_output_name]
                    destination_asset.mark_ready(updated_by=self.tool_id)

                    # Persist back to hop state
                    hop_state[destination_key] = destination_asset

                # Discard mapping explicitly ignored

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

# Rebuild ToolDefinition to resolve forward refs to ToolExecutionHandler (Pydantic v2)
try:
    ToolDefinition.model_rebuild()
except AttributeError:
    # Fallback for Pydantic v1
    ToolDefinition.update_forward_refs() 