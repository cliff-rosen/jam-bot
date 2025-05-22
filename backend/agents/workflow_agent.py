from typing import Annotated, Dict, Any, AsyncIterator, List, Optional, Iterator, TypedDict, Callable, Union
from pydantic import BaseModel, Field
import json
from datetime import datetime
from serpapi import GoogleSearch
import uuid

from langchain_core.messages import HumanMessage, AIMessage, SystemMessage, ToolMessage
from langchain_openai import ChatOpenAI
from langchain_community.tools.tavily_search import TavilySearchResults
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import PydanticOutputParser
from langchain_community.document_loaders import WebBaseLoader

from langgraph.graph import StateGraph, START, END
from langgraph.graph.message import add_messages
from langgraph.checkpoint.memory import MemorySaver
from langgraph.types import StreamWriter, Send, Command


from backend.schemas.chat import Message, ChatResponse, MessageRole, Mission, Tool, Asset, MissionProposal
import os

from agents.prompts.mission_definition import MissionDefinitionPrompt, MissionProposal
from agents.prompts.supervisor_prompt import SupervisorPrompt, SupervisorResponse
from agents.prompts.stage_generator import StageGeneratorPrompt, StageGeneratorResponse

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
WEATHER_API_KEY = os.getenv("WEATHER_API_KEY")


class State(TypedDict):
    """State for the RAVE workflow"""
    messages: List[Message]
    mission: Mission
    selectedTools: List[Tool]
    assets: List[Asset]
    supervisor_response: SupervisorResponse
    next_node: str

def validate_state(state: State) -> bool:
    """Validate the state before processing"""
    return True

def getModel(node_name: str, config: Dict[str, Any], writer: Optional[Callable] = None) -> ChatOpenAI:
    """Get the appropriate model for a given node."""
    model_name = "gpt-4o-mini"  
    
    chat_config = {
        "model": model_name,
        "api_key": OPENAI_API_KEY
    }
    
    return ChatOpenAI(**chat_config)

async def stage_generator_node(state: State, writer: StreamWriter, config: Dict[str, Any]) -> AsyncIterator[Dict[str, Any]]:
    """Generate a mission proposal based on user input"""
    if writer:
        writer({"status": "stage_generator_in_progress"})

    llm = getModel("stage_generator", config, writer)
    
    tools_str = "\n".join([f"- {tool.name}: {tool.description}" for tool in state["selectedTools"]])

    if writer:
        writer({
            "status": "stage_generator_request: " + state["mission"].goal
        })

    try:
        # Extract mission details
        mission = state["mission"]
        inputs_str = "\n".join(f"- {input}" for input in mission.inputs)
        outputs_str = "\n".join(f"- {output}" for output in mission.outputs)

        # Create and format the prompt
        prompt = StageGeneratorPrompt()
        formatted_prompt = prompt.get_formatted_prompt(
            goal=mission.goal,
            inputs=inputs_str,
            outputs=outputs_str,
            tools=tools_str
        )

        print("Generating response...")
        # Generate and parse the response
        response = await llm.ainvoke(formatted_prompt)

        print("Parsing response...")

        stage_generator = prompt.parse_response(response.content)
        
        # Format the response message
        stages_str = "\n".join([
            f"Stage {i+1}: {stage.name}\n"
            f"  Description: {stage.description}\n"
            f"  Inputs: {', '.join(stage.inputs)}\n"
            f"  Outputs: {', '.join(stage.outputs)}\n"
            f"  Success Criteria: {', '.join(stage.success_criteria)}\n"
            for i, stage in enumerate(stage_generator.stages)
        ])

        response_content = f"""**Analysis:** {stage_generator.explanation}

**Stages:**
{stages_str}
"""

        # Create a response message
        response_message = Message(
            id=str(uuid.uuid4()),
            role=MessageRole.ASSISTANT,
            content=response_content,
            timestamp=datetime.now().isoformat()
        )

        if writer:
            writer({
                "status": "stage_generator_completed",
                "stage_generator": stage_generator.dict()
            })

        return {
            "messages": [response_message],
            "stage_generator": stage_generator.dict(),
            "token": response_content
        }

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
graph_builder.add_node("stage_generator", stage_generator_node)

# Add edges
graph_builder.add_edge(START, "stage_generator")

# Compile the graph with streaming support
compiled = graph_builder.compile()
graph = compiled 