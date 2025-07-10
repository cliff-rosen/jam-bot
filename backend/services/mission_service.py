from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from datetime import datetime
from uuid import uuid4

from models import Mission as MissionModel, MissionStatus
from schemas.workflow import Mission, MissionStatus as SchemaMissionStatus
from services.asset_service import AssetService
from services.hop_service import HopService


class MissionService:
    def __init__(self, db: Session):
        self.db = db
        self.asset_service = AssetService()
        self.hop_service = HopService(db)
    
    async def create_mission(self, user_id: int, mission: Mission) -> str:
        """Create a new mission in the database"""
        mission_id = str(uuid4())
        
        # Map schema status to model status
        status = self._map_schema_status_to_model(mission.status)
        
        # Create mission model
        mission_model = MissionModel(
            id=mission_id,
            user_id=user_id,
            name=mission.name,
            description=mission.description,
            goal=mission.goal,
            status=status,
            success_criteria=mission.success_criteria,
            mission_metadata=mission.mission_metadata
        )
        
        self.db.add(mission_model)
        self.db.flush()  # Get the mission_id but don't commit yet
        
        # Create assets if they exist in mission_state
        if mission.mission_state:
            asset_service = AssetService()
            try:
                for asset_id, asset in mission.mission_state.items():
                    asset_service.create_asset(
                        user_id=user_id,
                        name=asset.name,
                        type=asset.schema_definition.type,
                        subtype=asset.subtype,
                        description=asset.description,
                        content=asset.value_representation,
                        asset_metadata=asset.asset_metadata,
                        scope_type="mission",
                        scope_id=mission_id,
                        role=asset.role.value
                    )
            finally:
                asset_service.close()
        
        self.db.commit()
        self.db.refresh(mission_model)
        
        return mission_id
    
    async def get_mission(self, mission_id: str, user_id: int) -> Optional[Mission]:
        """Get a mission by ID"""
        mission_model = self.db.query(MissionModel).filter(
            MissionModel.id == mission_id,
            MissionModel.user_id == user_id
        ).first()
        
        if not mission_model:
            return None
        
        return self._model_to_mission(mission_model)
    
    async def update_mission(self, mission_id: str, user_id: int, mission: Mission) -> bool:
        """Update an existing mission"""
        mission_model = self.db.query(MissionModel).filter(
            MissionModel.id == mission_id,
            MissionModel.user_id == user_id
        ).first()
        
        if not mission_model:
            return False
        
        # Update fields
        mission_model.name = mission.name
        mission_model.description = mission.description
        mission_model.goal = mission.goal
        mission_model.status = self._map_schema_status_to_model(mission.status)
        mission_model.success_criteria = mission.success_criteria
        mission_model.mission_metadata = mission.mission_metadata
        mission_model.updated_at = datetime.utcnow()
        
        self.db.commit()
        return True
    
    async def update_mission_status(
        self, 
        mission_id: str, 
        user_id: int, 
        status: SchemaMissionStatus
    ) -> bool:
        """Update mission status"""
        mission_model = self.db.query(MissionModel).filter(
            MissionModel.id == mission_id,
            MissionModel.user_id == user_id
        ).first()
        
        if not mission_model:
            return False
        
        mission_model.status = self._map_schema_status_to_model(status)
        mission_model.updated_at = datetime.utcnow()
        
        self.db.commit()
        return True
    
    async def delete_mission(self, mission_id: str, user_id: int) -> bool:
        """Delete a mission"""
        mission_model = self.db.query(MissionModel).filter(
            MissionModel.id == mission_id,
            MissionModel.user_id == user_id
        ).first()
        
        if not mission_model:
            return False
        
        self.db.delete(mission_model)
        self.db.commit()
        return True
    
    async def get_user_missions(self, user_id: int) -> List[Mission]:
        """Get all missions for a user"""
        mission_models = self.db.query(MissionModel).filter(
            MissionModel.user_id == user_id
        ).order_by(MissionModel.updated_at.desc()).all()
        
        return [self._model_to_mission(model) for model in mission_models]
    
    async def get_mission_with_hops(self, mission_id: str, user_id: int) -> Optional[Dict[str, Any]]:
        """Get a mission with its hops and tool steps"""
        mission_model = self.db.query(MissionModel).filter(
            MissionModel.id == mission_id,
            MissionModel.user_id == user_id
        ).first()
        
        if not mission_model:
            return None
        
        # Get mission
        mission = self._model_to_mission(mission_model)
        
        # Get hops for this mission
        hops = await self.hop_service.get_hops_by_mission(mission_id, user_id)
        
        return {
            "mission": mission,
            "hops": hops
        }
    
    def _model_to_mission(self, mission_model: MissionModel) -> Mission:
        """Convert database model to Mission schema object"""
        # Load assets from database
        assets = self.asset_service.get_assets_by_scope(
            user_id=mission_model.user_id,
            scope_type="mission",
            scope_id=mission_model.id
        )
        
        # Create mission_state dict
        mission_state = {asset.id: asset for asset in assets}
        
        return Mission(
            id=mission_model.id,
            name=mission_model.name,
            description=mission_model.description,
            goal=mission_model.goal,
            status=self._map_model_status_to_schema(mission_model.status),
            success_criteria=mission_model.success_criteria or [],
            mission_metadata=mission_model.mission_metadata or {},
            mission_state=mission_state,
            created_at=mission_model.created_at,
            updated_at=mission_model.updated_at
        )
    
    def _map_schema_status_to_model(self, schema_status: SchemaMissionStatus) -> MissionStatus:
        """Map schema status to model status"""
        mapping = {
            SchemaMissionStatus.PROPOSED: MissionStatus.PROPOSED,
            SchemaMissionStatus.READY_FOR_NEXT_HOP: MissionStatus.READY_FOR_NEXT_HOP,
            SchemaMissionStatus.BUILDING_HOP: MissionStatus.BUILDING_HOP,
            SchemaMissionStatus.HOP_READY_TO_EXECUTE: MissionStatus.HOP_READY_TO_EXECUTE,
            SchemaMissionStatus.EXECUTING_HOP: MissionStatus.EXECUTING_HOP,
            SchemaMissionStatus.COMPLETED: MissionStatus.COMPLETED,
            SchemaMissionStatus.FAILED: MissionStatus.FAILED,
            SchemaMissionStatus.CANCELLED: MissionStatus.CANCELLED
        }
        return mapping.get(schema_status, MissionStatus.PROPOSED)
    
    def _map_model_status_to_schema(self, model_status: MissionStatus) -> SchemaMissionStatus:
        """Map model status to schema status"""
        mapping = {
            MissionStatus.PROPOSED: SchemaMissionStatus.PROPOSED,
            MissionStatus.READY_FOR_NEXT_HOP: SchemaMissionStatus.READY_FOR_NEXT_HOP,
            MissionStatus.BUILDING_HOP: SchemaMissionStatus.BUILDING_HOP,
            MissionStatus.HOP_READY_TO_EXECUTE: SchemaMissionStatus.HOP_READY_TO_EXECUTE,
            MissionStatus.EXECUTING_HOP: SchemaMissionStatus.EXECUTING_HOP,
            MissionStatus.COMPLETED: SchemaMissionStatus.COMPLETED,
            MissionStatus.FAILED: SchemaMissionStatus.FAILED,
            MissionStatus.CANCELLED: SchemaMissionStatus.CANCELLED
        }
        return mapping.get(model_status, SchemaMissionStatus.PROPOSED) 