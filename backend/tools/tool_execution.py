"""
Tool execution system implementation.

This module contains the core implementation of the tool execution system,
including the execute_tool_step function and related utilities.
"""

from __future__ import annotations
from typing import Dict, Any, Optional, Union
from pydantic import BaseModel, Field
from schemas.asset import Asset
from schemas.tool_handler_schema import ToolExecutionInput, ToolExecutionResult
from schemas.schema_utils import serialize_canonical_object, create_typed_response
from tools.tool_registry import TOOL_REGISTRY, get_tool_definition
from tools.tool_stubbing import ToolStubbing

class ToolExecutionError(Exception):
    """Raised when tool execution fails."""
    def __init__(self, message: str, tool_id: str):
        super().__init__(f"Tool {tool_id} execution failed: {message}")

def _resolve_asset_path(value: Any, path: str, asset_name: str, tool_id: str) -> Any:
    """
    Resolve a path within an asset value, handling both object and array access patterns.
    
    Supported patterns:
    - 'field' - access field in object
    - 'field.subfield' - nested object access
    - '[].field' - extract field from each item in array
    - '[index]' - access specific array index
    - '[index].field' - access field in specific array item
    
    Args:
        value: The value to resolve the path in
        path: The path to resolve (e.g., 'field', '[].url', '[0].title')
        asset_name: Name of the asset (for error messages)
        tool_id: ID of the tool (for error messages)
        
    Returns:
        The resolved value
        
    Raises:
        ToolExecutionError: If the path cannot be resolved
    """
    current_value = value
    
    # Handle array access patterns
    if path.startswith('[]'):
        # Extract field from each item in array
        if not isinstance(current_value, list):
            raise ToolExecutionError(
                f"Cannot access array path {path} in asset {asset_name}: value is not an array",
                tool_id
            )
        
        # Handle [].field pattern
        if path.startswith('[].'):
            field_path = path[3:]  # Remove '[].'' prefix
            result = []
            for item in current_value:
                if field_path:
                    # Recursively resolve the field path in each item
                    item_value = _resolve_asset_path(item, field_path, asset_name, tool_id)
                    result.append(item_value)
                else:
                    result.append(item)
            return result
        else:
            # Just [] - return the array as is
            return current_value
    
    # Handle specific array index access [index]
    elif path.startswith('[') and ']' in path:
        if not isinstance(current_value, list):
            raise ToolExecutionError(
                f"Cannot access array index in path {path} in asset {asset_name}: value is not an array",
                tool_id
            )
        
        # Extract index and remaining path
        end_bracket = path.index(']')
        index_str = path[1:end_bracket]
        remaining_path = path[end_bracket + 1:]
        
        try:
            index = int(index_str)
            if index < 0 or index >= len(current_value):
                raise ToolExecutionError(
                    f"Array index {index} out of bounds in path {path} in asset {asset_name}",
                    tool_id
                )
            current_value = current_value[index]
            
            # If there's a remaining path (like '.field'), resolve it
            if remaining_path.startswith('.'):
                remaining_path = remaining_path[1:]  # Remove leading dot
                return _resolve_asset_path(current_value, remaining_path, asset_name, tool_id)
            else:
                return current_value
                
        except ValueError:
            raise ToolExecutionError(
                f"Invalid array index '{index_str}' in path {path} in asset {asset_name}",
                tool_id
            )
    
    # Handle regular object field access
    else:
        for part in path.split('.'):
            if isinstance(current_value, dict):
                current_value = current_value.get(part)
                if current_value is None:
                    raise ToolExecutionError(
                        f"Cannot access path {path} in asset {asset_name}: field '{part}' not found",
                        tool_id
                    )
            else:
                raise ToolExecutionError(
                    f"Cannot access path {path} in asset {asset_name}: cannot access field '{part}' on {type(current_value).__name__}",
                    tool_id
                )
        
        return current_value

async def execute_tool_step(step: "ToolStep", hop_state: Dict[str, Asset]) -> Dict[str, Any]:
    """
    Execute a tool step and return the results with proper canonical type handling.
    
    Args:
        step: The tool step to execute
        hop_state: Current state of the hop containing all assets
        
    Returns:
        Dict containing the execution results with canonical types preserved
        
    Raises:
        ToolExecutionError: If tool execution fails
    """
    print("Starting execute_tool_step")

    # Get tool definition from registry
    tool_def = get_tool_definition(step.tool_id)
    if not tool_def:
        raise ToolExecutionError(f"Tool {step.tool_id} not found in registry", step.tool_id)
    
    # Build tool inputs from parameter mappings
    params = {}
    for param_name, mapping in step.parameter_mapping.items():
        if mapping.type == "literal":
            params[param_name] = mapping.value
        elif mapping.type == "asset_field":
            asset = hop_state.get(mapping.state_asset)
            if not asset:
                raise ToolExecutionError(
                    f"Asset {mapping.state_asset} not found in hop state",
                    step.tool_id
                )
            
            # Get value from asset, following path if specified
            value = asset.value
            if mapping.path:
                value = _resolve_asset_path(value, mapping.path, mapping.state_asset, step.tool_id)
            
            params[param_name] = value
    
    # Convert Resource objects to dictionaries
    resource_configs = {
        resource_id: resource.model_dump()
        for resource_id, resource in step.resource_configs.items()
    }
    
    # Create execution input
    execution_input = ToolExecutionInput(
        params=params,
        resource_configs=resource_configs,
        step_id=step.id
    )
    
    try:
        # Check if we should stub this tool execution
        if ToolStubbing.should_stub_tool(tool_def):
            print(f"execute_tool_step: Stubbing tool {step.tool_id}")
            result = await ToolStubbing.get_stub_response(tool_def, execution_input)
        else:
            # Execute the actual tool
            print("execute_tool_step: Executing tool")
            result = await tool_def.execution_handler.handler(execution_input)
        
        print("execute_tool_step: Tool execution completed")

        # Handle different result types while preserving canonical types
        if isinstance(result, ToolExecutionResult):
            # New typed result format - use schema utilities for proper handling
            return create_typed_response(
                success=True,
                outputs=result.outputs,
                metadata=result.metadata
            )
        elif isinstance(result, dict) and "outputs" in result:
            # Legacy result format - handle gracefully
            return create_typed_response(
                success=True,
                outputs=result["outputs"],
                metadata=result.get("metadata")
            )
        else:
            # Direct result format - treat as outputs
            return create_typed_response(
                success=True,
                outputs=result,
                metadata=None
            )
            
    except Exception as e:
        print(f"execute_tool_step: Error executing tool: {e}")
        raise ToolExecutionError(str(e), step.tool_id) 