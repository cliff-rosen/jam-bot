from typing import Dict, Any, AsyncIterator, List, Optional, Union
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

from utils.string_utils import canonical_key
from utils.state_serializer import (
    serialize_state, serialize_mission, serialize_hop,
    create_agent_response
)

from schemas.chat import ChatMessage, MessageRole, AgentResponse, StatusResponse
from schemas.workflow import Mission, MissionStatus, HopStatus, Hop, ToolStep, validate_tool_chain
from schemas.asset import Asset, AssetStatus
from schemas.lite_models import create_asset_from_lite, HopLite, create_mission_from_lite, NewAssetOutput, ExistingAssetOutput
from schemas.base import SchemaType, ValueType

from agents.prompts.mission_prompt_simple import MissionDefinitionPromptCaller
from agents.prompts.hop_designer_prompt_simple import HopDesignerPromptCaller
from agents.prompts.hop_implementer_prompt_simple import HopImplementerPromptCaller, HopImplementationResponse

from services.mission_service import MissionService
from services.user_session_service import UserSessionService
from services.state_transition_service import StateTransitionService, TransactionType, StateTransitionError


# Use settings from config
OPENAI_API_KEY = settings.OPENAI_API_KEY
VECTOR_STORE_ID = os.getenv("VECTOR_STORE_ID", "vs_68347e57e7408191a5a775f40db83f44")  # Default to existing store

# Initialize OpenAI client
client = AsyncOpenAI(api_key=OPENAI_API_KEY)

# Module-level service instances
_mission_service: Optional[MissionService] = None
_session_service: Optional[UserSessionService] = None
_state_transition_service: Optional[StateTransitionService] = None
_user_id: Optional[int] = None

def initialize_services(config: Dict[str, Any]) -> None:
    """Initialize module-level services from config"""
    global _mission_service, _session_service, _state_transition_service, _user_id
    configurable = config.get('configurable', {})
    _mission_service = configurable.get('mission_service')
    _session_service = configurable.get('session_service')
    _state_transition_service = configurable.get('state_transition_service')
    _user_id = configurable.get('user_id')

async def update_mission(mission_id: str, mission: Mission) -> None:
    """Update mission using module-level service"""
    if _mission_service and _user_id and mission_id:
        await _mission_service.update_mission(mission_id, _user_id, mission)
        print(f"Successfully persisted mission {mission_id}")
    else:
        print("Warning: Cannot persist mission - services not initialized")



class State(BaseModel):
    """State for the RAVE workflow"""
    messages: List[ChatMessage]
    mission: Optional[Mission] = None
    mission_id: Optional[str] = None  # Add mission_id for persistence
    tool_params: Dict[str, Any] = {}
    next_node: str
    asset_summaries: Dict[str, str] = {}  # Add asset summaries directly to state
  
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

