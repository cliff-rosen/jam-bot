from typing import Dict, Any, AsyncIterator, List
import json
import copy  # Needed for deep-copying assets when populating hop state
from datetime import datetime
import uuid
from openai import AsyncOpenAI
from pydantic import BaseModel, Field
from dataclasses import dataclass
import os

from langgraph.graph import StateGraph, START, END
from langgraph.types import StreamWriter, Send, Command

from config.settings import settings

from schemas.chat import Message, MessageRole, AgentResponse
from schemas.workflow import Mission, MissionStatus, HopStatus, Hop, ToolStep, validate_tool_chain
from schemas.asset import Asset, AssetStatus, AssetMetadata
from schemas.lite_models import create_asset_from_lite, HopLite, create_mission_from_lite, NewAssetOutput, ExistingAssetOutput
from schemas.base import SchemaType, ValueType

from agents.prompts.mission_prompt_simple import MissionDefinitionPromptCaller
from agents.prompts.hop_designer_prompt_simple import HopDesignerPromptCaller
from agents.prompts.hop_implementer_prompt_simple import HopImplementerPromptCaller, HopImplementationResponse

from utils.string_utils import canonical_key
from utils.state_serializer import (
    serialize_state, serialize_mission, serialize_hop,
    create_agent_response
)



# Use settings from config
OPENAI_API_KEY = settings.OPENAI_API_KEY
VECTOR_STORE_ID = os.getenv("VECTOR_STORE_ID", "vs_68347e57e7408191a5a775f40db83f44")  # Default to existing store

# Initialize OpenAI client
client = AsyncOpenAI(api_key=OPENAI_API_KEY)

class State(BaseModel):
    """State for the RAVE workflow"""
    messages: List[Message]
    mission: Mission
    tool_params: Dict[str, Any] = {}
    next_node: str
  
    class Config:
        arbitrary_types_allowed = True

def validate_state(state: State) -> bool:
    """Validate the state before processing"""
    return True

def serialize_state(state: State) -> dict:
    """Helper function to serialize state with datetime handling"""
    def convert_datetime(obj):
        if isinstance(obj, datetime):
            return obj.isoformat()
        elif isinstance(obj, dict):
            return {k: convert_datetime(v) for k, v in obj.items()}
        elif isinstance(obj, list):
            return [convert_datetime(item) for item in obj]
        elif hasattr(obj, 'model_dump'):
            return convert_datetime(obj.model_dump())
        return obj

    state_dict = state.model_dump()
    return convert_datetime(state_dict)

