from fastapi import APIRouter, Request, Depends, HTTPException
from datetime import datetime
import json
import uuid
import os
from sse_starlette.sse import EventSourceResponse
from typing import Optional, List, Dict, Any

from schemas import Message, MessageRole, ChatRequest, ChatResponse
from schemas.workflow import Mission
#from agents.mission_agent import graph, State
from agents.primary_agent import graph, State
from services.ai_service import ai_service, LLMRequest

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
router = APIRouter(prefix="/chat", tags=["chat"])


@router.post("/stream")
async def chat_stream(chat_request: ChatRequest):
    """Endpoint that streams responses from the graph"""
    
    async def event_generator():
        """Generate SSE events from graph outputs"""
        try:
            # Convert history to Message objects
            messages = [
                Message(
                    id=msg.id,
                    role=msg.role,
                    content=msg.content,
                    timestamp=msg.timestamp.isoformat() if type(msg.timestamp) == datetime else msg.timestamp
                )
                for msg in chat_request.history
            ]
            
            # Add the current message
            current_message = Message(
                id=str(uuid.uuid4()),
                role=MessageRole.USER,
                content=chat_request.message,
                timestamp=datetime.now().isoformat()
            )
            messages.append(current_message)

            # Add the mission
            mission_dict = chat_request.payload["mission"]
            mission = Mission(
                id=mission_dict["id"],
                name=mission_dict["name"],
                description=mission_dict["description"],
                goal=mission_dict["goal"],
                success_criteria=mission_dict["success_criteria"],
                inputs=mission_dict["inputs"],
                outputs=mission_dict["outputs"],
                status=mission_dict["status"],
            )
            
            state = State(
                messages=messages,
                mission=mission,
                next_node=None,
            )
            
            # Stream responses from the graph
            async for chunk in graph.astream(state, stream_mode="custom"):
                yield {
                    "event": "message",
                    "data": json.dumps(chunk)
                }
                
        except Exception as e:
            # Handle errors
            print(f"Error: {e}")
            yield {
                "event": "error",
                "data": json.dumps({"status": "error", "message": str(e)})
            }
    
    return EventSourceResponse(event_generator())


@router.post("/llm", response_model=ChatResponse)
async def invoke_llm(
    request: LLMRequest,
    stream: bool = False
):
    """
    Invoke an LLM with the given request parameters.
    
    Args:
        request: LLM request parameters including messages, model, etc.
        stream: Whether to stream the response
        
    Returns:
        ChatResponse with the LLM's response
    """
    try:
        # Set streaming flag
        request["stream"] = stream
        
        if stream:
            # For streaming responses, return an EventSourceResponse
            async def event_generator():
                try:
                    async for chunk in ai_service.invoke_llm(request):
                        yield {
                            "event": "message",
                            "data": json.dumps({"content": chunk})
                        }
                except Exception as e:
                    yield {
                        "event": "error",
                        "data": json.dumps({"error": str(e)})
                    }
            
            return EventSourceResponse(event_generator())
        else:
            # For non-streaming responses, return a regular response
            response = await ai_service.invoke_llm(request)
            
            # Create a response message
            message = Message(
                id=str(uuid.uuid4()),
                role=MessageRole.ASSISTANT,
                content=response,
                timestamp=datetime.now().isoformat()
            )
            
            return ChatResponse(
                message=message,
                payload={}
            )
            
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error invoking LLM: {str(e)}"
        )