async def supervisor_node(state: State, writer: StreamWriter, config: Dict[str, Any]) -> Command:
    """Supervisor node that routes to appropriate specialist based on mission and hop status"""
    print("Supervisor - Routing based on mission and hop status")
    print(f"DEBUG: Mission status: {state.mission.status if state.mission else 'No mission'}")
    print(f"DEBUG: Current hop status: {state.mission.current_hop.status if state.mission and state.mission.current_hop else 'No current hop'}")
    
    # Initialize services from config (supervisor is always called first)
    print(f"DEBUG: Config keys: {list(config.keys())}")
    initialize_services(config)
    print(f"DEBUG: Services initialized - mission_service: {_mission_service is not None}, state_transition_service: {_state_transition_service is not None}, user_id: {_user_id}")
    
    if writer:
        status_response = StatusResponse(
            status="supervisor_routing",
            payload=serialize_state(state),
            error=None,
            debug="Supervisor analyzing mission and hop status to determine routing"
        )
        writer(status_response.model_dump())

    try:
        # Determine next node based on valid mission-hop status combinations
        next_node = None
        routing_message = ""

        if not state.mission:
            # No mission - route to mission specialist
            next_node = "mission_specialist_node"
            routing_message = "No mission found - routing to mission specialist to create one"
        
        elif state.mission.status == MissionStatus.AWAITING_APPROVAL:
            # Mission awaiting approval - route to mission specialist
            next_node = "mission_specialist_node"
            routing_message = "Mission awaiting approval - routing to mission specialist for processing"
        
        elif state.mission.status == MissionStatus.IN_PROGRESS:
            # Mission in progress - check hop state for detailed workflow routing
            if not state.mission.current_hop:
                # No current hop - route to hop designer to start planning
                next_node = "hop_designer_node"
                routing_message = "Mission in progress with no current hop - routing to hop designer to start planning"
            elif state.mission.current_hop.status == HopStatus.HOP_PLAN_STARTED:
                # Hop planning started - route to hop designer
                next_node = "hop_designer_node"
                routing_message = "Hop planning started - routing to hop designer to continue planning"
            elif state.mission.current_hop.status == HopStatus.HOP_PLAN_PROPOSED:
                # Hop plan proposed - route to hop designer
                next_node = "hop_designer_node"
                routing_message = "Hop plan proposed - routing to hop designer for processing"
            elif state.mission.current_hop.status == HopStatus.HOP_PLAN_READY:
                # Hop plan ready - route to hop implementer to start implementation
                next_node = "hop_implementer_node"
                routing_message = "Hop plan ready - routing to hop implementer to start implementation"
            elif state.mission.current_hop.status == HopStatus.HOP_IMPL_STARTED:
                # Hop implementation started - route to hop implementer
                next_node = "hop_implementer_node"
                routing_message = "Hop implementation started - routing to hop implementer"
            elif state.mission.current_hop.status == HopStatus.HOP_IMPL_PROPOSED:
                # Hop implementation proposed - route to hop implementer
                next_node = "hop_implementer_node"
                routing_message = "Hop implementation proposed - routing to hop implementer for processing"
            elif state.mission.current_hop.status == HopStatus.HOP_IMPL_READY:
                # Hop implementation ready - route to hop implementer (ready to execute)
                next_node = "hop_implementer_node"
                routing_message = "Hop implementation ready - routing to hop implementer for execution"
            elif state.mission.current_hop.status == HopStatus.EXECUTING:
                # Hop executing - wait for completion (no active routing needed)
                next_node = END
                routing_message = "Hop is executing - waiting for tool steps to complete"
            elif state.mission.current_hop.status == HopStatus.COMPLETED:
                # Hop completed - check if final hop or continue to next hop
                if state.mission.current_hop.is_final:
                    # Final hop completed - complete the mission and route to mission specialist
                    state.mission.status = MissionStatus.COMPLETED
                    state.mission.updated_at = datetime.utcnow()
                    # Persist mission completion
                    await update_mission(state.mission_id, state.mission)
                    next_node = "mission_specialist_node"
                    routing_message = "Final hop completed - mission completed, routing to mission specialist for final processing"
                else:
                    # Non-final hop completed - clear current hop and route to hop designer for next hop
                    state.mission.current_hop = None
                    state.mission.current_hop_id = None
                    state.mission.updated_at = datetime.utcnow()
                    # Persist mission state
                    await update_mission(state.mission_id, state.mission)
                    next_node = "hop_designer_node"
                    routing_message = "Hop completed (non-final) - routing to hop designer for next hop"
            elif state.mission.current_hop.status == HopStatus.FAILED:
                # Hop failed - route to mission specialist for error handling
                next_node = "mission_specialist_node"
                routing_message = "Hop failed - routing to mission specialist for error handling"
            elif state.mission.current_hop.status == HopStatus.CANCELLED:
                # Hop cancelled - route to mission specialist
                next_node = "mission_specialist_node"
                routing_message = "Hop cancelled - routing to mission specialist for processing"
            else:
                # Unknown hop status
                routing_message = f"Unknown hop status: {state.mission.current_hop.status}"
                next_node = "mission_specialist_node"
        
        elif state.mission.status == MissionStatus.COMPLETED:
            # Mission completed - route to mission specialist for final processing
            next_node = "mission_specialist_node"
            routing_message = "Mission completed - routing to mission specialist for final processing"
        
        elif state.mission.status == MissionStatus.FAILED:
            # Mission failed - route to mission specialist for error handling
            next_node = "mission_specialist_node"
            routing_message = "Mission failed - routing to mission specialist for error handling"
        
        elif state.mission.status == MissionStatus.CANCELLED:
            # Mission cancelled - route to mission specialist for cleanup
            next_node = "mission_specialist_node"
            routing_message = "Mission cancelled - routing to mission specialist for cleanup"
        
        else:
            # Unknown mission status
            routing_message = f"Unknown mission status: {state.mission.status}"
            next_node = "mission_specialist_node"

        # Validate state coordination per specification
        validation_errors = _validate_state_coordination(state.mission)
        if validation_errors:
            print(f"WARNING: State coordination issues detected: {', '.join(validation_errors)}")
            # Log but don't fail - continue with routing

        # Log routing decision
        print(f"DEBUG: Routing decision - {routing_message}")
        print(f"DEBUG: Next node: {next_node}")

        # Create routing message
        response_message = ChatMessage(
            id=str(uuid.uuid4()),
            chat_id="temp",  # This will be updated when chat sessions are integrated
            role=MessageRole.ASSISTANT,
            content=routing_message,
            message_metadata={},
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )

        state_update = {
            "messages": [*state.messages, response_message.model_dump()],
            "mission": state.mission,
            "mission_id": state.mission_id,
            "next_node": next_node,
            "tool_params": state.tool_params,
            "asset_summaries": state.asset_summaries
        }

        # Stream response and return command
        if writer:
            agent_response = AgentResponse(
                token=routing_message,
                response_text=routing_message,
                status="supervisor_routing_completed",
                error=None,
                debug=f"Mission: {state.mission.status if state.mission else 'No mission'}, Hop: {state.mission.current_hop.status if state.mission and state.mission.current_hop else 'No current hop'}, Routing to: {next_node}",
                payload=serialize_state(State(**state_update))
            )
            writer(agent_response.model_dump())

        return Command(goto=next_node, update=state_update)

    except Exception as e:
        if writer:
            error_response = AgentResponse(
                token=None,
                response_text=None,
                payload=serialize_state(state),
                status="supervisor_error",
                error=str(e),
                debug=f"Error in supervisor_node: {type(e).__name__}"
            )
            writer(error_response.model_dump())
        raise

