"""
Mission Context Builder Service

This module provides structured methods for preparing missions for different contexts
throughout the application. It replaces ad hoc context preparation functions and ensures
consistent mission representation across different use cases.

Context Types:
1. Chat Context - Sanitized missions for chat interactions
2. API Context - Full missions for API responses
3. State Context - Serialized missions for state management
4. Agent Context - Enriched missions for agent processing
5. Frontend Context - Typed missions for UI components

Usage:
    builder = MissionContextBuilder(asset_service, mission_transformer)
    
    # Prepare context for specific use cases
    chat_context = await builder.prepare_chat_context(mission, user_id, db)
    api_context = await builder.prepare_api_context(mission, include_assets=True)
    state_context = builder.prepare_state_context(mission)
"""

from typing import Dict, Any, Optional, List, Union
from datetime import datetime
from sqlalchemy.orm import Session

from schemas.workflow import Mission

from services.asset_service import AssetService
from services.asset_summary_service import AssetSummaryService
from services.mission_transformer import MissionTransformer, SanitizedMission, SerializedMission


class MissionContextBuilder:
    """Structured mission context preparation service"""
    
    def __init__(
        self, 
        asset_service: Optional[AssetService] = None,
        mission_transformer: Optional[MissionTransformer] = None
    ):
        self.asset_service = asset_service
        self.mission_transformer = mission_transformer or MissionTransformer(asset_service)
        self.asset_summary_service = AssetSummaryService() if asset_service else None
    
    async def prepare_chat_context(
        self, 
        mission: Optional[Mission], 
        user_id: int, 
        db: Session,
        additional_payload: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Prepare complete chat context with sanitized mission and asset summaries.
        
        Args:
            mission: The mission to include in context
            user_id: User ID for asset fetching
            db: Database session
            additional_payload: Any additional payload data
            
        Returns:
            Complete chat context payload
        """
        # Start with base payload
        payload = {
            "mission": None,
            "asset_summaries": {},
            "mission_summary": None
        }
        
        # Add sanitized mission if available
        if mission:
            try:
                sanitized_mission = self.mission_transformer.sanitize_for_chat(mission)
                payload["mission"] = sanitized_mission.model_dump()
                payload["mission_summary"] = self._create_mission_summary(sanitized_mission)
            except Exception as e:
                print(f"Failed to sanitize mission for chat: {e}")
                payload["mission"] = None
        
        # Add asset summaries
        if self.asset_service and self.asset_summary_service:
            try:
                asset_summaries = await self._get_asset_summaries(user_id, db)
                payload["asset_summaries"] = asset_summaries
            except Exception as e:
                print(f"Failed to get asset summaries: {e}")
                payload["asset_summaries"] = {}
        
        # Add additional payload if provided
        if additional_payload:
            payload.update(additional_payload)
        
        return payload
    
    async def prepare_api_context(
        self, 
        mission: Mission, 
        include_assets: bool = True,
        include_hops: bool = True,
        include_metadata: bool = True
    ) -> Dict[str, Any]:
        """
        Prepare mission context for API responses.
        
        Args:
            mission: The mission to prepare
            include_assets: Whether to include full asset details
            include_hops: Whether to include hop details
            include_metadata: Whether to include metadata
            
        Returns:
            API-ready mission context
        """
        context = {
            "mission": mission.model_dump(),
            "statistics": self._calculate_mission_statistics(mission)
        }
        
        if not include_assets:
            # Remove asset content but keep structure
            context["mission"]["mission_state"] = {
                asset_id: {
                    "id": asset.id,
                    "name": asset.name,
                    "type": asset.schema_definition.type,
                    "status": asset.status.value,
                    "role": asset.role.value
                }
                for asset_id, asset in mission.mission_state.items()
            }
        
        if not include_hops:
            context["mission"]["hops"] = []
            context["mission"]["current_hop"] = None
        
        if not include_metadata:
            context["mission"]["mission_metadata"] = {}
        
        return context
    
    def prepare_state_context(self, mission: Mission) -> Dict[str, Any]:
        """
        Prepare mission context for state management.
        
        Args:
            mission: The mission to serialize
            
        Returns:
            State-ready mission context
        """
        try:
            serialized_mission = self.mission_transformer.serialize_for_state(mission)
            return {
                "mission": serialized_mission.model_dump(),
                "state_metadata": {
                    "serialized_at": datetime.utcnow().isoformat(),
                    "asset_count": len(mission.mission_state),
                    "hop_count": len(mission.hops),
                    "status": mission.status.value
                }
            }
        except Exception as e:
            print(f"Failed to prepare state context: {e}")
            return {"mission": None, "state_metadata": None}
    
    async def prepare_agent_context(
        self, 
        mission: Mission, 
        user_id: int, 
        db: Session,
        include_tool_descriptions: bool = True
    ) -> Dict[str, Any]:
        """
        Prepare enriched mission context for agent processing.
        
        Args:
            mission: The mission to prepare
            user_id: User ID for asset access
            db: Database session
            include_tool_descriptions: Whether to include tool descriptions
            
        Returns:
            Agent-ready mission context
        """
        context = {
            "mission": mission.model_dump(),
            "mission_analysis": self._analyze_mission_for_agent(mission),
            "asset_analysis": self._analyze_assets_for_agent(mission)
        }
        
        # Add asset summaries for agent context
        if self.asset_service and self.asset_summary_service:
            try:
                asset_summaries = await self._get_asset_summaries(user_id, db)
                context["asset_summaries"] = asset_summaries
            except Exception as e:
                print(f"Failed to get asset summaries for agent: {e}")
                context["asset_summaries"] = {}
        
        # Add tool descriptions if requested
        if include_tool_descriptions:
            # This would be imported from utils.message_formatter
            from utils.message_formatter import format_tool_descriptions_for_mission_design
            context["tool_descriptions"] = format_tool_descriptions_for_mission_design()
        
        return context
    
    def prepare_frontend_context(self, mission: Mission) -> Dict[str, Any]:
        """
        Prepare mission context for frontend consumption.
        
        Args:
            mission: The mission to prepare
            
        Returns:
            Frontend-ready mission context
        """
        # Convert to dict with proper typing
        mission_dict = mission.model_dump()
        
        # Add computed fields for frontend
        mission_dict["computed_fields"] = {
            "input_count": len(mission.get_inputs()),
            "output_count": len(mission.get_outputs()),
            "intermediate_count": len([
                asset for asset in mission.mission_state.values() 
                if asset.role.value == 'intermediate'
            ]),
            "completion_percentage": self._calculate_completion_percentage(mission),
            "last_activity": self._get_last_activity_time(mission)
        }
        
        return {
            "mission": mission_dict,
            "ui_metadata": {
                "can_start_hop": self._can_start_hop(mission),
                "can_complete_mission": self._can_complete_mission(mission),
                "next_actions": self._get_next_actions(mission)
            }
        }
    
    async def _get_asset_summaries(self, user_id: int, db: Session) -> Dict[str, str]:
        """Get asset summaries for context enrichment"""
        try:
            assets = self.asset_service.get_user_assets(user_id)
            asset_summaries = {}
            
            for asset in assets:
                summary = self.asset_summary_service.create_asset_summary(asset)
                asset_summaries[asset.id] = summary.summary
            
            return asset_summaries
        except Exception as e:
            print(f"Failed to create asset summaries: {e}")
            return {}
    
    def _create_mission_summary(self, sanitized_mission: SanitizedMission) -> Dict[str, Any]:
        """Create a high-level mission summary"""
        return {
            "name": sanitized_mission.name,
            "goal": sanitized_mission.goal,
            "status": sanitized_mission.status,
            "progress": {
                "input_assets": len(sanitized_mission.input_assets),
                "output_assets": len(sanitized_mission.output_assets),
                "intermediate_assets": len(sanitized_mission.intermediate_assets),
                "hop_count": sanitized_mission.hop_count
            },
            "next_steps": self._determine_next_steps(sanitized_mission)
        }
    
    def _calculate_mission_statistics(self, mission: Mission) -> Dict[str, Any]:
        """Calculate mission statistics for API context"""
        return {
            "total_assets": len(mission.mission_state),
            "input_assets": len(mission.get_inputs()),
            "output_assets": len(mission.get_outputs()),
            "intermediate_assets": len([
                asset for asset in mission.mission_state.values() 
                if asset.role.value == 'intermediate'
            ]),
            "total_hops": len(mission.hops),
            "completed_hops": len([hop for hop in mission.hops if hop.status.value == 'completed']),
            "mission_age_days": (datetime.utcnow() - mission.created_at).days
        }
    
    def _analyze_mission_for_agent(self, mission: Mission) -> Dict[str, Any]:
        """Analyze mission for agent processing"""
        return {
            "status": mission.status.value,
            "readiness": self._assess_mission_readiness(mission),
            "blockers": self._identify_blockers(mission),
            "recommendations": self._generate_recommendations(mission)
        }
    
    def _analyze_assets_for_agent(self, mission: Mission) -> Dict[str, Any]:
        """Analyze assets for agent processing"""
        inputs = mission.get_inputs()
        outputs = mission.get_outputs()
        
        return {
            "input_readiness": {
                "ready_count": len([a for a in inputs if a.status.value == 'ready']),
                "pending_count": len([a for a in inputs if a.status.value == 'pending']),
                "total_count": len(inputs)
            },
            "output_targets": {
                "defined_count": len(outputs),
                "completed_count": len([a for a in outputs if a.status.value == 'ready']),
                "remaining_count": len([a for a in outputs if a.status.value != 'ready'])
            }
        }
    
    def _determine_next_steps(self, sanitized_mission: SanitizedMission) -> List[str]:
        """Determine next steps for mission"""
        if sanitized_mission.status == 'proposed':
            return ["Review and approve mission", "Provide input assets"]
        elif sanitized_mission.status == 'ready_for_next_hop':
            return ["Design next hop", "Execute hop"]
        elif sanitized_mission.status == 'completed':
            return ["Review results", "Export outputs"]
        else:
            return ["Continue current hop", "Monitor progress"]
    
    def _assess_mission_readiness(self, mission: Mission) -> str:
        """Assess mission readiness for execution"""
        inputs = mission.get_inputs()
        ready_inputs = [a for a in inputs if a.status.value == 'ready']
        
        if len(ready_inputs) == len(inputs):
            return "ready"
        elif len(ready_inputs) > 0:
            return "partially_ready"
        else:
            return "not_ready"
    
    def _identify_blockers(self, mission: Mission) -> List[str]:
        """Identify blockers preventing mission progress"""
        blockers = []
        
        # Check for input asset blockers
        inputs = mission.get_inputs()
        pending_inputs = [a for a in inputs if a.status.value == 'pending']
        if pending_inputs:
            blockers.append(f"{len(pending_inputs)} input assets pending")
        
        # Check for execution blockers
        if mission.status.value == 'failed':
            blockers.append("Mission execution failed")
        
        return blockers
    
    def _generate_recommendations(self, mission: Mission) -> List[str]:
        """Generate recommendations for mission improvement"""
        recommendations = []
        
        # Asset recommendations
        if len(mission.get_inputs()) == 0:
            recommendations.append("Add input assets to define required data")
        
        if len(mission.get_outputs()) == 0:
            recommendations.append("Define output assets to clarify deliverables")
        
        # Progress recommendations
        if mission.status.value == 'proposed':
            recommendations.append("Review mission details and start execution")
        
        return recommendations
    
    def _calculate_completion_percentage(self, mission: Mission) -> float:
        """Calculate mission completion percentage"""
        total_outputs = len(mission.get_outputs())
        if total_outputs == 0:
            return 0.0
        
        completed_outputs = len([
            asset for asset in mission.get_outputs() 
            if asset.status.value == 'ready'
        ])
        
        return (completed_outputs / total_outputs) * 100
    
    def _get_last_activity_time(self, mission: Mission) -> str:
        """Get last activity time for mission"""
        return mission.updated_at.isoformat()
    
    def _can_start_hop(self, mission: Mission) -> bool:
        """Determine if mission can start a new hop"""
        return mission.status.value in ['ready_for_next_hop', 'proposed']
    
    def _can_complete_mission(self, mission: Mission) -> bool:
        """Determine if mission can be completed"""
        outputs = mission.get_outputs()
        return all(asset.status.value == 'ready' for asset in outputs)
    
    def _get_next_actions(self, mission: Mission) -> List[str]:
        """Get next available actions for mission"""
        actions = []
        
        if self._can_start_hop(mission):
            actions.append("start_hop")
        
        if self._can_complete_mission(mission):
            actions.append("complete_mission")
        
        if mission.status.value == 'executing_hop':
            actions.append("monitor_progress")
        
        return actions 