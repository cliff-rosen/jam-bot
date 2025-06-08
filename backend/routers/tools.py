from fastapi import APIRouter, Depends, HTTPException, status
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
import json
import logging
from database import get_db

# Import from unified schema for Asset, but ToolDefinition now comes from tools.py
from schemas.unified_schema import Asset
from schemas.tools import ToolStep, ExecutionStatus, ToolDefinition
from schemas.tool_registry import TOOL_REGISTRY

from services.auth_service import validate_token

# include all tool handlers so that they are registered
from tool_handlers import *

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
    # print(f"Step: {step}")

    # Validate tool exists
    if tool_id not in TOOL_REGISTRY:
        print(f"Tool {tool_id} not found")
        print(f"Tool registry: {TOOL_REGISTRY}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Tool {tool_id} not found"
        )
    
    # Execute the tool step
    try:    
        tool_results = await step.execute(hop_state)
        print(f"Tool results: {tool_results}")
    except Exception as e:
        print(f"Error executing tool: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error executing tool: {e}"
        )
    
    # Return results including the updated hop state
    return {
        "success": True,
        "errors": [],
        "tool_results": tool_results,
        "hop_state": hop_state
    }

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