"""
Mission Transformation Service

This module provides centralized utilities for converting missions between different
representations used throughout the application. It replaces ad hoc transformation
functions scattered across the codebase.

Mission Representations:
1. Mission (full schema) - Complete business logic representation
2. MissionModel (SQLAlchemy) - Database persistence representation  
3. MissionLite - Simplified representation for LLM proposals
4. SanitizedMission - Lightweight representation for chat contexts
5. SerializedMission - JSON-serializable representation for state management

Usage:
    transformer = MissionTransformer(asset_service)
    
    # Convert between representations
    mission_model = transformer.schema_to_model(mission_schema, user_id)
    mission_schema = await transformer.model_to_schema(mission_model)
    mission_lite = transformer.schema_to_lite(mission_schema)
    
    # Context preparation
    sanitized = transformer.sanitize_for_chat(mission_schema)
    serialized = transformer.serialize_for_state(mission_schema)
"""

from typing import Dict, Any, Optional, List, Union
from datetime import datetime
from uuid import uuid4

from sqlalchemy.orm import Session
from pydantic import BaseModel, ValidationError

from models import Mission as MissionModel, MissionStatus as ModelMissionStatus

from schemas.workflow import Mission, MissionStatus as SchemaMissionStatus
from schemas.lite_models import MissionLite, AssetLite, create_mission_from_lite
from schemas.asset import Asset, AssetStatus, AssetRole, AssetScopeType

from services.asset_service import AssetService


class MissionTransformationError(Exception):
    """Raised when mission transformation fails"""
    pass


class SanitizedMission(BaseModel):
    """Lightweight mission representation for chat contexts"""
    id: str
    name: str
    description: Optional[str] = None
    goal: Optional[str] = None
    success_criteria: List[str] = []
    status: str
    
    # Relationships
    current_hop_id: Optional[str] = None
    current_hop: Optional[Dict[str, Any]] = None
    hop_count: int = 0
    
    # Asset summaries (no content values)
    input_assets: List[Dict[str, Any]] = []
    output_assets: List[Dict[str, Any]] = []
    intermediate_assets: List[Dict[str, Any]] = []
    
    # Metadata
    mission_metadata: Dict[str, Any] = {}
    created_at: datetime
    updated_at: datetime


class SerializedMission(BaseModel):
    """JSON-serializable mission representation for state management"""
    id: str
    name: str
    description: Optional[str] = None
    goal: Optional[str] = None
    success_criteria: List[str] = []
    status: str
    
    # Current hop tracking
    current_hop_id: Optional[str] = None
    current_hop: Optional[Dict[str, Any]] = None
    
    # Asset collection
    mission_state: Dict[str, Dict[str, Any]] = {}
    hops: List[Dict[str, Any]] = []
    
    # Metadata
    mission_metadata: Dict[str, Any] = {}
    created_at: str
    updated_at: str


