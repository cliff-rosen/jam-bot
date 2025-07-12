"""
Mission Transformation Service

This module provides utilities for converting missions between the representations
actually used in the application. Focuses on core transformations only.

Core transformations:
1. Mission schema ↔ Database models (for persistence)
2. MissionLite → Mission schema (for LLM proposals)
3. Simple mission sanitization (for chat contexts)
4. Status enum mapping

Usage:
    transformer = MissionTransformer(asset_service)
    
    # Core database operations
    mission_model = transformer.schema_to_model(mission_schema, user_id)
    mission_schema = await transformer.model_to_schema(mission_model)
    
    # LLM proposal handling
    mission = transformer.lite_to_schema(mission_lite)
    
    # Simple chat sanitization
    sanitized_dict = transformer.sanitize_for_chat(mission)
"""

from typing import Dict, Any, Optional, List, Union
from datetime import datetime

from models import Mission as MissionModel, MissionStatus as ModelMissionStatus
from schemas.workflow import (
    Mission, 
    MissionStatus as SchemaMissionStatus, 
    Hop,
    SanitizedAsset,
    SanitizedHop,
    SanitizedMission
)
from schemas.lite_models import MissionLite, create_mission_from_lite
from schemas.asset import Asset, AssetRole
from services.asset_service import AssetService


class MissionTransformationError(Exception):
    """Raised when mission transformation fails"""
    pass


