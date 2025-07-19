from typing import List, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import and_, desc
from datetime import datetime
from uuid import uuid4

from models import ToolStep as ToolStepModel, ToolExecutionStatus
from schemas.workflow import ToolStep
from services.asset_service import AssetService


class ToolStepService:
    def __init__(self, db: Session):
        self.db = db
        self.asset_service = AssetService(db)

    def _model_to_schema(self, tool_step_model: ToolStepModel) -> ToolStep:
        """Convert database model to ToolStep schema"""
        return ToolStep(
            id=tool_step_model.id,
            tool_id=tool_step_model.tool_id,
            name=tool_step_model.name or tool_step_model.description or f"Step {tool_step_model.sequence_order}",
            description=tool_step_model.description or "",
            sequence_order=tool_step_model.sequence_order,
            resource_configs=tool_step_model.resource_configs or {},
            parameter_mapping=tool_step_model.parameter_mapping or {},
            result_mapping=tool_step_model.result_mapping or {},
            status=ToolExecutionStatus(tool_step_model.status.value),
            error_message=tool_step_model.error_message,
            validation_errors=tool_step_model.validation_errors or [],
            created_at=tool_step_model.created_at,
            updated_at=tool_step_model.updated_at
        )

    async def create_tool_step(
        self,
        hop_id: str,
        user_id: int,
        tool_id: str,
        description: str,
        resource_configs: Optional[Dict[str, Any]] = None,
        parameter_mapping: Optional[Dict[str, Any]] = None,
        result_mapping: Optional[Dict[str, Any]] = None,
        validation_errors: Optional[List[str]] = None
    ) -> ToolStep:
        """Create a new tool step with automatic sequence ordering"""
        
        # Get the next sequence order for this hop
        latest_tool_step = self.db.query(ToolStepModel).filter(
            ToolStepModel.hop_id == hop_id
        ).order_by(desc(ToolStepModel.sequence_order)).first()
        
        next_sequence = (latest_tool_step.sequence_order + 1) if latest_tool_step else 1
        
        tool_step_model = ToolStepModel(
            id=str(uuid4()),
            hop_id=hop_id,
            user_id=user_id,
            tool_id=tool_id,
            description=description,
            sequence_order=next_sequence,
            resource_configs=resource_configs or {},
            parameter_mapping=parameter_mapping or {},
            result_mapping=result_mapping or {},
            status=ToolExecutionStatus.PROPOSED,
            validation_errors=validation_errors
        )
        
        self.db.add(tool_step_model)
        self.db.commit()
        self.db.refresh(tool_step_model)
        
        return self._model_to_schema(tool_step_model)

    async def get_tool_step(self, tool_step_id: str, user_id: int) -> ToolStep:
        """Get a tool step by ID"""
        tool_step_model = self.db.query(ToolStepModel).filter(
            and_(ToolStepModel.id == tool_step_id, ToolStepModel.user_id == user_id)
        ).first()
        
        if not tool_step_model:
            raise ValueError(f"Tool step {tool_step_id} not found for user {user_id}")
        
        return self._model_to_schema(tool_step_model)

    async def get_tool_steps_by_hop(self, hop_id: str, user_id: int) -> List[ToolStep]:
        """Get all tool steps for a hop, ordered by sequence"""
        tool_step_models = self.db.query(ToolStepModel).filter(
            and_(ToolStepModel.hop_id == hop_id, ToolStepModel.user_id == user_id)
        ).order_by(ToolStepModel.sequence_order).all()
        
        return [self._model_to_schema(tool_step_model) for tool_step_model in tool_step_models]

    async def update_tool_step(
        self,
        tool_step_id: str,
        user_id: int,
        updates: Dict[str, Any]
    ) -> Optional[ToolStep]:
        """Update a tool step"""
        tool_step_model = self.db.query(ToolStepModel).filter(
            and_(ToolStepModel.id == tool_step_id, ToolStepModel.user_id == user_id)
        ).first()
        
        if not tool_step_model:
            return None
        
        # Handle status updates
        if 'status' in updates:
            if isinstance(updates['status'], str):
                updates['status'] = ToolExecutionStatus(updates['status'])
        
        # Update fields
        for key, value in updates.items():
            if hasattr(tool_step_model, key):
                setattr(tool_step_model, key, value)
        
        tool_step_model.updated_at = datetime.utcnow()
        
        self.db.commit()
        self.db.refresh(tool_step_model)
        
        return self._model_to_schema(tool_step_model)

    async def update_tool_step_status(
        self,
        tool_step_id: str,
        user_id: int,
        status: ToolExecutionStatus,
        error_message: Optional[str] = None,
        execution_result: Optional[Dict[str, Any]] = None
    ) -> Optional[ToolStep]:
        """Update tool step status with optional error message and execution result"""
        updates = {
            'status': ToolExecutionStatus(status.value),
            'updated_at': datetime.utcnow()
        }
        
        if error_message:
            updates['error_message'] = error_message
        elif status == ToolExecutionStatus.COMPLETED:
            # Clear error message on successful completion
            updates['error_message'] = None
        
        if execution_result:
            updates['execution_result'] = execution_result
        
        # Update timing fields
        if status == ToolExecutionStatus.EXECUTING:
            updates['started_at'] = datetime.utcnow()
        elif status == ToolExecutionStatus.COMPLETED:
            updates['completed_at'] = datetime.utcnow()
        
        return await self.update_tool_step(tool_step_id, user_id, updates)

    async def delete_tool_step(self, tool_step_id: str, user_id: int) -> bool:
        """Delete a tool step"""
        tool_step_model = self.db.query(ToolStepModel).filter(
            and_(ToolStepModel.id == tool_step_id, ToolStepModel.user_id == user_id)
        ).first()
        
        if not tool_step_model:
            return False
        
        self.db.delete(tool_step_model)
        self.db.commit()
        
        return True

    async def get_next_pending_tool_step(self, hop_id: str, user_id: int) -> Optional[ToolStep]:
        """Get the next pending tool step for a hop"""
        tool_step_model = self.db.query(ToolStepModel).filter(
            and_(
                ToolStepModel.hop_id == hop_id,
                ToolStepModel.user_id == user_id,
                ToolStepModel.status == ToolExecutionStatus.PROPOSED
            )
        ).order_by(ToolStepModel.sequence_order).first()
        
        if not tool_step_model:
            return None
        
        return self._model_to_schema(tool_step_model)

    async def get_failed_tool_steps(self, hop_id: str, user_id: int) -> List[ToolStep]:
        """Get all failed tool steps for a hop"""
        tool_step_models = self.db.query(ToolStepModel).filter(
            and_(
                ToolStepModel.hop_id == hop_id,
                ToolStepModel.user_id == user_id,
                ToolStepModel.status == ToolExecutionStatus.FAILED
            )
        ).order_by(ToolStepModel.sequence_order).all()
        
        return [self._model_to_schema(tool_step_model) for tool_step_model in tool_step_models]

    async def reorder_tool_steps(
        self,
        hop_id: str,
        user_id: int,
        tool_step_id_order: List[str]
    ) -> List[ToolStep]:
        """Reorder tool steps by updating their sequence_order"""
        updated_tool_steps = []
        
        for i, tool_step_id in enumerate(tool_step_id_order):
            tool_step_model = self.db.query(ToolStepModel).filter(
                and_(
                    ToolStepModel.id == tool_step_id,
                    ToolStepModel.hop_id == hop_id,
                    ToolStepModel.user_id == user_id
                )
            ).first()
            
            if tool_step_model:
                tool_step_model.sequence_order = i + 1
                tool_step_model.updated_at = datetime.utcnow()
                updated_tool_steps.append(self._model_to_schema(tool_step_model))
        
        self.db.commit()
        
        return updated_tool_steps

    async def execute_tool_step(
        self,
        tool_step_id: str,
        user_id: int,
        asset_context: Dict[str, Any]
    ) -> Optional[ToolStep]:
        """Execute a tool step with direct asset ID resolution"""
        tool_step_model = self.db.query(ToolStepModel).filter(
            and_(ToolStepModel.id == tool_step_id, ToolStepModel.user_id == user_id)
        ).first()
        
        if not tool_step_model:
            return None
        
        # Update status to running
        await self.update_tool_step_status(
            tool_step_id, 
            user_id, 
            ToolExecutionStatus.EXECUTING
        )
        
        try:
            # Import here to avoid circular imports
            from tools.tool_execution import execute_tool_step
            
            # Convert to schema for execution
            tool_step_schema = self._model_to_schema(tool_step_model)
            
            # Execute the tool step
            result = await execute_tool_step(
                tool_step_schema, 
                asset_context, 
                user_id=user_id, 
                db=self.db
            )
            
            # Update status to completed with result
            return await self.update_tool_step_status(
                tool_step_id,
                user_id,
                ToolExecutionStatus.COMPLETED,
                execution_result=result
            )
            
        except Exception as e:
            # Update status to failed with error
            return await self.update_tool_step_status(
                tool_step_id,
                user_id,
                ToolExecutionStatus.FAILED,
                error_message=str(e)
            ) 