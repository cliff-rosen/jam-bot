from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime
import uuid
from sse_starlette.sse import EventSourceResponse
from typing import Optional, List, Dict, Any

from database import get_db
from utils.mission_utils import enrich_chat_context_with_assets

from services.auth_service import validate_token
from services.mission_service import MissionService, get_mission_service
from services.user_session_service import UserSessionService, get_user_session_service
from services.chat_service import ChatService, get_chat_service

from schemas.chat import (
    ChatMessage, 
    MessageRole, 
    ChatRequest, 
    ChatStreamResponse,
    AgentResponse,
    StatusResponse
)

from agents.primary_agent import graph as primary_agent, State

router = APIRouter(prefix="/chat", tags=["chat"])





@router.post("/stream", 
    response_class=EventSourceResponse,
    responses={
        200: {
            "description": "Server-Sent Events stream of ChatStreamResponse objects (AgentResponse | StatusResponse)",
            "content": {
                "text/event-stream": {
                    "schema": {
                        "oneOf": [
                            AgentResponse.model_json_schema(),
                            StatusResponse.model_json_schema()
                        ]
                    },
                    "example": "data: {\"token\": \"Hello\", \"response_text\": null, \"payload\": null, \"status\": \"processing\", \"error\": null, \"debug\": null}\n\n"
                }
            }
        }
    },
    summary="Stream chat responses",
    description="Streams ChatStreamResponse objects (AgentResponse | StatusResponse) in real-time using Server-Sent Events"
)
async def chat_stream(
    chat_request: ChatRequest,
    session_service: UserSessionService = Depends(get_user_session_service),
    mission_service: MissionService = Depends(get_mission_service),
    chat_service: ChatService = Depends(get_chat_service),
    current_user = Depends(validate_token),
    db: Session = Depends(get_db)
) -> EventSourceResponse:
    """
    Stream chat responses from the AI agent.
    
    Returns Server-Sent Events where each event data contains a ChatStreamResponse object:
    - AgentResponse: token, response_text, payload, status, error, debug
    - StatusResponse: status, payload, error, debug
    """
    
    async def event_generator():
        """Generate SSE events that are AgentResponse or StatusResponse objects"""
        try:
            active_session = session_service.get_active_session(current_user.user_id)
            if not active_session:
                error_response = AgentResponse(
                    token=None,
                    response_text=None,
                    payload=None,
                    status=None,
                    error="No active session found",
                    debug=None
                )
                yield {
                    "event": "message",
                    "data": error_response.model_dump_json()
                }
                return
            chat_id = active_session.chat_id
            mission_id = active_session.mission_id
            
            # Save user message to database
            if chat_request.messages:
                latest_message = chat_request.messages[-1]
                if latest_message.role == MessageRole.USER:
                    chat_service.save_message(chat_id, current_user.user_id, latest_message)
            
            # Get mission from database
            mission = None
            if mission_id:
                mission = await mission_service.get_mission(mission_id, current_user.user_id)
                if not mission:
                    error_response = AgentResponse(
                        token=None,
                        response_text=None,
                        payload=None,
                        status=None,
                        error="Mission not found",
                        debug=None
                    )
                    yield {
                        "event": "message",
                        "data": error_response.model_dump_json()
                    }
                    return
            
            # Enrich payload with asset summaries
            enriched_payload = await enrich_chat_context_with_assets(
                chat_request.payload or {}, 
                current_user.user_id, 
                db
            )
            
            if not mission and enriched_payload and enriched_payload.get("mission"):
                mission = enriched_payload["mission"]
            
            # Initialize agent state
            state = State(
                messages=chat_request.messages,
                mission=mission,
                mission_id=mission_id,
                tool_params={},
                next_node="supervisor_node",
                asset_summaries=enriched_payload.get("asset_summaries", {})
            )
            
            graph_config = {
                "db": db,
                "user_id": current_user.user_id
            }
            
            # Stream agent responses
            async for output in primary_agent.astream(state, stream_mode="custom", config=graph_config):
                if isinstance(output, dict):
                    # Save AI message to database if response_text exists
                    if "response_text" in output and output["response_text"]:
                        ai_message = ChatMessage(
                            id=str(uuid.uuid4()),
                            chat_id=chat_id,
                            role=MessageRole.ASSISTANT,
                            content=output["response_text"],
                            message_metadata={},
                            created_at=datetime.utcnow(),
                            updated_at=datetime.utcnow()
                        )
                        chat_service.save_message(chat_id, current_user.user_id, ai_message)
                    
                    # Save ChatMessage objects from output
                    for key, value in output.items():
                        if isinstance(value, ChatMessage):
                            if value.role in [MessageRole.ASSISTANT, MessageRole.SYSTEM, MessageRole.TOOL, MessageRole.STATUS]:
                                chat_service.save_message(chat_id, current_user.user_id, value)
                    
                    # Create proper AgentResponse object
                    agent_response = AgentResponse(
                        token=output.get("token"),
                        response_text=output.get("response_text"),
                        payload=output.get("payload"),
                        status=output.get("status"),
                        error=output.get("error"),
                        debug=output.get("debug")
                    )
                    
                    yield {
                        "event": "message",
                        "data": agent_response.model_dump_json()
                    }
                else:
                    # Handle non-dict outputs as AgentResponse
                    agent_response = AgentResponse(
                        token=None,
                        response_text=str(output),
                        payload=None,
                        status=None,
                        error=None,
                        debug={"output_type": type(output).__name__}
                    )
                    
                    yield {
                        "event": "message",
                        "data": agent_response.model_dump_json()
                    }
            
        except Exception as e:
            print(f"Error in chat_stream: {str(e)}")
            error_response = AgentResponse(
                token=None,
                response_text=None,
                payload=None,
                status=None,
                error=str(e),
                debug=None
            )
            yield {
                "event": "error",
                "data": error_response.model_dump_json()
            }
    
    return EventSourceResponse(event_generator())

@router.get("/{chat_id}/messages", response_model=Dict[str, List[ChatMessage]])
async def get_chat_messages(
    chat_id: str,
    current_user = Depends(validate_token),
    chat_service: ChatService = Depends(get_chat_service)
) -> Dict[str, List[ChatMessage]]:
    """Get all messages for a specific chat"""
    try:
        messages = chat_service.get_chat_messages(chat_id, current_user.user_id)
        return {"messages": messages}
        
    except Exception as e:
        print(f"Error retrieving chat messages: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error retrieving chat messages: {str(e)}"
        )

