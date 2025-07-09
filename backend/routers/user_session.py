"""
User Session Router

This router handles all HTTP endpoints for user session management.
"""

from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
from services.auth_service import validate_token
from services.user_session_service import UserSessionService
from models import User, UserSessionStatus
from schemas.user_session import (
    CreateUserSessionRequest,
    CreateUserSessionResponse,
    UpdateUserSessionRequest,
    ListUserSessionsResponse,
    UserSession as UserSessionSchema
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


@router.get("/", response_model=ListUserSessionsResponse)
async def list_sessions(
    page: int = 1,
    per_page: int = 20,
    status_filter: Optional[UserSessionStatus] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(validate_token)
):
    """List user sessions with pagination and filtering"""
    service = UserSessionService(db)
    return service.list_user_sessions(
        current_user.user_id, 
        page=page, 
        per_page=per_page, 
        status=status_filter
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
        "name": session.name,
        "chat_id": session.chat_id,
        "mission_id": session.mission_id,
        "session_metadata": session.session_metadata
    }


@router.get("/{session_id}", response_model=UserSessionSchema)
async def get_session(
    session_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(validate_token)
):
    """Get a specific user session"""
    service = UserSessionService(db)
    session = service.get_user_session(current_user.user_id, session_id)
    
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
    
    return session


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
        "name": session.name,
        "chat_id": session.chat_id,
        "mission_id": session.mission_id,
        "session_metadata": session.session_metadata
    }


@router.post("/{session_id}/link-mission/{mission_id}")
async def link_mission_to_session(
    session_id: str,
    mission_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(validate_token)
):
    """Link a mission to a user session - returns lightweight response"""
    service = UserSessionService(db)
    try:
        session = service.link_mission_to_session_lightweight(current_user.user_id, session_id, mission_id)
        
        if not session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Session not found"
            )
        
        return {
            "id": session.id,
            "name": session.name,
            "chat_id": session.chat_id,
            "mission_id": session.mission_id,
            "session_metadata": session.session_metadata
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.post("/{session_id}/activity")
async def update_session_activity(
    session_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(validate_token)
):
    """Update session activity timestamp"""
    service = UserSessionService(db)
    service.update_session_activity(current_user.user_id, session_id)
    return {"message": "Activity updated"}


@router.post("/{session_id}/complete", response_model=UserSessionSchema)
async def complete_session(
    session_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(validate_token)
):
    """Mark session as completed"""
    service = UserSessionService(db)
    session = service.complete_session(current_user.user_id, session_id)
    
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
    
    return session


# Admin endpoints for session cleanup (could be moved to separate admin router)
@router.post("/admin/cleanup/abandon")
async def abandon_inactive_sessions(
    hours_threshold: int = 24,
    db: Session = Depends(get_db),
    current_user: User = Depends(validate_token)
):
    """Mark inactive sessions as abandoned (admin endpoint)"""
    # TODO: Add admin role check
    service = UserSessionService(db)
    count = service.abandon_inactive_sessions(hours_threshold)
    return {"message": f"Abandoned {count} inactive sessions"}


@router.post("/admin/cleanup/archive")
async def archive_abandoned_sessions(
    days_threshold: int = 7,
    db: Session = Depends(get_db),
    current_user: User = Depends(validate_token)
):
    """Archive abandoned sessions (admin endpoint)"""
    # TODO: Add admin role check
    service = UserSessionService(db)
    count = service.archive_abandoned_sessions(days_threshold)
    return {"message": f"Archived {count} abandoned sessions"}


@router.delete("/admin/cleanup/delete")
async def delete_archived_sessions(
    days_threshold: int = 90,
    db: Session = Depends(get_db),
    current_user: User = Depends(validate_token)
):
    """Delete archived sessions (admin endpoint)"""
    # TODO: Add admin role check
    service = UserSessionService(db)
    count = service.delete_archived_sessions(days_threshold)
    return {"message": f"Deleted {count} archived sessions"} 