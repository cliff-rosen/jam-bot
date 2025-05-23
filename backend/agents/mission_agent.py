from typing import Annotated, Dict, Any, AsyncIterator, List, Optional, Iterator, TypedDict, Callable, Union
import json
from datetime import datetime
from serpapi import GoogleSearch
import uuid

from langchain_core.messages import HumanMessage, AIMessage, SystemMessage, ToolMessage
from langchain_openai import ChatOpenAI

from langgraph.graph import StateGraph, START, END
from langgraph.types import StreamWriter, Send, Command

from schemas.chat import Message, MessageRole, AgentResponse
from schemas.workflow import Mission
import os

from agents.prompts.mission_prompt import MissionDefinitionPrompt, MissionDefinitionResponse

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

SYSTEM_MESSAGE = """
You are a helpful assistant named Jack that can answer question.
"""


class State(TypedDict):
    """State for the RAVE workflow"""
    messages: List[Message]
    mission: Mission
    next_node: str

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

async def llm_call(state: State, writer: StreamWriter, config: Dict[str, Any]) -> AsyncIterator[Dict[str, Any]]:
    """Process messages through the LLM and stream the response"""
    if writer:
        writer({"status": "in_progress"})

    llm = getModel("llm", config, writer)
    
    # Convert messages to LangChain format
    langchain_messages = [SystemMessage(content=SYSTEM_MESSAGE)]
    for msg in state["messages"]:
        if msg.role == MessageRole.USER:
            langchain_messages.append(HumanMessage(content=msg.content))
        elif msg.role == MessageRole.ASSISTANT:
            langchain_messages.append(AIMessage(content=msg.content))
        elif msg.role == MessageRole.SYSTEM:
            langchain_messages.append(SystemMessage(content=msg.content))

    # Stream the response
    response_content = ""
    async for chunk in llm.astream(langchain_messages):
        if writer:
            writer({
                "token": chunk.content,
                "metadata": {
                    "type": "token",
                    "timestamp": datetime.now().isoformat()
                }
            })
        response_content += chunk.content

    try:
        # Try to parse the response as JSON
        response_json = json.loads(response_content)
    except json.JSONDecodeError:
        # If not JSON, assume it's a regular response
        pass

    # Create the response message
    response_message = Message(
        id=str(uuid.uuid4()),
        role=MessageRole.ASSISTANT,
        content=response_content,
        timestamp=datetime.now().isoformat()
    )

    if writer:
        writer({"status": "completed"})

    return {
        "messages": [response_message]
    }

async def mission_definition_node(state: State, writer: StreamWriter, config: Dict[str, Any]) -> AsyncIterator[Dict[str, Any]]:
    """Mission definition node that either answers directly or routes to specialists"""
    if writer:
        writer({"status": "mission definition starting"})

    llm = getModel("supervisor", config, writer)
    
    # Get the last user message
    last_message = state["messages"][-1]
    if not last_message:
        raise ValueError("No user message found in state")

    message_history = "\n".join([f"{msg.role}: {msg.content}" for msg in state["messages"]])

    try:
        if writer:
            writer({
                "status": "starting mission definition agent..."
            })

        # Create and format the prompt
        prompt = MissionDefinitionPrompt()
        formatted_prompt = prompt.get_formatted_prompt(
            user_input=last_message.content,
            message_history=message_history,
            mission=state["mission"]
        )

        # Generate and parse the response
        response = await llm.ainvoke(formatted_prompt)
        mission_definition = prompt.parse_response(response.content)  # Use response.content instead of response
        
        # Create a response message
        current_time = datetime.now().isoformat()
        response_message = Message(
            id=str(uuid.uuid4()),
            role=MessageRole.ASSISTANT,
            content=mission_definition.response_content,
            timestamp=current_time
        )

        # Based on response type, determine next node
        next_node = END

        if writer:
            agent_response = AgentResponse(
                token=mission_definition.response_content,
                message=mission_definition.response_content,
                status="mission_definition_completed: " + mission_definition.response_type,
                supervisor_response=mission_definition.dict(),  # Use dict() to serialize the response
                next_node=next_node,
                error=None
            )
            writer(agent_response.dict())

        return Command(goto=next_node, update={"messages": [response_message]})

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
graph_builder.add_node("mission_definition_node", mission_definition_node)
# graph_builder.add_node("mission_proposal_node", mission_proposal_node)
# graph_builder.add_node("workflow_node", workflow_node)
# Add edges
graph_builder.add_edge(START, "mission_definition_node")

# Compile the graph with streaming support
compiled = graph_builder.compile()
graph = compiled 