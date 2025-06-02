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
from schemas.workflow import Mission, WorkflowStatus
from schemas.asset import Asset
from agents.prompts.mission_prompt import AssetLite
import os
from config.settings import settings

from agents.prompts.mission_prompt import MissionDefinitionPrompt, MissionDefinitionResponse
from agents.prompts.workflow_prompt import WorkflowDefinitionPrompt, WorkflowDefinitionResponse

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
    available_assets: List[Dict[str, Any]] = []
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
        return obj

    state_dict = state.model_dump()
    messages = state_dict.get("messages", [])
    for message in messages:
        message["timestamp"] = convert_datetime(message["timestamp"])
        message["content"] = message["content"][0:100]
    
    mission_dict = state.mission.model_dump() if state.mission else None
    if mission_dict:
        mission_dict = convert_datetime(mission_dict)
    
    return {
        "messages": messages, 
        "tool_params": state.tool_params,
        "mission": mission_dict
    }

async def supervisor_node(state: State, writer: StreamWriter, config: Dict[str, Any]) -> AsyncIterator[Dict[str, Any]]:
    """Supervisor node that routes based on mission status"""
    print("Supervisor - Routing based on mission status")
    
    if writer:
        writer({
            "status": "supervisor_routing",
            "payload": serialize_state(state)
        })

    try:
        # Simple routing logic based on mission status
        if not state.mission:
            # No mission exists - create one
            next_node = "mission_specialist_node"
            routing_message = "No mission defined yet. Routing to mission specialist to help define your mission."
        elif state.mission.status == WorkflowStatus.PENDING:
            # Mission is pending - needs definition
            next_node = "mission_specialist_node"
            routing_message = "Mission is in pending status. Routing to mission specialist to complete the mission definition."
        elif state.mission.status == WorkflowStatus.READY:
            # Mission is ready - needs workflow
            next_node = "workflow_specialist_node"
            routing_message = "Mission is defined and ready. Routing to workflow specialist to design the workflow."
        elif state.mission.status == WorkflowStatus.IN_PROGRESS:
            # Mission is in progress - could route to execution or monitoring
            next_node = "workflow_specialist_node"  # For now, go to workflow specialist
            routing_message = "Mission is in progress. Routing to workflow specialist for workflow updates."
        else:
            # Default case - end or handle completed/failed missions
            next_node = END
            routing_message = f"Mission status is {state.mission.status}. No further routing needed."

        # Create a simple routing message
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
            "available_assets": state.available_assets
        }

        # Stream response and return command
        if writer:
            agent_response = AgentResponse(
                token=routing_message,
                response_text=routing_message,
                status="supervisor_routing_completed",
                error=None,
                debug=f"Routing to: {next_node}",
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
            available_assets=state.available_assets,
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
            "available_assets": state.available_assets,
            "tool_params": {},
            "next_node": next_node,
        }

        if writer:
            agent_response = AgentResponse(
                token=response_message.content[0:100],
                response_text=parsed_response.response_content,
                status="mission_specialist_completed",
                error=None,
                debug="hello",
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

async def workflow_specialist_node(state: State, writer: StreamWriter, config: Dict[str, Any]) -> AsyncIterator[Dict[str, Any]]:
    """Node that handles workflow specialist operations"""
    print("Workflow specialist node")

    if writer:
        writer({
            "status": "workflow_specialist_starting",
            "payload": serialize_state(state)
        })
    
    try:
        # Create and format the prompt
        prompt = WorkflowDefinitionPrompt()
        formatted_messages = prompt.get_formatted_messages(
            messages=state.messages,
            mission=state.mission,
            available_assets=state.available_assets,
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
        print("Parsed workflow response:", parsed_response)

        if parsed_response.workflow_proposal:
            # Create a new workflow and add it to the mission
            workflow_proposal = parsed_response.workflow_proposal
            
            # TODO: Convert WorkflowProposal to actual Workflow object
            # For now, we'll just update the mission status to show workflow planning is in progress
            state.mission.status = WorkflowStatus.READY  # Update status to indicate workflow is being planned

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
            "available_assets": state.available_assets,
            "tool_params": {},
            "next_node": next_node,
        }

        if writer:
            agent_response = AgentResponse(
                token=response_message.content[0:100],
                response_text=parsed_response.response_content,
                status="workflow_specialist_completed",
                error=None,
                debug="workflow planning complete",
                payload=serialize_state(State(**state_update))
            )

            writer(agent_response.model_dump())

        return Command(goto=next_node, update=state_update)

    except Exception as e:
        import traceback
        error_traceback = traceback.format_exc()
        print("Error in workflow specialist node:", error_traceback)
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
graph_builder.add_node("workflow_specialist_node", workflow_specialist_node)

# Add edges - define all possible paths
graph_builder.add_edge(START, "supervisor_node")

# Supervisor can route to different nodes based on state
# The supervisor node will use the Command object to determine next node

# Compile the graph with streaming support
compiled = graph_builder.compile()
graph = compiled 
