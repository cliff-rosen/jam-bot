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
from schemas.workflow import Mission
from schemas.asset import Asset
from agents.prompts.mission_prompt import AssetLite
import os
from config.settings import settings

from agents.prompts.supervisor_prompt import SupervisorPrompt, SupervisorResponse
from agents.prompts.mission_prompt import MissionDefinitionPrompt, MissionDefinitionResponse

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
    """Supervisor node that either answers directly or routes to specialists"""
    print("Supervisor")
    
    if writer:
        writer({
            "status": "supervisor_request",
            "payload": serialize_state(state)
        })

    try:
        # Create and format the prompt from the messages and payload
        prompt = SupervisorPrompt()
        formatted_messages = prompt.get_formatted_messages(
            messages=state.messages,
            mission=state.mission,
            available_assets=state.available_assets
        )
        schema = prompt.get_schema()
        
        # Use OpenAI responses API with vector store integration
        response = await client.chat.completions.create(
            model="gpt-4o",
            messages=formatted_messages,
            response_format={
                "type": "json_schema",
                "json_schema": {
                    "schema": schema,
                    "name": prompt.get_response_model_name()
                }
            },
            temperature=0.0
        )
                   
        # Extract JSON content from between code blocks if present
        response_text = response.choices[0].message.content
        parsed_response = prompt.parse_response(response_text)

        # Create a response message
        response_message = Message(
            id=str(uuid.uuid4()),
            role=MessageRole.ASSISTANT,
            content=parsed_response.response_text,
            timestamp=datetime.now().isoformat()
        )

        next_node = END

        state_update = {
            "messages": [*state.messages, response_message.model_dump()],
            "mission": state.mission,
            "next_node": next_node,
            "tool_params": state.tool_params,
            "available_assets": state.available_assets
        }

        # Handle tool calls if present        
        if parsed_response.tool_call:
            print("Tool call:", parsed_response.tool_call)
            tool_call = parsed_response.tool_call
            if tool_call.name == "asset_retrieve":
                # TODO: Implement asset retrieval
                pass
            elif tool_call.name == "asset_search":
                # Route to asset search node with the query
                next_node = "asset_search_node"
                # Add the search parameters to the state update
                state_update["tool_params"] = {
                    "asset_id": tool_call.parameters.get("asset_id"),
                    "query": tool_call.parameters.get("query")
                }
                state_update["next_node"] = next_node
            elif tool_call.name == "mission_specialist":
                next_node = "mission_specialist_node"
                state_update["tool_params"] = {
                    "request_for_mission_specialist": tool_call.parameters.get("request_for_mission_specialist")
                }
                state_update["next_node"] = next_node
            else:
                raise ValueError(f"Unknown tool call: {tool_call.name}")

        # Stream response and return command
        if writer:
            agent_response = AgentResponse(
                token=response_message.content[0:100],
                response_text=parsed_response.response_text,
                status="supervisor_completed",
                error=None,
                debug="hello",
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
        search_params = state.search_params
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
            "search_params": state.search_params,
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

# Add edges - define all possible paths
graph_builder.add_edge(START, "mission_specialist_node")

# Supervisor can go to either asset search or END

# Compile the graph with streaming support
compiled = graph_builder.compile()
graph = compiled 
