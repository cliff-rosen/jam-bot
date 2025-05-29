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

from schemas.chat import Message, MessageRole, AgentResponse
from schemas.workflow import Mission
import os
from config.settings import settings

from agents.prompts.supervisor_prompt import SupervisorPrompt, SupervisorResponse

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
    next_node: str
    search_params: Dict[str, Any] = {}
    available_assets: List[Dict[str, Any]] = []

    class Config:
        arbitrary_types_allowed = True

def validate_state(state: State) -> bool:
    """Validate the state before processing"""
    return True

async def supervisor_node(state: State, writer: StreamWriter, config: Dict[str, Any]) -> AsyncIterator[Dict[str, Any]]:
    """Supervisor node that either answers directly or routes to specialists"""
    print("Supervisor node")
    if writer:
        writer({"status": "supervisor starting"})
    
    # Get the last user message
    last_message = state.messages[-1]
    if not last_message:
        raise ValueError("No user message found in state")

    message_history = "\n".join([f"{msg.role}: {msg.content}" for msg in state.messages])

    try:
        if writer:
            writer({
                "status": "supervisor_request"
            })

        # Create and format the prompt
        prompt = SupervisorPrompt()
        formatted_messages = prompt.get_formatted_messages(
            user_input=last_message.content,
            message_history=message_history,    
            mission=state.mission,
            available_assets=state.available_assets
        )
        schema = SupervisorResponse.model_json_schema()
        
        # Use OpenAI responses API with vector store integration
        response = await client.chat.completions.create(
            model="gpt-4o",
            messages=formatted_messages,
            response_format={
                "type": "json_schema",
                "json_schema": {
                    "schema": schema,
                    "name": "SupervisorResponse"
                }
            }
        )
                   
        # Extract JSON content from between code blocks if present
        response_text = response.choices[0].message.content

        if "```json" in response_text:
            # Extract content between code blocks
            json_content = response_text.split("```json")[1].split("```")[0].strip()
        else:
            json_content = response_text

        # Parse the response
        parsed_response = prompt.parse_response(json_content)

        # Create a response message
        current_time = datetime.now().isoformat()
        response_message = Message(
            id=str(uuid.uuid4()),
            role=MessageRole.ASSISTANT,
            content=parsed_response.response_text,
            timestamp=current_time
        )

        # Handle tool calls if present
        next_node = END
        state_update = {"messages": [*state.messages, response_message.model_dump()]}
        
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
                state_update["search_params"] = {
                    "asset_id": tool_call.parameters.get("asset_id"),
                    "query": tool_call.parameters.get("query")
                }
            else:
                raise ValueError(f"Unknown tool call: {tool_call.name}")

        if writer:
            agent_response = AgentResponse(
                token=parsed_response.response_text,
                message=parsed_response.response_text,
                status="supervisor_completed",
                supervisor_payload=response.model_dump(),
                mission_response=None,
                next_node=next_node,
                error=None,
                state=state_update,
                debug="hello"
            )
            writer(agent_response.model_dump())

        return Command(goto=next_node, update=state_update)

    except Exception as e:
        if writer:
            writer({
                "status": "error",
                "error": str(e)
            })
        raise

async def asset_search_node(state: State, writer: StreamWriter, config: Dict[str, Any]) -> AsyncIterator[Dict[str, Any]]:
    """Node that handles asset search operations"""
    print("Asset search node")

    if writer:
        writer({"status": "asset_search_starting"})
    
    try:
        if writer:
            writer({
                "status": "asset_search_request"
            })

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

        print("================================================")
        print("Search results:", search_results[0:3])
        print("================================================")

        search_results_string = "Here are the search results for your query: " + search_params["query"] + "\n\n"
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

        if writer:
            agent_response = AgentResponse(
                token=response_message.content,
                message=response_message.content,
                status="asset_search_completed",
                supervisor_payload=response.model_dump(),
                mission_response=None,
                next_node=next_node,
                error=None,
                state={"messages": [*state.messages, response_message.model_dump()]},
                debug="hello"
            )
            writer(agent_response.model_dump())

        state_update = {"messages": [*state.messages, response_message.model_dump()]}

        return Command(goto=next_node, update=state_update)

    except Exception as e:
        print("Error in asset search node:", e)
        if writer:
            writer({
                "status": "error",
                "error": str(e)
            })
        raise

async def test_node(state: State, writer: StreamWriter, config: Dict[str, Any]) -> AsyncIterator[Dict[str, Any]]:
    """Test node that just returns a message"""
    print("Test node")
    if writer:
        writer({"status": "test_starting"})
        
    # sleep for 3 seconds
    await asyncio.sleep(3)

    if writer:
        writer({"status": "test_completed", "message": "Test completed"})
        
    return Command(goto=END)

### Graph

# Define the graph
graph_builder = StateGraph(State)

# Add nodes
graph_builder.add_node("supervisor_node", supervisor_node)
graph_builder.add_node("asset_search_node", asset_search_node)
graph_builder.add_node("test_node", test_node)

# Add edges - define all possible paths
graph_builder.add_edge(START, "supervisor_node")
# graph_builder.add_edge(START, "test_node")

# Supervisor can go to either asset search or END

# Compile the graph with streaming support
compiled = graph_builder.compile()
graph = compiled 