async def supervisor_node(state: State, writer: StreamWriter, config: Dict[str, Any]) -> AsyncIterator[Dict[str, Any]]:
    """Supervisor node that routes to appropriate specialist based on mission and hop status"""
    print("Supervisor - Routing based on mission and hop status")
    print(f"DEBUG: Mission status: {state.mission.mission_status}")
    print(f"DEBUG: Current hop status: {state.mission.current_hop.status if state.mission.current_hop else 'No current hop'}")
    
    if writer:
        writer({
            "status": "supervisor_routing",
            "payload": serialize_state(state)
        })

    try:
        # Determine next node based on mission and hop status
        next_node = None
        routing_message = ""

        if state.mission.mission_status == MissionStatus.PENDING:
            next_node = "mission_specialist_node"
            routing_message = "Mission pending - routing to mission specialist"
        elif state.mission.mission_status == MissionStatus.ACTIVE:
            if not state.mission.current_hop or state.mission.current_hop.status == HopStatus.READY_TO_DESIGN:
                next_node = "hop_designer_node"
                routing_message = "Ready to design next hop - routing to hop designer"
            elif state.mission.current_hop.status == HopStatus.HOP_PROPOSED:
                next_node = "hop_implementer_node"
                routing_message = "Hop proposed - routing to hop implementer"
            elif state.mission.current_hop.status == HopStatus.HOP_READY_TO_RESOLVE:
                next_node = "hop_implementer_node"
                routing_message = "Hop ready to resolve - routing to hop implementer"
            elif state.mission.current_hop.status == HopStatus.HOP_READY_TO_EXECUTE:
                next_node = "hop_executor_node"
                routing_message = "Hop ready to execute - routing to hop executor"
            elif state.mission.current_hop.status == HopStatus.HOP_RUNNING:
                next_node = "hop_executor_node"
                routing_message = "Hop running - routing to hop executor"
            elif state.mission.current_hop.status == HopStatus.ALL_HOPS_COMPLETE:
                next_node = "mission_specialist_node"
                routing_message = "All hops complete - routing to mission specialist"
            else:
                routing_message = f"Unknown hop status: {state.mission.current_hop.status}"
                next_node = "mission_specialist_node"
        else:
            routing_message = f"Unknown mission status: {state.mission.mission_status}"
            next_node = "mission_specialist_node"

        # Log routing decision
        print(f"DEBUG: Routing decision - {routing_message}")
        print(f"DEBUG: Next node: {next_node}")

        # Create routing message
        response_message = Message(
            id=str(uuid.uuid4()),
            role=MessageRole.ASSISTANT,
            content=routing_message,
            timestamp=datetime.utcnow().isoformat()
        )

        state_update = {
            "messages": [*state.messages, response_message.model_dump()],
            "mission": state.mission,
            "next_node": next_node,
            "tool_params": state.tool_params
        }

        # Stream response and return command
        if writer:
            agent_response = AgentResponse(
                token=routing_message,
                response_text=routing_message,
                status="supervisor_routing_completed",
                error=None,
                debug=f"Mission: {state.mission.mission_status}, Hop: {state.mission.current_hop.status if state.mission.current_hop else 'No current hop'}, Routing to: {next_node}",
                payload=serialize_state(State(**state_update))
            )
            writer(agent_response.model_dump())

        return Command(goto=next_node, update=state_update)

    except Exception as e:
        if writer:
            writer({
                "status": "error",
                "error": str(e),
                "state": serialize_state(state)
            })
        raise

async def mission_specialist_node(state: State, writer: StreamWriter, config: Dict[str, Any]) -> AsyncIterator[Dict[str, Any]]:
    """Node that handles mission specialist operations"""
    print("Mission specialist node")

    if writer:
        writer({
            "status": "mission_specialist_starting",
            "payload": serialize_state(state)
        })
    
    try:
        # Create and use the simplified prompt caller
        promptCaller = MissionDefinitionPromptCaller()
        parsed_response = await promptCaller.invoke(
            messages=state.messages,
            mission=state.mission
        )

        # Create response message
        response_message = Message(
            id=str(uuid.uuid4()),
            role=MessageRole.ASSISTANT,
            content=parsed_response.response_content,
            timestamp=datetime.utcnow().isoformat()
        )

        next_node = END

        state_update = {
            "messages": [*state.messages, response_message.model_dump()],
            "mission": state.mission,  # Keep existing mission state unchanged
            "tool_params": {},
            "next_node": next_node,
        }

        if writer:
            # If we have a mission proposal, send it to frontend for approval
            if parsed_response.mission_proposal:
                # Create a full mission from the proposal (but don't update state yet)
                proposed_mission = create_mission_from_lite(parsed_response.mission_proposal)
                
                agent_response = AgentResponse(**create_agent_response(
                    token=response_message.content[0:100],
                    response_text=parsed_response.response_content,
                    status="mission_specialist_completed",
                    payload={"mission": serialize_mission(proposed_mission)},
                    debug=f"Mission proposal created: {proposed_mission.name}, waiting for user approval"
                ))
            else:
                # No mission proposal (e.g., clarification needed)
                agent_response = AgentResponse(**create_agent_response(
                    token=response_message.content[0:100],
                    response_text=parsed_response.response_content,
                    status="mission_specialist_completed",
                    payload={},
                    debug="No mission proposal - clarification needed"
                ))
            
            writer(agent_response.model_dump())

        return Command(goto=next_node, update=state_update)

    except Exception as e:
        import traceback
        error_traceback = traceback.format_exc()
        print("Error in mission specialist node:", error_traceback)
        if writer:
            writer({
                "status": "error",
                "error": str(e),
                "state": serialize_state(state),
                "debug": error_traceback,
            })
        raise

