from typing import Dict, Optional, Any
from datetime import datetime
from sqlalchemy.orm import Session

from models import ToolStep as ToolStepModel, ToolExecutionStatus
from services.asset_service import AssetService
from services.tool_step_service import ToolStepService
from services.state_transition_service import StateTransitionService, TransactionType
from tools.tool_execution import execute_tool_step as execute_tool_step_core
from schemas.workflow import ToolStep as ToolStepSchema

class ToolExecutionService:
    def __init__(self, db: Session):
        self.db = db
        self.asset_service = AssetService(db)
        self.tool_step_service = ToolStepService(db)
        self.state_transition_service = StateTransitionService(db)

    async def execute_tool_step(
        self,
        tool_step_id: str,
        user_id: int
    ) -> Dict[str, Any]:
        """
        Execute a tool step.
        
        1. Get tool step from database
        2. Resolve asset context from hop/mission scope  
        3. Execute the tool using existing tool_execution logic
        4. Delegate state management to StateTransitionService
        5. Return comprehensive results
        """
        try:
            # 1. Get tool step from database
            tool_step_schema = await self.tool_step_service.get_tool_step(tool_step_id, user_id)
            
            if not tool_step_schema:
                raise Exception(f"Tool step {tool_step_id} not found")
            
            # 2. Mark tool step as executing
            await self.tool_step_service.update_tool_step_status(
                tool_step_id, 
                user_id, 
                ToolExecutionStatus.EXECUTING
            )
            
            # 3. Resolve asset context from hop scope
            asset_context = await self._resolve_asset_context(tool_step_schema.hop_id, user_id)
            
            # 4. Execute the tool using existing core logic
            tool_result = await execute_tool_step_core(
                step=tool_step_schema,
                asset_context=asset_context,
                user_id=user_id,
                db=self.db
            )
            
            # 5. Use StateTransitionService to handle all state updates
            transition_result = await self.state_transition_service.updateState(
                TransactionType.COMPLETE_TOOL_STEP,
                {
                    'tool_step_id': tool_step_id,
                    'user_id': user_id,
                    'execution_result': tool_result
                }
            )
            
            # 6. Return comprehensive result
            return {
                "success": transition_result.success,
                "tool_step_id": tool_step_id,
                "tool_result": tool_result,
                "state_transition": transition_result.to_dict(),
                "assets_created": transition_result.metadata.get('assets_created', []),
                "hop_completed": transition_result.metadata.get('hop_completed', False),
                "mission_completed": transition_result.metadata.get('mission_completed', False),
                "hop_id": tool_step_schema.hop_id
            }
            
        except Exception as e:
            # Mark tool step as failed using tool step service
            try:
                await self.tool_step_service.update_tool_step_status(
                    tool_step_id,
                    user_id,
                    ToolExecutionStatus.FAILED,
                    error_message=str(e)
                )
            except:
                pass  # Don't fail on cleanup failure
            
            raise Exception(f"Tool step execution failed: {str(e)}")

    async def _resolve_asset_context(self, hop_id: str, user_id: int) -> Dict[str, Any]:
        """Resolve asset context from hop scope."""
        asset_context = {}
        
        # Get all assets for this hop
        hop_assets = self.asset_service.get_assets_by_scope("hop", hop_id, user_id)
        
        for asset in hop_assets:
            asset_context[asset.id] = asset
            
        return asset_context




 