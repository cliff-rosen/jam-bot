from typing import Dict, Any, AsyncIterator, List
import json
import copy  # Needed for deep-copying assets when populating hop state
from datetime import datetime
from serpapi import GoogleSearch
import uuid
from openai import AsyncOpenAI
from pydantic import BaseModel, Field
import os

from langgraph.graph import StateGraph, START, END
from langgraph.types import StreamWriter, Send, Command

from config.settings import settings

from schemas.chat import Message, MessageRole, AgentResponse
from schemas.workflow import Mission, MissionStatus, HopStatus, Hop, ToolStep
from schemas.asset import Asset, AssetStatus, AssetMetadata
from schemas.lite_models import AssetLite, create_asset_from_lite, HopLite
from schemas.base import SchemaType, ValueType

from agents.prompts.mission_prompt_simple import MissionDefinitionPromptCaller, MissionDefinitionResponse
from agents.prompts.hop_designer_prompt_simple import HopDesignerPromptCaller, HopDesignResponse
from agents.prompts.hop_implementer_prompt_simple import HopImplementerPromptCaller, HopImplementationResponse

from utils.prompt_logger import log_hop_implementer_prompt, log_prompt_messages
from utils.string_utils import canonical_key
from utils.state_serializer import (
    serialize_state, serialize_mission, serialize_hop,
    create_agent_response
)

from tools.tool_registry import TOOL_REGISTRY

# Use settings from config
OPENAI_API_KEY = settings.OPENAI_API_KEY
VECTOR_STORE_ID = os.getenv("VECTOR_STORE_ID", "vs_68347e57e7408191a5a775f40db83f44")  # Default to existing store

# Initialize OpenAI client
client = AsyncOpenAI(api_key=OPENAI_API_KEY)

