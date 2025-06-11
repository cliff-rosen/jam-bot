"""
Tool execution system implementation.

This module contains the core implementation of the tool execution system,
including the ToolStep execute method and related utilities.
"""

from __future__ import annotations
from typing import Dict, Any, Optional, Union
from pydantic import BaseModel, Field
from .workflow import ToolStep, ExecutionStatus
from .asset import Asset
from .tool_handler_schema import ToolExecutionInput, ToolExecutionResult
from tools.tool_registry import TOOL_REGISTRY, get_tool_definition

class ToolExecutionError(Exception):
    """Raised when tool execution fails."""
    def __init__(self, message: str, tool_id: str):
        super().__init__(f"Tool {tool_id} execution failed: {message}")

async def execute_tool_step(step: ToolStep, hop_state: Dict[str, Asset]) -> Dict[str, Any]:
    """
    Execute a tool step and return the results.
    
    Args:
        step: The tool step to execute
        hop_state: Current state of the hop containing all assets
        
    Returns:
        Dict containing the execution results
        
    Raises:
        ToolExecutionError: If tool execution fails
    """
    print(f"execute_tool_step {step.tool_id}")

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
        # Execute the tool
        print(f"Calling execution handler for {step.tool_id}")
        result = await tool_def.execution_handler.handler(execution_input)
        print(f"Execution handler result: {result}")
        
        # Handle result mapping
        if isinstance(result, ToolExecutionResult):
            outputs = result.outputs
        else:
            outputs = result
            
        # Map results back to hop state
        for output_name, mapping in step.result_mapping.items():
            if mapping.type == "discard":
                continue
                
            if mapping.type == "asset_field":
                value = outputs.get(output_name)
                if value is not None:
                    # Create or update asset in hop state
                    if mapping.state_asset not in hop_state:
                        hop_state[mapping.state_asset] = Asset(
                            id=mapping.state_asset,
                            name=f"Output from {step.tool_id}",
                            description=f"Output {output_name} from tool {step.tool_id}",
                            value=value
                        )
                    else:
                        hop_state[mapping.state_asset].value = value
        
        return {
            "success": True,
            "errors": [],
            "tool_results": outputs,
            "hop_state": hop_state
        }
        
    except Exception as e:
        print(f"Error executing tool step {step.tool_id}: {e}")
        raise ToolExecutionError(str(e), step.tool_id)

# Add execute method to ToolStep
async def tool_step_execute(self: ToolStep, hop_state: Dict[str, Asset]) -> Dict[str, Any]:
    """Execute this tool step and return the results."""
    try:
        self.status = ExecutionStatus.RUNNING
        result = await execute_tool_step(self, hop_state)
        self.status = ExecutionStatus.COMPLETED
        return result
    except Exception as e:
        self.status = ExecutionStatus.FAILED
        self.error = str(e)
        raise

# Add execute method to ToolStep class
ToolStep.execute = tool_step_execute 