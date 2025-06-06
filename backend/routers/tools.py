from fastapi import APIRouter, Depends, HTTPException, status
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
import json
import logging
from database import get_db

from services.auth_service import validate_token

from schemas.unified_schema import ToolDefinition, Asset, ToolParameter, ToolOutput, SchemaType
from schemas.tools import ToolStep, ExecutionStatus, TOOL_REGISTRY

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
        step: Tool step configuration
        hop_state: Current state of the hop (unified Asset format)
        user: Authenticated user
        db: Database session
        
    Returns:
        Dict containing execution results and any errors
    """
    print("--------------------------------")
    print(f"Executing tool: {tool_id}")
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
    Get list of available tools and their definitions using unified schema format
    
    Args:
        user: Authenticated user
        
    Returns:
        List of unified tool definitions
    """
    unified_tools = []
    for tool in TOOL_REGISTRY.values():
        # Convert to unified ToolDefinition format
        unified_tool = ToolDefinition(
            id=tool.id,
            name=tool.name,
            description=tool.description,
            category=tool.category,
            parameters=[
                ToolParameter(
                    id=f"{tool.id}_{param.name}",
                    name=param.name,
                    description=param.description,
                    schema=SchemaType(
                        type=param.schema.get('type', 'object') if param.schema else 'object',
                        description=param.description,
                        is_array=param.schema.get('is_array', False) if param.schema else False,
                        fields=param.schema.get('fields') if param.schema else None
                    ),
                    required=param.required,
                    default=param.schema.get('default') if param.schema else None
                ) for param in tool.parameters
            ],
            outputs=[
                ToolOutput(
                    id=f"{tool.id}_{output.name}",
                    name=output.name,
                    description=output.description,
                    schema=SchemaType(
                        type=output.schema.get('type', 'object') if output.schema else 'object',
                        description=output.description,
                        is_array=output.schema.get('is_array', False) if output.schema else False,
                        fields=output.schema.get('fields') if output.schema else None
                    )
                ) for output in tool.outputs
            ],
            examples=getattr(tool, 'examples', None)
        )
        unified_tools.append(unified_tool)
    
    return {"tools": unified_tools} 