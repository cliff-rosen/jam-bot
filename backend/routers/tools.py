from fastapi import APIRouter, Depends, HTTPException, status
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from pydantic import BaseModel
import json
import logging
from database import get_db

# Import from unified schema for Asset, but ToolDefinition now comes from tools.py
from schemas.asset import Asset
from schemas.workflow import ToolStep
from schemas.tool import ToolDefinition
from tools.tool_registry import get_tool_definition, TOOL_REGISTRY
from services.tool_execution_service import ToolExecutionService

from services.auth_service import validate_token

# include all tool handlers so that they are registered
from tools import *

logger = logging.getLogger(__name__)


router = APIRouter(
    prefix="/tools",
    tags=["tools"],
    dependencies=[Depends(validate_token)]
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


@router.get("/{tool_id}", response_model=ToolDefinition)
async def get_tool(tool_id: str):
    """
    Get the definition of a single tool by its ID.
    """
    tool_def = get_tool_definition(tool_id)
    if not tool_def:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Tool with id '{tool_id}' not found"
        )
    return tool_def


@router.post("/step/{tool_step_id}/execute")
async def execute_tool_step(
    tool_step_id: str,
    user = Depends(validate_token),
    db: Session = Depends(get_db)
):
    """
    Execute a tool step.
    """
    try:
        service = ToolExecutionService(db)
        print("================================================")
        print(f"Executing tool step {tool_step_id}")
        result = await service.execute_tool_step(
            tool_step_id=tool_step_id,
            user_id=user.user_id
        )
        
        return result
        
    except Exception as e:
        logger.error(f"Error executing tool step {tool_step_id}: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error executing tool step: {str(e)}"
        )
