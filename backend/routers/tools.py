from fastapi import APIRouter, Depends, HTTPException, status
from typing import Dict, Any, List
from sqlalchemy.orm import Session

from services.auth_service import validate_token
from schemas.workflow import ToolStep, Asset
from schemas.tools import TOOL_REGISTRY
from database import get_db

router = APIRouter(prefix="/tools", tags=["tools"])

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
        step: Tool step configuration
        hop_state: Current state of the hop
        user: Authenticated user
        db: Database session
        
    Returns:
        Dict containing execution results and any errors
    """
    # Validate tool exists
    if tool_id not in TOOL_REGISTRY:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Tool {tool_id} not found"
        )
    
    # Execute the tool step
    errors = await step.execute(hop_state)
    
    # Return results
    return {
        "success": len(errors) == 0,
        "errors": errors,
        "hop_state": hop_state
    }

@router.get("/available")
async def get_available_tools(
    user = Depends(validate_token)
):
    """
    Get list of available tools and their definitions
    
    Args:
        user: Authenticated user
        
    Returns:
        List of tool definitions
    """
    return {
        "tools": [
            {
                "id": tool.id,
                "name": tool.name,
                "description": tool.description,
                "category": tool.category,
                "parameters": [p.dict() for p in tool.parameters],
                "outputs": [o.dict() for o in tool.outputs]
            }
            for tool in TOOL_REGISTRY.values()
        ]
    } 