def _validate_state_coordination(mission: Optional[Mission]) -> List[str]:
    """
    Validate state coordination per the status system specification.
    
    Returns list of validation errors (empty if valid).
    """
    errors = []
    
    if not mission:
        return errors
    
    # Mission-Hop Coordination Rules from spec
    if mission.status == MissionStatus.AWAITING_APPROVAL:
        # Mission awaiting approval should have no current hop
        if mission.current_hop:
            errors.append(f"Mission AWAITING_APPROVAL should not have current hop, but found hop with status {mission.current_hop.status}")
    
    elif mission.status == MissionStatus.IN_PROGRESS:
        # Mission in progress can have various hop states or no hop
        if mission.current_hop:
            valid_hop_states = {
                HopStatus.HOP_PLAN_STARTED,
                HopStatus.HOP_PLAN_PROPOSED,
                HopStatus.HOP_PLAN_READY,
                HopStatus.HOP_IMPL_STARTED,
                HopStatus.HOP_IMPL_PROPOSED,
                HopStatus.HOP_IMPL_READY,
                HopStatus.EXECUTING,
                HopStatus.COMPLETED
            }
            if mission.current_hop.status not in valid_hop_states:
                errors.append(f"Mission IN_PROGRESS has invalid hop status: {mission.current_hop.status}")
    
    elif mission.status == MissionStatus.COMPLETED:
        # Mission completed should have completed final hop or no hop
        if mission.current_hop and mission.current_hop.status != HopStatus.COMPLETED:
            errors.append(f"Mission COMPLETED should have completed hop or no hop, but found hop with status {mission.current_hop.status}")
    
    elif mission.status in [MissionStatus.FAILED, MissionStatus.CANCELLED]:
        # Failed/cancelled missions can have various hop states
        pass
    
    return errors

