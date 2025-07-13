from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import and_, desc
from datetime import datetime
from uuid import uuid4

from models import Hop as HopModel, HopStatus
from schemas.workflow import Hop, HopStatus as HopStatusSchema
from services.asset_service import AssetService


class HopService:
    def __init__(self, db: Session):
        self.db = db
        self.asset_service = AssetService(db)

    async def _model_to_schema(self, hop_model: HopModel, load_hop_state: bool = True) -> Hop:
        """Convert database model to Hop schema with optional hop state loading"""
        hop_state = {}
        tool_steps = []
        
        if load_hop_state:
            # Load hop-scoped assets
            hop_assets = self.asset_service.get_assets_by_scope(
                user_id=hop_model.user_id,
                scope_type="hop",
                scope_id=hop_model.id
            )
            hop_state = {asset.id: asset for asset in hop_assets}
        
        # Load tool steps for this hop
        from services.tool_step_service import ToolStepService
        tool_step_service = ToolStepService(self.db)
        try:
            tool_steps = await tool_step_service.get_tool_steps_by_hop(hop_model.id, hop_model.user_id)
        except Exception as e:
            print(f"Warning: Failed to load tool steps for hop {hop_model.id}: {e}")
            tool_steps = []
        
        return Hop(
            id=hop_model.id,
            name=hop_model.name,
            description=hop_model.description or "",
            goal=hop_model.goal,
            success_criteria=hop_model.success_criteria or [],
            sequence_order=hop_model.sequence_order,
            status=HopStatusSchema(hop_model.status.value),
            is_final=hop_model.is_final,
            is_resolved=hop_model.is_resolved,
            rationale=hop_model.rationale,
            error_message=hop_model.error_message,
            hop_metadata=hop_model.hop_metadata or {},
            hop_state=hop_state,
            tool_steps=tool_steps,
            created_at=hop_model.created_at,
            updated_at=hop_model.updated_at
        )

    async def create_hop(
        self,
        mission_id: str,
        user_id: int,
        name: str,
        description: str,
        goal: Optional[str] = None,
        success_criteria: Optional[List[str]] = None,
        input_asset_ids: Optional[List[str]] = None,
        output_asset_ids: Optional[List[str]] = None,
        rationale: Optional[str] = None,
        is_final: bool = False,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Hop:
        """Create a new hop with automatic sequence ordering"""
        
        # Get the next sequence order for this mission
        latest_hop = self.db.query(HopModel).filter(
            HopModel.mission_id == mission_id
        ).order_by(desc(HopModel.sequence_order)).first()
        
        next_sequence = (latest_hop.sequence_order + 1) if latest_hop else 1
        
        hop_model = HopModel(
            id=str(uuid4()),
            mission_id=mission_id,
            user_id=user_id,
            name=name,
            description=description,
            goal=goal,
            success_criteria=success_criteria or [],
            input_asset_ids=input_asset_ids or [],
            output_asset_ids=output_asset_ids or [],
            sequence_order=next_sequence,
            status=HopStatus.HOP_PLAN_STARTED,
            is_final=is_final,
            is_resolved=False,
            rationale=rationale,
            metadata=metadata or {}
        )
        
        self.db.add(hop_model)
        self.db.commit()
        self.db.refresh(hop_model)
        
        return await self._model_to_schema(hop_model)

    async def get_hop(self, hop_id: str, user_id: int) -> Optional[Hop]:
        """Get a hop by ID"""
        hop_model = self.db.query(HopModel).filter(
            and_(HopModel.id == hop_id, HopModel.user_id == user_id)
        ).first()
        
        if not hop_model:
            return None
        
        return await self._model_to_schema(hop_model)

    async def get_hops_by_mission(self, mission_id: str, user_id: int) -> List[Hop]:
        """Get all hops for a mission, ordered by sequence"""
        hop_models = self.db.query(HopModel).filter(
            and_(HopModel.mission_id == mission_id, HopModel.user_id == user_id)
        ).order_by(HopModel.sequence_order).all()
        
        # Convert models to schemas using asyncio.gather for concurrent execution
        import asyncio
        return await asyncio.gather(*[self._model_to_schema(hop_model) for hop_model in hop_models])

    async def update_hop(
        self,
        hop_id: str,
        user_id: int,
        updates: Dict[str, Any]
    ) -> Optional[Hop]:
        """Update a hop"""
        hop_model = self.db.query(HopModel).filter(
            and_(HopModel.id == hop_id, HopModel.user_id == user_id)
        ).first()
        
        if not hop_model:
            return None
        
        # Handle status updates
        if 'status' in updates:
            if isinstance(updates['status'], str):
                updates['status'] = HopStatus(updates['status'])
        
        # Update fields
        for key, value in updates.items():
            if hasattr(hop_model, key):
                setattr(hop_model, key, value)
        
        hop_model.updated_at = datetime.utcnow()
        
        self.db.commit()
        self.db.refresh(hop_model)
        
        return await self._model_to_schema(hop_model)

    async def update_hop_status(
        self,
        hop_id: str,
        user_id: int,
        status: HopStatusSchema,
        error_message: Optional[str] = None
    ) -> Optional[Hop]:
        """Update hop status with optional error message and coordinate with mission status"""
        # For completion status, use StateTransitionService for atomic coordination
        if status == HopStatusSchema.COMPLETED:
            try:
                from services.state_transition_service import StateTransitionService
                state_service = StateTransitionService(self.db)
                
                # Use atomic completion operation
                mission, hop = await state_service.complete_hop_and_update_mission(
                    hop_id=hop_id,
                    user_id=user_id,
                    execution_result=None
                )
                
                print(f"Hop {hop_id} completed with atomic mission coordination")
                return hop
                
            except Exception as e:
                print(f"Failed to complete hop with coordination: {str(e)}")
                # Fall back to simple update if coordination fails
                pass
        
        # For other status updates, use simple update
        updates = {
            'status': HopStatus(status.value),
            'updated_at': datetime.utcnow()
        }
        
        if error_message:
            updates['error_message'] = error_message
        elif status == HopStatusSchema.COMPLETED:
            # Clear error message on successful completion
            updates['error_message'] = None
        
        hop = await self.update_hop(hop_id, user_id, updates)
        
        # For non-completion updates, still coordinate mission status
        if hop and status != HopStatusSchema.COMPLETED:
            try:
                # Import here to avoid circular imports
                from services.mission_service import MissionService
                
                # Get the mission ID from the hop
                hop_model = self.db.query(HopModel).filter(
                    HopModel.id == hop_id
                ).first()
                
                if hop_model and hop_model.mission_id:
                    mission_service = MissionService(self.db)
                    await mission_service.coordinate_mission_status_with_hop(
                        hop_model.mission_id, 
                        user_id, 
                        status
                    )
                    print(f"Mission status coordinated for hop {hop_id} with status {status}")
            except Exception as e:
                print(f"Failed to coordinate mission status for hop {hop_id}: {str(e)}")
                # Don't fail the hop update if mission coordination fails
        
        return hop

    async def delete_hop(self, hop_id: str, user_id: int) -> bool:
        """Delete a hop"""
        hop_model = self.db.query(HopModel).filter(
            and_(HopModel.id == hop_id, HopModel.user_id == user_id)
        ).first()
        
        if not hop_model:
            return False
        
        self.db.delete(hop_model)
        self.db.commit()
        
        return True

    async def get_current_hop(self, mission_id: str, user_id: int) -> Optional[Hop]:
        """Get the current active hop for a mission"""
        # Get the first hop that is not completed
        hop_model = self.db.query(HopModel).filter(
            and_(
                HopModel.mission_id == mission_id,
                HopModel.user_id == user_id,
                HopModel.status.notin_([HopStatus.COMPLETED, HopStatus.CANCELLED])
            )
        ).order_by(HopModel.sequence_order).first()
        
        if not hop_model:
            return None
        
        return await self._model_to_schema(hop_model)

    async def get_completed_hops(self, mission_id: str, user_id: int) -> List[Hop]:
        """Get all completed hops for a mission"""
        hop_models = self.db.query(HopModel).filter(
            and_(
                HopModel.mission_id == mission_id,
                HopModel.user_id == user_id,
                HopModel.status == HopStatus.COMPLETED
            )
        ).order_by(HopModel.sequence_order).all()
        
        # Convert models to schemas using asyncio.gather for concurrent execution
        import asyncio
        return await asyncio.gather(*[self._model_to_schema(hop_model) for hop_model in hop_models])

    async def reorder_hops(
        self,
        mission_id: str,
        user_id: int,
        hop_id_order: List[str]
    ) -> List[Hop]:
        """Reorder hops by updating their sequence_order"""
        updated_hops = []
        
        for i, hop_id in enumerate(hop_id_order):
            hop_model = self.db.query(HopModel).filter(
                and_(
                    HopModel.id == hop_id,
                    HopModel.mission_id == mission_id,
                    HopModel.user_id == user_id
                )
            ).first()
            
            if hop_model:
                hop_model.sequence_order = i + 1
                hop_model.updated_at = datetime.utcnow()
                updated_hops.append(await self._model_to_schema(hop_model))
        
        self.db.commit()
        
        return updated_hops 