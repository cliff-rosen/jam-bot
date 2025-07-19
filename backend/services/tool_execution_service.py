from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError
from uuid import uuid4

from models import ToolStep as ToolStepModel, ToolExecution as ToolExecutionModel, ToolExecutionStatus
from schemas.workflow import ToolStep
from schemas.asset import Asset
from schemas.tool_handler_schema import ToolExecutionInput, ToolExecutionResult
from services.asset_service import AssetService
from services.mission_service import MissionService
from services.state_transition_service import StateTransitionService, TransactionType
from tools.tool_registry import get_tool_definition
from tools.tool_stubbing import ToolStubbing
from schemas.schema_utils import create_typed_response
import json

class ToolExecutionService:
    def __init__(self, db: Session):
        self.db = db
        self.asset_service = AssetService(db)
        self.mission_service = MissionService(db)
        self.state_transition_service = StateTransitionService(db)

    async def execute_tool_step(
        self,
        tool_step_id: str,
        user_id: int,
        asset_context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Complete tool step execution with state transition integration.
        
        This method:
        1. Creates execution record
        2. Executes the tool
        3. Delegates state management to StateTransitionService
        4. Returns comprehensive results
        
        Args:
            tool_step_id: Tool step ID to execute
            user_id: User ID
            asset_context: Asset context for parameter resolution
            
        Returns:
            Comprehensive execution results including state transitions
        """
        try:
            # Get tool step
            tool_step = self.db.query(ToolStepModel).filter(
                ToolStepModel.id == tool_step_id,
                ToolStepModel.user_id == user_id
            ).first()
            
            if not tool_step:
                raise Exception(f"Tool step {tool_step_id} not found")
            
            # Mark tool step as executing
            tool_step.status = ToolExecutionStatus.EXECUTING
            tool_step.started_at = datetime.utcnow()
            tool_step.updated_at = datetime.utcnow()
            self.db.commit()
            
            # Create execution record
            execution = await self.create_execution(
                tool_id=tool_step.tool_id,
                user_id=user_id,
                name=tool_step.name,
                description=tool_step.description,
                tool_step_id=tool_step_id,
                hop_id=tool_step.hop_id,
                input_parameters=self._resolve_parameters(tool_step, asset_context or {}),
                execution_config=tool_step.resource_configs
            )
            
            # Execute the tool
            tool_result = await self._execute_tool_with_context(execution, asset_context or {})
            
            # Use StateTransitionService to handle all state updates
            transition_result = await self.state_transition_service.updateState(
                TransactionType.COMPLETE_TOOL_STEP,
                {
                    'tool_step_id': tool_step_id,
                    'user_id': user_id,
                    'execution_result': tool_result,
                    'tool_execution_id': execution.id
                }
            )
            
            # Return comprehensive result
            return {
                "success": transition_result.success,
                "tool_execution_id": execution.id,
                "tool_step_id": tool_step_id,
                "tool_result": tool_result,
                "state_transition": transition_result.to_dict(),
                "assets_created": transition_result.metadata.get('assets_created', []),
                "hop_completed": transition_result.metadata.get('hop_completed', False),
                "mission_completed": transition_result.metadata.get('mission_completed', False),
                "hop_id": tool_step.hop_id,
                "mission_id": transition_result.metadata.get('mission_id')
            }
            
        except Exception as e:
            # Mark tool step as failed
            if 'tool_step' in locals():
                tool_step.status = ToolExecutionStatus.FAILED
                tool_step.error_message = str(e)
                tool_step.completed_at = datetime.utcnow()
                tool_step.updated_at = datetime.utcnow()
                self.db.commit()
            
            raise Exception(f"Tool step execution failed: {str(e)}")

    def _resolve_parameters(self, tool_step: ToolStepModel, asset_context: Dict[str, Any]) -> Dict[str, Any]:
        """Resolve tool parameters from step configuration and asset context."""
        parameters = {}
        
        for param_name, mapping in (tool_step.parameter_mapping or {}).items():
            if mapping.get('type') == 'literal':
                parameters[param_name] = mapping.get('value')
            elif mapping.get('type') == 'asset_field':
                asset_id = mapping.get('state_asset')
                asset_data = asset_context.get(asset_id)
                
                if asset_data:
                    # Extract value from asset
                    if isinstance(asset_data, dict) and 'value' in asset_data:
                        parameters[param_name] = asset_data['value']
                    elif hasattr(asset_data, 'value'):
                        parameters[param_name] = asset_data.value
                    else:
                        parameters[param_name] = asset_data
                        
        return parameters

    async def _execute_tool_with_context(
        self, 
        execution: ToolExecutionModel, 
        asset_context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Execute the actual tool and return results."""
        try:
            # Get tool definition
            tool_def = get_tool_definition(execution.tool_id)
            if not tool_def:
                raise Exception(f"Tool {execution.tool_id} not found in registry")
            
            # Prepare execution input
            execution_input = ToolExecutionInput(
                tool_id=execution.tool_id,
                user_id=execution.user_id,
                mission_id=execution.mission_id,
                params=execution.input_parameters or {},
                metadata={
                    "execution_id": execution.id,
                    "hop_id": execution.hop_id,
                    "tool_step_id": execution.tool_step_id
                }
            )
            
            # Execute tool
            if ToolStubbing.should_stub_tool(tool_def):
                print(f"Stubbing tool {execution.tool_id}")
                result = await ToolStubbing.get_stub_response(tool_def, execution_input)
            else:
                print(f"Executing tool {execution.tool_id}")
                result = await tool_def.execution_handler.handler(execution_input)
            
            # Process results
            if isinstance(result, ToolExecutionResult):
                execution_response = {
                    "success": result.success,
                    "outputs": result.outputs,
                    "errors": result.errors or [],
                    "metadata": result.metadata or {}
                }
            elif isinstance(result, dict):
                execution_response = result
            else:
                execution_response = {"success": True, "outputs": result, "errors": [], "metadata": {}}
            
            # Update execution record
            execution.status = ToolExecutionStatus.COMPLETED
            execution.completed_at = datetime.utcnow()
            execution.updated_at = datetime.utcnow()
            execution.output_results = execution_response
            self.db.commit()
            
            return execution_response
            
        except Exception as e:
            # Update execution record with error
            execution.status = ToolExecutionStatus.FAILED
            execution.completed_at = datetime.utcnow()
            execution.updated_at = datetime.utcnow()
            execution.error_message = str(e)
            execution.error_details = {"error": str(e), "type": type(e).__name__}
            self.db.commit()
            
            raise Exception(f"Tool execution failed: {str(e)}")

    async def create_execution(
        self,
        tool_id: str,
        user_id: int,
        name: str,
        description: Optional[str] = None,
        tool_step_id: Optional[str] = None,
        hop_id: Optional[str] = None,
        mission_id: Optional[str] = None,
        input_parameters: Optional[Dict[str, Any]] = None,
        input_assets: Optional[Dict[str, str]] = None,
        execution_config: Optional[Dict[str, Any]] = None
    ) -> ToolExecutionModel:
        """
        Create a new tool execution record.
        
        Args:
            tool_id: Tool identifier
            user_id: User ID
            name: Execution name
            description: Optional description
            tool_step_id: Optional tool step reference
            hop_id: Optional hop context
            mission_id: Optional mission context
            input_parameters: Tool input parameters
            input_assets: Asset references for input
            execution_config: Tool-specific configuration
            
        Returns:
            Created ToolExecutionModel
        """
        try:
            execution = ToolExecutionModel(
                id=str(uuid4()),
                tool_id=tool_id,
                user_id=user_id,
                name=name,
                description=description,
                tool_step_id=tool_step_id,
                hop_id=hop_id,
                mission_id=mission_id,
                input_parameters=input_parameters or {},
                input_assets=input_assets or {},
                execution_config=execution_config or {},
                status=ToolExecutionStatus.PROPOSED
            )
            
            self.db.add(execution)
            self.db.commit()
            self.db.refresh(execution)
            
            return execution
            
        except SQLAlchemyError as e:
            self.db.rollback()
            raise Exception(f"Failed to create tool execution: {str(e)}")

    async def execute(
        self,
        execution_id: str,
        user_id: int,
        asset_context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Execute a tool execution record.
        
        Args:
            execution_id: Tool execution ID
            user_id: User ID
            asset_context: Asset context for parameter resolution
            
        Returns:
            Tool execution results
        """
        # Get execution record
        execution = self.db.query(ToolExecutionModel).filter(
            ToolExecutionModel.id == execution_id,
            ToolExecutionModel.user_id == user_id
        ).first()
        
        if not execution:
            raise Exception(f"Tool execution {execution_id} not found")
        
        # Update status to executing
        execution.status = ToolExecutionStatus.EXECUTING
        execution.started_at = datetime.utcnow()
        execution.updated_at = datetime.utcnow()
        self.db.commit()
        
        try:
            # Get tool definition
            tool_def = get_tool_definition(execution.tool_id)
            if not tool_def:
                raise Exception(f"Tool {execution.tool_id} not found in registry")
            
            # Prepare execution input
            execution_input = ToolExecutionInput(
                tool_id=execution.tool_id,
                user_id=user_id,
                mission_id=execution.mission_id,
                params=execution.input_parameters or {},
                metadata={
                    "execution_id": execution_id,
                    "hop_id": execution.hop_id,
                    "tool_step_id": execution.tool_step_id
                }
            )
            
            # Execute tool
            if ToolStubbing.should_stub_tool(tool_def):
                print(f"Stubbing tool {execution.tool_id}")
                result = await ToolStubbing.get_stub_response(tool_def, execution_input)
            else:
                print(f"Executing tool {execution.tool_id}")
                result = await tool_def.execution_handler.handler(execution_input)
            
            # Process results
            if isinstance(result, ToolExecutionResult):
                execution_response = {
                    "success": result.success,
                    "outputs": result.outputs,
                    "errors": result.errors or [],
                    "metadata": result.metadata or {}
                }
            elif isinstance(result, dict):
                execution_response = result
            else:
                execution_response = {"success": True, "outputs": result, "errors": [], "metadata": {}}
            
            # Update execution record with results
            execution.status = ToolExecutionStatus.COMPLETED
            execution.completed_at = datetime.utcnow()
            execution.updated_at = datetime.utcnow()
            execution.output_results = execution_response
            
            # If asset context provided, handle asset updates
            if asset_context and execution.tool_step_id:
                await self._handle_asset_updates(execution, asset_context, execution_response)
            
            self.db.commit()
            self.db.refresh(execution)
            
            return execution_response
            
        except Exception as e:
            # Update execution record with error
            execution.status = ToolExecutionStatus.FAILED
            execution.completed_at = datetime.utcnow()
            execution.updated_at = datetime.utcnow()
            execution.error_message = str(e)
            execution.error_details = {"error": str(e), "type": type(e).__name__}
            
            self.db.commit()
            
            raise Exception(f"Tool execution failed: {str(e)}")

    async def _handle_asset_updates(
        self,
        execution: ToolExecutionModel,
        asset_context: Dict[str, Any],
        execution_response: Dict[str, Any]
    ) -> None:
        """Handle asset updates after successful tool execution."""
        try:
            # Get the tool step to understand result mappings
            if not execution.tool_step_id:
                return
                
            tool_step = self.db.query(ToolStepModel).filter(
                ToolStepModel.id == execution.tool_step_id
            ).first()
            
            if not tool_step or not tool_step.result_mapping:
                return
            
            # Process result mappings to update assets
            tool_outputs = execution_response.get("outputs", {})
            
            for result_name, mapping in tool_step.result_mapping.items():
                if mapping.get("type") == "asset_field":
                    asset_id = mapping.get("state_asset")
                    asset_data = asset_context.get(asset_id)
                    output_value = tool_outputs.get(result_name)
                    
                    if asset_data and output_value is not None:
                        await self._update_asset_with_output(
                            asset_id, asset_data, output_value, execution.user_id, execution.hop_id or "unknown"
                        )
                        
        except Exception as e:
            print(f"Error handling asset updates: {e}")
            # Don't fail the execution if asset updates fail

    async def _update_asset_with_output(
        self,
        asset_id: str,
        asset_data: Any,
        output_value: Any,
        user_id: int,
        scope_id: str
    ) -> None:
        """Update or create asset with tool output."""
        try:
            if isinstance(asset_data, Asset):
                asset = asset_data
                
                if asset.status == "PROPOSED":
                    # Create new asset
                    self.asset_service.create_asset(
                        user_id=user_id,
                        name=asset.name,
                        schema_definition=asset.schema_definition.model_dump() if hasattr(asset.schema_definition, 'model_dump') else asset.schema_definition,
                        subtype=asset.subtype,
                        description=asset.description,
                        content=output_value,
                        asset_metadata=asset.asset_metadata.model_dump() if asset.asset_metadata else None,
                        scope_type="hop",
                        scope_id=scope_id
                    )
                else:
                    # Update existing asset
                    self.asset_service.update_asset(
                        asset_id=asset.id,
                        user_id=user_id,
                        updates={
                            'content': output_value,
                            'asset_metadata': asset.asset_metadata.model_dump() if asset.asset_metadata else None,
                            'updated_at': datetime.utcnow()
                        }
                    )
        except Exception as e:
            print(f"Error updating asset {asset_id}: {e}")

    
    async def get_execution(self, execution_id: str, user_id: int) -> Optional[ToolExecutionModel]:
        """Get a tool execution by ID (new execution model)"""
        return self.db.query(ToolExecutionModel).filter(
            ToolExecutionModel.id == execution_id,
            ToolExecutionModel.user_id == user_id
        ).first()

    async def get_tool_execution(self, execution_id: str, user_id: int) -> Optional[ToolStepModel]:
        """Get a tool execution by ID (legacy - tool step model)"""
        return self.db.query(ToolStepModel).filter(
            ToolStepModel.id == execution_id,
            ToolStepModel.user_id == user_id
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
                asset = self.asset_service.get_asset(asset_id, user_id)
                if asset:
                    hop_state[asset_name] = asset
                    
        return {
            "tool_execution": tool_execution,
            "hop_state": hop_state,
            "tool_step": ToolStep.model_validate(tool_execution.__dict__)
        }

    async def update_tool_execution_status(
        self,
        execution_id: str,
        user_id: int,
        status: ToolExecutionStatus,
        error_message: Optional[str] = None,
        execution_result: Optional[Dict[str, Any]] = None
    ) -> Optional[ToolStepModel]:
        """
        Update tool execution status and results
        
        Args:
            execution_id: Tool execution ID
            user_id: User ID
            status: New status
            error_message: Error message if failed
            execution_result: Execution results if completed
            
        Returns:
            Updated ToolStepModel object or None if not found
        """
        try:
            tool_execution = await self.get_tool_execution(execution_id, user_id)
            if not tool_execution:
                return None
                
            tool_execution.status = status
            tool_execution.updated_at = datetime.utcnow()
            
            if status == ToolExecutionStatus.EXECUTING and not tool_execution.started_at:
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
    ) -> List[ToolStepModel]:
        """
        Get user's tool executions with optional filtering
        
        Args:
            user_id: User ID
            mission_id: Optional mission filter
            status: Optional status filter
            limit: Maximum number of results
            
        Returns:
            List of ToolStepModel objects
        """
        query = self.db.query(ToolStepModel).filter(ToolStepModel.user_id == user_id)
        
        if mission_id:
            query = query.filter(ToolStepModel.hop_id == mission_id)
            
        if status:
            query = query.filter(ToolStepModel.status == status)
            
        return query.order_by(ToolStepModel.created_at.desc()).limit(limit).all()

    async def cleanup_old_executions(self, user_id: int, days_old: int = 30):
        """
        Clean up old tool executions
        
        Args:
            user_id: User ID
            days_old: Delete executions older than this many days
        """
        try:
            cutoff_date = datetime.utcnow() - timedelta(days=days_old)
            
            deleted_count = self.db.query(ToolStepModel).filter(
                ToolStepModel.user_id == user_id,
                ToolStepModel.created_at < cutoff_date,
                ToolStepModel.status.in_([
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