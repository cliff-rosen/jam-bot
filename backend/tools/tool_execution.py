"""
Tool execution system implementation.

This module contains the core implementation of the tool execution system,
including the execute_tool_step function and related utilities.
"""

from __future__ import annotations
from typing import Dict, Any, Optional, Union
from pydantic import BaseModel, Field
from schemas.asset import Asset, AssetStatus
from schemas.tool_handler_schema import ToolExecutionInput, ToolExecutionResult
from schemas.schema_utils import serialize_canonical_object, create_typed_response
from tools.tool_registry import TOOL_REGISTRY, get_tool_definition
from tools.tool_stubbing import ToolStubbing
from services.asset_service import AssetService
from datetime import datetime

class ToolExecutionError(Exception):
    """Raised when tool execution fails."""
    def __init__(self, message: str, tool_id: str):
        super().__init__(f"Tool {tool_id} execution failed: {message}")

async def execute_tool_step(
    step: "ToolStep", 
    asset_context: Dict[str, Any], 
    user_id: Optional[int] = None,
    db: Optional[Any] = None
) -> Dict[str, Any]:
    """
    Execute a tool step and return the results with proper canonical type handling.
    Also persists updated assets to the database if user_id and db are provided.
    
    Args:
        step: The tool step to execute
        asset_context: Dictionary mapping asset IDs to Asset objects or asset data
        user_id: User ID for asset persistence (optional)
        db: Database session for asset persistence (optional)
        
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
            asset_id = mapping.state_asset
            
            # Get asset from context (could be Asset object or asset data)
            asset_data = asset_context.get(asset_id)
            if not asset_data:
                raise ToolExecutionError(
                    f"Asset {asset_id} not found in asset context",
                    step.tool_id
                )
            
            # Extract value from asset
            if isinstance(asset_data, Asset):
                value = asset_data.value
            elif isinstance(asset_data, dict) and 'value' in asset_data:
                value = asset_data['value']
            else:
                # Assume the asset_data is the value itself
                value = asset_data
            
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
            execution_response = create_typed_response(
                success=True,
                outputs=result.outputs,
                metadata=result.metadata
            )
        elif isinstance(result, dict) and "outputs" in result:
            # Legacy result format - handle gracefully
            execution_response = create_typed_response(
                success=True,
                outputs=result["outputs"],
                metadata=result.get("metadata")
            )
        else:
            # Direct result format - treat as outputs
            execution_response = create_typed_response(
                success=True,
                outputs=result,
                metadata=None
            )
        
        # Persist assets to database if user_id and db are provided
        if user_id is not None and db is not None:
            await _persist_updated_assets(step, asset_context, execution_response, user_id, db)
            
        return execution_response
            
    except Exception as e:
        print(f"execute_tool_step: Error executing tool: {e}")
        raise ToolExecutionError(str(e), step.tool_id)

async def _persist_updated_assets(
    step: "ToolStep", 
    asset_context: Dict[str, Any], 
    execution_response: Dict[str, Any], 
    user_id: int, 
    db: Any
) -> None:
    """
    Persist updated assets to the database after successful tool execution.
    
    Args:
        step: The executed tool step
        asset_context: Asset context mapping
        execution_response: The tool execution response
        user_id: User ID for asset creation
        db: Database session
    """
    try:
        asset_service = AssetService()
        
        # Find assets that were updated by this tool execution
        for result_name, mapping in step.result_mapping.items():
            if mapping.type == "asset_field":
                asset_id = mapping.state_asset
                asset_data = asset_context.get(asset_id)
                
                if asset_data:
                    # Check if this is an Asset object or just data
                    if isinstance(asset_data, Asset):
                        asset = asset_data
                        
                        # Check if asset needs to be created or updated
                        if asset.status == AssetStatus.PROPOSED:
                            # Create new asset on backend
                            asset_service.create_asset(
                                user_id=user_id,
                                name=asset.name,
                                type=asset.schema_definition.type,
                                subtype=asset.subtype,
                                description=asset.description,
                                content=asset.value,
                                asset_metadata=asset.asset_metadata.model_dump() if asset.asset_metadata else None,
                                scope_type="hop",  # Default to hop scope for tool execution
                                scope_id=step.hop_id if hasattr(step, 'hop_id') else "unknown"
                            )
                            print(f"Created new asset {asset.name} on backend")
                        elif asset.status in [AssetStatus.READY, AssetStatus.IN_PROGRESS]:
                            # Update existing asset
                            asset_service.update_asset(
                                asset_id=asset.id,
                                user_id=user_id,
                                updates={
                                    'content': asset.value,
                                    'asset_metadata': asset.asset_metadata.model_dump() if asset.asset_metadata else None,
                                    'updated_at': datetime.utcnow()
                                }
                            )
                            print(f"Updated existing asset {asset.name} on backend")
                        
    except Exception as e:
        print(f"Error persisting assets to database: {e}")
        # Don't fail the tool execution if asset persistence fails
        pass 