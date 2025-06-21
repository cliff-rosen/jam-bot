from typing import Dict, Any, List, Optional, Union, Tuple
from dataclasses import dataclass
from enum import Enum
from schemas.workflow import Mission, Hop, ToolStep, ExecutionStatus, HopStatus
from schemas.asset import Asset, AssetStatus
from schemas.lite_models import AssetLite, MissionLite, HopLite


class PromptContextType(Enum):
    """Types of prompt contexts that require different asset presentations"""
    MISSION_DEFINITION = "mission_definition"
    HOP_DESIGN = "hop_design" 
    HOP_IMPLEMENTATION = "hop_implementation"
    TOOL_EXECUTION = "tool_execution"
    MISSION_REVIEW = "mission_review"


@dataclass
class PromptContext:
    """Structured context for prompts with categorized assets and metadata"""
    context_type: PromptContextType
    mission_summary: Dict[str, Any]
    available_assets: List[Dict[str, Any]]
    asset_categories: Dict[str, List[Dict[str, Any]]]
    completed_hops: List[Dict[str, Any]]
    current_hop: Optional[Dict[str, Any]]
    metadata: Dict[str, Any]


class PromptContextMapper:
    """
    Comprehensive mapper for converting internal entities to prompt-suitable formats.
    
    This class provides systematic mapping from the internal mission/hop/asset 
    representations to formats that are optimized for different types of prompts.
    """
    
    def __init__(self):
        self.asset_formatters = {
            PromptContextType.MISSION_DEFINITION: self._format_assets_for_mission_definition,
            PromptContextType.HOP_DESIGN: self._format_assets_for_hop_design,
            PromptContextType.HOP_IMPLEMENTATION: self._format_assets_for_hop_implementation,
            PromptContextType.TOOL_EXECUTION: self._format_assets_for_tool_execution,
            PromptContextType.MISSION_REVIEW: self._format_assets_for_mission_review,
        }
        
        self.mission_formatters = {
            PromptContextType.MISSION_DEFINITION: self._format_mission_for_definition,
            PromptContextType.HOP_DESIGN: self._format_mission_for_hop_design,
            PromptContextType.HOP_IMPLEMENTATION: self._format_mission_for_hop_implementation,
            PromptContextType.TOOL_EXECUTION: self._format_mission_for_tool_execution,
            PromptContextType.MISSION_REVIEW: self._format_mission_for_review,
        }
    
    def create_context(
        self,
        context_type: PromptContextType,
        mission: Mission,
        current_hop: Optional[Hop] = None,
        additional_assets: Optional[List[Asset]] = None,
        **kwargs
    ) -> PromptContext:
        """
        Create a comprehensive prompt context for the specified context type.
        
        Args:
            context_type: Type of prompt context needed
            mission: Current mission state
            current_hop: Current hop (if applicable)
            additional_assets: Additional assets to include beyond mission state
            **kwargs: Additional context-specific parameters
            
        Returns:
            Structured prompt context
        """
        # Get mission summary
        mission_summary = self.mission_formatters[context_type](mission, current_hop, **kwargs)
        
        # Get available assets
        available_assets = self._get_available_assets(mission, current_hop, additional_assets)
        formatted_assets = self.asset_formatters[context_type](available_assets, context_type, **kwargs)
        
        # Categorize assets
        asset_categories = self._categorize_assets(formatted_assets, context_type)
        
        # Get completed hops
        completed_hops = self._format_completed_hops(mission.hop_history, context_type)
        
        # Get current hop
        current_hop_formatted = self._format_current_hop(current_hop, context_type) if current_hop else None
        
        # Build metadata
        metadata = self._build_metadata(mission, current_hop, context_type, **kwargs)
        
        return PromptContext(
            context_type=context_type,
            mission_summary=mission_summary,
            available_assets=formatted_assets,
            asset_categories=asset_categories,
            completed_hops=completed_hops,
            current_hop=current_hop_formatted,
            metadata=metadata
        )
    
    def _get_available_assets(
        self, 
        mission: Mission, 
        current_hop: Optional[Hop] = None,
        additional_assets: Optional[List[Asset]] = None
    ) -> List[Asset]:
        """Get all available assets based on context"""
        assets = []
        
        # Add mission state assets
        assets.extend(mission.mission_state.values())
        
        # Add hop state assets if we have a current hop
        if current_hop and current_hop.hop_state:
            assets.extend(current_hop.hop_state.values())
        
        # Add additional assets
        if additional_assets:
            assets.extend(additional_assets)
        
        return assets
    
    def _categorize_assets(
        self, 
        assets: List[Dict[str, Any]], 
        context_type: PromptContextType
    ) -> Dict[str, List[Dict[str, Any]]]:
        """Categorize assets by role and status for better prompt organization"""
        categories = {
            "inputs": [],
            "outputs": [], 
            "intermediate": [],
            "ready": [],
            "pending": [],
            "failed": []
        }
        
        for asset in assets:
            # Categorize by role
            role = asset.get('role', 'intermediate')
            if role == 'input':
                categories["inputs"].append(asset)
            elif role == 'output':
                categories["outputs"].append(asset)
            else:
                categories["intermediate"].append(asset)
            
            # Categorize by status
            status = asset.get('status', 'pending')
            if status == AssetStatus.READY:
                categories["ready"].append(asset)
            elif status == AssetStatus.ERROR:
                categories["failed"].append(asset)
            else:
                categories["pending"].append(asset)
        
        return categories
    
    def _format_completed_hops(
        self, 
        hop_history: List[Hop], 
        context_type: PromptContextType
    ) -> List[Dict[str, Any]]:
        """Format completed hops for prompt context"""
        formatted_hops = []
        
        for hop in hop_history:
            hop_dict = {
                "name": hop.name,
                "description": hop.description,
                "status": hop.status.value if hasattr(hop.status, 'value') else str(hop.status),
                "is_final": hop.is_final,
                "is_resolved": hop.is_resolved,
                "created_at": hop.created_at.isoformat() if hop.created_at else None,
                "completed_at": hop.updated_at.isoformat() if hop.updated_at else None,
            }
            
            # Add context-specific information
            if context_type in [PromptContextType.HOP_DESIGN, PromptContextType.MISSION_REVIEW]:
                hop_dict["output_assets"] = [
                    {"name": asset.name, "type": asset.schema_definition.type, "status": asset.status.value}
                    for asset in hop.hop_state.values()
                    if asset.role == 'output' or asset.role == 'intermediate'
                ]
            
            formatted_hops.append(hop_dict)
        
        return formatted_hops
    
    def _format_current_hop(
        self, 
        hop: Hop, 
        context_type: PromptContextType
    ) -> Optional[Dict[str, Any]]:
        """Format current hop for prompt context"""
        if not hop:
            return None
            
        hop_dict = {
            "name": hop.name,
            "description": hop.description,
            "status": hop.status.value if hasattr(hop.status, 'value') else str(hop.status),
            "is_final": hop.is_final,
            "is_resolved": hop.is_resolved,
            "input_mapping": hop.input_mapping,
            "output_mapping": hop.output_mapping,
        }
        
        # Add context-specific information
        if context_type == PromptContextType.HOP_IMPLEMENTATION:
            hop_dict["tool_steps"] = [
                {
                    "id": step.id,
                    "tool_id": step.tool_id,
                    "description": step.description,
                    "status": step.status.value if hasattr(step.status, 'value') else str(step.status),
                    "parameter_mapping": step.parameter_mapping,
                    "result_mapping": step.result_mapping,
                }
                for step in hop.tool_steps
            ]
        
        return hop_dict
    
    def _build_metadata(
        self, 
        mission: Mission, 
        current_hop: Optional[Hop],
        context_type: PromptContextType,
        **kwargs
    ) -> Dict[str, Any]:
        """Build metadata for the prompt context"""
        metadata = {
            "mission_status": mission.mission_status.value if hasattr(mission.mission_status, 'value') else str(mission.mission_status),
            "execution_status": mission.status.value if hasattr(mission.status, 'value') else str(mission.status),
            "total_hops_completed": len(mission.hop_history),
            "has_current_hop": current_hop is not None,
            "context_type": context_type.value,
        }
        
        # Add context-specific metadata
        if context_type == PromptContextType.HOP_DESIGN:
            metadata["available_tools"] = kwargs.get("available_tools", [])
            metadata["mission_progress"] = self._calculate_mission_progress(mission)
        
        elif context_type == PromptContextType.HOP_IMPLEMENTATION:
            metadata["hop_progress"] = self._calculate_hop_progress(current_hop) if current_hop else 0
            metadata["available_tools"] = kwargs.get("available_tools", [])
        
        return metadata
    
    def _calculate_mission_progress(self, mission: Mission) -> float:
        """Calculate mission completion progress (0.0 to 1.0)"""
        if not mission.outputs:
            return 0.0
        
        ready_outputs = sum(1 for output in mission.outputs if output.status == AssetStatus.READY)
        return ready_outputs / len(mission.outputs)
    
    def _calculate_hop_progress(self, hop: Hop) -> float:
        """Calculate hop completion progress (0.0 to 1.0)"""
        if not hop.tool_steps:
            return 0.0
        
        completed_steps = sum(1 for step in hop.tool_steps if step.status == ExecutionStatus.COMPLETED)
        return completed_steps / len(hop.tool_steps)
    
    # Asset formatters for different context types
    def _format_assets_for_mission_definition(
        self, 
        assets: List[Asset], 
        context_type: PromptContextType,
        **kwargs
    ) -> List[Dict[str, Any]]:
        """Format assets for mission definition prompts"""
        formatted = []
        for asset in assets:
            formatted.append({
                "id": asset.id,
                "name": asset.name,
                "description": asset.description,
                "type": asset.schema_definition.type,
                "role": asset.role,
                "status": asset.status.value if hasattr(asset.status, 'value') else str(asset.status),
                "is_collection": asset.is_collection,
                "collection_type": asset.collection_type,
                "subtype": asset.subtype,
                "external_system_for": asset.asset_metadata.custom_metadata.get("external_system_for") if asset.asset_metadata else None,
                "required": asset.role == 'input',  # Input assets are required
            })
        return formatted
    
    def _format_assets_for_hop_design(
        self, 
        assets: List[Asset], 
        context_type: PromptContextType,
        **kwargs
    ) -> List[Dict[str, Any]]:
        """Format assets for hop design prompts"""
        formatted = []
        for asset in assets:
            formatted.append({
                "id": asset.id,
                "name": asset.name,
                "description": asset.description,
                "type": asset.schema_definition.type,
                "role": asset.role,
                "status": asset.status.value if hasattr(asset.status, 'value') else str(asset.status),
                "is_collection": asset.is_collection,
                "collection_type": asset.collection_type,
                "subtype": asset.subtype,
                "value_preview": self._get_value_preview(asset),
                "is_mission_output": asset.role == 'output',
                "is_mission_input": asset.role == 'input',
            })
        return formatted
    
    def _format_assets_for_hop_implementation(
        self, 
        assets: List[Asset], 
        context_type: PromptContextType,
        **kwargs
    ) -> List[Dict[str, Any]]:
        """Format assets for hop implementation prompts"""
        formatted = []
        for asset in assets:
            formatted.append({
                "id": asset.id,
                "name": asset.name,
                "description": asset.description,
                "type": asset.schema_definition.type,
                "role": asset.role,
                "status": asset.status.value if hasattr(asset.status, 'value') else str(asset.status),
                "is_collection": asset.is_collection,
                "collection_type": asset.collection_type,
                "subtype": asset.subtype,
                "value": asset.value,  # Include full value for tool execution
                "schema_definition": asset.schema_definition.model_dump() if hasattr(asset.schema_definition, 'model_dump') else asset.schema_definition,
            })
        return formatted
    
    def _format_assets_for_tool_execution(
        self, 
        assets: List[Asset], 
        context_type: PromptContextType,
        **kwargs
    ) -> List[Dict[str, Any]]:
        """Format assets for tool execution prompts"""
        formatted = []
        for asset in assets:
            formatted.append({
                "id": asset.id,
                "name": asset.name,
                "description": asset.description,
                "type": asset.schema_definition.type,
                "value": asset.value,
                "schema_definition": asset.schema_definition.model_dump() if hasattr(asset.schema_definition, 'model_dump') else asset.schema_definition,
            })
        return formatted
    
    def _format_assets_for_mission_review(
        self, 
        assets: List[Asset], 
        context_type: PromptContextType,
        **kwargs
    ) -> List[Dict[str, Any]]:
        """Format assets for mission review prompts"""
        formatted = []
        for asset in assets:
            formatted.append({
                "id": asset.id,
                "name": asset.name,
                "description": asset.description,
                "type": asset.schema_definition.type,
                "role": asset.role,
                "status": asset.status.value if hasattr(asset.status, 'value') else str(asset.status),
                "value_preview": self._get_value_preview(asset),
                "created_at": asset.asset_metadata.created_at.isoformat() if asset.asset_metadata and asset.asset_metadata.created_at else None,
                "updated_at": asset.asset_metadata.updated_at.isoformat() if asset.asset_metadata and asset.asset_metadata.updated_at else None,
            })
        return formatted
    
    def _get_value_preview(self, asset: Asset, max_length: int = 100) -> str:
        """Get a preview of the asset value for display purposes"""
        if asset.value is None:
            return "No value"
        
        if isinstance(asset.value, str):
            return asset.value[:max_length] + "..." if len(asset.value) > max_length else asset.value
        
        try:
            value_str = str(asset.value)
            return value_str[:max_length] + "..." if len(value_str) > max_length else value_str
        except:
            return f"[{type(asset.value).__name__}]"
    
    # Mission formatters for different context types
    def _format_mission_for_definition(
        self, 
        mission: Mission, 
        current_hop: Optional[Hop] = None,
        **kwargs
    ) -> Dict[str, Any]:
        """Format mission for definition prompts"""
        return {
            "name": mission.name,
            "description": mission.description,
            "goal": mission.goal,
            "success_criteria": mission.success_criteria,
            "inputs": [{"name": asset.name, "description": asset.description, "type": asset.schema_definition.type} for asset in mission.inputs],
            "outputs": [{"name": asset.name, "description": asset.description, "type": asset.schema_definition.type} for asset in mission.outputs],
            "status": mission.mission_status.value if hasattr(mission.mission_status, 'value') else str(mission.mission_status),
        }
    
    def _format_mission_for_hop_design(
        self, 
        mission: Mission, 
        current_hop: Optional[Hop] = None,
        **kwargs
    ) -> Dict[str, Any]:
        """Format mission for hop design prompts"""
        return {
            "name": mission.name,
            "goal": mission.goal,
            "success_criteria": mission.success_criteria,
            "mission_outputs": [{"id": asset.id, "name": asset.name, "description": asset.description, "status": asset.status.value} for asset in mission.outputs],
            "progress": self._calculate_mission_progress(mission),
            "completed_hops_count": len(mission.hop_history),
        }
    
    def _format_mission_for_hop_implementation(
        self, 
        mission: Mission, 
        current_hop: Optional[Hop] = None,
        **kwargs
    ) -> Dict[str, Any]:
        """Format mission for hop implementation prompts"""
        return {
            "name": mission.name,
            "goal": mission.goal,
            "context": f"Implementing hop: {current_hop.name if current_hop else 'Unknown'}",
        }
    
    def _format_mission_for_tool_execution(
        self, 
        mission: Mission, 
        current_hop: Optional[Hop] = None,
        **kwargs
    ) -> Dict[str, Any]:
        """Format mission for tool execution prompts"""
        return {
            "name": mission.name,
            "current_hop": current_hop.name if current_hop else None,
        }
    
    def _format_mission_for_review(
        self, 
        mission: Mission, 
        current_hop: Optional[Hop] = None,
        **kwargs
    ) -> Dict[str, Any]:
        """Format mission for review prompts"""
        return {
            "name": mission.name,
            "description": mission.description,
            "goal": mission.goal,
            "success_criteria": mission.success_criteria,
            "status": mission.mission_status.value if hasattr(mission.mission_status, 'value') else str(mission.mission_status),
            "progress": self._calculate_mission_progress(mission),
            "completed_hops": len(mission.hop_history),
            "total_assets": len(mission.mission_state),
        }
    
    def to_string_format(self, context: PromptContext) -> Dict[str, str]:
        """
        Convert a PromptContext to string format for legacy compatibility.
        
        Returns:
            Dictionary with string-formatted context for use with existing prompt templates
        """
        # Format mission summary
        mission_str = self._mission_summary_to_string(context.mission_summary, context.context_type)
        
        # Format available assets
        assets_str = self._assets_to_string(context.available_assets, context.context_type)
        
        # Format completed hops
        completed_hops_str = self._completed_hops_to_string(context.completed_hops)
        
        # Format current hop
        current_hop_str = self._current_hop_to_string(context.current_hop) if context.current_hop else ""
        
        return {
            "mission": mission_str,
            "available_assets": assets_str,
            "completed_hops": completed_hops_str,
            "current_hop": current_hop_str,
        }
    
    def _mission_summary_to_string(self, mission_summary: Dict[str, Any], context_type: PromptContextType) -> str:
        """Convert mission summary to string format"""
        if context_type == PromptContextType.MISSION_DEFINITION:
            inputs_str = "\n".join([f"  - {asset['name']} ({asset['type']}): {asset['description']}" for asset in mission_summary.get("inputs", [])])
            outputs_str = "\n".join([f"  - {asset['name']} ({asset['type']}): {asset['description']}" for asset in mission_summary.get("outputs", [])])
            success_criteria_str = "\n".join([f"  - {sc}" for sc in mission_summary.get("success_criteria", [])])
            
            return f"""Mission Name: {mission_summary.get("name", "Unknown")}
Description: {mission_summary.get("description", "No description")}
Goal: {mission_summary.get("goal", "No goal specified")}
Success Criteria:
{success_criteria_str}

Inputs Required by Mission:
{inputs_str}

Expected Final Outputs from Mission:
{outputs_str}"""
        
        elif context_type == PromptContextType.HOP_DESIGN:
            return f"""Mission Name: {mission_summary.get("name", "Unknown")}
Goal: {mission_summary.get("goal", "No goal specified")}
Progress: {mission_summary.get("progress", 0):.1%}
Completed Hops: {mission_summary.get("completed_hops_count", 0)}"""
        
        else:
            return f"""Mission Name: {mission_summary.get("name", "Unknown")}
Goal: {mission_summary.get("goal", "No goal specified")}"""
    
    def _assets_to_string(self, assets: List[Dict[str, Any]], context_type: PromptContextType) -> str:
        """Convert assets to string format"""
        if not assets:
            return "No assets available"
        
        asset_strings = []
        for asset in assets:
            if context_type == PromptContextType.HOP_IMPLEMENTATION:
                asset_str = f"- {asset['name']} (ID: {asset['id']}): {asset['description']} [{asset['type']}] - Status: {asset['status']}"
            else:
                asset_str = f"- {asset['name']} (ID: {asset['id']}): {asset['description']}"
            
            asset_strings.append(asset_str)
        
        return "\n".join(asset_strings)
    
    def _completed_hops_to_string(self, completed_hops: List[Dict[str, Any]]) -> str:
        """Convert completed hops to string format"""
        if not completed_hops:
            return "No hops completed yet"
        
        hop_strings = []
        for hop in completed_hops:
            hop_str = f"- {hop['name']}: {hop['description']}"
            hop_strings.append(hop_str)
        
        return "\n".join(hop_strings)
    
    def _current_hop_to_string(self, current_hop: Dict[str, Any]) -> str:
        """Convert current hop to string format"""
        return f"""
Name: {current_hop.get('name', 'Unknown')}
Description: {current_hop.get('description', 'No description')}
Input Mapping: {current_hop.get('input_mapping', {})}
Output Mapping: {current_hop.get('output_mapping', {})}
Status: {current_hop.get('status', 'Unknown')}
"""


# Global instance for easy access
prompt_context_mapper = PromptContextMapper()