async def hop_designer_node(state: State, writer: StreamWriter, config: Dict[str, Any]) -> AsyncIterator[Dict[str, Any]]:
    """Hop designer node that designs the next hop in the mission"""
    print("Hop designer node")
    print(f"DEBUG: Current hop: {state.mission.current_hop.name if state.mission and state.mission.current_hop else 'None'}")
    print(f"DEBUG: Hop status: {state.mission.current_hop.status if state.mission.current_hop else 'No hop status'}")

    if writer:
        writer({
            "status": "hop_designer_started",
            "payload": serialize_state(state)
        })

    try:
        # Create and use the simplified prompt caller
        promptCaller = HopDesignerPromptCaller()
        
        parsed_response = await promptCaller.invoke(
            mission=state.mission,
            messages=state.messages
        )

        # Create response message
        response_message = Message(
            id=str(uuid.uuid4()),
            role=MessageRole.ASSISTANT,
            content=parsed_response.response_content,
            timestamp=datetime.utcnow().isoformat()
        )

        # Handle different response types
        if parsed_response.response_type == "HOP_PROPOSAL":
            if not parsed_response.hop_proposal:
                raise ValueError("Response type is HOP_PROPOSAL but no hop proposal was provided")
            
            # Get the HopLite proposal
            hop_lite: HopLite = parsed_response.hop_proposal
            
            # Process the hop proposal
            new_hop, proposed_assets = _process_hop_proposal(hop_lite, state.mission.mission_state)

            # Route back to supervisor
            next_node = END

            state_update = {
                "messages": [*state.messages, response_message.model_dump()],
                "mission": state.mission,
                "tool_params": {},
                "next_node": next_node,
            }

            if writer:
                agent_response = AgentResponse(**create_agent_response(
                    token=response_message.content[0:100],
                    response_text=response_message.content,
                    status="hop_designer_completed",
                    debug=f"Response type: {parsed_response.response_type}, Hop proposed: {new_hop.name if parsed_response.response_type == 'HOP_PROPOSAL' else 'No hop proposed'}, waiting for user approval",
                    payload={
                        "hop": serialize_hop(new_hop) if parsed_response.response_type == 'HOP_PROPOSAL' else None,
                        "mission": serialize_mission(state.mission),
                        "proposed_assets": [asset.model_dump(mode='json') for asset in proposed_assets] if parsed_response.response_type == 'HOP_PROPOSAL' else []
                    }
                ))
                writer(agent_response.model_dump())

            return Command(goto=next_node, update=state_update)

        elif parsed_response.response_type == "CLARIFICATION_NEEDED":
            # For clarification needed, we don't create a new hop
            # Just update the response message with the reasoning
            response_message.content = f"{parsed_response.response_content}\n\nReasoning: {parsed_response.reasoning}"
            
            # Route back to supervisor
            next_node = END

            state_update = {
                "messages": [*state.messages, response_message.model_dump()],
                "mission": state.mission,
                "tool_params": {},
                "next_node": next_node,
            }

            if writer:
                agent_response = AgentResponse(**create_agent_response(
                    token=response_message.content[0:100],
                    response_text=response_message.content,
                    status="hop_designer_completed",
                    debug=f"Response type: {parsed_response.response_type}, clarification needed",
                    payload={
                        "hop": None,
                        "mission": serialize_mission(state.mission),
                        "proposed_assets": []
                    }
                ))
                writer(agent_response.model_dump())

            return Command(goto=next_node, update=state_update)
        else:
            raise ValueError(f"Invalid response type: {parsed_response.response_type}")

    except Exception as e:
        import traceback
        error_traceback = traceback.format_exc()
        print("Error in hop designer node:", error_traceback)
        if writer:
            writer({
                "status": "error",
                "error": str(e),
                "state": serialize_state(state),
                "debug": error_traceback,
            })
        raise

