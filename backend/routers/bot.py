from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from datetime import datetime
from pydantic import BaseModel
from typing import List, Dict, Any
import asyncio
import json
from sse_starlette.sse import EventSourceResponse

from database import get_db
from services.bot_service import BotService
from schemas import Message, MessageRole, BotRequest
# from agents.simple_agent import graph, State
from agents.primary_agent import graph, State
from agents.workflow_agent import graph as workflow_graph
import uuid
import os

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
router = APIRouter(prefix="/api/bot", tags=["bot"])


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
                mission=bot_request.mission,
                mission_proposal=None,
                supervisor_response=None,
                next_node=None,
                selectedTools=bot_request.selectedTools,
                assets=[]
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


@router.post("/workflow/stream")
async def workflow_stream(request: Request, bot_request: BotRequest):
    """Endpoint that streams workflow generation responses"""
    
    async def event_generator():
        """Generate SSE events from workflow graph outputs"""
        try:
            
            state = State(
                messages=[],
                mission=bot_request.mission,
                mission_proposal=None,
                supervisor_response=None,
                next_node=None,
                selectedTools=bot_request.selectedTools,
                assets=[]
            )
            
            # Stream responses from the workflow graph
            async for chunk in workflow_graph.astream(state, stream_mode="custom"):
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


