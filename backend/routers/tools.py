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
from schemas.tool_execution import (
    CreateToolExecutionRequest, 
    CreateToolExecutionResponse,
    ToolExecutionResult,
    ToolExecutionStatusResponse
)
from tools.tool_execution import ToolExecutionError, execute_tool_step
from tools.tool_registry import get_tool_definition, TOOL_REGISTRY
from services.tool_execution_service import ToolExecutionService
from models import ToolExecutionStatus

from services.auth_service import validate_token

# include all tool handlers so that they are registered
from tools import *

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/tools",
    tags=["tools"],
    dependencies=[Depends(validate_token)]
)

@router.post("/execution/create", response_model=CreateToolExecutionResponse)
async def create_tool_execution(
    request: CreateToolExecutionRequest,
    user = Depends(validate_token),
    db: Session = Depends(get_db)
):
    """
    Create a new tool execution record and return execution ID
    
    Args:
        request: Tool execution creation request
        user: Authenticated user
        db: Database session
        
    Returns:
        CreateToolExecutionResponse containing execution_id
    """
    try:
        tool_execution_service = ToolExecutionService(db)
        
        # Convert request data to proper types
        tool_step = ToolStep.model_validate(request.tool_step)
        hop_state = {name: Asset.model_validate(asset) for name, asset in request.hop_state.items()}
        
        tool_execution = await tool_execution_service.create_tool_execution(
            user_id=user.user_id,
            mission_id=request.mission_id,
            tool_step=tool_step,
            hop_state=hop_state
        )
        
        return CreateToolExecutionResponse(execution_id=tool_execution.id)
        
    except Exception as e:
        logger.error(f"Error creating tool execution: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating tool execution: {str(e)}"
        )

@router.post("/execution/{execution_id}/execute", response_model=ToolExecutionResult)
async def execute_tool_by_id(
    execution_id: str,
    user = Depends(validate_token),
    db: Session = Depends(get_db)
):
    """
    Execute a tool by execution ID
    
    Args:
        execution_id: Tool execution ID
        user: Authenticated user
        db: Database session
        
    Returns:
        ToolExecutionResult containing execution results
    """
    try:
        tool_execution_service = ToolExecutionService(db)
        
        # Get tool execution with reconstructed hop_state
        execution_data = await tool_execution_service.get_tool_execution_with_assets(
            execution_id, user.user_id
        )
        
        if not execution_data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Tool execution not found"
            )
        
        tool_execution = execution_data["tool_execution"]
        hop_state = execution_data["hop_state"]
        tool_step = execution_data["tool_step"]
        
        # Update status to running
        await tool_execution_service.update_tool_execution_status(
            execution_id, user.user_id, ToolExecutionStatus.RUNNING
        )
        
        # Execute the tool step
        result = await execute_tool_step(tool_step, hop_state, user.user_id, db)
        
        # Update status to completed with results
        await tool_execution_service.update_tool_execution_status(
            execution_id, user.user_id, ToolExecutionStatus.COMPLETED, 
            execution_result=result
        )
        
        return result
        
    except ToolExecutionError as e:
        # Update status to failed
        await tool_execution_service.update_tool_execution_status(
            execution_id, user.user_id, ToolExecutionStatus.FAILED, 
            error_message=str(e)
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Error executing tool {execution_id}: {str(e)}", exc_info=True)
        # Update status to failed
        await tool_execution_service.update_tool_execution_status(
            execution_id, user.user_id, ToolExecutionStatus.FAILED, 
            error_message=str(e)
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error executing tool: {str(e)}"
        )

@router.get("/execution/{execution_id}", response_model=ToolExecutionStatusResponse)
async def get_tool_execution(
    execution_id: str,
    user = Depends(validate_token),
    db: Session = Depends(get_db)
):
    """
    Get tool execution status and results
    
    Args:
        execution_id: Tool execution ID
        user: Authenticated user
        db: Database session
        
    Returns:
        ToolExecutionStatusResponse with execution details
    """
    try:
        tool_execution_service = ToolExecutionService(db)
        
        tool_execution = await tool_execution_service.get_tool_execution(
            execution_id, user.user_id
        )
        
        if not tool_execution:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Tool execution not found"
            )
        
        return ToolExecutionStatusResponse(
            id=tool_execution.id,
            tool_id=tool_execution.tool_id,
            step_id=tool_execution.step_id,
            status=tool_execution.status,
            error_message=tool_execution.error_message,
            execution_result=tool_execution.execution_result,
            created_at=tool_execution.created_at,
            started_at=tool_execution.started_at,
            completed_at=tool_execution.completed_at
        )
        
    except Exception as e:
        logger.error(f"Error getting tool execution {execution_id}: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error getting tool execution: {str(e)}"
        )

# Keep the legacy endpoint for backward compatibility
@router.post("/execute/{tool_id}")
async def execute_tool(
    tool_id: str,
    step: ToolStep,
    hop_state: Dict[str, Asset],
    user = Depends(validate_token),
    db: Session = Depends(get_db)
):
    """
    Execute a tool step and return the results (legacy endpoint)
    
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
        result = await execute_tool_step(step, hop_state, user_id=user.user_id, db=db)
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