async def hop_implementer_node(state: State, writer: StreamWriter, config: Dict[str, Any]) -> AsyncIterator[Dict[str, Any]]:
    """Node that handles hop implementer operations"""
    print("Hop implementer node")
    print(f"DEBUG: Current hop: {state.mission.current_hop.name if state.mission and state.mission.current_hop else 'None'}")
    print(f"DEBUG: Hop status: {state.mission.current_hop.status if state.mission else 'No hop status'}")

    if writer:
        writer({
            "status": "hop_implementer_starting",
            "payload": serialize_state(state)
        })
    
    try:
        # Use mission's current_hop as the single source of truth
        current_hop = state.mission.current_hop if state.mission else None
        if not current_hop or not current_hop.hop_state:
            raise ValueError(f"Hop is missing or has empty hop_state.")

        # Create and use the simplified prompt caller
        promptCaller = HopImplementerPromptCaller()
        parsed_response = await promptCaller.invoke(
            mission=state.mission
        )

        # Create response message from parsed response.response_content
        response_message = Message(
            id=str(uuid.uuid4()),
            role=MessageRole.ASSISTANT,
            content=parsed_response.response_content,
            timestamp=datetime.utcnow().isoformat()
        )

        # Handle different response types
        if parsed_response.response_type == "IMPLEMENTATION_PLAN":
            result = _process_implementation_plan(parsed_response, current_hop)
            response_message.content = result.response_content
            
            # Apply the changes to the state if processing was successful
            if result.success:
                # Update the current hop in the mission state
                state.mission.current_hop = result.updated_hop
                # Also update the local reference for consistency
                current_hop = result.updated_hop
            else:
                # If validation failed, we still need to update status for clarification
                current_hop.status = result.updated_hop.status
                state.mission.current_hop.status = result.updated_hop.status
            
        elif parsed_response.response_type == "CLARIFICATION_NEEDED":
            # Keep hop in current state but mark as needing clarification
            current_hop.status = HopStatus.HOP_READY_TO_RESOLVE
            state.mission.current_hop.status = HopStatus.HOP_READY_TO_RESOLVE
            
            # Create clarification message with reasoning
            missing_info = "\n".join([f"- {info}" for info in parsed_response.missing_information])
            reasoning_text = f"\n\nReasoning: {parsed_response.reasoning}" if parsed_response.reasoning else ""
            response_message.content = f"Need clarification to implement hop '{current_hop.name}':\n\n{parsed_response.response_content}\n\nMissing Information:\n{missing_info}{reasoning_text}"
            
        else:
            raise ValueError(f"Invalid response type: {parsed_response.response_type}")
        
        # Route back to supervisor
        next_node = END

        state_update = {
            "messages": [*state.messages, response_message.model_dump()],
            "mission": state.mission,
            "tool_params": {},
            "next_node": next_node
        }

        if writer:
            next_status = "ready for next hop" if not current_hop.is_final else "mission complete"
            
            # Include hop in payload if it's successfully implemented (ready to execute)
            include_hop = (parsed_response.response_type == 'IMPLEMENTATION_PLAN' and 
                          current_hop.status == HopStatus.HOP_READY_TO_EXECUTE)
            
            agent_response = AgentResponse(**create_agent_response(
                token=response_message.content[0:100],
                response_text=response_message.content,
                status="hop_implementer_completed",
                error=current_hop.error if current_hop.status == HopStatus.READY_TO_DESIGN else None,
                debug=f"Response type: {parsed_response.response_type}, Hop implementation status: {current_hop.status.value}, {next_status}",
                payload={
                    "hop": serialize_hop(current_hop) if include_hop else None
                }
            ))
            writer(agent_response.model_dump())

        return Command(goto=next_node, update=state_update)

    except Exception as e:
        import traceback
        error_traceback = traceback.format_exc()
        print("Error in hop implementer node:", error_traceback)
        if writer:
            writer({
                "status": "error",
                "error": str(e),
                "state": serialize_state(state),
                "debug": error_traceback,
            })
        raise

