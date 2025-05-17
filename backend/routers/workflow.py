from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from services.workflow_service import WorkflowService
from services.auth_service import validate_token
from schemas import (
    WorkflowCreate,
    WorkflowUpdate,
    WorkflowStepCreate,
    WorkflowExecuteRequest,
    WorkflowResponse,
    WorkflowStepResponse,
    WorkflowVariableResponse,
    WorkflowSimpleResponse
)
from models import User, WorkflowVariable

router = APIRouter()


##### Workflows  #####

@router.get("/", response_model=List[WorkflowResponse])
async def get_workflows(
    current_user: User = Depends(validate_token),
    db: Session = Depends(get_db)
):
    """Get all workflows for the current user"""
    workflow_service = WorkflowService(db)
    return workflow_service.get_workflows(current_user.user_id)

@router.post("/", response_model=WorkflowResponse)
async def create_workflow(
    workflow_data: WorkflowCreate,
    current_user: User = Depends(validate_token),
    db: Session = Depends(get_db)
):
    """Create a new workflow."""
    workflow_service = WorkflowService(db)
    return workflow_service.create_workflow(workflow_data, current_user.user_id)


##### Workflow (individual) #####

@router.get("/{workflow_id}", response_model=WorkflowResponse)
async def get_workflow(
    workflow_id: str,
    current_user: User = Depends(validate_token),
    db: Session = Depends(get_db)
):
    """Get a specific workflow by ID."""
    workflow_service = WorkflowService(db)
    try:
        workflow = workflow_service.get_workflow(workflow_id, current_user.user_id)
        if not workflow:
            raise HTTPException(status_code=404, detail=f"Workflow {workflow_id} not found")
        return workflow
    except Exception as e:
        # Log the actual error for debugging
        print(f"Error getting workflow: {str(e)}")
        # Convert WorkflowNotFoundError to HTTPException
        raise HTTPException(status_code=404, detail=str(e))

@router.get("/{workflow_id}/simple", response_model=WorkflowSimpleResponse)
async def get_workflow_simple(
    workflow_id: str,
    current_user: User = Depends(validate_token),
    db: Session = Depends(get_db)
):
    """Get basic workflow information by ID without related data."""
    workflow_service = WorkflowService(db)
    try:
        workflow = workflow_service.get_workflow_simple(workflow_id, current_user.user_id)
        if not workflow:
            raise HTTPException(status_code=404, detail=f"Workflow {workflow_id} not found")
        return workflow
    except Exception as e:
        # Log the actual error for debugging
        print(f"Error getting workflow: {str(e)}")
        # Convert error to HTTPException
        raise HTTPException(status_code=404, detail=str(e))

@router.put("/{workflow_id}", response_model=WorkflowResponse)
async def update_workflow(
    workflow_id: str,
    workflow_data: WorkflowUpdate,
    current_user: User = Depends(validate_token),
    db: Session = Depends(get_db)
):
    """Update an existing workflow."""
    workflow_service = WorkflowService(db)
    try:
        #print('workflow_data', workflow_data)
        return workflow_service.update_workflow(workflow_id, workflow_data, current_user.user_id)
    except Exception as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.delete("/{workflow_id}")
async def delete_workflow(
    workflow_id: str,
    current_user: User = Depends(validate_token),
    db: Session = Depends(get_db)
):
    """Delete a workflow."""
    workflow_service = WorkflowService(db)
    try:
        workflow_service.delete_workflow(workflow_id, current_user.user_id)
        return {"message": "Workflow deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=404, detail=str(e))
