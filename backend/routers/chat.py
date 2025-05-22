from fastapi import APIRouter, Request
from datetime import datetime
import json
import uuid
import os
from sse_starlette.sse import EventSourceResponse

from schemas import Message, MessageRole, BotRequest
from agents.primary_agent import graph, State

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
router = APIRouter(prefix="/bot", tags=["bot"])


@router.post("/stream")
async def bot_stream(request: Request, bot_request: BotRequest):
    """Endpoint that streams responses from the graph"""
    
    async def event_generator():
        """Generate SSE events from graph outputs"""
        try:
            # Convert history to Message objects
            messages = [
                Message(
                    id=str(uuid.uuid4()),
                    role=MessageRole.USER if msg.role == "user" else MessageRole.ASSISTANT,
                    content=msg.content,
                    timestamp=msg.timestamp.isoformat()
                )
                for msg in bot_request.history
            ]
            
            # Add the current message
            current_message = Message(
                id=str(uuid.uuid4()),
                role=MessageRole.USER,
                content=bot_request.message,
                timestamp=datetime.now().isoformat()
            )
            messages.append(current_message)
            
            state = State(
                messages=messages,
                supervisor_response=None,
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