async def asset_search_node(state: State, writer: StreamWriter, config: Dict[str, Any]) -> AsyncIterator[Dict[str, Any]]:
    """Node that handles asset search operations"""
    print("================================================")
    print("Asset search node")

    if writer:
        writer({
            "status": "asset_search_starting",
            "payload": serialize_state(state)
        })
    
    try:

        # Get search parameters from state
        search_params = state.tool_params
        print("Search params:", search_params)  # Debug log
        if not search_params or not search_params.get("query"):
            raise ValueError("No search query provided")

        # Use OpenAI responses API for file search
        response = await client.responses.create(
            model="gpt-4o",
            input="See what you can find about " + search_params["query"],
            tools=[{
                "type": "file_search",
                "vector_store_ids": [VECTOR_STORE_ID]
            }],
            include=["file_search_call.results"]
        )
                   
        # Extract search results from the response
        search_results = response.output[0].results

        search_results_string = "Here are the search results for: " + search_params["query"] + "\n\n"
        for result in search_results:
            search_results_string += result.text + "\n\n"

        # Create a response message with the search results
        current_time = datetime.now().isoformat()
        response_message = Message(
            id=str(uuid.uuid4()),
            role=MessageRole.ASSISTANT,
            content=search_results_string,
            timestamp=current_time
        )

        # Route back to supervisor with the results
        next_node = "supervisor_node"
        state_update = {
            "messages": [*state.messages, response_message.model_dump()],
            "mission": state.mission,
            "next_node": next_node,
            "tool_params": state.tool_params,
            "available_assets": state.available_assets
        }

        if writer:
            agent_response = AgentResponse(
                token=response_message.content[0:100],
                message=response_message.content[0:100],
                status="asset_search_completed",
                error=None,
                debug="hello",
                payload=serialize_state(State(**state_update))
            )
            writer(agent_response.model_dump())

        return Command(goto=next_node, update=state_update)

    except Exception as e:
        print("Error in asset search node:", e)
        if writer:
            writer({
                "status": "error",
                "error": str(e),
                "state": serialize_state(state)
            })
        raise

### Graph

# Define the graph
graph_builder = StateGraph(State)

# Add nodes
graph_builder.add_node("supervisor_node", supervisor_node)
graph_builder.add_node("mission_specialist_node", mission_specialist_node)
graph_builder.add_node("hop_designer_node", hop_designer_node)
graph_builder.add_node("hop_implementer_node", hop_implementer_node)
graph_builder.add_node("asset_search_node", asset_search_node)

# Add edges - define all possible paths
graph_builder.add_edge(START, "supervisor_node")

# Supervisor can route to different nodes based on state
# The supervisor node will use the Command object to determine next node

# Compile the graph with streaming support
compiled = graph_builder.compile()
graph = compiled 



# ---------------------------------------------------------------------------
# Hop Implementation Helpers
# ---------------------------------------------------------------------------

def _process_input_assets(hop_lite: HopLite, mission_state: Dict[str, Asset]) -> tuple[Dict[str, str], Dict[str, Asset]]:
    """
    Process input assets for a hop proposal.
    
    Args:
        hop_lite: The hop proposal containing input asset IDs
        mission_state: Current mission state containing available assets
        
    Returns:
        tuple: (input_mapping, hop_state_assets)
    """
    if not hop_lite.inputs:
        raise ValueError(f"Hop proposal '{hop_lite.name}' must include input asset IDs")
    
    input_mapping = {}
    hop_state_assets = {}
    
    for input_asset_id in hop_lite.inputs:
        if input_asset_id not in mission_state:
            available_asset_ids = list(mission_state.keys())
            error_msg = f"Input asset ID '{input_asset_id}' not found in mission state. "
            error_msg += f"Available asset IDs: {', '.join(available_asset_ids)}. "
            error_msg += "The hop designer should only reference existing asset IDs from the available assets list."
            raise ValueError(error_msg)
        
        # Retrieve the asset from mission state
        original_asset = mission_state[input_asset_id]
        
        # Create a deep copy and assign it a new local key
        local_key = canonical_key(original_asset.name)
        hop_asset = copy.deepcopy(original_asset)
        hop_asset.id = local_key  # Set ID to match the local key
        
        # Add the copy to hop state
        hop_state_assets[local_key] = hop_asset
        
        # Add the input mapping using the new local key
        input_mapping[local_key] = input_asset_id
    
    return input_mapping, hop_state_assets

