from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from datetime import datetime
import json
from uuid import uuid4

from models import Mission as MissionModel, MissionStatus
from schemas.workflow import Mission, Hop, MissionStatus as SchemaMissionStatus
from schemas.asset import Asset
from services.asset_service import AssetService


class MissionService:
    def __init__(self, db: Session):
        self.db = db
        self.asset_service = AssetService(db)
    
    async def create_mission(self, user_id: int, mission: Mission) -> str:
        """Create a new mission in the database"""
        mission_id = str(uuid4())
        
        # Extract asset IDs from mission
        input_asset_ids = [asset.id for asset in mission.inputs] if mission.inputs else []
        output_asset_ids = [asset.id for asset in mission.outputs] if mission.outputs else []
        mission_state_asset_ids = {name: asset.id for name, asset in mission.mission_state.items()} if mission.mission_state else {}
        
        # Convert current hop to JSON
        current_hop_json = None
        if mission.current_hop:
            current_hop_json = self._hop_to_json(mission.current_hop)
        
        # Convert hop history to JSON
        hop_history_json = []
        if mission.hop_history:
            hop_history_json = [self._hop_to_json(hop) for hop in mission.hop_history]
        
        # Map schema status to model status
        status = self._map_schema_status_to_model(mission.mission_status)
        
        # Create mission model
        mission_model = MissionModel(
            id=mission_id,
            user_id=user_id,
            name=mission.name,
            description=mission.description,
            goal=mission.goal,
            status=status,
            success_criteria=mission.success_criteria,
            current_hop=current_hop_json,
            hop_history=hop_history_json,
            input_asset_ids=input_asset_ids,
            output_asset_ids=output_asset_ids,
            mission_state_asset_ids=mission_state_asset_ids
        )
        
        self.db.add(mission_model)
        self.db.commit()
        self.db.refresh(mission_model)
        
        return mission_id
    
    async def get_mission(self, mission_id: str, user_id: int) -> Optional[Mission]:
        """Get a mission by ID and reconstruct the full Mission object"""
        mission_model = self.db.query(MissionModel).filter(
            MissionModel.id == mission_id,
            MissionModel.user_id == user_id
        ).first()
        
        if not mission_model:
            return None
        
        return await self._model_to_mission(mission_model)
    
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
        mission_model.status = self._map_schema_status_to_model(mission.mission_status)
        mission_model.success_criteria = mission.success_criteria
        mission_model.updated_at = datetime.utcnow()
        
        # Update current hop
        if mission.current_hop:
            mission_model.current_hop = self._hop_to_json(mission.current_hop)
        else:
            mission_model.current_hop = None
        
        # Update hop history
        if mission.hop_history:
            mission_model.hop_history = [self._hop_to_json(hop) for hop in mission.hop_history]
        else:
            mission_model.hop_history = []
        
        # Update asset IDs
        mission_model.input_asset_ids = [asset.id for asset in mission.inputs] if mission.inputs else []
        mission_model.output_asset_ids = [asset.id for asset in mission.outputs] if mission.outputs else []
        mission_model.mission_state_asset_ids = {name: asset.id for name, asset in mission.mission_state.items()} if mission.mission_state else {}
        
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
        
        missions = []
        for model in mission_models:
            mission = await self._model_to_mission(model)
            if mission:
                missions.append(mission)
        
        return missions
    
    def _hop_to_json(self, hop: Hop) -> Dict[str, Any]:
        """Convert a Hop object to JSON for storage"""
        hop_dict = hop.model_dump(mode='json')
        
        # Convert hop_state assets to asset IDs
        if hop.hop_state:
            hop_dict['hop_state_asset_ids'] = {name: asset.id for name, asset in hop.hop_state.items()}
            del hop_dict['hop_state']  # Remove full assets, keep only IDs
        
        return hop_dict
    
    def _json_to_hop(self, hop_json: Dict[str, Any], hop_state_assets: Dict[str, Asset]) -> Hop:
        """Convert JSON back to Hop object with assets"""
        hop_dict = hop_json.copy()
        
        # Restore hop_state from asset IDs
        if 'hop_state_asset_ids' in hop_dict:
            hop_dict['hop_state'] = hop_state_assets
            del hop_dict['hop_state_asset_ids']
        
        return Hop(**hop_dict)
    
    async def _model_to_mission(self, mission_model: MissionModel) -> Mission:
        """Convert database model to Mission schema object"""
        # Fetch all assets referenced by this mission
        all_asset_ids = set()
        all_asset_ids.update(mission_model.input_asset_ids or [])
        all_asset_ids.update(mission_model.output_asset_ids or [])
        all_asset_ids.update((mission_model.mission_state_asset_ids or {}).values())
        
        # Add asset IDs from current hop
        if mission_model.current_hop and 'hop_state_asset_ids' in mission_model.current_hop:
            all_asset_ids.update(mission_model.current_hop['hop_state_asset_ids'].values())
        
        # Add asset IDs from hop history
        if mission_model.hop_history:
            for hop_json in mission_model.hop_history:
                if 'hop_state_asset_ids' in hop_json:
                    all_asset_ids.update(hop_json['hop_state_asset_ids'].values())
        
        # Fetch all assets
        assets_by_id = {}
        for asset_id in all_asset_ids:
            asset = await self.asset_service.get_asset(asset_id, mission_model.user_id)
            if asset:
                assets_by_id[asset_id] = asset
        
        # Reconstruct mission
        inputs = [assets_by_id[asset_id] for asset_id in (mission_model.input_asset_ids or []) if asset_id in assets_by_id]
        outputs = [assets_by_id[asset_id] for asset_id in (mission_model.output_asset_ids or []) if asset_id in assets_by_id]
        
        mission_state = {}
        for name, asset_id in (mission_model.mission_state_asset_ids or {}).items():
            if asset_id in assets_by_id:
                mission_state[name] = assets_by_id[asset_id]
        
        # Reconstruct current hop
        current_hop = None
        if mission_model.current_hop:
            hop_state_assets = {}
            for name, asset_id in mission_model.current_hop.get('hop_state_asset_ids', {}).items():
                if asset_id in assets_by_id:
                    hop_state_assets[name] = assets_by_id[asset_id]
            current_hop = self._json_to_hop(mission_model.current_hop, hop_state_assets)
        
        # Reconstruct hop history
        hop_history = []
        if mission_model.hop_history:
            for hop_json in mission_model.hop_history:
                hop_state_assets = {}
                for name, asset_id in hop_json.get('hop_state_asset_ids', {}).items():
                    if asset_id in assets_by_id:
                        hop_state_assets[name] = assets_by_id[asset_id]
                hop_history.append(self._json_to_hop(hop_json, hop_state_assets))
        
        return Mission(
            id=mission_model.id,
            name=mission_model.name,
            description=mission_model.description,
            goal=mission_model.goal,
            mission_status=self._map_model_status_to_schema(mission_model.status),
            success_criteria=mission_model.success_criteria or [],
            inputs=inputs,
            outputs=outputs,
            mission_state=mission_state,
            current_hop=current_hop,
            hop_history=hop_history
        )
    
    def _map_schema_status_to_model(self, schema_status: SchemaMissionStatus) -> MissionStatus:
        """Map schema status to model status"""
        mapping = {
            SchemaMissionStatus.PENDING: MissionStatus.PENDING,
            SchemaMissionStatus.ACTIVE: MissionStatus.ACTIVE,
            SchemaMissionStatus.COMPLETED: MissionStatus.COMPLETED,
            SchemaMissionStatus.FAILED: MissionStatus.FAILED
        }
        return mapping.get(schema_status, MissionStatus.PENDING)
    
    def _map_model_status_to_schema(self, model_status: MissionStatus) -> SchemaMissionStatus:
        """Map model status to schema status"""
        mapping = {
            MissionStatus.PENDING: SchemaMissionStatus.PENDING,
            MissionStatus.ACTIVE: SchemaMissionStatus.ACTIVE,
            MissionStatus.COMPLETED: SchemaMissionStatus.COMPLETED,
            MissionStatus.FAILED: SchemaMissionStatus.FAILED,
            MissionStatus.CANCELLED: SchemaMissionStatus.FAILED  # Map cancelled to failed
        }
        return mapping.get(model_status, SchemaMissionStatus.PENDING) 