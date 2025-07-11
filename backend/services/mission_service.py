from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from datetime import datetime
from uuid import uuid4
from fastapi import Depends

from database import get_db
from models import Mission as MissionModel, MissionStatus
from schemas.workflow import Mission, MissionStatus as SchemaMissionStatus

from services.asset_service import AssetService
from services.hop_service import HopService
from services.mission_transformer import MissionTransformer, MissionTransformationError


class MissionService:
    def __init__(self, db: Session):
        self.db = db
        self.asset_service = AssetService(db)
        self.hop_service = HopService(db)
        self.mission_transformer = MissionTransformer(self.asset_service)
    
    async def create_mission(self, user_id: int, mission: Mission) -> str:
        """Create a new mission in the database"""
        try:
            mission_id = str(uuid4())
            
            # Ensure mission has the correct ID
            mission.id = mission_id
            
            # Use transformer to convert schema to model
            mission_model = self.mission_transformer.schema_to_model(mission, user_id)
            
            self.db.add(mission_model)
            self.db.flush()  # Get the mission_id but don't commit yet
            
            # Create assets if they exist in mission_state
            if mission.mission_state:
                for asset_id, asset in mission.mission_state.items():
                    self.asset_service.create_asset(
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
            
            self.db.commit()
            self.db.refresh(mission_model)
            
            return mission_id
            
        except MissionTransformationError as e:
            self.db.rollback()
            raise Exception(f"Failed to create mission: {str(e)}")
        except Exception as e:
            self.db.rollback()
            raise Exception(f"Failed to create mission: {str(e)}")
    
    async def get_mission(self, mission_id: str, user_id: int) -> Optional[Mission]:
        """Get a mission by ID"""
        mission_model = self.db.query(MissionModel).filter(
            MissionModel.id == mission_id,
            MissionModel.user_id == user_id
        ).first()
        
        if not mission_model:
            return None
        
        return await self.mission_transformer.model_to_schema(mission_model)
    
    async def update_mission(self, mission_id: str, user_id: int, mission: Mission) -> bool:
        """Update an existing mission"""
        try:
            mission_model = self.db.query(MissionModel).filter(
                MissionModel.id == mission_id,
                MissionModel.user_id == user_id
            ).first()
            
            if not mission_model:
                return False
            
            # Use transformer to get updated model data
            updated_model = self.mission_transformer.schema_to_model(mission, user_id)
            
            # Update fields
            mission_model.name = updated_model.name
            mission_model.description = updated_model.description
            mission_model.goal = updated_model.goal
            mission_model.status = updated_model.status
            mission_model.success_criteria = updated_model.success_criteria
            mission_model.mission_metadata = updated_model.mission_metadata
            mission_model.updated_at = datetime.utcnow()
            
            self.db.commit()
            return True
            
        except MissionTransformationError as e:
            self.db.rollback()
            raise Exception(f"Failed to update mission: {str(e)}")
        except Exception as e:
            self.db.rollback()
            raise Exception(f"Failed to update mission: {str(e)}")
    
    async def update_mission_status(
        self, 
        mission_id: str, 
        user_id: int, 
        status: SchemaMissionStatus
    ) -> bool:
        """Update mission status"""
        try:
            mission_model = self.db.query(MissionModel).filter(
                MissionModel.id == mission_id,
                MissionModel.user_id == user_id
            ).first()
            
            if not mission_model:
                return False
            
            mission_model.status = self.mission_transformer._map_schema_status_to_model(status)
            mission_model.updated_at = datetime.utcnow()
            
            self.db.commit()
            return True
            
        except Exception as e:
            self.db.rollback()
            raise Exception(f"Failed to update mission status: {str(e)}")
    
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
        
        missions = []
        for model in mission_models:
            try:
                mission = await self.mission_transformer.model_to_schema(model)
                missions.append(mission)
            except MissionTransformationError as e:
                print(f"Failed to transform mission {model.id}: {e}")
                continue
        
        return missions
    
    async def get_mission_with_hops(self, mission_id: str, user_id: int) -> Optional[Dict[str, Any]]:
        """Get a mission with its hops and tool steps"""
        try:
            mission_model = self.db.query(MissionModel).filter(
                MissionModel.id == mission_id,
                MissionModel.user_id == user_id
            ).first()
            
            if not mission_model:
                return None
            
            # Get mission using transformer
            mission = await self.mission_transformer.model_to_schema(mission_model)
            
            # Get hops for this mission
            hops = await self.hop_service.get_hops_by_mission(mission_id, user_id)
            
            return {
                "mission": mission,
                "hops": hops
            }
            
        except MissionTransformationError as e:
            print(f"Failed to get mission with hops: {e}")
            return None
    
    async def coordinate_mission_status_with_hop(
        self, 
        mission_id: str, 
        user_id: int, 
        hop_status: 'HopStatus'
    ) -> bool:
        """
        Coordinate mission status based on hop status changes according to state transition rules.
        
        Rules:
        - Hop PROPOSED → Mission BUILDING_HOP (if mission was READY_FOR_NEXT_HOP)
        - Hop READY_TO_RESOLVE → Mission BUILDING_HOP (if mission was READY_FOR_NEXT_HOP)
        - Hop READY_TO_EXECUTE → Mission HOP_READY_TO_EXECUTE (if mission was BUILDING_HOP)
        - Hop EXECUTING → Mission EXECUTING_HOP (if mission was HOP_READY_TO_EXECUTE)
        - Hop COMPLETED → Mission READY_FOR_NEXT_HOP (if not final hop) or COMPLETED (if final hop)
        - Hop FAILED → Mission FAILED
        - Hop CANCELLED → Mission CANCELLED
        """
        from schemas.workflow import HopStatus
        
        try:
            # Get current mission
            mission = await self.get_mission(mission_id, user_id)
            if not mission:
                return False
            
            # Determine new mission status based on hop status
            new_mission_status = None
            
            if hop_status == HopStatus.PROPOSED:
                # Hop proposed - mission should be in BUILDING_HOP state
                if mission.status == SchemaMissionStatus.READY_FOR_NEXT_HOP:
                    new_mission_status = SchemaMissionStatus.BUILDING_HOP
            
            elif hop_status == HopStatus.READY_TO_RESOLVE:
                # Hop ready to resolve - mission should be in BUILDING_HOP state
                if mission.status == SchemaMissionStatus.READY_FOR_NEXT_HOP:
                    new_mission_status = SchemaMissionStatus.BUILDING_HOP
            
            elif hop_status == HopStatus.READY_TO_EXECUTE:
                # Hop ready to execute - mission should be in HOP_READY_TO_EXECUTE state
                if mission.status == SchemaMissionStatus.BUILDING_HOP:
                    new_mission_status = SchemaMissionStatus.HOP_READY_TO_EXECUTE
            
            elif hop_status == HopStatus.EXECUTING:
                # Hop executing - mission should be in EXECUTING_HOP state
                if mission.status == SchemaMissionStatus.HOP_READY_TO_EXECUTE:
                    new_mission_status = SchemaMissionStatus.EXECUTING_HOP
            
            elif hop_status == HopStatus.COMPLETED:
                # Hop completed - check if it's the final hop
                if mission.status == SchemaMissionStatus.EXECUTING_HOP:
                    # Check if this is the final hop
                    if mission.current_hop and mission.current_hop.is_final:
                        new_mission_status = SchemaMissionStatus.COMPLETED
                    else:
                        new_mission_status = SchemaMissionStatus.READY_FOR_NEXT_HOP
            
            elif hop_status == HopStatus.FAILED:
                # Hop failed - mission should fail
                new_mission_status = SchemaMissionStatus.FAILED
            
            elif hop_status == HopStatus.CANCELLED:
                # Hop cancelled - mission should be cancelled
                new_mission_status = SchemaMissionStatus.CANCELLED
            
            # Update mission status if needed
            if new_mission_status and new_mission_status != mission.status:
                print(f"Coordinating mission status: {mission.status} → {new_mission_status} (hop status: {hop_status})")
                return await self.update_mission_status(mission_id, user_id, new_mission_status)
            
            return True
            
        except Exception as e:
            print(f"Failed to coordinate mission status: {str(e)}")
            return False
    
    # Old transformation methods removed - now handled by MissionTransformer
    # The following methods are deprecated and replaced by centralized transformation:
    # - _model_to_mission -> mission_transformer.model_to_schema
    # - _map_schema_status_to_model -> mission_transformer._map_schema_status_to_model  
    # - _map_model_status_to_schema -> mission_transformer._map_model_status_to_schema


# Dependency function for FastAPI dependency injection
async def get_mission_service(db: Session = Depends(get_db)) -> MissionService:
    """FastAPI dependency that provides MissionService instance"""
    return MissionService(db)