def _process_output_asset(hop_lite: HopLite, mission_state: Dict[str, Asset]) -> tuple[Dict[str, str], Dict[str, Asset], List[Asset]]:
    """
    Process output asset for a hop proposal.
    
    Args:
        hop_lite: The hop proposal containing output specification
        mission_state: Current mission state containing available assets
        
    Returns:
        tuple: (output_mapping, hop_state_assets, proposed_assets)
    """
    if not hop_lite.output:
        raise ValueError(f"Hop proposal '{hop_lite.name}' must include an output asset definition")
    
    output_mapping = {}
    hop_state_assets = {}
    proposed_assets = []
    
    if isinstance(hop_lite.output, ExistingAssetOutput):
        # Using existing mission asset
        if not hop_lite.output.mission_asset_id:
            raise ValueError("mission_asset_id is required when using an existing mission asset")
        
        # Verify the asset exists in mission state
        if hop_lite.output.mission_asset_id not in mission_state:
            raise ValueError(f"Specified mission asset {hop_lite.output.mission_asset_id} not found in mission state")
        
        # Retrieve the asset from mission state
        original_asset = mission_state[hop_lite.output.mission_asset_id]
        
        # Create a deep copy and assign it a new local key
        local_key = canonical_key(original_asset.name)
        hop_asset = copy.deepcopy(original_asset)
        hop_asset.id = local_key
        hop_asset.role = 'output'  # Set as output at the hop level
        
        # Add the copy to hop state
        hop_state_assets[local_key] = hop_asset
        
        # Add the output mapping using the new local key
        output_mapping[local_key] = hop_lite.output.mission_asset_id
        
    elif isinstance(hop_lite.output, NewAssetOutput):
        # Create new asset (but don't add to mission state yet)
        output_asset = create_asset_from_lite(hop_lite.output.asset)
        
        # Generate unique ID for the new asset
        sanitized_name = hop_lite.name.lower().replace(' ', '_').replace('-', '_')
        generated_wip_asset_id = f"hop_{sanitized_name}_{str(uuid.uuid4())[:8]}_output"
        output_asset.id = generated_wip_asset_id
        
        # Set role as intermediate (will be added to mission state when accepted)
        output_asset.role = 'intermediate'
        
        # Track this asset for the payload (don't add to mission state yet)
        proposed_assets.append(output_asset)
        
        # Create a deep copy for hop state with output role
        local_key = canonical_key(hop_lite.output.asset.name)
        hop_asset = copy.deepcopy(output_asset)
        hop_asset.id = local_key
        hop_asset.role = 'output'  # Set as output at the hop level
        
        # Add the copy to hop state
        hop_state_assets[local_key] = hop_asset
        
        # Add the output mapping using the new local key
        output_mapping[local_key] = generated_wip_asset_id
        
    else:
        raise ValueError(f"Invalid output specification type: {type(hop_lite.output)}")
    
    return output_mapping, hop_state_assets, proposed_assets

