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

from agents.prompts.supervisor_prompt import SupervisorPrompt, SupervisorResponse

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
WEATHER_API_KEY = os.getenv("WEATHER_API_KEY")

SYSTEM_MESSAGE = """
You are a helpful assistant named Jack that can answer question.
"""


class State(TypedDict):
    """State for the RAVE workflow"""
    messages: List[Message]
    mission: Mission
    supervisor_response: SupervisorResponse
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

async def supervisor_node(state: State, writer: StreamWriter, config: Dict[str, Any]) -> AsyncIterator[Dict[str, Any]]:
    """Supervisor node that either answers directly or routes to specialists"""
    if writer:
        writer({"status": "supervisor starting"})

    llm = getModel("supervisor", config, writer)
    
    # Get the last user message
    last_message = state["messages"][-1]
    if not last_message:
        raise ValueError("No user message found in state")

    message_history = "\n".join([f"{msg.role}: {msg.content}" for msg in state["messages"]])

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
            mission=state["mission"]
        )

        # Generate and parse the response
        response = await llm.ainvoke(formatted_prompt)
        supervisor_response = prompt.parse_response(response.content)
        
        # Create a response message
        current_time = datetime.now().isoformat()
        response_message = Message(
            id=str(uuid.uuid4()),
            role=MessageRole.ASSISTANT,
            content=supervisor_response.response_content,
            timestamp=current_time
        )

        # Based on response type, determine next node
        next_node = END

        if writer:
            agent_response = AgentResponse(
                token=supervisor_response.response_content,
                message=supervisor_response.response_content,
                status="supervisor_completed: " + supervisor_response.response_type,
                supervisor_response=supervisor_response.dict(),
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

async def mission_proposal_node(state: State, writer: StreamWriter, config: Dict[str, Any]) -> AsyncIterator[Dict[str, Any]]:
    """Generate a mission proposal based on user input"""
    if writer:
        writer({"status": "mission_proposal_in_progress"})

    llm = getModel("mission_proposal", config, writer)
    
    # Get the last user message
    last_message = state["messages"][-1]
    tools_str = "\n".join([f"- {tool.name}: {tool.description}" for tool in state["selectedTools"]])

    if not last_message:
        raise ValueError("No user message found in state")
    print(f"Last message: {last_message}")

    if writer:
        writer({
            "status": "mission_proposal_request: " + last_message.content
        })

    try:
        # Create and format the prompt
        prompt = MissionDefinitionPrompt()
        formatted_prompt = prompt.get_formatted_prompt(
            user_input=last_message.content,
            available_tools=tools_str
        )

        print("Generating response...")
        # Generate and parse the response
        response = await llm.ainvoke(formatted_prompt)

        print("Parsing response...")

        mission_proposal = prompt.parse_response(response.content)
        
        mission_proposal_str = f"**Title:** {mission_proposal.title}\n**Goal:** {mission_proposal.goal}\n\n**Inputs needed:**\n" + "\n".join(f"- {input}" for input in mission_proposal.inputs) + "\n\n**Expected outputs:**\n" + "\n".join(f"- {output}" for output in mission_proposal.outputs) + "\n\n**Success criteria:**\n" + "\n".join(f"- {criteria}" for criteria in mission_proposal.success_criteria)

        # Create a response message
        response_message = Message(
            id=str(uuid.uuid4()),
            role=MessageRole.ASSISTANT,
            content=mission_proposal_str,
            timestamp=datetime.now().isoformat()
        )

        if writer:
            writer({
                "status": "mission_proposal_completed",
                "mission_proposal": mission_proposal.dict()
            })

        return {
            "messages": [response_message],
            "mission_proposal": mission_proposal.dict()
        }

    except Exception as e:
        if writer:
            writer({
                "status": "error",
                "error": str(e)
            })
        raise

async def workflow_node(state: State, writer: StreamWriter, config: Dict[str, Any]) -> AsyncIterator[Dict[str, Any]]:
    """Workflow node that generates a workflow based on a mission proposal"""
    if writer:
        writer({"status": "workflow_in_progress"})

    if writer:
        writer({
            "status": "workflow_completed: workflow node is busy right now",
            "token": "workflow node is busy right now",
            "next_node": END
        })

    return Command(goto=END, update={})


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