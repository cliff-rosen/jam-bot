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

# NOTE: we must NOT import tool_registry until after ToolDefinition & related
# schema classes are declared (otherwise tool_registry -> tools circular import).

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

# import registry after schemas are declared to avoid circular import
from tools.tool_registry import TOOL_REGISTRY  # noqa: E402

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

# Rebuild ToolDefinition to resolve forward refs to ToolExecutionHandler (Pydantic v2)
try:
    ToolDefinition.model_rebuild()
except AttributeError:
    # Fallback for Pydantic v1
    ToolDefinition.update_forward_refs() 