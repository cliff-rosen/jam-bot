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
from services.asset_mapping_service import AssetMappingService
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
    COMPLETE_TOOL_STEP = "complete_tool_step"


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
        self.asset_mapping_service = AssetMappingService(db)
        self.mission_transformer = MissionTransformer(self.asset_service, self.asset_mapping_service)
        self.session_service = session_service
    
    def _serialize_mapping_value(self, mapping_value: Any) -> Dict[str, Any]:
        """
        Serialize ParameterMappingValue or ResultMappingValue objects to JSON-compatible dictionaries.
        
        Args:
            mapping_value: Can be AssetFieldMapping, LiteralMapping, DiscardMapping, or dict
            
        Returns:
            JSON-compatible dictionary
        """
        if hasattr(mapping_value, 'model_dump'):
            # It's a Pydantic model (AssetFieldMapping, LiteralMapping, etc.)
            return mapping_value.model_dump()
        elif isinstance(mapping_value, dict):
            # Already a dictionary, return as-is
            return mapping_value
        else:
            # Fallback for other types
            return {"type": "unknown", "value": str(mapping_value)}
    
    def _serialize_mappings(self, mappings: Dict[str, Any]) -> Dict[str, Any]:
        """Serialize parameter_mapping or result_mapping to JSON-compatible format"""
        if not mappings:
            return {}
        
        return {
            key: self._serialize_mapping_value(value)
            for key, value in mappings.items()
        }
    
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
            elif transaction_type == TransactionType.COMPLETE_TOOL_STEP:
                return await self._complete_tool_step(data)
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
            mission_metadata=mission_data.get('mission_metadata', {})
        )
        
        # Use transformer to create mission
        mission_model = self.mission_transformer.schema_to_model(mission_schema, user_id)
        self.db.add(mission_model)
        
        # Create mission assets if provided
        if mission_data.get('mission_state'):
            for asset_id, asset_data in mission_data['mission_state'].items():
                created_asset_id = self.asset_service.create_asset(
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
                
                # Create asset mapping
                from models import AssetRole
                role = AssetRole(asset_data.get('role', 'input'))
                self.asset_mapping_service.add_mission_asset(mission_id, created_asset_id, role)
        
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
        
        # Initialize hop assets based on hop specification
        await self._initialize_hop_assets(mission_id, hop_id, user_id, hop_data)
        
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
        
        # Create tool steps with serialized mappings
        for i, tool_step_data in enumerate(tool_steps):
            tool_step_model = ToolStepModel(
                id=str(uuid4()),
                hop_id=hop_id,
                user_id=user_id,
                tool_id=tool_step_data['tool_id'],
                sequence_order=i + 1,
                name=tool_step_data.get('name', f'Step {i + 1}'),
                description=tool_step_data.get('description'),
                parameter_mapping=self._serialize_mappings(tool_step_data.get('parameter_mapping', {})),
                result_mapping=self._serialize_mappings(tool_step_data.get('result_mapping', {})),
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
        
        # Update all tool steps from PROPOSED to READY_TO_EXECUTE
        from models import ToolExecutionStatus
        tool_steps = self.db.query(ToolStepModel).filter(
            ToolStepModel.hop_id == hop_id,
            ToolStepModel.user_id == user_id,
            ToolStepModel.status == ToolExecutionStatus.PROPOSED
        ).all()
        
        updated_tool_steps = 0
        for tool_step in tool_steps:
            tool_step.status = ToolExecutionStatus.READY_TO_EXECUTE
            tool_step.updated_at = datetime.utcnow()
            updated_tool_steps += 1
        
        self.db.commit()
        
        return TransactionResult(
            success=True,
            entity_id=hop_id,
            status="HOP_IMPL_READY",
            message="Hop implementation accepted and ready for execution",
            metadata={
                "hop_id": hop_id,
                "tool_steps_updated": updated_tool_steps,
                "tool_steps_status": "READY_TO_EXECUTE"
            }
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
        
        # Start the first tool step execution
        from models import ToolExecutionStatus
        first_tool_step = self.db.query(ToolStepModel).filter(
            ToolStepModel.hop_id == hop_id,
            ToolStepModel.user_id == user_id,
            ToolStepModel.sequence_order == 1
        ).first()
        
        first_step_updated = False
        if first_tool_step and first_tool_step.status == ToolExecutionStatus.READY_TO_EXECUTE:
            first_tool_step.status = ToolExecutionStatus.EXECUTING
            first_tool_step.started_at = datetime.utcnow()
            first_tool_step.updated_at = datetime.utcnow()
            first_step_updated = True
        
        self.db.commit()
        
        return TransactionResult(
            success=True,
            entity_id=hop_id,
            status="EXECUTING",
            message="Hop execution started - first tool step now executing",
            metadata={
                "hop_id": hop_id,
                "first_step_updated": first_step_updated,
                "first_step_id": first_tool_step.id if first_tool_step else None,
                "first_step_status": "EXECUTING" if first_step_updated else "NOT_FOUND"
            }
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
    
    async def _complete_tool_step(self, data: Dict[str, Any]) -> TransactionResult:
        """Handle tool step completion: Simulate successful tool execution for testing"""
        tool_step_id = data['tool_step_id']
        user_id = data['user_id']
        simulated_output = data.get('simulated_output', {})
        
        # Get tool step
        tool_step_model = self.db.query(ToolStepModel).filter(
            ToolStepModel.id == tool_step_id,
            ToolStepModel.user_id == user_id
        ).first()
        
        self._validate_entity_exists(tool_step_model, "ToolStep", tool_step_id)
        
        # Validate tool step can be completed
        from models import ToolExecutionStatus
        valid_statuses = [ToolExecutionStatus.PROPOSED, ToolExecutionStatus.READY_TO_EXECUTE, ToolExecutionStatus.EXECUTING]
        if tool_step_model.status not in valid_statuses:
            raise StateTransitionError(
                f"Tool step {tool_step_id} must be in {[s.value for s in valid_statuses]}, current: {tool_step_model.status.value}"
            )
        
        # Generate simulated execution result
        execution_result = await self._generate_simulated_execution_result(tool_step_model, simulated_output)
        
        # Update tool step status
        tool_step_model.status = ToolExecutionStatus.COMPLETED
        tool_step_model.execution_result = execution_result
        tool_step_model.completed_at = datetime.utcnow()
        tool_step_model.updated_at = datetime.utcnow()
        
        if not tool_step_model.started_at:
            tool_step_model.started_at = datetime.utcnow()
        
        # Create output assets based on result_mapping
        assets_created = await self._create_output_assets_from_tool_step(tool_step_model, execution_result, user_id)
        
        # Check if all tool steps in the hop are completed
        hop_model = self.db.query(HopModel).filter(HopModel.id == tool_step_model.hop_id).first()
        hop_progress = await self._check_hop_progress(tool_step_model.hop_id, user_id)
        
        self.db.commit()
        
        return TransactionResult(
            success=True,
            entity_id=tool_step_id,
            status="COMPLETED",
            message="Tool step completed successfully (simulated)",
            metadata={
                "tool_step_id": tool_step_id,
                "hop_id": tool_step_model.hop_id,
                "assets_created": assets_created,
                "hop_progress": hop_progress,
                "execution_result": execution_result
            }
        )
    
    # Helper methods
    
    async def _initialize_hop_assets(self, mission_id: str, hop_id: str, user_id: int, hop_data: Dict[str, Any]):
        """Initialize hop assets based on hop specification - NEW APPROACH"""
        from models import AssetRole
        
        # Store intended input asset IDs (references to mission assets)
        intended_input_asset_ids = hop_data.get('intended_input_asset_ids', [])
        
        # Store intended output asset IDs (references to existing mission assets)
        intended_output_asset_ids = hop_data.get('intended_output_asset_ids', [])
        
        # Create new mission output assets from specifications
        intended_output_asset_specs = hop_data.get('intended_output_asset_specs', [])
        for asset_spec in intended_output_asset_specs:
            # Create asset at MISSION scope (not hop scope)
            created_asset_id = self.asset_service.create_asset(
                user_id=user_id,
                name=asset_spec.get('name', 'Mission Output'),
                type=asset_spec.get('schema_definition', {}).get('type', 'text'),
                subtype=asset_spec.get('subtype'),
                description=asset_spec.get('description', f'Output created by {hop_data.get("name", "hop")}'),
                content="",  # Empty initially - will be populated during execution
                asset_metadata={
                    'created_by_hop': hop_id,
                    'hop_name': hop_data.get('name'),
                    'created_at': datetime.utcnow().isoformat()
                },
                scope_type='mission',  # MISSION scope, not hop scope
                scope_id=mission_id,
                role='output'
            )
            
            # Add to mission asset mapping
            self.asset_mapping_service.add_mission_asset(mission_id, created_asset_id, AssetRole.OUTPUT)
            
            # Add to intended outputs list
            intended_output_asset_ids.append(created_asset_id)
        
        # Update hop model with intended asset tracking
        hop_model = self.db.query(HopModel).filter(HopModel.id == hop_id).first()
        if hop_model:
            hop_model.intended_input_asset_ids = intended_input_asset_ids
            hop_model.intended_output_asset_ids = intended_output_asset_ids
            hop_model.intended_output_asset_specs = intended_output_asset_specs

    async def _copy_mission_assets_to_hop(self, mission_id: str, hop_id: str, user_id: int):
        """DEPRECATED: Copy relevant mission assets to hop scope as inputs - replaced by _initialize_hop_assets"""
        mission_assets = self.asset_service.get_assets_by_scope(
            user_id=user_id,
            scope_type='mission',
            scope_id=mission_id
        )
        
        for asset in mission_assets:
            if asset.role in ['input', 'output']:
                # Mission input assets become hop input assets
                # Mission output assets become hop output assets (what the hop should produce)
                hop_role = 'input' if asset.role == 'input' else 'output'
                
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
                    role=hop_role
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
    
    async def _generate_simulated_execution_result(self, tool_step_model: ToolStepModel, simulated_output: Dict[str, Any]) -> Dict[str, Any]:
        """Generate simulated execution result for testing purposes"""
        # Get tool information to understand expected outputs
        tool_id = tool_step_model.tool_id
        result_mapping = tool_step_model.result_mapping or {}
        
        # Create realistic simulated output based on tool type and result mapping
        execution_result = {
            "success": True,
            "outputs": {},
            "metadata": {
                "simulated": True,
                "tool_id": tool_id,
                "executed_at": datetime.utcnow().isoformat(),
                "execution_duration": 1.5  # Simulated duration
            }
        }
        
        # Generate outputs based on result_mapping
        for output_name, mapping_config in result_mapping.items():
            if output_name in simulated_output:
                # Use provided simulated output
                execution_result["outputs"][output_name] = simulated_output[output_name]
            else:
                # Generate realistic output based on tool type
                execution_result["outputs"][output_name] = self._generate_realistic_output(
                    tool_id, output_name, mapping_config
                )
        
        return execution_result
    
    def _generate_realistic_output(self, tool_id: str, output_name: str, mapping_config: Dict[str, Any]) -> Any:
        """Generate realistic output data for a specific tool output"""
        # Common realistic outputs based on tool patterns
        if "text" in output_name.lower() or "content" in output_name.lower():
            return f"Simulated {output_name} result from {tool_id}"
        elif "json" in output_name.lower() or "data" in output_name.lower():
            return {"status": "success", "data": f"Simulated data from {tool_id}"}
        elif "file" in output_name.lower():
            return {"filename": f"output_{tool_id}.txt", "content": f"Simulated file content from {tool_id}"}
        elif "url" in output_name.lower() or "link" in output_name.lower():
            return f"https://example.com/simulated/{tool_id}/output"
        elif "count" in output_name.lower() or "number" in output_name.lower():
            return 42
        elif "list" in output_name.lower() or "array" in output_name.lower():
            return [f"Item 1 from {tool_id}", f"Item 2 from {tool_id}"]
        else:
            return f"Simulated {output_name} from {tool_id}"
    
    async def _create_output_assets_from_tool_step(self, tool_step_model: ToolStepModel, execution_result: Dict[str, Any], user_id: int) -> List[str]:
        """Create output assets based on tool step execution results"""
        assets_created = []
        result_mapping = tool_step_model.result_mapping or {}
        outputs = execution_result.get("outputs", {})
        
        for output_name, asset_target in result_mapping.items():
            if output_name in outputs:
                # Extract asset information from mapping
                asset_name = asset_target.get("asset_name", output_name) if isinstance(asset_target, dict) else str(asset_target)
                
                # Determine asset type and content based on output data
                output_data = outputs[output_name]
                asset_type = self._determine_asset_type(output_data)
                
                # Create the asset
                asset_id = self.asset_service.create_asset(
                    user_id=user_id,
                    name=asset_name,
                    type=asset_type,
                    description=f"Output from tool step {tool_step_model.name}",
                    content=output_data,
                    asset_metadata={
                        "generated_by_tool": tool_step_model.tool_id,
                        "tool_step_id": tool_step_model.id,
                        "output_name": output_name,
                        "simulated": True,
                        "created_at": datetime.utcnow().isoformat()
                    },
                    scope_type='hop',
                    scope_id=tool_step_model.hop_id,
                    role='output'
                )
                
                assets_created.append(asset_id)
        
        return assets_created
    
    def _determine_asset_type(self, output_data: Any) -> str:
        """Determine appropriate asset type based on output data"""
        if isinstance(output_data, str):
            return "text"
        elif isinstance(output_data, dict):
            return "json"
        elif isinstance(output_data, list):
            return "json"
        elif isinstance(output_data, (int, float)):
            return "number"
        elif isinstance(output_data, bool):
            return "boolean"
        else:
            return "text"  # Default fallback
    
    async def _check_hop_progress(self, hop_id: str, user_id: int) -> Dict[str, Any]:
        """Check progress of all tool steps in a hop"""
        tool_steps = self.db.query(ToolStepModel).filter(
            ToolStepModel.hop_id == hop_id,
            ToolStepModel.user_id == user_id
        ).order_by(ToolStepModel.sequence_order).all()
        
        from models import ToolExecutionStatus
        total_steps = len(tool_steps)
        completed_steps = len([step for step in tool_steps if step.status == ToolExecutionStatus.COMPLETED])
        
        progress = {
            "total_steps": total_steps,
            "completed_steps": completed_steps,
            "progress_percentage": (completed_steps / total_steps * 100) if total_steps > 0 else 0,
            "all_completed": completed_steps == total_steps,
            "step_statuses": [
                {
                    "step_id": step.id,
                    "name": step.name,
                    "status": step.status.value,
                    "sequence_order": step.sequence_order
                }
                for step in tool_steps
            ]
        }
        
        return progress


# Dependency function for FastAPI
def get_state_transition_service(db: Session = Depends(get_db)) -> StateTransitionService:
    """Get StateTransitionService instance"""
    from services.user_session_service import UserSessionService
    session_service = UserSessionService(db)
    return StateTransitionService(db, session_service) 