def _process_hop_proposal(hop_lite: HopLite, mission_state: Dict[str, Asset]) -> tuple[Hop, List[Asset]]:
    """
    Process a hop proposal and create a full Hop object with proper asset mappings.
    
    Args:
        hop_lite: The simplified hop proposal from the AI
        mission_state: Current mission state containing available assets
        
    Returns:
        tuple: (new_hop, proposed_assets)
    """
    # Process input assets
    input_mapping, input_hop_state = _process_input_assets(hop_lite, mission_state)
    
    # Process output asset
    output_mapping, output_hop_state, proposed_assets = _process_output_asset(hop_lite, mission_state)
    
    # Combine hop state assets
    hop_state = {**input_hop_state, **output_hop_state}
    
    # Create the full Hop object
    new_hop = Hop(
        id=str(uuid.uuid4()),
        name=hop_lite.name,
        description=hop_lite.description,
        input_mapping=input_mapping,
        output_mapping=output_mapping,
        tool_steps=[],  # Tool steps will be added by the implementer
        hop_state=hop_state,
        status=HopStatus.HOP_PROPOSED,
        is_final=hop_lite.is_final,
        is_resolved=False,
        rationale=hop_lite.rationale,  # Include rationale from HopLite
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    
    return new_hop, proposed_assets

@dataclass
class ImplementationPlanResult:
    """Result of processing an implementation plan"""
    success: bool
    response_content: str
    updated_hop: Hop
    validation_errors: List[str] = None
    
    def __post_init__(self):
        if self.validation_errors is None:
            self.validation_errors = []

def _process_implementation_plan(
    parsed_response: 'HopImplementationResponse', 
    current_hop: Hop
) -> ImplementationPlanResult:
    """
    Process an implementation plan response from the hop implementer.
    
    Args:
        parsed_response: The response from the hop implementer
        current_hop: The current hop being implemented (will not be modified)
        state: The current state (will not be modified)
        
    Returns:
        ImplementationPlanResult: The result of processing the implementation plan
    """
    if not parsed_response.tool_steps:
        raise ValueError("Response type is IMPLEMENTATION_PLAN but no tool steps were provided")
    
    # Create a deep copy of the hop to avoid mutating the original
    updated_hop = copy.deepcopy(current_hop)
    
    # Find assets that are referenced in tool steps but don't exist in hop state
    # These are truly intermediate assets that need to be created
    referenced_assets = set()
    existing_assets = set(updated_hop.hop_state.keys())
    
    for step in parsed_response.tool_steps:
        # Check parameter mappings for asset references
        for param_config in step.parameter_mapping.values():
            if isinstance(param_config, dict) and param_config.get('type') == 'asset_field':
                referenced_assets.add(param_config['state_asset'])
        
        # Check result mappings for asset references
        for result_config in step.result_mapping.values():
            if isinstance(result_config, dict) and result_config.get('type') == 'asset_field':
                referenced_assets.add(result_config['state_asset'])
    
    # Identify truly intermediate assets (referenced but not existing)
    intermediate_assets = referenced_assets - existing_assets
    
    # Create missing intermediate assets in the copy
    for asset_name in intermediate_assets:
        new_asset = Asset(
            id=asset_name,  # Use the asset name as the ID to match local key
            name=asset_name,
            description=f"Intermediate asset created during hop implementation: {asset_name}",
            schema_definition=SchemaType(
                type='object',  # Default to object type
                description=f"Intermediate result from hop implementation: {asset_name}"
            ),
            status=AssetStatus.PENDING,
            is_collection=False,
            role='intermediate',
            asset_metadata=AssetMetadata(
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
                creator='hop_implementer',
                custom_metadata={}
            ),
            value=None,  # Initialize with no value
            subtype=None
        )
        updated_hop.hop_state[asset_name] = new_asset
    
    # Validate the tool chain with all assets in place
    validation_errors = validate_tool_chain(parsed_response.tool_steps, updated_hop.hop_state)
    
    if validation_errors:
        # Validation failed - keep hop in ready to resolve state
        updated_hop.status = HopStatus.HOP_READY_TO_RESOLVE
        
        formatted_errors = "\n".join(f"- {e}" for e in validation_errors)
        error_message = (
            "The proposed implementation plan has validation issues:\n\n" +
            formatted_errors + "\n\n" +
            "Please revise the plan to address these issues."
        )
        return ImplementationPlanResult(
            success=False, 
            response_content=error_message, 
            updated_hop=updated_hop, 
            validation_errors=validation_errors
        )
    
    # Validation passed - accept the implementation plan
    # Convert ToolStepLite objects to ToolStep objects
    from schemas.lite_models import create_tool_step_from_lite
    updated_hop.tool_steps = [create_tool_step_from_lite(step) for step in parsed_response.tool_steps]
    updated_hop.is_resolved = True
    updated_hop.status = HopStatus.HOP_READY_TO_EXECUTE
    updated_hop.updated_at = datetime.utcnow()
    
    # Create success message
    success_message = parsed_response.response_content
    if parsed_response.reasoning:
        success_message = f"{success_message}\n\nImplementation Reasoning: {parsed_response.reasoning}"
    
    return ImplementationPlanResult(
        success=True, 
        response_content=success_message, 
        updated_hop=updated_hop, 
        validation_errors=[]
    )

class PrimaryAgent:
    def __init__(self, mission: "Mission" = None):
        self.mission = mission if mission else Mission(
            id="default-mission-1", 
            name="Default Mission", 
            description="Default mission description",
            current_hop=None,
            hop_history=[],
            inputs=[],
            outputs=[],
            mission_state={},
            mission_status=MissionStatus.PENDING
        )

    async def run(self):
        # Your agent's execution logic here
        pass

