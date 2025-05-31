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
    available_assets: List[Dict[str, Any]]
    tool_params: Dict[str, Any]
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

async def mission_definition_node(state: State, writer: StreamWriter, config: Dict[str, Any]) -> AsyncIterator[Dict[str, Any]]:
    """Mission definition node that either answers directly or routes to specialists"""
    if writer:
        writer({"status": "mission definition starting"})


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