from fastapi import APIRouter, Depends, HTTPException, status
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
import json
import logging
from database import get_db

# Import from unified schema for Asset, but ToolDefinition now comes from tools.py
from schemas.asset import Asset
from schemas.workflow import ToolStep
from schemas.tool import ToolDefinition
from tools.tool_execution import ToolExecutionError
from schemas.workflow import ExecutionStatus
from tools.tool_registry import get_available_tools, get_tool_definition, TOOL_REGISTRY

from services.auth_service import validate_token

# include all tool handlers so that they are registered
from tools import *

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/tools",
    tags=["tools"],
    dependencies=[Depends(validate_token)]
)

@router.post("/execute/{tool_id}")
async def execute_tool(
    tool_id: str,
    step: ToolStep,
    hop_state: Dict[str, Asset],
    user = Depends(validate_token),
    db: Session = Depends(get_db)
):
    """
    Execute a tool step and return the results
    
    Args:
        tool_id: ID of the tool to execute
        step: Tool step configuration with mappings:
              - parameter_mapping: {tool_param_name: data_source} - tool gets value FROM source
              - result_mapping: {tool_output_name: hop_asset_name} - tool puts value TO asset
        hop_state: Current state of the hop (unified Asset format)
        user: Authenticated user
        db: Database session
        
    Returns:
        Dict containing execution results and any errors
    """
    print("--------------------------------")
    print(f"/execute/ endpoint hit for tool: {tool_id}")

    # validate that tool_id matches the tool_id in the step
    # TO DO: consider removing toolid from the signiture of execute_tool
    if tool_id != step.tool_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Tool ID mismatch: {tool_id} != {step.tool_id}"
        )

    # Validate tool exists
    if tool_id not in TOOL_REGISTRY:
        print(f"Tool {tool_id} not found")
        print(f"Tool registry: {TOOL_REGISTRY}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Tool {tool_id} not found"
        )

    try:
        # Execute the tool step
        print(f"Executing tool step {step.id} for tool {step.tool_id}")
        result = await step.execute(hop_state)
        return result
    except ToolExecutionError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Error executing tool {tool_id}: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error executing tool: {str(e)}"
        )

@router.get("/available", response_model=Dict[str, List[ToolDefinition]])
async def get_available_tools(
    user = Depends(validate_token)
):
    """
    Get list of available tools and their definitions
    
    Args:
        user: Authenticated user
        
    Returns:
        List of tool definitions (no conversion needed since we use same schema)
    """
    return {"tools": list(TOOL_REGISTRY.values())}

@router.get("/tools/{tool_id}", response_model=ToolDefinition)
async def get_tool(tool_id: str):
    """
    Get the definition of a specific tool by its ID.
    """
    tool_def = get_tool_definition(tool_id)
    if not tool_def:
        raise HTTPException(status_code=404, detail="Tool not found")
    return tool_def
