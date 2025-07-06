from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError
from uuid import uuid4

from models import ToolExecution, ToolExecutionStatus
from schemas.workflow import ToolStep
from schemas.asset import Asset
from services.asset_service import AssetService
from services.mission_service import MissionService
import json

class ToolExecutionService:
    def __init__(self, db: Session):
        self.db = db
        self.asset_service = AssetService(db)
        self.mission_service = MissionService(db)

    async def create_tool_execution(
        self,
        user_id: int,
        mission_id: Optional[str],
        tool_step: ToolStep,
        hop_state: Dict[str, Asset]
    ) -> ToolExecution:
        """
        Create a new tool execution record
        
        Args:
            user_id: User ID
            mission_id: Mission ID (optional)
            tool_step: Tool step configuration
            hop_state: Current hop state with assets
            
        Returns:
            Created ToolExecution object
        """
        try:
            # Extract asset IDs from hop_state
            hop_state_asset_ids = {
                asset_name: asset.id for asset_name, asset in hop_state.items()
            }
            
            tool_execution = ToolExecution(
                id=str(uuid4()),
                user_id=user_id,
                mission_id=mission_id,
                tool_id=tool_step.tool_id,
                step_id=tool_step.id,
                status=ToolExecutionStatus.PENDING,
                tool_step=tool_step.model_dump(),
                hop_state_asset_ids=hop_state_asset_ids,
                parameter_mapping=tool_step.parameter_mapping,
                result_mapping=tool_step.result_mapping,
                created_at=datetime.utcnow()
            )
            
            self.db.add(tool_execution)
            self.db.commit()
            self.db.refresh(tool_execution)
            
            return tool_execution
            
        except SQLAlchemyError as e:
            self.db.rollback()
            raise Exception(f"Failed to create tool execution: {str(e)}")

    async def get_tool_execution(self, execution_id: str, user_id: int) -> Optional[ToolExecution]:
        """Get a tool execution by ID"""
        return self.db.query(ToolExecution).filter(
            ToolExecution.id == execution_id,
            ToolExecution.user_id == user_id
        ).first()

    async def get_tool_execution_with_assets(
        self, 
        execution_id: str, 
        user_id: int
    ) -> Optional[Dict[str, Any]]:
        """
        Get tool execution with reconstructed hop_state
        
        Args:
            execution_id: Tool execution ID
            user_id: User ID
            
        Returns:
            Dictionary with tool_execution and hop_state, or None if not found
        """
        tool_execution = await self.get_tool_execution(execution_id, user_id)
        if not tool_execution:
            return None
            
        # Reconstruct hop_state from asset IDs
        hop_state = {}
        if tool_execution.hop_state_asset_ids:
            for asset_name, asset_id in tool_execution.hop_state_asset_ids.items():
                asset = await self.asset_service.get_asset(asset_id, user_id)
                if asset:
                    hop_state[asset_name] = asset
                    
        return {
            "tool_execution": tool_execution,
            "hop_state": hop_state,
            "tool_step": ToolStep.model_validate(tool_execution.tool_step)
        }

    async def update_tool_execution_status(
        self,
        execution_id: str,
        user_id: int,
        status: ToolExecutionStatus,
        error_message: Optional[str] = None,
        execution_result: Optional[Dict[str, Any]] = None
    ) -> Optional[ToolExecution]:
        """
        Update tool execution status and results
        
        Args:
            execution_id: Tool execution ID
            user_id: User ID
            status: New status
            error_message: Error message if failed
            execution_result: Execution results if completed
            
        Returns:
            Updated ToolExecution object or None if not found
        """
        try:
            tool_execution = await self.get_tool_execution(execution_id, user_id)
            if not tool_execution:
                return None
                
            tool_execution.status = status
            tool_execution.updated_at = datetime.utcnow()
            
            if status == ToolExecutionStatus.RUNNING and not tool_execution.started_at:
                tool_execution.started_at = datetime.utcnow()
                
            if status in [ToolExecutionStatus.COMPLETED, ToolExecutionStatus.FAILED]:
                tool_execution.completed_at = datetime.utcnow()
                
            if error_message:
                tool_execution.error_message = error_message
                
            if execution_result:
                tool_execution.execution_result = execution_result
                
            self.db.commit()
            self.db.refresh(tool_execution)
            
            return tool_execution
            
        except SQLAlchemyError as e:
            self.db.rollback()
            raise Exception(f"Failed to update tool execution: {str(e)}")

    async def get_user_tool_executions(
        self,
        user_id: int,
        mission_id: Optional[str] = None,
        status: Optional[ToolExecutionStatus] = None,
        limit: int = 100
    ) -> List[ToolExecution]:
        """
        Get user's tool executions with optional filtering
        
        Args:
            user_id: User ID
            mission_id: Optional mission filter
            status: Optional status filter
            limit: Maximum number of results
            
        Returns:
            List of ToolExecution objects
        """
        query = self.db.query(ToolExecution).filter(ToolExecution.user_id == user_id)
        
        if mission_id:
            query = query.filter(ToolExecution.mission_id == mission_id)
            
        if status:
            query = query.filter(ToolExecution.status == status)
            
        return query.order_by(ToolExecution.created_at.desc()).limit(limit).all()

    async def cleanup_old_executions(self, user_id: int, days_old: int = 30):
        """
        Clean up old tool executions
        
        Args:
            user_id: User ID
            days_old: Delete executions older than this many days
        """
        try:
            cutoff_date = datetime.utcnow() - timedelta(days=days_old)
            
            deleted_count = self.db.query(ToolExecution).filter(
                ToolExecution.user_id == user_id,
                ToolExecution.created_at < cutoff_date,
                ToolExecution.status.in_([
                    ToolExecutionStatus.COMPLETED,
                    ToolExecutionStatus.FAILED,
                    ToolExecutionStatus.CANCELLED
                ])
            ).delete()
            
            self.db.commit()
            return deleted_count
            
        except SQLAlchemyError as e:
            self.db.rollback()
            raise Exception(f"Failed to cleanup old executions: {str(e)}") 