async def mission_specialist_node(state: State, writer: StreamWriter, config: Dict[str, Any]) -> Command:
    """Node that handles mission specialist operations"""
    print("Mission specialist node")
    
    # Initialize services from config
    initialize_services(config)

    if writer:
        status_response = StatusResponse(
            status="mission_specialist_starting",
            payload=serialize_state(state),
            error=None,
            debug="Mission specialist node starting analysis"
        )
        writer(status_response.model_dump())
    
    try:
        # Create and use the simplified prompt caller
        promptCaller = MissionDefinitionPromptCaller()
        
        parsed_response = await promptCaller.invoke(
            mission=state.mission,
            messages=state.messages
        )

        # Create response message
        response_message = ChatMessage(
            id=str(uuid.uuid4()),
            chat_id="temp",  # This will be updated when chat sessions are integrated
            role=MessageRole.ASSISTANT,
            content=parsed_response.response_content,
            message_metadata={},
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )

        # Route back to supervisor
        next_node = END

        # Handle mission proposal creation
        if parsed_response.mission_proposal:
            print("Mission proposal created")
            # Create a full mission from the proposal
            proposed_mission = create_mission_from_lite(parsed_response.mission_proposal)
            
            # Use StateTransitionService to properly persist the mission proposal
            if _state_transition_service and _user_id:
                try:
                    # Prepare mission data for transaction service
                    mission_data = {
                        'name': proposed_mission.name,
                        'description': proposed_mission.description,
                        'goal': proposed_mission.goal,
                        'success_criteria': proposed_mission.success_criteria,
                        'mission_state': {asset_id: asset.model_dump() for asset_id, asset in proposed_mission.mission_state.items()}
                    }
                    
                    # Use transaction service to create mission - it handles status and session automatically
                    result = await _state_transition_service.updateState(
                        TransactionType.PROPOSE_MISSION,
                        {
                            'user_id': _user_id,
                            'mission': mission_data
                        }
                    )
                    
                    print(f"Successfully created mission via transaction service: {result.entity_id}")
                    
                    # Fetch the persisted mission from database to get correct state
                    if _mission_service:
                        persisted_mission = await _mission_service.get_mission(result.entity_id, _user_id)
                        if persisted_mission:
                            state.mission = persisted_mission
                            state.mission_id = result.entity_id
                        else:
                            # Fallback - update local state but warn
                            print("Warning: Could not fetch persisted mission, using local state")
                            proposed_mission.id = result.entity_id
                            state.mission = proposed_mission
                            state.mission_id = result.entity_id
                    else:
                        # Fallback if mission service not available
                        proposed_mission.id = result.entity_id
                        state.mission = proposed_mission
                        state.mission_id = result.entity_id
                    
                    # Success message
                    response_message.content = f"Mission proposal created: {proposed_mission.name}. Please review and approve to begin."
                    
                except StateTransitionError as e:
                    print(f"State transition error creating mission: {e}")
                    response_message.content = f"Error creating mission proposal: {str(e)}"
                    raise e
                except Exception as e:
                    print(f"Unexpected error creating mission: {e}")
                    response_message.content = f"Unexpected error creating mission proposal: {str(e)}"
                    raise e
            else:
                print("Warning: Cannot create mission - StateTransitionService not initialized")
                response_message.content = "Error: Unable to create mission proposal - service not available"

        state_update = {
            "messages": [*state.messages, response_message.model_dump()],
            "mission": state.mission,  # Use updated mission state
            "mission_id": state.mission_id,
            "tool_params": {},
            "next_node": next_node,
            "asset_summaries": state.asset_summaries
        }

        if writer:
            # Send simplified response without proposal payload
            agent_response = AgentResponse(**create_agent_response(
                token=response_message.content[0:100],
                response_text=response_message.content,
                status="mission_specialist_completed",
                payload={},  # No proposal payload - mission is now directly in state
                debug=f"Mission proposal created: {state.mission.name if state.mission else 'No mission'}, status: {state.mission.status if state.mission else 'No status'}"
            ))
            writer(agent_response.model_dump())

        return Command(goto=next_node, update=state_update)

    except Exception as e:
        import traceback
        error_traceback = traceback.format_exc()
        print("Error in mission specialist node:", error_traceback)
        if writer:
            error_response = AgentResponse(
                token=None,
                response_text=None,
                payload=serialize_state(state),
                status="mission_specialist_error",
                error=str(e),
                debug=error_traceback
            )
            writer(error_response.model_dump())
        raise

