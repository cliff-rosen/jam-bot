"""
State Transition Service - Unified Interface

This service provides a single interface for all mission state transitions:
updateState(transaction_type, data) handles any state transition atomically.

Transaction Types:
- propose_mission: Agent proposes mission → AWAITING_APPROVAL
- accept_mission: User accepts mission → IN_PROGRESS  
- propose_hop_plan: Agent starts hop planning → HOP_PLAN_STARTED → HOP_PLAN_PROPOSED
- accept_hop_plan: User accepts hop plan → HOP_PLAN_READY
- propose_hop_impl: Agent implements hop → HOP_IMPL_STARTED → HOP_IMPL_PROPOSED
- accept_hop_impl: User accepts implementation → HOP_IMPL_READY
- execute_hop: User triggers execution → EXECUTING
- complete_hop: System completes hop → COMPLETED
- complete_mission: Final hop completes → mission COMPLETED
"""

from typing import Optional, Dict, Any, List
from datetime import datetime
from uuid import uuid4
from sqlalchemy.orm import Session

from database import get_db
from models import (
    Mission as MissionModel, 
    Hop as HopModel, 
    ToolStep as ToolStepModel,
    MissionStatus,
    HopStatus
)
from schemas.workflow import (
    Mission, 
    Hop,
    MissionStatus as SchemaMissionStatus,
    HopStatus as SchemaHopStatus
)
from services.asset_service import AssetService
from services.mission_transformer import MissionTransformer
from exceptions import ValidationError


class StateTransitionError(Exception):
    """Raised when state transitions fail"""
    pass


