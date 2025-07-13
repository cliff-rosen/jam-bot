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
from dataclasses import dataclass, field
from enum import Enum
from fastapi import Depends

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
from services.user_session_service import UserSessionService
from exceptions import ValidationError


class TransactionType(str, Enum):
    """Enum for all supported transaction types"""
    PROPOSE_MISSION = "propose_mission"
    ACCEPT_MISSION = "accept_mission"
    PROPOSE_HOP_PLAN = "propose_hop_plan"
    ACCEPT_HOP_PLAN = "accept_hop_plan"
    PROPOSE_HOP_IMPL = "propose_hop_impl"
    ACCEPT_HOP_IMPL = "accept_hop_impl"
    EXECUTE_HOP = "execute_hop"
    COMPLETE_HOP = "complete_hop"
    COMPLETE_MISSION = "complete_mission"


@dataclass
class TransactionResult:
    """Standardized result for all state transitions"""
    success: bool
    entity_id: str
    status: str
    message: str
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization"""
        return {
            "success": self.success,
            "entity_id": self.entity_id,
            "status": self.status,
            "message": self.message,
            **self.metadata
        }


class StateTransitionError(Exception):
    """Raised when state transitions fail"""
    pass


class StateTransitionService:
    """Unified interface for all state transitions"""
    
    def __init__(self, db: Session, session_service: UserSessionService = None):
        self.db = db
        self.asset_service = AssetService(db)
        self.mission_transformer = MissionTransformer(self.asset_service)
        self.session_service = session_service
    
    async def updateState(self, transaction_type: TransactionType, data: Dict[str, Any]) -> TransactionResult:
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
            if transaction_type == TransactionType.PROPOSE_MISSION:
                return await self._propose_mission(data)
            elif transaction_type == TransactionType.ACCEPT_MISSION:
                return await self._accept_mission(data)
            elif transaction_type == TransactionType.PROPOSE_HOP_PLAN:
                return await self._propose_hop_plan(data)
            elif transaction_type == TransactionType.ACCEPT_HOP_PLAN:
                return await self._accept_hop_plan(data)
            elif transaction_type == TransactionType.PROPOSE_HOP_IMPL:
                return await self._propose_hop_impl(data)
            elif transaction_type == TransactionType.ACCEPT_HOP_IMPL:
                return await self._accept_hop_impl(data)
            elif transaction_type == TransactionType.EXECUTE_HOP:
                return await self._execute_hop(data)
            elif transaction_type == TransactionType.COMPLETE_HOP:
                return await self._complete_hop(data)
            elif transaction_type == TransactionType.COMPLETE_MISSION:
                return await self._complete_mission(data)
            else:
                raise StateTransitionError(f"Unknown transaction type: {transaction_type}")
                
        except Exception as e:
            self.db.rollback()
            raise StateTransitionError(f"State transition failed [{transaction_type}]: {str(e)}")
    
    def _validate_transition(self, entity_type: str, entity_id: str, current_status: str, expected_status: str, user_id: int) -> None:
        """Validate that a state transition is allowed"""
        if current_status != expected_status:
            raise StateTransitionError(
                f"{entity_type} {entity_id} must be {expected_status}, current: {current_status}"
            )
    
    def _validate_entity_exists(self, entity, entity_type: str, entity_id: str) -> None:
        """Validate that an entity exists"""
        if not entity:
            raise StateTransitionError(f"{entity_type} {entity_id} not found")
    
    # Individual transaction handlers
    
    async def _propose_mission(self, data: Dict[str, Any]) -> TransactionResult:
        """Handle mission proposal: Create mission with AWAITING_APPROVAL status"""
        user_id = data['user_id']
        mission_data = data['mission']
        
        # Create mission in AWAITING_APPROVAL state
        mission_id = str(uuid4())
        mission_data['id'] = mission_id
        mission_data['status'] = SchemaMissionStatus.AWAITING_APPROVAL
        
        # Convert dictionary to Mission object
        mission_schema = Mission(
            id=mission_id,
            name=mission_data['name'],
            description=mission_data.get('description'),
            goal=mission_data.get('goal'),
            success_criteria=mission_data.get('success_criteria', []),
            status=SchemaMissionStatus.AWAITING_APPROVAL,
            mission_metadata=mission_data.get('mission_metadata', {}),
            mission_state={}  # Assets will be created separately
        )
        
        # Use transformer to create mission
        mission_model = self.mission_transformer.schema_to_model(mission_schema, user_id)
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
        
        # Link mission to user's active session automatically (before commit)
        if self.session_service:
            try:
                await self.session_service.link_mission_to_session(user_id, mission_id, commit=False)
            except Exception as e:
                # Log but don't fail the transaction
                print(f"Warning: Could not link mission to session: {e}")
        
        self.db.commit()
        
        return TransactionResult(
            success=True,
            entity_id=mission_id,
            status="AWAITING_APPROVAL",
            message="Mission proposed and awaiting user approval",
            metadata={"mission_id": mission_id}
        )
    
    async def _accept_mission(self, data: Dict[str, Any]) -> TransactionResult:
        """Handle mission acceptance: AWAITING_APPROVAL → IN_PROGRESS"""
        mission_id = data['mission_id']
        user_id = data['user_id']
        
        # Update mission status
        mission_model = self.db.query(MissionModel).filter(
            MissionModel.id == mission_id,
            MissionModel.user_id == user_id
        ).first()
        
        self._validate_entity_exists(mission_model, "Mission", mission_id)
        self._validate_transition("Mission", mission_id, mission_model.status.value, "awaiting_approval", user_id)
        
        mission_model.status = MissionStatus.IN_PROGRESS
        mission_model.updated_at = datetime.utcnow()
        
        self.db.commit()
        
        return TransactionResult(
            success=True,
            entity_id=mission_id,
            status="IN_PROGRESS",
            message="Mission accepted and ready for hop planning",
            metadata={"mission_id": mission_id}
        )
    
    async def _propose_hop_plan(self, data: Dict[str, Any]) -> TransactionResult:
        """Handle hop plan proposal: Create hop + link to mission"""
        mission_id = data['mission_id']
        user_id = data['user_id']
        hop_data = data['hop']
        
        # Validate mission state
        mission_model = self.db.query(MissionModel).filter(
            MissionModel.id == mission_id,
            MissionModel.user_id == user_id
        ).first()
        
        self._validate_entity_exists(mission_model, "Mission", mission_id)
        self._validate_transition("Mission", mission_id, mission_model.status.value, "in_progress", user_id)
        
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
            status=HopStatus.HOP_PLAN_PROPOSED.value,
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
        
        return TransactionResult(
            success=True,
            entity_id=hop_id,
            status="HOP_PLAN_PROPOSED",
            message="Hop plan proposed and awaiting user approval",
            metadata={"hop_id": hop_id, "mission_id": mission_id}
        )
    
    async def _accept_hop_plan(self, data: Dict[str, Any]) -> TransactionResult:
        """Handle hop plan acceptance: HOP_PLAN_PROPOSED → HOP_PLAN_READY"""
        hop_id = data['hop_id']
        user_id = data['user_id']
        
        hop_model = self.db.query(HopModel).filter(
            HopModel.id == hop_id,
            HopModel.user_id == user_id
        ).first()
        
        self._validate_entity_exists(hop_model, "Hop", hop_id)
        self._validate_transition("Hop", hop_id, hop_model.status.value, "hop_plan_proposed", user_id)
        
        hop_model.status = HopStatus.HOP_PLAN_READY.value
        hop_model.updated_at = datetime.utcnow()
        
        self.db.commit()
        
        return TransactionResult(
            success=True,
            entity_id=hop_id,
            status="HOP_PLAN_READY",
            message="Hop plan accepted and ready for implementation",
            metadata={"hop_id": hop_id}
        )
    
    async def _propose_hop_impl(self, data: Dict[str, Any]) -> TransactionResult:
        """Handle hop implementation proposal: HOP_PLAN_READY → HOP_IMPL_PROPOSED"""
        hop_id = data['hop_id']
        user_id = data['user_id']
        tool_steps = data.get('tool_steps', [])
        
        hop_model = self.db.query(HopModel).filter(
            HopModel.id == hop_id,
            HopModel.user_id == user_id
        ).first()
        
        self._validate_entity_exists(hop_model, "Hop", hop_id)
        self._validate_transition("Hop", hop_id, hop_model.status.value, "hop_plan_ready", user_id)
        
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
        hop_model.status = HopStatus.HOP_IMPL_PROPOSED.value
        hop_model.updated_at = datetime.utcnow()
        
        self.db.commit()
        
        return TransactionResult(
            success=True,
            entity_id=hop_id,
            status="HOP_IMPL_PROPOSED",
            message="Hop implementation proposed and awaiting user approval",
            metadata={"hop_id": hop_id, "tool_steps_created": len(tool_steps)}
        )
    
    async def _accept_hop_impl(self, data: Dict[str, Any]) -> TransactionResult:
        """Handle hop implementation acceptance: HOP_IMPL_PROPOSED → HOP_IMPL_READY"""
        hop_id = data['hop_id']
        user_id = data['user_id']
        
        hop_model = self.db.query(HopModel).filter(
            HopModel.id == hop_id,
            HopModel.user_id == user_id
        ).first()
        
        self._validate_entity_exists(hop_model, "Hop", hop_id)
        self._validate_transition("Hop", hop_id, hop_model.status.value, "hop_impl_proposed", user_id)
        
        hop_model.status = HopStatus.HOP_IMPL_READY.value
        hop_model.updated_at = datetime.utcnow()
        
        self.db.commit()
        
        return TransactionResult(
            success=True,
            entity_id=hop_id,
            status="HOP_IMPL_READY",
            message="Hop implementation accepted and ready for execution",
            metadata={"hop_id": hop_id}
        )
    
    async def _execute_hop(self, data: Dict[str, Any]) -> TransactionResult:
        """Handle hop execution start: HOP_IMPL_READY → EXECUTING"""
        hop_id = data['hop_id']
        user_id = data['user_id']
        
        hop_model = self.db.query(HopModel).filter(
            HopModel.id == hop_id,
            HopModel.user_id == user_id
        ).first()
        
        self._validate_entity_exists(hop_model, "Hop", hop_id)
        self._validate_transition("Hop", hop_id, hop_model.status.value, "hop_impl_ready", user_id)
        
        hop_model.status = HopStatus.EXECUTING.value
        hop_model.updated_at = datetime.utcnow()
        
        self.db.commit()
        
        return TransactionResult(
            success=True,
            entity_id=hop_id,
            status="EXECUTING",
            message="Hop execution started",
            metadata={"hop_id": hop_id}
        )
    
    async def _complete_hop(self, data: Dict[str, Any]) -> TransactionResult:
        """Handle hop completion: EXECUTING → COMPLETED"""
        hop_id = data['hop_id']
        user_id = data['user_id']
        execution_result = data.get('execution_result')
        
        hop_model = self.db.query(HopModel).filter(
            HopModel.id == hop_id,
            HopModel.user_id == user_id
        ).first()
        
        self._validate_entity_exists(hop_model, "Hop", hop_id)
        self._validate_transition("Hop", hop_id, hop_model.status.value, "executing", user_id)
        
        # Complete hop
        hop_model.status = HopStatus.COMPLETED.value
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
        
        return TransactionResult(
            success=True,
            entity_id=hop_id,
            status="COMPLETED",
            message=message,
            metadata={
                "hop_id": hop_id,
                "mission_id": hop_model.mission_id,
                "hop_status": "COMPLETED",
                "mission_status": mission_status,
                "is_final": hop_model.is_final
            }
        )
    
    async def _complete_mission(self, data: Dict[str, Any]) -> TransactionResult:
        """Handle mission completion: IN_PROGRESS → COMPLETED"""
        mission_id = data['mission_id']
        user_id = data['user_id']
        
        mission_model = self.db.query(MissionModel).filter(
            MissionModel.id == mission_id,
            MissionModel.user_id == user_id
        ).first()
        
        self._validate_entity_exists(mission_model, "Mission", mission_id)
        
        mission_model.status = MissionStatus.COMPLETED
        mission_model.updated_at = datetime.utcnow()
        
        self.db.commit()
        
        return TransactionResult(
            success=True,
            entity_id=mission_id,
            status="COMPLETED",
            message="Mission completed successfully",
            metadata={"mission_id": mission_id}
        )
    
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
                self.asset_service.create_asset(
                    user_id=user_id,
                    name=asset.name,
                    type=asset.schema_definition.type,
                    subtype=asset.subtype,
                    description=asset.description,
                    content=asset.value_representation,
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
                self.asset_service.create_asset(
                    user_id=user_id,
                    name=asset.name,
                    type=asset.schema_definition.type,
                    subtype=asset.subtype,
                    description=asset.description,
                    content=asset.value_representation,
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
def get_state_transition_service(db: Session = Depends(get_db)) -> StateTransitionService:
    """Get StateTransitionService instance"""
    from services.user_session_service import UserSessionService
    session_service = UserSessionService(db)
    return StateTransitionService(db, session_service) 