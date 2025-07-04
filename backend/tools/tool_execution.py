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
                for part in mapping.path.split('.'):
                    if isinstance(value, dict):
                        value = value.get(part)
                    else:
                        raise ToolExecutionError(
                            f"Cannot access path {mapping.path} in asset {mapping.state_asset}",
                            step.tool_id
                        )
            
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