class MissionTransformer:
    """Simplified mission transformation service"""
    
    def __init__(self, asset_service: Optional[AssetService] = None) -> None:
        self.asset_service = asset_service
        # Status mappings between models and schemas
        self._model_to_schema_status_map = {
            ModelMissionStatus.AWAITING_APPROVAL: SchemaMissionStatus.AWAITING_APPROVAL,
            ModelMissionStatus.IN_PROGRESS: SchemaMissionStatus.IN_PROGRESS,
            ModelMissionStatus.COMPLETED: SchemaMissionStatus.COMPLETED,
            ModelMissionStatus.FAILED: SchemaMissionStatus.FAILED,
            ModelMissionStatus.CANCELLED: SchemaMissionStatus.CANCELLED,
        }
        
        self._schema_to_model_status_map = {
            SchemaMissionStatus.AWAITING_APPROVAL: ModelMissionStatus.AWAITING_APPROVAL,
            SchemaMissionStatus.IN_PROGRESS: ModelMissionStatus.IN_PROGRESS,
            SchemaMissionStatus.COMPLETED: ModelMissionStatus.COMPLETED,
            SchemaMissionStatus.FAILED: ModelMissionStatus.FAILED,
            SchemaMissionStatus.CANCELLED: ModelMissionStatus.CANCELLED,
        }
    
    def schema_to_model(self, mission: Mission, user_id: int) -> MissionModel:
        """Convert Mission schema to MissionModel for database persistence"""
        try:
            return MissionModel(
                id=mission.id,
                user_id=user_id,
                name=mission.name,
                description=mission.description,
                goal=mission.goal,
                status=self._map_schema_status_to_model(mission.status),
                success_criteria=mission.success_criteria,
                current_hop_id=mission.current_hop_id,
                mission_metadata=mission.mission_metadata,
                created_at=mission.created_at,
                updated_at=mission.updated_at
            )
        except Exception as e:
            raise MissionTransformationError(f"Failed to convert schema to model: {str(e)}")
    
    async def model_to_schema(self, mission_model: MissionModel, load_assets: bool = True) -> Mission:
        """Convert MissionModel to Mission schema with optional asset loading"""
        try:
            mission_state = {}
            
            if load_assets and self.asset_service:
                # Load mission assets
                assets = self.asset_service.get_assets_by_scope(
                    user_id=mission_model.user_id,
                    scope_type="mission",
                    scope_id=mission_model.id
                )
                mission_state = {asset.id: asset for asset in assets}
            
            return Mission(
                id=mission_model.id,
                name=mission_model.name,
                description=mission_model.description,
                goal=mission_model.goal,
                status=self._map_model_status_to_schema(mission_model.status),
                success_criteria=mission_model.success_criteria or [],
                current_hop_id=mission_model.current_hop_id,
                mission_metadata=mission_model.mission_metadata or {},
                mission_state=mission_state,
                created_at=mission_model.created_at,
                updated_at=mission_model.updated_at
            )
        except Exception as e:
            raise MissionTransformationError(f"Failed to convert model to schema: {str(e)}")
    
    def lite_to_schema(self, mission_lite: MissionLite) -> Mission:
        """Convert MissionLite to Mission schema (used for LLM proposals)"""
        try:
            return create_mission_from_lite(mission_lite)
        except Exception as e:
            raise MissionTransformationError(f"Failed to convert lite to schema: {str(e)}")
    
    def sanitize_for_chat(self, mission: Optional[Mission]) -> Union[SanitizedMission, Dict[str, Any]]:
        """Create simple sanitized dict for chat contexts (removes large content values)"""
        if not mission:
            return {}
        
        try:
            # Simple asset sanitization - just metadata, no content
            def sanitize_asset(asset: Asset) -> SanitizedAsset:
                return {
                    "id": asset.id,
                    "name": asset.name,
                    "description": asset.description,
                    "type": asset.schema_definition.type,
                    "subtype": asset.subtype,
                    "status": asset.status.value,
                    "role": asset.role.value,
                    "scope_type": asset.scope_type.value,
                    "token_count": asset.asset_metadata.get('token_count', 0) if asset.asset_metadata else 0
                }
            
            # Sanitize mission state assets
            sanitized_mission_state = {
                asset_id: sanitize_asset(asset)
                for asset_id, asset in mission.mission_state.items()
            }
            
            # Simple hop sanitization
            current_hop = None
            if mission.current_hop:
                current_hop = {
                    "id": mission.current_hop.id,
                    "name": mission.current_hop.name,
                    "description": mission.current_hop.description,
                    "status": mission.current_hop.status.value,
                    "sequence_order": mission.current_hop.sequence_order
                }
            
            hops = []
            for hop in mission.hops:
                hops.append({
                    "id": hop.id,
                    "name": hop.name,
                    "description": hop.description,
                    "status": hop.status.value,
                    "sequence_order": hop.sequence_order
                })
            
            return {
                "id": mission.id,
                "name": mission.name,
                "description": mission.description,
                "goal": mission.goal,
                "success_criteria": mission.success_criteria,
                "status": mission.status.value,
                "current_hop_id": mission.current_hop_id,
                "current_hop": current_hop,
                "hops": hops,
                "mission_state": sanitized_mission_state,
                "mission_metadata": mission.mission_metadata,
                "created_at": mission.created_at.isoformat(),
                "updated_at": mission.updated_at.isoformat()
            }
        except Exception as e:
            raise MissionTransformationError(f"Failed to sanitize mission: {str(e)}")
    
    def sanitize_asset(self, asset: Asset) -> SanitizedAsset:
        """Sanitize an asset for chat context by removing large content values"""
        return {
            "id": asset.id,
            "name": asset.name,
            "description": asset.description,
            "type": asset.schema_definition.type,
            "subtype": asset.subtype,
            "status": asset.status.value,
            "role": asset.role.value,
            "scope_type": asset.scope_type.value,
            "token_count": asset.asset_metadata.get('token_count', 0) if asset.asset_metadata else 0
        }
    
    def sanitize_hop(self, hop: Hop) -> SanitizedHop:
        """Sanitize a hop for chat context by removing large content values"""
        return {
            "id": hop.id,
            "name": hop.name,
            "description": hop.description,
            "status": hop.status.value,
            "sequence_order": hop.sequence_order
        }
    
    def _map_schema_status_to_model(self, schema_status: SchemaMissionStatus) -> ModelMissionStatus:
        """Map schema status to model status"""
        return self._schema_to_model_status_map.get(schema_status, ModelMissionStatus.AWAITING_APPROVAL)
    
    def _map_model_status_to_schema(self, model_status: ModelMissionStatus) -> SchemaMissionStatus:
        """Map model status to schema status"""
        return self._model_to_schema_status_map.get(model_status, SchemaMissionStatus.AWAITING_APPROVAL) 