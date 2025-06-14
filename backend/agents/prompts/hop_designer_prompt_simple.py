from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field
from schemas.chat import Message
from schemas.workflow import Mission, Hop
from schemas.asset import AssetType, CollectionType
from tools.tool_registry import format_tool_descriptions_for_hop_design
from utils.message_formatter import format_assets, format_mission
from .base_prompt_caller import BasePromptCaller
from .mission_prompt_simple import AssetLite

class HopProposal(BaseModel):
    """Structure for a proposed hop"""
    name: str = Field(description="Name of the hop (e.g., 'Extract Email Data', 'Generate Summary Report')")
    description: str = Field(description="Clear description of what this hop accomplishes")
    
    # Maps logical input names to mission state asset IDs
    input_mapping: Dict[str, str] = Field(
        description="Maps local hop state keys to mission asset IDs. Format: {local_key: mission_asset_id}. Values MUST be valid asset IDs from mission.mission_state. The local_key becomes the key in hop.state where the asset will be copied."
    )
    
    output_asset: AssetLite = Field(description="The asset that will be produced by this hop")
    
    # If this is a final hop producing a mission output
    output_mission_asset_id: Optional[str] = Field(
        default=None,
        description="ID of the mission output asset this hop produces (if final hop)"
    )
    
    is_final: bool = Field(description="Whether this hop produces the final deliverable")
    rationale: str = Field(description="Explanation of why this is the right next step")
    alternative_approaches: Optional[List[str]] = Field(default=None, description="Other approaches considered")

class HopDesignResponse(BaseModel):
    """Structure for hop design response"""
    response_type: str = Field(description="Type of response: HOP_PROPOSAL or INTERVIEW_QUESTION")
    response_content: str = Field(description="The main response text to add to the conversation")
    hop_proposal: Optional[HopProposal] = Field(default=None, description="Proposed hop details")
    reasoning: Optional[str] = Field(default=None, description="Detailed reasoning about the hop design")

class HopDesignerPromptCaller(BasePromptCaller):
    """A simplified prompt caller for hop design"""
    
    def __init__(self):
        # Define the system message
        system_message = """You are an AI assistant that designs incremental steps (hops) to accomplish missions. Your role is to analyze the current state and propose the next logical step toward completing the mission.

## Core Functions
1. **Analyze** the mission goal and current progress
2. **Identify** what assets are available and what's still needed
3. **Design** the next hop that moves closer to the goal
4. **Validate** that the hop is achievable with available tools

## Available Tools
The system has these specific tools available for hop implementation:

{tool_descriptions}

## Hop Design Principles

1. **Incremental Progress**: Each hop should make meaningful progress toward the mission goal. A hop is NOT necessarily intended to complete the entire mission in one go.

2. **Tractability and Verifiability**: Design hops that are "right-sized" – complex enough to be useful, but simple enough to be implemented and verified reliably.

3. **Cohesive Goal**: Each hop should have a single, clear, and cohesive goal. What one specific outcome does this hop achieve?

4. **Input/Output Focus**: 
   - Input mapping MUST use EXACT asset IDs from mission.mission_state
   - NEVER use asset names or values in input_mapping
   - Example: `"input_mapping": {{"email_credentials": "ed4dff20-269e-403b-a203-72e251a51dc1"}}`
   - The output of this hop becomes a potential input for the next

5. **Tool Awareness**: Consider the available tools. Can the proposed transformation be realistically achieved by a sequence of tool steps?

## Current Context
Mission: {mission}
Available Assets: {available_assets}
Completed Hops: {completed_hops}

Based on this context and the available tools, design the next hop that will move us closer to completing the mission."""

        # Initialize the base class
        super().__init__(
            response_model=HopDesignResponse,
            system_message=system_message
        )
    
    async def invoke(
        self,
        messages: List[Message],
        mission: Mission,
        available_assets: List[Dict[str, Any]] = None,
        completed_hops: List[Hop] = None,
        **kwargs: Dict[str, Any]
    ) -> HopDesignResponse:
        """
        Invoke the hop design prompt.
        
        Args:
            messages: List of conversation messages
            mission: Current mission state
            available_assets: List of available assets
            completed_hops: List of completed hops
            **kwargs: Additional variables to format into the prompt
            
        Returns:
            Parsed response as a HopDesignResponse
        """
        # Format tool descriptions
        tool_descriptions = format_tool_descriptions_for_hop_design()
        
        # Format available assets and mission
        assets_str = format_assets(available_assets)
        mission_str = format_mission(mission)
        
        # Format completed hops
        hops_str = "None" if not completed_hops else "\n".join([
            f"- {hop.name}: {hop.description}"
            for hop in completed_hops
        ])
        
        # Call base invoke with formatted variables
        return await super().invoke(
            messages=messages,
            tool_descriptions=tool_descriptions,
            mission=mission_str,
            available_assets=assets_str,
            completed_hops=hops_str,
            **kwargs
        ) 