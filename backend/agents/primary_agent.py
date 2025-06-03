from typing import Annotated, Dict, Any, AsyncIterator, List, Optional, Iterator, TypedDict, Callable, Union
import json
from datetime import datetime
from serpapi import GoogleSearch
import uuid
from openai import AsyncOpenAI
from pydantic import BaseModel
import asyncio

from langchain_core.messages import HumanMessage, AIMessage, SystemMessage, ToolMessage
from langchain_openai import ChatOpenAI

from langgraph.graph import StateGraph, START, END
from langgraph.types import StreamWriter, Send, Command

from schemas.chat import Message, MessageRole, AgentResponse, StatusResponse
from schemas.workflow import Mission, MissionStatus, HopStatus, Hop, ToolStep
from schemas.asset import Asset
from agents.prompts.mission_prompt import AssetLite
import os
from config.settings import settings

from agents.prompts.mission_prompt import MissionDefinitionPrompt, MissionDefinitionResponse
from agents.prompts.hop_designer_prompt import HopDesignerPrompt, HopDesignResponse
from agents.prompts.hop_implementer_prompt import HopImplementerPrompt, HopImplementationResponse

# Use settings from config
OPENAI_API_KEY = settings.OPENAI_API_KEY
VECTOR_STORE_ID = os.getenv("VECTOR_STORE_ID", "vs_68347e57e7408191a5a775f40db83f44")  # Default to existing store

# Initialize OpenAI client
client = AsyncOpenAI(api_key=OPENAI_API_KEY)

SYSTEM_MESSAGE = """
You are a helpful assistant named Jack that can answer question.
"""

def convert_asset_lite_to_asset(asset_lite: AssetLite) -> Asset:
    """Convert an AssetLite object to a full Asset object"""
    current_time = datetime.utcnow()
    
    return Asset(
        id=str(uuid.uuid4()),  # Generate new ID
        name=asset_lite.name,
        description=asset_lite.description,
        type=asset_lite.type,
        subtype=asset_lite.subtype,
        is_collection=asset_lite.is_collection,
        collection_type=asset_lite.collection_type,
        content=asset_lite.example_value,  # Use example as initial content
        asset_metadata={
            "created_at": current_time.isoformat(),
            "updated_at": current_time.isoformat(),
            "creator": "mission_specialist",
            "tags": [],
            "agent_associations": [],
            "version": 1,
            "token_count": 0,
            "required": asset_lite.required,
            "schema_description": asset_lite.schema_description,
            "source": "mission_proposal"
        }
    )

class State(BaseModel):
    """State for the RAVE workflow"""
    messages: List[Message]
    mission: Mission
    tool_params: Dict[str, Any] = {}
    next_node: str
    current_hop: Optional[Hop] = None
    available_assets: List[Asset] = []
  
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
        return obj

    state_dict = state.model_dump()
    messages = state_dict.get("messages", [])
    for message in messages:
        message["timestamp"] = convert_datetime(message["timestamp"])
        message["content"] = message["content"][0:100]
    
    mission_dict = state.mission.model_dump() if state.mission else None
    if mission_dict:
        mission_dict = convert_datetime(mission_dict)
    
    current_hop_dict = state.current_hop.model_dump() if state.current_hop else None
    if current_hop_dict:
        current_hop_dict = convert_datetime(current_hop_dict)
    
    available_assets_dict = [asset.model_dump() for asset in state.available_assets] if state.available_assets else []
    
    return {
        "messages": messages, 
        "tool_params": state.tool_params,
        "mission": mission_dict,
        "current_hop": current_hop_dict,
        "available_assets": available_assets_dict
    }