SYSTEM_MESSAGE = """
You are a helpful assistant named Jack that can answer question.
"""

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

        if parsed_response.mission_proposal:
            state.mission.name = parsed_response.mission_proposal.name
            state.mission.description = parsed_response.mission_proposal.description
            state.mission.goal = parsed_response.mission_proposal.goal
            state.mission.success_criteria = parsed_response.mission_proposal.success_criteria
            
            # Convert AssetLite objects to full Asset objects with explicit roles
            state.mission.inputs = []
            for asset_lite in parsed_response.mission_proposal.inputs:
                asset = create_asset_from_lite(asset_lite) 
                asset.role = 'input'  # Explicitly set as input
                state.mission.inputs.append(asset)
            
            state.mission.outputs = []
            for asset_lite in parsed_response.mission_proposal.outputs:
                asset = create_asset_from_lite(asset_lite)
                asset.role = 'output'  # Explicitly set as output
                state.mission.outputs.append(asset)

            current_time = datetime.utcnow()
            state.mission.created_at = current_time
            state.mission.updated_at = current_time
            state.mission.metadata = {}
            
            # Set mission as pending (waiting for user approval)
            state.mission.mission_status = MissionStatus.PENDING
            
            # Initialize mission state with input assets
            for asset in state.mission.inputs:
                state.mission.mission_state[asset.id] = asset

            # Also initialize mission state with output assets
            for asset in state.mission.outputs:
                state.mission.mission_state[asset.id] = asset

        response_message = Message(
            id=str(uuid.uuid4()),
            role=MessageRole.ASSISTANT,
            content=parsed_response.response_content,
            timestamp=datetime.utcnow().isoformat()
        )

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
                response_text=parsed_response.response_content,
                status="mission_specialist_completed",
                payload={"mission": serialize_mission(state.mission)},
                debug=serialize_state(State(**state_update))
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
        # Get completed hops for context
        completed_hops = state.mission.hop_history if state.mission else []

        # Create and use the simplified prompt caller
        promptCaller = HopDesignerPromptCaller()
        
        # Convert mission state assets to list format for the prompt
        available_assets = [asset.model_dump(mode='json') for asset in state.mission.mission_state.values()] if state.mission else []
        
        parsed_response = await promptCaller.invoke(
            messages=state.messages,
            mission=state.mission,
            available_assets=available_assets,
            completed_hops=completed_hops
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
            
            # Validate inputs
            if not hop_lite.inputs:
                raise ValueError(f"Hop proposal '{hop_lite.name}' must include input assets")
            
            # Validate output asset
            if not hop_lite.output:
                raise ValueError(f"Hop proposal '{hop_lite.name}' must include an output asset definition")
            
            # Create input mapping by finding matching assets in mission state
            canonical_input_mapping = {}
            for input_asset in hop_lite.inputs:
                # Find matching asset in mission state by name
                matching_asset = next(
                    (asset for asset in state.mission.mission_state.values() 
                     if canonical_key(asset.name) == canonical_key(input_asset.name)),
                    None
                )
                if not matching_asset:
                    raise ValueError(f"Input asset '{input_asset.name}' not found in mission state")
                canonical_input_mapping[canonical_key(input_asset.name)] = matching_asset.id

            # Handle output asset based on specification
            output_mapping = {}
            generated_wip_asset_id = None

            if hop_lite.output.use_existing:
                # Using existing mission asset
                if not hop_lite.output.mission_asset_id:
                    raise ValueError("mission_asset_id is required when use_existing is True")
                
                # Verify the asset exists in mission state
                if hop_lite.output.mission_asset_id not in state.mission.mission_state:
                    raise ValueError(f"Specified mission asset {hop_lite.output.mission_asset_id} not found in mission state")
                
                # Map to existing mission asset
                output_mapping[canonical_key(hop_lite.output.asset.name)] = hop_lite.output.mission_asset_id
            else:
                # Create new asset
                output_asset = create_asset_from_lite(hop_lite.output.asset)
                
                # Generate unique ID for the new asset
                sanitized_name = hop_lite.name.lower().replace(' ', '_').replace('-', '_')
                generated_wip_asset_id = f"hop_{sanitized_name}_{str(uuid.uuid4())[:8]}_output"
                output_asset.id = generated_wip_asset_id
                output_asset.role = 'output'  # Set as output at the hop level
                
                # Add to mission state
                if state.mission.mission_state is None:  # Defensive check
                    state.mission.mission_state = {}
                state.mission.mission_state[output_asset.id] = output_asset
                
                # Map to new asset
                output_mapping[canonical_key(hop_lite.output.asset.name)] = generated_wip_asset_id
            
            # Create the full Hop object
            new_hop = Hop(
                id=str(uuid.uuid4()),
                name=hop_lite.name,
                description=hop_lite.description,
                input_mapping=canonical_input_mapping,
                output_mapping=output_mapping,
                tool_steps=[],  # Tool steps will be added by the implementer
                hop_state={},   # Will be populated below
                status=HopStatus.HOP_PROPOSED,
                is_final=hop_lite.is_final,
                is_resolved=False,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            )

            # Initialize hop state with copies of input assets using local keys
            for local_key, mission_asset_id in canonical_input_mapping.items():
                if mission_asset_id in state.mission.mission_state:
                    # Create a copy of the asset but with ID set to the local key
                    original_asset = state.mission.mission_state[mission_asset_id]
                    hop_asset = copy.deepcopy(original_asset)
                    hop_asset.id = local_key  # Set ID to match the local key
                    new_hop.hop_state[local_key] = hop_asset
                else:
                    raise ValueError(f"Input asset {mission_asset_id} not found in mission state")

            # Initialize hop state with output asset using local key
            for local_key, mission_asset_id in output_mapping.items():
                if mission_asset_id in state.mission.mission_state:
                    # Copy the asset from mission state
                    original_asset = state.mission.mission_state[mission_asset_id]
                    hop_asset = copy.deepcopy(original_asset)
                    hop_asset.id = local_key  # Set ID to match the local key
                    new_hop.hop_state[local_key] = hop_asset
                else:
                    raise ValueError(f"Output asset {mission_asset_id} not found in mission state")
            
            # Update state with new hop
            state.mission.current_hop = new_hop
            state.mission.current_hop.status = HopStatus.HOP_PROPOSED

        elif parsed_response.response_type == "CLARIFICATION_NEEDED":
            # For clarification needed, we don't create a new hop
            # Just update the response message with the reasoning
            response_message.content = f"{parsed_response.response_content}\n\nReasoning: {parsed_response.reasoning}"
        else:
            raise ValueError(f"Invalid response type: {parsed_response.response_type}")

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
                debug=f"Response type: {parsed_response.response_type}, Hop proposed: {state.mission.current_hop.name if state.mission.current_hop else 'No hop proposed'}, waiting for user approval",
                payload={
                    "hop": serialize_hop(state.mission.current_hop),
                    "mission": serialize_mission(state.mission)
                }
            ))
            writer(agent_response.model_dump())

        return Command(goto=next_node, update=state_update)

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
        
        if not current_hop:
            error_msg = f"No current hop to implement. mission.current_hop: {state.mission.current_hop if state.mission else 'No mission'}, hop_status: {state.mission.current_hop.status if state.mission else 'No status'}"
            print(f"ERROR: {error_msg}")
            raise ValueError(error_msg)

        print(f"DEBUG: Implementing hop: {current_hop.name}")

        # Populate hop state with input assets from mission state
        for local_key, asset_id in current_hop.input_mapping.items():
            if asset_id in state.mission.mission_state:
                # Create a copy of the asset but with ID set to the local key
                original_asset = state.mission.mission_state[asset_id]
                hop_asset = copy.deepcopy(original_asset)
                hop_asset.id = local_key  # Set ID to match the local key
                current_hop.hop_state[local_key] = hop_asset
            else:
                print(f"WARNING: Input asset {asset_id} not found in mission state")

        # Add output assets to hop state
        for local_key, asset_id in current_hop.output_mapping.items():
            if asset_id in state.mission.mission_state:
                # Create a copy of the asset but with ID set to the local key
                original_asset = state.mission.mission_state[asset_id]
                hop_asset = copy.deepcopy(original_asset)
                hop_asset.id = local_key  # Set ID to match the local key
                current_hop.hop_state[local_key] = hop_asset
            else:
                print(f"WARNING: Output asset {asset_id} not found in mission state")

        # Create and use the simplified prompt caller
        promptCaller = HopImplementerPromptCaller()
        
        # Convert HOP STATE assets to list format for the prompt
        available_assets = [asset.model_dump(mode='json') for asset in current_hop.hop_state.values()] if current_hop else []
        
        parsed_response = await promptCaller.invoke(
            messages=state.messages,
            mission=state.mission,
            current_hop=current_hop,
            available_assets=available_assets
        )

        # Handle different response types
        if parsed_response.response_type == "CLARIFICATION_NEEDED":
            # Keep hop in current state but mark as needing clarification
            current_hop.status = HopStatus.HOP_READY_TO_RESOLVE
            state.mission.current_hop.status = HopStatus.HOP_READY_TO_RESOLVE
            
            # Create clarification message
            missing_info = "\n".join([f"- {info}" for info in parsed_response.missing_information])
            response_message = Message(
                id=str(uuid.uuid4()),
                role=MessageRole.ASSISTANT,
                content=f"Need clarification to implement hop '{current_hop.name}':\n\n{parsed_response.response_content}\n\nMissing Information:\n{missing_info}",
                timestamp=datetime.utcnow().isoformat()
            )
            
        elif parsed_response.response_type == "IMPLEMENTATION_PLAN":
            # First, create any intermediate assets needed by the tool steps
            intermediate_assets = set()
            for step in parsed_response.tool_steps:
                # Check parameter mappings for intermediate assets
                for param_config in step.parameter_mapping.values():
                    if isinstance(param_config, dict) and param_config.get('type') == 'asset_field':
                        intermediate_assets.add(param_config['state_asset'])
                
                # Check result mappings for intermediate assets
                for result_config in step.result_mapping.values():
                    if isinstance(result_config, dict) and result_config.get('type') == 'asset_field':
                        intermediate_assets.add(result_config['state_asset'])
            
            # Create any missing intermediate assets
            for asset_name in intermediate_assets:
                if asset_name not in current_hop.hop_state:
                    # Create a new asset for this intermediate result
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
                        )
                    )
                    # Use the asset name as the key in hop_state
                    current_hop.hop_state[asset_name] = new_asset

            # Now validate the tool chain with all assets in place
            validation_errors = validate_tool_chain(parsed_response.tool_steps, current_hop.hop_state)

            if validation_errors:
                # Bounce back for clarification with concise error list
                current_hop.status = HopStatus.HOP_READY_TO_RESOLVE
                state.mission.current_hop.status = HopStatus.HOP_READY_TO_RESOLVE

                formatted_errors = "\n".join(f"- {e}" for e in validation_errors)

                response_message = Message(
                    id=str(uuid.uuid4()),
                    role=MessageRole.ASSISTANT,
                    content=(
                        "The proposed implementation plan has validation issues:\n\n" +
                        formatted_errors + "\n\n" +
                        "Please revise the plan so every state_asset reference exists in hop.state "
                        "or create the corresponding Asset before it is used."
                    ),
                    timestamp=datetime.utcnow().isoformat()
                )
            else:
                # Accept the plan
                current_hop.tool_steps = parsed_response.tool_steps
                current_hop.is_resolved = True
                current_hop.status = HopStatus.HOP_READY_TO_EXECUTE
                current_hop.updated_at = datetime.utcnow()

                state.mission.current_hop.status = HopStatus.HOP_READY_TO_EXECUTE

                response_message = Message(
                    id=str(uuid.uuid4()),
                    role=MessageRole.ASSISTANT,
                    content=parsed_response.response_content,
                    timestamp=datetime.utcnow().isoformat()
                )
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
            hop_name = current_hop.name
            next_status = "ready for next hop" if not current_hop.is_final else "mission complete"
            
            agent_response = AgentResponse(**create_agent_response(
                token=response_message.content[0:100],
                response_text=response_message.content,
                status="hop_implementer_completed",
                error=current_hop.error if current_hop.status == HopStatus.READY_TO_DESIGN else None,
                debug=f"Hop implementation status: {current_hop.status.value}, {next_status}",
                payload={
                    "hop": serialize_hop(current_hop),
                    "mission": serialize_mission(state.mission)
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
# Validation helpers
# ---------------------------------------------------------------------------

def validate_tool_chain(steps: List[ToolStep], hop_state: Dict[str, Asset]) -> List[str]:
    """Validate the tool chain returned by the Hop-Implementer.

    Ensures that every tool step references existing assets (or creates them first)
    and that schemas are compatible according to each tool's own validation logic.
    Returns a flat list of validation-error strings (empty list means no errors).
    """
    errors: List[str] = []

    for step in steps:
        tool_def = TOOL_REGISTRY.get(step.tool_id)
        if not tool_def:
            errors.append(f"Tool definition not found for tool_id '{step.tool_id}'")
            continue

        # Validate parameter mapping
        for param_name, mapping in step.parameter_mapping.items():
            # get the tool parameter for the current parameter mapping
            tool_param = next((p for p in tool_def.parameters if p.name == param_name), None)
            if not tool_param:
                errors.append(
                    f"Step '{step.id}': Parameter '{param_name}' not found in tool '{tool_def.id}' definition. "
                    f"Available parameters: {', '.join(p.name for p in tool_def.parameters)}"
                )
                continue
                
            # if the tool parameter is an asset field, we need to check if the asset is in the hop state
            if isinstance(mapping, dict) and mapping.get('type') == 'asset_field':
                state_asset = mapping.get('state_asset')
                if not state_asset:
                    errors.append(f"Step '{step.id}': Missing state_asset in parameter mapping for '{param_name}'")
                    continue
                    
                if state_asset not in hop_state:
                    errors.append(
                        f"Step '{step.id}': Asset '{state_asset}' for parameter '{param_name}' not found in hop state. "
                        f"Available assets: {', '.join(hop_state.keys())}"
                    )
                    continue
                
                # TODO: Add schema compatibility check here
                # For now, we just check for existence

        # Validate result mapping    
        for result_name, mapping in step.result_mapping.items():
            # get the tool output for the current result mapping
            tool_output = next((o for o in tool_def.outputs if o.name == result_name), None)
            if not tool_output:
                errors.append(
                    f"Step '{step.id}': Result '{result_name}' not found in tool '{tool_def.id}' definition. "
                    f"Available outputs: {', '.join(o.name for o in tool_def.outputs)}"
                )
                continue
                
            # if the tool output is an asset field, we need to check if the asset is in the hop state
            if isinstance(mapping, dict) and mapping.get('type') == 'asset_field':
                state_asset = mapping.get('state_asset')
                if not state_asset:
                    errors.append(f"Step '{step.id}': Missing state_asset in result mapping for '{result_name}'")
                    continue
                    
                if state_asset not in hop_state:
                    errors.append(
                        f"Step '{step.id}': Asset '{state_asset}' for result '{result_name}' not found in hop state. "
                        f"Available assets: {', '.join(hop_state.keys())}"
                    )
                    continue

                # TODO: Add schema compatibility check here
                # For now, we just check for existence

    return errors

def check_mission_ready(input_assets: List[Asset]) -> tuple[bool, List[str]]:
    """
    Checks if all input assets required for a mission are in a READY state.
    This function is temporarily located here until a permanent home in a
    workflow utility service is created.
    """
    pending_inputs = [asset.name for asset in input_assets if asset.status != AssetStatus.READY]
    failed_inputs = [asset.name for asset in input_assets if asset.status == AssetStatus.ERROR]
    
    if failed_inputs:
        return False, [f"Failed inputs that need attention: {', '.join(failed_inputs)}"]
    elif pending_inputs:
        return False, [f"Pending inputs from user: {', '.join(pending_inputs)}"]
    else:
        return True, []

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

