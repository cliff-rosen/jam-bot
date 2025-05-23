from fastapi import APIRouter, Request
from datetime import datetime
import json
import uuid
import os
from sse_starlette.sse import EventSourceResponse

from schemas import Message, MessageRole, ChatRequest
from schemas.workflow import Mission
from agents.primary_agent import graph, State

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
router = APIRouter(prefix="/bot", tags=["bot"])


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