async def supervisor_node(state: State, writer: StreamWriter, config: Dict[str, Any]) -> AsyncIterator[Dict[str, Any]]:
    """Simplified supervisor node that routes based on mission and hop status"""
    print("Supervisor - Routing based on mission and hop status")
    
    if writer:
        writer({
            "status": "supervisor_routing",
            "payload": serialize_state(state)
        })

    try:
        # Route based on mission status first
        if not state.mission or state.mission.mission_status == MissionStatus.PENDING:
            next_node = "mission_specialist_node"
            routing_message = "Mission is pending. Routing to mission specialist to define or refine the mission."
        
        elif state.mission.mission_status == MissionStatus.ACTIVE:
            # Mission is active - route based on hop status
            if not state.mission.hop_status or state.mission.hop_status == HopStatus.READY_TO_DESIGN:
                next_node = "hop_designer_node"
                routing_message = "Mission is active and ready for next hop design."
            
            elif state.mission.hop_status == HopStatus.HOP_PROPOSED:
                # Hop is proposed - waiting for user approval (stay here for now)
                next_node = END
                routing_message = "Hop has been proposed. Waiting for your approval to proceed."
            
            elif state.mission.hop_status == HopStatus.HOP_READY_TO_RESOLVE:
                next_node = "hop_implementer_node"
                routing_message = "Hop approved. Routing to hop implementer to configure tools."
            
            elif state.mission.hop_status == HopStatus.HOP_READY_TO_EXECUTE:
                # TODO: Route to hop executor when available
                next_node = END
                routing_message = "Hop is configured and ready to execute."
            
            elif state.mission.hop_status == HopStatus.HOP_RUNNING:
                # TODO: Route to hop executor for status updates
                next_node = END
                routing_message = "Hop is currently running."
            
            elif state.mission.hop_status == HopStatus.ALL_HOPS_COMPLETE:
                # Mark mission as complete
                state.mission.mission_status = MissionStatus.COMPLETE
                next_node = END
                routing_message = "All hops complete! Mission has been completed successfully."
            
            else:
                next_node = END
                routing_message = f"Unknown hop status: {state.mission.hop_status}"
        
        elif state.mission.mission_status == MissionStatus.COMPLETE:
            next_node = END
            routing_message = "Mission has been completed successfully!"
        
        else:
            next_node = END
            routing_message = f"Unknown mission status: {state.mission.mission_status}"

        # Create routing message
        response_message = Message(
            id=str(uuid.uuid4()),
            role=MessageRole.ASSISTANT,
            content=routing_message,
            timestamp=datetime.now().isoformat()
        )

        state_update = {
            "messages": [*state.messages, response_message.model_dump()],
            "mission": state.mission,
            "next_node": next_node,
            "tool_params": state.tool_params,
            "current_hop": state.current_hop,
            "available_assets": state.available_assets
        }

        # Stream response and return command
        if writer:
            agent_response = AgentResponse(
                token=routing_message,
                response_text=routing_message,
                status="supervisor_routing_completed",
                error=None,
                debug=f"Mission: {state.mission.mission_status}, Hop: {state.mission.hop_status}, Routing to: {next_node}",
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
        # Create and format the prompt
        prompt = MissionDefinitionPrompt()
        formatted_messages = prompt.get_formatted_messages(
            messages=state.messages,
            mission=state.mission,
        )
        schema = prompt.get_schema()

        response = await client.chat.completions.create(
            model="gpt-4o",
            messages=formatted_messages,
            response_format={
                "type": "json_schema",
                "json_schema": {    
                    "schema": schema,
                    "name": prompt.get_response_model_name()
                }
            }
        )   
        
        response_text = response.choices[0].message.content
        parsed_response = prompt.parse_response(response_text)
        print("================================================")
        print("Parsed response:", parsed_response)

        if parsed_response.mission_proposal:
            state.mission.name = parsed_response.mission_proposal.name
            state.mission.description = parsed_response.mission_proposal.description
            state.mission.goal = parsed_response.mission_proposal.goal
            state.mission.success_criteria = parsed_response.mission_proposal.success_criteria
            
            # Convert AssetLite objects to full Asset objects
            state.mission.inputs = [
                convert_asset_lite_to_asset(asset_lite) 
                for asset_lite in parsed_response.mission_proposal.inputs
            ]
            state.mission.outputs = [
                convert_asset_lite_to_asset(asset_lite) 
                for asset_lite in parsed_response.mission_proposal.outputs
            ]

            state.mission.created_at = datetime.now().isoformat()
            state.mission.updated_at = datetime.now().isoformat()
            state.mission.metadata = {}
            
            # Set mission as pending (waiting for user approval)
            state.mission.mission_status = MissionStatus.PENDING
            
            # Initialize mission state with input assets
            for asset in state.mission.inputs:
                state.mission.state[asset.id] = asset

        response_message = Message(
            id=str(uuid.uuid4()),
            role=MessageRole.ASSISTANT,
            content=parsed_response.response_content,
            timestamp=datetime.now().isoformat()
        )

        next_node = END

        state_update = {
            "messages": [*state.messages, response_message.model_dump()],
            "mission": state.mission,
            "tool_params": {},
            "next_node": next_node,
            "available_assets": state.available_assets
        }

        if writer:
            agent_response = AgentResponse(
                token=response_message.content[0:100],
                response_text=parsed_response.response_content,
                status="mission_specialist_completed",
                error=None,
                debug="Mission proposed and waiting for user approval",
                payload=serialize_state(State(**state_update))
            )

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

# workflow_specialist_node removed - not needed in simplified workflow

async def hop_designer_node(state: State, writer: StreamWriter, config: Dict[str, Any]) -> AsyncIterator[Dict[str, Any]]:
    """Node that handles hop designer operations"""
    print("Hop designer node")

    if writer:
        writer({
            "status": "hop_designer_starting",
            "payload": serialize_state(state)
        })
    
    try:
        # Create and format the prompt
        prompt = HopDesignerPrompt()
        
        # Convert mission state assets to list format for the prompt
        available_assets = [asset.model_dump() for asset in state.mission.state.values()] if state.mission else []
        
        formatted_messages = prompt.get_formatted_messages(
            messages=state.messages,
            mission=state.mission,
            available_assets=available_assets,
            completed_hops=state.mission.hops if state.mission else []
        )
        schema = prompt.get_schema()

        response = await client.chat.completions.create(
            model="gpt-4o",
            messages=formatted_messages,
            response_format={
                "type": "json_schema",
                "json_schema": {    
                    "schema": schema,
                    "name": prompt.get_response_model_name()
                }
            }
        )   
        
        response_text = response.choices[0].message.content
        parsed_response = prompt.parse_response(response_text)
        print("================================================")
        print("Parsed hop design response:", parsed_response)

        if parsed_response.hop_proposal:
            # Convert hop proposal to Hop object
            hop_proposal = parsed_response.hop_proposal
            
            # Create output mapping based on whether this is a final hop
            output_mapping = {}
            if hop_proposal.is_final and hop_proposal.output_mission_asset_id:
                # For final hops, map to mission output
                output_mapping[hop_proposal.output_asset.name] = hop_proposal.output_mission_asset_id
            else:
                # For intermediate hops, create a new asset ID
                output_mapping[hop_proposal.output_asset.name] = f"hop_{hop_proposal.name.lower().replace(' ', '_')}_output"
            
            new_hop = Hop(
                id=str(uuid.uuid4()),
                name=hop_proposal.name,
                description=hop_proposal.description,
                input_mapping=hop_proposal.input_mapping,
                output_mapping=output_mapping,
                is_final=hop_proposal.is_final,
                status=ExecutionStatus.PENDING
            )
            
            # Update state with new hop
            state.current_hop = new_hop
            state.mission.current_hop = new_hop
            state.mission.hop_status = HopStatus.HOP_PROPOSED

        response_message = Message(
            id=str(uuid.uuid4()),
            role=MessageRole.ASSISTANT,
            content=parsed_response.response_content,
            timestamp=datetime.now().isoformat()
        )

        # Route back to supervisor
        next_node = "supervisor_node"

        state_update = {
            "messages": [*state.messages, response_message.model_dump()],
            "mission": state.mission,
            "tool_params": {},
            "next_node": next_node,
            "current_hop": state.current_hop,
            "available_assets": state.available_assets
        }

        if writer:
            agent_response = AgentResponse(
                token=response_message.content[0:100],
                response_text=parsed_response.response_content,
                status="hop_designer_completed",
                error=None,
                debug=f"Hop proposed: {new_hop.name if parsed_response.hop_proposal else 'No hop proposed'}, waiting for user approval",
                payload=serialize_state(State(**state_update))
            )

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

    if writer:
        writer({
            "status": "hop_implementer_starting",
            "payload": serialize_state(state)
        })
    
    try:
        if not state.current_hop:
            raise ValueError("No current hop to implement")

        # Create and format the prompt
        prompt = HopImplementerPrompt()
        
        # Convert mission state assets to list format for the prompt
        available_assets = [asset.model_dump() for asset in state.mission.state.values()] if state.mission else []
        
        formatted_messages = prompt.get_formatted_messages(
            messages=state.messages,
            mission=state.mission,
            current_hop=state.current_hop,
            available_assets=available_assets
        )
        schema = prompt.get_schema()

        response = await client.chat.completions.create(
            model="gpt-4o",
            messages=formatted_messages,
            response_format={
                "type": "json_schema",
                "json_schema": {    
                    "schema": schema,
                    "name": prompt.get_response_model_name()
                }
            }
        )   
        
        response_text = response.choices[0].message.content
        parsed_response = prompt.parse_response(response_text)
        print("================================================")
        print("Parsed hop implementation response:", parsed_response)

        if parsed_response.implementation:
            # Populate the hop's steps from the implementation
            implementation = parsed_response.implementation
            
            # Import ToolStep from schemas
            from schemas.workflow import ToolStep as SchemaToolStep
            
            # Convert implementation tool steps to schema ToolSteps
            for impl_step in implementation.tool_steps:
                schema_step = SchemaToolStep(
                    id=str(uuid.uuid4()),
                    tool_name=impl_step.tool_name.value,  # Convert enum to string
                    description=impl_step.description,
                    parameter_mapping=impl_step.parameter_mapping,
                    result_mapping=impl_step.output_mapping  # Note: renamed from output_mapping to result_mapping
                )
                state.current_hop.steps.append(schema_step)
            
            state.current_hop.is_resolved = True
            state.current_hop.status = ExecutionStatus.PENDING
            
            # Set hop status to ready to execute
            state.mission.hop_status = HopStatus.HOP_READY_TO_EXECUTE
            
            # For now, simulate execution completion
            # In a real implementation, this would be handled by a hop executor
            state.current_hop.status = ExecutionStatus.COMPLETED
            state.mission.hops.append(state.current_hop)
            
            # Simulate creating output assets based on output mapping
            # In real implementation, these would be created by tool execution
            for local_key, external_id in state.current_hop.output_mapping.items():
                # Create a placeholder asset
                from schemas.asset import AssetType
                placeholder_asset = Asset(
                    id=external_id,
                    name=local_key,
                    description=f"Output from {state.current_hop.name}",
                    type=AssetType.FILE,  # Default type, would be determined by tool
                    is_collection=False,
                    content={"placeholder": "This would contain actual tool output"},
                    asset_metadata={
                        "createdAt": datetime.now().isoformat(),
                        "updatedAt": datetime.now().isoformat(),
                        "creator": state.current_hop.name,
                        "tags": [],
                        "agent_associations": [],
                        "version": 1,
                        "token_count": 0
                    }
                )
                state.mission.state[external_id] = placeholder_asset
            
            # Check if mission is complete (before clearing current_hop)
            is_final_hop = state.current_hop.is_final
            
            # Clear current hop
            state.current_hop = None
            state.mission.current_hop = None
            
            # Update hop status based on whether this was the final hop
            if is_final_hop:
                state.mission.hop_status = HopStatus.ALL_HOPS_COMPLETE
            else:
                state.mission.hop_status = HopStatus.READY_TO_DESIGN

        response_message = Message(
            id=str(uuid.uuid4()),
            role=MessageRole.ASSISTANT,
            content=parsed_response.response_content,
            timestamp=datetime.now().isoformat()
        )

        # Route back to supervisor
        next_node = "supervisor_node"

        state_update = {
            "messages": [*state.messages, response_message.model_dump()],
            "mission": state.mission,
            "tool_params": {},
            "next_node": next_node,
            "current_hop": state.current_hop,
            "available_assets": state.available_assets
        }

        if writer:
            hop_name = state.current_hop.name if state.current_hop else "Hop completed"
            next_status = "ready for next hop" if not is_final_hop else "mission complete"
            
            agent_response = AgentResponse(
                token=response_message.content[0:100],
                response_text=parsed_response.response_content,
                status="hop_implementer_completed",
                error=None,
                debug=f"Hop implemented and executed: {hop_name}, {next_status}",
                payload=serialize_state(State(**state_update))
            )

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
graph_builder.add_node("asset_search_node", asset_search_node)
graph_builder.add_node("mission_specialist_node", mission_specialist_node)
graph_builder.add_node("hop_designer_node", hop_designer_node)
graph_builder.add_node("hop_implementer_node", hop_implementer_node)

# Add edges - define all possible paths
graph_builder.add_edge(START, "supervisor_node")

# Supervisor can route to different nodes based on state
# The supervisor node will use the Command object to determine next node

# Compile the graph with streaming support
compiled = graph_builder.compile()
graph = compiled 
