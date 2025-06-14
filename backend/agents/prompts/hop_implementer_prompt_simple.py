from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field, validator
from datetime import datetime

from tools.tool_registry import format_tool_descriptions_for_implementation
from utils.message_formatter import format_assets, format_mission

from schemas.chat import Message
from schemas.workflow import Mission, Hop, ToolStep, HopStatus
from schemas.asset import Asset, AssetMetadata, AssetStatus

from .base_prompt_caller import BasePromptCaller


class HopLite(BaseModel):
    """
    Represents one step in a mission, containing a sequence of tool steps
    to be executed.
    """
    id: str
    name: str
    description: str
    input_mapping: Dict[str, str] = Field(description="Maps local hop state keys to mission asset IDs for input.")
    output_mapping: Dict[str, str] = Field(description="Maps local hop state keys to mission asset IDs for output.")
    tool_steps: List[ToolStep] = Field(default_factory=list)
    hop_state: Dict[str, Optional[Asset]] = Field(default_factory=dict)
    status: HopStatus = Field(default=HopStatus.HOP_PROPOSED)
    is_final: bool = Field(default=False)
    is_resolved: bool = Field(default=False)

    @validator('hop_state')
    def validate_hop_state(cls, v):
        """Ensure hop_state values are either None or valid Asset objects with proper metadata"""
        current_time = datetime.utcnow().isoformat()
        
        for key, value in v.items():
            if value is not None:
                if not isinstance(value, Asset):
                    # If it's a dict, try to convert it to an Asset
                    if isinstance(value, dict):
                        # Ensure asset_metadata has proper datetime values
                        if 'asset_metadata' in value:
                            metadata = value['asset_metadata']
                            if not metadata.get('createdAt'):
                                metadata['createdAt'] = current_time
                            if not metadata.get('updatedAt'):
                                metadata['updatedAt'] = current_time
                        else:
                            value['asset_metadata'] = {
                                'createdAt': current_time,
                                'updatedAt': current_time,
                                'creator': None,
                                'tags': [],
                                'agent_associations': [],
                                'version': 0,
                                'token_count': 0
                            }
                        
                        # Ensure other required fields are present
                        if 'status' not in value:
                            value['status'] = AssetStatus.PENDING
                        if 'is_collection' not in value:
                            value['is_collection'] = False
                        
                        try:
                            value = Asset(**value)
                        except Exception as e:
                            raise ValueError(f"Failed to convert dict to Asset for key '{key}': {str(e)}")
                    else:
                        raise ValueError(f"hop_state value for key '{key}' must be None, a dict, or an Asset object")
        return v

    @validator('status')
    def validate_status(cls, v):
        """Ensure status is a valid HopStatus value"""
        if not isinstance(v, HopStatus):
            try:
                return HopStatus(v)
            except ValueError:
                raise ValueError(f"Invalid hop status: {v}. Must be one of {[s.value for s in HopStatus]}")
        return v


class HopImplementationResponse(BaseModel):
    """Structure for hop implementation response"""
    response_type: str = Field(
        description="Type of response: IMPLEMENTATION_PLAN, CLARIFICATION_NEEDED, or RESOLUTION_FAILED"
    )
    response_content: str = Field(description="The main response text to add to the conversation")
    hop: Optional[HopLite] = Field(default=None, description="Updated hop with populated tool steps")
    missing_information: Optional[List[str]] = Field(default=None, description="Information needed to complete implementation")
    resolution_failure: Optional[Dict[str, Any]] = Field(
        default=None,
        description="Details about why implementation failed, including failure_type and specific_issues"
    )

    @validator('response_type')
    def validate_response_type(cls, v):
        """Ensure response_type is one of the allowed values"""
        allowed_types = ["IMPLEMENTATION_PLAN", "CLARIFICATION_NEEDED", "RESOLUTION_FAILED"]
        if v not in allowed_types:
            raise ValueError(f"response_type must be one of {allowed_types}")
        return v

    @validator('hop')
    def validate_hop(cls, v, values):
        """Validate hop field based on response_type"""
        if values.get('response_type') == "IMPLEMENTATION_PLAN" and v is None:
            raise ValueError("hop field is required when response_type is IMPLEMENTATION_PLAN")
        return v

    @validator('missing_information')
    def validate_missing_information(cls, v, values):
        """Validate missing_information field based on response_type"""
        if values.get('response_type') == "CLARIFICATION_NEEDED" and not v:
            raise ValueError("missing_information field is required when response_type is CLARIFICATION_NEEDED")
        return v

    @validator('resolution_failure')
    def validate_resolution_failure(cls, v, values):
        """Validate resolution_failure field based on response_type"""
        if values.get('response_type') == "RESOLUTION_FAILED" and not v:
            raise ValueError("resolution_failure field is required when response_type is RESOLUTION_FAILED")
        return v


class HopImplementerPromptCaller(BasePromptCaller):
    """A simplified prompt caller for hop implementation"""
    
    def __init__(self):
        # Define the system message
        system_message = """You are an AI assistant that helps implement hops in a mission workflow. Your primary responsibilities are:

## Core Functions
1. **Analyze** the hop requirements and available assets
2. **Design** a sequence of tool steps to implement the hop
3. **Validate** that the implementation plan is complete and correct
4. **Identify** any missing information needed for implementation

## Available Tools
The system has these specific tools available for hop implementation:

{tool_descriptions}

## Implementation Principles
1. **Incremental Progress**: Each hop should make clear progress toward the mission goal
2. **Tractability**: Each hop should be implementable with available tools
3. **Cohesive Goals**: Each hop should have a clear, focused purpose
4. **Input/Output Focus**: Each hop should clearly map inputs to outputs

## Current Context
Mission Context: {mission}
Current Hop: {current_hop}
Available Assets: {available_assets}

Based on the provided context, analyze what information is complete and what needs clarification to implement the hop effectively."""

        # Initialize the base class
        super().__init__(
            response_model=HopImplementationResponse,
            system_message=system_message
        )
    
    async def invoke(
        self,
        messages: List[Message],
        mission: Mission,
        current_hop: Hop,
        available_assets: List[Dict[str, Any]] = None,
        **kwargs: Dict[str, Any]
    ) -> HopImplementationResponse:
        """
        Invoke the hop implementer prompt.
        
        Args:
            messages: List of conversation messages
            mission: Current mission state
            current_hop: The hop to implement
            available_assets: List of available assets
            **kwargs: Additional variables to format into the prompt
            
        Returns:
            Parsed response as a HopImplementationResponse
        """
        # Format tool descriptions
        tool_descriptions = format_tool_descriptions_for_implementation()
        
        # Format available assets and mission
        assets_str = format_assets(available_assets)
        mission_str = format_mission(mission, context_for_hop=True)
        
        # Format current hop
        hop_str = self._format_hop(current_hop)
        
        # Call base invoke with formatted variables
        return await super().invoke(
            messages=messages,
            tool_descriptions=tool_descriptions,
            mission=mission_str,
            current_hop=hop_str,
            available_assets=assets_str,
            **kwargs
        )
    
    def _format_hop(self, hop: Hop) -> str:
        """Format hop information for the prompt"""
        input_mapping_str = "\n".join([f"  - {local_name} -> {asset_id}" for local_name, asset_id in hop.input_mapping.items()])
        output_mapping_str = "\n".join([f"  - {local_name} -> {asset_id}" for local_name, asset_id in hop.output_mapping.items()])
        
        return f"""Hop Name: {hop.name}
Description: {hop.description}
Input Mapping:
{input_mapping_str}
Output Mapping:
{output_mapping_str}
Status: {hop.status.value}""" 