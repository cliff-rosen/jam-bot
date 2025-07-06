from fastapi import APIRouter, Request, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime
import json
import uuid
import os
from sse_starlette.sse import EventSourceResponse
from typing import Optional, List, Dict, Any
from pydantic import BaseModel

from database import get_db
from services.auth_service import validate_token
from services.mission_service import MissionService
from schemas import Message, MessageRole, ChatRequest, ChatResponse
from schemas.workflow import Mission
from agents.primary_agent import graph as primary_agent, State
from services.ai_service import ai_service, LLMRequest
from utils.mission_utils import enrich_chat_context_with_assets

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
router = APIRouter(prefix="/chat", tags=["chat"])

class ResponsesAPIRequest(BaseModel):
    """Request model for the responses API"""
    input_text: str
    model: str = "gpt-4o"
    tools: Optional[List[Dict[str, Any]]] = None
    include: Optional[List[str]] = None
    max_output_tokens: Optional[int] = None

@router.post("/stream")
async def chat_stream(
    chat_request: ChatRequest, 
    db: Session = Depends(get_db),
    current_user = Depends(validate_token)
):
    """Endpoint that streams responses from the graph"""
    
    async def event_generator():
        """Generate SSE events from graph outputs"""
        try:
            # Get mission from database if mission_id is provided
            mission = None
            if chat_request.mission_id:
                mission_service = MissionService(db)
                mission = await mission_service.get_mission(chat_request.mission_id, current_user.user_id)
                
                if not mission:
                    raise HTTPException(status_code=404, detail="Mission not found")
            
            # Enrich the payload with asset summaries from backend
            enriched_payload = await enrich_chat_context_with_assets(
                chat_request.payload or {}, 
                current_user.user_id, 
                db
            )
            
            # Initialize state with all messages and enriched payload
            state = State(
                messages=chat_request.messages,
                mission=mission,
                mission_id=chat_request.mission_id,
                tool_params={},
                next_node="supervisor_node",
                asset_summaries=enriched_payload.get("asset_summaries", {})
            )
            
            # Create config for graph execution with database access
            graph_config = {
                "db": db,
                "user_id": current_user.user_id
            }
            
            # Run the graph
            async for output in primary_agent.astream(state, stream_mode="custom", config=graph_config):
                if isinstance(output, dict):
                    # Convert any Message objects in the dict to their dict representation
                    processed_output = {}
                    for key, value in output.items():
                        if isinstance(value, Message):
                            processed_output[key] = value.model_dump()
                        else:
                            processed_output[key] = value
                    
                    yield {
                        "event": "message",
                        "data": json.dumps(processed_output)
                    }
                elif isinstance(output, Message):
                    # Convert Message object to dict before JSON serialization
                    yield {
                        "event": "message",
                        "data": json.dumps(output.model_dump())
                    }
                else:
                    # Handle other output types
                    yield {
                        "event": "message",
                        "data": json.dumps({"content": str(output)})
                    }
                    
        except Exception as e:
            # Log the error
            print(f"Error in chat_stream: {str(e)}")
            # Send error event
            yield {
                "event": "error",
                "data": json.dumps({"error": str(e)})
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

@router.post("/responses")
async def invoke_responses_api(query: str) -> Dict[str, Any]:
    """
    Invoke the OpenAI responses API with the given parameters.
    
    Args:
        query: The input text to process
        
    Returns:
        Dictionary containing the API response
    """
    try:
        response = await ai_service.invoke_responses_api(
            input_text=query
        )
        # Convert response object to dictionary using model_dump()
        return response.model_dump(exclude_none=True)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error invoking responses API: {str(e)}"
        )