class MissionTransformer:
    """Centralized mission transformation service"""
    
    def __init__(self, asset_service: Optional[AssetService] = None):
        self.asset_service = asset_service
        self._model_to_schema_status_map = {
            ModelMissionStatus.PROPOSED: SchemaMissionStatus.PROPOSED,
            ModelMissionStatus.READY_FOR_NEXT_HOP: SchemaMissionStatus.READY_FOR_NEXT_HOP,
            ModelMissionStatus.BUILDING_HOP: SchemaMissionStatus.BUILDING_HOP,
            ModelMissionStatus.HOP_READY_TO_EXECUTE: SchemaMissionStatus.HOP_READY_TO_EXECUTE,
            ModelMissionStatus.EXECUTING_HOP: SchemaMissionStatus.EXECUTING_HOP,
            ModelMissionStatus.COMPLETED: SchemaMissionStatus.COMPLETED,
            ModelMissionStatus.FAILED: SchemaMissionStatus.FAILED,
            ModelMissionStatus.CANCELLED: SchemaMissionStatus.CANCELLED
        }
        self._schema_to_model_status_map = {v: k for k, v in self._model_to_schema_status_map.items()}
    
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
    
    def schema_to_lite(self, mission: Mission) -> MissionLite:
        """Convert Mission schema to MissionLite for LLM proposals"""
        try:
            # Extract assets by role
            inputs = [self._asset_to_lite(asset) for asset in mission.get_inputs()]
            outputs = [self._asset_to_lite(asset) for asset in mission.get_outputs()]
            
            return MissionLite(
                name=mission.name,
                description=mission.description or "",
                goal=mission.goal or "",
                success_criteria=mission.success_criteria,
                inputs=inputs,
                outputs=outputs,
                scope=mission.mission_metadata.get('scope', 'Mission scope not specified'),
                metadata=mission.mission_metadata
            )
        except Exception as e:
            raise MissionTransformationError(f"Failed to convert schema to lite: {str(e)}")
    
    def lite_to_schema(self, mission_lite: MissionLite) -> Mission:
        """Convert MissionLite to Mission schema"""
        try:
            return create_mission_from_lite(mission_lite)
        except Exception as e:
            raise MissionTransformationError(f"Failed to convert lite to schema: {str(e)}")
    
    def sanitize_for_chat(self, mission: Mission) -> SanitizedMission:
        """Create sanitized mission representation for chat contexts"""
        try:
            # Sanitize assets by role
            inputs = [self._sanitize_asset(asset) for asset in mission.get_inputs()]
            outputs = [self._sanitize_asset(asset) for asset in mission.get_outputs()]
            intermediates = [
                self._sanitize_asset(asset) 
                for asset in mission.mission_state.values() 
                if asset.role == AssetRole.INTERMEDIATE
            ]
            
            # Sanitize current hop if present
            current_hop = None
            if mission.current_hop:
                current_hop = {
                    "id": mission.current_hop.id,
                    "name": mission.current_hop.name,
                    "description": mission.current_hop.description,
                    "status": mission.current_hop.status.value,
                    "sequence_order": mission.current_hop.sequence_order
                }
            
            return SanitizedMission(
                id=mission.id,
                name=mission.name,
                description=mission.description,
                goal=mission.goal,
                success_criteria=mission.success_criteria,
                status=mission.status.value,
                current_hop_id=mission.current_hop_id,
                current_hop=current_hop,
                hop_count=len(mission.hops),
                input_assets=inputs,
                output_assets=outputs,
                intermediate_assets=intermediates,
                mission_metadata=mission.mission_metadata,
                created_at=mission.created_at,
                updated_at=mission.updated_at
            )
        except Exception as e:
            raise MissionTransformationError(f"Failed to sanitize mission: {str(e)}")
    
    def serialize_for_state(self, mission: Mission) -> SerializedMission:
        """Create serialized mission representation for state management"""
        try:
            # Serialize mission state assets
            mission_state = {}
            for asset_id, asset in mission.mission_state.items():
                mission_state[asset_id] = {
                    "id": asset.id,
                    "name": asset.name,
                    "description": asset.description,
                    "type": asset.schema_definition.type,
                    "subtype": asset.subtype,
                    "status": asset.status.value,
                    "role": asset.role.value,
                    "scope_type": asset.scope_type.value,
                    "scope_id": asset.scope_id,
                    "value_representation": asset.value_representation,
                    "created_at": asset.created_at.isoformat(),
                    "updated_at": asset.updated_at.isoformat()
                }
            
            # Serialize hops
            hops = []
            for hop in mission.hops:
                hops.append({
                    "id": hop.id,
                    "name": hop.name,
                    "description": hop.description,
                    "status": hop.status.value,
                    "sequence_order": hop.sequence_order,
                    "created_at": hop.created_at.isoformat(),
                    "updated_at": hop.updated_at.isoformat()
                })
            
            return SerializedMission(
                id=mission.id,
                name=mission.name,
                description=mission.description,
                goal=mission.goal,
                success_criteria=mission.success_criteria,
                status=mission.status.value,
                current_hop_id=mission.current_hop_id,
                current_hop=self._serialize_hop(mission.current_hop) if mission.current_hop else None,
                mission_state=mission_state,
                hops=hops,
                mission_metadata=mission.mission_metadata,
                created_at=mission.created_at.isoformat(),
                updated_at=mission.updated_at.isoformat()
            )
        except Exception as e:
            raise MissionTransformationError(f"Failed to serialize mission: {str(e)}")
    
    def _asset_to_lite(self, asset: Asset) -> AssetLite:
        """Convert Asset to AssetLite"""
        return AssetLite(
            name=asset.name,
            description=asset.description,
            agent_specification=asset.asset_metadata.get('agent_specification', asset.description),
            type=asset.schema_definition.type,
            subtype=asset.subtype,
            is_array=asset.schema_definition.is_array,
            role=asset.role.value,
            example_value=asset.asset_metadata.get('example_value'),
            external_system_for=asset.asset_metadata.get('external_system_for')
        )
    
    def _sanitize_asset(self, asset: Asset) -> Dict[str, Any]:
        """Sanitize asset for chat context (remove content values)"""
        return {
            "id": asset.id,
            "name": asset.name,
            "description": asset.description,
            "type": asset.schema_definition.type,
            "subtype": asset.subtype,
            "status": asset.status.value,
            "role": asset.role.value,
            "scope_type": asset.scope_type.value,
            "token_count": asset.asset_metadata.get('token_count', 0) if asset.asset_metadata else 0,
            "created_at": asset.created_at.isoformat(),
            "updated_at": asset.updated_at.isoformat()
        }
    
    def _serialize_hop(self, hop) -> Dict[str, Any]:
        """Serialize hop for state management"""
        if not hop:
            return None
            
        return {
            "id": hop.id,
            "name": hop.name,
            "description": hop.description,
            "status": hop.status.value,
            "sequence_order": hop.sequence_order,
            "created_at": hop.created_at.isoformat(),
            "updated_at": hop.updated_at.isoformat()
        }
    
    def _map_schema_status_to_model(self, schema_status: SchemaMissionStatus) -> ModelMissionStatus:
        """Map schema status to model status"""
        return self._schema_to_model_status_map.get(schema_status, ModelMissionStatus.PROPOSED)
    
    def _map_model_status_to_schema(self, model_status: ModelMissionStatus) -> SchemaMissionStatus:
        """Map model status to schema status"""
        return self._model_to_schema_status_map.get(model_status, SchemaMissionStatus.PROPOSED) 