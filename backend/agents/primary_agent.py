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
from schemas.asset import Asset
from schemas.lite_models import AssetLite, create_asset_from_lite

from agents.prompts.mission_prompt_simple import MissionDefinitionPromptCaller, MissionDefinitionResponse
from agents.prompts.hop_designer_prompt_simple import HopDesignerPromptCaller, HopDesignResponse
from agents.prompts.hop_implementer_prompt_simple import HopImplementerPromptCaller, HopImplementationResponse

from utils.prompt_logger import log_hop_implementer_prompt, log_prompt_messages
from utils.string_utils import canonical_key

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
            # First convert all assets in state to their dict representation
            serialized_state = {
                asset_id: asset.model_dump(mode='json')
                for asset_id, asset in state.mission.mission_state.items()
            }
            
            # Create a copy of the mission and update its state with serialized assets
            mission_dict = state.mission.model_dump(mode='json')
            mission_dict['mission_state'] = serialized_state
            
            # Also ensure inputs and outputs are properly serialized using the same format as state
            mission_dict['inputs'] = [
                asset.model_dump(mode='json')
                for asset in state.mission.inputs
            ]
            mission_dict['outputs'] = [
                asset.model_dump(mode='json')
                for asset in state.mission.outputs
            ]
            
            payload = {
                "mission": mission_dict
            }
            agent_response_data = {
                "token": response_message.content[0:100],
                "response_text": parsed_response.response_content,
                "status": "mission_specialist_completed",
                "payload": payload,
                "error": None,
                "debug": serialize_state(State(**state_update))
            }

            agent_response = AgentResponse(**agent_response_data)
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

        if parsed_response.hop_proposal:
            # Convert hop proposal to Hop object
            hop_proposal = parsed_response.hop_proposal
            
            # Validate input mapping
            if not hop_proposal.input_mapping:
                raise ValueError(f"Hop proposal '{hop_proposal.name}' must include input mappings to existing mission state assets")
            
            # Validate output asset
            if not hop_proposal.output_asset:
                raise ValueError(f"Hop proposal '{hop_proposal.name}' must include an output asset definition")
            
            # Canonicalize input mapping keys to ensure consistency
            canonical_input_mapping = {
                canonical_key(local_name): asset_id
                for local_name, asset_id in hop_proposal.input_mapping.items()
            }

            # Create output mapping based on whether this is a final hop
            output_mapping = {}
            generated_wip_asset_id = None # To store the ID if it's a new WIP asset

            if hop_proposal.is_final and hop_proposal.output_mission_asset_id:
                # For final hops, map to mission output
                output_mapping[canonical_key(hop_proposal.output_asset.name)] = hop_proposal.output_mission_asset_id
            else:
                # For intermediate hops, create a new asset ID
                # Sanitize name for use in ID and make it more unique
                sanitized_name = hop_proposal.name.lower().replace(' ', '_').replace('-', '_')
                generated_wip_asset_id = f"hop_{sanitized_name}_{str(uuid.uuid4())[:8]}_output"
                output_mapping[canonical_key(hop_proposal.output_asset.name)] = generated_wip_asset_id
            
            new_hop = Hop(
                id=str(uuid.uuid4()),
                name=hop_proposal.name,
                description=hop_proposal.description,
                input_mapping=canonical_input_mapping,
                output_mapping=output_mapping,
                is_final=hop_proposal.is_final,
                status=HopStatus.HOP_PROPOSED
            )

            # If a new WIP asset ID was generated (i.e., hop is not final and has a defined output_asset)
            if generated_wip_asset_id:
                output_asset_lite = hop_proposal.output_asset
                
                # Convert AssetLite to Asset
                new_wip_asset = _create_asset_from_lite(output_asset_lite)
                
                # Override ID and set role for this WIP asset
                new_wip_asset.id = generated_wip_asset_id 
                new_wip_asset.role = 'intermediate'  # Explicitly set as intermediate/WIP
                
                # Ensure mission.state exists (it should, if mission was initialized)
                if state.mission.mission_state is None: # Defensive check
                    state.mission.mission_state = {}
                state.mission.mission_state[new_wip_asset.id] = new_wip_asset
            
            # Update state with new hop
            state.mission.current_hop = new_hop
            state.mission.current_hop.status = HopStatus.HOP_PROPOSED
            
            # Initialize and populate the new hop's local state from mission.state
            new_hop.hop_state = {}

            # 1. Populate hop.state with input assets
            if state.mission and state.mission.mission_state and new_hop.input_mapping:
                for local_input_name, mission_asset_id in new_hop.input_mapping.items():
                    canonical_local_key = canonical_key(local_input_name)
                    if mission_asset_id in state.mission.mission_state:
                        # Deep-copy the mission asset so that modifications inside the hop do NOT
                        # mutate the original asset attached to the parent mission. We also
                        # update the asset's `id` so that it matches the local key used to store
                        # it in `hop.state`. This guarantees `asset.id == key` for every entry in
                        # the hop state as intended.
                        asset_copy = copy.deepcopy(state.mission.mission_state[mission_asset_id])
                        asset_copy.id = canonical_local_key

                        new_hop.hop_state[canonical_local_key] = asset_copy
                    else:
                        raise ValueError(f"Input asset ID '{mission_asset_id}' (local name: '{local_input_name}') for hop '{new_hop.name}' not found in mission.state. This is a critical issue.")
            
            # 2. Populate hop.state with output assets
            # The output_asset_id_in_mission_state is either a mission_output_id or the generated_wip_asset_id
            if state.mission and state.mission.mission_state and new_hop.output_mapping:
                for local_output_name, output_asset_id_in_mission_state in new_hop.output_mapping.items():
                    canonical_output_key = canonical_key(local_output_name)
                    if output_asset_id_in_mission_state in state.mission.mission_state:
                        # Use a detached copy for the same reasons as inputs (avoid accidental
                        # mutation + maintain key/id alignment).
                        asset_copy = copy.deepcopy(state.mission.mission_state[output_asset_id_in_mission_state])
                        asset_copy.id = canonical_output_key

                        new_hop.hop_state[canonical_output_key] = asset_copy
                    else:
                        raise ValueError(f"Output asset ID '{output_asset_id_in_mission_state}' (local name: '{local_output_name}') for hop '{new_hop.name}' not found in mission.state. This asset should have been present (either as mission output or newly created WIP). Critical issue.")

        response_message = Message(
            id=str(uuid.uuid4()),
            role=MessageRole.ASSISTANT,
            content=parsed_response.response_content,
            timestamp=datetime.utcnow().isoformat()
        )

        # Route back to supervisor
        next_node = END

        state_update = {
            "messages": [*state.messages, response_message.model_dump()],
            "mission": state.mission,
            "tool_params": {},
            "next_node": next_node,
        }

        if writer:
            agent_response_data = {
                "token": response_message.content[0:100],
                "response_text": parsed_response.response_content,
                "status": "hop_designer_completed",
                "error": None,
                "debug": f"Hop proposed: {new_hop.name if parsed_response.hop_proposal else 'No hop proposed'}, waiting for user approval",
                "payload": {
                    "hop": new_hop.model_dump(mode='json'),
                    "mission": {
                        **state.mission.model_dump(mode='json'),
                        "mission_state": {
                            asset_id: asset.model_dump(mode='json')
                            for asset_id, asset in state.mission.mission_state.items()
                        },
                        "inputs": [
                            asset.model_dump(mode='json')
                            for asset in state.mission.inputs
                        ],
                        "outputs": [
                            asset.model_dump(mode='json')
                            for asset in state.mission.outputs
                        ]
                    }
                }
            }

            agent_response = AgentResponse(**agent_response_data)
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

        # Check if hop state is empty and try to populate it
        if not current_hop.hop_state:
            print("DEBUG: Hop state is empty, attempting to populate from mission state")
            current_hop.hop_state = {}
            
            # 1. Populate hop.state with input assets
            if state.mission and state.mission.mission_state and current_hop.input_mapping:
                for local_input_name, mission_asset_id in current_hop.input_mapping.items():
                    canonical_local_key = canonical_key(local_input_name)
                    if mission_asset_id in state.mission.mission_state:
                        # Deep-copy the mission asset
                        asset_copy = copy.deepcopy(state.mission.mission_state[mission_asset_id])
                        asset_copy.id = canonical_local_key
                        current_hop.hop_state[canonical_local_key] = asset_copy
                    else:
                        # If we can't find an input asset, we need clarification
                        response_message = Message(
                            id=str(uuid.uuid4()),
                            role=MessageRole.ASSISTANT,
                            content=f"Need clarification to implement hop '{current_hop.name}': Input asset ID '{mission_asset_id}' (local name: '{local_input_name}') not found in mission state.",
                            timestamp=datetime.utcnow().isoformat()
                        )
                        current_hop.status = HopStatus.HOP_READY_TO_RESOLVE
                        state.mission.current_hop.status = HopStatus.HOP_READY_TO_RESOLVE
                        return Command(goto=END, update={
                            "messages": [*state.messages, response_message.model_dump()],
                            "mission": state.mission,
                            "tool_params": {},
                            "next_node": END
                        })
            
            # 2. Populate hop.state with output assets
            if state.mission and state.mission.mission_state and current_hop.output_mapping:
                for local_output_name, output_asset_id_in_mission_state in current_hop.output_mapping.items():
                    canonical_output_key = canonical_key(local_output_name)
                    if output_asset_id_in_mission_state in state.mission.mission_state:
                        # Deep-copy the mission asset
                        asset_copy = copy.deepcopy(state.mission.mission_state[output_asset_id_in_mission_state])
                        asset_copy.id = canonical_output_key
                        current_hop.hop_state[canonical_output_key] = asset_copy
                    else:
                        # If we can't find an output asset, we need clarification
                        response_message = Message(
                            id=str(uuid.uuid4()),
                            role=MessageRole.ASSISTANT,
                            content=f"Need clarification to implement hop '{current_hop.name}': Output asset ID '{output_asset_id_in_mission_state}' (local name: '{local_output_name}') not found in mission state.",
                            timestamp=datetime.utcnow().isoformat()
                        )
                        current_hop.status = HopStatus.HOP_READY_TO_RESOLVE
                        state.mission.current_hop.status = HopStatus.HOP_READY_TO_RESOLVE
                        return Command(goto=END, update={
                            "messages": [*state.messages, response_message.model_dump()],
                            "mission": state.mission,
                            "tool_params": {},
                            "next_node": END
                        })

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
        if parsed_response.response_type == "RESOLUTION_FAILED":
            # Update hop status to indicate failure
            current_hop.status = HopStatus.READY_TO_DESIGN
            
            # Set mission hop status to ready for next hop design
            state.mission.current_hop.status = HopStatus.READY_TO_DESIGN
            
            # Create error message
            error_details = {
                "failure_type": parsed_response.resolution_failure.get("failure_type", "OTHER"),
                "specific_issues": parsed_response.resolution_failure.get("specific_issues", []),
                "suggested_alternatives": parsed_response.resolution_failure.get("suggested_alternatives", [])
            }
            
            response_message = Message(
                id=str(uuid.uuid4()),
                role=MessageRole.ASSISTANT,
                content=f"Failed to implement hop '{current_hop.name}': {parsed_response.response_content}\n\nFailure Details: {json.dumps(error_details, indent=2)}",
                timestamp=datetime.utcnow().isoformat()
            )
            
        elif parsed_response.response_type == "CLARIFICATION_NEEDED":
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
            print("Response type: IMPLEMENTATION_PLAN")
            # Validate the returned plan
            validation_errors = validate_tool_chain(parsed_response.hop.tool_steps, current_hop.hop_state)
            print("Back after validation")

            if validation_errors:
                print("Validation errors:")
                print(validation_errors)
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
                print("Response type: IMPLEMENTATION_PLAN - no validation errors")
                # Accept the plan
                updated_hop = parsed_response.hop

                # Store the current hop state before updating
                current_hop_state = current_hop.hop_state

                # Ensure tool steps have the correct structure
                for step in updated_hop.tool_steps:
                    # Ensure resource_configs has the correct structure
                    if 'gmail' in step.resource_configs:
                        gmail_config = step.resource_configs['gmail']
                        if 'auth_config' in gmail_config:
                            auth_config = gmail_config['auth_config']
                            if 'required_fields' in auth_config:
                                for field in auth_config['required_fields']:
                                    if 'required' not in field:
                                        field['required'] = True

                    # Ensure parameter_mapping has the correct structure
                    if 'parameter_mapping' in step:
                        for param_name, param_config in step.parameter_mapping.items():
                            if isinstance(param_config, dict):
                                if 'id' not in param_config:
                                    param_config['id'] = f"{step.id}_{param_name}"
                                if 'name' not in param_config:
                                    param_config['name'] = param_name
                                if 'type' not in param_config:
                                    param_config['type'] = param_config.get('type', 'literal')
                                if 'description' not in param_config:
                                    param_config['description'] = f"Parameter {param_name} for {step.tool_id}"

                    # Ensure result_mapping has the correct structure
                    if 'result_mapping' in step:
                        for result_name, result_config in step.result_mapping.items():
                            if isinstance(result_config, dict):
                                if 'id' not in result_config:
                                    result_config['id'] = f"{step.id}_{result_name}"
                                if 'name' not in result_config:
                                    result_config['name'] = result_name
                                if 'type' not in result_config:
                                    result_config['type'] = result_config.get('type', 'asset_field')
                                if 'description' not in result_config:
                                    result_config['description'] = f"Result {result_name} from {step.tool_id}"

                # Update hop fields while preserving hop_state
                current_hop.tool_steps = updated_hop.tool_steps
                current_hop.is_resolved = True
                current_hop.status = HopStatus.HOP_READY_TO_EXECUTE
                current_hop.updated_at = datetime.utcnow()
                # Restore the hop state
                current_hop.hop_state = current_hop_state

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
            
            agent_response_data = {
                "token": response_message.content[0:100],
                "response_text": response_message.content,
                "status": "hop_implementer_completed",
                "error": current_hop.error if current_hop.status == HopStatus.READY_TO_DESIGN else None,
                "debug": f"Hop implementation status: {current_hop.status.value}, {next_status}",
                "payload": {
                    "hop": {
                        **current_hop.model_dump(mode='json'),
                        "status": current_hop.status.value,
                        "hop_status": state.mission.current_hop.status.value if state.mission.current_hop else None
                    },
                    "mission": {
                        **state.mission.model_dump(mode='json'),
                        "mission_state": {
                            asset_id: asset.model_dump(mode='json')
                            for asset_id, asset in state.mission.mission_state.items()
                        },
                        "inputs": [
                            asset.model_dump(mode='json')
                            for asset in state.mission.inputs
                        ],
                        "outputs": [
                            asset.model_dump(mode='json')
                            for asset in state.mission.outputs
                        ]
                    }
                }
            }
            
            agent_response = AgentResponse(**agent_response_data)
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

