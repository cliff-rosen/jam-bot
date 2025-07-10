"""
User Session Router

This router handles all HTTP endpoints for user session management.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
from services.auth_service import validate_token
from services.user_session_service import UserSessionService
from models import User
from schemas.user_session import (
    CreateUserSessionRequest,
    UpdateUserSessionRequest
)

router = APIRouter(prefix="/sessions", tags=["sessions"])


@router.post("/initialize")
async def initialize_session(
    request: CreateUserSessionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(validate_token)
):
    """Create new session with fresh chat when none exists"""
    service = UserSessionService(db)
    try:
        response = service.create_user_session(current_user.user_id, request)
        # Return lightweight response - just the pointers
        return {
            "id": response.user_session.id,
            "user_id": response.user_session.user_id,
            "name": response.user_session.name,
            "chat_id": response.chat.id,
            "mission_id": response.user_session.mission.id if response.user_session.mission else None,
            "session_metadata": response.user_session.session_metadata
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get("/active")
async def get_active_session(
    db: Session = Depends(get_db),
    current_user: User = Depends(validate_token)
):
    """Get the user's current active session - returns lightweight pointers"""
    service = UserSessionService(db)
    session = service.get_active_session(current_user.user_id)
    
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No active session found"
        )
    
    # Return just the pointers - no heavy relationship loading
    return {
        "id": session.id,
        "user_id": session.user_id,
        "name": session.name,
        "chat_id": session.chat_id,
        "mission_id": session.mission_id,
        "session_metadata": session.session_metadata
    }


@router.put("/{session_id}")
async def update_session(
    session_id: str,
    request: UpdateUserSessionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(validate_token)
):
    """Update an existing user session - returns lightweight response"""
    service = UserSessionService(db)
    session = service.update_user_session_lightweight(current_user.user_id, session_id, request)
    
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
    
    return {
        "id": session.id,
        "user_id": session.user_id,
        "name": session.name,
        "chat_id": session.chat_id,
        "mission_id": session.mission_id,
        "session_metadata": session.session_metadata
    } 