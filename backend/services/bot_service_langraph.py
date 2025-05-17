from langgraph.graph import StateGraph, END
from typing import TypedDict, List, Dict, Any, Union
import json


class GraphState(TypedDict):
    messages: List[Dict[str, str]]
    response: Union[str, None]
    tool_use_history: List[Dict[str, Any]]
    iteration: int
    assets: List[Dict[str, Any]]
    response_type: str


def receive_user_message(state: GraphState) -> GraphState:
    user_msg = {"role": "user", "content": "Tell me something useful"}
    state["messages"].append(user_msg)
    return state


def call_llm_with_prompt(state: GraphState) -> GraphState:
    # Simulated LLM output (either a tool call or a final response)
    if state["iteration"] < 2:
        state["response"] = json.dumps({
            "type": "tool",
            "tool": {"name": "search", "parameters": {"query": "LangGraph"}}
        })
    else:
        state["response"] = json.dumps({
            "type": "final_response",
            "response": "Here's what I found on LangGraph..."
        })
    return state


def parse_llm_response(state: GraphState) -> GraphState:
    try:
        data = json.loads(state["response"])
        state["response_type"] = data.get("type", "error")
    except Exception:
        state["response_type"] = "error"
    return state


def execute_tool(state: GraphState) -> GraphState:
    state["tool_use_history"].append({
        "iteration": state["iteration"] + 1,
        "tool": {"name": "search", "parameters": {"query": "LangGraph"}},
        "results": ["LangGraph helps you build async, stateful apps."]
    })
    state["messages"].append({
        "role": "assistant",
        "content": "Tool used: search"
    })
    state["iteration"] += 1
    return state


def format_final_response(state: GraphState) -> GraphState:
    state["messages"].append({
        "role": "assistant",
        "content": json.loads(state["response"])["response"]
    })
    return state


def format_tool_limit_response(state: GraphState) -> GraphState:
    state["messages"].append({
        "role": "assistant",
        "content": "I’ve reached the max number of tool uses. Please rephrase."
    })
    return state


def handle_error(state: GraphState) -> GraphState:
    state["messages"].append({
        "role": "assistant",
        "content": "Something went wrong parsing the AI response."
    })
    return state


builder = StateGraph(GraphState)

builder.set_entry_point("receive_message")
builder.add_node("receive_message", receive_user_message)
builder.add_node("call_llm", call_llm_with_prompt)
builder.add_node("parse_response", parse_llm_response)
builder.add_node("run_tool", execute_tool)
builder.add_node("finalize", format_final_response)
builder.add_node("tool_limit_reached", format_tool_limit_response)
builder.add_node("error_handler", handle_error)

builder.add_edge("receive_message", "call_llm")
builder.add_edge("call_llm", "parse_response")

builder.add_conditional_edges("parse_response", lambda s: s["response_type"], {
    "tool": "run_tool",
    "final_response": "finalize",
    "error": "error_handler"
})

builder.add_conditional_edges("run_tool", lambda s: "tool_limit" if s["iteration"] >= 5 else "call_llm", {
    "tool_limit": "tool_limit_reached",
    "call_llm": "call_llm"
})

builder.add_edge("finalize", END)
builder.add_edge("tool_limit_reached", END)
builder.add_edge("error_handler", END)

graph = builder.compile()
