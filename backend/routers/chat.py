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
from services.ai_service import ai_service, LLMRequest
from services.user_session_service import UserSessionService

from schemas import ChatMessage, MessageRole, ChatRequest, ChatResponse
from models import ChatMessage as ChatMessageModel
from agents.primary_agent import graph as primary_agent, State
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

def save_message_to_db(db: Session, chat_id: str, user_id: str, message: ChatMessage):
    """Helper function to save a ChatMessage object to the database."""
    print(f"Saving message to database: {message.role}")
    existing_count = db.query(ChatMessageModel).filter(
        ChatMessageModel.chat_id == chat_id
    ).count()
    
    chat_message = ChatMessageModel(
        id=str(uuid.uuid4()),
        chat_id=chat_id,
        user_id=user_id,
        sequence_order=existing_count + 1,
        role=message.role,  # Both use the same MessageRole enum
        content=message.content,
        message_metadata=message.message_metadata or {},
        created_at=datetime.utcnow()
    )
    db.add(chat_message)
    db.commit()

@router.post("/stream")
async def chat_stream(
    chat_request: ChatRequest, 
    db: Session = Depends(get_db),
    current_user = Depends(validate_token)
):
    """Endpoint that streams responses from the graph and persists messages"""
    
    async def event_generator():
        """Generate SSE events from graph outputs"""
        try:
            # Get user's active session to find chat_id
            session_service = UserSessionService(db)
            active_session = session_service.get_active_session(current_user.user_id)
            
            if not active_session:
                raise HTTPException(status_code=404, detail="No active session found")
            
            chat_id = active_session.chat_id
            
            # Save the user's message to database first
            if chat_request.messages:
                latest_message = chat_request.messages[-1]  # Get the newest message
                if latest_message.role == MessageRole.USER:
                    save_message_to_db(db, chat_id, current_user.user_id, latest_message)
            
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
            
            # Use mission from payload if no database mission found
            if not mission and enriched_payload and enriched_payload.get("mission"):
                mission = enriched_payload["mission"]
            
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
                # Debug logging to see what we're getting
                print(f"DEBUG: output type: {type(output)}")
                print(f"DEBUG: output content: {output}")
                
                if isinstance(output, dict):
                    # Check for response_text which contains the AI's complete response
                    if "response_text" in output and output["response_text"]:
                        response_content = output["response_text"]
                        print(f"DEBUG: Found response_text: {response_content[:100]}...")
                        
                        # Create ChatMessage from response_text and save it
                        ai_message = ChatMessage(
                            id=str(uuid.uuid4()),
                            chat_id=chat_id,  # Use actual chat_id
                            role=MessageRole.ASSISTANT,
                            content=response_content,
                            message_metadata={},
                            created_at=datetime.utcnow(),
                            updated_at=datetime.utcnow()
                        )
                        save_message_to_db(db, chat_id, current_user.user_id, ai_message)
                        print(f"DEBUG: Saved response_text as ChatMessage to DB")
                    
                    # Check for ChatMessage objects in the dict and save them
                    for key, value in output.items():
                        print(f"DEBUG: dict key={key}, value type={type(value)}")
                        if isinstance(value, ChatMessage):
                            print(f"DEBUG: Found ChatMessage in dict: role={value.role}, content={value.content[:100]}...")
                            # Save ChatMessage to database
                            if value.role in [MessageRole.ASSISTANT, MessageRole.SYSTEM, MessageRole.TOOL, MessageRole.STATUS]:
                                save_message_to_db(db, chat_id, current_user.user_id, value)
                                print(f"DEBUG: Saved message to DB")
                    
                    # Convert any ChatMessage objects in the dict to their dict representation
                    processed_output = {}
                    for key, value in output.items():
                        if isinstance(value, ChatMessage):
                            processed_output[key] = value.model_dump()
                        else:
                            processed_output[key] = value
                    
                    yield {
                        "event": "message",
                        "data": json.dumps(processed_output)
                    }
                elif isinstance(output, ChatMessage):
                    print(f"DEBUG: Found direct ChatMessage: role={output.role}, content={output.content[:100]}...")
                    # Save ChatMessage to database
                    if output.role in [MessageRole.ASSISTANT, MessageRole.SYSTEM, MessageRole.TOOL, MessageRole.STATUS]:
                        save_message_to_db(db, chat_id, current_user.user_id, output)
                        print(f"DEBUG: Saved direct ChatMessage to DB")
                    
                    # Convert ChatMessage object to dict before JSON serialization
                    yield {
                        "event": "message",
                        "data": json.dumps(output.model_dump())
                    }
                else:
                    print(f"DEBUG: Other output type: {type(output)}, content: {str(output)[:100]}...")
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
            message = ChatMessage(
                id=str(uuid.uuid4()),
                chat_id="temp",  # This will need to be updated when we integrate sessions
                role=MessageRole.ASSISTANT,
                content=response,
                message_metadata={},
                created_at=datetime.now(),
                updated_at=datetime.now()
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

@router.get("/{chat_id}/messages")
async def get_chat_messages(
    chat_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(validate_token)
):
    """
    Get all messages for a specific chat.
    
    Args:
        chat_id: The ID of the chat to retrieve messages for
        db: Database session
        current_user: Current authenticated user
        
    Returns:
        Dictionary containing list of chat messages
    """
    try:
        # Query messages for this chat_id, ordered by sequence_order
        messages = db.query(ChatMessageModel).filter(
            ChatMessageModel.chat_id == chat_id,
            ChatMessageModel.user_id == current_user.user_id  # Ensure user can only see their own messages
        ).order_by(ChatMessageModel.sequence_order).all()
        
        # Convert database models to Pydantic schemas
        message_schemas = []
        for msg in messages:
            message_schema = ChatMessage(
                id=msg.id,
                chat_id=msg.chat_id,
                role=msg.role,
                content=msg.content,
                message_metadata=msg.message_metadata or {},
                created_at=msg.created_at,
                updated_at=msg.created_at  # Use created_at since ChatMessage model doesn't have updated_at
            )
            message_schemas.append(message_schema)
        
        return {"messages": message_schemas}
        
    except Exception as e:
        print(f"Error retrieving chat messages: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error retrieving chat messages: {str(e)}"
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

