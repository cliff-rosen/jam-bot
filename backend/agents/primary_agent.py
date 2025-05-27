from typing import Annotated, Dict, Any, AsyncIterator, List, Optional, Iterator, TypedDict, Callable, Union
import json
from datetime import datetime
from serpapi import GoogleSearch
import uuid
from openai import OpenAI
from pydantic import BaseModel

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
client = OpenAI(api_key=OPENAI_API_KEY)

SYSTEM_MESSAGE = """
You are a helpful assistant named Jack that can answer question.
"""


class State(BaseModel):
    """State for the RAVE workflow"""
    messages: List[Message]
    mission: Mission
    next_node: str

    class Config:
        arbitrary_types_allowed = True

def validate_state(state: State) -> bool:
    """Validate the state before processing"""
    return True

def getModel(node_name: str, config: Dict[str, Any], writer: Optional[Callable] = None) -> ChatOpenAI:
    """Get the appropriate model for a given node."""
    model_name = "gpt-4o"  
    
    chat_config = {
        "model": model_name,
        "api_key": OPENAI_API_KEY
    }
    
    return ChatOpenAI(**chat_config)

async def supervisor_node(state: State, writer: StreamWriter, config: Dict[str, Any]) -> AsyncIterator[Dict[str, Any]]:
    """Supervisor node that either answers directly or routes to specialists"""
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
            mission=state.mission
        )

       
        # Get the schema and add the required name field
        schema = SupervisorResponse.model_json_schema()
        
        # Use OpenAI responses API with vector store integration
        response = client.chat.completions.create(
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
        supervisor_response_obj = prompt.parse_response(json_content)

        # Create a response message
        current_time = datetime.now().isoformat()
        response_message = Message(
            id=str(uuid.uuid4()),
            role=MessageRole.ASSISTANT,
            content=supervisor_response_obj.response_text,
            timestamp=current_time
        )

        # Handle tool calls if present
        next_node = END
        if supervisor_response_obj.tool_call:
            tool_call = supervisor_response_obj.tool_call
            if tool_call.name == "asset_retrieve":
                # TODO: Implement asset retrieval
                pass
            elif tool_call.name == "asset_search":
                # TODO: Implement asset search
                pass
            else:
                raise ValueError(f"Unknown tool call: {tool_call.name}")

        if writer:
            agent_response = AgentResponse(
                token=supervisor_response_obj.response_text,
                message=supervisor_response_obj.response_text,
                status="supervisor_completed",
                supervisor_payload=response.model_dump(),
                mission_response=None,
                next_node=next_node,
                error=None
            )
            writer(agent_response.model_dump())

        return Command(goto=next_node, update={"messages": [response_message.model_dump()]})

    except Exception as e:
        if writer:
            writer({
                "status": "error",
                "error": str(e)
            })
        raise


async def asset_search_node(state: State, writer: StreamWriter, config: Dict[str, Any]) -> AsyncIterator[Dict[str, Any]]:
    """Supervisor node that either answers directly or routes to specialists"""
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
        formatted_prompt = prompt.get_formatted_prompt(
            user_input=last_message.content,
            message_history=message_history,    
            mission=state.mission
        )

        # Use OpenAI responses API with vector store integration
        response = client.responses.parse(
            model="gpt-4o",
            input=formatted_prompt,
            text_format=SupervisorResponse,
            tools=[{
                "type": "file_search",
                "vector_store_ids": [VECTOR_STORE_ID]
            }],
            include=["file_search_call.results"]
        )
                   
        # Extract JSON content from between code blocks if present
        response_text = response.output_text
        if "```json" in response_text:
            # Extract content between code blocks
            json_content = response_text.split("```json")[1].split("```")[0].strip()
        else:
            json_content = response_text

        # Parse the response
        supervisor_response_obj = prompt.parse_response(json_content)

        # Create a response message
        current_time = datetime.now().isoformat()
        response_message = Message(
            id=str(uuid.uuid4()),
            role=MessageRole.ASSISTANT,
            content=supervisor_response_obj.response_content,
            timestamp=current_time
        )

        # Based on response type, determine next node
        next_node = END

        if writer:
            agent_response = AgentResponse(
                token=supervisor_response_obj.response_content,
                message=supervisor_response_obj.response_content,
                status="supervisor_completed: " + supervisor_response_obj.response_type,
                supervisor_payload=response.model_dump(),
                mission_response=None,
                next_node=next_node,
                error=None
            )
            writer(agent_response.model_dump())

        return Command(goto=next_node, update={"messages": [response_message.model_dump()]})

    except Exception as e:
        if writer:
            writer({
                "status": "error",
                "error": str(e)
            })
        raise


### Graph

# Define the graph
graph_builder = StateGraph(State)

# Add nodes
graph_builder.add_node("supervisor_node", supervisor_node)
# graph_builder.add_node("mission_proposal_node", mission_proposal_node)
# graph_builder.add_node("workflow_node", workflow_node)
# Add edges
graph_builder.add_edge(START, "supervisor_node")

# Compile the graph with streaming support
compiled = graph_builder.compile()
graph = compiled 