def _validate_step_schema(step: ToolStep, tool_def: "ToolDefinition", hop_state: Dict[str, Asset]) -> List[str]:
    """Validate a single tool step's schema against the tool definition."""
    errors = []
    
    # Validate parameter mapping
    for param_name, mapping in step.parameter_mapping.items():
        tool_param = next((p for p in tool_def.parameters if p.name == param_name), None)
        if not tool_param:
            errors.append(
                f"Step '{step.id}': Parameter '{param_name}' not found in tool '{tool_def.id}' definition. "
                f"Available parameters: {', '.join(p.name for p in tool_def.parameters)}"
            )
            continue
            
        if mapping.type == "asset_field":
            if mapping.state_asset not in hop_state:
                errors.append(
                    f"Step '{step.id}': Asset '{mapping.state_asset}' for parameter '{param_name}' not found in hop state. "
                    f"Available assets: {', '.join(hop_state.keys())}"
                )
                continue
            
            # TODO: Add more sophisticated schema compatibility checks here
            # For now, we just check for existence.

    # Validate result mapping
    for result_name, mapping in step.result_mapping.items():
        tool_output = next((o for o in tool_def.outputs if o.name == result_name), None)
        if not tool_output:
            errors.append(
                f"Step '{step.id}': Result '{result_name}' not found in tool '{tool_def.id}' definition. "
                f"Available outputs: {', '.join(o.name for o in tool_def.outputs)}"
            )
            continue
            
        if mapping.type == "asset_field":
            if mapping.state_asset not in hop_state:
                errors.append(
                    f"Step '{step.id}': Asset '{mapping.state_asset}' for result '{result_name}' not found in hop state. "
                    f"Available assets: {', '.join(hop_state.keys())}"
                )
                continue

            # TODO: Add more sophisticated schema compatibility checks here

    return errors

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

        errors.extend(_validate_step_schema(step, tool_def, hop_state))

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
            status=ExecutionStatus.PENDING,
            mission_status=MissionStatus.PENDING,
            current_hop=None,
            hop_history=[],
            inputs=[],
            outputs=[],
            mission_state={}
        )

    async def run(self):
        # Your agent's execution logic here
        pass