class StateTransitionService:
    """Unified interface for all state transitions"""
    
    def __init__(self, db: Session):
        self.db = db
        self.asset_service = AssetService(db)
        self.mission_transformer = MissionTransformer(self.asset_service)
    
    async def updateState(self, transaction_type: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Unified interface for all state transitions
        
        Args:
            transaction_type: Type of state transition
            data: Transaction data (varies by type)
            
        Returns:
            Dict with transaction results
            
        Raises:
            StateTransitionError: If transition fails
        """
        try:
            # Route to appropriate handler based on transaction type
            if transaction_type == "propose_mission":
                return await self._propose_mission(data)
            elif transaction_type == "accept_mission":
                return await self._accept_mission(data)
            elif transaction_type == "propose_hop_plan":
                return await self._propose_hop_plan(data)
            elif transaction_type == "accept_hop_plan":
                return await self._accept_hop_plan(data)
            elif transaction_type == "propose_hop_impl":
                return await self._propose_hop_impl(data)
            elif transaction_type == "accept_hop_impl":
                return await self._accept_hop_impl(data)
            elif transaction_type == "execute_hop":
                return await self._execute_hop(data)
            elif transaction_type == "complete_hop":
                return await self._complete_hop(data)
            elif transaction_type == "complete_mission":
                return await self._complete_mission(data)
            else:
                raise StateTransitionError(f"Unknown transaction type: {transaction_type}")
                
        except Exception as e:
            self.db.rollback()
            raise StateTransitionError(f"State transition failed [{transaction_type}]: {str(e)}")
    
    # Individual transaction handlers
    
    async def _propose_mission(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Handle mission proposal: Create mission with AWAITING_APPROVAL status"""
        user_id = data['user_id']
        mission_data = data['mission']
        
        # Create mission in AWAITING_APPROVAL state
        mission_id = str(uuid4())
        mission_data['id'] = mission_id
        mission_data['status'] = SchemaMissionStatus.AWAITING_APPROVAL
        
        # Use transformer to create mission
        mission_model = self.mission_transformer.schema_to_model(mission_data, user_id)
        self.db.add(mission_model)
        
        # Create mission assets if provided
        if mission_data.get('mission_state'):
            for asset_id, asset_data in mission_data['mission_state'].items():
                self.asset_service.create_asset(
                    user_id=user_id,
                    name=asset_data['name'],
                    type=asset_data['schema_definition']['type'],
                    subtype=asset_data.get('subtype'),
                    description=asset_data.get('description'),
                    content=asset_data.get('content'),
                    scope_type="mission",
                    scope_id=mission_id,
                    role=asset_data.get('role', 'input')
                )
        
        self.db.commit()
        
        return {
            "success": True,
            "mission_id": mission_id,
            "status": "AWAITING_APPROVAL",
            "message": "Mission proposed and awaiting user approval"
        }
    
    async def _accept_mission(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Handle mission acceptance: AWAITING_APPROVAL → IN_PROGRESS"""
        mission_id = data['mission_id']
        user_id = data['user_id']
        
        # Update mission status
        mission_model = self.db.query(MissionModel).filter(
            MissionModel.id == mission_id,
            MissionModel.user_id == user_id
        ).first()
        
        if not mission_model:
            raise StateTransitionError(f"Mission {mission_id} not found")
        
        if mission_model.status != MissionStatus.AWAITING_APPROVAL:
            raise StateTransitionError(f"Mission must be AWAITING_APPROVAL, current: {mission_model.status}")
        
        mission_model.status = MissionStatus.IN_PROGRESS
        mission_model.updated_at = datetime.utcnow()
        
        self.db.commit()
        
        return {
            "success": True,
            "mission_id": mission_id,
            "status": "IN_PROGRESS",
            "message": "Mission accepted and ready for hop planning"
        }
    
    async def _propose_hop_plan(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Handle hop plan proposal: Create hop + link to mission"""
        mission_id = data['mission_id']
        user_id = data['user_id']
        hop_data = data['hop']
        
        # Validate mission state
        mission_model = self.db.query(MissionModel).filter(
            MissionModel.id == mission_id,
            MissionModel.user_id == user_id
        ).first()
        
        if not mission_model:
            raise StateTransitionError(f"Mission {mission_id} not found")
        
        if mission_model.status != MissionStatus.IN_PROGRESS:
            raise StateTransitionError(f"Mission must be IN_PROGRESS, current: {mission_model.status}")
        
        # Create hop
        hop_id = str(uuid4())
        hop_model = HopModel(
            id=hop_id,
            mission_id=mission_id,
            user_id=user_id,
            name=hop_data.get('name', f'Hop {hop_data.get("sequence_order", 1)}'),
            description=hop_data.get('description'),
            goal=hop_data.get('goal'),
            sequence_order=hop_data.get('sequence_order', 1),
            status=HopStatus.HOP_PLAN_PROPOSED,  # Agent completed planning
            success_criteria=hop_data.get('success_criteria', []),
            rationale=hop_data.get('rationale'),
            is_final=hop_data.get('is_final', False),
            hop_metadata=hop_data.get('hop_metadata', {}),
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        
        self.db.add(hop_model)
        self.db.flush()
        
        # Link to mission
        mission_model.current_hop_id = hop_id
        mission_model.updated_at = datetime.utcnow()
        
        # Initialize hop assets from mission
        await self._copy_mission_assets_to_hop(mission_id, hop_id, user_id)
        
        self.db.commit()
        
        return {
            "success": True,
            "hop_id": hop_id,
            "mission_id": mission_id,
            "status": "HOP_PLAN_PROPOSED",
            "message": "Hop plan proposed and awaiting user approval"
        }
    
    async def _accept_hop_plan(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Handle hop plan acceptance: HOP_PLAN_PROPOSED → HOP_PLAN_READY"""
        hop_id = data['hop_id']
        user_id = data['user_id']
        
        hop_model = self.db.query(HopModel).filter(
            HopModel.id == hop_id,
            HopModel.user_id == user_id
        ).first()
        
        if not hop_model:
            raise StateTransitionError(f"Hop {hop_id} not found")
        
        if hop_model.status != HopStatus.HOP_PLAN_PROPOSED:
            raise StateTransitionError(f"Hop must be HOP_PLAN_PROPOSED, current: {hop_model.status}")
        
        hop_model.status = HopStatus.HOP_PLAN_READY
        hop_model.updated_at = datetime.utcnow()
        
        self.db.commit()
        
        return {
            "success": True,
            "hop_id": hop_id,
            "status": "HOP_PLAN_READY",
            "message": "Hop plan accepted and ready for implementation"
        }
    
    async def _propose_hop_impl(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Handle hop implementation proposal: HOP_PLAN_READY → HOP_IMPL_PROPOSED"""
        hop_id = data['hop_id']
        user_id = data['user_id']
        tool_steps = data.get('tool_steps', [])
        
        hop_model = self.db.query(HopModel).filter(
            HopModel.id == hop_id,
            HopModel.user_id == user_id
        ).first()
        
        if not hop_model:
            raise StateTransitionError(f"Hop {hop_id} not found")
        
        if hop_model.status != HopStatus.HOP_PLAN_READY:
            raise StateTransitionError(f"Hop must be HOP_PLAN_READY, current: {hop_model.status}")
        
        # Create tool steps
        for i, tool_step_data in enumerate(tool_steps):
            tool_step_model = ToolStepModel(
                id=str(uuid4()),
                hop_id=hop_id,
                user_id=user_id,
                tool_id=tool_step_data['tool_id'],
                sequence_order=i + 1,
                name=tool_step_data.get('name', f'Step {i + 1}'),
                description=tool_step_data.get('description'),
                parameter_mapping=tool_step_data.get('parameter_mapping', {}),
                result_mapping=tool_step_data.get('result_mapping', {}),
                resource_configs=tool_step_data.get('resource_configs', {}),
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            )
            self.db.add(tool_step_model)
        
        # Update hop status
        hop_model.status = HopStatus.HOP_IMPL_PROPOSED
        hop_model.updated_at = datetime.utcnow()
        
        self.db.commit()
        
        return {
            "success": True,
            "hop_id": hop_id,
            "status": "HOP_IMPL_PROPOSED",
            "tool_steps_created": len(tool_steps),
            "message": "Hop implementation proposed and awaiting user approval"
        }
    
    async def _accept_hop_impl(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Handle hop implementation acceptance: HOP_IMPL_PROPOSED → HOP_IMPL_READY"""
        hop_id = data['hop_id']
        user_id = data['user_id']
        
        hop_model = self.db.query(HopModel).filter(
            HopModel.id == hop_id,
            HopModel.user_id == user_id
        ).first()
        
        if not hop_model:
            raise StateTransitionError(f"Hop {hop_id} not found")
        
        if hop_model.status != HopStatus.HOP_IMPL_PROPOSED:
            raise StateTransitionError(f"Hop must be HOP_IMPL_PROPOSED, current: {hop_model.status}")
        
        hop_model.status = HopStatus.HOP_IMPL_READY
        hop_model.updated_at = datetime.utcnow()
        
        self.db.commit()
        
        return {
            "success": True,
            "hop_id": hop_id,
            "status": "HOP_IMPL_READY",
            "message": "Hop implementation accepted and ready for execution"
        }
    
    async def _execute_hop(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Handle hop execution start: HOP_IMPL_READY → EXECUTING"""
        hop_id = data['hop_id']
        user_id = data['user_id']
        
        hop_model = self.db.query(HopModel).filter(
            HopModel.id == hop_id,
            HopModel.user_id == user_id
        ).first()
        
        if not hop_model:
            raise StateTransitionError(f"Hop {hop_id} not found")
        
        if hop_model.status != HopStatus.HOP_IMPL_READY:
            raise StateTransitionError(f"Hop must be HOP_IMPL_READY, current: {hop_model.status}")
        
        hop_model.status = HopStatus.EXECUTING
        hop_model.updated_at = datetime.utcnow()
        
        self.db.commit()
        
        return {
            "success": True,
            "hop_id": hop_id,
            "status": "EXECUTING",
            "message": "Hop execution started"
        }
    
    async def _complete_hop(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Handle hop completion: EXECUTING → COMPLETED"""
        hop_id = data['hop_id']
        user_id = data['user_id']
        execution_result = data.get('execution_result')
        
        hop_model = self.db.query(HopModel).filter(
            HopModel.id == hop_id,
            HopModel.user_id == user_id
        ).first()
        
        if not hop_model:
            raise StateTransitionError(f"Hop {hop_id} not found")
        
        if hop_model.status != HopStatus.EXECUTING:
            raise StateTransitionError(f"Hop must be EXECUTING, current: {hop_model.status}")
        
        # Complete hop
        hop_model.status = HopStatus.COMPLETED
        hop_model.is_resolved = True
        hop_model.updated_at = datetime.utcnow()
        
        if execution_result:
            hop_model.hop_metadata = {
                **hop_model.hop_metadata,
                'execution_result': execution_result,
                'completed_at': datetime.utcnow().isoformat()
            }
        
        # Promote hop output assets to mission level
        await self._promote_hop_assets_to_mission(hop_model.mission_id, hop_id, user_id)
        
        # Update mission
        mission_model = self.db.query(MissionModel).filter(
            MissionModel.id == hop_model.mission_id,
            MissionModel.user_id == user_id
        ).first()
        
        if hop_model.is_final:
            # Final hop - complete mission
            mission_model.status = MissionStatus.COMPLETED
            mission_status = "COMPLETED"
            message = "Final hop completed - mission completed"
        else:
            # Non-final hop - reset current_hop_id for next hop
            mission_model.current_hop_id = None
            mission_status = "IN_PROGRESS"
            message = "Hop completed - mission ready for next hop"
        
        mission_model.updated_at = datetime.utcnow()
        
        self.db.commit()
        
        return {
            "success": True,
            "hop_id": hop_id,
            "mission_id": hop_model.mission_id,
            "hop_status": "COMPLETED",
            "mission_status": mission_status,
            "is_final": hop_model.is_final,
            "message": message
        }
    
    async def _complete_mission(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Handle mission completion: IN_PROGRESS → COMPLETED"""
        mission_id = data['mission_id']
        user_id = data['user_id']
        
        mission_model = self.db.query(MissionModel).filter(
            MissionModel.id == mission_id,
            MissionModel.user_id == user_id
        ).first()
        
        if not mission_model:
            raise StateTransitionError(f"Mission {mission_id} not found")
        
        mission_model.status = MissionStatus.COMPLETED
        mission_model.updated_at = datetime.utcnow()
        
        self.db.commit()
        
        return {
            "success": True,
            "mission_id": mission_id,
            "status": "COMPLETED",
            "message": "Mission completed successfully"
        }
    
    # Helper methods
    
    async def _copy_mission_assets_to_hop(self, mission_id: str, hop_id: str, user_id: int):
        """Copy relevant mission assets to hop scope as inputs"""
        mission_assets = self.asset_service.get_assets_by_scope(
            user_id=user_id,
            scope_type='mission',
            scope_id=mission_id
        )
        
        for asset in mission_assets:
            if asset.role in ['input', 'output']:
                await self.asset_service.create_asset(
                    user_id=user_id,
                    name=asset.name,
                    type=asset.schema_definition.type,
                    subtype=asset.subtype,
                    description=asset.description,
                    content=asset.content,
                    asset_metadata=asset.asset_metadata,
                    scope_type='hop',
                    scope_id=hop_id,
                    role='input'
                )
    
    async def _promote_hop_assets_to_mission(self, mission_id: str, hop_id: str, user_id: int):
        """Promote hop output assets to mission level"""
        hop_assets = self.asset_service.get_assets_by_scope(
            user_id=user_id,
            scope_type='hop',
            scope_id=hop_id
        )
        
        for asset in hop_assets:
            if asset.role == 'output':
                await self.asset_service.create_asset(
                    user_id=user_id,
                    name=asset.name,
                    type=asset.schema_definition.type,
                    subtype=asset.subtype,
                    description=asset.description,
                    content=asset.content,
                    asset_metadata={
                        **asset.asset_metadata,
                        'promoted_from_hop': hop_id,
                        'promoted_at': datetime.utcnow().isoformat()
                    },
                    scope_type='mission',
                    scope_id=mission_id,
                    role='output'
                )


# Dependency function for FastAPI
async def get_state_transition_service(db: Session = None) -> StateTransitionService:
    """Get StateTransitionService instance"""
    if db is None:
        db = next(get_db())
    return StateTransitionService(db) 