async def hop_designer_node(state: State, writer: StreamWriter, config: Dict[str, Any]) -> Command:
    """Hop designer node that designs the next hop in the mission"""
    print("Hop designer node")
    print(f"DEBUG: Hop status: {state.mission.current_hop.status if state.mission.current_hop else 'No hop status'}")

    # Initialize services from config
    initialize_services(config)

    if writer:
        status_response = StatusResponse(
            status="hop_designer_started",
            payload=serialize_state(state),
            error=None,
            debug="Hop designer node started - analyzing mission requirements"
        )
        writer(status_response.model_dump())

    try:
        # Create and use the simplified prompt caller
        promptCaller = HopDesignerPromptCaller()
        
        parsed_response = await promptCaller.invoke(
            mission=state.mission,
            messages=state.messages
        )

        # Create response message
        response_message = ChatMessage(
            id=str(uuid.uuid4()),
            chat_id="temp",  # This will be updated when chat sessions are integrated
            role=MessageRole.ASSISTANT,
            content=parsed_response.response_content,
            message_metadata={},
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )

        # Route back to supervisor
        next_node = END

        # Handle different response types
        if parsed_response.response_type == "HOP_PROPOSAL":
            if not parsed_response.hop_proposal:
                raise ValueError("Response type is HOP_PROPOSAL but no hop proposal was provided")
            
            # Get the HopLite proposal
            hop_lite: HopLite = parsed_response.hop_proposal
            
            # Process the hop proposal
            new_hop, proposed_assets = _process_hop_proposal(hop_lite, state.mission.mission_state, state.mission)
            
            # Set hop status to HOP_PLAN_PROPOSED
            new_hop.status = HopStatus.HOP_PLAN_PROPOSED
            
            # Add the new hop to the mission as current_hop
            state.mission.current_hop = new_hop
            state.mission.current_hop_id = new_hop.id
            
            # Add any proposed assets to mission state
            if proposed_assets:
                for asset in proposed_assets:
                    state.mission.mission_state[asset.id] = asset
            
            # Persist mission using module-level service
            await update_mission(state.mission_id, state.mission)
            
            # Update response message
            response_message.content = f"Hop plan proposed: {new_hop.name}. Please review and approve to proceed with implementation."

        elif parsed_response.response_type == "CLARIFICATION_NEEDED":
            # For clarification needed, we don't create a new hop
            # Just update the response message with the reasoning
            response_message.content = f"{parsed_response.response_content}\n\nReasoning: {parsed_response.reasoning}"

        else:
            raise ValueError(f"Invalid response type: {parsed_response.response_type}")

        state_update = {
            "messages": [*state.messages, response_message.model_dump()],
            "mission": state.mission,
            "mission_id": state.mission_id,
            "tool_params": {},
            "next_node": next_node,
            "asset_summaries": state.asset_summaries
        }

        if writer:
            # Send simplified response without proposal payload
            agent_response = AgentResponse(**create_agent_response(
                token=response_message.content[0:100],
                response_text=response_message.content,
                status="hop_designer_completed",
                debug=f"Response type: {parsed_response.response_type}, Hop status: {state.mission.current_hop.status if state.mission.current_hop else 'No hop'}, {state.mission.current_hop.name if state.mission.current_hop else 'No hop name'}",
                payload={}  # No proposal payload - hop is now directly in mission state
            ))
            writer(agent_response.model_dump())

        return Command(goto=next_node, update=state_update)

    except Exception as e:
        import traceback
        error_traceback = traceback.format_exc()
        print("Error in hop designer node:", error_traceback)
        if writer:
            error_response = AgentResponse(
                token=None,
                response_text=None,
                payload=serialize_state(state),
                status="hop_designer_error",
                error=str(e),
                debug=error_traceback
            )
            writer(error_response.model_dump())
        raise

