"""
User Session Schema Definitions

This module contains all Pydantic models for managing user sessions
for persistence and API operations.
"""

from typing import List, Optional, Any, Dict
from pydantic import BaseModel, Field
from datetime import datetime
from enum import Enum
from .workflow import Mission


class UserSessionStatus(str, Enum):
    """Status of a user session"""
    ACTIVE = "active"
    COMPLETED = "completed"
    ABANDONED = "abandoned"
    ARCHIVED = "archived"


# Core session persistence model
class UserSession(BaseModel):
    """User session representing a workspace/conversation container"""
    id: str = Field(description="Unique identifier for the session")
    user_id: int = Field(description="ID of the user who owns this session")
    name: str = Field(description="Name/title of the session")
    status: UserSessionStatus = Field(default=UserSessionStatus.ACTIVE, description="Current status of the session")
    session_metadata: Dict[str, Any] = Field(default_factory=dict, description="Additional session metadata")
    created_at: datetime = Field(description="When the session was created")
    updated_at: datetime = Field(description="When the session was last updated")
    last_activity_at: datetime = Field(description="When the session had its last activity")
    
    # Relationships (populated by services)
    chat: Optional['Chat'] = Field(default=None, description="Associated chat conversation")
    mission: Optional[Mission] = Field(default=None, description="Associated mission if created")


# API Request/Response models for UserSession
class CreateUserSessionRequest(BaseModel):
    """Request to create a new user session"""
    name: str = Field(description="Name for the new session")
    session_metadata: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Optional metadata")


class CreateUserSessionResponse(BaseModel):
    """Response when creating a new user session"""
    user_session: UserSession = Field(description="Created user session")
    chat: 'Chat' = Field(description="Associated chat created with the session")


class UpdateUserSessionRequest(BaseModel):
    """Request to update an existing user session"""
    name: Optional[str] = Field(default=None, description="Updated name")
    status: Optional[UserSessionStatus] = Field(default=None, description="Updated status")
    mission_id: Optional[str] = Field(default=None, description="Updated mission ID")
    session_metadata: Optional[Dict[str, Any]] = Field(default=None, description="Updated metadata")


class ListUserSessionsResponse(BaseModel):
    """Response for listing user sessions"""
    sessions: List[UserSession] = Field(description="List of user sessions")
    total: int = Field(description="Total number of sessions")
    page: int = Field(description="Current page number")
    per_page: int = Field(description="Number of sessions per page")


# Summary models for efficient listing
class UserSessionSummary(BaseModel):
    """Lightweight user session summary for listing"""
    id: str = Field(description="Unique identifier for the session")
    user_id: int = Field(description="ID of the user who owns this session")
    name: str = Field(description="Name/title of the session")
    status: UserSessionStatus = Field(description="Current status of the session")
    created_at: datetime = Field(description="When the session was created")
    updated_at: datetime = Field(description="When the session was last updated")
    last_activity_at: datetime = Field(description="When the session had its last activity")
    
    # Summary info
    message_count: int = Field(default=0, description="Number of messages in the session")
    has_mission: bool = Field(default=False, description="Whether this session has an associated mission")


# Import Chat for forward references
from .chat import Chat 