async def hop_implementer_node(state: State, writer: StreamWriter, config: Dict[str, Any]) -> Command:
    """Node that handles hop implementer operations"""
    print("Hop implementer node")

    # Initialize services from config
    initialize_services(config)

    if writer:
        status_response = StatusResponse(
            status="hop_implementer_starting",
            payload=serialize_state(state),
            error=None,
            debug="Hop implementer node starting - analyzing hop implementation"
        )
        writer(status_response.model_dump())
    
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
        response_message = ChatMessage(
            id=str(uuid.uuid4()),
            chat_id="temp",  # This will be updated when chat sessions are integrated
            role=MessageRole.ASSISTANT,
            content=parsed_response.response_content,
            message_metadata={},
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
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
                
                # Set hop status to HOP_IMPL_PROPOSED for user approval
                current_hop.status = HopStatus.HOP_IMPL_PROPOSED
                state.mission.current_hop.status = HopStatus.HOP_IMPL_PROPOSED
                
                # Update response message
                response_message.content = f"Implementation plan proposed for hop '{current_hop.name}'. Please review and approve to proceed with execution."
            else:
                # If validation failed, we still need to update status for clarification
                current_hop.status = result.updated_hop.status
                state.mission.current_hop.status = result.updated_hop.status
            
        elif parsed_response.response_type == "CLARIFICATION_NEEDED":
            # Keep hop in current state but mark as needing clarification
            current_hop.status = HopStatus.HOP_IMPL_STARTED
            state.mission.current_hop.status = HopStatus.HOP_IMPL_STARTED
            
            # Create clarification message with reasoning
            missing_info = "\n".join([f"- {info}" for info in parsed_response.missing_information])
            reasoning_text = f"\n\nReasoning: {parsed_response.reasoning}" if parsed_response.reasoning else ""
            response_message.content = f"Need clarification to implement hop '{current_hop.name}':\n\n{parsed_response.response_content}\n\nMissing Information:\n{missing_info}{reasoning_text}"
            
        else:
            raise ValueError(f"Invalid response type: {parsed_response.response_type}")
        
        # Persist mission using module-level service
        await update_mission(state.mission_id, state.mission)

        # Route back to supervisor
        next_node = END

        state_update = {
            "messages": [*state.messages, response_message.model_dump()],
            "mission": state.mission,
            "mission_id": state.mission_id,
            "tool_params": {},
            "next_node": next_node,
            "asset_summaries": state.asset_summaries
        }

        if writer:
            # Send simplified response without proposal payload
            agent_response = AgentResponse(**create_agent_response(
                token=response_message.content[0:100],
                response_text=response_message.content,
                status="hop_implementer_completed",
                error=current_hop.error_message if current_hop.status == HopStatus.HOP_IMPL_STARTED else None,
                debug=f"Response type: {parsed_response.response_type}, Hop implementation status: {current_hop.status.value}, hop: {current_hop.name}",
                payload={}  # No proposal payload - hop is now directly in mission state
            ))
            writer(agent_response.model_dump())

        return Command(goto=next_node, update=state_update)

    except Exception as e:
        import traceback
        error_traceback = traceback.format_exc()
        print("Error in hop implementer node:", error_traceback)
        if writer:
            error_response = AgentResponse(
                token=None,
                response_text=None,
                payload=serialize_state(state),
                status="hop_implementer_error",
                error=str(e),
                debug=error_traceback
            )
            writer(error_response.model_dump())
        raise

async def asset_search_node(state: State, writer: StreamWriter, config: Dict[str, Any]) -> Command:
    """Node that handles asset search operations"""
    print("================================================")
    print("Asset search node")

    if writer:
        status_response = StatusResponse(
            status="asset_search_starting",
            payload=serialize_state(state),
            error=None,
            debug="Asset search node starting - preparing to search for assets"
        )
        writer(status_response.model_dump())
    
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
        response_message = ChatMessage(
            id=str(uuid.uuid4()),
            chat_id="temp",  # This will be updated when chat sessions are integrated
            role=MessageRole.ASSISTANT,
            content=search_results_string,
            message_metadata={"asset_search": True},
            created_at=current_time,
            updated_at=current_time
        )

        # Route back to supervisor with the results
        next_node = "supervisor_node"
        state_update = {
            "messages": [*state.messages, response_message.model_dump()],
            "mission": state.mission,
            "mission_id": state.mission_id,
            "next_node": next_node,
            "tool_params": state.tool_params,
            "asset_summaries": state.asset_summaries
        }

        if writer:
            agent_response = AgentResponse(
                token=response_message.content[0:100],
                response_text=response_message.content,
                status="asset_search_completed",
                error=None,
                debug=f"Found {len(search_results)} search results for query: {search_params['query']}",
                payload=serialize_state(State(**state_update))
            )
            writer(agent_response.model_dump())

        return Command(goto=next_node, update=state_update)

    except Exception as e:
        print("Error in asset search node:", e)
        if writer:
            error_response = AgentResponse(
                token=None,
                response_text=None,
                payload=serialize_state(state),
                status="asset_search_error",
                error=str(e),
                debug=f"Error in asset_search_node: {type(e).__name__}"
            )
            writer(error_response.model_dump())
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

def _process_hop_proposal(hop_lite: HopLite, mission_state: Dict[str, Asset], mission: 'Mission') -> tuple[Hop, List[Asset]]:
    """
    Process a hop proposal and create a full Hop object with proper asset mappings.
    
    Args:
        hop_lite: The simplified hop proposal from the AI
        mission_state: Current mission state containing available assets
        mission: The mission this hop belongs to (for sequence ordering)
        
    Returns:
        tuple: (new_hop, proposed_assets)
    """
    # Process input assets
    input_mapping, input_hop_state = _process_input_assets(hop_lite, mission_state)
    
    # Process output asset
    output_mapping, output_hop_state, proposed_assets = _process_output_asset(hop_lite, mission_state)
    
    # Combine hop state assets
    hop_state = {**input_hop_state, **output_hop_state}
    
    # Calculate next sequence order based on existing hops in the mission
    if mission.hops:
        # Find the highest sequence order in existing hops
        max_sequence = max(hop.sequence_order for hop in mission.hops)
        next_sequence = max_sequence + 1
    else:
        # First hop in the mission
        next_sequence = 1
    
            # Create the full Hop object
        new_hop = Hop(
            id=str(uuid.uuid4()),
            sequence_order=next_sequence,
            name=hop_lite.name,
            description=hop_lite.description,
            rationale=hop_lite.rationale,  # Include rationale from HopLite
            status=HopStatus.HOP_PLAN_PROPOSED,
            is_final=hop_lite.is_final,
            is_resolved=False,
            hop_state=hop_state,
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
            role='intermediate',
            asset_metadata={
                "created_at": datetime.utcnow().isoformat(),
                "updated_at": datetime.utcnow().isoformat(),
                "creator": "hop_implementer",
                "custom_metadata": {}
            },
            value=None,  # Initialize with no value
            subtype=None
        )
        updated_hop.hop_state[asset_name] = new_asset
    
    # Validate the tool chain with all assets in place
    validation_errors = validate_tool_chain(parsed_response.tool_steps, updated_hop.hop_state)
    
    if validation_errors:
        # Validation failed - keep hop in implementation started state
        updated_hop.status = HopStatus.HOP_IMPL_STARTED
        
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
    updated_hop.status = HopStatus.HOP_IMPL_READY
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
            mission_status=MissionStatus.AWAITING_APPROVAL
        )

    async def run(self):
        # Your agent's execution logic here
        pass

